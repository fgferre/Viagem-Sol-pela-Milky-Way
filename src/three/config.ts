// ============================================================
// Configuração central do mundo — escala em parsecs (pc)
// Editar aqui muda o comportamento de todos os módulos.
// ============================================================

export const WORLD = {
  // Sol artístico (escala real seria invisível: 2.3e-8 pc)
  sunRadius: 0.011,

  // "Corações" de nuvens ao longo do corredor da viagem: [x, y, z, raio pc]
  // Posicionados no corredor Sol → Sirius → Bellatrix → Betelgeuse → Rigel.
  //
  // RODADA 34 — o corredor começava DENTRO da Bolha Local. Os sete núcleos
  // caem todos em l 196–210° e b −10…−29° (a direção de Órion) e o corredor
  // ia de 8,4 a 218 pc: os quatro primeiros moravam na cavidade mais vazia
  // que existe perto do Sol (a Bolha Local tem raio médio ~170 pc — O'Neill
  // et al. 2024 — e a linha de visada para Órion "não vê muita poeira até
  // 250 pc", com a primeira estrutura em ~350 pc — Rezaei Kh. & Kainulainen
  // 2020). Vistos do Sol eles eram o maior erro do gate do céu: o PICO da
  // faixa no anticentro saía 10–12° ABAIXO do plano.
  //
  // A correção é de LUGAR, não de brilho — brilho de superfície de fonte
  // extensa não depende da distância, então dosar não fecharia a geometria.
  // Cada núcleo foi empurrado 130 pc para fora ao longo da PRÓPRIA direção
  // (l e b intactos, raio físico intacto): o corredor agora vai de 138 a
  // 348 pc, começando na parede da bolha e terminando na aproximação do
  // complexo de Órion real. `?corewall=` varre o deslocamento a partir
  // daqui; **`?corewall=-130` devolve o corredor da rodada 33 EXATO**.
  nebulaCores: [
    [33.02, 132.08, -24.77, 9.0], // 8,4 → 138,4 pc
    [41.43, 155.35, 10.36, 16.0], // 31,1 → 161,1 pc
    [36.55, 188.85, 21.32, 15.0], // 63,5 → 193,5 pc
    [15.57, 233.58, 31.14, 20.0], // 106,2 → 236,2 pc
    [10.86, 260.7, 35.55, 24.0], // 133,3 → 263,3 pc — região HII hero
    [27.04, 286.61, 48.67, 14.0], // 162,0 → 292,0 pc — além de Betelgeuse
    [55.87, 343.22, -12.77, 26.0], // 218,0 → 348,0 pc
  ] as [number, number, number, number][],

  // Paleta de gás (astrofotografia: OIII teal × H-alfa magenta)
  gasColorCool: [0.12, 0.38, 0.56] as [number, number, number],
  gasColorWarm: [0.88, 0.18, 0.34] as [number, number, number],
  gasDensity: 1.0,

  // Campos estelares
  dustCount: 2200,
};

/**
 * Calibração de artista herdada do atlas (`artistCalibration.ts`, migra na
 * Onda 2 — dado e conteúdo editorial, sem código de runtime). O consumidor
 * chega na Onda 6 (corpos resolvidos); até lá nada em runtime lê este bloco.
 *
 * DOUTRINA ANTI-LEVA. Estes valores viviam num painel de debug Leva no
 * doador e foram movidos para constante exatamente para aposentar essa
 * dependência sem perder os números: são calibração — afinados uma vez pelo
 * autor e deixados quietos, não controles de cena. Mudar um deles é editar
 * aqui, commitar e publicar. Se um dia o ajuste interativo voltar a ser
 * necessário, o caminho é uma rota dev-only (parâmetro de URL ou um painel
 * de calibração dedicado) que LÊ estes valores como iniciais — nunca
 * reintroduzir o Leva.
 *
 * LÁPIDE: `EARTH_ROTATION_OFFSET_DEG`. O sétimo valor deste bloco alinhava
 * a textura da Terra à mão. Morreu substituído pelo meridiano-zero IAU
 * MEDIDO da Terra (W₀ = 190.147°): o alinhamento passou a ser derivado, não
 * calibrado. NENHUMA constante deste bloco pode readquirir esse papel —
 * ângulo calibrado à mão sobre um corpo com modelo de rotação publicado é
 * regressão de fidelidade, não calibração. (É a lápide que o PLANO-ATLAS
 * manda preservar.)
 */
