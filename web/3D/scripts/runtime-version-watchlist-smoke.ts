import { strict as assert } from "node:assert";
import { createRuntimeVersionWatchlistReport } from "@/features/projects/runtime-version-watchlist";

const generatedAt = "2026-05-16T20:00:00.000Z";

const dependencies = {
  "@better-auth/drizzle-adapter": "^1.6.11",
  "@libsql/client": "^0.17.3",
  "@react-three/drei": "^10.7.7",
  "@react-three/fiber": "^9.6.1",
  "@tauri-apps/api": "^2.11.0",
  "@tauri-apps/plugin-process": "^2.3.1",
  "@tauri-apps/plugin-updater": "^2.10.1",
  "better-auth": "^1.6.11",
  "drizzle-orm": "^0.45.2",
  next: "16.2.6",
  react: "19.2.4",
  "react-dom": "19.2.4",
  three: "^0.184.0",
};

const devDependencies = {
  "@tauri-apps/cli": "^2.11.1",
  "drizzle-kit": "^0.31.10",
};

const scripts = {
  "dashboard:smoke": "bun run scripts/dashboard-production-smoke.ts",
  dev: "next dev",
  "desktop:release:manifest": "bun run scripts/desktop-release-manifest.ts",
  "desktop:release:promotion:smoke": "bun run scripts/desktop-release-promotion-smoke.ts",
  "desktop:signing:plan": "bun run scripts/desktop-signing-plan.ts",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:migrations:smoke": "bun run scripts/db-migration-coverage-smoke.ts",
  "db:push": "drizzle-kit push",
  "mesh:smoke": "bun run scripts/mesh-editing-smoke.ts",
  "model-import-repair:smoke": "bun run scripts/model-import-repair-smoke.ts",
  "release:deployment:check": "bun run scripts/release-deployment-check.ts",
  "release:post-deploy:smoke": "bun run scripts/post-deploy-synthetic-smoke.ts",
  "scene-performance:smoke": "bun run scripts/scene-performance-profiler-smoke.ts",
  tauri: "tauri",
  typecheck: "tsc --noEmit",
};

const readyReport = createRuntimeVersionWatchlistReport({
  dependencies,
  devDependencies,
  generatedAt,
  runtime: {
    bun: "1.3.13",
    node: "24.0.0",
  },
  scripts,
});

assert.equal(readyReport.summary.totalCount, 7);
assert.equal(readyReport.summary.readyCount, 7);
assert.equal(readyReport.summary.blockedCount, 0);
assert.equal(readyReport.summary.weightedScore, 100);
assert.equal(readyReport.items.find((item) => item.id === "nextjs")?.currentVersion.includes("next@16.2.6"), true);
assert.equal(readyReport.items.find((item) => item.id === "bun")?.currentVersion, "bun@1.3.13");

const watchReport = createRuntimeVersionWatchlistReport({
  dependencies,
  devDependencies,
  generatedAt,
  runtime: {
    bun: null,
    node: "24.0.0",
  },
  scripts: Object.fromEntries(Object.entries(scripts).filter(([name]) => name !== "scene-performance:smoke")),
});

assert.equal(watchReport.items.find((item) => item.id === "bun")?.status, "watch");
assert.deepEqual(watchReport.items.find((item) => item.id === "three")?.missingScripts, ["scene-performance:smoke"]);
assert.equal(watchReport.summary.watchCount, 2);

const blockedReport = createRuntimeVersionWatchlistReport({
  dependencies: {
    ...dependencies,
    next: undefined as never,
  },
  devDependencies,
  generatedAt,
  runtime: {
    bun: "1.3.13",
    node: "24.0.0",
  },
  scripts,
});

const nextItem = blockedReport.items.find((item) => item.id === "nextjs");

assert.equal(nextItem?.status, "blocked");
assert.deepEqual(nextItem?.missingPackages, ["next"]);
assert.equal(blockedReport.summary.blockedCount, 1);

console.log("runtime version watchlist smoke passed");
