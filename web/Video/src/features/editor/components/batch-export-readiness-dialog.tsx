"use client";

import { AlertTriangle, CheckCircle2, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BatchExportReadinessItem, BatchExportReadinessReport } from "@/lib/editor/batch-export-readiness";

export function BatchExportReadinessDialog({ report }: { report: BatchExportReadinessReport }) {
  const label =
    report.selectedCount === 0
      ? "Batch QA"
      : report.status === "ready"
        ? `${report.selectedCount} ready`
        : `${report.blockedCount} blocked / ${report.reviewCount} review`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant={buttonVariant(report.status)} className="h-8 shrink-0" aria-label="Open batch export readiness comparison">
          {report.status === "ready" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Batch Export Readiness</DialogTitle>
          <DialogDescription>Compare selected social deliveries before starting the batch render.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={badgeVariant(report.status)}>{report.status === "blocked" ? "Blocked" : report.status === "review" ? "Review needed" : "Ready"}</Badge>
          <span>{report.readyCount} ready</span>
          <span>{report.reviewCount} review</span>
          <span>{report.blockedCount} blocked</span>
        </div>
        <ScrollArea className="max-h-[420px] pr-3">
          <div className="space-y-2">
            {report.items.length === 0 ? (
              <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">Select at least one social delivery to compare batch readiness.</div>
            ) : (
              report.items.map((item) => <BatchExportReadinessRow key={item.delivery.id} item={item} />)
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function BatchExportReadinessRow({ item }: { item: BatchExportReadinessItem }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-medium">{item.delivery.label}</div>
            <Badge variant={badgeVariant(item.status)}>{item.status === "blocked" ? "Blocked" : item.status === "review" ? "Review" : "Ready"}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{item.delivery.description}</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>{item.outputLabel}</div>
          <div>{item.routeLabel}</div>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div>
          <div className="text-xs font-medium">{item.summary}</div>
          <div className="mt-1 space-y-1 text-xs text-muted-foreground">
            {item.details.slice(0, 3).map((detail) => (
              <div key={detail}>{detail}</div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ListChecks className="size-3.5" />
          <span>
            {item.readyCount} / {item.reviewCount} / {item.blockedCount}
          </span>
        </div>
      </div>
    </div>
  );
}

function buttonVariant(status: BatchExportReadinessReport["status"]) {
  if (status === "blocked") return "destructive";
  if (status === "review") return "secondary";
  return "outline";
}

function badgeVariant(status: BatchExportReadinessReport["status"]) {
  if (status === "blocked") return "destructive";
  if (status === "review") return "secondary";
  return "outline";
}
