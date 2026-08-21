// ============================================================
// A LEI DA ESTRELA — a peça única (L1 da LEI-DA-ESTRELA.md).
//
// Este arquivo é a ÚNICA face pública da lei de como uma estrela é desenhada
// nesta casa, em qualquer distância. Ele é PURO — sem three, importando SÓ
// `luzDaCasa.ts` — porque a lei tem de ser auditável em `node`, e a primeira
// necessidade de câmera puxaria three para dentro dela.
//
// O CONTRATO É TRÊS, não um (v2.1 da Lei): o ESTADO LÓGICO da estrela (que
// não conhece câmera nem tela), a OBSERVAÇÃO (o que depende de quem olha) e
// o INSTRUMENTO (o que a casa é, um por quadro). Misturá-los foi o que fez
// a lei antiga aceitar a câmera pela porta dos fundos.
//
// A LEI EM UMA FRASE (decisão do dono): uma estrela nunca "vira outra
// coisa"; ela só muda de tamanho. Existem duas coisas — o DISCO (a estrela,
// brilho de superfície invariante com a distância) e o CLARÃO (a lente,
// artefato do instrumento, presente em TODA distância) — e uma REPARTIÇÃO
// contínua em DOIS EIXOS, nunca duas leis concorrendo:
//
//   eixo ÓPTICO         wPonto + wResolvido = 1   (a fonte é resolvida?)
//   eixo REPRESENTAÇÃO  wEsfera + wMalha = 1      (impostor ou geometria?)
//
// Pesos finais: ponto = wPonto; esfera = wResolvido·wEsfera; malha =
// wResolvido·wMalha. Somam 1 POR CONSTRUÇÃO — nenhuma soma verificada por
// sorte. Não existe booleano nesta lei: bandeira liga/desliga é pop
// garantido, e pop é o defeito que ela existe para matar.
//
// O CLARÃO NUNCA É GATEADO POR wPonto. A óptica age sobre a imagem estelar
// INTEIRA — uma câmera apontada para o Sol de perto produz MAIS clarão, não
// menos. O ganho do clarão deriva do FLUXO, sempre presente; o que desvanece
// com wResolvido é o ponto-COMO-OBJETO, nunca a óptica.
//
// NO DIA 1 ESTE MÓDULO NÃO TEM CONSUMIDOR e não move um pixel. As migrações
// M1..M7 apagam as leis velhas e ligam os sítios um a um — cada uma no seu
// commit, com o delta declarado ANTES. A ordem vive em LEI-DA-ESTRELA §4;
// o censo de quem migra vive em `cadastroDeRepresentacoes.ts`.
// ============================================================
import {
  M_V_SOL,
  TEFF_SOL_K,
  anguloSolidoDeDisco,
  blackbodyLinear,
  depositoDoDisco,
  magnitudeDeFluxo,
  picoDaPsf,
  psfPointSizePx,
  radianciaDeTela,
  radianciaVisivelDeCorpoNegro,
  sigmaDaPsfPx,
} from './luzDaCasa';

// A FASE DO CICLO PELA DATA mora num módulo INTERNO (`estrela/`), como o
// §3 permite — "módulos internos podem existir atrás dela, desde que nada
// os importe de fora". A porta é ESTA linha: quem precisa da fase importa
// de `estrela.ts`. O assunto é grande o bastante para ter arquivo próprio
// (a âncora do ciclo 25, a assimetria subida/descida) e não tem por que
// engordar a repartição.
export {
  faseDoCiclo,
  tempoDoCiclo,
  haleDoCiclo,
  UNIDADES_POR_CICLO,
  PERIODO_DO_CICLO_ANOS,
  SUBIDA_DO_CICLO_ANOS,
  DESCIDA_DO_CICLO_ANOS,
  JD_DO_MINIMO_ANCORA,
  CICLO_DA_ANCORA,
  DIAS_DO_ANO_JULIANO,
} from './estrela/cicloDeAtividade';
export type { FaseDoCiclo } from './estrela/cicloDeAtividade';

// ─── OS TRÊS CONTRATOS ────────────────────────────────────────────────────

/**
 * Parâmetros de atividade do ciclo estelar — manchas, faculae, coroa,
 * ejeções. MÍNIMO no L1: os campos ganham corpo quando M1 formalizar os
 * três campos S/C/E (§5.18) na instância nº 1.
 */
