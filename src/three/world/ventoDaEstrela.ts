// ============================================================
// O GÁS EM VOLTA DAS QUENTES: o VENTO das supergigantes azuis e o DISCO das
// estrelas Be, como um instrumento os vê na linha Hα do hidrogênio. Uma
// máquina só: a emissão de recombinação, emissividade ∝ ρ², integrada na
// linha de visada; o campo de densidade é a soma do vento e do disco, cada
// um pelo dado da estrela. Aqui só as contas, puras; quem desenha é
// `stellarBody.ts` (a casca de `criarABordaDifusa`) e quem decide a fonte
// é `gasDaEstrela`.
//
//  · VENTO: ρ(r) ∝ Ṁ / (4π r² v(r)), v(r) = v∞·max((1 − R/r)^β, piso).
//    Ṁ e v∞: o MEDIDO vence (`VENTOS_MEDIDOS`); senão a receita de Vink,
//    de Koter & Lamers 2001 (A&A 369, 574), só dentro da faixa dela
//    (`ventoPelaReceita`). Abaixo de 12.500 K não há receita.
//  · O BRILHO, sem limiar físico: a fração do fluxo do gás sobre o do disco
//    é G·X/X_Rigel, X = (Ṁ/v∞)² / (R³·B656(Teff)) — a medida de emissão de
//    um vento ∝ (Ṁ/v∞)²/R³ (a área do disco, R², divide o volume, R³ · R⁻⁴
//    da densidade ao quadrado), sobre o contínuo de Planck em 656,3 nm.
//    G (`GANHO_DO_GAS`) é o único ganho, ARTÍSTICO, ancorado em Rigel: na
//    linha de Hα o diâmetro dela é 1,5× o do contínuo (Chesneau et al. 2010,
//    A&A 521, A5), o envelope pesa tanto quanto o disco num filtro estreito.
//    Abaixo de `LIMIAR_DE_DESENHO` o gás nem é construído.
//  · DISCO (dado da estrela, `discoDeGas`): ρ = ρ0·(r/R)^−n·exp(−z²/2H²),
//    H = H0·(r/R)^1,5 (Rivinius, Carciofi & Martayan 2013, A&ARv 21, 69); a
//    época por lista medida (`faseDoDisco`), nunca por ciclo inventado.
// ============================================================
import type { DiscoDeGas, EstrelaVisitavel } from '../../lib/atlas/estrelasVisitaveis';

/** GM do Sol (IAU 2015 B3, nominal), m³/s² */
const GM_SOL = 1.3271244e20;
/** o raio do Sol (IAU 2015 B3), m */
const RAIO_SOL_M = 6.957e8;

/** o vento de uma estrela: Ṁ em M☉/ano, v∞ em km/s, e de onde veio */
export interface Vento {
  readonly mdotMsolAno: number;
  readonly vInfKms: number;
  readonly p: 'medido' | 'derivado';
  readonly fonte: string;
}

const CHESNEAU_2014 = 'Chesneau et al. 2014, A&A 566, A125; Kaufer et al. 1996';
const AUFDENBERG_2002 = 'Aufdenberg et al. 2002, ApJ 570, 344';
export const FONTE_DA_RECEITA = 'Vink, de Koter & Lamers 2001, A&A 369, 574';
/** a fonte da estrutura do vento (grumos e braços) na ficha */
export const FONTE_DA_ESTRUTURA_DO_VENTO =
  'Puls et al. 2006, A&A 454, 625; Eversberg, Lépine & Moffat 1998, ApJ 494, 799; Cranmer & Owocki 1996, ApJ 462, 469';

/**
 * OS VENTOS MEDIDOS, pelo nome no catálogo. Rigel: a média de 9,4 ± 0,9
 * (2006–07) e 7,6 ± 1,1 × 10⁻⁷ M☉/ano (2009–10), v∞ 230 km/s (Kaufer et
 * al. 1996, citado ali). Deneb: 8 ± 3 × 10⁻⁷, 225 km/s.
 */
