"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Captions,
  Clapperboard,
  ClipboardList,
  Eraser,
  FileText,
  ImagePlus,
  Languages,
  Loader2,
  Mic2,
  Paintbrush,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Video,
  WandSparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  AiAudioCleanupControls,
  type AudioCleanupEngine,
  type AiAudioCleanupPreview,
} from "@/features/editor/components/ai-audio-cleanup-controls";
import { AiImageEditControls } from "@/features/editor/components/ai-image-edit-controls";
import { AiResultView } from "@/features/editor/components/ai-result-view";
import { AiVideoEnhancementControls } from "@/features/editor/components/ai-video-enhancement-controls";
import type { VideoProjectSaveOptions } from "@/features/editor/components/ai-video-project-review";
import {
  fetchAudioRestorationStatus,
  fileFromAudioRestorationOutput,
  restoreAudioWithConnectedService,
  type AudioRestorationStatus,
} from "@/features/editor/lib/audio-restoration-client";
import {
  enhanceVideoWithConnectedService,
  fetchVideoEnhancementStatus,
  fileFromVideoEnhancementOutput,
  type VideoEnhancementStatus,
} from "@/features/editor/lib/video-enhancement-client";
import {
  fetchSceneVideoGenerationStatus,
  fileFromSceneVideoOutput,
  generateSceneVideoWithConnectedService,
  type SceneVideoGenerationStatus,
} from "@/features/editor/lib/scene-video-generation-client";
import {
  isCaptionOutput,
  isGeneratedImageOutput,
  isSubtitleStyleOutput,
  type AiResult,
  type BrollSuggestion,
  type CaptionChunk,
  type GeneratedImageOutput,
  type RepurposeClipSuggestion,
  type SubtitleStyleOutput,
  type VideoProjectOutput,
} from "@/features/editor/components/ai-result-types";
import { useEditorStore } from "@/features/editor/state/editor-store";
import type { AiAction, AiImageEditMode, AiImageOutpaintPreset } from "@/lib/ai/schemas";
import { videoEnhancementStrength, type VideoEnhancementMode } from "@/lib/ai/video-enhancement-contract";
import { AudioCleanupError, createCleanedAudioFile, type AudioCleanupResult } from "@/lib/audio/cleanup";
import type { AudioCleanupMode } from "@/lib/audio/cleanup-contract";
import { createTimelineCleanupCutOutput } from "@/lib/editor/cleanup-cuts";
import { AiSourceIngestError, createVideoProjectPromptFromSource, readAiSourceBrief } from "@/lib/ai/source-ingest";
import { createAiVideoProject } from "@/lib/editor/ai-video-project";
import { addAiVideoSceneMediaLayer, createAiVideoSceneMediaSlots } from "@/lib/editor/ai-video-media-placement";
import { createAiVideoSceneImageSlots } from "@/lib/editor/ai-video-scene-images";
import { createAiVideoSceneVideoSlots } from "@/lib/editor/ai-video-scene-videos";
import { formatTime } from "@/lib/editor/factory";
import { createStockMediaAttribution } from "@/lib/editor/media-attribution";
import { createRepurposeClipProjectVariants } from "@/lib/editor/project-variants";
import type { MediaAsset, TimelineLayer } from "@/lib/editor/types";
import { loadBrowserMediaBlob, saveBrowserMedia } from "@/lib/media/browser-media-store";
import { decodeBase64ImagePayload, isValidBase64ImagePayload, normalizeBase64ImageData } from "@/lib/media/base64-image";
import { activeImageObjectMaskCount, renderImageObjectMaskBlob } from "@/lib/media/image-edit-mask";
import { removeImageBackgroundLocally } from "@/lib/media/local-background-removal";
import { loadTauriMediaBlob } from "@/lib/media/tauri-media";
import { saveLocalProject } from "@/lib/projects/local-project-store";
import { assertClientApiRuntime, clientApiUrl, isClientApiUnavailableError, useHasClientApiRuntime } from "@/lib/runtime/client-api";
import type { StockAsset } from "@/lib/stock/stock-assets";

const actions: Array<{ id: AiAction; label: string; icon: ReactNode }> = [
  { id: "script", label: "Script", icon: <Sparkles className="size-4" /> },
  { id: "captions", label: "Captions", icon: <Captions className="size-4" /> },
  { id: "transcript-cleanup", label: "Clean", icon: <FileText className="size-4" /> },
  { id: "subtitle-translation", label: "Translate", icon: <Languages className="size-4" /> },
  { id: "smart-cut", label: "Cuts", icon: <Scissors className="size-4" /> },
  { id: "subtitle-style", label: "Style", icon: <Paintbrush className="size-4" /> },
  { id: "image", label: "Image", icon: <ImagePlus className="size-4" /> },
  { id: "image-edit", label: "Edit Img", icon: <Eraser className="size-4" /> },
  { id: "b-roll", label: "B-roll", icon: <Video className="size-4" /> },
  { id: "video-project", label: "Video", icon: <Clapperboard className="size-4" /> },
  { id: "repurpose", label: "Repurpose", icon: <WandSparkles className="size-4" /> },
  { id: "edit-plan", label: "Plan", icon: <ClipboardList className="size-4" /> },
];

type AiAssetImportMessage = {
  tone: "default" | "destructive";
  text: string;
};

type ImageEditSource = {
  filename: string;
  mediaType: string;
  base64: string;
};

type ImageEditMaskSource = {
  filename: string;
  mediaType: "image/png";
  base64: string;
};

type GeneratedSpeechOutput = {
  filename: string;
  mediaType: string;
  base64: string;
  format: string;
  text: string;
  voice: string;
  language: "en" | "ar";
  model: string;
  chunkCount?: number;
  warnings?: string[];
};

