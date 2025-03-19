# Conditional Workflow Examples

This document provides examples of using the conditional execution and dependency features in Alvamind Workflow.

## Basic Conditional Execution

### Programmatic API

```typescript
import { createWorkflow } from 'alvamind-workflow';

const workflow = createWorkflow({ name: 'Conditional Workflow' })
  // First command that generates output we'll check later
  .executeWithId("node-version", "node -v", "Check Node Version")
  
  // A command that only runs if a condition is met
  .execute("npm run build", "Build Project")
  .when(ctx => {
    const version = ctx.getStdout("node-version");
    // Only run if Node.js version starts with v16, v18, or v20
    return /^v(16|18|20)/.test(version);
  }, "Node version requirement")
  
  // Run the workflow
  .run();
```

### YAML Configuration

```yaml
version: "1.0"
name: "Conditional Workflow"
commands:
  - name: "Check Node Version"
    command: "node -v"
    id: "node-version"
  
  - name: "Build Project"
    command: "npm run build"
    condition: |
      (context) => {
        const version = context.getStdout("node-version");
        return /^v(16|18|20)/.test(version);
      }
```

## Step Dependencies

### Programmatic API

```typescript
import { createWorkflow } from 'alvamind-workflow';

const workflow = createWorkflow({ name: 'Dependency Workflow' })
  // First step that generates something others depend on
  .executeWithId("setup", "npm install", "Setup Dependencies")
  
  // Build step depends on setup
  .executeWithId("build", "npm run build", "Build Project")
  .dependsOn("setup")
  
  // Test step depends on build
  .executeWithId("test", "npm test", "Run Tests")
  .dependsOn("build")
  
  // Run the workflow
  .run();
```

### YAML Configuration

```yaml
version: "1.0"
name: "Dependency Workflow"
commands:
  - name: "Setup Dependencies"
    command: "npm install"
    id: "setup"
  
  - name: "Build Project"
    command: "npm run build"
    id: "build"
    dependsOn: ["setup"]
  
  - name: "Run Tests"
    command: "npm test"
    id: "test"
    dependsOn: ["build"]
```

## Combining Conditions and Dependencies

### Programmatic API

```typescript
import { createWorkflow } from 'alvamind-workflow';

const workflow = createWorkflow({ name: 'Combined Features' })
  // Get system information
  .executeWithId("os-check", "uname -a", "Check Operating System")
  .executeWithId("disk-space", "df -h", "Check Disk Space")
  
  // Deploy only if on Linux and enough disk space
  .execute("npm run deploy", "Deploy Application")
  .when(ctx => {
    const os = ctx.getStdout("os-check");
    const diskSpace = ctx.getStdout("disk-space");
    
    // Example condition: Linux and has at least 10G available
    return os.toLowerCase().includes('linux') && 
           diskSpace.includes('10G');
  }, "System requirements check")
  .dependsOn("os-check", "disk-space")
  
  // Run the workflow
  .run();
```

### YAML Configuration

```yaml
version: "1.0"
name: "Combined Features"
commands:
  - name: "Check Operating System"
    command: "uname -a"
    id: "os-check"
  
  - name: "Check Disk Space"
    command: "df -h"
    id: "disk-space"
  
  - name: "Deploy Application"
    command: "npm run deploy"
    dependsOn: ["os-check", "disk-space"]
    condition: |
      (context) => {
        const os = context.getStdout("os-check");
        const diskSpace = context.getStdout("disk-space");
        
        return os.toLowerCase().includes('linux') && 
               diskSpace.includes('10G');
      }
```

## Type-Safe Command References

### Programmatic API

TypeScript generics provide compile-time validation for command IDs:

```typescript
import { createWorkflow } from 'alvamind-workflow';

// Using type parameter to specify ID literal type
const workflow = createWorkflow()
  .executeWithId<"version">("version", "node -v", "Get Node Version")
  .execute("echo 'Building'", "Build Step")
  .when(ctx => {
    // TypeScript knows this is valid and provides autocompletion
    const v = ctx.getStdout("version");
    return v.startsWith("v");
  }, "Version check");

// This would cause TypeScript error: Argument of type '"non-existent"' 
// is not assignable to parameter of type '"version"'
workflow.execute("echo 'test'", "Test")
  .dependsOn("non-existent"); // Type error!
```

## Advanced Example: Multi-Stage Build Pipeline

### Programmatic API

```typescript
import { createWorkflow } from 'alvamind-workflow';

const workflow = createWorkflow({ name: 'Build Pipeline' })
  // Initial setup and version check
  .executeWithId("env-setup", "node -v && npm -v", "Environment Setup")
  
  // Install dependencies only if not already installed
  .executeWithId("deps-check", "test -d node_modules && echo 'exists' || echo 'missing'", "Check Dependencies")
  .executeWithId("install", "npm install", "Install Dependencies")
  .when(ctx => ctx.getStdout("deps-check") === "missing", "Install only if needed")
  .dependsOn("env-setup")
  
  // Build processes
  .executeWithId("lint", "npm run lint", "Lint Code")
  .dependsOn("install")
  
  .executeWithId("build", "npm run build", "Build Project")
  .dependsOn("install")
  
  // Tests that depend on build
  .executeWithId("test", "npm test", "Run Tests")
  .dependsOn("build")
  
  // Only deploy if all tests pass
  .executeWithId("deploy", "npm run deploy", "Deploy")
  .when(ctx => ctx.getExitCode("test") === 0, "Deploy only if tests pass")
  .dependsOn("test")
  
  .run();
```

### YAML Configuration

```yaml
version: "1.0"
name: "Build Pipeline"
commands:
  - name: "Environment Setup"
    command: "node -v && npm -v"
    id: "env-setup"
  
  - name: "Check Dependencies"
    command: "test -d node_modules && echo 'exists' || echo 'missing'"
    id: "deps-check"
    dependsOn: ["env-setup"]
  
  - name: "Install Dependencies"
    command: "npm install"
    id: "install"
    dependsOn: ["env-setup"]
    condition: |
      (context) => context.getStdout("deps-check") === "missing"
  
  - name: "Lint Code"
    command: "npm run lint"
    id: "lint"
    dependsOn: ["install"]
  
  - name: "Build Project"
    command: "npm run build"
    id: "build"
    dependsOn: ["install"]
  
  - name: "Run Tests"
    command: "npm test"
    id: "test"
    dependsOn: ["build"]
  
  - name: "Deploy"
    command: "npm run deploy"
    id: "deploy"
    dependsOn: ["test"]
    condition: |
      (context) => context.getExitCode("test") === 0
```

These examples demonstrate how to leverage the conditional execution and dependency features to create sophisticated workflow automation with clear control flow and data dependencies.
