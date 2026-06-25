import { CheckCircle2, Download, FileJson2, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  RollbackRehearsalEvidenceReport,
  RollbackRehearsalEvidenceRow,
  RollbackRehearsalEvidenceStatus,
} from "@/features/projects/rollback-rehearsal-evidence";

function statusVariant(status: RollbackRehearsalEvidenceStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: RollbackRehearsalEvidenceStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <TriangleAlert className="size-3.5" /> : <ShieldCheck className="size-3.5" />;
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

function EvidenceRow({ row }: { row: RollbackRehearsalEvidenceRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <RotateCcw className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="text-xs text-muted-foreground">{row.kind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">{row.evidence}</TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.evidenceHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function RollbackRehearsalEvidencePanel({ report }: { report: RollbackRehearsalEvidenceReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="size-4" />
              Rollback rehearsal evidence
            </CardTitle>
            <CardDescription>Proof that the production alias can move back to a known good deployment and stay linked to release approval records.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.rollbackScore < 80 ? "destructive" : "outline"}>
              {report.summary.rollbackScore}/100 rollback
            </Badge>
            <Button render={<a download={report.csvFileName} href={report.csvDataUri} />} className="h-8 gap-2" size="sm" variant="outline">
              <Download className="size-4" />
              CSV
            </Button>
            <Button render={<a download={report.jsonFileName} href={report.jsonDataUri} />} className="h-8 gap-2" size="sm" variant="outline">
              <FileJson2 className="size-4" />
              JSON
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail="rehearsal gates" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="rollback-ready evidence" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="needs review" label="Review" value={`${report.summary.reviewCount}`} />
          <SummaryTile detail="blocking evidence" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="workspace" label="Gate" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Rollback rehearsal action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.rehearsalHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evidence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <EvidenceRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
