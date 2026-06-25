"use client";

import {
  AudioLines,
  BrainCircuit,
  Clipboard,
  Download,
  Eraser,
  ExternalLink,
  Fingerprint,
  FileUp,
  FileJson,
  FileMusic,
  Heart,
  Layers3,
  Mic2,
  Music2,
  Play,
  RotateCcw,
  Search,
  Shuffle,
  SkipForward,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDuration } from "@/features/audio/format";
import { audioExtension, downloadAudioBlob } from "@/features/audio/download";
import {
  getOnlineActionTitle,
  useOnlineActionGuard,
} from "@/features/system/online-action-guard";
import {
  createLibraryManifest,
  type LibraryManifestImportSummary,
} from "@/features/library/library-manifest";
import { getSongReadiness } from "@/features/library/song-readiness";
import type {
  EditableSongPatch,
  LocalSong,
  SongVisibility,
} from "@/features/library/types";
import { getSongRightsReadiness } from "@/lib/library/rights";

type LibraryPanelProps = {
  songs: LocalSong[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: EditableSongPatch) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onPublish: (song: LocalSong, visibility: SongVisibility) => Promise<string | null>;
  onSyncAll: () => Promise<void>;
  onImportManifest: (file: File) => Promise<LibraryManifestImportSummary>;
  onExtractStems?: (song: LocalSong) => Promise<void>;
  onCoverRemix?: (song: LocalSong) => Promise<void>;
  onExtendSong?: (song: LocalSong) => Promise<void>;
  onExtractMidi?: (song: LocalSong) => Promise<void>;
  onRemoveFx?: (song: LocalSong) => Promise<void>;
  onRemaster?: (song: LocalSong) => Promise<void>;
  onGenerateSample?: (song: LocalSong) => Promise<void>;
  onGenerateVocals?: (song: LocalSong) => Promise<void>;
  onGenerateInstrumental?: (song: LocalSong) => Promise<void>;
  onGeneratePersona?: (song: LocalSong) => Promise<void>;
  onTrainCustomModel?: (song: LocalSong) => Promise<void>;
  onReusePrompt: (song: LocalSong) => void;
  syncing: boolean;
  lastSyncAt?: number;
  coverRemixBusy?: boolean;
  coverRemixReady?: boolean;
  extendBusy?: boolean;
  extendReady?: boolean;
  stemExtractionBusy?: boolean;
  stemExtractionReady?: boolean;
  midiBusy?: boolean;
  midiReady?: boolean;
  removeFxBusy?: boolean;
  removeFxReady?: boolean;
  sampleBusy?: boolean;
  sampleReady?: boolean;
  remasterBusy?: boolean;
  remasterReady?: boolean;
  vocalsBusy?: boolean;
  vocalsReady?: boolean;
  instrumentalBusy?: boolean;
  instrumentalReady?: boolean;
  personaBusy?: boolean;
  personaReady?: boolean;
  trainingBusy?: boolean;
  trainingReady?: boolean;
};