export interface ParametrosDeAtividade {
  /** fase do ciclo de atividade, 0..1 (0 = mínimo) */
  nivel: number;
}

/**
 * O ESTADO LÓGICO — não conhece câmera nem tela. `id` e `semente`
 * ATRAVESSAM as representações (§5.20): na promoção partícula → catálogo →
 * corpo, a estrela é A MESMA — re-semear na troca é a fonte "piscando" e
 * virando outra, exatamente o que a frase do dono proíbe. A fase é
 * PERSISTENTE: um corpo que sai de quadro e volta não recomeça o relógio.
 *
 * Os três campos do §5.18 são AS FACES deste estado, não camadas
 * independentes — derivados dele, sempre:
 *   S(n, t)    — superfície (granulação, manchas, faculae)
 *   C(n, h, t) — cromosfera, casca fina sobre S
 *   E(x, t)    — exterior (coroa, proeminências, ejeções) no 3D em volta
 */
export interface EstadoDaEstrela {
  id: string;
  semente: number;
  posicaoPc: readonly [number, number, number];
  raioPc: number;
  teffK: number;
  /** relógio da simulação, s */
  tempo: number;
  /** fase do ciclo de atividade, 0..1 */
  fase: number;
  rotacao: { periodo: number; eixo: readonly [number, number, number] };
  atividade: ParametrosDeAtividade;
}

/** O que depende de QUEM OLHA — e só isso. */
export interface Observacao {
  distPc: number;
  direcao: readonly [number, number, number];
  /** extinção acumulada na linha de visada (profundidade óptica) */
  tau?: number;
}

/** O que a CASA é — um por quadro. */
export interface Instrumento {
  alturaPx: number;
  tanHalfFov: number;
  expoM0: number;
  sigmaPx: number;
  /** β da compressão na emissão — a lei devolve valores PRÉ-curva e expõe
   *  onde o consumidor aplica `comprimir` (cláusula de toda migração, §4) */
  beta: number;
  /** 1 px = estrela; 4 px é regra de corpo TEXTURIZADO (o antigo gate) */
  trocaPx?: number;
  /** ∈[0,1] CONTÍNUO, com histerese NO CHAMADOR — nunca booleano.
   *  Proximidade da superfície, displacement projetado, horizonte curvo:
   *  quem mede é quem olha; a lei só reparte. */
  requisitoGeometrico?: number;
}

/** Covariância 2×2 simétrica da pegada do pixel no plano tangente (pc²). */
export interface Covariancia2x2 {
  xx: number;
  xy: number;
  yy: number;
}

export interface Reparticao {
  /** diâmetro angular verdadeiro em px (1/d) — a régua do eixo óptico */
  discoPx: number;
  /** radiância de superfície na banda de render — SEM distância no argumento */
  radiancia: number;
  /** fluxo recebido na unidade da casa, JÁ com extinção */
  fluxo: number;
  cor: readonly [number, number, number];

  // eixo ÓPTICO — a fonte é resolvida?
  wPonto: number;
  /** escrito como `1 - wPonto` — a conservação é tautológica */
  wResolvido: number;
  // eixo de REPRESENTAÇÃO — o resolvido é impostor ou geometria?
  wEsfera: number;
  /** escrito como `1 - wEsfera` */
  wMalha: number;

  /** diâmetro do clarão em px — a óptica PLENA do ponto (fluxo sem
   *  filtro) × a soltura; nunca gateado por wPonto nem pelo filtro
   *  (R2 do item 44 — a rampa da entrega vive no TAMANHO) */
  claraoPx: number;
  /** ganho do clarão — função do fluxo (em unidade de tela), presente em
   *  todo regime */
  claraoGanho: number;
  /** a soltura do clarão (0 = superfície é a dona; 1 = ponto pleno) —
   *  a rampa ÚNICA da entrega, consumida pela camada do clarão */
  solturaDoClarao: number;
  /** partição de energia da asa com o bloom (§1) — UM dono, declarada */
  fracaoDaAsaExplicita: number;
  /** pegada do pixel no plano tangente, no CENTRO do disco — a anisotropia
   *  do limbo é da face GLSL (M1), com a singularidade limitada por
   *  MU_MINIMO_DO_LIMBO */
  pegada: Covariancia2x2;
  /** a maior frequência espacial que o campo procedural pode somar (1/pc) */
  frequenciaMaxima: number;
  /** 1 = a lei (radiância verdadeira); 0 = paleta autorada (instância nº 1) */
  overrideExpoente: number;
  /** quanto de brilho a exceção retira, VIVO — vai ao cadastro e ao selo */
  overrideFator: number;
}

