// ============================================================
// AS RECEITAS DA LENTE — os reflexos DESENHADOS das três lentes do menu
// (Ajustes · Lente), no sistema de elementos da indústria (Sapphire, Nuke,
// Unity SRP): fantasma, anel, risco, brilho, raios e sujeira. O look
// development aprovado pelo dono em 08/10/2026 (capturas/lente/look/) é a
// referência; `passeDaLente.ts` desenha cada tipo como lá.
//
// Eixo dos elementos: centro = p·L, com L = posição do Sol em frações da
// ALTURA do quadro (origem no centro, v para cima); p = 1 na luz, 0 no
// centro, < 0 do outro lado. Tamanhos em frações da altura; cores RGB
// lineares.
//
// "redonda" e "anamorfica": posição, tamanho, aspecto, cromático, giro da
// íris e corte de cada fantasma SAEM DO MODELO FÍSICO (`optica.ts`, a fonte
// única): o centro do fantasma é linear na posição da fonte, então
// p = centro / posição da luz é constante, e o tamanho físico é comprimido
// por 0,11·(r/0,2)^0,55 para a corrente caber no quadro. A PINTURA (cor,
// intensidade, perfil) é escolha de arte, tabela fixa. "hollywood" é toda
// de arte.
// ============================================================

import type { ModoDaLente } from '../core/engine';
import { lente, type Lente, type NomeDaLente } from './optica';

export type NomeDoPreset = Exclude<ModoDaLente, 'nenhuma'>;
type Rgb = readonly [number, number, number];

/** Polígono arredondado ou círculo, perfil rosca (Nuke Flare), cromático, poeira e corte em crescente. */
export interface Fantasma {
  readonly tipo: 'fantasma';
  readonly p: number;
  readonly tamanho: number;
  /** largura/altura na TELA (oval anamórfica em pé < 1) */
  readonly aspecto: number;
  /** lâminas da íris (0 = círculo) e redondeza (0 = lados retos, 1 = círculo) */
  readonly laminas: number;
  readonly redondeza: number;
  readonly rotacao: number;
  /** raio relativo por canal (R, G, B) */
  readonly croma: Rgb;
  /** recorte por um círculo que anda com a luz (p, raio × tamanho, suavidade relativa) */
  readonly corte: { readonly p: number; readonly raio: number; readonly suave: number } | null;
  readonly semente: number;
  /** perfil: miolo (0–1), largura da borda, suavidade de fora e de dentro (frações do raio) */
  readonly miolo: number;
  readonly larguraBorda: number;
  readonly suaveFora: number;
  readonly suaveDentro: number;
  readonly poeira: number;
  readonly intensidade: number;
  readonly cor: Rgb;
}

/** Halo em anel com gradiente de arco-íris, mais forte do lado da luz. */
export interface Anel {
  readonly tipo: 'anel';
  /** 'quadro' = centro do quadro; 'eixo' = p·L */
  readonly centro: 'quadro' | 'eixo';
  readonly p: number;
  readonly raio: number;
  readonly espessura: number;
  readonly intensidade: number;
  readonly expoente: number;
  readonly saturacao: number;
  readonly cor: Rgb;
}

/** Risco anamórfico: núcleo fino + asas, cor de perto para longe, linhas paralelas. */
export interface Risco {
  readonly tipo: 'risco';
  readonly comprimento: number;
  readonly queda: number;
  readonly larguraNucleo: number;
  readonly larguraAsas: number;
  readonly intNucleo: number;
  readonly intAsas: number;
  readonly intParalelas: number;
  /** deslocamentos verticais das paralelas (até duas) */
  readonly paralelas: readonly number[];
  readonly corPerto: Rgb;
  readonly corLonge: Rgb;
}

/** Brilho da fonte: lóbulo justo (gaussiano) + lóbulo largo (lorentziano), esticável na horizontal. */
export interface Brilho {
  readonly tipo: 'brilho';
  readonly int1: number;
  readonly raio1: number;
  readonly cor1: Rgb;
  readonly int2: number;
  readonly raio2: number;
  readonly cor2: Rgb;
  readonly esticar: number;
}

/** Estrela de raios finos, com variação por raio (tabela assada) e cromático. */
export interface Raios {
  readonly tipo: 'raios';
  readonly numero: number;
  readonly comprimento: number;
  readonly largura: number;
  readonly alargar: number;
  readonly queda: number;
  readonly intensidade: number;
  readonly atenuacaoDisco: number;
  readonly jitterComprimento: number;
  readonly jitterAngulo: number;
  readonly jitterBrilho: number;
  readonly croma: Rgb;
  readonly cor: Rgb;
  readonly rotacao: number;
  readonly semente: number;
}

