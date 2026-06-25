import type { FilePickerType } from "./browser-downloads"

export const presentationPptxMimeType =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
export const presentationOdpMimeType =
  "application/vnd.oasis.opendocument.presentation"

export const presentationImportInputAccept = [
  presentationPptxMimeType,
  presentationOdpMimeType,
  ".pptx",
  ".odp",
  ".gslides",
].join(",")

export const presentationPickerTypes = [
  {
    description:
      "PowerPoint (.pptx), Google Slides-downloaded PPTX, or OpenDocument (.odp)",
    accept: {
      [presentationOdpMimeType]: [".odp"],
      [presentationPptxMimeType]: [".pptx"],
    },
  },
] satisfies FilePickerType[]

export const pptxPickerTypes = [
  {
    description: "PPTX for PowerPoint or Google Slides upload",
    accept: {
      [presentationPptxMimeType]: [".pptx"],
    },
  },
] satisfies FilePickerType[]

export function isOdpPresentationFile(file: File) {
  return (
    file.name.toLowerCase().endsWith(".odp") ||
    file.type === presentationOdpMimeType
  )
}

export function isGoogleSlidesShortcutFile(file: File) {
  return file.name.toLowerCase().endsWith(".gslides")
}

export function googleSlidesImportMessage(fileName: string) {
  return [
    `${fileName} is a Google Drive shortcut, not the presentation package.`,
    "Open the deck in Google Slides, choose File > Download > Microsoft PowerPoint (.pptx), then import that .pptx file here.",
  ].join("\n")
}
