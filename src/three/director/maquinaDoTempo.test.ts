// Serve: chão — na borda da tabela o relógio ASSENTA: o ⏵ contra a parede não pisca, e andar de volta continua livre
// ============================================================
// A PAREDE DO TEMPO (item 115). A tabela embarcada cobre 1950–2050;
// quem caminha até o fim para EM CIMA da borda, com o aviso na tela.
// Apertar ⏵ ali publicava um quadro de mentira — `andarNoTempo`
// limpava `naParede` sem olhar o sentido, então o HUD apagava o aviso e
// trocava o botão para ⏸; no quadro seguinte `andarORelogio` grampeava,
// repunha a parede e devolvia o ⏵. Toda vez, mais um `perturbar` por
// aperto (que reinicia a contagem de estabilidade da captura).
//
// A BANCADA MEDE O QUE O VISITANTE VÊ: a lista do que foi PUBLICADO ao
// React. Pisca é publicação — se nada é publicado, nada na tela mudou.
// ============================================================
import { describe, expect, it, vi } from 'vitest';
import { MaquinaDoTempo } from './maquinaDoTempo';
import { DEGRAUS_DE_TEMPO, JANELA_EFEMERIDES } from '../tempoDoAtlas';
import type { EstadoDoTempo } from '../tempoDoAtlas';

function bancada(jdPedido: number) {
  const publicados: EstadoDoTempo[] = [];
  const contas = { perturbou: 0 };
  const maquina = new MaquinaDoTempo({
    onTempo: (e) => publicados.push(e),
    perturbar: () => {
      contas.perturbou += 1;
    },
    aoChegarFonte: () => {},
    signal: () => new AbortController().signal,
    disposed: () => false,
  });
  // a fonte já chegou: `garantirEfemerides` retorna na primeira linha e
  // a bancada não toca a rede
  maquina.faseDaEfemeride = 'viva';
  maquina.efemeride = {} as never;
  maquina.jdPedido = jdPedido;
  // o estado de partida vira o "último publicado", para a lista contar
  // só o que ESTE teste provocou
  maquina.publicarTempo();
  publicados.length = 0;
  contas.perturbou = 0;
  return { maquina, publicados, contas };
}

describe('a parede do tempo — o relógio assenta em vez de piscar', () => {
  it('no FIM da tabela, apertar ⏵ não muda um pixel do mostrador', () => {
    const { maquina, publicados, contas } = bancada(JANELA_EFEMERIDES.jdFim);
    maquina.naParede = true;
    maquina.publicarTempo();
    publicados.length = 0;

    maquina.andarNoTempo(1);
    for (let i = 0; i < 60; i++) maquina.andarORelogio(1 / 60);

    // sem o conserto esta lista tem DUAS entradas: a do aperto (aviso
    // vazio, sentido 1 — o ⏵ vira ⏸) e a do grampo no quadro seguinte
    // (aviso de volta, sentido 0). É exatamente o pisca-pisca.
    expect(publicados).toEqual([]);
    expect(maquina.tempo.sentido).toBe(0);
    expect(maquina.tempo.aviso).toBe('limite');
    // ...e o aperto impossível não reinicia a estabilidade da captura
    expect(contas.perturbou).toBe(0);
  });

  it('no INÍCIO da tabela, apertar ⏴ também assenta', () => {
    const { maquina, publicados } = bancada(JANELA_EFEMERIDES.jdInicio);
    maquina.naParede = true;
    maquina.publicarTempo();
    publicados.length = 0;

    maquina.andarNoTempo(-1);
    for (let i = 0; i < 60; i++) maquina.andarORelogio(1 / 60);

    expect(publicados).toEqual([]);
    expect(maquina.tempo.sentido).toBe(0);
    expect(maquina.tempo.aviso).toBe('limite');
  });

  it('da parede do FIM, voltar continua livre — a guarda é do sentido, não da borda', () => {
    const { maquina } = bancada(JANELA_EFEMERIDES.jdFim);
    maquina.naParede = true;

    maquina.andarNoTempo(-1);
    expect(maquina.tempo.sentido).toBe(-1);
    expect(maquina.tempo.aviso).toBe('');
    maquina.andarORelogio(1 / 60);
    expect(maquina.jdPedido).toBeLessThan(JANELA_EFEMERIDES.jdFim);
  });

  it('longe das bordas o ⏵ é o de sempre — anda, perturba e publica', () => {
    const meio = (JANELA_EFEMERIDES.jdInicio + JANELA_EFEMERIDES.jdFim) / 2;
    const { maquina, publicados, contas } = bancada(meio);

    maquina.andarNoTempo(1);
    expect(maquina.tempo.sentido).toBe(1);
    expect(maquina.tempo.aviso).toBe('');
    expect(contas.perturbou).toBe(1);
    expect(publicados.length).toBe(1);
    maquina.andarORelogio(1 / 60);
    expect(maquina.jdPedido).toBeGreaterThan(meio);
  });

  it('a guarda é só do sentido que ANDA — o ⏸ segue o caminho de sempre', () => {
    // a fronteira da guarda, registrada: `sentido === 0` não é pedido
    // contra parede nenhuma, então o ⏸ continua caindo no caminho
    // comum, que limpa `naParede`. Comportamento HERDADO, e é o único
    // aperto que ainda apaga o aviso estando em cima da borda; a obra
    // do pisca não o toca porque o ⏸ não pisca — apaga uma vez e fica.
    const { maquina } = bancada(JANELA_EFEMERIDES.jdFim);
    maquina.naParede = true;
    maquina.andarNoTempo(0);
    expect(maquina.tempo.sentido).toBe(0);
    expect(maquina.naParede).toBe(false);
  });
});