/** Sujeira em espaço de tela acesa por um borrão pesado do reflexo. */
export interface Sujeira {
  readonly tipo: 'sujeira';
  readonly intensidade: number;
  readonly cor: Rgb;
  /** σ do borrão da luz, em frações da altura */
  readonly borrao: number;
  readonly semente: number;
  readonly manchas: number;
  /** [célula, probabilidade, raio mínimo, raio máximo (× célula), amplitude] */
  readonly camadasDePo: readonly (readonly [number, number, number, number, number])[];
  readonly arcos: number;
  readonly intArcos: number;
}

export type Elemento = Fantasma | Anel | Risco | Brilho | Raios | Sujeira;

/** Gatilho de borda (Sapphire): perto da borda brilho × e tamanho ×; some depois da margem. */
export interface Borda {
  readonly zona: number;
  readonly ganhoBrilho: number;
  readonly ganhoTamanho: number;
  readonly margem: number;
}

export interface Preset {
  readonly borda: Borda;
  readonly elementos: readonly Elemento[];
}

/** Perfil-padrão de fantasma: todo parâmetro explícito. */
const F0 = {
  miolo: 0.4,
  larguraBorda: 0.12,
  suaveFora: 0.06,
  suaveDentro: 0.25,
  poeira: 0.25,
  intensidade: 0.03,
  cor: [1, 1, 1] as Rgb,
};

type Pintura = Partial<Omit<Fantasma, 'tipo'>>;

const fant = (o: Pintura): Fantasma => ({
  tipo: 'fantasma',
  p: 0,
  tamanho: 0.05,
  laminas: 0,
  redondeza: 1,
  rotacao: 0,
  aspecto: 1,
  croma: [1, 1, 1],
  corte: null,
  semente: 1,
  ...F0,
  ...o,
});

const comprimir = (r: number) => 0.11 * Math.pow(Math.max(r, 0) / 0.2, 0.55);

/**
 * As duas imagens que limitam um fantasma num eixo e canal: a íris recuada
 * à entrada e o disco frontal; centro por posição da luz (p) e raio, em
 * frações da altura. Como a lente cobre o quadro nativo em qualquer FOV
 * (`escalaDoCampo`: t_lente = k·t_app, k·tan(fov/2) = h/f_y), o FOV e o
 * aspecto se cancelam: p = (centro em mm por t)·S/f_y e r = raio em mm·S/(2h),
 * com S = esmagamento em x e 1 em y.
 */
function imagens(l: Lente, idx: number, canal: number, e: 'x' | 'y') {
  const f = l.fantasmas[idx];
  const As = f.As[canal][e];
  const Bs = f.Bs[canal][e];
  const Aa = f.Aa[canal][e];
  const Ba = f.Ba[canal][e];
  const S = e === 'x' ? l.esmagamento : 1;
  const porMm = S / (2 * l.meiaAlturaNativa);
  return {
    pIris: ((Bs - (As * Ba) / Aa) * S) / l.focal.y,
    rIris: ((Math.abs(As) * l.raioDaIris) / Math.abs(Aa)) * porMm,
    pFrente: (Bs * S) / l.focal.y,
    rFrente: Math.abs(As) * l.raioFrontal * porMm,
    vira: As / Aa < 0,
  };
}

const presa = (i: ReturnType<typeof imagens>) =>
  i.rIris < i.rFrente ? { p: i.pIris, r: i.rIris } : { p: i.pFrente, r: i.rFrente };

/** Um fantasma da lente física (índice em `lente(nome).fantasmas`), com a pintura de arte por cima. */
function derivado(nome: NomeDaLente, idx: number, pintura: Pintura): Fantasma {
  const l = lente(nome);
  const y = imagens(l, idx, 1, 'y');
  const py = presa(y);
  const px = presa(imagens(l, idx, 1, 'x'));
  const tam = comprimir(py.r);
  // cromático: razão do raio por canal sobre o verde, desvio dobrado para ler na tela, teto ±12 %
  const cr = (c: number) => {
    const q = presa(imagens(l, idx, c, 'y')).r / py.r;
    return 1 + Math.max(-0.12, Math.min(0.12, 2 * (q - 1)));
  };
  const s = tam / py.r;
  // corte (Unity SRP cutoff) = a imagem do disco frontal, quando a íris é que limita: anda com a luz
  const corte =
    nome === 'redonda' && y.rIris < y.rFrente
      ? { p: y.pIris + s * (y.pFrente - y.pIris), raio: y.rFrente / y.rIris, suave: 0.06 }
      : null;
  return fant({
    p: px.p,
    tamanho: tam,
    aspecto: px.r / py.r,
    laminas: l.laminas,
    redondeza: l.curvaturaDaIris,
    rotacao: l.rotacaoDaIris + (y.vira ? Math.PI : 0),
    croma: [cr(0), 1, cr(2)],
    corte,
    semente: idx * 1.37,
    ...pintura,
  });
}

