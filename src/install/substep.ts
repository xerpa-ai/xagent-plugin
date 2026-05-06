import { spawn } from "node:child_process";

export const PLUGIN_STORE_COMMAND = [
  "skills",
  "add",
  "okx/plugin-store",
  "--skill",
  "plugin-store"
] as const;

export const PLUGIN_STORE_EXEC_COMMAND = [
  ...PLUGIN_STORE_COMMAND,
  "--yes"
] as const;

export interface SubstepResult {
  command: string;
  status: "success" | "failed" | "skipped";
  exitCode?: number;
  error?: string;
  duration: number;
}

export async function runPluginStoreSubstep(options: {
  skip: boolean;
  timeoutMs?: number;
}): Promise<SubstepResult> {
  const command = `npx ${PLUGIN_STORE_COMMAND.join(" ")}`;
  if (options.skip) {
    return { command, status: "skipped", duration: 0 };
  }

  const start = Date.now();
  const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
  return new Promise<SubstepResult>((resolve) => {
    const child = spawn("npx", [...PLUGIN_STORE_EXEC_COMMAND], { stdio: "inherit" });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({
        command,
        status: "failed",
        error: "plugin-store install timed out",
        duration: Date.now() - start
      });
    }, timeoutMs);

    child.on("error", (error: Error) => {
      clearTimeout(timer);
      resolve({
        command,
        status: "failed",
        error: error.message,
        duration: Date.now() - start
      });
    });

    child.on("exit", (code: number | null) => {
      clearTimeout(timer);
      resolve({
        command,
        status: code === 0 ? "success" : "failed",
        exitCode: code ?? 1,
        duration: Date.now() - start,
        error: code === 0 ? undefined : `exit code ${code ?? 1}`
      });
    });
  });
}
