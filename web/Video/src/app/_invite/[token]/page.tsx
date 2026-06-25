import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WorkspaceInvitationAcceptPanel } from "@/features/projects/components/workspace-invitation-accept-panel";

export default async function WorkspaceInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
        <WorkspaceInvitationAcceptPanel token={token} />
      </div>
    </main>
  );
}
