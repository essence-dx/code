import { Activity, CheckCircle2, Download, FileJson2, ShieldAlert, TrendingUp, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardAuditEvidenceReadinessDigest,
  BoardAuditEvidenceReadinessRisk,
  BoardAuditEvidenceReadinessStatus,
} from "@/features/projects/board-audit-evidence-readiness-digest";

function statusVariant(status: BoardAuditEvidenceReadinessStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardAuditEvidenceReadinessStatus }) {
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

function RiskRow({ risk }: { risk: BoardAuditEvidenceReadinessRisk }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Activity className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{risk.title}</p>
            <p className="font-mono text-xs text-muted-foreground">{risk.taskId}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(risk.status)}>
          <StatusIcon status={risk.status} />
          {risk.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{risk.readinessScore}/100</p>
      </TableCell>
      <TableCell className="max-w-[180px] whitespace-normal text-sm">
        <p className="font-medium">{risk.ownerName}</p>
        <p className="text-xs text-muted-foreground">{risk.riskLevel} risk</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{risk.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardAuditEvidenceReadinessDigestPanel({ digest }: { digest: BoardAuditEvidenceReadinessDigest }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4" />
              Board audit evidence readiness
            </CardTitle>
            <CardDescription>Packet score trend, unresolved attachment risk, and carry-forward recommendations for closeout.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(digest.summary.status)}>
              <StatusIcon status={digest.summary.status} />
              {digest.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={digest.summary.readinessScore < 70 ? "destructive" : "outline"}>
              {digest.summary.readinessScore}/100 readiness
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={digest.csvFileName} href={digest.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={digest.jsonFileName} href={digest.jsonDataUri}>
              <FileJson2 className="size-4" />
              JSON
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="evidence tasks" label="Tasks" value={`${digest.summary.taskCount}`} />
          <SummaryTile detail="current score" label="Readiness" value={`${digest.summary.readinessScore}`} />
          <SummaryTile detail="vs previous" label="Delta" value={`${digest.summary.scoreDelta > 0 ? "+" : ""}${digest.summary.scoreDelta}`} />
          <SummaryTile detail="blocked rows" label="Attachment risk" value={`${digest.summary.unresolvedAttachmentRiskCount}`} />
          <SummaryTile detail="next cycle" label="Carry-forward" value={`${digest.summary.carryForwardCount}`} />
          <SummaryTile detail="trend points" label="Trend" value={`${digest.summary.trendPointCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Readiness next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{digest.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Carry-forward recommendation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {digest.risks.length > 0 ? (
              digest.risks.map((risk) => <RiskRow key={risk.taskId} risk={risk} />)
            ) : (
              <TableRow>
                <TableCell className="text-sm text-muted-foreground" colSpan={4}>
                  No unresolved evidence readiness risks.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
