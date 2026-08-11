// ============================================================
// Oráculo do campo de catálogo (Onda 3, fase 3).
//
// O que se testa aqui é o CONTRATO DE ESCRITA dos dois canais por
// estrela — `aFade` e `aFocus` — e o invariante da casa que eles não
// podem quebrar (D8: nenhuma camada estelar responde a troca de
// qualidade, então o buffer NUNCA é recriado zerado no meio de um fade,
// que é a cicatriz 2 do doador).
//
// Instancia o `StarField` de verdade: o construtor só monta
// `BufferGeometry` + `ShaderMaterial` + `Points`, e nada disso pede
// contexto GL — o GL só entra no render, que este teste não faz.
// ============================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { StarField } from './stars';
import type { StarArrays } from '../config';
import { FADE_NEUTRAL, FOCUS_OFF, FOCUS_ON } from './lodStellar';

/** um catálogo mínimo — 5 estrelas, o suficiente para o contrato */
function campo(n = 5): StarField {
  const data: StarArrays = {
    position: new Float32Array(n * 3),
    logLum: new Float32Array(n).fill(1),
    ci: new Float32Array(n).fill(0.6),
  };
  for (let i = 0; i < n; i++) data.position[i * 3 + 2] = 10 + i;
  return new StarField(data);
}

const atributo = (f: StarField, nome: string) =>
  f.points.geometry.getAttribute(nome) as THREE.BufferAttribute;

describe('os dois canais nascem instalados e NEUTROS (D3)', () => {
  it('existem na geometria, um float por estrela, zerados', () => {
    const f = campo(5);
    for (const nome of ['aFade', 'aFocus']) {
      const a = atributo(f, nome);
      expect(a.itemSize).toBe(1);
      expect(a.count).toBe(5);
      expect(Array.from(a.array)).toEqual([0, 0, 0, 0, 0]);
    }
    expect(f.fadeAt(3)).toBe(FADE_NEUTRAL);
    expect(f.focusAt(3)).toBe(FOCUS_OFF);
    f.dispose();
  });

  it('não viajam no payload: são buffers de runtime, não campos do sc1', () => {
    // `StarArrays` (config.ts) tem três campos e não pode ganhar estes
    // dois — fade e foco são estado de tela, não dado de catálogo.
    const config = readFileSync(new URL('../config.ts', import.meta.url), 'utf8');
    const arrays = config.slice(
      config.indexOf('export interface StarArrays'),
      config.indexOf('export interface StarArrays') + 300
    );
    expect(arrays).not.toContain('aFade');
    expect(arrays).not.toContain('fade');
    expect(arrays).not.toContain('focus');
  });

  it('a PSF do campo é publicada para quem precisa prevê-la em JS', () => {
    const f = campo();
    expect(f.expoM0).toBe(3.5);
    expect(f.sigmaPx).toBe(0.85);
    expect(f.material.uniforms.uExpoM0.value).toBe(f.expoM0);
    expect(f.material.uniforms.uSigmaPx.value).toBe(f.sigmaPx);
    const g = new StarField(
      { position: new Float32Array(3), logLum: new Float32Array(1), ci: new Float32Array(1) },
      { expoM0: 2, sigmaPx: 1.5 }
    );
    expect(g.expoM0).toBe(2);
    expect(g.material.uniforms.uExpoM0.value).toBe(2);
    f.dispose();
    g.dispose();
  });
});

