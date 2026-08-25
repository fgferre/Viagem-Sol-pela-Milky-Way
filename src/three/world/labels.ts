// ============================================================
// Rótulos das estrelas nomeadas — projeção 3D → Canvas 2D do HUD.
// No voo livre eles também são os ALVOS do clicar-para-visitar.
// ============================================================
import * as THREE from 'three';
import type { NamedStar } from '../config';
import { GAL } from './baseGalactica';

export interface StarLabel {
  name: string;
  /** tipo espectral — vazio nos corpos do sistema, que não têm um */
  spect: string;
  distPc: number;
  x: number; // 0..1
  y: number; // 0..1
  opacity: number;
  key: string;
  /** 0 = nome próprio, 1 = designação de Bayer. Só ordena a disputa
   *  pelas vagas; o Sol e Sgr A✱ entram como 0. */
  tier?: number;
  /**
   * O que a etiqueta escreve ao lado do nome quando o detalhe NÃO é
   * tipo espectral — os corpos do sistema trazem aqui a classe deles em
   * pt-BR ("planeta", "planeta anão"). Ausente nas estrelas: lá vale o
   * `spect` aparado em 5, que é o que as 1.726 nomeadas sempre
   * mostraram, pixel a pixel.
   */
  detalhe?: string;
  /**
   * O RÓTULO CHEGOU A SER DESENHADO NESTE QUADRO? Quem escreve é o
   * `LabelCanvas`, no MESMO objeto que o Director guarda em
   * `lastLabels` — e é isso que faz o desenho e o CLIQUE lerem uma
   * lista só (pendência 30, 2026-08-14).
   *
   * Por que a marca e não uma segunda lista: o desenho descarta por
   * três leis suas (quase-transparente, faixa reservada do HUD e
   * colisão com um nome que chegou antes), e no TETO do zoom do Atlas
   * ela descarta MUITO — os dez corpos e as 21 luas projetam quase no
   * mesmo ponto e só o Sol sobrevive. (Era a vista de ABERTURA até
   * 23/08; o item 61 desceu a abertura para o sistema interno, e o
   * aperto ficou no teto, aonde a roda ainda leva.) Sem a marca, o clique
   * no "SOL" escrito na tela caía em Fobos, que estava 0,4% de tela
   * mais perto do dedo e nunca fora desenhado.
   *
   * `undefined` = o desenho ainda não passou por este quadro; o clique
   * só descarta o `false` EXPLÍCITO, para nunca ficar sem alvo caso o
   * canvas dos rótulos não exista.
   */
  desenhado?: boolean;
  /**
   * QUEM GANHA A VAGA quando dois nomes se atropelam (item 73, 22/08).
   * Número maior manda; `undefined` é "não entra na disputa por
   * hierarquia" e vale o peso mínimo — é o caso do RAMO DO FILME, que
   * não é tocado por esta obra e continua ordenando por tier e
   * proximidade, como sempre ordenou.
   *
   * O valor sai da tabela `PRIORIDADE_DO_ROTULO`, e a razão de ele ser
   * um NÚMERO e não uma classe é o bônus de histerese: quem estava
   * desenhado no quadro anterior vale 20% a mais, e isso é uma
   * multiplicação, não um caso novo.
   */
  prioridade?: number;
  /**
   * A RÉGUA DE RELEVÂNCIA DISSE NÃO (item 82, N1) — este nome projetou,
   * mas a tela já está cheia de nomes que importam mais.
   *
   * É uma MARCA e não uma remoção da lista de propósito: `alvos` continua
   * sendo a projeção inteira (o que o Director publica e o juiz lê), e
   * quem foi cortado nasce `desenhado: false` como qualquer outro
   * descarte do desenho. Sem a marca, o corte teria de acontecer
   * removendo da lista, e aí a diferença entre "a régua não quis" e "não
   * coube" ficaria invisível para quem mede.
   */
  cortadoPelaRegua?: boolean;
}

