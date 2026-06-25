import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  canCommentWithSharePermission,
  canWriteWithSharePermission,
  getProjectPermissionPresetForShare,
  normalizeSharePermission,
} from "@/features/projects/project-permissions";

describe("project permission presets", () => {
  test("normalizes private share permissions", () => {
    assert.equal(normalizeSharePermission("view"), "view");
    assert.equal(normalizeSharePermission("comment"), "comment");
    assert.equal(normalizeSharePermission("edit"), "edit");
    assert.equal(normalizeSharePermission("owner"), "view");
    assert.equal(normalizeSharePermission(null), "view");
  });

  test("keeps document writes edit-only", () => {
    assert.equal(canWriteWithSharePermission("view"), false);
    assert.equal(canWriteWithSharePermission("comment"), false);
    assert.equal(canWriteWithSharePermission("edit"), true);
  });

  test("allows comments for commenter and editor roles", () => {
    assert.equal(canCommentWithSharePermission("view"), false);
    assert.equal(canCommentWithSharePermission("comment"), true);
    assert.equal(canCommentWithSharePermission("edit"), true);
  });

  test("maps share permissions to user-facing presets", () => {
    assert.equal(getProjectPermissionPresetForShare("view"), "viewer");
    assert.equal(getProjectPermissionPresetForShare("comment"), "commenter");
    assert.equal(getProjectPermissionPresetForShare("edit"), "editor");
  });
});
