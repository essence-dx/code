import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReleasePacketImportConflictItem, ReleasePacketImportConflictPreview } from "@/lib/product/release-packet-import-conflicts";

interface ReleasePacketImportPreviewProps {
  preview: ReleasePacketImportConflictPreview;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ReleasePacketImportPreview({ preview, onCancel, onConfirm }: ReleasePacketImportPreviewProps) {
  const visibleItems = preview.items.filter((item) => item.status !== "same");

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">Import conflict preview</div>
            <div className="text-xs text-muted-foreground">
              {preview.conflictCount} conflicts / {preview.newCount} new / {preview.sameCount} unchanged
            </div>
          </div>
        </div>
        <Badge variant={preview.status === "conflict" ? "destructive" : "secondary"}>
          {preview.status === "conflict" ? "Needs confirmation" : "Clear"}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {visibleItems.map((item) => (
          <ImportConflictRow key={item.id} item={item} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X className="size-3.5" />
          Cancel
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onConfirm}>
          <CheckCircle2 className="size-3.5" />
          Import anyway
        </Button>
      </div>
    </div>
  );
}

function ImportConflictRow({ item }: { item: ReleasePacketImportConflictItem }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-medium">{item.label}</div>
        <Badge variant={item.status === "conflict" ? "destructive" : "outline"}>{item.status === "conflict" ? "Conflict" : "New"}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
      <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div className="min-w-0 rounded-sm bg-background/70 p-2">
          <div className="font-medium text-foreground">Current</div>
          <div className="mt-1 break-words">{item.currentSummary}</div>
        </div>
        <div className="min-w-0 rounded-sm bg-background/70 p-2">
          <div className="font-medium text-foreground">Incoming</div>
          <div className="mt-1 break-words">{item.incomingSummary}</div>
        </div>
      </div>
    </div>
  );
}
