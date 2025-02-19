import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { mkdir, writeFile, rm } from "fs/promises";
import { join, resolve } from "path";
import { $ } from "bun";

const TEST_DIR = ".test-tmp";
const CLI_PATH = resolve(__dirname, "../src/cli.ts");

describe("CLI", () => {
    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    test("should detect workflow.yml in current directory", async () => {
        const testWorkflow = `
version: "1.0"
name: "Auto Detect Workflow"
commands:
  - command: "echo auto-detected"
    name: "Auto Step"
`;
        // Write workflow file in test directory
        await writeFile(join(TEST_DIR, "workflow.yml"), testWorkflow);

        // Change to test directory and run CLI
        const originalCwd = process.cwd();
        process.chdir(TEST_DIR);

        const proc = await $`bun ${CLI_PATH}`.quiet();
        expect(proc.exitCode).toBe(0);
        expect(proc.stdout.toString()).toContain("Auto Detect Workflow");

        // Restore working directory
        process.chdir(originalCwd);
    });

    test("should accept workflow file path as argument", async () => {
        const testWorkflow = `
version: "1.0"
name: "Custom Path Workflow"
commands:
  - command: "echo custom-path"
    name: "Custom Step"
`;
        const workflowPath = join(TEST_DIR, "custom.yml");
        await writeFile(workflowPath, testWorkflow);

        const proc = await $`bun ${CLI_PATH} ${workflowPath}`.quiet();
        expect(proc.exitCode).toBe(0);
        expect(proc.stdout.toString()).toContain("Custom Path Workflow");
    });

    test("should fail gracefully when workflow file not found", async () => {
        try {
            await $`bun ${CLI_PATH} nonexistent.yml`.quiet();
            expect(false).toBe(true); // Should not reach here
        } catch (error: any) {
            expect(error.exitCode).toBe(1);
            expect(error.stderr.toString()).toContain("Error loading workflow file");
        }
    });

    test("should handle invalid yaml files", async () => {
        const invalidYaml = `
invalid:
  - yaml:
    content:
  -broken
`;
        const workflowPath = join(TEST_DIR, "invalid.yml");
        await writeFile(workflowPath, invalidYaml);

        try {
            await $`bun ${CLI_PATH} ${workflowPath}`.quiet();
            expect(false).toBe(true); // Should not reach here
        } catch (error: any) {
            expect(error.exitCode).toBe(1);
            expect(error.stderr.toString()).toContain("Error loading workflow file");
        }
    });

    test("should handle SIGINT signal", async () => {
        const testWorkflow = `
version: "1.0"
name: "Long Workflow"
commands:
  - command: "sleep 10"
    name: "Long Step"
`;
        const workflowPath = join(TEST_DIR, "long.yml");
        await writeFile(workflowPath, testWorkflow);

        const proc = Bun.spawn(["bun", CLI_PATH, workflowPath], {
            stderr: "pipe",
            stdout: "pipe"
        });

        // Wait a bit for the process to start
        await new Promise(resolve => setTimeout(resolve, 500));

        // Send SIGINT
        proc.kill("SIGINT");

        // Wait for process to exit
        const output = await new Response(proc.stdout).text();
        const status = await proc.exited;

        expect(status).toBe(1);
        expect(output).toContain("Workflow interrupted");
    }, 10000); // Increase timeout to 10 seconds
});
