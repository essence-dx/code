import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const defaultStepSeconds = 30;
const defaultDigits = 6;

export function generateTotpSecret(byteLength = 20) {
  return encodeBase32(randomBytes(byteLength));
}

export function createTotpUri(input: {
  issuer: string;
  accountName: string;
  secret: string;
}) {
  const label = `${input.issuer}:${input.accountName}`;
  const params = new URLSearchParams({
    secret: input.secret,
    issuer: input.issuer,
    algorithm: "SHA1",
    digits: String(defaultDigits),
    period: String(defaultStepSeconds),
  });

  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

export function createTotpCode(input: {
  secret: string;
  timestamp?: number;
  stepSeconds?: number;
  digits?: number;
}) {
  const stepSeconds = input.stepSeconds ?? defaultStepSeconds;
  const digits = input.digits ?? defaultDigits;
  const timestamp = input.timestamp ?? Date.now();
  const counter = Math.floor(timestamp / 1000 / stepSeconds);
  const buffer = Buffer.alloc(8);

  buffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", decodeBase32(input.secret))
    .update(buffer)
    .digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = binary % 10 ** digits;

  return String(code).padStart(digits, "0");
}

export function verifyTotpCode(input: {
  secret: string;
  code: string;
  timestamp?: number;
  window?: number;
}) {
  const normalizedCode = normalizeTotpCode(input.code);

  if (!normalizedCode) {
    return false;
  }

  const timestamp = input.timestamp ?? Date.now();
  const window = input.window ?? 1;

  for (let offset = -window; offset <= window; offset += 1) {
    const expected = createTotpCode({
      secret: input.secret,
      timestamp: timestamp + offset * defaultStepSeconds * 1000,
    });

    if (safeEqual(expected, normalizedCode)) {
      return true;
    }
  }

  return false;
}

export function normalizeTotpCode(value: string) {
  const code = value.replace(/\s+/g, "");

  return /^\d{6}$/.test(code) ? code : "";
}

function encodeBase32(bytes: Buffer) {
  let bits = "";
  let output = "";

  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, "0");
  }

  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, "0");
    output += alphabet[Number.parseInt(chunk, 2)];
  }

  return output;
}

function decodeBase32(value: string) {
  const cleanValue = value.replace(/=+$/g, "").toUpperCase();
  let bits = "";

  for (const character of cleanValue) {
    const value = alphabet.indexOf(character);

    if (value < 0) {
      throw new Error("Invalid TOTP secret");
    }

    bits += value.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];

  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
