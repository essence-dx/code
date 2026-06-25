import { CheckCircle2, Download, FileJson2, ShieldAlert, TriangleAlert, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveCertificationRevocationRow,
  BoardReleaseArchiveCertificationRevocationStatus,
  BoardReleaseArchiveCertificationRevocationWorkflowReport,
} from "@/features/projects/board-release-archive-certification-revocation-workflow";

function statusVariant(status: BoardReleaseArchiveCertificationRevocationStatus) {
  if (status === "open") {
    return "destructive" as const;
  }

  return status === "queued" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveCertificationRevocationStatus }) {
  if (status === "resolved") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "open" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function RevocationRow({ row }: { row: BoardReleaseArchiveCertificationRevocationRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Undo2 className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">{row.kind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.sourceStatus}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{row.owner}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{row.certificateHash}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.revocationReason}</p>
        <p className="mt-1 truncate font-mono">{row.revocationHash}</p>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveCertificationRevocationWorkflowPanel({
  report,
}: {
  report: BoardReleaseArchiveCertificationRevocationWorkflowReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Undo2 className="size-4" />
              Archive certification revocation workflow
            </CardTitle>
            <CardDescription>Revocation workflow for stale certificates, failed replay checks, blocked auditor packets, and superseded evidence bundles.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.revocationScore < 80 ? "destructive" : "outline"}>
              {report.summary.revocationScore}/100 revocation
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
          <SummaryTile detail="workflow rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="needs review" label="Open" value={`${report.summary.openCount}`} />
          <SummaryTile detail="notice queued" label="Queued" value={`${report.summary.queuedCount}`} />
          <SummaryTile detail="cleared rows" label="Resolved" value={`${report.summary.resolvedCount}`} />
          <SummaryTile detail="workspace" label="Workflow" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Revocation next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.revocationHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Revocation item</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <RevocationRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
