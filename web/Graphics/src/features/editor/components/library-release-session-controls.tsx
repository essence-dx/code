"use client";

import { ArchiveX, RefreshCcw, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function LibraryReleaseSessionControls({
  archiveStateCount,
  approvalStateCount,
  searchActive,
  onClearSearch,
  onResetApprovalSession,
  onResetArchiveReview,
}: {
  archiveStateCount: number;
  approvalStateCount: number;
  searchActive: boolean;
  onClearSearch: () => void;
  onResetApprovalSession: () => void;
  onResetArchiveReview: () => void;
}) {
  return (
    <div className="space-y-2 rounded-sm border border-border/70 bg-muted/20 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">Review controls</span>
        <div className="flex shrink-0 gap-1">
          <Badge variant={approvalStateCount > 0 ? "outline" : "secondary"}>
            {approvalStateCount} approval
          </Badge>
          <Badge variant={archiveStateCount > 0 ? "outline" : "secondary"}>
            {archiveStateCount} archive
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-[11px]"
          disabled={approvalStateCount === 0}
          onClick={onResetApprovalSession}
        >
          <RefreshCcw className="size-3" />
          Approval
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-[11px]"
          disabled={archiveStateCount === 0}
          onClick={onResetArchiveReview}
        >
          <ArchiveX className="size-3" />
          Archive
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-[11px]"
          disabled={!searchActive}
          onClick={onClearSearch}
        >
          <SearchX className="size-3" />
          Search
        </Button>
      </div>
    </div>
  );
}
