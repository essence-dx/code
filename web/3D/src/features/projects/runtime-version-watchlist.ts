export type RuntimeVersionWatchItemId = "better-auth" | "bun" | "drizzle" | "nextjs" | "tauri" | "three" | "turso";
export type RuntimeVersionWatchStatus = "blocked" | "ready" | "watch";

export interface RuntimeVersionWatchItem {
  category: string;
  currentVersion: string;
  id: RuntimeVersionWatchItemId;
  label: string;
  missingPackages: string[];
  missingScripts: string[];
  nextAction: string;
  ownerHint: string;
  packageNames: string[];
  readinessScore: number;
  requiredScripts: string[];
  status: RuntimeVersionWatchStatus;
  upgradeFocus: string;
}

export interface RuntimeVersionWatchlistReport {
  generatedAt: string;
  items: RuntimeVersionWatchItem[];
  summary: {
    blockedCount: number;
    readyCount: number;
    totalCount: number;
    watchCount: number;
    weightedScore: number;
    worstStatus: RuntimeVersionWatchStatus;
  };
}

export interface CreateRuntimeVersionWatchlistReportInput {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  generatedAt?: string;
  runtime?: {
    bun?: string | null;
    node?: string | null;
  };
  scripts?: Record<string, string>;
}

interface RuntimeVersionWatchDefinition {
  category: string;
  id: RuntimeVersionWatchItemId;
  label: string;
  ownerHint: string;
  packageNames: string[];
  requiredScripts: string[];
  runtimeKey?: "bun" | "node";
  upgradeFocus: string;
}

const watchDefinitions: RuntimeVersionWatchDefinition[] = [
  {
    category: "Framework",
    id: "nextjs",
    label: "Next.js App Router",
    ownerHint: "Web platform owner",
    packageNames: ["next", "react", "react-dom"],
    requiredScripts: ["typecheck", "dashboard:smoke", "release:deployment:check", "release:post-deploy:smoke"],
    runtimeKey: "node",
    upgradeFocus: "Keep App Router, React, route handlers, and deployment smoke checks moving together.",
  },
  {
    category: "Runtime",
    id: "bun",
    label: "Bun runtime",
    ownerHint: "Tooling owner",
    packageNames: [],
    requiredScripts: ["typecheck", "dev"],
    runtimeKey: "bun",
    upgradeFocus: "Confirm Bun can run package scripts and TypeScript checks before changing package manager behavior.",
  },
  {
    category: "Desktop",
    id: "tauri",
    label: "Tauri desktop",
    ownerHint: "Desktop release owner",
    packageNames: ["@tauri-apps/api", "@tauri-apps/cli", "@tauri-apps/plugin-process", "@tauri-apps/plugin-updater"],
    requiredScripts: ["tauri", "desktop:signing:plan", "desktop:release:manifest", "desktop:release:promotion:smoke"],
    upgradeFocus: "Keep the JavaScript API, CLI, updater metadata, and signing workflow aligned.",
  },
  {
    category: "Auth",
    id: "better-auth",
    label: "Better Auth",
    ownerHint: "Auth owner",
    packageNames: ["better-auth", "@better-auth/drizzle-adapter"],
    requiredScripts: ["dashboard:smoke", "db:migrations:smoke"],
    upgradeFocus: "Protect email/password auth, seeded admin access, Drizzle adapter compatibility, and dashboard smoke coverage.",
  },
  {
    category: "Database",
    id: "drizzle",
    label: "Drizzle ORM",
    ownerHint: "Data owner",
    packageNames: ["drizzle-orm", "drizzle-kit"],
    requiredScripts: ["db:generate", "db:migrate", "db:push", "db:migrations:smoke"],
    upgradeFocus: "Keep schema generation, migrations, and migration smoke coverage healthy before ORM upgrades.",
  },
  {
    category: "Database",
    id: "turso",
    label: "Turso/libSQL",
    ownerHint: "Data owner",
    packageNames: ["@libsql/client"],
    requiredScripts: ["db:migrations:smoke", "release:deployment:check"],
    upgradeFocus: "Verify libSQL client compatibility, Turso env readiness, and migration coverage before database-client upgrades.",
  },
  {
    category: "3D runtime",
    id: "three",
    label: "Three.js renderer",
    ownerHint: "Rendering owner",
    packageNames: ["three", "@react-three/fiber", "@react-three/drei"],
    requiredScripts: ["mesh:smoke", "model-import-repair:smoke", "scene-performance:smoke"],
    upgradeFocus: "Protect mesh editing, model repair, and scene performance before changing renderer packages.",
  },
];

const statusRank: Record<RuntimeVersionWatchStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

function manifestVersion(name: string, input: CreateRuntimeVersionWatchlistReportInput) {
  return input.dependencies?.[name] ?? input.devDependencies?.[name] ?? null;
}

