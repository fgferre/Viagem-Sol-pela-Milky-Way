// Serve: lei — o canal aFocus escreve idempotente e a troca de qualidade nunca recria a geometria (D8)
// ============================================================
// Oráculo do campo de catálogo (Onda 3, fase 3; podado no M2 da
// LEI-DA-ESTRELA).
//
// O que se testa aqui é o CONTRATO DE ESCRITA do canal por estrela que
// SOBROU — `aFocus`, o canal dormente do item 38 (o irmão `aFade`
// morreu no M2 com a política de dominância) — e o invariante da casa
// que ele não pode quebrar (D8: nenhuma camada estelar responde a troca
// de qualidade, então o buffer NUNCA é recriado zerado no meio de uma
// rampa, que é a cicatriz 2 do doador).
//
// Instancia o `StarField` de verdade: o construtor só monta
// `BufferGeometry` + `ShaderMaterial` + `Points`, e nada disso pede
// contexto GL — o GL só entra no render, que este teste não faz.
// ============================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { StarField, UPDATE_RANGE_CAP } from './stars';
import type { StarArrays } from '../config';
import { FOCUS_OFF, FOCUS_ON } from './lodStellar';

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

describe('o canal dormente nasce instalado e NEUTRO (D3 + item 38)', () => {
  it('existe na geometria, um float por estrela, zerado', () => {
    const f = campo(5);
    const a = atributo(f, 'aFocus');
    expect(a.itemSize).toBe(1);
    expect(a.count).toBe(5);
    expect(Array.from(a.array)).toEqual([0, 0, 0, 0, 0]);
    expect(f.focusAt(3)).toBe(FOCUS_OFF);
    f.dispose();
  });

  it('aFade NÃO existe mais na geometria (morreu no M2 com a dominância)', () => {
    const f = campo();
    expect(f.points.geometry.getAttribute('aFade')).toBeUndefined();
    f.dispose();
  });

  it('não viaja no payload: é buffer de runtime, não campo do sc1', () => {
    // `StarArrays` (config.ts) tem três campos e não pode ganhar este —
    // foco é estado de tela, não dado de catálogo.
    const config = readFileSync(new URL('../config.ts', import.meta.url), 'utf8');
    const arrays = config.slice(
      config.indexOf('export interface StarArrays'),
      config.indexOf('export interface StarArrays') + 300
    );
    expect(arrays).not.toContain('focus');
    expect(arrays).not.toContain('fade');
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
    const a = atributo(f, 'aFocus');
    const v0 = a.version;
    expect(f.writeFocus(2, FOCUS_ON)).toBe(true);
    expect(f.focusAt(2)).toBe(FOCUS_ON);
    expect(a.version).toBeGreaterThan(v0);
    f.dispose();
  });

  it('reafirmar o MESMO valor 1.000× não escreve nem uma vez', () => {
    const f = campo();
    const a = atributo(f, 'aFocus');
    f.writeFocus(1, FOCUS_ON);
    const versao = a.version;
    let escritas = 0;
    for (let i = 0; i < 1000; i++) if (f.writeFocus(1, FOCUS_ON)) escritas++;
    expect(escritas).toBe(0);
    expect(a.version).toBe(versao); // a GPU não recebe upload nenhum
    f.dispose();
  });

  it('a faixa de upload é do SLOT, não do buffer inteiro', () => {
    const f = campo(10);
    const a = atributo(f, 'aFocus');
    a.clearUpdateRanges();
    f.writeFocus(7, FOCUS_ON);
    expect(a.updateRanges).toEqual([{ start: 7, count: 1 }]);
    f.dispose();
  });

  it('float64 do consumidor × float32 do buffer: reafirmar continua no-op', () => {
    // o valor que um consumidor futuro calcula é float64 e não cabe em
    // float32. Se a decisão de escrever comparasse os dois direto, TODO
    // quadro acharia que mudou — 60 uploads por segundo pelo mesmo pixel.
    const f = campo();
    const a = atributo(f, 'aFocus');
    const calculado = 0.22690123456789; // uma rampa real de consumidor
    expect(Math.fround(calculado)).not.toBe(calculado); // não cabe
    f.writeFocus(0, calculado);
    const versao = a.version;
    for (let i = 0; i < 100; i++) expect(f.writeFocus(0, calculado)).toBe(false);
    expect(a.version).toBe(versao);
    expect(f.focusAt(0)).toBe(Math.fround(calculado));
    f.dispose();
  });

  it('índice fora da faixa é ignorado (não estoura, não escreve)', () => {
    const f = campo(3);
    expect(f.writeFocus(-1, 1)).toBe(false);
    expect(f.writeFocus(3, 1)).toBe(false);
    expect(f.writeFocus(99, 1)).toBe(false);
    expect(Array.from(atributo(f, 'aFocus').array)).toEqual([0, 0, 0]);
    f.dispose();
  });
});

