// Serve: chão — a posição do halo, o N lido do transform e o envelope de tempo são número puro; a seção 4 prova o ciclo de vida sem GPU, com um `Post` de mentira
// ============================================================
// O HALO DE CONTORNO (C6, ADOTADO) — SÓ A MATEMÁTICA PURA. O desenho de
// verdade é o `FILM_SHADER` de `Post` (`core/post.ts`), fora do alcance
// deste arquivo (pede `THREE.WebGLRenderer`, o mesmo corte de
// `post.test.ts`). O que fica isolado em funções soltas — a posição X
// pelo progresso da animação, o N do primeiro quadro-chave, o envelope
// de tempo — e o CICLO DE VIDA de `desenhar(post)` (que chama
// `acenderHalo`/`apagarHalo` sem nunca tocar GPU) é exatamente o que
// este arquivo prova.
// ============================================================
import { describe, expect, it, vi } from 'vitest';
import type { ParametrosDoHalo } from './post';
import {
  ContornoDaUi,
  DURACAO_DO_HALO_MS,
  SUBIDA_DO_HALO_MS,
  deslocamentoInicialDoTransform,
  envelopeDoTempo,
  posicaoXDoHalo,
} from './contornoDaUi';
import type { AlvoDoHalo } from './contornoDaUi';

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

describe('4. desenhar(post) — o ciclo de vida com o halo fundido no FILM_SHADER', () => {
  const relogioMutavelFalso = (playState: AnimationPlayState, currentTime = 100) => ({
    playState,
    currentTime,
    cancel: vi.fn(),
  });
  const parametros = (relogio: unknown, progress = 1) => ({
    retangulo: { x: 10, y: 20, width: 300, height: 150 },
    animacao: {
      playState: 'running',
      effect: { getComputedTiming: () => ({ progress }) },
    } as unknown as Animation,
    deslocamentoInicialPx: 0,
    relogio: relogio as Animation,
  });
  const postFalso = (): AlvoDoHalo & {
    acenderHalo: ReturnType<typeof vi.fn>;
    apagarHalo: ReturnType<typeof vi.fn>;
  } => ({ acenderHalo: vi.fn(), apagarHalo: vi.fn() });

  it('em repouso (nunca acendeu) desenhar não toca o post — a exceção que roda sem GPU', () => {
    const contorno = new ContornoDaUi();
    const post = postFalso();
    contorno.desenhar(post);
    contorno.desenhar(post);
    expect(post.acenderHalo).not.toHaveBeenCalled();
    expect(post.apagarHalo).not.toHaveBeenCalled();
  });

  it('aceso: desenhar chama acenderHalo com uHalo (intensidade) > 0 e o retângulo em curso', () => {
    const contorno = new ContornoDaUi();
    contorno.acender(parametros(relogioMutavelFalso('running', 30), 0.5));
    const post = postFalso();
    contorno.desenhar(post);
    expect(post.acenderHalo).toHaveBeenCalledTimes(1);
    const chamada = post.acenderHalo.mock.calls[0][0] as ParametrosDoHalo;
    expect(chamada.intensidade).toBeGreaterThan(0);
    expect(chamada.retangulo).toMatchObject({ x: 10, y: 20, largura: 300, altura: 150 });
    expect(post.apagarHalo).not.toHaveBeenCalled();
  });

  it('o relógio termina (`finished`) sozinho — apaga UMA vez, e os quadros ociosos depois não chamam nada', () => {
    const contorno = new ContornoDaUi();
    const relogio = relogioMutavelFalso('running', 30);
    contorno.acender(parametros(relogio, 0.5));
    const post = postFalso();
    contorno.desenhar(post); // vivo
    expect(post.acenderHalo).toHaveBeenCalledTimes(1);

    relogio.playState = 'finished'; // chegou aos 400 ms (ou "reduzir movimento"/resize o encerrou)
    contorno.desenhar(post); // acabou de terminar
    contorno.desenhar(post); // ocioso — não chama apagarHalo de novo
    expect(post.apagarHalo).toHaveBeenCalledTimes(1);
    expect(post.acenderHalo).toHaveBeenCalledTimes(1); // não voltou a acender
    contorno.dispose();
  });

  it('apagar() explícito (troca/saída de gaveta) também apaga UMA vez, não a cada quadro', () => {
    const contorno = new ContornoDaUi();
    contorno.acender(parametros(relogioMutavelFalso('running', 30), 0.5));
    const post = postFalso();
    contorno.desenhar(post); // vivo
    expect(post.acenderHalo).toHaveBeenCalledTimes(1);

    contorno.apagar();
    contorno.desenhar(post); // acabou de apagar
    contorno.desenhar(post); // ocioso — não chama apagarHalo de novo
    expect(post.apagarHalo).toHaveBeenCalledTimes(1);
  });

  it('apagar e uma abertura nova CANCELAM o relógio anterior — nenhum ouvinte fica de pé', () => {
    const contorno = new ContornoDaUi();
    const a = relogioMutavelFalso('running');
    const b = relogioMutavelFalso('running');
    contorno.acender(parametros(a));
    contorno.acender(parametros(b));
    expect(a.cancel).toHaveBeenCalledTimes(1);
    contorno.apagar();
    expect(b.cancel).toHaveBeenCalledTimes(1);
    contorno.dispose();
  });
});
