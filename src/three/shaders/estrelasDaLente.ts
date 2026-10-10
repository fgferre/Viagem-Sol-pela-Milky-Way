// ============================================================
// AS ESTRELAS SEGUEM A LENTE (PLAN-ESTRELAS-E-INSTRUMENTO, item 2). A
// decisão do dono de 09/10, diante das pranchas: "Sim na Redonda e
// Anamórfica" — nessas duas as estrelas seguem a lente SEM porta nenhuma;
// com 'hollywood' e 'nenhuma' fica a cruz de hoje. A porta `?estrelaslente=`
// é bancada e caminho de volta, no idioma de `?bemis=`: `0` desliga nas três
// (o texto dos desenhistas sai byte a byte o de antes, e nenhum uniforme
// entra), `1` liga nas três — é por ela que o dono vê a Hollywood antes de
// ela entrar.
//
// O QUE TROCA. A cruz de dois braços — a do `STAR_FRAG` (catálogo, cascas e
// os dez corpos) e a da receita do filme (as 16 heroes e o clarão do Sol) —
// dá lugar aos FINOS da lente escolhida em Ajustes: os raios das lâminas e o
// risco anamórfico de `lente/presets.ts`, com a MESMA conta do passe da
// lente, a MESMA tabela de variação por raio e a MESMA largura mínima. Núcleo
// e halo ficam como estão; brilho, fantasmas, anéis e sujeira da receita são
// do quadro, não da estrela.
//
// DERIVADO DA RECEITA, NÃO ARTE NOVA. Escala: o fino que carrega MAIS LUZ na
// receita alcança a borda do sprite (r = 1) e o resto vem na proporção da
// receita — comprimentos, larguras, paralelas; número, giro e variação dos
// raios; cromático; cores —, com um fino mais comprido que o sprite encolhido
// até a borda. Energia: a assinatura sai com energia de LUMINÂNCIA 1
// (Rec. 709) e cada desenhista a multiplica pela energia que a SUA cruz
// deposita hoje, lida do próprio texto do shader — ela TROCA a luz da cruz,
// não soma. A barra de força da lente (`definirForcaDaLente`) NÃO chega aqui:
// a força é do reflexo do quadro, e a estrela fica com a energia da cruz.
// ============================================================
import * as THREE from 'three';
import type { ModoDaLente } from '../core/engine';
import { presetDaLente, type Raios, type Risco } from '../lente/presets';
import { LARGURA_MINIMA_PX, MAX_RAIOS, variacaoDoRaio } from '../lente/passeDaLente';
import { GLSL_BRANCO_DO_NUCLEO, glslBracosDeDifracao, glslNucleoEHalo } from './common';

/**
 * A porta `?estrelaslente=`, no idioma de `?bemis=`: o mesmo binário dos dois
 * lados. `0` desliga em toda lente (o caminho de volta), `1` liga nas três
 * (a bancada da Hollywood); ausente, vazia ou lixo é o padrão da casa.
 * PURA (recebe a query), como `lerBetaDaEmissao`.
 */
export type PortaEstrelasLente = 'padrao' | 'desligada' | 'todas';
export function lerPortaEstrelasLente(busca: string): PortaEstrelasLente {
  const v = new URLSearchParams(busca).get('estrelaslente');
  return v === '0' ? 'desligada' : v === '1' ? 'todas' : 'padrao';
}

/** Lida UMA vez. O guarda de `window` é o de `BETA_DA_EMISSAO` (a suíte roda em `node`). */
export const PORTA_ESTRELAS_LENTE = lerPortaEstrelasLente(
  typeof window === 'undefined' ? '' : window.location.search
);

/** A assinatura entra nos shaders — em todo caminho menos o de volta (`?estrelaslente=0`). */
export const ESTRELAS_SEGUEM_A_LENTE = PORTA_ESTRELAS_LENTE !== 'desligada';

/** As lentes em que as estrelas seguem a lente sem porta: a decisão do dono de 09/10. */
export const LENTES_COM_ESTRELAS_POR_PADRAO: readonly ModoDaLente[] = ['redonda', 'anamorfica'];

