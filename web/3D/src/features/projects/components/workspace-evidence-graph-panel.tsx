"use client";

import { Archive, CheckCircle2, ClipboardList, FileSearch, GitBranch, PackageSearch, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  WorkspaceEvidenceGraphNodeKind,
  WorkspaceEvidenceGraphReport,
  WorkspaceEvidenceGraphSeverity,
} from "@/features/projects/workspace-evidence-graph";

const nodeIcon: Record<WorkspaceEvidenceGraphNodeKind, typeof FileSearch> = {
  artifact: PackageSearch,
  audit: ClipboardList,
  incident: ShieldAlert,
  policy: FileSearch,
  "release-packet": Archive,
  "source-record": GitBranch,
};

function severityVariant(severity: WorkspaceEvidenceGraphSeverity) {
  if (severity === "critical") {
    return "destructive" as const;
  }

  if (severity === "warning" || severity === "info") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function SeverityIcon({ severity }: { severity: WorkspaceEvidenceGraphSeverity }) {
  if (severity === "healthy") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return severity === "critical" ? <TriangleAlert className="size-3.5" /> : <ShieldAlert className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Current";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function WorkspaceEvidenceGraphPanel({ report }: { report: WorkspaceEvidenceGraphReport }) {
  const visibleNodes = report.nodes.filter((node) => node.severity === "critical" || node.severity === "warning").slice(0, 12);
  const visibleLinks = report.links.slice(0, 10);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="size-4" />
              Workspace evidence graph
            </CardTitle>
            <CardDescription>Linked policy, audit, release packet, artifact, incident, and source-record evidence for reviewer traceability.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={report.summary.orphanRiskCount > 0 ? "destructive" : "outline"}>
              {report.summary.orphanRiskCount} orphan risks
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.coverageScore}/100 coverage
            </Badge>
            <Badge className="rounded-md" variant={report.summary.criticalNodeCount > 0 ? "secondary" : "outline"}>
              {report.summary.criticalNodeCount} critical
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Nodes</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.nodeCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Links</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.linkCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Policies</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.policyNodeCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Artifacts</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.artifactNodeCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Connected</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.connectedNodeCount}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Risk evidence</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleNodes.map((node) => {
              const Icon = nodeIcon[node.kind];

              return (
                <TableRow key={node.id}>
                  <TableCell className="max-w-[300px] whitespace-normal">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{node.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{node.kind}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="gap-1 rounded-md" variant={severityVariant(node.severity)}>
                      <SeverityIcon severity={node.severity} />
                      {node.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[220px] whitespace-normal text-xs text-muted-foreground">{node.projectName ?? "Workspace"}</TableCell>
                  <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{node.detail}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(node.timestamp)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {visibleLinks.length > 0 ? (
          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <GitBranch className="size-4" />
              Strongest evidence links
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {visibleLinks.map((link) => (
                <div className="rounded-md border bg-background p-3" key={link.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-md" variant="outline">
                      {link.kind}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{link.sourceId}</p>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{link.detail}</p>
                  <p className="mt-2 text-xs font-medium">{link.targetId}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
