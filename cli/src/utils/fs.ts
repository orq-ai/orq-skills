import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function readJson<T = unknown>(path: string): Promise<T | null> {
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function writeJson(
  path: string,
  data: unknown,
  spaces = 2
): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, JSON.stringify(data, null, spaces) + "\n", "utf-8");
}

export async function appendToFile(
  path: string,
  content: string
): Promise<void> {
  try {
    const existing = await readFile(path, "utf-8").catch(() => "");
    if (existing.includes(content.trim())) return; // idempotent
    await writeFile(path, existing + (existing.endsWith("\n") ? "" : "\n") + content + "\n", "utf-8");
  } catch {
    await ensureDir(dirname(path));
    await writeFile(path, content + "\n", "utf-8");
  }
}

export async function writeEnvFile(
  dir: string,
  key: string,
  value: string
): Promise<void> {
  const envPath = join(dir, ".env");
  const line = `${key}=${value}`;

  try {
    const existing = await readFile(envPath, "utf-8").catch(() => "");
    const lines = existing.split("\n");
    const idx = lines.findIndex((l) => l.startsWith(`${key}=`));

    if (idx >= 0) {
      lines[idx] = line;
    } else {
      lines.push(line);
    }

    await writeFile(envPath, lines.filter((l, i, arr) => !(l === "" && i === arr.length - 1)).join("\n") + "\n", "utf-8");
  } catch {
    await ensureDir(dir);
    await writeFile(envPath, line + "\n", "utf-8");
  }
}
