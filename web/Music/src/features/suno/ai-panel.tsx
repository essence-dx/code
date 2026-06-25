"use client";

import {
  AudioLines,
  BrainCircuit,
  Clipboard,
  Download,
  Fingerprint,
  Image as ImageIcon,
  Layers3,
  ListMusic,
  Loader2,
  MessageSquareText,
  Mic2,
  Music2,
  PlayCircle,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Tags,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  defaultCreativeControls,
  type CreativeControls,
  type MetadataSuggestion,
  type PlaylistInspiration,
  type SongBrief,
} from "@/lib/ai/schemas";
import { useAudioJob } from "@/features/ai/use-audio-job";
import { useAiStatus } from "@/features/ai/use-ai-status";
import {
  customModelCardToPrompt,
} from "@/features/ai/custom-model-cards";
import {
  saveCreationDraft,
  type CreationDraftInput,
} from "@/features/ai/creation-drafts";
import {
  composerConflictFields,
  snapshotReasonFromSource,
  type ComposerSnapshot,
  type ComposerSnapshotReason,
} from "@/features/ai/composer-snapshots";
import {
  composeDraftHandoff,
  createDraftHandoffSelection,
  getDraftHandoffChanges,
  hasSelectedDraftSections,
  type DraftHandoffSection,
  type DraftHandoffSelection,
} from "@/features/ai/creation-draft-handoff";
import {
  createPersonaInputFromReusePrompt,
  personaToPrompt,
  toPersonaAttachment,
} from "@/features/ai/persona-library";
import {
  listPlaylistFingerprints,
  type PlaylistFingerprint,
} from "@/features/ai/playlist-fingerprint";
import type { ReusePromptContext } from "@/features/ai/reuse-prompt";
import { profileToPrompt, type TasteProfile } from "@/features/ai/taste-profile";
import {
  checkAudioUsageLimit,
  recordUsageEvent,
  type UsageKind,
} from "@/features/ai/usage-accounting";
import { usePersonaLibrary } from "@/features/ai/use-persona-library";
import { useComposerSnapshots } from "@/features/ai/use-composer-snapshots";
import { useCustomModelCards } from "@/features/ai/use-custom-model-cards";
import { useVoiceProfiles } from "@/features/ai/use-voice-profiles";
import { getAudioDurationMs } from "@/features/audio/audio-processing";
import {
  getOnlineActionTitle,
  useOnlineActionGuard,
} from "@/features/system/online-action-guard";
import {
  toVoiceProfileAttachment,
  voiceProfileToPrompt,
} from "@/features/ai/voice-profiles";
import type {
  EditableSongPatch,
  GeneratedSongInput,
  LocalSong,
} from "@/features/library/types";
import { AiBriefView } from "./ai-brief-view";
import { AiChatBox } from "./ai-chat-box";
import { AiMetadataView } from "./ai-metadata-view";
import { AiPlaylistIdeasView } from "./ai-playlist-ideas-view";
import { CapabilityBadge } from "./capability-badge";
import { CreationDraftsPanel } from "./creation-drafts-panel";
import { ComposerSnapshotPanel } from "./composer-snapshot-panel";
import { CreationDraftHandoffPreview } from "./creation-draft-handoff-preview";

type AiPanelProps = {
  initialLyrics?: string;
  initialStyle?: string;
  coverRemixBusy?: boolean;
  coverRemixReady?: boolean;
  generatedVocalsBusy?: boolean;
  generatedVocalsReady?: boolean;
  generatedInstrumentalBusy?: boolean;
  generatedInstrumentalReady?: boolean;
  personaGenerationBusy?: boolean;
  personaGenerationReady?: boolean;
  sampleBusy?: boolean;
  sampleReady?: boolean;
  onGeneratedAudio: (input: GeneratedSongInput) => Promise<unknown>;
  onLyrics: (lyrics: string) => void;
  onMetadata?: (patch: EditableSongPatch) => void;
  onCoverRemix?: (input: {
    creativeControls?: CreativeControls;
    lyrics: string;
    mode: "cover" | "remix";
    notes: string;
    source: LocalSong;
    targetStyle: string;
  }) => Promise<void>;
  onGenerateVocals?: (input: {
    directionPrompt: string;
    lyrics: string;
    notes: string;
    source: LocalSong;
    voiceProfile: NonNullable<ReturnType<typeof toVoiceProfileAttachment>>;
  }) => Promise<void>;
  onGenerateInstrumental?: (input: {
    directionPrompt: string;
    lyrics: string;
    notes: string;
    source: LocalSong;
  }) => Promise<void>;
  onGeneratePersona?: (input: {
    analysisPrompt: string;
    notes: string;
    source: LocalSong;
  }) => Promise<void>;
  onGenerateSample?: (input: {
    creativeControls?: CreativeControls;
    durationMs: number;
    prompt: string;
    source?: LocalSong;
    sourceContext?: string;
    style: string;
    title: string;
  }) => Promise<void>;
  playlistFingerprint?: PlaylistFingerprint;
  reusePrompt?: ReusePromptContext;
  sourceSong?: LocalSong;
  tasteProfile?: TasteProfile;
  onStyle: (style: string) => void;
};

type ApiError = {
  error?: string;
};

const emptySnapshotSelection: DraftHandoffSelection = {
  controls: false,
  lyrics: false,
  persona: false,
  prompt: false,
  style: false,
  title: false,
  voice: false,
};

