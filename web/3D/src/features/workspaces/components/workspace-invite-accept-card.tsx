"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : "Invite request failed";
    throw new Error(message);
  }

  return payload as T;
}

export function WorkspaceInviteAcceptCard({
  invitedEmail,
  invitedBy,
  role,
  token,
  workspaceName,
}: {
  invitedEmail: string;
  invitedBy: string;
  role: string;
  token: string;
  workspaceName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleAccept() {
    setPending(true);

    try {
      await parseJson<{ workspaceId: string }>(
        await fetch(`/api/workspace-invites/${token}/accept`, {
          method: "POST",
          credentials: "include",
        }),
      );
      toast.success("Workspace joined");
      router.push("/projects");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not accept invite");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <UserPlus className="size-5" />
        </div>
        <CardTitle>Join {workspaceName}</CardTitle>
        <CardDescription>
          {invitedBy} invited {invitedEmail} as {role}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full gap-2" disabled={pending} onClick={() => void handleAccept()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Accept invite
        </Button>
      </CardContent>
    </Card>
  );
}
