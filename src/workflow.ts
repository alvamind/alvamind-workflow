import { WorkflowBuilder, WorkflowConfig, WorkflowOptions, Command } from "./types.js";
import { executeCommand } from "./runner.js";
import { executeChildProcess } from "./utils/executeChildProcess.js";

class WorkflowBuilderImpl implements WorkflowBuilder {
  private config: WorkflowConfig;

  constructor(name: string = "Programmatic Workflow") {
    this.config = {
      version: "1.0",
      name,
      commands: []
    };
  }

  name(name: string): this {
    this.config.name = name;
    return this;
  }

  execute(command: string, name: string, skippable: boolean = false): this {
    this.config.commands.push({ command, name, skippable });
    return this;
  }

  executeWith(
    command: string,
    name: string,
    callback: (result: { exitCode: number, stdout: string, stderr: string }) => string | undefined,
    skippable: boolean = false
  ): this {
    this.config.commands.push({ command, name, callback, skippable });
    return this;
  }

  addParallelCommands(name: string, commands: Array<{ command: string, name: string, skippable?: boolean }>): this {
    this.config.commands.push({
      name,
      parallel: commands.map(cmd => ({
        command: cmd.command,
        name: cmd.name,
        skippable: cmd.skippable
      }))
    });
    return this;
  }

  build(): WorkflowConfig {
    return {
      ...this.config,
      commands: [...this.config.commands]
    };
  }

  // Store the config for later use by runWorkflow
  getConfig(): WorkflowConfig {
    return this.config;
  }

  async run(options: WorkflowOptions = {}): Promise<boolean> {
    const commands: Command[] = this.config.commands.map(cmd => ({
      name: cmd.name,
      originalCmd: cmd.command,
      command: cmd.command ? () => executeChildProcess(cmd.command!) : undefined,
      skippable: cmd.skippable,
      parallel: cmd.parallel?.map(p => ({
        name: p.name,
        originalCmd: p.command,
        command: p.command ? () => executeChildProcess(p.command!) : undefined,
        skippable: p.skippable
      })),
      callback: cmd.callback
    }));

    let currentStep = 1;
    const totalSteps = this.countTotalSteps(commands);

    try {
      for (const cmd of commands) {
        if (cmd.parallel) {
          await Promise.all(cmd.parallel.map(async (parallelCmd) => {
            if (parallelCmd.command) {
              return executeCommand(parallelCmd, currentStep++, totalSteps, options.interactive);
            }
          }));
        } else if (cmd.command) {
          const { branchResult } = await executeCommand(cmd, currentStep++, totalSteps, options.interactive);
          if (cmd.callback && branchResult) {
            // Handle branching based on callback result
            continue;
          }
        }
      }
      return true;
    } catch (error) {
      if (options.testMode) {
        throw error;
      }
      return false;
    }
  }

  private countTotalSteps(commands: Command[]): number {
    return commands.reduce((total, cmd) => {
      if (cmd.parallel) {
        return total + this.countTotalSteps(cmd.parallel);
      }
      return total + (cmd.command ? 1 : 0);
    }, 0);
  }
}

export function createWorkflow(options: WorkflowOptions = {}) {
  return new WorkflowBuilderImpl(options.name);
}

// Export the class for index.js to use
export { WorkflowBuilderImpl };
