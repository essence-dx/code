import { CheckCircle2, Download, FileJson2, ShieldAlert, TriangleAlert, UserCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardAuditEvidenceAcceptanceRow,
  BoardAuditEvidenceAcceptanceStatus,
  BoardAuditEvidenceAcceptanceWorkflow,
} from "@/features/projects/board-audit-evidence-acceptance";

function statusVariant(status: BoardAuditEvidenceAcceptanceStatus | BoardAuditEvidenceAcceptanceWorkflow["summary"]["status"]) {
  if (status === "blocked" || status === "rejected") {
    return "destructive" as const;
  }

  return status === "pending" || status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardAuditEvidenceAcceptanceStatus | BoardAuditEvidenceAcceptanceWorkflow["summary"]["status"] }) {
  if (status === "accepted" || status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" || status === "rejected" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function AcceptanceRow({ row }: { row: BoardAuditEvidenceAcceptanceRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <UserCheck2 className="size-3.5" />
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
        <p className="mt-1 text-xs text-muted-foreground">{row.verificationStatus}</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-sm">
        <p className="font-medium">{row.ownerName}</p>
        <p className="truncate text-xs text-muted-foreground">{row.ownerEmail ?? "No email"}</p>
      </TableCell>
      <TableCell className="max-w-[280px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.rejectionReason ?? row.note ?? "No reviewer note yet."}</p>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardAuditEvidenceAcceptancePanel({ workflow }: { workflow: BoardAuditEvidenceAcceptanceWorkflow }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck2 className="size-4" />
              Board audit evidence acceptance
            </CardTitle>
            <CardDescription>Per-owner acknowledgement, rejection reasons, and acceptance audit trail for evidence closeout.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(workflow.summary.status)}>
              <StatusIcon status={workflow.summary.status} />
              {workflow.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={workflow.summary.acceptanceScore < 70 ? "destructive" : "outline"}>
              {workflow.summary.acceptanceScore}/100 acceptance
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={workflow.csvFileName} href={workflow.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={workflow.jsonFileName} href={workflow.jsonDataUri}>
              <FileJson2 className="size-4" />
              JSON
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="evidence rows" label="Tasks" value={`${workflow.summary.taskCount}`} />
          <SummaryTile detail="accepted" label="Accepted" value={`${workflow.summary.acceptedCount}`} />
          <SummaryTile detail="rejected" label="Rejected" value={`${workflow.summary.rejectedCount}`} />
          <SummaryTile detail="awaiting owner" label="Pending" value={`${workflow.summary.pendingCount}`} />
          <SummaryTile detail="verification blocked" label="Blocked" value={`${workflow.summary.blockedCount}`} />
          <SummaryTile detail="audit entries" label="Audit trail" value={`${workflow.summary.auditTrailCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Acceptance next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{workflow.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Reviewer note</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{workflow.rows.map((row) => <AcceptanceRow key={row.taskId} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
