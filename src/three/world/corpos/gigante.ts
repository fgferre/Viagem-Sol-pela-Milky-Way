// ============================================================
// OS GIGANTES RESOLVIDOS (Onda 6, F4) — Júpiter, Saturno, Urano
// e Netuno sob a MESMA lei da Terra e dos rochosos: Lambert +
// flattening por BODY_AXES + retrato de fallback + cessão suave
// do ponto (D5). Saturno traz o anel.
//
// PROVENIÊNCIA: implementação NOVA. O doador entra como ESPEC
// (esfera Lambert estática, raios 1,110–2,326 do anel — cicatriz
// W5-B —, ocultador elipsoide com squash no polo do frame do anel
// e `a = dot(d',d')` no discriminante). Nenhuma linha dele
// atravessou.
//
// ADVECÇÃO ZONAL DE JÚPITER: ESTÁTICA nesta fase. Pendência
// nomeada (ordem de corte P-E12 do desenho): o perfil de ventos
// publicado com citação honesta ainda não foi transcrito — sem
// essa tabela, qualquer deslocamento por banda seria número
// inventado, e cisalhar o oval da Mancha é o modo de falha que
// a emenda T-E6 pede para NÃO ter. O relógio do Director (jd)
// já está no tick; o wrap REPEAT em U já está no mapa. Quando
// a tabela entrar, o deslocamento é UNIFORME POR BANDA.
//
// URUANO/NETUNO: textura REAL incumbente (SSS 2k). Sem bandas
// procedurais nesta fase (regra do dono, 2026-08-12).
//
// ANEL DE SATURNO (D6):
//   - raios contra o raio EQUATORIAL: 1,110–2,326
//     (D-ring 66 900 km / 60 268; F-ring 140 180 km / 60 268 —
//     cicatriz W5-B, celestialBodies.ts do doador)
//   - placa alpha (canal `ring` do manifest)
//   - CAMADA DE PARTÍCULAS (espalhamento simples plano-paralelo) no
//     lugar da chapa Lambert com piso — a queixa do dono de 25/08,
//     "os anéis de Saturno não estão visíveis"; ver
//     `GLSL_CAMADA_DO_ANEL`. O 0,34 fixo do doador segue fora.
//   - sombra planeta→anel: ocultador ELIPSOIDE; squash no eixo
//     POLAR do frame do anel (.z após RingGeometry + Rx(−π/2);
//     o comentário W5-B do doador). ESTRITAMENTE ANTI-SOLAR desde
//     2026-08-25: o Sol e a câmera entravam no frame do anel pela
//     rotação PARA A FRENTE em vez da inversa, e a sombra saía
//     espelhada — o dono a viu do lado do Sol na foto do item 91.
//     A ponte agora é `componentesNoFrameDoAnel`, uma só, porque o
//     erro estava copiado aqui e no anel de Quaoar. O interior
//     herdado de 0,22 caiu: umbra ZERO e penumbra de um Sol de
//     raio angular MEDIDO (`uSolAngRad`).
//   - sombra anel→planeta: interseção analítica do plano y=0, com
//     validade só GEOMÉTRICA. O fade de terminador (smoothstep 0…0,05)
//     morreu no item 104, 26/08: ele abria uma tira clara na fronteira
//     em vez de costurar.
//   - Saturno NÃO é receptor de eclipse (CORPOS_COM_ANEL)
// ============================================================
import * as THREE from 'three';
import { CAMADA_DOS_OCULTADORES } from '../../core/post';
import { AU_KM } from '../../../lib/atlas/elementosOrbitais';
import {
  AU_PARA_PC,
  eclipticaParaEquatorial,
} from '../../../lib/atlas/frameGalactico';
import { BODY_AXES, IAU_ORIENTATIONS } from '../../../lib/atlas/iauOrientation';
import type { PoliticaDeLuz } from '../../../lib/atlas/luz';
import {
  GLSL_LUZ_DA_VISITA,
  GLSL_VEU_DE_SATURNO,
  densidadeDoVeu,
  escreverLuzDaVisita,
  ganhoDoGlobo,
  uniformsDaLuzDaVisita,
  uniformsDoVeu,
} from '../../../lib/atlas/luzDaVisita';
import {
  CORPOS_COM_ANEL,
  GLSL_SOMBRA_ECLIPSE,
  PARES_DE_ECLIPSE,
  criaSombraNaCena,
  resolveSombraNaCena,
} from '../../../lib/atlas/eclipse';
import type { FonteDeEfemerides } from '../planetas/planetas';
import type { CalibracaoDaCasa } from '../../estrela';
import {
  A_MAG_BASE_PC,
  DESLOCAMENTO_UA_PARA_PC,
  faseDoVertice,
  magDoVertice,
} from '../planetas/planetas';
import { FOTOMETRIA, aMagBaseDe } from '../planetas/fotometria';
import { RETRATO_2026 } from '../planetas/retrato2026';
import { RAMP_DURATION_MS, stepRampToward } from '../lodStellar';
import { psfPointSizePx } from '../../luzDaCasa';
import { diametroAparentePx } from './corpos';
import { cessaoAlvo, gateBinario } from './terra';
import { CANAL_MAP, carregarCanaisDoCorpo, estadoAposFalha } from './texturas';
import type { CanalPedido, EstadoDasTexturas, OpcoesDeTextura } from './texturas';
import {
  componentesNoFrameDoAnel,
  orientacaoDoCorpoNaCena,
  orientacaoInercialDoAnelNaCena,
} from './orientacaoNaCena';
import { RAIO_SOL_KM } from '../../escala';
import {
  escreverSombraDeEclipse,
  uniformsDeEclipseNeutros,
} from './eclipseNoMaterial';

/** Os quatro gigantes da F4, Sol → fora. A lista é o DADO VIVO
 *  que o Director percorre — a mesma disciplina dos rochosos. */
export const GIGANTES: readonly { readonly id: string }[] = [
  { id: 'jupiter' },
  { id: 'saturn' },
  { id: 'uranus' },
  { id: 'neptune' },
];