const VIDEO_PROJECT_IMAGE_SOURCE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function AiAssistantPanel() {
  const project = useEditorStore((state) => state.project);
  const mediaAssets = useEditorStore((state) => state.mediaAssets);
  const brandColors = useEditorStore((state) => state.brandColors);
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  const addMediaAsset = useEditorStore((state) => state.addMediaAsset);
  const addLayerFromAsset = useEditorStore((state) => state.addLayerFromAsset);
  const addAiCaptions = useEditorStore((state) => state.addAiCaptions);
  const applyTimelineCutRanges = useEditorStore((state) => state.applyTimelineCutRanges);
  const updateLayer = useEditorStore((state) => state.updateLayer);
  const loadProject = useEditorStore((state) => state.loadProject);
  const [prompt, setPrompt] = useState("");
  const [activeAction, setActiveAction] = useState<AiAction>("edit-plan");
  const [imageEditMode, setImageEditMode] = useState<AiImageEditMode>("cleanup");
  const [imageOutpaintPreset, setImageOutpaintPreset] = useState<AiImageOutpaintPreset>("project");
  const [imageTranslationLanguage, setImageTranslationLanguage] = useState("English");
  const [audioCleanupMode, setAudioCleanupMode] = useState<AudioCleanupMode>("noise-reduction");
  const [audioCleanupEngine, setAudioCleanupEngine] = useState<AudioCleanupEngine>("local");
  const [audioCleanupIntensity, setAudioCleanupIntensity] = useState(1);
  const [audioCleanupPreview, setAudioCleanupPreview] = useState<AiAudioCleanupPreview | null>(null);
  const [audioRestorationStatus, setAudioRestorationStatus] = useState<AudioRestorationStatus | null>(null);
  const [videoEnhancementMode, setVideoEnhancementMode] = useState<VideoEnhancementMode>("stabilization");
  const [videoEnhancementStrengthValue, setVideoEnhancementStrengthValue] = useState<number>(videoEnhancementStrength.defaultValue);
  const [videoEnhancementStatus, setVideoEnhancementStatus] = useState<VideoEnhancementStatus | null>(null);
  const [sceneVideoGenerationStatus, setSceneVideoGenerationStatus] = useState<SceneVideoGenerationStatus | null>(null);
  const [videoProjectSourceImage, setVideoProjectSourceImage] = useState<ImageEditSource | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isReadingSource, setIsReadingSource] = useState(false);
  const [isGeneratingVoiceover, setIsGeneratingVoiceover] = useState(false);
  const [isCleaningAudio, setIsCleaningAudio] = useState(false);
  const [isEnhancingVideo, setIsEnhancingVideo] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assetImportMessage, setAssetImportMessage] = useState<AiAssetImportMessage | null>(null);
  const sourceInputRef = useRef<HTMLInputElement | null>(null);
  const transcript = useMemo(() => projectTranscript(project.layers), [project.layers]);
  const transcriptionTarget = useMemo(
    () => findTranscriptionTarget(project.layers, mediaAssets, selectedLayerId),
    [mediaAssets, project.layers, selectedLayerId],
  );
  const imageEditTarget = useMemo(() => findImageEditTarget(project.layers, mediaAssets, selectedLayerId), [
    mediaAssets,
    project.layers,
    selectedLayerId,
  ]);
  const audioCleanupTarget = useMemo(
    () => findAudioCleanupTarget(project.layers, mediaAssets, selectedLayerId),
    [mediaAssets, project.layers, selectedLayerId],
  );
  const videoEnhancementTarget = useMemo(
    () => findVideoEnhancementTarget(project.layers, mediaAssets, selectedLayerId),
    [mediaAssets, project.layers, selectedLayerId],
  );
  const imageEditMaskCount = useMemo(() => activeImageObjectMaskCount(imageEditTarget?.layer), [imageEditTarget]);
  const canUseOnlineActions = useHasClientApiRuntime();
  const isBusy = isLoading || isTranscribing || isReadingSource || isGeneratingVoiceover || isCleaningAudio || isEnhancingVideo;
  const hasPromptForActiveAction = Boolean(prompt.trim()) || (activeAction === "image-edit" && imageEditMode === "background-removal");
  const canRunActiveAction =
    hasPromptForActiveAction &&
    (activeAction !== "image-edit" || (Boolean(imageEditTarget) && (imageEditMode !== "inpaint" || imageEditMaskCount > 0)));
  const canRunLocalBackgroundRemoval = activeAction === "image-edit" && imageEditMode === "background-removal" && Boolean(imageEditTarget);
  const canUseAudioRestorationService = Boolean(audioRestorationStatus?.configured);
  const canUseVideoEnhancementService = Boolean(videoEnhancementStatus?.configured);
  const canUseSceneVideoGenerationService = Boolean(sceneVideoGenerationStatus?.configured);

  useEffect(() => {
    if (!canUseOnlineActions) {
      setAudioRestorationStatus(null);
      return;
    }

    let isActive = true;
    void fetchAudioRestorationStatus().then((status) => {
      if (isActive) setAudioRestorationStatus(status);
    });

    return () => {
      isActive = false;
    };
  }, [canUseOnlineActions]);

  useEffect(() => {
    if (!canUseOnlineActions) {
      setVideoEnhancementStatus(null);
      return;
    }

    let isActive = true;
    void fetchVideoEnhancementStatus().then((status) => {
      if (isActive) setVideoEnhancementStatus(status);
    });

    return () => {
      isActive = false;
    };
  }, [canUseOnlineActions]);

  useEffect(() => {
    if (!canUseOnlineActions) {
      setSceneVideoGenerationStatus(null);
      return;
    }

    let isActive = true;
    void fetchSceneVideoGenerationStatus().then((status) => {
      if (isActive) setSceneVideoGenerationStatus(status);
    });

    return () => {
      isActive = false;
    };
  }, [canUseOnlineActions]);

  useEffect(() => {
    if (audioCleanupEngine === "service" && audioRestorationStatus?.configured === false) {
      setAudioCleanupEngine("local");
    }
  }, [audioCleanupEngine, audioRestorationStatus?.configured]);

  async function runAi(action = activeAction) {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setAssetImportMessage(null);
    setAudioCleanupPreview(null);

    try {
      if (action === "image-edit" && imageEditMode === "background-removal" && imageEditTarget && !canUseOnlineActions) {
        await runLocalImageBackgroundRemoval();
        return;
      }

      assertClientApiRuntime();
      const sourceImage =
        action === "image-edit"
          ? await prepareImageEditSource(imageEditTarget)
          : action === "video-project"
            ? (videoProjectSourceImage ?? undefined)
            : undefined;
      if (action === "image-edit" && !sourceImage) {
        setError("Select an image layer before running an AI image edit.");
        return;
      }
      const imageEdit =
        action === "image-edit"
          ? {
              mode: imageEditMode,
              outpaintPreset: imageOutpaintPreset,
              targetLanguage: imageEditMode === "translate" ? imageTranslationLanguage.trim() || "English" : undefined,
              mask:
                imageEditMode === "inpaint"
                  ? await prepareImageEditMaskSource(imageEditTarget?.layer ?? null, imageEditTarget?.asset ?? null)
                  : undefined,
            }
          : undefined;

      const response = await fetch(clientApiUrl("/api/ai/editor"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action,
          prompt,
          projectTitle: project.title,
          projectId: project.id,
          aspectRatio: project.aspectRatio,
          duration: project.duration,
          transcript,
          mediaBrief: projectMediaBrief(mediaAssets),
          brandColors,
          sourceImage,
          imageEdit,
        }),
      });
      const data = await readAiResponse(response);
      if (!response.ok || !isAiSuccess(data)) {
        if (action === "image-edit" && imageEditMode === "background-removal" && imageEditTarget && isImageProviderUnavailable(data)) {
          await runLocalImageBackgroundRemoval();
          return;
        }
        setError(aiAssistantFailureMessage(data));
        return;
      }

      setResult({ action, output: data.output });
      if (action === "captions" && isCaptionOutput(data.output)) {
        addAiCaptions(data.output.captions);
      }
      if (action === "subtitle-style" && isSubtitleStyleOutput(data.output)) {
        applySubtitleStyle(data.output);
      }
      if ((action === "image" || action === "image-edit") && isGeneratedImageOutput(data.output)) {
        await importGeneratedImages(data.output);
      }
    } catch (requestError) {
      setError(aiAssistantExceptionMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  async function importSourceForVideoProject(file: File | undefined) {
    if (!file) return;

    setIsReadingSource(true);
    setError(null);
    setAssetImportMessage(null);
    try {
      if (isVideoProjectImageSourceFile(file)) {
        const sourceImage = await prepareVideoProjectSourceImage(file);
        setActiveAction("video-project");
        setVideoProjectSourceImage(sourceImage);
        setPrompt(createVideoProjectPromptFromImageSource(file));
        setAssetImportMessage({
          tone: "default",
          text: `${file.name} attached for image-source video project generation.`,
        });
        return;
      }

      const brief = await readAiSourceBrief(file);
      setActiveAction("video-project");
      setVideoProjectSourceImage(null);
      setPrompt(createVideoProjectPromptFromSource(brief));
      setAssetImportMessage({
        tone: "default",
        text: brief.warning ? `${brief.filename} imported. ${brief.warning}` : `${brief.filename} imported for video project generation.`,
      });
    } catch (ingestError) {
      setError(ingestError instanceof AiSourceIngestError ? ingestError.message : "Source file could not be read.");
    } finally {
      setIsReadingSource(false);
      if (sourceInputRef.current) {
        sourceInputRef.current.value = "";
      }
    }
  }

  async function runAutoCaptions() {
    setIsTranscribing(true);
    setError(null);
    setResult(null);
    setAssetImportMessage(null);

    try {
      assertClientApiRuntime();
      if (!transcriptionTarget) {
        setError("Choose an audio or video layer before generating captions.");
        return;
      }

      const blob = await loadMediaAssetBlob(transcriptionTarget.asset);
      if (!blob) {
        setError("Reconnect this media file before generating captions.");
        return;
      }

      const formData = new FormData();
      formData.set(
        "file",
        new File([blob], transcriptionTarget.asset.name, {
          type: transcriptionTarget.asset.mimeType || blob.type || "application/octet-stream",
        }),
      );
      formData.set("projectId", project.id);
      if (prompt.trim()) {
        formData.set("prompt", prompt.trim());
      }

      const response = await fetch(clientApiUrl("/api/ai/transcribe"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await readAiResponse(response);
      if (!response.ok || !isAiTranscriptionSuccess(data)) {
        setError(aiAssistantFailureMessage(data));
        return;
      }

      const output = { captions: data.output.captions };
      setResult({ action: "captions", output });
      addAiCaptions(output.captions);
      setAssetImportMessage({
        tone: "default",
        text: `${output.captions.length} captions generated from ${transcriptionTarget.asset.name}.`,
      });
    } catch (requestError) {
      setError(aiAssistantExceptionMessage(requestError));
    } finally {
      setIsTranscribing(false);
    }
  }

  async function runVoiceover() {
    setIsGeneratingVoiceover(true);
    setError(null);
    setResult(null);
    setAssetImportMessage(null);

    try {
      assertClientApiRuntime();
      const text = prompt.trim();
      if (!text) {
        setError("Write a short voiceover script before generating audio.");
        return;
      }

      const response = await fetch(clientApiUrl("/api/ai/speech"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          text,
          projectId: project.id,
          language: "auto",
          outputFormat: "wav",
        }),
      });
      const data = await readAiResponse(response);
      if (!response.ok || !isAiSpeechSuccess(data)) {
        setError(aiAssistantFailureMessage(data));
        return;
      }

      const file = fileFromGeneratedSpeech(data.output);
      const asset = await saveBrowserMedia(file);
      addMediaAsset(asset);
      addLayerFromAsset(asset.id);
      const chunkNote = data.output.chunkCount && data.output.chunkCount > 1 ? ` from ${data.output.chunkCount} generated speech chunks` : "";
      setAssetImportMessage({
        tone: "default",
        text: `${asset.name} added as a voiceover audio layer${chunkNote}.`,
      });
    } catch (requestError) {
      setError(aiAssistantExceptionMessage(requestError));
    } finally {
      setIsGeneratingVoiceover(false);
    }
  }

  async function runAudioCleanup() {
    setIsCleaningAudio(true);
    setError(null);
    setResult(null);
    setAssetImportMessage(null);
    setAudioCleanupPreview(null);

    try {
      if (!audioCleanupTarget) {
        setError("Choose an audio layer before cleaning audio.");
        return;
      }

      const sourceBlob = await loadMediaAssetBlob(audioCleanupTarget.asset);
      if (!sourceBlob) {
        setError("Reconnect this audio file before cleaning audio.");
        return;
      }

      if (audioCleanupEngine === "service") {
        await runConnectedAudioRestoration(sourceBlob, audioCleanupTarget);
        return;
      }

      const cleanup = await createCleanedAudioFile(sourceBlob, {
        filename: audioCleanupTarget.asset.name,
        mode: audioCleanupMode,
        intensity: audioCleanupIntensity,
      });
      const asset = await saveBrowserMedia(cleanup.file);
      addMediaAsset(asset);
      const layerId = addLayerFromAsset(asset.id, {
        start: audioCleanupTarget.layer?.start ?? 0,
        duration: audioCleanupTarget.layer?.duration ?? asset.duration ?? audioCleanupTarget.asset.duration ?? 5,
        name: `${audioCleanupTarget.asset.name} cleaned`,
        notes: cleanup.summary,
      });

      await recordAudioCleanupGeneration(cleanup, {
        projectId: project.id,
        sourceAssetName: audioCleanupTarget.asset.name,
        outputAssetName: asset.name,
        duration: asset.duration ?? audioCleanupTarget.asset.duration,
      });
      setAudioCleanupPreview({
        sourceAsset: audioCleanupTarget.asset,
        cleanedAsset: asset,
        cleanup,
      });

      setAssetImportMessage({
        tone: layerId ? "default" : "destructive",
        text: layerId ? `${asset.name} saved as a cleaned audio layer. ${cleanup.summary}` : `${asset.name} was saved, but the layer could not be added.`,
      });
    } catch (requestError) {
      setError(aiAssistantExceptionMessage(requestError));
    } finally {
      setIsCleaningAudio(false);
    }
  }

  async function runConnectedAudioRestoration(sourceBlob: Blob, target: { asset: MediaAsset; layer: TimelineLayer | null }) {
    assertClientApiRuntime();
    if (!canUseAudioRestorationService) {
      setError("Connect an advanced audio restoration service before using this mode.");
      return;
    }

    const result = await restoreAudioWithConnectedService({
      sourceBlob,
      sourceAssetName: target.asset.name,
      sourceMediaType: target.asset.mimeType,
      projectId: project.id,
      mode: audioCleanupMode,
      intensity: audioCleanupIntensity,
    });
    if (!result.ok) {
      setError(result.reason);
      return;
    }

    const file = fileFromAudioRestorationOutput(result.output);
    const asset = await saveBrowserMedia(file);
    addMediaAsset(asset);
    const layerId = addLayerFromAsset(asset.id, {
      start: target.layer?.start ?? 0,
      duration: target.layer?.duration ?? asset.duration ?? target.asset.duration ?? 5,
      name: `${target.asset.name} restored`,
      notes: result.output.summary,
    });

    setAudioCleanupPreview({
      sourceAsset: target.asset,
      cleanedAsset: asset,
      cleanup: {
        adapter: result.output.model,
        mode: result.output.mode,
        intensity: result.output.intensity,
        profileLabel: "Advanced restoration",
        summary: result.output.summary,
      },
    });

    const warnings = result.output.warnings?.length ? ` ${result.output.warnings.join(" ")}` : "";
    setAssetImportMessage({
      tone: layerId ? "default" : "destructive",
      text: layerId ? `${asset.name} saved as a restored audio layer. ${result.output.summary}${warnings}` : `${asset.name} was saved, but the layer could not be added.`,
    });
  }

  async function runVideoEnhancement() {
    setIsEnhancingVideo(true);
    setError(null);
    setResult(null);
    setAssetImportMessage(null);

    try {
      assertClientApiRuntime();
      if (!canUseVideoEnhancementService) {
        setError("Connect a video enhancement service before using stabilization, eye-contact, or lip-sync.");
        return;
      }
      if (!videoEnhancementTarget) {
        setError("Choose a video layer before enhancing video.");
        return;
      }

      const sourceBlob = await loadMediaAssetBlob(videoEnhancementTarget.asset);
      if (!sourceBlob) {
        setError("Reconnect this video file before enhancing video.");
        return;
      }

      const enhancement = await enhanceVideoWithConnectedService({
        sourceBlob,
        sourceAssetName: videoEnhancementTarget.asset.name,
        sourceMediaType: videoEnhancementTarget.asset.mimeType,
        projectId: project.id,
        mode: videoEnhancementMode,
        strength: videoEnhancementStrengthValue,
        guidance: prompt,
      });
      if (!enhancement.ok) {
        setError(enhancement.reason);
        return;
      }

      const file = fileFromVideoEnhancementOutput(enhancement.output);
      const asset = await saveBrowserMedia(file);
      addMediaAsset(asset);
      const layerId = addLayerFromAsset(asset.id, {
        start: videoEnhancementTarget.layer?.start ?? 0,
        duration: videoEnhancementTarget.layer?.duration ?? asset.duration ?? videoEnhancementTarget.asset.duration ?? 5,
        name: `${videoEnhancementTarget.asset.name} enhanced`,
        notes: enhancement.output.summary,
      });

      const warnings = enhancement.output.warnings?.length ? ` ${enhancement.output.warnings.join(" ")}` : "";
      setAssetImportMessage({
        tone: layerId ? "default" : "destructive",
        text: layerId
          ? `${asset.name} saved as an enhanced video layer. ${enhancement.output.summary}${warnings}`
          : `${asset.name} was saved, but the layer could not be added.`,
      });
    } catch (requestError) {
      setError(aiAssistantExceptionMessage(requestError));
    } finally {
      setIsEnhancingVideo(false);
    }
  }

  function reviewCleanupCuts() {
    const output = createTimelineCleanupCutOutput(project.layers, mediaAssets);
    setError(null);
    setAssetImportMessage({
      tone: output.cuts.length ? "default" : "destructive",
      text: output.cuts.length
        ? `${output.cuts.length} cleanup range${output.cuts.length === 1 ? "" : "s"} ready for review.`
        : "No transcript fillers or waveform silence ranges were found.",
    });
    setResult({ action: "smart-cut", output });
  }

  async function importGeneratedImages(output: GeneratedImageOutput) {
    let importedCount = 0;
    let failedCount = 0;

    for (const image of output.images) {
      try {
        const file = fileFromBase64(image);
        const asset = await saveBrowserMedia(file);
        addMediaAsset(asset);
        addLayerFromAsset(asset.id);
        importedCount += 1;
      } catch {
        failedCount += 1;
      }
    }

    const message = generatedImageImportMessage(importedCount, failedCount);
    setAssetImportMessage(message ? { tone: failedCount > 0 ? "destructive" : "default", text: message } : null);
  }

  async function runLocalImageBackgroundRemoval() {
    if (!imageEditTarget) {
      setError("Select an image layer before running background removal.");
      return;
    }

    const sourceBlob = await loadMediaAssetBlob(imageEditTarget.asset);
    if (!sourceBlob) {
      setError("Reconnect this image file before removing its background.");
      return;
    }

    const file = await removeImageBackgroundLocally(sourceBlob, {
      filename: imageEditTarget.asset.name,
      subjectHint: prompt,
    });
    const output: GeneratedImageOutput = {
      images: [
        {
          filename: file.name,
          mediaType: "image/png",
          base64: await readBlobAsBase64Payload(file),
          prompt: prompt.trim() || "Remove the edge-connected background from the selected image.",
          model: "Local transparent background",
          editMode: "background-removal",
          sourceImageName: imageEditTarget.asset.name,
        },
      ],
      note: "Background removed locally from edge-connected pixels and saved as a transparent PNG.",
    };

    setResult({ action: "image-edit", output });
    await importGeneratedImages(output);
  }

  async function saveClipVariants(clips: RepurposeClipSuggestion[]) {
    const variants = createRepurposeClipProjectVariants(project, clips);

    for (const variant of variants) {
      await saveLocalProject(variant, mediaAssets);
    }

    const summary = {
      savedCount: variants.length,
      skippedCount: Math.max(0, clips.length - variants.length),
    };

    setAssetImportMessage({
      tone: summary.savedCount > 0 ? "default" : "destructive",
      text:
        summary.savedCount > 0
          ? `${summary.savedCount} clip variant${summary.savedCount === 1 ? "" : "s"} saved locally.`
          : "No valid clip variants could be saved.",
    });

    return summary;
  }

  async function insertBrollSuggestions(suggestions: BrollSuggestion[]) {
    let insertedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const suggestion of suggestions) {
      try {
        const stockAsset = await findStockAssetForBroll(suggestion);
        if (!stockAsset) {
          skippedCount += 1;
          continue;
        }

        const file = await downloadStockAsset(stockAsset);
        const asset = { ...(await saveBrowserMedia(file)), attribution: createStockMediaAttribution(stockAsset) };
        addMediaAsset(asset);
        const layerId = addLayerFromAsset(asset.id, {
          start: suggestion.start,
          duration: Math.max(1, suggestion.end - suggestion.start),
          name: suggestion.layerName,
          notes: `AI B-roll from ${stockAsset.providerLabel}: ${suggestion.query}. ${suggestion.rationale}`,
        });

        if (layerId) {
          insertedCount += 1;
        } else {
          failedCount += 1;
        }
      } catch {
        failedCount += 1;
      }
    }

    setAssetImportMessage({
      tone: insertedCount > 0 ? "default" : "destructive",
      text: brollImportMessage({ insertedCount, skippedCount, failedCount }),
    });

    return { insertedCount, skippedCount, failedCount };
  }

  async function saveGeneratedVideoProject(output: VideoProjectOutput, options?: VideoProjectSaveOptions) {
    const generatedProject = createAiVideoProject(output);
    const mediaMode = videoProjectMediaMode(options);
    const generatedMediaResult =
      mediaMode === "generated-images"
        ? await importGeneratedProjectSceneImages(generatedProject, output)
        : mediaMode === "generated-videos"
          ? await importGeneratedProjectSceneVideos(generatedProject, output)
          : { assets: await importGeneratedProjectSceneMedia(generatedProject, output), failedCount: 0 };
    const generatedAssets = generatedMediaResult.assets;

    if (mediaMode === "generated-images" && generatedAssets.length === 0) {
      throw new Error("Scene image generation did not return usable media.");
    }
    if (mediaMode === "generated-videos" && generatedAssets.length === 0) {
      throw new Error("Scene video generation did not return usable media.");
    }

    await saveLocalProject(generatedProject, generatedAssets);
    loadProject(generatedProject, generatedAssets);
    const summary = {
      projectId: generatedProject.id,
      title: generatedProject.title,
      layerCount: generatedProject.layers.length,
      duration: generatedProject.duration,
      generatedSceneImageCount: mediaMode === "generated-images" ? generatedAssets.length : undefined,
      failedSceneImageCount: mediaMode === "generated-images" ? generatedMediaResult.failedCount : undefined,
      generatedSceneVideoCount: mediaMode === "generated-videos" ? generatedAssets.length : undefined,
      failedSceneVideoCount: mediaMode === "generated-videos" ? generatedMediaResult.failedCount : undefined,
    };

    setAssetImportMessage({
      tone: "default",
      text: videoProjectSaveMessage(summary.title, mediaMode, generatedAssets.length, generatedMediaResult.failedCount),
    });

    return summary;
  }

  async function importGeneratedProjectSceneVideos(generatedProject: ReturnType<typeof createAiVideoProject>, output: VideoProjectOutput) {
    assertClientApiRuntime();
    const assets: MediaAsset[] = [];
    let failedCount = 0;

    for (const slot of createAiVideoSceneVideoSlots(output)) {
      try {
        const result = await generateSceneVideoWithConnectedService({
          projectId: generatedProject.id,
          projectTitle: output.title,
          sceneTitle: slot.sceneTitle,
          prompt: slot.prompt,
          aspectRatio: slot.aspectRatio,
          duration: slot.duration,
          backgroundColor: slot.backgroundColor,
          accentColor: slot.accentColor,
        });
        if (!result.ok) {
          failedCount += 1;
          continue;
        }

        const asset = await saveBrowserMedia(fileFromSceneVideoOutput(result.output));
        assets.push(asset);
        addAiVideoSceneMediaLayer(generatedProject, asset, slot);
      } catch {
        failedCount += 1;
      }
    }

    return { assets, failedCount };
  }

  async function importGeneratedProjectSceneImages(generatedProject: ReturnType<typeof createAiVideoProject>, output: VideoProjectOutput) {
    assertClientApiRuntime();
    const assets: MediaAsset[] = [];
    let failedCount = 0;

    for (const slot of createAiVideoSceneImageSlots(output)) {
      try {
        const response = await fetch(clientApiUrl("/api/ai/editor"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            action: "image",
            prompt: slot.prompt,
            projectTitle: output.title,
            projectId: generatedProject.id,
            aspectRatio: output.aspectRatio,
            duration: output.scenes.reduce((total, scene) => total + scene.duration, 0),
            brandColors: [output.scenes[slot.sceneIndex]?.backgroundColor, output.scenes[slot.sceneIndex]?.accentColor].filter(Boolean),
          }),
        });
        const data = await readAiResponse(response);
        if (!response.ok || !isAiSuccess(data) || !isGeneratedImageOutput(data.output)) {
          failedCount += 1;
          continue;
        }

        const image = data.output.images[0];
        if (!image) {
          failedCount += 1;
          continue;
        }

        const asset = await saveBrowserMedia(fileFromBase64(image));
        assets.push(asset);
        addAiVideoSceneMediaLayer(generatedProject, asset, slot);
      } catch {
        failedCount += 1;
      }
    }

    return { assets, failedCount };
  }

  async function importGeneratedProjectSceneMedia(generatedProject: ReturnType<typeof createAiVideoProject>, output: VideoProjectOutput) {
    const assets: MediaAsset[] = [];

    for (const slot of createAiVideoSceneMediaSlots(output)) {
      try {
        const stockAsset = (await findStockAssetForQuery(slot.query, "video")) ?? (await findStockAssetForQuery(slot.query, "image"));
        if (!stockAsset) continue;

        const file = await downloadStockAsset(stockAsset);
        const asset = { ...(await saveBrowserMedia(file)), attribution: createStockMediaAttribution(stockAsset) };
        assets.push(asset);
        addAiVideoSceneMediaLayer(generatedProject, asset, slot);
      } catch {
        // The generated project remains usable with visual direction layers when scene media cannot be imported.
      }
    }

    return assets;
  }

  function applySubtitleStyle(output: SubtitleStyleOutput) {
    const layer =
      project.layers.find((item) => item.id === selectedLayerId && ["subtitle", "text", "sticker", "timer"].includes(item.kind)) ??
      [...project.layers].reverse().find((item) => ["subtitle", "text", "sticker", "timer"].includes(item.kind));
    if (!layer) return;

    updateLayer(layer.id, {
      style: {
        ...layer.style,
        fill: output.style.fill,
        background: output.style.background,
        fontSize: output.style.fontSize,
        fontWeight: output.style.fontWeight,
      },
    });
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <WandSparkles className="size-4 text-primary" />
          <h2 className="text-sm font-medium">AI</h2>
        </div>
        <Badge variant="outline">Editor actions</Badge>
      </div>
      <div className="space-y-3 p-3">
        <div className="grid grid-cols-4 gap-1">
          {actions.map((action) => (
            <Button
              key={action.id}
              size="sm"
              variant={activeAction === action.id ? "default" : "outline"}
              onClick={() => setActiveAction(action.id)}
              title={action.label}
            >
              {action.icon}
              <span className="sr-only">{action.label}</span>
            </Button>
          ))}
        </div>
        <Textarea
          className="min-h-20 resize-none"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={aiPromptPlaceholder(activeAction, imageEditMode)}
        />
        <div className="flex items-center gap-2">
          <Input
            ref={sourceInputRef}
            className="hidden"
            type="file"
            accept=".txt,.md,.markdown,.html,.htm,.srt,.vtt,.pdf,.png,.jpg,.jpeg,.webp,text/plain,text/markdown,text/html,application/pdf,image/png,image/jpeg,image/webp"
            onChange={(event) => void importSourceForVideoProject(event.target.files?.[0])}
          />
          <Button
            className="flex-1 justify-start"
            variant="outline"
            onClick={() => sourceInputRef.current?.click()}
            disabled={isBusy}
          >
            {isReadingSource ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Import source
          </Button>
        </div>
        {activeAction === "image-edit" ? (
          <AiImageEditControls
            targetName={imageEditTarget?.asset.name}
            maskCount={imageEditMaskCount}
            mode={imageEditMode}
            outpaintPreset={imageOutpaintPreset}
            targetLanguage={imageTranslationLanguage}
            onModeChange={setImageEditMode}
            onOutpaintPresetChange={setImageOutpaintPreset}
            onTargetLanguageChange={setImageTranslationLanguage}
          />
        ) : null}
        <AiAudioCleanupControls
          targetName={audioCleanupTarget?.asset.name}
          mode={audioCleanupMode}
          engine={audioCleanupEngine}
          intensity={audioCleanupIntensity}
          serviceConfigured={canUseAudioRestorationService}
          serviceStatusLabel={audioRestorationStatus?.label}
          preview={audioCleanupPreview}
          onModeChange={setAudioCleanupMode}
          onEngineChange={setAudioCleanupEngine}
          onIntensityChange={setAudioCleanupIntensity}
        />
        <AiVideoEnhancementControls
          targetName={videoEnhancementTarget?.asset.name}
          mode={videoEnhancementMode}
          strength={videoEnhancementStrengthValue}
          serviceConfigured={canUseVideoEnhancementService}
          serviceStatusLabel={videoEnhancementStatus?.label}
          onModeChange={setVideoEnhancementMode}
          onStrengthChange={setVideoEnhancementStrengthValue}
        />
        <Button className="w-full" onClick={() => runAi()} disabled={isBusy || !canRunActiveAction || (!canUseOnlineActions && !canRunLocalBackgroundRemoval)}>
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Run {actions.find((action) => action.id === activeAction)?.label}
        </Button>
        <Button
          className="w-full justify-start"
          variant="outline"
          onClick={() => void runAutoCaptions()}
          disabled={isBusy || !canUseOnlineActions || !transcriptionTarget}
        >
          {isTranscribing ? <Loader2 className="size-4 animate-spin" /> : <Captions className="size-4" />}
          <span className="truncate">Auto-caption {transcriptionTarget?.asset.name ?? "media"}</span>
        </Button>
        <Button
          className="w-full justify-start"
          variant="outline"
          onClick={() => void runVoiceover()}
          disabled={isBusy || !canUseOnlineActions || !prompt.trim()}
        >
          {isGeneratingVoiceover ? <Loader2 className="size-4 animate-spin" /> : <Mic2 className="size-4" />}
          <span className="truncate">Generate voiceover</span>
        </Button>
        <Button
          className="w-full justify-start"
          variant="outline"
          onClick={() => void runAudioCleanup()}
          disabled={isBusy || !audioCleanupTarget}
        >
          {isCleaningAudio ? <Loader2 className="size-4 animate-spin" /> : <SlidersHorizontal className="size-4" />}
          <span className="truncate">Clean audio {audioCleanupTarget?.asset.name ?? "layer"}</span>
        </Button>
        <Button
          className="w-full justify-start"
          variant="outline"
          onClick={() => void runVideoEnhancement()}
          disabled={isBusy || !canUseOnlineActions || !canUseVideoEnhancementService || !videoEnhancementTarget}
        >
          {isEnhancingVideo ? <Loader2 className="size-4 animate-spin" /> : <Video className="size-4" />}
          <span className="truncate">Enhance video {videoEnhancementTarget?.asset.name ?? "layer"}</span>
        </Button>
        <Button className="w-full justify-start" variant="outline" onClick={reviewCleanupCuts} disabled={isBusy}>
          <Scissors className="size-4" />
          Review silence/fillers
        </Button>
        {!canUseOnlineActions ? (
          <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
            Online actions are unavailable in this desktop build.
          </div>
        ) : null}
      </div>
      <ScrollArea className="min-h-0 flex-1 border-t border-border">
        <div className="space-y-3 p-3">
          {error ? <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</div> : null}
          {assetImportMessage ? (
            <div
              className={`rounded-md border p-3 text-sm ${
                assetImportMessage.tone === "destructive"
                  ? "border-destructive/40 text-destructive"
                  : "border-border text-muted-foreground"
              }`}
            >
              {assetImportMessage.text}
            </div>
          ) : null}
          {result ? (
            <AiResultView
              result={result}
              onApplyCaptions={addAiCaptions}
              onInsertBroll={insertBrollSuggestions}
              onSaveVideoProject={saveGeneratedVideoProject}
              onApplySmartCuts={(cuts) =>
                applyTimelineCutRanges(
                  cuts.map((cut) => ({
                    start: cut.start,
                    end: cut.end,
                    reason: cut.reason,
                  })),
                )
              }
              onSaveClipVariants={saveClipVariants}
              sceneVideoConfigured={canUseSceneVideoGenerationService}
              sceneVideoStatusLabel={sceneVideoGenerationStatus?.label ?? "Connect a scene video service to generate scene clips."}
            />
          ) : null}
        </div>
      </ScrollArea>
    </section>
  );
}

