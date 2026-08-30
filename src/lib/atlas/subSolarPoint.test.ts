// Serve: lei — o sub-ponto solar de cada corpo bate com o JPL Horizons, e o relógio implicado por todos os corpos concorda
// ============================================================
// ORÁCULO PORTADO de atlas-orbital/src/lib/subSolarPoint.test.ts —
// onde o Sol está a pino, julgado contra o NASA JPL Horizons.
// Protocolo e LIMIARES VERBATIM do doador; adaptações declaradas.
//
// POR QUE ESTE ARQUIVO EXISTE (herdado): todo outro oráculo responde
// "o corpo está no LUGAR certo?"; nenhum respondia "está VIRADO para o
// lado certo?". O sub-ponto solar é grandeza pura de orientação — só
// se move se o polo, o W₀, o Ẇ ou a escala de tempo estiverem errados
// — e atravessa todas as camadas de uma vez: efemérides, ponte
// eclíptica→equatorial, base do corpo, spin, TDB-vs-UT. O JPL avalia o
// MESMO modelo IAU que a casa embarca, mas da cópia DELE — então isto
// falsifica a transcrição da casa em vez de confirmá-la.
//
// TEMPO-LUZ MODELADO, NUNCA CORRIGIDO EM ÂNGULO (herdado verbatim): o
// Horizons reporta o ponto como era quando a luz PARTIU, então o
// modelo reavalia em t − lightTimeSeconds. A Terra gira 2,08° nos
// ~499 s de luz Sol→Terra — somar esse ângulo "de volta" em vez de
// recuar o instante quebraria todos os corpos rápidos de outro jeito.
//
// DIVERGÊNCIA ΔT DECLARADA — NÃO CONSERTAR RUMO AO JPL (herdado): além
// de ~2027 o Horizons CONGELA ΔT no fim do registro observado; a casa
// extrapola Espenak–Meeus (time.ts). Nenhum dos dois está errado — a
// rotação futura da Terra é fisicamente incognoscível — então o limiar
// de longitude sobe de 0,1° (era observada) para 2,0° (extrapolada), e
// a suíte do relógio compartilhado continua APERTADA lá: erro de
// longitude ÷ taxa de spin do próprio corpo vira offset de relógio, e
// corpos que giram a 351 e 871°/dia concordam a < 2 s — coisa que
// nenhum par de constantes mistranscritas consegue imitar. Medidos no
// doador: Marte −5,3 s / Júpiter −4,8 s em 2025 (Espenak–Meeus já
// sobre-prevê o ΔT de hoje); −23,7/−23,1 s em 2050; −133,3/−133,2 s em
// 2100.
//
// ADAPTAÇÕES DECLARADAS:
//  1. Motor da casa no lugar do engine vivo do doador: os planetas, a
//     Lua e Plutão leem a tabela Hermite de efemerides.bin, com JANELA
//     1950–2050 TDB (manifest). Os fixtures de earth/mars/jupiter em
//     1900/1950/2100 caem FORA (o retardo de tempo-luz empurra até os
//     de 1950 para antes do início) e posicao() lança ali por contrato
//     (adaptação b de efemerides.ts) — ficam PULADOS por um filtro
//     derivado do manifest, e uma asserção pina a lista exata para o
//     pulo nunca crescer em silêncio. Quando a Decisão 2 do plano
//     alargar a janela da tabela, a asserção quebra ALTO e as épocas
//     voltam ao júri. Os fixtures de 2050 continuam dentro (o retardo
//     os puxa para aquém da borda) e são quem exercita o limiar
//     extrapolado de 2,0°.
//  2. Matemática pura em equatorial J2000 (orientacao.ts) no lugar de
//     quaternions three; a latitude planetodética sai do próprio
//     subSolarPoint (BODY_AXES, mesmo kernel dos polos).
//  3. isAnalyticalSatellite do doador virou pertencer a SATELLITES
//     (elementosOrbitais.ts) — mesma semântica: a Lua fica de fora
//     porque é tabela ELP, válida por milênios, e dar a ela a
//     tolerância de posição envelhecida cegaria o limiar de graça.
//  4. Conversão de datas SEMPRE por time.ts (conversor único, regra
//     M6) — o mesmo caminho que o runtime real percorre.
// ============================================================

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MetaEfemerides } from './efemerides';
import { decodeEfemerides, MotorEfemerides } from './efemerides';
import { SATELLITES } from './elementosOrbitais';
import { BODY_AXES, IAU_ORIENTATIONS } from './iauOrientation';
import { subSolarPoint } from './orientacao';
import { dateToTDB } from './time';

