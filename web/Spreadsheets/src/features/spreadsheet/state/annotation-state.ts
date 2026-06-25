import { normalizeCellLinkUrl } from "@/features/workbooks/cell-links";
import {
  createCommentNotifications,
  extractCommentMentions,
  normalizeCommentAuthor,
  type CommentAuthor,
} from "@/features/workbooks/comment-mentions";
import { normalizeMultiRangeAreas } from "@/features/spreadsheet/multi-range-selection";
import { normalizeNamedRangeName } from "@/features/spreadsheet/state/naming-state";
import type { CellRange } from "@/features/spreadsheet/state/selection-state";
import type {
  CellCommentStatus,
  CellNote,
  SheetData,
  WorkbookDocument,
} from "@/features/workbooks/types";

export function addNamedRangeToDocument(
  document: WorkbookDocument,
  name: string,
  range: CellRange,
) {
  addNamedMultiRangeToDocument(document, name, [range]);
}

export function addNamedMultiRangeToDocument(
  document: WorkbookDocument,
  name: string,
  ranges: CellRange[],
) {
  const normalizedName = normalizeNamedRangeName(name);
  const sheet = document.sheets.find(
    (item) => item.id === document.activeSheetId,
  ) as SheetData | undefined;
  const normalizedRanges = sheet
    ? normalizeMultiRangeAreas(sheet, ranges)
    : [];

  if (!normalizedName || normalizedRanges.length === 0) {
    return;
  }

  document.namedRanges ??= [];

  const now = new Date().toISOString();
  const primaryRange = normalizedRanges[0];
  const additionalRanges = normalizedRanges.slice(1);

  if (!primaryRange) {
    return;
  }

  const existingIndex = document.namedRanges.findIndex(
    (namedRange) =>
      namedRange.name.toLowerCase() === normalizedName.toLowerCase(),
  );

  if (existingIndex >= 0) {
    document.namedRanges[existingIndex] = {
      ...document.namedRanges[existingIndex],
      sheetId: document.activeSheetId,
      range: primaryRange,
      ranges: normalizedRanges.length > 1 ? normalizedRanges : undefined,
      updatedAt: now,
    };
    return;
  }

  document.namedRanges.push({
    id: `named_range_${crypto.randomUUID()}`,
    sheetId: document.activeSheetId,
    name: normalizedName,
    range: primaryRange,
    ranges:
      additionalRanges.length > 0 ? [primaryRange, ...additionalRanges] : undefined,
    createdAt: now,
    updatedAt: now,
  });
}

export function deleteNamedRangeFromDocument(
  document: WorkbookDocument,
  rangeId: string,
) {
  document.namedRanges = (document.namedRanges ?? []).filter(
    (range) => range.id !== rangeId,
  );
}

export function upsertCellNoteInDocument(
  document: WorkbookDocument,
  cellKey: string,
  input: {
    author: CommentAuthor;
    text: string;
  },
) {
  const author = normalizeCommentAuthor(input.author);
  const trimmedText = input.text.trim().slice(0, 2000);

  document.cellNotes ??= [];
  document.commentNotifications ??= [];

  const noteIndex = document.cellNotes.findIndex(
    (note) => note.sheetId === document.activeSheetId && note.cellKey === cellKey,
  );

  if (!trimmedText) {
    if (noteIndex >= 0) {
      document.cellNotes.splice(noteIndex, 1);
    }

    return;
  }

  const now = new Date().toISOString();
  const mentions = extractCommentMentions(trimmedText);

  if (noteIndex >= 0) {
    document.cellNotes[noteIndex] = {
      ...document.cellNotes[noteIndex],
      text: trimmedText,
      authorName: document.cellNotes[noteIndex].authorName || author.name,
      authorEmail: document.cellNotes[noteIndex].authorEmail || author.email,
      mentions,
      status: "open",
      resolvedAt: undefined,
      resolvedByEmail: undefined,
      resolvedByName: undefined,
      updatedAt: now,
    };
    document.commentNotifications.push(
      ...createCommentNotifications({
        author,
        note: document.cellNotes[noteIndex],
      }),
    );
    return;
  }

  const note: CellNote = {
    id: `note_${crypto.randomUUID()}`,
    sheetId: document.activeSheetId,
    cellKey,
    text: trimmedText,
    authorName: author.name,
    authorEmail: author.email,
    mentions,
    status: "open",
    replies: [],
    createdAt: now,
    updatedAt: now,
  };

  document.cellNotes.push(note);
  document.commentNotifications.push(
    ...createCommentNotifications({
      author,
      note,
    }),
  );
}

