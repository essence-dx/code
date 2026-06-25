import { CheckCircle2, Download, FileJson2, GitCompareArrows, RotateCcw, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveReplaySimulatorReport,
  BoardReleaseArchiveReplayScenario,
} from "@/features/projects/board-release-archive-replay-simulator";
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

function outcomeVariant(outcome: BoardReleaseArchiveReplayScenario["outcome"]) {
  return outcome === "changed" ? "destructive" : "outline";
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

function ReplayScenarioRow({ scenario }: { scenario: BoardReleaseArchiveReplayScenario }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <RotateCcw className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{scenario.title}</p>
            <p className="truncate text-xs text-muted-foreground">{scenario.scenarioKind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(scenario.status)}>
          <StatusIcon status={scenario.status} />
          {scenario.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{scenario.simulatedScore}/100</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-sm">
        <p className="font-medium">
          {scenario.originalDecision} to {scenario.replayDecision}
        </p>
        <Badge className="mt-1 rounded-md" variant={outcomeVariant(scenario.outcome)}>
          {scenario.outcome}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">
        <p className={scenario.scoreDelta < 0 ? "font-medium text-destructive" : "font-medium"}>
          {scenario.scoreDelta > 0 ? "+" : ""}
          {scenario.scoreDelta}
        </p>
        <p className="text-xs text-muted-foreground">score delta</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{scenario.nextAction}</p>
        <p className="mt-1 truncate font-mono">{scenario.scenarioHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveReplaySimulatorPanel({ report }: { report: BoardReleaseArchiveReplaySimulatorReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitCompareArrows className="size-4" />
              Board release archive replay simulator
            </CardTitle>
            <CardDescription>Decision-change simulation that checks whether later archive evidence would alter prior board outcomes.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.changedCount > 0 ? "destructive" : "outline"}>
              {report.summary.changedCount} changed
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
          <SummaryTile detail="replay scenarios" label="Scenarios" value={`${report.summary.scenarioCount}`} />
          <SummaryTile detail="decision changes" label="Changed" value={`${report.summary.changedCount}`} />
          <SummaryTile detail="decision holds" label="Hold" value={`${report.summary.holdCount}`} />
          <SummaryTile detail="approval simulations" label="Approve" value={`${report.summary.approveCount}`} />
          <SummaryTile detail="checksum" label="Hash" value={report.summary.replayHash.slice(7, 15)} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Replay simulator next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.replayHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scenario</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead>Delta</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.scenarios.map((scenario) => (
              <ReplayScenarioRow key={scenario.scenarioId} scenario={scenario} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
