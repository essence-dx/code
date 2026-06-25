export function readMediaFileAsDataUrl(file: File) {
  return readMediaBlobAsDataUrl(file)
}

export function readMediaBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Could not read this media file."))
      }
    })
    reader.addEventListener("error", () => {
      reject(new Error("Could not read this media file."))
    })
    reader.readAsDataURL(blob)
  })
}
