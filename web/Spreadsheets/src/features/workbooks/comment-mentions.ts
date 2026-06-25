import type {
  CellCommentMention,
  CellCommentReply,
  CellNote,
  WorkbookCommentNotification,
} from "@/features/workbooks/types";

const emailMentionPattern = /@([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;

export type CommentAuthor = {
  name: string;
  email: string;
};

export function normalizeCommentAuthor(author: CommentAuthor): CommentAuthor {
  const email = author.email.trim().toLowerCase();
  const name = author.name.trim() || email || "Unknown user";

  return {
    email,
    name,
  };
}

export function extractCommentMentions(text: string): CellCommentMention[] {
  const mentions = new Map<string, CellCommentMention>();

  for (const match of text.matchAll(emailMentionPattern)) {
    const email = match[1]?.toLowerCase();

    if (!email) {
      continue;
    }

    mentions.set(email, {
      email,
      label: `@${email}`,
    });
  }

  return Array.from(mentions.values());
}

export function createCommentNotifications(input: {
  author: CommentAuthor;
  note: CellNote;
  reply?: CellCommentReply;
}): WorkbookCommentNotification[] {
  const author = normalizeCommentAuthor(input.author);
  const text = input.reply?.text ?? input.note.text;
  const mentions = input.reply?.mentions ?? input.note.mentions;
  const createdAt = input.reply?.createdAt ?? input.note.createdAt;

  return mentions
    .filter((mention) => mention.email !== author.email)
    .map((mention) => ({
      id: `comment_notification_${crypto.randomUUID()}`,
      sheetId: input.note.sheetId,
      cellKey: input.note.cellKey,
      noteId: input.note.id,
      replyId: input.reply?.id,
      mentionEmail: mention.email,
      authorName: author.name,
      authorEmail: author.email,
      text: text.slice(0, 500),
      createdAt,
    }));
}
