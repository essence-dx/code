const mentionPattern =
  /@([a-zA-Z0-9][a-zA-Z0-9._-]{0,63}(?:@[a-zA-Z0-9.-]+)?)/g;

export function extractCommentMentions(body: string) {
  const mentions = new Set<string>();
  let match: RegExpExecArray | null;

  mentionPattern.lastIndex = 0;

  while ((match = mentionPattern.exec(body)) !== null) {
    mentions.add(match[1].toLowerCase());
  }

  return Array.from(mentions).slice(0, 20);
}

export function parseCommentMentions(value: string) {
  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is string => typeof item === "string")
      .slice(0, 20);
  } catch {
    return [];
  }
}

export function stringifyCommentMentions(mentions: string[]) {
  return JSON.stringify(mentions.slice(0, 20));
}

export function splitCommentMentions(body: string) {
  const parts: { text: string; mention: boolean }[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  mentionPattern.lastIndex = 0;

  while ((match = mentionPattern.exec(body)) !== null) {
    if (match.index > cursor) {
      parts.push({
        text: body.slice(cursor, match.index),
        mention: false,
      });
    }

    parts.push({
      text: match[0],
      mention: true,
    });
    cursor = match.index + match[0].length;
  }

  if (cursor < body.length) {
    parts.push({
      text: body.slice(cursor),
      mention: false,
    });
  }

  return parts.length ? parts : [{ text: body, mention: false }];
}
