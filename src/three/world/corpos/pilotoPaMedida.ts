// ============================================================
// PILOTO DE PÃ (E3 de PLAN-LUAS-PEQUENAS.md) — só com `?piloto=pa-medida`.
//
// Pã sai do ESCULPIDO (`esculpido.ts`) e entra pelo caminho do relevo
// medido do Hipérion (`rochoso.ts`, `RELEVO_DA_LUA`): esfera deslocada pelo
// mapa de altura + mapas de normal e de horizonte, a forma de Thomas, Joseph & Ansty 2018
// (`pan_30k_plt.tab`, PDS4 DOI 10.26033/ewy3-jy61) no referencial da IAU.
// Os mapas moram em `public/piloto/pa/` (fora do manifesto e de
// `public/data`): o corpo pede o manifesto de sempre e este módulo junta as
// entradas do piloto a ele. A receita dos mapas é
// `capturas/luas-pequenas/pa/gera-pa.mjs` (repositório principal); a cor é
// a de HOJE assada por direção, sem as quatro crateras sorteadas do
// esculpido.
//
// SEM O PARÂMETRO NADA MUDA: `PILOTO_PA_MEDIDA` é falso, as tabelas de
// `rochoso.ts` saem as mesmas e a orientação de Pã é a de
// `IAU_ORIENTATIONS.pan`, número por número.
// ============================================================
import { IAU_ORIENTATIONS, type IauOrientation } from '../../../lib/atlas/iauOrientation';
import type { BuscadorDeManifest, EntradaDeTextura, ManifestDeTexturas } from './texturas';

/** O interruptor — lido uma vez; `location` não existe no ambiente `node` do vitest. */
export const PILOTO_PA_MEDIDA =
  typeof location !== 'undefined' &&
  new URLSearchParams(location.search).get('piloto') === 'pa-medida';

/**
 * A faixa do byte de `height.png` em unidades do raio do app (14 km,
 * `BODY_AXES.pan`): raio 0,740482 a 1,450393 — 10,37 a 20,31 km, a grade
 * radial 512×256 suavizada a 1° de arco (a aresta média das placas é 1,9°).
 * `horizonte`: como o Hipérion, os dois mapas de horizonte — a crista é uma
 * aba que faz sombra no núcleo, e sem eles o núcleo abaixo dela acende.
 * Mas SÓ DO RELEVO (portão 2, `sombraSoDoRelevo`): o mapa mede o horizonte
 * sobre o plano RADIAL e o grampeia em ≥ 0, e em Pã a superfície chega a 65°
 * desse plano (as encostas da aba). Com o teste cru, todo ponto com o Sol
 * abaixo do plano radial apagava — e a encosta inclinada para o Sol estava
 * acesa: 12 % dos pixels acesos na pose norte da Cassini (N1867604669) e 16 %
 * na rasante saíam pretos, uma lua escura na borda que a foto não tem.
 */
export const RELEVO_DA_PA_MEDIDA = { escala: 0.709911, vies: -0.259518, horizonte: 'soDoRelevo' } as const;

/**
 * A ORIENTAÇÃO DE PÃ COM A FORMA MEDIDA. Pã gira em sincronia: o modelo vem
 * no referencial da IAU, longitude 0 = ponto sub-Saturno, e a ponta mais
 * comprida dele (20,3 km, a −0,6°E/+1,3°N) fica ali. A IAU (Archinal et al.
 * 2018, WGCCRE 2015) dá W = 48,8° + 626,0440000°·d — a taxa é a da órbita
 * DE VERDADE e o W₀ casa com a fase DE VERDADE. A órbita desta casa NÃO é
 * efeméride (`elementosOrbitais.ts`: M₀ = 0 em J2000 e n = 360/0,575 d =
 * 626,0869565°/d, "para onde a lua ESTÁ, isto não serve"), então o W da
 * IAU, aqui, erraria Saturno em 131° em J2000 e escorregaria 0,043°/dia
 * (mais de uma volta em 26 anos). O que vale é a regra da IAU — W anda com
 * a órbita e põe a longitude 0 de frente para Saturno — aplicada à órbita
 * desta casa: a taxa é a do registro (= a da órbita) e W₀ = 180°, porque
 * com W₀ = 0 o ponto sub-Saturno cai em 180°E (o meridiano-primo aponta
 * para FORA de Saturno). Prova: `pilotoPaMedida.test.ts`.
 */
export const ORIENTACAO_DA_PA_MEDIDA: IauOrientation = {
  ...IAU_ORIENTATIONS.pan,
  primeMeridianDeg: 180,
};

/** A orientação que o rochoso usa para `id` — a do piloto só para Pã com o interruptor ligado. */
export function orientacaoDoRochoso(id: string, piloto = PILOTO_PA_MEDIDA): IauOrientation {
  return piloto && id === 'pan' ? ORIENTACAO_DA_PA_MEDIDA : IAU_ORIENTATIONS[id];
}

/** As variantes do piloto: 2048 e 1024 onde o tier pede (`alvoDePixels`), a altura só em 1024 como a do Hipérion. */
export const ENTRADAS_DA_PA_MEDIDA: readonly EntradaDeTextura[] = [
  { corpo: 'pan', canal: 'map', arquivo: 'piloto/pa/map.jpg', larguraPx: 2048 },
  { corpo: 'pan', canal: 'map', arquivo: 'piloto/pa/map_1024.jpg', larguraPx: 1024 },
  { corpo: 'pan', canal: 'height', arquivo: 'piloto/pa/height.png', larguraPx: 1024 },
  { corpo: 'pan', canal: 'normal', arquivo: 'piloto/pa/normal.png', larguraPx: 2048 },
  { corpo: 'pan', canal: 'normal', arquivo: 'piloto/pa/normal_1024.png', larguraPx: 1024 },
  { corpo: 'pan', canal: 'horizon', arquivo: 'piloto/pa/horizon.png', larguraPx: 2048 },
  { corpo: 'pan', canal: 'horizon', arquivo: 'piloto/pa/horizon_1024.png', larguraPx: 1024 },
  { corpo: 'pan', canal: 'horizon2', arquivo: 'piloto/pa/horizon2.png', larguraPx: 2048 },
  { corpo: 'pan', canal: 'horizon2', arquivo: 'piloto/pa/horizon2_1024.png', larguraPx: 1024 },
];

/** O buscador do manifesto com as entradas do piloto juntadas às de sempre. */
export function comAPaMedida(buscar?: BuscadorDeManifest): BuscadorDeManifest {
  return async (url) => {
    let manifest: ManifestDeTexturas;
    if (buscar) {
      manifest = await buscar(url);
    } else {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
      manifest = (await r.json()) as ManifestDeTexturas;
    }
    return { ...manifest, entradas: [...manifest.entradas, ...ENTRADAS_DA_PA_MEDIDA] };
  };
}
