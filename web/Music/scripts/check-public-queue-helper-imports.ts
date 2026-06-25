import { readFileSync } from "node:fs";

const entryPoints = [
  "scripts/check-public-queue-script-order.ts",
  "scripts/test-public-queue-script-order.ts",
] as const;
const scopedHelperImport = './lib/public-queue-script-order';
const rootHelperImport = './public-queue-script-order';

for (const entryPoint of entryPoints) {
  const source = readFileSync(new URL(`../${entryPoint}`, import.meta.url), "utf8");

  if (!source.includes(scopedHelperImport)) {
    console.error(`${entryPoint} must import the scoped public queue helper from ${scopedHelperImport}.`);
    process.exit(1);
  }

  if (source.includes(rootHelperImport)) {
    console.error(`${entryPoint} must not import the old root public queue helper path.`);
    process.exit(1);
  }
}

console.log("public queue helper import check passed");
