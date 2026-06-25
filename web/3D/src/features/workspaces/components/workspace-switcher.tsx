"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2, Plus, Users2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WorkspaceSummary } from "@/features/workspaces/types";

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : "Workspace request failed";
    throw new Error(message);
  }

  return payload as T;
}

function getWorkspacePath(workspaceId: string) {
  return `/projects?workspaceId=${encodeURIComponent(workspaceId)}`;
}

export function WorkspaceSwitcher({ activeWorkspaceId, workspaces }: { activeWorkspaceId: string; workspaces: WorkspaceSummary[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    setPending(true);

    try {
      const response = await parseJson<{ workspace: WorkspaceSummary }>(
        await fetch("/api/workspaces", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: trimmedName }),
        }),
      );

      setName("");
      toast.success("Workspace created");
      router.push(getWorkspacePath(response.workspace.id));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Workspace creation failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6 space-y-3 rounded-md border bg-card p-3 text-card-foreground">
      <div className="flex items-center gap-2">
        <Users2 className="size-4 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-medium">Workspaces</p>
          <p className="text-xs text-muted-foreground">{workspaces.length} available</p>
        </div>
      </div>

      <div className="space-y-1">
        {workspaces.map((workspace) => (
          <Button
            key={workspace.id}
            className="grid h-auto w-full grid-cols-[1fr_auto] items-center gap-2 px-2 py-2 text-left"
            type="button"
            variant={workspace.id === activeWorkspaceId ? "secondary" : "ghost"}
            onClick={() => router.push(getWorkspacePath(workspace.id))}
          >
            <span className="min-w-0">
              <span className="block truncate">{workspace.name}</span>
              <span className="block truncate text-xs opacity-75">
                {workspace.memberCount} member{workspace.memberCount === 1 ? "" : "s"}
              </span>
            </span>
            <Badge className="rounded-md text-[11px]" variant={workspace.role === "owner" ? "default" : "secondary"}>
              {workspace.role}
            </Badge>
          </Button>
        ))}
      </div>

      <form className="grid gap-2" onSubmit={handleCreate}>
        <Label className="sr-only" htmlFor="workspace-name">
          Workspace name
        </Label>
        <Input id="workspace-name" maxLength={80} placeholder="New workspace" value={name} onChange={(event) => setName(event.target.value)} />
        <Button className="w-full gap-2" disabled={pending || !name.trim()} size="sm" type="submit" variant="secondary">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Create workspace
        </Button>
      </form>
    </div>
  );
}
