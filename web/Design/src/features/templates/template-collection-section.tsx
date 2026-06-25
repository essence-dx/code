"use client";

import { ArrowRight, FilePlus2, PackageOpen } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  searchTemplateCollections,
  type TemplateCollectionResult,
} from "@/features/templates/template-collections";
import { formatTemplateLabel } from "@/features/templates/template-catalog-preview";
import type { TemplateGalleryCopy } from "@/features/templates/template-gallery-localization";

type ServerAction = (formData: FormData) => Promise<void> | void;

type TemplateCollectionSectionProps = {
  query: string;
  copy: TemplateGalleryCopy;
  createFromCatalogTemplateAction: ServerAction;
};

export function TemplateCollectionSection({
  query,
  copy,
  createFromCatalogTemplateAction,
}: TemplateCollectionSectionProps) {
  const collections = useMemo(
    () => searchTemplateCollections({ query, limit: 4 }),
    [query],
  );

  if (!collections.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PackageOpen className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              {copy.starterPacks ?? "Recommended starter packs"}
            </h3>
            <Badge variant="outline">{collections.length}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.starterPacksDescription ??
              "Curated multi-format packs for campaigns, clients, events, education, and brand presence."}
          </p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {collections.map((result) => (
          <TemplateCollectionCard
            key={result.collection.id}
            result={result}
            createFromCatalogTemplateAction={createFromCatalogTemplateAction}
          />
        ))}
      </div>
    </section>
  );
}

function TemplateCollectionCard({
  result,
  createFromCatalogTemplateAction,
}: {
  result: TemplateCollectionResult;
  createFromCatalogTemplateAction: ServerAction;
}) {
  const firstTemplate = result.templates[0];

  return (
    <article className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold">
            {result.collection.name}
          </h4>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {result.collection.description}
          </p>
        </div>
        <Badge variant="secondary">{result.templates.length} starters</Badge>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {result.collection.intent}
      </p>

      <div className="mt-3 flex flex-wrap gap-1">
        {result.formats.slice(0, 5).map((format) => (
          <Badge key={format} variant="outline">
            {formatTemplateLabel(format)}
          </Badge>
        ))}
      </div>

      <div className="mt-4 grid gap-2">
        {result.templates.slice(0, 3).map((template) => (
          <Link
            key={template.id}
            href={`/templates/${template.id}`}
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="min-w-0 truncate">{template.name}</span>
            <Badge variant="outline">{template.category}</Badge>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/templates/collections/${result.collection.id}`}>
            View pack
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        {firstTemplate ? (
          <form action={createFromCatalogTemplateAction}>
            <input
              type="hidden"
              name="catalogTemplateId"
              value={firstTemplate.id}
            />
            <input
              type="hidden"
              name="name"
              value={`${result.collection.name} kickoff`}
            />
            <Button type="submit" size="sm">
              <FilePlus2 className="h-4 w-4" />
              Start pack
            </Button>
          </form>
        ) : null}
      </div>
    </article>
  );
}
