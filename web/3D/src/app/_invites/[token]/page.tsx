import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaceInvitePreview } from "@/features/workspaces/server/workspace-service";
import { WorkspaceInviteAcceptCard } from "@/features/workspaces/components/workspace-invite-accept-card";
import { auth } from "@/lib/auth";

export default async function WorkspaceInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session?.user.id) {
    redirect("/sign-in");
  }

  const { token } = await params;
  const invite = await getWorkspaceInvitePreview(token);

  if (!invite || invite.revokedAt || invite.acceptedAt || new Date(invite.expiresAt) <= new Date()) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invite unavailable</CardTitle>
            <CardDescription>This workspace invite was already used, revoked, expired, or cannot be found.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Ask the workspace owner to send a fresh invite.</CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <WorkspaceInviteAcceptCard invitedBy={invite.invitedBy} invitedEmail={invite.email} role={invite.role} token={token} workspaceName={invite.workspaceName} />
    </main>
  );
}