export const VENTOS_MEDIDOS: Readonly<Record<string, Vento>> = {
  Rigel: { mdotMsolAno: 8.5e-7, vInfKms: 230, p: 'medido', fonte: CHESNEAU_2014 },
  Deneb: { mdotMsolAno: 8e-7, vInfKms: 225, p: 'medido', fonte: AUFDENBERG_2002 },
};

/** log⟨ρ⟩ na metalicidade do Sol (Vink et al. 2001, eq. 14) */
const LOG_RHO_MEDIO = -13.636;
/** a temperatura do salto de biestabilidade, K: 61,2 + 2,59·log⟨ρ⟩ kK (≈ 25,9 kK) */
export const TEFF_DO_SALTO_K = (61.2 + 2.59 * LOG_RHO_MEDIO) * 1000;

/**
 * O fator de Eddington, Γe = 2,6e-5·(L/L☉)/(M/M☉), e a FAIXA DA RECEITA: a
 * grade de modelos de Vink et al. cobre Γe de 0,041 a 0,434 (Vink, de Koter
 * & Lamers 2000, A&A 362, 295, Tab. 1; 2001, Tab. 2), e "for values of
 * Γe > 0.5, the stars approach their Eddington limit". As gigantes e
 * supergigantes do catálogo levam uma massa TÍPICA declarada
 * (`estrelaDoCatalogo`), e a receita roda com ela (a ficha confessa); mas
 * quando essa massa põe a estrela FORA da grade, o defeito é a massa, e a
 * estrela fica SEM vento pela receita até ter massa melhor (Alnilam, α Cam,
 * τ CMa, ι Ori, ο Cas, λ Cep, 17/11). Nenhum teto inventado.
 */
export const GAMA_MAXIMO_DA_RECEITA = 0.434;
export function fatorDeEddington(lumLsol: number, massaMsol: number): number {
  return (2.6e-5 * lumLsol) / massaMsol;
}

/** a velocidade de escape efetiva, km/s: √(2GM(1 − Γe)/R); NaN-livre: 0 com Γe ≥ 1 */
export function velocidadeDeEscape(lumLsol: number, massaMsol: number, raioRsol: number): number {
  const gama = fatorDeEddington(lumLsol, massaMsol);
  if (!(gama < 1)) return 0;
  return Math.sqrt((2 * GM_SOL * massaMsol * (1 - gama)) / (raioRsol * RAIO_SOL_M)) / 1000;
}

/**
 * A RECEITA de Vink et al. 2001 (Z = Z☉), só na faixa dela: 12.500 a
 * 50.000 K; entre 22.500 e 27.500 K o lado é o da temperatura do salto
 * (`TEFF_DO_SALTO_K`); v∞/v_esc = 2,6 no lado quente e 1,3 no frio.
 * Fora da faixa, em Teff ou em Γe (`GAMA_MAXIMO_DA_RECEITA`), null.
 */
export function ventoPelaReceita(teffK: number, lumLsol: number, massaMsol: number, raioRsol: number): Vento | null {
  if (!(teffK >= 12500 && teffK <= 50000) || !(lumLsol > 0) || !(massaMsol > 0) || !(raioRsol > 0)) return null;
  // fora da grade da receita em Γe (a massa típica do catálogo não serve): sem vento
  if (!(fatorDeEddington(lumLsol, massaMsol) <= GAMA_MAXIMO_DA_RECEITA)) return null;
  if (teffK > 22500 && teffK <= 27500 ? teffK > TEFF_DO_SALTO_K : teffK > 27500) {
    const razao = 2.6;
    const lt = Math.log10(teffK / 40000);
    const logM =
      -6.697 +
      2.194 * Math.log10(lumLsol / 1e5) -
      1.313 * Math.log10(massaMsol / 30) -
      1.226 * Math.log10(razao / 2) +
      0.933 * lt -
      10.92 * lt * lt;
    return {
      mdotMsolAno: 10 ** logM,
      vInfKms: razao * velocidadeDeEscape(lumLsol, massaMsol, raioRsol),
      p: 'derivado',
      fonte: FONTE_DA_RECEITA,
    };
  }
  const razao = 1.3;
  const logM =
    -6.688 +
    2.21 * Math.log10(lumLsol / 1e5) -
    1.339 * Math.log10(massaMsol / 30) -
    1.601 * Math.log10(razao / 2) +
    1.07 * Math.log10(teffK / 20000);
  return {
    mdotMsolAno: 10 ** logM,
    vInfKms: razao * velocidadeDeEscape(lumLsol, massaMsol, raioRsol),
    p: 'derivado',
    fonte: FONTE_DA_RECEITA,
  };
}