// ─── AS CONSTANTES DA LEI — todas com nome, nenhuma no meio da conta ─────

/** O ponto-zero ÚNICO da lei: M_V☉ = 4,83 (`stellarPhysics.ts`). O campo
 *  ainda usa 4,85; unificar move 328.749 pontos e é gate com FOTO para o
 *  dono, antes do M3 (§5.9). A lei nasce com UM, como manda a cláusula. */
export const PONTO_ZERO_DA_LEI = M_V_SOL;

/** Abaixo disto não há disco para desenhar — aritmética de tela. */
export const TROCA_PX_PADRAO = 1;

/** A largura da rampa do eixo óptico, em razão: a troca vai de `trocaPx` a
 *  `LARGURA_DA_TROCA · trocaPx` (uma oitava), C¹ pelo smoothstep. */
export const LARGURA_DA_TROCA = 2;

/** β da asa Moffat — asa ∝ θ^(−2β), logo R ∝ F^(1/2β) = F^(1/4,8): o
 *  clarão ENCOLHE com a luz, que é o que mata o item 42. Parâmetro de
 *  projeto: o valor final entra com gate de foto para o dono entre 2,0 e
 *  3,0 (M2), e o escolhido fica escrito ao lado da captura. */
export const BETA_DA_ASA = 2.4;

/** Fração do fluxo que a asa EXPLÍCITA carrega — o resto é núcleo, e o
 *  bloom fica confinado abaixo do ombro (§1: a asa tem UM dono). Semente
 *  herdada do halo do fragment de hoje (o `0,06` de `STAR_FRAG`);
 *  finalizada no mesmo gate de foto do M2. */
export const FRACAO_DA_ASA = 0.06;

/** Raio de dobra da asa (θ₀) em unidades de σ da PSF. */
export const NUCLEO_DA_ASA_EM_SIGMAS = 2;

/** Expoente Moffat do BRAÇO do espinho — 1,5× o da asa, DERIVADO e não
 *  segundo número livre, e a direção é a LIÇÃO DO DONO (16/08, ao ver o
 *  M2 cru): a primeira forma usava ¾·β ("a cruz tem de alcançar mais que
 *  o halo") e produzia braços SATURADOS de ~2.400 px atravessando a tela
 *  no meio da escada — *"os spikes ficaram horríveis e enormes"*. Braço
 *  em lei de potência com expoente MENOR que o do halo não vira cruz:
 *  vira parede. A cruz elegante de câmera é o contrário — decai MAIS
 *  rápido que o halo (a ponta afina e some), e o comprimento dela cresce
 *  devagar com o fluxo. O 1,5 entra no MESMO gate de foto do expoente da
 *  asa (M2) — um gate, dois números acorrentados. */
export const BETA_DO_ESPINHO = 1.5 * BETA_DA_ASA;

/** O limiar de visibilidade do clarão, em luz de tela: o piso de 8 bits.
 *  Abaixo dele a asa afunda no céu e estrela fraca continua um ponto. */
export const LIMIAR_DO_CLARAO = 1 / 255;

/** A fração do pico que os ESPINHOS de difração carregam — a lei que matou
 *  o clamp `sat` (§5.4, M2). O gatilho antigo saturava em pico 4: Vênus,
 *  Júpiter e Sirius ganhavam a MESMA cruz (item 43) e o Sol a 1 UA, 25
 *  magnitudes acima, idem — "dois brilhos diferentes viram o mesmo pixel",
 *  proibido pelo NORTE. Agora a amplitude é fração do fluxo, comprimida
 *  junto com o resto na emissão: a cruz vem NA DOSE do brilho, como numa
 *  câmera real. Calibrada por CONTINUIDADE em Sirius, não por gosto: o
 *  desenho velho dava amplitude 0,85 no pico 30,57 de Sirius (900 px), e
 *  0,85/30,57 = 0,0278 — a estrela-exemplar sai igual, e todo o resto
 *  passa a escalar. (A dependência de resolução do pico é a dívida §5.6,
 *  a mesma do β da emissão — declarada, não nova.) */
export const FRACAO_DOS_ESPINHOS = 0.0278;

