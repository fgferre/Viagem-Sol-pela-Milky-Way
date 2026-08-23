// ============================================================
// Motor de efemérides — decodifica as tabelas de efemerides.bin,
// interpola Hermite cúbica e responde posição parent-centered em UA,
// eclíptica média J2000, com cache instrumentado.
//
// RENASCE (doutrina de travessia, PLANO-ATLAS §0): o OrbitalEngine do
// doador (engine.ts) não atravessa — ele devolvia THREE.Vector3 no
// frame Y-up da cena, avaliava as teorias ao vivo e carregava uma
// máquina de providers com fallback. Aqui o motor é PURO: zero import
// de three, zero fetch (a decodificação recebe ArrayBuffer + meta de
// quem buscou), e as teorias viraram tabela offline (amostra-efemerides
// .mjs). O CONTRATO DO CACHE, porém, é oráculo re-expresso — os números
// e as semânticas abaixo são os que engine.test.ts do doador julgava.
//
// CICATRIZES HERDADAS (espec do doador; não redescobrir):
//   1. Chave de cache `${bodyId}@${jdTdb.toFixed(5)}` — balde ~0,864 s.
//      Em playback 1× a chave repete (hit); sob time-warp cada frame
//      gera chave ÚNICA e o Map VAZAVA — daí o teto de 2000 entradas
//      com evicção da inserção mais antiga (Map preserva ordem).
//   2. TTL 1000 ms por Date.now: entrada velha conta como miss e é
//      recalculada (o set sobrescreve sem mudar a ordem de inserção).
//   3. getCacheStats() é O(1) e SÓ contadores; getCacheEntries() é
//      O(n) e vive SEPARADO — finding real de custo no doador
//      (2026-04-18): o reporter pagava o O(n) a cada segundo mesmo só
//      consumindo os contadores.
//   4. hitRate = hits/(hits+misses), 0 se denominador 0; bypassed
//      (o Sol) fica FORA do denominador — senão o Sol envenena a taxa.
//   5. resetCacheStats() zera contadores e PRESERVA o Map (a entrada
//      sobrevivente ainda serve hit); clearCache() esvazia o Map e
//      PRESERVA contadores (observabilidade é outra alçada).
//
// ADAPTAÇÕES DECLARADAS:
//   a. A dualidade provider-analítico vs fallback-Kepler do doador para
//      satélites COLAPSOU aqui de propósito: os dois lados eram a MESMA
//      matemática (cicatriz do setup.ts:29-69 do doador — o fallback
//      lia o catálogo em frame errado e deitava Miranda 104,6°; quando
//      consertaram, os dois caminhos ficaram idênticos ao 0,0000°).
//      Aqui satélite/asteroide É posicaoKepler, sempre; a janela do
//      registro virou honestidade de notaDeValidade, não roteamento.
//   b. Corpo de TABELA fora da janela 1950–2050 → Error com mensagem
//      clara. Não há consumidor de datas fora da janela nesta onda;
//      quando houver (timeline milenar), a tabela regenera ou um braço
//      novo nasce — mascarar com extrapolação silenciosa é o bug.
//   c. posicao() aceita parentId opcional mas EXIGE que seja o centro
//      natural do corpo (fixtures e cena pedem exatamente isso); pedir
//      outro centro lança em vez de compor em silêncio — composição
//      explícita existe em posicaoHeliocentrica().
//   d. notaDeValidade tem os DOIS braços do contrato de honestidade do
//      doador (engine.test.ts "validity note honesty"): dentro da
//      janela cita a acurácia MEDIDA do registro (e, para tabelas, soma
//      o erro de interpolação medido do manifest); fora, avisa que os
//      elementos congelados de 2025-01-01 estão extrapolados e NUNCA
//      cita a acurácia medida. Janela formatada com en-dash e a.C./d.C.
//      (a do doador imprimia "-3000-3000" — ilegível; e o BCE/CE que a
//      casa herdou virou a.C./d.C. em 22/08, quando a ficha do objeto
//      passou a imprimir esta nota inteira na tela, em português).
// ============================================================

