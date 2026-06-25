import { notFound } from "next/navigation";

import { getPresentationRemoteControllerByToken } from "@/db/presentation-remote-sessions";
import { PresentationRemoteControl } from "@/features/editor/components/presentation-remote-control";

type PresentationRemoteTokenPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function PresentationRemoteTokenPage({
  params,
}: PresentationRemoteTokenPageProps) {
  const { token } = await params;
  const session = await getPresentationRemoteControllerByToken(token);

  if (!session) {
    notFound();
  }

  return (
    <PresentationRemoteControl
      projectName={session.projectName}
      remoteToken={token}
      initialRemoteSession={session}
    />
  );
}
