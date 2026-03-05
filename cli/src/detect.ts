import which from "which";
import { access } from "node:fs/promises";
import { AGENTS } from "./constants.js";
import type { AgentId, DetectionResult } from "./types.js";

async function binaryExists(name: string): Promise<boolean> {
  try {
    await which(name);
    return true;
  } catch {
    return false;
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function detectAgent(
  agent: (typeof AGENTS)[number]
): Promise<DetectionResult> {
  if (agent.detectBinary) {
    const found = await binaryExists(agent.detectBinary);
    if (found) return { id: agent.id, detected: true };
  }

  if (agent.detectPaths) {
    for (const p of agent.detectPaths) {
      if (await pathExists(p)) {
        return { id: agent.id, detected: true };
      }
    }
  }

  return { id: agent.id, detected: false };
}

export async function detectAgents(): Promise<DetectionResult[]> {
  return Promise.all(AGENTS.map(detectAgent));
}

export async function checkPrerequisites(): Promise<{
  git: boolean;
  node: boolean;
}> {
  const [git, node] = await Promise.all([
    binaryExists("git"),
    binaryExists("node"),
  ]);
  return { git, node };
}
