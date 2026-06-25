"use client";

import { DownloadCloud, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CloudProjectVersionDialog } from "@/features/dashboard/components/cloud-project-version-dialog";
import { DashboardMessageView } from "@/features/dashboard/components/dashboard-message-view";
import { ProjectReviewBadge } from "@/features/dashboard/components/project-library-badges";
import type { DashboardCloudLibrary } from "@/features/dashboard/hooks/use-dashboard-cloud-library";

type SignedInProjectLibraryCardProps = {
  library: DashboardCloudLibrary;
};

export function SignedInProjectLibraryCard({ library }: SignedInProjectLibraryCardProps) {
  const {
    canUseOnlineLibrary,
    cloudProjects,
    isCloudActionPending,
    pullCloudProject,
    refreshCloudProjects,
    removeCloudProject,
    saveCloudMetadataLocally,
    setSyncMessage,
    syncMessage,
  } = library;

  return (
    <Card className="shadow-none">
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg">Signed-in project library</CardTitle>
        <Button size="sm" variant="outline" onClick={refreshCloudProjects} disabled={!canUseOnlineLibrary || isCloudActionPending}>
          <DownloadCloud className="size-4" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {syncMessage ? <DashboardMessageView message={syncMessage} /> : null}
        {cloudProjects.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
            {canUseOnlineLibrary
              ? "Sign in, sync a project, then refresh to see saved project metadata here."
              : "Signed-in library is unavailable in this desktop build."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Ratio</TableHead>
                <TableHead>Layers</TableHead>
                <TableHead>Media metadata</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[170px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cloudProjects.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>{item.aspectRatio}</TableCell>
                  <TableCell>{item.layerCount}</TableCell>
                  <TableCell>{item.mediaCount}</TableCell>
                  <TableCell>{item.reviewSummary ? <ProjectReviewBadge summary={item.reviewSummary} /> : <Badge variant="outline">Unknown</Badge>}</TableCell>
                  <TableCell>{new Date(item.updatedAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => pullCloudProject(item.id)} disabled={isCloudActionPending}>
                        Open
                      </Button>
                      <CloudProjectVersionDialog
                        project={item}
                        disabled={isCloudActionPending}
                        onMessage={setSyncMessage}
                        onRestored={refreshCloudProjects}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => saveCloudMetadataLocally(item)}
                        disabled={isCloudActionPending}
                        aria-label={`Save ${item.title} metadata locally`}
                      >
                        <DownloadCloud className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeCloudProject(item.id)}
                        disabled={isCloudActionPending}
                        aria-label={`Delete ${item.title} from cloud`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
