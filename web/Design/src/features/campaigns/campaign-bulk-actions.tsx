"use client";

import { CalendarPlus, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  CampaignBoardSummary,
  CampaignDeliverableSummary,
} from "@/db/campaigns";
import {
  buildCampaignDownloadManifest,
  campaignScheduleCadenceOptions,
  createCampaignManifestCsv,
} from "@/features/campaigns/campaign-bulk-workflows";
import { toPlannerDatetimeLocalInputValue } from "@/features/content-planner/content-calendar";

type ServerAction = (formData: FormData) => Promise<void> | void;

type CampaignBulkActionsProps = {
  campaign: CampaignBoardSummary;
  selectedDeliverables: CampaignDeliverableSummary[];
  bulkScheduleCampaignAction: ServerAction;
};

export function CampaignBulkActions({
  campaign,
  selectedDeliverables,
  bulkScheduleCampaignAction,
}: CampaignBulkActionsProps) {
  const selectedCount = selectedDeliverables.length;
  const disabled = selectedCount === 0;

  async function downloadSelectedDeliverables() {
    if (!selectedDeliverables.length) return;

    const manifest = buildCampaignDownloadManifest({
      campaign,
      deliverables: selectedDeliverables,
    });
    const zipModule = await import("jszip");
    const zip = new zipModule.default();
    const fileBaseName = toSafeFileName(campaign.name || "campaign");

    zip.file(`${fileBaseName}-manifest.json`, JSON.stringify(manifest, null, 2));
    zip.file(
      `${fileBaseName}-deliverables.csv`,
      createCampaignManifestCsv(manifest),
    );

    for (const deliverable of selectedDeliverables) {
      addThumbnailToZip({
        zip,
        deliverable,
        fileName: toSafeFileName(
          deliverable.projectName || deliverable.role || deliverable.id,
        ),
      });
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.download = `${fileBaseName}-deliverables.zip`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-4 grid gap-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Bulk delivery</p>
          <p className="text-xs text-muted-foreground">
            {selectedCount} selected
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => void downloadSelectedDeliverables()}
        >
          <Download className="h-4 w-4" />
          Download ZIP
        </Button>
      </div>
      <form
        action={bulkScheduleCampaignAction}
        className="grid gap-3 lg:grid-cols-[1fr_120px_1fr_auto]"
      >
        <input type="hidden" name="campaignId" value={campaign.id} />
        {selectedDeliverables.map((deliverable) => (
          <input
            key={deliverable.id}
            type="hidden"
            name="deliverableIds"
            value={deliverable.id}
          />
        ))}
        <div className="space-y-2">
          <Label htmlFor={`${campaign.id}-bulk-start`}>Start date</Label>
          <Input
            id={`${campaign.id}-bulk-start`}
            name="startAt"
            type="datetime-local"
            defaultValue={toPlannerDatetimeLocalInputValue(new Date())}
            disabled={disabled}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${campaign.id}-bulk-cadence`}>Cadence</Label>
          <select
            id={`${campaign.id}-bulk-cadence`}
            name="cadenceDays"
            defaultValue="1"
            disabled={disabled}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {campaignScheduleCadenceOptions.map((days) => (
              <option key={days} value={days}>
                {days === 0 ? "Same day" : `${days}d`}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${campaign.id}-bulk-caption`}>Caption</Label>
          <Input
            id={`${campaign.id}-bulk-caption`}
            name="caption"
            placeholder="Campaign publishing note"
            maxLength={500}
            disabled={disabled}
          />
        </div>
        <Button type="submit" className="self-end" disabled={disabled}>
          <CalendarPlus className="h-4 w-4" />
          Schedule
        </Button>
      </form>
    </div>
  );
}

function toSafeFileName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "campaign"
  );
}

function addThumbnailToZip(input: {
  zip: {
    file(
      path: string,
      data: string,
      options?: { base64?: boolean },
    ): unknown;
  };
  deliverable: CampaignDeliverableSummary;
  fileName: string;
}) {
  const thumbnail = input.deliverable.projectThumbnail;

  if (!thumbnail?.startsWith("data:image/")) return;

  const commaIndex = thumbnail.indexOf(",");

  if (commaIndex === -1) return;

  const metadata = thumbnail.slice(0, commaIndex);
  const payload = thumbnail.slice(commaIndex + 1);
  const extension = metadata.includes("image/jpeg") ? "jpg" : "png";

  input.zip.file(`thumbnails/${input.fileName}.${extension}`, payload, {
    base64: true,
  });
}