/** Esta lente, sob esta porta, troca a cruz das estrelas pela assinatura? */
export function estrelasSeguemALente(modo: ModoDaLente, porta: PortaEstrelasLente): boolean {
  if (modo === 'nenhuma' || porta === 'desligada') return false;
  return porta === 'todas' || LENTES_COM_ESTRELAS_POR_PADRAO.includes(modo);
}

type Rgb = readonly [number, number, number];
const LUMA: Rgb = [0.2126, 0.7152, 0.0722];
const luma = (c: Rgb) => c[0] * LUMA[0] + c[1] * LUMA[1] + c[2] * LUMA[2];
const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const RAIZ_PI = Math.sqrt(Math.PI);

/** Os raios das lâminas em unidades do sprite (r = 1 na borda). */
export interface RaiosDaEstrela {
  readonly numero: number;
  readonly comprimento: number;
  readonly largura: number;
  readonly alargar: number;
  readonly queda: number;
  readonly intensidade: number;
  readonly rotacao: number;
  readonly croma: Rgb;
  readonly cor: Rgb;
  /** por raio: desvio do ângulo (em setores), comprimento e brilho relativos */
  readonly tabela: readonly (readonly [number, number, number])[];
}

/** O risco anamórfico (horizontal) em unidades do sprite. */
export interface RiscoDaEstrela {
  readonly comprimento: number;
  readonly queda: number;
  readonly larguraNucleo: number;
  readonly larguraAsas: number;
  readonly intNucleo: number;
  readonly intAsas: number;
  readonly intParalelas: number;
  readonly paralelas: readonly number[];
  readonly corPerto: Rgb;
  readonly corLonge: Rgb;
}

export interface AssinaturaDaLente {
  readonly raios: RaiosDaEstrela | null;
  readonly risco: RiscoDaEstrela | null;
}

/** ∫ dos raios no plano, em luminância — a conta do passe: (1 − a)^queda ao longo, gaussiana
 *  de largura·(1 + a·alargar) de través, comprimento × croma por canal. */
export function energiaDosRaios(r: RaiosDaEstrela): number {
  const ao = 1 / (r.queda + 1) + r.alargar / ((r.queda + 1) * (r.queda + 2));
  let soma = 0;
  for (const [, comp, brilho] of r.tabela) soma += comp * brilho;
  const cor: Rgb = [r.cor[0] * r.croma[0], r.cor[1] * r.croma[1], r.cor[2] * r.croma[2]];
  return r.intensidade * RAIZ_PI * r.largura * r.comprimento * ao * soma * luma(cor);
}

/** ∫ do risco no plano, em luminância — a conta do passe, integrada ao longo numericamente. */
export function energiaDoRisco(s: RiscoDaEstrela): number {
  const N = 2000;
  let soma = 0;
  for (let i = 0; i < N; i++) {
    const a = (i + 0.5) / N;
    const queda = Math.exp(-a * s.queda) * (1 - suave(0.55, 1, a));
    const t = suave(0, 0.6, a);
    const cor: Rgb = [0, 1, 2].map((c) => s.corPerto[c] + (s.corLonge[c] - s.corPerto[c]) * t) as unknown as Rgb;
    const travessa =
      s.intNucleo * s.larguraNucleo * (1 + a) +
      s.intAsas * s.larguraAsas +
      s.intParalelas * 1.5 * s.larguraNucleo * s.paralelas.length * Math.exp(-1.5 * a);
    soma += queda * travessa * luma(cor);
  }
  return (2 * s.comprimento * RAIZ_PI * soma) / N;
}

/** Os raios da receita numa escala do sprite (`e` = unidades do sprite por fração da altura). */
export function raiosNaEscala(r: Raios, n: number, e: number): RaiosDaEstrela {
  return {
    numero: n,
    comprimento: r.comprimento * e,
    largura: r.largura * e,
    alargar: r.alargar,
    queda: r.queda,
    intensidade: r.intensidade,
    rotacao: r.rotacao,
    croma: r.croma,
    cor: r.cor,
    tabela: Array.from({ length: n }, (_, k) => variacaoDoRaio(r, k)),
  };
}