function currentVersionForDefinition(definition: RuntimeVersionWatchDefinition, input: CreateRuntimeVersionWatchlistReportInput) {
  const versions = definition.packageNames.flatMap((name) => {
    const version = manifestVersion(name, input);

    return version ? [`${name}@${version}`] : [];
  });

  if (definition.runtimeKey) {
    const runtimeVersion = input.runtime?.[definition.runtimeKey];
    versions.unshift(runtimeVersion ? `${definition.runtimeKey}@${runtimeVersion}` : `${definition.runtimeKey}@unavailable`);
  }

  return versions.length > 0 ? versions.join(", ") : "Manifest scripts only";
}

function missingScripts(requiredScripts: string[], scripts: Record<string, string> | undefined) {
  const scriptNames = new Set(Object.keys(scripts ?? {}));

  return requiredScripts.filter((script) => !scriptNames.has(script));
}

function readinessScore(input: {
  missingPackages: string[];
  missingScripts: string[];
  runtimeUnavailable: boolean;
}) {
  return Math.max(0, 100 - input.missingPackages.length * 25 - input.missingScripts.length * 10 - (input.runtimeUnavailable ? 10 : 0));
}

function statusForItem(score: number, missingPackages: string[], hasWatchSignals: boolean): RuntimeVersionWatchStatus {
  if (missingPackages.length > 0 || score < 55) {
    return "blocked";
  }

  if (hasWatchSignals) {
    return "watch";
  }

  return score >= 90 ? "ready" : "watch";
}

function nextActionForItem(item: {
  definition: RuntimeVersionWatchDefinition;
  missingPackages: string[];
  missingScripts: string[];
  runtimeUnavailable: boolean;
  status: RuntimeVersionWatchStatus;
}) {
  if (item.missingPackages.length > 0) {
    return `Add or restore ${item.missingPackages.join(", ")} before planning the next upgrade.`;
  }

  if (item.missingScripts.length > 0) {
    return `Add lightweight coverage for ${item.missingScripts.join(", ")} before upgrading ${item.definition.label}.`;
  }

  if (item.runtimeUnavailable) {
    return `Capture the active ${item.definition.runtimeKey} runtime version in the execution environment before upgrade rehearsal.`;
  }

  return item.status === "ready" ? `Run the mapped smoke checks before changing ${item.definition.label}.` : `Review watch items before changing ${item.definition.label}.`;
}

function createItem(definition: RuntimeVersionWatchDefinition, input: CreateRuntimeVersionWatchlistReportInput): RuntimeVersionWatchItem {
  const missingPackages = definition.packageNames.filter((name) => !manifestVersion(name, input));
  const missingScriptNames = missingScripts(definition.requiredScripts, input.scripts);
  const runtimeUnavailable = definition.runtimeKey ? !input.runtime?.[definition.runtimeKey] : false;
  const score = readinessScore({
    missingPackages,
    missingScripts: missingScriptNames,
    runtimeUnavailable,
  });
  const status = statusForItem(score, missingPackages, missingScriptNames.length > 0 || runtimeUnavailable);

  return {
    category: definition.category,
    currentVersion: currentVersionForDefinition(definition, input),
    id: definition.id,
    label: definition.label,
    missingPackages,
    missingScripts: missingScriptNames,
    nextAction: nextActionForItem({
      definition,
      missingPackages,
      missingScripts: missingScriptNames,
      runtimeUnavailable,
      status,
    }),
    ownerHint: definition.ownerHint,
    packageNames: definition.packageNames,
    readinessScore: score,
    requiredScripts: definition.requiredScripts,
    status,
    upgradeFocus: definition.upgradeFocus,
  };
}

function summarizeItems(items: RuntimeVersionWatchItem[]): RuntimeVersionWatchlistReport["summary"] {
  const weightedScore = Math.round(items.reduce((sum, item) => sum + item.readinessScore, 0) / Math.max(items.length, 1));
  const worstStatus = items.reduce<RuntimeVersionWatchStatus>((worst, item) => (statusRank[item.status] < statusRank[worst] ? item.status : worst), "ready");

  return {
    blockedCount: items.filter((item) => item.status === "blocked").length,
    readyCount: items.filter((item) => item.status === "ready").length,
    totalCount: items.length,
    watchCount: items.filter((item) => item.status === "watch").length,
    weightedScore,
    worstStatus,
  };
}

export function createRuntimeVersionWatchlistReport(input: CreateRuntimeVersionWatchlistReportInput): RuntimeVersionWatchlistReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const items = watchDefinitions.map((definition) => createItem(definition, input));

  return {
    generatedAt,
    items,
    summary: summarizeItems(items),
  };
}
