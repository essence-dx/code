import { InvalidSpeechRequestError } from "@/lib/ai/speech-errors";

const maxProviderSpeechInputChars = 200;
export const maxSpeechRequestChars = 2000;

export function chunkSpeechText(text: string, maxChars = maxProviderSpeechInputChars) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentenceLikeParts = normalized.match(/[^.!?]+[.!?]*/g) ?? [normalized];
  const chunks: string[] = [];
  let current = "";

  for (const part of sentenceLikeParts) {
    for (const segment of splitLongSpeechSegment(part.trim(), maxChars)) {
      if (!segment) continue;

      if (!current) {
        current = segment;
        continue;
      }

      if (current.length + 1 + segment.length <= maxChars) {
        current = `${current} ${segment}`;
        continue;
      }

      chunks.push(current);
      current = segment;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export function concatenateWavAudio(audioChunks: Array<{ base64: string; format: string; mediaType: string }>) {
  if (audioChunks.length === 0) {
    throw new InvalidSpeechRequestError("Voiceover generation did not return any audio chunks.");
  }

  if (audioChunks.some((chunk) => chunk.format !== "wav")) {
    throw new InvalidSpeechRequestError("Chunked voiceover generation currently supports WAV output only.");
  }

  if (audioChunks.length === 1) return audioChunks[0];

  const parsedChunks = audioChunks.map((chunk) => parseWavAudio(chunk.base64));
  const formatChunk = parsedChunks[0]?.formatChunk;
  if (!formatChunk) {
    throw new InvalidSpeechRequestError("Voiceover WAV output is missing format metadata.");
  }

  for (const parsed of parsedChunks) {
    if (!parsed.formatChunk.equals(formatChunk)) {
      throw new InvalidSpeechRequestError("Voiceover chunks returned incompatible WAV formats.");
    }
  }

  const dataSize = parsedChunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
  const riffSize = 4 + 8 + formatChunk.length + 8 + dataSize;
  const output = Buffer.alloc(12 + 8 + formatChunk.length + 8 + dataSize);
  let offset = 0;

  output.write("RIFF", offset, "ascii");
  offset += 4;
  output.writeUInt32LE(riffSize, offset);
  offset += 4;
  output.write("WAVE", offset, "ascii");
  offset += 4;
  output.write("fmt ", offset, "ascii");
  offset += 4;
  output.writeUInt32LE(formatChunk.length, offset);
  offset += 4;
  formatChunk.copy(output, offset);
  offset += formatChunk.length;
  output.write("data", offset, "ascii");
  offset += 4;
  output.writeUInt32LE(dataSize, offset);
  offset += 4;

  for (const chunk of parsedChunks) {
    chunk.data.copy(output, offset);
    offset += chunk.data.length;
  }

  return {
    base64: output.toString("base64"),
    format: "wav",
    mediaType: audioChunks[0]?.mediaType ?? "audio/wav",
  };
}

function splitLongSpeechSegment(segment: string, maxChars: number) {
  if (segment.length <= maxChars) return [segment];

  const chunks: string[] = [];
  let current = "";
  for (const word of segment.split(/\s+/)) {
    if (!word) continue;

    if (word.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let index = 0; index < word.length; index += maxChars) {
        chunks.push(word.slice(index, index + maxChars));
      }
      continue;
    }

    if (!current) {
      current = word;
      continue;
    }

    if (current.length + 1 + word.length <= maxChars) {
      current = `${current} ${word}`;
      continue;
    }

    chunks.push(current);
    current = word;
  }

  if (current) chunks.push(current);
  return chunks;
}

function parseWavAudio(base64: string) {
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new InvalidSpeechRequestError("Voiceover provider returned invalid WAV audio.");
  }

  let offset = 12;
  let formatChunk: Buffer | null = null;
  const dataChunks: Buffer[] = [];

  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + size;
    if (end > buffer.length) {
      throw new InvalidSpeechRequestError("Voiceover provider returned truncated WAV audio.");
    }

    if (id === "fmt ") formatChunk = buffer.subarray(start, end);
    if (id === "data") dataChunks.push(buffer.subarray(start, end));
    offset = end + (size % 2);
  }

  if (!formatChunk || dataChunks.length === 0) {
    throw new InvalidSpeechRequestError("Voiceover provider returned WAV audio without format or data chunks.");
  }

  return {
    formatChunk,
    data: Buffer.concat(dataChunks),
  };
}
