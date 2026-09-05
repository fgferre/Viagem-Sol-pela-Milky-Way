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
import { fetchBinary } from '../../config';
// o NEAR do quadro pelo MESMO escritor que o engine usa (item 135): a
// lajota do anel (139) apaga o grão que o plano de corte cortaria ao meio
import { PISO_DO_NEAR_EM_RAIOS, nearPlanePc } from '../../core/engine';
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
import { A_MAG_BASE_PC, DESLOCAMENTO_UA_PARA_PC } from '../planetas/planetas';
import { FOTOMETRIA, aMagBaseDe } from '../planetas/fotometria';
import { RETRATO_2026 } from '../planetas/retrato2026';
import { RAMP_DURATION_MS, stepRampToward } from '../lodStellar';
import { GLSL_RUIDO_DE_VALOR, diametroAparentePx } from './corpos';
import { AneisTenuesDeSaturno } from './aneisTenues';
import type { QuadroDosAneisTenues } from './aneisTenues';
import { LajotaDoAnel, VOLUME_DA_LAJOTA } from './lajotaDoAnel';
import type { QuadroDaLajota } from './lajotaDoAnel';
import { posicaoKepler } from '../../../lib/atlas/kepler';
import { alvoDaCessaoDoCorpo, gateBinario } from './terra';
import { CANAL_MAP, type Seguradores, TexturasDoCorpo } from './texturas';
import type { OpcoesDeTextura } from './texturas';
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
 * O PERFIL RADIAL MEDIDO DO ANEL — o dado que aposentou a placa.
 *
 * 13.177 amostras a 5 km do modelo de anéis de Björn Jónsson (Voyager
 * PPS + Cassini, via o PDS Ring-Moon Systems Node), reamostradas em
 * 2.048 caixas de 36 km sobre 66 900–140 500 km. Dois arquivos, 14 KB:
 *
 *  - `anel-saturno-perfil.bin` — 2048 × RGBA8: **RGB** = cor da
 *    partícula (relativa, cada canal normalizado ao próprio máximo pela
 *    fonte), **A** = opacidade `1 − transparência`, que é `1 − e^{−τ}`
 *    visto de cima. É ele que entra em `uMapaAnel`.

 *
 * O QUE A PLACA NÃO SABIA e este dado sabe: a divisão de ENCKE (α 0,008
 * contra 0,401 do anel A ao lado), o C translúcido de verdade, e o
 * LADO ESCURO medido — o número que o item 133 teve de adivinhar.
 *
 * O LIMITE DECLARADO É O BYTE: com α em 8 bits, os 22 texels em 255
 * saem de `tauDaOpacidade` com τ ≈ 6,9 em vez do τ ≈ 2 real do anel B.
 * Em reflexão os dois saturam igual; em transmissão os dois dão zero. É
 * por isso que o cinza do lado escuro do B vem do PLANETSHINE, não daqui.
 *
 * Crédito e licença: `docs/reference/ASSETS.md`.
 */
export const PERFIL_DO_ANEL = {
  perfil: 'data/atlas/anel-saturno-perfil.bin',
  caixas: 2048,
  kmInterno: 66900,
  kmExterno: 140500,
} as const;

/**
 * A PONTE ENTRE AS DUAS RÉGUAS. O `u` desta casa corre de `rInt` a
 * `rExt` em raios equatoriais; o do dado corre de 66 900 a 140 500 km.
 * Os dois quase coincidem (2,5 km de folga na borda interna, 0,07 de
 * uma caixa), mas quase não é igual — a conta fica derivada aqui em vez
 * de virar número solto no GLSL.
 */
const KM_DO_ANEL = {
  int: ANEL_SATURNO.rInt * BODY_AXES.saturn[0]!,
  ext: ANEL_SATURNO.rExt * BODY_AXES.saturn[0]!,
};
const VAO_DO_PERFIL = PERFIL_DO_ANEL.kmExterno - PERFIL_DO_ANEL.kmInterno;
export const U_PERFIL_ESCALA = (KM_DO_ANEL.ext - KM_DO_ANEL.int) / VAO_DO_PERFIL;
export const U_PERFIL_BASE = (KM_DO_ANEL.int - PERFIL_DO_ANEL.kmInterno) / VAO_DO_PERFIL;

/**
 * O VÃO DE KEELER no `u` do perfil — 136 485–136 522 km (Cassini/PDS), o
 * eixo das ondas de Dáfnis (S5). O dado do Björn Jónsson TEM o vão: a caixa
 * 1 937 (136 511 km) sai com α = 0 entre duas de α ≈ 0,45, e é essa borda
 * dura que as ondas ondulam.
 */
export const U_DO_VAO_DE_KEELER =
  ((136485 + 136522) / 2 - PERFIL_DO_ANEL.kmInterno) / VAO_DO_PERFIL;

/**
 * O PERÍODO DE COROTAÇÃO DA MAGNETOSFERA, em horas — o relógio dos raios
 * do anel B (a poeira erguida corotaciona com o campo, não com Kepler).
 * É o 10,66 h dele (`SaturnSystem.ts`).
 */
export const HORAS_DA_COROTACAO = 10.66;

/**
 * A COR DO ANEL B NO DADO — média dos 712 texels entre 92 000 e
 * 117 580 km. Não é uma cor a mais na tela: é o DENOMINADOR que torna a
 * croma do dado uma RAZÃO. O vermelho e o azul dele saturam em 255
 * (1.052 e 887 texels dos 2.048), então o nível absoluto não é
 * confiável — a razão em torno do B é. Dividindo por ela, o anel B sai
 * exatamente em {@link COR_DO_GELO_DO_ANEL} (a cor medida NESTA casa) e
 * o C, a divisão e o A herdam só o DESVIO medido: o cinza-azulado que a
 * matte da placa nunca soube separar do próprio defeito.
 */
export const COR_B_DO_PERFIL = [0.9996, 0.9589, 0.9424] as const;

/**
 * Albedo geométrico visual de Saturno — JPL Saturn Fact Sheet. É a
 * amplitude do PLANETSHINE: quanta luz o globo devolve ao anel.
 */
