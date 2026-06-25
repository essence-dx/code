import { LayoutTemplate, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createSavedTemplateWorkbookAction,
  createTemplateWorkbookAction,
} from "@/features/workbooks/actions";
import { workbookTemplates } from "@/features/workbooks/templates";
import type { WorkbookSummary } from "@/features/workbooks/types";

export function TemplateGallery({ customTemplates }: { customTemplates: WorkbookSummary[] }) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Templates</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {workbookTemplates.map((template) => (
            <form
              key={template.id}
              action={createTemplateWorkbookAction}
              className="rounded-lg border bg-card p-4"
            >
              <input type="hidden" name="templateId" value={template.id} />
              <div className="min-h-24 space-y-2">
                <h3 className="font-medium">{template.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {template.description}
                </p>
              </div>
              <Button type="submit" variant="outline" className="mt-3 w-full">
                <Plus />
                Use
              </Button>
            </form>
          ))}
        </div>
      </section>

      {customTemplates.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Custom templates</h2>
            </div>
            <Badge variant="secondary" className="font-mono">
              {customTemplates.length}
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {customTemplates.map((template) => (
              <form
                key={template.id}
                action={createSavedTemplateWorkbookAction}
                className="rounded-lg border bg-card p-4"
              >
                <input type="hidden" name="workbookId" value={template.id} />
                <div className="min-h-24 space-y-2">
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {template.description || "Create a workbook from this saved template."}
                  </p>
                </div>
                <Button type="submit" variant="outline" className="mt-3 w-full">
                  <Plus />
                  Use
                </Button>
              </form>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
