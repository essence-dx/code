"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createExportPublishPrep,
  listExportPublishPreps,
  type ExportPublishPrep,
  type ExportReviewPackage,
} from "@/lib/projects/collaboration-store";
import { createPublishPrepPlan, publishPrepTargets, type PublishTargetId } from "@/lib/publishing/publish-prep";

export function PublishPrepPanel({ review }: { review: ExportReviewPackage }) {
  const [records, setRecords] = useState<ExportPublishPrep[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingTargetId, setPendingTargetId] = useState<PublishTargetId | null>(null);

  const refresh = useCallback(async () => {
    setRecords(await listExportPublishPreps(review.id));
  }, [review.id]);

  useEffect(() => {
    void refresh().catch(() => setMessage("Publish prep records could not be loaded."));
  }, [refresh]);

  async function prepareTarget(targetId: PublishTargetId) {
    setPendingTargetId(targetId);
    setMessage(null);

    try {
      const record = await createExportPublishPrep(review, targetId);
      setMessage(`${record.targetLabel} prep saved. ${publishPrepStatusMessage(record.status)}`);
      await refresh();
    } catch {
      setMessage("Publish prep could not be saved.");
    } finally {
      setPendingTargetId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publish Prep</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-5">
          {publishPrepTargets.map((target) => {
            const plan = createPublishPrepPlan(review, target.id);
            return (
              <button
                key={target.id}
                type="button"
                className="rounded-md border border-border p-2 text-left text-xs transition hover:border-primary/70"
                onClick={() => prepareTarget(target.id)}
                disabled={Boolean(pendingTargetId)}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">{target.label}</span>
                  <Badge variant={plan.status === "needs-changes" ? "destructive" : "outline"}>{plan.status}</Badge>
                </span>
                <span className="mt-1 block text-muted-foreground">{target.destination}</span>
              </button>
            );
          })}
        </div>
        {message ? <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">{message}</div> : null}
        <div className="space-y-2">
          {records.length ? (
            records.map((record) => (
              <div key={record.id} className="rounded-md border border-border p-3 text-sm">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{record.targetLabel}</div>
                    <div className="text-xs text-muted-foreground">{record.suggestedFilename}</div>
                  </div>
                  <Badge variant={record.status === "needs-changes" ? "destructive" : "outline"}>{publishPrepStatusMessage(record.status)}</Badge>
                </div>
                <div className="grid gap-1 md:grid-cols-2">
                  {record.checklist.map((item) => (
                    <div key={item.id} className="flex items-start gap-2 rounded-sm bg-muted/40 p-2 text-xs">
                      {item.complete ? <CheckCircle2 className="mt-0.5 size-3.5 text-primary" /> : <CircleAlert className="mt-0.5 size-3.5 text-amber-300" />}
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-muted-foreground">{item.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Choose a destination to save a local publish-prep record.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function publishPrepStatusMessage(status: ExportPublishPrep["status"]) {
  if (status === "ready") return "Ready";
  if (status === "needs-credentials") return "Needs credentials";
  return "Needs changes";
}
