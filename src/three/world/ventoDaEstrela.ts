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
//    Ṁ e v∞: o MEDIDO no registro vence (`ventoMedido`); senão a receita de Vink,
//    de Koter & Lamers 2001 (A&A 369, 574), só dentro da faixa dela
//    (`ventoPelaReceita`). Abaixo de 12.500 K não há receita. O halo é
//    LISO e CURTO: chega ao piso do instrumento no raio da região da linha
//    (`raioDaLinhaDe`: o `raioDaLinhaMedido` do registro, ou o da receita).
//  · O BRILHO, sem limiar físico: a fração do fluxo do gás sobre o do disco
//    é G·X/X_Rigel, X = (Ṁ/v∞)² / (R³·B656(Teff)) — a medida de emissão de
//    um vento ∝ (Ṁ/v∞)²/R³ (a área do disco, R², divide o volume, R³ · R⁻⁴
//    da densidade ao quadrado), sobre o contínuo de Planck em 656,3 nm.
//    G (`GANHO_DO_GAS`) é o único ganho, escolhido por imagem DENTRO da
//    faixa que os perfis observados de Hα sustentam (ver a constante). O
//    1,5× de Rigel (Chesneau et al. 2010, A&A 521, A5) é o TAMANHO da
//    região da linha, não uma fração de fluxo.
//    Abaixo de `LIMIAR_DE_DESENHO` o gás nem é construído.
//  · DISCO (dado da estrela, `discoDeGas`): ρ = ρ0·(r/R)^−n·exp(−z²/H²),
//    H = H0·(r/R)^1,5, H0 = tan(meia abertura) — a meia espessura em 1/e
//    da densidade (Rivinius, Carciofi & Martayan 2013, A&ARv 21, 69); a
//    época por lista medida (`faseDoDisco`), nunca por ciclo inventado.
// ============================================================
import { VENTO_DE_RIGEL, rotacaoDe, type DiscoDeGas, type EstrelaVisitavel, type Numero } from '../../lib/atlas/estrelasVisitaveis';

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
  /** a velocidade é parâmetro de um MODELO ajustado, não medida direta (Deneb) */
  readonly vInfDoModelo?: true;
}


export const CHESNEAU_2010 = 'Chesneau et al. 2010, A&A 521, A5';
export const FONTE_DA_RECEITA = 'Vink, de Koter & Lamers 2001, A&A 369, 574';

/**
 * O RAIO DA REGIÃO DA LINHA de quem não tem o seu medido: o de Rigel, 1,5
 * raio do contínuo (Chesneau et al. 2010), declarado derivado.
 */
export const RAIO_DA_LINHA_DA_RECEITA = 1.5;

/** o raio da região da linha de uma estrela: o medido pelo nome/** o raio da região da linha de uma estrela: o medido no registro dela, ou o da receita (derivado) */
export function raioDaLinhaDe(e: EstrelaVisitavel): Numero {
  return e.raioDaLinhaMedido ?? { v: RAIO_DA_LINHA_DA_RECEITA, p: 'derivado', fonte: CHESNEAU_2010 };
}

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
 * τ CMa, ι Ori, ο Cas, λ Cep, 17/11). Nenhum teto inventado. Abaixo da
 * grade (Γe < 0,041) também sem vento: ali a receita daria perdas
 * ínfimas, abaixo do limiar de desenho em todo o catálogo (17/11), e a
 * ficha não estende a receita para onde ela não foi ajustada.
 */
export const GAMA_MINIMO_DA_RECEITA = 0.041;
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
 * Fora da faixa, em Teff ou em Γe (`GAMA_MINIMO_DA_RECEITA` a
 * `GAMA_MAXIMO_DA_RECEITA`), null.
 */
