import { readFile } from "fs/promises";
import { parse } from "yaml";
import chalk from "chalk";
import { executeCommand, isRunning, formatTime, setTestMode, createDefaultContext } from "./runner.js";
import { WorkflowConfig, Command, RunnerOptions, WorkflowCommand, WorkflowOptions, WorkflowContext } from "./types.js";
import { join, dirname } from "path";
import { existsSync } from "fs";
import { executeChildProcess } from "./utils/executeChildProcess.js";
import { parseWorkflowYaml } from "./yaml-parser.js";

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

    // Use the specialized YAML parser that handles conditions and dependencies
    return parseWorkflowYaml(content);
  } catch (error) {
    console.error(chalk.red(`Error loading workflow file: ${path}`));
    throw error;
  }
}

function createCommand(cmd: WorkflowCommand): Command {
  // Convert string condition to function if needed
  let condition = cmd.condition;
  if (typeof condition === 'string') {
    condition = new Function('context', `return ${condition}`) as
      (context: WorkflowContext) => boolean | Promise<boolean>;
  }

  return {
    name: cmd.name,
    originalCmd: cmd.command,
    command: cmd.command ? () => executeChildProcess(cmd.command!) : undefined,
    skippable: cmd.skippable,
    parallel: cmd.parallel?.map(createCommand),
    callback: cmd.callback,
    condition,
    id: cmd.id,
    dependsOn: cmd.dependsOn
  };
}

async function executeCommands(cmds: Command[], context: WorkflowContext, options: RunnerOptions, totalSteps: number): Promise<void> {
  let currentStep = 1;

  for (let i = 0; i < cmds.length; i++) {
    const cmd = cmds[i];

    // Check if this command has dependencies
    if (cmd.dependsOn && cmd.dependsOn.length > 0) {
      const missingDependencies = cmd.dependsOn.filter(id => !context.results[id]);
      if (missingDependencies.length > 0) {
        throw new Error(`Command "${cmd.name}" depends on missing results: ${missingDependencies.join(', ')}`);
      }
    }

    // Check conditions (if any)
    if (cmd.condition) {
      const shouldRun = await cmd.condition(context);
      if (!shouldRun) {
        console.log(`\nSkipping step: ${chalk.cyan(cmd.name)} (condition not met)`);
        continue;
      }
    }

    if (cmd.parallel) {
      const results = await Promise.all(cmd.parallel.map(async (parallelCmd: Command) => {
        if (parallelCmd.command) {
          return executeCommand(parallelCmd, currentStep++, totalSteps, options.interactive, context);
        }
      }));

      // Handle branch results from parallel commands
      const branchResults = results
        .filter((r: any) => r?.branchResult)
        .map((r: any) => r?.branchResult)
        .filter(Boolean);

      if (branchResults.length > 0) {
        console.log(chalk.dim(`\nParallel branches: ${branchResults.join(', ')}`));
      }
    } else if (cmd.command) {
      const { branchResult } = await executeCommand(cmd, currentStep++, totalSteps, options.interactive, context);
      if (branchResult) {
        // Process commands based on branch result
        console.log(chalk.dim(`\nBranching to: ${branchResult}`));
      }
    }
  }
}

export async function runWorkflow(config: WorkflowConfig, options: RunnerOptions = {}) {
  if (options.testMode) {
    setTestMode(true);
  }

  const startTime = performance.now();
  const commands: Command[] = config.commands.map(createCommand);
  const context = createDefaultContext();

  console.log(chalk.bold(`\n🐳 Executing workflow: ${config.name}`));
  console.log(chalk.dim("====================================="));

  try {
    const totalSteps = countTotalSteps(commands);
    await executeCommands(commands, context, options, totalSteps);

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

import { createWorkflow, WorkflowBuilderImpl } from "./workflow.js";
WorkflowBuilderImpl.prototype.run = async function (options: WorkflowOptions = {}) {
  return runWorkflow(this.getConfig(), options);
};

// Export everything needed for tests and examples
export { createWorkflow, createDefaultContext };
export type {
  WorkflowBuilder,
  WorkflowOptions,
  WorkflowConfig,
  WorkflowCommand,
  WorkflowContext,
  CommandResult,
  Command,
  RunnerOptions
} from "./types.js";
