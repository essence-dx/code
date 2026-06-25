import { CheckCircle2, Download, FileJson2, Link2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveVerificationSignatureChainRow,
  BoardReleaseArchiveVerificationSignatureChainStatus,
  BoardReleaseArchiveVerificationSignatureChainValidatorReport,
} from "@/features/projects/board-release-archive-verification-signature-chain-validator";

function statusVariant(status: BoardReleaseArchiveVerificationSignatureChainStatus) {
  if (status === "missing") {
    return "destructive" as const;
  }

  return status === "mismatch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveVerificationSignatureChainStatus }) {
  if (status === "valid") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "missing" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function ChainRow({ row }: { row: BoardReleaseArchiveVerificationSignatureChainRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Link2 className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="text-xs text-muted-foreground">{row.source}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.kind}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{row.expectedHash}</p>
        <p className="mt-1 truncate font-mono">{row.actualHash ?? "missing"}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.linkHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveVerificationSignatureChainValidatorPanel({
  report,
}: {
  report: BoardReleaseArchiveVerificationSignatureChainValidatorReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-4" />
              Archive verification signature chain
            </CardTitle>
            <CardDescription>Validator for attestation digest, certificate history, auditor packet, and revocation workflow hashes.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.chainScore < 80 ? "destructive" : "outline"}>
              {report.summary.chainScore}/100 chain
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
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <SummaryTile detail="chain links" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="verified links" label="Valid" value={`${report.summary.validCount}`} />
          <SummaryTile detail="hash drift" label="Mismatch" value={`${report.summary.mismatchCount}`} />
          <SummaryTile detail="missing evidence" label="Missing" value={`${report.summary.missingCount}`} />
          <SummaryTile detail="workspace" label="Validator" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Signature chain next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.chainHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chain link</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expected / actual</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <ChainRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
