import { MCP_URL } from "../constants.js";
import type { ValidationResult } from "../types.js";

export async function validateApiKey(
  apiKey: string
): Promise<ValidationResult> {
  try {
    const response = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "orq-setup", version: "0.1.0" },
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: "Invalid API key" };
      }
      if (response.status >= 500) {
        // Server error — not an auth problem, treat as valid (server may be temporarily down)
        return { valid: true, workspaceName: "orq.ai" };
      }
      return {
        valid: false,
        error: `Server returned ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      result?: { serverInfo?: { name?: string } };
      error?: { message?: string };
    };

    if (data.error) {
      return { valid: false, error: data.error.message };
    }

    const serverName = data.result?.serverInfo?.name;
    return {
      valid: true,
      workspaceName: serverName || "orq.ai",
    };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to connect to orq.ai",
    };
  }
}
