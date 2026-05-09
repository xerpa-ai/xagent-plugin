import { describe, expect, it } from "vitest";
import {
  OKX_SUBSTEPS,
  aggregateSubstep,
  runOkxSubsteps,
  type SubstepResult
} from "../src/install/substep.js";

describe("OKX substeps", () => {
  it("returns one skipped result per registered step when skip flag enabled", async () => {
    const results = await runOkxSubsteps({ skip: true });
    expect(results).toHaveLength(OKX_SUBSTEPS.length);
    for (const r of results) {
      expect(r.status).toBe("skipped");
    }
  });

  it("runs onchainos-skills before plugin-store", () => {
    const names = OKX_SUBSTEPS.map((s) => s.name);
    expect(names).toEqual(["onchainos-skills", "plugin-store"]);
  });

  it("executes each step non-interactively (--yes)", () => {
    for (const step of OKX_SUBSTEPS) {
      expect(step.args).toContain("--yes");
    }
  });
});

describe("aggregateSubstep", () => {
  const base = (s: Partial<SubstepResult>): SubstepResult => ({
    name: "x",
    command: "npx x",
    status: "success",
    duration: 1,
    ...s
  });

  it("returns failed if any step failed", () => {
    expect(
      aggregateSubstep([base({ status: "success" }), base({ status: "failed", error: "boom" })]).status
    ).toBe("failed");
  });

  it("returns skipped only if all skipped", () => {
    expect(aggregateSubstep([base({ status: "skipped" }), base({ status: "skipped" })]).status).toBe("skipped");
  });

  it("returns success when all success", () => {
    expect(aggregateSubstep([base({ status: "success" })]).status).toBe("success");
  });
});
