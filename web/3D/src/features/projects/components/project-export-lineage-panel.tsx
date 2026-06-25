import Link from "next/link";
import { Boxes, CheckCircle2, FileJson2, GitBranch, Link2, PackageCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectExportLineageArtifactKind, ProjectExportLineageArtifactStatus, ProjectExportLineageReport } from "@/features/projects/project-export-lineage";

function statusVariant(status: ProjectExportLineageArtifactStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  if (status === "draft") {
    return "secondary";
  }

  return "outline";
}

function statusIcon(status: ProjectExportLineageArtifactStatus) {
  if (status === "blocked") {
    return <TriangleAlert className="size-3.5" />;
  }

  return <CheckCircle2 className="size-3.5" />;
}

function kindIcon(kind: ProjectExportLineageArtifactKind) {
  switch (kind) {
    case "api-payload":
      return <FileJson2 className="size-4" />;
    case "app-package":
      return <PackageCheck className="size-4" />;
    case "compliance-report":
      return <Boxes className="size-4" />;
    case "embed":
    case "public-link":
      return <Link2 className="size-4" />;
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return "Current scene";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function LineageRow({ report }: { report: ProjectExportLineageReport }) {
  const blockedArtifacts = report.artifacts.filter((artifact) => artifact.status !== "available");
  const visibleArtifacts = report.artifacts.slice(0, 5);

  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          <p className="truncate font-medium">{report.project.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {report.sourceVersion.name} - {formatDate(report.sourceVersion.createdAt)}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {visibleArtifacts.map((artifact) => (
            <Badge className="gap-1 rounded-md" key={artifact.id} variant={statusVariant(artifact.status)}>
              {kindIcon(artifact.kind)}
              {artifact.label}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <div className="grid gap-1 text-xs text-muted-foreground">
          <span>{report.summary.availableCount} available</span>
          <span>{report.summary.blockedCount} blocked</span>
          <span>{report.summary.draftCount} draft</span>
        </div>
      </TableCell>
      <TableCell>
        {blockedArtifacts[0] ? (
          <div className="max-w-[260px] text-xs text-muted-foreground">
            <Badge className="mb-1 gap-1 rounded-md" variant={statusVariant(blockedArtifacts[0].status)}>
              {statusIcon(blockedArtifacts[0].status)}
              {blockedArtifacts[0].status}
            </Badge>
            <p className="line-clamp-2">{blockedArtifacts[0].blockedReason ?? blockedArtifacts[0].label}</p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">All lineage artifacts are available.</span>
        )}
      </TableCell>
    </TableRow>
  );
}

export function ProjectExportLineagePanel({ reports }: { reports: ProjectExportLineageReport[] }) {
  const visibleReports = reports.slice(0, 8);
  const totals = reports.reduce(
    (summary, report) => ({
      availableCount: summary.availableCount + report.summary.availableCount,
      blockedCount: summary.blockedCount + report.summary.blockedCount,
      draftCount: summary.draftCount + report.summary.draftCount,
      totalCount: summary.totalCount + report.summary.totalCount,
    }),
    { availableCount: 0, blockedCount: 0, draftCount: 0, totalCount: 0 },
  );

  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="size-4" />
              Export artifact lineage
            </CardTitle>
            <CardDescription>Trace each scene version into compliance exports, public links, embeds, API payloads, and app packages.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant="outline">
              {totals.availableCount}/{totals.totalCount} available
            </Badge>
            <Badge className="rounded-md" variant={totals.blockedCount > 0 ? "destructive" : "outline"}>
              {totals.blockedCount} blocked
            </Badge>
            <Badge className="rounded-md" variant="secondary">
              {totals.draftCount} draft
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scene version</TableHead>
              <TableHead>Artifacts</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Next fix</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleReports.length > 0 ? (
              visibleReports.map((report) => <LineageRow key={report.project.id} report={report} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={4}>
                  No active projects are available for export lineage.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="mt-3">
          <Link className={buttonVariants({ className: "gap-2", size: "sm", variant: "outline" })} href="/projects/integration-qa">
            <FileJson2 className="size-4" />
            Integration QA
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
