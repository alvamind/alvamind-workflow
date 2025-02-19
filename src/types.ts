import { $ } from "bun";

export interface WorkflowCommand {
    command: string;
    name: string;
    skippable?: boolean;
}

export interface WorkflowConfig {
    version: string;
    name: string;
    commands: WorkflowCommand[];
}

export interface Command {
    command: ReturnType<typeof $>;
    originalCmd: string;  // Add this to store the original command string
    name: string;
    skippable?: boolean;
}

export interface RunnerOptions {
    testMode?: boolean;
    interactive?: boolean;  // Add this line
}

export interface WorkflowBuilder {
    name(name: string): WorkflowBuilder;
    addCommand(command: string, name: string, skippable?: boolean): WorkflowBuilder;
    build(): WorkflowConfig;
    run(options?: WorkflowOptions): Promise<boolean>;
}

export interface WorkflowOptions extends RunnerOptions {
    name?: string;
}
