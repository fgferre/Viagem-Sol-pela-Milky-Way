import { describe, expect, it } from 'vitest';
import {
  CinematicSoundtrack,
  SOUND_ACTS,
  SOUNDTRACK_DURATION,
  somMutadoNaUrl,
  soundtrackFrameAt,
} from './soundtrack';

const numericEntries = (t: number) =>
  Object.entries(soundtrackFrameAt(t)).filter((entry): entry is [string, number] =>
    typeof entry[1] === 'number'
  );

const energy = (t: number) => {
  const f = soundtrackFrameAt(t);
  return f.subGain + f.bodyGain + f.pulseGain + f.windGain + f.dustGain
    + 2 * f.shimmerGain + 2 * f.gravityGain;
};

describe('roteiro sonoro procedural', () => {
  it('usa os mesmos 321 s e quatro atos contíguos do filme', () => {
    expect(SOUNDTRACK_DURATION).toBe(321);
    expect(SOUND_ACTS).toEqual([
      { id: 'casa', label: 'CASA', start: 0, end: 48 },
      { id: 'orion', label: 'ÓRION', start: 48, end: 116 },
      { id: 'mergulho', label: 'O MERGULHO', start: 116, end: 229 },
      { id: 'revelacao', label: 'A REVELAÇÃO', start: 229, end: 321 },
    ]);
    expect(soundtrackFrameAt(47.999).act).toBe('casa');
    expect(soundtrackFrameAt(48).act).toBe('orion');
    expect(soundtrackFrameAt(116).act).toBe('mergulho');
    expect(soundtrackFrameAt(229).act).toBe('revelacao');
  });

  it('não corta o sinal nas três fronteiras entre atos', () => {
    for (const t of [48, 116, 229]) {
      const before = Object.fromEntries(numericEntries(t - 0.001));
      const after = Object.fromEntries(numericEntries(t + 0.001));
      for (const key of Object.keys(before)) {
        const scale = key.toLowerCase().includes('frequency') || key.includes('Cutoff') ? 0.08 : 0.001;
        expect(Math.abs(before[key] - after[key]), `${key} em t=${t}`).toBeLessThan(scale);
      }
    }
  });

  it('é finita, audível e fica abaixo do orçamento antes do compressor', () => {
    for (let i = 0; i <= SOUNDTRACK_DURATION * 10; i++) {
      const t = i / 10;
      const frame = soundtrackFrameAt(t);
      for (const [key, value] of numericEntries(t)) {
        expect(Number.isFinite(value), `${key} em t=${t}`).toBe(true);
        expect(value, `${key} em t=${t}`).toBeGreaterThanOrEqual(0);
      }
      expect(frame.master).toBeLessThanOrEqual(1);
      expect(energy(t), `energia em t=${t}`).toBeLessThan(0.55);
    }
    for (const t of [24, 82, 172, 275]) {
      expect(soundtrackFrameAt(t).master).toBeGreaterThan(0.7);
      expect(energy(t)).toBeGreaterThan(0.09);
    }
  });

  it('abre e fecha em silêncio, sem estalo nos extremos', () => {
    expect(soundtrackFrameAt(0).master).toBe(0);
    expect(soundtrackFrameAt(0.01).master).toBeLessThan(0.001);
    expect(soundtrackFrameAt(320.99).master).toBeLessThan(0.001);
    expect(soundtrackFrameAt(321).master).toBe(0);
  });

  it('dá identidades distintas a Órion, ao centro e à revelação', () => {
    const orion = soundtrackFrameAt(84);
    const centro = soundtrackFrameAt(209);
    const fora = soundtrackFrameAt(289);
    expect(orion.shimmerGain).toBeGreaterThan(orion.gravityGain);
    expect(centro.gravityGain).toBeGreaterThan(orion.gravityGain * 10);
    expect(centro.subFrequency).toBeLessThan(orion.subFrequency);
    expect(fora.shimmerGain).toBeGreaterThan(centro.shimmerGain * 10);
    expect(fora.gravityGain).toBeLessThan(centro.gravityGain / 10);
  });
});

describe('gesto e mute', () => {
  it('somente ?mute=1 nasce mudo', () => {
    expect(somMutadoNaUrl('?mute=1')).toBe(true);
    expect(somMutadoNaUrl('?q=cinema&mute=1&t=40')).toBe(true);
    expect(somMutadoNaUrl('?mute=0')).toBe(false);
    expect(somMutadoNaUrl('?mute=true')).toBe(false);
    expect(somMutadoNaUrl('')).toBe(false);
  });

  it('construir a trilha não cria AudioContext nem inicia reprodução', () => {
    const soundtrack = new CinematicSoundtrack();
    expect(soundtrack.snapshot.started).toBe(false);
    expect(soundtrack.snapshot.contextState).toBe('uninitialized');
    expect(soundtrack.snapshot.masterTarget).toBe(0);
    soundtrack.dispose();
  });

  it('a trilha muda e busca por tempo mesmo antes de ganhar um contexto', () => {
    const soundtrack = new CinematicSoundtrack();
    soundtrack.update(209, true);
    expect(soundtrack.snapshot.started).toBe(false);
    expect(soundtrack.snapshot.active).toBe(true);
    expect(soundtrack.snapshot.frame.act).toBe('mergulho');
    expect(soundtrack.snapshot.masterTarget).toBeGreaterThan(0.9);
    soundtrack.update(289, false);
    expect(soundtrack.snapshot.frame.act).toBe('revelacao');
    expect(soundtrack.snapshot.masterTarget).toBe(0);
  });
});
