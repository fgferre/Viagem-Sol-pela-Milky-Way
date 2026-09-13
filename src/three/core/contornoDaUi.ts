// Serve: chão — a posição, o deslocamento inicial e o envelope de tempo do halo são número puro; a chamada a `post` em si só roda enquanto uma abertura está viva
// ============================================================
// O HALO DE CONTORNO (C6, ADOTADO) — docs/PLANO-MOTION-UI.md §7 e
// §12.5. Um brilho âmbar curto no contorno EXTERIOR do painel ao
// abrir — na mesa e na folha do telefone. O SHADER vive fundido no
// `FILM_SHADER` de `Post`
// (`core/post.ts`, `acenderHalo`/`apagarHalo`) — zero passe extra; este
// módulo só carrega a matemática pura (posição, envelope de tempo) e o
// ciclo de vida de UMA abertura de cada vez. `?contorno=css` desliga
// este lado B e força o lado A, sempre disponível: o reflexo CSS
// (`.hud-cabecalho::after`/`reflexoDeAbertura`, `01-base.css`) — este
// módulo nunca o toca.
//
// ISOLADO DE PROPÓSITO: só este arquivo, os métodos `Director.*Contorno`,
// `relogio` em movimentoDaGaveta.ts e algumas linhas marcadas "C6" em
// App.tsx e post.ts sabem que ele existe.
//
// NADA RODA EM REPOUSO (regra 4 da seção 7): sem um `acender` pendente,
// `desenhar` avisa `post.apagarHalo()` UMA VEZ e nunca mais enquanto
// seguir ocioso (a flag abaixo) — o caminho ocioso continua uma função
// pura, sem escrever num uniform a cada quadro. UMA INTENÇÃO DE CADA VEZ
// (regra 3): `acender` sempre RETARGETA — a próxima abertura substitui a
// anterior na hora, nunca enfileira.
// ============================================================
import * as THREE from 'three';
import type { ParametrosDoHalo } from './post';

/** `--acento` (01-base.css), #e2b872, como float 0..1 — `THREE.Vector3`
 *  crua, e não `THREE.Color`: `Color.setHex` respeita o gerenciamento
 *  de cor do three (converte sRGB → linear de trabalho), e este valor
 *  é ESCRITO DIRETO no framebuffer final, dentro do `FILM_SHADER` —
 *  depois do OutputPass da cena científica, sem passar pela cadeia de
 *  novo. O hex já É o valor de exibição; convertê-lo agora seria a
 *  dupla conversão que a régua do C6 proíbe. */
const COR_ACENTO = new THREE.Vector3(0xe2 / 0xff, 0xb8 / 0xff, 0x72 / 0xff);

/** σ da gaussiana do brilho, em px de CSS (seção 7: "região pequena"). */
const SIGMA_PX = 12;

/** sobe em 60 ms e some por completo aos 400 ms — o teto que a seção 7
 *  pede ("duração máxima inicial de 400 ms"). */
export const SUBIDA_DO_HALO_MS = 60;
export const DURACAO_DO_HALO_MS = 400;

/** intensidade de pico — modesta por decisão: é acabamento, não uma
 *  fonte HDR nova (o bloom científico já rodou, neste passe é tarde
 *  demais para florescer). */
const PICO_DE_INTENSIDADE = 0.45;

/**
 * A POSIÇÃO DO HALO — pura, sem DOM. Na mesa o painel entra da direita
 * (`translateX(N) → translate(0,0)`); no telefone a folha sobe de
 * baixo (`translateY(N) → translate(0,0)`, ambos em
 * `movimentoDaGaveta.ts`): em progress 0 ele está em `repouso +
 * deslocamento` (fora do lugar), em progress 1 em `repouso` — em cada
 * eixo. `progress` é o da PRÓPRIA animação (`getComputedTiming().progress`),
 * já passado pela curva de entrada — o halo acompanha o mesmo
 * amortecimento visual do painel, nunca uma reta por cima dele.
 */
export const posicaoDoHalo = (
  repouso: { x: number; y: number },
  deslocamento: { x: number; y: number },
  progress: number
): { x: number; y: number } => ({
  x: repouso.x + (1 - progress) * deslocamento.x,
  y: repouso.y + (1 - progress) * deslocamento.y,
});