export function ventoPelaReceita(teffK: number, lumLsol: number, massaMsol: number, raioRsol: number): Vento | null {
  if (!(teffK >= 12500 && teffK <= 50000) || !(lumLsol > 0) || !(massaMsol > 0) || !(raioRsol > 0)) return null;
  // fora da grade da receita em Γe (a massa típica do catálogo não serve): sem vento
  const gamaE = fatorDeEddington(lumLsol, massaMsol);
  if (!(gamaE >= GAMA_MINIMO_DA_RECEITA && gamaE <= GAMA_MAXIMO_DA_RECEITA)) return null;
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
const X_RIGEL = medidaDoVento(VENTO_DE_RIGEL, ANCORA_RIGEL.raioRsol, ANCORA_RIGEL.teffK);

/**
 * O GANHO DO GÁS — o único número de brilho: a fração do fluxo do disco que
 * o gás de Rigel carrega na vista de instrumento (1 = o gás inteiro com o
 * mesmo fluxo do disco). O disco de uma Be usa o mesmo G × a fase.
 * Escolhido por imagem (18/11/2026, prancha de 0,3 / 0,15 / 0,08) DENTRO do
 * que os perfis OBSERVADOS de Hα dão para o excesso sobre o contínuo num
 * filtro mais estreito que a linha (lidos no texto dos artigos):
 *  · Rigel: sem número; a linha é preenchida por emissão fraca e variável,
 *    e ~20 % do tempo é absorção pura (Chesneau et al. 2010; Shultz et al.
 *    2014);
 *  · Deneb: ~0,15, derivado de 0,30 Å de emissão em ~2 Å (Richardson et al.
 *    2011; a linha líquida é absorção de 1,3 Å) — com G = 0,15 ela desenha
 *    0,105;
 *  · Achernar ativa: pico < 1,3 do contínuo em 2006–2018 (Kervella et al.
 *    2022) e ≲ 1,5 em 1999–2007 (Rivinius et al. 2013): excesso < 0,3 a ≲ 0,5.
 * O gás de verdade (o observado menos a absorção da fotosfera) é maior que
 * esse excesso, e nenhum texto lido dá o valor. O 0,3 de antes era o topo
 * da faixa e lia como anel rosa-choque. Leitura e prancha em
 * `capturas/estrelas-quentes-18-11/`.
 */
export const GANHO_DO_GAS = 0.15;
/** o limiar de DESENHO (não físico): abaixo de 1/400 do fluxo do disco, meio degrau de tela, o gás nem nasce */
export const LIMIAR_DE_DESENHO = 1 / 400;

/**
 * O TETO DO GÁS: ele nunca carrega mais fluxo que o próprio disco. A base é
 * a medida que existe do pico da linha: em Achernar ativa o pico de Hα fica
 * sempre ≲ 1,3–1,5 do contínuo (Kervella et al. 2022; Rivinius et al. 2013),
 * ou seja, o excesso observado não passa de ~0,5 do contínuo; o 1 é guarda
 * folgada, porque o gás de verdade (descontada a absorção da fotosfera) é
 * maior que o excesso e não tem valor lido. Nenhuma estrela do catálogo
 * chega nele (Naos, a mais alta, fica em 0,49; 18/11); o teste barra a
 * primeira que chegar, e aí a ficha passa a dizer que o brilho foi cortado.
 */
export const TETO_DO_GAS = 1;

/**
 * A fração do fluxo do disco que o vento carrega. Até o vento de Rigel (a
 * âncora, x = 1) é linear na medida de emissão: G·x. Acima, cresce com o
 * LOGARITMO, G·(1 + ln x): uma linha que já é opticamente espessa não fica
 * mais brilhante na proporção de ρ² (a parte chata da curva de crescimento);
 * sem isso ζ Pup (Naos) saía com ~10× o gás de Rigel. Contínua e
 * com a mesma inclinação em x = 1; teto em `TETO_DO_GAS`.
 */
export function fracaoDoVento(v: Vento, raioRsol: number, teffK: number): number {
  const x = razaoARigel(v, raioRsol, teffK);
  return Math.min(TETO_DO_GAS, GANHO_DO_GAS * (x <= 1 ? x : 1 + Math.log(x)));
}

/** a medida de emissão do vento relativa à de Rigel (X/X_Rigel): o brilho DERIVADO, antes do ganho */
export function razaoARigel(v: Vento, raioRsol: number, teffK: number): number {
  return medidaDoVento(v, raioRsol, teffK) / X_RIGEL;
}

/**
 * O PERFIL DO VENTO — LISO e CURTO. A lei de velocidade (β e o piso dela,
 * em v∞) faz a emissão ∝ ρ² ∝ 1/(r⁴v²) concentrar-se rente à base; a CAUDA,
 * 1 − smoothstep(1, fim, r) desde a superfície, leva a coluna ao piso do
 * instrumento EXATAMENTE no raio da região da linha (`raioDaLinhaDe`: 1,5
 * em Rigel, 1,75 em Deneb, medidos): `fim` sai da conta (`fimDaCauda`), não
 * de escolha. Sem degrau: a coluna desce lisa até o piso e o joelho
 * (`joelhoDoPiso`) a leva ao preto. ARTÍSTICOS: β = 1 e o piso de 0,15 v∞
 * (a forma do halo dentro do raio medido: a luz rente à borda, a 24 % do
 * pico em 1,2 raio e 8 % em 1,3 em Rigel; a lei sem cauda já chega a 1 % em
 * ~2 raios, então a cauda só encurta, e o fim dela fica perto: 1,8 raio em
 * Rigel, 2,7 em Deneb) e a cauda smoothstep.
 */
export const PERFIL_DO_VENTO = { beta: 1, piso: 0.15 } as const;
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
 * total do vento fica a da regra (redistribuição).
 * SÓ COM GIRO MEDIDO: o enrolamento sai do período, e um período derivado
 * ou artístico (o do Sol em Rigel, Deneb e Naos) daria uma espiral
 * inventada — sem giro medido, sem braços (`gasDaEstrela`). Os de ζ Pup
 * (1,78 dia, Ramiaramanantsoa et al. 2018) voltam quando o giro entrar
 * como dado da estrela.
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
let normalDosBracosGuardada: number | null = null;
/** a emissão dos braços: (1 + (c − 1)S)² × isto (média 1 na esfera); conta na primeira estrela com braços, não na carga do módulo (a ficha o importa) */
export function normalDosBracos(): number {
  return (normalDosBracosGuardada ??= 1 / mediaDosBracos());
}

/** o enrolamento dos braços em radianos por raio: Ω·R/v∞ = 2πR/(P·v∞); 0 sem período */
export function enrolamentoDosBracos(raioRsol: number, periodoDias: number | undefined, vInfKms: number): number {
  if (!(periodoDias! > 0) || !(vInfKms > 0)) return 0;
  return (2 * Math.PI * raioRsol * (RAIO_SOL_M / 1000)) / (periodoDias! * 86400 * vInfKms);
}

function suave(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** a emissividade do vento liso (sem os braços) a r raios do centro, com a cauda até `fim`, na unidade do desenho */
export function emissividadeDoVento(r: number, fim: number): number {
  const rr = Math.max(r, 1);
  const w = Math.max(Math.pow(Math.max(1 - 1 / rr, 0), PERFIL_DO_VENTO.beta), PERFIL_DO_VENTO.piso);
  return (1 - suave(1, fim, rr)) / (rr ** 4 * w * w);
}

/** a coluna do vento liso a b raios do centro, ∫ ε(√(b² + t²)) dt (b ≥ 1: a linha não bate na estrela) */
export function colunaDoVento(b: number, fim: number, n = 4000): number {
  const meia = Math.sqrt(Math.max(fim * fim - b * b, 0));
  let s = 0;
  for (let i = 0; i < n; i++) {
    // t = meia·u², mais denso rente ao ponto de maior aproximação
    const u0 = i / n;
    const u1 = (i + 1) / n;
    const um = 0.5 * (u0 + u1);
    const t = meia * um * um;
    s += 2 * emissividadeDoVento(Math.hypot(b, t), fim) * meia * (u1 * u1 - u0 * u0);
  }
  return s;
}

const FINS_DA_CAUDA = new Map<number, number>();
/**
 * O FIM DA CAUDA para um raio da linha: a coluna em `raioDaLinha` vale o
 * piso do instrumento × a coluna rente à borda (bisseção; uma vez por raio).
 */
export function fimDaCauda(raioDaLinha: number): number {
  const memo = FINS_DA_CAUDA.get(raioDaLinha);
  if (memo !== undefined) return memo;
  let lo = raioDaLinha;
  let hi = 4 * raioDaLinha;
  for (let k = 0; k < 40; k++) {
    const m = 0.5 * (lo + hi);
    if (colunaDoVento(raioDaLinha, m, 1500) / colunaDoVento(1, m, 1500) > PISO_DO_INSTRUMENTO) hi = m;
    else lo = m;
  }
  const fim = 0.5 * (lo + hi);
  FINS_DA_CAUDA.set(raioDaLinha, fim);
  return fim;
}

/** ∫ 4π r² ε(r) dr de 1 até o fim: a luz inteira do vento na unidade do desenho */
export function integralDoVento(fim: number): number {
  let s = 0;
  const n = 8000;
  const h = (fim - 1) / n;
  for (let i = 0; i < n; i++) {
    const r = 1 + (i + 0.5) * h;
    s += 4 * Math.PI * r * r * emissividadeDoVento(r, fim) * h;
  }
  return s;
}

/** o fluxo do disco da estrela, em unidades da intensidade do centro e do raio: π(1 − u/3) */
export function fluxoDoDisco(bordaU: number): number {
  return Math.PI * (1 - bordaU / 3);
}

/** a cauda do disco de gás em volta do raio externo: de 0,95 a 1,0 × ele, borda definida (ARTÍSTICO) */
export const CAUDA_DO_DISCO = { de: 0.95, ate: 1.0 } as const;

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
    /** o fim da cauda, em raios (`fimDaCauda` do raio da linha) */
    readonly fim: number;
    /** o enrolamento dos braços, rad por raio (`enrolamentoDosBracos`): só com giro MEDIDO; sem ele, sem braços */
    readonly enrolamento?: number;
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

/** o vento de uma estrela da ficha: o medido no registro dela vence; senão a receita */
export function ventoDaFicha(e: EstrelaVisitavel): Vento | null {
  return e.ventoMedido ?? ventoPelaReceita(e.teffK.v, e.luminosidadeLsol.v, e.massaMsol.v, e.raioRsol.v);
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
 * o de antes); os braços só com o giro MEDIDO da ficha (`rotacaoDe`)
 */
export function gasDaEstrela(e: EstrelaVisitavel): GasDoMotor | null {
  const u = e.superficie.bordaU.v;
  const f = fracaoDesenhadaDoVento(e);
  const v = f > 0 ? ventoDaFicha(e) : null;
  let vento: GasDoMotor['vento'];
  if (v) {
    const fim = fimDaCauda(raioDaLinhaDe(e).v);
    const normal = (f * fluxoDoDisco(u)) / integralDoVento(fim);
    const giro = rotacaoDe(e);
    vento = {
      fracao: f,
      normal,
      pico: normal * colunaDoVento(1, fim),
      fim,
      ...(giro.p === 'medido' ? { enrolamento: enrolamentoDosBracos(e.raioRsol.v, giro.v, v.vInfKms) } : {}),
    };
  }
  const disco = e.discoDeGas && GANHO_DO_GAS >= LIMIAR_DE_DESENHO ? discoDoMotor(e.discoDeGas, u) : undefined;
  if (!vento && !disco) return null;
  return { ...(vento ? { vento } : {}), ...(disco ? { disco } : {}) };
}
