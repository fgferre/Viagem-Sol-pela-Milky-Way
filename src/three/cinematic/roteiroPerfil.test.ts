// Serve: dono — a frente é a visão principal e nenhum trecho do roteiro fica parado por 4 s ou mais
// A LEI DO DONO, EXECUTÁVEL — e a mesa de despejo do perfil.
//
// Duas leis ditas em 19/08, reprovando o corte antigo:
//   1. "a frente é a visão principal" — em travessia, olhar ≈ rumo;
//      lado e traseira são acentos, não o normal;
//   2. "tempo sem atividade" não existe — encurta, acelera ou ganha
//      evento.
// Prosa não segura lei (seis quedas medidas); este arquivo é a
// versão que segura. Os NÚMEROS dos limites moram nas provas; o
// CRITÉRIO de instante morto/de lado mora no `roteiroPerfil.ts`, um
// lugar só para perfil, lei e despejo lerem a mesma régua.
//
// PERFIL_DUMP=1 despeja o perfil inteiro em TSV (PERFIL_SAIDA ou
// stdout) — é assim que se olham os tempos e movimentos do corte sem
// tatear filme: foi o pedido literal do dono ("vc pode entender o
// codigo para marcar tempos e movimentos").
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// mesmo stub e mesma razão do vizinho cameraRig.test.ts: journey.ts
// puxa world/galaxy.ts, que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { perfilDoRoteiro, trechosMortos, trechosDeLadoEmFrente } = await import('./roteiroPerfil');
const { auditarRoteiro } = await import('./journey');

const amostras = perfilDoRoteiro(0.25);
const auditoria = auditarRoteiro();

describe('a lei do dono no roteiro', () => {
  it('tempo sem atividade: nenhum trecho morto de 4 s ou mais', () => {
    const mortos = trechosMortos(amostras, 4);
    expect(
      mortos.map((m) => `t=${m.t0.toFixed(1)}–${m.t1.toFixed(1)} (${m.dur.toFixed(1)}s)`)
    ).toEqual([]);
  });

  it('a frente é a visão principal: nenhum voo de lado de 4 s ou mais fora de assunto/traseira declarados', () => {
    const deLado = trechosDeLadoEmFrente(amostras, auditoria.shots, 4);
    expect(
      deLado.map((m) => `t=${m.t0.toFixed(1)}–${m.t1.toFixed(1)} (${m.dur.toFixed(1)}s)`)
    ).toEqual([]);
  });

  it('acento traseiro é curto: todo plano declarado "tras" dura no máximo 9 s', () => {
    const longos = auditoria.shots.filter((s) => s.lingua === 'tras' && s.dur > 9);
    expect(longos).toEqual([]);
  });
});

describe.runIf(process.env.PERFIL_DUMP === '1')('despejo do perfil', () => {
  it('escreve o TSV', () => {
    const linhas = [
      't\tvel_pc_s\tang_olhar_voo\taprox_frac_s\tfluxo_lat_gs\tgiro_gs\tzoom_gs\tdist_mira_pc\tfov\tlegenda',
      ...amostras.map((a) => [
        a.t.toFixed(2),
        a.velocidade.toExponential(3),
        a.anguloOlharVoo.toFixed(1),
        a.aproximacao.toFixed(4),
        a.fluxoLateral.toFixed(2),
        a.giroDoOlhar.toFixed(2),
        a.zoom.toFixed(2),
        a.distanciaDaMira.toExponential(3),
        a.fov.toFixed(1),
        a.legenda,
      ].join('\t')),
    ].join('\n');
    const saida = process.env.PERFIL_SAIDA;
    if (saida) writeFileSync(saida, linhas + '\n');
    else process.stdout.write(linhas + '\n');
    expect(amostras.length).toBeGreaterThan(0);
  });
});