/** O risco da receita na mesma escala. */
export function riscoNaEscala(s: Risco, e: number): RiscoDaEstrela {
  return {
    comprimento: s.comprimento * e,
    queda: s.queda,
    larguraNucleo: s.larguraNucleo * e,
    larguraAsas: s.larguraAsas * e,
    intNucleo: s.intNucleo,
    intAsas: s.intAsas,
    intParalelas: s.intParalelas,
    paralelas: s.paralelas.slice(0, 2).map((y) => y * e),
    corPerto: s.corPerto,
    corLonge: s.corLonge,
  };
}

/**
 * A assinatura de uma lente numa estrela, derivada da receita e normalizada
 * para energia de luminância 1. `null` = a cruz de hoje ('nenhuma', ou uma
 * receita sem raios nem risco).
 *
 * QUEM MEDE A ESTRELA é o fino que carrega mais luz na receita: ele alcança a
 * borda do sprite. Na Redonda (só raios) e na Anamórfica (o risco leva 98 %)
 * é o fino mais comprido, como no protótipo aprovado. Na Hollywood os 64 raios
 * levam 85 % e o risco fraco é 2,1× mais comprido que eles: medida pelo risco,
 * a estrela punha os raios na metade de dentro do sprite, enterrados no núcleo
 * e no halo (a prancha de 09/10, "Sirius vira bola com um fio azul"). O fino
 * que passar da borda encolhe até ela — o sprite descarta r > 1, e a ponta
 * suave do fino tem de caber nele em vez de ser cortada — e leva junto a luz
 * que tinha: cada fino fica com a sua parte da energia da receita.
 */
export function assinaturaDaLente(modo: ModoDaLente): AssinaturaDaLente | null {
  if (modo === 'nenhuma') return null;
  const elementos = presetDaLente(modo).elementos;
  const r = elementos.find((e): e is Raios => e.tipo === 'raios');
  const s = elementos.find((e): e is Risco => e.tipo === 'risco');
  const n = r ? Math.min(MAX_RAIOS, Math.max(1, Math.round(r.numero))) : 0;
  const cromaMax = r ? Math.max(...r.croma) : 1;
  const pontaDosRaios = r ? r.comprimento * cromaMax : 0;
  const pontaDoRisco = s ? s.comprimento : 0;
  // a energia de cada fino na escala da receita (as duas crescem com e², a razão não depende dela)
  const luzDosRaios = r && pontaDosRaios > 0 ? energiaDosRaios(raiosNaEscala(r, n, 1)) : 0;
  const luzDoRisco = s && pontaDoRisco > 0 ? energiaDoRisco(riscoNaEscala(s, 1)) : 0;
  const mede = luzDosRaios >= luzDoRisco ? pontaDosRaios : pontaDoRisco;
  if (!(mede > 0)) return null;
  const e = 1 / mede;
  const raiosCheios = luzDosRaios > 0 && r ? raiosNaEscala(r, n, e) : null;
  const raios: RaiosDaEstrela | null = raiosCheios && {
    ...raiosCheios,
    comprimento: Math.min(raiosCheios.comprimento, 1 / cromaMax),
  };
  const riscoCheio = luzDoRisco > 0 && s ? riscoNaEscala(s, e) : null;
  const risco: RiscoDaEstrela | null = riscoCheio && {
    ...riscoCheio,
    comprimento: Math.min(riscoCheio.comprimento, 1),
  };
  // energia 1 no total, repartida como na receita
  const total = luzDosRaios + luzDoRisco;
  const kR = raios ? luzDosRaios / total / energiaDosRaios(raios) : 0;
  const kS = risco ? luzDoRisco / total / energiaDoRisco(risco) : 0;
  return {
    raios: raios && { ...raios, intensidade: raios.intensidade * kR },
    risco: risco && {
      ...risco,
      intNucleo: risco.intNucleo * kS,
      intAsas: risco.intAsas * kS,
      intParalelas: risco.intParalelas * kS,
    },
  };
}

