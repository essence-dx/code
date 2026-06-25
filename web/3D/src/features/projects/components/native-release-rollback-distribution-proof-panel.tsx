import { CheckCircle2, Download, FileJson2, PackageCheck, RotateCcw, ShieldAlert, Table2, TerminalSquare, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeReleaseRollbackDistributionProof,
  NativeReleaseRollbackDistributionProofFileFormat,
  NativeReleaseRollbackDistributionProofStatus,
  NativeReleaseRollbackDistributionRow,
} from "@/features/projects/native-release-rollback-distribution-proof";

function statusVariant(status: NativeReleaseRollbackDistributionProofStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeReleaseRollbackDistributionProofStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: NativeReleaseRollbackDistributionProofFileFormat }) {
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

function RollbackRow({ row }: { row: NativeReleaseRollbackDistributionRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <RotateCcw className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.platform}</p>
            <p className="truncate text-xs text-muted-foreground">{row.previousStableArtifactFileName || "missing previous stable artifact"}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal">
        <div className="flex flex-wrap gap-1.5">
          <ProofFlag enabled={row.previousStableArtifactLinked} label="stable artifact" />
          <ProofFlag enabled={row.channelRestoreCommandReady} label="restore command" />
          <ProofFlag enabled={row.postRollbackUpdaterVerified} label="updater verified" />
          <ProofFlag enabled={row.updaterVerificationAttached} label="verification hash" />
        </div>
      </TableCell>
      <TableCell className="max-w-[380px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2 font-mono">{row.channelRestoreCommand || "missing channel restore command"}</p>
        <p className="mt-1 truncate font-mono">{row.channelRestoreEvidenceHash}</p>
        <p className="mt-1">window {row.rollbackWindowMinutes}m</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.rollbackHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeReleaseRollbackDistributionProofPanel({ proof }: { proof: NativeReleaseRollbackDistributionProof }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="size-4" />
              Native release rollback distribution proof
            </CardTitle>
            <CardDescription>Previous stable artifact links, channel restore commands, and post-rollback updater verification for native distribution rollback.</CardDescription>
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
          <SummaryTile detail="ready rollbacks" label="Ready" value={`${proof.summary.readyCount}`} />
          <SummaryTile detail="needs review" label="Review" value={`${proof.summary.reviewCount}`} />
          <SummaryTile detail="release blockers" label="Blocked" value={`${proof.summary.blockedCount}`} />
          <SummaryTile detail="restore commands" label="Commands" value={`${proof.summary.restoreCommandCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Rollback action</p>
          <p className="mt-1 text-sm text-muted-foreground">{proof.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{proof.summary.proofHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Restore</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{proof.rows.map((row) => <RollbackRow key={row.platform} row={row} />)}</TableBody>
        </Table>

        <div className="flex flex-wrap gap-2">
          <Badge className="gap-1 rounded-md" variant="outline">
            <Download className="size-3.5" />
            {proof.summary.proofHash}
          </Badge>
          <Badge className="gap-1 rounded-md" variant="outline">
            <PackageCheck className="size-3.5" />
            {proof.releaseCandidateId}
          </Badge>
          <Badge className="gap-1 rounded-md" variant="outline">
            <TerminalSquare className="size-3.5" />
            rollback commands
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
