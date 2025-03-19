import { WorkflowBuilder, WorkflowConfig, WorkflowOptions } from "./types.js";


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

  // This will be implemented by the index.js when importing
  run: (options?: WorkflowOptions) => Promise<boolean> = async () => {
    throw new Error("Run method not initialized");
  };
}

export function createWorkflow(options: WorkflowOptions = {}) {
  return new WorkflowBuilderImpl(options.name);
}

// Export the class for index.js to use
export { WorkflowBuilderImpl };
