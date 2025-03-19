import chalk from "chalk";
import { Command, WorkflowContext, CommandResult } from "./types.js";
import { createInterface } from "readline";
import { executeChildProcess } from "./utils/executeChildProcess.js";

export let isRunning = true;
export const setIsRunning = (value: boolean) => {
  isRunning = value;
};
let isTestMode = false;

export const setTestMode = (enabled: boolean) => {
  isTestMode = enabled;
};

export const formatTime = (ms: number) => {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
};

const log = (step: number, total: number, message: string) => {
  const stepCounter = chalk.dim(`[${step}/${total}]`);
  console.log(`${stepCounter} ${message}`);
};

export async function executeCommand(
  { command, originalCmd, name, skippable, callback, id }: Command,
  step: number,
  total: number,
  interactive: boolean = false,
  context: WorkflowContext = createDefaultContext()
): Promise<{ duration: number; branchResult?: string; result?: CommandResult }> {
  const startTime = performance.now();
  let intervalId: ReturnType<typeof setInterval>;

  async function promptForRetry(): Promise<string | null> {
    if (!interactive || isTestMode) return null;

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log(chalk.yellow("\nOptions:"));
    console.log("1. Retry original command");
    console.log("2. Enter new command");
    console.log("3. Skip and continue");
    console.log("4. Abort workflow");

    const answer = await new Promise<string>(resolve => {
      rl.question(chalk.yellow("\nChoose an option (1-4): "), resolve);
    });
    rl.close();
    return answer;
  }

  async function handleFailure(error: any, duration: number): Promise<{ duration: number; branchResult?: string; result?: CommandResult }> {
    const choice = await promptForRetry();

    switch (choice) {
      case "1":
        console.log(chalk.cyan("\nRetrying original command..."));
        return executeCommand({ command, originalCmd, name, skippable, callback, id }, step, total, interactive, context);
      case "2":
        const rl = createInterface({
          input: process.stdin,
          output: process.stdout
        });
        const newCmd = await new Promise<string>(resolve => {
          rl.question(chalk.yellow("\nEnter new command: "), resolve);
        });
        rl.close();
        console.log(chalk.cyan("\nExecuting new command..."));
        return executeCommand({
          command: () => executeChildProcess(newCmd),
          originalCmd: newCmd,
          name,
          skippable,
          callback,
          id
        }, step, total, interactive, context);
      case "3":
        if (skippable) {
          log(step, total, `${chalk.yellow("⚠")} ${name} ${chalk.dim(formatTime(duration))} [SKIPPED]`);
          return { duration };
        }
        throw error;
      case "4":
        console.log(chalk.red("\n🛑 Workflow aborted by user"));
        process.exit(1);
      default:
        throw error;
    }
  }

  console.log(`\nStep ${step}/${total} : ${chalk.cyan(name)}`);
  console.log(chalk.dim(`> ${originalCmd}`));

  try {
    intervalId = setInterval(() => {
      if (isRunning) {
        const elapsed = performance.now() - startTime;
        process.stdout.write(`\r${chalk.dim(" -> running... ")} ${chalk.yellow(formatTime(elapsed))}  `);
      }
    }, 100);

    const result = command ? await command() : { exitCode: 0, stdout: '', stderr: '' };
    const duration = performance.now() - startTime;

    clearInterval(intervalId);
    process.stdout.write("\r" + " ".repeat(80) + "\r");

    // Create a CommandResult with id if present
    const commandResult: CommandResult = {
      ...result,
      id
    };

    // Store result in context if it has an ID
    if (id) {
      context.results[id] = commandResult;
    }

    if (result.exitCode === 0) {
      log(step, total, `${chalk.green("✓")} ${name} ${chalk.dim(formatTime(duration))}`);

      // Handle callback if present
      if (callback) {
        const branchResult = callback({
          exitCode: result.exitCode,
          stdout: result.stdout.toString().trim(),
          stderr: result.stderr.toString()
        });
        return { duration, branchResult, result: commandResult };
      }

      return { duration, result: commandResult };
    }

    if (skippable) {
      log(step, total, `${chalk.yellow("⚠")} ${name} ${chalk.dim(formatTime(duration))} [SKIPPED]`);
      if (!isTestMode) {
        return { duration, result: commandResult };
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

    return handleFailure(error, duration);
  }
}

export function createDefaultContext(): WorkflowContext {
  const results: Record<string, CommandResult> = {};

  return {
    results,
    getResult: (id: string) => results[id],
    getStdout: (id: string) => results[id]?.stdout?.trim(), // Add trim() to remove newlines
    getExitCode: (id: string) => results[id]?.exitCode,
    getStderr: (id: string) => results[id]?.stderr
  };
}