describe('C2 — a escrita é idempotente e o dirty-flag só sobe quando muda', () => {
  it('escrever valor NOVO grava e levanta needsUpdate', () => {
    const f = campo();
    const a = atributo(f, 'aFade');
    const v0 = a.version;
    expect(f.writeFade(2, 0.4)).toBe(true);
    expect(f.fadeAt(2)).toBeCloseTo(0.4, 6);
    expect(a.version).toBeGreaterThan(v0);
    f.dispose();
  });

  it('reafirmar o MESMO valor 1.000× não escreve nem uma vez', () => {
    const f = campo();
    const a = atributo(f, 'aFade');
    f.writeFade(1, 0.25);
    const versao = a.version;
    let escritas = 0;
    for (let i = 0; i < 1000; i++) if (f.writeFade(1, 0.25)) escritas++;
    expect(escritas).toBe(0);
    expect(a.version).toBe(versao); // a GPU não recebe upload nenhum
    f.dispose();
  });

  it('a faixa de upload é do SLOT, não do buffer inteiro', () => {
    const f = campo(10);
    const a = atributo(f, 'aFade');
    a.clearUpdateRanges();
    f.writeFade(7, 0.9);
    expect(a.updateRanges).toEqual([{ start: 7, count: 1 }]);
    f.dispose();
  });

  it('float64 do consumidor × float32 do buffer: reafirmar continua no-op', () => {
    // o valor que a política calcula é float64 e não cabe em float32.
    // Se a decisão de escrever comparasse os dois direto, TODO quadro
    // acharia que mudou — com a câmera parada, 60 uploads por segundo
    // para gravar o mesmo pixel.
    const f = campo();
    const a = atributo(f, 'aFade');
    const calculado = 0.22690123456789; // um fade real da política
    expect(Math.fround(calculado)).not.toBe(calculado); // não cabe
    f.writeFade(0, calculado);
    const versao = a.version;
    for (let i = 0; i < 100; i++) expect(f.writeFade(0, calculado)).toBe(false);
    expect(a.version).toBe(versao);
    expect(f.fadeAt(0)).toBe(Math.fround(calculado));
    f.dispose();
  });

  it('índice fora da faixa é ignorado (não estoura, não escreve)', () => {
    const f = campo(3);
    expect(f.writeFade(-1, 1)).toBe(false);
    expect(f.writeFade(3, 1)).toBe(false);
    expect(f.writeFocus(99, 1)).toBe(false);
    expect(Array.from(atributo(f, 'aFade').array)).toEqual([0, 0, 0]);
    f.dispose();
  });

  it('os dois canais são independentes: escrever fade não mexe no foco', () => {
    const f = campo();
    const foco = atributo(f, 'aFocus');
    const v = foco.version;
    f.writeFade(0, 1);
    expect(foco.version).toBe(v);
    expect(f.focusAt(0)).toBe(FOCUS_OFF);
    f.dispose();
  });
});

describe('C3 — reset de foco e volta ao estado de nascimento', () => {
  it('clearFocus zera os DOIS canais da estrela (nada fica meio-apagado)', () => {
    const f = campo();
    f.writeFade(2, 0.8);
    f.writeFocus(2, FOCUS_ON);
    f.clearFocus(2);
    expect(f.fadeAt(2)).toBe(FADE_NEUTRAL);
    expect(f.focusAt(2)).toBe(FOCUS_OFF);
    f.dispose();
  });

  it('reset devolve o campo INTEIRO ao neutro', () => {
    const f = campo(4);
    f.writeFade(0, 0.3);
    f.writeFade(3, 1);
    f.writeFocus(1, FOCUS_ON);
    f.reset();
    expect(Array.from(atributo(f, 'aFade').array)).toEqual([0, 0, 0, 0]);
    expect(Array.from(atributo(f, 'aFocus').array)).toEqual([0, 0, 0, 0]);
    // e o upload volta a ser do buffer inteiro (faixas limpas)
    expect(atributo(f, 'aFade').updateRanges).toEqual([]);
    f.dispose();
  });
});

describe('D8 — o invariante da casa: qualidade não recria geometria', () => {
  it('o StarField não tem COMO responder a troca de qualidade', () => {
    // não recebe Engine nem quality no construtor, e não expõe
    // setQuality: estruturalmente não pode se inscrever em onQuality
    const src = readFileSync(new URL('./stars.ts', import.meta.url), 'utf8');
    expect(src).toContain('constructor(data: StarArrays, opts: StarFieldOptions = {})');
    expect(src).not.toContain('setQuality');
    expect(src).not.toContain('onQuality(');
    expect(src).not.toContain('QualityLevel');
    const f = campo();
    expect('setQuality' in f).toBe(false);
    f.dispose();
  });

  it('o callback de qualidade do director não toca estrelas nem Sol', () => {
    const director = readFileSync(new URL('../director.ts', import.meta.url), 'utf8');
    const i = director.indexOf('this.engine.onQuality(');
    expect(i).toBeGreaterThan(0);
    const bloco = director.slice(i, director.indexOf('});', i));
    for (const proibido of ['this.stars', 'this.heroes', 'this.wrappedStars', 'this.sun']) {
      expect(bloco).not.toContain(proibido);
    }
  });

  it('o ciclo de vida do campo não recria buffer: os valores SOBREVIVEM', () => {
    const f = campo();
    const geo = f.points.geometry;
    const fade = atributo(f, 'aFade');
    f.writeFade(1, 0.6);
    // tudo o que o director chama por quadro
    f.update(new THREE.Vector3(1, 2, 3), 1440);
    f.setFade(0.5);
    f.setCavity(new THREE.Vector3(), 0.3);
    f.update(new THREE.Vector3(9, 9, 9), 2160);
    expect(f.points.geometry).toBe(geo); // mesma geometria
    expect(atributo(f, 'aFade')).toBe(fade); // mesmo buffer
    expect(f.fadeAt(1)).toBeCloseTo(0.6, 6); // mesmo valor
    f.dispose();
  });
});