// ─── a energia que cada cruz deposita hoje, lida do texto do shader ─────────

/** ∫ de f(x, y) no disco unitário (o sprite descarta r > 1), por simetria num quadrante. */
function noDisco(f: (x: number, y: number) => number): number {
  const N = 600;
  const h = 1 / N;
  let soma = 0;
  for (let i = 0; i < N; i++) {
    const x = (i + 0.5) * h;
    for (let j = 0; j < N; j++) {
      const y = (j + 0.5) * h;
      if (x * x + y * y <= 1) soma += f(x, y);
    }
  }
  return 4 * soma * h * h;
}

const numeros = (texto: string) => (texto.match(/\d+\.\d+/g) ?? []).map(Number);

const BRACO = /float ax = exp\(-abs\(uv\.y\) \* (\d+\.\d+)\) \* exp\(-abs\(uv\.x\) \* (\d+\.\d+)\);/;

/** A cruz do `STAR_FRAG`: depósito linear (alfa 1), × a dose `amp` que fica de fora. */
export function energiaDaCruzDoPonto(frag: string): number {
  const m = BRACO.exec(frag);
  if (!m) throw new Error('estrelaslente: a cruz do STAR_FRAG mudou de forma');
  const [estreita, longa] = [Number(m[1]), Number(m[2])];
  return noDisco((x, y) => Math.exp(-estreita * y - longa * x) + Math.exp(-estreita * x - longa * y));
}

/**
 * A cruz da receita do filme (heroes e clarão): o alfa é clamp(núcleo + halo +
 * braços) e o blend é SRC_ALPHA·ONE, então o que a cruz acrescenta é o
 * depósito com ela menos o depósito sem ela (estrela branca, Y = 1).
 */
export function energiaDaCruzDaReceita(): number {
  if (energiaDaReceita === null) energiaDaReceita = medirACruzDaReceita();
  return energiaDaReceita;
}
let energiaDaReceita: number | null = null;

function medirACruzDaReceita(): number {
  const [kN, aN, kH, aH] = numeros(glslNucleoEHalo());
  const b = numeros(glslBracosDeDifracao());
  const branco = numeros(GLSL_BRANCO_DO_NUCLEO);
  if (b.length !== 5 || branco.length !== 3) throw new Error('estrelaslente: a receita do filme mudou de forma');
  const [estreita, longa, , , ganho] = b;
  const yb = luma(branco as unknown as Rgb);
  return noDisco((x, y) => {
    const r = Math.hypot(x, y);
    const core = Math.exp(-r * r * kN) * aN;
    const glow = Math.exp(-r * kH) * aH;
    const s = (Math.exp(-estreita * y - longa * x) + Math.exp(-estreita * x - longa * y)) * ganho;
    const com = (yb * core + glow + s) * Math.min(1, core + glow + s);
    const sem = (yb * core + glow) * Math.min(1, core + glow);
    return com - sem;
  });
}

// ─── o GLSL ─────────────────────────────────────────────────────────────────

const f = (x: number) => x.toFixed(6);
/** Vizinhos de cada lado somados no máximo — sem passar da metade da roda (o de 180° não conta). */
const MAX_VIZINHOS = Math.floor((MAX_RAIOS - 1) / 2);

