import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

import { resolveDesktopReleaseBundleDir } from "../src/features/projects/server/desktop-release-source";

const source = readFileSync(join(process.cwd(), "src/features/projects/server/desktop-release-source.ts"), "utf8");

assert.equal(resolveDesktopReleaseBundleDir(undefined), join(process.cwd(), "src-tauri", "target", "release", "bundle"));
assert.equal(resolveDesktopReleaseBundleDir(" artifacts/releases "), resolve(process.cwd(), "artifacts/releases"));

const absoluteFixturePath = isAbsolute("C:\\release-bundles") ? "C:\\release-bundles" : "/tmp/release-bundles";

assert.equal(resolveDesktopReleaseBundleDir(absoluteFixturePath), absoluteFixturePath);
assert.match(
  source,
  /join\(process\.cwd\(\), "src-tauri", "target", "release", "bundle"\)/,
  "Default desktop release bundle discovery must stay scoped to the Tauri bundle directory for Vercel tracing.",
);
assert.match(
  source,
  /resolve\(\/\* turbopackIgnore: true \*\/ process\.cwd\(\), trimmedBundleDir\)/,
  "Custom desktop release bundle directories must opt out of Turbopack static tracing.",
);

console.log("desktop release source smoke passed");
