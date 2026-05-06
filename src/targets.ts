export type InstallTargetId =
  | "cursor"
  | "claude-code"
  | "generic";

export type TargetSelector = InstallTargetId | "all";

export interface InstallTarget {
  id: InstallTargetId;
  label: string;
  base: "cwd" | "home";
  skillDirectory: string;
  notes: string;
}

export const SUPPORTED_TARGETS: readonly InstallTarget[] = [
  {
    id: "cursor",
    label: "Cursor project skill",
    base: "cwd",
    skillDirectory: ".cursor/skills/xagent-setup",
    notes: "Installs the skill into the current workspace for Cursor."
  },
  {
    id: "claude-code",
    label: "Claude Code user skill",
    base: "home",
    skillDirectory: ".claude/skills/xagent-setup",
    notes: "Installs the skill into the Claude-compatible user skill directory."
  },
  {
    id: "generic",
    label: "AgentSkills-compatible user skill",
    base: "home",
    skillDirectory: ".agents/skills/xagent-setup",
    notes: "Installs into AgentSkills-compatible user directory used by OpenClaw and similar runtimes."
  }
];

export function isTargetSelector(value: string): value is TargetSelector {
  return value === "all" || SUPPORTED_TARGETS.some((target) => target.id === value);
}

export function planInstallTargets(selector: TargetSelector): InstallTarget[] {
  if (selector === "all") {
    return [...SUPPORTED_TARGETS];
  }

  return SUPPORTED_TARGETS.filter((target) => target.id === selector);
}
