import assert from "node:assert/strict";
import { sanitizeAiUsageEvent, summarizeAiUsageEvents } from "../src/lib/ai/usage-review";

const completeEvent = sanitizeAiUsageEvent({
  action: "edit-plan",
  status: "complete",
  promptChars: 120,
  outputChars: 480,
  createdAt: new Date("2026-05-14T00:00:00.000Z"),
});
const failedEvent = sanitizeAiUsageEvent({
  action: "captions",
  status: "failed",
  promptChars: 64,
  outputChars: 0,
  createdAt: new Date("2026-05-14T01:00:00.000Z"),
});
const limitedEvent = sanitizeAiUsageEvent({
  action: "script",
  status: "rate_limited",
  promptChars: 0,
  outputChars: 0,
  createdAt: new Date("2026-05-14T02:00:00.000Z"),
});

assert.equal(completeEvent.result, "Completed");
assert.equal(failedEvent.result, "Needs retry");
assert.equal(limitedEvent.result, "Limited");
assert.equal(Object.hasOwn(completeEvent, "model"), false);
assert.equal(Object.hasOwn(completeEvent, "provider"), false);
assert.equal(Object.hasOwn(failedEvent, "error"), false);

const summary = summarizeAiUsageEvents([completeEvent, failedEvent, limitedEvent]);
assert.deepEqual(summary, {
  total: 3,
  complete: 1,
  failed: 1,
  rate_limited: 1,
  promptChars: 184,
  outputChars: 480,
});

console.log("AI usage review sanitization passed.");
