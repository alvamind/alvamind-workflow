import { expect, test, describe, beforeEach, afterEach, mock, afterAll } from "bun:test";
import { loadWorkflow, runWorkflow, setTestMode } from "../src/index";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";

const TEST_DIR = ".test-tmp";

// Mock process.exit to prevent tests from actually exiting
const originalExit = process.exit;
process.exit = mock((code?: number) => {
  if (code === 1) throw new Error('Process exit with code 1');
  return undefined as never;
});

describe("Workflow Runner", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    setTestMode(true);
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  test("should load valid workflow file", async () => {
    const testWorkflow = `
version: "1.0"
name: "Test Workflow"
commands:
  - command: "echo 'test'"
    name: "Test Command"
`;
    const workflowPath = join(TEST_DIR, "test-workflow.yml");
    await writeFile(workflowPath, testWorkflow);

    const config = await loadWorkflow(workflowPath);
    expect(config.version).toBe("1.0");
    expect(config.name).toBe("Test Workflow");
    expect(config.commands).toHaveLength(1);
    expect(config.commands[0].command).toBe("echo 'test'");
  });

  test("should throw on invalid workflow file", async () => {
    const invalidYaml = `
version: 1.0
  - invalid:
    yaml: content
`;
    const workflowPath = join(TEST_DIR, "invalid-workflow.yml");
    await writeFile(workflowPath, invalidYaml);

    await expect(loadWorkflow(workflowPath)).rejects.toThrow();
  });

  test("should execute commands successfully", async () => {
    const testWorkflow = `
version: "1.0"
name: "Success Workflow"
commands:
  - command: "echo step1"
    name: "Step 1"
  - command: "echo step2"
    name: "Step 2"
`;
    const workflowPath = join(TEST_DIR, "success-workflow.yml");
    await writeFile(workflowPath, testWorkflow);

    const config = await loadWorkflow(workflowPath);
    await runWorkflow(config, { testMode: true });
  });

  test("should handle skippable failed commands", async () => {
    const testWorkflow = `
version: "1.0"
name: "Skip Workflow"
commands:
  - command: "echo success"
    name: "Success Step"
  - command: "exit 1"
    name: "Failed Step"
    skippable: true
  - command: "echo final"
    name: "Final Step"
`;
    const workflowPath = join(TEST_DIR, "skip-workflow.yml");
    await writeFile(workflowPath, testWorkflow);

    const config = await loadWorkflow(workflowPath);
    await expect(runWorkflow(config, { testMode: true })).rejects.toThrow();
  });

  test("should fail on non-skippable failed commands", async () => {
    const testWorkflow = `
version: "1.0"
name: "Fail Workflow"
commands:
  - command: "some-nonexistent-command"
    name: "Failed Step"
`;
    const workflowPath = join(TEST_DIR, "fail-workflow.yml");
    await writeFile(workflowPath, testWorkflow);

    const config = await loadWorkflow(workflowPath);
    await expect(runWorkflow(config, { testMode: true })).rejects.toThrow();
  });

  test("should handle concurrent commands execution", async () => {
    const testWorkflow = `
version: "1.0"
name: "Concurrent Workflow"
commands:
  - command: "sleep 1 && echo done1"
    name: "Long Step 1"
  - command: "sleep 0.5 && echo done2"
    name: "Long Step 2"
  - command: "echo done3"
    name: "Quick Step"
`;
    const workflowPath = join(TEST_DIR, "concurrent-workflow.yml");
    await writeFile(workflowPath, testWorkflow);

    const config = await loadWorkflow(workflowPath);
    const startTime = Date.now();
    await runWorkflow(config);
    const duration = Date.now() - startTime;

    // Should take around 1.5 seconds total
    expect(duration).toBeGreaterThan(1000);
    expect(duration).toBeLessThan(2000);
  });

  test("should handle environment variables", async () => {
    const testWorkflow = `
version: "1.0"
name: "Env Workflow"
commands:
  - command: "echo $TEST_VAR"
    name: "Env Step"
`;
    const workflowPath = join(TEST_DIR, "env-workflow.yml");
    await writeFile(workflowPath, testWorkflow);

    process.env.TEST_VAR = "test_value";
    const config = await loadWorkflow(workflowPath);
    await runWorkflow(config, { testMode: true });
    delete process.env.TEST_VAR;
  });

  test("should handle command chaining", async () => {
    const testWorkflow = `
version: "1.0"
name: "Chain Workflow"
commands:
  - command: "echo hello && echo world"
    name: "Chain Step"
`;
    const workflowPath = join(TEST_DIR, "chain-workflow.yml");
    await writeFile(workflowPath, testWorkflow);

    const config = await loadWorkflow(workflowPath);
    await runWorkflow(config, { testMode: true });
  });

  test("should handle conditional execution", async () => {
    const testWorkflow = `
version: "1.0"
name: "Conditional Workflow"
commands:
  - command: "if [ 1 -eq 1 ]; then echo success; else echo failure; fi"
    name: "Conditional Step"
`;
    const workflowPath = join(TEST_DIR, "conditional-workflow.yml");
    await writeFile(workflowPath, testWorkflow);

    const config = await loadWorkflow(workflowPath);
    await runWorkflow(config, { testMode: true });
  });

  test("should handle command substitution", async () => {
    const testWorkflow = `
version: "1.0"
name: "Substitution Workflow"
commands:
  - command: "echo $(echo sub_value)"
    name: "Substitution Step"
`;
    const workflowPath = join(TEST_DIR, "substitution-workflow.yml");
    await writeFile(workflowPath, testWorkflow);

    const config = await loadWorkflow(workflowPath);
    await runWorkflow(config, { testMode: true });
  });

  afterAll(() => {
    process.exit = originalExit;
    setTestMode(false);
  });
});
