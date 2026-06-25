import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createHostedReviewLinkInputSchema,
  hostedReviewExpiry,
  hostedReviewLinkPublicSchema,
  hostedReviewLinkSummarySchema,
  hostedReviewLinkUrl,
  isHostedReviewExpired,
  updateHostedReviewLinkInputSchema,
} from "../src/lib/projects/hosted-review-link-contracts";

const parsed = createHostedReviewLinkInputSchema.parse({
  projectId: "project_123",
  expiresInDays: 14,
});
assert.equal(parsed.permission, "comment-only");
assert.equal(parsed.expiresInDays, 14);

assert.throws(() => createHostedReviewLinkInputSchema.parse({ projectId: "project_123", expiresInDays: 365 }));
assert.equal(updateHostedReviewLinkInputSchema.parse({ id: "link_123", enabled: false }).enabled, false);
assert.equal(updateHostedReviewLinkInputSchema.parse({ id: "link_123", permission: "download" }).permission, "download");
assert.throws(() => updateHostedReviewLinkInputSchema.parse({ id: "link_123" }));
assert.equal(hostedReviewLinkUrl("https://example.com/", "abc 123"), "https://example.com/share/abc%20123");
assert.equal(isHostedReviewExpired(new Date("2026-05-15T00:00:00.000Z"), new Date("2026-05-15T00:00:01.000Z")), true);
assert.equal(hostedReviewExpiry(7, new Date("2026-05-15T00:00:00.000Z")).toISOString(), "2026-05-22T00:00:00.000Z");

hostedReviewLinkSummarySchema.parse({
  id: "link_1",
  projectId: "project_123",
  title: "Launch cut",
  url: "https://example.com/share/token",
  permission: "view",
  enabled: true,
  expired: false,
  exportName: null,
  expiresAt: "2026-05-22T00:00:00.000Z",
  createdAt: "2026-05-15T00:00:00.000Z",
  updatedAt: "2026-05-15T00:00:00.000Z",
});

hostedReviewLinkPublicSchema.parse({
  token: "token",
  title: "Launch cut",
  permission: "comment-only",
  enabled: true,
  expired: false,
  exportName: "launch.mp4",
  expiresAt: "2026-05-22T00:00:00.000Z",
  createdAt: "2026-05-15T00:00:00.000Z",
});

const schema = read("src/lib/db/schema.ts");
assert.match(schema, /hostedReviewLinks/);
assert.match(schema, /hosted_review_links_token_unique/);

const server = read("src/lib/projects/server-review-links.ts");
assert.match(server, /createHostedReviewLink/);
assert.match(server, /updateHostedReviewLink/);
assert.match(server, /listHostedReviewLinks/);
assert.match(server, /getPublicHostedReviewLink/);
assert.match(server, /requireProjectUser/);

const apiRoute = read("src/app/api/review-links/route.ts");
assert.match(apiRoute, /createHostedReviewLink/);
assert.match(apiRoute, /updateHostedReviewLink/);
assert.match(apiRoute, /listHostedReviewLinks/);
assert.match(apiRoute, /readJsonRequest/);

const sharePage = read("src/app/share/[token]/page.tsx");
assert.match(sharePage, /getPublicHostedReviewLink/);
assert.match(sharePage, /Hosted review/);
assert.match(sharePage, /metadata only/);

const hostedPanel = read("src/features/projects/components/hosted-review-links-panel.tsx");
assert.match(hostedPanel, /createHostedProjectReviewLink/);
assert.match(hostedPanel, /updateHostedProjectReviewLink/);
assert.match(hostedPanel, /New hosted link/);
assert.match(hostedPanel, /Revoke/);

const dialog = read("src/features/projects/components/review-workspace-dialog.tsx");
assert.match(dialog, /HostedReviewLinksPanel/);
assert.match(dialog, /latestCompletedExportName/);

console.log("Hosted review links workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
