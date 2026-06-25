import { notFound, redirect } from "next/navigation";

import { getProject } from "@/db/projects";
import { PresentationRemoteControl } from "@/features/editor/components/presentation-remote-control";
import { getServerSession } from "@/lib/auth-session";
import { requireTwoFactorVerified } from "@/lib/two-factor-session";

type PresentRemotePageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function PresentRemotePage({
  params,
}: PresentRemotePageProps) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/");
  }

  const { projectId } = await params;
  await requireTwoFactorVerified(
    session.user.id,
    `/present/${projectId}/remote`,
  );

  const project = await getProject({
    userId: session.user.id,
    projectId,
  });

  if (!project) {
    notFound();
  }

  return (
    <PresentationRemoteControl
      projectId={project.id}
      projectName={project.name}
      document={project.document}
    />
  );
}