function sujeira(o: Omit<Sujeira, 'tipo' | 'borrao'>): Sujeira {
  return { tipo: 'sujeira', borrao: 0.12, ...o };
}

const PO_LEVE = [
  [0.05, 0.3, 0.12, 0.35, 0.6],
  [0.02, 0.22, 0.1, 0.3, 0.4],
] as const;

function montar(nome: NomeDoPreset): Preset {
  const bordaComum: Borda = { zona: 0.2, ganhoBrilho: 1.5, ganhoTamanho: 1.2, margem: 0.12 };
  if (nome === 'redonda') {
    // prime esférica de cinema moderna (Gauss duplo Agfa, íris de 9 lâminas curvas): quente e discreta
    return {
      borda: bordaComum,
      elementos: [
        { tipo: 'brilho', int1: 1.3, raio1: 0.009, cor1: [1, 0.84, 0.62], int2: 0.045, raio2: 0.07, cor2: [1, 0.72, 0.45], esticar: 1 },
        // 18 raios finos e fracos (9 lâminas curvas, número ímpar dobra)
        {
          tipo: 'raios', numero: 18, comprimento: 0.15, largura: 0.0019, alargar: 1.5, queda: 2.2, intensidade: 0.22,
          atenuacaoDisco: 0.1, jitterComprimento: 0.3, jitterAngulo: 0.08, jitterBrilho: 0.4,
          croma: [1.05, 1, 0.95], cor: [1, 0.86, 0.66], rotacao: Math.PI / 2, semente: 3,
        },
        // orbe pequena e forte perto da luz, âmbar
        derivado('redonda', 5, { miolo: 1, larguraBorda: 0, suaveFora: 0.6, suaveDentro: 0.2, intensidade: 0.1, cor: [1, 0.62, 0.22], poeira: 0.1 }),
        // rosca magenta do lado da luz
        derivado('redonda', 7, { miolo: 0.25, larguraBorda: 0.12, suaveFora: 0.08, intensidade: 0.03, cor: [0.95, 0.32, 0.7] }),
        // rosca rosada sobre a luz
        derivado('redonda', 2, { miolo: 0.45, larguraBorda: 0.1, suaveFora: 0.1, intensidade: 0.018, cor: [1, 0.5, 0.62] }),
        // disco grande e fraco perto do centro, âmbar
        derivado('redonda', 6, { miolo: 0.85, larguraBorda: 0.1, suaveFora: 0.3, suaveDentro: 0.3, intensidade: 0.014, cor: [1, 0.72, 0.38], poeira: 0.35 }),
        // fantasma verde do outro lado
        derivado('redonda', 4, { miolo: 0.35, larguraBorda: 0.1, suaveFora: 0.06, intensidade: 0.04, cor: [0.5, 1, 0.38] }),
        // anel verde-água do outro lado
        derivado('redonda', 12, { miolo: 0.12, larguraBorda: 0.07, suaveFora: 0.05, intensidade: 0.026, cor: [0.35, 0.92, 0.62] }),
        // fantasma âmbar mais longe do outro lado
        derivado('redonda', 0, { miolo: 0.45, larguraBorda: 0.12, suaveFora: 0.07, intensidade: 0.036, cor: [1, 0.55, 0.25] }),
        // sujeira sutil acesa pelo reflexo borrado
        sujeira({ intensidade: 0.25, cor: [1, 0.92, 0.82], semente: 2.1, manchas: 0.3, camadasDePo: PO_LEVE, arcos: 2, intArcos: 0.12 }),
      ],
    };
  }
  if (nome === 'anamorfica') {
    // anamórfica Cooke (cilíndricas na frente, íris de 15 lâminas retas): risco azul-violeta dominante, fantasmas ovais em pé
    return {
      borda: bordaComum,
      elementos: [
        { tipo: 'brilho', int1: 1.2, raio1: 0.009, cor1: [0.88, 0.92, 1], int2: 0.05, raio2: 0.06, cor2: [0.6, 0.75, 1], esticar: 2.6 },
        // núcleo fino + asas, branco perto da luz e azul-violeta nas pontas, duas linhas paralelas fracas
        {
          tipo: 'risco', comprimento: 1.35, queda: 1.4, larguraNucleo: 0.0012, larguraAsas: 0.009, intNucleo: 1.6, intAsas: 0.14,
          intParalelas: 0.07, paralelas: [-0.03, 0.03], corPerto: [0.92, 0.95, 1], corLonge: [0.38, 0.32, 1],
        },
        // 30 raios muito curtos e fracos (15 lâminas retas)
        {
          tipo: 'raios', numero: 30, comprimento: 0.06, largura: 0.0012, alargar: 1, queda: 2.5, intensidade: 0.12,
          atenuacaoDisco: 0.1, jitterComprimento: 0.3, jitterAngulo: 0.05, jitterBrilho: 0.4,
          croma: [1.04, 1, 0.96], cor: [0.85, 0.9, 1], rotacao: Math.PI / 2, semente: 5,
        },
        // oval em pé âmbar entre a luz e o centro
        derivado('anamorfica', 7, { miolo: 0.4, larguraBorda: 0.12, intensidade: 0.03, cor: [1, 0.62, 0.25] }),
        // oval pequena azul perto da luz
        derivado('anamorfica', 17, { miolo: 0.7, larguraBorda: 0.15, suaveFora: 0.15, intensidade: 0.05, cor: [0.35, 0.55, 1] }),
        // oval verde-azulada perto do centro
        derivado('anamorfica', 32, { miolo: 0.3, larguraBorda: 0.1, intensidade: 0.02, cor: [0.25, 0.85, 0.9] }),
        // oval verde-água do outro lado
        derivado('anamorfica', 24, { miolo: 0.3, larguraBorda: 0.1, intensidade: 0.024, cor: [0.3, 0.95, 0.75] }),
        // oval azul mais longe do outro lado
        derivado('anamorfica', 44, { miolo: 0.35, larguraBorda: 0.1, intensidade: 0.02, cor: [0.32, 0.5, 1] }),
        // oval alta violeta além da luz
        derivado('anamorfica', 40, { miolo: 0.25, larguraBorda: 0.12, intensidade: 0.014, cor: [0.6, 0.42, 1] }),
        // disco grande e muito fraco, azul, do outro lado
        derivado('anamorfica', 0, { miolo: 0.9, larguraBorda: 0.1, suaveFora: 0.4, suaveDentro: 0.3, intensidade: 0.006, cor: [0.35, 0.5, 1], poeira: 0.4 }),
        sujeira({
          intensidade: 0.2, cor: [0.85, 0.9, 1], semente: 4.3, manchas: 0.25,
          camadasDePo: [PO_LEVE[0], [0.02, 0.2, 0.1, 0.3, 0.4]], arcos: 1, intArcos: 0.1,
        }),
      ],
    };
  }
  // preset de artista: brilho dourado com muitos raios, corrente rica de hexágonos e orbes, halo arco-íris, sujeira visível
  const hexa = { laminas: 6, redondeza: 0.12, rotacao: 0.2 };
  return {
    borda: { zona: 0.25, ganhoBrilho: 1.8, ganhoTamanho: 1.3, margem: 0.15 },
    elementos: [
      { tipo: 'brilho', int1: 2.2, raio1: 0.013, cor1: [1, 0.8, 0.5], int2: 0.14, raio2: 0.1, cor2: [1, 0.62, 0.28], esticar: 1 },
      // muitos raios finos de comprimentos variados — curtos e fracos desde 09/10 (ele, pela
      // prancha `capturas/hollywood-raios/`: "B — bem menos"; antes 0,42 e 0,7, "um pouco exagerados")
      {
        tipo: 'raios', numero: 64, comprimento: 0.21, largura: 0.0011, alargar: 1, queda: 2, intensidade: 0.35,
        atenuacaoDisco: 0.08, jitterComprimento: 0.8, jitterAngulo: 0.7, jitterBrilho: 0.7,
        croma: [1.06, 1, 0.94], cor: [1, 0.85, 0.6], rotacao: 0, semente: 7,
      },
      // halo arco-íris em volta do centro do quadro, mais forte do lado da luz
      { tipo: 'anel', centro: 'quadro', p: 0, raio: 0.36, espessura: 0.03, intensidade: 0.05, expoente: 3, saturacao: 0.9, cor: [1, 1, 1] },
      // risco azul fraco pela luz
      {
        tipo: 'risco', comprimento: 0.9, queda: 2, larguraNucleo: 0.0011, larguraAsas: 0.006, intNucleo: 0.5, intAsas: 0.05,
        intParalelas: 0, paralelas: [], corPerto: [0.9, 0.95, 1], corLonge: [0.35, 0.45, 1],
      },
      // orbe pequena além da luz, dourada
      fant({ p: 1.35, tamanho: 0.018, miolo: 1, larguraBorda: 0, suaveFora: 0.9, intensidade: 0.25, cor: [1, 0.7, 0.3], semente: 1.1 }),
      // hexágono verde-azulado perto da luz
      fant({ ...hexa, p: 0.78, tamanho: 0.05, miolo: 0.35, larguraBorda: 0.15, intensidade: 0.05, cor: [0.2, 0.8, 0.8], croma: [1.04, 1, 0.96], semente: 2.2 }),
      // anel fino magenta
      fant({ p: 0.62, tamanho: 0.12, miolo: 0.05, larguraBorda: 0.05, suaveFora: 0.03, suaveDentro: 0.05, intensidade: 0.05, cor: [0.9, 0.25, 0.8], semente: 3.3 }),
      // orbe pequena e forte, verde
      fant({ p: 0.45, tamanho: 0.012, miolo: 1, larguraBorda: 0, suaveFora: 0.8, intensidade: 0.3, cor: [0.5, 1, 0.4], semente: 4.4 }),
      // hexágono âmbar
      fant({ ...hexa, p: 0.3, tamanho: 0.075, miolo: 0.5, intensidade: 0.045, cor: [1, 0.55, 0.15], semente: 5.5 }),
      // hexágono pequeno violeta perto do centro
      fant({ ...hexa, p: 0.12, tamanho: 0.03, miolo: 0.6, intensidade: 0.07, cor: [0.6, 0.35, 1], semente: 6.6 }),
      // orbe verde-azulada logo depois do centro
      fant({ p: -0.1, tamanho: 0.02, miolo: 1, larguraBorda: 0, suaveFora: 0.8, intensidade: 0.15, cor: [0.2, 0.9, 0.8], semente: 7.7 }),
      // disco grande e fraco, quente
      fant({ p: -0.25, tamanho: 0.26, miolo: 0.9, suaveFora: 0.35, suaveDentro: 0.3, intensidade: 0.016, cor: [1, 0.75, 0.45], poeira: 0.4, semente: 8.8 }),
      // hexágono magenta com borda arco-íris
      fant({ ...hexa, p: -0.45, tamanho: 0.09, miolo: 0.3, larguraBorda: 0.12, intensidade: 0.04, cor: [0.95, 0.3, 0.6], croma: [1.06, 1, 0.94], semente: 9.9 }),
      // anel fino verde com franja arco-íris
      fant({ p: -0.7, tamanho: 0.16, miolo: 0.05, larguraBorda: 0.04, suaveFora: 0.03, suaveDentro: 0.05, intensidade: 0.035, cor: [0.4, 0.95, 0.5], croma: [1.05, 1, 0.95], semente: 10.1 }),
      // hexágono grande dourado do outro lado
      fant({ ...hexa, p: -1.0, tamanho: 0.14, miolo: 0.45, intensidade: 0.03, cor: [1, 0.65, 0.25], poeira: 0.35, semente: 11.2 }),
      // sujeira visível: manchas, pó em bokeh e riscos de limpeza
      sujeira({
        intensidade: 1.1, cor: [1, 0.9, 0.75], semente: 6.7, manchas: 0.5,
        camadasDePo: [[0.05, 0.45, 0.12, 0.38, 0.7], [0.02, 0.35, 0.1, 0.3, 0.5]], arcos: 4, intArcos: 0.25,
      }),
    ],
  };
}

const cache = new Map<NomeDoPreset, Preset>();

/** A receita de uma lente do menu, montada (e derivada da óptica) na primeira vez que é pedida. */
export function presetDaLente(nome: NomeDoPreset): Preset {
  let p = cache.get(nome);
  if (!p) {
    p = montar(nome);
    cache.set(nome, p);
  }
  return p;
}
