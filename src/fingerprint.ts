import { createHash } from "node:crypto";
import { hostname, platform, arch } from "node:os";

export interface FingerprintInfo {
  machineIdHash: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  cliVersion: string;
  agentRuntime: string;
}

export function collectFingerprint(input: {
  cliVersion: string;
  agentRuntime: string;
}): FingerprintInfo {
  const machineIdHash = createHash("sha256")
    .update(`${platform()}|${arch()}|${hostname()}|xagent-plugin-v1`)
    .digest("hex");
  return {
    machineIdHash,
    platform: platform(),
    arch: arch(),
    nodeVersion: process.version,
    cliVersion: input.cliVersion,
    agentRuntime: input.agentRuntime
  };
}
