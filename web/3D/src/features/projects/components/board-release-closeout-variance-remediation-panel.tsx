import { CheckCircle2, Download, FileJson2, ShieldAlert, TriangleAlert, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseCloseoutVarianceRemediationPlan,
  BoardReleaseCloseoutVarianceRemediationReport,
  BoardReleaseCloseoutVarianceRemediationStatus,
} from "@/features/projects/board-release-closeout-variance-remediation";

function statusVariant(status: BoardReleaseCloseoutVarianceRemediationStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "open" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseCloseoutVarianceRemediationStatus }) {
  if (status === "completed") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(date);
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

function PlanRow({ plan }: { plan: BoardReleaseCloseoutVarianceRemediationPlan }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Wrench className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{plan.sourceKind}</p>
            <p className="truncate text-xs text-muted-foreground">{plan.sourceType}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(plan.status)}>
          <StatusIcon status={plan.status} />
          {plan.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{plan.severity}</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-sm">
        <p className="font-medium">{plan.ownerName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {plan.ownerRole} · {plan.ownerEmail ?? "No owner email"}
        </p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-sm">
        <p>{formatDate(plan.dueAt)}</p>
        <p className="truncate text-xs text-muted-foreground">{plan.sourceStatus}</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{plan.nextAction}</p>
        <p className="mt-1 truncate font-mono">{plan.completionEvidenceHash ?? plan.planHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseCloseoutVarianceRemediationPanel({ report }: { report: BoardReleaseCloseoutVarianceRemediationReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-4" />
              Board release closeout variance remediation
            </CardTitle>
            <CardDescription>Owner-assigned remediation plans with severity, due windows, source hashes, and completion evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={report.summary.status === "blocked" ? "destructive" : "outline"}>
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.criticalCount > 0 ? "destructive" : "outline"}>
              {report.summary.criticalCount} critical
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
          <SummaryTile detail="tracked plans" label="Plans" value={`${report.summary.planCount}`} />
          <SummaryTile detail="needs action" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="active plans" label="Open" value={`${report.summary.openCount}`} />
          <SummaryTile detail="evidence attached" label="Completed" value={`${report.summary.completedCount}`} />
          <SummaryTile detail="checksum" label="Hash" value={report.summary.remediationHash.slice(7, 15)} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Remediation next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.remediationHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.plans.map((plan) => (
              <PlanRow key={plan.planId} plan={plan} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
