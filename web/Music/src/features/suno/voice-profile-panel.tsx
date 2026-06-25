"use client";

import { Download, Mic2, Save, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  type VoiceProfileInput,
  type VoiceSampleMetadata,
  voiceProfileSummary,
} from "@/features/ai/voice-profiles";
import { useVoiceProfiles } from "@/features/ai/use-voice-profiles";
import { getAudioDurationMs } from "@/features/audio/audio-processing";

const emptyVoiceProfile: VoiceProfileInput = {
  language: "",
  name: "",
  notes: "",
  range: "",
  rightsConfirmed: false,
  sample: null,
  tone: "",
};

export function VoiceProfilePanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { exportProfiles, profiles, remove, save } = useVoiceProfiles();
  const [draft, setDraft] = useState<VoiceProfileInput>(emptyVoiceProfile);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [sampleBusy, setSampleBusy] = useState(false);

  async function captureSample(file: File, sourceType: VoiceSampleMetadata["sourceType"]) {
    setSampleBusy(true);
    try {
      let durationMs = 0;

      try {
        durationMs = await getAudioDurationMs(file);
      } catch {
        durationMs = 0;
      }

      setDraft((current) => ({
        ...current,
        sample: {
          byteSize: file.size,
          durationMs,
          fileName: file.name,
          mediaType: file.type || "audio/*",
          sourceType,
        },
      }));
      toast.success("Sample metadata captured locally.");
    } finally {
      setSampleBusy(false);
    }
  }

  function saveDraft() {
    const profile = save(draft, editingId);
    setDraft(emptyVoiceProfile);
    setEditingId(undefined);
    toast.success(`${profile.name} saved.`);
  }

  function exportLibrary() {
    const blob = new Blob([exportProfiles()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "essence-suno-voice-profiles.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mic2 className="size-4 text-emerald-200" />
          Voice profiles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="Name"
            placeholder="Bright close vocal"
            value={draft.name}
            onChange={(name) => setDraft((current) => ({ ...current, name }))}
          />
          <Field
            label="Range"
            placeholder="alto / tenor / spoken"
            value={draft.range}
            onChange={(range) => setDraft((current) => ({ ...current, range }))}
          />
          <Field
            label="Tone"
            placeholder="airy, intimate, clean"
            value={draft.tone}
            onChange={(tone) => setDraft((current) => ({ ...current, tone }))}
          />
          <Field
            label="Language"
            placeholder="English, Bangla"
            value={draft.language}
            onChange={(language) =>
              setDraft((current) => ({ ...current, language }))
            }
          />
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="voice-notes">Notes</Label>
            <Textarea
              id="voice-notes"
              value={draft.notes}
              onChange={(event) =>
                setDraft((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Describe pronunciation, delivery, and safe usage limits"
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
            <p className="text-sm font-medium">Sample metadata</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The file is read locally for metadata; the audio itself is not stored
              in the profile or sent to a provider.
            </p>
            {draft.sample ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {draft.sample.sourceType}: {draft.sample.fileName} /{" "}
                {Math.round(draft.sample.durationMs / 1000)}s /{" "}
                {Math.round(draft.sample.byteSize / 1024)} KB
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void captureSample(file, "upload");
                }
                event.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              className="gap-2"
              disabled={sampleBusy}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Sample file
            </Button>
            <Button
              variant="ghost"
              className="gap-2"
              disabled={sampleBusy || !draft.sample}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  sample: current.sample
                    ? { ...current.sample, sourceType: "recording" }
                    : null,
                }))
              }
            >
              <Mic2 className="size-4" />
              Mark recording
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-md border border-white/10 bg-slate-950/50 p-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium">Rights confirmation</p>
            <p className="text-xs text-muted-foreground">
              Voice use remains blocked until you confirm this is your voice or
              you have permission.
            </p>
          </div>
          <Switch
            checked={draft.rightsConfirmed}
            onCheckedChange={(rightsConfirmed) =>
              setDraft((current) => ({ ...current, rightsConfirmed }))
            }
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="gap-2"
            disabled={!draft.name.trim()}
            onClick={saveDraft}
          >
            <Save className="size-4" />
            {editingId ? "Update voice" : "Save voice"}
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={!profiles.length}
            onClick={exportLibrary}
          >
            <Download className="size-4" />
            Export
          </Button>
        </div>
        {profiles.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="rounded-md border border-white/10 bg-slate-950/50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{profile.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {voiceProfileSummary(profile) || "No voice details yet"}
                    </p>
                  </div>
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
                {profile.sample ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {profile.sample.sourceType}: {profile.sample.fileName}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setDraft(profile);
                      setEditingId(profile.id);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-2"
                    onClick={() => {
                      remove(profile.id);
                      toast.success("Voice profile deleted.");
                    }}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-white/10 bg-slate-950/50 p-4 text-sm text-muted-foreground">
            Saved voice profiles will appear here after you create one.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const id = `voice-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
