import { ArrowLeft, ArrowRight, FilePlus2, PackageOpen } from "lucide-react";
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
import type { TemplateCollectionResult } from "@/features/templates/template-collections";
import {
  formatTemplateLabel,
  TemplateCatalogPreview,
} from "@/features/templates/template-catalog-preview";

type ServerAction = (formData: FormData) => Promise<void> | void;

type TemplateCollectionDetailProps = {
  result: TemplateCollectionResult;
  createFromCatalogTemplateAction: ServerAction;
};

export function TemplateCollectionDetail({
  result,
  createFromCatalogTemplateAction,
}: TemplateCollectionDetailProps) {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
        <Button asChild variant="ghost" className="w-fit">
          <Link href="/designs">
            <ArrowLeft className="h-4 w-4" />
            Back to templates
          </Link>
        </Button>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <PackageOpen className="h-5 w-5 text-muted-foreground" />
              <Badge variant="secondary">Starter pack</Badge>
              <Badge variant="outline">{result.templates.length} templates</Badge>
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-normal">
                {result.collection.name}
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                {result.collection.description}
              </p>
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {result.collection.intent}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.formats.map((format) => (
                <Badge key={format} variant="outline">
                  {formatTemplateLabel(format)}
                </Badge>
              ))}
              {result.collection.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>How to use this pack</CardTitle>
              <CardDescription>
                Start with the first layout, then create the supporting pieces as
                the campaign takes shape.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. Create the kickoff template.</p>
              <p>2. Open each related starter you need.</p>
              <p>3. Keep brand locks intact and edit the content layers.</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {result.templates.map((template) => (
            <form
              key={template.id}
              action={createFromCatalogTemplateAction}
              className="overflow-hidden rounded-md border border-border bg-card"
            >
              <input type="hidden" name="catalogTemplateId" value={template.id} />
              <TemplateCatalogPreview template={template} />
              <div className="space-y-3 p-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="min-w-0 flex-1 truncate text-sm font-medium">
                      {template.name}
                    </h2>
                    <Badge variant="secondary">
                      {formatTemplateLabel(template.format)}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {template.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">{template.category}</Badge>
                    <Badge variant="outline">{template.platform}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    name="name"
                    placeholder={`${template.name} project`}
                    aria-label={`New design name from ${template.name}`}
                  />
                  <Button asChild variant="outline" size="icon">
                    <Link
                      href={`/templates/${template.id}`}
                      aria-label={`Preview ${template.name}`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    type="submit"
                    size="icon"
                    aria-label={`Use ${template.name}`}
                  >
                    <FilePlus2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </form>
          ))}
        </section>
      </div>
    </main>
  );
}
