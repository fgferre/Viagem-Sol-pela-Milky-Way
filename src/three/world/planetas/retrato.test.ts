// ============================================================
// Régua 1 da D10, parte "o dado": a cadeia da posição elo a elo, sem
// navegador e sem pixel.
//
//   (a) PROVENIÊNCIA — o retrato congelado é BIT a BIT o que o
//       MotorEfemerides responde lendo a efemerides.bin de disco. Sem
//       isto, `retrato2026.ts` seria só um punhado de números bonitos
//       que ninguém sabe de onde vieram.
//   (b) A ÉPOCA — o literal `EPOCA_JD_TDB` é o que o conversor ÚNICO
//       da casa (`dateToTDB`, regra M6) calcula para `EPOCA_ISO`.
//   (c) ORÁCULO EXTERNO — contra os fixtures NASA/JPL Horizons que a
//       casa já versiona, nos CINCO corpos que têm fixture em
//       2026-01-01. O juiz é externo ao projeto inteiro: nem a teoria
//       (VSOP87D), nem a amostragem, nem a interpolação são dele.
//   (d) ORÇAMENTO — nos quatro sem fixture, o que se pode afirmar é o
//       erro de interpolação MEDIDO que o manifesto carimba. Fica
//       registrado, com a fraqueza dita em voz alta.
//   (e) TEXTO-FONTE — a D1 e o anti-padrão do relógio, guardados no
//       texto do arquivo gerado (molde de lodStellar.test.ts).
//
// O caminho de leitura do .bin é o de `efemerides.test.ts:26-44`.
// ============================================================

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MetaEfemerides } from '../../../lib/atlas/efemerides';
import { decodeEfemerides, MotorEfemerides } from '../../../lib/atlas/efemerides';
import { dateToTDB } from '../../../lib/atlas/time';
import { EPOCA_ISO, EPOCA_JD_TDB, IDS_RETRATO, RETRATO_2026 } from './retrato2026';

const DATA_DIR = fileURLToPath(new URL('../../../../public/data/atlas/', import.meta.url));
const FIXTURES_DIR = fileURLToPath(new URL('../../../test/fixtures/horizons/', import.meta.url));

const meta = JSON.parse(
  readFileSync(join(DATA_DIR, 'efemerides_meta.json'), 'utf8')
) as MetaEfemerides & { sha256: string };
const binNode = readFileSync(join(DATA_DIR, 'efemerides.bin'));
const bufferBin = binNode.buffer.slice(
  binNode.byteOffset,
  binNode.byteOffset + binNode.byteLength
);
const motor = new MotorEfemerides(decodeEfemerides(bufferBin, meta));

interface FixtureHorizons {
  bodyId: string;
  date: string;
  center: string;
  referenceFrame: string;
  position: { x: number; y: number; z: number; unit: string };
}

function lerFixture(id: string): FixtureHorizons {
  return JSON.parse(
    readFileSync(join(FIXTURES_DIR, `${id}-2026-01-01.json`), 'utf8')
  ) as FixtureHorizons;
}

function anguloGraus(a: readonly number[], b: readonly number[]): number {
  const na = Math.hypot(a[0], a[1], a[2]);
  const nb = Math.hypot(b[0], b[1], b[2]);
  const cos = Math.min(1, Math.max(-1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (na * nb)));
  return (Math.acos(cos) * 180) / Math.PI;
}

describe('retrato2026 — proveniência bit-exata contra o MotorEfemerides', () => {
  it('a época congelada É o que o conversor da casa calcula', () => {
    expect(Object.is(dateToTDB(new Date(EPOCA_ISO)), EPOCA_JD_TDB)).toBe(true);
    expect(EPOCA_JD_TDB).toBe(2461041.5008692136);
  });

  it('a época cai DENTRO da janela da tabela, com folga dos dois lados', () => {
    // A borda superior tem uma armadilha de 80 s (dateToTDB('2050-01-01')
    // já está fora); 2026 está a ~24 anos dela.
    expect(EPOCA_JD_TDB).toBeGreaterThan(meta.janela.jdInicio);
    expect(EPOCA_JD_TDB).toBeLessThan(meta.janela.jdFim);
  });

  it('a tabela e a lista de ids são a mesma coisa, nos nove corpos', () => {
    expect(Object.keys(RETRATO_2026)).toEqual([...IDS_RETRATO]);
    expect(IDS_RETRATO).toHaveLength(9);
    // a Lua e os satélites ficaram FORA de propósito (D3)
    expect(IDS_RETRATO).not.toContain('moon');
  });

  for (const id of IDS_RETRATO) {
    it(`${id}: vetor e raio recomputados do .bin batem por Object.is`, () => {
      const p = motor.posicaoHeliocentrica(id, EPOCA_JD_TDB);
      const { vetorUA, rUA } = RETRATO_2026[id];
      expect(Object.is(vetorUA[0], p.x)).toBe(true);
      expect(Object.is(vetorUA[1], p.y)).toBe(true);
      expect(Object.is(vetorUA[2], p.z)).toBe(true);
      expect(Object.is(rUA, Math.hypot(p.x, p.y, p.z))).toBe(true);
    });
  }
});