/** o vento de uma estrela: o medido pelo nome vence; senão a receita */
export function ventoDe(nome: string, teffK: number, lumLsol: number, massaMsol: number, raioRsol: number): Vento | null {
  return VENTOS_MEDIDOS[nome] ?? ventoPelaReceita(teffK, lumLsol, massaMsol, raioRsol);
}

/** Planck em 656,3 nm, sem as constantes (só a razão entre estrelas importa): 1/(e^(hc/λkT) − 1) */
export function planck656(teffK: number): number {
  return 1 / Math.expm1(0.014387769 / 656.3e-9 / teffK);
}

/** X = (Ṁ/v∞)² / (R³·B656(Teff)) — a medida de emissão do vento sobre o contínuo */
export function medidaDoVento(v: Vento, raioRsol: number, teffK: number): number {
  const q = v.mdotMsolAno / v.vInfKms;
  return (q * q) / (raioRsol ** 3 * planck656(teffK));
}

/**
 * A ÂNCORA: Rigel pela ficha da regra única (`estrelaDoCatalogo`: B8Ia,
 * 12.100 K, 67,7 R☉) e o vento medido dela — em Rigel a fração vale G (o
 * teste confere a ficha contra estes números).
 */
export const ANCORA_RIGEL = { teffK: 12100, raioRsol: 67.7 } as const;
const X_RIGEL = medidaDoVento(VENTOS_MEDIDOS.Rigel, ANCORA_RIGEL.raioRsol, ANCORA_RIGEL.teffK);

/**
 * O GANHO DO GÁS — o único número de brilho, ARTÍSTICO, por imagem: a
 * fração do fluxo do disco que o gás de Rigel carrega na vista de
 * instrumento (1 = o gás inteiro com o mesmo fluxo do disco). O disco de
 * uma Be usa o mesmo G × a fase. A faixa que a medida sustenta é ~0,3 a ~1
 * (o pico de Hα de Achernar ativa ≲ 1,3–1,5 do contínuo; Deneb, 1,3 Å de
 * absorção líquida). 0,3, a ponta baixa, reescolhido por imagem na segunda
 * volta (17/11, com o piso e os grumos): de perto Rigel já tem o gás até ~2
 * raios, e Naos, no teto, já enche o quadro; acima disso volta a névoa.
 */
export const GANHO_DO_GAS = 0.3;
/** o limiar de DESENHO (não físico): abaixo de 1/400 do fluxo do disco, meio degrau de tela, o gás nem nasce */
export const LIMIAR_DE_DESENHO = 1 / 400;

/**
 * O TETO DO GÁS: ele nunca carrega mais fluxo que o próprio disco. A base é
 * a medida que existe do pico da linha: em Achernar ativa o pico de Hα fica
 * sempre ≲ 1,3–1,5 do contínuo (Kervella et al. 2022; Rivinius et al. 2013),
 * ou seja, a emissão do gás no centro da linha não passa de ~1 vez o
 * contínuo da estrela.
 */
export const TETO_DO_GAS = 1;

/**
 * A fração do fluxo do disco que o vento carrega. Até o vento de Rigel (a
 * âncora, x = 1) é linear na medida de emissão: G·x. Acima, cresce com o
 * LOGARITMO, G·(1 + ln x): uma linha que já é opticamente espessa não fica
 * mais brilhante na proporção de ρ² (a parte chata da curva de crescimento);
 * sem isso Alnilam saía com 5× e ζ Pup com 10× o gás de Rigel. Contínua e
 * com a mesma inclinação em x = 1; teto em `TETO_DO_GAS`.
 */
export function fracaoDoVento(v: Vento, raioRsol: number, teffK: number): number {
  const x = medidaDoVento(v, raioRsol, teffK) / X_RIGEL;
  return Math.min(TETO_DO_GAS, GANHO_DO_GAS * (x <= 1 ? x : 1 + Math.log(x)));
}