async function readAiResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isAiSuccess(value: unknown): value is { ok: true; output: AiResult["output"] } {
  return typeof value === "object" && value !== null && "ok" in value && value.ok === true && "output" in value;
}

function isAiTranscriptionSuccess(value: unknown): value is { ok: true; output: { captions: CaptionChunk[] } } {
  if (!isAiSuccess(value)) return false;
  return isCaptionOutput(value.output);
}

function isAiSpeechSuccess(value: unknown): value is { ok: true; output: GeneratedSpeechOutput } {
  if (typeof value !== "object" || value === null || !("ok" in value) || value.ok !== true || !("output" in value)) return false;
  const output = value.output;
  return (
    typeof output === "object" &&
    output !== null &&
    "filename" in output &&
    typeof output.filename === "string" &&
    "mediaType" in output &&
    typeof output.mediaType === "string" &&
    output.mediaType.startsWith("audio/") &&
    "base64" in output &&
    typeof output.base64 === "string"
  );
}

function isAiFailure(value: unknown): value is { reason: string } {
  return typeof value === "object" && value !== null && "reason" in value && typeof value.reason === "string";
}

function aiAssistantFailureMessage(value: unknown) {
  return isAiFailure(value) ? value.reason : "Creative AI request could not finish. Try again.";
}