/**
 * A HIERARQUIA DOS NOMES, numa tabela só — a reimplementação do
 * `OverlayPositionTracker` do atlas doador (item 73, plano §3).
 *
 * O que ela resolve, medido no TETO do zoom (224 UA — a vista de
 * abertura até 23/08, e desde o item 61 o lugar aonde a roda leva): os
 * dez corpos e as 21 luas projetam a menos de 1% de tela uns dos
 * outros, e quem chegava primeiro na lista ocupava. O resultado era
 * Saturno nascendo `desenhado: false` por colidir com "SOL", e a queixa
 * do dono — *"conseguíamos ver os rótulos de todos objetos de forma
 * inteligente"*.
 *
 * OS NÚMEROS, e a razão de cada degrau:
 *  · `foco` 120 — o que o visitante escolheu nunca cede a nada. **Era
 *    100, e 100 NÃO CUMPRIA a própria promessa** (achado em 24/08, ao
 *    escrever a trava de hierarquia): o bônus de histerese multiplica o
 *    peso de quem já estava na tela, e `sol` 90 × 1,2 = **108 > 100** —
 *    um Sol já desenhado passava à frente de um alvo recém-escolhido que
 *    ainda não tivesse aparecido, que é exatamente o que esta linha jura
 *    que não acontece. 120 dá **folga** sobre os 108 — não é o menor
 *    valor que serviria (110 já passaria a trava): é o degrau redondo
 *    que deixa margem para a tabela crescer sem raspar no limite;
 *  · `sol` 90 — a estrela da casa é o centro do frame e a referência de
 *    escala de toda vista do Atlas;
 *  · `planeta` 10, `anao` 8, `lua` 6 — a hierarquia do próprio objeto;
 *  · `estrelaPropria` 5 e `estrelaBayer` 3 — o tier que
 *    `projectLabels` já usava para desempatar, virado peso: nome
 *    próprio acima de designação;
 *  · `outros` 4 — Sagittarius A✱ e o que mais chegar sem classe.
 */
export const PRIORIDADE_DO_ROTULO = {
  foco: 120,
  sol: 90,
  planeta: 10,
  anao: 8,
  lua: 6,
  estrelaPropria: 5,
  outros: 4,
  estrelaBayer: 3,
} as const;

/**
 * O bônus de quem JÁ ESTAVA na tela — a histerese, em fator.
 *
 * **ELE NÃO PODE INVERTER A TABELA ACIMA**, e essa é a trava que
 * `labels.test.ts` guarda par a par: para todo degrau vizinho, o de
 * baixo COM bônus não passa o de cima sem bônus. A folga mais apertada é
 * `lua` 6 contra `estrelaPropria` 5 × 1,2 = **6,0** — empate exato, que
 * o desempate por distância resolve. Subir este fator para 1,25
 * inverteria esse par (6,25 > 6) e uma estrela roubaria a vaga de uma
 * lua — mas ESSE caso já tinha pino antes da trava; quem a fez nascer
 * foi o par `sol`/`foco`, que não tinha juiz nenhum (ver a tabela).
 */
export const BONUS_DE_HISTERESE = 1.2;

/**
 * A prioridade de um corpo do sistema, pela CLASSE em pt-BR que a
 * tabela `NOMES_DOS_CORPOS` já publica ("estrela", "planeta", "planeta
 * anão", "lua", "asteroide"). Deriva do dado que existe — uma segunda
 * tabela de ids seria a segunda fonte de verdade que a primeira
 * desmentiria no dia em que alguém promovesse Ceres.
 */
export function prioridadeDeCorpo(classe: string): number {
  if (classe === 'estrela') return PRIORIDADE_DO_ROTULO.sol;
  if (classe === 'planeta') return PRIORIDADE_DO_ROTULO.planeta;
  if (classe === 'lua') return PRIORIDADE_DO_ROTULO.lua;
  if (classe === 'planeta anão' || classe === 'asteroide') {
    return PRIORIDADE_DO_ROTULO.anao;
  }
  return PRIORIDADE_DO_ROTULO.outros;
}

