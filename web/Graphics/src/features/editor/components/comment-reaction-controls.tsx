"use client";

import { CheckCircle2, Eye, Heart, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  DesignComment,
  DesignCommentReactionKind,
} from "@/features/editor/types";

const reactionKinds: DesignCommentReactionKind[] = [
  "thumbs-up",
  "heart",
  "check",
  "eyes",
];

type CommentReactionControlsProps = {
  comment: DesignComment;
  currentUserName: string;
  currentUserEmail: string;
  onToggleReaction: (kind: DesignCommentReactionKind) => void;
};

export function CommentReactionControls({
  comment,
  currentUserName,
  currentUserEmail,
  onToggleReaction,
}: CommentReactionControlsProps) {
  return (
    <div className="mt-2 grid grid-cols-4 gap-1">
      {reactionKinds.map((kind) => (
        <ReactionButton
          key={kind}
          kind={kind}
          count={getReactionCount(comment, kind)}
          active={hasUserReaction(
            comment,
            kind,
            currentUserName,
            currentUserEmail,
          )}
          onClick={() => onToggleReaction(kind)}
        />
      ))}
    </div>
  );
}

export function isCommentAssignedToUser(
  comment: DesignComment,
  currentUserName: string,
  currentUserEmail: string,
) {
  return samePerson(
    comment.assigneeName,
    comment.assigneeEmail,
    currentUserName,
    currentUserEmail,
  );
}

export function getCommentReactionSearchParts(comment: DesignComment) {
  return (comment.reactions ?? []).flatMap((reaction) => [
    reaction.kind,
    reaction.actorName,
    reaction.actorEmail ?? "",
  ]);
}

function ReactionButton({
  kind,
  count,
  active,
  onClick,
}: {
  kind: DesignCommentReactionKind;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      className="h-7 gap-1 rounded-md px-1 text-xs"
      aria-label={`React ${kind}`}
      onClick={onClick}
    >
      <ReactionIcon kind={kind} />
      <span className="font-mono text-[10px] text-muted-foreground">
        {count}
      </span>
    </Button>
  );
}

function ReactionIcon({ kind }: { kind: DesignCommentReactionKind }) {
  if (kind === "thumbs-up") {
    return <ThumbsUp className="size-3.5" />;
  }

  if (kind === "heart") {
    return <Heart className="size-3.5" />;
  }

  if (kind === "check") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return <Eye className="size-3.5" />;
}

function getReactionCount(
  comment: DesignComment,
  kind: DesignCommentReactionKind,
) {
  return (comment.reactions ?? []).filter((reaction) => reaction.kind === kind)
    .length;
}

function hasUserReaction(
  comment: DesignComment,
  kind: DesignCommentReactionKind,
  currentUserName: string,
  currentUserEmail: string,
) {
  return (comment.reactions ?? []).some(
    (reaction) =>
      reaction.kind === kind &&
      samePerson(
        reaction.actorName,
        reaction.actorEmail,
        currentUserName,
        currentUserEmail,
      ),
  );
}

function samePerson(
  firstName: string | undefined,
  firstEmail: string | null | undefined,
  secondName: string,
  secondEmail: string,
) {
  const normalizedFirstEmail = firstEmail?.trim().toLowerCase();
  const normalizedSecondEmail = secondEmail.trim().toLowerCase();

  if (normalizedFirstEmail || normalizedSecondEmail) {
    return normalizedFirstEmail === normalizedSecondEmail;
  }

  return Boolean(firstName && firstName === secondName);
}
