import { CheckCircle2, Download, FileJson2, Flag, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseCloseoutReadinessGate,
  BoardReleaseCloseoutReadinessGateReport,
  BoardReleaseCloseoutReadinessGateStatus,
} from "@/features/projects/board-release-closeout-readiness-gates";

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

function GateRow({ gate }: { gate: BoardReleaseCloseoutReadinessGate }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Flag className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{gate.title}</p>
            <p className="truncate text-xs text-muted-foreground">{gate.gateKind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(gate.status)}>
          <StatusIcon status={gate.status} />
          {gate.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{gate.score}/100</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-sm">
        <p className="font-medium">{gate.metric}</p>
        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{gate.evidenceHash ?? "No evidence hash"}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{gate.nextAction}</p>
        <p className="mt-1 truncate font-mono">{gate.gateHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseCloseoutReadinessGatesPanel({ report }: { report: BoardReleaseCloseoutReadinessGateReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flag className="size-4" />
              Board release closeout readiness gates
            </CardTitle>
            <CardDescription>Closeout gates across observability, distribution readiness, signed packets, and evidence archive state.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.readinessScore < 80 ? "destructive" : "outline"}>
              {report.summary.readinessScore}/100 readiness
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
          <SummaryTile detail="tracked gates" label="Gates" value={`${report.summary.gateCount}`} />
          <SummaryTile detail="needs repair" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="watch signals" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="ready gates" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="closeout score" label="Readiness" value={`${report.summary.readinessScore}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Closeout gate next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.gates.map((gate) => <GateRow key={gate.gateId} gate={gate} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
