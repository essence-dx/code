import type { LucideIcon } from "lucide-react";
import { BarChart3, Eye, EyeOff, StickyNote, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { createWorkshopSessionSummary } from "@/features/editor/workshop-analytics";
import { workshopReactionOptions } from "@/features/editor/components/workshop-ui-options";

export function WorkshopAnalyticsPanel({
  summary,
}: {
  summary: ReturnType<typeof createWorkshopSessionSummary>;
}) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <BarChart3 className="h-3.5 w-3.5" />
          Session analytics
        </div>
        <Badge variant="outline">{summary.totalSignals} signals</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric
          Icon={Users}
          label="Participants"
          value={summary.session.participantCount}
        />
        <Metric
          Icon={BarChart3}
          label="Signals / person"
          value={summary.averageSignalsPerParticipant}
        />
        <Metric Icon={Eye} label="Targets" value={summary.targetCount} />
        <Metric Icon={EyeOff} label="Quiet" value={summary.quietTargetCount} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {workshopReactionOptions.map(({ kind, label, Icon }) => (
          <Metric
            key={kind}
            Icon={Icon}
            label={label}
            value={summary.reactionTotals[kind]}
          />
        ))}
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
          <StickyNote className="h-3.5 w-3.5" />
          Participant summary
        </div>
        {summary.topTargets.length ? (
          <div className="space-y-1">
            {summary.topTargets.map((target, index) => (
              <div
                key={target.elementId}
                className="flex items-center justify-between gap-2 rounded-md bg-background px-2 py-1.5 text-xs"
              >
                <span className="min-w-0 truncate">
                  {index + 1}. {target.label}
                </span>
                <span className="shrink-0 font-semibold">
                  {target.totalSignals}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md bg-background p-2 text-xs text-muted-foreground">
            No participant signals yet.
          </p>
        )}
      </div>
    </div>
  );
}

function Metric({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-center gap-1 text-sm font-semibold">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
