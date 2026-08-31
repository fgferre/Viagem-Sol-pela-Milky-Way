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
import { describe, expect, it } from 'vitest';
import { MaquinaDoTempo } from './maquinaDoTempo';
import { AVISO_FORA_DA_JANELA, JANELA_EFEMERIDES } from '../tempoDoAtlas';
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
    expect(maquina.tempo.aviso).toBe(AVISO_FORA_DA_JANELA);
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
    expect(maquina.tempo.aviso).toBe(AVISO_FORA_DA_JANELA);
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
