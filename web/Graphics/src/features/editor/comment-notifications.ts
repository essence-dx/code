import type {
  DesignComment,
  DesignCommentNotificationDelivery,
  DesignCommentNotificationKind,
  DesignCommentNotificationPreferences,
  DesignCommentReaction,
  DesignCommentReply,
  DesignDocument,
  DesignPage,
} from "@/features/editor/types";

export type CommentNotificationEvent = {
  id: string;
  kind: DesignCommentNotificationKind;
  recipientEmail: string;
  actorName: string;
  fileName: string;
  fileUrl: string;
  pageName: string;
  commentId: string;
  replyId?: string;
  text: string;
};

type CommentWithPage = {
  comment: DesignComment;
  page: DesignPage;
};

type GetCommentNotificationEventsInput = {
  previousDocument: DesignDocument;
  nextDocument: DesignDocument;
  actorName: string;
  actorEmail: string;
  fileName: string;
  fileUrl: string;
};

export function getCommentNotificationEvents({
  previousDocument,
  nextDocument,
  actorName,
  actorEmail,
  fileName,
  fileUrl,
}: GetCommentNotificationEventsInput): CommentNotificationEvent[] {
  const preferences = getCommentNotificationPreferences(nextDocument);

  if (!preferences.enabled) {
    return [];
  }

  const previousComments = getCommentMap(previousDocument);
  const events: CommentNotificationEvent[] = [];

  for (const { comment, page } of getDocumentComments(nextDocument)) {
    const previous = previousComments.get(comment.id);

    if (!previous) {
      events.push(
        ...createCommentEvents({
          kind: "new-comment",
          comment,
          page,
          actorName,
          actorEmail,
          fileName,
          fileUrl,
          recipients: getCommentRecipients(comment),
          text: comment.text,
        }),
      );
      continue;
    }

    events.push(
      ...getAssignmentEvents({
        previousComment: previous.comment,
        comment,
        page,
        actorName,
        actorEmail,
        fileName,
        fileUrl,
      }),
      ...getMentionEvents({
        previousComment: previous.comment,
        comment,
        page,
        actorName,
        actorEmail,
        fileName,
        fileUrl,
      }),
      ...getReplyEvents({
        previousComment: previous.comment,
        comment,
        page,
        actorName,
        actorEmail,
        fileName,
        fileUrl,
      }),
      ...getReactionEvents({
        previousComment: previous.comment,
        comment,
        page,
        fileName,
        fileUrl,
      }),
    );
  }

  return dedupeEvents(events).filter((event) =>
    isNotificationEventAllowed(event, preferences),
  );
}

export function renderCommentNotificationEmail(event: CommentNotificationEvent) {
  const actionLabel = getActionLabel(event.kind);
  const subject = `Essence comment: ${actionLabel} in ${event.fileName}`;
  const text = [
    `${event.actorName} ${actionLabel.toLowerCase()} in ${event.fileName}.`,
    `Page: ${event.pageName}`,
    `Comment: ${event.text}`,
    `Open: ${event.fileUrl}`,
  ].join("\n\n");
  const html = [
    `<p><strong>${escapeHtml(event.actorName)}</strong> ${escapeHtml(
      actionLabel.toLowerCase(),
    )} in <strong>${escapeHtml(event.fileName)}</strong>.</p>`,
    `<p><strong>Page:</strong> ${escapeHtml(event.pageName)}</p>`,
    `<blockquote style="border-left:3px solid #14b8a6;margin:16px 0;padding-left:12px;color:#334155;">${escapeHtml(
      event.text,
    )}</blockquote>`,
    `<p><a href="${escapeHtml(event.fileUrl)}">Open the design file</a></p>`,
  ].join("");

  return {
    subject,
    text,
    html,
  };
}

export function getCommentNotificationPreferences(
  document: DesignDocument,
): DesignCommentNotificationPreferences {
  const preferences = document.commentNotificationPreferences;

  return {
    enabled: preferences?.enabled ?? true,
    newComments: preferences?.newComments ?? true,
    replies: preferences?.replies ?? true,
    assignments: preferences?.assignments ?? true,
    mentions: preferences?.mentions ?? true,
    reactions: preferences?.reactions ?? true,
    acknowledgements: preferences?.acknowledgements ?? true,
    mutedEmails: (preferences?.mutedEmails ?? [])
      .map(normalizeEmail)
      .filter((email): email is string => Boolean(email)),
    updatedAt: preferences?.updatedAt ?? document.updatedAt,
  };
}

