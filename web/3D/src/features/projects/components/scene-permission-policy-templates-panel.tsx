"use client";

import { CheckCircle2, Code2, Download, Globe2, KeyRound, PackageCheck, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  ScenePermissionPolicyStatus,
  ScenePermissionPolicyTemplateId,
  ScenePermissionPolicyTemplateReport,
} from "@/features/projects/scene-permission-policy-templates";

const templateIcon: Record<ScenePermissionPolicyTemplateId, typeof Globe2> = {
  "api-partner": Code2,
  "app-package-release": PackageCheck,
  "embed-portfolio": KeyRound,
  "viewer-review": Globe2,
};

function statusVariant(status: ScenePermissionPolicyStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: ScenePermissionPolicyStatus }) {
  return status === "ready" ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function SummaryTile({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function ScenePermissionPolicyTemplatesPanel({ report }: { report: ScenePermissionPolicyTemplateReport }) {
  const visibleProjectRows = report.projectRows.slice(0, 6);
  const csvDataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(report.csvContent)}`;

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Scene permission policy templates
            </CardTitle>
            <CardDescription>Granular viewer, embed, API, and app-package templates for share settings, review gates, and release evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.coverageScore}/100 coverage
            </Badge>
            <a className={buttonVariants({ className: "gap-2", size: "sm", variant: "outline" })} download="scene-permission-policy-templates.csv" href={csvDataUri}>
              <Download data-icon="inline-start" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <SummaryTile detail="viewer, embed, API, app package" label="Templates" value={`${report.summary.templateCount}`} />
          <SummaryTile detail={`${report.summary.unclassifiedProjectCount} need template assignment`} label="Classified" value={`${report.summary.classifiedProjectCount}`} />
          <SummaryTile detail={`${report.summary.watchProjectCount} awaiting approvals`} label="Ready" value={`${report.summary.readyProjectCount}`} />
          <SummaryTile detail="active non-archived scenes" label="Projects" value={`${report.summary.activeProjectCount}`} />
          <SummaryTile detail="unclassified or rejected gates" label="Blocked" value={`${report.summary.blockedProjectCount}`} />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Review gates</TableHead>
              <TableHead>Coverage</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => {
              const Icon = templateIcon[row.templateId];

              return (
                <TableRow key={row.templateId}>
                  <TableCell className="max-w-[280px] whitespace-normal">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{row.label}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.description}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{row.permissionSummary}</p>
                    <p className="mt-1">{row.surfaceLabels.join(", ")}</p>
                  </TableCell>
                  <TableCell className="max-w-[260px] whitespace-normal">
                    <div className="flex flex-wrap gap-1">
                      {row.requiredReviewLabels.map((label) => (
                        <Badge className="rounded-md" key={label} variant="outline">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[240px] whitespace-normal text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{row.matchingProjectCount} projects</p>
                    <p className="mt-1 line-clamp-2">{row.projectNames.length > 0 ? row.projectNames.join(", ") : "No active projects yet"}</p>
                  </TableCell>
                  <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{row.nextAction}</p>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {visibleProjectRows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current permissions</TableHead>
                <TableHead>Recommended template</TableHead>
                <TableHead>Next action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleProjectRows.map((row) => (
                <TableRow key={row.projectId}>
                  <TableCell className="max-w-[260px] whitespace-normal">
                    <p className="font-medium">{row.projectName}</p>
                    <p className="text-xs text-muted-foreground">{row.projectId}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
                      <StatusIcon status={row.status} />
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[240px] whitespace-normal text-xs text-muted-foreground">{row.currentPermissionSummary}</TableCell>
                  <TableCell className="max-w-[240px] whitespace-normal text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{row.recommendedTemplateLabel}</p>
                    <p className="mt-1">{row.matchedTemplateLabel ? "Matched policy" : "Needs assignment"}</p>
                  </TableCell>
                  <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{row.nextAction}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}
