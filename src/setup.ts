import { loadCredentials, saveCredentials, type SavedCredentials } from "./auth/credentials.js";
import { loginWithDeviceCode } from "./auth/device.js";
import { loginWithLoopback } from "./auth/loopback.js";
import { collectFingerprint } from "./fingerprint.js";
import { installSkills, type InstallResult } from "./install.js";
import { runPluginStoreSubstep, type SubstepResult } from "./install/substep.js";
import { createInstallReport, flushPendingReports, submitInstallReport } from "./report.js";
import type { InstallTargetId, TargetSelector } from "./targets.js";

export interface SetupOptions {
  baseUrl: string;
  cliVersion: string;
  target: TargetSelector;
  dryRun: boolean;
  noBrowser: boolean;
  skipSubstep: boolean;
}

export interface SetupResult {
  credentials: SavedCredentials | null;
  installResults: InstallResult[];
  substep: SubstepResult;
  registered: boolean;
}

export async function runSetup(options: SetupOptions): Promise<SetupResult> {
  const existing = await loadCredentials();
  if (existing && existing.accessExpire > Date.now() / 1000) {
    process.stdout.write(`\n  Already logged in as ${existing.userId} — re-running OAuth to refresh session.\n`);
  }

  process.stdout.write("\n  Step 1/2 — register for the hackathon\n\n");
  let credentials: SavedCredentials = options.noBrowser
    ? await loginWithDeviceCode({ baseUrl: options.baseUrl, clientVersion: options.cliVersion })
    : await loginWithLoopback({
        baseUrl: options.baseUrl,
        clientVersion: options.cliVersion,
        openBrowser: true
      });
  await saveCredentials(credentials);
  process.stdout.write(`\n  ✓ Registered as ${credentials.userId}\n\n`);
  process.stdout.write("  Step 2/2 — installing OKX skills\n\n");

  const installResults = await installSkills({ target: options.target, dryRun: options.dryRun });
  const substep = await runPluginStoreSubstep({ skip: options.skipSubstep || options.dryRun });

  const firstTarget = installResults[0]?.target.id ?? "generic";
  const targetForReport: InstallTargetId =
    firstTarget === "cursor" || firstTarget === "claude-code" ? firstTarget : "generic";

  const report = createInstallReport({
    target: targetForReport,
    login: { status: "success", subject: credentials.userId },
    fingerprint: collectFingerprint({
      cliVersion: options.cliVersion,
      agentRuntime: targetForReport
    }),
    substep
  });
  await submitInstallReport({ baseUrl: options.baseUrl, credentials, report }).catch(() => undefined);
  await flushPendingReports({ baseUrl: options.baseUrl, credentials }).catch(() => undefined);

  return { credentials, installResults, substep, registered: true };
}
