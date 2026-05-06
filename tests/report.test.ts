import { describe, expect, it } from "vitest";
import { collectFingerprint } from "../src/fingerprint.js";
import { createInstallReport } from "../src/report.js";

describe("report payload", () => {
  it("creates schema v1 report", () => {
    const fingerprint = collectFingerprint({
      cliVersion: "0.1.0",
      agentRuntime: "generic"
    });
    const report = createInstallReport({
      target: "generic",
      login: { status: "success", subject: "1" },
      fingerprint,
      substep: {
        command: "npx skills add okx/plugin-store --skill plugin-store",
        status: "success",
        duration: 10
      }
    });
    expect(report.schemaVersion).toBe(1);
    expect(report.target).toBe("generic");
    expect(report.substep.status).toBe("success");
  });
});
