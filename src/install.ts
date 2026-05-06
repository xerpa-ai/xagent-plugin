import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { planInstallTargets, type InstallTarget, type TargetSelector } from "./targets.js";

export interface InstallOptions {
  target: TargetSelector;
  dryRun: boolean;
  cwd?: string;
  home?: string;
}

export interface InstallResult {
  target: InstallTarget;
  destination: string;
  status: "planned" | "installed" | "skipped";
  message: string;
}

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundledSkillPath = join(packageRoot, "skills", "xagent-setup", "SKILL.md");

export async function installSkills(options: InstallOptions): Promise<InstallResult[]> {
  const cwd = options.cwd ?? process.cwd();
  const home = options.home ?? process.env.HOME;
  const targets = planInstallTargets(options.target);
  const results: InstallResult[] = [];

  for (const target of targets) {
    const baseDirectory = target.base === "home" ? home : cwd;

    if (!baseDirectory) {
      results.push({
        target,
        destination: target.skillDirectory,
        status: "skipped",
        message: `Skipped ${target.id}: HOME is not set.`
      });
      continue;
    }

    const destination = join(baseDirectory, target.skillDirectory);
    const skillFile = join(destination, "SKILL.md");

    if (!options.dryRun) {
      await mkdir(destination, { recursive: true });
      await copyFile(bundledSkillPath, skillFile);

      if (target.id === "cursor") {
        await writeCursorManifest(cwd);
      }
    }

    results.push({
      target,
      destination,
      status: options.dryRun ? "planned" : "installed",
      message: `${options.dryRun ? "Would install" : "Installed"} ${target.label} at ${skillFile}`
    });
  }

  return results;
}

async function writeCursorManifest(cwd: string): Promise<void> {
  const manifestDirectory = join(cwd, ".cursor-plugin");
  await mkdir(manifestDirectory, { recursive: true });
  await writeFile(
    join(manifestDirectory, "plugin.json"),
    `${JSON.stringify(
      {
        name: "@xagent/agent-plugin",
        displayName: "XAgent Skill Agent Plugin",
        version: "0.1.0",
        skills: ["../skills"]
      },
      null,
      2
    )}\n`
  );
}
