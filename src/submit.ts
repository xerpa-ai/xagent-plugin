import { execFile } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { loadCredentials, type SavedCredentials } from "./auth/credentials.js";

export interface SubmitInput {
  name?: string;
  intro?: string;
  repo?: string;
  deploy?: string;
}

export interface SubmitPayload {
  name: string;
  intro: string;
  repo: string;
  deploy?: string;
  participantId: string;
}

export interface SubmitOptions {
  cliVersion: string;
  input: SubmitInput;
  openBrowser?: boolean;
  submissionRepo?: string;
  submissionBranch?: string;
}

export interface SubmitResult {
  participantId: string;
  filename: string;
  url: string;
  markdown: string;
}

export class NotRegisteredError extends Error {
  constructor() {
    super("not registered — run `xagent-plugin login` first");
    this.name = "NotRegisteredError";
  }
}

const DEFAULT_REPO = "xerpa-ai/xagent-plugin";
const DEFAULT_BRANCH = "main";

export async function runSubmit(options: SubmitOptions): Promise<SubmitResult> {
  const credentials = await requireCredentials();

  const payload = await collectPayload(options.input, credentials);
  validatePayload(payload);

  const repo = options.submissionRepo ?? DEFAULT_REPO;
  const branch = options.submissionBranch ?? DEFAULT_BRANCH;
  const filename = `projects/${payload.participantId}/README.md`;
  const markdown = renderMarkdown(payload, options.cliVersion);
  const url = buildGitHubNewFileUrl({ repo, branch, filename, content: markdown });

  if (options.openBrowser !== false) {
    await openBrowser(url).catch(() => {
      // best-effort; if open fails, the URL is still printed by the caller
    });
  }

  return {
    participantId: payload.participantId,
    filename,
    url,
    markdown
  };
}

async function requireCredentials(): Promise<SavedCredentials> {
  const credentials = await loadCredentials();
  if (!credentials || credentials.accessExpire <= Date.now() / 1000) {
    throw new NotRegisteredError();
  }
  return credentials;
}

async function collectPayload(seed: SubmitInput, credentials: SavedCredentials): Promise<SubmitPayload> {
  if (!needsPrompt(seed)) {
    return {
      name: seed.name!,
      intro: seed.intro!,
      repo: seed.repo!,
      deploy: seed.deploy,
      participantId: credentials.userId
    };
  }
  const rl = createInterface({ input, output });
  try {
    const name = (seed.name ?? (await rl.question("  Project name: "))).trim();
    const intro = (seed.intro ?? (await rl.question("  One-line description: "))).trim();
    const repo = (seed.repo ?? (await rl.question("  GitHub repo URL: "))).trim();
    const deployRaw = (seed.deploy ?? (await rl.question("  Deployed URL (optional, blank to skip): "))).trim();
    return {
      name,
      intro,
      repo,
      deploy: deployRaw.length > 0 ? deployRaw : undefined,
      participantId: credentials.userId
    };
  } finally {
    rl.close();
  }
}

function needsPrompt(seed: SubmitInput): boolean {
  return !seed.name || !seed.intro || !seed.repo;
}

function validatePayload(p: SubmitPayload): void {
  if (!p.name) throw new Error("project name is required");
  if (!p.intro) throw new Error("description is required");
  if (!p.repo) throw new Error("GitHub repo URL is required");
  if (!/^https?:\/\//.test(p.repo)) throw new Error("repo URL must start with http(s)://");
  if (p.deploy && !/^https?:\/\//.test(p.deploy)) throw new Error("deploy URL must start with http(s)://");
}

export function renderMarkdown(payload: SubmitPayload, cliVersion: string): string {
  const submittedAt = new Date().toISOString();
  const deployLine = payload.deploy ? payload.deploy : "_n/a_";
  return `# ${payload.name}

**Participant ID:** \`${payload.participantId}\`
**Submitted via:** \`xagent-plugin@${cliVersion}\`
**Submitted at:** ${submittedAt}

## Description

${payload.intro}

## Repo

${payload.repo}

## Deployed URL

${deployLine}

## Hackathon

Build with XAgent × OKX (May 2026)
`;
}

export function buildGitHubNewFileUrl(input: {
  repo: string;
  branch: string;
  filename: string;
  content: string;
}): string {
  const lastSlash = input.filename.lastIndexOf("/");
  const dir = lastSlash >= 0 ? input.filename.slice(0, lastSlash) : "";
  const file = lastSlash >= 0 ? input.filename.slice(lastSlash + 1) : input.filename;
  const params = new URLSearchParams();
  params.set("filename", file);
  params.set("value", input.content);
  return `https://github.com/${input.repo}/new/${input.branch}/${dir}?${params.toString()}`;
}

async function openBrowser(url: string): Promise<void> {
  let cmd = "xdg-open";
  let args = [url];
  if (process.platform === "darwin") {
    cmd = "open";
  }
  if (process.platform === "win32") {
    cmd = "cmd";
    args = ["/c", "start", "", url];
  }
  await new Promise<void>((resolve, reject) => {
    execFile(cmd, args, (err) => (err ? reject(err) : resolve()));
  });
}
