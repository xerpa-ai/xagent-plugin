import { describe, expect, it } from "vitest";
import { PLUGIN_STORE_EXEC_COMMAND, runPluginStoreSubstep } from "../src/install/substep.js";

describe("plugin-store substep", () => {
  it("returns skipped when skip flag enabled", async () => {
    const result = await runPluginStoreSubstep({ skip: true });
    expect(result.status).toBe("skipped");
    expect(result.command).toContain("okx/plugin-store");
  });

  it("executes plugin-store install non-interactively", () => {
    expect(PLUGIN_STORE_EXEC_COMMAND).toContain("--yes");
  });
});
