import * as p from "@clack/prompts";
import pc from "picocolors";
import { AGENTS, API_KEYS_URL, SKILLS_COUNT } from "./constants.js";
import { validateApiKey } from "./utils/validate.js";
import type {
  AgentId,
  DetectionResult,
  InstallLocation,
  KeyStorageMethod,
} from "./types.js";
import { homedir } from "node:os";
import { resolve } from "node:path";

export async function promptApiKey(
  skipValidation: boolean
): Promise<{ apiKey: string; workspaceName?: string }> {
  const apiKey = await p.text({
    message: "Enter your orq.ai API key",
    placeholder: "orq_sk_...",
    validate(value) {
      if (!value || value.trim().length === 0) return "API key is required";
    },
  });

  if (p.isCancel(apiKey)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  if (skipValidation) {
    return { apiKey: apiKey.trim() };
  }

  const spinner = p.spinner({ indicator: "dots" });
  spinner.start("Verifying API key...");

  const result = await validateApiKey(apiKey.trim());

  if (!result.valid) {
    spinner.stop(pc.red(`Verification failed: ${result.error}`));
    p.note(
      `Get your API key at ${pc.underline(API_KEYS_URL)}`,
      "Need an API key?"
    );
    p.cancel("Invalid API key.");
    process.exit(1);
  }

  spinner.stop(
    pc.green(`Verified`) +
      (result.workspaceName ? ` — workspace "${result.workspaceName}"` : "")
  );

  return { apiKey: apiKey.trim(), workspaceName: result.workspaceName };
}

export async function promptInstallDir(): Promise<string> {
  const cwd = process.cwd();
  const home = homedir();

  const location = await p.select<
    { value: InstallLocation; label: string; hint?: string }[],
    InstallLocation
  >({
    message: "Where should skills be installed?",
    options: [
      {
        value: "cwd",
        label: `Current directory`,
        hint: cwd,
      },
      {
        value: "home",
        label: "Home directory",
        hint: `${home}/.orq-skills`,
      },
      { value: "custom", label: "Custom path" },
    ],
  });

  if (p.isCancel(location)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  if (location === "cwd") return cwd;
  if (location === "home") return resolve(home, ".orq-skills");

  const customPath = await p.text({
    message: "Enter the install path",
    placeholder: "/path/to/install",
    validate(value) {
      if (!value || value.trim().length === 0) return "Path is required";
    },
  });

  if (p.isCancel(customPath)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  return resolve(customPath.trim());
}

export async function promptAgentSelection(
  detectionResults: DetectionResult[]
): Promise<AgentId[]> {
  const options = AGENTS.map((agent) => {
    const detection = detectionResults.find((d) => d.id === agent.id);
    const detected = detection?.detected ?? false;
    return {
      value: agent.id,
      label: agent.name,
      hint: detected ? pc.green("detected") : pc.dim("not detected"),
      initialValue: detected,
    };
  });

  const selected = await p.multiselect<
    { value: AgentId; label: string; hint?: string }[],
    AgentId
  >({
    message: "Select agents to configure",
    options,
    required: true,
  });

  if (p.isCancel(selected)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  return selected;
}

export async function promptKeyStorage(): Promise<KeyStorageMethod> {
  const method = await p.select<
    { value: KeyStorageMethod; label: string; hint?: string }[],
    KeyStorageMethod
  >({
    message: "How should we store your API key?",
    options: [
      {
        value: "env-file",
        label: "Add to .env file in install directory",
      },
      {
        value: "shell-profile",
        label: "Show command for shell profile",
      },
      {
        value: "skip",
        label: "Skip (I'll handle it myself)",
      },
    ],
  });

  if (p.isCancel(method)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  return method;
}

export async function printPostInstallSummary(
  configuredCount: number,
  totalSkills: number,
  configuredAgents: AgentId[],
  nonInteractive = false
): Promise<void> {
  const lines: string[] = [
    `Ask your agent: ${pc.cyan('"Can you list the available models from Orq?"')}`,
  ];

  // Show a relevant "try this" example based on the configured agents
  if (configuredAgents.includes("claude-code")) {
    lines.push(
      `Try in Claude Code: ${pc.cyan('"Help me build an agent for customer support"')}`
    );
  } else if (configuredAgents.includes("cursor")) {
    lines.push(
      `Try in Cursor: ${pc.cyan('"Help me build an agent for customer support"')}`
    );
  } else if (configuredAgents.length > 0) {
    lines.push(
      `Try: ${pc.cyan('"Help me build an agent for customer support"')}`
    );
  }

  lines.push(
    ``,
    `Dashboard: ${pc.underline("https://my.orq.ai")}`,
    `Docs:      ${pc.underline("https://docs.orq.ai")}`,
  );

  p.note(lines.join("\n"), "Next steps");

  if (!nonInteractive) {
    const openDashboard = await p.confirm({
      message: "Open orq.ai dashboard in your browser?",
      initialValue: false,
    });

    if (!p.isCancel(openDashboard) && openDashboard) {
      const { exec } = await import("node:child_process");
      const url = "https://my.orq.ai";
      const cmd =
        process.platform === "darwin"
          ? `open "${url}"`
          : process.platform === "win32"
            ? `start "${url}"`
            : `xdg-open "${url}"`;
      exec(cmd);
    }
  }

  p.outro(
    pc.green(
      `Setup complete! Installed ${totalSkills} skills for ${configuredCount} agent${configuredCount !== 1 ? "s" : ""}.`
    )
  );
}
