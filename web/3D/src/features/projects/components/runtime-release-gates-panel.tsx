import { CheckCircle2, Download, FileJson2, Gauge, ShieldAlert, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RuntimeReleaseGatesReport } from "@/features/projects/runtime-release-gates";

function statusVariant(status: RuntimeReleaseGatesReport["summary"]["status"]) {
  return status === "blocked" ? "destructive" : "outline";
}

function StatusIcon({ status }: { status: RuntimeReleaseGatesReport["summary"]["status"] }) {
  return status === "ready" ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

export function RuntimeReleaseGatesPanel({ report }: { report: RuntimeReleaseGatesReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4" />
              Runtime release gates
            </CardTitle>
            <CardDescription>Release-blocking checks for performance budgets, replay determinism, material parity, and screenshot evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="gap-1 rounded-md" variant={report.summary.releaseGateScore < 100 ? "destructive" : "outline"}>
              <Gauge className="size-3.5" />
              {report.summary.releaseGateScore}/100 gates
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {report.gates.map((gate) => (
            <div key={gate.id} className="rounded-md border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{gate.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{gate.nextAction}</p>
                  <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{gate.evidenceHash}</p>
                </div>
                <Badge className="shrink-0 rounded-md" variant={statusVariant(gate.status)}>
                  {gate.blockerCount}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<a download={report.csvFileName} href={report.csvDataUri} />} className="gap-2" size="sm" variant="outline">
            <Table2 className="size-4" />
            CSV
          </Button>
          <Button render={<a download={report.jsonFileName} href={report.jsonDataUri} />} className="gap-2" size="sm" variant="outline">
            <FileJson2 className="size-4" />
            JSON
          </Button>
          <Badge className="gap-1 rounded-md" variant="outline">
            <Download className="size-3.5" />
            {report.summary.releaseGateHash}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
