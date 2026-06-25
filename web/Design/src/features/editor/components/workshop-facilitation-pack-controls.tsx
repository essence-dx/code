"use client";

import { Download, LayoutTemplate, ListChecks, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createWorkshopPackApplication,
  createWorkshopRecapSuggestion,
  createWorkshopSessionExport,
  getWorkshopFacilitationPack,
  workshopFacilitationPacks,
} from "@/features/editor/workshop-facilitation-packs";
import type {
  DesignElement,
  DesignPage,
  WorkshopFacilitationPackId,
  WorkshopSessionState,
} from "@/features/editor/types";
import type { NormalizedWorkshopSession } from "@/features/editor/workshop-analytics";

export function WorkshopFacilitationPackControls({
  page,
  session,
  onApplyWorkshopPack,
  onUpdateWorkshopSession,
}: {
  page: DesignPage;
  session: NormalizedWorkshopSession;
  onApplyWorkshopPack: (
    elements: DesignElement[],
    sessionUpdates: Partial<WorkshopSessionState>,
  ) => void;
  onUpdateWorkshopSession: (updates: Partial<WorkshopSessionState>) => void;
}) {
  const [selectedPackId, setSelectedPackId] =
    useState<WorkshopFacilitationPackId>(
      session.facilitationPackId ?? "design-sprint",
    );
  const selectedPack = getWorkshopFacilitationPack(selectedPackId);
  const activeAgenda = session.agendaBlocks.find(
    (block) => block.id === session.activeAgendaBlockId,
  );
  const exportArtifact = useMemo(
    () => createWorkshopSessionExport(page),
    [page],
  );

  function applySelectedPack() {
    const application = createWorkshopPackApplication(page, selectedPack.id);
    onApplyWorkshopPack(application.elements, application.sessionUpdates);
  }

  function downloadSummary() {
    const blob = new Blob([exportArtifact.markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = exportArtifact.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <LayoutTemplate className="h-3.5 w-3.5" />
            Facilitation packs
          </div>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Add a reusable board, agenda, script, and breakout structure to this
            page.
          </p>
        </div>
        {session.facilitationPackId ? (
          <Badge variant="outline">{getWorkshopFacilitationPack(session.facilitationPackId).name}</Badge>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="workshop-pack" className="text-xs">
          Pack
        </Label>
        <Select
          value={selectedPackId}
          onValueChange={(value) =>
            setSelectedPackId(value as WorkshopFacilitationPackId)
          }
        >
          <SelectTrigger id="workshop-pack">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {workshopFacilitationPacks.map((pack) => (
              <SelectItem key={pack.id} value={pack.id}>
                {pack.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
        {selectedPack.description}
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full justify-start"
        onClick={applySelectedPack}
      >
        <LayoutTemplate className="h-3.5 w-3.5" />
        Add board and agenda
      </Button>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <ListChecks className="h-3.5 w-3.5" />
          Agenda
        </div>
        {session.agendaBlocks.length ? (
          <div className="space-y-1">
            {session.agendaBlocks.map((block) => (
              <button
                key={block.id}
                type="button"
                className="flex w-full items-start justify-between gap-2 rounded-md border border-border bg-muted/30 p-2 text-left text-xs transition-colors hover:bg-muted"
                onClick={() =>
                  onUpdateWorkshopSession({ activeAgendaBlockId: block.id })
                }
              >
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">
                    {block.title}
                  </span>
                  <span className="mt-0.5 block text-muted-foreground">
                    {block.prompt}
                  </span>
                </span>
                <Badge
                  variant={
                    activeAgenda?.id === block.id ? "secondary" : "outline"
                  }
                >
                  {block.minutes}m
                </Badge>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
            Apply a facilitation pack to create timed agenda blocks.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <UsersRound className="h-3.5 w-3.5" />
          Breakouts
        </div>
        {session.breakoutSections.length ? (
          <div className="space-y-1">
            {session.breakoutSections.map((section) => (
              <div
                key={section.id}
                className="rounded-md border border-border bg-muted/30 p-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{section.title}</span>
                  <Badge variant="outline">
                    {section.targetElementIds.length} targets
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{section.prompt}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
            Breakout sections will appear after a pack is applied.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="workshop-recap" className="text-xs">
          Recap
        </Label>
        <Textarea
          id="workshop-recap"
          value={session.recapSummary}
          placeholder={createWorkshopRecapSuggestion(page)}
          maxLength={1200}
          onChange={(event) =>
            onUpdateWorkshopSession({ recapSummary: event.target.value })
          }
        />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full justify-start"
        onClick={downloadSummary}
      >
        <Download className="h-3.5 w-3.5" />
        Download session summary
      </Button>
    </div>
  );
}