/** Os uniformes e a função da assinatura, em unidades do sprite. `uvPorPx` dá a largura mínima. */
const GLSL_ASSINATURA = /* glsl */ `
// a assinatura da lente numa estrela (shaders/estrelasDaLente.ts)
uniform vec4 uAssinaturaRaios;        // numero, comprimento, largura, alargar
uniform vec4 uAssinaturaRaiosLuz;     // queda, intensidade, rotacao, tem raios
uniform vec3 uAssinaturaRaiosCroma;
uniform vec3 uAssinaturaRaiosCor;
uniform vec3 uAssinaturaRaiosTabela[${MAX_RAIOS}];
uniform vec4 uAssinaturaRisco;        // comprimento, queda, larguraNucleo, larguraAsas
uniform vec4 uAssinaturaRiscoInt;     // nucleo, asas, paralelas, tem risco
uniform vec3 uAssinaturaRiscoParalelas; // y1, y2, quantas
uniform vec3 uAssinaturaRiscoCorPerto;
uniform vec3 uAssinaturaRiscoCorLonge;

float gaussDaAssinatura(float x) { return exp(-x * x); }

vec3 assinaturaDaLente(vec2 uv, float uvPorPx) {
  float wMin = ${f(LARGURA_MINIMA_PX)} * uvPorPx;
  float d = length(uv);
  vec3 c = vec3(0.0);
  vec3 croma = uAssinaturaRaiosCroma;
  float comp = uAssinaturaRaios.y;
  if (uAssinaturaRaiosLuz.w > 0.5 && d > 1e-7 && d < comp * max(max(croma.r, croma.g), croma.b)) {
    float n = uAssinaturaRaios.x;
    float setor = 6.2831853 / n;
    float kf = (atan(uv.y, uv.x) + uAssinaturaRaiosLuz.z) / setor;
    float k = floor(kf + 0.5);
    float largura = max(uAssinaturaRaios.z, wMin);
    float m = uAssinaturaRaiosLuz.y * (uAssinaturaRaios.z / largura);
    // o passe da lente soma só o raio mais perto; aqui somam os vizinhos que a
    // gaussiana alcança — no sprite pequeno os raios ficam mais juntos que a
    // largura mínima, e só o mais perto perdia até 4/5 da luz (medido)
    float alcance = 3.0 * largura * (1.0 + uAssinaturaRaios.w) / (d * setor) + 1.0;
    int vizinhos = int(min(ceil(alcance), floor((n - 1.0) * 0.5)));
    for (int i = 0; i <= ${2 * MAX_VIZINHOS}; i++) {
      if (i > 2 * vizinhos) break;
      float j = k + float(i - vizinhos);
      vec3 h = uAssinaturaRaiosTabela[int(clamp(mod(j, n), 0.0, n - 1.0) + 0.5)];
      float perp = d * abs((kf - j - h.x) * setor);
      float lk = max(comp * h.y, 1e-6);
      vec3 ao = d / (lk * croma);
      vec3 w = largura * (1.0 + ao * uAssinaturaRaios.w);
      vec3 atravessa = exp(-(perp / w) * (perp / w));
      c += m * h.z * pow(max(1.0 - ao, 0.0), vec3(uAssinaturaRaiosLuz.x)) * atravessa * uAssinaturaRaiosCor
        * (1.0 - step(1.0, ao));
    }
  }
  if (uAssinaturaRiscoInt.w > 0.5) {
    float ao = abs(uv.x) / max(uAssinaturaRisco.x, 1e-6);
    if (ao < 1.0) {
      float lN0 = uAssinaturaRisco.z;
      float lA0 = uAssinaturaRisco.w;
      float lN = max(lN0, wMin);
      float lA = max(lA0, wMin);
      float lP = max(lN0 * 1.5, wMin);
      float queda = exp(-ao * uAssinaturaRisco.y) * (1.0 - smoothstep(0.55, 1.0, ao));
      float nucleo = (lN0 / lN) * gaussDaAssinatura(uv.y / (lN * (1.0 + ao)));
      float asas = (lA0 / lA) * gaussDaAssinatura(uv.y / lA);
      vec3 p = uAssinaturaRiscoParalelas;
      float par = 0.0;
      if (p.z > 0.5) par += gaussDaAssinatura((uv.y - p.x) / lP);
      if (p.z > 1.5) par += gaussDaAssinatura((uv.y - p.y) / lP);
      par *= lN0 * 1.5 / lP;
      float val = queda * (uAssinaturaRiscoInt.x * nucleo + uAssinaturaRiscoInt.y * asas
        + uAssinaturaRiscoInt.z * par * exp(-ao * 1.5));
      c += val * mix(uAssinaturaRiscoCorPerto, uAssinaturaRiscoCorLonge, smoothstep(0.0, 0.6, ao));
    }
  }
  return c;
}
`;

