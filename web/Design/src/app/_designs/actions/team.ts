"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  acceptWorkspaceInvite,
  createTeamWorkspace,
  createWorkspaceInvite,
} from "@/db/team-workspaces";
import {
  revokeWorkspaceInvite,
  transferTeamWorkspaceOwnership,
  updateTeamWorkspaceMemberRole,
} from "@/db/team-workspace-management";
import { createWorkspaceAuditLog } from "@/db/workspace-audit-logs";
import { getServerSession } from "@/lib/auth-session";

export async function createTeamWorkspaceAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }

  const workspace = await createTeamWorkspace({
    userId: session.user.id,
    name,
  });
  if (!workspace) {
    return;
  }
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "team.created",
    targetType: "team_workspace",
    targetId: workspace.id,
    summary: `Created team workspace "${workspace.name}"`,
  });

  revalidatePath("/designs");
}

export async function inviteTeamMemberAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "member");

  if (!workspaceId || !email) {
    return;
  }

  const invite = await createWorkspaceInvite({
    userId: session.user.id,
    workspaceId,
    email,
    role,
  });
  if (invite) {
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "team.invite.created",
      targetType: "team_workspace",
      targetId: workspaceId,
      summary: `Invited ${invite.email} as ${invite.role}`,
    });
  }

  revalidatePath("/designs");
}

export async function acceptTeamInviteAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/");
  }

  const inviteId = String(formData.get("inviteId") ?? "");

  if (!inviteId) {
    return;
  }

  const accepted = await acceptWorkspaceInvite({
    userId: session.user.id,
    email: session.user.email,
    inviteId,
  });
  if (accepted) {
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "team.invite.accepted",
      targetType: "team_workspace_invite",
      targetId: inviteId,
      summary: `Accepted invite for ${session.user.email}`,
    });
  }

  revalidatePath("/designs");
}

export async function revokeTeamInviteAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const inviteId = String(formData.get("inviteId") ?? "");

  if (!workspaceId || !inviteId) {
    return;
  }

  const invite = await revokeWorkspaceInvite({
    userId: session.user.id,
    workspaceId,
    inviteId,
  });

  if (invite) {
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "team.invite.revoked",
      targetType: "team_workspace",
      targetId: workspaceId,
      summary: `Revoked invite for ${invite.email}`,
      metadata: { inviteId },
    });
  }

  revalidatePath("/designs");
}

export async function updateTeamMemberRoleAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const memberUserId = String(formData.get("memberUserId") ?? "");
  const role = String(formData.get("role") ?? "member");

  if (!workspaceId || !memberUserId) {
    return;
  }

  const member = await updateTeamWorkspaceMemberRole({
    userId: session.user.id,
    workspaceId,
    memberUserId,
    role,
  });

  if (member) {
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "team.member.role.updated",
      targetType: "team_workspace",
      targetId: workspaceId,
      summary: `Updated member role to ${member.role}`,
      metadata: { memberUserId },
    });
  }

  revalidatePath("/designs");
}

export async function transferTeamOwnershipAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const newOwnerUserId = String(formData.get("newOwnerUserId") ?? "");

  if (!workspaceId || !newOwnerUserId) {
    return;
  }

  const transferred = await transferTeamWorkspaceOwnership({
    userId: session.user.id,
    workspaceId,
    newOwnerUserId,
  });

  if (transferred) {
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "team.owner.transferred",
      targetType: "team_workspace",
      targetId: workspaceId,
      summary: "Transferred workspace ownership",
      metadata: { newOwnerUserId },
    });
  }

  revalidatePath("/designs");
}
