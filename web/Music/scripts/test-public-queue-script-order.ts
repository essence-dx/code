import assert from "node:assert/strict";

import { checkPublicQueuePackageScriptOrder } from "./lib/public-queue-script-order";

const orderedPackageJson = JSON.stringify(
  {
    scripts: {
      "check:public-queue:imports": "bun run scripts/check-public-queue-helper-imports.ts",
      "check:public-queue:order": "bun run scripts/check-public-queue-script-order.ts",
      "check:public-queue:fixtures": "rg -n \"^import\" scripts/test-fixtures/public-interaction-queue.ts",
      "test:public-queue:order": "bun run scripts/test-public-queue-script-order.ts",
      "test:public-queue": "bun run check:public-queue:imports && bun run test:public-queue:order",
    },
  },
  null,
  2,
);

assert.equal(checkPublicQueuePackageScriptOrder(orderedPackageJson).ok, true);

const missingPackageJson = JSON.stringify(
  {
    scripts: {
      "check:public-queue:order": "bun run scripts/check-public-queue-script-order.ts",
      "test:public-queue": "bun run check:public-queue:order",
    },
  },
  null,
  2,
);
const missingResult = checkPublicQueuePackageScriptOrder(missingPackageJson);

assert.equal(missingResult.ok, false);

if (!missingResult.ok) {
  assert.match(missingResult.message, /Expected:/);
  assert.match(missingResult.message, /Current:/);
  assert.match(missingResult.message, /"check:public-queue:fixtures" \(missing\)/);
}

const outOfOrderPackageJson = JSON.stringify(
  {
    scripts: {
      "test:public-queue": "bun run check:public-queue:order",
      "test:public-queue:order": "bun run scripts/test-public-queue-script-order.ts",
      "check:public-queue:fixtures": "rg -n \"^import\" scripts/test-fixtures/public-interaction-queue.ts",
      "check:public-queue:order": "bun run scripts/check-public-queue-script-order.ts",
      "check:public-queue:imports": "bun run scripts/check-public-queue-helper-imports.ts",
    },
  },
  null,
  2,
);
const outOfOrderResult = checkPublicQueuePackageScriptOrder(outOfOrderPackageJson);

assert.equal(outOfOrderResult.ok, false);

if (!outOfOrderResult.ok) {
  assert.match(outOfOrderResult.message, /Expected:/);
  assert.match(outOfOrderResult.message, /Current:/);
  assert.match(outOfOrderResult.message, /"test:public-queue"/);
}

console.log("public queue script order tests passed");
