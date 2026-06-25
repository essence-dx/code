import { ArrowLeft, FilePlus2, Layers3, Lock, ShieldCheck } from "lucide-react";
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
import type { TemplateCatalogItem } from "@/features/templates/template-catalog";
import {
  formatTemplateLabel,
  TemplateCatalogPreview,
} from "@/features/templates/template-catalog-preview";
import { createTemplateCatalogDocument } from "@/features/templates/template-catalog-documents";
import { getTemplateCollectionsForTemplate } from "@/features/templates/template-collections";
import { TemplateRemixPanel } from "@/features/templates/template-remix-panel";

type ServerAction = (formData: FormData) => Promise<void> | void;

type TemplateCatalogDetailProps = {
  template: TemplateCatalogItem;
  relatedTemplates: TemplateCatalogItem[];
  createFromCatalogTemplateAction: ServerAction;
};

export function TemplateCatalogDetail({
  template,
  relatedTemplates,
  createFromCatalogTemplateAction,
}: TemplateCatalogDetailProps) {
  const lockSummary =
    createTemplateCatalogDocument(template).metadata?.templateLockSummary;
  const collections = getTemplateCollectionsForTemplate(template.id);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
        <Button asChild variant="ghost" className="w-fit">
          <Link href="/designs">
            <ArrowLeft className="h-4 w-4" />
            Back to templates
          </Link>
        </Button>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_420px]">
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <TemplateCatalogPreview template={template} size="hero" />
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {formatTemplateLabel(template.format)}
                </Badge>
                <Badge variant="outline">{template.category}</Badge>
                <Badge variant="outline">{template.platform}</Badge>
              </div>
              <CardTitle className="text-3xl">{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <TemplateMetadata label="Dimensions" value={`${template.width} x ${template.height}`} />
                <TemplateMetadata label="Industry" value={template.industry} />
                <TemplateMetadata label="Season" value={template.season} />
                <TemplateMetadata label="Format" value={formatTemplateLabel(template.format)} />
              </dl>

              <div className="space-y-2">
                <h2 className="text-sm font-semibold">Usage notes</h2>
                <p className="text-sm text-muted-foreground">
                  {template.usageNotes}
                </p>
              </div>

              <div className="rounded-md border border-border p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Asset provenance
                </div>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {template.assetProvenanceNotes.map((note) => (
                    <li key={note}>- {note}</li>
                  ))}
                </ul>
              </div>

              {lockSummary ? (
                <div className="rounded-md border border-border p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Template locks
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lockSummary.lockedElementCount} locked structure layers,{" "}
                    {lockSummary.editableElementCount} editable content layers.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {lockSummary.rules.map((rule) => (
                      <Badge key={rule} variant="outline">
                        {rule}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-1.5">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {collections.length ? (
                <div className="space-y-2">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Layers3 className="h-4 w-4 text-muted-foreground" />
                    Starter packs
                  </h2>
                  <div className="grid gap-2">
                    {collections.map((collection) => (
                      <Button
                        key={collection.id}
                        asChild
                        variant="outline"
                        className="justify-start"
                      >
                        <Link href={`/templates/collections/${collection.id}`}>
                          {collection.name}
                        </Link>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              <form
                action={createFromCatalogTemplateAction}
                className="grid gap-2 sm:grid-cols-[1fr_auto]"
              >
                <input
                  type="hidden"
                  name="catalogTemplateId"
                  value={template.id}
                />
                <Input
                  name="name"
                  placeholder={`${template.name} project`}
                  aria-label={`New design name from ${template.name}`}
                />
                <Button type="submit">
                  <FilePlus2 className="h-4 w-4" />
                  Use template
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <TemplateRemixPanel
          template={template}
          createFromCatalogTemplateAction={createFromCatalogTemplateAction}
        />

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Related templates</h2>
            <p className="text-sm text-muted-foreground">
              Starters with matching format, category, industry, platform, or tags.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {relatedTemplates.map((item) => (
              <Link
                key={item.id}
                href={`/templates/${item.id}`}
                className="overflow-hidden rounded-md border border-border bg-card transition-colors hover:bg-muted/40"
              >
                <TemplateCatalogPreview template={item} />
                <div className="space-y-2 p-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">
                      {formatTemplateLabel(item.format)}
                    </Badge>
                    <Badge variant="outline">{item.category}</Badge>
                  </div>
                  <h3 className="truncate text-sm font-medium">{item.name}</h3>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function TemplateMetadata({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
