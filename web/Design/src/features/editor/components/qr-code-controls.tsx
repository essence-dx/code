"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ColorPalettePicker } from "@/features/editor/components/color-palette-picker";
import type { EditorColorPalette } from "@/features/editor/color-palettes";
import {
  clampQrValue,
  getQrValueByteLength,
  qrErrorCorrectionOptions,
  qrValueMaxBytes,
} from "@/features/editor/qr-code";
import type {
  DesignElement,
  QrCodeElement,
  QrErrorCorrectionLevel,
} from "@/features/editor/types";

type QrCodeControlsProps = {
  element: QrCodeElement;
  palettes: readonly EditorColorPalette[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
};

export function QrCodeControls({
  element,
  palettes,
  onUpdateElement,
}: QrCodeControlsProps) {
  const valueByteLength = getQrValueByteLength(element.qrValue);

  return (
    <div className="space-y-4">
      <ControlField label="QR content">
        <Textarea
          value={element.qrValue}
          onChange={(event) =>
            onUpdateElement({
              qrValue: clampQrValue(event.target.value),
            } as Partial<DesignElement>)
          }
          spellCheck={false}
          placeholder="https://example.com"
          aria-label="QR code content"
        />
        <p className="text-xs text-muted-foreground">
          {valueByteLength}/{qrValueMaxBytes} bytes
        </p>
      </ControlField>

      <ControlField label="Foreground">
        <Input
          type="color"
          value={element.qrForeground}
          onChange={(event) =>
            onUpdateElement({
              qrForeground: event.target.value,
            } as Partial<DesignElement>)
          }
        />
        <ColorPalettePicker
          selectedColor={element.qrForeground}
          palettes={palettes}
          onSelectColor={(qrForeground) =>
            onUpdateElement({ qrForeground } as Partial<DesignElement>)
          }
        />
      </ControlField>

      <ControlField label="Background">
        <Input
          type="color"
          value={element.qrBackground}
          onChange={(event) =>
            onUpdateElement({
              qrBackground: event.target.value,
            } as Partial<DesignElement>)
          }
        />
        <ColorPalettePicker
          selectedColor={element.qrBackground}
          palettes={palettes}
          onSelectColor={(qrBackground) =>
            onUpdateElement({ qrBackground } as Partial<DesignElement>)
          }
        />
      </ControlField>

      <ControlField label="Error correction">
        <Select
          value={element.qrErrorCorrection}
          onValueChange={(qrErrorCorrection) =>
            onUpdateElement({
              qrErrorCorrection: qrErrorCorrection as QrErrorCorrectionLevel,
            } as Partial<DesignElement>)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {qrErrorCorrectionOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ControlField>

      <ControlField label="Quiet zone">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Margin</span>
            <span>{element.qrMargin}</span>
          </div>
          <Slider
            value={[element.qrMargin]}
            min={0}
            max={8}
            step={1}
            onValueChange={([qrMargin]) =>
              onUpdateElement({
                qrMargin,
              } as Partial<DesignElement>)
            }
            aria-label="QR code quiet zone"
          />
        </div>
      </ControlField>
    </div>
  );
}

function ControlField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