/**
 * Os CINCO corpos do retrato com fixture Horizons em 2026-01-01. O
 * desenho da onda previa quatro (mercury/earth/mars/neptune); Plutão
 * TAMBÉM tem fixture nessa data (conferido em disco) e entrou — mais
 * oráculo externo é sempre melhor, e Plutão é o corpo com a teoria
 * mais frágil da lista (Pluto-Meeus, não VSOP87D).
 *
 * LIMIARES, com o resíduo MEDIDO nesta máquina ao lado (2026-08-11):
 *
 *   corpo     ângulo medido    distância relativa medida
 *   mercury   1,4941e-4°       1,1081e-6
 *   earth     1,0080e-4°       1,3657e-8
 *   mars      2,7203e-4°       8,7505e-6
 *   neptune   4,1000e-4°       2,0140e-6
 *   pluto     1,5611e-4°       2,9044e-6
 *
 * Os limiares 1e-3° e 2e-5 deixam 2,4× e 2,3× de folga sobre o pior
 * caso medido (neptune e mars). NÃO são folga de gosto: são a mesma
 * ordem dos limiares que `regressao.test.ts` já aplica aos mesmos
 * corpos, e a margem existe porque o resíduo é dominado pela
 * diferença de TEORIA (VSOP87D truncado vs DE441 do Horizons), que
 * varia lentamente com a data — não pelo ruído da interpolação.
 * Afrouxar qualquer um dos dois sem medir de novo é proibido.
 */
describe('retrato2026 — oráculo externo NASA/JPL Horizons (2026-01-01)', () => {
  const COM_FIXTURE = ['mercury', 'earth', 'mars', 'neptune', 'pluto'] as const;
  const LIMIAR_ANGULO_GRAUS = 1e-3;
  const LIMIAR_DISTANCIA_RELATIVA = 2e-5;

  for (const id of COM_FIXTURE) {
    it(`${id}: ângulo ≤ 1e-3° e distância relativa ≤ 2e-5 contra o Horizons`, () => {
      const fx = lerFixture(id);
      // o fixture declara o próprio frame: eclíptica J2000, centro no
      // Sol, UA, sem correção de tempo-luz — a MESMA base do retrato,
      // sem remap de eixo nenhum (adaptação 1 de regressao.test.ts)
      expect(fx.referenceFrame).toBe('J2000_ECLIPTIC');
      expect(fx.center).toBe('500@10');
      expect(fx.position.unit).toBe('AU');
      expect(fx.date).toBe(EPOCA_ISO);

      const alvo = [fx.position.x, fx.position.y, fx.position.z];
      const { vetorUA, rUA } = RETRATO_2026[id];
      const rHorizons = Math.hypot(alvo[0], alvo[1], alvo[2]);

      expect(anguloGraus(vetorUA, alvo)).toBeLessThan(LIMIAR_ANGULO_GRAUS);
      expect(Math.abs(rUA - rHorizons) / rHorizons).toBeLessThan(
        LIMIAR_DISTANCIA_RELATIVA
      );
    });
  }

  it('os quatro sem fixture continuam sem fixture — a pendência é real', () => {
    // Se alguém gerar os fixtures que faltam (pendência declarada da
    // onda: rede + aprovação do dono), este teste acende e o corpo
    // deve MUDAR de bloco: sair do orçamento e entrar no oráculo.
    const semFixture = IDS_RETRATO.filter((id) => !COM_FIXTURE.includes(id as never));
    expect(semFixture).toEqual(['venus', 'jupiter', 'saturn', 'uranus']);
  });
});

/**
 * Os quatro sem oráculo externo. O que se PODE afirmar aqui é bem
 * menos, e o teste diz isso: o manifesto carimba o pior erro de
 * interpolação Hermite medido em 200 instantes de semente fixa sobre a
 * janela INTEIRA de 1950–2050 (`amostra-efemerides.mjs`), não o erro
 * nesta época. Ele cobre a interpolação; NÃO cobre o erro da teoria
 * VSOP87D contra o DE441, que é justamente o que domina o resíduo dos
 * cinco corpos com fixture. Por isso o bloco acima existe.
 */
describe('retrato2026 — orçamento do manifesto nos quatro sem fixture', () => {
  const SEM_FIXTURE = ['venus', 'jupiter', 'saturn', 'uranus'] as const;

  for (const id of SEM_FIXTURE) {
    it(`${id}: erro de interpolação medido cabe no orçamento do corpo`, () => {
      const { erroMedidoAu, orcamentoErroAu } = meta.corpos[id];
      expect(erroMedidoAu).toBeGreaterThan(0);
      expect(erroMedidoAu).toBeLessThan(orcamentoErroAu);

      // o mesmo erro visto como ÂNGULO no céu, na distância do retrato
      // — a unidade em que a régua 2 (pixel) vai cobrar a camada.
      // Medido: venus 1,963e-3°, jupiter 6,74e-6°, saturn 2,88e-6°,
      // uranus 3,03e-6°. Vênus é o pior da tabela por duas ordens de
      // grandeza (passo de 12 d perto do Sol) e o teto de 5e-3° reflete
      // isso; é também o argumento mais forte para o fixture que falta.
      const { rUA } = RETRATO_2026[id];
      const anguloGrausOrcamento = (Math.asin(erroMedidoAu / rUA) * 180) / Math.PI;
      expect(anguloGrausOrcamento).toBeLessThan(5e-3);
    });
  }
});

describe('retrato2026 — texto-fonte (D1 e o anti-padrão do relógio)', () => {
  const fonte = readFileSync(new URL('./retrato2026.ts', import.meta.url), 'utf8');

  it('não passa pela base galactocêntrica, que erra a origem em 0,1134 UA', () => {
    expect(fonte).not.toContain('galactocentricToScene');
    expect(fonte).not.toContain('heliocentricaEclipticaUAParaBaseGalactocentricaPc');
  });

  it('não tem relógio: nem Date.now, nem `new Date(`', () => {
    expect(fonte).not.toContain('Date.now');
    expect(fonte).not.toContain('new Date(');
  });

  it('declara a própria proveniência: sha256 do .bin e comando de regeneração', () => {
    expect(fonte).toContain(meta.sha256);
    expect(fonte).toContain('npm run data:planetas');
    expect(fonte).toContain('gera-retrato-planetas.mjs');
  });
});
