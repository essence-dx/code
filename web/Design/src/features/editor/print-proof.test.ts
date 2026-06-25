import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  getPrintProofFit,
  getRecommendedPrintProofKind,
  printProofProducts,
} from "@/features/editor/print-proof";

describe("print proof helpers", () => {
  test("keeps proof previews inside their target box", () => {
    assert.deepEqual(
      getPrintProofFit({
        width: 1500,
        height: 2100,
        maxWidth: 300,
        maxHeight: 320,
      }),
      {
        scale: 0.1523809523809524,
        width: 229,
        height: 320,
      },
    );
  });

  test("recommends proof products from format metadata", () => {
    assert.equal(
      getRecommendedPrintProofKind({
        format: "business-card",
        width: 1050,
        height: 600,
      }),
      "card",
    );

    assert.equal(
      getRecommendedPrintProofKind({
        format: "print-product",
        width: 1500,
        height: 2100,
      }),
      "packaging",
    );
  });

  test("covers the first-pass product proof set", () => {
    assert.deepEqual(printProofProducts.map((product) => product.id), [
      "card",
      "label",
      "poster",
      "sticker",
      "packaging",
    ]);
  });
});
