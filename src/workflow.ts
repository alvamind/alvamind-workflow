import { WorkflowBuilder, WorkflowConfig, WorkflowOptions } from "./types";
import { runWorkflow } from "./index";

class WorkflowBuilderImpl implements WorkflowBuilder {
    private config: WorkflowConfig;

    constructor(name: string = "Programmatic Workflow") {
        this.config = {
            version: "1.0",
            name,
            commands: []
        };
    }

    name(name: string): WorkflowBuilder {
        this.config.name = name;
        return this;
    }

    addCommand(command: string, name: string, skippable: boolean = false): WorkflowBuilder {
        this.config.commands.push({ command, name, skippable });
        return this;
    }

    addParallelCommands(name: string, commands: Array<{ command: string, name: string, skippable?: boolean }>): WorkflowBuilder {
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
            commands: [...this.config.commands] // Create a new array with copied commands
        };
    }

    async run(options?: WorkflowOptions) {
        return runWorkflow(this.config, options);
    }
}

export function createWorkflow(options: WorkflowOptions = {}) {
    return new WorkflowBuilderImpl(options.name);
}
