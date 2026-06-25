"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function CellLinkDialog({
  address,
  disabled,
  link,
  onSave,
}: {
  address: string;
  disabled?: boolean;
  link?: { url: string; label: string };
  onSave: (input: { url: string; label: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(link?.url ?? "");
  const [label, setLabel] = useState(link?.label ?? "");

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setUrl(link?.url ?? "");
      setLabel(link?.label ?? "");
    }

    setOpen(nextOpen);
  }

  function handleSave() {
    onSave({ url, label });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant={link ? "secondary" : "ghost"}
              size="icon-sm"
              className={cn(link && "text-primary")}
              disabled={disabled}
            >
              <Link2 />
              <span className="sr-only">Cell link</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Cell link</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cell link</DialogTitle>
          <DialogDescription>{address}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cell-link-url">Link</Label>
            <Input
              id="cell-link-url"
              value={url}
              placeholder="https://example.com, name@example.com, or +15551234567"
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cell-link-label">Label</Label>
            <Input
              id="cell-link-label"
              value={label}
              placeholder="Optional"
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setUrl("");
              setLabel("");
            }}
          >
            Clear
          </Button>
          <Button type="button" onClick={handleSave}>
            Save link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