/** A prioridade de uma estrela, pelo tier (0 = nome próprio). */
export function prioridadeDeEstrela(tier: number | undefined): number {
  return (tier ?? 0) === 0
    ? PRIORIDADE_DO_ROTULO.estrelaPropria
    : PRIORIDADE_DO_ROTULO.estrelaBayer;
}

/**
 * O PESO da disputa: prioridade × histerese. Quem estava desenhado no
 * quadro anterior vale 20% a mais — sem isso a seleção PISCA quando dois
 * nomes disputam a mesma vaga e a projeção anda um pixel. É a mesma
 * histerese que `projectLabels` já tinha na disputa entre estrelas
 * (`prevKeys`), generalizada para a lista inteira.
 */
export function pesoDoRotulo(
  label: StarLabel,
  desenhadosAntes?: ReadonlySet<string>
): number {
  const base = label.prioridade ?? PRIORIDADE_DO_ROTULO.outros;
  return desenhadosAntes?.has(label.key) ? base * BONUS_DE_HISTERESE : base;
}

/**
 * ABAIXO DISTO O NOME JÁ NÃO SE LÊ, e quem o descarta é o desenho. O
 * número vivia digitado dentro do `LabelCanvas` e é lido agora também
 * pela régua, que não pode gastar vaga com um nome invisível: uma lua
 * colada no pai esmaece até quase zero (`esmaecerLuasColadasNoPai`) e
 * ainda assim empurraria uma estrela para fora do orçamento.
 */
export const OPACIDADE_MINIMA_DO_ROTULO = 0.08;

/**
 * QUANTOS NOMES A TELA CARREGA AO MESMO TEMPO — a régua de relevância do
 * item 82, e a metade que o NASA Eyes não tem.
 *
 * O estudo do Eyes (`docs/reference/estudo-orbitas-eyes-observacao.md`,
 * §5) mediu numa vista só: 103 nomes no DOM, 40 acesos, 11 mortos por
 * colisão. A quadtree deles resolve SOBREPOSIÇÃO e resolve bem — e ainda
 * assim quarenta nomes acesos é confusão. O Eyes nunca decide que um
 * objeto **não interessa**; só decide que ele **não cabe**. Esta
 * constante é a decisão que falta: primeiro corta-se por IMPORTÂNCIA,
 * e só o que sobra vai disputar lugar na tela.
 *
 * O NÚMERO É MEDIDO, não escolhido no ar. Antes dele a abertura do Atlas
 * desenhava 22 nomes — os cinco corpos em quadro e DEZESSETE estrelas,
 * quase todas designações de Bayer (ε Ind, ι Pav, τ PsA…) com traço de
 * até 102 px em volta do sistema. Era a queixa viva do dono:
 * *"o default todos os objetos estao com o label ligado, fica uma
 * confusao na tela"*. Com dez vagas a mesma abertura desenha o Sol, os
 * quatro rochosos e as estrelas de NOME PRÓPRIO que couberem — e as
 * designações de Bayer, que são o último degrau da tabela, caem
 * sozinhas, sem uma regra nova que as nomeie.
 *
 * Dez e não cinco: no TETO do zoom os dez corpos do sistema são o
 * assunto inteiro do quadro, e um orçamento menor cortaria planeta para
 * caber estrela de fundo. Quem some lá é a COLISÃO, que é outra lei.
 */
export const ORCAMENTO_DE_NOMES = 10;

/**
 * A RÉGUA DE RELEVÂNCIA, ANTES DA GEOMETRIA (item 82, N1) — ordena a
 * lista pela hierarquia da casa e marca o que passa do orçamento.
 *
 * A ORDEM É A DISPUTA: o `LabelCanvas` desenha na ordem que recebe e
 * quem chega primeiro ocupa, então ordenar aqui É decidir quem vence a
 * colisão. Empate desempata pelo mais PERTO, que é a régua que a lista
 * já usava entre estrelas.
 *
 * Não há tabela nova: o peso é o `pesoDoRotulo` de sempre
 * (`PRIORIDADE_DO_ROTULO` × a histerese de quem já estava na tela). O
 * bônus dos 20% é o que impede o corte de PISCAR — dois nomes de mesmo
 * peso disputando a última vaga trocariam de lugar a cada quadro em que
 * a projeção andasse um pixel.
 */