export function LibraryPanel({
  songs,
  selectedId,
  onSelect,
  onUpdate,
  onRemove,
  onPublish,
  onSyncAll,
  onImportManifest,
  onCoverRemix,
  onExtendSong,
  onExtractMidi,
  onExtractStems,
  onGenerateVocals,
  onGenerateInstrumental,
  onGeneratePersona,
  onGenerateSample,
  onRemoveFx,
  onRemaster,
  onTrainCustomModel,
  onReusePrompt,
  syncing,
  lastSyncAt,
  coverRemixBusy,
  coverRemixReady,
  extendBusy,
  extendReady,
  stemExtractionBusy,
  stemExtractionReady,
  midiBusy,
  midiReady,
  removeFxBusy,
  removeFxReady,
  sampleBusy,
  sampleReady,
  remasterBusy,
  remasterReady,
  vocalsBusy,
  vocalsReady,
  instrumentalBusy,
  instrumentalReady,
  personaBusy,
  personaReady,
  trainingBusy,
  trainingReady,
}: LibraryPanelProps) {
  const onlineGuard = useOnlineActionGuard();
  const connectionDisabled = !onlineGuard.canUseConnectionActions;
  const cloudActionTitle = (title: string) =>
    getOnlineActionTitle(onlineGuard, "cloud-sync", title);
  const generationActionTitle = (title: string) =>
    getOnlineActionTitle(onlineGuard, "generation", title);
  const sharingActionTitle = (title: string) =>
    getOnlineActionTitle(onlineGuard, "sharing", title);
  const manifestInputId = useId();
  const manifestInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("updated");
  const filteredSongs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return songs
      .filter((song) => {
        if (filter === "liked") {
          return song.liked;
        }
        if (filter === "uploads") {
          return song.source === "upload";
        }
        if (filter === "edits") {
          return song.source === "edit";
        }
        if (filter === "ai") {
          return song.source === "ai";
        }
        if (filter === "recordings") {
          return song.source === "recording";
        }
        if (filter === "imports") {
          return song.source === "import";
        }
        if (filter === "ready") {
          return getSongReadiness(song).score === 100;
        }
        if (filter === "needs-prep") {
          return getSongReadiness(song).score < 100;
        }
        return true;
      })
      .filter((song) => {
        if (!normalized) {
          return true;
        }
        return [song.title, song.artist, song.tags.join(" "), song.stylePrompt]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      })
      .toSorted((a, b) => {
        if (sort === "title") {
          return a.title.localeCompare(b.title);
        }
        if (sort === "duration") {
          return b.durationMs - a.durationMs;
        }
        if (sort === "liked") {
          return Number(b.liked) - Number(a.liked);
        }
        if (sort === "readiness") {
          return getSongReadiness(a).score - getSongReadiness(b).score;
        }
        return b.updatedAt - a.updatedAt;
      });
  }, [filter, query, songs, sort]);

  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileMusic className="size-4 text-emerald-200" />
            Library
          </CardTitle>
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="relative md:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
                placeholder="Search tracks"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="md:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="liked">Liked</SelectItem>
                <SelectItem value="uploads">Uploads</SelectItem>
                <SelectItem value="edits">Edits</SelectItem>
                <SelectItem value="ai">AI results</SelectItem>
                <SelectItem value="recordings">Recordings</SelectItem>
                <SelectItem value="imports">Imports</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="needs-prep">Needs prep</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
                <SelectItem value="liked">Liked first</SelectItem>
                <SelectItem value="readiness">Needs prep</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            className="gap-2"
            disabled={!songs.length || syncing || connectionDisabled}
            title={cloudActionTitle("Sync library metadata")}
            onClick={async () => {
              try {
                await onSyncAll();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Sync failed.");
              }
            }}
          >
            <UploadCloud className="size-4" />
            Sync metadata
          </Button>
          {connectionDisabled ? (
            <Badge variant="outline">{onlineGuard.cloudSyncDisabledReason}</Badge>
          ) : null}
          <Button
            variant="ghost"
            className="gap-2"
            disabled={!filteredSongs.length}
            onClick={() => exportLibraryManifest(filteredSongs)}
          >
            <FileJson className="size-4" />
            Export JSON
          </Button>
          <input
            ref={manifestInputRef}
            id={manifestInputId}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={async (event) => {
              const file = event.target.files?.[0];

              if (!file) {
                return;
              }

              try {
                const summary = await onImportManifest(file);

                if (summary.skippedTracks) {
                  toast.info(
                    `${summary.skippedTracks} manifest track${summary.skippedTracks === 1 ? "" : "s"} did not exist locally.`,
                  );
                }
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Could not import this manifest.",
                );
              } finally {
                if (manifestInputRef.current) {
                  manifestInputRef.current.value = "";
                }
              }
            }}
          />
          <Button asChild variant="ghost" className="gap-2">
            <label htmlFor={manifestInputId}>
              <FileUp className="size-4" />
              Import manifest
            </label>
          </Button>
          {lastSyncAt ? (
            <p className="text-xs text-muted-foreground">
              Last sync {new Date(lastSyncAt).toLocaleTimeString()}
            </p>
          ) : null}
        </div>
        <ScrollArea className="h-[420px] pr-3">
          <div className="space-y-2">
            {filteredSongs.map((song) => {
              const readiness = getSongReadiness(song);
              const rights = getSongRightsReadiness(song.rightsMetadata);

              return (
                <div
                  key={song.id}
                  className="grid gap-3 rounded-md border border-white/10 bg-slate-950/55 p-3 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={() => onSelect(song.id)}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate font-medium">{song.title}</p>
                      {selectedId === song.id ? (
                        <Badge className="bg-emerald-400/15 text-emerald-200">
                          selected
                        </Badge>
                      ) : null}
                      <Badge
                        className={
                          readiness.score === 100
                            ? "bg-emerald-400/15 text-emerald-200"
                            : "bg-amber-400/15 text-amber-100"
                        }
                      >
                        Ready {readiness.score}/100
                      </Badge>
                      <Badge
                        className={
                          rights.ready
                            ? "bg-emerald-400/15 text-emerald-200"
                            : "bg-amber-400/15 text-amber-100"
                        }
                      >
                        {rights.ready ? "Rights ok" : "Needs rights"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{song.artist}</span>
                      <span>{formatDuration(song.durationMs)}</span>
                      <span>{song.source}</span>
                    </div>
                  </button>
                  <div className="flex flex-wrap items-center gap-1">
                    <Select
                      disabled={connectionDisabled}
                      value={song.visibility ?? "private"}
                      onValueChange={async (value) => {
                        try {
                          if (value === "public" && !rights.ready) {
                            toast.error(rights.summary);
                            return;
                          }

                          const shareUrl = await onPublish(
                            song,
                            value as SongVisibility,
                          );
                          if (shareUrl) {
                            await copyShareHref(shareUrl);
                          }
                          toast.success(
                            shareUrl
                              ? "Sharing link copied."
                              : "Track is private.",
                          );
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Could not update sharing.",
                          );
                        }
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="link-only">Link only</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Open share page for ${song.title}`}
                      disabled={
                        connectionDisabled ||
                        !song.shareSlug ||
                        song.visibility === "private"
                      }
                      title={sharingActionTitle("Open share page")}
                      onClick={() => {
                        if (song.shareSlug) {
                          window.open(
                            getShareHref(song.shareSlug),
                            "_blank",
                            "noopener",
                          );
                        }
                      }}
                    >
                      <ExternalLink className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Copy share link for ${song.title}`}
                      disabled={
                        !song.shareSlug ||
                        song.visibility === "private"
                      }
                      title="Copy share link"
                      onClick={async () => {
                        if (song.shareSlug) {
                          await copyShareHref(getShareHref(song.shareSlug));
                          toast.success("Sharing link copied.");
                        }
                      }}
                    >
                      <Clipboard className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      aria-label={`Select ${song.title}`}
                      onClick={() => onSelect(song.id)}
                    >
                      <Play className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Reuse prompt from ${song.title}`}
                      onClick={() => onReusePrompt(song)}
                    >
                      <RotateCcw className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Create remix from ${song.title}`}
                      title={generationActionTitle(
                        coverRemixReady
                          ? "Create remix"
                          : "Cover/remix generation is not connected",
                      )}
                      disabled={
                        connectionDisabled ||
                        !onCoverRemix ||
                        !coverRemixReady ||
                        coverRemixBusy
                      }
                      onClick={async () => {
                        if (onCoverRemix) {
                          await onCoverRemix(song);
                        }
                      }}
                    >
                      <Shuffle className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Extend ${song.title}`}
                      title={generationActionTitle(
                        extendReady ? "Extend song" : "Song extension is not connected",
                      )}
                      disabled={
                        connectionDisabled ||
                        !onExtendSong ||
                        !extendReady ||
                        extendBusy
                      }
                      onClick={async () => {
                        if (onExtendSong) {
                          await onExtendSong(song);
                        }
                      }}
                    >
                      <SkipForward className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Extract stems from ${song.title}`}
                      title={generationActionTitle(
                        stemExtractionReady
                          ? "Extract stems"
                          : "Stem extraction is not connected",
                      )}
                      disabled={
                        connectionDisabled ||
                        !onExtractStems ||
                        !stemExtractionReady ||
                        stemExtractionBusy
                      }
                      onClick={async () => {
                        if (onExtractStems) {
                          await onExtractStems(song);
                        }
                      }}
                    >
                      <Layers3 className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Extract MIDI from ${song.title}`}
                      title={generationActionTitle(
                        midiReady
                          ? "Extract MIDI"
                          : "Audio-to-MIDI extraction is not connected",
                      )}
                      disabled={
                        connectionDisabled || !onExtractMidi || !midiReady || midiBusy
                      }
                      onClick={async () => {
                        if (onExtractMidi) {
                          await onExtractMidi(song);
                        }
                      }}
                    >
                      <FileMusic className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Generate vocals for ${song.title}`}
                      title={generationActionTitle(
                        vocalsReady
                          ? "Generate vocals"
                          : "Generated vocals are not connected",
                      )}
                      disabled={
                        connectionDisabled ||
                        !onGenerateVocals ||
                        !vocalsReady ||
                        vocalsBusy
                      }
                      onClick={async () => {
                        if (onGenerateVocals) {
                          await onGenerateVocals(song);
                        }
                      }}
                    >
                      <Mic2 className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Generate instrumental for ${song.title}`}
                      title={generationActionTitle(
                        instrumentalReady
                          ? "Generate instrumental"
                          : "Instrumental backing is not connected",
                      )}
                      disabled={
                        connectionDisabled ||
                        !onGenerateInstrumental ||
                        !instrumentalReady ||
                        instrumentalBusy
                      }
                      onClick={async () => {
                        if (onGenerateInstrumental) {
                          await onGenerateInstrumental(song);
                        }
                      }}
                    >
                      <Music2 className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Generate sample from ${song.title}`}
                      title={generationActionTitle(
                        sampleReady && rights.ready
                          ? "Generate short sample"
                          : sampleReady
                            ? rights.summary
                            : "Sample generation is not connected",
                      )}
                      disabled={
                        connectionDisabled ||
                        !onGenerateSample ||
                        !sampleReady ||
                        sampleBusy ||
                        !rights.ready
                      }
                      onClick={async () => {
                        if (onGenerateSample) {
                          await onGenerateSample(song);
                        }
                      }}
                    >
                      <AudioLines className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Generate persona for ${song.title}`}
                      title={generationActionTitle(
                        personaReady
                          ? "Generate persona"
                          : "Persona generation is not connected",
                      )}
                      disabled={
                        connectionDisabled ||
                        !onGeneratePersona ||
                        !personaReady ||
                        personaBusy
                      }
                      onClick={async () => {
                        if (onGeneratePersona) {
                          await onGeneratePersona(song);
                        }
                      }}
                    >
                      <Fingerprint className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Train custom model from ${song.title}`}
                      title={generationActionTitle(
                        trainingReady
                          ? "Train custom model"
                          : "Custom model training is not connected",
                      )}
                      disabled={
                        connectionDisabled ||
                        !onTrainCustomModel ||
                        !trainingReady ||
                        trainingBusy
                      }
                      onClick={async () => {
                        if (onTrainCustomModel) {
                          await onTrainCustomModel(song);
                        }
                      }}
                    >
                      <BrainCircuit className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remaster ${song.title}`}
                      title={generationActionTitle(
                        remasterReady ? "Remaster track" : "Remastering is not connected",
                      )}
                      disabled={
                        connectionDisabled || !onRemaster || !remasterReady || remasterBusy
                      }
                      onClick={async () => {
                        if (onRemaster) {
                          await onRemaster(song);
                        }
                      }}
                    >
                      <Sparkles className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove FX from ${song.title}`}
                      title={generationActionTitle(
                        removeFxReady
                          ? "Remove FX"
                          : "Remove FX cleanup is not connected",
                      )}
                      disabled={
                        connectionDisabled ||
                        !onRemoveFx ||
                        !removeFxReady ||
                        removeFxBusy
                      }
                      onClick={async () => {
                        if (onRemoveFx) {
                          await onRemoveFx(song);
                        }
                      }}
                    >
                      <Eraser className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Download ${song.title}`}
                      onClick={() => downloadSong(song)}
                    >
                      <Download className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={
                        song.liked ? `Unlike ${song.title}` : `Like ${song.title}`
                      }
                      onClick={async () => {
                        await onUpdate(song.id, { liked: !song.liked });
                      }}
                    >
                      <Heart
                        className={
                          song.liked
                            ? "size-4 fill-rose-300 text-rose-300"
                            : "size-4"
                        }
                      />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${song.title}`}
                      onClick={async () => {
                        await onRemove(song.id);
                        toast.success("Track removed.");
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {!filteredSongs.length ? (
              <div className="rounded-md border border-white/10 bg-slate-950/55 p-8 text-center text-sm text-muted-foreground">
                No tracks match this library view.
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function getShareHref(shareSlug: string) {
  return `${window.location.origin}/s/${shareSlug}`;
}

async function copyShareHref(shareUrl: string) {
  if (!navigator.clipboard) {
    return;
  }

  try {
    const absoluteUrl = shareUrl.startsWith("http")
      ? shareUrl
      : `${window.location.origin}${shareUrl.startsWith("/") ? "" : "/"}${shareUrl}`;
    await navigator.clipboard.writeText(absoluteUrl);
  } catch {
    return;
  }
}

function downloadSong(song: LocalSong) {
  downloadAudioBlob(song.audioBlob, `${song.title}.${audioExtension(song.audioType)}`);
}

function exportLibraryManifest(songs: LocalSong[]) {
  const blob = new Blob([JSON.stringify(createLibraryManifest(songs), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `essence-suno-library-manifest-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
