import type { IconName, PresentationElement } from "./types"

type IconDefinition = {
  label: string
  paths: string[]
}

export const iconDefinitions: Record<IconName, IconDefinition> = {
  sparkle: {
    label: "Sparkle",
    paths: ["M12 3 L14.4 9.6 L21 12 L14.4 14.4 L12 21 L9.6 14.4 L3 12 L9.6 9.6 Z"],
  },
  check: {
    label: "Check",
    paths: ["M4.5 12.5 L9.5 17.5 L19.5 6.5"],
  },
  bolt: {
    label: "Bolt",
    paths: ["M13 2 L4 14 L11 14 L10 22 L20 9 L13 9 Z"],
  },
  heart: {
    label: "Heart",
    paths: [
      "M12 20 C8 16.5 4 13.2 4 8.8 C4 6.2 6 4.5 8.4 4.5 C10 4.5 11.2 5.3 12 6.5 C12.8 5.3 14 4.5 15.6 4.5 C18 4.5 20 6.2 20 8.8 C20 13.2 16 16.5 12 20 Z",
    ],
  },
  star: {
    label: "Star",
    paths: ["M12 3 L14.8 8.7 L21 9.6 L16.5 14 L17.6 20.2 L12 17.2 L6.4 20.2 L7.5 14 L3 9.6 L9.2 8.7 Z"],
  },
  home: {
    label: "Home",
    paths: ["M4 11 L12 4 L20 11", "M6.5 10.5 L6.5 20 L17.5 20 L17.5 10.5", "M10 20 L10 14 L14 14 L14 20"],
  },
  search: {
    label: "Search",
    paths: ["M10.5 18 C6.4 18 3 14.6 3 10.5 C3 6.4 6.4 3 10.5 3 C14.6 3 18 6.4 18 10.5 C18 14.6 14.6 18 10.5 18 Z", "M16 16 L21 21"],
  },
  lock: {
    label: "Lock",
    paths: ["M6 10 L18 10 L18 21 L6 21 Z", "M8.5 10 L8.5 7.5 C8.5 5.3 10 3.5 12 3.5 C14 3.5 15.5 5.3 15.5 7.5 L15.5 10"],
  },
  cloud: {
    label: "Cloud",
    paths: ["M7 18 L17.5 18 C20 18 22 16.2 22 13.9 C22 11.7 20.2 10 18 10 C17.4 6.8 14.8 4.5 11.6 4.5 C8.6 4.5 6.1 6.5 5.4 9.3 C3.5 9.8 2 11.5 2 13.6 C2 16 4.1 18 7 18 Z"],
  },
  chart: {
    label: "Chart",
    paths: ["M4 20 L20 20", "M6 17 L6 11", "M11 17 L11 7", "M16 17 L16 4"],
  },
  user: {
    label: "User",
    paths: ["M12 12 C14.5 12 16.5 10 16.5 7.5 C16.5 5 14.5 3 12 3 C9.5 3 7.5 5 7.5 7.5 C7.5 10 9.5 12 12 12 Z", "M4.5 21 C5.6 16.8 8.3 14.7 12 14.7 C15.7 14.7 18.4 16.8 19.5 21"],
  },
  link: {
    label: "Link",
    paths: ["M9.5 14.5 L14.5 9.5", "M10.5 6.5 L12 5 C14 3 17.2 3 19.2 5 C21.2 7 21.2 10.2 19.2 12.2 L17.5 13.9", "M13.5 17.5 L12 19 C10 21 6.8 21 4.8 19 C2.8 17 2.8 13.8 4.8 11.8 L6.5 10.1"],
  },
}

export const iconOptions = Object.entries(iconDefinitions).map(
  ([name, definition]) => ({
    name: name as IconName,
    label: definition.label,
  }),
)

export function iconDefinition(name: IconName | undefined) {
  return iconDefinitions[name ?? "sparkle"] ?? iconDefinitions.sparkle
}

export function iconStrokeWidth(element: PresentationElement) {
  return Math.max(1, Math.min(6, Number(element.shapeStrokeWidth) || 2))
}
