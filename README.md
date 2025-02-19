# 🌊 Alvamind Workflow

A lightweight and flexible workflow automation library for JavaScript/TypeScript projects, powered by Bun.

## 🎯 Introduction

Alvamind Workflow streamlines your development process by providing an elegant way to define and execute multi-step workflows. Whether you prefer YAML configurations or programmatic approaches, Alvamind makes automation simple and maintainable.

## ✨ Key Features

🔄 **Flexible Workflow Definition**
- YAML-based configuration for simple, readable workflows
- Programmatic API for dynamic workflow creation
- Mix and match approaches based on your needs

⚡ **Powerful Execution Engine**
- Real-time execution progress with timing
- Intelligent error handling and recovery
- Skippable steps for optional tasks
- Graceful interruption handling

🛠️ **Developer Experience**
- TypeScript-first design
- Minimal configuration required
- Clear, colorful console output
- Comprehensive error messages

🧪 **Testing & Development**
- Test mode for dry runs
- Promise-based API
- Easy to integrate with CI/CD

## 🚀 Quick Start

### Installation

```bash
bun install alvamind-workflow
```

### Simple Example (YAML)

1. Create `workflow.yml`:
```yaml
version: "1.0"
name: "Deploy Application"
commands:
  - name: "Build Project"
    command: "bun run build"
  - name: "Run Tests"
    command: "bun test"
    skippable: true
  - name: "Deploy"
    command: "bun run deploy"
```

2. Run it:
```bash
workflow-run
```

### Programmatic Usage

```typescript
import { createWorkflow } from 'alvamind-workflow';

const workflow = createWorkflow({ name: 'CI Pipeline' })
  .execute('bun run lint', 'Lint Code')
  .execute('bun run test', 'Run Tests', true)
  .execute('bun run build', 'Build Project');

await workflow.run();
```

## 📊 Example Output

```
🐳 Executing workflow: Deploy Application
=====================================
Step 1/3: Build Project
> bun run build
 -> running... 2.5s
[1/3] ✓ Build Project 2.5s

Step 2/3: Run Tests
> bun test
 -> running... 1.2s
[2/3] ✓ Run Tests 1.2s

Step 3/3: Deploy
> bun run deploy
 -> running... 3.1s
[3/3] ✓ Deploy 3.1s
=====================================
✓ Workflow completed in 6.8s
```

## 🎛️ Advanced Features

### Error Handling

```typescript
try {
  await workflow
    .execute('risky-command', 'Risky Step', true) // skippable
    .execute('must-run', 'Critical Step')         // will fail if error
    .run();
} catch (error) {
  console.error('Workflow failed:', error);
}
```

### Test Mode

```typescript
await workflow.run({ testMode: true }); // Dry run without executing commands
```

### Interactive Mode

When a command fails, the interactive mode provides options to:
1. Retry the original command
2. Enter a new command to execute
3. Skip the current step (if skippable)
4. Abort the entire workflow

## 🔧 API Reference

### `loadWorkflow(path?: string)`

Loads a workflow configuration from a YAML file.

-   `path`: (optional) Path to the YAML file. Defaults to `workflow.yml`.
-   Returns: `Promise<WorkflowConfig>`

### `runWorkflow(config: WorkflowConfig, options?: RunnerOptions)`

Executes a workflow based on the provided configuration.

-   `config`: Workflow configuration object.
-   `options`: (optional) Runner options.
    -   `testMode`: (boolean) Enable test mode to prevent actual command execution.
-   Returns: `Promise<boolean>`

### `createWorkflow(options?: WorkflowOptions)`

Creates a new programmatic workflow builder.

-   `options`: (optional) Workflow options.
    -   `name`: (string) Workflow name.
-   Returns: `WorkflowBuilder`

### `WorkflowBuilder`

A fluent interface for constructing workflows programmatically.

-   `name(name: string)`: Sets the workflow name.
-   `execute(command: string, name: string, skippable?: boolean)`: Adds a command to the workflow.
-   `executeWith(command: string, name: string, callback: (result: { exitCode: number, stdout: string, stderr: string }) => string | undefined, skippable?: boolean)`: Adds a command with a callback (for branching logic).
-   `build()`: Builds the workflow configuration object (`WorkflowConfig`).
-   `run(options?: WorkflowOptions)`: Runs the workflow.

## Workflow Configuration (WorkflowConfig)

```typescript
interface WorkflowConfig {
  version: string;
  name: string;
  commands: WorkflowCommand[];
}
```

## Workflow Command (WorkflowCommand)

```typescript
interface WorkflowCommand {
  command: string;
  name: string;
  skippable?: boolean;
}
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

- 🐛 Report bugs by opening issues
- 💡 Propose new features
- 📝 Improve documentation
- 🔀 Submit pull requests

## 📦 What's Inside

```
alvamind-workflow/
├── src/
│   ├── cli.ts         # CLI implementation
│   ├── index.ts       # Main entry point
│   ├── runner.ts      # Execution engine
│   ├── types.ts       # TypeScript types
│   └── workflow.ts    # Workflow builder
└── README.md
```

## 📄 License

MIT © Alvamind 2025

---

<p align="center">Built with ❤️ by the Alvamind team</p>