/**
 * O DESLOCAMENTO INICIAL ({x, y}), lido do primeiro quadro-chave da
 * animação de entrada. Na mesa é `translateX(Npx)` (`foraDaTelaMesa`,
 * `movimentoDaGaveta.ts`) → `{x: N, y: 0}`; no telefone é
 * `translateY(Npx)` (`foraDaTelaCelular`) → `{x: 0, y: N}`;
 * `translate(Apx, Bpx)` cobre os dois eixos de uma vez e
 * `translate(Apx)` sozinho equivale a X. Regex, não um parser de CSS
 * completo: o único formato que este módulo precisa ler é o que a
 * própria casa escreve. Transform ausente, vazio ou sem número dá
 * `{x: 0, y: 0}` — o halo nasce no repouso, sem inventar um salto.
 */
export const deslocamentoInicialDoTransform = (
  transformBruto: string
): { x: number; y: number } => {
  const casado = /(translateX|translateY|translate)\(([^)]*)\)/.exec(transformBruto);
  if (!casado) return { x: 0, y: 0 };
  const [a, b] = (casado[2].match(/-?[\d.]+/g) ?? []).map(Number.parseFloat);
  const numero = (v: number | undefined): number => (Number.isFinite(v) ? (v as number) : 0);
  if (casado[1] === 'translateX') return { x: numero(a), y: 0 };
  if (casado[1] === 'translateY') return { x: 0, y: numero(a) };
  return { x: numero(a), y: numero(b) };
};

/**
 * O ENVELOPE DE TEMPO — puro. Sobe linear até `SUBIDA_DO_HALO_MS`,
 * desce linear até zerar em `DURACAO_DO_HALO_MS`; fora da janela é
 * sempre 0. LINEAR, como o reflexo CSS (`reflexoDeAbertura`,
 * `01-base.css`): um brilho que passa não pede a curva de quem chega e
 * assenta.
 */
export const envelopeDoTempo = (decorridoMs: number): number => {
  if (decorridoMs <= 0 || decorridoMs >= DURACAO_DO_HALO_MS) return 0;
  if (decorridoMs < SUBIDA_DO_HALO_MS) return decorridoMs / SUBIDA_DO_HALO_MS;
  return 1 - (decorridoMs - SUBIDA_DO_HALO_MS) / (DURACAO_DO_HALO_MS - SUBIDA_DO_HALO_MS);
};

/** a caixa de repouso do painel, em px de CSS */
export interface RetanguloDoContorno {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * O PONTO QUENTE — a borda de FRENTE, a que chega primeiro. Na mesa o
 * painel entra da direita: a de frente é a ESQUERDA, e o ponto desce
 * dela do topo à base ao longo do efeito (`deslocamento.y` é 0, não
 * vem de baixo). No telefone a folha sobe de baixo
 * (`deslocamento.y > 0`): a de frente é o TOPO, e o ponto percorre essa
 * borda da esquerda à direita. `retangulo` é o retângulo EM CURSO (já
 * deslocado por `posicaoDoHalo`, não o de repouso), `progresso` é
 * `decorridoMs / DURACAO_DO_HALO_MS` (o mesmo valor que vai para
 * `ParametrosDoHalo.progresso`) e `sigma` é o σ da gaussiana em CSS.
 * Largura ~25% da dimensão cruzada do painel, com piso de 1 px (painel
 * minúsculo não pode zerar a gaussiana).
 */
export const pontoQuente = (
  retangulo: RetanguloDoContorno,
  deslocamento: { x: number; y: number },
  progresso: number,
  sigma: number
): { ponto: { x: number; y: number }; largura: { x: number; y: number } } => {
  if (deslocamento.y > 0) {
    return {
      ponto: { x: retangulo.x + progresso * retangulo.width, y: retangulo.y },
      largura: { x: Math.max(retangulo.width * 0.25, 1), y: sigma },
    };
  }
  return {
    ponto: { x: retangulo.x, y: retangulo.y + progresso * retangulo.height },
    largura: { x: sigma, y: Math.max(retangulo.height * 0.25, 1) },
  };
};

/**
 * O QUE UMA ABERTURA ENTREGA (App.tsx, glue do C6): a caixa de repouso
 * do painel (`caixaDeRepouso` — SEM o transform da animação), a
 * animação de entrada em curso (`no.getAnimations()[0]`), o
 * deslocamento inicial {x, y}, já resolvido por
 * `deslocamentoInicialDoTransform`, e o RELÓGIO do efeito
 * (`relogio(DURACAO_DO_HALO_MS)`, movimentoDaGaveta.ts) — o tempo
 * próprio do halo (item 7 da seção 7: nada de medir pelo relógio da
 * cena, que congela sob `?shot=`), que "reduzir movimento" e o resize
 * da janela terminam junto com as gavetas, também depois que a entrada
 * já assentou.
 */
export interface ParametrosDoContorno {
  retangulo: RetanguloDoContorno;
  animacao: Animation;
  deslocamentoInicial: { x: number; y: number };
  relogio: Animation;
}

/** o contrato mínimo que `desenhar` precisa de `Post` — a mesma dupla
 *  de métodos que `core/post.ts` expõe de verdade. */
export interface AlvoDoHalo {
  acenderHalo(p: ParametrosDoHalo): void;
  apagarHalo(): void;
}

/**
 * O CICLO DE VIDA DE UMA ABERTURA — sem cena, sem câmera, sem material
 * própria: o desenho é o `FILM_SHADER` de `Post`, e este objeto só
 * decide QUANDO e COM QUE VALORES chamá-lo (regra 1 da seção 7: não
 * abrir outro contexto nem uma cena 3D por menu).
 */
export class ContornoDaUi {
  private estado: ParametrosDoContorno | null = null;
  /** já avisamos `post.apagarHalo()` desde que a última abertura acabou?
   *  É esta flag que mantém o caminho ocioso uma chamada só, não uma a
   *  cada quadro. */
  private jaApagado = true;

