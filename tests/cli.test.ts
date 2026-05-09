import { describe, expect, it } from "vitest";
import { parseArgs, resolveBaseUrl } from "../src/cli.js";

describe("parseArgs", () => {
  it("parses setup with new flags", () => {
    expect(parseArgs(["setup", "--target", "generic", "--no-browser", "--skip-substep", "--force"])).toEqual({
      command: "setup",
      target: "generic",
      dryRun: false,
      authMode: "device",
      skipSubstep: true,
      force: true
    });
  });

  it("defaults setup to paste auth mode and force=false", () => {
    expect(parseArgs(["setup", "--target", "generic"])).toEqual({
      command: "setup",
      target: "generic",
      dryRun: false,
      authMode: "paste",
      skipSubstep: false,
      force: false
    });
  });

  it("parses --loopback as loopback auth mode", () => {
    expect(parseArgs(["login", "--loopback"])).toEqual({ command: "login", authMode: "loopback" });
  });

  it("parses login and report", () => {
    expect(parseArgs(["login", "--no-browser"])).toEqual({ command: "login", authMode: "device" });
    expect(parseArgs(["login"])).toEqual({ command: "login", authMode: "paste" });
    expect(parseArgs(["report", "--target", "cursor"])).toEqual({ command: "report", target: "cursor" });
  });

  it("rejects removed openclaw target", () => {
    expect(() => parseArgs(["install", "--target", "openclaw"])).toThrow(/Unsupported target/);
  });
});

describe("resolveBaseUrl", () => {
  it("defaults to prod and honors XAGT_API_BASE override", () => {
    const originalBase = process.env.XAGT_API_BASE;

    delete process.env.XAGT_API_BASE;
    expect(resolveBaseUrl()).toBe("https://api.xerpaai.com");

    process.env.XAGT_API_BASE = "https://custom.example.com";
    expect(resolveBaseUrl()).toBe("https://custom.example.com");

    if (originalBase === undefined) {
      delete process.env.XAGT_API_BASE;
    } else {
      process.env.XAGT_API_BASE = originalBase;
    }
  });
});
