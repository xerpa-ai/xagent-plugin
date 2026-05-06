import { describe, expect, it } from "vitest";
import { planInstallTargets } from "../src/targets.js";

describe("targets", () => {
  it("expands all to three supported targets", () => {
    expect(planInstallTargets("all").map((item) => item.id)).toEqual([
      "cursor",
      "claude-code",
      "generic"
    ]);
  });

  it("does not include openclaw paths", () => {
    const directories = planInstallTargets("all").map((item) => item.skillDirectory);
    expect(directories.some((dir) => dir.includes(".openclaw"))).toBe(false);
  });
});
