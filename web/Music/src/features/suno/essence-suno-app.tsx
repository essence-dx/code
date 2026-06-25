"use client";

import {
  Clipboard,
  Compass,
  Film,
  LayoutDashboard,
  Library,
  ListMusic,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDuration } from "@/features/audio/format";
import {
  createReusePromptContext,
  type ReusePromptContext,
} from "@/features/ai/reuse-prompt";
import type { PlaylistFingerprint } from "@/features/ai/playlist-fingerprint";
import { useAudioToMidiJob } from "@/features/ai/use-audio-to-midi-job";
import { useCoverRemixJob } from "@/features/ai/use-cover-remix-job";
import { useCustomModelCards } from "@/features/ai/use-custom-model-cards";
import { useExtendSongJob } from "@/features/ai/use-extend-song-job";
import { useAiStatus } from "@/features/ai/use-ai-status";
import { useCreationDrafts } from "@/features/ai/use-creation-drafts";
import { useGeneratedInstrumentalJob } from "@/features/ai/use-generated-instrumental-job";
import { useGeneratedVocalsJob } from "@/features/ai/use-generated-vocals-job";
import { useModelTrainingJob } from "@/features/ai/use-model-training-job";
import { usePersonaGenerationJob } from "@/features/ai/use-persona-generation-job";
import { usePersonaLibrary } from "@/features/ai/use-persona-library";
import { useRemasterJob } from "@/features/ai/use-remaster-job";
import { useRemoveFxJob } from "@/features/ai/use-remove-fx-job";
import { useReplaceSectionJob } from "@/features/ai/use-replace-section-job";
import { useSampleJob } from "@/features/ai/use-sample-job";
import { useTasteProfile } from "@/features/ai/use-taste-profile";
import { useVoiceProfiles } from "@/features/ai/use-voice-profiles";
import { useWarpMarkerJob } from "@/features/ai/use-warp-marker-job";
import { toVoiceProfileAttachment } from "@/features/ai/voice-profiles";
import { DashboardPanel } from "@/features/admin/dashboard-panel";
import { useHookFeed } from "@/features/hooks/use-hook-feed";
import type { LocalSong } from "@/features/library/types";
import { useLocalLibrary } from "@/features/library/use-local-library";
import { useStemExtraction } from "@/features/ai/use-stem-extraction";
import { useStemVariationJob } from "@/features/ai/use-stem-variation-job";
import { getOnlineActionTitle } from "@/features/system/online-action-guard";
import { getSongRightsReadiness } from "@/lib/library/rights";
import type { CreativeControls } from "@/lib/ai/schemas";
import { AiPanel } from "./ai-panel";
import { AiJobsPanel } from "./ai-jobs-panel";
import { AudioToMidiPanel } from "./audio-to-midi-panel";
import { CoverRemixPanel } from "./cover-remix-panel";
import { ExtendSongPanel } from "./extend-song-panel";
import { EssenceLogoMark } from "./essence-logo";
import { GeneratedInstrumentalPanel } from "./generated-instrumental-panel";
import { GeneratedVocalsPanel } from "./generated-vocals-panel";
import { HookFeedPanel } from "./hook-feed-panel";
import { HookVideoPanel } from "./hook-video-panel";
import { LibraryPanel } from "./library-panel";
import { ModelTrainingPanel } from "./model-training-panel";
import { PersonaGenerationPanel } from "./persona-generation-panel";
import { PlayerBar } from "./player-bar";
import { PlaylistsPanel } from "./playlists-panel";
import { ProjectMixerPanel } from "./project-mixer-panel";
import { RecordPanel } from "./record-panel";
import { RemasterPanel } from "./remaster-panel";
import { RemoveFxPanel } from "./remove-fx-panel";
import { ReplaceSectionPanel } from "./replace-section-panel";
import { RightsMetadataPanel } from "./rights-metadata-panel";
import { SampleGenerationPanel } from "./sample-generation-panel";
import { SettingsPanel } from "./settings-panel";
import { SongReadinessPanel } from "./song-readiness-panel";
import { StatStrip } from "./stat-strip";
import { StemExtractionPanel } from "./stem-extraction-panel";
import { StemVariationPanel } from "./stem-variation-panel";
import { StudioPanel } from "./studio-panel";
import { UploadDropzone } from "./upload-dropzone";

type ViewKey =
  | "dashboard"
  | "create"
  | "library"
  | "playlists"
  | "studio"
  | "hooks"
  | "ai"
  | "settings";

const views = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "create", label: "Create", icon: Upload },
  { key: "library", label: "Library", icon: Library },
  { key: "playlists", label: "Playlists", icon: ListMusic },
  { key: "studio", label: "Studio", icon: SlidersHorizontal },
  { key: "hooks", label: "Hooks", icon: Film },
  { key: "ai", label: "AI", icon: Sparkles },
  { key: "settings", label: "Settings", icon: Settings },
] satisfies Array<{ key: ViewKey; label: string; icon: typeof Upload }>;

const embeddedViews = views.filter((view) =>
  ["create", "library", "studio"].includes(view.key),
);

type EssenceSunoAppProps = {
  embedded?: boolean;
};

