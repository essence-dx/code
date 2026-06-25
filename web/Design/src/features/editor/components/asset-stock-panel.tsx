"use client";

import { ImagePlus, Search } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserAssetSummary } from "@/features/assets/types";
import type { StockImageResult } from "@/features/stock/commons";

type AssetStockPanelProps = {
  onImportAsset: (asset: UserAssetSummary) => void;
};

export function AssetStockPanel({ onImportAsset }: AssetStockPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockImageResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  async function searchStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setMessage(null);
      return;
    }

    setIsSearching(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/stock/search?q=${encodeURIComponent(trimmedQuery)}`,
      );

      if (!response.ok) {
        setMessage("Stock search failed. Try another query.");
        return;
      }

      const body = (await response.json()) as { results: StockImageResult[] };
      setResults(body.results);
      setMessage(body.results.length ? null : "No free stock results found.");
    } catch {
      setMessage("Stock search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }

  async function importStock(result: StockImageResult) {
    setImportingId(result.id);
    setMessage(null);

    try {
      const response = await fetch("/api/stock/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result),
      });

      if (!response.ok) {
        setMessage("Could not import this stock image.");
        return;
      }

      const body = (await response.json()) as { asset: UserAssetSummary };
      onImportAsset(body.asset);
      setMessage(`Imported ${body.asset.name}.`);
    } catch {
      setMessage("Could not import this stock image.");
    } finally {
      setImportingId(null);
    }
  }

  return (
    <section className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">
          Free stock
        </h3>
        <span className="text-xs text-muted-foreground">Commons</span>
      </div>
      <form onSubmit={searchStock} className="mb-3 flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search images"
          aria-label="Search free stock images"
          className="h-9"
        />
        <Button type="submit" size="icon" disabled={isSearching}>
          <Search className="h-4 w-4" />
        </Button>
      </form>
      {message ? (
        <p className="mb-3 text-xs text-muted-foreground">{message}</p>
      ) : null}
      {results.length ? (
        <div className="grid grid-cols-2 gap-2">
          {results.map((result) => (
            <div
              key={result.id}
              className="overflow-hidden rounded-md border border-border bg-background"
            >
              <div className="aspect-square bg-muted">
                <img
                  src={result.thumbnailUrl}
                  alt={result.name}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </div>
              <div className="space-y-2 p-2">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-xs font-medium">{result.name}</p>
                  <Badge variant="outline" className="max-w-full truncate">
                    {result.licenseName || "Free"}
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full justify-start"
                  disabled={importingId === result.id}
                  onClick={() => void importStock(result)}
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  {importingId === result.id ? "Importing" : "Import"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
