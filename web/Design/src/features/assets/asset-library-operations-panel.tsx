"use client";

import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  CircleAlert,
  FolderInput,
  LibraryBig,
  ShieldAlert,
  Tags,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatAssetBytes } from "@/features/assets/asset-library-audit";
import type {
  AssetLibraryCollection,
  AssetLibraryOperationAsset,
  AssetLibraryOperationCenter,
  AssetOperationStatus,
} from "@/features/assets/asset-library-operations";
import { cn } from "@/lib/utils";

type AssetLibraryOperationsPanelProps = {
  operations: AssetLibraryOperationCenter;
};

const statusLabels: Record<AssetOperationStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  AssetOperationStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function AssetLibraryOperationsPanel({
  operations,
}: AssetLibraryOperationsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LibraryBig className="h-5 w-5" />
              Asset operations
            </CardTitle>
            <CardDescription>
              Collections, license review, usage references, bulk move groups,
              and reusable shelves.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[operations.status]}>
            {operations.score}/100 {statusLabels[operations.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4">
          <Metric label="Collections" value={operations.totals.collections} />
          <Metric label="Assets" value={operations.totals.assets} />
          <Metric label="Licensed" value={operations.totals.licensedAssets} />
          <Metric label="Referenced" value={operations.totals.referencedAssets} />
        </div>

        <section className="grid gap-3 xl:grid-cols-3">
          {operations.collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <QueuePanel
              title="License and usage review"
              description="Uploaded assets that still need source or usage confirmation."
              emptyState="No license review items are pending."
              assets={operations.licenseQueue}
            />
            <QueuePanel
              title="Project references"
              description="Assets and manifests with active project references."
              emptyState="No project references have been indexed yet."
              assets={operations.referenceHotspots}
            />
          </div>
          <div className="space-y-4">
            <BulkMovePanel operations={operations} />
            <ReusableShelvesPanel operations={operations} />
          </div>
        </section>

        {operations.nextActions.length ? (
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Next asset actions
            </div>
            <div className="mt-2 grid gap-2">
              {operations.nextActions.map((action) => (
                <p
                  key={action}
                  className="flex gap-2 text-xs text-muted-foreground"
                >
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{action}</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CollectionCard({
  collection,
}: {
  collection: AssetLibraryCollection;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{collection.label}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {collection.description}
          </p>
        </div>
        <ReadinessIcon status={collection.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant={statusVariants[collection.status]}>
          {statusLabels[collection.status]}
        </Badge>
        <Badge variant="outline">{collection.count} assets</Badge>
        <Badge variant="outline">
          {formatAssetBytes(collection.totalBytes)}
        </Badge>
        <Badge variant="outline">{collection.licenseCoverage}% licensed</Badge>
      </div>
      {collection.assets.length ? (
        <div className="mt-3 grid gap-2">
          {collection.assets.map((asset) => (
            <AssetMiniRow key={`${collection.id}-${asset.id}`} asset={asset} />
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
          No assets in this collection yet.
        </p>
      )}
    </div>
  );
}

function QueuePanel({
  title,
  description,
  emptyState,
  assets,
}: {
  title: string;
  description: string;
  emptyState: string;
  assets: AssetLibraryOperationAsset[];
}) {
  return (
    <div className="rounded-md border border-border">
      <div className="border-b border-border p-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {assets.length ? (
        <ScrollArea className="h-[260px]">
          <div className="divide-y divide-border">
            {assets.map((asset) => (
              <AssetQueueRow key={`${title}-${asset.id}`} asset={asset} />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">{emptyState}</p>
      )}
    </div>
  );
}

function BulkMovePanel({
  operations,
}: {
  operations: AssetLibraryOperationCenter;
}) {
  return (
    <div className="rounded-md border border-border">
      <div className="border-b border-border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <FolderInput className="h-4 w-4" />
          Bulk move groups
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Safe grouping plans before collection moves or cleanup.
        </p>
      </div>
      <div className="grid gap-2 p-4">
        {operations.bulkMoveGroups.map((group) => (
          <div
            key={group.id}
            className="rounded-md border border-border bg-muted/20 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{group.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {group.description}
                </p>
              </div>
              <Badge variant={statusVariants[group.status]}>
                {group.assetIds.length}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatAssetBytes(group.totalBytes)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReusableShelvesPanel({
  operations,
}: {
  operations: AssetLibraryOperationCenter;
}) {
  return (
    <div className="rounded-md border border-border">
      <div className="border-b border-border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Tags className="h-4 w-4" />
          Reusable shelves
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Brand, template, and published asset shelves for repeatable work.
        </p>
      </div>
      <div className="grid gap-2 p-4">
        {operations.reusableShelves.map((shelf) => (
          <div
            key={shelf.id}
            className="rounded-md border border-border bg-muted/20 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{shelf.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {shelf.description}
                </p>
              </div>
              <Badge variant={statusVariants[shelf.status]}>
                {shelf.items.length}
              </Badge>
            </div>
            {shelf.items.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {shelf.items.slice(0, 3).map((asset) => (
                  <Badge key={asset.id} variant="outline">
                    {asset.name}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetQueueRow({ asset }: { asset: AssetLibraryOperationAsset }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <AssetPreview asset={asset} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{asset.name}</p>
          <Badge variant="outline">{asset.scopeLabel}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {asset.mimeType} - {formatAssetBytes(asset.sizeBytes)}
        </p>
      </div>
      {asset.href ? (
        <Button asChild size="icon" variant="ghost" aria-label="Open asset">
          <a href={asset.href}>
            <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function AssetMiniRow({ asset }: { asset: AssetLibraryOperationAsset }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-background p-2">
      <AssetPreview asset={asset} compact />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{asset.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatAssetBytes(asset.sizeBytes)}
        </p>
      </div>
      <Badge variant="outline">{asset.licenseStatus}</Badge>
    </div>
  );
}

function AssetPreview({
  asset,
  compact = false,
}: {
  asset: AssetLibraryOperationAsset;
  compact?: boolean;
}) {
  const className = compact ? "h-8 w-8" : "h-10 w-10";

  if (asset.previewUrl) {
    return (
      <img
        src={asset.previewUrl}
        alt=""
        className={cn(
          className,
          "rounded-md border border-border object-cover",
        )}
        draggable={false}
      />
    );
  }

  return (
    <div
      className={cn(
        className,
        "grid place-items-center rounded-md border border-border bg-muted",
      )}
    >
      <Boxes className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function ReadinessIcon({ status }: { status: AssetOperationStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