function isImageProviderUnavailable(value: unknown) {
  return isAiFailure(value) && /image generation|image-model|image model|not configured/i.test(value.reason);
}

function aiAssistantExceptionMessage(error: unknown) {
  if (error instanceof ClientAiInputError) return error.message;
  if (error instanceof AudioCleanupError) return error.message;
  if (isClientApiUnavailableError(error)) return error.message;
  return "Creative AI request could not finish. Try again.";
}

function fileFromBase64(image: GeneratedImageOutput["images"][number]) {
  const bytes = decodeBase64ImagePayload(image.base64);
  const blob = new Blob([bytes], { type: image.mediaType });
  return new File([blob], image.filename, { type: image.mediaType });
}

function fileFromGeneratedSpeech(output: GeneratedSpeechOutput) {
  const bytes = decodeBase64AudioPayload(output.base64, "Generated voiceover audio");
  const blob = new Blob([bytes], { type: output.mediaType });
  return new File([blob], output.filename, { type: output.mediaType });
}

function decodeBase64AudioPayload(value: string, label: string) {
  const sanitized = value.trim();
  if (!sanitized || !/^[A-Za-z0-9+/=]+$/.test(sanitized)) {
    throw new Error(`${label} is invalid.`);
  }

  const binary = atob(sanitized);
  if (binary.length > 20 * 1024 * 1024) {
    throw new Error(`${label} is too large to import.`);
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function generatedImageImportMessage(importedCount: number, failedCount: number) {
  if (importedCount === 0 && failedCount === 0) return null;

  const imageLabel = importedCount === 1 ? "image" : "images";
  const failedLabel = failedCount === 1 ? "image" : "images";

  if (failedCount === 0) {
    return `${importedCount} generated ${imageLabel} added to media.`;
  }

  if (importedCount > 0) {
    return `${importedCount} generated ${imageLabel} added. ${failedCount} ${failedLabel} could not be saved.`;
  }

  return "Generated image could not be saved locally.";
}

function videoProjectMediaMode(options?: VideoProjectSaveOptions) {
  return options?.sceneMediaMode ?? (options?.sceneImageMode === "generated" ? "generated-images" : "stock");
}

function videoProjectSaveMessage(title: string, mode: ReturnType<typeof videoProjectMediaMode>, generatedCount: number, failedCount: number) {
  if (mode === "generated-images") {
    return `${title} created with ${generatedCount} AI scene image${generatedCount === 1 ? "" : "s"}${
      failedCount > 0 ? `; ${failedCount} scene${failedCount === 1 ? "" : "s"} kept the generated text layout.` : ""
    }.`;
  }

  if (mode === "generated-videos") {
    return `${title} created with ${generatedCount} AI scene video${generatedCount === 1 ? "" : "s"}${
      failedCount > 0 ? `; ${failedCount} scene${failedCount === 1 ? "" : "s"} kept the generated text layout.` : ""
    }.`;
  }

  return `${title} created and opened as a local project.`;
}

async function findStockAssetForBroll(suggestion: BrollSuggestion) {
  return findStockAssetForQuery(suggestion.query, suggestion.mediaType);
}

async function findStockAssetForQuery(query: string, mediaType: "image" | "video" = "video") {
  const params = new URLSearchParams({
    q: query,
    type: mediaType,
  });
  const response = await fetch(clientApiUrl(`/api/stock/search?${params}`), { credentials: "include" });
  const data = await readAiResponse(response);

  if (!response.ok || !isStockSearchSuccess(data)) return null;
  return data.results.find((asset) => asset.kind === mediaType) ?? null;
}

async function downloadStockAsset(asset: StockAsset) {
  const params = new URLSearchParams({ title: asset.title });
  const response = await fetch(clientApiUrl(`/api/stock/download?${params}`), { credentials: "include" });
  if (!response.ok) {
    throw new Error("Stock media could not be downloaded.");
  }

  const blob = await response.blob();
  return new File([blob], asset.name, { type: asset.mimeType || blob.type });
}

function isStockSearchSuccess(value: unknown): value is { ok: true; results: StockAsset[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    value.ok === true &&
    "results" in value &&
    Array.isArray(value.results)
  );
}

function brollImportMessage(summary: { insertedCount: number; skippedCount: number; failedCount: number }) {
  if (summary.insertedCount === 0) {
    if (summary.skippedCount > 0) return "No usable stock result was found for the accepted B-roll suggestions.";
    return "Accepted B-roll could not be inserted.";
  }

  const skipped = summary.skippedCount > 0 ? ` ${summary.skippedCount} search${summary.skippedCount === 1 ? "" : "es"} had no usable stock result.` : "";
  const failed = summary.failedCount > 0 ? ` ${summary.failedCount} import${summary.failedCount === 1 ? "" : "s"} failed.` : "";
  return `${summary.insertedCount} B-roll layer${summary.insertedCount === 1 ? "" : "s"} inserted.${skipped}${failed}`;
}

function projectMediaBrief(assets: MediaAsset[]) {
  return assets
    .slice(0, 40)
    .map((asset) => `${asset.type}: ${asset.name}${asset.duration ? `, ${formatTime(asset.duration)}` : ""}`)
    .join("\n")
    .slice(0, 6000);
}

async function recordAudioCleanupGeneration(
  cleanup: AudioCleanupResult,
  input: { projectId: string; sourceAssetName: string; outputAssetName: string; duration?: number },
) {
  try {
    assertClientApiRuntime();
    await fetch(clientApiUrl("/api/ai/audio-cleanup"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...input,
        adapter: cleanup.adapter,
        mode: cleanup.mode,
        intensity: cleanup.intensity,
        before: cleanup.before,
        after: cleanup.after,
        summary: cleanup.summary,
      }),
    });
  } catch {
    // Local cleanup should remain useful even when signed-in history is unavailable.
  }
}

