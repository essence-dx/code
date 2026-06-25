import { Activity, CircleAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicAiGenerationRecord } from "@/lib/ai/generation-records";
import type { ProductionTelemetryUsage } from "@/lib/operations/production-telemetry";
import {
  createProductionTelemetryReport,
  type ProductionTelemetryStatus,
} from "@/lib/operations/production-telemetry";

interface ProductionTelemetryCardProps {
  isSignedIn: boolean;
  aiConfigured: boolean;
  usage: ProductionTelemetryUsage | null;
  generations: PublicAiGenerationRecord[];
}

export function ProductionTelemetryCard({
  isSignedIn,
  aiConfigured,
  usage,
  generations,
}: ProductionTelemetryCardProps) {
  const report = createProductionTelemetryReport({ isSignedIn, aiConfigured, usage, generations });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-lg">
          <span className="flex min-w-0 items-center gap-2">
            <Activity className="size-4 shrink-0" />
            Production telemetry
          </span>
          <Badge variant={telemetryBadgeVariant(report.status)}>{report.score}/100</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {report.status === "ready"
            ? "Recent activity, retry state, usage limits, safety review, and generated output metadata are ready for handoff."
            : "Review production activity before claiming this workspace is ready for serious customer work."}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {report.signals.map((signal) => {
            const Icon = signal.status === "ready" ? ShieldCheck : CircleAlert;
            return (
              <div key={signal.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className={`size-4 shrink-0 ${signal.status === "blocked" ? "text-destructive" : signal.status === "attention" ? "text-amber-300" : "text-primary"}`} />
                    <div className="truncate text-sm font-medium">{signal.label}</div>
                  </div>
                  <Badge variant={telemetryBadgeVariant(signal.status)}>{signal.count ?? telemetryLabel(signal.status)}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{signal.detail}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function telemetryLabel(status: ProductionTelemetryStatus) {
  if (status === "blocked") return "Blocked";
  if (status === "attention") return "Attention";
  return "Ready";
}

function telemetryBadgeVariant(status: ProductionTelemetryStatus) {
  if (status === "blocked") return "destructive";
  if (status === "attention") return "secondary";
  return "default";
}