interface SubSolarFixture {
  bodyId: string;
  date: string;
  targetFrame: string;
  longitudeSense: string;
  subSolarLonDeg: number;
  subSolarLatDeg: number;
  lightTimeSeconds: number;
}

/**
 * Todos os fixtures sub-solares em disco, via glob — adicionar uma
 * época ou um corpo é uma rodada de script, não uma edição aqui
 * (propriedade herdada do doador).
 */
const FIXTURES = (
  Object.values(
    import.meta.glob('../../test/fixtures/horizons/subsolar-*.json', {
      eager: true,
    })
  ) as Array<{ default: SubSolarFixture }>
)
  .map((module) => module.default)
  .sort(
    (a, b) => a.bodyId.localeCompare(b.bodyId) || a.date.localeCompare(b.date)
  );

// Motor sobre a tabela embarcada — mesmo padrão de regressao.test.ts
// (criarMotor); duplicado aqui porque um helper compartilhado seria um
// arquivo novo fora do escopo desta tarefa.
const DATA_DIR = fileURLToPath(
  new URL('../../../public/data/atlas/', import.meta.url)
);
const META = JSON.parse(
  readFileSync(join(DATA_DIR, 'efemerides_meta.json'), 'utf8')
) as MetaEfemerides;
const motor = (() => {
  const bin = readFileSync(join(DATA_DIR, 'efemerides.bin'));
  const buffer = bin.buffer.slice(
    bin.byteOffset,
    bin.byteOffset + bin.byteLength
  );
  return new MotorEfemerides(decodeEfemerides(buffer, META));
})();

/**
 * O último instante em que ΔT é MEDIDO em vez de extrapolado. Antes
 * dele, casa e JPL descrevem o mesmo relógio e o limiar é a acurácia
 * verdadeira da transcrição; depois, os dois relógios legitimamente se
 * separam — ver o cabeçalho.
 */
const OBSERVED_DELTA_T_UNTIL = new Date('2027-01-01T00:00:00Z');

/**
 * Era de ΔT observado: UM limiar para todos os corpos, não oito
 * ajustados. O pior resíduo do doador ali era 0,061° (Terra), e a
 * classe de defeito que isto pega — dígito trocado, escala de tempo
 * trocada, eixo invertido — move o sub-ponto por décimos de grau no
 * MÍNIMO. O controle negativo no fim pina essa afirmação.
 */
const MAX_LON_ERROR_DEG = 0.1;

/**
 * Fora da era observada o limiar só precisa pegar modelo quebrado
 * tolerando a divergência ΔT (pior caso do doador: Júpiter 1,34° em
 * 2100; aqui o probe extrapolado que resta é 2050). Transcrição errada
 * é pega mesmo assim pela suíte do relógio, que fica apertada em toda
 * época.
 */
const MAX_LON_ERROR_EXTRAPOLATED_DEG = 2.0;

/**
 * Latitude, depois de removida a diferença de figura: o Horizons
 * reporta latitude PLANETODÉTICA, o modelo produz planetocêntrica, e
 * subSolarPoint converte com o achatamento do próprio corpo
 * (BODY_AXES). Em Fobos a diferença é ~20° — o doador quase leu isso
 * como polo mistranscrito. O que sobra é triaxialidade (equador
 * elíptico), limitada por corpo por triaxialSpreadDeg dos MESMOS eixos
 * publicados — nada aqui é ajustado a resíduo medido.
 */
