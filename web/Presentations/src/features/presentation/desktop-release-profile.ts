import {
  essenceDeckFileExtension,
  essenceDeckMimeType,
} from "./deck-file-format"
import type { DesktopTauriFileAssociation } from "./desktop-release-registration"

export const desktopReleaseGates = [
  "The production desktop shell must load the hosted HTTPS app, not a static export.",
  "The development desktop shell must load the local Next.js dev server.",
  "The release build must not run a local Next.js production build for Tauri.",
  "The default Tauri capability set must remain limited to core permissions while native file access flows through dialog-backed app commands that validate per-operation scopes.",
  "The bundled app must register the app-owned .essdeck file association without hijacking generic .json ownership.",
  "OS recent-document registration must only use native-path metadata returned by dialog-backed open and save commands.",
  "Signed release packages must define platform signing and notarization inputs outside source control before distribution.",
] as const

export const desktopReleaseFileAssociations = [
  {
    ext: [essenceDeckFileExtension.replace(".", "")],
    exportedType: {
      conformsTo: ["public.json", "public.data"],
      identifier: "app.essence.powerpoint.deck",
    },
    mimeType: essenceDeckMimeType,
    name: "Essence Deck",
    rank: "Owner",
    role: "Editor",
  },
] as const satisfies readonly DesktopTauriFileAssociation[]