export const CALIBRACAO_ATLAS = {
  /** Multiplicador da emissão das luzes de cidade no lado noturno da Terra. */
  EARTH_NIGHT_LIGHT_INTENSITY: 0.2,

  /** Opacidade da sombra analítica dos anéis projetada na superfície de Saturno. */
  RING_SHADOW_INTENSITY: 0.34,

  /** Multiplicador sobre a cor-base do material do sol (faixa HDR). */
  SUN_EMISSIVE_POWER: 2.7,

  /** Intensidade do brilho emissivo do material dos anéis. */
  RING_EMISSIVE_POWER: 0.2,

  /** Roughness padrão para superfícies planetárias sem mapa de roughness dedicado. */
  DEFAULT_PLANET_ROUGHNESS: 0.7,

  /**
   * Metalness padrão das superfícies planetárias.
   *
   * **0.0, e não é escolha artística.** Rocha, gelo e regolito são
   * dielétricos: a refletância especular em incidência normal é F0 ≈ 0.04 —
   * exatamente o que o BRDF do fluxo metalness assume em metalness 0. Acima
   * de 0 o mesmo fluxo reinterpreta a textura de albedo como refletância
   * complexa de condutor e REMOVE essa fração de energia do lobo difuso: no
   * 0.3 anterior do doador, toda superfície planetária do catálogo perdia
   * ~30% da resposta difusa direta para um lobo especular que nenhum
   * silicato ou gelo d'água tem.
   *
   * Corrigir para 0.0 move o pico do difuso direto linear ~1,43× no global
   * (1 / (1 − 0,3)). Foi por isso que o doador sequenciou essa correção
   * antes de toda outra onda de look: a exposição tem de assentar ANTES de
   * as ondas seguintes serem julgadas contra ela, para que uma mudança de
   * aparência continue atribuível à onda que a causou — lição que vale
   * igual quando o consumidor chegar na Onda 6.
   *
   * Corpo com fração de superfície genuinamente metálica (asteroide tipo M)
   * pediria override por registro, nunca mudança deste default global;
   * nenhum reivindica isso hoje.
   */
  DEFAULT_PLANET_METALNESS: 0.0,
} as const;

/** `t`: 0 = nome próprio (IAU), 1 = designação de Bayer. O rótulo do HUD
 *  escolhe por PROXIMIDADE, então sem o tier uma "κ Dra" perto empurraria
 *  Deneb para fora das sete vagas.
 *  `ci`: B-V (Onda 1a) — a cor das nomeadas vem da MESMA lei do catálogo
 *  (bvToColor), não de tabela por classe. `hd`/`hip`/`gl` (Onda 1g):
 *  identidade de catálogo, só nas nomeadas até a Decisão 2. */
export type NamedStar = {
  n: string; x: number; y: number; z: number; m: number; s: string; d: number; t?: number;
  ci?: number; hd?: number; hip?: number; gl?: string;
};
export type StarsMeta = {
  count: number;
  named: NamedStar[];
  /** raio coberto pelo catálogo (pc) — as cascas procedurais param de
   *  suprimir estrela real além dele (ver wrappedStars.ts) */
  horizonPc: number;
  /** magnitude aparente limite da fonte, vista do Sol */
  magLimit: number;
  ranges: { logd: [number, number]; lum: [number, number]; ci: [number, number] };
};

/** atributos já prontos para a GPU — nada é reempacotado depois */
export interface StarArrays {
  position: Float32Array; // 3N
  logLum: Float32Array; // N
  ci: Float32Array; // N
}

/**
 * Decodifica o formato "sc1" (scripts/data/build-star-catalog.mjs): 9 bytes
 * por estrela em CINCO SEÇÕES contíguas — lon u16, lat u16, log10(d) u16,
 * logLum u16, B−V u8. Direção em ângulo (não em x,y,z) porque o erro que
 * importa é ANGULAR: 65.536 passos dão ~20″, invisíveis numa PSF cujo piso
 * é 3,7 px. Float32 stride 6 custaria 24 B/estrela e comprime mal.
 */
