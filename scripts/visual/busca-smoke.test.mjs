// Serve: chão — o smoke da busca reprova o cartão errado, Sgr A✱ fora do buraco de perto e a temperatura mal lida
// As contas PURAS do smoke da busca, sem subir Chrome: qual cartão é o do
// destino, a faixa de chegada do cartão de Sgr A✱ e a temperatura da ficha.
//
// Cada uma com o CONTROLE NEGATIVO do jeito em que já falhou: o clique pela
// posição que caía na Via Láctea (`bea3760e`), as distâncias de antes do
// `1d5291d5` (a galáxia inteira a 6 kpc, o bojo a ~29 pc) e o número com
// separador de milhar que a régua antiga recusava.
import { describe, it, expect } from 'vitest';
import {
  FAIXA_DO_BURACO_PC,
  distanciaDoBuracoOk,
  indiceDoCartao,
  temperaturaEmK,
} from './busca-smoke.mjs';

describe('indiceDoCartao', () => {
  const aba = ['via-lactea', 'nosso-lugar', 'pleiades', 'sagittarius-a'].map(
    (id) => `./previas/${id}.webp`
  );

  it('acha o cartão de Sgr A✱ pelo id, e NÃO o primeiro da aba (a Via Láctea)', () => {
    expect(indiceDoCartao(aba, 'sagittarius-a')).toBe(3);
    expect(indiceDoCartao(aba, 'sagittarius-a')).not.toBe(0);
  });

  it('destino sem cartão na aba é −1 (o juiz reprova), e id parecido não casa', () => {
    expect(indiceDoCartao(aba, 'andromeda')).toBe(-1);
    expect(indiceDoCartao(aba, 'lactea')).toBe(-1);
  });
});

describe('distanciaDoBuracoOk', () => {
  const RS = FAIXA_DO_BURACO_PC[0] / 6;

  it('o pouso medido do degrau de perto (23,96 RS) passa', () => {
    expect(distanciaDoBuracoOk(23.96 * RS)).toBe(true);
  });

  it('as chegadas de antes REPROVAM: a galáxia inteira a 6 kpc e o bojo a ~29 pc', () => {
    expect(distanciaDoBuracoOk(6000)).toBe(false);
    expect(distanciaDoBuracoOk(29)).toBe(false);
  });

  it('fora do degrau REPROVA dos dois lados, e sem leitura também', () => {
    expect(distanciaDoBuracoOk(25 * RS)).toBe(false);
    expect(distanciaDoBuracoOk(5 * RS)).toBe(false);
    expect(distanciaDoBuracoOk(null)).toBe(false);
  });
});

describe('temperaturaEmK', () => {
  it('aceita o milhar das duas línguas', () => {
    expect(temperaturaEmK('9.850 K')).toBe(true);
    expect(temperaturaEmK('9,850 K')).toBe(true);
    expect(temperaturaEmK('850 K')).toBe(true);
  });

  it('recusa separador misturado, número sem unidade e milhar sem separador', () => {
    expect(temperaturaEmK('1.234,567 K')).toBe(false);
    expect(temperaturaEmK('9.850')).toBe(false);
    expect(temperaturaEmK('9850 K')).toBe(false);
  });
});
