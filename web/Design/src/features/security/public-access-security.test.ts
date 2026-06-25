import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createNoStoreJsonHeaders,
  createPublicAssetHeaders,
  isValidEditShareId,
  isValidElementRouteToken,
  isValidProjectAssetId,
  isValidProjectRouteId,
  isValidPublicShareId,
} from "@/features/security/public-access-security";

describe("public access security", () => {
  test("accepts only bounded route-safe share and project ids", () => {
    assert.equal(isValidPublicShareId("abcDEF_1234567890-xyz"), true);
    assert.equal(isValidEditShareId("abcDEF_1234567890-xyz"), true);
    assert.equal(isValidProjectRouteId("project_1234567890"), true);
    assert.equal(isValidPublicShareId("../secret"), false);
    assert.equal(isValidEditShareId("short"), false);
    assert.equal(isValidProjectRouteId("bad/token"), false);
  });

  test("validates opaque asset ids and legacy element tokens", () => {
    assert.equal(isValidProjectAssetId("asset-deadbeef"), true);
    assert.equal(isValidProjectAssetId("image_1"), false);
    assert.equal(isValidElementRouteToken("image_1"), true);
    assert.equal(isValidElementRouteToken("../image"), false);
  });

  test("adds noindex and nosniff headers to public asset responses", () => {
    const headers = createPublicAssetHeaders("image/png");

    assert.equal(headers["content-type"], "image/png");
    assert.equal(headers["x-content-type-options"], "nosniff");
    assert.equal(headers["x-robots-tag"], "noindex, nofollow, noarchive");
  });

  test("adds no-store headers to private json responses", () => {
    const headers = createNoStoreJsonHeaders();

    assert.equal(headers["cache-control"], "no-store");
    assert.equal(headers["x-content-type-options"], "nosniff");
  });
});
