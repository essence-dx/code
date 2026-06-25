import { nanoid } from "nanoid";

import {
  createShapeElement,
  createTextElement,
} from "@/features/editor/document-factory";
import type { DesignElement } from "@/features/editor/types";

export type WebsiteLinkButtonVariant = "primary" | "outline";

type WebsiteLinkButtonInput = {
  x?: number;
  y?: number;
  width?: number;
  label?: string;
  url?: string;
  variant?: WebsiteLinkButtonVariant;
};

const linkButtonHeight = 76;

const linkButtonVariants: Record<
  WebsiteLinkButtonVariant,
  {
    fill: string;
    stroke: string;
    textColor: string;
    accentText: string;
  }
> = {
  primary: {
    fill: "#111827",
    stroke: "#111827",
    textColor: "#ffffff",
    accentText: "#d1d5db",
  },
  outline: {
    fill: "#ffffff",
    stroke: "#d4d4d8",
    textColor: "#111827",
    accentText: "#52525b",
  },
};

export function createWebsiteLinkButtonElements({
  x = 120,
  y = 160,
  width = 360,
  label = "Open link",
  url = "https://example.com",
  variant = "primary",
}: WebsiteLinkButtonInput = {}): DesignElement[] {
  const groupId = nanoid();
  const colors = linkButtonVariants[variant];
  const safeWidth = Math.max(240, width);

  return [
    createShapeElement({
      x,
      y,
      width: safeWidth,
      height: linkButtonHeight,
      fill: colors.fill,
      stroke: colors.stroke,
      strokeWidth: 1,
      radius: 22,
      linkUrl: url,
      groupId,
    }),
    createTextElement({
      content: label,
      x: x + 24,
      y: y + 21,
      width: safeWidth - 112,
      height: 34,
      fontSize: 21,
      fontWeight: 760,
      color: colors.textColor,
      textAlign: "left",
      lineHeight: 1.05,
      linkUrl: url,
      groupId,
    }),
    createTextElement({
      content: "Open",
      x: x + safeWidth - 78,
      y: y + 23,
      width: 54,
      height: 30,
      fontSize: 14,
      fontWeight: 700,
      color: colors.accentText,
      textAlign: "right",
      lineHeight: 1.05,
      linkUrl: url,
      groupId,
    }),
  ];
}
