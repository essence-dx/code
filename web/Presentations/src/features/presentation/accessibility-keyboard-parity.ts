import {
  scanDeckAccessibility,
  summarizeAccessibility,
  type AccessibilityFinding,
} from "./accessibility-checker"
import type { Deck } from "./types"

export type AccessibilityKeyboardParityStatus =
  | "attention"
  | "blocked"
  | "ready"

export type AccessibilityKeyboardSurfaceId =
  | "accessibility-checker"
  | "canvas"
  | "file-menu"
  | "filmstrip"
  | "layers"
  | "properties"
  | "slideshow"
  | "speaker-notes"
  | "status-bar"
  | "toolbar"

export type AccessibilityKeyboardShortcut = {
  category: "canvas" | "file" | "filmstrip" | "slideshow"
  description: string
  id: string
  keys: string[]
  surfaceId: AccessibilityKeyboardSurfaceId
}

export type AccessibilityFocusSurface = {
  hasAriaLabel: boolean
  hasKeyboardEntry: boolean
  hasVisibleFocus: boolean
  id: AccessibilityKeyboardSurfaceId
  label: string
  order: number
  role: string
}

export type AccessibilityKeyboardParityCheck = {
  detail: string
  id: string
  label: string
  status: AccessibilityKeyboardParityStatus
}

export type AccessibilityKeyboardParityReport = {
  accessibilityErrors: number
  accessibilityWarnings: number
  checks: AccessibilityKeyboardParityCheck[]
  focusSurfaceCount: number
  readyCount: number
  shortcutCount: number
  status: AccessibilityKeyboardParityStatus
  summary: string
  totalCount: number
}

export type AccessibilityKeyboardParityInput = {
  deck?: Deck
  findings?: AccessibilityFinding[]
  focusSurfaces?: AccessibilityFocusSurface[]
  shortcuts?: AccessibilityKeyboardShortcut[]
}

export const presentationKeyboardShortcuts = [
  {
    category: "file",
    description: "Open a deck or supported import source.",
    id: "file-open",
    keys: ["Ctrl+O", "Command+O"],
    surfaceId: "file-menu",
  },
  {
    category: "file",
    description: "Save the current deck.",
    id: "file-save",
    keys: ["Ctrl+S", "Command+S"],
    surfaceId: "file-menu",
  },
  {
    category: "canvas",
    description: "Undo and redo slide edits.",
    id: "canvas-undo-redo",
    keys: ["Ctrl+Z", "Command+Z", "Ctrl+Y", "Command+Y"],
    surfaceId: "canvas",
  },
  {
    category: "canvas",
    description: "Zoom the slide canvas.",
    id: "canvas-zoom",
    keys: ["Ctrl++", "Ctrl+-", "Ctrl+0", "Command++", "Command+-", "Command+0"],
    surfaceId: "canvas",
  },
  {
    category: "canvas",
    description: "Traverse editable slide objects.",
    id: "canvas-object-traversal",
    keys: ["Tab", "Shift+Tab"],
    surfaceId: "canvas",
  },
  {
    category: "canvas",
    description: "Select and clear slide object selections.",
    id: "canvas-select-clear",
    keys: ["Ctrl+A", "Command+A", "Escape"],
    surfaceId: "canvas",
  },
  {
    category: "canvas",
    description: "Move selected objects with fine or coarse nudges.",
    id: "canvas-nudge",
    keys: ["Arrow keys", "Shift+Arrow keys"],
    surfaceId: "canvas",
  },
  {
    category: "canvas",
    description: "Copy, cut, paste, duplicate, group, and layer objects.",
    id: "canvas-object-commands",
    keys: [
      "Ctrl+C",
      "Ctrl+X",
      "Ctrl+V",
      "Ctrl+D",
      "Ctrl+G",
      "Ctrl+Shift+G",
      "Ctrl+[",
      "Ctrl+]",
    ],
    surfaceId: "canvas",
  },
  {
    category: "canvas",
    description: "Create, duplicate, reorder, and navigate slides from canvas focus.",
    id: "canvas-slide-commands",
    keys: [
      "Ctrl+M",
      "Ctrl+Shift+D",
      "Alt+ArrowUp",
      "Alt+ArrowDown",
      "PageUp",
      "PageDown",
      "Home",
      "End",
    ],
    surfaceId: "canvas",
  },
  {
    category: "filmstrip",
    description: "Move filmstrip focus through visible slide rows.",
    id: "filmstrip-navigation",
    keys: ["ArrowUp", "ArrowDown", "Home", "End"],
    surfaceId: "filmstrip",
  },
  {
    category: "filmstrip",
    description: "Select, copy, cut, paste, duplicate, delete, and reorder slides.",
    id: "filmstrip-slide-commands",
    keys: [
      "Shift+Arrow",
      "Ctrl+A",
      "Ctrl+C",
      "Ctrl+X",
      "Ctrl+V",
      "Ctrl+D",
      "Delete",
      "Alt+ArrowUp",
      "Alt+ArrowDown",
    ],
    surfaceId: "filmstrip",
  },
  {
    category: "slideshow",
    description: "Run presenter navigation without pointer input.",
    id: "slideshow-navigation",
    keys: ["Arrow keys", "PageUp", "PageDown", "Home", "End", "Space", "Enter"],
    surfaceId: "slideshow",
  },
  {
    category: "slideshow",
    description: "Control presenter blanking and captions.",
    id: "slideshow-delivery-commands",
    keys: ["B", "W", "C", "Escape"],
    surfaceId: "slideshow",
  },
] as const satisfies readonly AccessibilityKeyboardShortcut[]

