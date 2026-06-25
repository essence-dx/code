import type { ReactNode } from "react";
import { CheckCircle2, Clock3, FileCheck2, KeyRound, ShieldCheck, TriangleAlert, Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { WorkspaceSecurityComplianceProjectRow, WorkspaceSecurityComplianceReport } from "@/features/projects/workspace-security-compliance";

function riskVariant(risk: WorkspaceSecurityComplianceProjectRow["risk"]) {
  if (risk === "blocked") {
    return "destructive";
  }

  if (risk === "watch") {
    return "secondary";
  }

  return "outline";
}

function riskIcon(risk: WorkspaceSecurityComplianceProjectRow["risk"]) {
  if (risk === "healthy") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return <TriangleAlert className="size-3.5" />;
}

function retentionLabel(row: WorkspaceSecurityComplianceProjectRow) {
  if (!row.retentionCovered) {
    return "Missing policy";
  }

  if (row.retentionPurgeStatus === "approved") {
    return "Purge approved";
  }

  if (row.retentionPurgeStatus === "requested") {
    return "Approval requested";
  }

  return "Policy active";
}

function retentionVariant(row: WorkspaceSecurityComplianceProjectRow) {
  if (!row.retentionCovered || row.retentionPurgeStatus === "changesRequested") {
    return "destructive" as const;
  }

  if (row.retentionPurgeStatus === "requested" || row.retentionPurgeStatus === "draft") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-muted">
      <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function ComplianceMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function ProjectComplianceRow({ row }: { row: WorkspaceSecurityComplianceProjectRow }) {
  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          <p className="truncate font-medium">{row.name}</p>
          <p className="truncate text-xs text-muted-foreground">{row.id}</p>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={riskVariant(row.risk)}>
          {riskIcon(row.risk)}
          {row.risk}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={retentionVariant(row)}>
          {retentionLabel(row)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {row.blockedSurfaces.length > 0 ? (
            row.blockedSurfaces.slice(0, 3).map((surface) => (
              <Badge className="rounded-md" key={surface} variant="secondary">
                {surface}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">Approved</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {row.exportBlockedCount} blocked / {row.exportDraftCount} draft
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {row.artifactBlockedCount} blocked / {row.artifactCertificateRequiredCount} signing
      </TableCell>
    </TableRow>
  );
}

export function WorkspaceSecurityCompliancePanel({ report }: { report: WorkspaceSecurityComplianceReport }) {
  const visibleRows = report.projectRows.slice(0, 8);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Workspace security and compliance
            </CardTitle>
            <CardDescription>Role coverage, grants, retention policies, review gates, and export lineage risk in one workspace rollup.</CardDescription>
          </div>
          <div className="min-w-[220px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Trust score</span>
              <Badge className="rounded-md" variant={report.summary.trustScore >= 80 ? "outline" : report.summary.trustScore >= 55 ? "secondary" : "destructive"}>
                {report.summary.trustScore}/100
              </Badge>
            </div>
            <div className="mt-2">
              <ScoreBar value={report.summary.trustScore} />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ComplianceMetric icon={<Users2 className="size-3.5" />} label="Members" value={`${report.summary.memberCount}`} />
          <ComplianceMetric icon={<KeyRound className="size-3.5" />} label="Access grants" value={`${report.grants.totalGrantCount}`} />
          <ComplianceMetric icon={<FileCheck2 className="size-3.5" />} label="Retention coverage" value={`${report.retention.coveragePercent}%`} />
          <ComplianceMetric icon={<Clock3 className="size-3.5" />} label="Project blockers" value={`${report.summary.projectWithBlockerCount}`} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <div className="grid gap-3">
            <div className="rounded-md border bg-background p-3">
              <p className="text-sm font-medium">Role distribution</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {report.roles.map((role) => (
                  <Badge className="rounded-md" key={role.role} variant={role.role === "owner" || role.role === "admin" ? "outline" : "secondary"}>
                    {role.label}: {role.count}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-sm font-medium">Coverage gaps</p>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                <span>{report.retention.missingProjectCount} active projects missing retention policies.</span>
                <span>{report.retention.stalePolicyCount} policies have no recent review timestamp.</span>
                <span>{report.summary.exportBlockedCount} blocked export lineage artifacts and {report.summary.exportDraftCount} draft artifacts.</span>
                <span>{report.summary.signedBundleCertificateRequiredCount} app package artifacts still need signing certificates.</span>
              </div>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-sm font-medium">Review gates</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {report.reviewSurfaces.map((surface) => (
                  <Badge className="rounded-md" key={surface.surface} variant={surface.blockedCount > 0 ? "secondary" : "outline"}>
                    {surface.label}: {surface.blockedCount}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Retention</TableHead>
                <TableHead>Review gates</TableHead>
                <TableHead>Lineage</TableHead>
                <TableHead>Artifacts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.length > 0 ? (
                visibleRows.map((row) => <ProjectComplianceRow key={row.id} row={row} />)
              ) : (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={6}>
                    No active projects are available for compliance review.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
