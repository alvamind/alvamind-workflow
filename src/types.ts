export interface WorkflowCommand {
    command?: string;
    name: string;
    skippable?: boolean;
    parallel?: WorkflowCommand[];
    callback?: (result: { exitCode: number, stdout: string, stderr: string }) => string | undefined;
}

export interface WorkflowConfig {
    version: string;
    name: string;
    commands: WorkflowCommand[];
}

export interface Command {
    command?: () => Promise<{ exitCode: number, stdout: string, stderr: string }>;
    originalCmd?: string;
    name: string;
    skippable?: boolean;
    parallel?: Command[];
    callback?: (result: { exitCode: number, stdout: string, stderr: string }) => string | undefined;
}

export interface RunnerOptions {
    testMode?: boolean;
    interactive?: boolean;
}

export interface WorkflowBuilder {
    name(name: string): WorkflowBuilder;
    execute(command: string, name: string, skippable?: boolean): WorkflowBuilder;
    executeWith(
        command: string,
        name: string,
        callback: (result: { exitCode: number, stdout: string, stderr: string }) => string | undefined,
        skippable?: boolean
    ): WorkflowBuilder;
    build(): WorkflowConfig;
    run(options?: WorkflowOptions): Promise<boolean>;
}

export interface WorkflowOptions extends RunnerOptions {
    name?: string;
}
