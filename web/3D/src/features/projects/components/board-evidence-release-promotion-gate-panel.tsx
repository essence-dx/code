import { CheckCircle2, Download, FileJson2, Rocket, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardEvidenceReleasePromotionGate,
  BoardEvidenceReleasePromotionGateReport,
  BoardEvidenceReleasePromotionGateStatus,
} from "@/features/projects/board-evidence-release-promotion-gate";

function statusVariant(status: BoardEvidenceReleasePromotionGateStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardEvidenceReleasePromotionGateStatus }) {
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

function GateRow({ gate }: { gate: BoardEvidenceReleasePromotionGate }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Rocket className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{gate.title}</p>
            <p className="font-mono text-xs text-muted-foreground">{gate.id}</p>
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
      <TableCell>
        <Badge className="rounded-md" variant={gate.promotionBlocker ? "destructive" : "outline"}>
          {gate.promotionBlocker ? "blocks" : "clear"}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{gate.evidence}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{gate.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardEvidenceReleasePromotionGatePanel({ report }: { report: BoardEvidenceReleasePromotionGateReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="size-4" />
              Board evidence release promotion gate
            </CardTitle>
            <CardDescription>Promotion decision checks for closeout exports, packet locks, escalation routes, and signer handoff readiness.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.promotionAllowed ? "outline" : "destructive"}>
              {report.summary.promotionAllowed ? "promotion open" : "promotion blocked"}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.gateScore < 70 ? "destructive" : "outline"}>
              {report.summary.gateScore}/100 gate
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
          <SummaryTile detail="decision checks" label="Gates" value={`${report.summary.gateCount}`} />
          <SummaryTile detail="promotion blockers" label="Blocked" value={`${report.summary.blockerCount}`} />
          <SummaryTile detail="needs review" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="clear gates" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail={report.releasePromotionId ?? "no release id"} label="Promotion" value={report.summary.promotionAllowed ? "open" : "blocked"} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Promotion next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.gates.map((gate) => <GateRow gate={gate} key={gate.id} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