/**
 * O PERFIL DO VENTO, ARTÍSTICO, declarado: β e o piso da lei de
 * velocidade, e a cauda que leva a emissão a zero até 3,2 raios (a linha
 * sonda até 3). Com ρ² a emissão de um vento com velocidade constante cai
 * como b⁻³ na tela, e o raio de meia altura não passa de 2^⅓ ≈ 1,26 —
 * qualquer β; os 1,5 raio medidos em Rigel (1,75 em Deneb) são de uma
 * linha opticamente espessa perto da base. β = 3 com piso de 0,1 v∞ é o
 * mais perto que a lei chega (meia altura em ~1,24 raio).
 */
export const PERFIL_DO_VENTO = { beta: 3, piso: 0.1, caudaDe: 2.2, fim: 3.2 } as const;
/**
 * O PISO DO INSTRUMENTO: toda imagem tem uma faixa dinâmica, e abaixo dela o
 * gás é preto. Nas imagens do VLTI/PIONIER do disco de Achernar os contornos
 * mais baixos ficam em ±1 % do pico e a sensibilidade é "∼1%" (Dalla Vedova
 * et al. 2017, A&A 601, A118). O pico é o do gás daquela estrela rente à
 * borda (`picoDoVento`, `picoDoDisco`). A FORMA da transição é nossa
 * (`joelhoDoPiso`): o nível de preto de uma exibição, com joelho quadrático.
 */
export const PISO_DO_INSTRUMENTO = 0.01;

/**
 * O JOELHO DO PISO, em f = piso × pico: 0 até f; (x − f)²/4f de f a 3f; x − 2f
 * acima. Contínuo e de derivada contínua (sem degrau nem quina); acima de 3f
 * só desce 2f (2 % do pico).
 */
export function joelhoDoPiso(x: number, f: number): number {
  const g = x - f;
  if (g <= 0) return 0;
  return g < 2 * f ? (g * g) / (4 * f) : g - f;
}

/**
 * OS GRUMOS — os ventos de O/B são grumosos: fator de grumo ⟨ρ²⟩/⟨ρ⟩² ≈ 4,1
 * ± 1,4 na região interna dos ventos densos, máximo perto de 2 raios ou
 * abaixo (Puls et al. 2006, A&A 454, 625); em ζ Pup as subestruturas saem da
 * fotosfera até ~2 raios com β = 1,0–1,2 (Eversberg, Lépine & Moffat 1998,
 * ApJ 494, 799). A média da emissão não muda (o Ṁ medido por Hα já é o do
 * vento grumoso): é redistribuição. O fator vale `fator` até `ateRaio` e
 * desce a 1 em `semGrumosEm` (a descida é ARTÍSTICA).
 * NA IMAGEM, não no volume: a linha de visada soma ~N grumos, e o contraste
 * que sobra na coluna é ⟨I²⟩/⟨I⟩² = 1 + (f − 1)/N (`fatorNaImagem`) — os
 * grumos dominam a EMISSÃO (×f), não a textura. Marchar grumos menores que o
 * passo da marcha dava bolinhas (cada passo corta os fiapos num ponto); o
 * campo vai então uma vez por pixel, pela direção e pelo b do ponto de maior
 * aproximação, onde a emissão se concentra, como modulação de média 1:
 *   m = (1 − α) + α · (h/⟨h⟩) · (q^p/⟨q^p⟩),
 *  · h: um grumo por célula de uma grade na DIREÇÃO (a direção × `escala`),
 *    a·(1 − s²/ρ²)₊^m, centro sorteado na célula (folga `folga`), altura a
 *    uniforme em [`alturaMin`, 1]: constante ao longo do raio, um FIAPO;
 *  · q = q1·q2, qi = (1 + sen φi)/2, φi = 2π((τ(b) − t/T)/Pi + sorteio):
 *    contas ao longo do fiapo que SAEM pela lei de velocidade (β = 1, τ o
 *    tempo de voo) e se esticam no raio ao acelerar; dois períodos sem razão
 *    simples (P e P·φ áureo, × um sorteio por fiapo de 0,75 a 1,25) para as
 *    contas não virarem tracejado regular;
 *  · α tal que ⟨m²⟩ = F (`alfaDoGrumo`; a média sobre a célula e sobre uma
 *    volta de φ é exata: a grade e a fase são uniformes).
 * MEDIDOS: o fator e o β; ARTÍSTICOS: a forma (escala — que fixa N = π·escala/2
 * e com ele o contraste na tela —, raio, perfil, folga, alturas, o período P
 * em τ), o ritmo (`segundosPorRaio`: segundos de tela para um grumo a v∞
 * cruzar um raio, no relógio rápido da superfície) e o piso da velocidade (o
 * grumo nasce devagar, não parado).
 */
