#!/usr/bin/env bun

import { loadWorkflow, runWorkflow } from "./index";
import { setIsRunning } from "./runner";
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
        await runWorkflow(config);
    } catch (error) {
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
    }
}

// Only run if called directly (not imported)
if (import.meta.path === Bun.main) {
    main();
}

// Export for testing
export { main };
