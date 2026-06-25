import { notFound, redirect } from "next/navigation";

import { getProject } from "@/db/projects";
import { PresentationSpeakerView } from "@/features/editor/components/presentation-speaker-view";
import { getServerSession } from "@/lib/auth-session";
import { requireTwoFactorVerified } from "@/lib/two-factor-session";

type PresentPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function PresentPage({ params }: PresentPageProps) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const { projectId } = await params;
  await requireTwoFactorVerified(session.user.id, `/present/${projectId}`);

  const project = await getProject({
    userId: session.user.id,
    projectId,
  });

  if (!project) {
    notFound();
  }

  return (
    <PresentationSpeakerView
      projectId={project.id}
      projectName={project.name}
      publicShareId={project.publicShareId}
      document={project.document}
    />
  );
}
