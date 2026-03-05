import { execa, type Options as ExecaOptions } from "execa";
import * as p from "@clack/prompts";

export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  spinnerMessage?: string;
}

export async function run(
  command: string,
  args: string[],
  options: ExecOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  const spinner = options.spinnerMessage
    ? p.spinner({ indicator: "dots" })
    : null;

  if (spinner) {
    spinner.start(options.spinnerMessage!);
  }

  try {
    const execaOpts: ExecaOptions = {
      cwd: options.cwd,
      env: options.env,
      reject: false,
    };

    const result = await execa(command, args, execaOpts);

    if (result.exitCode !== 0) {
      if (spinner) spinner.stop(`Failed: ${command} ${args.join(" ")}`);
      throw new Error(
        result.stderr || result.stdout || `Command exited with code ${result.exitCode}`
      );
    }

    if (spinner) spinner.stop(options.spinnerMessage!.replace("...", ""));

    return { stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    if (spinner) spinner.stop(`Failed: ${command}`);
    throw error;
  }
}

export async function commandExists(command: string): Promise<boolean> {
  try {
    const result = await execa("which", [command], { reject: false });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}
