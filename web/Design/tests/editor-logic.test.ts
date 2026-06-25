import test from "node:test";
import assert from "node:assert/strict";

import {
  maxAssetBytes,
  maxMediaAssetBytes,
  getMaxAssetBytes,
  isAcceptedAssetMimeType,
} from "@/features/assets/asset-constraints";
import { createAuthEmailContent } from "@/db/auth-emails";
import type { ContentScheduleSummary } from "@/db/content-planner";
import { createBulkPagesFromCsv } from "@/features/editor/bulk-create";
import { parseCsvRows } from "@/features/editor/csv-import";
import {
  createPage,
  createQrCodeElement,
  createShapeElement,
  createTableElement,
  createTextElement,
} from "@/features/editor/document-factory";
import {
  createSocialPublishingText,
  getSocialPublisherHref,
  getSocialPublishingTarget,
} from "@/features/content-planner/social-publishing";
import {
  createProjectSyncUrl,
  isRemoteProjectNewer,
} from "@/features/editor/project-collaboration-sync";
import {
  createTotpCode,
  createTotpUri,
  normalizeTotpCode,
  verifyTotpCode,
} from "@/features/security/totp";
import {
  distributeElements,
  getActivePage,
  groupElements,
  nudgeElements,
  ungroupElements,
} from "@/features/editor/editor-operations";
import type { DesignDocument, DesignElement } from "@/features/editor/types";

function createDocument(elements: DesignElement[]): DesignDocument {
  const page = createPage({
    name: "Card {{Name}}",
    notes: "Publish for {{Channel}}",
    elements,
  });

  return {
    version: 1,
    width: 1080,
    height: 1080,
    pages: [page],
    activePageId: page.id,
  };
}

test("nudgeElements moves unlocked layers and preserves locked layers", () => {
  const unlocked = createShapeElement({ x: 10, y: 20 });
  const locked = createShapeElement({ x: 50, y: 60, locked: true });
  const document = createDocument([unlocked, locked]);
  const result = nudgeElements(document, [unlocked.id, locked.id], {
    x: 8,
    y: -4,
  });
  const elements = getActivePage(result).elements;

  assert.equal(elements.find((element) => element.id === unlocked.id)?.x, 18);
  assert.equal(elements.find((element) => element.id === unlocked.id)?.y, 16);
  assert.equal(elements.find((element) => element.id === locked.id)?.x, 50);
  assert.equal(elements.find((element) => element.id === locked.id)?.y, 60);
});

test("groupElements and ungroupElements preserve group ownership across selected layers", () => {
  const first = createShapeElement();
  const second = createTextElement({ content: "Grouped" });
  const document = createDocument([first, second]);
  const grouped = groupElements(document, [first.id, second.id]);
  const groupedElements = getActivePage(grouped).elements;
  const groupId = groupedElements.find(
    (element) => element.id === first.id,
  )?.groupId;

  assert.ok(groupId);
  assert.equal(
    groupedElements.find((element) => element.id === second.id)?.groupId,
    groupId,
  );

  const ungrouped = ungroupElements(grouped, [first.id]);

  assert.equal(
    getActivePage(ungrouped).elements.some((element) => element.groupId),
    false,
  );
});

test("distributeElements spaces three unlocked layers evenly", () => {
  const first = createShapeElement({ x: 0, y: 0, width: 10, height: 10 });
  const middle = createShapeElement({ x: 20, y: 0, width: 10, height: 10 });
  const last = createShapeElement({ x: 60, y: 0, width: 10, height: 10 });
  const document = createDocument([first, middle, last]);
  const result = distributeElements(
    document,
    [first.id, middle.id, last.id],
    "horizontal",
  );
  const elements = getActivePage(result).elements;

  assert.equal(elements.find((element) => element.id === first.id)?.x, 0);
  assert.equal(elements.find((element) => element.id === middle.id)?.x, 30);
  assert.equal(elements.find((element) => element.id === last.id)?.x, 60);
});

test("parseCsvRows handles quoted commas and escaped quotes", () => {
  assert.deepEqual(
    parseCsvRows('Name,Title\n"Ada, Lovelace","First ""programmer"""'),
    [
      ["Name", "Title"],
      ["Ada, Lovelace", 'First "programmer"'],
    ],
  );
});

