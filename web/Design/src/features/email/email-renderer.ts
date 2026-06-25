import type { EmailBlock, EmailModel, EmailSection } from "@/features/email/email-model";
import { productName } from "@/lib/product";

export function renderEmailHtml(model: EmailModel) {
  const previewText = escapeHtml(model.previewText);
  const sections = model.sections.map(renderEmailSection).join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(model.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;color:#111827;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${previewText}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="${model.width}" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:${model.width}px;background:#ffffff;border-collapse:collapse;">
          ${sections}
          <tr>
            <td style="padding:20px 24px;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#71717a;text-align:center;background:#fafafa;">
              Sent with ${escapeHtml(productName)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderEmailText(model: EmailModel) {
  return model.sections
    .flatMap((section) =>
      section.blocks.map((block) => {
        if (block.type === "text") return block.content;
        if (block.type === "button") return `${block.label}: ${block.href}`;
        if (block.type === "image") return `[Image: ${block.alt}]`;
        return "";
      }),
    )
    .filter(Boolean)
    .join("\n\n");
}

function renderEmailSection(section: EmailSection) {
  return `<tr>
    <td style="background:${escapeAttribute(section.background)};padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">
        ${section.blocks.map(renderEmailBlock).join("")}
      </table>
    </td>
  </tr>`;
}

function renderEmailBlock(block: EmailBlock) {
  if (block.type === "text") {
    return `<tr>
      <td style="padding:${block.padding}px 24px;font-family:${escapeAttribute(
        fontStack(block.fontFamily),
      )};font-size:${block.fontSize}px;line-height:${Math.round(
        block.fontSize * block.lineHeight,
      )}px;font-weight:${block.fontWeight};color:${escapeAttribute(
        block.color,
      )};text-align:${block.align};background:${escapeAttribute(
        block.backgroundColor,
      )};">
        ${escapeHtml(block.content).replaceAll("\n", "<br>")}
      </td>
    </tr>`;
  }

  if (block.type === "image") {
    const image = `<img src="${escapeAttribute(block.src)}" width="${block.width}" alt="${escapeAttribute(
      block.alt,
    )}" style="display:block;width:100%;max-width:${block.width}px;height:auto;border:0;outline:none;text-decoration:none;">`;

    return `<tr>
      <td align="center" style="padding:${block.padding}px 24px;">
        ${
          block.href
            ? `<a href="${escapeAttribute(block.href)}" target="_blank" style="text-decoration:none;">${image}</a>`
            : image
        }
      </td>
    </tr>`;
  }

  if (block.type === "button") {
    return `<tr>
      <td align="${block.align}" style="padding:${block.padding}px 24px;">
        <a href="${escapeAttribute(block.href)}" target="_blank" style="display:inline-block;background:${escapeAttribute(
          block.backgroundColor,
        )};color:${escapeAttribute(
          block.color,
        )};font-family:Arial,sans-serif;font-size:16px;font-weight:700;line-height:20px;text-decoration:none;border-radius:6px;padding:12px 18px;">${escapeHtml(
          block.label,
        )}</a>
      </td>
    </tr>`;
  }

  if (block.type === "divider") {
    return `<tr>
      <td style="padding:${block.padding}px 24px;">
        <div style="height:${block.height}px;line-height:${block.height}px;background:${escapeAttribute(
          block.color,
        )};font-size:0;">&nbsp;</div>
      </td>
    </tr>`;
  }

  return `<tr><td style="height:${Math.max(0, Math.round(block.height))}px;line-height:${Math.max(
    0,
    Math.round(block.height),
  )}px;font-size:0;">&nbsp;</td></tr>`;
}

function fontStack(fontFamily: string) {
  if (!fontFamily || fontFamily === "Geist") {
    return "Arial, Helvetica, sans-serif";
  }

  return `${fontFamily}, Arial, Helvetica, sans-serif`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
