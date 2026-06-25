import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
) as {
  scripts?: Record<string, string>;
};
const tauriConfig = JSON.parse(
  readFileSync(join(root, "src-tauri", "tauri.conf.json"), "utf8"),
) as {
  app?: {
    windows?: Array<{
      url?: string;
    }>;
  };
  build?: {
    beforeBuildCommand?: string;
    devUrl?: string;
    frontendDist?: string;
  };
  bundle?: {
    active?: boolean;
    icon?: string[];
    targets?: string;
  };
};
const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");

assert.equal(
  packageJson.scripts?.["build"],
  "next build",
  "web build must stay the default server build",
);
assert.equal(
  packageJson.scripts?.["build:desktop"],
  "bun run scripts/build-desktop.ts",
  "desktop builds must go through the runtime-scoped desktop build script",
);
assert.equal(
  packageJson.scripts?.["desktop:check"],
  "bun run scripts/check-tauri-packaging.ts",
  "desktop packaging checks must be exposed as a package script",
);

assert.match(
  nextConfig,
  /ESSENCE_EXCEL_RUNTIME/,
  "Next config must read the explicit runtime mode",
);
assert.match(
  nextConfig,
  /output:\s*isDesktopRuntime\s*\?\s*"export"\s*:\s*undefined/,
  "desktop runtime must use static export without changing web runtime",
);
assert.match(
  nextConfig,
  /NEXT_PUBLIC_ESSENCE_EXCEL_RUNTIME/,
  "runtime mode must be available to client code",
);

assert.equal(
  tauriConfig.build?.beforeBuildCommand,
  "bun run build:desktop",
  "Tauri production builds must use the desktop build command",
);
assert.equal(
  tauriConfig.build?.devUrl,
  "http://localhost:3000",
  "Tauri dev mode should continue to use the local Next dev server",
);
assert.equal(
  tauriConfig.build?.frontendDist,
  "../out",
  "Tauri production packaging must embed the static Next export output",
);
assert.equal(
  tauriConfig.app?.windows?.[0]?.url,
  "desktop/index.html",
  "Tauri should open the desktop-only static route in packaged mode",
);
assert.equal(tauriConfig.bundle?.active, true);
assert.equal(tauriConfig.bundle?.targets, "all");
assert.deepEqual(tauriConfig.bundle?.icon, [
  "icons/32x32.png",
  "icons/128x128.png",
  "icons/128x128@2x.png",
  "icons/icon.icns",
  "icons/icon.ico",
]);

assert.ok(
  existsSync(join(root, "src", "app", "desktop", "page.tsx")),
  "desktop route must exist for static Tauri packaging",
);
assert.ok(
  existsSync(join(root, "src", "features", "desktop", "desktop-workbook-shell.tsx")),
  "desktop route must load a local workbook shell",
);
assert.ok(
  existsSync(join(root, "src-tauri", "src", "lib.rs")),
  "Cargo library target must have a lib.rs entrypoint",
);
for (const iconPath of tauriConfig.bundle?.icon ?? []) {
  assert.ok(
    existsSync(join(root, "src-tauri", iconPath)),
    `configured Tauri icon is missing: ${iconPath}`,
  );
}

console.log("Tauri packaging checks passed.");
