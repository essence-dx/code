import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createEditablePdfLines,
  createEditablePdfPage,
} from "@/features/editor/pdf-editable-import";

describe("pdf editable import", () => {
  test("groups PDF text runs into editable lines and infers headings", () => {
    const lines = createEditablePdfLines([
      {
        text: "Quarterly",
        x: 80,
        y: 90,
        width: 130,
        height: 34,
        fontSize: 34,
      },
      {
        text: "Plan",
        x: 224,
        y: 91,
        width: 70,
        height: 34,
        fontSize: 34,
      },
      {
        text: "Launch work starts next week.",
        x: 80,
        y: 150,
        width: 260,
        height: 16,
        fontSize: 16,
      },
    ]);

    assert.equal(lines.length, 2);
    assert.equal(lines[0]?.text, "Quarterly Plan");
    assert.equal(lines[0]?.kind, "heading");
    assert.equal(lines[1]?.kind, "paragraph");
  });

  test("creates editable PDF pages with a locked image reference and outline notes", () => {
    const result = createEditablePdfPage({
      name: "Proposal 1",
      output: { width: 800, height: 1000 },
      background: {
        src: "data:image/png;base64,abc",
        alt: "Proposal page 1",
        x: 20,
        y: 30,
        width: 760,
        height: 940,
      },
      textItems: [
        {
          text: "Scope",
          x: 96,
          y: 120,
          width: 180,
          height: 32,
          fontSize: 32,
        },
        {
          text: "Build a launch page and handoff packet.",
          x: 96,
          y: 180,
          width: 420,
          height: 18,
          fontSize: 18,
        },
      ],
    });

    assert.equal(result.importedImageBlocks, 1);
    assert.equal(result.importedTextBlocks, 2);
    assert.deepEqual(result.outlineItems, ["Scope"]);
    assert.equal(result.page.format, "document");
    assert.match(result.page.notes ?? "", /Reconstructed outline/);
    assert.equal(result.page.elements[0]?.type, "image");
    assert.equal(result.page.elements[0]?.locked, true);
    assert.equal(result.page.elements[1]?.type, "text");
  });
});
