// ============================================================
// A TRILHA DO FILME — sonificação procedural, não “som no espaço”.
//
// Uma malha contínua de osciladores e ruído filtrado atravessa os quatro
// atos. Não há arquivo para carregar, corte por plano nem relógio paralelo:
// o mesmo `journeyT` que move a câmera escolhe timbre, pulso e intensidade.
// O AudioContext só nasce dentro de um gesto explícito do visitante.
// ============================================================

export const SOUNDTRACK_DURATION = 321;

export const SOUND_ACTS = [
  { id: 'casa', label: 'CASA', start: 0, end: 48 },
  { id: 'orion', label: 'ÓRION', start: 48, end: 116 },
  { id: 'mergulho', label: 'O MERGULHO', start: 116, end: 229 },
  { id: 'revelacao', label: 'A REVELAÇÃO', start: 229, end: SOUNDTRACK_DURATION },
] as const;

export type SoundActId = (typeof SOUND_ACTS)[number]['id'];

interface Cue {
  t: number;
  master: number;
  subFrequency: number;
  subGain: number;
  bodyRatio: number;
  bodyGain: number;
  pulseGain: number;
  pulseHz: number;
  windGain: number;
  windCutoff: number;
  dustGain: number;
  dustFrequency: number;
  shimmerGain: number;
  shimmerFrequency: number;
  gravityGain: number;
  gravityFrequency: number;
}

