import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  ServerCog,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type {
  OperationalHealthGroup,
  OperationalHealthReport,
  OperationalHealthStatus,
} from "@/features/operations/operational-health";

type OperationalHealthPanelProps = {
  health: OperationalHealthReport;
};

const statusLabels: Record<OperationalHealthStatus, string> = {
  healthy: "Healthy",
  warning: "Needs attention",
  critical: "Critical",
};

const statusBadgeVariants: Record<
  OperationalHealthStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  healthy: "secondary",
  warning: "outline",
  critical: "destructive",
};

const statusIcons: Record<OperationalHealthStatus, typeof CheckCircle2> = {
  healthy: CheckCircle2,
  warning: AlertTriangle,
  critical: CircleAlert,
};

export function OperationalHealthPanel({ health }: OperationalHealthPanelProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-muted/20 p-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <ServerCog className="h-5 w-5" />
            Operational health
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Database, auth, email, storage, deployment, and desktop readiness.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusBadgeVariants[health.status]}>
            {statusLabels[health.status]}
          </Badge>
          <Badge variant="outline">
            Checked {new Date(health.checkedAt).toLocaleString()}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {health.groups.map((group) => (
          <HealthGroupCard key={group.id} group={group} />
        ))}
      </div>
    </section>
  );
}

function HealthGroupCard({ group }: { group: OperationalHealthGroup }) {
  const Icon = statusIcons[group.status];

  return (
    <article className="rounded-md border border-border">
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="h-4 w-4" />
            {group.title}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {group.description}
          </p>
        </div>
        <Badge variant={statusBadgeVariants[group.status]}>
          {statusLabels[group.status]}
        </Badge>
      </div>
      <Separator />
      <div className="divide-y divide-border">
        {group.checks.map((check) => {
          const CheckIcon = statusIcons[check.status];

          return (
            <div
              key={check.id}
              className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <CheckIcon className="h-4 w-4 shrink-0" />
                  {check.label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {check.detail}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                {check.metric ? (
                  <Badge variant="outline">{check.metric}</Badge>
                ) : null}
                <Badge variant={statusBadgeVariants[check.status]}>
                  {statusLabels[check.status]}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
