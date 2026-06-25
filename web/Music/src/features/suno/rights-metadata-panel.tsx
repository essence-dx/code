"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { EditableSongPatch, LocalSong } from "@/features/library/types";
import {
  getSongRightsReadiness,
  normalizeSongRightsMetadata,
  rightsLicenseLabel,
  type SongRightsLicense,
  type SongRightsMetadata,
} from "@/lib/library/rights";

type RightsMetadataPanelProps = {
  onUpdate: (id: string, patch: EditableSongPatch) => Promise<void>;
  song: LocalSong;
};

const licenses: SongRightsLicense[] = [
  "all-rights-reserved",
  "cc-by",
  "cc-by-sa",
  "cc-by-nc",
  "public-domain",
  "custom",
  "unknown",
];

export function RightsMetadataPanel({ onUpdate, song }: RightsMetadataPanelProps) {
  const [draft, setDraft] = useState<SongRightsMetadata>(() =>
    normalizeSongRightsMetadata(song.rightsMetadata),
  );
  const readiness = useMemo(() => getSongRightsReadiness(draft), [draft]);

  useEffect(() => {
    setDraft(normalizeSongRightsMetadata(song.rightsMetadata));
  }, [song.id, song.rightsMetadata]);

  async function saveRights() {
    const rightsMetadata = normalizeSongRightsMetadata({
      ...draft,
      confirmedAt: draft.rightsConfirmed
        ? draft.confirmedAt ?? new Date().toISOString()
        : undefined,
    });

    await onUpdate(song.id, { rightsMetadata });
    toast.success("Rights metadata saved.");
  }

  function updateDraft(patch: Partial<SongRightsMetadata>) {
    setDraft((current) => normalizeSongRightsMetadata({ ...current, ...patch }));
  }

  return (
    <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-200" />
            <p className="font-medium">Rights and license</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{readiness.summary}</p>
        </div>
        <Badge
          className={
            readiness.ready
              ? "bg-emerald-400/15 text-emerald-200"
              : "bg-amber-400/15 text-amber-100"
          }
        >
          {readiness.ready ? "cleared" : "needs rights"}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rights-owner">Rights holder</Label>
          <Input
            id="rights-owner"
            value={draft.copyrightOwner}
            onChange={(event) => updateDraft({ copyrightOwner: event.target.value })}
            placeholder="Artist, label, or owner"
          />
        </div>
        <div className="space-y-2">
          <Label>License</Label>
          <Select
            value={draft.license}
            onValueChange={(license) =>
              updateDraft({ license: license as SongRightsLicense })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {licenses.map((license) => (
                <SelectItem key={license} value={license}>
                  {rightsLicenseLabel(license)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="rights-source">Source provenance</Label>
          <Textarea
            id="rights-source"
            value={draft.sourceProvenance}
            onChange={(event) =>
              updateDraft({ sourceProvenance: event.target.value })
            }
            placeholder="Original recording, upload source, provider result, or edit lineage"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="rights-attribution">Attribution</Label>
          <Textarea
            id="rights-attribution"
            value={draft.attribution}
            onChange={(event) => updateDraft({ attribution: event.target.value })}
            placeholder="Credits, samples, collaborators, or license attribution"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <RightsSwitch
          checked={draft.rightsConfirmed}
          label="Rights confirmed"
          onCheckedChange={(rightsConfirmed) =>
            updateDraft({
              rightsConfirmed,
              confirmedAt: rightsConfirmed
                ? draft.confirmedAt ?? new Date().toISOString()
                : undefined,
            })
          }
        />
        <RightsSwitch
          checked={draft.commercialUseAllowed}
          label="Commercial use"
          onCheckedChange={(commercialUseAllowed) =>
            updateDraft({ commercialUseAllowed })
          }
        />
        <RightsSwitch
          checked={draft.originalWork}
          label="Original work"
          onCheckedChange={(originalWork) => updateDraft({ originalWork })}
        />
        <RightsSwitch
          checked={draft.aiAssisted}
          label="AI assisted"
          onCheckedChange={(aiAssisted) => updateDraft({ aiAssisted })}
        />
        <RightsSwitch
          checked={draft.thirdPartySamples}
          label="Third-party samples"
          onCheckedChange={(thirdPartySamples) =>
            updateDraft({ thirdPartySamples })
          }
        />
      </div>

      <div className="mt-3 space-y-2">
        <Label htmlFor="rights-notes">Release notes</Label>
        <Textarea
          id="rights-notes"
          value={draft.notes}
          onChange={(event) => updateDraft({ notes: event.target.value })}
          placeholder="Private notes for release review"
        />
      </div>

      {readiness.issues.length ? (
        <ul className="mt-3 space-y-1 text-xs text-amber-100">
          {readiness.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}

      <Button className="mt-4" variant="secondary" onClick={saveRights}>
        Save rights
      </Button>
    </div>
  );
}

function RightsSwitch({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}
