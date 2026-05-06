import { describe, expect, it } from "vitest";
import { getCredentialPath } from "../src/auth/credentials.js";

describe("credentials path", () => {
  it("resolves a path ending with credentials.json", () => {
    expect(getCredentialPath()).toMatch(/credentials\.json$/);
  });
});
