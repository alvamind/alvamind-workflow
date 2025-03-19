# Setting Up Conditional Workflows

This guide explains how to set up and use the conditional execution and dependency features in Alvamind Workflow.

## Installation

First, install the package:

```bash
npm install alvamind-workflow
```

## Basic Configuration

### Using Programmatic API

```typescript
import { createWorkflow } from 'alvamind-workflow';

// Create a workflow with conditional steps
const workflow = createWorkflow({ name: 'My Workflow' })
  // Add a step with an ID for later reference
  .executeWithId("first-step", "echo 'Hello'", "First Step")
  
  // Add a conditional step that depends on the first step
  .execute("echo 'World'", "Second Step")
  .when(ctx => {
    // Access the output from the first step
    const output = ctx.getStdout("first-step");
    return output === "Hello";
  }, "Check output")
  .dependsOn("first-step");

// Run the workflow
await workflow.run();
```

### Using YAML Configuration

Create a `workflow.yml` file:

```yaml
version: "1.0"
name: "My Workflow"
commands:
  # Step with ID for reference
  - name: "First Step"
    command: "echo 'Hello'"
    id: "first-step"
  
  # Conditional step with dependency
  - name: "Second Step"
    command: "echo 'World'"
    dependsOn: ["first-step"]
    condition: |
      (context) => {
        const output = context.getStdout("first-step");
        return output === "Hello";
      }
```

Run with the CLI:

```bash
npx workflow-run
```

## Advanced Configuration

### Multiple Conditions and Dependencies

You can combine multiple conditions and dependencies:

```typescript
workflow
  .executeWithId("node-check", "node -v", "Check Node Version")
  .executeWithId("npm-check", "npm -v", "Check NPM Version")
  .execute("npm run build", "Build Project")
  .when(ctx => {
    const node = ctx.getStdout("node-check");
    const npm = ctx.getStdout("npm-check");
    return node.startsWith("v18") && npm.startsWith("9");
  }, "Version Requirements")
  .dependsOn("node-check", "npm-check")
```

YAML equivalent:

```yaml
commands:
  - name: "Check Node Version"
    command: "node -v"
    id: "node-check"

  - name: "Check NPM Version"
    command: "npm -v"
    id: "npm-check"

  - name: "Build Project"
    command: "npm run build"
    dependsOn: ["node-check", "npm-check"]
    condition: |
      (context) => {
        const node = context.getStdout("node-check");
        const npm = context.getStdout("npm-check");
        return node.startsWith("v18") && npm.startsWith("9");
      }
```

### Parallel Execution with Conditions

Execute multiple commands in parallel with conditions:

```typescript
workflow.addParallelCommands("Cleanup", [
  {
    command: "rm -rf dist",
    name: "Clean Dist",
    condition: ctx => ctx.getExitCode("build") === 0
  },
  {
    command: "rm -rf .cache",
    name: "Clean Cache",
    skippable: true
  }
])
```

YAML equivalent:

```yaml
- name: "Cleanup"
  parallel:
    - command: "rm -rf dist"
      name: "Clean Dist"
      condition: |
        (context) => context.getExitCode("build") === 0
    
    - command: "rm -rf .cache"
      name: "Clean Cache"
      skippable: true
```

### Best Practices

1. **Command IDs**
   - Use descriptive IDs that indicate the command's purpose
   - Keep IDs consistent across workflow variations
   - Use TypeScript generics for type safety

2. **Conditions**
   - Keep conditions focused and simple
   - Handle undefined results gracefully
   - Use meaningful condition descriptions

3. **Dependencies**
   - Make dependencies explicit with `dependsOn`
   - Avoid circular dependencies
   - Consider marking dependent steps as skippable when appropriate

4. **Error Handling**
   - Always handle potential undefined results
   - Use skippable flag for non-critical steps
   - Provide meaningful error messages in conditions

### Environment Variables

Access environment variables in conditions:

```typescript
workflow
  .executeWithId("env-check", "echo $NODE_ENV", "Check Environment")
  .execute("npm run deploy", "Deploy")
  .when(ctx => {
    const env = ctx.getStdout("env-check");
    return env === "production";
  }, "Only deploy in production")
```

## WorkflowContext API

The `WorkflowContext` object provides access to the results of previous steps:

| Method | Description |
|--------|-------------|
| `getResult(id)` | Get the full result object for a step |
| `getStdout(id)` | Get the standard output (stdout) as a string |
| `getStderr(id)` | Get the standard error (stderr) as a string |
| `getExitCode(id)` | Get the exit code as a number |

All methods require the `id` of a previously executed command.

## Condition Function Format

When using YAML, condition functions must be valid JavaScript that can be converted to a function. They:

1. Must accept a single `context` parameter
2. Must return a boolean or a Promise that resolves to a boolean
3. Should be enclosed in a function expression: `(context) => { ... }`

Example:

```yaml
condition: |
  (context) => {
    const version = context.getStdout("version-check");
    return version.startsWith("v18");
  }
```

## Dependency Resolution

Dependencies are specified using command IDs:

```typescript
// Programmatic API
workflow
  .executeWithId("step1", "...", "Step 1")
  .executeWithId("step2", "...", "Step 2")
  .dependsOn("step1");
```

```yaml
# YAML configuration
commands:
  - name: "Step 1"
    command: "..."
    id: "step1"
  
  - name: "Step 2"
    command: "..."
    dependsOn: ["step1"]
```

A step will not execute until all its dependencies have completed successfully. If a dependency fails, the workflow will fail unless the dependency is marked as `skippable: true`.

## Type Safety

TypeScript users can leverage generics for type-safe command references:

```typescript
workflow
  .executeWithId<"build">("build", "npm run build", "Build")
  // TypeScript will validate that "build" exists
  .when(ctx => ctx.getStdout("build").includes("success"), "Check build output");
```

This ensures at compile time that you're only referencing commands that actually exist.

## Error Handling

When a conditional command fails:

1. In interactive mode, you'll get recovery options
2. In non-interactive mode, the workflow will fail unless the step is `skippable`

To make a conditional step skippable:

```typescript
workflow.execute("risky-command", "Risky Step", true) // third parameter = skippable
  .when(ctx => condition, "Only if condition is true");
```

```yaml
- name: "Risky Step"
  command: "risky-command"
  skippable: true
  condition: |
    (context) => condition
```

## CLI Options

The CLI tool supports options for conditional workflows:

```bash
# Run with interactive mode (default)
npx workflow-run

# Run in non-interactive mode
npx workflow-run --no-interactive

# Run in test mode (don't actually execute commands)
npx workflow-run --test

# Specify a different workflow file
npx workflow-run ./path/to/workflow.yml
```

## Complete Example

See the [example files](../../examples/) for complete working examples of conditional workflows.
