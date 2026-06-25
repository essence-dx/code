import { Activity, CheckCircle2, Cpu, Gauge, MailCheck, Radio, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { WorkspaceSloDashboard, WorkspaceSloRow, WorkspaceSloService, WorkspaceSloStatus } from "@/features/projects/workspace-slo-dashboard";

const serviceIcons: Record<WorkspaceSloService, typeof Activity> = {
  "cad-workers": Cpu,
  "collaboration-runtime": Radio,
  "email-delivery": MailCheck,
  "public-surfaces": Activity,
};

function statusVariant(status: WorkspaceSloStatus) {
  if (status === "breach") {
    return "destructive" as const;
  }

  if (status === "watch" || status === "no-data") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function statusIcon(status: WorkspaceSloStatus) {
  if (status === "healthy") {
    return <CheckCircle2 className="size-3.5" />;
  }

  if (status === "breach") {
    return <TriangleAlert className="size-3.5" />;
  }

  return <ShieldAlert className="size-3.5" />;
}

function formatPercent(value: number | null) {
  return value === null ? "No data" : `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "No samples";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function SloRow({ row }: { row: WorkspaceSloRow }) {
  const Icon = serviceIcons[row.id];

  return (
    <TableRow>
      <TableCell className="max-w-[360px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.label}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{row.detail}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          {statusIcon(row.status)}
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {formatPercent(row.observedPct)} / {formatPercent(row.targetPct)}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{row.sampleCount} samples</p>
        <p>{row.failingCount} failing</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{row.pendingCount} pending</p>
        <p>{row.errorBudgetUsedPct === null ? "No budget sample" : `${row.errorBudgetUsedPct}% budget used`}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDateTime(row.lastObservedAt)}</TableCell>
      <TableCell className="max-w-[250px] whitespace-normal text-xs text-muted-foreground">{row.nextAction}</TableCell>
    </TableRow>
  );
}

export function WorkspaceSloDashboardPanel({ dashboard }: { dashboard: WorkspaceSloDashboard }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="size-4" />
              Workspace SLO dashboard
            </CardTitle>
            <CardDescription>Service-level targets for public surfaces, collaboration runtime, email delivery, and CAD workers.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(dashboard.summary.worstStatus)}>
              {statusIcon(dashboard.summary.worstStatus)}
              {dashboard.summary.worstStatus}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {dashboard.summary.overallScore}/100 observed
            </Badge>
            <Badge className="rounded-md" variant={dashboard.summary.breachCount > 0 ? "destructive" : "outline"}>
              {dashboard.summary.breachCount} breach
            </Badge>
            <Badge className="rounded-md" variant={dashboard.summary.watchCount + dashboard.summary.noDataCount > 0 ? "secondary" : "outline"}>
              {dashboard.summary.watchCount + dashboard.summary.noDataCount} watch
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Observed/Target</TableHead>
              <TableHead>Samples</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Latest</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{dashboard.rows.map((row) => <SloRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