export function updateCommentNotificationPreferences(
  document: DesignDocument,
  patch: Partial<
    Pick<
      DesignCommentNotificationPreferences,
      | "enabled"
      | "newComments"
      | "replies"
      | "assignments"
      | "mentions"
      | "reactions"
      | "acknowledgements"
      | "mutedEmails"
    >
  >,
): DesignDocument {
  const current = getCommentNotificationPreferences(document);
  const now = new Date().toISOString();

  return {
    ...document,
    commentNotificationPreferences: {
      ...current,
      ...patch,
      mutedEmails: Array.from(
        new Set(
          (patch.mutedEmails ?? current.mutedEmails)
            .map(normalizeEmail)
            .filter((email): email is string => Boolean(email)),
        ),
      ),
      updatedAt: now,
    },
    updatedAt: now,
  };
}

export function appendCommentNotificationDeliveries(
  document: DesignDocument,
  deliveries: DesignCommentNotificationDelivery[],
): DesignDocument {
  if (deliveries.length === 0) {
    return document;
  }

  return {
    ...document,
    notificationDeliveries: [
      ...deliveries,
      ...(document.notificationDeliveries ?? []),
    ].slice(0, 100),
  };
}

function getReplyEvents({
  previousComment,
  comment,
  page,
  actorName,
  actorEmail,
  fileName,
  fileUrl,
}: {
  previousComment: DesignComment;
  comment: DesignComment;
  page: DesignPage;
  actorName: string;
  actorEmail: string;
  fileName: string;
  fileUrl: string;
}) {
  const previousReplyIds = new Set(
    (previousComment.replies ?? []).map((reply) => reply.id),
  );
  const commentRecipients = getCommentRecipients(comment);

  return (comment.replies ?? [])
    .filter((reply) => !previousReplyIds.has(reply.id))
    .flatMap((reply) =>
      createCommentEvents({
        kind: "new-reply",
        comment,
        reply,
        page,
        actorName,
        actorEmail,
        fileName,
        fileUrl,
        recipients: [...commentRecipients, ...getEmailsFromText(reply.text)],
        text: reply.text,
      }),
    );
}

function getAssignmentEvents({
  previousComment,
  comment,
  page,
  actorName,
  actorEmail,
  fileName,
  fileUrl,
}: {
  previousComment: DesignComment;
  comment: DesignComment;
  page: DesignPage;
  actorName: string;
  actorEmail: string;
  fileName: string;
  fileUrl: string;
}) {
  const previousAssignee = normalizeEmail(previousComment.assigneeEmail);
  const nextAssignee = normalizeEmail(comment.assigneeEmail);

  if (!nextAssignee || nextAssignee === previousAssignee) {
    return [];
  }

  return createCommentEvents({
    kind: "assignment",
    comment,
    page,
    actorName,
    actorEmail,
    fileName,
    fileUrl,
    recipients: [nextAssignee],
    text: comment.dueDate
      ? `${comment.text}\n\nDue: ${comment.dueDate}`
      : comment.text,
  });
}

function getMentionEvents({
  previousComment,
  comment,
  page,
  actorName,
  actorEmail,
  fileName,
  fileUrl,
}: {
  previousComment: DesignComment;
  comment: DesignComment;
  page: DesignPage;
  actorName: string;
  actorEmail: string;
  fileName: string;
  fileUrl: string;
}) {
  const previousMentions = new Set(getCommentMentionEmails(previousComment));
  const newMentions = getCommentMentionEmails(comment).filter(
    (email) => !previousMentions.has(email),
  );

  return createCommentEvents({
    kind: "mention",
    comment,
    page,
    actorName,
    actorEmail,
    fileName,
    fileUrl,
    recipients: newMentions,
    text: comment.text,
  });
}

function getReactionEvents({
  previousComment,
  comment,
  page,
  fileName,
  fileUrl,
}: {
  previousComment: DesignComment;
  comment: DesignComment;
  page: DesignPage;
  fileName: string;
  fileUrl: string;
}) {
  const previousReactionIds = new Set(
    (previousComment.reactions ?? []).map((reaction) => reaction.id),
  );
  const commentRecipients = getCommentRecipients(comment);

  return (comment.reactions ?? [])
    .filter((reaction) => !previousReactionIds.has(reaction.id))
    .flatMap((reaction) =>
      createReactionEvents({
        comment,
        fileName,
        fileUrl,
        page,
        reaction,
        recipients: getReactionRecipients(commentRecipients, reaction),
      }),
    );
}

