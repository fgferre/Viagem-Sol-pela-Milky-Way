// O laboratório da galáxia (Ajustes, 13/11/2026): a porta de URL de cada
// controle vai e volta, "Voltar ao padrão" apaga todas, e a regra de quem
// fica desligado depende do caminho que desenha (e, para as filhas, do teto).
import { describe, expect, it } from 'vitest';
import {
  CONTROLES_DO_LABORATORIO,
  LABORATORIO_PADRAO,
  escreverLaboratorio,
  laboratorioMexido,
  lerLaboratorio,
  motivoDoBloqueio,
  opcoesWebgpu,
  padraoDoControle,
  presoAoTeto,
} from './laboratorioDaGalaxia';

describe('laboratório da galáxia', () => {
  it('cada valor do menu de cada controle vai à URL e volta igual; os outros controles ficam fora dela', () => {
    for (const c of CONTROLES_DO_LABORATORIO) {
      for (const v of c.valores) {
        const q = new URLSearchParams('t=148&q=cinema');
        escreverLaboratorio(q, { ...LABORATORIO_PADRAO, [c.id]: v });
        expect([...q.keys()].sort()).toEqual([c.id, 'q', 't'].sort());
        expect(lerLaboratorio(q)).toEqual({ ...LABORATORIO_PADRAO, [c.id]: v });
      }
    }
  });

  it('o padrão escreve nada, e zerar apaga todas as portas sem tocar nas outras', () => {
    const q = new URLSearchParams('t=148');
    escreverLaboratorio(q, LABORATORIO_PADRAO);
    expect(q.toString()).toBe('t=148');
    const cheia = new URLSearchParams('t=148&filhas=4&borrifo=1&lodrho=24&sorteios=4&lodmax=5');
    expect(laboratorioMexido(lerLaboratorio(cheia))).toBe(true);
    escreverLaboratorio(cheia, LABORATORIO_PADRAO);
    expect(cheia.toString()).toBe('t=148');
    expect(laboratorioMexido(lerLaboratorio(cheia))).toBe(false);
  });

  it('porta fora da lei (texto, fora da faixa, fração onde só vale inteiro) fica no padrão; a bancada fora do menu vale', () => {
    const lab = lerLaboratorio(new URLSearchParams('filhas=abc&borrifo=2&fatia=2.5&lodrho=0&lodmax=3'));
    expect(lab).toEqual({ ...LABORATORIO_PADRAO, lodmax: 3 });
  });

  it('no padrão, o motor WebGPU recebe as opções de antes e os padrões do tier são os do orçamento', () => {
    expect(opcoesWebgpu(LABORATORIO_PADRAO)).toEqual({ k: 1, borrifo: 0, filtro: 1, lod: 12, fatia: 4 });
    expect(padraoDoControle('sorteios', 'cinema')).toBe(2);
    expect(padraoDoControle('sorteios', 'performance')).toBe(1);
    expect(padraoDoControle('lodmax', 'alta')).toBe(1);
    for (const c of CONTROLES_DO_LABORATORIO) {
      for (const tier of ['cinema', 'alta', 'performance'] as const) {
        expect(c.valores, `${c.id}: o padrão de ${tier} tem botão`).toContain(padraoDoControle(c.id, tier));
      }
    }
  });

  it('desligado por caminho: a clássica desliga tudo; o WebGL desliga só os do motor WebGPU', () => {
    for (const c of CONTROLES_DO_LABORATORIO) {
      expect(motivoDoBloqueio(c.id, 'classica')).toBe('classica');
      expect(motivoDoBloqueio(c.id, 'webgpu')).toBe(null);
      expect(motivoDoBloqueio(c.id, 'particulas')).toBe(c.motor === 'webgpu' ? 'semWebgpu' : null);
    }
  });

  it('presos ao teto: Filhas no máximo e Alcance só acendem com o teto acima do do tier, e a escolha fica guardada', () => {
    const presos = ['lodk', 'lodesp'];
    for (const tier of ['cinema', 'alta', 'performance'] as const) {
      const teto = padraoDoControle('lodmax', tier);
      for (const c of CONTROLES_DO_LABORATORIO) {
        if (c.id === 'lodmax') continue;
        const escolhido = { ...LABORATORIO_PADRAO, [c.id]: c.valores[0] };
        expect(presoAoTeto(c.id, escolhido, tier)).toBe(presos.includes(c.id));
        expect(presoAoTeto(c.id, { ...escolhido, lodmax: teto }, tier)).toBe(presos.includes(c.id));
        expect(presoAoTeto(c.id, { ...escolhido, lodmax: 5 }, tier)).toBe(false);
      }
    }
    const q = new URLSearchParams();
    escreverLaboratorio(q, { ...LABORATORIO_PADRAO, lodk: 16 });
    expect(q.get('lodk')).toBe('16');
  });
});
