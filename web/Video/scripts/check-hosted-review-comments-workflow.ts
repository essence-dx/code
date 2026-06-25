import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canHostedReviewComment,
  createHostedReviewCommentInputSchema,
  hostedReviewCommentSchema,
} from "../src/lib/projects/hosted-review-link-contracts";

const parsed = createHostedReviewCommentInputSchema.parse({
  reviewerName: "",
  reviewerEmail: "",
  anchorLabel: "00:12 title card",
  body: "Please tighten this intro.",
});
assert.equal(parsed.reviewerName, "Reviewer");
assert.equal(parsed.reviewerEmail, undefined);
assert.equal(parsed.anchorLabel, "00:12 title card");
assert.equal(parsed.body, "Please tighten this intro.");

assert.throws(() => createHostedReviewCommentInputSchema.parse({ body: "" }));
assert.throws(() => createHostedReviewCommentInputSchema.parse({ reviewerEmail: "not-an-email", body: "Good note." }));
assert.equal(canHostedReviewComment("comment-only"), true);
assert.equal(canHostedReviewComment("download"), true);
assert.equal(canHostedReviewComment("view"), false);

hostedReviewCommentSchema.parse({
  id: "hosted_comment_1",
  reviewerName: "Mina",
  body: "Looks good.",
  time: null,
  anchorLabel: "Outro",
  resolvedAt: null,
  createdAt: "2026-05-15T00:00:00.000Z",
});

const schema = read("src/lib/db/schema.ts");
assert.match(schema, /hostedReviewComments/);
assert.match(schema, /hosted_review_comments_link_id_idx/);

const server = read("src/lib/projects/server-review-links.ts");
assert.match(server, /createHostedReviewComment/);
assert.match(server, /listHostedReviewComments/);
assert.match(server, /HostedReviewCommentPermissionError/);

const apiRoute = read("src/app/api/review-links/[token]/comments/route.ts");
assert.match(apiRoute, /createHostedReviewComment/);
assert.match(apiRoute, /listHostedReviewComments/);
assert.match(apiRoute, /readJsonRequest/);

const client = read("src/lib/projects/hosted-review-comment-client.ts");
assert.match(client, /createHostedReviewComment/);
assert.match(client, /listHostedReviewComments/);
assert.match(client, /hostedReviewCommentSchema/);

const commentsUi = read("src/features/review/components/hosted-review-comments.tsx");
assert.match(commentsUi, /Reviewer comments/);
assert.match(commentsUi, /Send comment/);
assert.match(commentsUi, /listHostedReviewComments/);

const sharePage = read("src/app/share/[token]/page.tsx");
assert.match(sharePage, /HostedReviewComments/);
assert.match(sharePage, /Download metadata/);
assert.match(sharePage, /href="#comments"/);

console.log("Hosted review comments workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