describe('as faixas de upload não vazam (consertos da revisão, fase 4b)', () => {
  // O achado: `addUpdateRange` só é CONSUMIDO dentro do `updateBuffer` do
  // three, e o renderer pula objetos invisíveis. Com o campo escondido
  // (`?nocat`, ou o toggle "Catálogo HYG" do painel) a reafirmação por
  // quadro continua rodando e ninguém limpa nada — as faixas cresceriam
  // sem teto.
  it('mil escritas sem NENHUM upload não passam do teto de faixas', () => {
    const f = campo(10);
    const a = atributo(f, 'aFocus');
    // valores sempre novos: cada escrita é real (a idempotência não ajuda)
    for (let k = 0; k < 1000; k++) f.writeFocus(k % 10, (k + 1) / 2000);
    expect(a.updateRanges.length).toBeLessThanOrEqual(UPDATE_RANGE_CAP);
    // e os VALORES estão todos lá: o que se perde é a lista de faixas, o
    // dado não — a próxima subida é do buffer inteiro, que é correta
    expect(f.focusAt(9)).toBe(Math.fround(1000 / 2000));
    expect(a.needsUpdate === false || a.version > 0).toBe(true);
    f.dispose();
  });

  it('depois do teto o modo é UPLOAD CHEIO: nenhuma faixa nova é acumulada', () => {
    const f = campo(10);
    const a = atributo(f, 'aFocus');
    for (let k = 0; k < 200; k++) f.writeFocus(k % 10, (k + 1) / 1000);
    const depoisDoTeto = a.updateRanges.length;
    f.writeFocus(3, 0.987654);
    expect(a.updateRanges.length).toBe(depoisDoTeto);
    f.dispose();
  });

  it('reset() + escrita no MESMO quadro preserva o upload cheio', () => {
    // sem o latch, o `addUpdateRange` da escrita devolveria o atributo ao
    // modo parcial e a GPU subiria só aquele slot — os outros ficariam
    // com o valor PRÉ-reset (o buffer inteiro nunca sobe)
    const f = campo(6);
    const a = atributo(f, 'aFocus');
    f.writeFocus(0, 0.5);
    f.reset();
    expect(f.writeFocus(3, 0.4)).toBe(true);
    expect(a.updateRanges).toEqual([]);
    expect(f.focusAt(3)).toBe(Math.fround(0.4));
    expect(f.focusAt(0)).toBe(FOCUS_OFF);
    f.dispose();
  });

  it('o latch baixa quando a GPU de fato recebe o buffer (onUpload)', () => {
    // o único sinal honesto de "subiu" é o callback que o three dispara no
    // fim de createBuffer/updateBuffer; simulá-lo aqui é o que o render faria
    const f = campo(6);
    const a = atributo(f, 'aFocus');
    f.reset();
    f.writeFocus(1, 0.2);
    expect(a.updateRanges).toEqual([]); // latch alto
    a.onUploadCallback();
    f.writeFocus(2, 0.3);
    expect(a.updateRanges).toEqual([{ start: 2, count: 1 }]); // voltou ao parcial
    f.dispose();
  });
});

describe('C3 — reset de foco e volta ao estado de nascimento', () => {
  it('clearFocus zera o canal da estrela (nada fica com bypass pendurado)', () => {
    const f = campo();
    f.writeFocus(2, FOCUS_ON);
    f.clearFocus(2);
    expect(f.focusAt(2)).toBe(FOCUS_OFF);
    f.dispose();
  });

  it('reset devolve o campo INTEIRO ao neutro', () => {
    const f = campo(4);
    f.writeFocus(1, FOCUS_ON);
    f.writeFocus(3, FOCUS_ON);
    f.reset();
    expect(Array.from(atributo(f, 'aFocus').array)).toEqual([0, 0, 0, 0]);
    // e o upload volta a ser do buffer inteiro (faixas limpas)
    expect(atributo(f, 'aFocus').updateRanges).toEqual([]);
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
    for (const proibido of ['this.stars', 'this.clarao', 'this.wrappedStars', 'this.sun']) {
      expect(bloco).not.toContain(proibido);
    }
  });

  it('o ciclo de vida do campo não recria buffer: os valores SOBREVIVEM', () => {
    const f = campo();
    const geo = f.points.geometry;
    const foco = atributo(f, 'aFocus');
    f.writeFocus(1, 0.6);
    // tudo o que o director chama por quadro
    f.update(new THREE.Vector3(1, 2, 3), 1440);
    f.setFade(0.5);
    f.setCavity(new THREE.Vector3(), 0.3);
    f.update(new THREE.Vector3(9, 9, 9), 2160);
    expect(f.points.geometry).toBe(geo); // mesma geometria
    expect(atributo(f, 'aFocus')).toBe(foco); // mesmo buffer
    expect(f.focusAt(1)).toBeCloseTo(0.6, 6); // mesmo valor
    f.dispose();
  });
});