export function EssenceSunoApp({ embedded = false }: EssenceSunoAppProps) {
  const [view, setView] = useState<ViewKey>(embedded ? "studio" : "dashboard");
  const [activeQueueIds, setActiveQueueIds] = useState<string[]>([]);
  const [playlistFingerprint, setPlaylistFingerprint] =
    useState<PlaylistFingerprint>();
  const [reusePrompt, setReusePrompt] = useState<ReusePromptContext>();
  const library = useLocalLibrary();
  const creationDrafts = useCreationDrafts();
  const audioToMidi = useAudioToMidiJob();
  const coverRemix = useCoverRemixJob(library.addGeneratedSong);
  const customModels = useCustomModelCards();
  const extendSong = useExtendSongJob(library.addGeneratedSong);
  const generatedInstrumental = useGeneratedInstrumentalJob(
    library.addGeneratedSong,
  );
  const generatedVocals = useGeneratedVocalsJob(library.addGeneratedSong);
  const hookFeed = useHookFeed();
  const personaLibrary = usePersonaLibrary();
  const personaGeneration = usePersonaGenerationJob(personaLibrary.save);
  const modelTraining = useModelTrainingJob(customModels.save);
  const remaster = useRemasterJob(library.addGeneratedSong);
  const removeFx = useRemoveFxJob(library.addGeneratedSong);
  const replaceSection = useReplaceSectionJob(library.addGeneratedSong);
  const samples = useSampleJob(library.addGeneratedSong);
  const stemExtraction = useStemExtraction(library.addGeneratedSong);
  const stemVariation = useStemVariationJob(library.addGeneratedSong);
  const taste = useTasteProfile(library.songs, creationDrafts.drafts);
  const voiceProfiles = useVoiceProfiles();
  const warpMarkers = useWarpMarkerJob();
  const { status } = useAiStatus();
  const selectedSong = library.selectedSong;
  const discoverDisabled = !library.onlineGuard.canUseConnectionActions;
  const discoverTitle = getOnlineActionTitle(
    library.onlineGuard,
    "sharing",
    "Open Discover",
  );
  const playableSongs = useMemo(() => {
    if (
      !activeQueueIds.length ||
      (selectedSong && !activeQueueIds.includes(selectedSong.id))
    ) {
      return library.songs;
    }

    const songMap = new Map(library.songs.map((song) => [song.id, song]));
    return activeQueueIds
      .map((songId) => songMap.get(songId))
      .filter((song): song is NonNullable<typeof song> => Boolean(song));
  }, [activeQueueIds, library.songs, selectedSong]);
  const selectedIndex = useMemo(
    () => playableSongs.findIndex((song) => song.id === selectedSong?.id),
    [playableSongs, selectedSong?.id],
  );
  const stemExtractionReady = status.capabilities.some(
    (capability) =>
      capability.id === "stem-extraction" && capability.state === "ready",
  );
  const remasterReady = status.capabilities.some(
    (capability) =>
      capability.id === "remaster" && capability.state === "ready",
  );
  const removeFxReady = status.capabilities.some(
    (capability) =>
      capability.id === "remove-fx" && capability.state === "ready",
  );
  const coverRemixReady = status.capabilities.some(
    (capability) =>
      capability.id === "cover-remix" && capability.state === "ready",
  );
  const extendReady = status.capabilities.some(
    (capability) =>
      capability.id === "extend-song" && capability.state === "ready",
  );
  const replaceSectionReady = status.capabilities.some(
    (capability) =>
      capability.id === "replace-section" && capability.state === "ready",
  );
  const midiReady = status.capabilities.some(
    (capability) =>
      capability.id === "audio-to-midi" && capability.state === "ready",
  );
  const instrumentalReady = status.capabilities.some(
    (capability) =>
      capability.id === "instrumental-backing" && capability.state === "ready",
  );
  const sampleReady = status.capabilities.some(
    (capability) =>
      capability.id === "sample-generation" && capability.state === "ready",
  );
  const voiceProviderReady = status.capabilities.some(
    (capability) =>
      capability.id === "voice-generation" && capability.state === "ready",
  );
  const personaGenerationReady = status.capabilities.some(
    (capability) =>
      capability.id === "persona-generation" && capability.state === "ready",
  );
  const modelTrainingReady = status.capabilities.some(
    (capability) =>
      capability.id === "custom-model-training" && capability.state === "ready",
  );
  const stemVariationReady = status.capabilities.some(
    (capability) =>
      capability.id === "stem-variation" && capability.state === "ready",
  );
  const warpMarkersReady = status.capabilities.some(
    (capability) =>
      capability.id === "warp-markers" && capability.state === "ready",
  );
  const activeVoiceProfile = voiceProfiles.profiles.find(
    (profile) => profile.rightsConfirmed,
  );
  const activeVoiceAttachment = activeVoiceProfile
    ? toVoiceProfileAttachment(activeVoiceProfile)
    : null;
  const vocalsReady = voiceProviderReady && Boolean(activeVoiceAttachment);
  const navigationViews = embedded ? embeddedViews : views;

  function selectByOffset(offset: number) {
    if (!playableSongs.length) {
      return;
    }

    const baseIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIndex =
      (baseIndex + offset + playableSongs.length) % playableSongs.length;
    library.setSelectedId(playableSongs[nextIndex].id);
  }

  function playQueue(songIds: string[]) {
    setActiveQueueIds(songIds);

    if (songIds[0]) {
      library.setSelectedId(songIds[0]);
    }
  }

  function reuseSongPrompt(song: LocalSong) {
    library.setSelectedId(song.id);
    setReusePrompt(createReusePromptContext(song));
    setView("ai");
  }

  function usePlaylistFingerprint(fingerprint: PlaylistFingerprint) {
    setPlaylistFingerprint(fingerprint);
    setView("ai");
  }

  async function extractSongStems(song: LocalSong) {
    library.setSelectedId(song.id);
    await stemExtraction.queueStemExtraction(song);
  }

  async function extractSongMidi(song: LocalSong) {
    library.setSelectedId(song.id);
    await audioToMidi.queueAudioToMidi({
      audioBlob: song.audioBlob,
      durationMs: song.durationMs,
      mediaType: song.audioType || song.audioBlob.type || "audio/mpeg",
      notes: [song.stylePrompt, song.tags.join(", ")]
        .filter(Boolean)
        .join("\n"),
      sourceId: song.id,
      sourceKind: "track",
      sourceTitle: song.title,
      title: `${song.title} MIDI`,
    });
  }

  async function extractStemMidi(input: {
    audioUrl: string;
    id: string;
    mediaType: string;
    sourceTitle: string;
    stemType: string;
    title: string;
  }) {
    const response = await fetch(input.audioUrl);

    if (!response.ok) {
      throw new Error(`Could not fetch ${input.title}.`);
    }

    const audioBlob = await response.blob();
    await audioToMidi.queueAudioToMidi({
      audioBlob,
      durationMs: 0,
      mediaType: input.mediaType || audioBlob.type || "audio/mpeg",
      notes: `${input.stemType} stem from ${input.sourceTitle}.`,
      sourceId: input.id,
      sourceKind: "stem",
      sourceTitle: input.title,
      title: `${input.title} MIDI`,
    });
  }

  async function analyzeWarpMarkersSong(song: LocalSong) {
    library.setSelectedId(song.id);
    await warpMarkers.queueWarpMarkers({
      analysisMode: "mixed",
      audioBlob: song.audioBlob,
      durationMs: song.durationMs,
      mediaType: song.audioType || song.audioBlob.type || "audio/mpeg",
      notes: [song.stylePrompt, song.tags.join(", ")]
        .filter(Boolean)
        .join("\n"),
      source: song,
      sourceKind: "track",
      targetGrid: "auto",
      title: `${song.title} warp markers`,
    });
  }

  async function createStemVariation(input: {
    audioUrl: string;
    id: string;
    mediaType: string;
    sourceJobId?: string;
    sourceTitle: string;
    stemType: string;
    title: string;
  }) {
    const response = await fetch(input.audioUrl);

    if (!response.ok) {
      throw new Error(`Could not fetch ${input.title}.`);
    }

    const audioBlob = await response.blob();
    await stemVariation.queueStemVariation({
      audioBlob,
      directionPrompt: `Create a fresh alternate take from this ${input.stemType} stem while preserving timing and musical fit.`,
      durationMs: 0,
      mediaType: input.mediaType || audioBlob.type || "audio/mpeg",
      notes: `${input.stemType} stem from ${input.sourceTitle}.`,
      sourceJobId: input.sourceJobId,
      sourceSongTitle: input.sourceTitle,
      sourceStemId: input.id,
      sourceStemTitle: input.title,
      stemType: input.stemType,
      title: `${input.title} variation`,
    });
  }

  async function generateSongVocals(song: LocalSong) {
    if (!activeVoiceAttachment) {
      toast.error("Add a confirmed voice profile before generating vocals.");
      return;
    }

    library.setSelectedId(song.id);
    await generatedVocals.queueGeneratedVocals({
      audioBlob: song.audioBlob,
      directionPrompt:
        song.stylePrompt || "Add a natural lead vocal that follows the lyrics.",
      durationMs: song.durationMs,
      lyrics: song.lyrics || "Vocal melody placeholder lyrics",
      mediaType: song.audioType || song.audioBlob.type || "audio/mpeg",
      notes: [song.stylePrompt, song.tags.join(", ")]
        .filter(Boolean)
        .join("\n"),
      source: song,
      sourceStyle: song.stylePrompt,
      title: `${song.title} vocals`,
      voiceProfile: activeVoiceAttachment,
    });
  }

  async function generateSongInstrumental(song: LocalSong) {
    library.setSelectedId(song.id);
    await generatedInstrumental.queueGeneratedInstrumental({
      audioBlob: song.audioBlob,
      directionPrompt:
        song.stylePrompt ||
        "Build instrumental backing that supports the vocal and song structure.",
      durationMs: song.durationMs,
      lyrics: song.lyrics,
      mediaType: song.audioType || song.audioBlob.type || "audio/mpeg",
      notes: [song.stylePrompt, song.tags.join(", ")]
        .filter(Boolean)
        .join("\n"),
      source: song,
      sourceKind: "track",
      sourceStyle: song.stylePrompt,
      title: `${song.title} instrumental`,
    });
  }

  async function generateSongSample(song: LocalSong) {
    library.setSelectedId(song.id);
    await samples.queueSample({
      durationMs: 8000,
      prompt:
        song.stylePrompt ||
        `Create a short reusable sample from original source context for ${song.title}.`,
      source: song,
      sourceContext: [song.stylePrompt, song.tags.join(", ")]
        .filter(Boolean)
        .join("\n"),
      style: song.stylePrompt,
      title: `${song.title} sample`,
    });
  }

  async function generatePromptSample(input: {
    creativeControls?: CreativeControls;
    durationMs: number;
    prompt: string;
    source?: LocalSong;
    sourceContext?: string;
    style: string;
    title: string;
  }) {
    await samples.queueSample(input);
  }

  async function generateSongPersona(
    song: LocalSong,
    analysisPrompt?: string,
    notes?: string,
  ) {
    const rights = getSongRightsReadiness(song.rightsMetadata);

    if (
      !song.rightsMetadata.rightsConfirmed ||
      !song.rightsMetadata.originalWork
    ) {
      toast.error(
        song.rightsMetadata.rightsConfirmed
          ? "Persona generation needs original-work confirmation."
          : rights.summary,
      );
      return;
    }

    library.setSelectedId(song.id);
    await personaGeneration.queuePersonaGeneration({
      analysisPrompt:
        analysisPrompt ||
        song.stylePrompt ||
        "Analyze this original track into reusable vocal, vibe, energy, and style metadata.",
      audioBlob: song.audioBlob,
      durationMs: song.durationMs,
      lyrics: song.lyrics,
      mediaType: song.audioType || song.audioBlob.type || "audio/mpeg",
      notes:
        notes ||
        [song.stylePrompt, song.tags.join(", ")].filter(Boolean).join("\n"),
      rightsConfirmed: true,
      source: song,
      sourceStyle: song.stylePrompt,
      title: `${song.title} persona`,
    });
  }

  async function trainCustomModelFromSong(song: LocalSong) {
    const rights = getSongRightsReadiness(song.rightsMetadata);

    if (
      !song.rightsMetadata.rightsConfirmed ||
      !song.rightsMetadata.originalWork
    ) {
      toast.error(
        song.rightsMetadata.rightsConfirmed
          ? "Custom model training needs original-work confirmation."
          : rights.summary,
      );
      return;
    }

    library.setSelectedId(song.id);
    await modelTraining.queueModelTraining({
      constraints:
        song.stylePrompt ||
        "Preserve the source catalog identity while avoiding imitation of third-party material.",
      modelIntent: `Create a reusable model card from ${song.title} for future original generation constraints.`,
      modelName: `${song.title} model card`,
      notes: [song.artist, song.tags.join(", ")].filter(Boolean).join("\n"),
      rightsConfirmed: true,
      sources: [song],
    });
  }

  async function remasterSong(song: LocalSong) {
    library.setSelectedId(song.id);
    await remaster.queueRemaster({
      audioBlob: song.audioBlob,
      durationMs: song.durationMs,
      mediaType: song.audioType || song.audioBlob.type || "audio/mpeg",
      source: song,
      title: `${song.title} remaster`,
    });
  }

  async function removeFxSong(song: LocalSong) {
    library.setSelectedId(song.id);
    await removeFx.queueRemoveFx({
      audioBlob: song.audioBlob,
      cleanupTargets: ["mixed-fx"],
      durationMs: song.durationMs,
      intensity: "balanced",
      mediaType: song.audioType || song.audioBlob.type || "audio/mpeg",
      notes: [song.stylePrompt, song.tags.join(", ")]
        .filter(Boolean)
        .join("\n"),
      source: song,
      title: `${song.title} cleaned`,
    });
  }

  async function coverRemixSong(song: LocalSong, targetStyle?: string) {
    library.setSelectedId(song.id);
    await coverRemix.queueCoverRemix({
      audioBlob: song.audioBlob,
      durationMs: song.durationMs,
      lyrics: song.lyrics,
      mediaType: song.audioType || song.audioBlob.type || "audio/mpeg",
      mode: "remix",
      source: song,
      sourceStyle: song.stylePrompt,
      targetStyle:
        targetStyle ||
        song.stylePrompt ||
        "fresh arrangement with a new energy",
      title: `${song.title} remix`,
    });
  }

  async function extendLibrarySong(song: LocalSong) {
    library.setSelectedId(song.id);
    await extendSong.queueExtendSong({
      audioBlob: song.audioBlob,
      continuationPrompt:
        song.stylePrompt ||
        "Continue the song from its ending with a natural next section.",
      durationMs: song.durationMs,
      extendFromMs: song.durationMs,
      lyrics: song.lyrics,
      mediaType: song.audioType || song.audioBlob.type || "audio/mpeg",
      source: song,
      sourceStyle: song.stylePrompt,
      title: `${song.title} extension`,
    });
  }

  return (
    <div
      className={
        embedded
          ? "h-dvh min-h-0 overflow-hidden bg-[#080b12] text-foreground"
          : "essence-app-shell bg-[#080b12] text-foreground"
      }
    >
      <div
        className={
          embedded
            ? "flex h-full w-full min-w-0 flex-col gap-3 overflow-y-auto p-3 sm:p-4"
            : "essence-app-frame mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6"
        }
      >
        {embedded ? (
          <nav
            className="grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-1"
            aria-label="Embedded music workspace views"
          >
            {navigationViews.map((item) => (
              <Button
                key={item.key}
                variant={view === item.key ? "secondary" : "ghost"}
                className="h-9 gap-2"
                onClick={() => setView(item.key)}
              >
                <item.icon className="size-4" />
                {item.label}
              </Button>
            ))}
          </nav>
        ) : (
          <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <EssenceLogoMark className="size-10" />
                <div>
                  <h1 className="text-2xl font-semibold tracking-normal">
                    Essence Suno
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Composer, library, player, and studio.
                  </p>
                </div>
                <Badge className="bg-emerald-400/15 text-emerald-200">
                  {status.text ? "AI ready" : "AI offline"}
                </Badge>
              </div>
            </div>
            <nav className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                className="gap-2"
                disabled={discoverDisabled}
                title={discoverTitle}
                onClick={() => {
                  window.location.assign("/discover");
                }}
              >
                <Compass className="size-4" />
                Discover
              </Button>
              {navigationViews.map((item) => (
                <Button
                  key={item.key}
                  variant={view === item.key ? "secondary" : "ghost"}
                  className="gap-2"
                  onClick={() => setView(item.key)}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </header>
        )}

        {embedded ? null : (
          <StatStrip stats={library.stats} aiReady={status.text} />
        )}

        {view === "dashboard" ? <DashboardPanel /> : null}

        {view === "create" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
            <div className="grid gap-4">
              <UploadDropzone onFiles={library.importFiles} />
              <RecordPanel onSave={library.addRecording} />
            </div>
            <NowSelected
              song={selectedSong}
              onOpenAi={() => setView("ai")}
              onOpenHooks={() => setView("hooks")}
              onOpenLibrary={() => setView("library")}
              onOpenStudio={() => setView("studio")}
              onReusePrompt={reuseSongPrompt}
              onUpdate={library.updateSong}
            />
          </div>
        ) : null}

        {view === "library" ? (
          <div className="grid gap-4">
            <CoverRemixPanel
              busy={coverRemix.busy}
              job={coverRemix.job}
              onRefresh={coverRemix.refreshCoverRemixJob}
              onSave={coverRemix.saveReadyCoverRemix}
            />
            <AudioToMidiPanel
              busy={audioToMidi.busy}
              job={audioToMidi.job}
              onDownload={audioToMidi.downloadReadyMidi}
              onRefresh={audioToMidi.refreshAudioToMidiJob}
            />
            <GeneratedVocalsPanel
              busy={generatedVocals.busy}
              job={generatedVocals.job}
              onRefresh={generatedVocals.refreshGeneratedVocalsJob}
              onSave={generatedVocals.saveReadyVocals}
            />
            <GeneratedInstrumentalPanel
              busy={generatedInstrumental.busy}
              job={generatedInstrumental.job}
              onRefresh={generatedInstrumental.refreshGeneratedInstrumentalJob}
              onSave={generatedInstrumental.saveReadyInstrumental}
            />
            <SampleGenerationPanel
              busy={samples.busy}
              job={samples.job}
              onRefresh={samples.refreshSampleJob}
              onSave={samples.saveReadySample}
            />
            <PersonaGenerationPanel
              busy={personaGeneration.busy}
              job={personaGeneration.job}
              onRefresh={personaGeneration.refreshPersonaGenerationJob}
              onSave={personaGeneration.saveReadyPersona}
            />
            <ModelTrainingPanel
              busy={modelTraining.busy}
              job={modelTraining.job}
              onRefresh={modelTraining.refreshModelTrainingJob}
              onSave={modelTraining.saveReadyModelCard}
            />
            <ExtendSongPanel
              busy={extendSong.busy}
              job={extendSong.job}
              onRefresh={extendSong.refreshExtendSongJob}
              onSave={extendSong.saveReadyExtension}
            />
            <ReplaceSectionPanel
              busy={replaceSection.busy}
              job={replaceSection.job}
              onRefresh={replaceSection.refreshReplaceSectionJob}
              onSave={replaceSection.saveReadyReplacement}
            />
            <RemasterPanel
              busy={remaster.busy}
              job={remaster.job}
              onRefresh={remaster.refreshRemasterJob}
              onSave={remaster.saveReadyRemaster}
            />
            <RemoveFxPanel
              busy={removeFx.busy}
              job={removeFx.job}
              onRefresh={removeFx.refreshRemoveFxJob}
              onSave={removeFx.saveReadyCleanup}
            />
            <StemExtractionPanel
              busy={stemExtraction.busy}
              job={stemExtraction.job}
              midiBusy={audioToMidi.busy === "queue"}
              midiReady={midiReady}
              variationBusy={stemVariation.busy === "queue"}
              variationReady={stemVariationReady}
              onCreateVariation={(stem, job) =>
                createStemVariation({ ...stem, sourceJobId: job.id })
              }
              onExtractMidi={(stem) => extractStemMidi(stem)}
              onRefresh={stemExtraction.refreshStemJob}
              onSave={stemExtraction.saveReadyStems}
            />
            <StemVariationPanel
              busy={stemVariation.busy}
              job={stemVariation.job}
              onRefresh={stemVariation.refreshStemVariationJob}
              onSave={stemVariation.saveReadyStemVariation}
            />
            <LibraryPanel
              songs={library.songs}
              selectedId={library.selectedId}
              onSelect={library.setSelectedId}
              onUpdate={library.updateSong}
              onRemove={library.removeSong}
              onPublish={library.publishSong}
              onSyncAll={library.syncAll}
              onImportManifest={library.importManifest}
              onCoverRemix={coverRemixSong}
              onExtendSong={extendLibrarySong}
              onExtractMidi={extractSongMidi}
              onExtractStems={extractSongStems}
              onGenerateInstrumental={generateSongInstrumental}
              onGeneratePersona={generateSongPersona}
              onGenerateSample={generateSongSample}
              onGenerateVocals={generateSongVocals}
              onRemoveFx={removeFxSong}
              onRemaster={remasterSong}
              onReusePrompt={reuseSongPrompt}
              onTrainCustomModel={trainCustomModelFromSong}
              syncing={library.syncing}
              lastSyncAt={library.lastSyncAt}
              coverRemixBusy={coverRemix.busy === "queue"}
              coverRemixReady={coverRemixReady}
              extendBusy={extendSong.busy === "queue"}
              extendReady={extendReady}
              midiBusy={audioToMidi.busy === "queue"}
              midiReady={midiReady}
              instrumentalBusy={generatedInstrumental.busy === "queue"}
              instrumentalReady={instrumentalReady}
              sampleBusy={samples.busy === "queue"}
              sampleReady={sampleReady}
              personaBusy={personaGeneration.busy === "queue"}
              personaReady={personaGenerationReady}
              trainingBusy={modelTraining.busy === "queue"}
              trainingReady={modelTrainingReady}
              removeFxBusy={removeFx.busy === "queue"}
              removeFxReady={removeFxReady}
              remasterBusy={remaster.busy === "queue"}
              remasterReady={remasterReady}
              stemExtractionBusy={stemExtraction.busy === "queue"}
              stemExtractionReady={stemExtractionReady}
              vocalsBusy={generatedVocals.busy === "queue"}
              vocalsReady={vocalsReady}
            />
          </div>
        ) : null}

        {view === "playlists" ? (
          <PlaylistsPanel
            selectedSong={selectedSong}
            songs={library.songs}
            syncing={library.syncing}
            onSelectSong={library.setSelectedId}
            onPlayQueue={playQueue}
            onSyncSong={library.syncSong}
            onUseFingerprint={usePlaylistFingerprint}
          />
        ) : null}

        {view === "studio" ? (
          <div
            className={
              embedded
                ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]"
                : "grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]"
            }
          >
            <div className="grid min-w-0 gap-4">
              {embedded && !selectedSong ? (
                <UploadDropzone onFiles={library.importFiles} />
              ) : null}
              {embedded ? null : (
                <>
                  <CoverRemixPanel
                    busy={coverRemix.busy}
                    job={coverRemix.job}
                    onRefresh={coverRemix.refreshCoverRemixJob}
                    onSave={coverRemix.saveReadyCoverRemix}
                  />
                  <AudioToMidiPanel
                    busy={audioToMidi.busy}
                    job={audioToMidi.job}
                    onDownload={audioToMidi.downloadReadyMidi}
                    onRefresh={audioToMidi.refreshAudioToMidiJob}
                  />
                  <GeneratedVocalsPanel
                    busy={generatedVocals.busy}
                    job={generatedVocals.job}
                    onRefresh={generatedVocals.refreshGeneratedVocalsJob}
                    onSave={generatedVocals.saveReadyVocals}
                  />
                  <GeneratedInstrumentalPanel
                    busy={generatedInstrumental.busy}
                    job={generatedInstrumental.job}
                    onRefresh={
                      generatedInstrumental.refreshGeneratedInstrumentalJob
                    }
                    onSave={generatedInstrumental.saveReadyInstrumental}
                  />
                  <SampleGenerationPanel
                    busy={samples.busy}
                    job={samples.job}
                    onRefresh={samples.refreshSampleJob}
                    onSave={samples.saveReadySample}
                  />
                  <PersonaGenerationPanel
                    busy={personaGeneration.busy}
                    job={personaGeneration.job}
                    onRefresh={personaGeneration.refreshPersonaGenerationJob}
                    onSave={personaGeneration.saveReadyPersona}
                  />
                  <ModelTrainingPanel
                    busy={modelTraining.busy}
                    job={modelTraining.job}
                    onRefresh={modelTraining.refreshModelTrainingJob}
                    onSave={modelTraining.saveReadyModelCard}
                  />
                  <ExtendSongPanel
                    busy={extendSong.busy}
                    job={extendSong.job}
                    onRefresh={extendSong.refreshExtendSongJob}
                    onSave={extendSong.saveReadyExtension}
                  />
                  <ReplaceSectionPanel
                    busy={replaceSection.busy}
                    job={replaceSection.job}
                    onRefresh={replaceSection.refreshReplaceSectionJob}
                    onSave={replaceSection.saveReadyReplacement}
                  />
                  <RemasterPanel
                    busy={remaster.busy}
                    job={remaster.job}
                    onRefresh={remaster.refreshRemasterJob}
                    onSave={remaster.saveReadyRemaster}
                  />
                  <RemoveFxPanel
                    busy={removeFx.busy}
                    job={removeFx.job}
                    onRefresh={removeFx.refreshRemoveFxJob}
                    onSave={removeFx.saveReadyCleanup}
                  />
                  <StemExtractionPanel
                    busy={stemExtraction.busy}
                    job={stemExtraction.job}
                    midiBusy={audioToMidi.busy === "queue"}
                    midiReady={midiReady}
                    variationBusy={stemVariation.busy === "queue"}
                    variationReady={stemVariationReady}
                    onCreateVariation={(stem, job) =>
                      createStemVariation({ ...stem, sourceJobId: job.id })
                    }
                    onExtractMidi={(stem) => extractStemMidi(stem)}
                    onRefresh={stemExtraction.refreshStemJob}
                    onSave={stemExtraction.saveReadyStems}
                  />
                  <StemVariationPanel
                    busy={stemVariation.busy}
                    job={stemVariation.job}
                    onRefresh={stemVariation.refreshStemVariationJob}
                    onSave={stemVariation.saveReadyStemVariation}
                  />
                </>
              )}
              <StudioPanel
                song={selectedSong}
                onUpdate={library.updateSong}
                onSaveEdit={library.addEditedSong}
                onCoverRemixRegion={async (input) => {
                  await coverRemix.queueCoverRemix({
                    audioBlob: input.audioBlob,
                    durationMs: input.durationMs,
                    lyrics: input.source.lyrics,
                    mediaType:
                      input.audioBlob.type ||
                      input.source.audioType ||
                      "audio/wav",
                    mode: "remix",
                    notes: `Region ${formatDuration(input.startMs)} - ${formatDuration(input.endMs)} from ${input.source.title}.`,
                    source: input.source,
                    sourceStyle: input.source.stylePrompt,
                    targetStyle: input.targetStyle,
                    title: input.title,
                  });
                }}
                onExtendFromSplit={async (input) => {
                  await extendSong.queueExtendSong({
                    audioBlob: input.source.audioBlob,
                    continuationPrompt: input.continuationPrompt,
                    durationMs: input.source.durationMs,
                    extendFromMs: input.extendFromMs,
                    lyrics: input.source.lyrics,
                    mediaType:
                      input.source.audioType ||
                      input.source.audioBlob.type ||
                      "audio/mpeg",
                    notes: `Continue from ${formatDuration(input.extendFromMs)} in ${input.source.title}.`,
                    source: input.source,
                    sourceStyle: input.source.stylePrompt,
                    title: input.title,
                  });
                }}
                onCreateStemVariationRegion={async (input) => {
                  await stemVariation.queueStemVariation({
                    audioBlob: input.audioBlob,
                    directionPrompt: input.directionPrompt,
                    durationMs: input.durationMs,
                    mediaType:
                      input.audioBlob.type ||
                      input.source.audioType ||
                      "audio/wav",
                    notes: `Region ${formatDuration(input.startMs)} - ${formatDuration(input.endMs)} from ${input.source.title}.`,
                    sourceSongTitle: input.source.title,
                    sourceStemId: `${input.source.id}:${input.startMs}-${input.endMs}`,
                    sourceStemTitle: input.title,
                    sourceStyle: input.source.stylePrompt,
                    stemType: "other",
                    title: `${input.title} variation`,
                  });
                }}
                onCreateWarpMarkersRegion={async (input) => {
                  await warpMarkers.queueWarpMarkers({
                    analysisMode: "mixed",
                    audioBlob: input.audioBlob,
                    durationMs: input.durationMs,
                    mediaType:
                      input.audioBlob.type ||
                      input.source.audioType ||
                      "audio/wav",
                    notes: `Warp marker analysis for ${formatDuration(input.startMs)} - ${formatDuration(input.endMs)} in ${input.source.title}.`,
                    region: {
                      endMs: input.endMs,
                      startMs: input.startMs,
                    },
                    source: input.source,
                    sourceKind: "region",
                    targetGrid: "auto",
                    title: input.title,
                  });
                }}
                onExtractMidiRegion={async (input) => {
                  await audioToMidi.queueAudioToMidi({
                    audioBlob: input.audioBlob,
                    durationMs: input.durationMs,
                    mediaType:
                      input.audioBlob.type ||
                      input.source.audioType ||
                      "audio/wav",
                    notes: `Audio-to-MIDI from ${formatDuration(input.startMs)} - ${formatDuration(input.endMs)} in ${input.source.title}.`,
                    region: {
                      endMs: input.endMs,
                      startMs: input.startMs,
                    },
                    sourceId: input.source.id,
                    sourceKind: "region",
                    sourceTitle: input.source.title,
                    title: input.title,
                  });
                }}
                onGenerateVocalsRegion={async (input) => {
                  if (!activeVoiceAttachment) {
                    toast.error(
                      "Add a confirmed voice profile before generating vocals.",
                    );
                    return;
                  }

                  await generatedVocals.queueGeneratedVocals({
                    audioBlob: input.audioBlob,
                    directionPrompt:
                      input.source.stylePrompt ||
                      "Add a natural vocal line to the selected section.",
                    durationMs: input.durationMs,
                    lyrics:
                      input.source.lyrics || "Vocal melody placeholder lyrics",
                    mediaType:
                      input.audioBlob.type ||
                      input.source.audioType ||
                      "audio/wav",
                    notes: `Generated vocals for ${formatDuration(input.startMs)} - ${formatDuration(input.endMs)} in ${input.source.title}.`,
                    region: {
                      endMs: input.endMs,
                      startMs: input.startMs,
                    },
                    source: input.source,
                    sourceStyle: input.source.stylePrompt,
                    title: input.title,
                    voiceProfile: activeVoiceAttachment,
                  });
                }}
                onGenerateInstrumentalRegion={async (input) => {
                  await generatedInstrumental.queueGeneratedInstrumental({
                    audioBlob: input.audioBlob,
                    directionPrompt:
                      input.source.stylePrompt ||
                      "Build instrumental backing for the selected section.",
                    durationMs: input.durationMs,
                    lyrics: input.source.lyrics,
                    mediaType:
                      input.audioBlob.type ||
                      input.source.audioType ||
                      "audio/wav",
                    notes: `Generated instrumental for ${formatDuration(input.startMs)} - ${formatDuration(input.endMs)} in ${input.source.title}.`,
                    region: {
                      endMs: input.endMs,
                      startMs: input.startMs,
                    },
                    source: input.source,
                    sourceKind: "region",
                    sourceStyle: input.source.stylePrompt,
                    title: input.title,
                  });
                }}
                onExtractStems={extractSongStems}
                onRemasterRegion={async (input) => {
                  await remaster.queueRemaster({
                    audioBlob: input.audioBlob,
                    durationMs: input.durationMs,
                    mediaType:
                      input.audioBlob.type ||
                      input.source.audioType ||
                      "audio/wav",
                    notes: `Region ${formatDuration(input.startMs)} - ${formatDuration(input.endMs)} from ${input.source.title}.`,
                    region: {
                      endMs: input.endMs,
                      startMs: input.startMs,
                    },
                    source: input.source,
                    title: input.title,
                  });
                }}
                onRemoveFxRegion={async (input) => {
                  await removeFx.queueRemoveFx({
                    audioBlob: input.audioBlob,
                    cleanupTargets: ["mixed-fx"],
                    durationMs: input.durationMs,
                    intensity: "balanced",
                    mediaType:
                      input.audioBlob.type ||
                      input.source.audioType ||
                      "audio/wav",
                    notes: `Remove FX from ${formatDuration(input.startMs)} - ${formatDuration(input.endMs)} in ${input.source.title}.`,
                    region: {
                      endMs: input.endMs,
                      startMs: input.startMs,
                    },
                    source: input.source,
                    title: input.title,
                  });
                }}
                onReplaceSectionRegion={async (input) => {
                  await replaceSection.queueReplaceSection({
                    audioBlob: input.source.audioBlob,
                    directionPrompt: input.directionPrompt,
                    durationMs: input.source.durationMs,
                    lyrics: input.source.lyrics,
                    mediaType:
                      input.source.audioType ||
                      input.source.audioBlob.type ||
                      "audio/mpeg",
                    mode: input.mode,
                    notes: `Replace region ${formatDuration(input.startMs)} - ${formatDuration(input.endMs)} in ${input.source.title}.`,
                    region: {
                      endMs: input.endMs,
                      startMs: input.startMs,
                    },
                    source: input.source,
                    sourceStyle: input.source.stylePrompt,
                    title: input.title,
                  });
                }}
                coverRemixBusy={coverRemix.busy === "queue"}
                coverRemixReady={coverRemixReady}
                extendBusy={extendSong.busy === "queue"}
                extendReady={extendReady}
                midiBusy={audioToMidi.busy === "queue"}
                midiReady={midiReady}
                instrumentalBusy={generatedInstrumental.busy === "queue"}
                instrumentalReady={instrumentalReady}
                remasterBusy={remaster.busy === "queue"}
                remasterReady={remasterReady}
                removeFxBusy={removeFx.busy === "queue"}
                removeFxReady={removeFxReady}
                replaceSectionBusy={replaceSection.busy === "queue"}
                replaceSectionReady={replaceSectionReady}
                stemExtractionBusy={stemExtraction.busy === "queue"}
                stemExtractionReady={stemExtractionReady}
                stemVariationBusy={stemVariation.busy === "queue"}
                stemVariationReady={stemVariationReady}
                warpMarkersBusy={warpMarkers.busy === "queue"}
                warpMarkersReady={warpMarkersReady}
                vocalsBusy={generatedVocals.busy === "queue"}
                vocalsReady={vocalsReady}
              />
            </div>
            <ProjectMixerPanel
              songs={library.songs}
              selectedSong={selectedSong}
              onAnalyzeWarpMarkers={analyzeWarpMarkersSong}
              onApplyWarpMarkers={warpMarkers.applyReadyMarkers}
              onRefreshWarpMarkers={warpMarkers.refreshWarpMarkerJob}
              warpMarkerJob={warpMarkers.job}
              warpMarkersBusy={warpMarkers.busy}
              warpMarkersReady={warpMarkersReady}
            />
          </div>
        ) : null}

        {view === "hooks" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_480px]">
            <HookVideoPanel
              song={selectedSong}
              onSaveHook={hookFeed.saveHook}
            />
            <HookFeedPanel
              hooks={hookFeed.hooks}
              loading={hookFeed.loading}
              onAddComment={hookFeed.addComment}
              onRemove={hookFeed.removeHook}
              onReport={hookFeed.reportHook}
              onSync={hookFeed.syncHook}
              onToggleLike={hookFeed.toggleLike}
              onVisibilityChange={hookFeed.setVisibility}
            />
          </div>
        ) : null}

        {view === "ai" ? (
          <div className="grid gap-4">
            <SampleGenerationPanel
              busy={samples.busy}
              job={samples.job}
              onRefresh={samples.refreshSampleJob}
              onSave={samples.saveReadySample}
            />
            <PersonaGenerationPanel
              busy={personaGeneration.busy}
              job={personaGeneration.job}
              onRefresh={personaGeneration.refreshPersonaGenerationJob}
              onSave={personaGeneration.saveReadyPersona}
            />
            <AiPanel
              initialLyrics={selectedSong?.lyrics}
              initialStyle={selectedSong?.stylePrompt}
              coverRemixBusy={coverRemix.busy === "queue"}
              coverRemixReady={coverRemixReady}
              generatedVocalsBusy={generatedVocals.busy === "queue"}
              generatedVocalsReady={vocalsReady}
              generatedInstrumentalBusy={generatedInstrumental.busy === "queue"}
              generatedInstrumentalReady={instrumentalReady}
              sampleBusy={samples.busy === "queue"}
              sampleReady={sampleReady}
              personaGenerationBusy={personaGeneration.busy === "queue"}
              personaGenerationReady={personaGenerationReady}
              onGeneratedAudio={library.addGeneratedSong}
              onCoverRemix={async (input) => {
                await coverRemix.queueCoverRemix({
                  audioBlob: input.source.audioBlob,
                  creativeControls: input.creativeControls,
                  durationMs: input.source.durationMs,
                  lyrics: input.lyrics,
                  mediaType:
                    input.source.audioType ||
                    input.source.audioBlob.type ||
                    "audio/mpeg",
                  mode: input.mode,
                  notes: input.notes,
                  source: input.source,
                  sourceStyle: input.source.stylePrompt,
                  targetStyle: input.targetStyle,
                  title: `${input.source.title} ${input.mode}`,
                });
              }}
              onGenerateVocals={async (input) => {
                await generatedVocals.queueGeneratedVocals({
                  audioBlob: input.source.audioBlob,
                  directionPrompt: input.directionPrompt,
                  durationMs: input.source.durationMs,
                  lyrics: input.lyrics,
                  mediaType:
                    input.source.audioType ||
                    input.source.audioBlob.type ||
                    "audio/mpeg",
                  notes: input.notes,
                  source: input.source,
                  sourceStyle: input.source.stylePrompt,
                  title: `${input.source.title} vocals`,
                  voiceProfile: input.voiceProfile,
                });
              }}
              onGenerateInstrumental={async (input) => {
                await generatedInstrumental.queueGeneratedInstrumental({
                  audioBlob: input.source.audioBlob,
                  directionPrompt: input.directionPrompt,
                  durationMs: input.source.durationMs,
                  lyrics: input.lyrics,
                  mediaType:
                    input.source.audioType ||
                    input.source.audioBlob.type ||
                    "audio/mpeg",
                  notes: input.notes,
                  source: input.source,
                  sourceKind: "track",
                  sourceStyle: input.source.stylePrompt,
                  title: `${input.source.title} instrumental`,
                });
              }}
              onGenerateSample={generatePromptSample}
              onGeneratePersona={async (input) => {
                await generateSongPersona(
                  input.source,
                  input.analysisPrompt,
                  input.notes,
                );
              }}
              playlistFingerprint={playlistFingerprint}
              reusePrompt={reusePrompt}
              sourceSong={selectedSong}
              tasteProfile={taste.profile}
              onLyrics={(lyrics) => {
                if (selectedSong) {
                  void library.updateSong(selectedSong.id, { lyrics });
                }
              }}
              onMetadata={(patch) => {
                if (selectedSong) {
                  void library.updateSong(selectedSong.id, patch);
                }
              }}
              onStyle={(stylePrompt) => {
                if (selectedSong) {
                  void library.updateSong(selectedSong.id, { stylePrompt });
                }
              }}
            />
            <AiJobsPanel />
          </div>
        ) : null}

        {view === "settings" ? (
          <div className="grid gap-4">
            <ModelTrainingPanel
              busy={modelTraining.busy}
              job={modelTraining.job}
              onRefresh={modelTraining.refreshModelTrainingJob}
              onSave={modelTraining.saveReadyModelCard}
            />
            <SettingsPanel
              customModels={{
                cards: customModels.cards,
                exportCards: customModels.exportCards,
                remove: customModels.remove,
              }}
              taste={taste}
            />
          </div>
        ) : null}
      </div>
      {embedded ? null : (
        <PlayerBar
          song={selectedSong}
          onPrevious={() => selectByOffset(-1)}
          onNext={() => selectByOffset(1)}
        />
      )}
    </div>
  );
}

