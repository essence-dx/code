import { getProject, getProjectByEditShare } from "@/db/projects";
import {
  canCommentWithSharePermission,
  canWriteWithSharePermission,
} from "@/features/projects/project-permissions";
import { isValidEditShareId } from "@/features/security/public-access-security";
import type { SharePermission } from "@/features/editor/types";

type ProjectAccessInput = {
  userId: string;
  projectId: string;
  editShareId?: string | null;
};

export async function getProjectViewAccess(input: ProjectAccessInput) {
  return getProjectAccess(input, () => true);
}

export async function getProjectCommentAccess(input: ProjectAccessInput) {
  return getProjectAccess(input, canCommentWithSharePermission);
}

export async function getProjectWriteAccess(input: ProjectAccessInput) {
  return getProjectAccess(input, canWriteWithSharePermission);
}

async function getProjectAccess(
  input: ProjectAccessInput,
  canUseShare: (permission: SharePermission) => boolean,
) {
  const ownedProject = await getProject({
    userId: input.userId,
    projectId: input.projectId,
  });

  if (ownedProject) return ownedProject;

  if (!isValidEditShareId(input.editShareId)) return null;

  const sharedProject = await getProjectByEditShare(input.editShareId);

  if (
    sharedProject?.id === input.projectId &&
    canUseShare(sharedProject.editSharePermission)
  ) {
    return sharedProject;
  }

  return null;
}
