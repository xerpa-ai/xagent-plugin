import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("xagent-setup skill", () => {
  it("documents required setup behavior", async () => {
    const skill = await readFile("skills/xagent-setup/SKILL.md", "utf8");
    expect(skill).toMatch(/name: xagent-setup/);
    expect(skill).toMatch(/npx skills add okx\/plugin-store --skill plugin-store/);
    expect(skill).toMatch(/not part of this plugin/);
    expect(skill).toMatch(/OAuth/);
    expect(skill).toMatch(/report/i);
  });
});
