import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const collaborationStore = read("src/lib/projects/collaboration-store.ts");
assert.match(collaborationStore, /ExportReviewPackage/);
assert.match(collaborationStore, /createExportReviewPackage/);
assert.match(collaborationStore, /recordExportReviewDownload/);
assert.match(collaborationStore, /exportReviewComments/);
assert.match(collaborationStore, /initialExportReviewStatus/);

const exportPanel = read("src/features/editor/components/export-panel.tsx");
assert.match(exportPanel, /createExportReviewPackage/);
assert.match(exportPanel, /openExportReview/);
assert.match(exportPanel, /Local review page opened/);
assert.match(exportPanel, /ExternalLink/);

const reviewPage = read("src/app/review/[reviewId]/page.tsx");
assert.match(reviewPage, /ExportReviewPageClient/);

const reviewClient = read("src/features/review/components/export-review-page-client.tsx");
assert.match(reviewClient, /setExportReviewStatus/);
assert.match(reviewClient, /addExportReviewComment/);
assert.match(reviewClient, /recordExportReviewDownload/);
assert.match(reviewClient, /Download History/);
assert.match(reviewClient, /Open project/);

console.log("Export review page workflow guard passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
