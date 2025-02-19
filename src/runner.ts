import chalk from "chalk";
import { Command } from "./types";

export let isRunning = true;
export const setIsRunning = (value: boolean) => {
    isRunning = value;
};
let isTestMode = false;

export const setTestMode = (enabled: boolean) => {
    isTestMode = enabled;
};

export const formatTime = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

const log = (step: number, total: number, message: string) => {
    const stepCounter = chalk.dim(`[${step}/${total}]`);
    console.log(`${stepCounter} ${message}`);
};

export async function executeCommand(
    { command, name, skippable }: Command,
    step: number,
    total: number
): Promise<number> {
    const startTime = performance.now();
    let intervalId: ReturnType<typeof setInterval>;

    console.log(`\nStep ${step}/${total} : ${chalk.cyan(name)}`);

    try {
        intervalId = setInterval(() => {
            if (isRunning) {
                const elapsed = performance.now() - startTime;
                process.stdout.write(`\r${chalk.dim(" -> running... ")} ${chalk.yellow(formatTime(elapsed))}`);
            }
        }, 100);

        const result = await command;
        const duration = performance.now() - startTime;

        clearInterval(intervalId);
        process.stdout.write("\r" + " ".repeat(50) + "\r");

        if (result.exitCode === 0) {
            log(step, total, `${chalk.green("✓")} ${name} ${chalk.dim(formatTime(duration))}`);
            return duration;
        }

        if (skippable) {
            log(step, total, `${chalk.yellow("⚠")} ${name} ${chalk.dim(formatTime(duration))} [SKIPPED]`);
            if (!isTestMode) {
                return duration;
            }
            throw new Error(`Skipped command: ${name}`);
        }

        log(step, total, `${chalk.red("✗")} ${name} ${chalk.dim(formatTime(duration))} [FAILED]`);
        throw new Error(`Command failed: ${name}`);
    } catch (error) {
        const duration = performance.now() - startTime;
        clearInterval(intervalId!);
        log(step, total, `${chalk.red("✗")} ${name} ${chalk.dim(formatTime(duration))} [ERROR]`);
        console.error(chalk.red("\nError details:"));
        console.error(error);

        if (skippable && !isTestMode) {
            return duration;
        }

        throw error;
    }
}
