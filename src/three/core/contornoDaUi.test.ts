// Serve: chão — a posição do halo, o N lido do transform e o envelope de tempo são número puro, e o runner (node) prova os três sem WebGL
// ============================================================
// O HALO DE CONTORNO (C6, protótipo B) — SÓ A MATEMÁTICA PURA. A cena,
// a câmera e o material do `ContornoDaUi` pedem `THREE.WebGLRenderer`
// para valer alguma coisa (nem para CONSTRUIR: `THREE.Scene`/
// `THREE.OrthographicCamera`/`THREE.ShaderMaterial` não tocam GPU
// sozinhos), mas `desenhar()` só faz sentido com um renderer de
// verdade — o mesmo corte de `post.test.ts` ("a varredura de texto é o
// idioma da casa para o que não roda sem GPU"). O que fica isolado em
// funções soltas — a posição X pelo progresso da animação, o N do
// primeiro quadro-chave, o envelope de tempo — é exatamente o que este
// arquivo prova.
// ============================================================
import { describe, expect, it } from 'vitest';
import {
  DURACAO_DO_HALO_MS,
  SUBIDA_DO_HALO_MS,
  deslocamentoInicialDoTransform,
  efeitoTerminou,
  envelopeDoTempo,
  posicaoXDoHalo,
} from './contornoDaUi';

describe('1. posicaoXDoHalo — o painel entra da direita, o halo o acompanha', () => {
  it('progress 0: o halo está onde o painel PARTE (repouso + N)', () => {
    expect(posicaoXDoHalo(100, 300, 0)).toBe(400);
  });

  it('progress 1: o halo está no REPOUSO — nenhum deslocamento sobra', () => {
    expect(posicaoXDoHalo(100, 300, 1)).toBe(100);
  });

  it('progress 0,5: a meio caminho entre os dois', () => {
    expect(posicaoXDoHalo(100, 300, 0.5)).toBe(250);
  });

  it('N = 0 (painel sem deslocamento inicial): o halo nunca sai do repouso', () => {
    expect(posicaoXDoHalo(100, 0, 0)).toBe(100);
    expect(posicaoXDoHalo(100, 0, 0.5)).toBe(100);
  });
});

describe('2. deslocamentoInicialDoTransform — o N do primeiro quadro-chave', () => {
  it('lê o número de "translateX(Npx)" (foraDaTelaMesa, movimentoDaGaveta.ts)', () => {
    expect(deslocamentoInicialDoTransform('translateX(342px)')).toBe(342);
  });

  it('aceita fração e sinal negativo', () => {
    expect(deslocamentoInicialDoTransform('translateX(-12.5px)')).toBe(-12.5);
  });

  it('o repouso ("translate(0px, 0px)") dá 0 — o primeiro número do texto', () => {
    expect(deslocamentoInicialDoTransform('translate(0px, 0px)')).toBe(0);
  });

  it('transform ausente, vazio ou sem número dá 0 — sem inventar salto', () => {
    expect(deslocamentoInicialDoTransform('')).toBe(0);
    expect(deslocamentoInicialDoTransform('none')).toBe(0);
  });
});

describe('3. envelopeDoTempo — sobe em 60 ms, some aos 400 ms (seção 7: "duração máxima 400 ms")', () => {
  it('antes do disparo (≤ 0 ms) é 0', () => {
    expect(envelopeDoTempo(0)).toBe(0);
    expect(envelopeDoTempo(-5)).toBe(0);
  });

  it('sobe LINEAR até o pico em SUBIDA_DO_HALO_MS', () => {
    expect(envelopeDoTempo(SUBIDA_DO_HALO_MS / 2)).toBeCloseTo(0.5);
    expect(envelopeDoTempo(SUBIDA_DO_HALO_MS)).toBeCloseTo(1);
  });

  it('desce LINEAR depois do pico, a meio caminho da descida vale metade', () => {
    const meio = SUBIDA_DO_HALO_MS + (DURACAO_DO_HALO_MS - SUBIDA_DO_HALO_MS) / 2;
    expect(envelopeDoTempo(meio)).toBeCloseTo(0.5);
  });

  it('em DURACAO_DO_HALO_MS e depois é 0 — já era para ter sumido', () => {
    expect(envelopeDoTempo(DURACAO_DO_HALO_MS)).toBe(0);
    expect(envelopeDoTempo(DURACAO_DO_HALO_MS + 50)).toBe(0);
  });
});

describe('4. efeitoTerminou — quando `desenhar` para de desenhar sozinho', () => {
  it('ainda não, um instante antes do teto', () => {
    expect(efeitoTerminou(DURACAO_DO_HALO_MS - 1)).toBe(false);
  });

  it('no teto, e depois dele, já terminou', () => {
    expect(efeitoTerminou(DURACAO_DO_HALO_MS)).toBe(true);
    expect(efeitoTerminou(DURACAO_DO_HALO_MS + 1)).toBe(true);
  });
});
