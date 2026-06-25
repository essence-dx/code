import { CheckCircle2, Download, FileJson2, PackageCheck, ShieldAlert, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeSignedPackageDistributionManifestProof,
  NativeSignedPackageDistributionManifestProofFileFormat,
  NativeSignedPackageDistributionManifestProofStatus,
  NativeSignedPackageDistributionManifestRow,
} from "@/features/projects/native-signed-package-distribution-manifest-proof";

function statusVariant(status: NativeSignedPackageDistributionManifestProofStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeSignedPackageDistributionManifestProofStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: NativeSignedPackageDistributionManifestProofFileFormat }) {
  return format === "json" ? <FileJson2 className="size-4" /> : <Table2 className="size-4" />;
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

function ProofFlag({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <Badge className="gap-1 rounded-md" variant={enabled ? "outline" : "destructive"}>
      {enabled ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
      {label}
    </Badge>
  );
}

function ManifestRow({ row }: { row: NativeSignedPackageDistributionManifestRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <PackageCheck className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.artifactFileName}</p>
            <p className="truncate text-xs text-muted-foreground">{row.platform}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex flex-wrap gap-1.5">
          <ProofFlag enabled={row.artifactHosted} label="artifact" />
          <ProofFlag enabled={row.manifestLinked} label="manifest" />
          <ProofFlag enabled={row.checksumAttested} label="checksum" />
          <ProofFlag enabled={row.channelReady} label="channel" />
        </div>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p>{row.releaseChannel}</p>
        <p className="mt-1 truncate">{row.artifactUrl || "missing artifact URL"}</p>
        <p className="mt-1 truncate">{row.manifestUrl || "missing manifest URL"}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.proofHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeSignedPackageDistributionManifestProofPanel({ proof }: { proof: NativeSignedPackageDistributionManifestProof }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="size-4" />
              Native signed package distribution manifest proof
            </CardTitle>
            <CardDescription>Hosted artifacts, updater manifests, release channels, and checksum attestations for signed native package distribution.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(proof.summary.status)}>
              <StatusIcon status={proof.summary.status} />
              {proof.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={proof.summary.proofScore < 80 ? "destructive" : "outline"}>
              {proof.summary.proofScore}/100 proof
            </Badge>
            {proof.files.map((file) => (
              <Button key={file.format} render={<a download={file.download} href={file.href} />} className="h-8 gap-2" size="sm" variant="outline">
                <FileIcon format={file.format} />
                {file.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail="platform rows" label="Rows" value={`${proof.summary.rowCount}`} />
          <SummaryTile detail="ready manifests" label="Ready" value={`${proof.summary.readyCount}`} />
          <SummaryTile detail="needs review" label="Review" value={`${proof.summary.reviewCount}`} />
          <SummaryTile detail="release blockers" label="Blocked" value={`${proof.summary.blockedCount}`} />
          <SummaryTile detail="channel mismatches" label="Channel" value={`${proof.summary.channelMismatchCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Distribution action</p>
          <p className="mt-1 text-sm text-muted-foreground">{proof.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{proof.summary.proofHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Artifact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead>Distribution</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{proof.rows.map((row) => <ManifestRow key={row.platform} row={row} />)}</TableBody>
        </Table>

        <Badge className="w-fit gap-1 rounded-md" variant="outline">
          <Download className="size-3.5" />
          {proof.summary.proofHash}
        </Badge>
      </CardContent>
    </Card>
  );
}
