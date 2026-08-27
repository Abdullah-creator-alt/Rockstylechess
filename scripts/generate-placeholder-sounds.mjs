// One-off script -- output (assets/sounds/*.wav) is committed, not
// regenerated on every build, same pattern as vectorize-pieces.mjs/
// recolor-pieces.mjs. Synthesizes short placeholder tones with pure Node
// (raw PCM math + a hand-rolled WAV header, no audio library) since no real
// recorded sound assets exist yet -- swap any file here for a real
// recording later without touching any app code, same filename.
//
// Run: node scripts/generate-placeholder-sounds.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

/**
 * One tone segment: a sine (optionally detuned with a second close
 * frequency for a "buzzy" beat effect) with a linear attack/decay envelope
 * so the waveform starts/ends at zero (no clicks/pops).
 */
function tone(freqHz, durationSec, { amplitude = 0.5, attackSec = 0.005, decaySec = 0.03, detuneHz = 0 } = {}) {
  const n = Math.round(durationSec * SAMPLE_RATE);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / SAMPLE_RATE;
    let value = Math.sin(2 * Math.PI * freqHz * t);
    if (detuneHz) value = (value + Math.sin(2 * Math.PI * (freqHz + detuneHz) * t)) / 2;
    const attackEnv = attackSec > 0 ? Math.min(1, t / attackSec) : 1;
    const timeLeft = durationSec - t;
    const decayEnv = decaySec > 0 ? Math.min(1, timeLeft / decaySec) : 1;
    samples[i] = value * amplitude * Math.min(attackEnv, decayEnv);
  }
  return samples;
}

function silence(durationSec) {
  return new Float32Array(Math.round(durationSec * SAMPLE_RATE));
}

function concat(segments) {
  const total = segments.reduce((sum, s) => sum + s.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const s of segments) {
    out.set(s, offset);
    offset += s.length;
  }
  return out;
}

function writeWav(filename, samples) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28); // byte rate
  buffer.writeUInt16LE(bytesPerSample, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * bytesPerSample);
  }

  writeFileSync(path.join(OUT_DIR, filename), buffer);
  console.log(`wrote ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

const SOUNDS = {
  'move.wav': () => tone(650, 0.07, { amplitude: 0.4, decaySec: 0.05 }),

  'capture.wav': () => tone(260, 0.09, { amplitude: 0.55, attackSec: 0.002, decaySec: 0.06, detuneHz: 18 }),

  'castle.wav': () =>
    concat([tone(520, 0.04, { amplitude: 0.4, decaySec: 0.03 }), silence(0.03), tone(520, 0.04, { amplitude: 0.4, decaySec: 0.03 })]),

  'check.wav': () =>
    concat([tone(600, 0.06, { amplitude: 0.45, decaySec: 0.04 }), silence(0.02), tone(900, 0.08, { amplitude: 0.45, decaySec: 0.05 })]),

  'checkmate.wav': () =>
    concat([
      tone(500, 0.09, { amplitude: 0.5, decaySec: 0.05 }),
      silence(0.015),
      tone(650, 0.09, { amplitude: 0.5, decaySec: 0.05 }),
      silence(0.015),
      tone(850, 0.16, { amplitude: 0.5, decaySec: 0.1 }),
    ]),

  'illegal.wav': () => tone(150, 0.12, { amplitude: 0.35, attackSec: 0.005, decaySec: 0.04, detuneHz: 9 }),
};

for (const [filename, build] of Object.entries(SOUNDS)) {
  writeWav(filename, build());
}