async function prepareImageEditSource(target: { asset: MediaAsset; layer: TimelineLayer } | null): Promise<ImageEditSource | null> {
  if (!target) return null;

  const blob = await loadMediaAssetBlob(target.asset);
  if (!blob) {
    throw new ClientAiInputError("Reconnect this image file before running an AI image edit.");
  }

  const mediaType = imageMediaType(target.asset, blob);
  if (!mediaType) {
    throw new ClientAiInputError("Choose a supported image layer before running an AI image edit.");
  }

  const base64 = await readBlobAsBase64Payload(blob);
  if (!isValidBase64ImagePayload(base64)) {
    throw new ClientAiInputError("This image is too large or unsupported for AI image editing.");
  }

  return {
    filename: target.asset.name,
    mediaType,
    base64,
  };
}

async function prepareVideoProjectSourceImage(file: File): Promise<ImageEditSource> {
  const mediaType = videoProjectSourceImageMediaType(file);
  if (!mediaType) {
    throw new ClientAiInputError("Choose a PNG, JPG, or WebP image source for video project generation.");
  }

  const base64 = await readBlobAsBase64Payload(file);
  if (!isValidBase64ImagePayload(base64)) {
    throw new ClientAiInputError("This image source is too large or unsupported for AI video project generation.");
  }

  return {
    filename: file.name,
    mediaType,
    base64,
  };
}

