import * as p from "@clack/prompts";
import pc from "picocolors";
import { REPO_URL } from "../constants.js";
import { run } from "../utils/exec.js";
import type { AgentConfigResult } from "../types.js";

export async function configureNpxSkills(
  _apiKey: string,
  _installDir: string
): Promise<AgentConfigResult> {
  const messages: string[] = [];

  const spinner = p.spinner({ indicator: "dots" });

  try {
    spinner.start("Adding orq-skills via npx skills...");
    await run("npx", ["skills", "add", REPO_URL]);
    spinner.stop(pc.green("Added orq-skills via npx skills"));
    messages.push("Added orq-skills via npx skills CLI");
  } catch (error) {
    spinner.stop(pc.red("Failed to add skills"));
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      agentId: "npx-skills",
      success: false,
      messages: [`Failed to run npx skills add: ${msg}`],
    };
  }

  return {
    agentId: "npx-skills",
    success: true,
    messages,
  };
}
