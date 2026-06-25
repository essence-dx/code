import { CheckCircle2, Download, FileWarning, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardAuditEvidenceVerificationReport,
  BoardAuditEvidenceVerificationRow,
  BoardAuditEvidenceVerificationStatus,
} from "@/features/projects/board-audit-evidence-verification";

function statusVariant(status: BoardAuditEvidenceVerificationStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardAuditEvidenceVerificationStatus }) {
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

function VerificationRow({ row }: { row: BoardAuditEvidenceVerificationRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <FileWarning className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="font-mono text-xs text-muted-foreground">{row.taskId}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.score}/100</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{row.missingFileCount} missing</p>
        <p>{row.staleHashCount} stale</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{row.duplicateAttachmentCount} duplicate</p>
        <p>{row.unsignedExportCount} unsigned</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardAuditEvidenceVerificationPanel({ report }: { report: BoardAuditEvidenceVerificationReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="size-4" />
              Board audit evidence verification
            </CardTitle>
            <CardDescription>Missing files, stale hashes, duplicate attachments, and unsigned exports scored before reviewer acceptance.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.verificationScore < 70 ? "destructive" : "outline"}>
              {report.summary.verificationScore}/100 verification
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="audit rows" label="Tasks" value={`${report.summary.taskCount}`} />
          <SummaryTile detail="needs file" label="Missing" value={`${report.summary.missingFileCount}`} />
          <SummaryTile detail="refresh hash" label="Stale" value={`${report.summary.staleHashCount}`} />
          <SummaryTile detail="same hash" label="Duplicates" value={`${report.summary.duplicateAttachmentCount}`} />
          <SummaryTile detail="needs signature" label="Unsigned" value={`${report.summary.unsignedExportCount}`} />
          <SummaryTile detail="ready rows" label="Ready" value={`${report.summary.readyRowCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Verification next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Exports</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <VerificationRow key={row.taskId} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