export const presentationFocusSurfaces = [
  {
    hasAriaLabel: true,
    hasKeyboardEntry: true,
    hasVisibleFocus: true,
    id: "toolbar",
    label: "Ribbon toolbar",
    order: 1,
    role: "toolbar",
  },
  {
    hasAriaLabel: true,
    hasKeyboardEntry: true,
    hasVisibleFocus: true,
    id: "filmstrip",
    label: "Slide navigator",
    order: 2,
    role: "navigation",
  },
  {
    hasAriaLabel: true,
    hasKeyboardEntry: true,
    hasVisibleFocus: true,
    id: "canvas",
    label: "Slide canvas",
    order: 3,
    role: "application",
  },
  {
    hasAriaLabel: true,
    hasKeyboardEntry: true,
    hasVisibleFocus: true,
    id: "speaker-notes",
    label: "Speaker notes",
    order: 4,
    role: "region",
  },
  {
    hasAriaLabel: true,
    hasKeyboardEntry: true,
    hasVisibleFocus: true,
    id: "properties",
    label: "Properties and review panels",
    order: 5,
    role: "region",
  },
  {
    hasAriaLabel: true,
    hasKeyboardEntry: true,
    hasVisibleFocus: true,
    id: "layers",
    label: "Layer list",
    order: 6,
    role: "list",
  },
  {
    hasAriaLabel: true,
    hasKeyboardEntry: true,
    hasVisibleFocus: true,
    id: "accessibility-checker",
    label: "Accessibility issue list",
    order: 7,
    role: "region",
  },
  {
    hasAriaLabel: true,
    hasKeyboardEntry: true,
    hasVisibleFocus: true,
    id: "status-bar",
    label: "Status bar",
    order: 8,
    role: "contentinfo",
  },
  {
    hasAriaLabel: true,
    hasKeyboardEntry: true,
    hasVisibleFocus: true,
    id: "file-menu",
    label: "Backstage and file menu",
    order: 9,
    role: "dialog",
  },
  {
    hasAriaLabel: true,
    hasKeyboardEntry: true,
    hasVisibleFocus: true,
    id: "slideshow",
    label: "Slideshow presenter surface",
    order: 10,
    role: "dialog",
  },
] as const satisfies readonly AccessibilityFocusSurface[]

function combineStatuses(
  statuses: AccessibilityKeyboardParityStatus[],
): AccessibilityKeyboardParityStatus {
  if (statuses.includes("blocked")) return "blocked"
  if (statuses.includes("attention")) return "attention"
  return "ready"
}

function check(
  checks: AccessibilityKeyboardParityCheck[],
  id: string,
  label: string,
  status: AccessibilityKeyboardParityStatus,
  detail: string,
) {
  checks.push({ detail, id, label, status })
}

function duplicateOrders(surfaces: AccessibilityFocusSurface[]) {
  return surfaces
    .map((surface) => surface.order)
    .filter((order, index, orders) => orders.indexOf(order) !== index)
}

function shortcutSurfaceIds(shortcuts: readonly AccessibilityKeyboardShortcut[]) {
  return new Set(shortcuts.map((shortcut) => shortcut.surfaceId))
}

function actionableFinding(finding: AccessibilityFinding) {
  return Boolean(
    finding.slideId &&
      finding.slideTitle &&
      finding.title &&
      finding.details &&
      finding.severity,
  )
}

