import { CheckCircle2, Download, FileJson2, ListChecks, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardEvidenceCommandCenter,
  BoardEvidenceCommandStage,
  BoardEvidenceCommandStatus,
} from "@/features/projects/board-evidence-command-center";

function statusVariant(status: BoardEvidenceCommandStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardEvidenceCommandStatus }) {
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

function StageRow({ stage }: { stage: BoardEvidenceCommandStage }) {
  return (
    <TableRow>
      <TableCell className="max-w-[260px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <ListChecks className="size-3.5" />
          </span>
          <div>
            <p className="font-medium">{stage.label}</p>
            <p className="font-mono text-xs text-muted-foreground">{stage.id}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(stage.status)}>
          <StatusIcon status={stage.status} />
          {stage.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{stage.score}/100</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{stage.taskCount} tasks</p>
        <p>{stage.blockedCount} blockers</p>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{stage.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardEvidenceCommandCenterPanel({ commandCenter }: { commandCenter: BoardEvidenceCommandCenter }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="size-4" />
              Board evidence command center
            </CardTitle>
            <CardDescription>Single operator workflow for manifest, verification, acceptance, and readiness actions.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(commandCenter.summary.status)}>
              <StatusIcon status={commandCenter.summary.status} />
              {commandCenter.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={commandCenter.summary.commandScore < 70 ? "destructive" : "outline"}>
              {commandCenter.summary.commandScore}/100 command score
            </Badge>
            <a
              className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })}
              download={commandCenter.csvFileName}
              href={commandCenter.csvDataUri}
            >
              <Download className="size-4" />
              CSV
            </a>
            <a
              className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })}
              download={commandCenter.jsonFileName}
              href={commandCenter.jsonDataUri}
            >
              <FileJson2 className="size-4" />
              JSON
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="workflow sections" label="Stages" value={`${commandCenter.summary.stageCount}`} />
          <SummaryTile detail="critical sections" label="Blocked" value={`${commandCenter.summary.blockedStageCount}`} />
          <SummaryTile detail="watch sections" label="Watch" value={`${commandCenter.summary.watchStageCount}`} />
          <SummaryTile detail="ready sections" label="Ready" value={`${commandCenter.summary.readyStageCount}`} />
          <SummaryTile detail="operator queue" label="Actions" value={`${commandCenter.summary.actionCount}`} />
          <SummaryTile detail="average score" label="Score" value={`${commandCenter.summary.commandScore}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Command next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{commandCenter.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{commandCenter.stages.map((stage) => <StageRow key={stage.id} stage={stage} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
