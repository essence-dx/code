import { create } from "qrcode";

import type { QrErrorCorrectionLevel } from "@/features/editor/types";

export const defaultQrValue = "https://essence.local";
export const qrValueMaxBytes = 900;
export const qrErrorCorrectionOptions = [
  {
    value: "L",
    label: "Low",
  },
  {
    value: "M",
    label: "Medium",
  },
  {
    value: "Q",
    label: "Quartile",
  },
  {
    value: "H",
    label: "High",
  },
] satisfies Array<{
  value: QrErrorCorrectionLevel;
  label: string;
}>;

const textEncoder = new TextEncoder();

export type QrMatrixPath = {
  size: number;
  path: string;
};

export function clampQrValue(value: string) {
  let result = "";
  let byteLength = 0;

  for (const character of value) {
    const nextByteLength = textEncoder.encode(character).length;

    if (byteLength + nextByteLength > qrValueMaxBytes) break;

    result += character;
    byteLength += nextByteLength;
  }

  return result;
}

export function getQrValueByteLength(value: string) {
  return textEncoder.encode(value).length;
}

export function getQrMatrixPath(
  value: string,
  errorCorrectionLevel: QrErrorCorrectionLevel,
): QrMatrixPath {
  const qrCode = create(normalizeQrValue(value), {
    errorCorrectionLevel,
  });
  const path: string[] = [];

  for (let row = 0; row < qrCode.modules.size; row += 1) {
    for (let column = 0; column < qrCode.modules.size; column += 1) {
      if (qrCode.modules.get(row, column)) {
        path.push(`M${column} ${row}h1v1h-1z`);
      }
    }
  }

  return {
    size: qrCode.modules.size,
    path: path.join(""),
  };
}

function normalizeQrValue(value: string) {
  return clampQrValue(value).trim() || defaultQrValue;
}