export function accessibilityKeyboardParityReport(
  input: AccessibilityKeyboardParityInput = {},
): AccessibilityKeyboardParityReport {
  const surfaces = [...(input.focusSurfaces ?? presentationFocusSurfaces)]
  const shortcuts = [...(input.shortcuts ?? presentationKeyboardShortcuts)]
  const findings = input.findings ?? (input.deck ? scanDeckAccessibility(input.deck) : [])
  const summary = summarizeAccessibility(findings)
  const checks: AccessibilityKeyboardParityCheck[] = []
  const missingLabels = surfaces.filter((surface) => !surface.hasAriaLabel)
  const missingKeyboardEntry = surfaces.filter(
    (surface) => !surface.hasKeyboardEntry,
  )
  const missingVisibleFocus = surfaces.filter(
    (surface) => !surface.hasVisibleFocus,
  )
  const duplicateOrderValues = duplicateOrders(surfaces)
  const coveredShortcutSurfaces = shortcutSurfaceIds(shortcuts)
  const requiredShortcutSurfaces: AccessibilityKeyboardSurfaceId[] = [
    "canvas",
    "file-menu",
    "filmstrip",
    "slideshow",
  ]
  const missingShortcutSurfaces = requiredShortcutSurfaces.filter(
    (surface) => !coveredShortcutSurfaces.has(surface),
  )
  const unactionableFindings = findings.filter(
    (finding) => !actionableFinding(finding),
  )

  check(
    checks,
    "focus-order",
    "Focus order",
    duplicateOrderValues.length ? "blocked" : "ready",
    duplicateOrderValues.length
      ? `Duplicate focus order value(s): ${duplicateOrderValues.join(", ")}.`
      : `${surfaces.length} focus surface(s) have deterministic order.`,
  )

  check(
    checks,
    "screen-reader-labels",
    "Screen-reader labels",
    missingLabels.length ? "blocked" : "ready",
    missingLabels.length
      ? `Missing accessible labels: ${missingLabels
          .map((surface) => surface.label)
          .join(", ")}.`
      : `${surfaces.length} focus surface(s) declare accessible labels.`,
  )

  check(
    checks,
    "keyboard-entry",
    "Keyboard entry",
    missingKeyboardEntry.length ? "blocked" : "ready",
    missingKeyboardEntry.length
      ? `Missing keyboard entry: ${missingKeyboardEntry
          .map((surface) => surface.label)
          .join(", ")}.`
      : `${surfaces.length} focus surface(s) are keyboard reachable.`,
  )

  check(
    checks,
    "visible-focus",
    "Visible focus",
    missingVisibleFocus.length ? "blocked" : "ready",
    missingVisibleFocus.length
      ? `Missing visible focus treatment: ${missingVisibleFocus
          .map((surface) => surface.label)
          .join(", ")}.`
      : `${surfaces.length} focus surface(s) have visible focus states.`,
  )

  check(
    checks,
    "shortcut-coverage",
    "Shortcut coverage",
    missingShortcutSurfaces.length ? "blocked" : "ready",
    missingShortcutSurfaces.length
      ? `Missing shortcut coverage for ${missingShortcutSurfaces.join(", ")}.`
      : `${shortcuts.length} keyboard shortcut group(s) cover canvas, filmstrip, file, and slideshow workflows.`,
  )

  check(
    checks,
    "accessibility-diagnostics",
    "Actionable diagnostics",
    unactionableFindings.length ? "blocked" : "ready",
    unactionableFindings.length
      ? `${unactionableFindings.length} accessibility finding(s) need slide/detail metadata.`
      : findings.length
        ? `${findings.length} accessibility finding(s) include slide/detail metadata and jump targets.`
        : "Accessibility scanner has no current findings and still exposes jump-ready issue metadata.",
  )

  const readyCount = checks.filter((item) => item.status === "ready").length

  return {
    accessibilityErrors: summary.errors,
    accessibilityWarnings: summary.warnings,
    checks,
    focusSurfaceCount: surfaces.length,
    readyCount,
    shortcutCount: shortcuts.length,
    status: combineStatuses(checks.map((item) => item.status)),
    summary: `${readyCount} of ${checks.length} accessibility and keyboard parity checks are ready.`,
    totalCount: checks.length,
  }
}

export function serializeAccessibilityKeyboardParityReport(
  report: AccessibilityKeyboardParityReport,
) {
  return [
    `Accessibility keyboard parity: ${report.summary} Status: ${report.status}.`,
    `Focus surfaces: ${report.focusSurfaceCount}. Shortcut groups: ${report.shortcutCount}.`,
    `Deck findings: ${report.accessibilityErrors} error(s), ${report.accessibilityWarnings} warning(s).`,
    ...report.checks.map(
      (check) => `- ${check.label}: ${check.status}. ${check.detail}`,
    ),
  ].join("\n")
}
