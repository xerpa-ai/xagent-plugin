import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
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
  submissionRepo?: string;
  submissionBranch?: string;
  outputDir?: string;
}

export interface SubmitResult {
  participantId: string;
  filename: string;
  forkUrl: string;
  repoUrl: string;
  localPath: string;
  markdown: string;
}

export class NotRegisteredError extends Error {
  constructor() {
    super("not registered — run `xagt-plugin login` first");
    this.name = "NotRegisteredError";
  }
}

const DEFAULT_REPO = "xerpa-ai/xagt-plugin";
const DEFAULT_BRANCH = "main";

export async function runSubmit(options: SubmitOptions): Promise<SubmitResult> {
  const credentials = await requireCredentials();

  const payload = await collectPayload(options.input, credentials);
  validatePayload(payload);

  const repo = options.submissionRepo ?? DEFAULT_REPO;
  const branch = options.submissionBranch ?? DEFAULT_BRANCH;
  const filename = `projects/${payload.participantId}/README.md`;
  const markdown = renderMarkdown(payload, options.cliVersion);
  const repoUrl = `https://github.com/${repo}`;
  const forkUrl = `${repoUrl}/fork`;

  const outDir = options.outputDir ?? process.cwd();
  const localPath = resolve(outDir, `submission-${payload.participantId}.md`);
  await writeFile(localPath, markdown, "utf8");

  return {
    participantId: payload.participantId,
    filename,
    forkUrl,
    repoUrl,
    localPath,
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
  const askRequired = async (label: string, seeded?: string): Promise<string> => {
    if (seeded && seeded.trim()) return seeded.trim();
    while (true) {
      const v = (await rl.question(`  ${label}: `)).trim();
      if (v) return v;
      output.write(`  (${label} is required)\n`);
    }
  };
  try {
    const name = await askRequired("Project name", seed.name);
    const intro = await askRequired("One-line description", seed.intro);
    const repo = await askRequired("GitHub repo URL", seed.repo);
    const deployRaw = (seed.deploy ?? (await rl.question("  Deployed URL (optional, blank to skip): "))).trim();
    return {
      name,
      intro,
      repo: normalizeUrl(repo),
      deploy: deployRaw.length > 0 ? normalizeUrl(deployRaw) : undefined,
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
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export function renderMarkdown(payload: SubmitPayload, cliVersion: string): string {
  const submittedAt = new Date().toISOString();
  const deployLine = payload.deploy ? payload.deploy : "_n/a_";
  return `# ${payload.name}

**Participant ID:** \`${payload.participantId}\`
**Submitted via:** \`xagt-plugin@${cliVersion}\`
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

