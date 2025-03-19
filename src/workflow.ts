import { WorkflowBuilder, WorkflowConfig, WorkflowOptions, Command, WorkflowContext } from "./types.js";
import { executeCommand, createDefaultContext } from "./runner.js";
import { executeChildProcess } from "./utils/executeChildProcess.js";
import chalk from "chalk";

class WorkflowBuilderImpl implements WorkflowBuilder {
  private config: WorkflowConfig;
  private lastCommandIndex: number = -1;

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

  execute<T extends string = string>(command: string, name: string, skippable: boolean = false): this {
    this.config.commands.push({ command, name, skippable });
    this.lastCommandIndex = this.config.commands.length - 1;
    return this;
  }

  executeWithId<T extends string>(id: T, command: string, name: string, skippable: boolean = false): this {
    this.config.commands.push({ id, command, name, skippable });
    this.lastCommandIndex = this.config.commands.length - 1;
    return this;
  }

  executeWith(
    command: string,
    name: string,
    callback: (result: { exitCode: number, stdout: string, stderr: string }) => string | undefined,
    skippable: boolean = false
  ): this {
    this.config.commands.push({ command, name, callback, skippable });
    this.lastCommandIndex = this.config.commands.length - 1;
    return this;
  }

  when(
    condition: (context: WorkflowContext) => boolean | Promise<boolean>,
    name: string
  ): this {
    // This acts as a marker for the next command that will be added
    if (this.lastCommandIndex >= 0) {
      this.config.commands[this.lastCommandIndex].condition = condition;
    }
    return this;
  }

  dependsOn(...ids: string[]): this {
    if (this.lastCommandIndex >= 0 && ids.length > 0) {
      this.config.commands[this.lastCommandIndex].dependsOn = ids;
    }
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
    this.lastCommandIndex = this.config.commands.length - 1;
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
    const commands: Command[] = this.config.commands.map(cmd => {
      // Convert string conditions to functions
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
        parallel: cmd.parallel?.map(p => {
          // Handle conditions in parallel commands too
          let pCondition = p.condition;
          if (typeof pCondition === 'string') {
            pCondition = new Function('context', `return ${pCondition}`) as
              (context: WorkflowContext) => boolean | Promise<boolean>;
          }

          return {
            name: p.name,
            originalCmd: p.command,
            command: p.command ? () => executeChildProcess(p.command!) : undefined,
            skippable: p.skippable,
            condition: pCondition,
            id: p.id,
            dependsOn: p.dependsOn
          };
        }),
        callback: cmd.callback,
        condition,
        id: cmd.id,
        dependsOn: cmd.dependsOn
      };
    });

    let currentStep = 1;
    const totalSteps = this.countTotalSteps(commands);
    const context = createDefaultContext();

    try {
      for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];

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
            console.log(`\nSkipping step ${currentStep}: ${chalk.cyan(cmd.name)} (condition not met)`);
            continue;
          }
        }

        if (cmd.parallel) {
          await Promise.all(cmd.parallel.map(async (parallelCmd) => {
            if (parallelCmd.command) {
              const { result } = await executeCommand(parallelCmd, currentStep++, totalSteps, options.interactive, context);
              return result;
            }
          }));
        } else if (cmd.command) {
          const { branchResult, result } = await executeCommand(cmd, currentStep++, totalSteps, options.interactive, context);
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
