export type TrackAuditionOptions = {
  gainDb: number;
  pan: number;
  muted: boolean;
};

export type TrackAudition = {
  stop: () => void;
};

export async function createTrackAudition(
  blob: Blob,
  options: TrackAuditionOptions,
): Promise<TrackAudition> {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContextClass();
  const source = context.createBufferSource();
  const gain = context.createGain();
  const panner = context.createStereoPanner();
  const buffer = await blob.arrayBuffer();
  const decoded = await context.decodeAudioData(buffer.slice(0));

  source.buffer = decoded;
  gain.gain.value = options.muted ? 0 : dbToGain(options.gainDb);
  panner.pan.value = options.pan;
  source.connect(gain).connect(panner).connect(context.destination);
  source.start();

  source.onended = () => {
    void context.close();
  };

  return {
    stop() {
      try {
        source.stop();
      } catch {
        return;
      }
    },
  };
}

function dbToGain(db: number) {
  return 10 ** (db / 20);
}