import type { PosicaoEcliptica } from './kepler';
import { IDS_KEPLER, posicaoKepler } from './kepler';
import type { RegistroCorpo } from './registroOrbital';
import { REGISTRO_ORBITAL } from './registroOrbital';
import { tdbToDate } from './time';

// ---------------------------------------------------------- manifest

export interface MetaCorpoEfemerides {
  teoria: string;
  centro: string;
  passoDias: number;
  n: number;
  offsetFloats: number;
  orcamentoErroAu: number;
  erroMedidoAu: number;
}

export interface MetaEfemerides {
  formato: string;
  frame: string;
  escalaTempo: string;
  janela: { jdInicio: number; jdFim: number };
  corpos: Record<string, MetaCorpoEfemerides>;
}

interface TabelaCorpo {
  centro: string;
  passoDias: number;
  n: number;
  erroMedidoAu: number;
  /** View [x,y,z,vx,vy,vz]×n sobre o ArrayBuffer compartilhado. */
  dados: Float32Array;
}

export interface TabelasEfemerides {
  janela: { jdInicio: number; jdFim: number };
  corpos: Map<string, TabelaCorpo>;
}

/**
 * Decodifica o .bin em views por corpo (padrão sc1: nenhuma cópia, uma
 * Float32Array por corpo sobre o mesmo buffer). Valida formato e
 * coerência offsets×tamanho — buffer truncado lança aqui, não vira
 * NaN silencioso na interpolação.
 */
export function decodeEfemerides(
  buffer: ArrayBuffer,
  meta: MetaEfemerides
): TabelasEfemerides {
  if (meta.formato !== 'ef1') {
    throw new Error(
      `decodeEfemerides: formato "${meta.formato}" desconhecido (esperado "ef1")`
    );
  }
  const totalFloats = buffer.byteLength / Float32Array.BYTES_PER_ELEMENT;
  const corpos = new Map<string, TabelaCorpo>();
  for (const [id, corpo] of Object.entries(meta.corpos)) {
    // A Hermite precisa de DOIS nós: com n < 2 o índice do segmento
    // clampa a n−2 < 0 e leria fora da view (achado da revisão) — um
    // manifest doente lança aqui, não vira NaN na interpolação.
    if (!Number.isInteger(corpo.n) || corpo.n < 2) {
      throw new Error(
        `decodeEfemerides: tabela de "${id}" com n=${corpo.n} — a Hermite ` +
          `exige pelo menos 2 nós`
      );
    }
    const fim = corpo.offsetFloats + corpo.n * 6;
    if (!Number.isInteger(corpo.offsetFloats) || fim > totalFloats) {
      throw new Error(
        `decodeEfemerides: tabela de "${id}" (floats ${corpo.offsetFloats}..${fim}) ` +
          `não cabe no buffer de ${totalFloats} floats — .bin e meta dessincronizados`
      );
    }
    corpos.set(id, {
      centro: corpo.centro,
      passoDias: corpo.passoDias,
      n: corpo.n,
      erroMedidoAu: corpo.erroMedidoAu,
      dados: new Float32Array(
        buffer,
        corpo.offsetFloats * Float32Array.BYTES_PER_ELEMENT,
        corpo.n * 6
      ),
    });
  }
  return { janela: { ...meta.janela }, corpos };
}

// ------------------------------------------------------- interpolação

/**
 * Hermite cúbica no segmento [i, i+1] da tabela (posição + velocidade
 * nos nós). A mesma fórmula vive em amostra-efemerides.mjs, que MEDIU
 * o erro dela contra a teoria direta (erroMedidoAu no manifest) — os
 * oráculos Horizons de regressao.test.ts pegam qualquer divergência
 * entre as duas cópias.
 */
