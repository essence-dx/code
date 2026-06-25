"use client";

import { useMemo } from "react";
import Link from "next/link";
import { GitBranch, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProjectSummary } from "@/features/editor/types";
import { buildProjectDerivativeGroups } from "@/features/projects/project-derivatives";

type ServerAction = (formData: FormData) => Promise<void> | void;

type ProjectDerivativeBoardProps = {
  projects: ProjectSummary[];
  refreshVariantAction: ServerAction;
};

export function ProjectDerivativeBoard({
  projects,
  refreshVariantAction,
}: ProjectDerivativeBoardProps) {
  const groups = useMemo(() => buildProjectDerivativeGroups(projects), [projects]);

  if (!groups.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <GitBranch className="h-5 w-5" />
            Derivative boards
          </h2>
          <p className="text-sm text-muted-foreground">
            Review source designs, resized variants, and source metadata drift.
          </p>
        </div>
        <Badge variant="secondary">{groups.length} families</Badge>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {groups.map((group) => (
          <article
            key={group.sourceProjectId}
            className="rounded-md border border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Source
                </p>
                {group.source ? (
                  <Link
                    href={`/editor/${group.source.id}`}
                    className="block truncate text-sm font-semibold hover:underline"
                  >
                    {group.source.name}
                  </Link>
                ) : (
                  <p className="truncate text-sm font-semibold">
                    Missing or trashed source
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {group.source
                    ? `${group.source.width} x ${group.source.height}`
                    : group.sourceProjectId}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Badge variant="outline">{group.variants.length} variants</Badge>
                {group.needsReviewCount ? (
                  <Badge variant="destructive">
                    {group.needsReviewCount} need review
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {group.variants.map(({ project, sourceUpdatedAfterVariant }) => (
                <div
                  key={project.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/editor/${project.id}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {project.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {project.variantName ?? "Variant"} / {project.width} x{" "}
                      {project.height}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {sourceUpdatedAfterVariant ? (
                      <Badge variant="outline">Source changed</Badge>
                    ) : (
                      <Badge variant="secondary">Current metadata</Badge>
                    )}
                    <form action={refreshVariantAction}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        disabled={!group.source}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
