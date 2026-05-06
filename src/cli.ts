#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { installSkills } from "./install.js";
import { loadCredentials, clearCredentials } from "./auth/credentials.js";
import { loginWithDeviceCode } from "./auth/device.js";
import { loginWithLoopback } from "./auth/loopback.js";
import { saveCredentials } from "./auth/credentials.js";
import { runSetup } from "./setup.js";
import { submitInstallReport } from "./report.js";
import { collectFingerprint } from "./fingerprint.js";
import { isTargetSelector, type TargetSelector } from "./targets.js";

export type CliCommand =
  | {
      command: "setup";
      target: TargetSelector;
      dryRun: boolean;
      noBrowser: boolean;
      skipSubstep: boolean;
    }
  | { command: "login"; noBrowser: boolean }
  | { command: "logout" }
  | { command: "report"; target: TargetSelector }
  | { command: "install"; target: TargetSelector; dryRun: boolean }
  | { command: "doctor" }
  | { command: "print-skill" }
  | { command: "help" };

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function parseArgs(args: string[]): CliCommand {
  const [command = "help", ...rest] = args;

  if (command === "doctor" || command === "print-skill" || command === "logout") {
    return { command };
  }

  if (command === "login") {
    return { command, noBrowser: rest.includes("--no-browser") };
  }

  if (command !== "install" && command !== "setup" && command !== "report") {
    return { command: "help" };
  }

  let target: TargetSelector = "all";
  let dryRun = false;
  let noBrowser = false;
  let skipSubstep = false;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--no-browser") {
      noBrowser = true;
      continue;
    }
    if (arg === "--skip-substep") {
      skipSubstep = true;
      continue;
    }

    if (arg === "--target") {
      const value = rest[index + 1];
      if (!value) {
        throw new Error("Missing value for --target");
      }
      if (!isTargetSelector(value)) {
        throw new Error(`Unsupported target: ${value}`);
      }
      target = value;
      index += 1;
      continue;
    }

    throw new Error(`Unsupported option: ${arg}`);
  }

  if (command === "setup") {
    return { command, target, dryRun, noBrowser, skipSubstep };
  }
  if (command === "report") {
    return { command, target };
  }
  return { command: "install", target, dryRun };
}

export async function runCli(args: string[]): Promise<number> {
  const command = parseArgs(args);

  if (command.command === "help") {
    writeHelp();
    return 0;
  }

  if (command.command === "print-skill") {
    const skill = await readFile(
      join(packageRoot, "skills", "xagent-setup", "SKILL.md"),
      "utf8"
    );
    process.stdout.write(skill);
    return 0;
  }

  if (command.command === "doctor") {
    const npmVersion = await getCommandVersion("npm", ["--version"]);
    process.stdout.write(`Node: ${process.versions.node}\n`);
    process.stdout.write(`npm: ${npmVersion.trim() || "unavailable"}\n`);
    process.stdout.write(`HOME: ${process.env.HOME ?? "not set"}\n`);
    return 0;
  }

  const baseUrl = resolveBaseUrl();
  const version = readPackageVersion();

  if (command.command === "login") {
    const credentials = command.noBrowser
      ? await loginWithDeviceCode({ baseUrl, clientVersion: version })
      : await loginWithLoopback({ baseUrl, clientVersion: version, openBrowser: true });
    await saveCredentials(credentials);
    process.stdout.write(`Logged in as ${credentials.userId}\n`);
    return 0;
  }

  if (command.command === "logout") {
    await clearCredentials();
    process.stdout.write("Logged out.\n");
    return 0;
  }

  if (command.command === "setup") {
    const result = await runSetup({
      baseUrl,
      cliVersion: version,
      target: command.target,
      dryRun: command.dryRun,
      noBrowser: command.noBrowser,
      skipSubstep: command.skipSubstep
    });
    for (const item of result.installResults) {
      process.stdout.write(`${item.message}\n`);
    }
    process.stdout.write(`plugin-store substep: ${result.substep.status}\n`);
    return 0;
  }

  if (command.command === "report") {
    const credentials = await loadCredentials();
    if (!credentials) {
      throw new Error("not logged in");
    }
    const target =
      command.target === "all" ? "generic" : command.target === "cursor" ? "cursor" : command.target === "claude-code" ? "claude-code" : "generic";
    await submitInstallReport({
      baseUrl,
      credentials,
      report: {
        schemaVersion: 1,
        target,
        login: { status: "success", subject: credentials.userId },
        fingerprint: collectFingerprint({ cliVersion: version, agentRuntime: target }),
        substep: { command: "manual-report", status: "skipped", duration: 0 },
        occurredAt: new Date().toISOString()
      }
    });
    process.stdout.write("Report submitted.\n");
    return 0;
  }

  const results = await installSkills({
    target: command.target,
    dryRun: command.dryRun
  });

  for (const result of results) {
    process.stdout.write(`${result.message}\n`);
  }

  return 0;
}

function writeHelp(): void {
  process.stdout.write(`Usage:
  xagent-plugin setup [--target cursor|claude-code|generic|all] [--dry-run] [--no-browser] [--skip-substep]
  xagent-plugin login [--no-browser]
  xagent-plugin logout
  xagent-plugin report [--target cursor|claude-code|generic|all]
  xagent-plugin install [--target cursor|claude-code|generic|all] [--dry-run]
  xagent-plugin doctor
  xagent-plugin print-skill
`);
}

function getCommandVersion(command: string, args: string[]): Promise<string> {
  return new Promise((resolveVersion) => {
    execFile(command, args, (error: Error | null, stdout: string) => {
      resolveVersion(error ? "" : stdout);
    });
  });
}

function readPackageVersion(): string {
  const raw = readFileSync(join(packageRoot, "package.json"), "utf8");
  const parsed = JSON.parse(raw) as { version?: string };
  return parsed.version ?? "0.0.0";
}

export function resolveBaseUrl(): string {
  if (process.env.XAGENT_API_BASE) {
    return process.env.XAGENT_API_BASE;
  }
  if (process.env.XAGENT_ENV === "test") {
    return "https://testdapp.xerpaai.com";
  }
  return "https://api.xerpaai.com";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
