# LiquidGlass OSS

WebGL-powered liquid glass components for React.

<img width="1440" height="767" alt="Screenshot 2026-06-26 at 12 05 59 AM" src="https://github.com/user-attachments/assets/0aeb7842-452b-4204-90ec-c01f02714548" />


[Playground](https://liquid-glass-oss.vercel.app/) · [npm](https://www.npmjs.com/package/@ogtirth/liquid-glass-oss) · [Web source](./liquid-glass-web)

## Install

```bash
npm install @ogtirth/liquid-glass-oss
```

## Use

```tsx
import { useState } from "react";
import { LiquidGlassButton } from "@ogtirth/liquid-glass-oss";
import "@ogtirth/liquid-glass-oss/styles.css";

export function Example() {
  const [enabled, setEnabled] = useState(true);

  return (
    <LiquidGlassButton
      backgroundImage="/background.jpg"
      variant="dark"
      checked={enabled}
      onCheckedChange={setEnabled}
    >
      Liquid motion
    </LiquidGlassButton>
  );
}
```

`backgroundImage` should match the image or same-origin video behind the component. The renderer samples it for live refraction.

## Components

- Button, icon button, checkbox, radio group, slider, and input
- Card
- Dock, tab bar, and breadcrumb
- Dropdown, popover, tooltip, toast, and command palette

Every component supports material presets and physics overrides:

```tsx
<LiquidGlassCard
  backgroundImage="/background.jpg"
  variant="frosted"
  settings={{
    refraction: 0.72,
    tintColor: [0.35, 0.65, 1],
    tintStrength: 0.18
  }}
>
  Custom glass
</LiquidGlassCard>
```

Available variants:

```ts
"clear" | "frosted" | "dark" | "prism" | "dome"
```

See interactive examples and component documentation in the [playground](https://liquid-glass-oss.vercel.app/).

## Development

```bash
git clone https://github.com/ogtirth/LiquidGlass-OSS.git
cd LiquidGlass-OSS
npm install
npm run typecheck
npm run build
```

## License

MIT

