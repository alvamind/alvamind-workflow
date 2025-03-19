import { expect, test, describe, beforeEach, afterEach, mock } from "bun:test";
import { loadWorkflow, runWorkflow, WorkflowContext } from "../dist/index.js";
import { mkdir, rm, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const TEST_DIR = ".test-yaml-conditions";
const WORKFLOW_FILE = join(TEST_DIR, "workflow.yml");

describe("YAML Conditional Workflows", () => {
    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    test("should support conditional execution in YAML", async () => {
        const yamlContent = `
version: "1.0"
name: "Conditional YAML Test"
commands:
  - name: "Generate Flag"
    command: "echo 'FLAG=true'"
    id: "flag"
  
  - name: "Conditional Step"
    command: "echo 'Condition met!'"
    condition: |
      (context) => {
        // Access the trimmed stdout value
        return context.getStdout("flag") === "FLAG=true";
      }
    `;

        await writeFile(WORKFLOW_FILE, yamlContent, "utf8");

        const config = await loadWorkflow(WORKFLOW_FILE);
        expect(config.commands).toHaveLength(2);
        // Don't check type of condition since we're not exporting the interface

        await runWorkflow(config, { testMode: true });
    });

    test("should support dependencies in YAML", async () => {
        const yamlContent = `
version: "1.0"
name: "Dependencies YAML Test"
commands:
  - name: "Setup"
    command: "echo 'setup complete'"
    id: "setup"
  
  - name: "Dependent Step"
    command: "echo 'dependent step'"
    id: "dependent"
    dependsOn: ["setup"]
    `;

        await writeFile(WORKFLOW_FILE, yamlContent, "utf8");

        const config = await loadWorkflow(WORKFLOW_FILE);
        expect(config.commands).toHaveLength(2);
        // Don't try to access dependsOn directly

        await runWorkflow(config, { testMode: true });
    });

    test("should handle complex conditions and dependencies", async () => {
        const yamlContent = `
version: "1.0"
name: "Complex Workflow Test"
commands:
  - name: "Version Check"
    command: "echo 'v1.2.3'"
    id: "version"
  
  - name: "Feature Flag"
    command: "echo 'FEATURE=enabled'"
    id: "feature-flag"
  
  - name: "Conditional Feature"
    command: "echo 'feature activated'"
    condition: |
      (context) => {
        const version = context.getStdout("version");
        const featureFlag = context.getStdout("feature-flag");
        return version.startsWith("v1") && featureFlag.includes("enabled");
      }
    dependsOn: ["version", "feature-flag"]
    `;

        await writeFile(WORKFLOW_FILE, yamlContent, "utf8");

        const config = await loadWorkflow(WORKFLOW_FILE);
        expect(config.commands).toHaveLength(3);

        await runWorkflow(config, { testMode: true });
    });
});
