import { CheckCircle2, Cpu, FileBadge2, Globe2, PackageCheck, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  ProjectArtifactProvenanceKind,
  ProjectArtifactProvenanceReport,
  ProjectArtifactProvenanceRow,
  ProjectArtifactProvenanceStatus,
} from "@/features/projects/artifact-provenance-verification";

const kindIcon: Record<ProjectArtifactProvenanceKind, typeof ShieldCheck> = {
  "cad-output": Cpu,
  certificate: FileBadge2,
  "desktop-bundle": PackageCheck,
  "public-asset": Globe2,
};

function kindLabel(kind: ProjectArtifactProvenanceKind) {
  if (kind === "cad-output") {
    return "CAD output";
  }

  if (kind === "desktop-bundle") {
    return "Desktop bundle";
  }

  if (kind === "public-asset") {
    return "Public asset";
  }

  return "Certificate";
}

function statusVariant(status: ProjectArtifactProvenanceStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  if (status === "missing" || status === "warning") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function statusIcon(status: ProjectArtifactProvenanceStatus) {
  if (status === "verified") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return <TriangleAlert className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not verified";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function ProvenanceRow({ row }: { row: ProjectArtifactProvenanceRow }) {
  const Icon = kindIcon[row.kind];

  return (
    <TableRow>
      <TableCell className="max-w-[340px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.label}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">{row.projectName}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant="outline">
          {kindLabel(row.kind)}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          {statusIcon(row.status)}
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.expected}</p>
        <p className="mt-1 line-clamp-1 font-mono">{row.artifactRef ?? row.source}</p>
      </TableCell>
      <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.evidence}</p>
        <p className="mt-1 line-clamp-1 font-mono">{row.actual}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDate(row.verifiedAt)}</TableCell>
      <TableCell className="max-w-[240px] whitespace-normal text-xs text-muted-foreground">{row.nextAction}</TableCell>
    </TableRow>
  );
}

export function ProjectArtifactProvenancePanel({ report }: { report: ProjectArtifactProvenanceReport }) {
  const visibleRows = report.rows.slice(0, 12);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Artifact provenance
            </CardTitle>
            <CardDescription>Verification coverage for uploaded certificates, desktop bundles, CAD outputs, and public assets.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.worstStatus)}>
              {statusIcon(report.summary.worstStatus)}
              {report.summary.worstStatus}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.score}/100 provenance
            </Badge>
            <Badge className="rounded-md" variant={report.summary.blockedCount > 0 ? "destructive" : "outline"}>
              {report.summary.blockedCount} blocked
            </Badge>
            <Badge className="rounded-md" variant={report.summary.missingCount + report.summary.warningCount > 0 ? "secondary" : "outline"}>
              {report.summary.missingCount + report.summary.warningCount} needs evidence
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Artifact</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length > 0 ? (
              visibleRows.map((row) => <ProvenanceRow key={row.id} row={row} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={7}>
                  No artifact provenance records are available yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
