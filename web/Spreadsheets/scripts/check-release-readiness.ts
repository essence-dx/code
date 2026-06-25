import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
) as {
  name?: string;
  scripts?: Record<string, string>;
  version?: string;
};
const tauriConfig = JSON.parse(
  readFileSync(join(root, "src-tauri", "tauri.conf.json"), "utf8"),
) as {
  bundle?: { active?: boolean; icon?: string[]; targets?: string };
  build?: {
    beforeBuildCommand?: string;
    devUrl?: string;
    frontendDist?: string;
  };
  identifier?: string;
  productName?: string;
  version?: string;
};
const cargoToml = readFileSync(join(root, "src-tauri", "Cargo.toml"), "utf8");
const capabilities = JSON.parse(
  readFileSync(join(root, "src-tauri", "capabilities", "default.json"), "utf8"),
) as { permissions?: string[]; windows?: string[] };

assert.equal(packageJson.name, "essence-excel");
assert.equal(
  packageJson.scripts?.["release:check"],
  "bun run scripts/check-release-readiness.ts",
);
assert.equal(
  packageJson.scripts?.["release:manifest"],
  "bun run scripts/create-tauri-release-manifest.ts",
);
assert.equal(
  packageJson.scripts?.["smoke:preview"],
  "bun run scripts/check-preview-smoke.ts",
);
assert.equal(packageJson.scripts?.["desktop:check"], "bun run scripts/check-tauri-packaging.ts");

assert.equal(tauriConfig.productName, "Essence Excel");
assert.equal(tauriConfig.identifier, "com.essencefromexistence.excel");
assert.equal(tauriConfig.version, packageJson.version);
assert.match(
  cargoToml,
  new RegExp(`version = "${packageJson.version?.replaceAll(".", "\\.")}"`),
  "Cargo package version must match package.json and Tauri config.",
);
assert.equal(tauriConfig.build?.beforeBuildCommand, "bun run build:desktop");
assert.equal(tauriConfig.build?.frontendDist, "../out");
assert.equal(tauriConfig.build?.devUrl, "http://localhost:3000");
assert.equal(tauriConfig.bundle?.active, true);
assert.equal(tauriConfig.bundle?.targets, "all");

for (const iconPath of tauriConfig.bundle?.icon ?? []) {
  assert.ok(
    existsSync(join(root, "src-tauri", iconPath)),
    `Tauri release icon is missing: ${iconPath}`,
  );
}

assert.deepEqual(
  capabilities.windows,
  ["main"],
  "desktop capabilities should stay scoped to the main window.",
);
assert.deepEqual(
  capabilities.permissions,
  ["core:default"],
  "desktop capabilities should not grow beyond the default permission set.",
);
assert.ok(
  existsSync(join(root, "scripts", "create-tauri-release-manifest.ts")),
  "signed release manifest automation is missing.",
);
assert.ok(
  existsSync(join(root, "scripts", "check-preview-smoke.ts")),
  "preview smoke-check automation is missing.",
);
assert.match(
  readFileSync(join(root, "scripts", "create-tauri-release-manifest.ts"), "utf8"),
  /ESSENCE_EXCEL_RELEASE_SIGNING_SECRET/,
  "release manifest must require an explicit signing secret.",
);
assert.match(
  readFileSync(join(root, "scripts", "check-preview-smoke.ts"), "utf8"),
  /ESSENCE_EXCEL_SMOKE_BASE_URL/,
  "preview smoke script must accept an explicit deployment URL.",
);

console.log("Release readiness checks passed.");
