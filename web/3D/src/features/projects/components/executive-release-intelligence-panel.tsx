import { Activity, AlertTriangle, Download, Gauge, Rocket, ShieldCheck, TriangleAlert, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  ExecutiveReleaseIntelligenceDomain,
  ExecutiveReleaseIntelligenceReport,
  ExecutiveReleaseIntelligenceSignal,
  ExecutiveReleaseIntelligenceStatus,
} from "@/features/projects/executive-release-intelligence";

const domainLabels: Record<ExecutiveReleaseIntelligenceDomain, string> = {
  automation: "Automation",
  cost: "Cost",
  evidence: "Evidence",
  governance: "Governance",
  incident: "Incident",
  launch: "Launch",
  risk: "Risk",
};

function statusVariant(status: ExecutiveReleaseIntelligenceStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: ExecutiveReleaseIntelligenceStatus }) {
  if (status === "ready") {
    return <ShieldCheck className="size-3.5" />;
  }

  return status === "watch" ? <Activity className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function SignalRow({ signal }: { signal: ExecutiveReleaseIntelligenceSignal }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Workflow className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{signal.label}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{signal.detail}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant="outline">
          {domainLabels[signal.domain]}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(signal.status)}>
          <StatusIcon status={signal.status} />
          {signal.status}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">{signal.score}/100</TableCell>
      <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{signal.evidence}</p>
      </TableCell>
      <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">{signal.nextAction}</TableCell>
    </TableRow>
  );
}

export function ExecutiveReleaseIntelligencePanel({ report }: { report: ExecutiveReleaseIntelligenceReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="size-4" />
              Executive release intelligence
            </CardTitle>
            <CardDescription>One release view across launch, governance, automation, cost, risk, incident, and evidence signals.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.executiveScore}/100
            </Badge>
            <Badge className="rounded-md" variant={report.summary.blockedCount > 0 ? "destructive" : "outline"}>
              {report.summary.blockedCount} blockers
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.jsonFileName} href={report.jsonDataUri}>
              <Download className="size-4" />
              JSON
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail={report.summary.status} label="Executive score" value={`${report.summary.executiveScore}/100`} />
          <SummaryTile detail="promotion readiness" label="Launch" value={`${report.summary.launchScore}/100`} />
          <SummaryTile detail="timeline and policies" label="Governance" value={`${report.summary.governanceScore}/100`} />
          <SummaryTile detail="risk digest" label="Risk" value={`${report.summary.riskScore}/100`} />
          <SummaryTile detail="packet coverage" label="Evidence" value={`${report.summary.evidenceScore}/100`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            {report.summary.status === "blocked" ? <AlertTriangle className="size-4 text-destructive" /> : <Rocket className="size-4" />}
            Executive memo
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{report.executiveMemo}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {report.summary.domainCoverage.map((domain) => (
            <Badge className="rounded-md" key={domain} variant="outline">
              {domainLabels[domain]}
            </Badge>
          ))}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Signal</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.signals.map((signal) => <SignalRow key={signal.id} signal={signal} />)}</TableBody>
        </Table>

        {report.criticalPath.length > 0 ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-destructive">
              <TriangleAlert className="size-4" />
              Critical path
            </p>
            <div className="mt-2 grid gap-2">
              {report.criticalPath.map((signal) => (
                <div className="grid gap-1 text-xs text-destructive/90 sm:grid-cols-[160px_1fr]" key={signal.id}>
                  <span className="font-medium">{domainLabels[signal.domain]}</span>
                  <span className="line-clamp-2">{signal.nextAction}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