function hermite(
  tabela: TabelaCorpo,
  jdInicio: number,
  jdTdb: number
): PosicaoEcliptica {
  const h = tabela.passoDias;
  const i = Math.min(
    Math.max(0, Math.floor((jdTdb - jdInicio) / h)),
    tabela.n - 2
  );
  const t = (jdTdb - (jdInicio + i * h)) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const d = tabela.dados;
  const a = i * 6;
  const b = (i + 1) * 6;
  const eixo = (k: number) =>
    h00 * d[a + k]! +
    h10 * h * d[a + 3 + k]! +
    h01 * d[b + k]! +
    h11 * h * d[b + 3 + k]!;
  return { x: eixo(0), y: eixo(1), z: eixo(2) };
}

/**
 * A DERIVADA da mesma Hermite — UA/dia, no mesmo segmento e no mesmo frame.
 *
 * OS TRÊS FLOATS QUE A `hermite` DESCARTA: cada amostra do `.bin` guarda
 * `[x,y,z,vx,vy,vz]`, e até 2026-08-22 os três últimos serviam só como
 * TANGENTES da interpolação de posição — ninguém nunca perguntou a
 * velocidade. Este é o segundo consumidor deles, e ele os lê pela porta
 * certa: derivar o polinômio que a casa JÁ desenha é o que garante que a
 * velocidade mostrada seja a da trajetória mostrada. Nos nós ela devolve
 * exatamente o `v` gravado; entre eles, a inclinação da curva que passa
 * por ali. Interpolar os `v` por conta própria daria um terceiro número,
 * parecido e incoerente com os outros dois.
 *
 * As bases derivadas em `t` (o parâmetro 0..1 do segmento):
 *   h00' = 6t²−6t   h10' = 3t²−4t+1   h01' = −6t²+6t   h11' = 3t²−2t
 * e o `1/h` converte de "por segmento" para "por dia" nos termos de
 * posição — os de velocidade já vêm multiplicados por `h` na fórmula
 * original, então o fator cancela neles.
 */
function hermiteVelocidade(
  tabela: TabelaCorpo,
  jdInicio: number,
  jdTdb: number
): PosicaoEcliptica {
  const h = tabela.passoDias;
  const i = Math.min(
    Math.max(0, Math.floor((jdTdb - jdInicio) / h)),
    tabela.n - 2
  );
  const t = (jdTdb - (jdInicio + i * h)) / h;
  const t2 = t * t;
  const dh00 = 6 * t2 - 6 * t;
  const dh10 = 3 * t2 - 4 * t + 1;
  const dh01 = -6 * t2 + 6 * t;
  const dh11 = 3 * t2 - 2 * t;
  const d = tabela.dados;
  const a = i * 6;
  const b = (i + 1) * 6;
  const eixo = (k: number) =>
    (dh00 * d[a + k]! + dh01 * d[b + k]!) / h +
    dh10 * d[a + 3 + k]! +
    dh11 * d[b + 3 + k]!;
  return { x: eixo(0), y: eixo(1), z: eixo(2) };
}

/**
 * O passo da diferença central para os corpos de KEPLER, em dias (~86 s).
 *
 * Eles não têm tabela — a posição sai de uma solução analítica —, e derivar
 * essa solução à mão significaria abrir `posicaoKepler` para devolver a
 * anomalia excêntrica só para este uso. A diferença central custa duas
 * chamadas e erra em O(dt²·p‴): no pior corpo do catálogo (Mimas, período de
 * 0,94 dia) isso é ~5e-5 relativo, ou 0,7 m/s numa órbita de 14,3 km/s. O
 * passo não pode encolher muito mais: abaixo disso o cancelamento de ponto
 * flutuante entre duas posições quase iguais começa a comer os dígitos que a
 * fórmula acabou de ganhar.
 */
const PASSO_DA_DERIVADA_DIAS = 1e-3;

// ------------------------------------------------------------- motor

const TTL_CACHE_MS = 1000;
const MAX_ENTRADAS_CACHE = 2000;
const IDS_KEPLER_SET = new Set(IDS_KEPLER);

interface EntradaCache {
  posicao: PosicaoEcliptica;
  timestamp: number;
}

