// Serve: chão — a posição do halo, o deslocamento lido do transform, o envelope de tempo e o ponto quente são número puro; a seção 5 prova o ciclo de vida sem GPU, com um `Post` de mentira
// ============================================================
// O HALO DE CONTORNO (C6, ADOTADO) — SÓ A MATEMÁTICA PURA. O desenho de
// verdade é o `FILM_SHADER` de `Post` (`core/post.ts`), fora do alcance
// deste arquivo (pede `THREE.WebGLRenderer`, o mesmo corte de
// `post.test.ts`). O que fica isolado em funções soltas — a posição
// pelo progresso da animação (mesa em X, celular em Y), o deslocamento
// do primeiro quadro-chave, o envelope de tempo, o ponto quente na
// borda de frente — e o CICLO DE VIDA de `desenhar(post)` (que chama
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
  pontoQuente,
  posicaoDoHalo,
} from './contornoDaUi';
import type { AlvoDoHalo } from './contornoDaUi';

describe('1. posicaoDoHalo — o painel entra da direita (mesa) ou de baixo (celular), o halo o acompanha', () => {
  it('progress 0: o halo está onde o painel PARTE (repouso + deslocamento), em X', () => {
    expect(posicaoDoHalo({ x: 100, y: 20 }, { x: 300, y: 0 }, 0)).toEqual({ x: 400, y: 20 });
  });

  it('progress 1: o halo está no REPOUSO — nenhum deslocamento sobra, em X', () => {
    expect(posicaoDoHalo({ x: 100, y: 20 }, { x: 300, y: 0 }, 1)).toEqual({ x: 100, y: 20 });
  });

  it('progress 0,5: a meio caminho entre os dois, em X', () => {
    expect(posicaoDoHalo({ x: 100, y: 20 }, { x: 300, y: 0 }, 0.5)).toEqual({ x: 250, y: 20 });
  });

  it('deslocamento {0,0} (painel sem deslocamento inicial): o halo nunca sai do repouso', () => {
    expect(posicaoDoHalo({ x: 100, y: 20 }, { x: 0, y: 0 }, 0)).toEqual({ x: 100, y: 20 });
    expect(posicaoDoHalo({ x: 100, y: 20 }, { x: 0, y: 0 }, 0.5)).toEqual({ x: 100, y: 20 });
  });

  it('a folha do celular sobe de baixo: o mesmo amortecimento, mas em Y', () => {
    expect(posicaoDoHalo({ x: 0, y: 100 }, { x: 0, y: 300 }, 0)).toEqual({ x: 0, y: 400 });
    expect(posicaoDoHalo({ x: 0, y: 100 }, { x: 0, y: 300 }, 0.5)).toEqual({ x: 0, y: 250 });
    expect(posicaoDoHalo({ x: 0, y: 100 }, { x: 0, y: 300 }, 1)).toEqual({ x: 0, y: 100 });
  });
});

describe('2. deslocamentoInicialDoTransform — o deslocamento do primeiro quadro-chave', () => {
  it('lê o número de "translateX(Npx)" (foraDaTelaMesa, movimentoDaGaveta.ts)', () => {
    expect(deslocamentoInicialDoTransform('translateX(342px)')).toEqual({ x: 342, y: 0 });
  });

  it('aceita fração e sinal negativo em translateX', () => {
    expect(deslocamentoInicialDoTransform('translateX(-12.5px)')).toEqual({ x: -12.5, y: 0 });
  });

  it('lê o número de "translateY(Npx)" (foraDaTelaCelular, movimentoDaGaveta.ts)', () => {
    expect(deslocamentoInicialDoTransform('translateY(480px)')).toEqual({ x: 0, y: 480 });
  });

  it('"translate(Apx, Bpx)" cobre os dois eixos de uma vez', () => {
    expect(deslocamentoInicialDoTransform('translate(10px, -20px)')).toEqual({ x: 10, y: -20 });
  });

  it('"translate(Apx)" sozinho equivale a X', () => {
    expect(deslocamentoInicialDoTransform('translate(10px)')).toEqual({ x: 10, y: 0 });
  });

  it('o repouso ("translate(0px, 0px)") dá {0, 0}', () => {
    expect(deslocamentoInicialDoTransform('translate(0px, 0px)')).toEqual({ x: 0, y: 0 });
  });

  it('transform ausente, vazio ou sem número dá {0, 0} — sem inventar salto', () => {
    expect(deslocamentoInicialDoTransform('')).toEqual({ x: 0, y: 0 });
    expect(deslocamentoInicialDoTransform('none')).toEqual({ x: 0, y: 0 });
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

describe('4. pontoQuente — a borda de FRENTE segue o retângulo em curso, com piso de 1 px', () => {
  it('mesa (deslocamento.y = 0): borda ESQUERDA, desce com o progresso, largura 25% da altura', () => {
    const retangulo = { x: 10, y: 20, width: 300, height: 150 };
    const { ponto, largura } = pontoQuente(retangulo, { x: 300, y: 0 }, 0.5, 12);
    expect(ponto).toEqual({ x: 10, y: 20 + 0.5 * 150 });
    expect(largura).toEqual({ x: 12, y: 150 * 0.25 });
  });

  it('sem deslocamento nenhum (o caso de hoje): também borda ESQUERDA', () => {
    const retangulo = { x: 10, y: 20, width: 300, height: 150 };
    expect(pontoQuente(retangulo, { x: 0, y: 0 }, 0, 12).ponto).toEqual({ x: 10, y: 20 });
  });

  it('celular (deslocamento.y > 0, a folha sobe de baixo): borda de CIMA, atravessa esquerda→direita com o progresso, largura 25% da largura', () => {
    const retangulo = { x: 0, y: 40, width: 400, height: 600 };
    const { ponto, largura } = pontoQuente(retangulo, { x: 0, y: 500 }, 0.5, 12);
    expect(ponto).toEqual({ x: 0.5 * 400, y: 40 });
    expect(largura).toEqual({ x: 400 * 0.25, y: 12 });
  });

  it('painel minúsculo: a largura cruzada tem piso de 1 px, nunca zera a gaussiana', () => {
    const minusculo = { x: 0, y: 0, width: 2, height: 2 };
    expect(pontoQuente(minusculo, { x: 0, y: 0 }, 0, 12).largura).toEqual({ x: 12, y: 1 });
    expect(pontoQuente(minusculo, { x: 0, y: 500 }, 0, 12).largura).toEqual({ x: 1, y: 12 });
  });
});

describe('5. desenhar(post) — o ciclo de vida com o halo fundido no FILM_SHADER', () => {
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
    deslocamentoInicial: { x: 0, y: 0 },
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
    // sem deslocamento (deslocamentoInicial {0,0}): o ponto quente já nasce
    // na borda ESQUERDA (mesa) e desce com o `progresso` do relógio (30/400 ms)
    expect(chamada.pontoQuente).toEqual({ x: 10, y: 20 + (30 / 400) * 150 });
    expect(chamada.larguraDoQuente).toEqual({ x: chamada.sigma, y: 150 * 0.25 });
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