/** O pico em que o BRANQUEAMENTO do núcleo (saturação de sensor) atinge
 *  meia altura: `pico/(pico + 4)` — curva de saturação suave, sem clamp.
 *  O 4 é herdado do desenho velho (o pico em que `sat` saturava): o ponto
 *  de branqueamento pleno de ontem vira a meia-altura de hoje, e estrela
 *  forte segue branqueando por SATURAÇÃO declarada do instrumento, não
 *  pela dessaturação da compressão (§5.3 continua sendo outra dívida). */
export const BRANQUEAMENTO_MEIA_ALTURA = 4;

/** A régua do override (o filtro solar como SEÇÃO da lei, §5.7): a MESMA
 *  `discoPx` do eixo óptico, com largura própria. 4 px é a regra de corpo
 *  texturizado (o antigo gate do palco); 2,5 é a largura herdada da rampa
 *  simétrica em log do filtro de 15/08. */
export const LIMIAR_DO_OVERRIDE_PX = 4;
export const LARGURA_DO_OVERRIDE = 2.5;

/**
 * A SOLTURA DO CLARÃO — a rampa ÚNICA da entrega ponto↔resolvido da
 * óptica, no domínio do TAMANHO (R2 do item 44, a soltura do filtro).
 *
 * O QUE ELA MATA, medido na sonda densa de 17/08: o clarão era gateado
 * por DUAS travas na mesma janela — o peso do ponto E a divisão pelo
 * filtro solar (26 magnitudes de exponencial espremidas em ~1 oitava de
 * distância) — e como o raio da asa vai com fluxo^(1/2β), o tamanho
 * EXPLODIA no recuo: 10 → 30 → 118 → 357 → 417 px entre 0,8 e 2 UA
 * (42×), as "2 violações de crescimento" da sonda, absolvidas por uma
 * exceção escrita na régua. Multiplicar fluxo por rampas e tirar raiz
 * nunca dá rampa mansa — a entrega C¹ tem de viver no TAMANHO.
 *
 * A LEI NOVA: o clarão é computado PLENO (óptica do ponto, fluxo sem
 * filtro — com o teto de ocupação do dono por cima) e multiplicado por
 * UMA soltura C¹ em log do disco aparente: 0 com disco ≥ 10 px (o
 * filtro completa e a superfície é a dona — clarão nenhum por cima da
 * fotosfera, a lição do círculo branco), 1 com disco ≤ 2 px (ponto
 * pleno). Recuando, o clarão DESABROCHA do teto estacionado pela janela
 * declarada — *"ela sempre chega no máximo que vai ocupar rapidamente"*
 * (o espelho do brief do dono) — e daí só encolhe com a asa. O filtro
 * solar segue dono da SUPERFÍCIE (§5.7, intocado); do clarão, ele não
 * é mais.
 */
export const SOLTURA_PLENA_PX = 2;
export const SOLTURA_FIM_PX = LIMIAR_DO_OVERRIDE_PX * LARGURA_DO_OVERRIDE;

/** A soltura, forma única (consumida por `repartir` e espelhada na
 *  régua da luz): smoothstep em LOG do disco — por oitava de distância
 *  o passo é constante, que é a régua da continuidade (§5.10). */
export function solturaDoClarao(discoPx: number): number {
  if (!(discoPx > 0)) return 1;
  return (
    1 -
    smoothstep(Math.log(SOLTURA_PLENA_PX), Math.log(SOLTURA_FIM_PX), Math.log(discoPx))
  );
}

/** A lei que limita a singularidade da pegada no limbo (μ = cosseno do
 *  ângulo de visada): a elipse estica com 1/μ e é GRAMPEADA em 1/μ_min —
 *  sem isso o limbo ferve enquanto o centro está liso (§1). A face GLSL
 *  (M1) é quem a consome por fragmento; o nome mora aqui. */
export const MU_MINIMO_DO_LIMBO = 0.05;

// ─── AS FUNÇÕES DA LEI ────────────────────────────────────────────────────

/** O smoothstep de GLSL, palavra por palavra, em float64 — as duas faces
 *  da lei usam a MESMA forma. */
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * O diâmetro aparente em px — a MESMA conta de `diametroAparentePx`
 * (`world/corpos/corpos.ts`, a régua do palco), com a `atan` exata.
 * Redigitada aqui porque a régua do palco importa three e a lei não pode;
 * `estrela.test.ts` cobra a igualdade bit a bit contra a original.
 */
