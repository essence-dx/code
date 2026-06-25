export type SymbolSnippet = {
  label: string
  value: string
  fontSize: number
}

export type SymbolGroup = {
  title: string
  items: SymbolSnippet[]
}

export const symbolGroups: SymbolGroup[] = [
  {
    title: "Math",
    items: [
      { label: "Plus minus", value: "±", fontSize: 38 },
      { label: "Not equal", value: "≠", fontSize: 38 },
      { label: "Less or equal", value: "≤", fontSize: 38 },
      { label: "Greater or equal", value: "≥", fontSize: 38 },
      { label: "Approx", value: "≈", fontSize: 38 },
      { label: "Infinity", value: "∞", fontSize: 38 },
    ],
  },
  {
    title: "Arrows",
    items: [
      { label: "Right arrow", value: "→", fontSize: 38 },
      { label: "Left arrow", value: "←", fontSize: 38 },
      { label: "Double arrow", value: "↔", fontSize: 38 },
      { label: "Implies", value: "⇒", fontSize: 38 },
      { label: "Up arrow", value: "↑", fontSize: 38 },
      { label: "Down arrow", value: "↓", fontSize: 38 },
    ],
  },
  {
    title: "Greek",
    items: [
      { label: "Alpha", value: "α", fontSize: 38 },
      { label: "Beta", value: "β", fontSize: 38 },
      { label: "Gamma", value: "γ", fontSize: 38 },
      { label: "Delta", value: "Δ", fontSize: 38 },
      { label: "Theta", value: "θ", fontSize: 38 },
      { label: "Pi", value: "π", fontSize: 38 },
    ],
  },
  {
    title: "Equation snippets",
    items: [
      { label: "Quadratic", value: "x = (-b ± √(b² - 4ac)) / 2a", fontSize: 24 },
      { label: "Slope", value: "m = (y₂ - y₁) / (x₂ - x₁)", fontSize: 24 },
      { label: "Pythagorean", value: "a² + b² = c²", fontSize: 28 },
      { label: "Average", value: "mean = (x₁ + x₂ + ... + xₙ) / n", fontSize: 22 },
    ],
  },
]
