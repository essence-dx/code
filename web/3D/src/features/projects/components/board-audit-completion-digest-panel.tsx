import { CheckCircle2, Download, LineChart, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardAuditCarryForwardRisk,
  BoardAuditCompletionDigest,
  BoardAuditCompletionDigestStatus,
  BoardAuditCompletionTrendRow,
} from "@/features/projects/board-audit-completion-digest";

function statusVariant(status: BoardAuditCompletionDigestStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardAuditCompletionDigestStatus }) {
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

function TrendRow({ row }: { row: BoardAuditCompletionTrendRow }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{row.metric}</TableCell>
      <TableCell>{row.current}</TableCell>
      <TableCell>{row.previous}</TableCell>
      <TableCell className={row.delta < 0 ? "text-destructive" : row.delta > 0 ? "text-emerald-600" : ""}>{row.delta}</TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={row.direction === "declining" ? "destructive" : row.direction === "improving" ? "outline" : "secondary"}>
          {row.direction}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

function CarryForwardRow({ risk }: { risk: BoardAuditCarryForwardRisk }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <p className="font-medium">{risk.title}</p>
        <p className="font-mono text-xs text-muted-foreground">{risk.taskId}</p>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={risk.severity === "critical" ? "destructive" : risk.severity === "high" ? "secondary" : "outline"}>
          {risk.severity}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">{risk.ownerName}</TableCell>
      <TableCell className="text-sm">{risk.dueAt.slice(0, 10)}</TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{risk.reason}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardAuditCompletionDigestPanel({ digest }: { digest: BoardAuditCompletionDigest }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="size-4" />
              Board audit completion digest
            </CardTitle>
            <CardDescription>Closeout trend, closure score movement, and unresolved risk carry-forward for board audit tasks.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(digest.summary.status)}>
              <StatusIcon status={digest.summary.status} />
              {digest.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={digest.summary.completionScore < 70 ? "destructive" : "outline"}>
              {digest.summary.completionScore}/100 completion
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={digest.csvFileName} href={digest.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="closeout health" label="Closure" value={`${digest.summary.closureScore}/100`} />
          <SummaryTile detail="vs previous save" label="Delta" value={`${digest.summary.closureScoreDelta}`} />
          <SummaryTile detail="completed work" label="Closed" value={`${digest.summary.closedCount}`} />
          <SummaryTile detail="open risk" label="Unresolved" value={`${digest.summary.unresolvedRiskCount}`} />
          <SummaryTile detail="next cycle" label="Carry forward" value={`${digest.summary.carryForwardCount}`} />
          <SummaryTile detail="eligible reminders" label="Reminder routes" value={`${digest.summary.reminderRouteCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Completion next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{digest.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>Current</TableHead>
              <TableHead>Previous</TableHead>
              <TableHead>Delta</TableHead>
              <TableHead>Direction</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{digest.trends.map((row) => <TrendRow key={row.metric} row={row} />)}</TableBody>
        </Table>

        {digest.carryForward.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Risk</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{digest.carryForward.map((risk) => <CarryForwardRow key={risk.taskId} risk={risk} />)}</TableBody>
          </Table>
        ) : (
          <div className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4" />
            No unresolved board audit risk needs carry-forward.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
