import { Archive, CheckCircle2, Download, FileJson2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveEvidenceRetentionVaultManifest,
  BoardReleaseArchiveEvidenceRetentionVaultReport,
  BoardReleaseArchiveEvidenceRetentionVaultStatus,
} from "@/features/projects/board-release-archive-evidence-retention-vault";

function statusVariant(status: BoardReleaseArchiveEvidenceRetentionVaultStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveEvidenceRetentionVaultStatus }) {
  if (status === "sealed") {
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

function ManifestRow({ manifest }: { manifest: BoardReleaseArchiveEvidenceRetentionVaultManifest }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Archive className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{manifest.title}</p>
            <p className="truncate text-xs text-muted-foreground">{manifest.fileName}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(manifest.status)}>
          <StatusIcon status={manifest.status} />
          {manifest.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{manifest.sourceStatus}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{manifest.kind}</p>
        <p className="text-xs text-muted-foreground">{manifest.retentionClass}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p>{manifest.recordCount} records</p>
        <p className="text-xs text-muted-foreground">{manifest.byteSize} bytes</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{manifest.nextAction}</p>
        <p className="mt-1 truncate font-mono">{manifest.vaultHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveEvidenceRetentionVaultPanel({
  report,
}: {
  report: BoardReleaseArchiveEvidenceRetentionVaultReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Archive className="size-4" />
              Archive evidence retention vault
            </CardTitle>
            <CardDescription>Immutable bundle manifests for archive packet, digest, approvals, notifications, and command center evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.vaultScore < 80 ? "destructive" : "outline"}>
              {report.summary.vaultScore}/100 vault
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
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="bundle manifests" label="Manifests" value={`${report.summary.manifestCount}`} />
          <SummaryTile detail="immutable bundles" label="Sealed" value={`${report.summary.sealedCount}`} />
          <SummaryTile detail="needs action" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="monitor" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="all bundles" label="Bytes" value={`${report.summary.totalByteSize}`} />
          <SummaryTile detail="workspace" label="Vault" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Vault next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.vaultHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Manifest</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.manifests.map((manifest) => <ManifestRow key={manifest.id} manifest={manifest} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
