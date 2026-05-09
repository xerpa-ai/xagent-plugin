import { loadCredentials, saveCredentials, type SavedCredentials } from "./auth/credentials.js";
import { runLogin, type AuthMode } from "./auth/login.js";
import { collectFingerprint } from "./fingerprint.js";
import { installSkills, type InstallResult } from "./install.js";
import { aggregateSubstep, runOkxSubsteps, type SubstepResult } from "./install/substep.js";
import { createInstallReport, flushPendingReports, submitInstallReport } from "./report.js";
import type { TargetSelector } from "./targets.js";

export interface SetupOptions {
  baseUrl: string;
  frontendBase: string;
  cliVersion: string;
  target: TargetSelector;
  dryRun: boolean;
  authMode: AuthMode;
  skipSubstep: boolean;
  force: boolean;
}

export interface SetupResult {
  credentials: SavedCredentials | null;
  installResults: InstallResult[];
  substeps: SubstepResult[];
  registered: boolean;
  reusedSession: boolean;
}

export async function runSetup(options: SetupOptions): Promise<SetupResult> {
  const credentials = await ensureCredentials(options);

  process.stdout.write("\n  Step 2/2 — installing OKX skills\n\n");
  const installResults = await installSkills({ target: options.target, dryRun: options.dryRun });
  const substeps = await runOkxSubsteps({
    skip: options.skipSubstep || options.dryRun,
    force: options.force
  });

  const firstTarget = installResults[0]?.target.id ?? "generic";
  const targetForReport: "cursor" | "claude-code" | "generic" =
    firstTarget === "cursor" || firstTarget === "claude-code" ? firstTarget : "generic";

  const report = createInstallReport({
    target: targetForReport,
    login: { status: "success", subject: credentials.session.userId },
    fingerprint: collectFingerprint({
      cliVersion: options.cliVersion,
      agentRuntime: firstTarget
    }),
    substep: aggregateSubstep(substeps)
  });
  await submitInstallReport({ baseUrl: options.baseUrl, credentials: credentials.session, report }).catch(
    () => undefined
  );
  await flushPendingReports({ baseUrl: options.baseUrl, credentials: credentials.session }).catch(
    () => undefined
  );

  return {
    credentials: credentials.session,
    installResults,
    substeps,
    registered: true,
    reusedSession: credentials.reused
  };
}

interface EnsuredCredentials {
  session: SavedCredentials;
  reused: boolean;
}

async function ensureCredentials(options: SetupOptions): Promise<EnsuredCredentials> {
  const existing = await loadCredentials();
  if (!options.force && existing && existing.accessExpire > Date.now() / 1000) {
    process.stdout.write(
      `\n  ✓ Already registered as ${existing.userId} — token still valid, skipping login\n`
    );
    process.stdout.write("    (use --force to re-run OAuth or switch accounts)\n");
    return { session: existing, reused: true };
  }

  process.stdout.write("\n  Step 1/2 — register for the hackathon\n\n");
  const session = await runLogin({
    authMode: options.authMode,
    baseUrl: options.baseUrl,
    frontendBase: options.frontendBase,
    version: options.cliVersion
  });
  await saveCredentials(session);
  process.stdout.write(`\n  ✓ Registered as ${session.userId}\n\n`);
  return { session, reused: false };
}
