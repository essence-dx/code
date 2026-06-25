import type { ServerWorkspaceRole } from "@/lib/projects/workspace-access-contracts";
import { workspaceRoleLabels } from "@/lib/projects/workspace-permissions";

export interface WorkspaceInvitationEmailInput {
  email: string;
  role: ServerWorkspaceRole;
  acceptUrl: string;
  projectTitle?: string;
  workspaceName?: string;
}

export interface WorkspaceInvitationEmailDraft {
  to: string;
  subject: string;
  body: string;
  mailtoUrl: string;
}

export function createWorkspaceInvitationEmailDraft(input: WorkspaceInvitationEmailInput): WorkspaceInvitationEmailDraft {
  const subject = `Invitation to ${input.workspaceName ?? "Essence Studio"}`;
  const projectLine = input.projectTitle ? `Project: ${input.projectTitle}\n` : "";
  const body = [
    `You have been invited as ${workspaceRoleLabels[input.role]} in ${input.workspaceName ?? "Essence Studio"}.`,
    "",
    projectLine ? projectLine.trimEnd() : null,
    `Accept the invitation: ${input.acceptUrl}`,
    "",
    "Use the same email address that received this invite.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    to: input.email,
    subject,
    body,
    mailtoUrl: createMailtoUrl(input.email, subject, body),
  };
}

function createMailtoUrl(to: string, subject: string, body: string) {
  const params = new URLSearchParams({
    subject,
    body,
  });

  return `mailto:${encodeURIComponent(to)}?${params.toString()}`;
}
