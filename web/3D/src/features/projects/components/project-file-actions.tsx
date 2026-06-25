"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, FolderOpen, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { archiveProject, restoreProject } from "../project-api";

interface ProjectFileActionsProps {
  projectId: string;
  projectName: string;
  view: "active" | "trash";
}

export function ProjectFileActions({ projectId, projectName, view }: ProjectFileActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<"archive" | "restore" | null>(null);

  async function handleArchive() {
    setPending("archive");

    try {
      await archiveProject(projectId);
      toast.success(`${projectName} moved to trash`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Archive failed");
    } finally {
      setPending(null);
    }
  }

  async function handleRestore() {
    setPending("restore");

    try {
      await restoreProject(projectId);
      toast.success(`${projectName} restored`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restore failed");
    } finally {
      setPending(null);
    }
  }

  if (view === "trash") {
    return (
      <Button className="shrink-0 gap-2" disabled={pending === "restore"} size="sm" variant="secondary" onClick={() => void handleRestore()}>
        {pending === "restore" ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
        Restore
      </Button>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Link className={cn(buttonVariants({ variant: "secondary", size: "icon" }), "size-9")} href={`/?projectId=${projectId}`} aria-label={`Open ${projectName}`}>
        <FolderOpen className="size-4" />
      </Link>
      <Button aria-label={`Move ${projectName} to trash`} className="size-9" disabled={pending === "archive"} size="icon" variant="ghost" onClick={() => void handleArchive()}>
        {pending === "archive" ? <Loader2 className="size-4 animate-spin" /> : <Archive className="size-4" />}
      </Button>
    </div>
  );
}
