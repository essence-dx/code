import { notFound, redirect } from "next/navigation";

import { listUserAssets } from "@/db/assets";
import { listBrandColors } from "@/db/brand-colors";
import { listBrandFonts } from "@/db/brand-fonts";
import { listBrandLogos } from "@/db/brand-logos";
import { listProjectComments } from "@/db/project-comments";
import { listProjectPresence } from "@/db/project-presence";
import { getProjectByEditShare } from "@/db/projects";
import { EditorWorkspace } from "@/features/editor/components/editor-workspace";
import { PublicViewShell } from "@/features/editor/components/public-view-shell";
import { isValidEditShareId } from "@/features/security/public-access-security";
import { getServerSession } from "@/lib/auth-session";
import { requireTwoFactorVerified } from "@/lib/two-factor-session";

type EditSharePageProps = {
  params: Promise<{
    shareId: string;
  }>;
};

export default async function EditSharePage({ params }: EditSharePageProps) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const { shareId } = await params;

  if (!isValidEditShareId(shareId)) {
    notFound();
  }

  await requireTwoFactorVerified(session.user.id, `/edit/${shareId}`);

  const project = await getProjectByEditShare(shareId);

  if (!project) {
    notFound();
  }

  if (project.editSharePermission === "view") {
    return (
      <PublicViewShell
        document={project.document}
        mode="private"
        projectName={project.name}
        actionHref="/designs"
      />
    );
  }

  const [assets, brandColors, brandFonts, brandLogos, comments, presence] =
    await Promise.all([
      listUserAssets(session.user.id),
      listBrandColors(session.user.id),
      listBrandFonts(session.user.id),
      listBrandLogos(session.user.id),
      listProjectComments({
        projectId: project.id,
        viewerUserId: session.user.id,
      }),
      listProjectPresence({
        projectId: project.id,
        viewerUserId: session.user.id,
      }),
    ]);

  return (
    <EditorWorkspace
      project={project}
      assets={assets}
      brandColors={brandColors}
      brandFonts={brandFonts}
      brandLogos={brandLogos}
      versions={[]}
      comments={comments}
      presence={presence}
      canManageSharing={false}
      canRestoreVersions={false}
      sharedEditShareId={shareId}
    />
  );
}
