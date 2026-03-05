#!/usr/bin/env node

import { Command } from "commander";
import { resolve } from "node:path";
import { runInteractive, runNonInteractive } from "../src/index.js";
import type { AgentId, SetupOptions } from "../src/types.js";

const VALID_AGENTS: AgentId[] = [
  "claude-code",
  "cursor",
  "gemini-cli",
  "codex",
  "opencode",
  "npx-skills",
];

const program = new Command()
  .name("orq-setup")
  .description("Interactive CLI installer for orq.ai eval skills")
  .version("0.1.0")
  .option("--api-key <key>", "orq.ai API key (or set ORQ_API_KEY env var)")
  .option(
    "--agents <list>",
    "comma-separated agent IDs: claude-code,cursor,gemini-cli,codex,opencode,npx-skills"
  )
  .option("--all", "configure all detected agents")
  .option(
    "--install-dir <path>",
    "directory for local installations",
    process.cwd()
  )
  .option("--non-interactive", "no prompts, fail on missing required values")
  .option("--skip-validation", "skip API key validation")
  .action(async (opts) => {
    const nonInteractive = opts.nonInteractive ?? false;

    if (nonInteractive) {
      const agents: AgentId[] = [];

      if (opts.agents) {
        const requested = opts.agents.split(",").map((s: string) => s.trim());
        for (const id of requested) {
          if (!VALID_AGENTS.includes(id as AgentId)) {
            console.error(`Unknown agent: ${id}`);
            console.error(`Valid agents: ${VALID_AGENTS.join(", ")}`);
            process.exit(1);
          }
          agents.push(id as AgentId);
        }
      }

      const options: SetupOptions = {
        apiKey: opts.apiKey || process.env.ORQ_API_KEY || "",
        agents,
        installDir: resolve(opts.installDir),
        keyStorage: "env-file",
        skipValidation: opts.skipValidation ?? false,
        nonInteractive: true,
      };

      await runNonInteractive(options);
    } else {
      // Interactive mode — pass any CLI flags as partial options
      const partialOptions: Partial<SetupOptions> = {};

      if (opts.apiKey) partialOptions.apiKey = opts.apiKey;
      if (opts.installDir !== process.cwd())
        partialOptions.installDir = resolve(opts.installDir);
      if (opts.skipValidation) partialOptions.skipValidation = true;

      if (opts.agents) {
        const requested = opts.agents.split(",").map((s: string) => s.trim());
        const validAgents: AgentId[] = [];
        for (const id of requested) {
          if (VALID_AGENTS.includes(id as AgentId)) {
            validAgents.push(id as AgentId);
          }
        }
        if (validAgents.length > 0) partialOptions.agents = validAgents;
      }

      await runInteractive(partialOptions);
    }
  });

program.parse();
