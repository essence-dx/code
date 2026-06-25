"use client";

import { useMemo, useState } from "react";
import { CalendarDays, FilePlus2, Layers3, Palette } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CampaignBoardSummary } from "@/db/campaigns";
import { CampaignBulkActions } from "@/features/campaigns/campaign-bulk-actions";
import {
  getCampaignDerivativeSource,
  getRecommendedCampaignDerivativeProfiles,
} from "@/features/campaigns/campaign-board";
import type {
  ApprovalStatus,
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  ProjectSummary,
} from "@/features/editor/types";
import {
  approvalStatusLabels,
  approvalStatuses,
  getApprovalStatusBadgeVariant,
} from "@/features/review/approval-status";

type ServerAction = (formData: FormData) => Promise<void> | void;

type CampaignBoardPanelProps = {
  campaigns: CampaignBoardSummary[];
  projects: ProjectSummary[];
  brandColors: BrandColorSummary[];
  brandLogos: BrandLogoSummary[];
  brandFonts: BrandFontSummary[];
  bulkScheduleCampaignAction: ServerAction;
  createCampaignAction: ServerAction;
  createCampaignDerivativesAction: ServerAction;
  updateApprovalStatusAction: ServerAction;
};

export function CampaignBoardPanel({
  campaigns,
  projects,
  brandColors,
  brandLogos,
  brandFonts,
  bulkScheduleCampaignAction,
  createCampaignAction,
  createCampaignDerivativesAction,
  updateApprovalStatusAction,
}: CampaignBoardPanelProps) {
  const activeProjects = projects.filter((project) => !project.deletedAt);
  const headingFont =
    brandFonts.find((font) => font.role === "heading") ?? brandFonts[0] ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers3 className="h-5 w-5" />
          Campaign boards
        </CardTitle>
        <CardDescription>
          Connect one brief, the current brand kit, and multiple deliverables.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form action={createCampaignAction} className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign name</Label>
                <Input
                  id="campaign-name"
                  name="name"
                  placeholder="Spring launch campaign"
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-launch">Launch date</Label>
                <Input id="campaign-launch" name="launchAt" type="date" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="campaign-goal">Goal</Label>
                <Input
                  id="campaign-goal"
                  name="goal"
                  placeholder="Drive signups or sales"
                  maxLength={240}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-audience">Audience</Label>
                <Input
                  id="campaign-audience"
                  name="audience"
                  placeholder="Small business owners"
                  maxLength={240}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-brief">Brief</Label>
              <Textarea
                id="campaign-brief"
                name="brief"
                placeholder="Summarize the offer, audience promise, required channels, and approval notes."
                maxLength={1200}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-md border border-border p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Palette className="h-4 w-4 text-muted-foreground" />
                Brand kit snapshot
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr]">
                <div className="space-y-2">
                  <Label htmlFor="campaign-brand-color">Primary color</Label>
                  <select
                    id="campaign-brand-color"
                    name="primaryBrandColor"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {brandColors.length ? (
                      brandColors.map((color) => (
                        <option key={color.id} value={color.color}>
                          {color.color}
                        </option>
                      ))
                    ) : (
                      <option value="">No color saved</option>
                    )}
                  </select>
                </div>
                <div className="flex min-w-0 flex-wrap items-end gap-2 text-xs text-muted-foreground">
                  {brandColors.slice(0, 8).map((color) => (
                    <span
                      key={color.id}
                      className="h-8 w-8 rounded border border-border"
                      style={{ backgroundColor: color.color }}
                      title={color.color}
                    />
                  ))}
                  <span className="truncate">
                    {brandLogos[0]?.name ?? "No logo saved"} /{" "}
                    {headingFont?.fontFamily ?? "No font saved"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Deliverables</p>
                <Badge variant="outline">{activeProjects.length}</Badge>
              </div>
              <div className="mt-3 grid max-h-52 gap-2 overflow-auto pr-1">
                {activeProjects.length ? (
                  activeProjects.slice(0, 12).map((project) => (
                    <label
                      key={project.id}
                      className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="projectIds"
                        value={project.id}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {project.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {project.width} x {project.height}
                        </span>
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                    Create a design before building a campaign board.
                  </p>
                )}
              </div>
            </div>

            <Button type="submit">
              <FilePlus2 className="h-4 w-4" />
              Create campaign board
            </Button>
          </div>
        </form>

        {campaigns.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                bulkScheduleCampaignAction={bulkScheduleCampaignAction}
                createCampaignDerivativesAction={createCampaignDerivativesAction}
                updateApprovalStatusAction={updateApprovalStatusAction}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Campaign boards will appear here once you connect a brief to deliverables.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CampaignCard({
  campaign,
  bulkScheduleCampaignAction,
  createCampaignDerivativesAction,
  updateApprovalStatusAction,
}: {
  campaign: CampaignBoardSummary;
  bulkScheduleCampaignAction: ServerAction;
  createCampaignDerivativesAction: ServerAction;
  updateApprovalStatusAction: ServerAction;
}) {
  const [selectedDeliverableIds, setSelectedDeliverableIds] = useState<
    string[]
  >([]);
  const sourceDeliverable = getCampaignDerivativeSource(campaign.deliverables);
  const recommendedProfiles = getRecommendedCampaignDerivativeProfiles({
    deliverables: campaign.deliverables,
    sourceProjectId: sourceDeliverable?.projectId ?? null,
    limit: 5,
  });
  const selectedDeliverables = useMemo(
    () =>
      campaign.deliverables.filter(
        (deliverable) =>
          deliverable.id &&
          deliverable.projectId &&
          selectedDeliverableIds.includes(deliverable.id),
      ),
    [campaign.deliverables, selectedDeliverableIds],
  );

  function toggleDeliverableSelection(deliverableId: string, selected: boolean) {
    setSelectedDeliverableIds((current) => {
      if (selected) return [...new Set([...current, deliverableId])];

      return current.filter((id) => id !== deliverableId);
    });
  }

  return (
    <article className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{campaign.name}</h3>
            <Badge variant="secondary">{campaign.status}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {campaign.goal || "No goal yet"} / {campaign.audience || "No audience yet"}
          </p>
        </div>
        {campaign.launchAt ? (
          <Badge variant="outline" className="gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date(campaign.launchAt).toLocaleDateString()}
          </Badge>
        ) : null}
      </div>

      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
        {campaign.brief || "Add a campaign brief to align channels, approvals, and outcomes."}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {campaign.primaryBrandColor ? (
          <span
            className="h-6 w-6 rounded border border-border"
            style={{ backgroundColor: campaign.primaryBrandColor }}
            title={campaign.primaryBrandColor}
          />
        ) : null}
        <span>{campaign.brandLogoName ?? "No logo"}</span>
        <span>/</span>
        <span>{campaign.brandFontFamily ?? "No font"}</span>
      </div>

      <div className="mt-4 grid gap-2">
        {campaign.deliverables.length ? (
          campaign.deliverables.map((deliverable) => (
            <div
              key={deliverable.id || `${campaign.id}-${deliverable.projectId}`}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
            >
              {deliverable.id && deliverable.projectId ? (
                <input
                  type="checkbox"
                  checked={selectedDeliverableIds.includes(deliverable.id)}
                  onChange={(event) =>
                    toggleDeliverableSelection(
                      deliverable.id,
                      event.currentTarget.checked,
                    )
                  }
                  className="h-4 w-4 shrink-0 accent-primary"
                  aria-label={`Select ${deliverable.projectName ?? deliverable.role}`}
                />
              ) : null}
              <div className="min-w-0">
                {deliverable.projectId ? (
                  <Link
                    href={`/editor/${deliverable.projectId}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {deliverable.projectName ?? "Deleted design"}
                  </Link>
                ) : (
                  <p className="truncate font-medium">Deleted design</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {deliverable.role} / {deliverable.channel}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge variant="outline">{deliverable.status}</Badge>
                <Badge
                  variant={getApprovalStatusBadgeVariant(
                    deliverable.approvalStatus,
                  )}
                >
                  {approvalStatusLabels[deliverable.approvalStatus]}
                </Badge>
                {deliverable.id ? (
                  <DeliverableApprovalForm
                    campaignId={campaign.id}
                    deliverableId={deliverable.id}
                    approvalStatus={deliverable.approvalStatus}
                    updateApprovalStatusAction={updateApprovalStatusAction}
                  />
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            No deliverables connected yet.
          </p>
        )}
      </div>

      {campaign.deliverables.some(
        (deliverable) => deliverable.id && deliverable.projectId,
      ) ? (
        <CampaignBulkActions
          campaign={campaign}
          selectedDeliverables={selectedDeliverables}
          bulkScheduleCampaignAction={bulkScheduleCampaignAction}
        />
      ) : null}

      {sourceDeliverable?.projectId ? (
        <form
          action={createCampaignDerivativesAction}
          className="mt-4 rounded-md border border-border bg-muted/30 p-3"
        >
          <input type="hidden" name="campaignId" value={campaign.id} />
          <input
            type="hidden"
            name="sourceProjectId"
            value={sourceDeliverable.projectId}
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Generate campaign variants</p>
              <p className="text-xs text-muted-foreground">
                Source: {sourceDeliverable.projectName ?? "Selected design"}
              </p>
            </div>
            <Badge variant="outline">{recommendedProfiles.length} ready</Badge>
          </div>
          {recommendedProfiles.length ? (
            <>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {recommendedProfiles.map((profile) => (
                  <label
                    key={profile.id}
                    className="flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="profileIds"
                      value={profile.id}
                      defaultChecked
                      className="mt-1 h-4 w-4 accent-primary"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {profile.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {profile.group} / {profile.width} x {profile.height}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <Button type="submit" className="mt-3" variant="outline">
                <FilePlus2 className="h-4 w-4" />
                Create selected variants
              </Button>
            </>
          ) : (
            <p className="mt-3 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
              Recommended variants are already connected for this source.
            </p>
          )}
        </form>
      ) : null}
    </article>
  );
}

function DeliverableApprovalForm({
  campaignId,
  deliverableId,
  approvalStatus,
  updateApprovalStatusAction,
}: {
  campaignId: string;
  deliverableId: string;
  approvalStatus: ApprovalStatus;
  updateApprovalStatusAction: ServerAction;
}) {
  return (
    <form action={updateApprovalStatusAction} className="flex items-center gap-2">
      <input type="hidden" name="subject" value="campaign-deliverable" />
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <select
        name="approvalStatus"
        defaultValue={approvalStatus}
        className="h-8 w-36 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="Deliverable approval status"
      >
        {approvalStatuses.map((status) => (
          <option key={status} value={status}>
            {approvalStatusLabels[status]}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline" size="sm">
        Save
      </Button>
    </form>
  );
}