export function aplicarReguaDeRelevancia(
  lista: StarLabel[],
  desenhadosAntes?: ReadonlySet<string>,
  orcamento: number = ORCAMENTO_DE_NOMES
): StarLabel[] {
  lista.sort(
    (a, b) =>
      pesoDoRotulo(b, desenhadosAntes) - pesoDoRotulo(a, desenhadosAntes) ||
      a.distPc - b.distPc
  );
  let vagas = orcamento;
  for (const l of lista) {
    // o que já está invisível não gasta vaga: quem o descarta é o
    // desenho, pela mesma soleira
    if (l.opacity < OPACIDADE_MINIMA_DO_ROTULO) continue;
    // A MARCA SÓ SE ACENDE, NUNCA SE APAGA — e é por isso que o contrato
    // é lista NOVA a cada quadro. `projectCorpos` e `projectLabels`
    // constroem os objetos do zero em toda projeção, então um rótulo
    // nunca chega aqui trazendo o "não" do quadro anterior. Quem
    // reaproveitar uma lista entre quadros tem de limpar a marca antes,
    // senão o corte de um quadro vira sentença perpétua.
    if (vagas > 0) vagas--;
    else l.cortadoPelaRegua = true;
  }
  return lista;
}

const _v = new THREE.Vector3();

/** limite do olho nu — as 90 nomeadas do catálogo antigo iam só até 2,56,
 *  então este corte não tira nenhuma etiqueta que já existia */
const NAKED_EYE_MAG = 6.5;

function projectPoint(
  camera: THREE.PerspectiveCamera,
  p: THREE.Vector3 | { x: number; y: number; z: number }
): { x: number; y: number } | null {
  _v.set(p.x, p.y, p.z).project(camera);
  if (_v.z > 1 || _v.z < -1) return null; // atrás da câmera
  const x = (_v.x + 1) / 2;
  const y = (1 - _v.y) / 2;
  if (x < 0.04 || x > 0.96 || y < 0.08 || y > 0.9) return null;
  return { x, y };
}

/** Um corpo com disco: nome de estrela ESCONDIDA atrás dele não nasce. */
export interface OclusorDeRotulo {
  x: number;
  y: number;
  z: number;
  /** raio da superfície na cena, em pc */
  raio: number;
}

const _aoAlvo = new THREE.Vector3();
const _aoCorpo = new THREE.Vector3();

/**
 * O CENTRO da estrela cai dentro do cone do corpo, com o corpo entre a
 * câmera e ela? ("vejo estrelas através do sol" — item 47.) O teste é o
 * ângulo real (dot) contra o meio-ângulo do disco (cos = √(1−(r/d)²)) —
 * nada de aproximar seno por ângulo, que de perto o disco é ENORME.
 *
 * O IRMÃO DE GPU desta conta é o oclusor da nebulosa
 * (`nebula.setSunOccluder` + o cosseno SEGURO do cone dela): mesma
 * geometria, domínios diferentes — lá o cone encolhe pelas margens do
 * raymarch (tesselação, blur de RT), que não existem num rótulo.
 */
function escondidaPorDisco(
  camPos: THREE.Vector3,
  estrela: { x: number; y: number; z: number },
  distEstrela: number,
  oclusores: readonly OclusorDeRotulo[]
): boolean {
  for (const o of oclusores) {
    _aoCorpo.set(o.x, o.y, o.z).sub(camPos);
    const dCorpo = _aoCorpo.length();
    // corpo sem disco à frente (atrás da estrela, raio nulo, ou a câmera
    // DENTRO dele) não esconde nada
    if (!(o.raio > 0) || dCorpo <= o.raio || distEstrela <= dCorpo) continue;
    const razao = o.raio / dCorpo;
    const cosMeioAngulo = Math.sqrt(1 - razao * razao);
    _aoAlvo.set(estrela.x, estrela.y, estrela.z).sub(camPos);
    const cos = _aoAlvo.dot(_aoCorpo) / (distEstrela * dCorpo);
    if (cos > cosMeioAngulo) return true;
  }
  return false;
}

