import * as p from "@clack/prompts";
import pc from "picocolors";
import { renderLogo, AGENTS, SKILLS_COUNT, API_KEYS_URL } from "./constants.js";
import { detectAgents, checkPrerequisites } from "./detect.js";
import {
  promptApiKey,
  promptInstallDir,
  promptAgentSelection,
  promptKeyStorage,
  printPostInstallSummary,
} from "./prompts.js";
import { writeEnvFile } from "./utils/fs.js";
import { validateApiKey } from "./utils/validate.js";
import { configureClaude } from "./agents/claude-code.js";
import { configureCursor } from "./agents/cursor.js";
import { configureGemini } from "./agents/gemini-cli.js";
import { configureCodex } from "./agents/codex.js";
import { configureOpenCode } from "./agents/opencode.js";
import { configureNpxSkills } from "./agents/npx-skills.js";
import type { AgentConfigResult, AgentId, SetupOptions } from "./types.js";

type AgentConfigurator = (
  apiKey: string,
  installDir: string,
  nonInteractive?: boolean
) => Promise<AgentConfigResult>;

const agentConfigurators: Record<AgentId, AgentConfigurator> = {
  "claude-code": configureClaude,
  cursor: configureCursor,
  "gemini-cli": configureGemini,
  codex: configureCodex,
  opencode: configureOpenCode,
  "npx-skills": configureNpxSkills,
};

export async function runInteractive(
  partialOptions?: Partial<SetupOptions>
): Promise<void> {
  console.log(renderLogo(pc));

  p.intro(pc.bgCyan(pc.black(" orq.ai Skills Setup ")));
  p.log.info("Configure orq.ai skills for building, evaluating, and monitoring LLM pipelines");

  // Check prerequisites
  const prereqs = await checkPrerequisites();
  if (!prereqs.node) {
    p.cancel("Node.js is required but not found in PATH.");
    process.exit(1);
  }
  if (!prereqs.git) {
    p.log.warn(
      "git not found — some agents (Codex, OpenCode) require it for installation."
    );
  }

  // Detect agents
  const spinner = p.spinner({ indicator: "dots" });
  spinner.start("Detecting installed agents...");
  const detectionResults = await detectAgents();
  const detectedNames = detectionResults
    .filter((d) => d.detected)
    .map((d) => AGENTS.find((a) => a.id === d.id)?.name)
    .filter(Boolean);

  if (detectedNames.length > 0) {
    spinner.stop(
      `Found: ${detectedNames.map((n) => pc.green(n!)).join(", ")}`
    );
  } else {
    spinner.stop(pc.dim("No agents auto-detected (you can still select manually)"));
  }

  // API key
  const envKey = process.env.ORQ_API_KEY;
  let apiKey: string;
  let workspaceName: string | undefined;

  if (partialOptions?.apiKey) {
    apiKey = partialOptions.apiKey;
  } else if (envKey) {
    p.log.info(
      `Using API key from ${pc.cyan("ORQ_API_KEY")} environment variable`
    );
    apiKey = envKey;

    if (!partialOptions?.skipValidation) {
      const vSpinner = p.spinner({ indicator: "dots" });
      vSpinner.start("Verifying API key...");
      const result = await validateApiKey(apiKey);
      if (!result.valid) {
        vSpinner.stop(pc.red(`Verification failed: ${result.error}`));
        p.cancel("Invalid API key in ORQ_API_KEY environment variable.");
        process.exit(1);
      }
      vSpinner.stop(
        pc.green("Verified") +
          (result.workspaceName
            ? ` — workspace "${result.workspaceName}"`
            : "")
      );
      workspaceName = result.workspaceName;
    }
  } else {
    const result = await promptApiKey(
      partialOptions?.skipValidation ?? false
    );
    apiKey = result.apiKey;
    workspaceName = result.workspaceName;
  }

  // Install directory
  const installDir =
    partialOptions?.installDir ?? (await promptInstallDir());

  // Agent selection
  const selectedAgents =
    partialOptions?.agents ?? (await promptAgentSelection(detectionResults));

  if (selectedAgents.length === 0) {
    p.cancel("No agents selected.");
    process.exit(0);
  }

  // Key storage
  const keyStorage =
    partialOptions?.keyStorage ?? (await promptKeyStorage());

  // Store the API key
  if (keyStorage === "env-file") {
    await writeEnvFile(installDir, "ORQ_API_KEY", apiKey);
    p.log.success(`API key written to ${pc.cyan(`${installDir}/.env`)}`);
  } else if (keyStorage === "shell-profile") {
    p.note(
      `Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):\n\n  ${pc.cyan(`export ORQ_API_KEY="${apiKey}"`)}`,
      "Shell profile"
    );
  }

  // Configure each agent
  const results: AgentConfigResult[] = [];

  for (const agentId of selectedAgents) {
    const agent = AGENTS.find((a) => a.id === agentId);
    p.log.step(`Configuring ${pc.bold(agent?.name ?? agentId)}...`);

    const configurator = agentConfigurators[agentId];
    const result = await configurator(apiKey, installDir, false);
    results.push(result);

    if (result.success) {
      for (const msg of result.messages) {
        p.log.success(msg);
      }
    } else {
      for (const msg of result.messages) {
        p.log.error(msg);
      }
    }

    if (result.postInstallInstructions?.length) {
      p.note(
        result.postInstallInstructions.join("\n"),
        `${agent?.name ?? agentId} — post-install`
      );
    }
  }

  // Summary
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  if (failCount > 0) {
    p.log.warn(
      `${failCount} agent${failCount !== 1 ? "s" : ""} failed to configure. See errors above.`
    );
  }

  const succeededAgents = results.filter((r) => r.success).map((r) => r.agentId);
  await printPostInstallSummary(successCount, SKILLS_COUNT, succeededAgents);
}

