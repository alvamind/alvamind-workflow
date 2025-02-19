#!/usr/bin/env -S bun --bun
import { loadWorkflow, runWorkflow } from "./index";
import { setIsRunning } from "./runner";
import chalk from "chalk";

process.on("SIGINT", () => {
    setIsRunning(false);
    console.log(chalk.red("\n\n🛑 Workflow interrupted"));
    process.exit(1);
});

async function main() {
    const workflowPath = process.argv[2] || "workflow.yml";
    const config = await loadWorkflow(workflowPath);
    await runWorkflow(config);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