export function projectLabels(
  camera: THREE.PerspectiveCamera,
  named: NamedStar[],
  maxLabels = 7,
  prevKeys?: Set<string>,
  oclusores?: readonly OclusorDeRotulo[]
): StarLabel[] {
  const camPos = camera.position;
  const out: StarLabel[] = [];
  const dHome = camPos.length();
  const dGC = camPos.distanceTo(GAL.GC_POS);

  // o coração da galáxia tem nome quando estamos perto dele. O teto
  // caiu de 2,6 kpc para 1,2 (revisão: na fuga do centro a etiqueta
  // ficava flutuando sobre névoa, apontando um objeto já invisível).
  if (dGC > 6 && dGC < 1200) {
    const p = projectPoint(camera, GAL.GC_POS);
    if (p) {
      out.push({
        name: 'Sagittarius A✱',
        spect: 'SMBH',
        distPc: dGC,
        x: p.x,
        y: p.y,
        opacity:
          (1 - THREE.MathUtils.smoothstep(dGC, 800, 1200)) *
          THREE.MathUtils.smoothstep(dGC, 6, 16) *
          0.95,
        key: 'sgr-a',
      });
    }
  }

  // longe de casa (>2 kpc) só resta um rótulo estelar possível: o Sol
  if (dHome > 2000) {
    const p = projectPoint(camera, { x: 0, y: 0, z: 0 });
    if (p) {
      out.push({
        name: 'SOL',
        spect: 'G2V',
        distPc: dHome,
        x: p.x,
        y: p.y,
        opacity: THREE.MathUtils.smoothstep(dHome, 2000, 3800) * 0.95,
        key: 'sol-home',
      });
    }
    return out;
  }

  for (const s of named) {
    _v.set(s.x, s.y, s.z);
    const dist = _v.distanceTo(camPos);
    if (dist < 0.35 || dist > 320) continue;
    // Rótulo é para o que se VÊ. O catálogo grande trouxe 575 nomes
    // próprios da IAU, e entre eles anãs vermelhas vizinhas: Ross 614
    // (m 11) ganhava a vaga de Betelgeuse por estar mais perto, e o filme
    // apontava um nome onde não há estrela visível. A magnitude é
    // recalculada da CÂMERA — quem se aproxima acende, como no shader.
    if (s.m + 5 * Math.log10(dist / Math.max(s.d, 1e-6)) > NAKED_EYE_MAG) continue;
    if (oclusores && escondidaPorDisco(camPos, s, dist, oclusores)) continue;

    const p = projectPoint(camera, s);
    if (!p) continue;

    // opacidade: perto demais ou longe demais → esmaece
    const oNear = THREE.MathUtils.smoothstep(dist, 0.4, 2.2);
    const oFar = 1 - THREE.MathUtils.smoothstep(dist, 140, 320);
    out.push({
      name: s.n,
      spect: s.s,
      distPc: dist,
      x: p.x,
      y: p.y,
      opacity: Math.min(oNear, oFar) * 0.92,
      key: s.n,
      tier: s.t ?? 0,
    });
  }

  // o Sol tem nome em QUALQUER recuo (revisão: ele virava um pontinho
  // anônimo já no Ato I, e o fio "nossa estrela vira um ponto" se perdia)
  if (dHome > 0.12) {
    const p = projectPoint(camera, { x: 0, y: 0, z: 0 });
    if (p) {
      out.push({
        name: 'SOL',
        spect: 'G2V',
        distPc: dHome,
        x: p.x,
        y: p.y,
        opacity: THREE.MathUtils.smoothstep(dHome, 0.12, 0.5) * 0.92,
        key: 'sol-home',
      });
    }
  }

  // Nome próprio antes de Bayer: a disputa é por PROXIMIDADE, e com o
  // catálogo grande (1,7 k nomeadas contra as 90 curadas de antes) uma
  // "κ Dra" a 30 pc expulsaria Deneb da tela. Dentro do mesmo tier vale
  // a distância, com histerese — quem já estava na tela ganha bônus,
  // senão a seleção "pisca" quando estrelas disputam as últimas vagas.
  const rank = (l: StarLabel) =>
    l.distPc * (prevKeys?.has(l.key) ? 0.8 : 1);
  out.sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0) || rank(a) - rank(b));
  return out.slice(0, maxLabels);
}