  /** LIGA/RETARGETA — uma nova abertura sempre substitui a anterior
   *  (regra 3 da seção 7: "não enfileirar rastros luminosos"). */
  acender(parametros: ParametrosDoContorno): void {
    this.apagar();
    this.estado = parametros;
  }

  /** o relógio é CANCELADO, e não só esquecido: é ele que mantém os
   *  ouvintes de "reduzir movimento" e resize de pé (`relogio`). */
  apagar(): void {
    this.estado?.relogio.cancel();
    this.estado = null;
  }

  /**
   * A CAIXA DE REPOUSO MUDOU com o halo aceso (texto, idioma, o dado que
   * chega à ficha) — App.tsx a remede pela mesma medição rara dos
   * rótulos (ResizeObserver), nunca por quadro. O resize da janela nem
   * chega aqui: ele já encerrou o efeito pelo relógio.
   */
  atualizarRetangulo(retangulo: RetanguloDoContorno): void {
    if (this.estado) this.estado.retangulo = retangulo;
  }

  /**
   * DESENHA, se houver o que desenhar — chamada todo quadro, sem
   * condição nenhuma do lado de fora (`Director.tick`, logo depois de
   * `this.post.render(time)`, o composite científico já pronto). Fora
   * de uma abertura viva, avisa `post.apagarHalo()` só na PRIMEIRA vez
   * (a flag `jaApagado`) — é isso que cumpre "fora do efeito, nenhum
   * uniform escrito por quadro" (regra 4 da seção 7).
   */
  desenhar(post: AlvoDoHalo): void {
    const estado = this.estado;
    if (!estado) {
      this.sinalizarApagado(post);
      return;
    }
    // O EFEITO ACABOU: o relógio chegou aos 400 ms, ou foi terminado por
    // "reduzir movimento"/resize (`assentarTudo`) — `finished`, não mais
    // `running`. OU A INTENÇÃO MUDOU (§7, regra 3): a entrada que o halo
    // acompanha foi cancelada — o painel está saindo —, então o halo some
    // junto, em vez de brilhar no lugar de repouso de um painel que já foi.
    const decorridoMs = estado.relogio.currentTime;
    if (
      estado.relogio.playState !== 'running' ||
      typeof decorridoMs !== 'number' ||
      estado.animacao.playState === 'idle'
    ) {
      this.apagar();
      this.sinalizarApagado(post);
      return;
    }
    const progress = estado.animacao.effect?.getComputedTiming().progress ?? 1;
    const { width, height } = estado.retangulo;
    const posicao = posicaoDoHalo(estado.retangulo, estado.deslocamentoInicial, progress);
    const retanguloEmCurso: RetanguloDoContorno = { ...posicao, width, height };
    const progresso = Math.min(1, decorridoMs / DURACAO_DO_HALO_MS);
    const { ponto, largura } = pontoQuente(
      retanguloEmCurso,
      estado.deslocamentoInicial,
      progresso,
      SIGMA_PX
    );

    this.jaApagado = false;
    post.acenderHalo({
      retangulo: { x: posicao.x, y: posicao.y, largura: width, altura: height },
      intensidade: PICO_DE_INTENSIDADE * envelopeDoTempo(decorridoMs),
      progresso,
      sigma: SIGMA_PX,
      cor: COR_ACENTO,
      pontoQuente: ponto,
      larguraDoQuente: largura,
    });
  }

  private sinalizarApagado(post: AlvoDoHalo): void {
    if (this.jaApagado) return;
    this.jaApagado = true;
    post.apagarHalo();
  }

  /** descarte explícito (regra 4 da seção 7) — chamado por
   *  `Director.dispose()`, junto dos outros passes. */
  dispose(): void {
    this.apagar();
  }
}
