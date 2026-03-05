import * as p from "@clack/prompts";
import pc from "picocolors";
import { MCP_URL, REPO_URL } from "../constants.js";
import { run } from "../utils/exec.js";
import type { AgentConfigResult } from "../types.js";

async function mcpExists(): Promise<boolean> {
  try {
    const { stdout } = await run("claude", ["mcp", "list"]);
    return stdout.includes("orq");
  } catch {
    return false;
  }
}

async function removeMcp(): Promise<void> {
  await run("claude", ["mcp", "remove", "orq", "--scope", "user"]);
}

async function pluginInstalled(): Promise<boolean> {
  try {
    const { stdout } = await run("claude", ["plugin", "list"]);
    return stdout.includes("orq");
  } catch {
    return false;
  }
}

export async function configureClaude(
  apiKey: string,
  _installDir: string,
  nonInteractive = false
): Promise<AgentConfigResult> {
  const messages: string[] = [];
  const postInstallInstructions: string[] = [];

  const spinner = p.spinner({ indicator: "dots" });

  // --- MCP Server Setup ---
  let exists: boolean;
  try {
    exists = await mcpExists();
  } catch {
    exists = false;
  }

  if (exists) {
    if (nonInteractive) {
      spinner.start("Removing existing orq MCP server...");
      try {
        await removeMcp();
      } catch {
        // May not exist at user scope — ignore
      }
      spinner.stop(pc.green("Removed existing orq MCP server"));
    } else {
      const action = await p.select({
        message: "orq MCP server already exists in Claude Code",
        options: [
          { value: "overwrite", label: "Overwrite", hint: "remove and re-add with new config" },
          { value: "skip", label: "Skip", hint: "keep existing config" },
        ],
      });

      if (p.isCancel(action)) {
        p.cancel("Setup cancelled.");
        process.exit(0);
      }

      if (action === "skip") {
        messages.push("Skipped MCP server (already configured)");
      } else {
        try {
          spinner.start("Removing existing orq MCP server...");
          await removeMcp();
          spinner.stop(pc.green("Removed existing orq MCP server"));
        } catch {
          spinner.stop(pc.yellow("Could not remove existing MCP server, will try adding anyway"));
        }
      }
    }
  }

  // Add MCP server (skip if user chose "skip" above)
  if (!exists || !messages.includes("Skipped MCP server (already configured)")) {
    try {
      spinner.start("Adding orq MCP server to Claude Code...");
      await run("claude", [
        "mcp",
        "add",
        "--transport",
        "http",
        "--scope",
        "user",
        "orq",
        MCP_URL,
        "--header",
        `Authorization: Bearer ${apiKey}`,
      ]);
      spinner.stop(pc.green("Added orq MCP server"));
      messages.push("Added orq MCP server");
    } catch (error) {
      spinner.stop(pc.red("Failed to add MCP server"));
      const msg =
        error instanceof Error ? error.message : "Unknown error";
      return {
        agentId: "claude-code",
        success: false,
        messages: [`Failed to add MCP server: ${msg}`],
      };
    }
  }

  // --- Plugin (Skills) Setup ---
  const hasPlugin = await pluginInstalled();

  if (!hasPlugin) {
    // Add marketplace and install plugin
    try {
      spinner.start("Adding orq skills marketplace...");
      await run("claude", ["plugin", "marketplace", "add", REPO_URL]);
      spinner.stop(pc.green("Added orq skills marketplace"));
    } catch {
      // Marketplace may already exist — continue
      spinner.stop(pc.yellow("Marketplace may already exist, continuing..."));
    }

    try {
      spinner.start("Installing orq skills plugin...");
      await run("claude", ["plugin", "install", "orq"]);
      spinner.stop(pc.green("Installed orq skills plugin"));
      messages.push("Installed orq skills plugin (22 skills)");
    } catch (error) {
      spinner.stop(pc.yellow("Could not auto-install plugin"));
      postInstallInstructions.push(
        `Install the skills plugin manually:`,
        `  ${pc.cyan(`claude plugin marketplace add ${REPO_URL}`)}`,
        `  ${pc.cyan(`claude plugin install orq`)}`,
      );
    }
  } else {
    messages.push("orq skills plugin already installed");
  }

  postInstallInstructions.push(
    `Restart Claude Code, then verify with ${pc.cyan("/skills")}`,
  );

  return {
    agentId: "claude-code",
    success: true,
    messages,
    postInstallInstructions,
  };
}