export function discoAparentePx(
  raioPc: number,
  distPc: number,
  alturaPx: number,
  tanHalfFov: number
): number {
  return (2 * Math.atan(raioPc / distPc) * alturaPx) / (2 * tanHalfFov);
}

/**
 * O RAIO VISÍVEL DA ASA em px — a face CPU da MESMA conta do GLSL
 * (`raioDaAsaPx` em `GLSL_LEI_DA_ESTRELA`, abaixo): resolve
 * `f·P/(1+(θ/θ₀)²)^β = limiar`. Exportada no M2 porque a camada do
 * clarão (`world/clarao.ts`) precisa DELA por candidato e por quadro —
 * redigitá-la lá seria recriar a cópia que o F0 matou. `repartir` usa
 * esta mesma escrita.
 */
export function raioVisivelDaAsaPx(picoDeTela: number, sigmaPsfPx: number): number {
  const excesso = (FRACAO_DA_ASA * picoDeTela) / LIMIAR_DO_CLARAO;
  if (!(excesso > 1)) return 0;
  return NUCLEO_DA_ASA_EM_SIGMAS * sigmaPsfPx * Math.sqrt(Math.pow(excesso, 1 / BETA_DA_ASA) - 1);
}

/**
 * O ALCANCE VISÍVEL DO BRAÇO do espinho em px — mesma família Moffat da
 * asa, expoente próprio (`BETA_DO_ESPINHO`): o braço decai mais devagar
 * que o halo, e é isso que faz a cruz LER como cruz em vez de afundar
 * dentro dela. Resolve `f_s·P/(1+(θ/θ₀)²)^βs = limiar`.
 */
export function alcanceDoEspinhoPx(picoDeTela: number, sigmaPsfPx: number): number {
  const excesso = (FRACAO_DOS_ESPINHOS * picoDeTela) / LIMIAR_DO_CLARAO;
  if (!(excesso > 1)) return 0;
  return (
    NUCLEO_DA_ASA_EM_SIGMAS * sigmaPsfPx * Math.sqrt(Math.pow(excesso, 1 / BETA_DO_ESPINHO) - 1)
  );
}

// ─── A ENTRADA DO CLARÃO DO SOL (item 44, forma final do resgate) ────────
// A FORMA e o brilho do clarão são os do FILME (a mesma receita das
// heroes, `world/clarao.ts`); o TAMANHO segue a asa do item 3 com o
// teto de ocupação por estrela. Aqui mora só o GATILHO — a lei decide
// QUANDO a óptica acende, nunca como ela é bonita.

/** O GATILHO DE ENTRADA — o `vSat` de 30/07: o clarão acende porque o
 *  núcleo ESTOUROU (pico > 1) e satura em pico 4. Fraca segue ponto;
 *  sob o filtro solar (pico ≈ 0) a óptica não existe. */
export function ganhoDeEntradaDoFlare(pico: number): number {
  if (!(pico > 1)) return 0;
  return Math.min(1, 0.5 * Math.log2(pico));
}

/**
 * A REPARTIÇÃO — a função única. Recebe os três contratos e devolve tudo
 * que qualquer representação precisa para desenhar esta estrela AGORA.
 *
 * FALLBACK ÚNICO (§8.5), decidido uma vez, na direção que não pode cegar o
 * quadro: entrada inválida ⇒ ponto inteiro, esfera como representação,
 * paleta autorada (`overrideExpoente = 0`), fluxo zero. Três mecanismos da
 * casa discordavam sobre a direção segura; esta é a resposta.
 */