export function deleteCellNoteFromDocument(
  document: WorkbookDocument,
  noteId: string,
) {
  document.cellNotes = (document.cellNotes ?? []).filter(
    (note) => note.id !== noteId,
  );
  document.commentNotifications = (document.commentNotifications ?? []).filter(
    (notification) => notification.noteId !== noteId,
  );
}

export function addCellNoteReplyInDocument(
  document: WorkbookDocument,
  noteId: string,
  input: {
    author: CommentAuthor;
    text: string;
  },
) {
  const trimmedText = input.text.trim().slice(0, 2000);

  if (!trimmedText) {
    return;
  }

  document.cellNotes ??= [];
  document.commentNotifications ??= [];

  const noteIndex = document.cellNotes.findIndex((note) => note.id === noteId);

  if (noteIndex < 0) {
    return;
  }

  const author = normalizeCommentAuthor(input.author);
  const now = new Date().toISOString();
  const reply = {
    id: `comment_reply_${crypto.randomUUID()}`,
    text: trimmedText,
    authorName: author.name,
    authorEmail: author.email,
    mentions: extractCommentMentions(trimmedText),
    createdAt: now,
    updatedAt: now,
  };
  const note = {
    ...document.cellNotes[noteIndex],
    status: "open" as const,
    resolvedAt: undefined,
    resolvedByEmail: undefined,
    resolvedByName: undefined,
    replies: [...document.cellNotes[noteIndex].replies, reply],
    updatedAt: now,
  };

  document.cellNotes[noteIndex] = note;
  document.commentNotifications.push(
    ...createCommentNotifications({
      author,
      note,
      reply,
    }),
  );
}

export function setCellNoteStatusInDocument(
  document: WorkbookDocument,
  noteId: string,
  status: CellCommentStatus,
  author: CommentAuthor,
) {
  document.cellNotes ??= [];

  const noteIndex = document.cellNotes.findIndex((note) => note.id === noteId);

  if (noteIndex < 0) {
    return;
  }

  const normalizedAuthor = normalizeCommentAuthor(author);
  const now = new Date().toISOString();

  document.cellNotes[noteIndex] = {
    ...document.cellNotes[noteIndex],
    status,
    resolvedAt: status === "resolved" ? now : undefined,
    resolvedByName: status === "resolved" ? normalizedAuthor.name : undefined,
    resolvedByEmail: status === "resolved" ? normalizedAuthor.email : undefined,
    updatedAt: now,
  };
}

export function markCommentNotificationReadInDocument(
  document: WorkbookDocument,
  notificationId: string,
) {
  document.commentNotifications = (document.commentNotifications ?? []).map(
    (notification) =>
      notification.id === notificationId
        ? {
            ...notification,
            readAt: notification.readAt ?? new Date().toISOString(),
          }
        : notification,
  );
}

export function upsertCellLinkInDocument(
  document: WorkbookDocument,
  cellKey: string,
  input: { url: string; label: string },
) {
  const trimmedUrl = input.url.trim();
  const normalizedUrl = normalizeCellLinkUrl(trimmedUrl);
  const label = input.label.trim().slice(0, 200);

  document.cellLinks ??= [];

  const linkIndex = document.cellLinks.findIndex(
    (link) => link.sheetId === document.activeSheetId && link.cellKey === cellKey,
  );

  if (!trimmedUrl) {
    if (linkIndex >= 0) {
      document.cellLinks.splice(linkIndex, 1);
    }

    return;
  }

  if (!normalizedUrl) {
    return;
  }

  const now = new Date().toISOString();

  if (linkIndex >= 0) {
    document.cellLinks[linkIndex] = {
      ...document.cellLinks[linkIndex],
      url: normalizedUrl,
      label,
      updatedAt: now,
    };
    return;
  }

  document.cellLinks.push({
    id: `link_${crypto.randomUUID()}`,
    sheetId: document.activeSheetId,
    cellKey,
    url: normalizedUrl,
    label,
    createdAt: now,
    updatedAt: now,
  });
}

export function deleteCellLinkFromDocument(
  document: WorkbookDocument,
  linkId: string,
) {
  document.cellLinks = (document.cellLinks ?? []).filter(
    (link) => link.id !== linkId,
  );
}

export function repairCellLinkInDocument(
  document: WorkbookDocument,
  linkId: string,
  url: string,
) {
  const normalizedUrl = normalizeCellLinkUrl(url);

  if (!normalizedUrl) {
    return;
  }

  document.cellLinks ??= [];

  const linkIndex = document.cellLinks.findIndex((link) => link.id === linkId);

  if (linkIndex < 0) {
    return;
  }

  document.cellLinks[linkIndex] = {
    ...document.cellLinks[linkIndex],
    url: normalizedUrl,
    updatedAt: new Date().toISOString(),
  };
}
