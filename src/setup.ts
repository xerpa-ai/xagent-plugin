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
  credentials: SavedCredentials;
  installResults: InstallResult[];
  substep: SubstepResult;
}

export async function runSetup(options: SetupOptions): Promise<SetupResult> {
  let credentials = await loadCredentials();
  if (!credentials || credentials.accessExpire <= Date.now() / 1000) {
    credentials = options.noBrowser
      ? await loginWithDeviceCode({ baseUrl: options.baseUrl, clientVersion: options.cliVersion })
      : await loginWithLoopback({
          baseUrl: options.baseUrl,
          clientVersion: options.cliVersion,
          openBrowser: true
        });
    await saveCredentials(credentials);
  }

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
  await submitInstallReport({ baseUrl: options.baseUrl, credentials, report });
  await flushPendingReports({ baseUrl: options.baseUrl, credentials });

  return { credentials, installResults, substep };
}
