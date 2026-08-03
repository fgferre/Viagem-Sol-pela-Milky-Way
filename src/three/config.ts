// ============================================================
// Configuração central do mundo — escala em parsecs (pc)
// Editar aqui muda o comportamento de todos os módulos.
// ============================================================

export const WORLD = {
  // Sol artístico (escala real seria invisível: 2.3e-8 pc)
  sunRadius: 0.011,

  // "Corações" de nuvens ao longo do corredor da viagem: [x, y, z, raio pc]
  // Posicionados no corredor Sol → Sirius → Bellatrix → Betelgeuse → Rigel
  nebulaCores: [
    [2.0, 8.0, -1.5, 9.0],
    [8.0, 30.0, 2.0, 16.0],
    [12.0, 62.0, 7.0, 15.0],
    [7.0, 105.0, 14.0, 20.0],
    [5.5, 132.0, 18.0, 24.0], // região HII hero no mergulho, iluminada em H-alfa
    [15.0, 159.0, 27.0, 14.0], // além de Betelgeuse — rim iluminado por ela
    [35.0, 215.0, -8.0, 26.0],
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
