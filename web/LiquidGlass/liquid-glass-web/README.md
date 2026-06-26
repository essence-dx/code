# @ogtirth/liquid-glass-oss

Physically rendered liquid glass React components powered by WebGL.

[Playground and documentation](https://liquid-glass-oss.vercel.app/) · [GitHub](https://github.com/ogtirth/LiquidGlass-OSS)

## Install

```bash
npm install @ogtirth/liquid-glass-oss
```

Import the stylesheet once:

```tsx
import "@ogtirth/liquid-glass-oss/styles.css";
```

## Example

```tsx
import { useState } from "react";
import {
  LiquidGlassButton,
  type LiquidGlassSettings
} from "@ogtirth/liquid-glass-oss";
import "@ogtirth/liquid-glass-oss/styles.css";

export function GlassToggle() {
  const [enabled, setEnabled] = useState(true);

  const settings: Partial<LiquidGlassSettings> = {
    refraction: 0.72,
    chromaticAberration: 0.05,
    tintColor: [0.35, 0.65, 1],
    tintStrength: 0.18
  };

  return (
    <LiquidGlassButton
      backgroundImage="/background.jpg"
      variant="dark"
      settings={settings}
      checked={enabled}
      onCheckedChange={setEnabled}
    >
      Liquid motion
    </LiquidGlassButton>
  );
}
```

Use the same image or same-origin video behind the component as `backgroundImage`. This keeps refraction aligned with the visible background.

## Exports

- `LiquidGlassButton`
- `LiquidGlassIconButton`
- `LiquidGlassCheckbox`
- `LiquidGlassRadioGroup`
- `LiquidGlassSlider`
- `LiquidGlassInput` and `LiquidGlassSearch`
- `LiquidGlassCard`
- `LiquidGlassDock`
- `LiquidGlassTabBar`
- `LiquidGlassBreadcrumb`
- `LiquidGlassDropdownMenu`
- `LiquidGlassPopoverOverlay`
- `LiquidGlassTooltip`
- `LiquidGlassToast`
- `LiquidGlassCommandPalette`

## Materials

```tsx
import {
  liquidGlassPresets,
  resolveLiquidGlassSettings
} from "@ogtirth/liquid-glass-oss";

const material = resolveLiquidGlassSettings("prism", {
  distortion: 0.03,
  liquidMotion: 0.18
});
```

Variants: `clear`, `frosted`, `dark`, `prism`, and `dome`.

## Draggable surfaces

```tsx
<LiquidGlassCard
  backgroundImage="/background.jpg"
  draggable
  defaultPosition={{ x: 320, y: 240 }}
>
  Drag me
</LiquidGlassCard>
```

Controlled positioning is available through `position` and `onPositionChange`.

## Requirements

- React 18+
- React DOM 18+
- WebGL-capable browser

## License

MIT