/**
 * Raios do anel de Saturno em unidades do raio EQUATORIAL
 * (BODY_AXES.saturn[0] = 60 268 km). D-ring interno 66 900 / 60 268
 * = 1,110; F-ring externo 140 180 / 60 268 = 2,326. Cicatriz W5-B.
 */
export const ANEL_SATURNO = { rInt: 1.11, rExt: 2.326 } as const;

/**
 * Anéis U/N/Q — raios CITADOS de DADOS-ANEIS-F6.md, em unidades do
 * raio equatorial BODY_AXES. Urano: anel 6 → ε (French24 / PDS-U).
 * Netuno: Le Verrier → Adams (dePater18). Quaoar: Q2R → Q1R (Pereira23).
 */
export const ANEIS_CITADOS: Record<string, { rInt: number; rExt: number }> = {
  saturn: ANEL_SATURNO,
  uranus: { rInt: 41837.09 / 25559, rExt: 51149.07 / 25559 },
  neptune: { rInt: 53200 / 24764, rExt: 62933 / 24764 },
  // km publicados [Pereira23] sobre o raio EQUATORIAL da malha
  // (BODY_AXES.quaoar[0] = 543×1,18). Dividir pelo raio equivalente
  // 543 km esticava o anel 18% — a malha já está no elipsoide.
  quaoar: {
    rInt: 2520 / BODY_AXES.quaoar[0],
    rExt: 4057 / BODY_AXES.quaoar[0],
  },
};

/** Raios do corpo em pc — BODY_AXES pelos conversores únicos. */
export function raiosDoGigantePc(id: string): { a: number; c: number; b: number } {
  const [aKm, bKm, cKm] = BODY_AXES[id];
  return {
    a: (aKm / AU_KM) * AU_PARA_PC,
    c: (cKm / AU_KM) * AU_PARA_PC,
    b: (bKm / AU_KM) * AU_PARA_PC,
  };
}

/** Posição heliocêntrica em UA: efeméride viva, senão RETRATO. */
export function posicaoDoGiganteUA(
  id: string,
  jdTdb: number,
  fonte: FonteDeEfemerides | null
): { x: number; y: number; z: number } | null {
  if (fonte && Number.isFinite(jdTdb)) {
    return fonte.posicaoHeliocentrica(id, jdTdb);
  }
  const v = (RETRATO_2026 as Record<string, { vetorUA: readonly number[] }>)[id];
  return v ? { x: v.vetorUA[0], y: v.vetorUA[1], z: v.vetorUA[2] } : null;
}

// ------------------------------------------------------------
// GLSL
// ------------------------------------------------------------

const GIGANTE_VERT = /* glsl */ `
varying vec3 vLocal;
varying vec2 vUv;
void main() {
  vLocal = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GLSL_NORMAL_ELIPSOIDE = /* glsl */ `
