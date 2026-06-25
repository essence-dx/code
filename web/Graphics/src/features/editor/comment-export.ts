import type { DesignComment } from "@/features/editor/types";

export function commentsToCsv(comments: DesignComment[]) {
  const rows = comments.flatMap((comment, index) => {
    const number = index + 1;
    const commentRow = [
      "comment",
      String(number),
      comment.resolved ? "resolved" : "open",
      String(Math.round(comment.x)),
      String(Math.round(comment.y)),
      comment.assigneeName ?? "",
      comment.dueDate ?? "",
      summarizeReactions(comment),
      summarizeResolutionHistory(comment),
      "",
      comment.text,
      comment.createdAt,
      comment.updatedAt,
    ];
    const replyRows = (comment.replies ?? []).map((reply) => [
      "reply",
      String(number),
      comment.resolved ? "resolved" : "open",
        String(Math.round(comment.x)),
        String(Math.round(comment.y)),
        comment.assigneeName ?? "",
        comment.dueDate ?? "",
        summarizeReactions(comment),
        summarizeResolutionHistory(comment),
        reply.authorName ?? "",
        reply.text,
      reply.createdAt,
      reply.updatedAt,
    ]);

    return [commentRow, ...replyRows];
  });

  return [
    [
      "type",
      "comment_number",
      "status",
      "x",
      "y",
      "assignee",
      "due_date",
      "reactions",
      "resolution_history",
      "author",
      "text",
      "created_at",
      "updated_at",
    ],
    ...rows,
  ]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

function summarizeResolutionHistory(comment: DesignComment) {
  return (comment.resolutionHistory ?? [])
    .map((item) => `${item.status}:${item.actorName}:${item.createdAt}`)
    .join(" | ");
}

function summarizeReactions(comment: DesignComment) {
  const counts = (comment.reactions ?? []).reduce<Record<string, number>>(
    (summary, reaction) => ({
      ...summary,
      [reaction.kind]: (summary[reaction.kind] ?? 0) + 1,
    }),
    {},
  );

  return Object.entries(counts)
    .map(([kind, count]) => `${kind}:${count}`)
    .join(" ");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string) {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}
