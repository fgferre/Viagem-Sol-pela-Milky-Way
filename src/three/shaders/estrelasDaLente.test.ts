// Serve: dono — com a Redonda e a Anamórfica a cruz das estrelas vira a assinatura da lente escolhida, tirada da receita, com a mesma luz
import { describe, expect, it } from 'vitest';
import { presetDaLente, type Raios, type Risco } from '../lente/presets';
import { variacaoDoRaio } from '../lente/passeDaLente';
import {
  ESTRELAS_SEGUEM_A_LENTE,
  PORTA_ESTRELAS_LENTE,
  assinaturaDaLente,
  energiaDoRisco,
  energiaDosRaios,
  estrelasSeguemALente,
  lerPortaEstrelasLente,
  raiosNaEscala,
  riscoNaEscala,
} from './estrelasDaLente';

describe('as estrelas seguem a lente', () => {
  it('a porta ?estrelaslente=: 0 desliga, 1 liga nas três, o resto é o padrão', () => {
    expect(lerPortaEstrelasLente('?estrelaslente=0')).toBe('desligada');
    expect(lerPortaEstrelasLente('?estrelaslente=1')).toBe('todas');
    expect(lerPortaEstrelasLente('?lente=redonda&estrelaslente=1')).toBe('todas');
    for (const lixo of ['', '?estrelaslente=sim', '?estrelaslente', '?estrelaslente=1x', '?estrelaslente=00']) {
      expect(lerPortaEstrelasLente(lixo), lixo).toBe('padrao');
    }
    // a suíte vê o padrão: a assinatura entra nos shaders
    expect(PORTA_ESTRELAS_LENTE).toBe('padrao');
    expect(ESTRELAS_SEGUEM_A_LENTE).toBe(true);
  });

  it('sem porta só a Redonda e a Anamórfica trocam a cruz (a decisão de 09/10); 0 volta, 1 liga a Hollywood', () => {
    const quem = (porta: ReturnType<typeof lerPortaEstrelasLente>) =>
      (['nenhuma', 'redonda', 'anamorfica', 'hollywood'] as const).filter((m) => estrelasSeguemALente(m, porta));
    expect(quem('padrao')).toEqual(['redonda', 'anamorfica']);
    expect(quem('desligada')).toEqual([]);
    expect(quem('todas')).toEqual(['redonda', 'anamorfica', 'hollywood']);
  });

  it('a assinatura sai da receita da lente: número, giro, variação e proporções, com energia 1', () => {
    expect(assinaturaDaLente('nenhuma')).toBeNull();
    for (const nome of ['redonda', 'anamorfica', 'hollywood'] as const) {
      const elementos = presetDaLente(nome).elementos;
      const r = elementos.find((e): e is Raios => e.tipo === 'raios')!;
      const s = elementos.find((e): e is Risco => e.tipo === 'risco');
      const a = assinaturaDaLente(nome)!;
      const raios = a.raios!;
      expect(raios.numero, nome).toBe(r.numero);
      expect(raios.rotacao).toBe(r.rotacao);
      expect(raios.tabela[5]).toEqual(variacaoDoRaio(r, 5));
      expect(raios.largura / raios.comprimento).toBeCloseTo(r.largura / r.comprimento, 12);
      expect(!!a.risco, nome).toBe(!!s);
      // o fino que carrega mais luz alcança a borda do sprite, e nenhum passa dela
      const pontaDosRaios = raios.comprimento * Math.max(...raios.croma);
      expect(Math.max(pontaDosRaios, a.risco?.comprimento ?? 0)).toBeCloseTo(1, 12);
      expect(pontaDosRaios).toBeLessThanOrEqual(1 + 1e-12);
      if (s && a.risco) {
        expect(a.risco.comprimento).toBeLessThanOrEqual(1 + 1e-12);
        expect(a.risco.larguraNucleo / raios.largura).toBeCloseTo(s.larguraNucleo / r.largura, 12);
        // cada fino fica com a sua parte da luz da receita, mesmo encolhido até a borda
        const luzR = energiaDosRaios(raiosNaEscala(r, r.numero, 1));
        const luzS = energiaDoRisco(riscoNaEscala(s, 1));
        expect(energiaDoRisco(a.risco), nome).toBeCloseTo(luzS / (luzR + luzS), 9);
      }
      const energia = energiaDosRaios(raios) + (a.risco ? energiaDoRisco(a.risco) : 0);
      expect(energia, nome).toBeCloseTo(1, 9);
    }
    // a Anamórfica é medida pelo risco (os dois finos na proporção da receita);
    // a Hollywood pelos raios, que levam a luz, com o risco encolhido até a borda
    const an = assinaturaDaLente('anamorfica')!;
    const [ra, sa] = ['raios', 'risco'].map((t) => presetDaLente('anamorfica').elementos.find((e) => e.tipo === t)) as [Raios, Risco];
    expect(an.risco!.comprimento).toBeCloseTo(1, 12);
    expect(an.risco!.comprimento / an.raios!.comprimento).toBeCloseTo(sa.comprimento / ra.comprimento, 9);
    const h = assinaturaDaLente('hollywood')!;
    expect(h.raios!.comprimento * Math.max(...h.raios!.croma)).toBeCloseTo(1, 12);
    expect(h.risco!.comprimento).toBe(1);
  });
});