// gradiente exato do elipsoide (x/a², y/c², z/b²) em unidades de a
vec3 normalDoCorpo(vec3 p, vec3 esc) { return normSeguro(p * esc); }
`;

/**
 * Sombra anel→planeta: interseção analítica com o plano equatorial
 * (y=0 no frame local: +Y é o polo, a convenção da SphereGeometry).
 * Densidade lida da placa alpha — não o 0,34 fixo do doador.
 *
 * ------------------------------------------------------------
 * NÃO HÁ FADE POR N·L AQUI, E ISSO É O ITEM 104 (S1, 26/08)
 * ------------------------------------------------------------
 * Até 26/08 esta função morria à força perto do terminador
 * (`smoothstep(0.0, 0.05, ndotl)`), e a queixa dele foi o resultado:
 * *"a transicao da sombra dos aneis para regiao de penumbra/noite nao
 * está bem feita. tinha que ser seamless"*. O fade não costurava —
 * ele ABRIA UM BURACO: a sombra sumia em N·L → 0 enquanto a logística
 * do terminador ainda vaza ~5 % de Sol EM N·L = 0, e a luz vazada
 * ficava acesa sozinha. Medido na vista da prancha, na linha y = 440:
 * o pixel caía a ~8 bytes dentro da sombra e SUBIA a ~65 na fronteira,
 * antes de morrer na noite. Uma tira clara entre a sombra e o escuro.
 *
 * A ordem do NASA Eyes não tem rampa nenhuma
 * (`getLightColorFromShadowRings`): a única validade é GEOMÉTRICA — o
 * raio até o plano do anel tem de ir para o lado do Sol (`d > 0.0`, o
 * nosso `t > 0`) e cair dentro da janela de raios —, e a sombra
 * multiplica a luz que CHEGA, antes do terminador. Assim sombra e
 * crepúsculo mordem o MESMO termo e morrem juntos na fronteira:
 * seamless por construção, sem fade. O comentário que pedia o fade
 * aqui, de 25/08, lia o risco ao contrário — multiplicar a sombra pela
 * luz do terminador APAGA, não acende.
 *
 * O teto de 0,9 fica: é dose da casa (o Eyes vai a 100 % com
 * `saturate(1 − alpha)`), e mexer nele é conferência com ele, não
 * receita.
 */
const GLSL_SOMBRA_ANEL_NO_PLANETA = /* glsl */ `
float sombraDoAnel(vec3 p) {
  if (uAnelAtivo < 0.5) return 1.0;
  if (abs(uDirSolLocal.y) < 1.0e-6) return 1.0;
  float t = -p.y / uDirSolLocal.y;
  if (t <= 0.0) return 1.0;
  vec3 hit = p + uDirSolLocal * t;
  float r = length(hit.xz);
  if (r <= uAnelRaios.x || r >= uAnelRaios.y) return 1.0;
  float u = (r - uAnelRaios.x) / max(uAnelRaios.y - uAnelRaios.x, 1.0e-6);
  float a = texture2D(uMapaAnel, vec2(u, 0.5)).a;
  return 1.0 - a * 0.9;
}
`;

/**
 * Lambert dos quatro; Saturno liga a sombra do anel pelo flag.
 *
 * ITEM 93 — A RECEITA DO EYES. O `max(N·L, 0)` cru virou
 * `terminadorSuave` (a logística s=3 do Phong deles), e a LANTERNA DE
 * LEITURA de 15 % entra DEPOIS do Sol, com a soma saturada em 1. As três
 * peças vêm de `luzDaVisita.ts` e acendem juntas em `assistida`; em
 * `real` os dois uniformes são 0 e este fragmento devolve o Lambert cru
 * de antes. Ver `docs/reference/nasa-eyes-brilho-assistido-contrato.md`
 * §4 — e a DIVERGÊNCIA declarada em `luzDaVisita.ts`: a lanterna aqui
 * respeita as duas sombras, porque acender uma sombra é apagar um fato
 * medido.
 *
 * O VÉU PALHA (§4.4) É A QUARTA PEÇA, e ela só existe em SATURNO: os
 * outros três entram no mesmo `globoComVeu` com coluna 0 e saem por ele
 * bit a bit. O véu é a ÚLTIMA coisa que acontece — mistura no limbo,
 * depois da superfície —, e o que o acende é `luzSol`, **não** a soma com
 * a lanterna: no Eyes a luz de câmera está na origem e a atmosfera a
 * pula. Trocar esse argumento pela soma seria acender palha na noite de
 * Saturno e no modo `real`.
 *
 * O `ndotlGeo` CRU continua sendo quem manda no ECLIPSE: ele é geometria,
 * não luz — passar a curva macia ali acenderia a sombra meio pixel antes
 * do terminador de verdade. A sombra do ANEL deixou de olhar N·L em 26/08
 * (item 104, S1): a validade dela é só geométrica, e o terminador entra
 * DEPOIS, multiplicando o mesmo termo.
 */
export const GIGANTE_LAMBERT_FRAG = /* glsl */ `
uniform sampler2D uMapaDia;
uniform sampler2D uMapaAnel;
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform vec3 uNormalEsc;
uniform vec3 uEscalaLocal;
uniform float uAnelAtivo;
uniform vec2 uAnelRaios;
varying vec3 vLocal;
varying vec2 vUv;
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_NORMAL_ELIPSOIDE}
${GLSL_SOMBRA_ECLIPSE}
${GLSL_LUZ_DA_VISITA}
${GLSL_VEU_DE_SATURNO}
${GLSL_SOMBRA_ANEL_NO_PLANETA}
void main() {
  vec3 n = normalDoCorpo(vLocal, uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;
  float ndotlGeo = dot(n, uDirSolLocal);
  vec3 albedo = texture2D(uMapaDia, vUv).rgb;
  vec3 view = normSeguro(uCamLocal - pElip);
  vec3 eclipse = fatorDeEclipse(pElip, n, ndotlGeo);
  vec3 sombras = eclipse * sombraDoAnel(pElip);
  vec3 luzSol = vec3(terminadorSuave(ndotlGeo)) * uLuzGanho * sombras;
  vec3 fill = lanternaDeLeitura(n, view, eclipse);
  gl_FragColor =
    vec4(globoComVeu(albedo, luzSol, fill, opacidadeDoVeu(dot(n, view))), 1.0);
}
`;

export const ANEL_VERT = /* glsl */ `
varying vec3 vPos;
void main() {
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * I/F do anel A/B em RETROESPALHAMENTO, com Sol e câmera à mesma
 * elevação sobre o plano — o número âncora desta casa para o gelo.
 *
 * É a grandeza que Voyager e Cassini de fato mediram (o anel B sai em
 * ~0,5 em baixa fase, contra ~0,6 no centro do disco de Saturno), e é
 * por isso que nas fotos o anel bate ou passa o globo. Ancora-se ELA,
 * e não `ϖ₀` e `P(α)` soltos: destes dois a casa não tem tabela, e
 * fingir que tem seria número inventado com cara de ciência.
 */
export const IF_RETRO_DO_GELO = 0.5;

/**
 * O PICO de `luminância_linear / alpha` da placa `ring` de Saturno,
 * medido texel a texel na linha central de `ring.png` (8192×500; a
 * placa é constante em v), contado só onde ela é opaca. Vale 0,2873, no
 * anel B (u = 0,531) — e é ele que denuncia o segundo defeito: a placa
 * é uma FOTOGRAFIA escura, não um albedo. Mesmo com iluminação cheia,
 * `placa.rgb` sozinho não passa de 0,25 em linear, enquanto o globo
 * chega a ~0,7. Dividir pela cobertura (`alpha`, que a foto já embutiu)
 * e por este pico devolve o PERFIL RADIAL por partícula — que é o que a
 * placa realmente sabe: gradações do B, o C mais sujo, a divisão.
 */
export const PICO_DA_PLACA_DO_ANEL = 0.2873;

/**
 * A COR do gelo do anel, normalizada a luminância 1 — medida na PRÓPRIA
 * placa, na média dos 1 803 texels em que ela é opaca (alpha > 0,90),
 * que é a única parte dela em que a croma é confiável.
 *
 * POR QUE NÃO USAR A CROMA DA PLACA INTEIRA: ela tem MATTE. Medido no
 * arquivo, faixa a faixa, a razão azul/vermelho acompanha o alpha —
 * 0,75 (o tan correto) onde alpha > 0,8, e 2,7 onde alpha < 0,2. Anel
 * nenhum é azul; aquilo é o fundo do arquivo de origem sangrando no
 * semitransparente. Sob a chapa Lambert antiga o azul não aparecia
 * porque tudo estava escuro demais para ter cor; ao acender o anel ele
 * virou um halo violeta no C — visto a olho na primeira foto desta
 * obra, não medido por régua nenhuma.
 */
export const COR_DO_GELO_DO_ANEL = [1.145, 0.97, 0.867] as const;

/**
 * O ANEL É UMA CAMADA DE PARTÍCULAS, NÃO UMA CHAPA LAMBERT.
 *
 * A QUEIXA DO DONO (2026-08-25, olhando as fotos do item 91): "os anéis
 * de Saturno não estão visíveis". A foto lhe dava razão — o globo saiu
 * do carvão para a palha e o anel continuou uma mancha marrom.
 *
 * O QUE CAIU, e por quê: o anel era `max(abs(nDotL), 0.12)`, uma chapa
 * Lambert com piso. Inclinar uma chapa Lambert espalha a mesma luz por
 * mais área e o brilho cai com o cosseno. Inclinar uma CAMADA empilha
 * mais partículas na linha de visada na MESMA proporção, e os dois
 * efeitos se cancelam: o brilho de superfície de um anel não desaba com
 * a incidência. Com o Sol rasante sobre o plano — o caso de Saturno
 * agora, logo depois do equinócio de 2025 — o cosseno afundava, o piso
 * de 0,12 assumia, e o anel virava 0,12 × placa escura. Era a lama.
 *
 * O QUE ENTRA: espalhamento simples de camada plano-paralela, a forma
 * clássica (Chandrasekhar) com que a fotometria dos anéis se escreve,
 * com τ lido da opacidade da própria placa:
 *
 *   reflexão (câmera do lado iluminado):
 *     I/F = A · μ₀/(μ+μ₀) · [1 − e^{−τ(1/μ + 1/μ₀)}]
 *   transmissão (câmera do lado escuro):
 *     I/F = A · μ₀/(μ₀−μ) · [e^{−τ/μ₀} − e^{−τ/μ}]
 *
 * A transmissão não é enfeite: é ela que faz o anel B espesso ficar
 * PRETO visto por trás enquanto a divisão de Cassini ACENDE — a imagem
 * que a Cassini tornou famosa, e que a chapa Lambert não sabia fazer.
 *
 * A amplitude `A` sai da âncora, não de constantes soltas: `2 · fase`
 * faz o modelo devolver exatamente {@link IF_RETRO_DO_GELO} quando o
 * Sol está às costas da câmera, a camada é espessa e μ = μ₀. O teste
 * cobra esse identidade.
 */
export const G_DO_ANEL = -0.25;
export const K_DIFRACAO = 1.5;

const GLSL_CAMADA_DO_ANEL = /* glsl */ `
// assimetria da fase: partícula de regolito de gelo RETROESPALHA
// (g < 0). Suave de propósito — Henyey-Greenstein forte derrubaria o
// anel a um nono do brilho em fase 90°, e o céu real não faz isso.
const float G_DO_ANEL = ${G_DO_ANEL};
// o lobo de DIFRAÇÃO para a frente, que acende o anel contra o Sol. O
// lobo verdadeiro tem segundos de arco (partículas de cm a m) e não
// sobrevive a um pixel: a LARGURA aqui é de cinema (expoente 6, o
// mesmo que a casa já usava), a presença é física.
const float K_DIFRACAO = ${K_DIFRACAO};

// opacidade e profundidade óptica são a mesma coisa em duas línguas:
// a placa guarda α = 1 − e^{−τ} visto de cima.
float tauDaOpacidade(float alfa) {
  return -log(max(1.0 - alfa, 1.0e-3));
}

// a FORMA da curva de fase, normalizada em retro (vale 1 quando o Sol
// está às costas da câmera). cosTheta é o cosseno do ângulo de
// ESPALHAMENTO: +1 para a frente, −1 em retro.
float faseDoAnel(float cosTheta) {
  float g2 = G_DO_ANEL * G_DO_ANEL;
  float hg = (1.0 - g2) * pow(max(1.0 + g2 - 2.0 * G_DO_ANEL * cosTheta, 1.0e-4), -1.5);
  float retro = (1.0 - g2) * pow(1.0 + g2 + 2.0 * G_DO_ANEL, -1.5);
  return hg / retro + K_DIFRACAO * pow(max(cosTheta, 0.0), 6.0);
}

// x = brilho ONDE a camada cobre, em unidades da âncora de retro;
// y = COBERTURA na linha de visada — mais opaca de esguelha que de
// cima, que é a razão de a divisão fechar quando o anel se deita.
vec2 camadaDeParticulas(float tau, float mu0, float mu, float fase, float mesmoLado) {
  float cobertura = 1.0 - exp(-tau / mu);
  float amp = 2.0 * fase;
  float iF;
  if (mesmoLado > 0.0) {
    iF = amp * (mu0 / (mu + mu0)) * (1.0 - exp(-tau * (1.0 / mu + 1.0 / mu0)));
  } else {
    float d = mu0 - mu;
    iF = abs(d) < 1.0e-3
      ? amp * (tau / mu0) * exp(-tau / mu0)
      : amp * (mu0 / d) * (exp(-tau / mu0) - exp(-tau / mu));
  }
  return vec2(iF / max(cobertura, 1.0e-4), cobertura);
}
`;

/**
 * A SOMBRA DO GLOBO SOBRE O ANEL — ocultador ELIPSOIDE, squash no eixo
 * polar do frame do anel (a cicatriz W5-B, que o dono manda preservar).
 *
 * DEVOLVE A FRAÇÃO DO DISCO SOLAR que o ponto do anel ainda enxerga: 1
 * fora da sombra, 0 na umbra, e no meio a área de um disco cortado por
 * um limbo reto. Duas coisas mudaram, e as duas são medida no lugar de
 * herança:
 *
 * 1. O INTERIOR. Era `0,22` — um número que ninguém mediu, dizendo que
 *    22% da luz atravessa o corpo de Saturno. Não atravessa: luz DIRETA
 *    do Sol na umbra é ZERO, e zero é o que entra. (O que de fato
 *    ilumina a umbra é o brilho do próprio globo, medido e registrado
 *    como pendência em `docs/PENDENCIAS.md`: entre ~5% da luz solar na
 *    borda do anel D e ~0,2% no F — isto é, de 4× a 100× menos do que
 *    o 0,22 pintava, e caindo com o raio em vez de constante.)
 *
 * 2. A BORDA. O Sol é um DISCO, não um ponto: visto de Saturno tem raio
 *    angular de 0,0275° (`uSolAngRad`, medido da distância do corpo).
 *    A meia-penumbra no plano do anel é esse ângulo vezes o caminho até
 *    o ocultador — ~70 km, sub-pixel na maioria das vistas, mas é ela
 *    que troca o degrau serrilhado por uma borda. A aproximação
 *    declarada é o LIMBO RETO (o globo é ~2 000× maior em ângulo que a
 *    penumbra) e o disco solar UNIFORME (sem escurecimento de bordo);
 *    a meia-penumbra sai no frame já achatado, o que a distorce em até
 *    10% num número que vale menos de um pixel.
 */
const GLSL_SOMBRA_DO_PLANETA_NO_ANEL = /* glsl */ `
float sombraDoPlaneta(vec3 p) {
  float k = max(uKPolar, 1.0e-4);
  // o achatamento vira esfera unitária; o anel mora em z = 0
  vec3 o = vec3(p.x, p.y, p.z / k);
  vec3 d = normalize(vec3(uDirSolLocal.x, uDirSolLocal.y, uDirSolLocal.z / k));
  // caminhar PARA o Sol: só o lado anti-solar pode topar no globo
  float aproxima = -dot(o, d);
  if (aproxima <= 0.0) return 1.0;
  float impacto = length(o + d * aproxima);
  float meia = max(uSolAngRad * aproxima, 1.0e-6);
  float x = clamp((impacto - 1.0) / meia, -1.0, 1.0);
  return 1.0 - (acos(x) - x * sqrt(max(1.0 - x * x, 0.0))) / 3.14159265358979;
}
`;

/**
 * Anel de Saturno: placa alpha + camada de partículas + sombra do
 * planeta elipsoide. vPos está no frame da RingGeometry (plano XY); o
 * mesh aplica Rx(−π/2), então +Z deste frame é o POLO (W5-B).
 */
export const ANEL_FRAG = /* glsl */ `
uniform sampler2D uMapaAnel;
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform float uKPolar;
uniform float uSolAngRad;
uniform vec2 uAnelRaios;
varying vec3 vPos;
const float IF_RETRO = ${IF_RETRO_DO_GELO};
const float PICO_DA_PLACA = ${PICO_DA_PLACA_DO_ANEL};
const vec3 COR_DO_GELO = vec3(${COR_DO_GELO_DO_ANEL.join(', ')});
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_SOMBRA_DO_PLANETA_NO_ANEL}
${GLSL_CAMADA_DO_ANEL}
void main() {
  float r = length(vPos.xy);
  float u = (r - uAnelRaios.x) / max(uAnelRaios.y - uAnelRaios.x, 1.0e-6);
  vec4 placa = texture2D(uMapaAnel, vec2(clamp(u, 0.0, 1.0), 0.5));
  float alfa = placa.a;
  if (alfa < 0.004) discard;
  vec3 n = vec3(0.0, 0.0, 1.0);
  vec3 view = normSeguro(uCamLocal - vPos);
  float nDotL = dot(n, uDirSolLocal);
  float nDotV = dot(n, view);
  float mu0 = max(abs(nDotL), 0.02);
  float mu = max(abs(nDotV), 0.02);
  float cosTheta = clamp(-dot(uDirSolLocal, view), -1.0, 1.0);
  float mesmoLado = nDotL * nDotV;
  vec2 camada = camadaDeParticulas(
    tauDaOpacidade(alfa), mu0, mu, faseDoAnel(cosTheta), mesmoLado
  );
  // a placa é foto: tirar a cobertura que ela já embutiu e o pico
  // medido devolve o PERFIL por partícula, que é o que ela sabe. A
  // CROMA dela só vale onde é opaca — abaixo disso é a matte, e a cor
  // cai para o gelo medido no próprio anel B.
  vec3 crua = placa.rgb / max(alfa * PICO_DA_PLACA, 1.0e-4);
  float perfil = dot(crua, vec3(0.2126, 0.7152, 0.0722));
  vec3 tinta = clamp(
    mix(COR_DO_GELO * perfil, crua, smoothstep(0.30, 0.80, alfa)), 0.0, 1.0
  );
  if (dot(tinta, tinta) < 1.0e-6) tinta = COR_DO_GELO;
  vec3 direta =
    (tinta * IF_RETRO) * (camada.x * uLuzGanho) * sombraDoPlaneta(vPos);
  gl_FragColor = vec4(direta, clamp(camada.y, 0.0, 1.0));
}
`;

/**
 * ANEL PROCEDURAL (F6) — Urano/Netuno/Quaoar. Sem placa de missão.
 * Dosagem honesta: partículas de carvão (albedo ~0,05); Urano ε
 * assimétrico (peri 19,7 → apo 96,4 km); Netuno só arcos
 * Fraternité+Égalité; o resto é traço/véu.
 *
 * A CAMADA É A MESMA de Saturno — {@link GLSL_CAMADA_DO_ANEL}, uma
 * fonte de verdade. A chapa Lambert com piso 0,12 morava aqui também,
 * copiada linha a linha; o que separa estes anéis do de Saturno não é
 * o modelo de luz, é o ALBEDO: carvão em vez de gelo. O I/F de retro
 * entra pela cor, e a cor continua sendo a deles.
 */
export const ANEL_PROC_FRAG = /* glsl */ `
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform float uKPolar;
uniform float uSolAngRad;
uniform vec2 uAnelRaios;
uniform float uModo; // 0=Urano 1=Netuno 2=Quaoar
varying vec3 vPos;
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_SOMBRA_DO_PLANETA_NO_ANEL}
${GLSL_CAMADA_DO_ANEL}
void main() {
  float r = length(vPos.xy);
  float u = (r - uAnelRaios.x) / max(uAnelRaios.y - uAnelRaios.x, 1.0e-6);
  if (u < 0.0 || u > 1.0) discard;
  float lon = atan(vPos.y, vPos.x);
  float alpha = 0.04;
  if (uModo < 0.5) {
    // Urano: ε domina (u→1), largura cresce no apoapse (lon≈0)
    float eps = smoothstep(0.82, 0.92, u);
    float assim = 0.35 + 0.65 * (0.5 + 0.5 * cos(lon));
    alpha = mix(0.03, 0.22 * assim, eps);
  } else if (uModo < 1.5) {
    // Netuno: traço + arcos Fraternité (0–10°) e Égalité (~11–14°)
    float deg = degrees(lon);
    if (deg < 0.0) deg += 360.0;
    float arco = 0.0;
    if (deg < 10.0) arco = 1.0;
    else if (deg > 10.5 && deg < 14.0) arco = 0.7;
    alpha = mix(0.02, 0.28, arco) * smoothstep(0.85, 1.0, u);
  } else {
    // Quaoar: Q1R (u→1) didático; um setor denso
    float deg = degrees(lon);
    if (deg < 0.0) deg += 360.0;
    float setor = deg < 22.0 ? 1.0 : 0.0;
    // didático a 42 UA: o τ real some; um anel fino + arco denso.
    float faixa = smoothstep(0.72, 0.84, u) * (1.0 - smoothstep(0.96, 1.0, u));
    alpha = mix(0.35, 0.9, setor) * faixa;
  }
  if (alpha < 0.004) discard;
  vec3 n = vec3(0.0, 0.0, 1.0);
  vec3 view = normSeguro(uCamLocal - vPos);
  float nDotL = dot(n, uDirSolLocal);
  float nDotV = dot(n, view);
  float mu0 = max(abs(nDotL), 0.02);
  float mu = max(abs(nDotV), 0.02);
  float cosTheta = clamp(-dot(uDirSolLocal, view), -1.0, 1.0);
  float mesmoLado = nDotL * nDotV;
  vec2 camada = camadaDeParticulas(
    tauDaOpacidade(alpha), mu0, mu, faseDoAnel(cosTheta), mesmoLado
  );
  // carvão (Urano/Netuno) e o cinza avermelhado de Quaoar: é o I/F de
  // retro DELES, e é só nisto que diferem do gelo de Saturno.
  vec3 albedo = uModo > 1.5 ? vec3(0.42, 0.34, 0.26) : vec3(0.06, 0.055, 0.05);
  vec3 direta = albedo * (camada.x * uLuzGanho) * sombraDoPlaneta(vPos);
  gl_FragColor = vec4(direta, clamp(camada.y, 0.0, 1.0));
}
`;

// ------------------------------------------------------------
// A classe
// ------------------------------------------------------------

export interface QuadroDoGigante {
  jdTdb: number;
  fonte: FonteDeEfemerides | null;
  camPosPc: THREE.Vector3;
  screenHPx: number;
  fovDeg: number;
  ligado: boolean;
  atlasQuente: boolean;
  politica: PoliticaDeLuz;
  dtS: number;
  psf: CalibracaoDaCasa;
  salto: boolean;
}

export interface EstadoDoGigante {
  emQuadro: boolean;
  carregando: boolean;
  gateArmado: boolean;
  cede: number;
  emRampa: boolean;
  raioPc: number;
  centroPc: THREE.Vector3;
  diametroPx: number;
  rUA: number;
}

/** O bloco comum de textura (`OpcoesDeTextura`) mais o id do gigante —
 *  a classe serve aos quatro. */
export interface OpcoesDoGigante extends OpcoesDeTextura {
  id: string;
}

/**
 * O ANEL de Saturno como CANAL do mesmo lote (22/08). Não repete em U:
 * a placa é radial, não equiretangular — repetir emendaria a borda
 * externa na interna. Antes ele descia DEPOIS do `map`, e já publicado:
 * uma falha do anel voltava o corpo inteiro a 'fria' e recarregava o
 * `map` por cima, até três mapas residentes e Saturno nunca em quadro.
 */
const CANAL_ANEL: CanalPedido = { canal: 'ring', cor: true, repetirEmU: false };

export class GiganteResolvido {
  readonly group = new THREE.Group();

  private readonly idCorpo: string;
  private readonly raioA: number;
  private readonly razaoC: number;
  private readonly razaoB: number;
  private readonly kPolar: number;
  private readonly temAnel: boolean;

  private readonly centro = new THREE.Vector3(Number.NaN, Number.NaN, Number.NaN);
  private jdEscrito = Number.NaN;
  private fonteEscrita: FonteDeEfemerides | null = null;
  private rUA = Number.NaN;
  private armado = false;
  private readonly sombra = criaSombraNaCena();

  private texturas: EstadoDasTexturas = 'fria';
  private recargas = 0;
  private readonly texturasVivas: THREE.Texture[] = [];
  private disposto = false;

  private geometria: THREE.SphereGeometry | null = null;
  private superficie: THREE.Mesh | null = null;
  private matSuperficie: THREE.ShaderMaterial | null = null;
  private geoAnel: THREE.RingGeometry | null = null;
  private anel: THREE.Mesh | null = null;
  private matAnel: THREE.ShaderMaterial | null = null;
  private dummyAnel: THREE.DataTexture | null = null;

  private readonly vX = new THREE.Vector3();
  private readonly vY = new THREE.Vector3();
  private readonly vZ = new THREE.Vector3();
  private readonly vAnelX = new THREE.Vector3();
  private readonly vAnelY = new THREE.Vector3();
  private readonly vAnelZ = new THREE.Vector3();
  private readonly vTmp = new THREE.Vector3();
  private readonly vSol = new THREE.Vector3();
  private readonly vEscala = new THREE.Vector3();
  private readonly mRx = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  private readonly estado: EstadoDoGigante;

  get estadoVivo(): Readonly<EstadoDoGigante> {
    return this.estado;
  }

  get id(): string {
    return this.idCorpo;
  }

  get planeta(): boolean {
    return true;
  }

  private readonly opcoes: OpcoesDoGigante;

  constructor(opcoes: OpcoesDoGigante) {
    this.opcoes = opcoes;
    this.idCorpo = opcoes.id;
    const { a, c, b } = raiosDoGigantePc(this.idCorpo);
    this.raioA = a;
    this.razaoC = c / a;
    this.razaoB = b / a;
    this.kPolar = c / a;
    this.temAnel = (CORPOS_COM_ANEL as readonly string[]).includes(this.idCorpo);
    this.group.visible = false;
    this.estado = {
      emQuadro: false,
      carregando: false,
      gateArmado: false,
      cede: 0,
      emRampa: false,
      raioPc: a,
      centroPc: this.centro,
      diametroPx: Number.NaN,
      rUA: Number.NaN,
    };
  }

  atualizar(q: QuadroDoGigante): EstadoDoGigante {
    const e = this.estado;
    if (this.disposto) return e;

    let saltoDeData = false;
    if (
      (q.jdTdb !== this.jdEscrito || q.fonte !== this.fonteEscrita) &&
      Number.isFinite(q.jdTdb)
    ) {
      saltoDeData = true;
      this.jdEscrito = q.jdTdb;
      this.fonteEscrita = q.fonte;
      const p = posicaoDoGiganteUA(this.idCorpo, q.jdTdb, q.fonte);
      if (p) {
        this.rUA = Math.hypot(p.x, p.y, p.z);
        const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
        this.centro.set(eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC);
        const eclipsadorId = PARES_DE_ECLIPSE[this.idCorpo];
        if (q.fonte && eclipsadorId) {
          const pEcl = q.fonte.posicaoHeliocentrica(eclipsadorId, q.jdTdb);
          resolveSombraNaCena(
            this.idCorpo,
            [p.x, p.y, p.z],
            [pEcl.x, pEcl.y, pEcl.z],
            this.sombra
          );
        } else {
          this.sombra.ativo = false;
        }
      } else {
        this.rUA = Number.NaN;
        this.centro.set(Number.NaN, Number.NaN, Number.NaN);
        this.sombra.ativo = false;
      }
    }
    e.rUA = this.rUA;

    const dPc = q.camPosPc.distanceTo(this.centro);
    const diametroPx = diametroAparentePx(this.raioA, dPc, q.screenHPx, q.fovDeg);
    e.diametroPx = diametroPx;

    this.armado = gateBinario(this.armado, diametroPx);

    if (this.texturas === 'fria' && (this.armado || q.atlasQuente)) {
      this.iniciarCarga();
    }

    const emQuadro =
      this.armado &&
      q.ligado &&
      this.texturas === 'pronta' &&
      Number.isFinite(this.centro.x);
    e.emQuadro = emQuadro;
    e.carregando = this.texturas === 'buscando';
    e.gateArmado = this.armado;
    this.group.visible = emQuadro;

    const base = q.fonte
      ? aMagBaseDe(FOTOMETRIA[this.idCorpo].H, this.rUA) + DESLOCAMENTO_UA_PARA_PC
      : A_MAG_BASE_PC[this.idCorpo];
    const fase = faseDoVertice(
      this.centro.x, this.centro.y, this.centro.z,
      q.camPosPc.x, q.camPosPc.y, q.camPosPc.z
    );
    const halo = psfPointSizePx(
      magDoVertice(base, dPc, fase),
      q.psf.expoM0,
      q.psf.sigmaPx,
      q.screenHPx
    );
    const alvo = cessaoAlvo(emQuadro, diametroPx, halo);
    e.cede =
      q.salto || saltoDeData
        ? alvo
        : stepRampToward(e.cede, alvo, q.dtS, RAMP_DURATION_MS);
    e.emRampa = e.cede !== alvo;

    if (emQuadro) this.posicionar(q);
    return e;
  }

  private posicionar(q: QuadroDoGigante) {
    const { colunaX, colunaY, colunaZ } = orientacaoDoCorpoNaCena(
      IAU_ORIENTATIONS[this.idCorpo],
      this.jdEscrito
    );
    this.vX.set(colunaX[0], colunaX[1], colunaX[2]);
    this.vY.set(colunaY[0], colunaY[1], colunaY[2]);
    this.vZ.set(colunaZ[0], colunaZ[1], colunaZ[2]);

    const sup = this.superficie!;
    sup.matrix
      .makeBasis(this.vX, this.vY, this.vZ)
      .scale(this.vEscala.set(this.raioA, this.raioA * this.razaoC, this.raioA * this.razaoB))
      .setPosition(this.centro);

    // a exposição da visita (item 91, reescrita no 93): em `assistida` o
    // Sol do globo vale 1 literal, como no Eyes; em `real` é E(d). O
    // ANEL recebe o MESMO `ganho` lá embaixo — o anel de Saturno paga a
    // mesma conta do globo, e era o 0,21 dele que o apagava junto.
    const ganho = ganhoDoGlobo(this.rUA, q.politica);
    // ONDE ESTÁ O SOL, uma vez só por corpo: na ORIGEM da cena. O anel
    // lá embaixo bebe DESTE vetor — tinha um segundo cálculo idêntico
    // só para ele, e dois cadastros da mesma verdade é como uma inversão
    // se esconde (item 91).
    const dirSol = this.vSol.copy(this.centro).multiplyScalar(-1);
    const norma = Math.max(dirSol.length(), 1e-30);
    dirSol.multiplyScalar(1 / norma);
    const sLx = dirSol.dot(this.vX);
    const sLy = dirSol.dot(this.vY);
    const sLz = dirSol.dot(this.vZ);

    const delta = this.vTmp.copy(q.camPosPc).sub(this.centro);
    const cLx = delta.dot(this.vX) / this.raioA;
    const cLy = delta.dot(this.vY) / this.raioA;
    const cLz = delta.dot(this.vZ) / this.raioA;

    const u = this.matSuperficie!.uniforms;
    (u.uDirSolLocal.value as THREE.Vector3).set(sLx, sLy, sLz);
    (u.uCamLocal.value as THREE.Vector3).set(cLx, cLy, cLz);
    u.uLuzGanho.value = ganho;
    // a lanterna de leitura e o `s` do terminador (item 93) — a MESMA
    // política, escrita pelo único escritor da casa. O ANEL fica de
    // fora: o modelo dele é camada de partículas com função de fase.
    // A densidade do véu entra porque o Eyes amacia o terminador onde há
    // atmosfera: em Saturno o s cai a 2,8986; nos outros, 3 exato.
    escreverLuzDaVisita(u, q.politica, densidadeDoVeu(this.idCorpo));
    escreverSombraDeEclipse(u, this.sombra, this.vX, this.vY, this.vZ, 0);

    if (this.anel && this.matAnel) {
      // M = Basis INERCIAL · S(a) · Rx(−π/2): o padrão não herda W(t)
      const inercial = orientacaoInercialDoAnelNaCena(
        IAU_ORIENTATIONS[this.idCorpo],
        this.jdEscrito
      );
      this.vAnelX.set(inercial.colunaX[0], inercial.colunaX[1], inercial.colunaX[2]);
      this.vAnelY.set(inercial.colunaY[0], inercial.colunaY[1], inercial.colunaY[2]);
      this.vAnelZ.set(inercial.colunaZ[0], inercial.colunaZ[1], inercial.colunaZ[2]);
      this.anel.matrix
        .makeBasis(this.vAnelX, this.vAnelY, this.vAnelZ)
        .scale(this.vEscala.set(this.raioA, this.raioA, this.raioA))
        .multiply(this.mRx)
        .setPosition(this.centro);
      const ua = this.matAnel.uniforms;
      componentesNoFrameDoAnel(
        dirSol, this.vAnelX, this.vAnelY, this.vAnelZ,
        ua.uDirSolLocal.value as THREE.Vector3
      );
      componentesNoFrameDoAnel(
        delta, this.vAnelX, this.vAnelY, this.vAnelZ,
        ua.uCamLocal.value as THREE.Vector3
      ).divideScalar(this.raioA);
      ua.uLuzGanho.value = ganho;
      // o Sol é um DISCO: raio angular visto DESTE corpo, para a penumbra
      ua.uSolAngRad.value = RAIO_SOL_KM / Math.max(this.rUA * AU_KM, 1e-30);
    }
  }

  private garantirCasca() {
    if (this.geometria || this.disposto) return;
    this.geometria = new THREE.SphereGeometry(1, 128, 64);
    if (!this.dummyAnel) {
      this.dummyAnel = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
      this.dummyAnel.needsUpdate = true;
    }
    this.matSuperficie = new THREE.ShaderMaterial({
      vertexShader: GIGANTE_VERT,
      fragmentShader: GIGANTE_LAMBERT_FRAG,
      uniforms: {
        uMapaDia: { value: null },
        uMapaAnel: { value: this.dummyAnel },
        uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
        uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
        uLuzGanho: { value: 1 },
        uNormalEsc: {
          value: new THREE.Vector3(1, 1 / (this.razaoC * this.razaoC), 1 / (this.razaoB * this.razaoB)),
        },
        uEscalaLocal: { value: new THREE.Vector3(1, this.razaoC, this.razaoB) },
        uAnelAtivo: { value: this.temAnel ? 1 : 0 },
        uAnelRaios: {
          value: new THREE.Vector2(
            (ANEIS_CITADOS[this.idCorpo] ?? ANEL_SATURNO).rInt,
            (ANEIS_CITADOS[this.idCorpo] ?? ANEL_SATURNO).rExt
          ),
        },
        ...uniformsDaLuzDaVisita(),
        // o véu do §4.4 é do CORPO, não do quadro: coluna, espessura e a
        // palha nascem aqui e não se mexem mais. Quem não tem véu recebe
        // coluna 0, e o chunk devolve a identidade.
        ...uniformsDoVeu(this.idCorpo),
        ...uniformsDeEclipseNeutros(),
      },
      depthWrite: true,
      depthTest: true,
      transparent: false,
    });
    this.superficie = new THREE.Mesh(this.geometria, this.matSuperficie);
    // globo opaco = ocultador do rascunho do campo (item 47): estrela
    // atrás dele não deposita clarão. Anel/atmosfera/nuvens ficam fora.
    this.superficie.layers.enable(CAMADA_DOS_OCULTADORES);
    this.superficie.matrixAutoUpdate = false;
    this.group.add(this.superficie);

    if (this.temAnel) {
      const anel = ANEIS_CITADOS[this.idCorpo] ?? ANEL_SATURNO;
      const placa = this.idCorpo === 'saturn';
      const modo = this.idCorpo === 'neptune' ? 1 : this.idCorpo === 'quaoar' ? 2 : 0;
      this.geoAnel = new THREE.RingGeometry(anel.rInt, anel.rExt, 192);
      this.matAnel = new THREE.ShaderMaterial({
        vertexShader: ANEL_VERT,
        fragmentShader: placa ? ANEL_FRAG : ANEL_PROC_FRAG,
        uniforms: {
          uMapaAnel: { value: this.dummyAnel },
          uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
          uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
          uLuzGanho: { value: 1 },
          uKPolar: { value: this.kPolar },
          uSolAngRad: { value: 0 },
          uAnelRaios: { value: new THREE.Vector2(anel.rInt, anel.rExt) },
          uModo: { value: modo },
        },
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      });
      this.anel = new THREE.Mesh(this.geoAnel, this.matAnel);
      this.anel.matrixAutoUpdate = false;
      this.group.add(this.anel);
    }
  }

  /** a carga preguiçosa — `map` e, em Saturno, o `ring`, no MESMO lote:
   *  ou os dois entram, ou nenhum entra e nada fica residente. */
  private iniciarCarga() {
    this.texturas = 'buscando';
    const id = this.idCorpo;
    const comAnel = this.temAnel && id === 'saturn';
    const pedido = comAnel ? [CANAL_MAP, CANAL_ANEL] : [CANAL_MAP];
    void carregarCanaisDoCorpo(id, pedido, this.opcoes, () => this.disposto)
      .then((porCanal) => {
        // cancelada no caminho: o lote já foi descartado lá dentro
        if (!porCanal) return;
        // e o microtask entre a chegada e esta linha ainda cabe um
        // `dispose()` do Director — o lote não fica sem dono
        if (this.disposto) {
          for (const t of porCanal.values()) t.dispose();
          return;
        }
        const tex = porCanal.get('map')!;
        this.garantirCasca();
        this.matSuperficie!.uniforms.uMapaDia.value = tex;
        this.texturasVivas.push(tex);
        if (comAnel) {
          const texAnel = porCanal.get('ring')!;
          this.matSuperficie!.uniforms.uMapaAnel.value = texAnel;
          this.matAnel!.uniforms.uMapaAnel.value = texAnel;
          this.texturasVivas.push(texAnel);
        }
        this.texturas = 'pronta';
      })
      .catch(() => {
        if (this.disposto) return;
        const r = estadoAposFalha(this.recargas, id, 'o corpo não nasce nesta sessão');
        this.recargas = r.recargas;
        this.texturas = r.texturas;
      });
  }

  dispose() {
    this.disposto = true;
    this.group.clear();
    this.geometria?.dispose();
    this.matSuperficie?.dispose();
    this.geoAnel?.dispose();
    this.matAnel?.dispose();
    this.dummyAnel?.dispose();
    for (const t of this.texturasVivas) t.dispose();
    this.texturasVivas.length = 0;
  }
}
