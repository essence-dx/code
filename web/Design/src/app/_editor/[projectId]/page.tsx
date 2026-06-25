import { notFound, redirect } from "next/navigation";

import { listUserAssets } from "@/db/assets";
import { listBrandColors } from "@/db/brand-colors";
import { listBrandFonts } from "@/db/brand-fonts";
import { listBrandLogos } from "@/db/brand-logos";
import { listProjectComments } from "@/db/project-comments";
import { listProjectPresence } from "@/db/project-presence";
import { listProjectVersions } from "@/db/project-versions";
import { getProject } from "@/db/projects";
import { EditorWorkspace } from "@/features/editor/components/editor-workspace";
import { getServerSession } from "@/lib/auth-session";
import { requireTwoFactorVerified } from "@/lib/two-factor-session";

type EditorPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function EditorPage({ params }: EditorPageProps) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const { projectId } = await params;
  await requireTwoFactorVerified(session.user.id, `/editor/${projectId}`);

  const project = await getProject({
    userId: session.user.id,
    projectId,
  });

  if (!project) {
    notFound();
  }

  const [
    assets,
    brandColors,
    brandFonts,
    brandLogos,
    versions,
    comments,
    presence,
  ] = await Promise.all([
    listUserAssets(session.user.id),
    listBrandColors(session.user.id),
    listBrandFonts(session.user.id),
    listBrandLogos(session.user.id),
    listProjectVersions({ userId: session.user.id, projectId }),
    listProjectComments({ projectId, viewerUserId: session.user.id }),
    listProjectPresence({ projectId, viewerUserId: session.user.id }),
  ]);

  return (
    <EditorWorkspace
      project={project}
      assets={assets}
      brandColors={brandColors}
      brandFonts={brandFonts}
      brandLogos={brandLogos}
      versions={versions}
      comments={comments}
      presence={presence}
    />
  );
}
