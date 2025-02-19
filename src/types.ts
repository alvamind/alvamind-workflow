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
    name: string;
    skippable?: boolean;
}

export interface RunnerOptions {
    testMode?: boolean;
}
