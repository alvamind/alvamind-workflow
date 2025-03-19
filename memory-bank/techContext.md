# 🌊 Alvamind Workflow - Technical Context

## Technology Stack

### Core Technologies
- **TypeScript**: Primary language for type-safety and modern JS features
- **Node.js**: Runtime environment (v18+)
- **ESM Modules**: Modern JavaScript module system

### Key Dependencies
- **chalk** (v5.3.0): Terminal styling for colorful output
- **yaml** (v2.3.1): YAML parsing for configuration files

### Development Tools
- **TypeScript** (v5.1.6): Static typing and compilation
- **Bun**: Alternative JavaScript runtime with type definitions included

## Development Environment

### Setup Requirements
- Node.js v18 or higher
- TypeScript 5.x
- npm or compatible package manager

### Build Process
1. TypeScript compilation (`tsc`)
2. Setting executable permissions on CLI file
3. Module bundling for distribution

## Technical Constraints

### Compatibility
- Must work with Node.js v18 and above
- ESM modules only (not CommonJS)
- Cross-platform support (Linux, macOS, Windows)

### Performance Considerations
- Minimal startup time for CLI usage
- Efficient process execution
- Low memory footprint

### Security Constraints
- Safe execution of user-provided commands
- Proper handling of environment variables
- No arbitrary code execution beyond specified commands

## Project Structure

```
alvamind-workflow/
├── src/                  # Source code
│   ├── cli.ts            # CLI entry point
│   ├── index.ts          # Main API entry point
│   ├── runner.ts         # Command execution engine
│   ├── types.ts          # TypeScript type definitions
│   ├── workflow.ts       # Workflow builder implementation
│   └── utils/            # Utility functions
│       └── executeChildProcess.ts  # Process execution wrapper
├── test/                 # Test files
│   ├── api.test.ts       # API tests
│   └── conditionals.test.ts # Tests for conditional features
├── dist/                 # Compiled JavaScript output
├── package.json          # Project metadata and dependencies
└── tsconfig.json         # TypeScript configuration
```

## Interface Definitions

### Key Types

```typescript
// Core workflow configuration
interface WorkflowConfig {
  version: string;
  name: string;
  commands: WorkflowCommand[];
}

// Individual workflow commands
interface WorkflowCommand {
  command?: string;
  name: string;
  skippable?: boolean;
  parallel?: WorkflowCommand[];
  callback?: (result: { exitCode: number, stdout: string, stderr: string }) => string | undefined;
  condition?: (context: WorkflowContext) => boolean | Promise<boolean>;
  id?: string;
  dependsOn?: string[];
}

// Workflow context for state management
interface WorkflowContext {
  results: Record<string, CommandResult>;
  getResult: (id: string) => CommandResult | undefined;
  getStdout: (id: string) => string | undefined;
  getExitCode: (id: string) => number | undefined;
  getStderr: (id: string) => string | undefined;
}

// Builder interface for programmatic creation
interface WorkflowBuilder {
  name(name: string): WorkflowBuilder;
  execute<T extends string = string>(command: string, name: string, skippable?: boolean): WorkflowBuilder;
  executeWithId<T extends string>(id: T, command: string, name: string, skippable?: boolean): WorkflowBuilder;
  when(condition: (context: WorkflowContext) => boolean | Promise<boolean>, name: string): WorkflowBuilder;
  dependsOn(...ids: string[]): WorkflowBuilder;
  // Additional methods
}
```

## External Integration

### Package Export
- Main module: `dist/index.js`
- TypeScript definitions: `dist/index.d.ts`
- CLI entry point: `dist/cli.js`

### Installation Methods
- npm: `npm install alvamind-workflow`
- Local development: `npm link`

### Required Permissions
- File system access for reading workflow files
- Process spawning for command execution
- Terminal access for interactive mode

## Type Safety

The library uses TypeScript generics to provide type safety for command results:

```typescript
// Define a typed command ID
workflow.executeWithId<"version">("version", "node -v", "Get Node Version")

// TypeScript knows this is safe because "version" exists
workflow.execute("echo 'Building...'", "Build")
       .when(ctx => ctx.getStdout("version").startsWith("v18"), "Node 18 required")
```

Generic type parameters provide compile-time validation of command IDs and their usage in conditions and dependencies.
