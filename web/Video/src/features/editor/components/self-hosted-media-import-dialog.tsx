"use client";

import { useState, type FormEvent } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MediaType } from "@/lib/editor/types";
import type { SelfHostedMediaImportInput } from "@/lib/media/self-hosted-media";

type SelfHostedMediaImportDialogProps = {
  open: boolean;
  isImporting: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (input: SelfHostedMediaImportInput) => Promise<boolean>;
};

export function SelfHostedMediaImportDialog({
  open,
  isImporting,
  onOpenChange,
  onImport,
}: SelfHostedMediaImportDialogProps) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("video");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError("Enter a media URL.");
      return;
    }

    const imported = await onImport({
      url,
      mediaType,
      name: name || undefined,
    });
    if (!imported) return;

    setUrl("");
    setName("");
    setMediaType("video");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Self-Hosted Media</DialogTitle>
          <DialogDescription>Use a direct media file URL from storage you control.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="self-hosted-url">Media URL</Label>
            <Input
              id="self-hosted-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://media.example.com/clip.mp4"
              disabled={isImporting}
            />
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={mediaType} onValueChange={(value) => setMediaType(value as MediaType)} disabled={isImporting}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="self-hosted-name">Display name</Label>
              <Input
                id="self-hosted-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Optional"
                disabled={isImporting}
              />
            </div>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isImporting}>
              <Link2 className="size-4" />
              {isImporting ? "Checking..." : "Link media"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