export interface EstatisticasCache {
  size: number;
  hits: number;
  misses: number;
  bypassed: number;
  hitRate: number;
}

/** Formata janela de anos com en-dash e era explícita (adaptação d). */
function formatarJanela(anoInicio: number, anoFim: number): string {
  const inicio = anoInicio < 0 ? `${Math.abs(anoInicio)} a.C.` : `${anoInicio}`;
  const fim =
    anoFim < 0
      ? `${Math.abs(anoFim)} a.C.`
      : anoInicio < 0
        ? `${anoFim} d.C.`
        : `${anoFim}`;
  return `${inicio}–${fim}`;
}

export class MotorEfemerides {
  private readonly tabelas: TabelasEfemerides;
  private readonly cache = new Map<string, EntradaCache>();
  private hits = 0;
  private misses = 0;
  private bypassed = 0;

  constructor(tabelas: TabelasEfemerides) {
    this.tabelas = tabelas;
  }

  private registroDe(bodyId: string): RegistroCorpo {
    const registro = REGISTRO_ORBITAL[bodyId];
    if (!registro) {
      throw new Error(
        `MotorEfemerides: corpo desconhecido "${bodyId}" — silêncio aqui ` +
          `viraria um corpo parado na origem do pai (cicatriz do doador)`
      );
    }
    return registro;
  }

  /**
   * Posição parent-centered em UA, eclíptica média J2000, no instante
   * `jdTdb` (Julian Date, escala TDB — o chamador converte com time.ts,
   * regra M6). Sol → origem (bypass do cache). `parentId`, se vier,
   * precisa ser o centro natural do corpo (adaptação c).
   */
  posicao(
    bodyId: string,
    jdTdb: number,
    parentId?: string
  ): PosicaoEcliptica {
    // NaN atravessa a checagem de janela em silêncio (NaN < jdInicio e
    // NaN > jdFim são ambos false) e a Hermite devolveria {NaN,NaN,NaN}
    // cacheado sob "corpo@NaN" — a classe de bug "corpo some sem erro"
    // que este motor existe para proibir (achado da revisão).
    if (!Number.isFinite(jdTdb)) {
      throw new Error(
        `MotorEfemerides.posicao: jdTdb não-finito (${jdTdb}) para "${bodyId}"`
      );
    }

    // A validação de parentId vem ANTES do bypass do Sol: sem isso,
    // posicao('sun', jd, 'earth') devolvia a origem em silêncio
    // (achado da revisão). O bypass segue sem tocar cache/hits/misses.
    const registro = this.registroDe(bodyId);
    if (parentId !== undefined && parentId !== registro.centro) {
      throw new Error(
        `MotorEfemerides.posicao: "${bodyId}" é centrado em ` +
          `"${registro.centro}", não em "${parentId}" — para outro centro ` +
          `componha com posicaoHeliocentrica()`
      );
    }
    if (bodyId === 'sun') {
      this.bypassed++;
      return { x: 0, y: 0, z: 0 };
    }

    const chave = `${bodyId}@${jdTdb.toFixed(5)}`;
    const emCache = this.cache.get(chave);
    if (emCache && Date.now() - emCache.timestamp < TTL_CACHE_MS) {
      this.hits++;
      return emCache.posicao;
    }
    this.misses++;

    const posicao = this.calcular(bodyId, jdTdb, registro);

    this.cache.set(chave, { posicao, timestamp: Date.now() });
    while (this.cache.size > MAX_ENTRADAS_CACHE) {
      const maisAntiga = this.cache.keys().next().value;
      if (maisAntiga === undefined) break;
      this.cache.delete(maisAntiga);
    }
    return posicao;
  }

