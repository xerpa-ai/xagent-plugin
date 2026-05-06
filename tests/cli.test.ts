import { describe, expect, it } from "vitest";
import { parseArgs, resolveBaseUrl } from "../src/cli.js";

describe("parseArgs", () => {
  it("parses setup with new flags", () => {
    expect(parseArgs(["setup", "--target", "generic", "--no-browser", "--skip-substep"])).toEqual({
      command: "setup",
      target: "generic",
      dryRun: false,
      noBrowser: true,
      skipSubstep: true
    });
  });

  it("parses login and report", () => {
    expect(parseArgs(["login", "--no-browser"])).toEqual({ command: "login", noBrowser: true });
    expect(parseArgs(["report", "--target", "cursor"])).toEqual({ command: "report", target: "cursor" });
  });

  it("rejects removed openclaw target", () => {
    expect(() => parseArgs(["install", "--target", "openclaw"])).toThrow(/Unsupported target/);
  });
});

describe("resolveBaseUrl", () => {
  it("uses Xerpa test and production API defaults", () => {
    const originalBase = process.env.XAGENT_API_BASE;
    const originalEnv = process.env.XAGENT_ENV;

    delete process.env.XAGENT_API_BASE;
    process.env.XAGENT_ENV = "test";
    expect(resolveBaseUrl()).toBe("https://testdapp.xerpaai.com");

    delete process.env.XAGENT_ENV;
    expect(resolveBaseUrl()).toBe("https://api.xerpaai.com");

    process.env.XAGENT_API_BASE = "https://custom.example.com";
    expect(resolveBaseUrl()).toBe("https://custom.example.com");

    if (originalBase === undefined) {
      delete process.env.XAGENT_API_BASE;
    } else {
      process.env.XAGENT_API_BASE = originalBase;
    }
    if (originalEnv === undefined) {
      delete process.env.XAGENT_ENV;
    } else {
      process.env.XAGENT_ENV = originalEnv;
    }
  });
});