const MAX_LAT_ERROR_DEG = 1.5;

/**
 * Instante de osculação dos elementos de satélite (elementosOrbitais)
 * e a janela que eles declaram valer (±366 dias — o pior erro angular
 * ±1 ano medido é 5,2°, Mimas).
 */
const SATELLITE_ELEMENT_EPOCH = new Date('2025-01-01T00:00:00Z');
const SATELLITE_ELEMENT_VALIDITY_MS = 366 * 86_400_000;

/** ΔT em 2026 — o tamanho do erro que um spin dirigido por UT faria. */
const DELTA_T_SECONDS_2026 = 72;

/**
 * Quanto o equador triaxial pode empurrar a latitude planetodética
 * para longe do que a conversão de esferoide prevê — mesma forma
 * fechada do termo polar, aplicada a b/a, avaliada onde tem pico
 * (45°). Zero para equador circular, então não alarga nada que não
 * precise fisicamente.
 */
function triaxialSpreadDeg(bodyId: string): number {
  const axes = BODY_AXES[bodyId];
  if (!axes) return 0;
  return (Math.atan(1 / (axes[1] / axes[0]) ** 2) * 180) / Math.PI - 45;
}

function signedDeltaDeg(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/**
 * A longitude do Horizons em graus LESTE, qualquer que seja o sentido
 * reportado. Herdado verbatim porque é a armadilha que o doador quase
 * embarcou: longitude planetográfica IAU corre para OESTE em rotores
 * progrados e para LESTE em retrógrados, com Terra, Lua e Sol
 * convencionalmente LESTE. Marte voltou "errado" por 162°, 39° e 47°
 * em três épocas — parecia Ẇ ruim; era SINAL (modelo + JPL somavam
 * 359,98° sempre, e a latitude já batia). Uma regra fixa também
 * erraria: Vênus e Urano são retrógrados e reportam LESTE como a
 * Terra. O gerador lê o sentido do próprio header do Horizons
 * ({West-longitude positive}) e grava POR FIXTURE — nada aqui adivinha.
 */
function eastLongitudeDeg(fixture: SubSolarFixture): number {
  return fixture.longitudeSense === 'west'
    ? (360 - fixture.subSolarLonDeg) % 360
    : fixture.subSolarLonDeg;
}

function retardedInstant(fixture: SubSolarFixture): Date {
  return new Date(
    new Date(fixture.date).getTime() - fixture.lightTimeSeconds * 1000
  );
}

/** Regra M6: o instante retardado vira TDB pelo conversor único. */
function jdTdbRetardado(fixture: SubSolarFixture): number {
  return dateToTDB(retardedInstant(fixture));
}

// Adaptação 1: o filtro de janela deriva do MANIFEST, não de lista à
// mão — quando a tabela alargar, os fixtures voltam sozinhos (e a
// asserção de inventário abaixo cobra a revisão).
function dentroDaJanelaDaTabela(fixture: SubSolarFixture): boolean {
  const jd = jdTdbRetardado(fixture);
  return jd >= META.janela.jdInicio && jd <= META.janela.jdFim;
}

const AVALIAVEIS = FIXTURES.filter(dentroDaJanelaDaTabela);
const PULADOS = FIXTURES.filter((f) => !dentroDaJanelaDaTabela(f));

function longitudeErrorDeg(fixture: SubSolarFixture): number {
  return signedDeltaDeg(
    subSolarPoint(fixture.bodyId, jdTdbRetardado(fixture), motor).lonEastDeg,
    eastLongitudeDeg(fixture)
  );
}

/**
 * O piso que uma POSIÇÃO DE SATÉLITE ENVELHECIDA põe sob o limiar de
 * longitude (herdado): o sub-ponto de um satélite depende de onde o
 * Sol está VISTO DO SATÉLITE, então pô-lo do lado errado do pai gira
 * essa direção pelo ângulo que a órbita subtende do Sol. Os elementos
 * são de dois corpos, osculantes em 2025-01-01; um quarto de século
 * antes a fase simplesmente não existe mais — ali é ISTO, não o polo,
 * que limita a acurácia. Callisto forçou o termo no doador: 0,184° em
 * 2000-01-01 contra 0,030° em 2025, com órbita subtendendo 0,29° do
 * Sol. A tolerância é asin(2a/d) — uma fase errada desloca o corpo por
 * até um diâmetro de órbita — computada dos vetores do próprio modelo,
 * não de tabela. Dentro da janela declarada devolve 0: a fase está
 * presa lá e o limiar apertado é fisicamente merecido.
 *
 * Chaveado no PROVEDOR (adaptação 3): a Lua é satélite mas é servida
 * por tabela ELP válida por milênios — dar a ela este desconto em
 * 2000-01-01 cegaria o limiar de graça.
 */
function stalePositionAllowanceDeg(fixture: SubSolarFixture): number {
  const satelite = SATELLITES[fixture.bodyId];
  if (!satelite) return 0;

  const at = new Date(fixture.date);
  const idade = Math.abs(at.getTime() - SATELLITE_ELEMENT_EPOCH.getTime());
  if (idade <= SATELLITE_ELEMENT_VALIDITY_MS) return 0;

  const jd = dateToTDB(at);
  const p = motor.posicaoHeliocentrica(fixture.bodyId, jd);
  const pai = motor.posicaoHeliocentrica(satelite.parent, jd);
  const raioOrbitaAU = Math.hypot(p.x - pai.x, p.y - pai.y, p.z - pai.z);
  const distanciaSolAU = Math.hypot(p.x, p.y, p.z);

  return (
    (Math.asin((2 * raioOrbitaAU) / distanciaSolAU) * 180) / Math.PI
  );
}

function spinRateDegPerDay(bodyId: string): number {
  const o = IAU_ORIENTATIONS[bodyId];
  if (!o) throw new Error(`${bodyId} sem solução de rotação IAU`);
  return o.spinRateDegPerDay;
}

describe('inventário de fixtures', () => {
  it('o glob acha os 127 fixtures de 30 corpos (glob vazio = suíte mentindo verde)', () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(127);
    expect(new Set(FIXTURES.map((f) => f.bodyId)).size).toBeGreaterThanOrEqual(
      30
    );
  });

  it('todo corpo com fixture tem solução de rotação IAU embarcada', () => {
    const semSolucao = [
      ...new Set(FIXTURES.map((f) => f.bodyId)),
    ].filter((id) => !IAU_ORIENTATIONS[id]);
    expect(semSolucao).toEqual([]);
  });

  it('só ficam de fora os fixtures além da janela da tabela — exatamente estes (adaptação 1)', () => {
    expect(
      PULADOS.map((f) => `${f.bodyId}@${f.date.slice(0, 10)}`).sort()
    ).toEqual([
      'earth@1900-01-01',
      'earth@1950-01-01',
      'earth@2100-01-01',
      'jupiter@1900-01-01',
      'jupiter@1950-01-01',
      'jupiter@2100-01-01',
      'mars@1900-01-01',
      'mars@1950-01-01',
      'mars@2100-01-01',
    ]);
  });
});

