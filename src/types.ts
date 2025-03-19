export interface WorkflowCommand {
    command?: string;
    name: string;
    skippable?: boolean;
    parallel?: WorkflowCommand[];
    callback?: (result: { exitCode: number, stdout: string, stderr: string }) => string | undefined;
    condition?: string | ((context: WorkflowContext) => boolean | Promise<boolean>);
    id?: string;
    dependsOn?: string[];
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
    condition?: ((context: WorkflowContext) => boolean | Promise<boolean>);
    id?: string;
    dependsOn?: string[];
}

export interface RunnerOptions {
    testMode?: boolean;
    interactive?: boolean;
}

export interface CommandResult {
    exitCode: number;
    stdout: string;
    stderr: string;
    id?: string;
}

export interface WorkflowContext {
    results: Record<string, CommandResult>;
    getResult: (id: string) => CommandResult | undefined;
    getStdout: (id: string) => string | undefined;
    getExitCode: (id: string) => number | undefined;
    getStderr: (id: string) => string | undefined;
}

export interface WorkflowBuilder {
    name(name: string): WorkflowBuilder;
    execute<T extends string = string>(command: string, name: string, skippable?: boolean): WorkflowBuilder;
    executeWith<T extends string = string>(
        command: string,
        name: string,
        callback: (result: { exitCode: number, stdout: string, stderr: string }) => string | undefined,
        skippable?: boolean
    ): WorkflowBuilder;
    executeWithId<T extends string>(
        id: T,
        command: string,
        name: string,
        skippable?: boolean
    ): WorkflowBuilder;
    when(
        condition: (context: WorkflowContext) => boolean | Promise<boolean>,
        name: string
    ): WorkflowBuilder;
    dependsOn(...ids: string[]): WorkflowBuilder;
    build(): WorkflowConfig;
    run(options?: WorkflowOptions): Promise<boolean>;
}

export interface WorkflowOptions extends RunnerOptions {
    name?: string;
}