function createReactionEvents({
  comment,
  fileName,
  fileUrl,
  page,
  reaction,
  recipients,
}: {
  comment: DesignComment;
  fileName: string;
  fileUrl: string;
  page: DesignPage;
  reaction: DesignCommentReaction;
  recipients: string[];
}) {
  const kind: CommentNotificationEvent["kind"] =
    reaction.kind === "check" ? "acknowledgement" : "reaction";

  return Array.from(new Set(recipients.map(normalizeEmail).filter(Boolean)))
    .filter(
      (email): email is string =>
        Boolean(
          email &&
            (kind === "acknowledgement" ||
              email !== normalizeEmail(reaction.actorEmail)),
        ),
    )
    .map((recipientEmail) => ({
      id: [kind, comment.id, reaction.id, recipientEmail]
        .filter(Boolean)
        .join(":"),
      kind,
      recipientEmail,
      actorName: reaction.actorName,
      fileName,
      fileUrl,
      pageName: page.name,
      commentId: comment.id,
      text: summarizeText(`${reaction.kind}: ${comment.text}`),
    }));
}

function createCommentEvents({
  kind,
  comment,
  reply,
  page,
  actorName,
  actorEmail,
  fileName,
  fileUrl,
  recipients,
  text,
}: {
  kind: CommentNotificationEvent["kind"];
  comment: DesignComment;
  reply?: DesignCommentReply;
  page: DesignPage;
  actorName: string;
  actorEmail: string;
  fileName: string;
  fileUrl: string;
  recipients: string[];
  text: string;
}) {
  return Array.from(new Set(recipients.map(normalizeEmail).filter(Boolean)))
    .filter((email): email is string => Boolean(email && email !== actorEmail))
    .map((recipientEmail) => ({
      id: [kind, comment.id, reply?.id, recipientEmail].filter(Boolean).join(":"),
      kind,
      recipientEmail,
      actorName,
      fileName,
      fileUrl,
      pageName: page.name,
      commentId: comment.id,
      replyId: reply?.id,
      text: summarizeText(text),
    }));
}

function getCommentRecipients(comment: DesignComment) {
  return [
    comment.assigneeEmail,
    ...getCommentMentionEmails(comment),
  ].flatMap((email) => (email ? [email] : []));
}

function getReactionRecipients(
  commentRecipients: string[],
  reaction: DesignCommentReaction,
) {
  if (reaction.kind === "check") {
    return commentRecipients;
  }

  return commentRecipients;
}

function getCommentMentionEmails(comment: DesignComment) {
  return [
    ...getEmailsFromMentions(comment.mentions ?? []),
    ...getEmailsFromText(comment.text),
    ...(comment.replies ?? []).flatMap((reply) => [
      ...getEmailsFromMentions(reply.mentions ?? []),
      ...getEmailsFromText(reply.text),
    ]),
  ];
}

function getEmailsFromMentions(mentions: string[]) {
  return mentions.flatMap((mention) => {
    const normalizedMention = mention.trim().replace(/^@/, "");

    return isEmail(normalizedMention) ? [normalizedMention] : [];
  });
}

function getEmailsFromText(text: string) {
  return Array.from(
    text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi),
    (match) => match[0] ?? "",
  ).filter(isEmail);
}

function getDocumentComments(document: DesignDocument): CommentWithPage[] {
  return document.pages.flatMap((page) =>
    (page.comments ?? []).map((comment) => ({
      comment,
      page,
    })),
  );
}

function getCommentMap(document: DesignDocument) {
  return new Map(
    getDocumentComments(document).map((item) => [item.comment.id, item]),
  );
}

function dedupeEvents(events: CommentNotificationEvent[]) {
  return Array.from(new Map(events.map((event) => [event.id, event])).values());
}

function isNotificationEventAllowed(
  event: CommentNotificationEvent,
  preferences: DesignCommentNotificationPreferences,
) {
  if (preferences.mutedEmails.includes(event.recipientEmail)) {
    return false;
  }

  if (event.kind === "new-comment") {
    return preferences.newComments;
  }

  if (event.kind === "new-reply") {
    return preferences.replies;
  }

  if (event.kind === "assignment") {
    return preferences.assignments;
  }

  if (event.kind === "mention") {
    return preferences.mentions;
  }

  if (event.kind === "reaction") {
    return preferences.reactions;
  }

  return preferences.acknowledgements;
}

function normalizeEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase();

  return email && isEmail(email) ? email : null;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function summarizeText(value: string) {
  const text = value.trim().replace(/\s+/g, " ");

  return text.length > 220 ? `${text.slice(0, 217)}...` : text;
}

function getActionLabel(kind: CommentNotificationEvent["kind"]) {
  if (kind === "new-reply") {
    return "New reply";
  }

  if (kind === "assignment") {
    return "Comment assigned";
  }

  if (kind === "mention") {
    return "Mentioned you";
  }

  if (kind === "reaction") {
    return "New reaction";
  }

  if (kind === "acknowledgement") {
    return "Comment acknowledged";
  }

  return "New comment";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