export function AiPanel({
  initialLyrics = "",
  initialStyle = "",
  coverRemixBusy,
  coverRemixReady,
  generatedVocalsBusy,
  generatedVocalsReady,
  generatedInstrumentalBusy,
  generatedInstrumentalReady,
  personaGenerationBusy,
  personaGenerationReady,
  sampleBusy,
  sampleReady,
  onGeneratedAudio,
  onCoverRemix,
  onGenerateVocals,
  onGenerateInstrumental,
  onGeneratePersona,
  onGenerateSample,
  onLyrics,
  onMetadata,
  playlistFingerprint,
  reusePrompt,
  sourceSong,
  tasteProfile,
  onStyle,
}: AiPanelProps) {
  const { status, loading } = useAiStatus();
  const [busy, setBusy] = useState<string | undefined>();
  const [theme, setTheme] = useState("a focused builder refusing to give up");
  const [styleIdea, setStyleIdea] = useState(
    initialStyle || "warm cinematic synth pop with intimate vocals",
  );
  const [lyrics, setLyrics] = useState(initialLyrics);
  const [brief, setBrief] = useState<SongBrief | undefined>();
  const [metadata, setMetadata] = useState<MetadataSuggestion | undefined>();
  const [playlistIdeas, setPlaylistIdeas] = useState<
    PlaylistInspiration | undefined
  >();
  const [coverPrompt, setCoverPrompt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [generateImage, setGenerateImage] = useState(false);
  const [audioPrompt, setAudioPrompt] = useState("");
  const [sampleDurationSeconds, setSampleDurationSeconds] = useState(8);
  const [variantCount, setVariantCount] = useState(1);
  const [creativeControls, setCreativeControls] =
    useState<CreativeControls>(defaultCreativeControls);
  const [hookCaptions, setHookCaptions] = useState("");
  const [fingerprints, setFingerprints] = useState<PlaylistFingerprint[]>([]);
  const [activePersonaId, setActivePersonaId] = useState("");
  const [activeModelCardId, setActiveModelCardId] = useState("");
  const [activeVoiceProfileId, setActiveVoiceProfileId] = useState("");
  const [reusePersonaRightsConfirmed, setReusePersonaRightsConfirmed] =
    useState(false);
  const [useTaste, setUseTaste] = useState(true);
  const [pendingSnapshot, setPendingSnapshot] =
    useState<ComposerSnapshot | null>(null);
  const [snapshotSelection, setSnapshotSelection] =
    useState<DraftHandoffSelection>(emptySnapshotSelection);
  const { audioJob, queueAudioJob, refreshAudioJob } = useAudioJob();
  const onlineGuard = useOnlineActionGuard();
  const connectionDisabled = !onlineGuard.canUseConnectionActions;
  const generationActionTitle = (title?: string) =>
    getOnlineActionTitle(onlineGuard, "generation", title);
  const customModels = useCustomModelCards();
  const composerSnapshots = useComposerSnapshots();
  const personaLibrary = usePersonaLibrary();
  const voiceProfiles = useVoiceProfiles();
  const textDisabled = loading || !status.text || connectionDisabled;
  const variantsReady = status.capabilities.some(
    (capability) =>
      capability.id === "generation-variants" && capability.state === "ready",
  );
  const creativeControlsReady = status.capabilities.some(
    (capability) =>
      capability.id === "creative-controls" && capability.state === "ready",
  );
  const chatDisabledReason = connectionDisabled
    ? onlineGuard.generationDisabledReason
    : loading
      ? "Checking writing assistance."
      : "Connect writing assistance to enable chat.";
  const personaProviderReady = status.capabilities.some(
    (capability) =>
      capability.id === "persona-generation" && capability.state === "ready",
  );
  const voiceProviderReady = status.capabilities.some(
    (capability) =>
      capability.id === "voice-generation" && capability.state === "ready",
  );
  const activePersona = personaLibrary.personas.find(
    (persona) => persona.id === activePersonaId,
  );
  const activePersonaPrompt =
    activePersona?.rightsConfirmed ? personaToPrompt(activePersona) : "";
  const activePersonaAttachment = activePersona?.rightsConfirmed
    ? toPersonaAttachment(activePersona)
    : null;
  const activeModelCard = customModels.cards.find(
    (card) => card.id === activeModelCardId,
  );
  const activeModelPrompt =
    activeModelCard?.rightsConfirmed ? customModelCardToPrompt(activeModelCard) : "";
  const activeVoiceProfile = voiceProfiles.profiles.find(
    (profile) => profile.id === activeVoiceProfileId,
  );
  const activeVoicePrompt =
    activeVoiceProfile?.rightsConfirmed ? voiceProfileToPrompt(activeVoiceProfile) : "";
  const activeVoiceAttachment = activeVoiceProfile?.rightsConfirmed
    ? toVoiceProfileAttachment(activeVoiceProfile)
    : null;
  const busyIcon = <Loader2 className="size-4 animate-spin" />;
  const lastFingerprintRequestRef = useRef<string | undefined>(undefined);
  const lastReuseRequestRef = useRef<string | undefined>(undefined);
  const tastePrompt = tasteProfile ? profileToPrompt(tasteProfile) : "";
  const tasteReady = Boolean(tastePrompt);
  const snapshotChanges = pendingSnapshot
    ? getDraftHandoffChanges(getCurrentComposerDraft(), pendingSnapshot.draft)
    : [];
  const snapshotSelectedCount = snapshotChanges.filter(
    (change) => snapshotSelection[change.section],
  ).length;

  useEffect(() => {
    setFingerprints(listPlaylistFingerprints());
  }, []);

  useEffect(() => {
    if (!reusePrompt || lastReuseRequestRef.current === reusePrompt.requestId) {
      return;
    }

    lastReuseRequestRef.current = reusePrompt.requestId;
    const draft = createReusablePromptDraft(reusePrompt);
    applyCreationDraft(draft);
    setReusePersonaRightsConfirmed(false);
    saveCreationDraft(draft);
    toast.success(`Reusing prompt from ${reusePrompt.sourceTitle}.`);
  }, [onLyrics, onStyle, reusePrompt]);

  useEffect(() => {
    if (
      !playlistFingerprint ||
      lastFingerprintRequestRef.current === playlistFingerprint.requestId
    ) {
      return;
    }

    applyPlaylistFingerprint(playlistFingerprint);
    setFingerprints(listPlaylistFingerprints());
  }, [lyrics, onStyle, playlistFingerprint]);

  function applyPlaylistFingerprint(fingerprint: PlaylistFingerprint) {
    const draft = createPlaylistDraft(fingerprint);
    lastFingerprintRequestRef.current = fingerprint.requestId;
    applyCreationDraft(draft);
    saveCreationDraft(draft);
    toast.success(`Inspiration loaded from ${fingerprint.playlistName}.`);
  }

  async function postJson<T>(
    url: string,
    body: unknown,
    usage: { kind: UsageKind; label: string },
  ): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as T & ApiError;

    if (!response.ok) {
      recordUsageEvent({ ...usage, status: "failed" });
      throw new Error(payload.error || "AI request failed.");
    }

    recordUsageEvent({ ...usage, status: "succeeded" });
    return payload;
  }

  async function runLyrics() {
    setBusy("lyrics");
    try {
      const result = await postJson<{ lyrics: string }>("/api/ai/lyrics", {
        theme,
        style: styleIdea,
        mood: "determined, bright, human",
        structure: "verse-chorus",
      }, {
        kind: "text",
        label: "Lyrics generation",
      });
      setLyrics(result.lyrics);
      onLyrics(result.lyrics);
      toast.success("Lyrics generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lyrics failed.");
    } finally {
      setBusy(undefined);
    }
  }

  async function runStyle() {
    setBusy("style");
    try {
      const result = await postJson<{ style: string }>(
        "/api/ai/style",
        {
          idea: styleIdea,
          references: [
            "original work only",
            useTaste && tastePrompt ? `Creator taste:\n${tastePrompt}` : "",
            activePersonaPrompt,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
        {
          kind: "text",
          label: "Style expansion",
        },
      );
      setStyleIdea(result.style);
      onStyle(result.style);
      toast.success("Style prompt expanded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Style failed.");
    } finally {
      setBusy(undefined);
    }
  }

  async function runBrief() {
    setBusy("brief");
    try {
      const result = await postJson<{ brief: SongBrief }>(
        "/api/ai/song-brief",
        {
          title: "Essence demo",
          lyrics,
          style: styleIdea,
          intention: [theme, activePersonaPrompt, activeVoicePrompt]
            .filter(Boolean)
            .join("\n\n"),
        },
        {
          kind: "text",
          label: "Song brief",
        },
      );
      setBrief(result.brief);
      toast.success("Song brief ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Brief failed.");
    } finally {
      setBusy(undefined);
    }
  }

  async function runMetadata() {
    setBusy("metadata");
    try {
      const result = await postJson<{ metadata: MetadataSuggestion }>(
        "/api/ai/metadata",
        {
          title: brief?.title || "Essence demo",
          lyrics,
          style: [styleIdea, activePersonaPrompt, activeVoicePrompt]
            .filter(Boolean)
            .join("\n\n"),
        },
        {
          kind: "text",
          label: "Metadata suggestions",
        },
      );
      setMetadata(result.metadata);
      toast.success("Metadata suggestions ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Metadata failed.");
    } finally {
      setBusy(undefined);
    }
  }

  async function runPlaylistIdeas() {
    setBusy("playlist");
    try {
      const result = await postJson<{ inspiration: PlaylistInspiration }>(
        "/api/ai/playlist-inspiration",
        {
          librarySummary: [
            brief?.title ? `Current brief: ${brief.title}` : "",
            styleIdea ? `Style: ${styleIdea}` : "",
            lyrics ? `Lyrics: ${lyrics.slice(0, 1200)}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          mood: theme,
        },
        {
          kind: "text",
          label: "Playlist ideas",
        },
      );
      setPlaylistIdeas(result.inspiration);
      toast.success("Playlist ideas ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Playlist ideas failed.");
    } finally {
      setBusy(undefined);
    }
  }

  async function runHookCaptions() {
    setBusy("captions");
    try {
      const result = await postJson<{ captions: string }>("/api/ai/hook-captions", {
        songTitle: brief?.title || metadata?.titles?.[0] || "Essence demo",
        mood: theme,
        moment: audioPrompt || "best chorus moment",
      }, {
        kind: "text",
        label: "Hook captions",
      });
      setHookCaptions(result.captions);
      toast.success("Hook captions ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Hook captions failed.");
    } finally {
      setBusy(undefined);
    }
  }

  async function runCover() {
    setBusy("cover");
    try {
      const result = await postJson<{
        prompt: string;
        imageDataUrl?: string;
      }>("/api/ai/cover-art", {
        title: brief?.title || "Essence demo",
        style: styleIdea,
        lyrics,
        generateImage,
      }, {
        kind: generateImage ? "image" : "text",
        label: generateImage ? "Cover image" : "Cover prompt",
      });
      setCoverPrompt(result.prompt);
      setCoverImage(result.imageDataUrl ?? "");
      toast.success(generateImage ? "Cover image generated." : "Cover prompt ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cover art failed.");
    } finally {
      setBusy(undefined);
    }
  }

  async function runAudioJob() {
    setBusy("audio");
    try {
      const requestedVariants = variantsReady ? variantCount : 1;
      const usageLimit = checkAudioUsageLimit(requestedVariants);

      if (!usageLimit.allowed) {
        toast.error(usageLimit.message);
        return;
      }

      const variantGroupId = createVariantGroupId();
      await Promise.all(
        Array.from({ length: requestedVariants }, (_, index) =>
          queueAudioJob({
            creativeControls,
            title: brief?.title || "Essence demo",
            prompt: audioPrompt || styleIdea,
            style: [styleIdea, activePersonaPrompt, activeVoicePrompt]
              .concat(activeModelPrompt)
              .filter(Boolean)
              .join("\n\n"),
            lyrics,
            variantCount: requestedVariants,
            variantGroupId,
            variantIndex: index + 1,
            voiceProfile: activeVoiceAttachment,
          }),
        ),
      );
      toast.success(
        requestedVariants > 1
          ? `${requestedVariants} audio takes queued.`
          : "Audio job queued.",
      );
      recordUsageEvent({
        kind: "audio",
        label: "Music generation",
        status: "succeeded",
        units: requestedVariants,
      });
    } catch (error) {
      recordUsageEvent({
        kind: "audio",
        label: "Music generation",
        status: "failed",
        units: variantsReady ? variantCount : 1,
      });
      toast.error(error instanceof Error ? error.message : "Audio job failed.");
    } finally {
      setBusy(undefined);
    }
  }

  async function runAudioJobRefresh() {
    if (!audioJob.id) {
      return;
    }

    setBusy("audio-status");
    try {
      const result = await refreshAudioJob();
      if (result.audioUrl) {
        toast.success("Audio result is ready.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Audio status failed.");
    } finally {
      setBusy(undefined);
    }
  }

  async function runCoverRemix() {
    if (!sourceSong || !onCoverRemix) {
      return;
    }

    setBusy("cover-remix");
    try {
      await onCoverRemix({
        creativeControls,
        lyrics,
        mode: "remix",
        notes: [theme, audioPrompt].filter(Boolean).join("\n"),
        source: sourceSong,
        targetStyle: styleIdea,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cover/remix failed.");
    } finally {
      setBusy(undefined);
    }
  }

  async function runGeneratedVocals() {
    if (!sourceSong || !onGenerateVocals || !activeVoiceAttachment) {
      toast.error("Select a track and confirmed voice profile first.");
      return;
    }

    setBusy("generated-vocals");
    try {
      await onGenerateVocals({
        directionPrompt: audioPrompt || styleIdea,
        lyrics,
        notes: [theme, activeVoicePrompt].filter(Boolean).join("\n"),
        source: sourceSong,
        voiceProfile: activeVoiceAttachment,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Generated vocals failed.",
      );
    } finally {
      setBusy(undefined);
    }
  }

  async function runGeneratedInstrumental() {
    if (!sourceSong || !onGenerateInstrumental) {
      toast.error("Select a track before generating instrumental backing.");
      return;
    }

    setBusy("generated-instrumental");
    try {
      await onGenerateInstrumental({
        directionPrompt: audioPrompt || styleIdea,
        lyrics,
        notes: [theme, styleIdea].filter(Boolean).join("\n"),
        source: sourceSong,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Generated instrumental failed.",
      );
    } finally {
      setBusy(undefined);
    }
  }

  async function runPersonaGeneration() {
    if (!sourceSong || !onGeneratePersona) {
      toast.error("Select a track before generating a persona.");
      return;
    }

    setBusy("persona-generation");
    try {
      await onGeneratePersona({
        analysisPrompt:
          [theme, styleIdea, audioPrompt, activePersonaPrompt]
            .filter(Boolean)
            .join("\n") || "Analyze this original track into reusable persona metadata.",
        notes: [lyrics, sourceSong.tags.join(", ")].filter(Boolean).join("\n"),
        source: sourceSong,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Persona generation failed.",
      );
    } finally {
      setBusy(undefined);
    }
  }

  async function runSampleGeneration() {
    if (!onGenerateSample) {
      return;
    }

    setBusy("sample");
    try {
      await onGenerateSample({
        creativeControls,
        durationMs: sampleDurationSeconds * 1000,
        prompt: audioPrompt || theme,
        source:
          sourceSong?.rightsMetadata.rightsConfirmed &&
          sourceSong.rightsMetadata.originalWork
            ? sourceSong
            : undefined,
        sourceContext:
          sourceSong?.rightsMetadata.rightsConfirmed &&
          sourceSong.rightsMetadata.originalWork
          ? [sourceSong.stylePrompt, sourceSong.tags.join(", ")]
              .filter(Boolean)
              .join("\n")
          : undefined,
        style: styleIdea,
        title: `${brief?.title || "Essence"} sample`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sample generation failed.");
    } finally {
      setBusy(undefined);
    }
  }

  async function saveAudioResult() {
    if (!audioJob.audioUrl) {
      return;
    }

    setBusy("audio-save");
    try {
      const response = await fetch(audioJob.audioUrl);

      if (!response.ok) {
        throw new Error("Could not fetch generated audio.");
      }

      const audioBlob = await response.blob();
      let durationMs = 0;

      try {
        durationMs = await getAudioDurationMs(audioBlob);
      } catch {
        durationMs = 0;
      }

      await onGeneratedAudio({
        audioBlob,
        durationMs,
        lyrics,
        mediaType: audioJob.mediaType || audioBlob.type,
        stylePrompt: styleIdea,
        tags: ["generated"],
        title: audioJob.title || brief?.title || "Generated audio",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save generated audio.",
      );
    } finally {
      setBusy(undefined);
    }
  }

  function applyCreationDraft(draft: CreationDraftInput) {
    protectComposerBeforeHandoff(draft, snapshotReasonFromSource(draft.source));
    setTheme(draft.theme);
    setStyleIdea(draft.styleIdea);
    setLyrics(draft.lyrics);
    setAudioPrompt(draft.audioPrompt);
    setCoverPrompt(draft.coverPrompt);
    setCreativeControls(draft.creativeControls ?? defaultCreativeControls);
    if (draft.persona?.rightsConfirmed) {
      setActivePersonaId(draft.persona.id);
    }
    if (draft.voiceProfile?.rightsConfirmed) {
      setActiveVoiceProfileId(draft.voiceProfile.id);
    }
    onLyrics(draft.lyrics);
    onStyle(draft.styleIdea);
  }

  function getCurrentComposerDraft(): CreationDraftInput {
    return {
      audioPrompt,
      coverPrompt,
      creativeControls,
      lyrics,
      persona: activePersonaAttachment,
      styleIdea,
      theme,
      title: brief?.title || metadata?.titles?.[0] || "Untitled draft",
      voiceProfile: activeVoiceAttachment,
    };
  }

  function protectComposerBeforeHandoff(
    nextDraft: CreationDraftInput,
    reason: ComposerSnapshotReason,
  ) {
    const currentDraft = getCurrentComposerDraft();
    const changedFields = composerConflictFields(currentDraft, nextDraft);

    if (!changedFields.length) {
      return;
    }

    const snapshot = composerSnapshots.saveSnapshot({
      changedFields,
      draft: currentDraft,
      handoffTitle: nextDraft.title,
      reason,
    });

    if (snapshot) {
      toast.message("Composer snapshot saved before handoff.");
    }
  }

  function saveManualComposerSnapshot() {
    const snapshot = composerSnapshots.saveSnapshot({
      changedFields: ["Manual snapshot"],
      draft: getCurrentComposerDraft(),
      handoffTitle: "Manual composer snapshot",
      reason: "manual",
    });

    if (snapshot) {
      toast.success("Composer snapshot saved.");
    }
  }

  function previewSnapshotRestore(snapshot: ComposerSnapshot) {
    setPendingSnapshot(snapshot);
    setSnapshotSelection(
      createDraftHandoffSelection(getCurrentComposerDraft(), snapshot.draft),
    );
    toast.message("Review snapshot changes before restoring.");
  }

  function toggleSnapshotSection(
    section: DraftHandoffSection,
    checked: boolean,
  ) {
    setSnapshotSelection((currentSelection) => ({
      ...currentSelection,
      [section]: checked,
    }));
  }

  function applySelectedSnapshotSections() {
    if (!pendingSnapshot || !hasSelectedDraftSections(snapshotSelection)) {
      return;
    }

    const nextDraft = composeDraftHandoff(
      getCurrentComposerDraft(),
      pendingSnapshot.draft,
      snapshotSelection,
    );
    applyCreationDraft(nextDraft);
    setPendingSnapshot(null);
    setSnapshotSelection(emptySnapshotSelection);
    toast.success("Selected snapshot sections restored.");
  }

  function deleteComposerSnapshot(id: string) {
    composerSnapshots.deleteSnapshot(id);
    if (pendingSnapshot?.id === id) {
      setPendingSnapshot(null);
      setSnapshotSelection(emptySnapshotSelection);
    }
    toast.success("Composer snapshot deleted.");
  }

  function deleteComposerSnapshots(ids: string[]) {
    composerSnapshots.deleteSnapshots(ids);
    if (pendingSnapshot && ids.includes(pendingSnapshot.id)) {
      setPendingSnapshot(null);
      setSnapshotSelection(emptySnapshotSelection);
    }
    toast.success(
      `${ids.length} composer snapshot${ids.length === 1 ? "" : "s"} deleted.`,
    );
  }

  function updateComposerSnapshotNote(id: string, note: string) {
    composerSnapshots.updateSnapshotNote(id, note);
    toast.success(
      note.trim()
        ? "Composer snapshot note saved."
        : "Composer snapshot note cleared.",
    );
  }

  function toggleComposerSnapshotPin(id: string) {
    composerSnapshots.toggleSnapshotPin(id);
    toast.success("Composer snapshot pin updated.");
  }

  function exportComposerSnapshots() {
    const archive = composerSnapshots.exportSnapshots();
    const blob = new Blob([archive], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `essence-suno-composer-snapshots-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Composer snapshots exported.");
  }

  async function importComposerSnapshotArchive(file: File) {
    try {
      const result = composerSnapshots.importSnapshots(await file.text());

      if (result.imported > 0) {
        toast.success(
          `Imported ${result.imported} composer snapshot${
            result.imported === 1 ? "" : "s"
          }.`,
        );
        return;
      }

      toast.message(
        result.total
          ? "No new compatible snapshots were imported."
          : "That file did not contain a compatible snapshot archive.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not import composer snapshots.",
      );
    }
  }

  function createReusablePromptDraft(prompt: ReusePromptContext): CreationDraftInput {
    return {
      audioPrompt: prompt.audioPrompt,
      coverPrompt: prompt.coverPrompt,
      creativeControls,
      lyrics: prompt.lyrics,
      persona: {
        id: `reuse:${prompt.sourceSongId}`,
        name: prompt.persona.name,
        rightsConfirmed: false,
        summary: [
          prompt.persona.vibe,
          prompt.persona.vocalCharacter,
          prompt.persona.energy,
        ]
          .filter(Boolean)
          .join(" / "),
      },
      source: {
        detail: prompt.sourceTitle,
        label: "Reuse",
        type: "reuse",
      },
      styleIdea: prompt.styleIdea,
      theme: prompt.theme,
      title: prompt.draftTitle,
    };
  }

  function createPlaylistDraft(
    fingerprint: PlaylistFingerprint,
  ): CreationDraftInput {
    const coverDirection = `Cover art for "${fingerprint.playlistName}": ${fingerprint.stylePrompt}`;

    return {
      audioPrompt: fingerprint.audioPrompt,
      coverPrompt: coverDirection,
      creativeControls,
      lyrics,
      source: {
        detail: fingerprint.theme,
        label: "Playlist",
        type: "playlist",
      },
      styleIdea: fingerprint.stylePrompt,
      theme: fingerprint.theme,
      title: `Playlist inspire - ${fingerprint.playlistName}`,
    };
  }

  function saveReusePersona() {
    if (!reusePrompt) {
      return;
    }

    if (!reusePersonaRightsConfirmed) {
      toast.error("Confirm rights before saving this persona.");
      return;
    }

    const persona = personaLibrary.save(
      createPersonaInputFromReusePrompt(reusePrompt, true),
    );
    setActivePersonaId(persona.id);
    toast.success(`${persona.name} saved and selected.`);
  }

  async function copyHookCaptions() {
    if (!hookCaptions || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(hookCaptions);
    toast.success("Hook captions copied.");
  }

  async function copyCoverPrompt() {
    if (!coverPrompt || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(coverPrompt);
    toast.success("Cover prompt copied.");
  }

  function downloadCoverImage() {
    if (!coverImage) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = coverImage;
    anchor.download = `${(brief?.title || metadata?.titles?.[0] || "cover")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}-cover.png`;
    anchor.click();
  }

  function updateCreativeControl(key: keyof CreativeControls, value: number) {
    setCreativeControls((current) => ({
      ...current,
      [key]: clampInteger(value, 0, 100),
    }));
  }

  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-emerald-200" />
            AI composer
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <CapabilityBadge label="Text" ready={status.text} />
            <CapabilityBadge label="Image" ready={status.image} />
            <CapabilityBadge label="Audio" ready={status.audio} />
            <CapabilityBadge label="Persona" ready={personaProviderReady} />
            <CapabilityBadge label="Voice" ready={voiceProviderReady} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {connectionDisabled ? (
          <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-50">
            {onlineGuard.generationDisabledReason} Local writing, drafts,
            metadata review, and open project work remain available.
          </div>
        ) : null}
        <div className="rounded-md border border-white/10 bg-slate-950/45 p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-medium">Persona direction</p>
              <p className="text-sm text-muted-foreground">
                Use confirmed local personas as writing and generation metadata.
              </p>
            </div>
            <Badge
              variant="secondary"
              className={
                personaProviderReady ? "bg-emerald-400/15 text-emerald-200" : ""
              }
            >
              {personaProviderReady ? "generation ready" : "metadata only"}
            </Badge>
          </div>
          {personaLibrary.personas.length ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {personaLibrary.personas.slice(0, 4).map((persona) => (
                <button
                  key={persona.id}
                  type="button"
                  className={`rounded-md border p-3 text-left transition-colors ${
                    activePersonaId === persona.id
                      ? "border-emerald-300/40 bg-emerald-300/[0.08]"
                      : "border-white/10 bg-black/20 hover:bg-white/5"
                  }`}
                  disabled={!persona.rightsConfirmed}
                  onClick={() => setActivePersonaId(persona.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{persona.name}</p>
                    <Badge
                      variant="secondary"
                      className={
                        persona.rightsConfirmed
                          ? "bg-emerald-400/15 text-emerald-200"
                          : "bg-rose-400/15 text-rose-200"
                      }
                    >
                      {persona.rightsConfirmed ? "confirmed" : "blocked"}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {persona.vibe || persona.stylePrompt || "No direction"}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Add personas in Settings to reuse a confirmed creative identity.
            </p>
          )}
          {activePersonaId ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setActivePersonaId("")}
            >
              Clear persona
            </Button>
          ) : null}
          {reusePrompt ? (
            <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Reuse handoff: {reusePrompt.persona.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {reusePrompt.persona.vibe} / {reusePrompt.persona.energy}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Switch
                    checked={reusePersonaRightsConfirmed}
                    onCheckedChange={setReusePersonaRightsConfirmed}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={saveReusePersona}
                  >
                    Save persona
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <div className="rounded-md border border-white/10 bg-slate-950/45 p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="flex items-center gap-2 font-medium">
                <Mic2 className="size-4 text-emerald-200" />
                Voice profile
              </p>
              <p className="text-sm text-muted-foreground">
                Attach confirmed local voice metadata to drafts and audio jobs.
              </p>
            </div>
            <Badge
              variant="secondary"
              className={
                voiceProviderReady ? "bg-emerald-400/15 text-emerald-200" : ""
              }
            >
              {voiceProviderReady ? "voice ready" : "metadata only"}
            </Badge>
          </div>
          {voiceProfiles.profiles.length ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {voiceProfiles.profiles.slice(0, 4).map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className={`rounded-md border p-3 text-left transition-colors ${
                    activeVoiceProfileId === profile.id
                      ? "border-emerald-300/40 bg-emerald-300/[0.08]"
                      : "border-white/10 bg-black/20 hover:bg-white/5"
                  }`}
                  disabled={!profile.rightsConfirmed}
                  onClick={() => setActiveVoiceProfileId(profile.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{profile.name}</p>
                    <Badge
                      variant="secondary"
                      className={
                        profile.rightsConfirmed
                          ? "bg-emerald-400/15 text-emerald-200"
                          : "bg-rose-400/15 text-rose-200"
                      }
                    >
                      {profile.rightsConfirmed ? "confirmed" : "blocked"}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {[profile.range, profile.tone, profile.language]
                      .filter(Boolean)
                      .join(" / ") || "No voice details"}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Add voice profiles in Settings to attach local voice metadata.
            </p>
          )}
          {activeVoiceProfileId ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setActiveVoiceProfileId("")}
            >
              Clear voice
            </Button>
          ) : null}
        </div>
        <div className="rounded-md border border-white/10 bg-slate-950/45 p-3">
          <div>
            <p className="flex items-center gap-2 font-medium">
              <BrainCircuit className="size-4 text-emerald-200" />
              Custom model card
            </p>
            <p className="text-sm text-muted-foreground">
              Attach saved model constraints to provider-backed audio requests.
            </p>
          </div>
          {customModels.cards.length ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {customModels.cards.slice(0, 4).map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className={`rounded-md border p-3 text-left transition-colors ${
                    activeModelCardId === card.id
                      ? "border-emerald-300/40 bg-emerald-300/[0.08]"
                      : "border-white/10 bg-black/20 hover:bg-white/5"
                  }`}
                  disabled={!card.rightsConfirmed}
                  onClick={() => setActiveModelCardId(card.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{card.name}</p>
                    <Badge
                      variant="secondary"
                      className={
                        card.rightsConfirmed
                          ? "bg-emerald-400/15 text-emerald-200"
                          : "bg-rose-400/15 text-rose-200"
                      }
                    >
                      {card.rightsConfirmed ? "confirmed" : "blocked"}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {card.styleSummary || card.constraints || card.modelIntent}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Completed training jobs will appear in Settings as model cards.
            </p>
          )}
          {activeModelCardId ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setActiveModelCardId("")}
            >
              Clear model card
            </Button>
          ) : null}
        </div>
        {fingerprints.length ? (
          <div className="rounded-md border border-white/10 bg-slate-950/45 p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">Playlist inspiration</p>
                <p className="text-sm text-muted-foreground">
                  Reuse saved playlist fingerprints as composer direction.
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {fingerprints.slice(0, 4).map((fingerprint) => (
                <button
                  key={`${fingerprint.playlistId}:${fingerprint.createdAt}`}
                  type="button"
                  className="rounded-md border border-white/10 bg-black/20 p-3 text-left hover:bg-white/5"
                  onClick={() => applyPlaylistFingerprint(fingerprint)}
                >
                  <p className="truncate text-sm font-medium">
                    {fingerprint.playlistName}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {fingerprint.stylePrompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <CreationDraftsPanel
          current={getCurrentComposerDraft()}
          onApply={applyCreationDraft}
        />
        <ComposerSnapshotPanel
          current={getCurrentComposerDraft()}
          onDelete={deleteComposerSnapshot}
          onDeleteMany={deleteComposerSnapshots}
          onExport={exportComposerSnapshots}
          onImport={importComposerSnapshotArchive}
          onRestore={previewSnapshotRestore}
          onSnapshot={saveManualComposerSnapshot}
          onTogglePin={toggleComposerSnapshotPin}
          onUpdateNote={updateComposerSnapshotNote}
          snapshots={composerSnapshots.snapshots}
        />
        {pendingSnapshot ? (
          <CreationDraftHandoffPreview
            applyLabel="Restore selected"
            changes={snapshotChanges}
            heading="Restore snapshot"
            onApply={applySelectedSnapshotSections}
            onCancel={() => {
              setPendingSnapshot(null);
              setSnapshotSelection(emptySnapshotSelection);
            }}
            onToggle={toggleSnapshotSection}
            selectedCount={snapshotSelectedCount}
            selection={snapshotSelection}
            subtitle={snapshotRestoreSubtitle(pendingSnapshot)}
            title={pendingSnapshot.draft.title}
          />
        ) : null}
        <Tabs defaultValue="lyrics" className="space-y-5">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
            <TabsTrigger value="brief">Brief</TabsTrigger>
            <TabsTrigger value="cover">Cover</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="lyrics" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <TextAreaField
                id="ai-theme"
                label="Theme"
                value={theme}
                onChange={setTheme}
              />
              <TextAreaField
                id="ai-style"
                label="Style"
                value={styleIdea}
                onChange={setStyleIdea}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-slate-950/50 px-3 py-2">
                <Switch
                  checked={useTaste && tasteReady}
                  onCheckedChange={setUseTaste}
                  disabled={!tasteReady}
                />
                <Label>Use My taste</Label>
              </div>
              <Button
                disabled={textDisabled || busy === "lyrics"}
                title={generationActionTitle("Generate lyrics")}
                onClick={runLyrics}
              >
                {busy === "lyrics" ? busyIcon : <Music2 className="size-4" />}
                Generate lyrics
              </Button>
              <Button
                variant="secondary"
                disabled={textDisabled || busy === "style"}
                title={generationActionTitle("Expand style")}
                onClick={runStyle}
              >
                {busy === "style" ? busyIcon : <Sparkles className="size-4" />}
                Expand style
              </Button>
            </div>
            <Textarea
              value={lyrics}
              onChange={(event) => {
                setLyrics(event.target.value);
                onLyrics(event.target.value);
              }}
              className="min-h-64"
              placeholder="Lyrics will appear here"
            />
          </TabsContent>

          <TabsContent value="brief" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={textDisabled || busy === "brief"}
                title={generationActionTitle("Generate brief")}
                onClick={runBrief}
              >
                {busy === "brief" ? busyIcon : <AudioLines className="size-4" />}
                Generate brief
              </Button>
              <Button
                variant="secondary"
                disabled={textDisabled || busy === "metadata"}
                title={generationActionTitle("Suggest metadata")}
                onClick={runMetadata}
              >
                {busy === "metadata" ? busyIcon : <Tags className="size-4" />}
                Suggest metadata
              </Button>
              <Button
                variant="secondary"
                disabled={textDisabled || busy === "playlist"}
                title={generationActionTitle("Generate playlist ideas")}
                onClick={runPlaylistIdeas}
              >
                {busy === "playlist" ? busyIcon : <ListMusic className="size-4" />}
                Playlist ideas
              </Button>
              <Button
                variant="secondary"
                disabled={textDisabled || busy === "captions"}
                title={generationActionTitle("Generate hook captions")}
                onClick={runHookCaptions}
              >
                {busy === "captions" ? (
                  busyIcon
                ) : (
                  <MessageSquareText className="size-4" />
                )}
                Hook captions
              </Button>
              <Button
                variant="secondary"
                disabled={
                  busy === "audio" ||
                  connectionDisabled ||
                  !status.audio ||
                  (variantCount > 1 && !variantsReady)
                }
                title={generationActionTitle(
                  variantCount > 1 ? `Queue ${variantCount} takes` : "Queue audio",
                )}
                onClick={runAudioJob}
              >
                {busy === "audio" ? busyIcon : <Music2 className="size-4" />}
                {variantCount > 1 ? `Queue ${variantCount} takes` : "Queue audio"}
              </Button>
              <Button
                variant="secondary"
                disabled={
                  busy === "cover-remix" ||
                  connectionDisabled ||
                  coverRemixBusy ||
                  !coverRemixReady ||
                  !sourceSong ||
                  !onCoverRemix
                }
                title={generationActionTitle("Queue remix")}
                onClick={runCoverRemix}
              >
                {busy === "cover-remix" ? busyIcon : <Shuffle className="size-4" />}
                Queue remix
              </Button>
              <Button
                variant="secondary"
                disabled={
                  busy === "generated-vocals" ||
                  connectionDisabled ||
                  generatedVocalsBusy ||
                  !generatedVocalsReady ||
                  !sourceSong ||
                  !activeVoiceAttachment ||
                  !onGenerateVocals
                }
                title={generationActionTitle("Add vocals")}
                onClick={runGeneratedVocals}
              >
                {busy === "generated-vocals" ? busyIcon : <Mic2 className="size-4" />}
                Add vocals
              </Button>
              <Button
                variant="secondary"
                disabled={
                  busy === "generated-instrumental" ||
                  connectionDisabled ||
                  generatedInstrumentalBusy ||
                  !generatedInstrumentalReady ||
                  !sourceSong ||
                  !onGenerateInstrumental
                }
                title={generationActionTitle("Add instrumental")}
                onClick={runGeneratedInstrumental}
              >
                {busy === "generated-instrumental" ? (
                  busyIcon
                ) : (
                  <Music2 className="size-4" />
                )}
                Add instrumental
              </Button>
              <Button
                variant="secondary"
                disabled={
                  busy === "persona-generation" ||
                  connectionDisabled ||
                  personaGenerationBusy ||
                  !personaGenerationReady ||
                  !sourceSong ||
                  !onGeneratePersona
                }
                title={generationActionTitle("Generate persona")}
                onClick={runPersonaGeneration}
              >
                {busy === "persona-generation" ? (
                  busyIcon
                ) : (
                  <Fingerprint className="size-4" />
                )}
                Generate persona
              </Button>
              <Button
                variant="secondary"
                disabled={
                  busy === "sample" ||
                  connectionDisabled ||
                  sampleBusy ||
                  !sampleReady ||
                  !onGenerateSample
                }
                title={generationActionTitle("Queue sample")}
                onClick={runSampleGeneration}
              >
                {busy === "sample" ? busyIcon : <AudioLines className="size-4" />}
                Queue sample
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
              <Input
                value={audioPrompt}
                onChange={(event) => setAudioPrompt(event.target.value)}
                placeholder="Optional audio job prompt"
              />
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <AudioLines className="size-4 text-emerald-200" />
                  Sample sec
                </Label>
                <Input
                  min={1}
                  max={30}
                  type="number"
                  value={sampleDurationSeconds}
                  disabled={!sampleReady}
                  title={generationActionTitle(
                    "Sample duration is active when sample generation is connected.",
                  )}
                  onChange={(event) =>
                    setSampleDurationSeconds(
                      clampInteger(event.target.valueAsNumber, 1, 30),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Layers3 className="size-4 text-emerald-200" />
                  Takes
                </Label>
                <Input
                  min={1}
                  max={4}
                  type="number"
                  value={variantCount}
                  disabled={!variantsReady}
                  title={generationActionTitle(
                    "Takes are active when multi-take generation is connected.",
                  )}
                  onChange={(event) =>
                    setVariantCount(clampVariantCount(event.target.valueAsNumber))
                  }
                />
              </div>
            </div>
            {!variantsReady ? (
              <p className="text-xs text-muted-foreground">
                Multi-take generation stays locked until music generation is connected.
              </p>
            ) : null}
            <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <SlidersHorizontal className="size-4 text-emerald-200" />
                    Creative controls
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Active for connected generators that declare support.
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={
                    creativeControlsReady
                      ? "bg-emerald-400/15 text-emerald-200"
                      : ""
                  }
                >
                  {creativeControlsReady ? "ready" : "locked"}
                </Badge>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <CreativeControlField
                  disabled={!creativeControlsReady}
                  disabledReason={generationActionTitle(
                    "Creative controls are active for connected generators.",
                  )}
                  label="Weirdness"
                  value={creativeControls.weirdness}
                  onChange={(value) => updateCreativeControl("weirdness", value)}
                />
                <CreativeControlField
                  disabled={!creativeControlsReady}
                  disabledReason={generationActionTitle(
                    "Creative controls are active for connected generators.",
                  )}
                  label="Structure"
                  value={creativeControls.structure}
                  onChange={(value) => updateCreativeControl("structure", value)}
                />
                <CreativeControlField
                  disabled={!creativeControlsReady}
                  disabledReason={generationActionTitle(
                    "Creative controls are active for connected generators.",
                  )}
                  label="Reference"
                  value={creativeControls.referenceInfluence}
                  onChange={(value) =>
                    updateCreativeControl("referenceInfluence", value)
                  }
                />
              </div>
            </div>
            {audioJob.id ? (
              <div className="rounded-md border border-white/10 bg-slate-950/50 p-3 text-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      <PlayCircle className="size-4 text-emerald-200" />
                      Audio job
                    </p>
                    <p className="truncate text-muted-foreground">
                      {audioJob.id} {audioJob.status ? `/ ${audioJob.status}` : ""}
                    </p>
                    {audioJob.error ? (
                      <p className="mt-1 text-xs text-rose-200">{audioJob.error}</p>
                    ) : null}
                  </div>
                  <Button
                    variant="secondary"
                    disabled={busy === "audio-status" || connectionDisabled}
                    title={generationActionTitle("Check status")}
                    onClick={runAudioJobRefresh}
                  >
                    {busy === "audio-status" ? busyIcon : "Check status"}
                  </Button>
                </div>
                {audioJob.audioUrl ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {audioJob.title}
                      {audioJob.mediaType ? ` / ${audioJob.mediaType}` : ""}
                    </p>
                    <audio controls className="w-full" src={audioJob.audioUrl} />
                    <Button
                      variant="secondary"
                      disabled={busy === "audio-save" || connectionDisabled}
                      title={generationActionTitle("Save generated audio to library")}
                      onClick={saveAudioResult}
                    >
                      {busy === "audio-save" ? busyIcon : <Music2 className="size-4" />}
                      Save to library
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <AiBriefView brief={brief} onApply={onMetadata} />
            <AiMetadataView metadata={metadata} onApply={onMetadata} />
            {hookCaptions ? (
              <div className="space-y-3 rounded-md border border-white/10 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Hook captions</p>
                    <p className="text-sm text-muted-foreground">
                      Short copy for preview posts and creator updates.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-2"
                    onClick={() => {
                      void copyHookCaptions();
                    }}
                  >
                    <Clipboard className="size-4" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={hookCaptions}
                  onChange={(event) => setHookCaptions(event.target.value)}
                  className="min-h-32"
                />
              </div>
            ) : null}
            <AiPlaylistIdeasView inspiration={playlistIdeas} />
          </TabsContent>

          <TabsContent value="cover" className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                disabled={textDisabled || busy === "cover"}
                title={generationActionTitle("Create cover prompt")}
                onClick={runCover}
              >
                {busy === "cover" ? busyIcon : <ImageIcon className="size-4" />}
                Create cover prompt
              </Button>
              <div
                className="flex items-center gap-2 rounded-md border border-white/10 bg-slate-950/50 px-3 py-2"
                title={generationActionTitle("Generate image")}
              >
                <Switch
                  checked={generateImage}
                  onCheckedChange={setGenerateImage}
                  disabled={!status.image || connectionDisabled}
                />
                <Label>Generate image</Label>
              </div>
            </div>
            <Textarea
              value={coverPrompt}
              onChange={(event) => setCoverPrompt(event.target.value)}
              className="min-h-40"
              placeholder="Cover prompt"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                className="gap-2"
                disabled={!coverPrompt}
                onClick={() => {
                  void copyCoverPrompt();
                }}
              >
                <Clipboard className="size-4" />
                Copy prompt
              </Button>
              <Button
                variant="ghost"
                className="gap-2"
                disabled={!coverImage}
                onClick={downloadCoverImage}
              >
                <Download className="size-4" />
                Download cover
              </Button>
            </div>
            {coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImage}
                alt="Generated cover"
                className="aspect-square w-full max-w-sm rounded-md border border-white/10 object-cover"
              />
            ) : null}
          </TabsContent>

          <TabsContent value="chat">
            <AiChatBox
              disabled={textDisabled}
              disabledReason={textDisabled ? chatDisabledReason : undefined}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function CreativeControlField({
  disabled,
  disabledReason,
  label,
  value,
  onChange,
}: {
  disabled: boolean;
  disabledReason?: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2" title={disabled ? disabledReason : undefined}>
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {value}
        </span>
      </div>
      <Slider
        aria-label={label}
        disabled={disabled}
        max={100}
        min={0}
        step={1}
        title={disabled ? disabledReason : undefined}
        value={[value]}
        onValueChange={(values) => onChange(values[0] ?? value)}
      />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-28"
      />
    </div>
  );
}

function clampVariantCount(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(4, Math.max(1, Math.round(value)));
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function reasonLabel(reason: ComposerSnapshotReason) {
  const labels: Record<ComposerSnapshotReason, string> = {
    draft: "Draft",
    manual: "Manual",
    playlist: "Playlist",
    replay: "Replay",
    reuse: "Reuse",
  };

  return labels[reason];
}

function snapshotRestoreSubtitle(snapshot: ComposerSnapshot) {
  return [
    `${reasonLabel(snapshot.reason)} snapshot from ${new Date(
      snapshot.createdAt,
    ).toLocaleString()}`,
    snapshot.changedFields.join(", "),
    snapshot.note ? `Note: ${snapshot.note}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function createVariantGroupId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
