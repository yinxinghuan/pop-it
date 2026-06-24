// Minimal WebAudio kit. iOS-safe per instant-play audio rules:
//   • AudioContext lazily created on first user gesture
//   • resume() called once
//   • a single noise buffer pre-allocated; no per-voice createBuffer()
//   • no per-pointermove audio — only discrete tap events
//   • a hard cap on concurrent voices so a fast cascade can't flood iOS

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let resumed = false;
let muted = false;

// crude concurrency guard: count in-flight voices, drop new ones over the cap.
let voices = 0;
const MAX_VOICES = 10;

function ensure() {
  if (ctx) return;
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    const len = Math.floor(ctx.sampleRate * 0.4);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
}

export function unlockAudio() {
  ensure();
  if (ctx && !resumed) {
    ctx.resume().catch(() => {});
    resumed = true;
  }
}

export function setMuted(m: boolean) {
  muted = m;
}

function ready(): boolean {
  return !!ctx && !!master && ctx.state === 'running' && !muted;
}

function takeVoice(): boolean {
  if (voices >= MAX_VOICES) return false;
  voices++;
  return true;
}
function freeVoice(after: number) {
  setTimeout(() => {
    voices = Math.max(0, voices - 1);
  }, after);
}

// pressing a bubble IN — short bright "pop": a fast rising-then-snapping blip
// plus a tiny noise click. pitch varies a little per cell.
export function playPopIn(pitch = 1) {
  if (!ready() || !takeVoice()) return;
  const c = ctx!;
  const t = c.currentTime;

  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(380 * pitch, t);
  o.frequency.exponentialRampToValueAtTime(900 * pitch, t + 0.018);
  o.frequency.exponentialRampToValueAtTime(520 * pitch, t + 0.08);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.34, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g);
  g.connect(master!);
  o.start(t);
  o.stop(t + 0.14);

  // tiny click transient
  const src = c.createBufferSource();
  src.buffer = noise!;
  const ng = c.createGain();
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1800;
  ng.gain.setValueAtTime(0.18, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  src.connect(hp);
  hp.connect(ng);
  ng.connect(master!);
  src.start(t);
  src.stop(t + 0.05);

  freeVoice(150);
}

// un-pressing a bubble (popping back OUT) — softer, lower, hollower
export function playPopOut(pitch = 1) {
  if (!ready() || !takeVoice()) return;
  const c = ctx!;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(300 * pitch, t);
  o.frequency.exponentialRampToValueAtTime(150 * pitch, t + 0.1);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g);
  g.connect(master!);
  o.start(t);
  o.stop(t + 0.18);
  freeVoice(180);
}

// publish chime — a bright two-note arpeggio swell
export function playPost() {
  if (!ready()) return;
  const c = ctx!;
  const t0 = c.currentTime;
  const notes = [660, 880, 1175];
  notes.forEach((f, i) => {
    const t = t0 + i * 0.07;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g);
    g.connect(master!);
    o.start(t);
    o.stop(t + 0.32);
  });
}
