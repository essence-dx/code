"use client";

import { Download, Fingerprint, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { personaSummary, type PersonaInput } from "@/features/ai/persona-library";
import { usePersonaLibrary } from "@/features/ai/use-persona-library";

const emptyPersona: PersonaInput = {
  energy: "medium",
  name: "",
  rightsConfirmed: false,
  sourceSongId: "",
  sourceTitle: "",
  stylePrompt: "",
  vibe: "",
  vocalCharacter: "",
};

export function PersonaLibraryPanel() {
  const { exportPersonas, personas, remove, save } = usePersonaLibrary();
  const [draft, setDraft] = useState<PersonaInput>(emptyPersona);
  const [editingId, setEditingId] = useState<string | undefined>();

  function saveDraft() {
    const persona = save(draft, editingId);
    setDraft(emptyPersona);
    setEditingId(undefined);
    toast.success(`${persona.name} saved.`);
  }

  function exportLibrary() {
    const blob = new Blob([exportPersonas()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "essence-suno-personas.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Fingerprint className="size-4 text-emerald-200" />
          Persona library
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="persona-name">Name</Label>
            <Input
              id="persona-name"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Late-night neon storyteller"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="persona-energy">Energy</Label>
            <Input
              id="persona-energy"
              value={draft.energy}
              onChange={(event) =>
                setDraft((current) => ({ ...current, energy: event.target.value }))
              }
              placeholder="low / medium / high"
            />
          </div>
          <PersonaTextarea
            label="Vibe"
            value={draft.vibe}
            onChange={(vibe) => setDraft((current) => ({ ...current, vibe }))}
          />
          <PersonaTextarea
            label="Vocal character"
            value={draft.vocalCharacter}
            onChange={(vocalCharacter) =>
              setDraft((current) => ({ ...current, vocalCharacter }))
            }
          />
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="persona-style">Style direction</Label>
            <Textarea
              id="persona-style"
              value={draft.stylePrompt}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  stylePrompt: event.target.value,
                }))
              }
              placeholder="Describe the reusable creative identity"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-md border border-white/10 bg-slate-950/50 p-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium">Rights confirmation</p>
            <p className="text-xs text-muted-foreground">
              Persona use is blocked unless you confirm this is based on your own
              original material.
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
            {editingId ? "Update persona" : "Save persona"}
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={!personas.length}
            onClick={exportLibrary}
          >
            <Download className="size-4" />
            Export
          </Button>
        </div>
        {personas.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {personas.map((persona) => (
              <div
                key={persona.id}
                className="rounded-md border border-white/10 bg-slate-950/50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{persona.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {personaSummary(persona) || "No persona details yet"}
                    </p>
                  </div>
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
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setDraft(persona);
                      setEditingId(persona.id);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-2"
                    onClick={() => {
                      remove(persona.id);
                      toast.success("Persona deleted.");
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
            Saved personas will appear here after you create one.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PersonaTextarea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const id = `persona-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