export const GRUMOS_DO_VENTO = {
  fator: 4,
  beta: 1,
  pisoDaVelocidade: 0.1,
  ateRaio: 2,
  semGrumosEm: 3,
  escala: 16,
  raio: 0.4,
  perfil: 1,
  folga: 0.1,
  alturaMin: 0.2,
  expoenteDasContas: 1,
  periodoEmTau: 1.2,
  segundosPorRaio: 9,
} as const;

/** ⟨q^p⟩ com q = (1 + sen φ)/2 e φ uniforme (a média sobre uma volta) */
export function momentoDoGrumo(p: number): number {
  let s = 0;
  const n = 4096;
  for (let i = 0; i < n; i++) s += ((1 + Math.sin((2 * Math.PI * (i + 0.5)) / n)) / 2) ** p;
  return s / n;
}

/** ⟨b^k⟩ do grumo na célula unitária: ⟨a^k⟩ · 4πρ³ ∫₀¹ (1 − x²)^(km) x² dx */
export function momentoDaCelula(k: number): number {
  const g = GRUMOS_DO_VENTO;
  const a0 = g.alturaMin;
  const ak = (1 - a0 ** (k + 1)) / ((k + 1) * (1 - a0));
  let s = 0;
  const n = 4096;
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) / n;
    s += (1 - x * x) ** (k * g.perfil) * x * x;
  }
  return ak * 4 * Math.PI * g.raio ** 3 * (s / n);
}

/** os momentos da grade e das contas, uma vez: R = ⟨x²⟩/⟨x⟩² de cada parte (as contas, duas fases: ao quadrado) e a normal ⟨h⟩·⟨q^p⟩² */
const MOMENTOS_DO_GRUMO = (() => {
  const p = GRUMOS_DO_VENTO.expoenteDasContas;
  const rb = momentoDaCelula(2) / momentoDaCelula(1) ** 2;
  const rq = (momentoDoGrumo(2 * p) / momentoDoGrumo(p) ** 2) ** 2;
  return { rbRq: rb * rq, normal: momentoDaCelula(1) * momentoDoGrumo(p) ** 2 };
})();

/** α para um fator F: ⟨m²⟩ = 1 − α² + α²·Rb·Rq = F */
export function alfaDoGrumo(fator: number): number {
  return Math.sqrt(Math.max(fator - 1, 0) / (MOMENTOS_DO_GRUMO.rbRq - 1));
}

/** o fator de grumo a r raios: `fator` até `ateRaio`, descendo (smoothstep) a 1 em `semGrumosEm` */
export function fatorDeGrumo(r: number): number {
  const g = GRUMOS_DO_VENTO;
  return 1 + (g.fator - 1) * (1 - suave(g.ateRaio, g.semGrumosEm, r));
}

/**
 * O FATOR NA IMAGEM a b raios: a linha de visada soma N grumos
 * independentes, e a variância relativa da coluna cai por N —
 * ⟨I²⟩/⟨I⟩² = 1 + (f − 1)/N. N = (comprimento efetivo da linha, πb/2 para
 * uma emissão ∝ r⁻⁴) ÷ (o tamanho do grumo, b/`escala`) = π·escala/2. Em b ≤
 * `ateRaio`, com b = 0, o máximo.
 */
export function fatorNaImagem(b: number): number {
  return 1 + (fatorDeGrumo(b) - 1) / ((Math.PI * GRUMOS_DO_VENTO.escala) / 2);
}

