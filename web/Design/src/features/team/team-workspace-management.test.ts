import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  canManageTeamInvites,
  canTransferTeamOwnership,
  canUpdateTeamMemberRole,
} from "@/features/team/team-workspace-management";

describe("team workspace management policies", () => {
  test("allows owners and admins to manage invites", () => {
    assert.equal(canManageTeamInvites("owner"), true);
    assert.equal(canManageTeamInvites("admin"), true);
    assert.equal(canManageTeamInvites("member"), false);
  });

  test("allows only owners to update non-owner member roles", () => {
    assert.equal(
      canUpdateTeamMemberRole({ viewerRole: "owner", targetRole: "admin" }),
      true,
    );
    assert.equal(
      canUpdateTeamMemberRole({ viewerRole: "admin", targetRole: "member" }),
      false,
    );
    assert.equal(
      canUpdateTeamMemberRole({ viewerRole: "owner", targetRole: "owner" }),
      false,
    );
  });

  test("prevents self-transfer and non-owner transfers", () => {
    assert.equal(
      canTransferTeamOwnership({
        viewerRole: "owner",
        targetRole: "member",
        isSelf: false,
      }),
      true,
    );
    assert.equal(
      canTransferTeamOwnership({
        viewerRole: "owner",
        targetRole: "member",
        isSelf: true,
      }),
      false,
    );
    assert.equal(
      canTransferTeamOwnership({
        viewerRole: "admin",
        targetRole: "member",
        isSelf: false,
      }),
      false,
    );
  });
});
