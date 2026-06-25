import { FilePlus2, RefreshCcw, ShieldCheck, Sparkles } from "lucide-react";

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
import { formatTemplateLabel } from "@/features/templates/template-catalog-preview";
import { createTemplateRemixOptions } from "@/features/templates/template-remix";

type ServerAction = (formData: FormData) => Promise<void> | void;

type TemplateRemixPanelProps = {
  template: TemplateCatalogItem;
  createFromCatalogTemplateAction: ServerAction;
};

export function TemplateRemixPanel({
  template,
  createFromCatalogTemplateAction,
}: TemplateRemixPanelProps) {
  const options = createTemplateRemixOptions(template);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <RefreshCcw className="h-3.5 w-3.5" />
            Remix workflows
          </Badge>
          <Badge variant="outline">
            <ShieldCheck className="h-3.5 w-3.5" />
            Lock-safe
          </Badge>
        </div>
        <CardTitle>Brand-safe remix options</CardTitle>
        <CardDescription>
          Swap output format, visual theme, and content slots while keeping
          protected structure locked.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {options.map((option) => (
          <form
            key={option.id}
            action={createFromCatalogTemplateAction}
            className="space-y-3 rounded-md border border-border p-3"
          >
            <input type="hidden" name="catalogTemplateId" value={template.id} />
            <input
              type="hidden"
              name="remixProfileId"
              value={option.profile.id}
            />
            <input
              type="hidden"
              name="remixThemeId"
              value={option.theme.id}
            />
            <input
              type="hidden"
              name="remixContentPackId"
              value={option.contentPack.id}
            />

            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">
                  {formatTemplateLabel(option.outputFormat)}
                </Badge>
                <Badge variant="outline">
                  {option.width} x {option.height}
                </Badge>
                <Badge variant="outline">{option.theme.label}</Badge>
              </div>
              <div>
                <h3 className="text-sm font-semibold">{option.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {option.description}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <RemixStat
                  label="Locked"
                  value={option.lockSummary?.lockedElementCount ?? 0}
                />
                <RemixStat
                  label="Editable"
                  value={option.lockSummary?.editableElementCount ?? 0}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                name="name"
                placeholder={`${option.contentPack.headline} project`}
                aria-label={`New remixed design name for ${option.label}`}
              />
              <Button type="submit">
                <Sparkles className="h-4 w-4" />
                Remix
              </Button>
            </div>
          </form>
        ))}
      </CardContent>
    </Card>
  );
}

function RemixStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1 font-medium text-foreground">
        <FilePlus2 className="h-3.5 w-3.5 text-muted-foreground" />
        {value}
      </p>
    </div>
  );
}
