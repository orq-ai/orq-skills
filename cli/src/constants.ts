import type { AgentMeta } from "./types.js";

export const MCP_URL = "https://my.orq.ai/v2/mcp";
export const REPO_URL = "https://github.com/orq-ai/orq-skills";
export const API_KEYS_URL = "https://my.orq.ai/settings/api-keys";

export const SKILLS_COUNT = 22;

export function renderLogo(pc: typeof import("picocolors").default): string {
  const b = pc.cyan; // border color
  const t = (s: string) => pc.bold(pc.cyan(s)); // text block color
  const d = pc.dim; // dimmed text

  return `
  ${b("╔═══════════════════════════════════════╗")}
  ${b("║")}                                       ${b("║")}
  ${b("║")}    ${t("██████╗ ██████╗  ██████╗")}          ${b("║")}
  ${b("║")}   ${t("██╔═══██╗██╔══██╗██╔═══██╗")}         ${b("║")}
  ${b("║")}   ${t("██║   ██║██████╔╝██║   ██║")}  ${d(".ai")}    ${b("║")}
  ${b("║")}   ${t("██║   ██║██╔══██╗██║▄▄ ██║")}         ${b("║")}
  ${b("║")}   ${t("╚██████╔╝██║  ██║╚██████╔╝")}         ${b("║")}
  ${b("║")}    ${t("╚═════╝ ╚═╝  ╚═╝ ╚══▀▀═╝")}         ${b("║")}
  ${b("║")}                                       ${b("║")}
  ${b("║")}     ${d("A g e n t   S k i l l s")}         ${b("║")}
  ${b("║")}                                       ${b("║")}
  ${b("╚═══════════════════════════════════════╝")}
`;
}

export const AGENTS: AgentMeta[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    description: "Anthropic's CLI for Claude",
    detectBinary: "claude",
  },
  {
    id: "cursor",
    name: "Cursor",
    description: "AI-first code editor",
    detectPaths: [
      "/Applications/Cursor.app",
      `${process.env.HOME}/.cursor`,
      `${process.env.LOCALAPPDATA}/Programs/cursor/Cursor.exe`,
    ],
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    description: "Google's AI CLI tool",
    detectBinary: "gemini",
  },
  {
    id: "codex",
    name: "OpenAI Codex",
    description: "OpenAI's coding agent",
    detectBinary: "codex",
  },
  {
    id: "opencode",
    name: "OpenCode",
    description: "Open-source coding agent",
    detectBinary: "opencode",
  },
  {
    id: "npx-skills",
    name: "npx Skills CLI",
    description: "Skills package manager",
    detectBinary: "skills",
  },
];

export function getAgent(id: string): AgentMeta | undefined {
  return AGENTS.find((a) => a.id === id);
}
