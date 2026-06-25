const MAX_IMAGE_SIDE = 1920
const COMPRESSED_IMAGE_TYPE = "image/webp"
const COMPRESSED_IMAGE_QUALITY = 0.88
const COMPRESSIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

export function readImageFileAsDataUrl(file: File) {
  if (COMPRESSIBLE_TYPES.has(file.type)) {
    return compressImageFileAsDataUrl(file).catch(() => readRawFileAsDataUrl(file))
  }

  return readRawFileAsDataUrl(file)
}

function readRawFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener("load", () => resolve(String(reader.result)))
    reader.addEventListener("error", () => reject(reader.error))
    reader.readAsDataURL(file)
  })
}

async function compressImageFileAsDataUrl(file: File) {
  const raw = await readRawFileAsDataUrl(file)
  const image = await loadImage(raw)
  const scale = Math.min(
    1,
    MAX_IMAGE_SIDE / image.naturalWidth,
    MAX_IMAGE_SIDE / image.naturalHeight,
  )
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")
  if (!context) return raw

  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL(COMPRESSED_IMAGE_TYPE, COMPRESSED_IMAGE_QUALITY)
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => resolve(image))
    image.addEventListener("error", () => reject(new Error("Image decode failed")))
    image.decoding = "async"
    image.src = src
  })
}