/** Troca `de` por `para` exigindo UMA ocorrência: se o shader mudar de forma, o módulo grita no load. */
function trocarUmaVez(texto: string, de: string, para: string): string {
  const i = texto.indexOf(de);
  if (i < 0 || texto.indexOf(de, i + 1) >= 0) {
    throw new Error(`estrelaslente: "${de.slice(0, 48)}" não aparece UMA vez no shader`);
  }
  return texto.slice(0, i) + para + texto.slice(i + de.length);
}

const comAFuncao = (frag: string) => trocarUmaVez(frag, 'void main() {', `${GLSL_ASSINATURA}\nvoid main() {`);

/** O `STAR_FRAG` com a cruz trocada pela assinatura (a dose `amp` é a mesma). */
export function pontoSegueALente(frag: string): string {
  const energia = energiaDaCruzDoPonto(frag);
  let t = comAFuncao(frag);
  t = trocarUmaVez(t, 'float spike = 0.0;', 'vec3 spikeRgb = vec3(0.0);');
  t = trocarUmaVez(
    t,
    'spike = (ax + ay) * amp;',
    `spikeRgb = amp * ${f(energia)} * assinaturaDaLente(uv, 1.0 / max(vMeiaPx, 1e-6));`
  );
  return trocarUmaVez(t, 'vColor * spike;', 'vColor * spikeRgb;');
}

/**
 * A receita do filme (heroes, clarão) com a cruz trocada pela assinatura. O
 * depósito vira linear — alfa 1, núcleo e halo pré-multiplicados pelo alfa que
 * tinham sem a cruz —, e a assinatura deposita exatamente o que a cruz
 * acrescentava. `uvPorPx`: expressão GLSL avaliada
 * ANTES do discard (derivada em fluxo uniforme).
 */
export function receitaSegueALente(frag: string, uvPorPx: string): string {
  const energia = energiaDaCruzDaReceita();
  let t = comAFuncao(frag);
  t = trocarUmaVez(t, 'vec2 uv = vUv;', `vec2 uv = vUv;\n  float uvPorPx = ${uvPorPx};`);
  t = trocarUmaVez(t, 'clamp(core + glow + spikes, 0.0, 1.0)', 'alfaDaReceita');
  t = trocarUmaVez(t, '(glow + spikes)', '(glow + spikesRgb)');
  return trocarUmaVez(
    t,
    glslBracosDeDifracao(),
    `${glslBracosDeDifracao()}
  float alfaSemACruz = clamp(core + glow, 0.0, 1.0);
  core *= alfaSemACruz;
  glow *= alfaSemACruz;
  vec3 spikesRgb = ${f(energia)} * assinaturaDaLente(uv, uvPorPx);
  float alfaDaReceita = 1.0;`
  );
}

// ─── os uniformes: os MESMOS objetos em todo material ──────────────────────

const v3 = (c: Rgb) => new THREE.Vector3(c[0], c[1], c[2]);
const uniformes = {
  uAssinaturaRaios: { value: new THREE.Vector4(1, 0, 0, 0) },
  uAssinaturaRaiosLuz: { value: new THREE.Vector4() },
  uAssinaturaRaiosCroma: { value: new THREE.Vector3(1, 1, 1) },
  uAssinaturaRaiosCor: { value: new THREE.Vector3() },
  uAssinaturaRaiosTabela: { value: Array.from({ length: MAX_RAIOS }, () => new THREE.Vector3(0, 1, 1)) },
  uAssinaturaRisco: { value: new THREE.Vector4(1, 0, 0, 0) },
  uAssinaturaRiscoInt: { value: new THREE.Vector4() },
  uAssinaturaRiscoParalelas: { value: new THREE.Vector3() },
  uAssinaturaRiscoCorPerto: { value: new THREE.Vector3() },
  uAssinaturaRiscoCorLonge: { value: new THREE.Vector3() },
};