export const ALBEDO_GEO_SATURNO = 0.499;

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
 *
 * ------------------------------------------------------------
 * A BUSCA NA PLACA VEM ANTES DOS `return`, E ISSO NÃO É ESTILO
 * ------------------------------------------------------------
 * `texture2D` sem LOD explícito escolhe o mip pela DERIVADA da
 * coordenada, e a derivada é medida no quad de 2×2 pixels que a GPU
 * sombreia junto. Se metade do quad saiu da função antes de calcular
 * `u` — porque caiu fora da janela de raios, ou porque o raio ia para o
 * lado errado —, aquela derivada é lixo: o hardware lê `u` de um
 * registrador que ninguém escreveu. O mip que sai disso é o topo da
 * pirâmide, isto é, a placa INTEIRA amostrada de uma vez (alpha médio
 * 0,5957 na `ring` de Saturno), e a função devolve
 * `1 − 0,5957·0,9 = 0,464` num pixel que devia estar em pleno dia.
 *
 * FOI O QUE A AUDITORIA DE 26/08 MEDIU depois do S1: um ARCO DE
 * PONTINHOS no lado do dia, na borda em que o quad se parte, e —
 * pior — um quadro NÃO-DETERMINÍSTICO, porque o valor do registrador
 * não escrito muda de execução para execução. O par nulo da vista
 * `saturno-anel` (duas capturas do MESMO binário) foi de 446 px para
 * 1.333, e na vista da costura duas execuções do mesmo código
 * discordaram em 1.431 px.
 *
 * O CONSERTO É A ORDEM: `hit`, `r`, `u` e a busca calculam-se
 * INCONDICIONALMENTE, com `clamp(u, 0, 1)` para que a coordenada seja
 * sempre legítima, e as duas recusas geométricas caem DEPOIS. É o mesmo
 * padrão que o `ANEL_FRAG` desta casa já usa na própria placa, logo
 * abaixo — lá a busca também é a primeira linha, e o `discard` vem
 * depois dela.
 */
