"use client";

import { useState } from "react";
import { CheckCircle2, MessageSquareText, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CellNote } from "@/features/workbooks/types";

export function CellNoteDialog({
  address,
  disabled,
  note,
  onAddReply,
  onSaveThread,
  onSetStatus,
}: {
  address: string;
  disabled?: boolean;
  note?: CellNote;
  onAddReply: (noteId: string, text: string) => void;
  onSaveThread: (text: string) => void;
  onSetStatus: (noteId: string, status: "open" | "resolved") => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraft("");
    }

    setOpen(nextOpen);
  }

  function handleSave() {
    if (note) {
      onAddReply(note.id, draft);
    } else {
      onSaveThread(draft);
    }

    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant={note ? "secondary" : "ghost"}
              size="icon-sm"
              className={cn(note && "text-primary")}
              disabled={disabled}
            >
              <MessageSquareText />
              <span className="sr-only">Cell comment</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Cell comment</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cell comment</DialogTitle>
          <DialogDescription>{address}</DialogDescription>
        </DialogHeader>
        {note ? (
          <div className="max-h-72 space-y-3 overflow-auto rounded-md border bg-muted/30 p-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{note.authorName}</p>
                <Badge variant={note.status === "resolved" ? "secondary" : "outline"}>
                  {note.status}
                </Badge>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {note.text}
              </p>
            </div>
            {note.replies.map((reply) => (
              <div key={reply.id} className="border-t pt-3">
                <p className="text-sm font-medium">{reply.authorName}</p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {reply.text}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="cell-comment-text">
            {note ? "Reply" : "Comment"}
          </Label>
          <Textarea
            id="cell-comment-text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Use @person@example.com to mention someone."
          />
        </div>
        <DialogFooter>
          {note ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onSetStatus(note.id, note.status === "resolved" ? "open" : "resolved")
              }
            >
              {note.status === "resolved" ? <RotateCcw /> : <CheckCircle2 />}
              {note.status === "resolved" ? "Reopen" : "Resolve"}
            </Button>
          ) : null}
          <Button type="button" onClick={handleSave}>
            {note ? "Add reply" : "Add comment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
