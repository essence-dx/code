import {
  createCommentNotifications,
  extractCommentMentions,
} from "@/features/workbooks/comment-mentions";
import type { CellNote } from "@/features/workbooks/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const mentions = extractCommentMentions(
  "Please review @owner@example.com and @Owner@example.com before close.",
);

assert(mentions.length === 1, "mentions are deduplicated case-insensitively");
assert(mentions[0]?.email === "owner@example.com", "mention email is normalized");

const note: CellNote = {
  id: "note_1",
  sheetId: "sheet_1",
  cellKey: "A1",
  text: "Please review @owner@example.com",
  authorName: "Editor",
  authorEmail: "editor@example.com",
  mentions,
  status: "open",
  replies: [],
  createdAt: "2026-05-15T00:00:00.000Z",
  updatedAt: "2026-05-15T00:00:00.000Z",
};
const notifications = createCommentNotifications({
  author: {
    email: "editor@example.com",
    name: "Editor",
  },
  note,
});

assert(notifications.length === 1, "mentioned users receive notifications");
assert(
  notifications[0]?.mentionEmail === "owner@example.com",
  "notification targets the mentioned email",
);

console.log("Comment mention checks passed.");
