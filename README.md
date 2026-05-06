# Build with XAgent × OKX

One command. Browser opens, you log in (= registered), OKX skill suite installs into your agent (Cursor / Claude Code / OpenClaw). Go build.

```bash
npx @xagt/agent-plugin@latest setup --target all
```

Or install globally so you can run `xagent-plugin <cmd>` directly later:

```bash
npm i -g @xagt/agent-plugin
xagent-plugin setup --target all
```

Need to switch accounts later?

```bash
xagent-plugin logout
xagent-plugin login
```

Hackathon kicks off **May 11, 2026**. Node `>= 18.17` required.

---

## What you get out of the box

After login + install, your agent (Cursor / Claude Code / OpenClaw / any AgentSkills runtime) can:

- **Swap tokens** across 500+ DEXs on 20+ chains (XLayer, Solana, Ethereum, Base, BSC, Arbitrum, Polygon…)
- **Read any wallet** — balances, holdings, PnL, trade history
- **Discover DeFi yield** — APY, TVL, lend, borrow, stake, claim, CLMM positions
- **Scan meme launches** on pump.fun — dev rug history, bundle/sniper detection, bonding curve progress
- **Track smart money** — leaderboards, KOL trade feeds, aggregated whale signals
- **Pre-flight transactions** — token risk, honeypot detection, phishing dApp scan, signature safety
- **Get live market data** — prices, K-lines, OHLC, holder cluster analysis
- **Route to specific dApps** — Polymarket, Aave V3, Hyperliquid, PancakeSwap, Morpho

Verify you're set up:

```bash
xagent-plugin doctor
```

Prints session status, expiry, backend, and runtime versions.

## How it fits together

```
                Your hackathon product
                 (TG bot / web / CLI / extension)
   ┌──────────────┼──────────────┐
   │              │              │
 XAgent         OKX            Agent runtime
 identity       agentic        (Claude Code /
 (us)           wallet         Cursor / any)
                (OKX)          + OKX skills
   ↑              ↑              ↑
 hackathon     wallet ops      we ship them;
 registration  + signing       LLM auto-routes
```

| Layer            | Owned by                | What it does                                                  | What you do                                  |
|------------------|-------------------------|---------------------------------------------------------------|----------------------------------------------|
| Identity         | XAgent (us)             | Knows who the hacker is. Registers entries.                   | `xagent-plugin login` — once.                |
| Wallet / writes  | OKX agentic wallet      | User signs, swaps, transfers, pays gas.                       | Have your end-users connect their OKX wallet.|
| Intelligence     | Agent runtime + OKX skills | LLM matches "find me trending memes" → `okx-dex-trenches` etc. | Just chat; the runtime routes.               |
| Product          | **You**                 | UX, niche, business logic.                                    | Code it.                                     |

A finished hackathon project uses **all four layers**. The first three are already wired — you build the fourth.

## Product shapes that fit

- **AI Trading Telegram Bot** — user types "buy 100u BONK" in TG; XAgent identity tags the user; OKX agentic wallet signs the swap; OKX skill executes the route.
- **Smart Money Copy Trading dashboard** — web UI, user connects OKX wallet, backend agent runs `okx-dex-signal` to watch KOL buys, auto-mirrors positions; XAgent identity isolates per-user config.
- **DeFi Onboarding Agent** — user asks "where can I earn 8% on USDC?"; `okx-defi-invest` finds the protocol; OKX wallet does the deposit; XAgent records strategy preference.
- **Rug-proof Swap Frontend** — every swap quote runs `okx-security` first; honeypots blocked; one-click execution via OKX wallet.
- **Onchain News Desk** — agent summarizes overnight smart-money signals into a 6 a.m. digest, posts to a hacker-defined channel.

## Build something — open prompts

If you want a thinner spec to riff on:

1. *"Show me the next 10x meme before it 10xs."*
2. *"Rebalance my portfolio when any LP APY drops below 6%."*
3. *"Buy any token the top 5 KOLs all bought in the last hour, max 5% slippage."*
4. *"Summarize what whales did overnight."*
5. *"Find me the cheapest gas route to bridge USDC from Base to Solana."*

The agent does the on-chain work. You design the experience.

Five seed ideas — pick one or invent better:

1. **Agent-native trading copilot** — "buy $100 of any meme the top 10 KOLs bought in the last hour, max 5% slippage"
2. **DeFi auto-rebalancer** — agent watches your portfolio, proposes lending/staking moves when APY drifts
3. **Rug-proof swap UI** — every swap quote runs a security scan first, blocks honeypots automatically
4. **Onchain news desk** — agent that summarizes every smart-money buy signal into a 6am digest
5. **Cross-chain arbitrage scout** — finds price gaps the aggregator hasn't priced in yet

The agent does the on-chain work. You design the experience.

## Eligibility

