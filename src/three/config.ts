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

export type NamedStar = { n: string; x: number; y: number; z: number; m: number; s: string; d: number };
export type StarsMeta = { count: number; named: NamedStar[] };

export async function loadStarData(signal?: AbortSignal): Promise<{ positions: Float32Array; meta: StarsMeta }> {
  const base = import.meta.env.BASE_URL;
  const [bin, meta] = await Promise.all([
    fetch(`${base}data/stars.bin`, { signal }).then((response) => {
      if (!response.ok) throw new Error(`Catálogo HYG indisponível (${response.status}).`);
      return response.arrayBuffer();
    }),
    fetch(`${base}data/stars_meta.json`, { signal }).then((response) => {
      if (!response.ok) throw new Error(`Metadados HYG indisponíveis (${response.status}).`);
      return response.json() as Promise<StarsMeta>;
    }),
  ]);
  const positions = new Float32Array(bin);
  if (positions.length % 6 !== 0 || positions.length / 6 !== meta.count) {
    throw new Error('O catálogo HYG está incompleto ou possui formato inválido.');
  }
  return { positions, meta };
}