describe('sub-ponto solar vs JPL Horizons', () => {
  for (const fixture of AVALIAVEIS) {
    it(`${fixture.bodyId} em ${fixture.date}`, () => {
      const modelo = subSolarPoint(
        fixture.bodyId,
        jdTdbRetardado(fixture),
        motor
      );

      const jplEast = eastLongitudeDeg(fixture);
      const lonError = signedDeltaDeg(modelo.lonEastDeg, jplEast);
      const latError = modelo.latPlanetodeticaDeg - fixture.subSolarLatDeg;
      const extrapolado = new Date(fixture.date) > OBSERVED_DELTA_T_UNTIL;

      const lonBound =
        (extrapolado ? MAX_LON_ERROR_EXTRAPOLATED_DEG : MAX_LON_ERROR_DEG) +
        stalePositionAllowanceDeg(fixture);

      expect(
        Math.abs(lonError),
        `${fixture.bodyId} longitude sub-solar: modelo ${modelo.lonEastDeg.toFixed(4)}°E vs JPL ${jplEast.toFixed(4)}°E ` +
          `(reportado ${fixture.subSolarLonDeg.toFixed(4)}° ${fixture.longitudeSense}, frame ${fixture.targetFrame}) — Δ ${lonError.toFixed(4)}°, limiar ${lonBound.toFixed(4)}°`
      ).toBeLessThan(lonBound);

      expect(
        Math.abs(latError),
        `${fixture.bodyId} latitude sub-solar: modelo ${modelo.latPlanetodeticaDeg.toFixed(4)}° planetodética ` +
          `(${modelo.latPlanetocentricaDeg.toFixed(4)}° planetocêntrica) vs JPL ${fixture.subSolarLatDeg.toFixed(4)}° (Δ ${latError.toFixed(4)}°)`
      ).toBeLessThan(MAX_LAT_ERROR_DEG + triaxialSpreadDeg(fixture.bodyId));
    });
  }
});