// Pontos de dramaturgia, não planos. A interpolação é contínua inclusive
// nas fronteiras 48/116/229: mudar de ato troca a leitura, não corta o som.
const CUES: readonly Cue[] = [
  { t: 0, master: 0, subFrequency: 42, subGain: 0.09, bodyRatio: 1.5, bodyGain: 0.018, pulseGain: 0.012, pulseHz: 0.075, windGain: 0.008, windCutoff: 420, dustGain: 0, dustFrequency: 900, shimmerGain: 0, shimmerFrequency: 210, gravityGain: 0, gravityFrequency: 31 },
  { t: 6, master: 0.78, subFrequency: 43, subGain: 0.12, bodyRatio: 1.5, bodyGain: 0.025, pulseGain: 0.018, pulseHz: 0.08, windGain: 0.014, windCutoff: 520, dustGain: 0, dustFrequency: 900, shimmerGain: 0.002, shimmerFrequency: 220, gravityGain: 0, gravityFrequency: 31 },
  { t: 24, master: 0.88, subFrequency: 48, subGain: 0.105, bodyRatio: 1.5, bodyGain: 0.032, pulseGain: 0.022, pulseHz: 0.09, windGain: 0.026, windCutoff: 760, dustGain: 0.004, dustFrequency: 1050, shimmerGain: 0.008, shimmerFrequency: 238, gravityGain: 0, gravityFrequency: 31 },
  { t: 48, master: 0.86, subFrequency: 52, subGain: 0.08, bodyRatio: 1.498, bodyGain: 0.034, pulseGain: 0.016, pulseHz: 0.07, windGain: 0.02, windCutoff: 980, dustGain: 0.006, dustFrequency: 1250, shimmerGain: 0.028, shimmerFrequency: 262, gravityGain: 0, gravityFrequency: 31 },
  { t: 84, master: 0.9, subFrequency: 55, subGain: 0.07, bodyRatio: 1.502, bodyGain: 0.04, pulseGain: 0.019, pulseHz: 0.065, windGain: 0.017, windCutoff: 1250, dustGain: 0.008, dustFrequency: 1480, shimmerGain: 0.045, shimmerFrequency: 294, gravityGain: 0, gravityFrequency: 31 },
  { t: 116, master: 0.88, subFrequency: 47, subGain: 0.095, bodyRatio: 1.49, bodyGain: 0.032, pulseGain: 0.026, pulseHz: 0.09, windGain: 0.026, windCutoff: 1050, dustGain: 0.022, dustFrequency: 1150, shimmerGain: 0.022, shimmerFrequency: 276, gravityGain: 0.004, gravityFrequency: 34 },
  { t: 139, master: 0.94, subFrequency: 41, subGain: 0.13, bodyRatio: 1.47, bodyGain: 0.036, pulseGain: 0.052, pulseHz: 0.12, windGain: 0.043, windCutoff: 920, dustGain: 0.05, dustFrequency: 920, shimmerGain: 0.012, shimmerFrequency: 248, gravityGain: 0.012, gravityFrequency: 33 },
  { t: 191, master: 0.96, subFrequency: 35, subGain: 0.145, bodyRatio: 1.43, bodyGain: 0.042, pulseGain: 0.062, pulseHz: 0.145, windGain: 0.055, windCutoff: 760, dustGain: 0.068, dustFrequency: 720, shimmerGain: 0.006, shimmerFrequency: 228, gravityGain: 0.045, gravityFrequency: 31 },
  { t: 209, master: 0.98, subFrequency: 30, subGain: 0.15, bodyRatio: 1.4, bodyGain: 0.038, pulseGain: 0.072, pulseHz: 0.17, windGain: 0.065, windCutoff: 640, dustGain: 0.074, dustFrequency: 610, shimmerGain: 0.004, shimmerFrequency: 214, gravityGain: 0.07, gravityFrequency: 28 },
  { t: 229, master: 0.92, subFrequency: 34, subGain: 0.125, bodyRatio: 1.46, bodyGain: 0.033, pulseGain: 0.038, pulseHz: 0.105, windGain: 0.04, windCutoff: 820, dustGain: 0.036, dustFrequency: 780, shimmerGain: 0.025, shimmerFrequency: 244, gravityGain: 0.055, gravityFrequency: 30 },
  { t: 257, master: 0.88, subFrequency: 40, subGain: 0.09, bodyRatio: 1.5, bodyGain: 0.03, pulseGain: 0.018, pulseHz: 0.07, windGain: 0.024, windCutoff: 1080, dustGain: 0.016, dustFrequency: 1020, shimmerGain: 0.048, shimmerFrequency: 276, gravityGain: 0.018, gravityFrequency: 32 },
  { t: 289, master: 0.9, subFrequency: 46, subGain: 0.08, bodyRatio: 1.502, bodyGain: 0.032, pulseGain: 0.012, pulseHz: 0.055, windGain: 0.018, windCutoff: 1320, dustGain: 0.008, dustFrequency: 1250, shimmerGain: 0.065, shimmerFrequency: 318, gravityGain: 0.006, gravityFrequency: 34 },
  { t: 318, master: 0.76, subFrequency: 50, subGain: 0.07, bodyRatio: 1.5, bodyGain: 0.026, pulseGain: 0.006, pulseHz: 0.045, windGain: 0.01, windCutoff: 1500, dustGain: 0.002, dustFrequency: 1400, shimmerGain: 0.052, shimmerFrequency: 342, gravityGain: 0, gravityFrequency: 34 },
  { t: SOUNDTRACK_DURATION, master: 0, subFrequency: 50, subGain: 0.05, bodyRatio: 1.5, bodyGain: 0.016, pulseGain: 0, pulseHz: 0.04, windGain: 0, windCutoff: 1500, dustGain: 0, dustFrequency: 1400, shimmerGain: 0, shimmerFrequency: 342, gravityGain: 0, gravityFrequency: 34 },
];

export interface SoundtrackFrame {
  act: SoundActId;
  master: number;
  subFrequency: number;
  subGain: number;
  bodyFrequency: number;
  bodyGain: number;
  pulseGain: number;
  windGain: number;
  windCutoff: number;
  dustGain: number;
  dustFrequency: number;
  shimmerGain: number;
  shimmerFrequency: number;
  gravityGain: number;
  gravityFrequency: number;
}

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const smooth = (v: number) => v * v * (3 - 2 * v);

function actAt(t: number): SoundActId {
  const time = clamp(t, 0, SOUNDTRACK_DURATION);
  return SOUND_ACTS.find((act) => time >= act.start && time < act.end)?.id ?? 'revelacao';
}

function cueAt(t: number): Cue {
  const time = clamp(t, 0, SOUNDTRACK_DURATION);
  let next = 1;
  while (next < CUES.length && time > CUES[next].t) next++;
  const b = CUES[Math.min(next, CUES.length - 1)];
  const a = CUES[Math.max(0, next - 1)];
  if (a === b) return { ...a };
  const k = smooth((time - a.t) / (b.t - a.t));
  const out = { t: time } as Cue;
  for (const key of Object.keys(a) as (keyof Cue)[]) {
    if (key === 't') continue;
    out[key] = a[key] + (b[key] - a[key]) * k;
  }
  return out;
}

