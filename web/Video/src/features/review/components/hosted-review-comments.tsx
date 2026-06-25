"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare, RefreshCw, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createHostedReviewComment,
  listHostedReviewComments,
  type HostedReviewComment,
} from "@/lib/projects/hosted-review-comment-client";

export function HostedReviewComments({
  token,
  canComment,
  unavailable,
}: {
  token: string;
  canComment: boolean;
  unavailable: boolean;
}) {
  const [comments, setComments] = useState<HostedReviewComment[]>([]);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [anchorLabel, setAnchorLabel] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);

  const refresh = useCallback(async () => {
    const nextComments = await listHostedReviewComments(token);
    setComments(nextComments);
  }, [token]);

  useEffect(() => {
    setIsLoading(true);
    void refresh()
      .catch(() => setMessage("Hosted comments could not be loaded."))
      .finally(() => setIsLoading(false));
  }, [refresh]);

  async function submitComment() {
    if (!body.trim() || unavailable || !canComment) return;
    setIsPending(true);
    setMessage(null);

    try {
      const comment = await createHostedReviewComment(token, {
        reviewerName,
        reviewerEmail,
        anchorLabel,
        body,
      });
      setComments((current) => [...current, comment]);
      setBody("");
      setAnchorLabel("");
      setMessage("Comment saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Comment could not be saved.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card id="comments" className="scroll-mt-6 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-lg">
          <span className="flex items-center gap-2">
            <MessageSquare className="size-4" />
            Reviewer comments
          </span>
          <Button size="sm" variant="ghost" onClick={() => void refresh()} disabled={isPending || isLoading}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">{message}</div> : null}

        {canComment && !unavailable ? (
          <div className="space-y-3 rounded-md border border-border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} placeholder="Your name" />
              <Input value={reviewerEmail} onChange={(event) => setReviewerEmail(event.target.value)} placeholder="Email optional" type="email" />
            </div>
            <Input value={anchorLabel} onChange={(event) => setAnchorLabel(event.target.value)} placeholder="Scene or timestamp optional" />
            <Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Leave feedback for this cut" />
            <Button onClick={submitComment} disabled={!body.trim() || isPending}>
              <Send className="size-4" />
              Send comment
            </Button>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            {unavailable ? "This link is no longer accepting comments." : "This link is view-only."}
          </div>
        )}

        <div className="space-y-2">
          {isLoading ? (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">Loading comments.</div>
          ) : comments.length ? (
            comments.map((comment) => (
              <div key={comment.id} className="rounded-md border border-border p-3 text-sm">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{comment.reviewerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {comment.reviewerEmail ? `${comment.reviewerEmail} / ` : ""}
                      {formatDate(comment.createdAt)}
                    </div>
                  </div>
                  {comment.anchorLabel ? <Badge variant="outline">{comment.anchorLabel}</Badge> : null}
                </div>
                <p className="whitespace-pre-wrap">{comment.body}</p>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No comments yet.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}
