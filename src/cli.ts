#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { installSkills } from "./install.js";
import { loadCredentials, clearCredentials } from "./auth/credentials.js";
import { loginWithDeviceCode } from "./auth/device.js";
import { loginWithLoopback } from "./auth/loopback.js";
import { saveCredentials } from "./auth/credentials.js";
import { runSetup } from "./setup.js";
import { runSubmit, NotRegisteredError } from "./submit.js";
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
  | {
      command: "submit";
      name?: string;
      intro?: string;
      repo?: string;
      deploy?: string;
    }
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

  if (command === "submit") {
    const flags: { name?: string; intro?: string; repo?: string; deploy?: string } = {};
    for (let index = 0; index < rest.length; index += 1) {
      const arg = rest[index];
      const next = rest[index + 1];
      if (arg === "--name") { flags.name = next; index += 1; continue; }
      if (arg === "--intro") { flags.intro = next; index += 1; continue; }
      if (arg === "--repo") { flags.repo = next; index += 1; continue; }
      if (arg === "--deploy") { flags.deploy = next; index += 1; continue; }
      throw new Error(`Unsupported option: ${arg}`);
    }
    return { command: "submit", ...flags };
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
    process.stdout.write(`Backend: ${resolveBaseUrl()}\n`);
    const creds = await loadCredentials();
    if (!creds) {
      process.stdout.write("Login: not logged in (run `xagent-plugin login`)\n");
    } else {
      const remaining = creds.accessExpire - Math.floor(Date.now() / 1000);
      const status = remaining > 0 ? `${Math.floor(remaining / 86400)}d remaining` : "expired";
      process.stdout.write(`Login: ${creds.userId} (${status})\n`);
    }
    return 0;
  }

  const baseUrl = resolveBaseUrl();
  const version = readPackageVersion();

  if (command.command === "login") {
    const existing = await loadCredentials();
    if (existing && existing.accessExpire > Date.now() / 1000) {
      const remainingDays = Math.floor((existing.accessExpire - Date.now() / 1000) / 86400);
      process.stdout.write(`\n  Currently logged in as ${existing.userId} (${remainingDays}d remaining).\n`);
      process.stdout.write("  Re-running OAuth to refresh / switch account...\n");
    } else {
      process.stdout.write("\n  Registering you for the XAgent × OKX hackathon\n");
    }
    process.stdout.write(`  Backend: ${baseUrl}\n`);
    const credentials = command.noBrowser
      ? await loginWithDeviceCode({ baseUrl, clientVersion: version })
      : await loginWithLoopback({ baseUrl, clientVersion: version, openBrowser: true });
    await saveCredentials(credentials);
    process.stdout.write(`\n  ✓ Logged in as ${credentials.userId}\n`);
    process.stdout.write("  ✓ Registered for the hackathon\n\n");
    process.stdout.write("  Now go build your hackathon project.\n\n");
    process.stdout.write("  Helpful next commands:\n");
    process.stdout.write("    xagent-plugin install --target all   # add OKX skills to your agents\n");
    process.stdout.write("    xagent-plugin doctor                 # check session status\n");
    process.stdout.write("    xagent-plugin submit                 # submit your project (when ready)\n\n");
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
      process.stdout.write(`  ${item.message}\n`);
    }
    process.stdout.write(`  plugin-store: ${result.substep.status}\n\n`);
    process.stdout.write(`  ✓ Registered as ${result.credentials!.userId}\n`);
    process.stdout.write("  ✓ OKX skills installed in your agents\n\n");
    process.stdout.write("  Now go build your hackathon project.\n\n");
    process.stdout.write("  When you're ready to submit:\n");
    process.stdout.write("    xagent-plugin submit\n\n");
    return 0;
  }

  if (command.command === "submit") {
    try {
      process.stdout.write("\n  Submit your hackathon project\n\n");
      const result = await runSubmit({
        cliVersion: version,
        input: {
          name: command.name,
          intro: command.intro,
          repo: command.repo,
          deploy: command.deploy
        }
      });
      process.stdout.write(`\n  ✓ Participant: ${result.participantId}\n`);
      process.stdout.write(`  ✓ File: ${result.filename}\n\n`);
      process.stdout.write("  Opened GitHub in your browser. Click \"Propose new file\" → \"Create pull request\".\n");
      process.stdout.write("  GitHub will fork the repo and open the PR for you.\n\n");
      process.stdout.write("  If the browser didn't open, go here manually:\n");
      process.stdout.write(`    ${result.url}\n\n`);
      return 0;
    } catch (error) {
      if (error instanceof NotRegisteredError) {
        process.stdout.write("\n  ✗ You are not registered.\n");
        process.stdout.write("  Run `xagent-plugin login` first to register, then submit.\n\n");
        return 1;
      }
      throw error;
    }
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
                              # one-shot: registers you + installs OKX skills
  xagent-plugin submit [--name <s>] [--intro <s>] [--repo <url>] [--deploy <url>]
                              # opens GitHub in browser to submit your project
  xagent-plugin login [--no-browser]    # re-login or switch accounts
  xagent-plugin logout                  # clear local credentials
  xagent-plugin install [--target ...]  # install skills only (no login)
  xagent-plugin doctor                  # show login + runtime status
  xagent-plugin report [--target ...]   # resend install report
  xagent-plugin print-skill             # print SKILL.md to stdout

Hackathon flow:
  1. xagent-plugin setup --target all    # register + install
  2. build your project
  3. xagent-plugin submit                # submit via GitHub PR
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

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  const here = fileURLToPath(import.meta.url);
  if (entry === here) return true;
  try {
    return realpathSync(entry) === here;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  runCli(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
