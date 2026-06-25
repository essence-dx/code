"use client";

import {
  ArchiveX,
  Boxes,
  ExternalLink,
  Gauge,
  HardDrive,
  Layers3,
  Trash2,
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
import {
  formatAssetBytes,
  type AssetAuditRecord,
  type AssetAuditScope,
  type AssetLibraryAudit,
} from "@/features/assets/asset-library-audit";

type ServerAction = (formData: FormData) => Promise<void> | void;

type AssetQuotaDashboardProps = {
  audit: AssetLibraryAudit;
  deleteAssetAction: ServerAction;
  deleteDuplicateAssetsAction: ServerAction;
};

const scopeIcons: Record<AssetAuditScope, typeof Boxes> = {
  uploads: HardDrive,
  brand: Layers3,
  projects: Boxes,
};

export function AssetQuotaDashboard({
  audit,
  deleteAssetAction,
  deleteDuplicateAssetsAction,
}: AssetQuotaDashboardProps) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Asset storage
            </CardTitle>
            <CardDescription>
              Uploads, brand assets, and project-hosted image manifests.
            </CardDescription>
          </div>
          <Badge variant={audit.usagePercent >= 85 ? "destructive" : "outline"}>
            {audit.usagePercent.toFixed(1)}% used
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {formatAssetBytes(audit.totalBytes)} of{" "}
              {formatAssetBytes(audit.quotaBytes)}
            </span>
            <span>{audit.assetCount} stored assets</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${audit.usagePercent}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          {audit.scopes.map((scope) => (
            <ScopeUsageCard key={scope.scope} scope={scope} />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
          <DuplicateCleanupPanel
            audit={audit}
            deleteAssetAction={deleteAssetAction}
            deleteDuplicateAssetsAction={deleteDuplicateAssetsAction}
          />
          <LargestAssetsPanel assets={audit.largestAssets} />
        </div>
      </CardContent>
    </Card>
  );
}

function ScopeUsageCard({
  scope,
}: {
  scope: AssetLibraryAudit["scopes"][number];
}) {
  const Icon = scopeIcons[scope.scope];

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">{scope.label}</p>
        </div>
        <Badge variant="secondary">{scope.count}</Badge>
      </div>
      <p className="mt-3 text-xl font-semibold">
        {formatAssetBytes(scope.totalBytes)}
      </p>
    </div>
  );
}

function DuplicateCleanupPanel({
  audit,
  deleteAssetAction,
  deleteDuplicateAssetsAction,
}: {
  audit: AssetLibraryAudit;
  deleteAssetAction: ServerAction;
  deleteDuplicateAssetsAction: ServerAction;
}) {
  const hasDuplicates = audit.duplicateCount > 0;

  return (
    <div className="rounded-md border border-border">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <h3 className="text-sm font-semibold">Duplicate cleanup</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasDuplicates
              ? `${audit.duplicateCount} removable duplicate${audit.duplicateCount === 1 ? "" : "s"} can recover ${formatAssetBytes(audit.duplicateBytes)}.`
              : "No duplicate uploads or brand logos found."}
          </p>
        </div>
        <form action={deleteDuplicateAssetsAction}>
          <input type="hidden" name="scope" value="all" />
          <Button type="submit" variant="outline" disabled={!hasDuplicates}>
            <ArchiveX className="h-4 w-4" />
            Remove duplicates
          </Button>
        </form>
      </div>

      {hasDuplicates ? (
        <ScrollArea className="h-[320px]">
          <div className="space-y-3 p-4">
            {audit.duplicateGroups.map((group) => (
              <div
                key={group.key}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {group.assets.length} matching assets
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {group.mimeType} · {formatAssetBytes(group.sizeBytes)}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {formatAssetBytes(group.duplicateBytes)} recoverable
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2">
                  {group.assets.map((asset, index) => (
                    <AssetCleanupRow
                      key={`${asset.scope}-${asset.id}`}
                      asset={asset}
                      isKept={index === 0}
                      deleteAssetAction={deleteAssetAction}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : null}
    </div>
  );
}

function AssetCleanupRow({
  asset,
  isKept,
  deleteAssetAction,
}: {
  asset: AssetAuditRecord;
  isKept: boolean;
  deleteAssetAction: ServerAction;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-background p-2">
      <AssetPreview asset={asset} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{asset.name}</p>
          <Badge variant={isKept ? "secondary" : "outline"}>
            {isKept ? "Kept" : asset.scopeLabel}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatAssetBytes(asset.sizeBytes)}
        </p>
      </div>
      {!isKept ? (
        <form action={deleteAssetAction}>
          <input type="hidden" name="scope" value={asset.scope} />
          <input type="hidden" name="assetId" value={asset.id} />
          <Button type="submit" variant="ghost" size="icon" aria-label="Delete asset">
            <Trash2 className="h-4 w-4" />
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function LargestAssetsPanel({ assets }: { assets: AssetAuditRecord[] }) {
  return (
    <div className="rounded-md border border-border">
      <div className="border-b border-border p-4">
        <h3 className="text-sm font-semibold">Largest assets</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The heaviest upload, brand, and project asset records.
        </p>
      </div>
      {assets.length ? (
        <ScrollArea className="h-[320px]">
          <div className="divide-y divide-border">
            {assets.map((asset) => (
              <LargestAssetRow key={`${asset.scope}-${asset.id}`} asset={asset} />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">
          Add images or brand logos to start tracking storage.
        </p>
      )}
    </div>
  );
}

function LargestAssetRow({ asset }: { asset: AssetAuditRecord }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <AssetPreview asset={asset} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{asset.name}</p>
          <Badge variant="outline">{asset.scopeLabel}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {asset.referenceCount
            ? `${asset.referenceCount} project asset${asset.referenceCount === 1 ? "" : "s"}`
            : asset.mimeType}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">{formatAssetBytes(asset.sizeBytes)}</p>
        {asset.href ? (
          <Button asChild variant="ghost" size="icon" aria-label="Open project">
            <a href={asset.href}>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function AssetPreview({ asset }: { asset: AssetAuditRecord }) {
  if (asset.previewUrl) {
    return (
      <img
        src={asset.previewUrl}
        alt=""
        className="h-10 w-10 rounded-md border border-border object-cover"
        draggable={false}
      />
    );
  }

  return (
    <div className="grid h-10 w-10 place-items-center rounded-md border border-border bg-muted">
      <Boxes className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
