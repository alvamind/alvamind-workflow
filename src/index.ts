import { readFile } from "fs/promises";
import { parse } from "yaml";
import { $ } from "bun";
import chalk from "chalk";
import { executeCommand, isRunning, formatTime, setTestMode } from "./runner";
import { WorkflowConfig, Command, RunnerOptions } from "./types";

export async function loadWorkflow(path: string = "workflow.yml"): Promise<WorkflowConfig> {
    try {
        const content = await readFile(path, "utf-8");
        return parse(content) as WorkflowConfig;
    } catch (error) {
        console.error(chalk.red(`Error loading workflow file: ${path}`));
        throw error;
    }
}

export async function runWorkflow(config: WorkflowConfig, options: RunnerOptions = {}) {
    if (options.testMode) {
        setTestMode(true);
    }

    const startTime = performance.now();
    const commands: Command[] = config.commands.map(cmd => ({
        name: cmd.name,
        originalCmd: cmd.command,
        command: $`sh -c ${cmd.command}`,
        skippable: cmd.skippable
    }));

    console.log(chalk.bold(`\n🐳 Executing workflow: ${config.name}`));
    console.log(chalk.dim("====================================="));

    try {
        for (let i = 0; i < commands.length; i++) {
            await executeCommand(commands[i], i + 1, commands.length, options.interactive);
        }

        const totalTime = performance.now() - startTime;
        console.log(chalk.dim("\n====================================="));
        console.log(`${chalk.green("✓")} Workflow completed in ${chalk.bold(formatTime(totalTime))}`);
        return true;
    } catch (error) {
        // In test mode, propagate the error
        if (options.testMode) {
            throw error;
        }
        process.exit(1);
    }
}

export { isRunning, setTestMode };
export { createWorkflow } from "./workflow";
export type { WorkflowBuilder, WorkflowOptions, WorkflowConfig, WorkflowCommand } from "./types";