const GLSL_SOMBRA_ANEL_NO_PLANETA = /* glsl */ `
float sombraDoAnel(vec3 p) {
  if (uAnelAtivo < 0.5) return 1.0;
  if (abs(uDirSolLocal.y) < 1.0e-6) return 1.0;
  float t = -p.y / uDirSolLocal.y;
  vec3 hit = p + uDirSolLocal * t;
  float r = length(hit.xz);
  float vao = max(uAnelRaios.y - uAnelRaios.x, 1.0e-6);
  float u = ((r - uAnelRaios.x) / vao) * U_ESCALA + U_BASE;
  // O SOL É UM DISCO, e a meia-penumbra no plano do anel é t·θ☉ — o
  // mesmo uSolAngRad medido que já macia a sombra do globo NO anel,
  // agora do lado de cá. Três amostras ¼-½-¼ do perfil trocam o degrau
  // por borda; o teto de 0,9 fica, que é dose desta casa.
  float meia = min(abs(t) * uSolAngRad / vao * U_ESCALA, 0.04);
  float a = texture2D(uMapaAnel, vec2(clamp(u, 0.0, 1.0), 0.5)).a * 0.5
    + texture2D(uMapaAnel, vec2(clamp(u - meia, 0.0, 1.0), 0.5)).a * 0.25
    + texture2D(uMapaAnel, vec2(clamp(u + meia, 0.0, 1.0), 0.5)).a * 0.25;
  if (t <= 0.0) return 1.0;
  if (r <= uAnelRaios.x || r >= uAnelRaios.y) return 1.0;
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
/**
 * RINGSHINE — O ANEL ILUMINA A NOITE DO GLOBO. O gêmeo exato do
 * planetshine: lá o globo acende o anel, aqui o anel acende o globo. Sem
 * ele o lado noturno de Saturno é carvão, e as fotos da Cassini
 * (PIA08329) mostram que não é.
 *
 * A LUT TEM 64 LATITUDES e o índice dela é o SENO DA NORMAL do
 * elipsoide, que é o que o fragmento tem na mão (`n.y`). Para cada
 * latitude, a irradiância é a integral do anel como fonte EXTENSA:
 *
 *     E/F = (1/π) · Σ (I/F)(anel) · cos(incidência) · dΩ
 *
 * varrida em 12 anéis × 8 azimutes (a metade, dobrada por simetria). O
 * `I/F` de cada pedaço é a MESMA `camadaDeParticulas` que desenha o anel
 * na tela, com o mesmo τ do perfil medido e a mesma âncora
 * {@link IF_RETRO_DO_GELO} — o globo é iluminado pelo anel que a câmera
 * vê, não por um segundo anel inventado ao lado. A face é a do
 * hemisfério: quem está do lado do Sol vê a face iluminada, quem está do
 * outro vê a face escura, e ali o ramo é o de transmissão.
 *
 * A SOMBRA DO GLOBO NO ANEL ENTRA, com a mesma conta elipsoide do
 * `sombraDoPlaneta`: o pedaço de anel que não vê o Sol não devolve luz
 * nenhuma, e é isso que faz o ringshine afundar perto do ponto
 * anti-solar em vez de brilhar igual em toda a noite.
 *
 * AS APROXIMAÇÕES, declaradas: a LUT vale para o MERIDIANO ANTI-SOLAR
 * (o Sol em azimute π), que é onde o ringshine importa e onde ela é
 * aplicada; o fragmento a apaga no lado do dia. E ela é recalculada só
 * quando o seno da elevação solar anda mais de 2e-3 (≈0,12°) — 12 × 8 ×
 * 64 iterações, e a elevação do Sol sobre o plano do anel leva dias de
 * tempo simulado para andar isso.
 *
 * O segundo binário do dono (retro/frente/lado escuro) NÃO veio: os três
 * canais dele estão normalizados cada um ao próprio máximo, a razão entre
 * as faces se perdeu na assadura, e o modelo de camada desta casa já
 * responde pelas duas faces.
 */
export const RINGSHINE_LATS = 64;
const RINGSHINE_ANEIS = 12;
const RINGSHINE_AZIMUTES = 8;
/** o teto do byte da LUT, em frações do Sol que Saturno recebe */
export const RINGSHINE_ESCALA = 0.02;

const GLSL_RINGSHINE_NO_GLOBO = /* glsl */ `
float ringshineDoAnel(vec3 n, float ndotl) {
  if (uRingshineAtivo < 0.5) return 0.0;
  float latU = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
  // a LUT foi integrada no meridiano ANTI-SOLAR: no lado do dia o Sol é
  // duas ordens de grandeza maior e ela não tem o que dizer
  float noite = clamp(1.0 - 2.0 * max(ndotl, 0.0), 0.0, 1.0);
  return texture2D(uRingshine, vec2(latU, 0.5)).r * RINGSHINE_ESCALA * noite;
}
`;

/** `faseDoAnel` do GLSL, na CPU — o integrador do ringshine usa a MESMA
 *  curva que o fragmento do anel, e não uma cópia com outro número. */
function faseDoAnelCpu(cosTheta: number): number {
  const g2 = G_DO_ANEL * G_DO_ANEL;
  const hg = (1 - g2) * (1 + g2 - 2 * G_DO_ANEL * cosTheta) ** -1.5;
  const retro = (1 - g2) * (1 + g2 + 2 * G_DO_ANEL) ** -1.5;
  return hg / retro + K_DIFRACAO * Math.max(cosTheta, 0) ** 6;
}

/** `camadaDeParticulas` do GLSL, na CPU, devolvendo o I/F JÁ NA ÁREA (o
 *  produto `x·y` de lá) — que é o que uma integral de fonte extensa
 *  quer. */
function camadaDeParticulasCpu(
  tau: number, mu0: number, mu: number, fase: number, mesmoLado: number
): number {
  const amp = 2 * fase;
  if (mesmoLado > 0) {
    return amp * (mu0 / (mu + mu0)) * (1 - Math.exp(-tau * (1 / mu + 1 / mu0)));
  }
  const d = mu0 - mu;
  return Math.abs(d) < 1e-3
    ? amp * (tau / mu0) * Math.exp(-tau / mu0)
    : amp * (mu0 / d) * (Math.exp(-tau / mu0) - Math.exp(-tau / mu));
}

/** O ponto (x, z) do plano do anel está na sombra do globo? A mesma
 *  conta elipsoide de `sombraDoPlaneta`, sem a penumbra (aqui ela vale
 *  menos de um dos 12 anéis). */
function anelNaSombraDoGlobo(
  x: number, z: number, sx: number, sy: number, k: number
): boolean {
  const dn = Math.hypot(sx, sy / k);
  const dx = sx / dn;
  const dy = sy / k / dn;
  const aproxima = -x * dx;
  if (aproxima <= 0) return false;
  return Math.hypot(x + dx * aproxima, dy * aproxima, z) < 1;
}

/**
 * A LUT viva. Nasce do perfil medido (τ por anel), e o único número que
 * ela recebe por quadro é o SENO da elevação do Sol sobre o plano.
 */
class RingshineDoAnel {
  readonly textura: THREE.DataTexture;
  private readonly bytes: Uint8Array;
  private readonly aneis: readonly { r: number; tau: number }[];
  private readonly kPolar: number;
  private senoEscrito = Number.NaN;

  constructor(perfil: Uint8Array, kPolar: number) {
    this.kPolar = kPolar;
    this.bytes = new Uint8Array(RINGSHINE_LATS * 4);
    this.textura = new THREE.DataTexture(this.bytes, RINGSHINE_LATS, 1);
    this.textura.minFilter = THREE.LinearFilter;
    this.textura.magFilter = THREE.LinearFilter;
    this.textura.wrapS = THREE.ClampToEdgeWrapping;
    this.textura.wrapT = THREE.ClampToEdgeWrapping;
    this.textura.needsUpdate = true;
    const caixas = PERFIL_DO_ANEL.caixas;
    const aneis: { r: number; tau: number }[] = [];
    for (let i = 0; i < RINGSHINE_ANEIS; i++) {
      const t = (i + 0.5) / RINGSHINE_ANEIS;
      const idx = Math.min(
        caixas - 1,
        Math.max(0, Math.round((t * U_PERFIL_ESCALA + U_PERFIL_BASE) * caixas))
      );
      const alfa = (perfil[idx * 4 + 3] ?? 0) / 255;
      aneis.push({
        r: ANEL_SATURNO.rInt + t * (ANEL_SATURNO.rExt - ANEL_SATURNO.rInt),
        tau: -Math.log(Math.max(1 - alfa, 1e-3)),
      });
    }
    this.aneis = aneis;
  }

  atualizar(senoSolar: number): void {
    if (Math.abs(senoSolar - this.senoEscrito) < 2e-3) return;
    this.senoEscrito = senoSolar;
    const k = this.kPolar;
    const mu0 = Math.max(Math.abs(senoSolar), 0.02);
    const hemisferioDoSol = senoSolar >= 0 ? 1 : -1;
    const largura = (ANEL_SATURNO.rExt - ANEL_SATURNO.rInt) / RINGSHINE_ANEIS;
    const dPsi = Math.PI / RINGSHINE_AZIMUTES;
    // o Sol em azimute π: este é o meridiano ANTI-SOLAR
    const sx = -Math.sqrt(Math.max(1 - senoSolar * senoSolar, 0));
    const sy = senoSolar;
    for (let li = 0; li < RINGSHINE_LATS; li++) {
      const ny = ((li + 0.5) / RINGSHINE_LATS) * 2 - 1;
      const nx = Math.sqrt(Math.max(1 - ny * ny, 0));
      // do seno da NORMAL de volta ao ponto no elipsoide
      const fi = Math.atan2(k * ny, nx);
      const px = Math.cos(fi);
      const py = k * Math.sin(fi);
      const mesmoLado = (py >= 0 ? 1 : -1) === hemisferioDoSol ? 1 : -1;
      let soma = 0;
      for (const anel of this.aneis) {
        for (let j = 0; j < RINGSHINE_AZIMUTES; j++) {
          const psi = (j + 0.5) * dPsi;
          const ax = anel.r * Math.cos(psi);
          const az = anel.r * Math.sin(psi);
          const dx = ax - px;
          const dy = -py;
          const dist = Math.hypot(dx, dy, az);
          if (dist < 1e-3) continue;
          const cosInc = (nx * dx + ny * dy) / dist;
          if (cosInc <= 0) continue;
          const cosEmis = Math.abs(dy) / dist;
          if (cosEmis < 1e-3) continue;
          if (anelNaSombraDoGlobo(ax, az, sx, sy, k)) continue;
          const mu = Math.max(cosEmis, 0.02);
          const cosTheta = (sx * dx + sy * dy) / dist;
          const iF = camadaDeParticulasCpu(
            anel.tau, mu0, mu, faseDoAnelCpu(cosTheta), mesmoLado
          );
          soma += iF * cosInc * ((anel.r * largura * dPsi * 2 * cosEmis) / (dist * dist));
        }
      }
      const v = Math.min(1, soma * (IF_RETRO_DO_GELO / Math.PI) / RINGSHINE_ESCALA);
      const b = Math.round(Math.max(v, 0) * 255);
      this.bytes[li * 4] = b;
      this.bytes[li * 4 + 1] = b;
      this.bytes[li * 4 + 2] = b;
      this.bytes[li * 4 + 3] = 255;
    }
    this.textura.needsUpdate = true;
  }
}

/**
 * O PERFIL VIVO, UMA VEZ POR SESSÃO. Não passa pelo pipeline de
 * `texturas.ts` de propósito: aquilo escolhe variante por tier e por
 * largura, e isto não é imagem — são 14 KB de MEDIDA, que não têm
 * versão de 1k nem se decodificam de sRGB. Nasce na primeira casca de
 * Saturno e não é descartado com o corpo: o corpo renasce, o dado não
 * muda, e 8 KB não são dose de VRAM.
 */
let perfilDoAnelVivo: { textura: THREE.DataTexture; bytes: Uint8Array } | null = null;
let perfilDoAnelPedido: Promise<void> | null = null;

async function pedirPerfilDoAnel(base: string): Promise<void> {
  perfilDoAnelPedido ??= (async () => {
    // pelo MESMO caminho de rede dos outros .bin da casa: `fetchBinary`
    // prefere o irmão .gz e descomprime no cliente (o Pages serve o cru
    // opaco); só o .gz é publicado
    const bytes = new Uint8Array(await fetchBinary(`${base}${PERFIL_DO_ANEL.perfil}`));
    const esperado = PERFIL_DO_ANEL.caixas * 4;
    if (bytes.length !== esperado) {
      throw new Error(`perfil do anel: ${bytes.length} B, esperado ${esperado}`);
    }
    const textura = new THREE.DataTexture(bytes, PERFIL_DO_ANEL.caixas, 1);
    // mipmap + anisotropia porque a estrutura fina do perfil (Encke tem
    // 9 caixas) cintila de longe e de esguelha, que é o mesmo motivo
    // pelo qual a placa os tinha
    textura.generateMipmaps = true;
    textura.minFilter = THREE.LinearMipmapLinearFilter;
    textura.magFilter = THREE.LinearFilter;
    textura.anisotropy = 4;
    textura.wrapS = THREE.ClampToEdgeWrapping;
    textura.wrapT = THREE.ClampToEdgeWrapping;
    textura.needsUpdate = true;
    perfilDoAnelVivo = { textura, bytes };
  })();
  return perfilDoAnelPedido;
}

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
uniform float uSolAngRad;
uniform sampler2D uRingshine;
uniform float uRingshineAtivo;
varying vec3 vLocal;
varying vec2 vUv;
const float U_ESCALA = ${U_PERFIL_ESCALA};
const float U_BASE = ${U_PERFIL_BASE};
const float RINGSHINE_ESCALA = ${RINGSHINE_ESCALA};
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_NORMAL_ELIPSOIDE}
${GLSL_SOMBRA_ECLIPSE}
${GLSL_LUZ_DA_VISITA}
${GLSL_VEU_DE_SATURNO}
${GLSL_SOMBRA_ANEL_NO_PLANETA}
${GLSL_RINGSHINE_NO_GLOBO}
void main() {
  vec3 n = normalDoCorpo(vLocal, uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;
  float ndotlGeo = dot(n, uDirSolLocal);
  vec3 albedo = texture2D(uMapaDia, vUv).rgb;
  vec3 view = normSeguro(uCamLocal - pElip);
  vec3 eclipse = fatorDeEclipse(pElip, n, ndotlGeo);
  vec3 sombras = eclipse * sombraDoAnel(pElip);
  // o ringshine é LUZ, não assistência: entra ao lado do Sol (acende a
  // superfície e a palha do véu) e FORA de sombras — a sombra do anel
  // apaga o Sol, não o próprio anel.
  vec3 luzSol =
    (vec3(terminadorSuave(ndotlGeo)) * sombras + vec3(ringshineDoAnel(n, ndotlGeo)))
    * uLuzGanho;
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

// a FORMA da curva de fase, normalizada em retro (vale 1 quando a fonte
// está às costas da câmera). cosTheta é o cosseno do ângulo de
// ESPALHAMENTO: +1 para a frente, −1 em retro.
//
// SÃO DUAS FUNÇÕES E NÃO UMA porque o lobo de difração PEDE FONTE
// PONTUAL: a largura de cinema (expoente 6) está calibrada para o Sol,
// que de Saturno tem 0,0275° de raio. O globo visto de um ponto do anel
// abre de 25° a 64° — nele o lobo não existe, e deixá-lo aceso punha o
// planetshine 8× acima do devido em vista rasante (medido no item 134).
float hgDoAnel(float cosTheta) {
  float g2 = G_DO_ANEL * G_DO_ANEL;
  float hg = (1.0 - g2) * pow(max(1.0 + g2 - 2.0 * G_DO_ANEL * cosTheta, 1.0e-4), -1.5);
  float retro = (1.0 - g2) * pow(1.0 + g2 + 2.0 * G_DO_ANEL, -1.5);
  return hg / retro;
}
float faseDoAnel(float cosTheta) {
  return hgDoAnel(cosTheta) + K_DIFRACAO * pow(max(cosTheta, 0.0), 6.0);
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
export const GLSL_SOMBRA_DO_PLANETA_NO_ANEL = /* glsl */ `
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
 * PLANETSHINE — O GLOBO ILUMINADO ACENDE O ANEL. A ausência que o item
 * 133 nomeou: sem este termo a face de sombra do anel não é escura, é
 * BURACO, e a umbra sai em 0 literal.
 *
 * A FONTE CAVALGA O PLANO. Do ponto do anel, o centro de Saturno está
 * exatamente no horizonte local — metade do disco fica acima do plano e
 * ilumina a face de cima, metade abaixo e ilumina a de baixo. Por isso
 * o ramo aqui é SEMPRE o de reflexão (`mesmoLado = 1`): cada face é
 * iluminada pela metade do seu lado, e é isso que tira o lado escuro do
 * zero sem inventar transmissão nenhuma.
 *
 * A CONTA, com θ = arcsin(1/r) o raio angular do globo e k o
 * achatamento. Para uma superfície VOLTADA ao planeta a irradiância é a
 * de sempre, `E_face = F·p·Φ(α)/r²`. A nossa superfície é
 * PERPENDICULAR a ela, e o que ela colhe é a integral de cos(i) sobre a
 * meia-elipse acima do plano:
 *
 *     E_anel   = E_face · 2kθ/(3π)      (o que chega ao plano)
 *     μ₀_globo = 4kθ/(3π)               (a incidência EFETIVA da fonte)
 *     E_anel/μ₀ = E_face/2              (o k e o θ se cancelam)
 *
 * `E_face/2` é o que a camada de partículas quer: fluxo NORMAL ao
 * feixe, com μ₀ dizendo a inclinação. Φ é a fase de Lambert de uma
 * esfera, `[sin α + (π−α) cos α]/π`, com α o ângulo Sol–Saturno–ponto:
 * do lado do Sol o anel vê um globo cheio, do lado anti-solar vê a
 * NOITE dele — e é por isso que a umbra continua escura mesmo com este
 * termo aceso. Isso não é falta: é a física, e a foto do 133 mostra.
 *
 * OS NÚMEROS, para conferência: na borda interna do D (r = 1,110,
 * θ = 64,3°) `E_anel/F` vale 9,1 % com o globo cheio e 5,5 % em α = 60°;
 * no F (r = 2,326) vale 0,82 % e 0,49 %. O laudo do item 133 pedia
 * "~5 % no D e ~0,2 % no F" — a ordem bate, e agora a conta é derivada
 * em vez de citada.
 *
 * O QUE FICA DE FORA, declarado: o escurecimento de bordo do globo, a
 * variação de α através do disco (a 1,11 raios ele abre 64°, e um α só
 * para o disco inteiro é aproximação), e a luz que o anel devolve ao
 * anel.
 */