export function repartir(e: EstadoDaEstrela, o: Observacao, i: Instrumento): Reparticao {
  const trocaPx = i.trocaPx ?? TROCA_PX_PADRAO;
  const valida =
    Number.isFinite(e.raioPc) &&
    e.raioPc > 0 &&
    Number.isFinite(e.teffK) &&
    e.teffK > 0 &&
    Number.isFinite(o.distPc) &&
    o.distPc > 0 &&
    Number.isFinite(i.alturaPx) &&
    i.alturaPx > 0 &&
    Number.isFinite(i.tanHalfFov) &&
    i.tanHalfFov > 0 &&
    Number.isFinite(i.sigmaPx) &&
    i.sigmaPx > 0 &&
    Number.isFinite(i.expoM0) &&
    Number.isFinite(trocaPx) &&
    trocaPx > 0;
  if (!valida) {
    return {
      discoPx: 0,
      radiancia: 0,
      fluxo: 0,
      cor: blackbodyLinear(TEFF_SOL_K),
      wPonto: 1,
      wResolvido: 0,
      wEsfera: 1,
      wMalha: 0,
      claraoPx: 0,
      claraoGanho: 0,
      solturaDoClarao: 1,
      fracaoDaAsaExplicita: FRACAO_DA_ASA,
      pegada: { xx: 0, xy: 0, yy: 0 },
      frequenciaMaxima: 0,
      overrideExpoente: 0,
      overrideFator: 1,
    };
  }

  // ── o que a estrela É, visto dali ──
  const discoPx = discoAparentePx(e.raioPc, o.distPc, i.alturaPx, i.tanHalfFov);
  const radiancia = radianciaVisivelDeCorpoNegro(e.teffK);
  const tau = Number.isFinite(o.tau) && (o.tau as number) > 0 ? (o.tau as number) : 0;
  // fluxo COM extinção — a extinção condicional de 3 px do campo é uma das
  // leis velhas que M3 apaga; aqui ela entra sempre, como física manda.
  const fluxo = radiancia * anguloSolidoDeDisco(e.raioPc, o.distPc) * Math.exp(-tau);
  const cor = blackbodyLinear(e.teffK);

  // ── eixo ÓPTICO ──
  const wPonto = 1 - smoothstep(trocaPx, LARGURA_DA_TROCA * trocaPx, discoPx);
  const wResolvido = 1 - wPonto;

  // ── eixo de REPRESENTAÇÃO ──
  const requisito = Math.min(1, Math.max(0, i.requisitoGeometrico ?? 0));
  const wEsfera = 1 - smoothstep(0, 1, requisito);
  const wMalha = 1 - wEsfera;

  // ── o OVERRIDE (o filtro solar como seção da lei) — calculado ANTES do
  // clarão, porque o clarão o CONSOME (a lição do dono, 16/08) ──
  const overrideExpoente =
    1 - smoothstep(LIMIAR_DO_OVERRIDE_PX, LIMIAR_DO_OVERRIDE_PX * LARGURA_DO_OVERRIDE, discoPx);
  const overrideFator = Math.pow(
    radianciaDeTela(1, e.raioPc, i.alturaPx),
    1 - overrideExpoente
  );

  // ── o CLARÃO — a óptica PLENA do ponto, vestida pela SOLTURA ──
  // A troca de unidade (casa → tela) é a DO INVARIANTE: a radiância sobe
  // pela mesma ponte da fotosfera (`radianciaDeTela`) e o depósito do disco
  // a integra sobre os pixels — é o lado "disco" da troca, escrito uma vez
  // em `luzDaCasa.ts`. Para o Sol a 1 UA isso devolve m = −26,72, o número
  // da casa; multiplicar o fluxo em esterradianos pelo vão, sem a área do
  // pixel, erraria por (px/rad)²/4 ≈ 6,6e5 — o teste da asa pegou.
  //
  // A SOLTURA SUBSTITUIU O FILTRO NA ASA (R2 do item 44). A forma do M2
  // ("a asa divide pelo overrideFator") somada ao peso do ponto punha
  // DUAS travas exponenciais na mesma janela — e raiz de exponencial
  // explode: 10→417 px de borrão entre 0,8 e 2 UA na sonda densa, o
  // crescimento no recuo que o dono condenou. Agora o clarão é a conta
  // PLENA do ponto (fluxo sem filtro — o que a câmera sem filtro veria)
  // e a entrega ponto↔resolvido é a `solturaDoClarao`, UMA rampa C¹ no
  // domínio do tamanho, consumida pela camada do clarão. A lição do
  // círculo branco continua paga: soltura = 0 exatamente onde o filtro
  // completa (disco ≥ 10 px) — clarão nenhum por cima da fotosfera. O
  // `fluxoDeTela` filtrado segue existindo como o fluxo que o
  // instrumento ADMITE (claraoGanho, cadastro, selo) — do TAMANHO do
  // clarão, o filtro não é mais dono.
  const fluxoDeTela =
    (depositoDoDisco(radianciaDeTela(radiancia, e.raioPc, i.alturaPx), discoPx) *
      Math.exp(-tau)) /
    overrideFator;
  const fluxoPleno =
    depositoDoDisco(radianciaDeTela(radiancia, e.raioPc, i.alturaPx), discoPx) *
    Math.exp(-tau);
  const soltura = solturaDoClarao(discoPx);
  const m = magnitudeDeFluxo(fluxoPleno, i.expoM0);
  const sigma = sigmaDaPsfPx(i.sigmaPx, i.alturaPx);
  // núcleo: o tamanho gaussiano de hoje (√ln E) — correto no SPRITE que
  // carrega o fluxo; a doença do item 42 era usá-lo como lei do HALO.
  const nucleoPx = psfPointSizePx(m, i.expoM0, i.sigmaPx, i.alturaPx);
  // asa: Moffat. O raio visível resolve f·P/(1+(θ/θ₀)²)^β = limiar —
  // a escrita única mora em `raioVisivelDaAsaPx`. (O item 44/R1 NÃO muda
  // esta declaração: a régua do Sol continua a aceita no item 3; a lei
  // do flare abaixo vale para as ESTRELAS da camada do clarão.)
  const pico = picoDaPsf(m, i.expoM0, i.sigmaPx, i.alturaPx);
  const raioDaAsaPx = raioVisivelDaAsaPx(pico, sigma);
  const claraoPx = Math.max(nucleoPx, 2 * raioDaAsaPx) * soltura;
  const claraoGanho = fluxoDeTela;

  // ── a PEGADA no centro do disco (a anisotropia do limbo é do fragmento) ──
  const anguloPorPixel = (2 * i.tanHalfFov) / i.alturaPx;
  const ladoDoPixelPc = o.distPc * anguloPorPixel;
  const pegada: Covariancia2x2 = { xx: ladoDoPixelPc * ladoDoPixelPc, xy: 0, yy: ladoDoPixelPc * ladoDoPixelPc };
  const frequenciaMaxima = 1 / (2 * ladoDoPixelPc);

  return {
    discoPx,
    radiancia,
    fluxo,
    cor,
    wPonto,
    wResolvido,
    wEsfera,
    wMalha,
    claraoPx,
    claraoGanho,
    solturaDoClarao: soltura,
    fracaoDaAsaExplicita: FRACAO_DA_ASA,
    pegada,
    frequenciaMaxima,
    overrideExpoente,
    overrideFator,
  };
}

