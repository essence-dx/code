import { strict as assert } from "node:assert";
import {
  getActionRequestOrigin,
  getTrustedActionOrigins,
  isRecentSessionDate,
  isTrustedActionRequest,
} from "@/lib/action-security-core";

const sameOriginHeaders = {
  host: "app.example.com",
  origin: "https://app.example.com",
  xForwardedProto: "https",
};

assert.equal(
  isTrustedActionRequest(sameOriginHeaders),
  true,
  "same-origin action requests are allowed",
);
assert.equal(
  isTrustedActionRequest({
    ...sameOriginHeaders,
    origin: "https://evil.example.com",
  }),
  false,
  "cross-origin action requests are blocked",
);
assert.equal(
  isTrustedActionRequest({
    host: "app.example.com",
    referer: "https://app.example.com/workbooks",
    xForwardedProto: "https",
  }),
  true,
  "referer origin can prove same-origin requests",
);
assert.equal(
  isTrustedActionRequest(
    {
      host: "preview.vercel.app",
      origin: "https://custom.example.com",
      xForwardedProto: "https",
    },
    ["https://custom.example.com"],
  ),
  true,
  "configured trusted origins are allowed",
);
assert.equal(
  isTrustedActionRequest({
    host: "app.example.com",
    xForwardedProto: "https",
  }),
  false,
  "requests without origin evidence are rejected",
);
assert.deepEqual(
  getTrustedActionOrigins(
    {
      host: "localhost:3000",
      origin: "http://localhost:3000",
    },
    ["http://localhost:3000"],
  ),
  ["http://localhost:3000"],
  "trusted origins are normalized and deduplicated",
);
assert.equal(
  getActionRequestOrigin({
    referer: "https://app.example.com/workbooks/123",
  }),
  "https://app.example.com",
  "request origin falls back to referer origin",
);
assert.equal(
  isRecentSessionDate(new Date(Date.now() - 5_000), 10),
  true,
  "recent session timestamps satisfy freshness checks",
);
assert.equal(
  isRecentSessionDate(new Date(Date.now() - 30_000), 10),
  false,
  "old session timestamps fail freshness checks",
);

console.log("Action security checks passed.");