async function prepareImageEditMaskSource(layer: TimelineLayer | null, asset: MediaAsset | null): Promise<ImageEditMaskSource> {
  if (!layer || !asset) {
    throw new ClientAiInputError("Add an object mask to the selected image before running inpaint.");
  }

  const blob = await renderImageObjectMaskBlob(layer, asset);
  if (!blob) throw new ClientAiInputError("Add an object mask to the selected image before running inpaint.");

  return {
    filename: `${asset.name.replace(/\.[^.]+$/, "")}-mask.png`,
    mediaType: "image/png",
    base64: await readBlobAsBase64Payload(blob),
  };
}

function imageMediaType(asset: MediaAsset, blob: Blob) {
  if (asset.mimeType?.startsWith("image/")) return asset.mimeType;
  if (blob.type.startsWith("image/")) return blob.type;
  return null;
}

function isVideoProjectImageSourceFile(file: File) {
  return Boolean(videoProjectSourceImageMediaType(file));
}

function videoProjectSourceImageMediaType(file: File) {
  const mediaType = file.type.toLowerCase();
  if (VIDEO_PROJECT_IMAGE_SOURCE_TYPES.has(mediaType)) return mediaType;
  if (/\.png$/i.test(file.name)) return "image/png";
  if (/\.jpe?g$/i.test(file.name)) return "image/jpeg";
  if (/\.webp$/i.test(file.name)) return "image/webp";
  return null;
}

