"use client";

import { Bell, CheckCircle2, MessageSquareText, RotateCcw, Trash2 } from "lucide-react";
import { ConfirmDestructiveButton } from "@/components/confirm-destructive-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseCellKey } from "@/features/workbooks/addresses";
import type { CellSelection } from "@/features/spreadsheet/state/selection-state";
import type {
  CellCommentStatus,
  CellNote,
  WorkbookCommentNotification,
} from "@/features/workbooks/types";

export function SheetNotesPanel({
  disabled,
  notes,
  notifications,
  onDeleteNote,
  onMarkNotificationRead,
  onSetNoteStatus,
  onSelectCell,
}: {
  disabled?: boolean;
  notes: CellNote[];
  notifications: WorkbookCommentNotification[];
  onDeleteNote: (noteId: string) => void;
  onMarkNotificationRead: (notificationId: string) => void;
  onSetNoteStatus: (noteId: string, status: CellCommentStatus) => void;
  onSelectCell: (selection: CellSelection) => void;
}) {
  const unreadNotifications = notifications.filter(
    (notification) => !notification.readAt,
  );

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Comments</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            {unreadNotifications.length} unread
          </Badge>
          <Badge variant="secondary" className="font-mono">
            {notes.length}
          </Badge>
        </div>
      </div>
      {unreadNotifications.length > 0 ? (
        <div className="mb-3 space-y-2">
          {unreadNotifications.map((notification) => {
            const position = parseCellKey(notification.cellKey);

            return (
              <section
                key={notification.id}
                className="rounded-lg border bg-primary/5 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 font-mono"
                    disabled={!position}
                    onClick={() => {
                      if (position) {
                        onSelectCell(position);
                      }
                    }}
                  >
                    <Bell />
                    {notification.cellKey}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onMarkNotificationRead(notification.id)}
                  >
                    Mark read
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mentioned by {notification.authorName}
                </p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm leading-6">
                  {notification.text}
                </p>
              </section>
            );
          })}
        </div>
      ) : null}
      <div className="space-y-2">
        {notes.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No comments on this sheet.
          </p>
        ) : (
          notes.map((note) => {
            const position = parseCellKey(note.cellKey);

            return (
              <section
                key={note.id}
                className="rounded-lg border bg-card p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 font-mono"
                    disabled={!position}
                    onClick={() => {
                      if (position) {
                        onSelectCell(position);
                      }
                    }}
                  >
                    <MessageSquareText />
                    {note.cellKey}
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={disabled}
                      aria-label={
                        note.status === "resolved"
                          ? "Reopen comment"
                          : "Resolve comment"
                      }
                      onClick={() =>
                        onSetNoteStatus(
                          note.id,
                          note.status === "resolved" ? "open" : "resolved",
                        )
                      }
                    >
                      {note.status === "resolved" ? <RotateCcw /> : <CheckCircle2 />}
                    </Button>
                    <ConfirmDestructiveButton
                      title="Delete this comment?"
                      description="This removes the thread from the cell. The cell value is kept."
                      label="Delete comment"
                      disabled={disabled}
                      onConfirm={() => onDeleteNote(note.id)}
                    >
                      <Trash2 />
                    </ConfirmDestructiveButton>
                  </div>
                </div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant={note.status === "resolved" ? "secondary" : "outline"}>
                    {note.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {note.replies.length} replies
                  </span>
                  {note.mentions.length > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {note.mentions.length} mentions
                    </span>
                  ) : null}
                </div>
                <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {note.text}
                </p>
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}
