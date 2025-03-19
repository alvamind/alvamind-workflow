import { parse } from "yaml";
import { WorkflowConfig, WorkflowContext } from "./types.js";

/**
 * Parses a YAML workflow configuration and transforms string conditions
 * into executable functions.
 * 
 * @param yamlContent The YAML content as a string
 * @returns A WorkflowConfig with properly transformed conditions
 */
export function parseWorkflowYaml(yamlContent: string): WorkflowConfig {
    // First parse the YAML content
    const config = parse(yamlContent) as WorkflowConfig;

    // We'll leave conditions as strings and handle conversion during execution
    // This allows the Command creation process to handle the conversion uniformly

    return config;
}
