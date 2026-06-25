export type MediaFilter = "all" | "available" | "favorites" | "collection" | "missing" | "recoverable" | "used" | "unused";

export const mediaFilters: Array<{ value: MediaFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "available", label: "Ready" },
  { value: "favorites", label: "Fav" },
  { value: "collection", label: "Set" },
  { value: "missing", label: "Missing" },
  { value: "recoverable", label: "Recoverable" },
  { value: "used", label: "Used" },
  { value: "unused", label: "Unused" },
];
