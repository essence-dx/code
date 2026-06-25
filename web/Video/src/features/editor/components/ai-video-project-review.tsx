"use client";

import { useState } from "react";
import { Clapperboard, FolderOpen, ImagePlus, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageResponse } from "@/components/ai-elements/message";
import type { VideoProjectOutput } from "@/features/editor/components/ai-result-types";

export interface VideoProjectSaveSummary {
  projectId: string;
  title: string;
  layerCount: number;
  duration: number;
  generatedSceneImageCount?: number;
  failedSceneImageCount?: number;
  generatedSceneVideoCount?: number;
  failedSceneVideoCount?: number;
}

export interface VideoProjectSaveOptions {
  sceneMediaMode?: "stock" | "generated-images" | "generated-videos";
  sceneImageMode?: "stock" | "generated";
}

interface AiVideoProjectReviewProps {
  output: VideoProjectOutput;
  onSaveVideoProject?: (output: VideoProjectOutput, options?: VideoProjectSaveOptions) => Promise<VideoProjectSaveSummary>;
  sceneVideoConfigured?: boolean;
  sceneVideoStatusLabel?: string;
}

export function AiVideoProjectReview({ output, onSaveVideoProject, sceneVideoConfigured = false, sceneVideoStatusLabel }: AiVideoProjectReviewProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function saveVideoProject(options?: VideoProjectSaveOptions) {
    if (!onSaveVideoProject || isSaving) return;

    setIsSaving(true);
    setSaveMessage(null);
    try {
      const summary = await onSaveVideoProject(output, options);
      const sceneImages =
        summary.generatedSceneImageCount && summary.generatedSceneImageCount > 0
          ? ` ${summary.generatedSceneImageCount} generated scene image${summary.generatedSceneImageCount === 1 ? "" : "s"} placed.`
          : "";
      const failedImages =
        summary.failedSceneImageCount && summary.failedSceneImageCount > 0
          ? ` ${summary.failedSceneImageCount} scene image${summary.failedSceneImageCount === 1 ? "" : "s"} could not be generated.`
          : "";
      const sceneVideos =
        summary.generatedSceneVideoCount && summary.generatedSceneVideoCount > 0
          ? ` ${summary.generatedSceneVideoCount} generated scene video${summary.generatedSceneVideoCount === 1 ? "" : "s"} placed.`
          : "";
      const failedVideos =
        summary.failedSceneVideoCount && summary.failedSceneVideoCount > 0
          ? ` ${summary.failedSceneVideoCount} scene video${summary.failedSceneVideoCount === 1 ? "" : "s"} could not be generated.`
          : "";
      setSaveMessage(`${summary.title} opened with ${summary.layerCount} layers across ${summary.duration.toFixed(1)}s.${sceneImages}${failedImages}${sceneVideos}${failedVideos}`);
    } catch {
      setSaveMessage(saveErrorMessage(options));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-background p-3 text-sm">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Clapperboard className="size-4" />
          Generated project
        </div>
        <div className="space-y-3">
          <div>
            <div className="font-medium">{output.title}</div>
            <MessageResponse>{output.summary}</MessageResponse>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{output.aspectRatio}</Badge>
            <Badge variant="outline">{output.exportPreset}</Badge>
            <Badge variant="outline">{output.scenes.length} scenes</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void saveVideoProject({ sceneMediaMode: "stock" })} disabled={!onSaveVideoProject || isSaving}>
              <FolderOpen className="size-4" />
              {isSaving ? "Creating..." : "Create and open project"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void saveVideoProject({ sceneMediaMode: "generated-images" })} disabled={!onSaveVideoProject || isSaving}>
              <ImagePlus className="size-4" />
              AI scene images
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void saveVideoProject({ sceneMediaMode: "generated-videos" })}
              disabled={!onSaveVideoProject || isSaving || !sceneVideoConfigured}
              title={sceneVideoStatusLabel ?? "Connect a scene video service to generate scene clips."}
            >
              <Video className="size-4" />
              AI scene videos
            </Button>
          </div>
          {!sceneVideoConfigured ? <p className="text-xs text-muted-foreground">{sceneVideoStatusLabel ?? "Connect a scene video service to generate scene clips."}</p> : null}
          {saveMessage ? <p className="text-xs text-muted-foreground">{saveMessage}</p> : null}
        </div>
      </div>
      {output.scenes.map((scene, index) => (
        <div key={`${scene.title}-${index}`} className="rounded-md border border-border bg-background p-3 text-sm">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="mr-auto text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {index + 1}. {scene.title}
            </div>
            <Badge variant="secondary">{scene.duration.toFixed(1)}s</Badge>
            {scene.brollQuery ? <Badge variant="outline">B-roll: {scene.brollQuery}</Badge> : null}
          </div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-6 w-10 rounded-sm border border-border" style={{ background: scene.backgroundColor }} />
            <span className="h-6 w-10 rounded-sm border border-border" style={{ background: scene.accentColor }} />
          </div>
          <MessageResponse>{[scene.headline, scene.caption, scene.visualPrompt].join("\n\n")}</MessageResponse>
        </div>
      ))}
      {output.notes.length ? (
        <div className="rounded-md border border-border bg-background p-3 text-sm">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Production notes</div>
          <MessageResponse>{output.notes.join("\n")}</MessageResponse>
        </div>
      ) : null}
    </div>
  );
}

function saveErrorMessage(options?: VideoProjectSaveOptions) {
  const mode = options?.sceneMediaMode ?? (options?.sceneImageMode === "generated" ? "generated-images" : "stock");
  if (mode === "generated-videos") return "AI scene videos could not be generated for this project.";
  if (mode === "generated-images") return "AI scene images could not be generated for this project.";
  return "Generated project could not be saved locally.";
}
