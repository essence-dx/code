import { readFileSync } from "node:fs";

import { checkPublicQueuePackageScriptOrder } from "./lib/public-queue-script-order";

const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");
const result = checkPublicQueuePackageScriptOrder(packageJson);

if (!result.ok) {
  console.error(result.message);
  process.exit(1);
}

console.log("public queue script order check passed");