// ─── A FACE GPU — o MESMO texto, gerado das MESMAS constantes ─────────────
//
// As 18 representações são GLSL; 328.749 estrelas não podem chamar
// `repartir` por quadro na CPU. A conformidade entre as duas faces é
// NUMÉRICA (grade em `estrela.test.ts`, transliteração float64 do corpo
// abaixo) — varredura textual é proibida como prova (§8.6).
export const GLSL_LEI_DA_ESTRELA = /* glsl */ `
// A repartição da Lei da Estrela — dois eixos, pesos que somam 1 por
// construção. Constantes interpoladas de estrela.ts, a fonte única.
void repartirPesos(
  float discoPx, float trocaPx, float requisitoGeometrico,
  out float wPonto, out float wResolvido, out float wEsfera, out float wMalha
) {
  wPonto = 1.0 - smoothstep(trocaPx, ${LARGURA_DA_TROCA.toFixed(1)} * trocaPx, discoPx);
  wResolvido = 1.0 - wPonto;
  wEsfera = 1.0 - smoothstep(0.0, 1.0, clamp(requisitoGeometrico, 0.0, 1.0));
  wMalha = 1.0 - wEsfera;
}

// O raio visível da asa Moffat, em px — o clarão que ENCOLHE com a luz
// (R ~ F^(1/${(2 * BETA_DA_ASA).toFixed(1)})). Deriva do FLUXO (pico da PSF em tela), nunca do
// peso do ponto: a óptica age sobre a imagem estelar inteira (§1).
float raioDaAsaPx(float picoDeTela, float sigmaPx) {
  float excesso = (${FRACAO_DA_ASA} * picoDeTela) / ${LIMIAR_DO_CLARAO};
  if (excesso <= 1.0) return 0.0;
  float theta0 = ${NUCLEO_DA_ASA_EM_SIGMAS.toFixed(1)} * sigmaPx;
  return theta0 * sqrt(pow(excesso, ${1 / BETA_DA_ASA}) - 1.0);
}
`;
