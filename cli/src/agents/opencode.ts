import * as p from "@clack/prompts";
import pc from "picocolors";
import { join } from "node:path";
import { REPO_URL } from "../constants.js";
import { run } from "../utils/exec.js";
import { fileExists } from "../utils/fs.js";
import type { AgentConfigResult } from "../types.js";

export async function configureOpenCode(
  _apiKey: string,
  installDir: string
): Promise<AgentConfigResult> {
  const messages: string[] = [];
  const postInstallInstructions: string[] = [];

  const spinner = p.spinner({ indicator: "dots" });
  const cloneDir = join(installDir, ".orq-skills-repo");

  // Shallow clone if not already present
  try {
    if (await fileExists(join(cloneDir, ".git"))) {
      spinner.start("Updating orq-skills repo...");
      await run("git", ["-C", cloneDir, "pull", "--ff-only"]);
      spinner.stop(pc.green("Updated orq-skills repo"));
      messages.push("Updated existing orq-skills clone");
    } else {
      spinner.start("Cloning orq-skills repo (shallow)...");
      await run("git", [
        "clone",
        "--depth",
        "1",
        REPO_URL,
        cloneDir,
      ]);
      spinner.stop(pc.green("Cloned orq-skills repo"));
      messages.push("Cloned orq-skills repo");
    }
  } catch (error) {
    spinner.stop(pc.red("Failed to clone repo"));
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      agentId: "opencode",
      success: false,
      messages: [`Failed to clone repo: ${msg}`],
    };
  }

  const skillsPath = join(cloneDir, "skills");

  postInstallInstructions.push(
    `Point OpenCode to the skills directory:`,
    `  ${pc.cyan(skillsPath)}`,
    ``,
    `Ensure ORQ_API_KEY is exported in your shell profile:`,
    `  ${pc.cyan(`export ORQ_API_KEY="your-key-here"`)}`,
  );

  return {
    agentId: "opencode",
    success: true,
    messages,
    postInstallInstructions,
  };
}
