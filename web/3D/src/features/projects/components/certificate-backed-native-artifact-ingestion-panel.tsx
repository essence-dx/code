import { BadgeCheck, CheckCircle2, Download, FileJson2, PackageCheck, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  CertificateBackedNativeArtifactIngestionReport,
  CertificateBackedNativeArtifactIngestionRow,
  CertificateBackedNativeArtifactStatus,
} from "@/features/projects/certificate-backed-native-artifact-ingestion";

function statusVariant(status: CertificateBackedNativeArtifactStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: CertificateBackedNativeArtifactStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function ArtifactRow({ row }: { row: CertificateBackedNativeArtifactIngestionRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <PackageCheck className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.fileName}</p>
            <p className="text-xs text-muted-foreground">{row.platform}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[380px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{row.artifactSha256}</p>
        <p className="mt-1 truncate font-mono">{row.certificateFingerprint}</p>
        <p className="mt-1 truncate">{row.signerIdentity}</p>
        <p className="mt-1 truncate">{row.revocationStatus}</p>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate">{row.timestampAuthority}</p>
        <p className="mt-1 truncate">{row.timestampedAt}</p>
        <p className="mt-1 truncate">{row.uploadedAt}</p>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.ingestionHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function CertificateBackedNativeArtifactIngestionPanel({ report }: { report: CertificateBackedNativeArtifactIngestionReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="size-4" />
              Certificate-backed native artifact ingestion
            </CardTitle>
            <CardDescription>Uploaded Windows, macOS, and Linux native release outputs with artifact hashes, signer identities, timestamp evidence, certificate fingerprints, and revocation checks.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.ingestionScore < 80 ? "destructive" : "outline"}>
              {report.summary.ingestionScore}/100 ingestion
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.jsonFileName} href={report.jsonDataUri}>
              <FileJson2 className="size-4" />
              JSON
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail="native outputs" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="commercial proof ready" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="needs review" label="Review" value={`${report.summary.reviewCount}`} />
          <SummaryTile detail="missing or revoked" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="workspace" label="Ingestion" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Native artifact ingestion action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.ingestionHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Artifact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Certificate</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <ArtifactRow key={row.ingestionId} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
