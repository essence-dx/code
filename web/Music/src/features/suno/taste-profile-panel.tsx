"use client";

import { Download, RotateCcw, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  TasteProfile,
  TasteProfileSettings,
} from "@/features/ai/taste-profile";

type TasteProfilePanelProps = {
  exportProfile: () => string;
  loaded: boolean;
  profile: TasteProfile;
  resetSettings: () => void;
  settings: TasteProfileSettings;
  updateSettings: (settings: TasteProfileSettings) => void;
};

export function TasteProfilePanel({
  exportProfile,
  loaded,
  profile,
  resetSettings,
  settings,
  updateSettings,
}: TasteProfilePanelProps) {
  function updateList(key: "moodWords" | "stylePhrases" | "tags", value: string) {
    updateSettings({
      ...settings,
      [key]: parseList(value),
    });
  }

  function downloadProfile() {
    const blob = new Blob([exportProfile()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "essence-suno-taste-profile.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] lg:col-span-2">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <WandSparkles className="size-4 text-emerald-200" />
            My taste
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-slate-950/50 px-3 py-2">
              <Switch
                checked={settings.enabled ?? true}
                onCheckedChange={(enabled) => updateSettings({ ...settings, enabled })}
                disabled={!loaded}
              />
              <Label>Use in style wand</Label>
            </div>
            <Button variant="ghost" className="gap-2" onClick={resetSettings}>
              <RotateCcw className="size-4" />
              Reset
            </Button>
            <Button variant="secondary" className="gap-2" onClick={downloadProfile}>
              <Download className="size-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <SignalList title="Tags" values={profile.tags} />
          <SignalList title="Moods" values={profile.moodWords} />
          <SignalList title="Sources" values={[`${profile.sourceCount} signals`]} />
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <TasteTextarea
            label="Favorite tags"
            value={listText(profile.tags)}
            onChange={(value) => updateList("tags", value)}
          />
          <TasteTextarea
            label="Mood words"
            value={listText(profile.moodWords)}
            onChange={(value) => updateList("moodWords", value)}
          />
          <TasteTextarea
            label="Style phrases"
            value={listText(profile.stylePhrases)}
            onChange={(value) => updateList("stylePhrases", value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">{profile.summary}</p>
      </CardContent>
    </Card>
  );
}

function SignalList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
      <p className="font-medium">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {values.length ? (
          values.slice(0, 8).map((value) => (
            <Badge key={value} variant="secondary">
              {value}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">Learning</span>
        )}
      </div>
    </div>
  );
}

function TasteTextarea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-28"
      />
    </div>
  );
}

function listText(values: string[]) {
  return values.join(", ");
}

function parseList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,;\n]/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 24);
}
