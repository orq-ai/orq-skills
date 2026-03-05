import * as p from "@clack/prompts";
import pc from "picocolors";
import { REPO_URL } from "../constants.js";
import { run } from "../utils/exec.js";
import type { AgentConfigResult } from "../types.js";

export async function configureGemini(
  _apiKey: string,
  _installDir: string
): Promise<AgentConfigResult> {
  const messages: string[] = [];
  const postInstallInstructions: string[] = [];

  const spinner = p.spinner({ indicator: "dots" });

  try {
    spinner.start("Installing Gemini CLI extension...");
    await run("gemini", [
      "extensions",
      "install",
      REPO_URL,
      "--consent",
    ]);
    spinner.stop(pc.green("Installed Gemini CLI extension"));
    messages.push("Installed orq-skills Gemini extension");
  } catch (error) {
    spinner.stop(pc.red("Failed to install Gemini extension"));
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      agentId: "gemini-cli",
      success: false,
      messages: [`Failed to install extension: ${msg}`],
    };
  }

  postInstallInstructions.push(
    `Ensure ORQ_API_KEY is exported in your shell profile:`,
    `  ${pc.cyan(`export ORQ_API_KEY="your-key-here"`)}`,
  );

  return {
    agentId: "gemini-cli",
    success: true,
    messages,
    postInstallInstructions,
  };
}
