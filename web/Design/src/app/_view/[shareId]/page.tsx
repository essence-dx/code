import { notFound } from "next/navigation";

import { getPublicProject } from "@/db/projects";
import { PublicViewShell } from "@/features/editor/components/public-view-shell";
import { isValidPublicShareId } from "@/features/security/public-access-security";

type PublicViewPageProps = {
  params: Promise<{
    shareId: string;
  }>;
};

export default async function PublicViewPage({ params }: PublicViewPageProps) {
  const { shareId } = await params;

  if (!isValidPublicShareId(shareId)) {
    notFound();
  }

  const project = await getPublicProject(shareId);

  if (!project) {
    notFound();
  }

  return (
    <PublicViewShell
      document={project.document}
      mode="public"
      projectName={project.name}
      actionHref="/"
    />
  );
}