To qualify for judging, you **must** complete `xagent-plugin setup --target all` (or `xagent-plugin login`) so you have an XAgent participant ID. Your submission file is named after that ID — judges only count submissions whose participant ID corresponds to a real XAgent account.

Each participant ID owns one folder under `projects/`. Re-submitting overwrites the existing one (open a fresh PR to update before the deadline).

Required for a valid submission:

- ✅ Registered via `xagent-plugin setup --target all` (or `xagent-plugin login`)
- ✅ Project uses **at least one** OKX skill (DEX, wallet, DeFi, signal, market, security, dApp routing, etc.)
- ✅ A public GitHub repo with your source code
- ✅ A one-line description of what it does

Optional but encouraged:

- A deployed demo URL (web app / Telegram bot / hosted API / browser extension)
- A demo video / GIF embedded in your repo README

## Submit

One command:

```bash
xagent-plugin submit
```

Asks you for:

```
  Project name:           AI Trading Telegram Bot
  One-line description:   TG bot that swaps via OKX wallet, gated by smart-money signals
  GitHub repo URL:        https://github.com/alice/ai-trading-bot
  Deployed URL (optional, blank to skip): https://t.me/my_trading_bot
```

Then your browser opens GitHub at the right URL with the submission file pre-filled. Click **"Propose new file"** → GitHub forks `xerpa-ai/xagent-plugin` to your account and opens the PR for you. **Click "Create pull request" and you're done.**

The file lands at `projects/<your-participant-id>/README.md`. Judges merge accepted submissions.

Or scripted (CI / Makefile):

```bash
xagent-plugin submit \
  --name "AI Trading Telegram Bot" \
  --intro "TG bot that swaps via OKX wallet, gated by smart-money signals" \
  --repo "https://github.com/alice/ai-trading-bot" \
  --deploy "https://t.me/my_trading_bot"
```

Lost your local credentials? Run `xagent-plugin login` again with the same XAgent account — your participant ID stays stable, so your existing submission folder stays yours.

## Get help

In-person at the venue. No Discord, no Telegram. Pull a mentor over.

---

## Reference

### Commands

```bash
xagent-plugin setup     [--target all|cursor|claude-code|generic] [--dry-run] [--no-browser] [--skip-substep]
                          # one-shot: registers + installs OKX skills
xagent-plugin submit    [--name <s>] [--intro <s>] [--repo <url>] [--deploy <url>]
                          # opens GitHub in browser to submit (requires login)
xagent-plugin login     [--no-browser]    # re-login or switch accounts
xagent-plugin logout                      # clear local credentials
xagent-plugin install   [--target ...]    # install skills only (no login)
xagent-plugin doctor                      # login + runtime status
xagent-plugin report    [--target ...]    # resend install report
xagent-plugin print-skill                 # print SKILL.md to stdout
```

Hackathon path: `setup --target all` → build → `submit`. Switch accounts with `logout` then `login`.

### Targets

| Target        | Path                                            |
|---------------|-------------------------------------------------|
| `cursor`      | `<workspace>/.cursor/skills/xagent-setup/`      |
| `claude-code` | `~/.claude/skills/xagent-setup/`                |
| `generic`     | `~/.agents/skills/xagent-setup/` (AgentSkills, OpenClaw) |
| `all`         | all of the above                                |

Credentials at `~/.config/xagent/credentials.json` (`%APPDATA%\xagent\credentials.json` on Windows), `chmod 600`.

### Backend

| Env var                  | Resolves to                       |
|--------------------------|-----------------------------------|
| _(unset)_                | `https://api.xerpaai.com` (prod)  |
| `XAGENT_ENV=test`        | `https://testdapp.xerpaai.com`    |
| `XAGENT_API_BASE=<url>`  | whatever you set                  |

Production endpoints may not be deployed yet. If `xagent-plugin login` returns `request failed: 404`, switch to `XAGENT_ENV=test`.

### Troubleshooting

| Symptom                                  | Fix                                                              |
|------------------------------------------|-------------------------------------------------------------------|
| `npx ... setup` exits 0 with no output   | You hit `0.1.0`. Pin `@latest` or `npx clear-npx-cache`.          |
| `login` returns `request failed: 404`    | Production endpoints not deployed. Use `XAGENT_ENV=test`.         |
| Browser opens but never returns          | Frontend allowlist missing host. See `docs/SETUP_FLOW.md`.        |
| `EACCES` writing to `~/.claude/skills/`  | Wrong user. Don't `sudo`.                                         |
| `command not found: xagent-plugin`       | Not globally installed. Run `npm i -g @xagt/agent-plugin`.        |

### Develop

```bash
npm install
npm test
npm run lint
npm run build
node dist/cli.js doctor
node dist/cli.js install --target generic --dry-run
```

License: UNLICENSED — XerpaAI internal tooling, hackathon use granted.
