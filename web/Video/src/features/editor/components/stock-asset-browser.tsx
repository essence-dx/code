"use client";

import { useState } from "react";
import { Download, ImageIcon, Loader2, Music2, PlusCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { stockAudioLibraryPresets, type StockAudioLibraryPreset, type StockAudioRole } from "@/lib/stock/audio-library";
import type { StockAsset, StockMediaType } from "@/lib/stock/stock-assets";
import { assertClientApiRuntime, clientApiUrl, isClientApiUnavailableError, useHasClientApiRuntime } from "@/lib/runtime/client-api";

export interface StockImportOptions {
  addToTimeline?: boolean;
  audioRole?: StockAudioRole;
}

type StockAssetBrowserProps = {
  isImporting: boolean;
  onImport: (asset: StockAsset, options?: StockImportOptions) => Promise<void>;
};

export function StockAssetBrowser({ isImporting, onImport }: StockAssetBrowserProps) {
  const [query, setQuery] = useState("city skyline");
  const [mediaType, setMediaType] = useState<StockMediaType>("image");
  const [activeAudioPreset, setActiveAudioPreset] = useState<StockAudioLibraryPreset | null>(null);
  const [results, setResults] = useState<StockAsset[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const canUseOnlineActions = useHasClientApiRuntime();

  async function searchStock(input?: { query?: string; mediaType?: StockMediaType; audioPreset?: StockAudioLibraryPreset | null }) {
    const nextQuery = input?.query ?? query;
    const nextMediaType = input?.mediaType ?? mediaType;
    const nextAudioPreset = input?.audioPreset ?? (nextMediaType === "audio" ? activeAudioPreset : null);

    if (input?.query !== undefined) setQuery(input.query);
    if (input?.mediaType !== undefined) setMediaType(input.mediaType);
    setActiveAudioPreset(nextAudioPreset);
    setIsSearching(true);
    setMessage(null);

    try {
      assertClientApiRuntime();
      const params = new URLSearchParams({ q: nextQuery.trim(), type: nextMediaType });
      const response = await fetch(clientApiUrl(`/api/stock/search?${params}`), { credentials: "include" });
      const data = await readStockResponse(response);

      if (!response.ok || !isStockSearchSuccess(data)) {
        setMessage(stockFailureMessage(data));
        setResults([]);
        return;
      }

      setResults(data.results);
      setMessage(data.results.length ? null : "No stock media found.");
    } catch (error) {
      setMessage(stockExceptionMessage(error));
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section className="space-y-2 rounded-md border border-border p-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Stock</h3>
        <Badge variant="outline">Free media</Badge>
      </div>
      <div className="grid grid-cols-[1fr_88px] gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void searchStock({ audioPreset: null });
          }}
          placeholder="Search free media"
          disabled={isSearching || !canUseOnlineActions}
        />
        <Select
          value={mediaType}
          onValueChange={(value) => {
            setMediaType(value as StockMediaType);
            setActiveAudioPreset(null);
          }}
        >
          <SelectTrigger className="h-9" disabled={isSearching || !canUseOnlineActions}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 rounded-md bg-muted/30 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Music2 className="size-3.5 text-muted-foreground" />
            Audio library
          </div>
          <Badge variant="secondary">Music & SFX</Badge>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {stockAudioLibraryPresets.map((preset) => (
            <Button
              key={preset.id}
              size="sm"
              variant={activeAudioPreset?.id === preset.id ? "secondary" : "ghost"}
              className="h-auto min-h-12 flex-col items-start gap-0 px-2 py-1 text-left"
              disabled={isSearching || !canUseOnlineActions}
              onClick={() => void searchStock({ query: preset.query, mediaType: "audio", audioPreset: preset })}
            >
              <span className="text-xs font-medium">{preset.label}</span>
              <span className="line-clamp-2 text-[10px] font-normal text-muted-foreground">{preset.description}</span>
            </Button>
          ))}
        </div>
      </div>
      <Button size="sm" variant="outline" className="w-full" onClick={() => void searchStock({ audioPreset: null })} disabled={isSearching || !query.trim() || !canUseOnlineActions}>
        {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        Search
      </Button>
      {message ? <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">{message}</div> : null}
      {results.length ? (
        <div className="max-h-72 space-y-2 overflow-auto pr-1">
          {results.map((asset) => (
            <StockAssetRow key={asset.id} asset={asset} audioPreset={activeAudioPreset} disabled={isImporting || isSearching} onImport={onImport} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StockAssetRow({
  asset,
  audioPreset,
  disabled,
  onImport,
}: {
  asset: StockAsset;
  audioPreset: StockAudioLibraryPreset | null;
  disabled: boolean;
  onImport: (asset: StockAsset, options?: StockImportOptions) => Promise<void>;
}) {
  const audioRole = audioPreset?.role;

  return (
    <div className="grid grid-cols-[56px_1fr_auto] items-center gap-2 rounded-md border border-border bg-background p-2">
      <div className="grid h-12 w-14 place-items-center overflow-hidden rounded-sm bg-muted">
        {asset.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.thumbnailUrl} alt={asset.name} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="size-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-medium">{asset.name}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          <Badge variant="secondary">{asset.kind}</Badge>
          <Badge variant="outline">{formatStockSize(asset.size)}</Badge>
          {asset.licenseLabel ? <Badge variant="outline">{asset.licenseLabel}</Badge> : null}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {asset.kind === "audio" ? (
          <Button
            size="icon"
            variant="ghost"
            title={`Add ${asset.name} to timeline`}
            disabled={disabled}
            onClick={() => void onImport(asset, { addToTimeline: true, audioRole })}
          >
            <PlusCircle className="size-4" />
            <span className="sr-only">Add audio to timeline</span>
          </Button>
        ) : null}
        <Button size="icon" variant="ghost" title={`Import ${asset.name}`} disabled={disabled} onClick={() => void onImport(asset, { audioRole })}>
          <Download className="size-4" />
          <span className="sr-only">Import</span>
        </Button>
      </div>
    </div>
  );
}

async function readStockResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isStockSearchSuccess(value: unknown): value is { ok: true; results: StockAsset[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    value.ok === true &&
    "results" in value &&
    Array.isArray(value.results)
  );
}

function stockFailureMessage(value: unknown) {
  if (typeof value === "object" && value !== null && "reason" in value && typeof value.reason === "string") {
    return value.reason;
  }
  return "Stock media search could not finish.";
}

function stockExceptionMessage(error: unknown) {
  if (isClientApiUnavailableError(error)) return error.message;
  return "Stock media search could not finish.";
}

function formatStockSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "media";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
