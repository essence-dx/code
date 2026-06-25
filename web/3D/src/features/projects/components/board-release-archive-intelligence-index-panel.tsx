import { BrainCircuit, CheckCircle2, Download, FileJson2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveIntelligenceIndexReport,
  BoardReleaseArchiveIntelligenceIndexRow,
} from "@/features/projects/board-release-archive-intelligence-index";
import type { BoardReleaseCloseoutReadinessGateStatus } from "@/features/projects/board-release-closeout-readiness-gates";

function statusVariant(status: BoardReleaseCloseoutReadinessGateStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseCloseoutReadinessGateStatus }) {
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

function IndexRow({ row }: { row: BoardReleaseArchiveIntelligenceIndexRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <BrainCircuit className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">{row.indexKind}</p>
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
      <TableCell className="max-w-[220px] whitespace-normal text-sm">
        <p className="font-medium">{row.finalDecisionOutcome}</p>
        <p className="truncate text-xs text-muted-foreground">{row.finalDecisionHash}</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{row.archiveBundleHash}</p>
        <p className="mt-1 truncate font-mono">{row.remediationHash}</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{row.correlationHash}</p>
        <p className="mt-1 line-clamp-2">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveIntelligenceIndexPanel({ report }: { report: BoardReleaseArchiveIntelligenceIndexReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="size-4" />
              Board release archive intelligence index
            </CardTitle>
            <CardDescription>Correlation index for executive packets, remediation hashes, archive bundles, and final decision outcomes.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.heldCount > 0 ? "destructive" : "outline"}>
              {report.summary.heldCount} held
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
          <SummaryTile detail="correlated rows" label="Index" value={`${report.summary.indexCount}`} />
          <SummaryTile detail="held outcomes" label="Held" value={`${report.summary.heldCount}`} />
          <SummaryTile detail="deferred outcomes" label="Deferred" value={`${report.summary.deferredCount}`} />
          <SummaryTile detail="approved outcomes" label="Approved" value={`${report.summary.approvedCount}`} />
          <SummaryTile detail="checksum" label="Hash" value={report.summary.intelligenceHash.slice(7, 15)} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Archive intelligence next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.intelligenceHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Index row</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead>Evidence chain</TableHead>
              <TableHead>Correlation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => (
              <IndexRow key={row.indexId} row={row} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
