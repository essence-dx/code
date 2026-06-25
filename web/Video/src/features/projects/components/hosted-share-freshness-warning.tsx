import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  hostedShareFreshnessStatusLabel,
  type HostedShareFreshnessItemStatus,
  type HostedShareFreshnessReport,
  type HostedShareFreshnessStatus,
} from "@/lib/projects/hosted-share-freshness";
import { cn } from "@/lib/utils";

export function HostedShareFreshnessWarning({ report }: { report: HostedShareFreshnessReport }) {
  if (report.status === "ready") return null;

  const issueItems = report.items.filter((item) => item.status !== "current");

  return (
    <div
      className={cn(
        "rounded-md border p-3 text-xs",
        report.status === "stale" ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="size-4 text-muted-foreground" />
          Hosted share proof
        </div>
        <Badge variant={freshnessBadgeVariant(report.status)}>
          {report.currentCount} current / {report.reviewCount} review / {report.staleCount} stale
        </Badge>
      </div>
      <p className="mt-2 text-muted-foreground">
        {report.status === "stale"
          ? "Some proof changed after this link was issued."
          : "Some proof timestamps are missing for this hosted link."}
      </p>
      <div className="mt-2 grid gap-2 md:grid-cols-3">
        {issueItems.map((item) => (
          <div key={item.id} className="rounded-md border border-border bg-background/70 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{item.label}</span>
              <Badge variant={freshnessBadgeVariant(item.status)}>{hostedShareFreshnessStatusLabel(item.status)}</Badge>
            </div>
            <p className="mt-1 text-muted-foreground">{item.detail}</p>
            {item.evidenceAt ? <div className="mt-1 text-muted-foreground">Evidence: {formatFreshnessTime(item.evidenceAt)}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function freshnessBadgeVariant(status: HostedShareFreshnessStatus | HostedShareFreshnessItemStatus) {
  if (status === "stale") return "destructive";
  if (status === "review") return "secondary";
  return "outline";
}

function formatFreshnessTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}