/** a modulação da IMAGEM pelos grumos a b raios (média 1, ⟨m²⟩ = `fatorNaImagem`), pela altura na célula (h) e pelas duas fases (q1, q2) */
export function modulacaoDoGrumo(altura: number, q1: number, q2: number, b: number): number {
  const p = GRUMOS_DO_VENTO.expoenteDasContas;
  const alfa = alfaDoGrumo(fatorNaImagem(b));
  return 1 - alfa + (alfa * altura * (q1 * q2) ** p) / MOMENTOS_DO_GRUMO.normal;
}

/** o tempo de voo τ(r) (em R/v∞) na lei v = v∞·max((1 − 1/r)^β, piso) com β = `GRUMOS_DO_VENTO.beta` = 1: linear até r* = 1/(1 − piso), r + ln(r − 1) depois (o shader usa a mesma conta, com a constante daqui) */
export function tempoDeVoo(r: number): number {
  const piso = GRUMOS_DO_VENTO.pisoDaVelocidade;
  const rEstrela = 1 / (1 - piso);
  if (r <= rEstrela) return (Math.max(r, 1) - 1) / piso;
  return (rEstrela - 1) / piso + r + Math.log(r - 1) - rEstrela - Math.log(rEstrela - 1);
}

/**
 * OS BRAÇOS QUE GIRAM — regiões de interação corrotantes. No modelo de
 * Cranmer & Owocki 1996 (ApJ 462, 469) duas manchas a 180° dão braços com
 * densidade até ~2,6–3,7× a do vento liso, em espiral de Arquimedes
 * φ − φ0 ≈ −(Ω/v∞)(r − R), Ω = v_eq/R: em raios, o enrolamento é v_eq/v∞
 * (`enrolamentoDosBracos`); em ζ Pup duas manchas dominantes (a ~158°;
 * Ramiaramanantsoa et al. 2018, MNRAS 473, 5532), em Rigel tentativo
 * (Chesneau et al. 2014). MEDIDOS: dois braços, o contraste 2,6 (a ponta
 * baixa) e o enrolamento; ARTÍSTICOS: a largura (von Mises em 2Δφ,
 * `concentracao`) e o envelope em latitude (`latitude`, em sen² da
 * latitude). ρ × (1 + (c − 1)·S); a emissão, (1 + (c − 1)S)²/⟨…⟩: a luz
 * total do vento fica a da regra (redistribuição, como os grumos).
 */
export const BRACOS_DO_VENTO = { contraste: 2.6, concentracao: 5, latitude: 0.12 } as const;

/** o perfil de um braço: exp(κ(cos 2Δφ − 1))·exp(−sen²lat/L) */
export function perfilDoBraco(dPhi: number, senLat: number): number {
  return (
    Math.exp(BRACOS_DO_VENTO.concentracao * (Math.cos(2 * dPhi) - 1)) * Math.exp(-(senLat * senLat) / BRACOS_DO_VENTO.latitude)
  );
}

/** ⟨(1 + (c − 1)S)²⟩ na esfera (área uniforme em sen lat e no azimute) */
function mediaDosBracos(): number {
  let s = 0;
  const n = 256;
  for (let i = 0; i < n; i++) {
    const sl = -1 + (2 * (i + 0.5)) / n;
    for (let j = 0; j < n; j++) {
      const d = 1 + (BRACOS_DO_VENTO.contraste - 1) * perfilDoBraco((2 * Math.PI * (j + 0.5)) / n, sl);
      s += d * d;
    }
  }
  return s / (n * n);
}
/** a emissão dos braços: (1 + (c − 1)S)² × isto (média 1 na esfera) */
export const NORMAL_DOS_BRACOS = 1 / mediaDosBracos();

/** o enrolamento dos braços em radianos por raio: Ω·R/v∞ = 2πR/(P·v∞); 0 sem período */
export function enrolamentoDosBracos(raioRsol: number, periodoDias: number | undefined, vInfKms: number): number {
  if (!(periodoDias! > 0) || !(vInfKms > 0)) return 0;
  return (2 * Math.PI * raioRsol * (RAIO_SOL_M / 1000)) / (periodoDias! * 86400 * vInfKms);
}

