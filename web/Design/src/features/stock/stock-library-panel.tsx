"use client";

import { ImagePlus, Search } from "lucide-react";
import { useState, type FormEvent } from "react";

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
import type { UserAssetSummary } from "@/features/assets/types";
import type { EditorLocale } from "@/features/editor/editor-localization";
import type { StockImageResult } from "@/features/stock/commons";
import { getStockLibraryCopy } from "@/features/stock/stock-library-localization";

type StockLibraryPanelProps = {
  locale: EditorLocale;
};

export function StockLibraryPanel({ locale }: StockLibraryPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockImageResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const copy = getStockLibraryCopy(locale);

  async function searchStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/stock/search?q=${encodeURIComponent(trimmedQuery)}`,
      );

      if (!response.ok) {
        setMessage(copy.searchFailedAnotherQuery);
        return;
      }

      const body = (await response.json()) as { results: StockImageResult[] };
      setResults(body.results);
      setMessage(body.results.length ? null : copy.noResults);
    } catch {
      setMessage(copy.searchFailed);
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
        setMessage(copy.importFailed);
        return;
      }

      const body = (await response.json()) as { asset: UserAssetSummary };
      setMessage(copy.importedAsset(body.asset.name));
    } catch {
      setMessage(copy.importFailed);
    } finally {
      setImportingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImagePlus className="h-5 w-5" />
          {copy.title}
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={searchStock} className="flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchAria}
          />
          <Button type="submit" disabled={isSearching} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : null}

        {results.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {results.map((result) => (
              <div
                key={result.id}
                className="overflow-hidden rounded-md border border-border bg-card"
              >
                <div className="aspect-[4/3] bg-muted">
                  <img
                    src={result.thumbnailUrl}
                    alt={result.name}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </div>
                <div className="space-y-3 p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-medium">
                        {result.name}
                      </h3>
                      <Badge variant="outline">
                        {result.licenseName || copy.freeLicense}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {result.authorName || result.provider}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={importingId === result.id}
                    onClick={() => void importStock(result)}
                  >
                    <ImagePlus className="h-4 w-4" />
                    {importingId === result.id ? copy.importing : copy.import}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
