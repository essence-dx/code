"use client";

import { Compass, Eye, FilePlus2, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTemplateCatalogDiscovery,
  getTemplateCatalogFilterOptions,
  searchTemplateCatalog,
  type TemplateCatalogDiscoveryFacet,
  type TemplateCatalogFormat,
  type TemplateCatalogItem,
} from "@/features/templates/template-catalog";
import {
  formatTemplateLabel,
  TemplateCatalogPreview,
} from "@/features/templates/template-catalog-preview";
import type { TemplateGalleryCopy } from "@/features/templates/template-gallery-localization";

type ServerAction = (formData: FormData) => Promise<void> | void;
type CatalogFilterValue = TemplateCatalogFormat | "all";

type TemplateCatalogSectionProps = {
  query: string;
  copy: TemplateGalleryCopy;
  createFromCatalogTemplateAction: ServerAction;
};

const filterOptions = getTemplateCatalogFilterOptions();
const catalogDiscovery = createTemplateCatalogDiscovery();

export function TemplateCatalogSection({
  query,
  copy,
  createFromCatalogTemplateAction,
}: TemplateCatalogSectionProps) {
  const [format, setFormat] = useState<CatalogFilterValue>("all");
  const [category, setCategory] = useState("all");
  const [industry, setIndustry] = useState("all");
  const [season, setSeason] = useState("all");
  const [platform, setPlatform] = useState("all");
  const templates = useMemo(
    () =>
      searchTemplateCatalog({
        query,
        format,
        category,
        industry,
        season,
        platform,
      }),
    [category, format, industry, platform, query, season],
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              {copy.starterTemplates ?? "Starter templates"}
            </h3>
            <Badge variant="outline">{templates.length}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.starterTemplatesDescription ??
              "Original first-party starters across social, docs, websites, email, whiteboards, presentations, and print."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={format}
            onValueChange={(value) => setFormat(value as CatalogFilterValue)}
          >
            <SelectTrigger
              className="w-40"
              aria-label={copy.filterFormat ?? "Filter format"}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.allFormats ?? "All formats"}</SelectItem>
              {filterOptions.formats.map((item) => (
                <SelectItem key={item} value={item}>
                  {formatTemplateLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger
              className="w-44"
              aria-label={copy.filterCategory ?? "Filter category"}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {copy.allCategories ?? "All categories"}
              </SelectItem>
              {filterOptions.categories.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger
              className="w-44"
              aria-label={copy.filterIndustry ?? "Filter industry"}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {copy.allIndustries ?? "All industries"}
              </SelectItem>
              {filterOptions.industries.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger
              className="w-44"
              aria-label={copy.filterSeason ?? "Filter season"}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.allSeasons ?? "All seasons"}</SelectItem>
              {filterOptions.seasons.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger
              className="w-44"
              aria-label={copy.filterPlatform ?? "Filter platform"}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {copy.allPlatforms ?? "All platforms"}
              </SelectItem>
              {filterOptions.platforms.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <TemplateCatalogDiscoveryStrip discovery={catalogDiscovery} />

      {templates.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <TemplateCatalogCard
              key={template.id}
              template={template}
              copy={copy}
              createFromCatalogTemplateAction={createFromCatalogTemplateAction}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
          {copy.emptyStarters ?? "No starter templates match this view."}
        </div>
      )}
    </section>
  );
}

function TemplateCatalogDiscoveryStrip({
  discovery,
}: {
  discovery: ReturnType<typeof createTemplateCatalogDiscovery>;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Discovery map</h4>
          <Badge variant="outline">
            {discovery.totals.templates} originals
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {discovery.recommendedFacets.map((facet) => (
            <TemplateCatalogFacetBadge key={`${facet.kind}:${facet.id}`} facet={facet} />
          ))}
        </div>
      </div>
      <div className="rounded-md border border-border bg-background p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Asset provenance
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {discovery.provenance.withNotes} of {discovery.totals.templates} starters include original asset notes.
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${discovery.provenance.readyPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function TemplateCatalogFacetBadge({
  facet,
}: {
  facet: TemplateCatalogDiscoveryFacet;
}) {
  return (
    <Badge variant="outline" className="bg-background">
      {facet.label} - {facet.count}
    </Badge>
  );
}

function TemplateCatalogCard({
  template,
  copy,
  createFromCatalogTemplateAction,
}: {
  template: TemplateCatalogItem;
  copy: TemplateGalleryCopy;
  createFromCatalogTemplateAction: ServerAction;
}) {
  return (
    <form
      action={createFromCatalogTemplateAction}
      className="overflow-hidden rounded-md border border-border bg-card"
    >
      <input type="hidden" name="catalogTemplateId" value={template.id} />
      <TemplateCatalogPreview template={template} />
      <div className="space-y-3 p-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="min-w-0 flex-1 truncate text-sm font-medium">
              {template.name}
            </h4>
            <Badge variant="secondary">{formatTemplateLabel(template.format)}</Badge>
          </div>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {template.description}
          </p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline">{template.category}</Badge>
            <Badge variant="outline">{template.industry}</Badge>
            <Badge variant="outline">{template.season}</Badge>
            <Badge variant="outline">{template.platform}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{template.usageNotes}</p>
          <p className="rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
            {template.assetProvenanceNotes[0]}
          </p>
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            name="name"
            placeholder={
              copy.starterCopyPlaceholder?.(template.name) ??
              `${template.name} project`
            }
            aria-label={
              copy.newStarterDesignName?.(template.name) ??
              `New design name from ${template.name}`
            }
          />
          <Button asChild variant="outline" size="icon">
            <Link
              href={`/templates/${template.id}`}
              aria-label={
                copy.previewStarterTemplate?.(template.name) ??
                `Preview ${template.name}`
              }
            >
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            type="submit"
            size="icon"
            aria-label={copy.useStarterTemplate ?? "Use starter template"}
          >
            <FilePlus2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}
