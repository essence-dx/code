"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, GitMerge, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { DesignFileVersionSummary } from "@/features/files/actions";
import type { DesignDocument } from "@/features/editor/types";
import {
  getVersionMergeReview,
  mergeDesignDocumentsWithReview,
  type VersionMergeSectionChoice,
  type VersionMergeSectionId,
} from "@/features/editor/version-merge";
import { cn } from "@/lib/utils";

type VersionMergeDialogProps = {
  currentDocument: DesignDocument;
  currentUser: {
    name: string;
    email: string;
  };
  version: DesignFileVersionSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMerge: (document: DesignDocument) => void;
};

export function VersionMergeDialog({
  currentDocument,
  currentUser,
  version,
  open,
  onOpenChange,
  onMerge,
}: VersionMergeDialogProps) {
  const review = useMemo(
    () =>
      version
        ? getVersionMergeReview(currentDocument, version.document)
        : null,
    [currentDocument, version],
  );
  const [selectedSections, setSelectedSections] = useState<
    Partial<Record<VersionMergeSectionId, VersionMergeSectionChoice>>
  >({});
  const [mergeNotes, setMergeNotes] = useState("");
  const incomingSectionIds = useMemo(
    () =>
      review
        ? review.sections
            .filter((section) => selectedSections[section.id] === "incoming")
            .map((section) => section.id)
        : [],
    [review, selectedSections],
  );

  useEffect(() => {
    if (!open || !review) {
      setSelectedSections({});
      setMergeNotes("");
      return;
    }

    setSelectedSections(
      Object.fromEntries(
        review.sections.map((section) => [
          section.id,
          section.changed ? "incoming" : "current",
        ]),
      ) as Record<VersionMergeSectionId, VersionMergeSectionChoice>,
    );
  }, [open, review]);

  function chooseSection(
    sectionId: VersionMergeSectionId,
    choice: VersionMergeSectionChoice,
  ) {
    setSelectedSections((current) => ({
      ...current,
      [sectionId]: choice,
    }));
  }

  function mergeVersion() {
    if (!version || incomingSectionIds.length === 0) {
      return;
    }

    onMerge(
      mergeDesignDocumentsWithReview(currentDocument, version.document, selectedSections, {
        sourceVersionId: version.id,
        sourceVersionName: version.name,
        reviewerName: currentUser.name,
        reviewerEmail: currentUser.email,
        notes: mergeNotes,
      }),
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="size-4" />
            Merge version
          </DialogTitle>
          <DialogDescription>
            {version
              ? `Review divergent sections from ${version.name}.`
              : "Choose a named version to merge."}
          </DialogDescription>
        </DialogHeader>

        {review ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Metric label="Changed" value={review.changedSections} />
              <Metric label="Incoming" value={incomingSectionIds.length} />
              <Metric label="Sections" value={review.sections.length} />
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Conflict families
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {review.conflictFamilies.length > 0 ? (
                  review.conflictFamilies.map((family) => (
                    <span
                      key={family}
                      className="rounded-sm bg-background px-2 py-1 text-xs"
                    >
                      {family}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No changed conflict families.
                  </span>
                )}
              </div>
            </div>

            <ScrollArea className="h-[340px] rounded-md border border-border">
              <div className="space-y-2 p-3">
                {review.sections.map((section) => {
                  const choice = selectedSections[section.id] ?? "current";
                  const selected = choice === "incoming";

                  return (
                    <div
                      key={section.id}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:bg-muted/40",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-sm border",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {selected ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Square className="size-3.5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {section.label}
                          </span>
                          <span
                            className={cn(
                              "rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase",
                              section.changed
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {section.changed ? "changed" : "same"}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {section.description}
                        </span>
                        <span className="mt-2 block font-mono text-[11px] text-muted-foreground">
                          Current {section.currentCount} / incoming{" "}
                          {section.incomingCount}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          Family: {section.conflictFamily}
                        </span>
                        <span className="mt-3 grid grid-cols-2 gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant={choice === "current" ? "secondary" : "outline"}
                            className="h-8 text-xs"
                            disabled={!section.changed}
                            onClick={() => chooseSection(section.id, "current")}
                          >
                            Keep current
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={choice === "incoming" ? "secondary" : "outline"}
                            className="h-8 text-xs"
                            disabled={!section.changed}
                            onClick={() => chooseSection(section.id, "incoming")}
                          >
                            Accept incoming
                          </Button>
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="space-y-2">
              <label
                htmlFor="merge-review-notes"
                className="text-sm font-medium"
              >
                Merge notes
              </label>
              <Textarea
                id="merge-review-notes"
                value={mergeNotes}
                maxLength={600}
                rows={3}
                onChange={(event) => setMergeNotes(event.target.value)}
                placeholder="Reviewer decision, risk notes, or rollback context"
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!version || incomingSectionIds.length === 0}
            onClick={mergeVersion}
          >
            Merge selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm">{value}</div>
    </div>
  );
}