/** O quadro sonoro puro: teste, seek e runtime leem exatamente esta função. */
export function soundtrackFrameAt(t: number): SoundtrackFrame {
  const time = clamp(t, 0, SOUNDTRACK_DURATION);
  const cue = cueAt(time);
  const wave = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 * cue.pulseHz);
  const pulse = cue.pulseGain * (0.18 + 0.82 * wave * wave);
  return {
    act: actAt(time),
    master: cue.master,
    subFrequency: cue.subFrequency,
    subGain: cue.subGain,
    bodyFrequency: cue.subFrequency * cue.bodyRatio,
    bodyGain: cue.bodyGain,
    pulseGain: pulse,
    windGain: cue.windGain,
    windCutoff: cue.windCutoff,
    dustGain: cue.dustGain,
    dustFrequency: cue.dustFrequency,
    shimmerGain: cue.shimmerGain,
    shimmerFrequency: cue.shimmerFrequency,
    gravityGain: cue.gravityGain,
    gravityFrequency: cue.gravityFrequency,
  };
}

/** `?mute=1` é a única escrita que nasce muda; `?mute=0` não é mudo. */
export function somMutadoNaUrl(search: string): boolean {
  return new URLSearchParams(search).get('mute') === '1';
}

type ContextState = AudioContextState | 'uninitialized' | 'unsupported';

export interface SoundtrackSnapshot {
  started: boolean;
  muted: boolean;
  contextState: ContextState;
  active: boolean;
  time: number;
  masterTarget: number;
  frame: SoundtrackFrame;
}

interface ToneLayer {
  oscillator: OscillatorNode;
  gain: GainNode;
}

interface NoiseLayer {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

interface SoundNodes {
  master: GainNode;
  sub: ToneLayer;
  body: ToneLayer;
  pulse: ToneLayer;
  shimmerLeft: ToneLayer;
  shimmerRight: ToneLayer;
  gravityLeft: ToneLayer;
  gravityRight: ToneLayer;
  wind: NoiseLayer;
  dust: NoiseLayer;
}

function deterministicNoise(context: AudioContext, seconds: number, seed: number) {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate);
  const data = buffer.getChannelData(0);
  let state = seed | 0;
  for (let i = 0; i < data.length; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    data[i] = ((state >>> 0) / 2147483648 - 1) * 0.72;
  }
  return buffer;
}

/**
 * Runtime Web Audio. Construir esta classe é silencioso; `start()` é a única
 * porta que cria/resume o contexto e deve ser chamada dentro do gesto.
 */
export class CinematicSoundtrack {
  private context: AudioContext | null = null;
  private nodes: SoundNodes | null = null;
  private sources: AudioScheduledSourceNode[] = [];
  private muted: boolean;
  private unsupported = false;
  private active = false;
  private time = 0;
  private masterTarget = 0;

  constructor({ muted = false }: { muted?: boolean } = {}) {
    this.muted = muted;
  }

  start(): boolean {
    if (this.muted || this.unsupported) return false;
    try {
      if (!this.context) this.mount();
      if (!this.context) return false;
      if (this.context.state === 'suspended') void this.context.resume();
      this.update(this.time, this.active);
      return true;
    } catch (error) {
      this.unsupported = true;
      console.warn('[som] Web Audio indisponível; o filme segue silencioso.', error);
      return false;
    }
  }

  setMuted(muted: boolean): boolean {
    this.muted = muted;
    if (!muted) this.start();
    this.update(this.time, this.active);
    return this.muted;
  }

  toggleMuted(): boolean {
    return this.setMuted(!this.muted);
  }

