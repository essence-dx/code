import { Boxes, CheckCircle2, FileArchive, FileJson2, Globe2, LockKeyhole, PackageCheck, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  ProjectArtifactRegistryEntry,
  ProjectArtifactRegistryKind,
  ProjectArtifactRegistryReport,
  ProjectArtifactRegistrySignatureState,
  ProjectArtifactRegistryStatus,
} from "@/features/projects/project-artifact-registry";

function statusVariant(status: ProjectArtifactRegistryStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  if (status === "draft") {
    return "secondary";
  }

  return "outline";
}

function statusIcon(status: ProjectArtifactRegistryStatus) {
  if (status === "blocked") {
    return <TriangleAlert className="size-3.5" />;
  }

  return <CheckCircle2 className="size-3.5" />;
}

function kindIcon(kind: ProjectArtifactRegistryKind) {
  if (kind === "signed-app-bundle") {
    return <PackageCheck className="size-4" />;
  }

  if (kind === "public-asset") {
    return <Globe2 className="size-4" />;
  }

  if (kind === "compliance-export") {
    return <FileArchive className="size-4" />;
  }

  return <FileJson2 className="size-4" />;
}

function kindLabel(kind: ProjectArtifactRegistryKind) {
  if (kind === "signed-app-bundle") {
    return "Signed bundle";
  }

  if (kind === "public-asset") {
    return "Public asset";
  }

  if (kind === "compliance-export") {
    return "Compliance";
  }

  return "Lineage";
}

function signatureLabel(value: ProjectArtifactRegistrySignatureState) {
  if (value === "certificate-required") {
    return "Certificate required";
  }

  if (value === "not-required") {
    return "Not required";
  }

  return value === "signed" ? "Signed" : "Unsigned";
}

function signatureVariant(value: ProjectArtifactRegistrySignatureState) {
  if (value === "certificate-required" || value === "unsigned") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function RegistryRow({ entry }: { entry: ProjectArtifactRegistryEntry }) {
  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          <p className="truncate font-medium">{entry.label}</p>
          <p className="truncate text-xs text-muted-foreground">{entry.projectName}</p>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant="outline">
          {kindIcon(entry.kind)}
          {kindLabel(entry.kind)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          <Badge className="gap-1 rounded-md" variant={statusVariant(entry.status)}>
            {statusIcon(entry.status)}
            {entry.status}
          </Badge>
          <Badge className="gap-1 rounded-md" variant={entry.visibility === "public" ? "default" : "secondary"}>
            {entry.visibility === "public" ? <Globe2 className="size-3.5" /> : <LockKeyhole className="size-3.5" />}
            {entry.visibility}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={signatureVariant(entry.signatureState)}>
          {signatureLabel(entry.signatureState)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="max-w-[260px]">
          <p className="truncate text-xs">{entry.sourceVersionId}</p>
          <p className="truncate text-xs text-muted-foreground">{entry.url ?? entry.path ?? entry.artifactId}</p>
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDate(entry.updatedAt)}</TableCell>
    </TableRow>
  );
}

export function ProjectArtifactRegistryPanel({ report }: { report: ProjectArtifactRegistryReport }) {
  const visibleEntries = report.entries.slice(0, 10);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="size-4" />
              Artifact registry
            </CardTitle>
            <CardDescription>Durable inventory for signed bundles, public assets, compliance exports, and lineage snapshots.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant="outline">
              {report.summary.availableCount}/{report.summary.totalCount} available
            </Badge>
            <Badge className="rounded-md" variant={report.summary.blockedCount > 0 ? "destructive" : "outline"}>
              {report.summary.blockedCount} blocked
            </Badge>
            <Badge className="rounded-md" variant="secondary">
              {report.summary.signedBundleCount} bundles
            </Badge>
            <Badge className="rounded-md" variant="secondary">
              {report.summary.publicAssetCount} public assets
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
              <TableHead>Signing</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleEntries.length > 0 ? (
              visibleEntries.map((entry) => <RegistryRow entry={entry} key={entry.sourceKey} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={6}>
                  No artifacts have been registered yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {report.summary.signedBundleCount > 0 ? (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            App bundle records stay marked certificate-required until real platform signing artifacts are attached.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
