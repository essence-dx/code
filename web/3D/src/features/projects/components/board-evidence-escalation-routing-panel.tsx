import { BellRing, CheckCircle2, Download, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardEvidenceEscalationRoute,
  BoardEvidenceEscalationRouteStatus,
  BoardEvidenceEscalationRoutingReport,
} from "@/features/projects/board-evidence-escalation-routing";

function statusVariant(status: BoardEvidenceEscalationRouteStatus | BoardEvidenceEscalationRoutingReport["summary"]["status"]) {
  if (status === "critical" || status === "suppressed-by-role") {
    return "destructive" as const;
  }

  return status === "warning" || status === "suppressed-by-preference" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardEvidenceEscalationRouteStatus | BoardEvidenceEscalationRoutingReport["summary"]["status"] }) {
  if (status === "eligible" || status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "critical" || status === "suppressed-by-role" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function RouteRow({ route }: { route: BoardEvidenceEscalationRoute }) {
  return (
    <TableRow>
      <TableCell className="max-w-[240px] whitespace-normal">
        <p className="font-medium">{route.recipientName}</p>
        <p className="truncate text-xs text-muted-foreground">{route.recipientEmail}</p>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(route.status)}>
          <StatusIcon status={route.status} />
          {route.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{route.recipientRole}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{route.channel}</p>
        <p>{route.topic}</p>
      </TableCell>
      <TableCell className="max-w-[380px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{route.reason}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardEvidenceEscalationRoutingPanel({ report }: { report: BoardEvidenceEscalationRoutingReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="size-4" />
              Board evidence escalation routing
            </CardTitle>
            <CardDescription>Blocked readiness risks routed through workspace preferences with role coverage evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.routingScore < 70 ? "destructive" : "outline"}>
              {report.summary.routingScore}/100 routing
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="risk rows" label="Escalations" value={`${report.summary.escalationCount}`} />
          <SummaryTile detail="critical" label="Critical" value={`${report.summary.criticalCount}`} />
          <SummaryTile detail="eligible" label="Routes" value={`${report.summary.eligibleRouteCount}`} />
          <SummaryTile detail="email" label="Email" value={`${report.summary.emailEligibleCount}`} />
          <SummaryTile detail="in app" label="In-app" value={`${report.summary.inAppEligibleCount}`} />
          <SummaryTile detail="suppressed" label="Blocked" value={`${report.summary.suppressedByRoleCount + report.summary.suppressedByPreferenceCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Escalation next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.routes.map((route) => <RouteRow key={route.dedupeKey} route={route} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
