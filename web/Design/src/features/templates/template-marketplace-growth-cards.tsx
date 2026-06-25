"use client";

import {
  Download,
  Heart,
  History,
  PackageCheck,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createOfflineTemplatePackManifest,
  type MarketplaceGrowthCreator,
  type MarketplaceGrowthTemplate,
  type MarketplaceModerationQueueItem,
  type MarketplaceOfflinePack,
} from "@/features/templates/template-marketplace-growth";
import { cn } from "@/lib/utils";

export function GrowthTemplateCard({
  template,
  createFromTemplateAction,
  onFavorite,
  onSaveCreator,
  onInstall,
}: {
  template: MarketplaceGrowthTemplate;
  createFromTemplateAction: (formData: FormData) => void;
  onFavorite: () => void;
  onSaveCreator: () => void;
  onInstall: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-md border border-border bg-background">
      <div className="aspect-[4/3] bg-muted">
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No preview
          </div>
        )}
      </div>
      <div className="space-y-3 p-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{template.collectionLabel}</Badge>
            <Badge variant={getTrendVariant(template.installTrend)}>
              {formatTrend(template.installTrend)}
            </Badge>
            <Badge variant={getModerationVariant(template.moderationStatus)}>
              {template.ratingAverage.toFixed(1)} stars
            </Badge>
          </div>
          <div>
            <h4 className="line-clamp-2 text-sm font-medium">
              {template.name}
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {template.creatorLabel}: {template.creatorDetail}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <GrowthMetric label="Reviews" value={template.reviewSignalCount} />
          <GrowthMetric label="Uses" value={template.useCount} />
          <GrowthMetric label="Rate" value={`${template.conversionRate}%`} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={template.isFavorite ? "secondary" : "outline"}
            size="sm"
            onClick={onFavorite}
          >
            <Heart
              className={cn(
                "h-3.5 w-3.5",
                template.isFavorite && "fill-current",
              )}
            />
            {template.isFavorite ? "Favorited" : "Favorite"}
          </Button>
          <Button
            type="button"
            variant={template.isCreatorSaved ? "secondary" : "outline"}
            size="sm"
            onClick={onSaveCreator}
          >
            <UserPlus className="h-3.5 w-3.5" />
            {template.isCreatorSaved ? "Saved" : "Save creator"}
          </Button>
        </div>

        <form action={createFromTemplateAction} className="flex gap-2">
          <input type="hidden" name="templateId" value={template.id} />
          <Input
            name="name"
            placeholder={`${template.name} copy`}
            aria-label={`New design name from ${template.name}`}
          />
          <Button type="submit" size="sm" onClick={onInstall}>
            Use
          </Button>
        </form>
      </div>
    </article>
  );
}

export function InstallHistoryPanel({
  installHistory,
  favoriteTemplates,
}: {
  installHistory: Array<{
    template: MarketplaceGrowthTemplate;
    installedAt: string;
  }>;
  favoriteTemplates: MarketplaceGrowthTemplate[];
}) {
  return (
    <aside className="space-y-3 rounded-md border border-border bg-background p-3">
      <div>
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <History className="h-4 w-4 text-primary" />
          Install history
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">
          Recently used marketplace templates stay available for repeat work.
        </p>
      </div>

      {installHistory.length ? (
        <div className="space-y-2">
          {installHistory.slice(0, 6).map((item) => (
            <div
              key={`${item.template.id}-${item.installedAt}`}
              className="rounded-md border border-border p-2"
            >
              <p className="text-sm font-medium">{item.template.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(item.installedAt)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
          Use a marketplace template to start the local install history.
        </p>
      )}

      <div>
        <h5 className="text-xs font-semibold uppercase text-muted-foreground">
          Favorites shelf
        </h5>
        <div className="mt-2 space-y-2">
          {favoriteTemplates.length ? (
            favoriteTemplates.slice(0, 5).map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-2"
              >
                <span className="truncate text-sm">{template.name}</span>
                <Badge variant="outline">
                  {template.ratingAverage.toFixed(1)}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Favorite templates to build a repeatable shelf.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

export function CreatorCard({
  creator,
  onToggle,
}: {
  creator: MarketplaceGrowthCreator;
  onToggle: () => void;
}) {
  return (
    <article className="space-y-3 rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium">{creator.detail}</h4>
          <p className="text-xs text-muted-foreground">{creator.label}</p>
        </div>
        <Button
          type="button"
          variant={creator.saved ? "secondary" : "outline"}
          size="sm"
          onClick={onToggle}
        >
          <UsersRound className="h-3.5 w-3.5" />
          {creator.saved ? "Saved" : "Save"}
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs">
        <GrowthMetric label="Templates" value={creator.templateCount} />
        <GrowthMetric label="Uses" value={creator.totalUses} />
        <GrowthMetric label="Rating" value={creator.averageRating.toFixed(1)} />
        <GrowthMetric label="Quality" value={`${creator.averageQuality}%`} />
      </div>
    </article>
  );
}

export function OfflinePackCard({
  pack,
  onToggle,
}: {
  pack: MarketplaceOfflinePack;
  onToggle: () => void;
}) {
  const downloadManifest = () => {
    const manifest = createOfflineTemplatePackManifest(pack);
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${pack.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <article className="space-y-3 rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium">{pack.label}</h4>
          <p className="text-xs text-muted-foreground">
            {pack.templateCount} templates - about {pack.estimatedSizeKb} KB
          </p>
        </div>
        <Badge variant={pack.saved ? "secondary" : "outline"}>
          {pack.saved ? "Saved" : "Available"}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <GrowthMetric label="Uses" value={pack.totalUses} />
        <GrowthMetric label="Views" value={pack.totalViews} />
        <GrowthMetric label="Quality" value={`${pack.averageQuality}%`} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={pack.saved ? "secondary" : "outline"}
          size="sm"
          onClick={onToggle}
        >
          <PackageCheck className="h-3.5 w-3.5" />
          {pack.saved ? "Saved offline" : "Save offline"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={downloadManifest}
        >
          <Download className="h-3.5 w-3.5" />
          Manifest
        </Button>
      </div>
    </article>
  );
}

export function ModerationQueueCard({
  item,
}: {
  item: MarketplaceModerationQueueItem;
}) {
  return (
    <article className="space-y-3 rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium">{item.template.name}</h4>
          <p className="text-xs text-muted-foreground">
            {item.template.collectionLabel} - {item.template.creatorDetail}
          </p>
        </div>
        <Badge variant={getModerationVariant(item.status)}>
          {item.status === "action" ? "Action" : "Watch"}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {item.reasons.map((reason) => (
          <Badge key={reason} variant="outline">
            {reason}
          </Badge>
        ))}
      </div>
    </article>
  );
}

export function GrowthMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

function getTrendVariant(trend: MarketplaceGrowthTemplate["installTrend"]) {
  if (trend === "rising") return "secondary" as const;
  if (trend === "needs-attention") return "destructive" as const;

  return "outline" as const;
}

function getModerationVariant(
  status: MarketplaceGrowthTemplate["moderationStatus"],
) {
  if (status === "action") return "destructive" as const;
  if (status === "ready") return "secondary" as const;

  return "outline" as const;
}

function formatTrend(trend: MarketplaceGrowthTemplate["installTrend"]) {
  return trend
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