  private calcular(
    bodyId: string,
    jdTdb: number,
    registro: RegistroCorpo
  ): PosicaoEcliptica {
    const tabela = this.tabelas.corpos.get(bodyId);
    if (tabela) {
      const { jdInicio, jdFim } = this.tabelas.janela;
      if (jdTdb < jdInicio || jdTdb > jdFim) {
        // Adaptação b: sem consumidor fora da janela nesta onda.
        throw new Error(
          `MotorEfemerides.posicao: jd ${jdTdb} fora da janela da tabela ` +
            `de "${bodyId}" (${jdInicio}..${jdFim} TDB, 1950–2050); ` +
            `a tabela regenera via npm run data:atlas quando a janela mudar`
        );
      }
      return hermite(tabela, jdInicio, jdTdb);
    }
    if (IDS_KEPLER_SET.has(bodyId)) {
      return posicaoKepler(bodyId, jdTdb);
    }
    // Registrado mas sem tabela nem elementos: erro de montagem, não
    // de chamador — lança com o mesmo tom alto.
    throw new Error(
      `MotorEfemerides: "${bodyId}" consta no registro (${registro.modelo}) ` +
        `mas não tem tabela nem elementos Kepler embarcados`
    );
  }

  /**
   * VELOCIDADE parent-centered em UA/dia, no mesmo frame e no mesmo instante
   * da `posicao()`. É a grandeza que a ficha do objeto mostra como
   * "velocidade orbital" depois de multiplicar por `AU_KM/86400`.
   *
   * NÃO PASSA PELO CACHE, de propósito. O contrato do cache (as cinco
   * cicatrizes do topo) é sobre POSIÇÃO — `hitRate`, teto de 2.000 entradas,
   * TTL — e um segundo tipo de valor no mesmo Map envenenaria os contadores
   * que o `memoria.mjs` e o painel de estatísticas leem. O consumidor desta
   * chamada é texto de HUD a 4 Hz, não o laço de quadro: duas avaliações de
   * Kepler por segundo não pedem cache nenhum.
   *
   * O Sol devolve zero sem contar bypass, pela mesma razão: quem conta é a
   * `posicao()`.
   */
  velocidade(bodyId: string, jdTdb: number): PosicaoEcliptica {
    if (!Number.isFinite(jdTdb)) {
      throw new Error(
        `MotorEfemerides.velocidade: jdTdb não-finito (${jdTdb}) para "${bodyId}"`
      );
    }
    const registro = this.registroDe(bodyId);
    if (bodyId === 'sun') return { x: 0, y: 0, z: 0 };

    const tabela = this.tabelas.corpos.get(bodyId);
    if (tabela) {
      const { jdInicio, jdFim } = this.tabelas.janela;
      if (jdTdb < jdInicio || jdTdb > jdFim) {
        // A MESMA adaptação b da posicao(): fora da janela nada de
        // extrapolação silenciosa. A mensagem cita esta chamada para o
        // rastro não apontar a irmã errada.
        throw new Error(
          `MotorEfemerides.velocidade: jd ${jdTdb} fora da janela da tabela ` +
            `de "${bodyId}" (${jdInicio}..${jdFim} TDB, 1950–2050); ` +
            `a tabela regenera via npm run data:atlas quando a janela mudar`
        );
      }
      return hermiteVelocidade(tabela, jdInicio, jdTdb);
    }
    if (IDS_KEPLER_SET.has(bodyId)) {
      const dt = PASSO_DA_DERIVADA_DIAS;
      const antes = posicaoKepler(bodyId, jdTdb - dt);
      const depois = posicaoKepler(bodyId, jdTdb + dt);
      return {
        x: (depois.x - antes.x) / (2 * dt),
        y: (depois.y - antes.y) / (2 * dt),
        z: (depois.z - antes.z) / (2 * dt),
      };
    }
    throw new Error(
      `MotorEfemerides: "${bodyId}" consta no registro (${registro.modelo}) ` +
        `mas não tem tabela nem elementos Kepler embarcados`
    );
  }