function suave(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** a emissividade do vento (sem os braços) a r raios do centro, na unidade do desenho */
export function emissividadeDoVento(r: number): number {
  const rr = Math.max(r, 1);
  const w = Math.max(Math.pow(Math.max(1 - 1 / rr, 0), PERFIL_DO_VENTO.beta), PERFIL_DO_VENTO.piso);
  return (1 - suave(PERFIL_DO_VENTO.caudaDe, PERFIL_DO_VENTO.fim, rr)) / (rr ** 4 * w * w);
}

/** a coluna do vento liso a b raios do centro, ∫ ε(√(b² + t²)) dt (b ≥ 1: a linha não bate na estrela) */
export function colunaDoVento(b: number): number {
  const fim = Math.sqrt(Math.max(PERFIL_DO_VENTO.fim ** 2 - b * b, 0));
  let s = 0;
  const n = 4000;
  for (let i = 0; i < n; i++) {
    // t = fim·u², mais denso rente ao ponto de maior aproximação
    const u0 = i / n;
    const u1 = (i + 1) / n;
    const um = 0.5 * (u0 + u1);
    const t = fim * um * um;
    s += 2 * emissividadeDoVento(Math.hypot(b, t)) * fim * (u1 * u1 - u0 * u0);
  }
  return s;
}

/** ∫ 4π r² ε(r) dr de 1 até o fim: a luz inteira do vento na unidade do desenho */
export function integralDoVento(): number {
  let s = 0;
  const n = 8000;
  const h = (PERFIL_DO_VENTO.fim - 1) / n;
  for (let i = 0; i < n; i++) {
    const r = 1 + (i + 0.5) * h;
    s += 4 * Math.PI * r * r * emissividadeDoVento(r) * h;
  }
  return s;
}

/** o fluxo do disco da estrela, em unidades da intensidade do centro e do raio: π(1 − u/3) */
export function fluxoDoDisco(bordaU: number): number {
  return Math.PI * (1 - bordaU / 3);
}

/** a cauda do disco de gás em volta do raio externo: de 0,85 a 1,15 × ele (ARTÍSTICO) */
export const CAUDA_DO_DISCO = { de: 0.85, ate: 1.15 } as const;

/** o disco em números de desenho */
export interface DiscoDoMotor {
  /** raio externo, em raios equatoriais */
  readonly raioExterno: number;
  /** H0 = tan(meia abertura na base), em raios */
  readonly h0: number;
  /** o expoente n da densidade */
  readonly expoente: number;
  /** a função da época: (ano, fase) em ordem */
  readonly epocas: readonly (readonly [ano: number, fase: number])[];
  /** a luz do disco na fase 1, na unidade do desenho (G·fluxo do disco ÷ ∫ε dV) */
  readonly normal: number;
  /** o PICO do disco na fase 1: a coluna de frente rente ao equador (normal·H0·√π) — a base do piso */
  readonly pico: number;
}

/** o gás que o motor desenha: o vento e/ou o disco, já em números de desenho */
export interface GasDoMotor {
  readonly vento?: {
    /** a fração do fluxo do disco (G·X/X_Rigel) */
    readonly fracao: number;
    /** a emissividade × isto dá a luz certa (fração·fluxo do disco ÷ ∫ε dV) */
    readonly normal: number;
    /** o PICO: a coluna do vento liso rente à borda (normal × `colunaDoVento(1)`) — a base do piso */
    readonly pico: number;
    /** o enrolamento dos braços, rad por raio (`enrolamentoDosBracos`) */
    readonly enrolamento: number;
  };
  readonly disco?: DiscoDoMotor;
}

/** a emissividade do disco de gás no plano (z = 0) a rc raios do eixo, já integrada em z: rc^(−2n)·H√π·cauda */
function colunaDoDisco(rc: number, d: Pick<DiscoDoMotor, 'raioExterno' | 'h0' | 'expoente'>): number {
  const r = Math.max(rc, 1);
  const h = d.h0 * r ** 1.5;
  const cauda = 1 - suave(CAUDA_DO_DISCO.de * d.raioExterno, CAUDA_DO_DISCO.ate * d.raioExterno, r);
  return r ** (-2 * d.expoente) * h * Math.sqrt(Math.PI) * cauda;
}

/** ∫ ε dV do disco de gás com ρ0 = 1 (a gaussiana em z: ∫e^(−z²/H²)dz = H√π) */
export function integralDoDisco(d: Pick<DiscoDoMotor, 'raioExterno' | 'h0' | 'expoente'>): number {
  let s = 0;
  const fim = CAUDA_DO_DISCO.ate * d.raioExterno;
  const n = 8000;
  const h = (fim - 1) / n;
  for (let i = 0; i < n; i++) {
    const r = 1 + (i + 0.5) * h;
    s += 2 * Math.PI * r * colunaDoDisco(r, d) * h;
  }
  return s;
}

/** o ano (decimal) de uma data juliana: 2000 + (jd − 2451545)/365,25 */
export function anoDoJd(jd: number): number {
  return 2000 + (jd - 2451545) / 365.25;
}

/**
 * A FASE DO DISCO num ano, pela lista medida (linear entre as épocas).
 * Fora da janela vale a ponta mais próxima: o ciclo de uma Be não é regular
 * (Faes 2015), e nada de periodicidade inventada.
 */
export function faseDoDisco(epocas: readonly (readonly [number, number])[], ano: number): number {
  if (epocas.length === 0 || !Number.isFinite(ano)) return 0;
  if (ano <= epocas[0][0]) return epocas[0][1];
  for (let i = 1; i < epocas.length; i++) {
    const [a1, f1] = epocas[i];
    if (ano <= a1) {
      const [a0, f0] = epocas[i - 1];
      return a1 > a0 ? f0 + ((f1 - f0) * (ano - a0)) / (a1 - a0) : f1;
    }
  }
  return epocas[epocas.length - 1][1];
}

/** o disco da ficha em números de desenho */
export function discoDoMotor(d: DiscoDeGas, bordaU: number): DiscoDoMotor {
  const base = {
    raioExterno: d.raioExternoEmRaios.v,
    h0: Math.tan((d.meiaAberturaGraus.v * Math.PI) / 180),
    expoente: d.expoenteDaDensidade.v,
  };
  const normal = (GANHO_DO_GAS * fluxoDoDisco(bordaU)) / integralDoDisco(base);
  return {
    ...base,
    epocas: d.epocas.map((e) => [e.ano, e.fase] as const),
    normal,
    pico: normal * base.h0 * Math.sqrt(Math.PI),
  };
}

/** o vento de uma estrela da ficha (o medido pelo nome vence), ou null */
export function ventoDaFicha(e: EstrelaVisitavel): Vento | null {
  return ventoDe(e.nomeNoCatalogo, e.teffK.v, e.luminosidadeLsol.v, e.massaMsol.v, e.raioRsol.v);
}

/** a fração do vento que o motor desenharia (0 se abaixo do limiar de desenho ou sem vento) */
export function fracaoDesenhadaDoVento(e: EstrelaVisitavel): number {
  const v = ventoDaFicha(e);
  if (!v) return 0;
  const f = fracaoDoVento(v, e.raioRsol.v, e.teffK.v);
  return f >= LIMIAR_DE_DESENHO ? f : 0;
}

/**
 * o gás de uma estrela em números de desenho, ou null (o texto do shader fica
 * o de antes); o período do giro (`rotacaoDe`, no diretor) enrola os braços
 */
export function gasDaEstrela(e: EstrelaVisitavel, periodoDias?: number): GasDoMotor | null {
  const u = e.superficie.bordaU.v;
  const f = fracaoDesenhadaDoVento(e);
  const v = f > 0 ? ventoDaFicha(e) : null;
  const normal = (f * fluxoDoDisco(u)) / integralDoVento();
  const vento = v
    ? {
        fracao: f,
        normal,
        pico: normal * colunaDoVento(1),
        enrolamento: enrolamentoDosBracos(e.raioRsol.v, periodoDias, v.vInfKms),
      }
    : undefined;
  const disco = e.discoDeGas && GANHO_DO_GAS >= LIMIAR_DE_DESENHO ? discoDoMotor(e.discoDeGas, u) : undefined;
  if (!vento && !disco) return null;
  return { ...(vento ? { vento } : {}), ...(disco ? { disco } : {}) };
}