/** Para espalhar no `uniforms` de cada material que desenha a assinatura. Vazio com `?estrelaslente=0`. */
export const UNIFORMES_DA_ASSINATURA: Record<string, THREE.IUniform> = ESTRELAS_SEGUEM_A_LENTE ? uniformes : {};

// ─── os materiais: a cruz e a assinatura são dois PROGRAMAS ────────────────
//
// PROGRAMA, E NÃO UM RAMO POR UNIFORME. Com o ramo, o texto compilado sem
// lente já não era o de antes e o compilador arredondava diferente: 1 nível de
// cor em 2 pixels do `ua40` no ab-identidade (medido 09/10). Trocando o texto,
// a vista sem lente compila o fragment de hoje byte a byte. O three guarda no
// material o programa de cada texto, então só a PRIMEIRA troca de cada um
// compila; as seguintes reaproveitam.

const materiais = new Map<THREE.ShaderMaterial, { readonly cruz: string; readonly lente: string }>();
let assinaturaLigada = false;

function vestir(material: THREE.ShaderMaterial, texto: string): void {
  if (material.fragmentShader === texto) return;
  material.fragmentShader = texto;
  material.needsUpdate = true;
}

/**
 * Inscreve um material que desenha a cruz: `cruz` é o fragment de hoje e
 * `lente` o mesmo com a assinatura. Ele veste o que a lente de agora pede e
 * troca junto com ela. Com `?estrelaslente=0`, nada.
 */
export function seguirALente(material: THREE.ShaderMaterial, cruz: string, lente: string): void {
  if (!ESTRELAS_SEGUEM_A_LENTE) return;
  materiais.set(material, { cruz, lente });
  material.addEventListener('dispose', () => materiais.delete(material));
  vestir(material, assinaturaLigada ? lente : cruz);
}

/** A lente de Ajustes chega às estrelas (chamado por `Post.definirLente`). Com `?estrelaslente=0`, nada. */
export function definirLenteDasEstrelas(modo: ModoDaLente): void {
  if (!ESTRELAS_SEGUEM_A_LENTE) return;
  const a = estrelasSeguemALente(modo, PORTA_ESTRELAS_LENTE) ? assinaturaDaLente(modo) : null;
  assinaturaLigada = a !== null;
  for (const [material, textos] of materiais) vestir(material, assinaturaLigada ? textos.lente : textos.cruz);
  const u = uniformes;
  const r = a?.raios;
  u.uAssinaturaRaiosLuz.value.set(r?.queda ?? 0, r?.intensidade ?? 0, r?.rotacao ?? 0, r ? 1 : 0);
  if (r) {
    u.uAssinaturaRaios.value.set(r.numero, r.comprimento, r.largura, r.alargar);
    u.uAssinaturaRaiosCroma.value.copy(v3(r.croma));
    u.uAssinaturaRaiosCor.value.copy(v3(r.cor));
    r.tabela.forEach((h, k) => u.uAssinaturaRaiosTabela.value[k].set(h[0], h[1], h[2]));
  }
  const s = a?.risco;
  u.uAssinaturaRiscoInt.value.set(s?.intNucleo ?? 0, s?.intAsas ?? 0, s?.intParalelas ?? 0, s ? 1 : 0);
  if (s) {
    u.uAssinaturaRisco.value.set(s.comprimento, s.queda, s.larguraNucleo, s.larguraAsas);
    u.uAssinaturaRiscoParalelas.value.set(s.paralelas[0] ?? 0, s.paralelas[1] ?? 0, s.paralelas.length);
    u.uAssinaturaRiscoCorPerto.value.copy(v3(s.corPerto));
    u.uAssinaturaRiscoCorLonge.value.copy(v3(s.corLonge));
  }
}