  /**
   * Posição heliocêntrica por composição recursiva: moon = earth +
   * geocêntrica; satélite = pai + relativo. Cada elo passa pelo cache.
   */
  posicaoHeliocentrica(bodyId: string, jdTdb: number): PosicaoEcliptica {
    // Mesmo guarda de jd não-finito da posicao() — a recursão abaixo
    // passa por ela, mas o ramo do Sol retornaria origem em silêncio.
    if (!Number.isFinite(jdTdb)) {
      throw new Error(
        `MotorEfemerides.posicaoHeliocentrica: jdTdb não-finito (${jdTdb}) ` +
          `para "${bodyId}"`
      );
    }
    if (bodyId === 'sun') {
      this.bypassed++;
      return { x: 0, y: 0, z: 0 };
    }
    const registro = this.registroDe(bodyId);
    const local = this.posicao(bodyId, jdTdb);
    if (registro.centro === 'sun') return local;
    const pai = this.posicaoHeliocentrica(registro.centro, jdTdb);
    return { x: pai.x + local.x, y: pai.y + local.y, z: pai.z + local.z };
  }

  /**
   * Contrato de honestidade (adaptação d): dentro da janela, acurácia
   * medida; fora, aviso de extrapolação SEM citar a acurácia medida.
   */
  notaDeValidade(bodyId: string, jdTdb: number): string {
    const registro = this.registroDe(bodyId);
    if (bodyId === 'sun') return registro.nota;

    if (registro.fonte === 'tabela') {
      const tabela = this.tabelas.corpos.get(bodyId);
      const { jdInicio, jdFim } = this.tabelas.janela;
      const janela = formatarJanela(
        registro.janela!.anoInicio,
        registro.janela!.anoFim
      );
      if (!tabela || jdTdb < jdInicio || jdTdb > jdFim) {
        return (
          `Fora de ${janela}: sem tabela embarcada — posicao() lança aqui. ` +
          `A teoria ${registro.modelo} cobriria ` +
          `${formatarJanela(registro.janelaTeoria!.anoInicio, registro.janelaTeoria!.anoFim)}; ` +
          `regenere a tabela para estender a janela.`
        );
      }
      return (
        `${registro.modelo}: ${registro.nota}. Tabela embarcada ${janela} ` +
        `(teoria válida ${formatarJanela(registro.janelaTeoria!.anoInicio, registro.janelaTeoria!.anoFim)}); ` +
        `interpolação Hermite medida ≤ ${tabela.erroMedidoAu.toExponential(2)} UA (manifesto).`
      );
    }

    // Kepler sem janela: luas de catálogo — nunca houve medição.
    if (!registro.janela) {
      return `${registro.modelo}: ${registro.nota}.`;
    }

    const ano = tdbToDate(jdTdb).getUTCFullYear();
    const janela = formatarJanela(
      registro.janela.anoInicio,
      registro.janela.anoFim
    );
    const dentro =
      ano >= registro.janela.anoInicio && ano <= registro.janela.anoFim;
    if (!dentro) {
      // NUNCA citar a acurácia medida aqui — ela descreve a janela.
      return (
        `Fora de ${janela}: elementos osculantes congelados em 2025-01-01 ` +
        `extrapolados por Kepler de dois corpos — acurácia não caracterizada aqui.`
      );
    }
    return `${registro.modelo} (válido ${janela}): ${registro.nota}.`;
  }

  /** Cicatrizes 3–4: O(1), só contadores; bypassed fora do denominador. */
  getCacheStats(): EstatisticasCache {
    const cacheaveis = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      bypassed: this.bypassed,
      hitRate: cacheaveis === 0 ? 0 : this.hits / cacheaveis,
    };
  }

  /** Cicatriz 5: zera contadores, PRESERVA o Map. */
  resetCacheStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.bypassed = 0;
  }

  /** Cicatriz 5: esvazia o Map, PRESERVA contadores. */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Cicatriz 3: listagem expandida O(n), separada de getCacheStats()
   * de propósito — só ferramenta de debug paga por ela.
   */
  getCacheEntries(): Array<{ key: string; age: number }> {
    const agora = Date.now();
    return Array.from(this.cache.entries()).map(([key, entrada]) => ({
      key,
      age: agora - entrada.timestamp,
    }));
  }
}