function NowSelected({
  onOpenAi,
  onOpenHooks,
  onOpenLibrary,
  onOpenStudio,
  onReusePrompt,
  onUpdate,
  song,
}: {
  onOpenAi: () => void;
  onOpenHooks: () => void;
  onOpenLibrary: () => void;
  onOpenStudio: () => void;
  onReusePrompt: (song: LocalSong) => void;
  onUpdate: ReturnType<typeof useLocalLibrary>["updateSong"];
  song?: LocalSong;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Selected track</CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="gap-2 self-start"
            disabled={!song}
            onClick={onOpenLibrary}
          >
            <Library className="size-4" />
            Library
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {song ? (
          <>
            <div>
              <p className="text-xl font-semibold tracking-normal">
                {song.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {song.artist}
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
                <p className="text-muted-foreground">Duration</p>
                <p className="mt-1 font-medium">
                  {formatDuration(song.durationMs)}
                </p>
              </div>
              <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
                <p className="text-muted-foreground">Source</p>
                <p className="mt-1 font-medium">{song.source}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {song.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <CopySongTextButton label="Copy lyrics" value={song.lyrics} />
              <CopySongTextButton label="Copy style" value={song.stylePrompt} />
              <Button
                size="sm"
                variant="secondary"
                className="gap-2"
                onClick={onOpenStudio}
              >
                <SlidersHorizontal className="size-4" />
                Studio
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="gap-2"
                onClick={onOpenAi}
              >
                <Sparkles className="size-4" />
                AI
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="gap-2"
                onClick={onOpenHooks}
              >
                <Film className="size-4" />
                Hooks
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="gap-2"
                onClick={() => onReusePrompt(song)}
              >
                <RotateCcw className="size-4" />
                Reuse prompt
              </Button>
            </div>
            <SongReadinessPanel song={song} />
            <RightsMetadataPanel song={song} onUpdate={onUpdate} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Import a track to activate playback, editing, lyrics, and publishing
            prep.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CopySongTextButton({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Button
      size="sm"
      variant="secondary"
      className="gap-2"
      disabled={!value.trim()}
      onClick={async () => {
        if (!navigator.clipboard) {
          return;
        }

        await navigator.clipboard.writeText(value);
        toast.success(`${label} copied.`);
      }}
    >
      <Clipboard className="size-4" />
      {label}
    </Button>
  );
}
