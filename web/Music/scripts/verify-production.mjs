import { spawn } from "node:child_process";

const baseSteps = [
  {
    command: ["bun", "run", "typecheck"],
    name: "typecheck",
  },
  {
    command: ["bun", "run", "smoke:production"],
    name: "production smoke",
  },
  {
    command: ["bun", "run", "smoke:production:cron"],
    name: "cron monitor smoke",
  },
  {
    command: ["bun", "run", "smoke:production:auth"],
    name: "authenticated API smoke",
  },
  {
    command: ["bun", "run", "smoke:production:deep"],
    name: "deep AI/API smoke",
  },
  {
    command: ["bun", "run", "smoke:production:browser"],
    name: "browser UI smoke",
  },
  {
    command: ["bun", "run", "smoke:production:browser-auth"],
    name: "authenticated browser smoke",
  },
];

const skipFlags = new Set(process.argv.slice(2));
const skipMap = new Map([
  ["--skip-auth", new Set(["authenticated API smoke", "authenticated browser smoke"])],
  ["--skip-browser", new Set(["browser UI smoke", "authenticated browser smoke"])],
  ["--skip-cron", new Set(["cron monitor smoke"])],
  ["--skip-deep", new Set(["deep AI/API smoke"])],
  ["--skip-typecheck", new Set(["typecheck"])],
]);
const skippedNames = new Set();

for (const flag of skipFlags) {
  for (const name of skipMap.get(flag) ?? []) {
    skippedNames.add(name);
  }
}

const steps = baseSteps.filter((step) => !skippedNames.has(step.name));
const startedAt = Date.now();
const results = [];

for (const step of steps) {
  const stepStartedAt = Date.now();
  const exitCode = await runStep(step);
  const durationMs = Date.now() - stepStartedAt;
  results.push({
    durationMs,
    exitCode,
    name: step.name,
    ok: exitCode === 0,
  });

  if (exitCode !== 0) {
    break;
  }
}

const summary = {
  durationMs: Date.now() - startedAt,
  ok: results.every((result) => result.ok) && results.length === steps.length,
  results,
  skipped: Array.from(skippedNames),
};

console.log(JSON.stringify(summary, null, 2));

if (!summary.ok) {
  process.exit(1);
}

function runStep(step) {
  console.log(`\n=== ${step.name} ===`);
  const [command, ...args] = step.command;

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env: process.env,
      shell: process.platform === "win32",
      stdio: "inherit",
    });

    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}
