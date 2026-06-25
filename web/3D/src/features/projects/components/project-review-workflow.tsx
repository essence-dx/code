"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Clock3, MessageSquareWarning, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateProject } from "../project-api";
import {
  projectReviewStatuses,
  projectReviewStatusLabels,
  projectReviewSurfaceKeys,
  projectReviewSurfaceLabels,
  resolveShareSettings,
  summarizeProjectReviewWorkflow,
  updateProjectReviewWorkflow,
  type ProjectReviewStatus,
  type ProjectReviewSurface,
  type ShareSettings,
} from "../share-settings";

interface ProjectReviewWorkflowProps {
  projectId: string;
  shareSettings: ShareSettings | null;
}

function statusIcon(status: ProjectReviewStatus) {
  if (status === "approved") {
    return <CheckCircle2 className="size-4 text-emerald-500" />;
  }

  if (status === "changesRequested") {
    return <MessageSquareWarning className="size-4 text-destructive" />;
  }

  if (status === "requested") {
    return <Send className="size-4 text-amber-500" />;
  }

  return <Clock3 className="size-4 text-muted-foreground" />;
}

function statusVariant(status: ProjectReviewStatus) {
  return status === "changesRequested" ? "destructive" : status === "approved" ? "default" : "secondary";
}

function surfaceNote(surface: ProjectReviewSurface) {
  if (surface === "publicLink") {
    return "Share page visibility";
  }

  if (surface === "embed") {
    return "Iframe, platform embeds, and scene API";
  }

  if (surface === "desktopRelease") {
    return "Updater channel promotion";
  }

  return "Web, mobile, and spatial app packages";
}

export function ProjectReviewWorkflow({ projectId, shareSettings }: ProjectReviewWorkflowProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const resolvedShareSettings = resolveShareSettings(shareSettings);
  const workflow = resolvedShareSettings.reviewWorkflow;
  const summary = summarizeProjectReviewWorkflow(workflow);
  const blocked = summary.blockedCount > 0;
  const active = summary.requestedCount > 0;
  const complete = summary.approvedCount === summary.surfaceCount;

  async function setReviewStatus(surface: ProjectReviewSurface, status: ProjectReviewStatus) {
    const pendingKey = `${surface}:${status}`;

    setPending(pendingKey);

    try {
      await updateProject(projectId, {
        shareSettings: {
          ...resolvedShareSettings,
          reviewWorkflow: updateProjectReviewWorkflow(workflow, surface, status, {
            updatedAt: new Date().toISOString(),
          }),
        },
      });
      toast.success(`${projectReviewSurfaceLabels[surface]} marked ${projectReviewStatusLabels[status].toLowerCase()}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review update failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button className="w-full justify-start gap-2" disabled={pending !== null} size="sm" variant="ghost">
            <ShieldCheck className="size-4" />
            Team review
            <Badge className="ml-auto rounded-md text-[10px]" variant={blocked ? "destructive" : complete ? "default" : "secondary"}>
              {blocked ? `${summary.blockedCount} blocked` : complete ? "Approved" : active ? `${summary.requestedCount} review` : `${summary.approvedCount}/${summary.surfaceCount}`}
            </Badge>
          </Button>
        }
      />
      <DropdownMenuContent className="w-72">
        <DropdownMenuLabel>Approval states</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projectReviewSurfaceKeys.map((surface) => {
          const decision = workflow[surface];

          return (
            <DropdownMenuSub key={surface}>
              <DropdownMenuSubTrigger>
                {statusIcon(decision.status)}
                <span className="min-w-0 flex-1 truncate">{projectReviewSurfaceLabels[surface]}</span>
                <Badge className="ml-2 rounded-md text-[10px]" variant={statusVariant(decision.status)}>
                  {projectReviewStatusLabels[decision.status]}
                </Badge>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuLabel>{surfaceNote(surface)}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {projectReviewStatuses.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    disabled={pending === `${surface}:${status}` || decision.status === status}
                    onClick={() => void setReviewStatus(surface, status)}
                  >
                    {statusIcon(status)}
                    {projectReviewStatusLabels[status]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
