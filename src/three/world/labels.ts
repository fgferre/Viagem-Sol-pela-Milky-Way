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
   * colisão com um nome que chegou antes), e na vista de abertura do
   * Atlas ela descarta MUITO — os dez corpos e as 21 luas projetam
   * quase no mesmo ponto e só o Sol sobrevive. Sem a marca, o clique
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
}

/**
 * A HIERARQUIA DOS NOMES, numa tabela só — a reimplementação do
 * `OverlayPositionTracker` do atlas doador (item 73, plano §3).
 *
 * O que ela resolve, medido: na abertura do Atlas os dez corpos e as 21
 * luas projetam a menos de 1% de tela uns dos outros, e quem chegava
 * primeiro na lista ocupava. O resultado era Saturno nascendo
 * `desenhado: false` por colidir com "SOL", e a queixa do dono —
 * *"conseguíamos ver os rótulos de todos objetos de forma
 * inteligente"*.
 *
 * OS NÚMEROS, e a razão de cada degrau:
 *  · `foco` 100 — o que o visitante escolheu nunca cede a nada;
 *  · `sol` 90 — a estrela da casa é o centro do frame e a referência de
 *    escala de toda vista do Atlas;
 *  · `planeta` 10, `anao` 8, `lua` 6 — a hierarquia do próprio objeto;
 *  · `estrelaPropria` 5 e `estrelaBayer` 3 — o tier que
 *    `projectLabels` já usava para desempatar, virado peso: nome
 *    próprio acima de designação;
 *  · `outros` 4 — Sagittarius A✱ e o que mais chegar sem classe.
 */
export const PRIORIDADE_DO_ROTULO = {
  foco: 100,
  sol: 90,
  planeta: 10,
  anao: 8,
  lua: 6,
  estrelaPropria: 5,
  outros: 4,
  estrelaBayer: 3,
} as const;

/** O bônus de quem JÁ ESTAVA na tela — a histerese, em fator. */
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
 * que é 9× mais longe que a vista de abertura, e fecha em 0,05 pc. O
 * que ele conserta é a outra ponta: visitar uma estrela a parsecs de
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
