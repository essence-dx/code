import type { LocalStudioMarker, LocalStudioProject } from "./types";

const MIDI_HEADER = "MThd";
const MIDI_TRACK = "MTrk";
const DEFAULT_TICKS_PER_QUARTER = 480;

export function createStudioMarkerMidiFile(project: LocalStudioProject) {
  const writer = new MidiWriter();

  writer.writeAscii(MIDI_HEADER);
  writer.writeUint32(6);
  writer.writeUint16(0);
  writer.writeUint16(1);
  writer.writeUint16(DEFAULT_TICKS_PER_QUARTER);

  const track = createMetadataTrack(project);
  writer.writeBytes(track);

  return writer.toUint8Array();
}

export function studioMidiFileName(title: string) {
  return `${safeFileName(title)}-arrangement-markers.mid`;
}

function createMetadataTrack(project: LocalStudioProject) {
  const events: MidiEvent[] = [
    {
      tick: 0,
      bytes: metaText(0x03, project.title.trim() || "Essence Suno arrangement"),
    },
    {
      tick: 0,
      bytes: tempo(project.bpm),
    },
    {
      tick: 0,
      bytes: timeSignature(project.timeSignature),
    },
    ...project.markers.map((marker) => ({
      tick: markerToTick(marker, project.bpm),
      bytes: metaText(0x06, markerLabel(marker)),
    })),
  ].toSorted((a, b) => a.tick - b.tick);

  const writer = new MidiWriter();
  let lastTick = 0;

  for (const event of events) {
    writer.writeVariableLength(Math.max(0, event.tick - lastTick));
    writer.writeBytes(event.bytes);
    lastTick = event.tick;
  }

  writer.writeVariableLength(0);
  writer.writeBytes([0xff, 0x2f, 0x00]);

  const track = writer.toUint8Array();
  const output = new MidiWriter();
  output.writeAscii(MIDI_TRACK);
  output.writeUint32(track.length);
  output.writeBytes(track);

  return output.toUint8Array();
}

function markerToTick(marker: LocalStudioMarker, bpm: number) {
  return Math.round((Math.max(0, marker.startMs) * bpm * DEFAULT_TICKS_PER_QUARTER) / 60_000);
}

function markerLabel(marker: LocalStudioMarker) {
  const label = marker.label.trim() || capitalize(marker.kind);

  return marker.kind === "note" ? label : `${capitalize(marker.kind)}: ${label}`;
}

function tempo(bpm: number) {
  const microsecondsPerQuarter = Math.round(60_000_000 / clampInteger(bpm, 40, 240));

  return [
    0xff,
    0x51,
    0x03,
    (microsecondsPerQuarter >> 16) & 0xff,
    (microsecondsPerQuarter >> 8) & 0xff,
    microsecondsPerQuarter & 0xff,
  ];
}

function timeSignature(value: LocalStudioProject["timeSignature"]) {
  const [numerator, denominator] = value.split("/").map(Number);

  return [0xff, 0x58, 0x04, numerator, denominatorExponent(denominator), 24, 8];
}

function metaText(type: number, value: string) {
  const encoded = new TextEncoder().encode(value);

  return [0xff, type, ...variableLengthBytes(encoded.length), ...Array.from(encoded)];
}

function variableLengthBytes(value: number) {
  let buffer = value & 0x7f;
  const bytes = [];

  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }

  while (true) {
    bytes.push(buffer & 0xff);

    if (buffer & 0x80) {
      buffer >>= 8;
      continue;
    }

    break;
  }

  return bytes;
}

function denominatorExponent(value: number) {
  return Math.max(0, Math.round(Math.log2(value || 4)));
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "studio";
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.round(value), min), max);
}

type MidiEvent = {
  bytes: number[];
  tick: number;
};

class MidiWriter {
  private readonly bytes: number[] = [];

  writeAscii(value: string) {
    for (const character of value) {
      this.bytes.push(character.charCodeAt(0));
    }
  }

  writeBytes(value: ArrayLike<number>) {
    for (let index = 0; index < value.length; index += 1) {
      this.bytes.push(value[index] & 0xff);
    }
  }

  writeUint16(value: number) {
    this.bytes.push((value >> 8) & 0xff, value & 0xff);
  }

  writeUint32(value: number) {
    this.bytes.push(
      (value >> 24) & 0xff,
      (value >> 16) & 0xff,
      (value >> 8) & 0xff,
      value & 0xff,
    );
  }

  writeVariableLength(value: number) {
    this.writeBytes(variableLengthBytes(value));
  }

  toUint8Array() {
    return new Uint8Array(this.bytes);
  }
}