export async function runNonInteractive(
  options: SetupOptions
): Promise<void> {
  console.log(renderLogo(pc));
  p.intro(pc.bgCyan(pc.black(" orq.ai Skills Setup ")) + pc.dim(" (non-interactive)"));

  // Validate required options
  if (!options.apiKey) {
    const envKey = process.env.ORQ_API_KEY;
    if (!envKey) {
      p.cancel("--api-key or ORQ_API_KEY environment variable is required in non-interactive mode.");
      process.exit(1);
    }
    options.apiKey = envKey;
  }

  if (options.agents.length === 0) {
    p.cancel("--agents is required in non-interactive mode.");
    process.exit(1);
  }

  // Validate API key
  if (!options.skipValidation) {
    const spinner = p.spinner({ indicator: "dots" });
    spinner.start("Verifying API key...");
    const result = await validateApiKey(options.apiKey);
    if (!result.valid) {
      spinner.stop(pc.red(`Verification failed: ${result.error}`));
      process.exit(1);
    }
    spinner.stop(pc.green("Verified"));
  }

  // Store key
  if (options.keyStorage === "env-file") {
    await writeEnvFile(options.installDir, "ORQ_API_KEY", options.apiKey);
  }

  // Configure agents
  const results: AgentConfigResult[] = [];
  for (const agentId of options.agents) {
    const agent = AGENTS.find((a) => a.id === agentId);
    p.log.step(`Configuring ${agent?.name ?? agentId}...`);

    const configurator = agentConfigurators[agentId];
    if (!configurator) {
      p.log.error(`Unknown agent: ${agentId}`);
      continue;
    }

    const result = await configurator(options.apiKey, options.installDir, true);
    results.push(result);

    if (result.success) {
      result.messages.forEach((m) => p.log.success(m));
    } else {
      result.messages.forEach((m) => p.log.error(m));
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const succeededAgents = results.filter((r) => r.success).map((r) => r.agentId);
  await printPostInstallSummary(successCount, SKILLS_COUNT, succeededAgents, true);
}
