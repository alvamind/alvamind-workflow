/**
 * Example: Multi-Environment Deployment Workflow
 */

import { createWorkflow } from '../dist/index.js';

// Parse command-line arguments (could come from process.argv)
const environment = process.env.ENV || 'development';

// Cast the workflow to any to bypass type checks during development
// We'll implement these methods in the actual workflow builder
const workflow = createWorkflow({ name: `Deploy to ${environment}` })
    // Step 1: Environment detection (save for later use)
    .executeWithId("env-detect", `echo "${environment}"`, "Detect Environment")

    // Step 2: Install dependencies
    .executeWithId("deps", "npm install", "Install Dependencies")

    // Step 3: Development-specific steps
    .execute("npm run build:dev", "Build Dev Version")
    .when(ctx => ctx.getStdout("env-detect") === "development", "Dev environment")
    .dependsOn("deps")

    // Step 4: Production-specific steps
    .execute("npm run build:prod", "Build Production Version")
    .when(ctx => ctx.getStdout("env-detect") === "production", "Production environment")
    .dependsOn("deps")

    // Step 5: Run tests appropriate for the environment
    .executeWithId("test", "npm test", "Run Basic Tests")
    .dependsOn("deps")

    // Step 6: Run additional tests for production
    .execute("npm run test:e2e", "Run E2E Tests")
    .when(ctx => ctx.getStdout("env-detect") === "production", "Production tests only")
    .dependsOn("test")

    // Step 7: Deploy to the right target
    .execute("npm run deploy:dev", "Deploy to Development")
    .when(ctx => ctx.getStdout("env-detect") === "development", "Dev deployment")
    .dependsOn("test")

    .execute("npm run deploy:prod", "Deploy to Production")
    .when(ctx => ctx.getStdout("env-detect") === "production", "Production deployment")
    .dependsOn("test")

    // Step 8: Notify on completion with environment context
    .executeWithId("notify", "echo 'Deployment complete!'", "Notification")
    .when(ctx => ctx.getExitCode("test") === 0, "Only notify if tests pass");

// Execute the workflow with interactive error recovery
workflow.run({ interactive: true })
    .then(success => {
        if (success) {
            console.log(`Successfully deployed to ${environment}`);
        } else {
            console.error(`Deployment to ${environment} failed`);
            process.exit(1);
        }
    });
