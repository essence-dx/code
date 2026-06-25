import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, PackageCheck, Radar, Rocket, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getWorkspaceReleaseCalendarKindLabels,
  type WorkspaceReleaseCalendarMilestone,
  type WorkspaceReleaseCalendarReport,
} from "@/features/workspaces/workspace-release-calendar";
import type { WorkspaceReleaseCalendarMilestoneKind, WorkspaceReleaseCalendarMilestoneStatus } from "@/features/workspaces/types";

const kindLabels = getWorkspaceReleaseCalendarKindLabels();

function statusVariant(status: WorkspaceReleaseCalendarMilestoneStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  if (status === "done") {
    return "outline";
  }

  return status === "due" ? "secondary" : "outline";
}

function statusIcon(status: WorkspaceReleaseCalendarMilestoneStatus) {
  if (status === "blocked") {
    return <TriangleAlert className="size-3.5" />;
  }

  if (status === "done") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return <Clock3 className="size-3.5" />;
}

function kindIcon(kind: WorkspaceReleaseCalendarMilestoneKind) {
  switch (kind) {
    case "app-package":
      return <PackageCheck className="size-4" />;
    case "desktop-channel":
      return <Rocket className="size-4" />;
    case "post-deploy":
      return <Radar className="size-4" />;
    case "review-gate":
      return <ShieldCheck className="size-4" />;
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function MilestoneRow({ milestone }: { milestone: WorkspaceReleaseCalendarMilestone }) {
  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">{kindIcon(milestone.kind)}</span>
            <div className="min-w-0">
              <p className="truncate font-medium">{milestone.title}</p>
              <p className="truncate text-xs text-muted-foreground">{milestone.projectName ?? "Workspace release"}</p>
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{milestone.detail}</p>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant="outline">
          {kindLabels[milestone.kind]}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(milestone.status)}>
          {statusIcon(milestone.status)}
          {milestone.status}
        </Badge>
      </TableCell>
      <TableCell>{formatDate(milestone.completedAt ?? milestone.dueAt)}</TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-2">
          <span className="text-xs text-muted-foreground">{milestone.actionLabel}</span>
          {milestone.projectId ? (
            <Link className={buttonVariants({ className: "h-8", size: "sm", variant: "outline" })} href={`/?projectId=${encodeURIComponent(milestone.projectId)}`}>
              Open scene
            </Link>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function WorkspaceReleaseCalendarPanel({
  error,
  report,
}: {
  error?: string | null;
  report: WorkspaceReleaseCalendarReport;
}) {
  const visibleMilestones = report.milestones.slice(0, 10);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4" />
              Release calendar
            </CardTitle>
            <CardDescription>Workspace milestones for review gates, app packages, desktop channels, and post-deploy checks.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={report.summary.blockedCount > 0 ? "destructive" : "outline"}>
              {report.summary.blockedCount} blocked
            </Badge>
            <Badge className="rounded-md" variant="secondary">
              {report.summary.dueCount} due
            </Badge>
            <Badge className="rounded-md" variant="outline">
              next {formatDate(report.summary.nextMilestoneAt)}
            </Badge>
          </div>
        </div>
        {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
          <span className="rounded-md bg-muted px-2 py-1">{report.summary.reviewGateCount} review gates</span>
          <span className="rounded-md bg-muted px-2 py-1">{report.summary.appPackageCount} app packages</span>
          <span className="rounded-md bg-muted px-2 py-1">{report.summary.desktopChannelCount} desktop channels</span>
          <span className="rounded-md bg-muted px-2 py-1">{report.summary.postDeployCount} post-deploy</span>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Milestone</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due/completed</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleMilestones.length > 0 ? (
              visibleMilestones.map((milestone) => <MilestoneRow key={milestone.id} milestone={milestone} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  No release milestones are available for this workspace yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