function decodeStars(bin: ArrayBuffer, meta: StarsMeta): StarArrays {
  const n = meta.count;
  if (bin.byteLength !== n * 9) {
    throw new Error('O catálogo estelar está incompleto ou possui formato inválido.');
  }
  const lon = new Uint16Array(bin, 0, n);
  const lat = new Uint16Array(bin, n * 2, n);
  const logd = new Uint16Array(bin, n * 4, n);
  const lum = new Uint16Array(bin, n * 6, n);
  const ciRaw = new Uint8Array(bin, n * 8, n);

  const position = new Float32Array(n * 3);
  const logLum = new Float32Array(n);
  const ci = new Float32Array(n);
  const [logdMin, logdMax] = meta.ranges.logd;
  const [lumMin, lumMax] = meta.ranges.lum;
  const [ciMin, ciMax] = meta.ranges.ci;
  const kLogd = (logdMax - logdMin) / 65535;
  const kLum = (lumMax - lumMin) / 65535;
  const kCi = (ciMax - ciMin) / 255;
  for (let i = 0; i < n; i++) {
    const ra = lon[i] * (2 * Math.PI / 65535);
    const dec = lat[i] * (Math.PI / 65535) - Math.PI / 2;
    const d = 10 ** (logdMin + logd[i] * kLogd);
    const cosDec = Math.cos(dec);
    position[i * 3] = d * cosDec * Math.cos(ra);
    position[i * 3 + 1] = d * cosDec * Math.sin(ra);
    position[i * 3 + 2] = d * Math.sin(dec);
    logLum[i] = lumMin + lum[i] * kLum;
    ci[i] = ciMin + ciRaw[i] * kCi;
  }
  return { position, logLum, ci };
}

/**
 * Busca um .bin pelo irmão .gz e descomprime no CLIENTE. Existe porque o
 * GitHub Pages comprime texto e JSON na borda mas serve
 * application/octet-stream cru — e os .bin são 12,3 dos 13,3 MB do payload
 * (−26% medido com gzip nível 9; `npm run data:pack` gera os .gz).
 *
 * DecompressionStream devolve os MESMOS bytes do .bin original — os gates de
 * imagem não enxergam a troca. Qualquer falha do caminho comprimido (API
 * ausente, .gz não publicado, stream corrompido) cai para o arquivo cru, que
 * continua no lugar: o pior caso é voltar ao custo de ontem, nunca quebrar.
 */
export async function fetchBinary(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
  if (typeof DecompressionStream === 'function') {
    try {
      const response = await fetch(`${url}.gz`, { signal });
      if (response.ok) {
        // QUEM decide se ainda há gzip a desfazer são os BYTES, nunca um
        // header. O Vite serve .gz com Content-Encoding: gzip (o browser já
        // entrega descomprimido); o Pages serve o .gz opaco (chega cru de
        // verdade). A primeira versão assumia o segundo caso sempre — e no
        // dev o DecompressionStream estourava no que já era .bin, o catch
        // caía para o arquivo cru, e cada catálogo baixava DUAS vezes: o
        // fallback "seguro" custando mais que a ausência da feature.
        // Nenhum .bin do projeto começa com 1f 8b (conferido), e mesmo um
        // falso positivo só cai no catch e degrada para o cru.
        const buffer = await response.arrayBuffer();
        const head = new Uint8Array(buffer, 0, 2);
        if (head[0] !== 0x1f || head[1] !== 0x8b) return buffer;
        const stream = new Blob([buffer])
          .stream()
          .pipeThrough(new DecompressionStream('gzip'));
        return await new Response(stream).arrayBuffer();
      }
    } catch (error) {
      // aborto é do chamador e tem de subir; o resto degrada para o cru
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
    }
  }
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.arrayBuffer();
}

export async function loadStarData(
  signal?: AbortSignal
): Promise<{ stars: StarArrays; meta: StarsMeta }> {
  const base = import.meta.env.BASE_URL;
  const [bin, meta] = await Promise.all([
    fetchBinary(`${base}data/stars.bin`, signal).catch((error: Error) => {
      // o aborto tem de continuar SENDO aborto: o StrictMode monta o App duas
      // vezes em dev, e o dispose do primeiro Director aborta este fetch —
      // embrulhá-lo viraria tela de erro para um cancelamento de rotina
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new Error(`Catálogo estelar indisponível (${error.message}).`);
    }),
    fetch(`${base}data/stars_meta.json`, { signal }).then((response) => {
      if (!response.ok) throw new Error(`Metadados do catálogo indisponíveis (${response.status}).`);
      return response.json() as Promise<StarsMeta>;
    }),
  ]);
  return { stars: decodeStars(bin, meta), meta };
}
