import { CheckCircle2, Download, FileJson2, KeyRound, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveVerificationDistributionProofBundleReport,
  BoardReleaseArchiveVerificationDistributionProofRow,
  BoardReleaseArchiveVerificationDistributionProofStatus,
} from "@/features/projects/board-release-archive-verification-distribution-proof-bundle";

function statusVariant(status: BoardReleaseArchiveVerificationDistributionProofStatus) {
  if (status === "expired") {
    return "destructive" as const;
  }

  return status === "pending" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveVerificationDistributionProofStatus }) {
  if (status === "acknowledged") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "expired" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function ProofRow({ row }: { row: BoardReleaseArchiveVerificationDistributionProofRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <KeyRound className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.recipient}</p>
            <p className="text-xs text-muted-foreground">{row.role}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.channel}</p>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{row.signedAccessHash}</p>
        <p className="mt-1 truncate font-mono">{row.acknowledgementHash ?? "pending acknowledgement"}</p>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p>{row.accessExpiresAt}</p>
        <p className="mt-1 truncate font-mono">{row.expiredLinkEvidenceHash ?? "active access"}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.proofHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveVerificationDistributionProofBundlePanel({
  report,
}: {
  report: BoardReleaseArchiveVerificationDistributionProofBundleReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              Archive verification distribution proof bundle
            </CardTitle>
            <CardDescription>Signed recipient access, acknowledgement trail, and expired-link evidence for archive verification distribution.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={report.summary.status === "blocked" ? "destructive" : report.summary.status === "watch" ? "secondary" : "outline"}>
              {report.summary.status === "ready" ? <CheckCircle2 className="size-3.5" /> : report.summary.status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.proofScore < 80 ? "destructive" : "outline"}>
              {report.summary.proofScore}/100 proof
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
          <SummaryTile detail="proof rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="accepted access" label="Acknowledged" value={`${report.summary.acknowledgedCount}`} />
          <SummaryTile detail="awaiting proof" label="Pending" value={`${report.summary.pendingCount}`} />
          <SummaryTile detail="expired access" label="Expired" value={`${report.summary.expiredCount}`} />
          <SummaryTile detail="workspace" label="Bundle" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Distribution next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.bundleHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Signed access / acknowledgement</TableHead>
              <TableHead>Expiry evidence</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <ProofRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
