"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { recordUsageEvent } from "@/features/ai/usage-accounting";

type AiChatBoxProps = {
  disabled: boolean;
  disabledReason?: string;
};

export function AiChatBox({ disabled, disabledReason }: AiChatBoxProps) {
  const disabledContextId = useId();
  const [chatInput, setChatInput] = useState("");
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/ai/chat" }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const sending = status !== "ready";
  const canSend = !disabled && !sending;
  const actionTitle = disabled
    ? (disabledReason ?? "Connect writing assistance to enable chat.")
    : "Send composer message";

  return (
    <div className="space-y-4">
      {disabled ? (
        <div
          id={disabledContextId}
          className="rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-50"
        >
          <p className="flex items-center gap-2 font-medium">
            <MessageSquare className="size-4" />
            Composer chat is paused.
          </p>
          <p className="mt-1 text-amber-50/80">
            {disabledReason ?? "Connect writing assistance to enable chat."} You
            can still draft a message here.
          </p>
        </div>
      ) : null}
      <ScrollArea className="h-72 rounded-md border border-white/10 bg-slate-950/50 p-4">
        <div className="space-y-3">
          {messages.map((message) => (
            <div key={message.id} className="space-y-1">
              <Badge variant="secondary">
                {message.role === "user" ? "You" : "Assistant"}
              </Badge>
              <div className="whitespace-pre-wrap text-sm leading-6">
                {message.parts.map((part, index) =>
                  part.type === "text" ? <span key={index}>{part.text}</span> : null,
                )}
              </div>
            </div>
          ))}
          {!messages.length ? (
            <p className="text-sm text-muted-foreground">
              Ask for arrangement, lyrics, metadata, or production notes.
            </p>
          ) : null}
        </div>
      </ScrollArea>
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!chatInput.trim() || !canSend) {
            return;
          }
          recordUsageEvent({
            kind: "text",
            label: "Composer chat",
            status: "succeeded",
          });
          sendMessage({ text: chatInput });
          setChatInput("");
        }}
      >
        <Input
          value={chatInput}
          aria-describedby={disabled ? disabledContextId : undefined}
          disabled={sending}
          onChange={(event) => setChatInput(event.target.value)}
          placeholder={
            disabled ? "Draft a message for later" : "Ask the composer"
          }
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Send composer message"
          disabled={!canSend}
          title={actionTitle}
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
