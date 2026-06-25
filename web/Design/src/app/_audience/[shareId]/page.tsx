import { notFound } from "next/navigation";

import { getPublicProject } from "@/db/projects";
import { PresentationAudienceView } from "@/features/editor/components/presentation-audience-view";
import { getEnabledAudienceInteractions } from "@/features/editor/presentation-audience";
import { isValidPublicShareId } from "@/features/security/public-access-security";

type AudiencePageProps = {
  params: Promise<{
    shareId: string;
  }>;
};

export default async function AudiencePage({ params }: AudiencePageProps) {
  const { shareId } = await params;

  if (!isValidPublicShareId(shareId)) {
    notFound();
  }

  const project = await getPublicProject(shareId);

  if (!project) {
    notFound();
  }

  return (
    <PresentationAudienceView
      shareId={shareId}
      projectName={project.name}
      interactions={getEnabledAudienceInteractions(project.document)}
    />
  );
}
