"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getDesignTemplate,
  incrementDesignTemplateUse,
} from "@/db/design-templates";
import { createProjectFolder, getProjectFolder } from "@/db/project-folders";
import {
  createProject,
  createResizedProjectVariant,
  deleteProject,
  getProjectSummaryIncludingDeleted,
  refreshProjectVariantSourceMetadata,
  restoreProject,
  trashProject,
  updateProject,
} from "@/db/projects";
import {
  createWorkspaceAuditLog,
  hasActiveProjectLegalHold,
} from "@/db/workspace-audit-logs";
import { createStarterDocument } from "@/features/editor/document-factory";
import {
  getDesignPreset,
  parseCustomDesignDimension,
} from "@/features/editor/presets";
import { getDesignResizeProfile } from "@/features/editor/resize-profiles";
import { getTemplateCatalogItem } from "@/features/templates/template-catalog";
import { createTemplateCatalogDocument } from "@/features/templates/template-catalog-documents";
import {
  createRemixedTemplateCatalogDocument,
  createRemixedTemplateCatalogItem,
  normalizeTemplateRemixInput,
} from "@/features/templates/template-remix";
import { getServerSession } from "@/lib/auth-session";

export async function createDesignAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const presetId = formData.get("preset");
  const customWidth = parseCustomDesignDimension(formData.get("width"));
  const customHeight = parseCustomDesignDimension(formData.get("height"));
  const isCustomSize =
    presetId === "custom" && customWidth !== null && customHeight !== null;
  const preset = getDesignPreset(presetId);
  const width = isCustomSize ? customWidth : preset.width;
  const height = isCustomSize ? customHeight : preset.height;
  const name = String(
    formData.get("name") ||
      (isCustomSize ? "Custom design" : `${preset.name} design`),
  ).trim();
  const document = createStarterDocument({
    width,
    height,
    presetId: isCustomSize ? "custom" : preset.id,
  });

  const project = await createProject({
    userId: session.user.id,
    name,
    width,
    height,
    document,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "project.created",
    targetType: "project",
    targetId: project.id,
    summary: `Created design "${project.name}"`,
    metadata: { width, height, presetId: isCustomSize ? "custom" : preset.id },
  });

  redirect(`/editor/${project.id}`);
}

export async function createDesignFromTemplateAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const templateId = String(formData.get("templateId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!templateId) {
    return;
  }

  const template = await getDesignTemplate({
    userId: session.user.id,
    templateId,
  });

  if (!template) {
    return;
  }

  const project = await createProject({
    userId: session.user.id,
    name: name || `${template.name} copy`,
    width: template.width,
    height: template.height,
    document: template.document,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "project.created",
    targetType: "project",
    targetId: project.id,
    summary: `Created design from template "${template.name}"`,
    metadata: { templateId },
  });
  await incrementDesignTemplateUse({
    userId: session.user.id,
    templateId,
  });

  redirect(`/editor/${project.id}`);
}

export async function createDesignFromCatalogTemplateAction(
  formData: FormData,
) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const templateId = String(formData.get("catalogTemplateId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const remixProfileId = String(formData.get("remixProfileId") ?? "");
  const remixThemeId = String(formData.get("remixThemeId") ?? "");
  const remixContentPackId = String(formData.get("remixContentPackId") ?? "");
  const template = getTemplateCatalogItem(templateId);

  if (!template) {
    return;
  }

  const hasRemixInput =
    remixProfileId.length > 0 ||
    remixThemeId.length > 0 ||
    remixContentPackId.length > 0;
  const remixInput = hasRemixInput
    ? normalizeTemplateRemixInput({
        profileId: remixProfileId,
        themeId: remixThemeId,
        contentPackId: remixContentPackId,
      })
    : null;
  const remixedTemplate = remixInput
    ? createRemixedTemplateCatalogItem(template, remixInput)
    : template;
  const document = remixInput
    ? createRemixedTemplateCatalogDocument(template, remixInput)
    : createTemplateCatalogDocument(template);

  const project = await createProject({
    userId: session.user.id,
    name: name || remixedTemplate.name,
    width: document.width,
    height: document.height,
    document,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "project.created",
    targetType: "project",
    targetId: project.id,
    summary: remixInput
      ? `Created remixed design from starter "${template.name}"`
      : `Created design from starter "${template.name}"`,
    metadata: {
      templateId,
      remixProfileId: remixInput?.profileId,
      remixThemeId: remixInput?.themeId,
      remixContentPackId: remixInput?.contentPackId,
    },
  });

  redirect(`/editor/${project.id}`);
}

export async function duplicateDesignAsSizeAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const projectId = String(formData.get("projectId") ?? "");
  const profile = getDesignResizeProfile(formData.get("profileId"));

  if (!projectId || !profile) {
    return;
  }

  const project = await createResizedProjectVariant({
    userId: session.user.id,
    projectId,
    profile,
  });

  if (!project) {
    revalidatePath("/designs");
    return;
  }
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "project.created",
    targetType: "project",
    targetId: project.id,
    summary: `Created resized variant "${project.name}"`,
    metadata: { sourceProjectId: projectId, profileId: profile.id },
  });

  redirect(`/editor/${project.id}`);
}

export async function refreshVariantSourceMetadataAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const projectId = String(formData.get("projectId") ?? "");

  if (!projectId) {
    return;
  }

  await refreshProjectVariantSourceMetadata({
    userId: session.user.id,
    projectId,
  });

  revalidatePath("/designs");
}

export async function renameDesignAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const projectId = String(formData.get("projectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!projectId || !name) {
    return;
  }

  await updateProject({
    userId: session.user.id,
    projectId,
    name,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "project.renamed",
    targetType: "project",
    targetId: projectId,
    summary: `Renamed design to "${name}"`,
  });

  revalidatePath("/designs");
}

export async function deleteDesignAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const projectId = String(formData.get("projectId") ?? "");

  if (!projectId) {
    return;
  }

  await trashProject({
    userId: session.user.id,
    projectId,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "project.trashed",
    targetType: "project",
    targetId: projectId,
    summary: "Moved design to trash",
  });

  revalidatePath("/designs");
}

export async function restoreDesignAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const projectId = String(formData.get("projectId") ?? "");

  if (!projectId) {
    return;
  }

  await restoreProject({
    userId: session.user.id,
    projectId,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "project.restored",
    targetType: "project",
    targetId: projectId,
    summary: "Restored design from trash",
  });

  revalidatePath("/designs");
}

export async function permanentlyDeleteDesignAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const projectId = String(formData.get("projectId") ?? "");

  if (!projectId) {
    return;
  }

  const hasLegalHold = await hasActiveProjectLegalHold({
    userId: session.user.id,
    projectId,
  });

  if (hasLegalHold) {
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "project.deletion.blocked",
      targetType: "project",
      targetId: projectId,
      summary: "Blocked permanent deletion because a legal hold is active",
      metadata: { blockedBy: "legal_hold" },
    });
    revalidatePath("/designs");
    return;
  }

  await deleteProject({
    userId: session.user.id,
    projectId,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "project.deleted",
    targetType: "project",
    targetId: projectId,
    summary: "Permanently deleted design",
  });

  revalidatePath("/designs");
}

export async function setProjectLegalHoldAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const projectId = String(formData.get("projectId") ?? "");
  const mode =
    String(formData.get("mode") ?? "") === "release" ? "release" : "enable";

  if (!projectId) {
    return;
  }

  const project = await getProjectSummaryIncludingDeleted({
    userId: session.user.id,
    projectId,
  });

  if (!project) {
    return;
  }

  const caseId = String(formData.get("caseId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim();
  const enabled = mode === "enable";

  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: enabled
      ? "project.legal_hold.enabled"
      : "project.legal_hold.released",
    targetType: "project",
    targetId: project.id,
    summary: enabled
      ? `Enabled legal hold for "${project.name}"`
      : `Released legal hold for "${project.name}"`,
    metadata: {
      caseId: caseId || null,
      reason: reason || null,
      ownerEmail: ownerEmail || session.user.email,
    },
  });

  revalidatePath("/designs");
}

export async function toggleStarDesignAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const projectId = String(formData.get("projectId") ?? "");
  const starred = String(formData.get("starred") ?? "") === "true";

  if (!projectId) {
    return;
  }

  await updateProject({
    userId: session.user.id,
    projectId,
    starred,
  });

  revalidatePath("/designs");
}

export async function createFolderAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }

  await createProjectFolder({
    userId: session.user.id,
    name,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "folder.created",
    targetType: "folder",
    summary: `Created folder "${name}"`,
  });

  revalidatePath("/designs");
}

export async function moveDesignToFolderAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const projectId = String(formData.get("projectId") ?? "");
  const folderIdValue = String(formData.get("folderId") ?? "");
  const folderId = folderIdValue === "unfiled" ? null : folderIdValue;

  if (!projectId) {
    return;
  }

  if (folderId) {
    const folder = await getProjectFolder({
      userId: session.user.id,
      folderId,
    });

    if (!folder) {
      return;
    }
  }

  await updateProject({
    userId: session.user.id,
    projectId,
    folderId,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "project.moved",
    targetType: "project",
    targetId: projectId,
    summary: folderId ? "Moved design to folder" : "Moved design to unfiled",
    metadata: { folderId },
  });

  revalidatePath("/designs");
}
