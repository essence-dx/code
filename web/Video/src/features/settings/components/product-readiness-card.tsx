import { ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { productCapabilities } from "@/lib/product/capability-registry";
import { capabilityStatusLabels, type CapabilityStatus } from "@/lib/product/capability-types";
import { createProductReadinessReport } from "@/lib/product/capability-summary";

export function ProductReadinessCard() {
  const report = createProductReadinessReport(productCapabilities);

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-lg">
          <span className="flex min-w-0 items-center gap-2">
            <ClipboardCheck className="size-4 shrink-0" />
            Product readiness
          </span>
          <Badge variant={report.score >= 80 ? "default" : "secondary"}>{report.score}/100</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <ReadinessMetric label="Ready" value={report.ready} />
          <ReadinessMetric label="Needs verification" value={report.needsVerification} />
          <ReadinessMetric label="Partial" value={report.partial} />
          <ReadinessMetric label="Missing" value={report.missing} />
        </div>
        <div className="space-y-2">
          {report.areas.map((area) => (
            <div key={area.area} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{area.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {area.ready}/{area.total} ready
                    {area.priorityOpen ? `, ${area.priorityOpen} priority gap${area.priorityOpen === 1 ? "" : "s"}` : ""}
                  </div>
                </div>
                <Badge variant={area.score >= 80 ? "default" : area.missing ? "destructive" : "secondary"}>{area.score}/100</Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Next highest-value gaps</div>
          {report.nextCapabilities.map((capability) => (
            <div key={capability.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 truncate text-sm font-medium">{capability.label}</div>
                <StatusBadge status={capability.status} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{capability.nextStep}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReadinessMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: CapabilityStatus }) {
  const variant = status === "ready" ? "default" : status === "missing" ? "destructive" : "secondary";

  return <Badge variant={variant}>{capabilityStatusLabels[status]}</Badge>;
}