/**
 * O resíduo é um RELÓGIO COMPARTILHADO, não erro por corpo (herdado).
 * O erro de longitude de cada corpo dividido pela SUA taxa de spin é o
 * offset de relógio que o explicaria; constantes mistranscritas dariam
 * números sem relação (Marte e Júpiter giram a 351 e 871°/dia e não
 * compartilham mais nada). É esta suíte que pegaria um W₀ ou Ẇ ruim em
 * época distante — e ela fica apertada exatamente onde o limiar de
 * longitude precisa afrouxar.
 *
 * A TERRA fica de fora, deliberadamente (herdado): o Horizons dirige a
 * Terra com ITRF93, não com a expressão IAU, então o resíduo dela
 * carrega um segundo gap de modelo (~+19 s equivalente) por cima do
 * offset de relógio — incluí-la forçaria uma tolerância frouxa a ponto
 * de não significar nada.
 *
 * ROTORES LENTOS também, e a regra é DERIVADA, não listada: converter
 * longitude em relógio divide pela taxa de spin, então um corpo que
 * leva 59 dias para girar não resolve segundos (o 0,010° perfeitamente
 * bom de Mercúrio viraria 142 s aparentes; o 0,0002° de Vênus, 14 s).
 * Um corpo só vota se o próprio limiar de longitude corresponder a
 * menos de 30 s da SUA rotação — entra Marte (25 s), sai Mercúrio
 * (1407 s).
 */
