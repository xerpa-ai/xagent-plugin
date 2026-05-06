# XAgent Skill Agent Plugin

NPM-distributed installer and setup orchestrator for XAgent agent runtimes.

It performs:

1. CLI login to XAgent (`loopback` browser flow or `device-code` flow)
2. Skill installation for supported runtimes
3. Required substep:
   - `npx skills add okx/plugin-store --skill plugin-store`
4. Installation status reporting to XAgent backend

## Install

Run setup directly with `npx`:

```bash
npx @xagent/agent-plugin setup --target all
```

Install skill only (skip login/report orchestration):

```bash
npx @xagent/agent-plugin install --target cursor
npx @xagent/agent-plugin install --target claude-code
npx @xagent/agent-plugin install --target generic
```

Login only:

```bash
npx @xagent/agent-plugin login
npx @xagent/agent-plugin login --no-browser
```

Dry run:

```bash
npx @xagent/agent-plugin install --target all --dry-run
```

## Commands

- `xagent-plugin setup --target cursor|claude-code|generic|all [--no-browser] [--skip-substep] [--dry-run]`
- `xagent-plugin login [--no-browser]`
- `xagent-plugin logout`
- `xagent-plugin report --target cursor|claude-code|generic|all`
- `xagent-plugin install --target cursor|claude-code|generic|all [--dry-run]`
- `xagent-plugin doctor`
- `xagent-plugin print-skill`

## Install Targets

- `cursor` -> `<workspace>/.cursor/skills/xagent-setup`
- `claude-code` -> `~/.claude/skills/xagent-setup`
- `generic` -> `~/.agents/skills/xagent-setup`
  - This is AgentSkills-compatible and also covered by OpenClaw runtime loading precedence.

## Bundled Skill

The plugin ships `skills/xagent-setup/SKILL.md`. The skill instructs an agent to:

1. Open browser OAuth login for XAgent.
2. Run `npx skills add okx/plugin-store --skill plugin-store`.
3. Report login status, fingerprint information, target agent type, and plugin-store installation result.

`okx/plugin-store` is only a setup dependency installed by the skill. It is not part of this plugin.

## Privacy and Reporting

- IP is not collected by the CLI client.
- Server records request source IP during report ingestion.
- Fingerprint payload fields:
  - `machineIdHash`
  - `platform`
  - `arch`
  - `nodeVersion`
  - `cliVersion`
  - `agentRuntime`

See `docs/SETUP_FLOW.md` for full payload examples.

## Login Bridge Notes

- CLI browser login is bridged by backend callback routing:
  - `/xagent/plugin/cli/login` -> `testwww.xerpaai.com/userAuth?sourceApp=x-agent`
  - frontend returns `x-token` to `/xagent/plugin/cli/callback`
  - backend converts that session into loopback `code + state` (or device approval)
- If browser auth opens `userAuth` but never returns to CLI:
  - verify frontend allowlist in `xerpa-frontend/src/app/userAuth/components/externalApp/registry.tsx` contains backend callback hosts (`testdapp.xerpaai.com` for test, `api.xerpaai.com` for prod)

## Development

```bash
npm test
npm run build
npm run lint
node dist/cli.js doctor
node dist/cli.js setup --target generic --dry-run
```
