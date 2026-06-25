"use client";

import type { ReactNode } from "react";
import {
  Archive,
  ClipboardCopy,
  Download,
  FileJson2,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AdminCursorChatRoomMessagesReport,
  AdminCursorChatRoomMessageStatus,
} from "@/features/admin/admin-cursor-chat-room-messages";
import {
  getAdminCursorChatRoomMessagesCsv,
  getAdminCursorChatRoomMessagesJson,
  getAdminCursorChatRoomMessagesMarkdown,
} from "@/features/admin/admin-cursor-chat-room-messages";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminCursorChatRoomMessagesPanelProps = {
  report: AdminCursorChatRoomMessagesReport;
};

export function AdminCursorChatRoomMessagesPanel({
  report,
}: AdminCursorChatRoomMessagesPanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getAdminCursorChatRoomMessagesJson(report),
      filename: "admin-cursor-chat-room-messages.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminCursorChatRoomMessagesCsv(report),
      filename: "admin-cursor-chat-room-messages.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminCursorChatRoomMessagesMarkdown(report),
      filename: "admin-cursor-chat-room-messages.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminCursorChatRoomMessagesMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="size-4" />
            Cursor chat room messages
          </CardTitle>
          <CardDescription>
            Retention controls, privacy-safe replay evidence, recovery packet
            links, and exports for lightweight collaboration room chat.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Button type="button" size="sm" variant="outline" onClick={exportJson}>
            <FileJson2 className="size-3.5" />
            JSON
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
            <Download className="size-3.5" />
            CSV
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={exportMarkdown}
          >
            <Download className="size-3.5" />
            MD
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={copyMarkdown}
          >
            <ClipboardCopy className="size-3.5" />
            Copy
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Rooms" value={report.roomCount} />
          <Metric label="Messages" value={report.messageCount} />
          <Metric label="Expired" value={report.expiredMessageCount} />
          <Metric label="Mentions" value={report.mentionCount} />
          <Metric label="Replay" value={report.privacyReplayEvidenceCount} />
          <Metric label="Export" value={report.exportReadyRoomCount} />
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          {report.rows.map((row) => (
            <div
              key={row.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{row.label}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.detail}
                  </p>
                </div>
                <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge variant="outline">{row.value}</Badge>
                {row.target ? <Badge variant="outline">{row.target}</Badge> : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {row.recommendation}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {report.rooms.slice(0, 8).map((room) => (
            <div
              key={room.id}
              className="rounded-md border border-border bg-background p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{room.fileName}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {room.recommendation}
                  </p>
                </div>
                <Badge variant={getStatusVariant(room.status)}>
                  {room.status}
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                <Info
                  icon={<MessageCircle className="size-3.5" />}
                  label="Messages"
                  value={`${room.messageCount}`}
                />
                <Info
                  icon={<Archive className="size-3.5" />}
                  label="Expired"
                  value={`${room.expiredMessageCount}`}
                />
                <Info
                  icon={<ShieldCheck className="size-3.5" />}
                  label="Replay"
                  value={`${room.privacyReplayEvidenceCount}`}
                />
                <Info
                  icon={<PackageCheck className="size-3.5" />}
                  label="Packet"
                  value={room.recoveryPacketStatus}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 font-mono text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: AdminCursorChatRoomMessageStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
