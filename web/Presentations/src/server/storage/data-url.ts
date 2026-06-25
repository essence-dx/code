import { Buffer } from "node:buffer"

export function decodeDataUrl(dataUrl: string) {
  const commaIndex = dataUrl.indexOf(",")
  if (commaIndex < 0) return null

  const metadata = dataUrl.slice(0, commaIndex)
  const payload = dataUrl.slice(commaIndex + 1)

  try {
    return {
      bytes: metadata.endsWith(";base64")
        ? Buffer.from(payload, "base64")
        : Buffer.from(decodeURIComponent(payload)),
      mimeType: /^data:([^;,]+)/.exec(metadata)?.[1] ?? "application/octet-stream",
    }
  } catch {
    return null
  }
}
