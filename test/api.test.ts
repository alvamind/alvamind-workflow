import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { createWorkflow } from "../src";
import { mkdir, rm } from "fs/promises";
import { join } from "path";

const TEST_DIR = ".test-tmp";

describe("Programmatic API", () => {
    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    test("should create workflow with name", () => {
        const workflow = createWorkflow({ name: "Test Workflow" });
        const config = workflow.build();

        expect(config.name).toBe("Test Workflow");
        expect(config.version).toBe("1.0");
        expect(config.commands).toBeArray();
        expect(config.commands).toHaveLength(0);
    });

    test("should chain commands", () => {
        const workflow = createWorkflow()
            .name("Chain Test")
            .addCommand("echo 'step 1'", "First Step")
            .addCommand("echo 'step 2'", "Second Step", true);

        const config = workflow.build();
        expect(config.commands).toHaveLength(2);
        expect(config.commands[0].name).toBe("First Step");
        expect(config.commands[0].skippable).toBe(false);
        expect(config.commands[1].name).toBe("Second Step");
        expect(config.commands[1].skippable).toBe(true);
    });

    test("should execute workflow", async () => {
        const workflow = createWorkflow({ name: "Execution Test" })
            .addCommand("echo 'testing'", "Echo Test")
            .addCommand("pwd", "Print Directory");

        await workflow.run({ testMode: true });
    });

    test("should handle command failures", async () => {
        const workflow = createWorkflow()
            .addCommand("exit 1", "Failed Command", true)
            .addCommand("echo 'should still run'", "Next Command");

        await expect(workflow.run({ testMode: true })).rejects.toThrow();
    });

    test("should handle environment variables", async () => {
        process.env.TEST_API_VAR = "test_value";

        const workflow = createWorkflow()
            .addCommand("echo $TEST_API_VAR", "Echo Env");

        await workflow.run({ testMode: true });
        delete process.env.TEST_API_VAR;
    });

    test("should accept command chaining", async () => {
        const workflow = createWorkflow()
            .addCommand("echo 'first' && echo 'second'", "Multiple Commands");

        await workflow.run({ testMode: true });
    });

    test("should handle shell operations", async () => {
        const testFile = join(TEST_DIR, "test.txt");

        const workflow = createWorkflow()
            .addCommand(`echo 'content' > ${testFile}`, "Create File")
            .addCommand(`cat ${testFile}`, "Read File")
            .addCommand(`rm ${testFile}`, "Delete File");

        await workflow.run({ testMode: true });
    });

    test("should maintain workflow config immutability", () => {
        const workflow = createWorkflow();
        const config1 = workflow.build();

        workflow.addCommand("echo 'new'", "New Command");
        const config2 = workflow.build();

        expect(config1.commands).toHaveLength(0);
        expect(config2.commands).toHaveLength(1);
    });

    test("should merge options with defaults", async () => {
        const workflow = createWorkflow()
            .addCommand("echo 'test options'", "Test Options");

        // Test with no options
        await workflow.run();

        // Test with testMode
        await workflow.run({ testMode: true });

        // Test with custom name
        const namedWorkflow = createWorkflow({ name: "Custom Name" });
        const config = namedWorkflow.build();
        expect(config.name).toBe("Custom Name");
    });
});
