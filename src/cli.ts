#!/usr/bin/env node

import { loadWorkflow, runWorkflow } from "./index.js";
import { setIsRunning } from "./runner.js";
import chalk from "chalk";

// Handle interruption
process.on("SIGINT", () => {
    setIsRunning(false);
    console.log(chalk.red("\n\n🛑 Workflow interrupted"));
    process.exit(1);
});

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        workflowPath: "workflow.yml",
        testMode: false,
        interactive: true
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === "--test" || arg === "-t") {
            options.testMode = true;
        } else if (arg === "--no-interactive" || arg === "-n") {
            options.interactive = false;
        } else if (!arg.startsWith("-")) {
            options.workflowPath = arg;
        }
    }

    return options;
}

// Make executable if run directly
async function main() {
    try {
        const options = parseArgs();
        console.log(chalk.cyan(`Loading workflow from: ${options.workflowPath}`));

        const config = await loadWorkflow(options.workflowPath);

        if (options.testMode) {
            console.log(chalk.yellow("Running in test mode - commands will not execute"));
        }

        await runWorkflow(config, {
            interactive: options.interactive,
            testMode: options.testMode
        });
    } catch (error) {
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
    }
}

// Only run if called directly (not imported)
// Using ESM detection for direct execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
    main();
}

// Export for testing
export { main };