  update(t: number, active: boolean) {
    this.time = clamp(t, 0, SOUNDTRACK_DURATION);
    this.active = active;
    const frame = soundtrackFrameAt(this.time);
    const nodes = this.nodes;
    const context = this.context;
    this.masterTarget = !this.muted && active ? frame.master : 0;
    if (!nodes || !context) return;
    const now = context.currentTime;
    const target = (param: AudioParam, value: number, tau = 0.08) => {
      param.cancelScheduledValues(now);
      param.setTargetAtTime(value, now, tau);
    };

    target(nodes.master.gain, this.masterTarget, active ? 0.1 : 0.24);
    target(nodes.sub.oscillator.frequency, frame.subFrequency);
    target(nodes.sub.gain.gain, frame.subGain);
    target(nodes.body.oscillator.frequency, frame.bodyFrequency);
    target(nodes.body.gain.gain, frame.bodyGain);
    target(nodes.pulse.oscillator.frequency, frame.subFrequency * 0.5);
    target(nodes.pulse.gain.gain, frame.pulseGain, 0.045);
    target(nodes.shimmerLeft.oscillator.frequency, frame.shimmerFrequency);
    target(nodes.shimmerRight.oscillator.frequency, frame.shimmerFrequency * 1.503);
    target(nodes.shimmerLeft.gain.gain, frame.shimmerGain);
    target(nodes.shimmerRight.gain.gain, frame.shimmerGain * 0.78);
    target(nodes.gravityLeft.oscillator.frequency, frame.gravityFrequency);
    target(nodes.gravityRight.oscillator.frequency, frame.gravityFrequency * 1.017);
    target(nodes.gravityLeft.gain.gain, frame.gravityGain);
    target(nodes.gravityRight.gain.gain, frame.gravityGain * 0.92);
    target(nodes.wind.filter.frequency, frame.windCutoff);
    target(nodes.wind.gain.gain, frame.windGain);
    target(nodes.dust.filter.frequency, frame.dustFrequency);
    target(nodes.dust.gain.gain, frame.dustGain);
  }

  get snapshot(): SoundtrackSnapshot {
    return {
      started: this.context !== null,
      muted: this.muted,
      contextState: this.unsupported
        ? 'unsupported'
        : this.context?.state ?? 'uninitialized',
      active: this.active,
      time: this.time,
      masterTarget: this.masterTarget,
      frame: soundtrackFrameAt(this.time),
    };
  }

  dispose() {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        /* já parado */
      }
    }
    this.sources = [];
    this.nodes = null;
    const context = this.context;
    this.context = null;
    if (context && context.state !== 'closed') void context.close();
  }

  private mount() {
    if (typeof AudioContext === 'undefined') {
      this.unsupported = true;
      return;
    }
    const context = new AudioContext({ latencyHint: 'playback' });
    // Se um nó opcional falhar depois daqui, `dispose()` ainda encontra e
    // fecha o contexto parcial; áudio nunca pode vazar uma sessão zumbi.
    this.context = context;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 14;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.045;
    compressor.release.value = 0.65;
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(compressor).connect(context.destination);

    const tone = (
      type: OscillatorType,
      frequency: number,
      pan: number
    ): ToneLayer => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const panner = context.createStereoPanner();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.value = 0;
      panner.pan.value = pan;
      oscillator.connect(gain).connect(panner).connect(master);
      oscillator.start();
      this.sources.push(oscillator);
      return { oscillator, gain };
    };

    const noise = (
      seconds: number,
      seed: number,
      type: BiquadFilterType,
      pan: number
    ): NoiseLayer => {
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      const panner = context.createStereoPanner();
      source.buffer = deterministicNoise(context, seconds, seed);
      source.loop = true;
      filter.type = type;
      filter.Q.value = type === 'bandpass' ? 1.2 : 0.45;
      gain.gain.value = 0;
      panner.pan.value = pan;
      source.connect(filter).connect(gain).connect(panner).connect(master);
      source.start();
      this.sources.push(source);
      return { source, filter, gain };
    };

    this.nodes = {
      master,
      sub: tone('sine', 42, 0),
      body: tone('triangle', 63, -0.12),
      pulse: tone('sine', 21, 0.08),
      shimmerLeft: tone('sine', 210, -0.62),
      shimmerRight: tone('sine', 315.63, 0.62),
      gravityLeft: tone('sine', 31, -0.22),
      gravityRight: tone('sine', 31.527, 0.22),
      wind: noise(5.7, 0x51a3f19, 'lowpass', -0.28),
      dust: noise(7.3, 0x2c19e57, 'bandpass', 0.31),
    };
  }
}