test("createBulkPagesFromCsv replaces placeholders across pages and elements", () => {
  const document = createDocument([
    createTextElement({ content: "Hello {{Name}}" }),
    createQrCodeElement({ qrValue: "https://example.com/{{Slug}}" }),
    createTableElement({
      rows: 1,
      columns: 2,
      cells: ["{{Name}}", "{{Channel}}"],
    }),
  ]);
  const result = createBulkPagesFromCsv(
    document,
    "Name,Channel,Slug\nAda,Email,ada\nGrace,Social,grace",
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.createdPages, 2);
  assert.equal(result.document.pages.length, 3);

  const firstCreatedPage = result.document.pages[1];
  const text = firstCreatedPage.elements.find(
    (element) => element.type === "text",
  );
  const qr = firstCreatedPage.elements.find((element) => element.type === "qr");
  const table = firstCreatedPage.elements.find(
    (element) => element.type === "table",
  );

  assert.equal(firstCreatedPage.name, "Card Ada");
  assert.equal(firstCreatedPage.notes, "Publish for Email");
  assert.equal(text?.type === "text" ? text.content : null, "Hello Ada");
  assert.equal(
    qr?.type === "qr" ? qr.qrValue : null,
    "https://example.com/ada",
  );
  assert.deepEqual(table?.type === "table" ? table.cells : null, [
    "Ada",
    "Email",
  ]);
});

test("asset constraints route images and media to the correct storage limits", () => {
  assert.equal(isAcceptedAssetMimeType("image/png"), true);
  assert.equal(isAcceptedAssetMimeType("application/pdf"), true);
  assert.equal(isAcceptedAssetMimeType("application/x-msdownload"), false);
  assert.equal(getMaxAssetBytes("image/png"), maxAssetBytes);
  assert.equal(getMaxAssetBytes("video/mp4"), maxMediaAssetBytes);
  assert.equal(getMaxAssetBytes("application/pdf"), maxMediaAssetBytes);
});

test("social publishing helpers create platform-ready publish packages", () => {
  const item: ContentScheduleSummary = {
    id: "schedule-1",
    projectId: "project-1",
    projectName: "Launch card",
    title: "Launch card",
    channel: "X",
    caption: "Our launch is live.",
    status: "planned",
    scheduledAt: "2026-05-14T10:00:00.000Z",
    createdAt: "2026-05-14T09:00:00.000Z",
    updatedAt: "2026-05-14T09:00:00.000Z",
  };

  assert.equal(getSocialPublishingTarget("TikTok").label, "Open TikTok upload");
  assert.equal(
    getSocialPublishingTarget("Unknown").label,
    "Open website export",
  );
  assert.match(createSocialPublishingText(item), /Our launch is live\./);
  assert.match(createSocialPublishingText(item), /Design: Launch card/);
  assert.match(
    getSocialPublisherHref(item),
    /^https:\/\/x\.com\/compose\/post/,
  );
});

test("totp helpers create and verify app-compatible authenticator codes", () => {
  const secret = "JBSWY3DPEHPK3PXP";
  const timestamp = 1_700_000_000_000;
  const code = createTotpCode({ secret, timestamp });

  assert.equal(normalizeTotpCode("123 456"), "123456");
  assert.match(code, /^\d{6}$/);
  assert.equal(verifyTotpCode({ secret, code, timestamp }), true);
  assert.equal(verifyTotpCode({ secret, code: "000000", timestamp }), false);
  assert.match(
    createTotpUri({
      issuer: "Essence Studio",
      accountName: "user@example.com",
      secret,
    }),
    /^otpauth:\/\/totp\//,
  );
});

test("auth email content creates purpose-specific security messages", () => {
  const verification = createAuthEmailContent({
    userId: "user-1",
    recipient: "designer@example.com",
    name: "Designer <One>",
    purpose: "email-verification",
    url: "https://app.example.com/api/auth/verify-email?token=abc",
  });
  const reset = createAuthEmailContent({
    userId: "user-1",
    recipient: "designer@example.com",
    name: "Designer",
    purpose: "password-reset",
    url: "https://app.example.com/reset-password?token=abc",
  });

  assert.equal(verification.subject, "Verify your Essence Studio email");
  assert.match(verification.text, /verify your Essence Studio email/);
  assert.match(verification.html, /Designer &lt;One&gt;/);
  assert.equal(reset.subject, "Reset your Essence Studio password");
  assert.match(reset.text, /choose a new password/);
});

test("project collaboration sync helpers detect newer remote changes", () => {
  assert.equal(
    createProjectSyncUrl({ projectId: "project-1" }),
    "/api/projects/project-1",
  );
  assert.equal(
    createProjectSyncUrl({
      projectId: "project-1",
      editShareId: "share token",
    }),
    "/api/projects/project-1?editShareId=share+token",
  );
  assert.equal(
    isRemoteProjectNewer({
      remoteUpdatedAt: "2026-05-14T08:05:05.000Z",
      lastSyncedAt: "2026-05-14T08:05:04.000Z",
    }),
    true,
  );
  assert.equal(
    isRemoteProjectNewer({
      remoteUpdatedAt: "2026-05-14T08:05:04.000Z",
      lastSyncedAt: "2026-05-14T08:05:04.000Z",
    }),
    false,
  );
});
