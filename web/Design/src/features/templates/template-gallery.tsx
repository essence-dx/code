"use client";

import { FilePlus2, Search } from "lucide-react";
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
import type { EditorLocale } from "@/features/editor/editor-localization";
import type { DesignTemplateSummary } from "@/features/editor/types";
import {
  approvalStatusLabels,
  approvalStatuses,
  getApprovalStatusBadgeVariant,
} from "@/features/review/approval-status";
import { TemplateCollectionSection } from "@/features/templates/template-collection-section";
import { TemplateCatalogSection } from "@/features/templates/template-catalog-section";
import { getTemplateGalleryCopy } from "@/features/templates/template-gallery-localization";
import { TemplateMarketplaceDiscoveryPanel } from "@/features/templates/template-marketplace-discovery-panel";
import { TemplateMarketplaceGrowthPanel } from "@/features/templates/template-marketplace-growth-panel";

type TemplateGalleryProps = {
  locale: EditorLocale;
  templates: DesignTemplateSummary[];
  createFromCatalogTemplateAction: (formData: FormData) => void;
  createFromTemplateAction: (formData: FormData) => void;
  updateApprovalStatusAction: (formData: FormData) => void;
};

type TemplateShapeFilter = "all" | "square" | "wide" | "tall";
type TemplateKindFilter = "all" | "brand" | "standard" | "team";

export function TemplateGallery({
  locale,
  templates,
  createFromCatalogTemplateAction,
  createFromTemplateAction,
  updateApprovalStatusAction,
}: TemplateGalleryProps) {
  const [query, setQuery] = useState("");
  const [shape, setShape] = useState<TemplateShapeFilter>("all");
  const [kind, setKind] = useState<TemplateKindFilter>("all");
  const copy = getTemplateGalleryCopy(locale);

  const visibleTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return templates.filter((template) => {
      const matchesQuery =
        !normalizedQuery ||
        template.name.toLowerCase().includes(normalizedQuery) ||
        `${template.width} x ${template.height}`.includes(normalizedQuery);
      const matchesShape =
        shape === "all" || getTemplateShape(template) === shape;
      const matchesKind =
        kind === "all" ||
        (kind === "brand" && template.isBrandTemplate) ||
        (kind === "team" && template.isTeamTemplate) ||
        (kind === "standard" &&
          !template.isBrandTemplate &&
          !template.isTeamTemplate);

      return matchesQuery && matchesShape && matchesKind;
    });
  }, [kind, query, shape, templates]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{copy.title}</h2>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-52 pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.search}
              aria-label={copy.search}
            />
          </div>
          <Select
            value={shape}
            onValueChange={(value) => setShape(value as TemplateShapeFilter)}
          >
            <SelectTrigger className="w-32" aria-label={copy.filterTemplates}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.allSizes}</SelectItem>
              <SelectItem value="square">{copy.square}</SelectItem>
              <SelectItem value="wide">{copy.wide}</SelectItem>
              <SelectItem value="tall">{copy.tall}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={kind}
            onValueChange={(value) => setKind(value as TemplateKindFilter)}
          >
            <SelectTrigger
              className="w-36"
              aria-label={copy.filterTemplateKind}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.allTypes}</SelectItem>
              <SelectItem value="brand">{copy.brand}</SelectItem>
              <SelectItem value="team">{copy.team}</SelectItem>
              <SelectItem value="standard">{copy.standard}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <TemplateCollectionSection
        query={query}
        copy={copy}
        createFromCatalogTemplateAction={createFromCatalogTemplateAction}
      />

      <TemplateCatalogSection
        query={query}
        copy={copy}
        createFromCatalogTemplateAction={createFromCatalogTemplateAction}
      />

      <TemplateMarketplaceDiscoveryPanel
        templates={templates}
        createFromTemplateAction={createFromTemplateAction}
      />

      <TemplateMarketplaceGrowthPanel
        templates={templates}
        createFromTemplateAction={createFromTemplateAction}
      />

      <div>
        <h3 className="text-sm font-semibold">
          {copy.savedTemplates ?? "Saved templates"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {copy.savedTemplatesDescription ??
            "Brand, team, and personal templates saved from the editor."}
        </p>
      </div>

      {visibleTemplates.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleTemplates.map((template) => (
            <article
              key={template.id}
              className="overflow-hidden rounded-md border border-border bg-card"
            >
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
                    {copy.noThumbnail}
                  </div>
                )}
              </div>
              <div className="space-y-3 p-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-medium">
                      {template.name}
                    </h3>
                    <Badge
                      variant={getApprovalStatusBadgeVariant(
                        template.approvalStatus,
                      )}
                    >
                      {approvalStatusLabels[template.approvalStatus]}
                    </Badge>
                    {template.isBrandTemplate ? (
                      <Badge variant="secondary">{copy.brand}</Badge>
                    ) : null}
                    {template.isTeamTemplate ? (
                      <Badge variant="outline">{copy.team}</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {template.width} x {template.height}
                  </p>
                </div>
                <form
                  action={updateApprovalStatusAction}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="subject" value="template" />
                  <input type="hidden" name="templateId" value={template.id} />
                  <Select
                    name="approvalStatus"
                    defaultValue={template.approvalStatus}
                  >
                    <SelectTrigger
                      className="h-9 min-w-0 flex-1"
                      aria-label={`Approval status for ${template.name}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {approvalStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {approvalStatusLabels[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="submit" variant="outline" size="sm">
                    Save
                  </Button>
                </form>
                <form action={createFromTemplateAction} className="flex gap-2">
                  <input type="hidden" name="templateId" value={template.id} />
                  <Input
                    name="name"
                    placeholder={copy.templateCopyPlaceholder(template.name)}
                    aria-label={copy.newDesignNameFromTemplate(template.name)}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    aria-label={copy.useTemplate}
                  >
                    <FilePlus2 className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
          {copy.empty}
        </div>
      )}
    </section>
  );
}

function getTemplateShape(
  template: DesignTemplateSummary,
): Exclude<TemplateShapeFilter, "all"> {
  const ratio = template.width / template.height;

  if (ratio > 1.15) return "wide";
  if (ratio < 0.85) return "tall";

  return "square";
}
