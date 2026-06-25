"use client";

import Link from "next/link";
import { Cloud, FolderPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProjectReviewBadge } from "@/features/dashboard/components/project-library-badges";
import { aspectPresets } from "@/lib/editor/presets";
import { createProjectReviewSummary } from "@/lib/editor/project-review-summary";
import type { EditorProject } from "@/lib/editor/types";

type CurrentProjectCardProps = {
  project: EditorProject;
  canUseOnlineLibrary: boolean;
  isCloudActionPending: boolean;
  isLibraryActionPending: boolean;
  onCreatePresetProject: (title: string, aspectRatio: string) => void | Promise<void>;
  onSyncCurrentProject: () => void | Promise<void>;
};

export function CurrentProjectCard({
  project,
  canUseOnlineLibrary,
  isCloudActionPending,
  isLibraryActionPending,
  onCreatePresetProject,
  onSyncCurrentProject,
}: CurrentProjectCardProps) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">Current project</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">{project.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {project.layers.length} layers / {project.duration}s / {project.aspectRatio}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ProjectReviewBadge summary={createProjectReviewSummary(project)} />
              <Badge variant="secondary">Autosaved</Badge>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/editor">Continue</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={onSyncCurrentProject} disabled={!canUseOnlineLibrary || isCloudActionPending}>
              <Cloud className="size-4" />
              Sync current
            </Button>
            {aspectPresets.map((preset) => (
              <Button
                key={preset.id}
                size="sm"
                variant="outline"
                onClick={() => onCreatePresetProject(`${preset.label} project`, preset.id)}
                disabled={isLibraryActionPending}
              >
                <FolderPlus className="size-4" />
                {preset.id}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
