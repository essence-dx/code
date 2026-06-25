export function toBulletList(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => {
      const text = stripListMarker(line);

      return text ? `- ${text}` : "";
    })
    .join("\n");
}

export function toNumberedList(content: string) {
  let itemNumber = 1;

  return content
    .split(/\r?\n/)
    .map((line) => {
      const text = stripListMarker(line);

      if (!text) return "";

      const listItem = `${itemNumber}. ${text}`;
      itemNumber += 1;

      return listItem;
    })
    .join("\n");
}

export function toPlainParagraphs(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => stripListMarker(line))
    .join("\n");
}

function stripListMarker(line: string) {
  return line.trim().replace(/^([-*]\s+|\d+[.)]\s+)/, "");
}
