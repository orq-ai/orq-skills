import * as p from "@clack/prompts";
import pc from "picocolors";
import { join } from "node:path";
import { MCP_URL, REPO_URL } from "../constants.js";
import { readJson, writeJson, ensureDir } from "../utils/fs.js";
import type { AgentConfigResult } from "../types.js";

interface CursorMcpConfig {
  mcpServers: Record<
    string,
    { url: string; headers?: Record<string, string> }
  >;
}

export async function configureCursor(
  apiKey: string,
  installDir: string
): Promise<AgentConfigResult> {
  const messages: string[] = [];
  const postInstallInstructions: string[] = [];

  const spinner = p.spinner({ indicator: "dots" });

  // Write .cursor/mcp.json
  try {
    spinner.start("Configuring Cursor MCP...");

    const cursorDir = join(installDir, ".cursor");
    await ensureDir(cursorDir);

    const mcpPath = join(cursorDir, "mcp.json");
    const existing = await readJson<CursorMcpConfig>(mcpPath);

    const config: CursorMcpConfig = existing || { mcpServers: {} };
    config.mcpServers.orq = {
      url: MCP_URL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    };

    await writeJson(mcpPath, config);

    spinner.stop(pc.green("Wrote .cursor/mcp.json"));
    messages.push("Wrote .cursor/mcp.json with MCP server config");
  } catch (error) {
    spinner.stop(pc.red("Failed to write Cursor config"));
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      agentId: "cursor",
      success: false,
      messages: [`Failed to write .cursor/mcp.json: ${msg}`],
    };
  }

  // Plugin instructions
  postInstallInstructions.push(
    `Install the Cursor plugin:`,
    `  1. Open Cursor Settings > Features > Claude`,
    `  2. Add plugin from: ${pc.cyan(REPO_URL)}`,
  );

  return {
    agentId: "cursor",
    success: true,
    messages,
    postInstallInstructions,
  };
}