const GLSL_PLANETSHINE_NO_ANEL = /* glsl */ `
float planetshineNoAnel(
  vec3 p, float r, vec3 view, float mu, float tau, float nDotV
) {
  vec3 pHat = normSeguro(vec3(p.xy, 0.0));
  float rr = max(r, 1.001);
  float theta = asin(clamp(1.0 / rr, 0.0, 0.9999));
  float mu0 = clamp(4.0 * uKPolar * theta / (3.0 * PI), 0.02, 1.0);
  float alfaFase = acos(clamp(dot(uDirSolLocal, pHat), -1.0, 1.0));
  float fi = (sin(alfaFase) + (PI - alfaFase) * cos(alfaFase)) / PI;
  float irrad = 0.5 * ALBEDO_GEO * fi / (rr * rr);
  // a direção média da luz que chega: horizontal para o globo, erguida
  // de μ₀ para o lado da face que estamos desenhando
  float lado = nDotV >= 0.0 ? 1.0 : -1.0;
  vec3 dirGlobo = normSeguro(
    -pHat * sqrt(max(1.0 - mu0 * mu0, 0.0)) + vec3(0.0, 0.0, lado * mu0)
  );
  float cosTheta = clamp(-dot(dirGlobo, view), -1.0, 1.0);
  return camadaDeParticulas(tau, mu0, mu, hgDoAnel(cosTheta), 1.0).x * irrad;
}
`;

