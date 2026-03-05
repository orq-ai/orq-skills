export type AgentId =
  | "claude-code"
  | "cursor"
  | "gemini-cli"
  | "codex"
  | "opencode"
  | "npx-skills";

export type KeyStorageMethod = "env-file" | "shell-profile" | "skip";

export type InstallLocation = "cwd" | "home" | "custom";

export interface AgentMeta {
  id: AgentId;
  name: string;
  description: string;
  detectBinary?: string;
  detectPaths?: string[];
}

export interface DetectionResult {
  id: AgentId;
  detected: boolean;
}

export interface SetupOptions {
  apiKey: string;
  agents: AgentId[];
  installDir: string;
  keyStorage: KeyStorageMethod;
  skipValidation: boolean;
  nonInteractive: boolean;
}

export interface AgentConfigResult {
  agentId: AgentId;
  success: boolean;
  messages: string[];
  postInstallInstructions?: string[];
}

export interface ValidationResult {
  valid: boolean;
  workspaceName?: string;
  error?: string;
}