function createVideoProjectPromptFromImageSource(file: File) {
  return [
    "Create an editable short video project from this image source.",
    `Source image filename: ${file.name}.`,
    "Analyze visible text, layout, subject matter, scene intent, and likely audience from the image.",
    "Return concise scenes with captions, visual direction, and stock-search-friendly B-roll queries that can be edited locally.",
  ].join("\n");
}

async function readBlobAsBase64Payload(blob: Blob) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Image data could not be read."));
    };
    reader.onerror = () => reject(new Error("Image data could not be read."));
    reader.readAsDataURL(blob);
  });

  return normalizeBase64ImageData(dataUrl);
}

function findTranscriptionTarget(layers: TimelineLayer[], assets: MediaAsset[], selectedLayerId: string | null) {
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId && isAudioVideoLayer(layer) && layer.assetId);
  const selectedAsset = selectedLayer ? assets.find((asset) => asset.id === selectedLayer.assetId && isAudioVideoAsset(asset)) : undefined;

  if (selectedAsset) {
    return { asset: selectedAsset, layer: selectedLayer };
  }

  const firstAsset = assets.find(isAudioVideoAsset);
  return firstAsset ? { asset: firstAsset, layer: null } : null;
}

function findImageEditTarget(layers: TimelineLayer[], assets: MediaAsset[], selectedLayerId: string | null) {
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId && layer.kind === "image" && layer.assetId);
  const selectedAsset = selectedLayer ? assets.find((asset) => asset.id === selectedLayer.assetId && isImageAsset(asset)) : undefined;

  return selectedAsset && selectedLayer ? { asset: selectedAsset, layer: selectedLayer } : null;
}

