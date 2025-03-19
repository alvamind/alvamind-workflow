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

// Make executable if run directly
async function main() {
    try {
        const workflowPath = process.argv[2] || "workflow.yml";
        const config = await loadWorkflow(workflowPath);
        await runWorkflow(config, { interactive: true });
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
