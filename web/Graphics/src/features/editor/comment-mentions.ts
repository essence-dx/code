import type { DesignComment } from "@/features/editor/types";

export function getMentionKeys(user: { name: string; email: string }) {
  return Array.from(
    new Set(
      [
        user.email,
        user.email.split("@")[0],
        user.name,
        ...user.name.split(/\s+/),
      ]
        .map((value) => normalizeMention(value))
        .filter(Boolean),
    ),
  );
}

export function commentMentionsUser(
  comment: DesignComment,
  mentionKeys: string[],
) {
  if (mentionKeys.length === 0) {
    return false;
  }

  return [
    ...(comment.mentions ?? []),
    ...(comment.replies ?? []).flatMap((reply) => reply.mentions ?? []),
  ].some((mention) => mentionKeys.includes(normalizeMention(mention)));
}

export function countMentionedComments(
  comments: DesignComment[],
  mentionKeys: string[],
) {
  return comments.filter((comment) => commentMentionsUser(comment, mentionKeys))
    .length;
}

function normalizeMention(value?: string) {
  return value?.trim().replace(/^@/, "").toLowerCase() ?? "";
}