describe('o resíduo é um offset de relógio compartilhado, não erro por corpo', () => {
  const MAX_CLOCK_DISAGREEMENT_SECONDS = 2;
  const MIN_CLOCK_RESOLUTION_SECONDS = 30;

  const resolveRelogio = (bodyId: string) =>
    (MAX_LON_ERROR_DEG / Math.abs(spinRateDegPerDay(bodyId))) * 86400 <
    MIN_CLOCK_RESOLUTION_SECONDS;

  /**
   * Satélite longe da época dos elementos não vota, pela mesma razão
   * do limiar frouxo: a fase orbital derivou, e deriva não é relógio.
   * Mimas é o caso (herdado): 0,016° de ângulo subtendido em 2000 são
   * 3,6 s de rotação de Mimas — 1,8× a concordância cobrada aqui. O
   * corte é o próprio limiar da suíte, não um número novo: só vota
   * quem tem incerteza irredutível de posição menor que a discordância
   * sob teste.
   */
  const positionNoiseSeconds = (fixture: SubSolarFixture) =>
    (stalePositionAllowanceDeg(fixture) /
      Math.abs(spinRateDegPerDay(fixture.bodyId))) *
    86400;

  const porData = new Map<string, SubSolarFixture[]>();
  for (const fixture of AVALIAVEIS) {
    if (fixture.bodyId === 'earth') continue;
    if (!resolveRelogio(fixture.bodyId)) continue;
    const lista = porData.get(fixture.date) ?? [];
    lista.push(fixture);
    porData.set(fixture.date, lista);
  }

  for (const [date, candidatos] of porData) {
    if (candidatos.length < 2) continue;

    it(`${date} — todos os corpos implicam o mesmo relógio`, () => {
      const fixtures = candidatos.filter(
        (f) => positionNoiseSeconds(f) < MAX_CLOCK_DISAGREEMENT_SECONDS
      );
      if (fixtures.length < 2) return;

      const offsets = fixtures.map((fixture) => ({
        bodyId: fixture.bodyId,
        seconds:
          (longitudeErrorDeg(fixture) / spinRateDegPerDay(fixture.bodyId)) *
          86400,
      }));

      const seconds = offsets.map((o) => o.seconds);
      const spread = Math.max(...seconds) - Math.min(...seconds);

      expect(
        spread,
        `offsets de relógio implicados discordam: ${offsets
          .map((o) => `${o.bodyId} ${o.seconds.toFixed(1)}s`)
          .join(
            ', '
          )} — spread desse tamanho significa constante POR CORPO errada, não relógios diferentes`
      ).toBeLessThan(MAX_CLOCK_DISAGREEMENT_SECONDS);
    });
  }
});

/**
 * O controle negativo — a razão de as suítes acima serem GATES e não
 * coincidências (herdado). Testes passando provam que ALGUMA
 * orientação reproduz o JPL; não provam sensibilidade ao erro mais
 * provável. Dirigir o spin por contagem de dias UT em vez de TDB é
 * esse erro: um caractere, invisível a todo outro teste do repositório.
 * Deslocar a época por ΔT tem de estourar o limiar em cada rotor
 * rápido.
 */
describe('o limiar é sensível a um spin UT-em-vez-de-TDB', () => {
  for (const fixture of AVALIAVEIS) {
    if (new Date(fixture.date) > OBSERVED_DELTA_T_UNTIL) continue;

    const shiftDeg =
      (Math.abs(spinRateDegPerDay(fixture.bodyId)) * DELTA_T_SECONDS_2026) /
      86400;

    // Mercúrio e Vênus giram devagar demais para ΔT importar (0,005° e
    // 0,001°) — não discriminam erro de escala de tempo e são PULADOS
    // em vez de afirmados contra um limiar que passariam pela razão
    // errada. Seguem com peso cheio na primeira suíte, onde pinam W₀ e
    // polo a 0,011° e 0,0002°. A margem de 2× é o que um CANCELAMENTO
    // exige: o erro deslocado é |shift ∓ resíduo|, então o corpo tem
    // de andar mais que o limiar MAIS o próprio resíduo antes de o
    // controle significar algo. A 2× o pior caso é 0,2 − 0,061 =
    // 0,139°, ainda fora do limiar — e Marte (0,292°) continua dentro
    // do júri, que uma guarda de 3× excluiria mesmo ele discriminando
    // bem.
    if (shiftDeg < 2 * MAX_LON_ERROR_DEG) continue;

    it(`${fixture.bodyId} em ${fixture.date}`, () => {
      const jdDeslocado = dateToTDB(
        new Date(
          retardedInstant(fixture).getTime() + DELTA_T_SECONDS_2026 * 1000
        )
      );
      const errado = subSolarPoint(fixture.bodyId, jdDeslocado, motor);
      const wrongError = Math.abs(
        signedDeltaDeg(errado.lonEastDeg, eastLongitudeDeg(fixture))
      );

      expect(
        wrongError,
        `${fixture.bodyId}: um spin dirigido por UT erra só ${wrongError.toFixed(4)}° — este fixture não consegue pegá-lo`
      ).toBeGreaterThan(MAX_LON_ERROR_DEG);
    });
  }
});
