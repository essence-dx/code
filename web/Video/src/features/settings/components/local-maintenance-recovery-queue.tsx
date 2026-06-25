"use client";

import Link from "next/link";
import { CircleAlert, RefreshCw, RotateCcw, ShieldCheck, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createLocalMaintenanceRecoveryCompletionReport,
  localMaintenanceRecoveryCompletionLabel,
  type LocalMaintenanceRecoveryCompletionStatus,
} from "@/lib/operations/local-maintenance-recovery-completion";
import type { LocalMaintenanceRecoveryItem } from "@/lib/operations/local-maintenance-recovery-queue";

interface LocalMaintenanceRecoveryQueueProps {
  items: LocalMaintenanceRecoveryItem[];
  onClearCloudConflicts: () => void;
  onRefreshProof: () => void;
  onRetryFailedExports: () => void;
}

export function LocalMaintenanceRecoveryQueue({
  items,
  onClearCloudConflicts,
  onRefreshProof,
  onRetryFailedExports,
}: LocalMaintenanceRecoveryQueueProps) {
  const completion = createLocalMaintenanceRecoveryCompletionReport(items);

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Recovery queue</div>
          <div className="text-xs text-muted-foreground">
            {items.length > 0 ? `${items.length} guided ${items.length === 1 ? "recovery" : "recoveries"} ready` : "No local recovery actions are pending"}
          </div>
        </div>
        <Badge variant={items.length > 0 ? "secondary" : "default"}>{items.length}</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {items.length > 0 ? (
          items.map((item) => {
            const Icon = item.status === "blocked" ? CircleAlert : Wrench;
            return (
              <div key={item.id} className="rounded-md bg-muted/40 p-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon className={item.status === "blocked" ? "size-3.5 text-destructive" : "size-3.5 text-amber-300"} />
                      <span className="text-xs font-medium">{item.label}</span>
                      <Badge variant={item.status === "blocked" ? "destructive" : "secondary"}>{item.count}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{item.targets.join(" / ")}</p>
                  </div>
                  {recoveryAction(item, { onClearCloudConflicts, onRefreshProof, onRetryFailedExports })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            Local proof, media, export queue, and sync handoff do not need recovery.
          </div>
        )}
      </div>
      <div className="mt-3 rounded-md bg-background/60 p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-medium">Completion checks</div>
          <Badge variant={completion.status === "resolved" ? "default" : "secondary"}>
            {completion.resolvedCount} resolved / {completion.pendingCount} pending
          </Badge>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {completion.items.map((item) => (
            <div key={item.id} className="rounded-md border border-border p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium">{item.label}</span>
                <Badge variant={completionBadgeVariant(item.status)}>{localMaintenanceRecoveryCompletionLabel(item.status)}</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function completionBadgeVariant(status: LocalMaintenanceRecoveryCompletionStatus) {
  return status === "pending" ? "secondary" : "outline";
}

function recoveryAction(
  item: LocalMaintenanceRecoveryItem,
  actions: {
    onClearCloudConflicts: () => void;
    onRefreshProof: () => void;
    onRetryFailedExports: () => void;
  },
) {
  if (item.id === "relink-media") {
    return (
      <Button asChild size="sm" variant="outline">
        <Link href="/editor?recovery=missing-media">{item.actionLabel}</Link>
      </Button>
    );
  }

  if (item.id === "retry-exports") {
    return (
      <Button type="button" size="sm" variant="outline" onClick={actions.onRetryFailedExports}>
        <RotateCcw className="size-3.5" />
        {item.actionLabel}
      </Button>
    );
  }

  if (item.id === "review-cloud-conflicts") {
    return (
      <Button type="button" size="sm" variant="outline" onClick={actions.onClearCloudConflicts}>
        {item.actionLabel}
      </Button>
    );
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={actions.onRefreshProof}>
      <RefreshCw className="size-3.5" />
      {item.actionLabel}
    </Button>
  );
}
