import { readFile } from "fs/promises";
import { parse } from "yaml";
import { $ } from "bun";
import chalk from "chalk";
import { executeCommand, isRunning, formatTime, setTestMode } from "./runner";
import { WorkflowConfig, Command, RunnerOptions, WorkflowCommand } from "./types";
import { join, dirname } from "path";
import { existsSync } from "fs";

async function findWorkflowFile(startPath: string = process.cwd()): Promise<string | null> {
    let currentPath = startPath;
    while (true) {
        const workflowPath = join(currentPath, "workflow.yml");
        if (existsSync(workflowPath)) {
            return workflowPath;
        }
        const parentPath = dirname(currentPath);
        if (parentPath === currentPath) {
            return null;
        }
        currentPath = parentPath;
    }
}

export async function loadWorkflow(path: string = "workflow.yml"): Promise<WorkflowConfig> {
    try {
        // If no explicit path is provided, try to find workflow.yml in parent directories
        const workflowPath = path === "workflow.yml" ?
            (await findWorkflowFile()) || path :
            path;

        const content = await readFile(workflowPath, "utf-8");
        return parse(content) as WorkflowConfig;
    } catch (error) {
        console.error(chalk.red(`Error loading workflow file: ${path}`));
        throw error;
    }
}

function createCommand(cmd: WorkflowCommand): Command {
    return {
        name: cmd.name,
        originalCmd: cmd.command,
        command: cmd.command ? $`sh -c "${cmd.command}"` : undefined,  // Add quotes here
        skippable: cmd.skippable,
        parallel: cmd.parallel?.map(createCommand),
        callback: cmd.callback
    };
}

export async function runWorkflow(config: WorkflowConfig, options: RunnerOptions = {}) {
    if (options.testMode) {
        setTestMode(true);
    }

    const startTime = performance.now();
    const commands: Command[] = config.commands.map(createCommand);

    console.log(chalk.bold(`\n🐳 Executing workflow: ${config.name}`));
    console.log(chalk.dim("====================================="));

    try {
        let currentStep = 1;
        const totalSteps = countTotalSteps(commands);

        async function executeCommands(cmds: Command[]): Promise<void> {
            for (const cmd of cmds) {
                if (cmd.parallel) {
                    const results = await Promise.all(cmd.parallel.map(async (parallelCmd) => {
                        if (parallelCmd.command) {
                            return executeCommand(parallelCmd, currentStep++, totalSteps, options.interactive);
                        }
                    }));

                    // Handle branch results from parallel commands
                    const branchResults = results
                        .filter(r => r?.branchResult)
                        .map(r => r?.branchResult)
                        .filter(Boolean);

                    if (branchResults.length > 0) {
                        console.log(chalk.dim(`\nParallel branches: ${branchResults.join(', ')}`));
                    }
                } else if (cmd.command) {
                    const { branchResult } = await executeCommand(cmd, currentStep++, totalSteps, options.interactive);
                    if (branchResult) {
                        // Process commands based on branch result
                        console.log(chalk.dim(`\nBranching to: ${branchResult}`));
                    }
                }
            }
        }

        await executeCommands(commands);

        const totalTime = performance.now() - startTime;
        console.log(chalk.dim("\n====================================="));
        console.log(`${chalk.green("✓")} Workflow completed in ${chalk.bold(formatTime(totalTime))}`);
        return true;
    } catch (error) {
        if (options.testMode) {
            throw error;
        }
        process.exit(1);
    }
}

function countTotalSteps(commands: Command[]): number {
    return commands.reduce((total, cmd) => {
        if (cmd.parallel) {
            return total + countTotalSteps(cmd.parallel);
        }
        return total + (cmd.command ? 1 : 0);
    }, 0);
}

export { isRunning, setTestMode };
export { createWorkflow } from "./workflow";
export type { WorkflowBuilder, WorkflowOptions, WorkflowConfig, WorkflowCommand } from "./types";
