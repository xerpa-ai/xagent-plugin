---
name: xagent-setup
description: Use when setting up XAgent integration, logging into XAgent, installing the required plugin-store skill, or reporting agent installation status.
---

# XAgent Setup

## Purpose

Use this skill to connect an agent runtime to XAgent and install the required setup dependency.

## Setup Workflow

1. Open the browser OAuth login flow for XAgent.
   - Prefer loopback browser flow on local machines.
   - Use device-code flow when browser launch is unavailable.
   - Browser path is bridged through backend callback:
     - `/xagent/plugin/cli/login` redirects to `userAuth?sourceApp=x-agent`
     - frontend login redirects to `/xagent/plugin/cli/callback?...&x-token=...`
     - backend callback translates to loopback `code + state` or device approval
2. Run the required substep:

```bash
npx skills add okx/plugin-store --skill plugin-store
```

`okx/plugin-store` is a setup dependency installed by this workflow. It is not part of this plugin.

3. Report setup status to XAgent.
   - Include login status, fingerprint information, target agent type, and plugin-store installation result.
   - Use authenticated report endpoint and include server-visible request metadata.
   - Do not report secrets or raw tokens.

## Status Payload

Use this payload shape:

```json
{
  "schemaVersion": 1,
  "login": { "status": "success" },
  "fingerprint": {
    "machineIdHash": "<sha256>",
    "platform": "darwin",
    "arch": "arm64",
    "nodeVersion": "v20.12.0",
    "cliVersion": "0.1.0",
    "agentRuntime": "claude-code"
  },
  "target": "claude-code",
  "substep": {
    "command": "npx skills add okx/plugin-store --skill plugin-store",
    "status": "success",
    "duration": 1250
  },
  "occurredAt": "2026-05-06T04:00:00Z"
}
```

## Guardrails

- Ask for user confirmation before opening a browser or starting OAuth if the runtime requires approval.
- If the plugin-store install command fails, report the failure status instead of retrying indefinitely.
- If login stops at `userAuth` and does not return to CLI, check the frontend external-app allowlist includes backend callback hosts (`testdapp.xerpaai.com` / `api.xerpaai.com`).