describe('os gestos do relógio do Atlas (20/11) — a semântica mora na máquina', () => {
  const meio = (JANELA_EFEMERIDES.jdInicio + JANELA_EFEMERIDES.jdFim) / 2;

  it('a régua escolhe o degrau direto, sem dar a volta na escada', () => {
    const { maquina, publicados } = bancada(meio);
    expect(maquina.escolherDegrau(5)).toBe(5);
    expect(maquina.escolherDegrau(2)).toBe(2);
    expect(maquina.escolherDegrau(99)).toBe(DEGRAUS_DE_TEMPO - 1);
    expect(publicados.map((e) => e.degrau)).toEqual([5, 2, DEGRAUS_DE_TEMPO - 1]);
    expect(maquina.tempo.sentido).toBe(0);
  });

  it('▶/⏸ lembra o último sentido — e a lembrança sobrevive à folha do telefone fechar e abrir', () => {
    const { maquina } = bancada(meio);
    maquina.andarNoTempo(-1);
    maquina.tocarOuPausar();
    expect(maquina.tempo.sentido).toBe(0);
    // a folha desmonta e remonta o relógio: nada nele guarda o sentido,
    // é a máquina (que não desmonta) quem responde ao próximo ▶
    maquina.tocarOuPausar();
    expect(maquina.tempo.sentido).toBe(-1);
  });

  it('pausar a partir do ao vivo vai ao degrau 0 e para', () => {
    const { maquina } = bancada(meio);
    maquina.escolherDegrau(4);
    maquina.voltarAoPresente();
    maquina.tocarOuPausar();
    expect(maquina.tempo).toMatchObject({ aoVivo: false, sentido: 0, degrau: 0 });
    maquina.tocarOuPausar();
    expect(maquina.tempo.sentido).toBe(1);
  });

  it('voltar à época a partir do ao vivo vai ao degrau 0 (M2)', () => {
    const { maquina } = bancada(meio);
    maquina.escolherDegrau(5);
    maquina.voltarAoPresente();
    maquina.voltarAEpoca();
    // sem o caminho único o degrau 5 escondido pelo ao vivo reaparecia
    expect(maquina.tempo).toMatchObject({ aoVivo: false, sentido: 0, degrau: 0 });
  });

  it('a régua a partir do ao vivo fica no degrau escolhido, numa publicação só (M2)', () => {
    const { maquina, publicados } = bancada(meio);
    maquina.voltarAoPresente();
    publicados.length = 0;
    maquina.escolherDegrau(5);
    // UMA publicação, já no degrau 5 — nada de um quadro em 1× antes
    expect(publicados.map((e) => [e.aoVivo, e.degrau])).toEqual([[false, 5]]);
  });

  it('ao vivo, um degrau acima do real sai andando para a frente; um sentido parte do degrau 0', () => {
    const { maquina } = bancada(meio);
    maquina.voltarAoPresente();
    maquina.escolherDegrau(0);
    expect(maquina.tempo.aoVivo).toBe(true);
    maquina.escolherDegrau(5);
    expect(maquina.tempo).toMatchObject({ aoVivo: false, sentido: 1, degrau: 5 });

    maquina.voltarAoPresente();
    maquina.escolherSentido(-1);
    expect(maquina.tempo).toMatchObject({ aoVivo: false, sentido: -1, degrau: 0 });
  });

  it('o mostrador publica no máximo 4 vezes por segundo, mesmo com os segundos correndo', () => {
    const { maquina, publicados } = bancada(meio);
    maquina.escolherDegrau(2); // 100 s/s: o segundo escrito muda a cada quadro
    maquina.andarNoTempo(1);
    publicados.length = 0;
    for (let i = 0; i < 60; i++) maquina.andarORelogio(1 / 60);
    expect(publicados.length).toBeGreaterThanOrEqual(3);
    expect(publicados.length).toBeLessThanOrEqual(4);
  });
});

describe('os saltos da data — o que a vista dos anéis usa para recomeçar em vez de ser levada pela órbita', () => {
  it('o relógio correndo não salta; ligar o AO VIVO longe de hoje e escrever a data saltam', () => {
    const { maquina } = bancada(JANELA_EFEMERIDES.jdFim - 3000);
    const antes = maquina.saltos;
    maquina.andarNoTempo(1);
    for (let i = 0; i < 60; i++) maquina.andarORelogio(1 / 60);
    expect(maquina.saltos).toBe(antes);
    // o primeiro tick do AO VIVO traz o calendário de hoje: salto; os de 1 Hz depois, não
    maquina.alternarAoVivo();
    maquina.andarORelogio(1 / 60);
    expect(maquina.saltos).toBe(antes + 1);
    for (let i = 0; i < 180; i++) maquina.andarORelogio(1 / 60);
    expect(maquina.saltos).toBe(antes + 1);
    // o telefone a 8 quadros por segundo: o tick sai a cada ~2,5 s de verdade, e continua não sendo salto
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      for (let i = 0; i < 40; i++) {
        vi.advanceTimersByTime(125);
        maquina.andarORelogio(0.05);
      }
    } finally {
      vi.useRealTimers();
    }
    expect(maquina.saltos).toBe(antes + 1);
    maquina.jdPedido = JANELA_EFEMERIDES.jdFim - 10;
    expect(maquina.saltos).toBe(antes + 2);
  });
});