/**
 * O ESPETÁCULO DO ANEL (item 134/S5) — os RAIOS DO B e as ONDAS DE DÁFNIS,
 * portados do projeto Saturn do dono (`src/materials/ringsMaterial.ts`).
 * Os dois só existem no anel de Saturno: o `ANEL_PROC_FRAG` de
 * Urano/Netuno/Quaoar não os recebe.
 *
 * OS RAIOS são poeira de mícron LEVITADA sobre o anel B, que corotaciona
 * com a magnetosfera (10,66 h) em vez de seguir Kepler. Em luz refletida
 * eles TAPAM (a mancha é escura); em contraluz ACENDEM, porque grão fino
 * espalha para a frente. São fenômeno de EQUINÓCIO — somem quando o Sol
 * sobe acima de ~17° do plano —, e a estação entra pela elevação do Sol.
 * Ele mesmo marca a soleira de 17° como não verificada contra as fotos
 * Cassini de 2009–2010; hoje (um ano depois do equinócio de 2025) o Sol
 * está a ~3,6° e a estação vale 1.
 *
 * AS ONDAS DE DÁFNIS são a onda que a gravidade da lua levanta nas duas
 * bordas do vão de Keeler (PIA11656). O CISALHAMENTO DE KEPLER dá o
 * ziguezague: a borda de DENTRO orbita mais rápido que a lua, então a onda
 * dela vai À FRENTE; a de fora é mais lenta e a onda fica ATRÁS. Aqui a
 * onda perturba a COORDENADA DE AMOSTRA no perfil, nunca a geometria — a
 * malha do anel continua um disco liso.
 *
 * O EXAGERO É DELE E FICA DECLARADO (cadastro de escala,
 * `aneis-tenues-de-saturno`): o vão tem 37 km, menos que um texel do perfil,
 * e a onda real teria comprimento de 100–200 km, subpixel na escala do
 * sistema. A banda perturbada foi alargada para ~440 km e o deslocamento
 * para ~96 km, senão nada disto chega a um pixel.
 */
const GLSL_ESPETACULO_DO_ANEL = /* glsl */ `
const float U_KEELER = ${U_DO_VAO_DE_KEELER};

// o mx_fractal_noise_float(p, 3, 2.0, 0.5) dele: três oitavas CENTRADAS
// em zero e SEM normalizar — a lição que a S3c mediu no grão do esculpido.
// O ruído de valor da casa devolve [0, 1], por isso o centra aqui.
float fbmDoAnel(vec3 p) {
  float soma = 0.0;
  float amp = 1.0;
  float freq = 1.0;
  for (int o = 0; o < 3; o++) {
    soma += (ruido(p * freq) * 2.0 - 1.0) * amp;
    freq *= 2.0;
    amp *= 0.5;
  }
  return soma;
}

float raiosDoB(float rr, float ang, float senElevSol) {
  // a janela do anel B na régua do perfil (0,34–0,70 ≈ 91 900–118 400 km).
  // A segunda soleira vai escrita ao contrário porque smoothstep com
  // borda decrescente é INDEFINIDO em GLSL — a conta é a mesma dele.
  float janelaB = smoothstep(0.34, 0.42, rr) * (1.0 - smoothstep(0.60, 0.70, rr));
  // AS DUAS FREQUÊNCIAS DELE, TROCADAS DE LUGAR, e é o único número desta
  // fase que não sai igual ao do projeto dele. Na ordem original (2,5 em
  // azimute, 9 em raio) a mancha mede 41 000 km ao longo do anel por 8 000 km
  // de largura radial — um ARCO, não um raio. Medido na primeira foto desta
  // fase, e o comentário dele mesmo diz o contrário ("radial streaks"). Com
  // 9 e 2,5 a mancha vira 11 500 km de largura por toda a altura do B, que é
  // a forma que a Cassini fotografou.
  float mancha = fbmDoAnel(vec3(cos(ang) * 9.0, sin(ang) * 9.0, rr * 2.5)) * 0.5 + 0.5;
  float estacao = 1.0 - smoothstep(0.17, 0.29, abs(senElevSol));
  return smoothstep(0.62, 0.85, mancha) * janelaB * 0.13 * estacao;
}

float ondasDeDafnis(float uBase, float ang, float dafnisLon) {
  const float BANDA = 0.006;   // meia-largura da faixa perturbada (~440 km)
  const float CORTE = 0.0012;  // meia-largura da troca dentro/fora do vão
  const float K = 300.0;       // número de onda em azimute (inteiro: fecha em 2π)
  const float SIGMA = 0.22;    // decaimento do rastro (rad) — visível a ~30°
  const float AMP = 0.0013;    // deslocamento da amostra (~96 km)
  float dTheta = ang - dafnisLon;
  // azimute ENVOLVIDO em (−π, π]: sem costura em 2π, e o rastro continua no
  // lugar quando a lua passa por ±π
  float phi = atan(sin(dTheta), cos(dTheta));
  float q = phi / SIGMA;
  float envelope = exp(-q * q);
  float atras = smoothstep(-0.02, 0.02, phi);
  float faixa = smoothstep(U_KEELER - BANDA, U_KEELER, uBase)
    * (1.0 - smoothstep(U_KEELER, U_KEELER + BANDA, uBase));
  float dentro = 1.0 - smoothstep(U_KEELER - CORTE, U_KEELER + CORTE, uBase);
  // borda de dentro À FRENTE da lua, borda de fora ATRÁS: o ziguezague
  float espacial = faixa * (dentro * (1.0 - atras) + (1.0 - dentro) * atras);
  // apaga a onda fina antes que ela vire cintilação de longe — a mesma
  // ideia do gate por derivada que o grão do close já usa
  float suaviza = clamp(1.0 - fwidth(ang) * 150.0, 0.0, 1.0);
  return sin(phi * K) * AMP * envelope * espacial * suaviza;
}
`;

/**
 * AS CONSTANTES DO ANEL EM GLSL — a régua do perfil (`U_ESCALA`/`U_BASE`),
 * a âncora de I/F e as duas cores. Vivem num pedaço só porque a LAJOTA
 * VOLUMÉTRICA (item 139, `lajotaDoAnel.ts`) amostra o MESMO perfil com a
 * MESMA croma relativa: redigitá-las lá seria a segunda fonte de verdade
 * de sempre — e ela é passada por parâmetro, não importada, para não
 * abrir aresta de volta a este arquivo.
 *
 * `ALBEDO_GEO` entra no bloco embora só o planetshine o use: tirá-lo
 * mudaria a ORDEM do texto do `ANEL_FRAG`, e o que este recorte promete é
 * um shader byte a byte igual ao que já estava provado.
 */