function findAudioCleanupTarget(layers: TimelineLayer[], assets: MediaAsset[], selectedLayerId: string | null) {
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId && layer.kind === "audio" && layer.assetId);
  const selectedAsset = selectedLayer ? assets.find((asset) => asset.id === selectedLayer.assetId && isAudioAsset(asset)) : undefined;
  if (selectedAsset && selectedLayer) return { asset: selectedAsset, layer: selectedLayer };

  const firstAsset = assets.find(isAudioAsset);
  return firstAsset ? { asset: firstAsset, layer: null } : null;
}

function findVideoEnhancementTarget(layers: TimelineLayer[], assets: MediaAsset[], selectedLayerId: string | null) {
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId && layer.kind === "video" && layer.assetId);
  const selectedAsset = selectedLayer ? assets.find((asset) => asset.id === selectedLayer.assetId && isVideoAsset(asset)) : undefined;
  if (selectedAsset && selectedLayer) return { asset: selectedAsset, layer: selectedLayer };

  const firstAsset = assets.find(isVideoAsset);
  return firstAsset ? { asset: firstAsset, layer: null } : null;
}

function isAudioVideoLayer(layer: TimelineLayer) {
  return layer.kind === "audio" || layer.kind === "video";
}

function isAudioVideoAsset(asset: MediaAsset) {
  return asset.type === "audio" || asset.type === "video";
}

function isAudioAsset(asset: MediaAsset) {
  return asset.type === "audio";
}

function isVideoAsset(asset: MediaAsset) {
  return asset.type === "video";
}

function isImageAsset(asset: MediaAsset) {
  return asset.type === "image";
}

async function loadMediaAssetBlob(asset: MediaAsset) {
  if (asset.source === "tauri-fs") {
    const blob = await loadTauriMediaBlob(asset);
    if (blob) return blob;
  }

  const browserBlob = await loadBrowserMediaBlob(asset.storageKey);
  if (browserBlob) return browserBlob;

  if (!asset.objectUrl) return null;
  const response = await fetch(asset.objectUrl);
  return response.ok ? response.blob() : null;
}

function projectTranscript(layers: Array<{ name: string; text?: string; cues?: CaptionChunk[] }>) {
  return layers
    .flatMap((layer) => {
      if (layer.cues?.length) {
        return layer.cues.map((cue) => `${formatTime(cue.start)}-${formatTime(cue.end)} ${cue.text}`);
      }
      return layer.text ? [`${layer.name}: ${layer.text}`] : [];
    })
    .join("\n")
    .slice(0, 12000);
}

function aiPromptPlaceholder(action: AiAction, imageEditMode: AiImageEditMode) {
  if (action === "image-edit") {
    if (imageEditMode === "inpaint") return "Describe what should replace the masked area.";
    if (imageEditMode === "outpaint") return "Describe how to extend the scene beyond the current image edges.";
    if (imageEditMode === "background-removal") return "Describe the subject to keep while removing the background.";
    if (imageEditMode === "translate") return "Describe any text/layout constraints for the translated image.";
    return "Describe the edit for the selected image: remove background, extend edges, clean up an object, recolor, translate text, or restyle it.";
  }

  if (action === "image") {
    return "Describe the image asset to generate for the canvas.";
  }

  return "Ask for a script, article/PDF/image-source video, captions, translation, B-roll, cleanup, smart cuts, subtitle styling, or a repurpose plan.";
}

class ClientAiInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientAiInputError";
  }
}
