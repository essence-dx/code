"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createProject } from "@/db/projects";
import {
  addWebsiteCustomDomain,
  attachWebsiteCustomDomainToPlatform,
  deleteWebsiteCustomDomain,
  publishProjectWebsite,
  refreshWebsiteCustomDomainPlatformStatus,
  unpublishProjectWebsite,
  verifyWebsiteCustomDomain,
} from "@/db/website-publishing";
import { createWorkspaceAuditLog } from "@/db/workspace-audit-logs";
import { sendWorkspaceNotificationHooks } from "@/features/notifications/workspace-notification-hooks";
import { createLinkInBioWebsiteDocument } from "@/features/website/link-in-bio-document";
import { getServerSession } from "@/lib/auth-session";
import {
  createWorkspaceReleaseOperationEnforcementDecision,
  recordBlockedReleaseOperation,
} from "@/lib/release-operation-enforcement-server";

const linkInBioDimensions = {
  width: 480,
  height: 1280,
};

export async function publishWebsiteAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const projectId = String(formData.get("projectId") ?? "");

  if (!projectId) {
    return;
  }

  const enforcement = await createWorkspaceReleaseOperationEnforcementDecision({
    userId: session.user.id,
    operation: {
      id: `publish-website-${projectId}`,
      kind: "publish-website",
      targetType: "project",
      targetId: projectId,
      label: "Publish website",
      requestedByEmail: session.user.email,
    },
  });

  if (!enforcement.canMutate) {
    await recordBlockedReleaseOperation({
      userId: session.user.id,
      decision: enforcement,
    });
    revalidatePath("/designs");

    return;
  }

  const website = await publishProjectWebsite({
    userId: session.user.id,
    projectId,
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    seoTitle: String(formData.get("seoTitle") ?? ""),
    seoDescription: String(formData.get("seoDescription") ?? ""),
    navigationStyle: String(formData.get("navigationStyle") ?? ""),
  });

  revalidatePath("/designs");

  if (website) {
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "website.published",
      targetType: "website_publish",
      targetId: website.id,
      summary: `Published website "${website.title}"`,
      metadata: { projectId, slug: website.slug },
    });
    await sendWorkspaceNotificationHooks({
      event: "publishing.changed",
      title: "Website published",
      body: `${website.title} is live at /site/${website.slug}.`,
      targetHref: `/site/${website.slug}`,
      metadata: { publishId: website.id, projectId },
    });
    revalidatePath(`/site/${website.slug}`);
  }
}

export async function createLinkInBioWebsiteAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const name = String(formData.get("name") ?? "").trim();
  const project = await createProject({
    userId: session.user.id,
    name: name || "Link in bio website",
    width: linkInBioDimensions.width,
    height: linkInBioDimensions.height,
    document: createLinkInBioWebsiteDocument(),
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "project.created",
    targetType: "project",
    targetId: project.id,
    summary: `Created link-in-bio website "${project.name}"`,
  });

  redirect(`/editor/${project.id}`);
}

export async function unpublishWebsiteAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const publishId = String(formData.get("publishId") ?? "");

  if (!publishId) {
    return;
  }

  await unpublishProjectWebsite({
    userId: session.user.id,
    publishId,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "website.unpublished",
    targetType: "website_publish",
    targetId: publishId,
    summary: "Unpublished website",
  });
  await sendWorkspaceNotificationHooks({
    event: "publishing.changed",
    title: "Website unpublished",
    body: "A website publish was moved offline.",
    targetHref: "/designs",
    metadata: { publishId },
  });

  revalidatePath("/designs");
}

export async function addWebsiteDomainAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const publishId = String(formData.get("publishId") ?? "");
  const domain = String(formData.get("domain") ?? "");

  if (!publishId || !domain) {
    return;
  }

  const domainRecord = await addWebsiteCustomDomain({
    userId: session.user.id,
    publishId,
    domain,
  });
  if (domainRecord) {
    await createWorkspaceAuditLog({
      userId: session.user.id,
      action: "website.domain.added",
      targetType: "website_custom_domain",
      targetId: domainRecord.id,
      summary: `Added domain ${domainRecord.domain}`,
      metadata: { publishId },
    });
  }

  revalidatePath("/designs");
}

export async function verifyWebsiteDomainAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const domainId = String(formData.get("domainId") ?? "");

  if (!domainId) {
    return;
  }

  await verifyWebsiteCustomDomain({
    userId: session.user.id,
    domainId,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "website.domain.verified",
    targetType: "website_custom_domain",
    targetId: domainId,
    summary: "Verified website domain",
  });

  revalidatePath("/designs");
  revalidatePath("/");
}

export async function attachWebsiteDomainAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const domainId = String(formData.get("domainId") ?? "");

  if (!domainId) {
    return;
  }

  await attachWebsiteCustomDomainToPlatform({
    userId: session.user.id,
    domainId,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "website.domain.attached",
    targetType: "website_custom_domain",
    targetId: domainId,
    summary: "Attached website domain to platform",
  });

  revalidatePath("/designs");
  revalidatePath("/");
}

export async function refreshWebsiteDomainPlatformAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const domainId = String(formData.get("domainId") ?? "");

  if (!domainId) {
    return;
  }

  await refreshWebsiteCustomDomainPlatformStatus({
    userId: session.user.id,
    domainId,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "website.domain.refreshed",
    targetType: "website_custom_domain",
    targetId: domainId,
    summary: "Refreshed website domain platform status",
  });

  revalidatePath("/designs");
  revalidatePath("/");
}

export async function deleteWebsiteDomainAction(formData: FormData) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const domainId = String(formData.get("domainId") ?? "");

  if (!domainId) {
    return;
  }

  await deleteWebsiteCustomDomain({
    userId: session.user.id,
    domainId,
  });
  await createWorkspaceAuditLog({
    userId: session.user.id,
    action: "website.domain.deleted",
    targetType: "website_custom_domain",
    targetId: domainId,
    summary: "Deleted website domain",
  });

  revalidatePath("/designs");
  revalidatePath("/");
}
