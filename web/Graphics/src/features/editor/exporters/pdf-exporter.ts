import {
  canvasToBlob,
  renderDocumentToCanvas,
} from "@/features/editor/exporters/raster-exporter";
import type { DesignDocument } from "@/features/editor/types";

export async function exportDocumentToPdfBlob(
  document: DesignDocument,
  scale = 1,
) {
  const canvas = await renderDocumentToCanvas(document, scale);
  const imageBlob = await canvasToBlob(canvas, "image/jpeg", 0.92);
  const imageBytes = new Uint8Array(await imageBlob.arrayBuffer());
  const width = Math.max(1, canvas.width);
  const height = Math.max(1, canvas.height);
  const content = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ`;

  return new Blob([createPdfBytes({ width, height, imageBytes, content })], {
    type: "application/pdf",
  });
}

function createPdfBytes({
  width,
  height,
  imageBytes,
  content,
}: {
  width: number;
  height: number;
  imageBytes: Uint8Array;
  content: string;
}) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [encoder.encode("%PDF-1.4\n")];
  const offsets: number[] = [];
  let size = chunks[0]?.length ?? 0;

  function push(bytes: Uint8Array) {
    chunks.push(bytes);
    size += bytes.length;
  }

  function pushText(text: string) {
    push(encoder.encode(text));
  }

  function object(id: number, body: Array<string | Uint8Array>) {
    offsets[id] = size;
    pushText(`${id} 0 obj\n`);

    for (const part of body) {
      if (typeof part === "string") {
        pushText(part);
      } else {
        push(part);
      }
    }

    pushText("\nendobj\n");
  }

  object(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  object(2, ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"]);
  object(3, [
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] `,
    "/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>",
  ]);
  object(4, [
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} `,
    `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`,
    imageBytes,
    "\nendstream",
  ]);
  object(5, [
    `<< /Length ${encoder.encode(content).length} >>\nstream\n`,
    content,
    "\nendstream",
  ]);

  const xrefOffset = size;
  pushText(`xref\n0 6\n0000000000 65535 f \n`);

  for (let index = 1; index <= 5; index += 1) {
    pushText(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }

  pushText(
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  );

  const output = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}
