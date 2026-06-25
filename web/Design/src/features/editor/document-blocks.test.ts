import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  getDocumentOutline,
  getDocumentPlainText,
  normalizeDocumentBlocks,
  normalizeDocumentColumns,
} from "@/features/editor/document-blocks";
import type { DocumentElement } from "@/features/editor/types";

describe("document blocks", () => {
  test("normalizes editable blocks while preserving stable ids", () => {
    const blocks = normalizeDocumentBlocks([
      { id: "title", kind: "heading", content: "Launch brief" },
      { id: "blank", kind: "paragraph", content: "   " },
      { id: "break", kind: "page-break", content: "" },
      {
        id: "note",
        kind: "quote",
        content: "Keep the copy concise.",
        comment: "Legal review",
      },
      { id: "bad", kind: "unknown" as never, content: "Fallback kind" },
    ]);

    assert.equal(blocks.length, 4);
    assert.deepEqual(blocks.map((block) => block.id), [
      "title",
      "break",
      "note",
      "bad",
    ]);
    assert.equal(blocks[blocks.length - 1]?.kind, "paragraph");
    assert.equal(blocks[2]?.comment, "Legal review");
  });

  test("falls back to starter document copy when every block is empty", () => {
    const blocks = normalizeDocumentBlocks([
      { id: "empty", kind: "paragraph", content: "" },
    ]);

    assert.ok(blocks.length > 1);
    assert.equal(blocks[0]?.kind, "heading");
  });

  test("builds a heading outline and plain text export", () => {
    const blocks = normalizeDocumentBlocks([
      { id: "h1", kind: "heading", content: "Plan" },
      { id: "p1", kind: "paragraph", content: "First paragraph" },
      { id: "h2", kind: "subheading", content: "Details" },
      { id: "break", kind: "page-break", content: "" },
      { id: "p2", kind: "paragraph", content: "After the break" },
    ]);
    const element = {
      type: "document",
      title: "Brief",
      blocks,
    } as DocumentElement;

    assert.deepEqual(getDocumentOutline(blocks), [
      { id: "h1", text: "Plan", level: 1, blockIndex: 0 },
      { id: "h2", text: "Details", level: 2, blockIndex: 2 },
    ]);
    assert.match(getDocumentPlainText(element), /--- page break ---/);
    assert.match(getDocumentPlainText(element), /After the break/);
  });

  test("keeps document columns inside the supported editor range", () => {
    assert.equal(normalizeDocumentColumns(1), 1);
    assert.equal(normalizeDocumentColumns(2), 2);
    assert.equal(normalizeDocumentColumns(3), 3);
    assert.equal(normalizeDocumentColumns(4), 1);
    assert.equal(normalizeDocumentColumns(null), 1);
  });
});
