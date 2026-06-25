"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptCloudWorkspaceInvitation } from "@/lib/projects/workspace-invitation-client";
import type { ServerWorkspaceInvitationAcceptance } from "@/lib/projects/workspace-access-contracts";
import { workspaceRoleLabels } from "@/lib/projects/workspace-permissions";

type WorkspaceInvitationAcceptPanelProps = {
  token: string;
};

export function WorkspaceInvitationAcceptPanel({ token }: WorkspaceInvitationAcceptPanelProps) {
  const [acceptedInvitation, setAcceptedInvitation] = useState<ServerWorkspaceInvitationAcceptance | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  async function acceptInvitation() {
    setIsAccepting(true);
    setMessage(null);

    try {
      setAcceptedInvitation(await acceptCloudWorkspaceInvitation(token));
    } catch (error) {
      setAcceptedInvitation(null);
      setMessage(error instanceof Error ? error.message : "Workspace invitation could not be accepted.");
    } finally {
      setIsAccepting(false);
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Workspace invitation</CardTitle>
        <CardDescription>Accept this invite with the same email address that received access.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {acceptedInvitation ? (
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-4 text-emerald-500" />
              Invitation accepted
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {acceptedInvitation.email} now has {workspaceRoleLabels[acceptedInvitation.role].toLowerCase()} access to this workspace.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You need to be signed in before accepting. If this invite shows a different-email warning, switch accounts and retry this link.
          </p>
        )}
        {message ? <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">{message}</div> : null}
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2">
        <Button asChild variant="ghost">
          <Link href="/auth">Sign in</Link>
        </Button>
        <Button onClick={acceptInvitation} disabled={isAccepting || Boolean(acceptedInvitation)}>
          {isAccepting ? <Loader2 className="size-4 animate-spin" /> : null}
          Accept invite
        </Button>
        {acceptedInvitation ? (
          <Button asChild variant="secondary">
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
