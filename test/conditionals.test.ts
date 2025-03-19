import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { createWorkflow } from "../dist/index.js";
import { mkdir, rm, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const TEST_DIR = ".test-conditional";

describe("Conditional and Dependency Workflow", () => {
    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    test("should skip steps when condition is false", async () => {
        const testFile = join(TEST_DIR, "conditional.txt");

        // Create workflow with builder functions that will be defined
        const workflow = createWorkflow({ name: "Conditional Test" })
            .execute(`echo 'first step'`, "First Step")
            .execute(`echo 'should be skipped' > ${testFile}`, "Skipped Step")
            // We'll implement these methods in our WorkflowBuilder implementation
            .when((_context) => false, "Skip This Step")
            .execute(`echo 'final step'`, "Final Step");

        await workflow.run({ testMode: true });

        expect(existsSync(testFile)).toBe(false);
    });

    test("should execute steps when condition is true", async () => {
        const testFile = join(TEST_DIR, "executed.txt");

        const workflow = createWorkflow({ name: "Conditional Execution" })
            .execute(`echo 'first step'`, "First Step")
            .execute(`echo 'should be executed' > ${testFile}`, "Executed Step")
            .when((context) => true, "Run This Step")
            .execute(`echo 'final step'`, "Final Step");

        await workflow.run({ testMode: true });

        // The conditional step should have run, so the file should exist
        expect(existsSync(testFile)).toBe(true);
    });

    test("should access previous step results in conditions", async () => {
        const flagFile = join(TEST_DIR, "flag.txt");
        const resultFile = join(TEST_DIR, "result.txt");

        // Create a flag file
        await writeFile(flagFile, "RUN_STEP", "utf8");

        const workflow = createWorkflow({ name: "Result-based Conditions" })
            .executeWithId("check", `cat ${flagFile}`, "Check Flag")
            .execute(`echo 'conditional step' > ${resultFile}`, "Conditional Step")
            .when((ctx) => ctx.getStdout("check")?.includes("RUN_STEP") || false, "Based on flag content");

        await workflow.run({ testMode: true });

        // The conditional step should have run because the flag contains "RUN_STEP"
        expect(existsSync(resultFile)).toBe(true);
    });

    test("should respect dependencies between steps", async () => {
        const dataFile = join(TEST_DIR, "data.txt");

        const workflow = createWorkflow({ name: "Dependency Test" })
            .executeWithId("data-gen", `echo 'generated data' > ${dataFile}`, "Generate Data")
            .executeWithId("data-use", `cat ${dataFile}`, "Use Data")
            .dependsOn("data-gen");

        await workflow.run({ testMode: true });
    });

    test("should throw error on missing dependency", async () => {
        const workflow = createWorkflow({ name: "Missing Dependency" })
            .execute(`echo 'step one'`, "First Step")
            .executeWithId("uses-missing", `echo 'depends on missing'`, "Missing Dep Step")
            .dependsOn("non-existent-id");

        // This should throw because the dependency doesn't exist
        await expect(workflow.run({ testMode: true })).rejects.toThrow();
    });

    test("should access typed results from previous steps", async () => {
        let capturedValue: string | undefined;

        const workflow = createWorkflow({ name: "Typed Results" })
            .executeWithId<"version-cmd">("version-cmd", `echo 'v1.2.3'`, "Get Version")
            .execute(`echo 'using value'`, "Use Value")
            .when((ctx) => {
                const version = ctx.getStdout("version-cmd");
                capturedValue = version;
                return version?.startsWith("v1") || false;
            }, "Check Version");

        await workflow.run({ testMode: true });
        expect(capturedValue).toBe("v1.2.3");
    });

    test("should combine conditions and dependencies", async () => {
        const dataFile = join(TEST_DIR, "combined.txt");
        let conditionRan = false;

        const workflow = createWorkflow({ name: "Combined Features" })
            .executeWithId("status", `echo 'ok'`, "Status Check")
            .executeWithId("action", `echo 'action data' > ${dataFile}`, "Action Step")
            .when((ctx) => {
                conditionRan = true;
                return ctx.getStdout("status") === "ok"; // This will now properly match since we're trimming
            }, "Conditional on Status")
            .dependsOn("status");

        // Run without test mode to allow actual file creation
        await workflow.run(); // Remove test mode to actually create the file

        expect(conditionRan).toBe(true);
        expect(existsSync(dataFile)).toBe(true);
    });
});