/** O que o produtor de rótulos precisa saber de um corpo do sistema. */
export interface CorpoRotulavel {
  /** chave do rótulo — é por ela que o hit-test reconhece um corpo */
  chave: string;
  nome: string;
  /** a palavra da classe, no lugar do tipo espectral */
  classe: string;
}

/**
 * OS RÓTULOS DOS CORPOS DO SISTEMA (Onda 5) — os alvos do
 * clicar-para-enquadrar dentro do Atlas, do mesmo jeito que os nomes das
 * estrelas o são desde a F1.
 *
 * `posicoes` é o Float32Array VIVO do atributo da camada, na ordem da
 * tabela: o rótulo cai onde o ponto está DESENHADO, inclusive depois de
 * um salto de data. Ler o retrato congelado aqui seria a segunda fonte
 * de verdade que a máquina do tempo desmentiria.
 *
 * O FADE DE DISTÂNCIA nasceu em 22/08 (item 73, plano §3): a opacidade
 * era 0,95 FIXA, e a docstring de então dizia "sem fade, dentro do
 * sistema estes dez são o assunto". Dentro do sistema continua sendo
 * verdade e nada muda — o fade só começa a morder a 0,01 pc (2.060 UA),
 * que é 9× mais longe que o TETO do zoom (224 UA) e 226× mais longe que
 * a vista de abertura desde o item 61, e fecha em 0,05 pc. O que ele
 * conserta é a outra ponta: visitar uma estrela a parsecs de
 * casa e continuar lendo "NETUNO · planeta" sobre um ponto que já não
 * existe no quadro.
 */
export const CORPO_FADE_COMECA_PC = 0.01;
export const CORPO_FADE_TERMINA_PC = 0.05;

export function projectCorpos(
  camera: THREE.PerspectiveCamera,
  corpos: readonly CorpoRotulavel[],
  posicoes: Float32Array
): StarLabel[] {
  const out: StarLabel[] = [];
  for (let i = 0; i < corpos.length && (i + 1) * 3 <= posicoes.length; i++) {
    const x = posicoes[i * 3];
    const y = posicoes[i * 3 + 1];
    const z = posicoes[i * 3 + 2];
    // NaN passaria por projectPoint sem barreira (comparações com NaN
    // são false) e viraria rótulo com x/y inválidos.
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    const p = projectPoint(camera, { x, y, z });
    if (!p) continue;
    const dist = _v.set(x, y, z).distanceTo(camera.position);
    out.push({
      name: corpos[i].nome,
      spect: '',
      detalhe: corpos[i].classe,
      distPc: dist,
      x: p.x,
      y: p.y,
      opacity:
        0.95 *
        (1 -
          THREE.MathUtils.smoothstep(dist, CORPO_FADE_COMECA_PC, CORPO_FADE_TERMINA_PC)),
      key: corpos[i].chave,
      prioridade: prioridadeDeCorpo(corpos[i].classe),
    });
  }
  return out;
}

/**
 * Etiqueta FORÇADA do assunto do shot: projeta sem os fades de
 * distância — o alvo do beat nunca fica anônimo (regra editorial da
 * revisão: "o assunto sempre tem nome; o fundo fica mudo").
 */
export function projectForced(
  camera: THREE.PerspectiveCamera,
  name: string,
  spect: string,
  pos: { x: number; y: number; z: number },
  key: string
): StarLabel | null {
  const p = projectPoint(camera, pos);
  if (!p) return null;
  const dist = _v.set(pos.x, pos.y, pos.z).distanceTo(camera.position);
  return { name, spect, distPc: dist, x: p.x, y: p.y, opacity: 0.95, key };
}
