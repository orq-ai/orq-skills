import * as p from "@clack/prompts";
import pc from "picocolors";
import { join } from "node:path";
import { REPO_URL } from "../constants.js";
import { run } from "../utils/exec.js";
import { fileExists, ensureDir } from "../utils/fs.js";
import { symlink } from "node:fs/promises";
import type { AgentConfigResult } from "../types.js";

export async function configureCodex(
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
      agentId: "codex",
      success: false,
      messages: [`Failed to clone repo: ${msg}`],
    };
  }

  // Symlink skills into .agents/skills
  try {
    const agentsDir = join(installDir, ".agents");
    await ensureDir(agentsDir);

    const symlinkTarget = join(cloneDir, "skills");
    const symlinkPath = join(agentsDir, "skills");

    if (!(await fileExists(symlinkPath))) {
      await symlink(symlinkTarget, symlinkPath, "dir");
      messages.push("Symlinked skills/ into .agents/skills");
    } else {
      messages.push(".agents/skills symlink already exists");
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    messages.push(`Warning: Could not create symlink: ${msg}`);
  }

  postInstallInstructions.push(
    `Ensure ORQ_API_KEY is exported in your shell profile:`,
    `  ${pc.cyan(`export ORQ_API_KEY="your-key-here"`)}`,
  );

  return {
    agentId: "codex",
    success: true,
    messages,
    postInstallInstructions,
  };
}