export const GLSL_CONSTANTES_DO_ANEL = /* glsl */ `const float IF_RETRO = ${IF_RETRO_DO_GELO};
const vec3 COR_DO_GELO = vec3(${COR_DO_GELO_DO_ANEL.join(', ')});
const vec3 COR_B_DO_PERFIL = vec3(${COR_B_DO_PERFIL.join(', ')});
const float ALBEDO_GEO = ${ALBEDO_GEO_SATURNO};
const float U_ESCALA = ${U_PERFIL_ESCALA};
const float U_BASE = ${U_PERFIL_BASE};`;

/**
 * Anel de Saturno: perfil radial medido + camada de partículas +
 * planetshine + sombra do planeta elipsoide. vPos está no frame da
 * RingGeometry (plano XY); o mesh aplica Rx(−π/2), então +Z deste frame
 * é o POLO (W5-B).
 */
export const ANEL_FRAG = /* glsl */ `
uniform sampler2D uMapaAnel;
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform float uKPolar;
uniform float uSolAngRad;
uniform vec2 uAnelRaios;
uniform float uFaseDosRaios;
uniform float uDafnisLon;
varying vec3 vPos;
const float PI = 3.14159265358979;
${GLSL_CONSTANTES_DO_ANEL}
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_SOMBRA_DO_PLANETA_NO_ANEL}
${GLSL_CAMADA_DO_ANEL}
${GLSL_PLANETSHINE_NO_ANEL}
${GLSL_RUIDO_DE_VALOR}
${GLSL_ESPETACULO_DO_ANEL}
void main() {
  float r = length(vPos.xy);
  float uBase = ((r - uAnelRaios.x) / max(uAnelRaios.y - uAnelRaios.x, 1.0e-6))
    * U_ESCALA + U_BASE;
  float ang = atan(vPos.y, vPos.x);
  // as ondas de Dáfnis mexem em ONDE se amostra o perfil, nunca na malha
  float u = clamp(uBase + ondasDeDafnis(uBase, ang, uDafnisLon), 0.0, 1.0);
  vec4 perfil = texture2D(uMapaAnel, vec2(clamp(u, 0.0, 1.0), 0.5));
  float alfa = perfil.a;
  if (alfa < 0.004) discard;
  vec3 n = vec3(0.0, 0.0, 1.0);
  vec3 view = normSeguro(uCamLocal - vPos);
  float nDotL = dot(n, uDirSolLocal);
  float nDotV = dot(n, view);
  float mu0 = max(abs(nDotL), 0.02);
  float mu = max(abs(nDotV), 0.02);
  float cosTheta = clamp(-dot(uDirSolLocal, view), -1.0, 1.0);
  float mesmoLado = nDotL * nDotV;
  float tau = tauDaOpacidade(alfa);
  vec2 camada = camadaDeParticulas(
    tau, mu0, mu, faseDoAnel(cosTheta), mesmoLado
  );
  // a croma do dado é RELATIVA (cada canal normalizado ao próprio
  // máximo pela fonte, e saturado em 255 em 1.052 texels): dividir pela
  // cor do anel B e renormalizar a luminância 1 deixa passar só o
  // DESVIO medido, com o nível preso na âncora IF_RETRO.
  vec3 razao = perfil.rgb / COR_B_DO_PERFIL;
  vec3 tinta = COR_DO_GELO
    * (razao / max(dot(razao, vec3(0.2126, 0.7152, 0.0722)), 1.0e-4));
  if (dot(tinta, tinta) < 1.0e-6) tinta = COR_DO_GELO;
  // OS RAIOS DO B (S5): a poeira levitada TAPA o anel visto do lado
  // iluminado e ACENDE visto contra o Sol — os dois termos dele, com a
  // fase de corotação girando o padrão sobre o anel.
  float raios = raiosDoB(clamp(uBase, 0.0, 1.0), ang + uFaseDosRaios, nDotL);
  float ladoSuave = smoothstep(-0.03, 0.03, mesmoLado);
  vec3 direta = (tinta * IF_RETRO)
    * ((camada.x * (1.0 - raios * ladoSuave) + raios * 0.5 * alfa) * uLuzGanho)
    * sombraDoPlaneta(vPos);
  // o planetshine NÃO leva a sombra do planeta: o planeta é a FONTE
  vec3 doGlobo = (tinta * IF_RETRO)
    * (planetshineNoAnel(vPos, r, view, mu, tau, nDotV) * uLuzGanho);
  gl_FragColor = vec4(direta + doGlobo, clamp(camada.y, 0.0, 1.0));
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
  /** o Atlas está focado neste corpo (ou na lua dele) — um dos três que
   *  SEGURAM os texels (`Seguradores`, texturas.ts). */
  focoDoAtlas: boolean;
  /** o roteiro do filme declarou este corpo — o segurador monotônico. */
  pedidoDoRoteiro: boolean;
  politica: PoliticaDeLuz;
  /** o relógio de PAREDE do app em segundos — só a carência da descarga
   *  o consome (`CARENCIA_DA_DESCARGA_S`). */
  tS: number;
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
  /** item 139: o PLANO DO ANEL como superfície do palco — ver
   *  `EstadoNoPalco.superficieDoAnel`. `null` fora do anel. */
  superficieDoAnel: { raioPc: number; centroPc: THREE.Vector3 } | null;
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

  /** o estado das texturas — a casa dele é o pipeline (`texturas.ts`) */
  private readonly texturas: TexturasDoCorpo;
  /** o registro dos três seguradores, REUSADO por tick (M4 da casa) */
  private readonly seguram: Seguradores = { tela: false, foco: false, filme: false };
  private disposto = false;

  private geometria: THREE.SphereGeometry | null = null;
  private superficie: THREE.Mesh | null = null;
  private matSuperficie: THREE.ShaderMaterial | null = null;
  private geoAnel: THREE.RingGeometry | null = null;
  private anel: THREE.Mesh | null = null;
  private matAnel: THREE.ShaderMaterial | null = null;
  private dummyAnel: THREE.DataTexture | null = null;
  /** S5 (item 134): o F e o E — só Saturno os tem (`aneisTenues.ts`) */
  private tenues: AneisTenuesDeSaturno | null = null;
  /** o quadro dos dois véus, REUSADO (zero alocação por tick, M4 da casa) */
  private quadroDosTenues: QuadroDosAneisTenues | null = null;
  /** item 139: a lajota volumétrica — só Saturno a tem (`lajotaDoAnel.ts`) */
  private lajota: LajotaDoAnel | null = null;
  /** o quadro da lajota, REUSADO (zero alocação por tick, M4 da casa) */
  private quadroDaLajota: QuadroDaLajota | null = null;
  /** item 139: o CHÃO do anel para o palco (o ponto do plano mais próximo
   *  da câmera), REUSADO — nasce com a lajota, e só com ela */
  private chaoDoAnel: { raioPc: number; centroPc: THREE.Vector3 } | null = null;
  /** o tier VIVO, lido na hora: a contagem de grãos da lajota é alocação,
   *  e alocação lê o tier antes de alocar (a regra das plumas) */
  private readonly tierVivo: OpcoesDoGigante['tier'];
  /** a LUT de latitudes do ringshine — só Saturno tem uma */
  private ringshine: RingshineDoAnel | null = null;
  /** BASE_URL do vite, para buscar o perfil medido do anel */
  private readonly base: string;

  private readonly vX = new THREE.Vector3();
  private readonly vY = new THREE.Vector3();
  private readonly vZ = new THREE.Vector3();
  private readonly vAnelX = new THREE.Vector3();
  private readonly vAnelY = new THREE.Vector3();
  private readonly vAnelZ = new THREE.Vector3();
  private readonly vTmp = new THREE.Vector3();
  private readonly vLua = new THREE.Vector3();
  private readonly vLuaNoAnel = new THREE.Vector3();
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

  constructor(opcoes: OpcoesDoGigante) {
    this.idCorpo = opcoes.id;
    this.base = opcoes.base;
    this.tierVivo = opcoes.tier;
    const { a, c, b } = raiosDoGigantePc(this.idCorpo);
    this.raioA = a;
    this.razaoC = c / a;
    this.razaoB = b / a;
    this.kPolar = c / a;
    this.temAnel = (CORPOS_COM_ANEL as readonly string[]).includes(this.idCorpo);
    this.group.visible = false;
    // Só o `map`: o canal `ring` e os 8 arquivos da placa foram apagados
    // no item 137 — o anel de Saturno lê o perfil medido (`PERFIL_DO_ANEL`).
    this.texturas = new TexturasDoCorpo({
      corpo: this.idCorpo,
      canais: [CANAL_MAP],
      rede: opcoes,
      oQueNaoNasce: 'o corpo não nasce nesta sessão',
      publicar: (porCanal) => {
        this.garantirCasca();
        this.matSuperficie!.uniforms.uMapaDia.value = porCanal.get('map')!;
      },
      // `uMapaAnel` NÃO entra aqui desde o item 134: quem o alimenta é o
      // perfil medido, que não tem tier nem carência e não vem neste lote
      soltar: () => {
        if (this.matSuperficie) this.matSuperficie.uniforms.uMapaDia.value = null;
      },
    });
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
      superficieDoAnel: null,
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

    // OS MESMOS TRÊS SEGURADORES das irmãs (lei 4, item 115): tela, foco
    // do Atlas e roteiro do filme; o último a soltar abre a carência.
    this.seguram.tela = this.armado;
    this.seguram.foco = q.focoDoAtlas;
    this.seguram.filme = q.pedidoDoRoteiro;
    this.texturas.aoTick(this.seguram, q.tS);

    const emQuadro =
      this.armado &&
      q.ligado &&
      this.texturas.pronta &&
      Number.isFinite(this.centro.x);
    e.emQuadro = emQuadro;
    e.carregando = this.texturas.carregando;
    e.gateArmado = this.armado;
    this.group.visible = emQuadro;

    const base = q.fonte
      ? aMagBaseDe(FOTOMETRIA[this.idCorpo].H, this.rUA) + DESLOCAMENTO_UA_PARA_PC
      : A_MAG_BASE_PC[this.idCorpo];
    const alvo = alvoDaCessaoDoCorpo(
      base, this.centro, q.camPosPc, dPc, diametroPx, emQuadro, q.psf, q.screenHPx
    );
    e.cede =
      q.salto || saltoDeData
        ? alvo
        : stepRampToward(e.cede, alvo, q.dtS, RAMP_DURATION_MS);
    e.emRampa = e.cede !== alvo;

    // o chão do anel (139) é do QUADRO, não do corpo: fora de quadro, ou
    // com a câmera longe do plano, o palco não o vê
    e.superficieDoAnel = null;
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
    // o Sol é um DISCO: o raio angular visto DESTE corpo é a meia-penumbra
    // das DUAS sombras — a do anel no globo e a do globo no anel
    const solAngRad = RAIO_SOL_KM / Math.max(this.rUA * AU_KM, 1e-30);
    u.uSolAngRad.value = solAngRad;
    // `sLy` É o seno da elevação do Sol sobre o plano do anel: vY é o eixo
    // polar do corpo, e o anel mora no equador dele
    this.ringshine?.atualizar(sLy);

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
      ua.uSolAngRad.value = solAngRad;

      // S5 — O ESPETÁCULO. A fase de corotação (10,66 h) reduz-se a uma
      // volta AQUI, em dupla precisão: os 5,5 milhões de voltas desde a
      // época juliana não cabem num float32 de uniform.
      if (this.tenues && this.quadroDosTenues) {
        const fase =
          -(((this.jdEscrito * 24) / HORAS_DA_COROTACAO) * (Math.PI * 2)) %
          (Math.PI * 2);
        ua.uFaseDosRaios.value = fase;
        ua.uDafnisLon.value = this.azimuteDaLuaNoAnel('daphnis');
        const t = this.quadroDosTenues;
        t.dirSolLocal.copy(ua.uDirSolLocal.value as THREE.Vector3);
        t.camLocal.copy(ua.uCamLocal.value as THREE.Vector3);
        t.luzGanho = ganho;
        t.solAngRad = solAngRad;
        t.kPolar = this.kPolar;
        t.prometeuLon = this.azimuteDaLuaNoAnel('prometheus');
        t.fase = fase;
        this.tenues.fixarNoAnel(this.anel.matrix);
        this.tenues.atualizar(t);
      }

      // O CHÃO DO ANEL COMO SUPERFÍCIE DO PALCO (139, segunda metade). O
      // anel é um CHÃO: com a câmera rente ao plano o que está mais perto
      // dela não é o globo a 54 mil km, é o gelo debaixo dos pés. O corpo
      // publica o PONTO DO PLANO mais próximo da câmera — a projeção dela
      // no plano do anel, que dista |altura| — com "raio" = a meia-espessura
      // da lajota; daí o palco tira d = |altura| − 12 km e o `nearPlanePc`
      // os 0,4% de sempre. Sem isto o near valia 193 km a 40 km do plano e
      // cortava todo o primeiro plano do enxame (o defeito que sobrou do
      // item 135, uma altura abaixo).
      //
      // A JANELA é a da própria lajota (`VOLUME_DA_LAJOTA`, 55 000–160 000
      // km, que contém o anel principal inteiro): fora dela a projeção da
      // câmera cai onde não há chão nenhum, e o plano não é superfície.
      // `this.vAnelY` é o POLO — a normal do plano do anel.
      const alturaPc = delta.dot(this.vAnelY);
      const rProjPc = Math.sqrt(
        Math.max(0, delta.lengthSq() - alturaPc * alturaPc)
      ) / this.raioA;
      const chao = this.chaoDoAnel;
      const noAnel =
        chao !== null &&
        rProjPc > VOLUME_DA_LAJOTA.rMin &&
        rProjPc < VOLUME_DA_LAJOTA.rMax;
      if (noAnel) {
        chao.centroPc.copy(q.camPosPc).addScaledVector(this.vAnelY, -alturaPc);
        this.estado.superficieDoAnel = chao;
      }

      // A LAJOTA VOLUMÉTRICA (139). O NEAR sai do MESMO escritor que o
      // engine usa para o quadro (`nearPlanePc`), com os mesmos três
      // argumentos — e, desde o chão acima, com a MESMA escolha de
      // superfície que o palco faz: a de menor distância. Sem isso a
      // soleira do grão colado na lente seria uma segunda conta do plano
      // de corte, livre para divergir da primeira.
      if (this.lajota && this.quadroDaLajota) {
        const l = this.quadroDaLajota;
        l.dirSolLocal.copy(ua.uDirSolLocal.value as THREE.Vector3);
        l.camLocal.copy(ua.uCamLocal.value as THREE.Vector3);
        l.luzGanho = ganho;
        l.solAngRad = solAngRad;
        l.kPolar = this.kPolar;
        const dGlobo = delta.length() - this.raioA;
        const dChao = noAnel ? Math.abs(alturaPc) - chao!.raioPc : Number.NaN;
        const mandaOChao = noAnel && dChao < dGlobo;
        l.nearRaios =
          nearPlanePc(
            q.camPosPc.length(),
            mandaOChao ? dChao : dGlobo,
            mandaOChao ? chao!.raioPc : this.raioA
          ) / this.raioA;
        l.tier = this.tierVivo();
        this.lajota.fixarNoAnel(this.anel.matrix);
        this.lajota.atualizar(l);
      }
    }
  }

  /**
   * O AZIMUTE DE UMA LUA NO FRAME DO ANEL (rad) — a longitude que as ondas
   * de Dáfnis e os canais de Prometeu perseguem.
   *
   * Sai do MESMO propagador que põe a lua na cena (`posicaoKepler`, já
   * centrado no pai) e atravessa a MESMA ponte de frame que o anel usa para
   * o Sol e a câmera: não há segunda conta de frame que possa divergir da
   * primeira, que é como a inversão do item 91 se escondeu.
   */
  private azimuteDaLuaNoAnel(id: string): number {
    if (!Number.isFinite(this.jdEscrito)) return 0;
    const rel = posicaoKepler(id, this.jdEscrito);
    const eq = eclipticaParaEquatorial([rel.x, rel.y, rel.z]);
    this.vLua.set(eq[0], eq[1], eq[2]);
    componentesNoFrameDoAnel(
      this.vLua, this.vAnelX, this.vAnelY, this.vAnelZ, this.vLuaNoAnel
    );
    return Math.atan2(this.vLuaNoAnel.y, this.vLuaNoAnel.x);
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
        uSolAngRad: { value: 0 },
        uRingshine: { value: this.dummyAnel },
        uRingshineAtivo: { value: 0 },
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
          // S5: só o `ANEL_FRAG` de Saturno os lê; nos procedurais ficam
          // parados em zero e o programa nem os declara
          uFaseDosRaios: { value: 0 },
          uDafnisLon: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      });
      this.anel = new THREE.Mesh(this.geoAnel, this.matAnel);
      this.anel.matrixAutoUpdate = false;
      this.group.add(this.anel);
      if (placa) {
        // S5 — o F e o E nascem com o anel e morrem com ele; o gate deles é
        // o do corpo (48 px), porque são filhos do mesmo grupo.
        this.tenues = new AneisTenuesDeSaturno(GLSL_SOMBRA_DO_PLANETA_NO_ANEL);
        this.quadroDosTenues = {
          dirSolLocal: new THREE.Vector3(),
          camLocal: new THREE.Vector3(),
          luzGanho: 1,
          solAngRad: 0,
          kPolar: this.kPolar,
          prometeuLon: 0,
          fase: 0,
        };
        this.group.add(this.tenues.grupo);
        // item 139 — a lajota volumétrica: as partículas e pedras de gelo
        // de DENTRO do anel. Nasce com o anel e vive escondida: só entra
        // no desenho com a câmera rente ao plano (ver `atualizar` dela).
        this.lajota = new LajotaDoAnel({
          glslSombraDoPlaneta: GLSL_SOMBRA_DO_PLANETA_NO_ANEL,
          glslConstantesDoAnel: GLSL_CONSTANTES_DO_ANEL,
          rInt: anel.rInt,
          rExt: anel.rExt,
        });
        this.quadroDaLajota = {
          dirSolLocal: new THREE.Vector3(),
          camLocal: new THREE.Vector3(),
          luzGanho: 1,
          solAngRad: 0,
          kPolar: this.kPolar,
          nearRaios: PISO_DO_NEAR_EM_RAIOS,
          tier: 'cinema',
        };
        // o "raio" do chão é a MEIA-ESPESSURA da lajota: o palco tira
        // d = |altura| − 12 km, e o anteparo (raio × 1e-3) fica em 12 m
        this.chaoDoAnel = {
          raioPc: VOLUME_DA_LAJOTA.meiaEspessura * this.raioA,
          centroPc: new THREE.Vector3(),
        };
        this.group.add(this.lajota.malha);
        void this.ligarPerfilDoAnel();
      }
    }
  }

  /**
   * O PERFIL MEDIDO NOS DOIS MATERIAIS, e a LUT do ringshine que nasce
   * dele. Falha aqui é degradação honesta: `uMapaAnel` continua no dummy
   * transparente (α = 0), o anel some e a sombra dele no globo devolve 1
   * — nenhum quadro quebra, e o console diz por quê.
   */
  private async ligarPerfilDoAnel(): Promise<void> {
    try {
      await pedirPerfilDoAnel(this.base);
    } catch (erro) {
      console.warn('[gigante] perfil do anel não veio', erro);
      return;
    }
    if (this.disposto || !perfilDoAnelVivo) return;
    const { textura, bytes } = perfilDoAnelVivo;
    if (this.matAnel) this.matAnel.uniforms.uMapaAnel.value = textura;
    this.lajota?.ligarPerfil(textura);
    if (this.matSuperficie) {
      this.matSuperficie.uniforms.uMapaAnel.value = textura;
      this.ringshine = new RingshineDoAnel(bytes, this.kPolar);
      this.matSuperficie.uniforms.uRingshine.value = this.ringshine.textura;
      this.matSuperficie.uniforms.uRingshineAtivo.value = 1;
    }
  }

  dispose() {
    this.disposto = true;
    this.ringshine?.textura.dispose();
    this.ringshine = null;
    this.group.clear();
    this.geometria?.dispose();
    this.matSuperficie?.dispose();
    this.geoAnel?.dispose();
    this.matAnel?.dispose();
    this.tenues?.dispose();
    this.lajota?.dispose();
    this.dummyAnel?.dispose();
    this.texturas.dispose();
  }
}
