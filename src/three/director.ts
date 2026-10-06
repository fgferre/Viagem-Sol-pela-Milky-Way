// ============================================================
// Director — orquestra engine, mundo e cinemática.
// API consumida pelo React: eventos de legenda/progresso/fase.
// ============================================================
import * as THREE from 'three';
import {
  Engine,
  FRACAO_DE_PARTICULAS,
  GRAMPO_DO_PASSO_S,
  NEBULOSA_POR_NIVEL,
  lerPortaGas,
  lerPortaNebulosa,
  lerPortaParticulas,
  lerPortaPoeira,
  modoDoToneMapping,
} from './core/engine';
// `t` entra APELIDADO porque neste arquivo `t` já é o TEMPO (o segundo
// argumento de todo tick e de toda curva). Um `t` de texto aqui dentro
// seria sombreado pelo relógio no primeiro callback (item 130).
import { t as texto } from '../lib/idioma';
import type { ChaveDeTexto } from '../lib/idioma';
import { diagnosticoDaPoeira, estatisticasDeQuadro } from '../lib/diagnosticoDaPoeira';
import type {
  EscolhaDeQualidade,
  EstadoDaQualidade,
  GasVolumetrico,
  MedicaoDoQuadro,
  NivelDaNebulosa,
  ParticulasDaGalaxia,
  QualityLevel,
  TipoDePoeira,
} from './core/engine';
import type { EstadoDaPoeira, EstadoDaVista } from './selo';
import type { MotorEfemerides } from '../lib/atlas/efemerides';
import { CAMADA_DO_CAMPO, Post } from './core/post';
// C6 (docs/PLANO-MOTION-UI.md §7/§12.5) — o halo de contorno, adotado;
// a matemática pura mora neste módulo, o desenho é o FILM_SHADER de
// `Post` (ver `acenderContorno`).
import { ContornoDaUi } from './core/contornoDaUi';
import type { ParametrosDoContorno, RetanguloDoContorno } from './core/contornoDaUi';
// (A PUPILA morreu INTEIRA no M2 da LEI-DA-ESTRELA — arquivo, teste e a
// espinha de `uExposicao`. O que substitui a adaptação é a compressão
// fixa em dois pontos, que é padrão desde 15/08; a medição que ela fez
// vive na LEI §7.)
import { StarField } from './world/stars';
import { Nebula } from './world/nebula';
import { StellarBody, SOL_PARAMS } from './world/stellarBody';
import { Dust } from './world/dust';
import type { StarLabel } from './world/labels';
// O CLARÃO DE ASAS (M2): a camada única da óptica das fontes fortes,
// por orçamento de fluxo — no lugar das 16 heroes de autor. Quem o
// alimenta por quadro é o módulo do Sol (director/solNoQuadro.ts).
import { ClaraoDeAsas } from './world/clarao';
import { HeroStars } from './world/heroStars';
import { Galaxy, GAL, dentroDoDisco } from './world/galaxy';
import type { CartographyMode } from './world/galaxy';
import { ObservedClouds } from './world/observedClouds';
import { StarForges } from './world/starForges';
import { WrappedStars, resolvedCatalogCurve } from './world/wrappedStars';
import { CORPOS_DEFAULT_ON, CorposResolvidos } from './world/corpos/corpos';
import { LuaResolvida } from './world/corpos/lua';
import { RochosoResolvido } from './world/corpos/rochoso';
import { GiganteResolvido } from './world/corpos/gigante';
import { Planetas, UA_POR_PC } from './world/planetas/planetas';
import { Orbitas, type QuadroEmPx } from './world/orbitas';
import type { PoliticaDeLuz } from '../lib/atlas/luz';
import { exposicaoDoQuadro, stopsDaVisita } from '../lib/atlas/luzDaVisita';
import { lerPortaLuz } from './selo';
import type { VerDaEscada } from './selo';
import { sondarGl } from '../lib/glProbe';
import { montarContadorDeFps } from '../lib/contadorDeFps';
import { EPOCA_JD_TDB } from './world/planetas/retrato2026';
import { lerPortaJd } from './tempoDoAtlas';
import type { EstadoDoTempo, SentidoDoTempo } from './tempoDoAtlas';
import { RAIO_DO_SOL_NA_CENA } from './escala';
import { EXPO_M0, SIGMA_PX } from './luzDaCasa';
// A LEI DA ESTRELA (M1): a repartição única do Sol virou UMA função
// pura (`repartir`, estrela.ts) — quem a chama por quadro é o módulo
// do Sol (director/solNoQuadro.ts), com a câmera e o instrumento que
// o director lhe entrega no tick.
import {
  loadGalacticAssets,
  carregarVolumeDePoeira,
} from './cartography/galacticAssets';
import {
  LADO_DA_VAGA,
  NUCLEO_DO_TIJOLO,
  carregarPiramideDePoeira,
  fonteDaRede,
  mesmoOrcamento,
  orcamentoDaPiramide,
} from './cartography/piramideDePoeira';
import type {
  FonteDeTijolos,
  NivelDaPiramide,
  OrcamentoDaPiramide,
  PiramideDePoeira,
  Trio,
} from './cartography/piramideDePoeira';
import { JourneyRig, FreeRoam } from './cinematic/cameraRig';
import { NuvensSemente } from './director/nuvensSemente';
import { VeuDoAtlas } from './director/veu';
import { QUADROS_TENTANDO_FONTE, julgarProntidao } from './director/prontidao';
import { MaquinaDoTempo } from './director/maquinaDoTempo';
import { ligarGestos } from './director/gestos';
import { distanciaAposEstalos } from './zoomDaRoda';
import { Rotulos } from './director/rotulos';
import { SolNoQuadro } from './director/solNoQuadro';
import { faseDoCiclo } from './estrela';
import type { CalibracaoDaCasa } from './estrela';
import { BETA_DA_EMISSAO } from './shaders/starShaders';
import { reemitirLegenda, viradaDaLuzDoRoteiro } from './director/legendaNoAr';
import { Escada } from './director/escada';
import type { EstadoDaEscada } from './director/escada';
import {
  descartarCarga,
  montarCarga,
  montarCenaDeAquecimento,
  montarCorposDoPalco,
} from './director/carregamento';
import { passoDoPalco, quadroDoPalcoVazio } from './director/palco';
import {
  corpoNoFocoDoAtlas,
  corpoPedidoPeloRoteiro,
  efemeridesPrecisamPreCarga,
} from './director/preAquecimento';
import type { PostoNoPalco } from './director/palco';
import type { GalacticAssets, ManifestVolume, VolumeDePoeira } from './cartography/galacticAssets';
import { AtlasRig, retanguloUtilDoAtlas } from './cinematic/atlasRig';
import type { EstadoDaBussola } from './cinematic/atlasRig';
import type { ReservaDaFicha } from './cinematic/retanguloDoAtlas';
import { ORIGEM } from './cinematic/enquadramento';
import { escalaDaUi, larguraDeCss } from '../lib/uiScale';
import {
  CAMADAS,
  CHAVE_DE_CORPO,
  CORPOS_DO_SISTEMA,
  LUAS_DO_SISTEMA,
  HELIO_SEM_PONTO,
  poeiraParaMotor,
} from './atlasConfig';
import { ESCRITOR_DE_CAMERA } from './fases';
import type { EscritorDeCamera, Phase } from './fases';
import { filmeDe, type Filme } from './cinematic/filme';
import { BlackHolePass } from './world/blackHole';
import { loadStarData } from './config';
import type { NamedStar, StarsMeta } from './config';
import type { CorpoBuscavel } from '../lib/buscaEstrelas';

/**
 * O INSTRUMENTO DA CASA na parte que não muda com o quadro (M4 da Lei
 * da Estrela, §3: "o que a CASA é — um por quadro"). Montado AQUI
 * porque é aqui que as duas metades se encontram: a exposição de
 * referência e a largura da PSF são da lei (`luzDaCasa`), e o β da
 * emissão é o valor JÁ RESOLVIDO da porta `?bemis=` — `lerBetaDaEmissao`
 * é pura de propósito (não lê `window`, para a suíte poder julgá-la em
 * `node`), e quem a resolve uma vez é `shaders/starShaders`.
 *
 * Quem o recebe: o campo de catálogo e a camada dos dez corpos. Eles já
 * usavam os mesmos três números — a diferença é que agora usam o MESMO
 * OBJETO, e a igualdade deixou de depender de duas listas coincidirem.
 */
const CALIBRACAO_DA_CASA: CalibracaoDaCasa = {
  expoM0: EXPO_M0,
  sigmaPx: SIGMA_PX,
  beta: BETA_DA_EMISSAO,
};

/**
 * A RAMPA DA RESERVA DA FICHA (Lote 3, PLAN-UI.md §6, item 225) — 240 ms,
 * o número que o próprio plano fixa. Ela existe para a câmera não SALTAR
 * quando a ficha abre/fecha ou troca de tamanho (mesa→painel,
 * celular→folha): o valor CORRENTE anda até o alvo por este tempo, com o
 * mesmo smoothstep de toda rampa da casa (`t*t*(3-2*t)`), e
 * `reservarParaAFicha` pula direto para o alvo com `shotMode`/
 * `reducedMotion` — captura e acessibilidade não esperam animação.
 */
const RESERVA_DA_FICHA_RAMPA_S = 0.24;

// A fase e o inventário de quem decide por ela moram em `fases.ts` —
// o App também os lê, e duplicar a união aqui era o começo da segunda
// fonte de verdade. Reexportado porque `import type { Phase } from
// './three/director'` é o endereço que o resto da casa já usa.
export type { Phase } from './fases';

/**
 * As etapas do carregamento, na ordem. Fonte ÚNICA: o director as emite,
 * o `?loader=<id>` do QA fixa uma delas e o HUD desenha o trilho a partir
 * desta mesma lista — o "07" do "etapa NN / 07" não é literal em lugar
 * nenhum, e acrescentar uma etapa aqui move rótulo, trilho e ARIA juntos.
 */
export const LOAD_STAGES = (
  ['catalogs', 'stars', 'dust', 'structure', 'galaxy', 'layers', 'shaders'] as const
).map((id, i, all) => ({
  id,
  /**
   * O RÓTULO É GETTER (item 130): a frase de cada etapa mora no
   * dicionário, sob `etapa.<id>`, e sai na língua de agora. Congelá-la
   * no módulo prenderia a tela de carregamento na língua com que o
   * bundle foi avaliado.
   */
  get label() {
    return texto(`etapa.${id}` as ChaveDeTexto);
  },
  index: i + 1,
  total: all.length,
}));

/*
 * (O PINO DO SOL DENTRO DO ATLAS morreu em 21/08 — item 5. Ele existia
 * porque a fase do ciclo era torcida pelo tempo de VIAGEM, e sem pino
 * entrar no Atlas de t=10 ou de t=250 daria dois Sóis. Ele nem entregava
 * o que prometia: o que alimentava as regiões era um acumulador, e o
 * resíduo do trajeto atravessava o portal. Agora a fase é a DATA e o
 * estado das regiões é função pura dela — a reprodutibilidade não vem
 * mais de congelar nada, vem de o Sol ser recalculável. E o Atlas ganhou
 * calendário: o Sol de 2019 é o de um mínimo, o de 2024 é o de um
 * máximo.)
 */

/** etapa viva do carregamento: `{ id, index, total, label }`, index 1…total */
export type LoadStage = (typeof LOAD_STAGES)[number];
export type LoadStageId = LoadStage['id'];

// O ESTADO DA QUALIDADE mora no vocabulário do engine (`core/engine`),
// junto de `QualityLevel` e `MedicaoDoQuadro`; reexportado porque
// `import { EstadoDaQualidade } from './three/director'` é o endereço
// que o HUD usa — o mesmo caso do `Phase` e do `EstadoDaEscada`.
export type { EstadoDaQualidade } from './core/engine';

interface DirectorEvents {
  onPhase: (p: Phase) => void;
  onCaption: (index: number, caption: string, sub?: string) => void;
  onProgress: (k: number) => void;
  onLabels: (labels: StarLabel[]) => void;
  onWarp: (k: number) => void;
  onQuality: (estado: EstadoDaQualidade) => void;
  /**
   * A PROCEDÊNCIA REAL da poeira medida perto do Sol (revisão
   * independente, 27/09) — ver `EstadoDaPoeira` em `selo.ts` e o getter
   * `estadoDaPoeira`. Sai a cada `tick()` em que `situacao`/`fonte`
   * mudam (item B, revisão independente v2, 27/09 — `publicarPoeira`
   * é a guarda), o que cobre o pedido, a carga assíncrona resolvendo E
   * a `Nebula` assentando o bloco num quadro futuro, sem depender de
   * mais nenhum evento.
   */
  onPoeira: (estado: EstadoDaPoeira) => void;
  /** linha de rumo ("→ DESTINO · distância viva"); vazio = esconder */
  onDest: (text: string) => void;
  /** distância viva do Sol ("SOL · 40,2 UA"); vazio = esconder */
  onSol: (text: string) => void;
  /** o indicador de fotografia do FILME ("LENTE 34° · SOL 412 UA",
   *  item 100); vazio = esconder */
  onLente: (text: string) => void;
  /**
   * ONDE A CÂMERA ESTÁ, em eclíptica heliocêntrica UA — só no Atlas, a
   * 4 Hz e só quando ela se move (item 74, parte B). É com ela que a ficha
   * do objeto diz quanto do disco está iluminado visto DAQUI, ao lado do
   * "visto da Terra". `null` fora do Atlas.
   */
  onCamera: (posUA: readonly [number, number, number] | null) => void;
  /** etapa viva do carregamento — a mesma que o HUD desenha */
  onStage: (stage: LoadStage) => void;
  /** opacidade do véu do Atlas (0..1); custom property, não estado */
  onVeu: (k: number) => void;
  /**
   * O QUE ESTÁ EM QUADRO no Atlas — o nome do alvo enquadrado, ou
   * `null` quando é o enquadramento de abertura (o degrau `sistema`) ou
   * quando o Director não tem nome para dar. `null` não é "vazio": é a
   * a ficha do objeto NÃO montando, em vez de chutar um nome (D6).
   */
  onFoco: (nome: string | null) => void;
  /**
   * O MOSTRADOR DA MÁQUINA DO TEMPO. Sai no ritmo de
   * `PASSO_DO_MOSTRADOR_S` enquanto o relógio anda, e na hora quando o
   * visitante mexe em alguma coisa.
   */
  onTempo: (estado: EstadoDoTempo) => void;
  /**
   * O DEGRAU DA ESCADA (F2b/D7) — sai junto com `onFoco`, sempre que o
   * enquadramento troca. É dele que o cabeçalho da ficha do objeto decide
   * quais botões mostrar (aproximar/sistema), que a barra decide se oferece
   * a ficha, e que o `urlComMomento` decide se `?ver=corpo` entra no link.
   * Desde o item 74 ele carrega também o `corpoId` — o NOME serve para
   * escrever, e o id para procurar.
   */
  onEscada: (estado: EstadoDaEscada) => void;
  /**
   * O PRIMEIRO ARRASTO dentro do Atlas, uma vez por sessão (item 73).
   * Serve à dica dos gestos: quem girou aprendeu o gesto, e a linha
   * apaga por opacidade — a caixa fica, senão o rodapé encolheria e a
   * câmera recuaria no meio da sessão. Uma vez e não por quadro porque
   * o consumidor é `setState` do React: um por movimento de ponteiro
   * redesenharia o HUD inteiro a 60 Hz.
   */
  onGirou: () => void;
  /**
   * A BÚSSOLA DO ATLAS ACENDEU OU APAGOU (item 102) — o horizonte
   * ficou torto o bastante para valer um botão, ou voltou a estar de
   * pé. Sai NA BORDA, nunca por quadro: o desvio anda continuamente
   * com o dedo e do outro lado do fio há `setState` do React, então
   * quem decide o booleano (com histerese) é o rig, e este fio só
   * entrega a virada.
   */
  onOrientacao: (estado: EstadoDaBussola) => void;
  /**
   * A LUZ DO ROTEIRO ENTROU OU SAIU DO AR (F4 do filme solar) — o k da
   * curva `camera.luz` passou de 0 para cima ou voltou a 0. Sai NA BORDA
   * (`viradaDaLuzDoRoteiro`), nunca por quadro: o selo do filme só
   * existe enquanto ela está no ar.
   */
  onLuzDoRoteiro: (ativa: boolean) => void;
  /**
   * O TOQUE NO CÉU FECHOU A GAVETA (item 62). Quem decide QUAL toque
   * fecha é `director/gestos.ts`; este fio só entrega o recado ao React,
   * que é quem tem o estado das gavetas.
   */
  onFecharGavetas: () => void;
  /**
   * A SESSÃO MORREU DEPOIS DO BOOT — contexto WebGL perdido ou exceção
   * em quadro. É o MESMO canal do véu de erro do carregamento (o App
   * escreve `loadError`): a casa tem um véu de falha só, e o que muda
   * entre "não pôde começar" e "parou no meio" é a copy, não o
   * componente. Sem este fio as duas falhas eram invisíveis — a tela
   * congelava com o HUD inteiro no ar e nada dizia que acabou.
   */
  onErro: (mensagem: string) => void;
}

// A ESCADA DE NAVEGAÇÃO (D7) mora em `director/escada.ts` (corte 9);
// reexportado porque `import { EstadoDaEscada } from './three/director'`
// é o endereço que o resto da casa já usa — o mesmo caso do `Phase`.
export type { EstadoDaEscada } from './director/escada';

/** as opções da entrada no Atlas — `aoChegar` é o alvo na mão (item 129) */
type EntradaNoAtlas = { instantaneo?: boolean; momento?: number; aoChegar?: () => void };

/**
 * A BANCADA DA PIRÂMIDE (`?poeiraniveis=teste`, E3c) — formas de
 * densidade conhecida em posições heliocêntricas conhecidas (x → centro
 * galáctico, y → l = 90°, z → norte), cada uma NATIVA de um nível: com
 * traço do tamanho do voxel dele, que o nível de cima só mostra borrado
 * (a média) e o de baixo nem grava (omitido — cai no nativo). Caixas em
 * pc, [x0, x1, y0, y1, z0, z1), alinhadas à grade do nível nativo, sem
 * sobreposição. As letras são assimétricas e ficam DE FRENTE para o Sol
 * (a leitura certa, vista dele, prova que nenhum eixo está espelhado):
 *
 *  - n3 (2,5 pc): um "F" a 100 pc do Sol na direção do centro galáctico
 *    (x ∈ [95, 105)), 30 pc de altura, traço de 2,5 pc;
 *  - n3: uma "régua" a 300 pc em l = 270° (y ≈ −300), de x −170 a +70,
 *    com dentes de 2,5 pc a cada 5 pc; o tijolo x ∈ [30, 110) NUNCA chega
 *    (a busca fica no ar) — a recaída do tijolo em voo, no n2, à vista;
 *  - n2 (5 pc): um "L" a 300 pc em l = 90° (y ∈ [290, 310)), 60 pc de
 *    altura, traço de 5 pc;
 *  - n1 (10 pc): um "P" a 600 pc no anticentro (x ∈ [−620, −580)), 120 pc
 *    de altura, traço de 10 pc.
 */
type CaixaDaBancada = readonly [number, number, number, number, number, number];
const FORMAS_DA_BANCADA: readonly { nivel: number; e: number; caixas: readonly CaixaDaBancada[] }[] = [
  {
    nivel: 3,
    e: 0.08,
    caixas: [
      // vista do Sol (olhando +x, norte para cima), a direita é −y
      [95, 105, 7.5, 10, -15, 15], // haste
      [95, 105, -10, 7.5, 12.5, 15], // barra de cima
      [95, 105, -5, 7.5, 0, 2.5], // barra do meio
    ],
  },
  {
    nivel: 3,
    e: 0.08,
    caixas: [
      [-170, 70, -302.5, -297.5, -2.5, 2.5],
      ...Array.from({ length: 48 }, (_, i): CaixaDaBancada => [
        -170 + 5 * i, -167.5 + 5 * i, -302.5, -297.5, 2.5, 7.5,
      ]),
    ],
  },
  {
    nivel: 2,
    e: 0.06,
    caixas: [
      // vista do Sol (olhando +y), a direita é +x
      [-20, -15, 290, 310, -30, 30], // haste
      [-15, 20, 290, 310, -30, -25], // pé
    ],
  },
  {
    nivel: 1,
    e: 0.05,
    caixas: [
      // vista do Sol (olhando −x), a direita é +y
      [-620, -580, -40, -30, -60, 60], // haste
      [-620, -580, -30, 30, 50, 60], // topo
      [-620, -580, 20, 30, 10, 50], // lado
      [-620, -580, -30, 20, 10, 20], // meio
    ],
  },
];
/** o tijolo da régua que nunca chega: n3, x ∈ [30, 110), y ∈ [−370, −290), z ∈ [−20, 60) */
const TIJOLO_PRESO_DA_BANCADA = { nivel: 3, b: [16, 11, 6] as const };
/** a mesma grade do contrato (E3c): quina (−1250, −1250, −500), voxel do
 *  pai dividido em 2×2×2 a cada nível, n2 até 900 pc e n3 até 450 pc */
const GRADE_DA_BANCADA = [
  { nivel: 0, voxelPc: 20, dims: [125, 125, 50] as const, raioPc: Infinity },
  { nivel: 1, voxelPc: 10, dims: [250, 250, 100] as const, raioPc: Infinity },
  { nivel: 2, voxelPc: 5, dims: [500, 500, 200] as const, raioPc: 900 },
  { nivel: 3, voxelPc: 2.5, dims: [1000, 1000, 400] as const, raioPc: 450 },
];
const ORIGEM_DA_BANCADA: Trio = [-1250, -1250, -500];
const ESCALA_DA_BANCADA = 1000;

/**
 * Soma em `dados` (grade de `n` voxels por eixo com quina `lo`, em
 * voxels do nível `nivel`) a densidade das formas da bancada que o nível
 * guarda: as NATIVAS dele e as de níveis mais finos, pela fração exata do
 * voxel que cada caixa cobre (a média de caixa, a redução do contrato).
 */
function pintarBancada(
  nivel: number,
  lo: Trio,
  n: Trio,
  dados: Float32Array
): void {
  const voxel = GRADE_DA_BANCADA[nivel].voxelPc;
  for (const forma of FORMAS_DA_BANCADA) {
    if (forma.nivel < nivel) continue;
    for (const c of forma.caixas) {
      // a faixa de voxels que a caixa toca, por eixo
      const faixa = [0, 1, 2].map((a) => {
        const i0 = Math.max(lo[a], Math.floor((c[2 * a] - ORIGEM_DA_BANCADA[a]) / voxel));
        const i1 = Math.min(lo[a] + n[a] - 1, Math.ceil((c[2 * a + 1] - ORIGEM_DA_BANCADA[a]) / voxel) - 1);
        return [i0, i1];
      });
      const cobre = (a: number, i: number) => {
        const v0 = ORIGEM_DA_BANCADA[a] + i * voxel;
        return Math.max(0, Math.min(c[2 * a + 1], v0 + voxel) - Math.max(c[2 * a], v0)) / voxel;
      };
      for (let k = faixa[2][0]; k <= faixa[2][1]; k++) {
        for (let j = faixa[1][0]; j <= faixa[1][1]; j++) {
          for (let i = faixa[0][0]; i <= faixa[0][1]; i++) {
            const f = cobre(0, i) * cobre(1, j) * cobre(2, k);
            dados[i - lo[0] + n[0] * (j - lo[1] + n[1] * (k - lo[2]))] += forma.e * f;
          }
        }
      }
    }
  }
}

/** os tijolos (índice bi + nbx·(bj + nby·bk)) que o nível GRAVA: os que
 *  alguma forma nativa dele ou mais fina toca no núcleo */
function tijolosDaBancada(nivel: number, tijolos: Trio): Set<number> {
  const lado = NUCLEO_DO_TIJOLO * GRADE_DA_BANCADA[nivel].voxelPc;
  const gravados = new Set<number>();
  for (const forma of FORMAS_DA_BANCADA) {
    if (forma.nivel < nivel) continue;
    for (const c of forma.caixas) {
      const faixa = [0, 1, 2].map((a) => [
        Math.max(0, Math.floor((c[2 * a] - ORIGEM_DA_BANCADA[a]) / lado)),
        Math.min(tijolos[a] - 1, Math.ceil((c[2 * a + 1] - ORIGEM_DA_BANCADA[a]) / lado) - 1),
      ]);
      for (let bk = faixa[2][0]; bk <= faixa[2][1]; bk++) {
        for (let bj = faixa[1][0]; bj <= faixa[1][1]; bj++) {
          for (let bi = faixa[0][0]; bi <= faixa[0][1]; bi++) {
            gravados.add(bi + tijolos[0] * (bj + tijolos[1] * bk));
          }
        }
      }
    }
  }
  return gravados;
}

function meiosFloats(valores: Float32Array): Uint16Array {
  const bits = new Uint16Array(valores.length);
  for (let i = 0; i < valores.length; i++) {
    bits[i] = valores[i] === 0 ? 0 : THREE.DataUtils.toHalfFloat(valores[i] * ESCALA_DA_BANCADA);
  }
  return bits;
}

/**
 * A bancada inteira: o n0 (o bloco de 20 pc, na geometria real — a
 * cobertura do shader é a do bloco) e a pirâmide n1–n3 com uma FONTE
 * SINTÉTICA — os tijolos são pintados na hora do pedido e chegam depois
 * de um atraso curto (a rede de mentira; a residência é a mesma de
 * produção), exceto o `TIJOLO_PRESO_DA_BANCADA`, cuja busca só termina
 * no aborto.
 */
export function bancadaDaPiramide(): {
  n0: VolumeDePoeira;
  piramide: PiramideDePoeira;
  fonte: FonteDeTijolos;
} {
  const g0 = GRADE_DA_BANCADA[0];
  const n0 = new Float32Array(g0.dims[0] * g0.dims[1] * g0.dims[2]);
  pintarBancada(0, [0, 0, 0], g0.dims, n0);
  const niveis: NivelDaPiramide[] = GRADE_DA_BANCADA.slice(1).map((g) => {
    const dimsEmTijolos: Trio = [
      Math.ceil(g.dims[0] / NUCLEO_DO_TIJOLO),
      Math.ceil(g.dims[1] / NUCLEO_DO_TIJOLO),
      Math.ceil(g.dims[2] / NUCLEO_DO_TIJOLO),
    ];
    return {
      nivel: g.nivel,
      voxelPc: g.voxelPc,
      origemPc: ORIGEM_DA_BANCADA,
      dims: g.dims,
      dimsEmTijolos,
      raioPc: g.raioPc,
      escala: ESCALA_DA_BANCADA,
      gravados: tijolosDaBancada(g.nivel, dimsEmTijolos),
      pasta: `(bancada ?poeiraniveis=teste)/n${g.nivel}`,
    };
  });
  const fonte: FonteDeTijolos = {
    buscar(nivel, bi, bj, bk, sinal) {
      return new Promise<Uint16Array>((resolve, reject) => {
        const preso =
          nivel.nivel === TIJOLO_PRESO_DA_BANCADA.nivel &&
          bi === TIJOLO_PRESO_DA_BANCADA.b[0] &&
          bj === TIJOLO_PRESO_DA_BANCADA.b[1] &&
          bk === TIJOLO_PRESO_DA_BANCADA.b[2];
        const relogio = preso
          ? null
          : setTimeout(() => {
              const dados = new Float32Array(LADO_DA_VAGA ** 3);
              const lo: Trio = [
                NUCLEO_DO_TIJOLO * bi - 1,
                NUCLEO_DO_TIJOLO * bj - 1,
                NUCLEO_DO_TIJOLO * bk - 1,
              ];
              pintarBancada(nivel.nivel, lo, [LADO_DA_VAGA, LADO_DA_VAGA, LADO_DA_VAGA], dados);
              resolve(meiosFloats(dados));
            }, 20 + ((bi * 7 + bj * 13 + bk * 17) % 40));
        sinal.addEventListener('abort', () => {
          if (relogio !== null) clearTimeout(relogio);
          reject(new DOMException('abortado', 'AbortError'));
        });
      });
    },
  };
  return {
    n0: {
      descritor: {
        kind: 'volume',
        file: '(sintético — ?poeiraniveis=teste)',
        dims: [...g0.dims],
        voxelPc: g0.voxelPc,
        originPc: [...ORIGEM_DA_BANCADA],
        scale: ESCALA_DA_BANCADA,
        type: 'float16',
        byteLength: n0.length * 2,
        sha256: '',
        innerRadiusPc: 0,
        outerRadiusPc: 1250,
      },
      dados: meiosFloats(n0),
    },
    piramide: { niveis },
    fonte,
  };
}

/**
 * A DERIVAÇÃO PURA de `Director.estadoDaPoeira` (item B, revisão
 * independente v2, 27/09) — extraída da classe para testar sem WebGL:
 * só lê os cinco valores que decidem o veredito, nunca `this`/`window`.
 * O getter (na classe, abaixo) é o único chamador, com os cinco valores
 * desta instância. Cruza o PEDIDO (`poeiraModoPedido`), a CARGA desta
 * instância (`poeiraCarga`/`poeiraFonte`, escritos por
 * `tentarCarregarPoeira`/`init`) e o que a `Nebula` DE FATO desenha
 * (`poeiraModoEfetivo`, `poeiraAssentada`) — nenhuma das três decide
 * por conta própria. Único produtor: antes disto o selo decidia por
 * URL pedida + uma flag global de `galacticAssets.ts`, e o
 * renderizador decidia por variante + bloco + modo — as duas contas
 * divergiam.
 */
export function derivarEstadoDaPoeira(entrada: {
  poeiraModoPedido: number;
  poeiraCarga: 'pendente' | 'carregando' | 'chegou' | 'falhou';
  poeiraFonte: 'gaia' | 'sintetica' | null;
  poeiraModoEfetivo: number;
  poeiraAssentada: boolean;
}): EstadoDaPoeira {
  if (entrada.poeiraModoPedido === 0) return { situacao: 'desligada', fonte: null };
  if (entrada.poeiraCarga === 'pendente' || entrada.poeiraCarga === 'carregando') {
    return { situacao: 'carregando', fonte: null };
  }
  if (entrada.poeiraCarga === 'falhou') return { situacao: 'indisponivel', fonte: null };
  // 'chegou': o volume existe. A variante ativa não lendo ('antigo',
  // modo efetivo 0) é 'inativa' mesmo antes de qualquer bake; senão,
  // 'ativa' só quando a Nebula já assentou o bloco na tela — um
  // efetivo ≥ 1 ainda não assentado é a última fatia do bake em voo,
  // e "carregando" descreve isso melhor do que uma 'ativa' adiantada.
  if (entrada.poeiraModoEfetivo === 0) {
    return { situacao: 'inativa', fonte: entrada.poeiraFonte };
  }
  if (!entrada.poeiraAssentada) {
    return { situacao: 'carregando', fonte: entrada.poeiraFonte };
  }
  return { situacao: 'ativa', fonte: entrada.poeiraFonte };
}

export class Director {
  /** o painel de ajustes mexe em tom e exposição ao vivo */
  readonly engine: Engine;
  private post: Post;
  // C6 — sem dependência do construtor (não precisa do renderer nem do
  // canvas), então nasce como os outros campos sem estado externo,
  // fora do corpo do construtor.
  private readonly contorno = new ContornoDaUi();
  private nebula: Nebula;
  private stars!: StarField;
  /** BETA dos rótulos 3D (item 109) — decisão dele, 29/08 */
  private rotulos3dLigado = false;
  private rotulos3d?: import('./world/rotulos3d').Rotulos3d;
  /** O CLARÃO DE ASAS (M2 da Lei): a óptica das fontes fortes, por
   *  orçamento de fluxo com histerese — camada única, sempre acesa.
   *  (A identidade "as 16", o casamento hero↔catálogo e a política de
   *  dominância morreram com as heroes de autor: o clarão soma óptica
   *  POR CIMA do ponto e não pede cessão a ninguém.) */
  private clarao!: ClaraoDeAsas;
  private heroes!: HeroStars;
  private galaxy!: Galaxy;
  /** os 10 pontos fotométricos do domínio profundo (Onda 4, D3) —
   *  camada IRMÃ do `sun.group`, nunca filha dele */
  private planetas: Planetas | null = null;
  /** AS LINHAS DE ÓRBITA (item 77) — o QUARTO irmão do `sun.group`, pela
   *  mesma razão dos outros três: de dentro do grupo do Sol herdaria a
   *  escala do doador. Só desenha com efeméride viva (ver `orbitas.ts`,
   *  §6): a curva sai do estado do instante, nunca do retrato. */
  private orbitas: Orbitas | null = null;
  /** as três medidas do quadro que a camada das órbitas lê, num objeto só e
   *  REUSADO — o tick não aloca (ver `QuadroEmPx`, em `world/orbitas.ts`) */
  private readonly quadroDasOrbitas: QuadroEmPx = {
    larguraPx: 0,
    alturaPx: 0,
    pixelRatio: 1,
  };
  /** O PALCO LOCAL (Onda 6, F0 — D1): o grupo dos corpos resolvidos,
   *  vazio nesta fase. Irmão do `sun.group` e do `planetas.points`; a
   *  superfície mais próxima dele entra no `updateClip` a cada tick.
   *  `palco` e não `corpos`: o nome `corpos` já é do getter público da
   *  BUSCA (os dez do retrato), que é outra coisa. */
  private readonly palco = new CorposResolvidos();
  /**
   * OS DOZE CORPOS DO PALCO — a LISTA ÚNICA que o tick percorre (item
   * 63): Terra, Lua, os rochosos (F3+F5) e os gigantes (F4), nesta
   * ordem, cada um com os quatro traços que o distinguem e as digitais
   * do quadro anterior (pop do mesh, chegada de textura, gate a frio e
   * rampa de cessão recomeçam a contagem da captura). Montada no init
   * por `montarCorposDoPalco`; o laço mora em `director/palco.ts`.
   */
  private noPalco: readonly PostoNoPalco[] = [];
  /** A LUA pelo nome — o único posto que alguém procura fora do laço
   *  (o rUA da cadeia dela alimenta a linha BRILHO do selo). A Terra
   *  não precisa de handle: quem a quer de fora (o juiz de z-fighting)
   *  a acha em `noPalco` pelo id, que é o endereço único desde 22/08. */
  private lua: PostoNoPalco<LuaResolvida> | null = null;
  /** as duas fatias que a ESCADA percorre por tipo — os MESMOS objetos
   *  de `noPalco`: uma lista, duas leituras. */
  private rochosos: readonly PostoNoPalco<RochosoResolvido>[] = [];
  private gigantes: readonly PostoNoPalco<GiganteResolvido>[] = [];
  /** o quadro dos doze, montado UMA vez e reusado — doze objetos por
   *  tick era alocação que o M4 da casa não deixa passar. */
  private readonly quadroDoPalco = quadroDoPalcoVazio();
  /** `perturbar` já ligado ao this — um fio por tick, não doze */
  private readonly perturbarDoPalco = () => this.perturbar();
  /** A política mora em preAquecimento; a ligação ao this é feita uma vez.
   *  São DUAS mãos desde o item 115 — o foco solta no clique seguinte, o
   *  roteiro segura até o fim do filme, e a descarga precisa da diferença. */
  private corpoNoFoco(id: string): boolean {
    return corpoNoFocoDoAtlas(this.phase, this.escada.focoCorpoId, id);
  }
  private corpoNoRoteiro(id: string): boolean {
    return corpoPedidoPeloRoteiro(this.phase, this.journeyT, id, this.filme.apoios);
  }
  /** quadros já gastos segurando a captura com a efeméride pedida
   *  indisponível — ver QUADROS_TENTANDO_FONTE (auditoria item 5c). */
  private quadrosTentandoFonte = 0;
  /** a segunda tentativa de `garantirEfemerides` já foi disparada */
  private retentouFonte = false;
  /** o aviso único do retrato sob corpos já saiu no console */
  private acusouRetrato = false;
  /**
   * A CÂMERA SALTOU neste quadro (portal, enquadramento, ?pos=) — os
   * corpos resolvidos fazem SNAP da cessão em vez de animar através do
   * teletransporte (cicatriz "reset no salto de foco", D5). Armado por
   * `teletransportou()`, pelo `seek()` e pelo corte declarado do roteiro
   * (o rig devolve `corte` no `apply` do quadro), e consumido por UM tick.
   */
  private saltoDeCamera = false;
  /**
   * A POLÍTICA DE LUZ dos corpos resolvidos (Onda 6, D2/D8). Default
   * `assistida` — o do Atlas; `?luz=` semeia no boot e a linha BRILHO
   * do selo troca ao vivo (`definirLuz`). Fora do Atlas o estado é
   * neutro por construção: não há superfície resolvida no filme.
   */
  private politicaDeLuz: PoliticaDeLuz = 'assistida';
  /**
   * A LUZ DO ROTEIRO neste quadro (F2b): a curva `camera.luz` do plano,
   * 0 fora do filme. Ela não troca a política do visitante — compõe com
   * ela em `kDaLuz` (`luzDaVisita.ts`), e o selo a declara.
   */
  private luzDoRoteiro = 0;
  /** DEPURAÇÃO, só em dev (via `window.__director`): não nulo, substitui a curva `camera.luz` do roteiro. */
  luzDoRoteiroForcada: number | null = null;
  private observedClouds: ObservedClouds | null = null;
  private starForges: StarForges | null = null;
  private wrappedStars!: WrappedStars;
  private dustMapTexture: THREE.Texture | null = null;
  private structureMapTexture: THREE.Texture | null = null;
  /**
   * O TIER COM QUE O MUNDO FOI ASSADO — e ele NÃO é `engine.quality`.
   * Metade da qualidade é viva (pixelRatio, passos do raymarch) e vale
   * no quadro seguinte ao clique; a outra metade é ALOCAÇÃO (a população
   * da galáxia e o tier do Sol) e leva segundos de worker para nascer.
   * Entre o clique e o swap os dois números divergem de propósito: um
   * diz o que o instrumento já faz, este diz o que está na tela. Nasce
   * no init com o tier que `montarCarga` recebeu.
   */
  private tierDoMundo: QualityLevel | null = null;
  /**
   * QUEM ESCOLHE O TIER (Ajustes D). `manual` é o padrão de produto e a
   * fronteira política do dono: com ele, nada troca de tier sem clique.
   * `auto` é o 4º estado do seletor — o visitante delegando a escolha à
   * medição, que continua sendo medição e nunca detecção.
   */
  private politicaDeQualidade: 'manual' | 'auto' = 'manual';
  /** o tier PEDIDO e ainda a caminho (`null` = nenhuma troca em voo) —
   *  é ele que faz a captura esperar */
  private trocaPedida: QualityLevel | null = null;
  /**
   * O NÚMERO DE SEQUÊNCIA DO PEDIDO, e quem CANCELA o mundo em forno
   * quando o visitante muda de ideia no meio. Cada passagem por
   * `reassarMundo` toma o próximo número; o forno só pousa o mundo cujo
   * número ainda é o último (`mundoAindaVale`). Quem perdeu a vez
   * descarta o que assou.
   *
   * Por que não bastava o tier pedido: em Alta → Performance → Alta o
   * terceiro clique é um NÃO-PEDIDO pela régua do tier (o mundo já é
   * alta) e saía sem tocar em `trocaPedida`, deixando o forno de
   * Performance com licença para pousar. Medido em 21/08, 3 de 3 vezes
   * com 100/250/500 ms entre cliques: seletor, URL e `engine.quality` em
   * Alta, mundo em Performance, e clicar Alta de novo não consertava.
   */
  private geracaoDaTroca = 0;
  /** os catálogos do boot, guardados porque o mundo pode ser reassado.
   *  Os arrays são os MESMOS de sempre: o worker os recebe por CÓPIA. */
  private catalogos: GalacticAssets | null = null;
  /** o modo de cartografia decidido no boot (`?cart=`) — o mundo novo
   *  nasce com o mesmo, senão a troca de tier viraria troca de mapa */
  private cartMode: CartographyMode = 'blend';
  /**
   * POEIRA MEDIDA (E2/E3, item C — carga preguiçosa, revisão
   * independente): `cartOn` só fica sabido depois que `init()` resolve
   * os ativos (`Boolean(galactic) && cartMode !== 'off'`) —
   * `tentarCarregarPoeira` não dispara nada antes disso. `dustVolumeManifesto`
   * é o que ela precisa do manifesto para o fetch real (`null` sem
   * cartografia ou sem o volume declarado); guardado à parte de
   * `this.catalogos` (tipado sem `.volumes`) só para isto.
   */
  private cartOn = false;
  /** `this.cartOn` já recebeu o valor DEFINITIVO da sessão (item B,
   *  revisão independente v2, 27/09) — só `init()` o escreve, uma vez.
   *  Antes disto, `!this.cartOn` é só "ainda não sei" — não dá para
   *  `tentarCarregarPoeira` distinguir de "a cartografia realmente não
   *  vai ligar" sem este campo, e as duas liam falso do mesmo jeito. */
  private cartResolvido = false;
  private dustVolumeManifesto: ManifestVolume | null = null;
  /** cada disparo de `tentarCarregarPoeira` leva o próximo número —
   *  marca a resposta (`.then`) do fetch que ele abriu: se um disparo
   *  mais novo (outra fonte) já mudou este contador quando a promise
   *  resolve, a resposta é descartada (item A, revisão independente
   *  v2, 27/09), sem tocar `nebula`/`poeiraCarga`/`poeiraFonte` — sem
   *  isto duas respostas em voo corriam para escrever o estado por
   *  último, e a mais VELHA podia vencer. */
  private poeiraPedidoId = 0;
  /** a FONTE (`fonteDesejada`) que `tentarCarregarPoeira` já tentou
   *  buscar nesta instância — sucesso OU falha, sem retentativa (item
   *  D). Distinto de `poeiraFonte` (abaixo): esse é só a fonte de um
   *  volume que chegou a EXISTIR (`null` numa falha) — uma fonte
   *  tentada e malsucedida não pode parecer "nada tentado ainda" e
   *  reabrir o fetch a cada `definirPoeira` (cada troca de tier chama
   *  `aplicarPoeira`/`definirPoeira` de novo, mesmo sem nada mudar). */
  private poeiraFonteTentada: 'gaia' | 'sintetica' | null = null;
  /** o PEDIDO guardado por `definirPoeira` (mesmo número que
   *  `Nebula.poeiraModoPedido`) — `tentarCarregarPoeira` precisa dele
   *  depois que `this.cartOn` for sabido, sem reler `this.debug`. */
  private poeiraModoPedido = 0;
  /**
   * A CARGA DESTA INSTÂNCIA (revisão independente, 27/09) — substitui a
   * flag global de `cartography/galacticAssets.ts`
   * (`registrarBlocoDePoeira`/`estadoDoBlocoDePoeira`): aquela nunca
   * voltava a 'pendente' entre boots e não notificava o React. Esta é o
   * que `estadoDaPoeira` (abaixo) cruza com a `Nebula` para o veredito
   * real; escrita só por `tentarCarregarPoeira` (inclusive o caso
   * "cartografia nunca ligou" — sem manifesto não há descritor a
   * esperar). `poeiraFonte` só é não-nula quando um volume chegou a
   * existir (real ou o sintético de `?poeira=teste`).
   */
  private poeiraCarga: 'pendente' | 'carregando' | 'chegou' | 'falhou' = 'pendente';
  private poeiraFonte: 'gaia' | 'sintetica' | null = null;
  /**
   * A PIRÂMIDE DA POEIRA (E3c) — os níveis finos por cima do bloco de 20
   * pc. Carga preguiçosa como a do bloco: só com a poeira pedida, a
   * cartografia ligada e o manifesto declarando `dustPyramid` (o
   * descritor cru, guardado no `init`) — ou a bancada
   * `?poeiraniveis=teste`. Quem decide é `garantirPiramide`, a cada
   * quadro; a GPU e a residência moram na Nebula (`setPiramide`).
   * `piramideTier` é o tier do orçamento com que ela foi montada.
   */
  private dustPyramidManifesto: unknown = null;
  private piramideFonteTentada: 'gaia' | 'sintetica' | null = null;
  private piramidePedidoId = 0;
  private piramideCarga: 'nenhuma' | 'carregando' | 'chegou' | 'falhou' = 'nenhuma';
  private piramideCarregada: { piramide: PiramideDePoeira; fonte: FonteDeTijolos } | null = null;
  private piramideTier: QualityLevel | null = null;
  /** o orçamento do atlas preparado antes do clique (`prepararPiramide`),
   *  recalculado só quando o tier muda */
  private orcamentoPreparado: { tier: QualityLevel; orcamento: OrcamentoDaPiramide } | null = null;
  /** a bancada `?poeiraniveis=teste`, montada uma vez só quando pedida */
  private bancadaDosNiveis: ReturnType<typeof bancadaDaPiramide> | null = null;
  /** nuvens do catálogo em coords de cena: x,y,z,raio,amp por registro */
  /** as nuvens-semente do raymarch — corte 1 da Parte 1 da onda */
  private readonly nuvensSemente = new NuvensSemente();
  private sun: StellarBody;
  private dust: Dust;
  private blackHole: BlackHolePass | null = null;
  private bgColor = new THREE.Color(0x000106);
  /** o filme em cartaz — o que o `play()` toca e o caminho do filme lê
   *  (planos, carga, calendário, dose do Sol, pinos); sem `?filme=`, o
   *  galáctico. Declarado ANTES do rig, que nasce filmando ele. */
  private filme: Filme = filmeDe();
  private rig = new JourneyRig(this.filme.journey, this.filme.cima);
  private roam: FreeRoam;
  private atlas = new AtlasRig();
  /** quem escreve a câmera AGORA — decidido pelo `setPhase` */
  private escritorDeCamera: EscritorDeCamera = 'nenhum';
  private meta!: StarsMeta;
  /** o punho dos gestos do canvas — corte 6 da Parte 1 (director/gestos.ts) */
  private gestos: ReturnType<typeof ligarGestos> | null = null;
  /** o visitante já arrastou dentro do Atlas? (item 73 — apaga a dica) */
  private jaGirouNoAtlas = false;
  /** o último veredito da bússola que o React já ouviu (item 102) */
  private bussola: EstadoDaBussola = 'apagada';

  // ---- A RESERVA DA FICHA (Lote 3, PLAN-UI.md §6, item 225) ---------
  // O App mede pixels (largura do painel na mesa, altura da folha no
  // celular) e chama `reservarParaAFicha`; aqui dentro eles viram
  // FRAÇÃO — a mesma unidade de `RetanguloUtil` — e andam do valor
  // CORRENTE até o alvo por rampa (`RESERVA_DA_FICHA_RAMPA_S`). É o
  // CORRENTE que entra em `atlas.apply` (tick, mais abaixo) e no getter
  // `retanguloUtil` — o juiz de a11y tem de ver a reserva que a câmera
  // está usando AGORA, não o alvo dela.
  private reservaFichaAlvo: ReservaDaFicha = { base: 0, direita: 0 };
  /** de onde a rampa partiu — o CORRENTE no instante em que o alvo mudou */
  private reservaFichaPartida: ReservaDaFicha = { base: 0, direita: 0 };
  private reservaFichaCorrente: ReservaDaFicha = { base: 0, direita: 0 };
  /** progresso da rampa, 0..1 — 1 quando o corrente já é o alvo */
  private reservaFichaRampaT = 1;

  /**
   * O QUE O PORTAL GUARDA quando o visitante entra no Atlas — e devolve
   * inteiro quando ele parte. Não é só o `journeyT`: o `seek()` sozinho
   * zera o olhar do pausar-e-olhar. Faltando qualquer um dos quatro,
   * "Partir" devolveria um quadro parecido — e o gate mede PIXEL. (A
   * pausa teve dois donos até 21/08; hoje o `freezeJourney` é o dono
   * único e escreve o `rig.paused` por dentro.)
   */
  private retomada: {
    journeyT: number;
    lookYaw: number;
    lookPitch: number;
    pausado: boolean;
  } | null = null;

  // ---- a máquina do tempo (Onda 5, F4/D2) --------------------------
  // O DIRECTOR É O DONO DO `jd`, e é dono sozinho: a camada de planetas
  // não tem relógio (o teste de texto-fonte dela proíbe `Date`), o HUD
  // só desenha o que este bloco publica, e a efeméride é um serviço que
  // chega tarde. Um segundo dono aqui seria a mesma classe de defeito
  // que a pausa teve até 21/08, quando `freezeJourney` e `rig.paused`
  // eram escritos separadamente e o boot só escrevia um.

  /**
   * O instante em que o enquadramento do Atlas foi composto pela última
   * vez — o limite de frequência do religador (ver `recomporAlvo`).
   * `NaN` nunca é igual a nada, então o primeiro quadro da fase sempre
   * recompõe uma vez.
   */
  private jdDoEnquadre = Number.NaN;
  /** a máquina do tempo — corte 4 da Parte 1; os fios são arrows (só
   *  executam bem depois de todos os campos nascerem) */
  private readonly maquinaDoTempo = new MaquinaDoTempo({
    onTempo: (e) => this.events.onTempo(e),
    perturbar: () => this.perturbar(),
    aoChegarFonte: () => this.escada.reenquadrarAposEfemeride(),
    signal: () => this.abortController.signal,
    disposed: () => this.disposed,
  });

  /** o véu do Atlas — corte 2 da Parte 1 da onda */
  private readonly veuDoAtlas = new VeuDoAtlas({
    onVeu: (k) => this.events.onVeu(k),
    perturbar: () => this.perturbar(),
  });

  /** os rótulos do céu — corte 7 da Parte 1 (director/rotulos.ts); o
   *  beat é fio porque só o ramo da viagem o paga */
  private readonly rotulos: Rotulos = new Rotulos({
    onLabels: (labels) => this.events.onLabels(labels),
    onDest: (text) => this.events.onDest(text),
    onSol: (text) => this.events.onSol(text),
    onLente: (text) => this.events.onLente(text),
    onCamera: (posUA) => this.events.onCamera(posUA),
    beatDaViagem: () => this.rig.metaAt(this.journeyT),
    // o disco que esconde nome sai da MESMA escada que dá o raio das
    // malhas e o avanço do nome 3D sobre a casca (item 115, bloco B)
    raioFisicoDe: (id): number | null => this.escada.raioFisicoDe(id),
  });

  private phase: Phase = 'loading';
  private journeyT = 0;
  private lastCaptionIdx = -1;
  /** a frase que está NO AR — o índice sozinho não vê a troca de idioma */
  private lastCaptionTexto = '';
  /** a luz do roteiro está no ar (k > 0)? — o latch de `onLuzDoRoteiro` */
  private luzDoRoteiroNoAr = false;
  private relogioParado = false;
  /**
   * CONGELA A VIAGEM — e é o DONO ÚNICO da pausa, que sempre teve dois
   * campos: este relógio e o `rig.paused`, que é quem desliga o
   * decaimento do olhar-ao-redor (τ = 0,5 s, `JourneyRig.apply`). Quem
   * escrevesse só um entregava meia pausa, e era o que o boot fazia com
   * `?t=` sem `play`: medido em 21/08, um arrasto de −0,44 rad
   * escorregava para −0,064 em 2 s, enquanto o botão Pausar segurava os
   * −0,44 inteiros. Agora o botão, o portal e o boot escrevem AQUI, e a
   * porta de captura entra no MESMO estado que o botão.
   */
  get freezeJourney() {
    return this.relogioParado;
  }

  set freezeJourney(parada: boolean) {
    this.relogioParado = parada;
    this.rig.paused = parada;
  }
  /** multiplicador do relógio da viagem (1× · 2× · 4×) */
  playbackRate = 1;
  private noNebula = false;
  private deepBg = new THREE.Color(0x010208);
  /** ?shot=1 congela o tempo visual — capturas determinísticas */
  private shotMode = false;
  /** prefers-reduced-motion: sem shake, sem pulso de warp/CA */
  private reducedMotion = false;
  /** a preferência de movimento do sistema, OUVIDA enquanto o Director
   *  vive (`dispose` solta o ouvinte): `reducedMotion` é a leitura de
   *  agora, nunca só a da construção */
  private preferenciaDeMovimento: MediaQueryList | null = null;
  private readonly aoMudarMovimento = (e: MediaQueryListEvent) => {
    this.reducedMotion = e.matches;
  };
  /** toggles de debug: ?nogal=1&nosun=1&nodust=1&noclarao=1&nocat=1 */
  private hide = new Set<string>();
  /** ?exp= na query desliga a auto-exposição (App.tsx aplica o valor fixo) */
  private expOverride = false;
  /** ?fps=1 (E2, PLAN.md): quadros/s e os custos de `window.__poeira` na
   *  tela — `null` = porta desligada, `contadorDeFps.ts` nunca criado */
  private contadorFps: { atualizar: (agora: number) => void; descartar: () => void } | null =
    null;
  /**
   * RELÓGIO DO QUADRO (item G, revisão independente, 27/09) — intervalo
   * REAL entre quadros, por `performance.now()` (não por `dt`, que pode
   * congelar: mesmo motivo do `contadorFps` acima). `intervalosDeQuadroMs`
   * guarda os últimos ~300 ; o fim de `tick()` escreve
   * `window.__poeira.quadroMaxMs`/`quadroP95Ms` — a régua de custo que
   * sobrevive à variação quadro a quadro, para medir durante voo (no
   * iPhone, sem abrir o DevTools). SEMPRE medido, como o bake CPU de
   * `Nebula.bake` — custa um `sort` de ≤300 números por quadro.
   */
  private ultimoQuadroPerf = performance.now();
  private readonly intervalosDeQuadroMs: number[] = [];
  /** true → o PRÓXIMO intervalo de quadro é descartado (não vira
   *  amostra, só reancora `ultimoQuadroPerf`) — item C, revisão
   *  independente v2, 27/09. Cobre dois vãos que não são custo de
   *  quadro de verdade: o quadro 1 (`tick()` só corre depois que
   *  `init()` chama `engine.start()`, então nasce `true`: sem isto o
   *  primeiro intervalo mediria a carga inteira, ~5 s de CPU, como se
   *  fosse um quadro) e o primeiro depois que a aba volta de escondida
   *  (rAF pausa/throttla em segundo plano — ver `aoMudarVisibilidade`). */
  private descartarProximoIntervaloDeQuadro = true;
  /** religa `descartarProximoIntervaloDeQuadro` quando a aba volta de
   *  escondida — registrado no construtor, removido no `dispose()`
   *  (mesmo contrato de `aoMudarMovimento`, acima). */
  private readonly aoMudarVisibilidade = () => {
    if (!document.hidden) this.descartarProximoIntervaloDeQuadro = true;
  };

  private events: DirectorEvents;
  private readonly abortController = new AbortController();
  private readonly debug = new URLSearchParams(window.location.search);
  /**
   * O NÍVEL DA NEBULOSA ESCOLHIDO À MÃO (item 145) — `null` = o do
   * preset. O override mora AQUI e não na `Nebula` porque é o Director
   * que aplica os dois ingredientes do nível (passos do raymarch e
   * escala do alvo), e é ele que os reaplica a cada troca de tier.
   *
   * Lido no CAMPO e não no corpo do construtor: a semeadura da nebulosa
   * acontece dentro dele, e um `?nebula=` lido depois só valeria na
   * primeira troca de tier. (`?nebsteps=` continua vencendo isto tudo,
   * dentro da própria `Nebula` — é bancada, não controle.)
   */
  private nebulosaForcada: NivelDaNebulosa | null = lerPortaNebulosa(
    this.debug.get('nebula')
  );
  /**
   * O GÁS VOLUMÉTRICO ESCOLHIDO À MÃO (item 145b) — `null` = a variante
   * do preset. Mesmo contrato do `nebulosaForcada`: lido no CAMPO, e não
   * no corpo do construtor, para a semeadura acontecer antes da primeira
   * troca de tier e antes do warm-up de shaders (`init`) compilar a
   * variante certa.
   */
  private gasForcado: GasVolumetrico | null = lerPortaGas(this.debug.get('gas'));
  /**
   * A FRAÇÃO DE PARTÍCULAS DA GALÁXIA ESCOLHIDA À MÃO (item 149) —
   * `null` = a do preset. Mesmo contrato de `gasForcado`: lido no CAMPO,
   * para valer já na primeira galáxia que o init carrega.
   */
  private particulasForcadas: ParticulasDaGalaxia | null = lerPortaParticulas(
    this.debug.get('particulas')
  );
  /**
   * A POEIRA PERTO DE CASA ESCOLHIDA À MÃO (pedido do dono, 27/09) —
   * `null` = a do preset ('hoje', por ora). Mesmo contrato de
   * `gasForcado`: lida no CAMPO, e é a ÚNICA fonte do `?poeira=` numérico
   * de antes (`0`/`1`/`2` continuam válidos como apelidos — ver
   * `lerPortaPoeira`).
   */
  private poeiraForcada: TipoDePoeira | null = lerPortaPoeira(this.debug.get('poeira'));
  /**
   * `?poeira=teste` é BANCADA, fora da tabela de opções: liga com o
   * volume SINTÉTICO de teste, nos números de sempre (ver
   * `tentarCarregarPoeira`), e vence a variante escolhida enquanto
   * ninguém tocar no controle. MUTÁVEL, e não uma releitura de
   * `this.debug` (congelado desde o construtor): `forcarPoeira` a limpa,
   * para o clique de "voltar ao brilho real" poder desarmar `teste` sem
   * recarregar — sem isto o volume sintético continuaria no ar depois
   * do clique, com a URL já limpa, e o selo mentiria por omissão.
   */
  private poeiraTeste =
    this.debug.get('poeira') === 'teste' || this.debug.get('poeiraniveis') === 'teste';
  /**
   * `?poeiraniveis=teste` é a BANCADA DA PIRÂMIDE (E3c): liga a poeira
   * como `?poeira=teste` (é ela que arma `poeiraTeste`, acima), troca o
   * bloco sintético pelo n0 da bancada e põe por cima a pirâmide
   * sintética de `bancadaDaPiramide`. Some com `poeiraTeste` — o clique
   * do menu (`forcarPoeira`) desarma as duas.
   */
  private poeiraNiveisTeste = this.debug.get('poeiraniveis') === 'teste';
  /**
   * `?poeiraniveis=0` é a BANCADA DO A/B (E3c): o app ignora a pirâmide —
   * nem os índices descem — e o Gaia fica no bloco de 20 pc de antes dela,
   * para as fotos lado a lado. Porta de URL (selo.ts), não do menu: o
   * clique no controle da poeira não a desarma.
   */
  private readonly poeiraNiveisDesligada = this.debug.get('poeiraniveis') === '0';
  /**
   * A FONTE QUE O PEDIDO ATUAL QUER (item A, revisão independente v2,
   * 27/09) — `'sintetica'` enquanto `poeiraTeste` estiver ligado
   * (`?poeira=teste`, ou até `forcarPoeira` o desarmar), `'gaia'`
   * depois. GETTER, e não um campo escrito à mão: `poeiraTeste` é
   * MUTÁVEL (`forcarPoeira` o limpa), e um campo separado podia
   * desincronizar do que ele vale AGORA — era exatamente esse o
   * defeito (a fonte lida de `this.debug`, congelado, em vez do pedido
   * atual). Único consumidor: `tentarCarregarPoeira`.
   */
  private get fonteDesejada(): 'gaia' | 'sintetica' {
    return this.poeiraTeste ? 'sintetica' : 'gaia';
  }
  /**
   * O RAIO COM QUE O SOL FOI CONSTRUÍDO, em pc. Desde a F3 é SEMPRE o
   * físico (`RAIO_DO_SOL_NA_CENA`) — a porta `?solreal=1` da F1 morreu
   * quando ele virou o padrão. O campo fica porque é a fonte única para
   * todo mundo que precisa do tamanho do Sol depois da construção (o
   * oclusor da nebulosa, o palco, o gate de 4 px e a cessão do ponto), e
   * porque ler o raio de UM lugar é o que impediu, na F1, o Sol de
   * encolher no mesh e continuar tapando o céu como se fosse grande.
   */
  private readonly solRaioPc = RAIO_DO_SOL_NA_CENA;
  /** o Sol no quadro — corte 8 da Parte 1 (director/solNoQuadro.ts):
   *  o gate do palco, a repartição da lei e a cessão do ponto, com o
   *  estado da histerese (`solArmado`) dentro; os punhos tardios
   *  entram por fio e o raio único entra UMA vez, daqui */
  private readonly solNoQuadro = new SolNoQuadro({
    solRaioPc: this.solRaioPc,
    sun: () => this.sun,
    palco: () => this.palco,
    clarao: () => this.clarao,
    planetas: () => this.planetas,
    stars: () => this.stars,
    escondido: (flag) => this.hide.has(flag),
  });
  /** a escada do Atlas — corte 9 da Parte 1 (director/escada.ts): o
   *  clique, a busca, os degraus, o religador do relógio e o trio do
   *  foco (`ver`/`focoEstrela`/`focoCorpoId`) com UM dono; os punhos
   *  de instância entram com o nome preservado, o que nasce depois do
   *  construtor (engine, roam) e o que muda por quadro entram por fio */
  private readonly escada: Escada = new Escada({
    atlas: this.atlas,
    maquinaDoTempo: this.maquinaDoTempo,
    rotulos: this.rotulos,
    solRaioPc: this.solRaioPc,
    teletransportou: () => this.teletransportou(),
    events: {
      onFoco: (nome) => this.events.onFoco(nome),
      onEscada: (estado) => this.events.onEscada(estado),
    },
    fios: {
      engine: () => this.engine,
      roam: () => this.roam,
      fase: () => this.phase,
      quadrosDaFase: () => this.quadrosDaFase,
      shotMode: () => this.shotMode,
      reducedMotion: () => this.reducedMotion,
      planetas: () => this.planetas,
      meta: () => this.meta,
      rochosos: () => this.rochosos,
      gigantes: () => this.gigantes,
      // a terceira pega do mesmo alvo (item 120 · L11): o traço da órbita
      // responde como o nome, e só no Atlas, onde as linhas existem
      corpoNaOrbita: (x, y) =>
        this.phase === 'atlas' && this.orbitas
          ? this.orbitas.corpoNoPonto(x, y, this.engine.camera, window.innerWidth, window.innerHeight)
          : null,
    },
  });
  private disposed = false;
  /** pré-compilação em voo; o dispose do renderer espera por ela */
  private warmup: Promise<unknown> | null = null;
  /** download disparado no construtor, consumido pelo init */
  private readonly assets: ReturnType<Director['startLoading']>;

  constructor(canvas: HTMLCanvasElement, events: DirectorEvents) {
    this.corpoNoFoco = this.corpoNoFoco.bind(this);
    this.corpoNoRoteiro = this.corpoNoRoteiro.bind(this);
    this.events = events;
    this.engine = new Engine(canvas);
    // Se QUALQUER coisa abaixo lançar (o prime do Sol são ~550 draws numa
    // GPU que pode estar caindo), o contexto WebGL e o listener de resize
    // do Engine não podem ficar órfãos atrás do véu de erro — o catch
    // devolve o Engine e relança para o App mostrar a falha (Onda 1d).
    try {
    // A REDE PRIMEIRO. O prime do Sol (logo abaixo) são ~550 draws
    // offscreen síncronos, e ele não depende de um byte dos ativos — mas
    // como os fetches só nasciam no init(), os dois trabalhos rodavam em
    // SÉRIE. Disparados aqui, o prime e a compilação passam a acontecer
    // POR CIMA do download. init() só espera esta promise.
    this.assets = this.startLoading();
    // a promise agora nasce ANTES de quem a consome: se um dispose() vier
    // entre o construtor e o init(), o abort rejeitaria sem ninguém
    // ouvindo. Este ramo só cala o warning; o init continua vendo o erro.
    void this.assets.catch(() => {});
    this.post = new Post(this.engine.renderer, this.engine.scene, this.engine.camera);
    this.nebula = new Nebula(0.5);
    // POEIRA PERTO DE CASA (E2/E3 + pedido do dono, 27/09): a opção da
    // gaveta Avançado (`poeiraForcada`/`poeiraTeste`, lidas no CAMPO,
    // acima) decide modo/ganho/gama/lanes por `aplicarPoeira` — ver ali
    // o mapeamento e as portas de bancada `?poeiragain=`/`?poeiragama=`/
    // `?poeiralanes=`, que continuam vencendo por cima. `definirPoeira`
    // guarda o pedido e só dispara o fetch depois que `init()` souber se
    // a cartografia ligou (`this.cartOn`) — ver `definirPoeira`/
    // `tentarCarregarPoeira` abaixo, Nebula.setPoeira e
    // poeiraDensidadeApp em shaders/common.ts. O pedido nasce JÁ AQUI, e
    // não no corpo mais tardio que semeia gás/nebulosa/partículas
    // (linha ~910), porque é este `definirPoeira` que precisa correr
    // antes de mais nada tocar `this.nebula`.
    this.aplicarPoeira();
    // CONTADOR DE FPS NA TELA (E2): ?fps=1, mesmo padrão de leitura do
    // `poeira=` acima — só existe para medir custo sem abrir o DevTools
    // (contadorDeFps.ts); alimentado a cada quadro, no fim de tick().
    if (this.debug.get('fps') === '1') {
      this.contadorFps = montarContadorDeFps();
    }
    // Sol procedural transplantado (vivo: sim + bake + ciclo); o prime
    // do construtor compila os quads offscreen com RT amarrado. Desde a
    // Onda 3 o corpo é parametrizado e o Sol é a instância 1: quem
    // decide raio, rotação, atividade e semente é SOL_PARAMS, não
    // literais soltos dentro da classe.
    // O SOL TEM RAIO FÍSICO, SEM PORTA (F3). De 2026-08-12 a 2026-08-13
    // isto foi um ternário sobre a porta de URL, escolhendo entre o raio
    // físico e o artístico — a porta da F1, que existia para o raio verdadeiro
    // poder ser FOTOGRAFADO pelo mesmo motor, no mesmo dia, antes de
    // qualquer baseline ser paga. Ela cumpriu o papel dela: refutou com
    // imagem a frase "escala real seria invisível" de `config.ts:8` sem
    // custar um pixel, e a F2 depois lhe tirou o papel de LIGAR o Sol
    // como corpo (quem decide isso é a régua do palco, 4 px na tela).
    //
    // A F3 tirou a última: o raio é parâmetro de CONSTRUÇÃO (vira escala
    // do grupo e literal compilado no GLSL da coroa e da CME —
    // `SUN_R_GLSL`/`SEG_EPS_GLSL`), então "ser o padrão" só podia
    // significar construir o Sol pequeno SEMPRE, e é isso que se fez,
    // junto com o único plano que dependia do contrário — a abertura,
    // que foi refilmada a 4,00 milhões de km em vez de em volta de uma
    // bola de 2.269 UA. Uma porta que só pode estar ligada não é porta;
    // manter `?solreal=1` viva depois disto seria manter um caminho
    // morto na URL e uma segunda lei de raio no construtor.
    this.sun = new StellarBody(
      SOL_PARAMS,
      this.engine.renderer,
      this.engine.camera,
      this.engine.quality,
      // a fase do ciclo NO NASCIMENTO: o `prime` do construtor assa um
      // retrato completo, e assá-lo na data certa é o que evita um
      // re-bake no primeiro quadro de toda sessão
      faseDoCiclo(this.maquinaDoTempo.jdVivo)
    );
    this.dust = new Dust();
    this.roam = new FreeRoam(canvas, this.engine.camera);
    this.engine.onQuality((quality) => {
      // passos e escala do raymarch: aqui e não no tick. Reescrever o
      // mesmo valor 60×/s era ruído; quem muda o preset é quem tem de
      // aplicá-lo — o auto-quality passa por aqui, e o default do Nebula
      // (44) NÃO é o do cinema (56), então o valor inicial também vem
      // daqui.
      this.aplicarNebulosa();
      // a variante do gás (item 145b) troca de preset junto com os
      // passos/escala — mesmo motivo: quem muda o preset aplica os dois.
      this.aplicarGas();
      // a fração de partículas (item 149) troca de preset do mesmo jeito
      // — sem efeito ainda quando a galáxia não nasceu (init).
      this.aplicarParticulas();
      // a poeira perto de casa (pedido do dono, 27/09) troca de preset
      // do mesmo jeito — hoje sem efeito visível (os três presets
      // apontam 'hoje'), mas pronta para o dia em que apontarem cada um
      // a sua.
      this.aplicarPoeira();
      // o preset de grão era config morta — nunca chegava ao shader
      this.post.setGrain(this.engine.preset.grain);
      // as amostras do alvo do composer (item 120, F1): o MSAA é do tier
      this.post.aplicarAmostras(quality);
      this.blackHole?.setQuality(quality);
      this.publicarQualidade();
      // troca de tier muda pixelRatio e passos do raymarch: a contagem de
      // estabilidade da captura recomeça (ver o getter `captura`)
      this.perturbar();
    });
    // A MEDIÇÃO (Ajustes D). O engine mede e avisa; a decisão é daqui —
    // é esta linha que faz o Auto trocar o MUNDO (a alocação inteira,
    // pela via viva da letra C) em vez de só o instrumento, que era todo
    // o alcance do auto-quality que morreu no engine.
    this.engine.onMedicao((m) => this.aoMedirOQuadro(m));
    // o Engine já aplicou a qualidade no próprio construtor, antes destes
    // ouvintes existirem — o estado inicial precisa ser semeado à mão.
    // A ESCALA faltava desta lista: em performance inicial o raymarch
    // rodava a 0,5 (o default do construtor) em vez de 0,35 até a primeira
    // troca de tier — exatamente onde a economia mais importa (Onda 1e).
    // Desde o item 145 os dois ingredientes saem juntos da mesma tabela.
    this.aplicarNebulosa();
    // a variante do gás (item 145b) precisa estar aplicada ANTES do
    // warm-up de shaders (`init`, mais abaixo): é ele que lê
    // `nebula.warmupMaterials`, e o material tem de já ser o certo.
    this.aplicarGas();
    // a fração de partículas (item 149): a galáxia ainda não existe
    // aqui (nasce mais abaixo, no `stage('galaxy')`) — quem a veste com
    // a fração certa é `vestirGalaxia`, no parto dela.
    this.aplicarParticulas();
    this.post.setGrain(this.engine.preset.grain);
    this.post.aplicarAmostras(this.engine.quality);
    // e o React TAMBÉM é ouvinte tardio: sem esta semente o painel de
    // Ajustes nasceria mostrando o que ele chutou no `useState` em vez do
    // que o engine aplicou — e o clique no tier certo virava no-op
    // (achado da revisão de olhos frescos da Onda 1, verificado ao vivo).
    this.publicarQualidade();

    this.engine.onResize((w, h) => {
      this.nebula.setSize(w, h);
      this.post.setSize(w, h);
      this.perturbar();
    });
    this.nebula.setSize(window.innerWidth, window.innerHeight);

    // debug via URL: ?nobloom=1 — apaga OS DOIS cobertores (item 72: até
    // 25/08 a porta só apagava o principal e o clarão do campo seguia
    // inteiro; ver `Post.bloomLigado`)
    if (this.debug.has('nobloom')) {
      this.post.bloomLigado = false;
    }
    // (A GRADAÇÃO POR CONTEXTO do Atlas — `claraoDoAtlas` — e a porta
    // `?grad=` morreram no M1 da Lei da Estrela: o clarão do Sol passou a
    // sair da repartição única, e o curativo de apagá-lo 100× no Atlas
    // ficou sem doença. Item 4 das pendências.)
    this.noNebula = this.debug.has('nonebula');
    this.shotMode = this.debug.has('shot');
    this.expOverride = this.debug.has('exp');
    // ?luz= — a política da primeira lei de luz (Onda 6, D2/D8), pela
    // lei única da porta (`lerPortaLuz`, selo.ts); pedido inválido cai
    // no default do Atlas, nunca num caminho terceiro.
    this.politicaDeLuz = lerPortaLuz(this.debug.get('luz')) ?? 'assistida';
    // (a porta `?bcede=` morreu no M1: a cessão do Sol-ponto é
    // `wResolvido` da repartição única — regra iv do §4 da Lei.)
    // ?jd= — O INSTANTE DO CÉU (Onda 5, F4/D2), no precedente de
    // `?corpos/?nocorpos`: uma porta que o A/B usa com o MESMO binário dos
    // dois lados. `?jd=EPOCA` pede o instante do retrato e é o lado
    // "com a porta" desse A/B — ele acende o caminho vivo INTEIRO
    // (busca, decodificação, escrita dos dois atributos) num instante
    // em que o resultado tem de ser o retrato bit a bit.
    this.aplicarPortaJd();
    // A PREFERÊNCIA VALE TAMBÉM SE MUDAR COM O APP ABERTO (§4/§5 do plano
    // de motion): até 12/09 esta era UMA leitura, na construção, e ligar
    // "reduzir movimento" com a cena viva deixava o warp e as travessias
    // do Atlas correndo como antes (medido: o sistema mudava, `matchMedia`
    // dizia `true`, e este campo seguia `false`). O ouvinte é o mesmo de
    // `movimentoDaGaveta.ts`; aqui ele vive o que o Director vive.
    this.preferenciaDeMovimento =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    this.reducedMotion = this.preferenciaDeMovimento?.matches ?? false;
    this.preferenciaDeMovimento?.addEventListener('change', this.aoMudarMovimento);
    // RELÓGIO DO QUADRO (item C, revisão independente v2, 27/09): a aba
    // escondida pausa/throttla o rAF — sem isto, um minuto em segundo
    // plano virava o "pior quadro" da sessão inteira quando a aba
    // voltasse (ver `aoMudarVisibilidade`/`descartarProximoIntervaloDeQuadro`).
    document.addEventListener('visibilitychange', this.aoMudarVisibilidade);
    // As flags de camada semeiam da URL DERIVADAS da tabela única
    // (`atlasConfig.CAMADAS`) — este laço era a quarta lista digitada à
    // mão, e foi por fora dela que quatro flags só-URL viveram sem nome
    // nem caixa até o item 33. Todas entram em `hide` porque o `hide` é
    // o que o SELO declara: sem isto, chegar com `?nodisc=1` apagava
    // uma camada e o selo dizia "brilho real", enquanto o mesmo
    // desligamento pelo painel se declarava. Uma opção, um veredito.
    // `nonebula` é a exceção de morada: vive em `this.noNebula` (semeada
    // acima, trocada por `setLayerHidden`) e o selo a re-injeta na
    // leitura de `camadasEscondidas`.
    for (const { flag } of CAMADAS) {
      if (flag !== 'nonebula' && this.debug.has(flag)) this.hide.add(flag);
    }

    // os gestos do canvas moram em director/gestos.ts (corte 6)
    this.gestos = ligarGestos(canvas, {
      pauseLookAtivo: () => this.pauseLookActive,
      noAtlas: () => this.phase === 'atlas',
      orbitar: (dx, dy) => {
        this.atlas.addOrbitDelta(dx, dy);
        this.perturbar();
        // o primeiro arrasto apaga a dica dos gestos (item 73) — uma vez
        // por sessão, nunca por quadro: do outro lado do fio há setState
        if (!this.jaGirouNoAtlas) {
          this.jaGirouNoAtlas = true;
          this.events.onGirou();
        }
      },
      olhar: (dx, dy) => this.rig.addLookDelta(dx, dy),
      // a roda no filme pausado é a LENTE do modo fotografia (item 100,
      // fase 2) — o indicador LENTE·SOL acusa ao vivo pelo mesmo tick
      lente: (deltaPx) => {
        this.rig.ajustarLente(deltaPx);
        this.perturbar();
      },
      // UM CLIQUE ESCOLHE, DOIS VÃO (item 73). São dois fios porque são
      // dois gestos: o primeiro troca o alvo com a câmera parada, o
      // segundo é o preset da escada, com rampa.
      selecionar: (x, y) => this.escada.selecionarNoPonto(x, y),
      apontavel: (x, y) => this.apontarRotulo(x, y),
      nadaApontado: () => this.apagarHover(),
      fecharGavetas: () => this.events.onFecharGavetas(),
      mergulhar: () => this.escada.mergulharNoEscolhido(),
      // A RODA ESCREVE DISTÂNCIA, e só distância (item 73): nem
      // `focoCorpoId`, nem alvo, nem degrau. É por construção que o
      // objeto escolhido nunca troca sozinho — a queixa "nem conseguimos
      // mais selecionar para onde vamos" morre aqui, não num remendo.
      zoom: (estalos) => {
        const antes = this.atlas.distancia;
        const piso = this.atlas.pisoDeZoom;
        const teto = this.atlas.tetoDeZoom;
        const d = distanciaAposEstalos(antes, piso, teto, estalos);
        this.atlas.pinarDistancia(d);
        // NA PAREDE O EMBALO MORRE (item 115). Sem isto a inércia
        // continua queimando contra o grampo: um detente deixa 8
        // estalos/s, que só caem na zona morta 0,55 s depois; uma rajada
        // de dez deixa 80 estalos/s e 0,84 s. Como o impulso do gesto
        // SOMA na mesma velocidade, a primeira inversão do visitante era
        // gasta só em cancelar embalo morto — ele descia até o piso,
        // queria voltar, e a roda não fazia nada. A condição é o grampo
        // MEDIDO, não a intenção do gesto: a distância não andou E o
        // valor é a parede. Quem só CHEGA na parede neste quadro ainda
        // entrega o movimento; morre no seguinte.
        if (d === antes && (d === piso || d === teto)) this.gestos?.esquecerRoda();
        // o `?d=` que veio no link deixa de mandar no primeiro gesto
        this.escada.esquecerPinoDoLink();
        this.perturbar();
      },
    });

    // clique curto no voo livre → mini-viagem até a estrela nomeada
    this.roam.onTap = (x, y) => this.escada.tryVisit(x, y);

    // O TICK NÃO PODE ESTOURAR PARA O NADA. Sem este try, uma exceção
    // em quadro saía do rAF como "Uncaught" e o laço a repetia 60×/s
    // para sempre: console em cascata, tela congelada e nenhum aviso ao
    // visitante. Medido em 21/08 — três "Uncaught" no console e nada na
    // tela. O try mora AQUI, no registro, e não em volta do corpo do
    // tick: é a mesma cobertura com 3 linhas em vez de reindentar 550.
    this.engine.onTick((t, dt) => {
      try {
        this.tick(t, dt);
      } catch (e) {
        console.error(e);
        this.desistir(
          texto('hud.fatalTick') + (e instanceof Error ? e.message : String(e))
        );
      }
    });
    // A PLACA DE VÍDEO DESISTIU (o listener e o porquê de não restaurar
    // moram no Engine, que é quem tem o canvas e o laço).
    this.engine.onContextoPerdido(() => {
      // a pirâmide da poeira (E3c) cai no n0: buscas abortadas e nada
      // mais sobe para uma GPU que já não existe
      this.piramideCarregada = null;
      this.nebula.setPiramide(null);
      this.desistir(texto('hud.fatalContexto'));
    });
    } catch (e) {
      this.engine.dispose();
      throw e;
    }
  }

  /**
   * catálogo HYG + ativos cartográficos em paralelo; os segundos são
   * progressivos — sem eles a cena continua procedural.
   * ?cart=off não baixa os ~6 MB que ninguém consumiria.
   */
  private startLoading() {
    const cartMode: CartographyMode =
      this.debug.get('cart') === 'off'
        ? 'off'
        : this.debug.get('cart') === 'obs'
          ? 'observed'
          : 'blend';
    return Promise.all([
      loadStarData(this.abortController.signal),
      cartMode === 'off'
        ? Promise.resolve(null)
        : loadGalacticAssets(this.abortController.signal),
    ]).then(([stars, galactic]) => ({ stars, galactic, cartMode }));
  }

  /**
   * O volume SINTÉTICO de `?poeira=teste` (E2) — troca o fetch real por
   * uma grade pequena em memória, mesma origem/voxel do bloco real numa
   * escala menor (40×40×20 de 20 pc, ±400/±400/±200 pc): zerada, com três
   * blocos de 3×3×3 voxels em heliocêntrico galáctico (ver `poeiraHelio`
   * em shaders/common.ts) — 0,05 E/pc no centro galáctico (+310,+10,+10),
   * 0,02 em l=90° (+10,+310,+10), 0,01 no norte (+10,+10,+170). É o
   * volume da prova de orientação: do Sol para o centro galáctico tem de
   * aparecer o bloco mais forte. Bits crus de half-float por
   * `THREE.DataUtils` (não o `Float16Array` nativo do JS — mesmos bits,
   * sem depender de um global recente demais para o Safari do iPhone
   * confirmar a tempo).
   *
   * CENTROS REPRESENTÁVEIS (item F, revisão independente, 27/09): o
   * centro do voxel `i` é `origem + (i + 0,5)·voxel` — o MESMO contrato
   * de amostragem de `poeiraMedida`/`texture()` (o texel `i` cobre
   * `[i, i+1)` em coordenada de textura, e o sampler lê o MEIO dele).
   * `escreverBloco` inverte essa conta (`i = (coord − origem)/voxel −
   * 0,5`); sem o `− 0,5` o índice caía meio voxel para dentro (o antigo
   * "(300,0,0)" caía no voxel cujo centro É (310,10,10) — a inspeção
   * pelo olho nunca notaria 10 pc em 800, mas o CONTRATO de coordenadas
   * ficava errado). Os três centros acima são escolhidos para cair em
   * `i` INTEIRO com a fórmula corrigida (nenhuma ambiguidade de
   * arredondamento); o norte fica em 170, não mais alto, porque o topo
   * da caixa em z é ±200 pc — a rampa de fronteira (1 voxel, 20 pc) já
   * cortaria um centro mais perto do teto.
   */
  private volumeSinteticoDePoeira(): VolumeDePoeira {
    // a bancada da pirâmide (E3c) traz o próprio n0, na geometria real
    if (this.poeiraNiveisTeste) return this.bancada.n0;
    const dims: [number, number, number] = [40, 40, 20];
    const voxelPc = 20;
    const originPc: [number, number, number] = [-400, -400, -200];
    const [nx, ny, nz] = dims;
    const dados = new Uint16Array(nx * ny * nz);
    const escreverBloco = (xh: number, yh: number, zh: number, densidadeEPorPc: number) => {
      const cx = Math.round((xh - originPc[0]) / voxelPc - 0.5);
      const cy = Math.round((yh - originPc[1]) / voxelPc - 0.5);
      const cz = Math.round((zh - originPc[2]) / voxelPc - 0.5);
      const bits = THREE.DataUtils.toHalfFloat(densidadeEPorPc * 1000);
      for (let dz = -1; dz <= 1; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ix = cx + dx;
            const iy = cy + dy;
            const iz = cz + dz;
            if (ix < 0 || ix >= nx || iy < 0 || iy >= ny || iz < 0 || iz >= nz) continue;
            dados[ix + nx * (iy + ny * iz)] = bits;
          }
        }
      }
    };
    escreverBloco(310, 10, 10, 0.05); // direção do centro galáctico
    escreverBloco(10, 310, 10, 0.02); // l = 90°
    escreverBloco(10, 10, 170, 0.01); // norte
    return {
      descritor: {
        kind: 'volume',
        file: '(sintético — ?poeira=teste)',
        dims,
        voxelPc,
        originPc,
        scale: 1000,
        type: 'float16',
        byteLength: dados.byteLength,
        sha256: '',
        // Coerentes com o que este bloco CONTÉM (zero por fora): sem
        // buraco interno reconstruído, e o alcance externo é o maior
        // semi-eixo real da caixa (400 pc, em x/y — z para em ±200). A
        // cobertura ANALÍTICA (`poeiraCobertura` em shaders/common.ts)
        // usa uma rampa 1100→1200 pc fixa NO DESENHO, pensada para o
        // bloco REAL — não lê `uPoeiraRaios` (estes dois campos), então
        // estes números são só documentação do descritor sintético, sem
        // efeito no shader.
        innerRadiusPc: 0,
        outerRadiusPc: 400,
      },
      dados,
    };
  }

  /**
   * POEIRA MEDIDA (E2/E3): guarda o PEDIDO (mesmo formato de
   * `Nebula.setPoeira`, que também recebe) e chama `tentarCarregarPoeira`
   * — chamada pelo construtor (a URL ainda sem saber se a cartografia vai
   * ligar: `tentarCarregarPoeira` não dispara nada até `init()` resolver
   * `this.cartOn`) e, no futuro, por um menu ao vivo com a MESMA
   * assinatura.
   */
  definirPoeira(config: { modo: number; ganho: number; gama: number; lanes: number }) {
    this.poeiraModoPedido = config.modo;
    this.nebula.setPoeira(config);
    this.tentarCarregarPoeira();
  }

  /**
   * CARGA PREGUIÇOSA (E3, item C) + TROCA DE FONTE AO VIVO (item A,
   * revisão independente v2, 27/09): antes o fetch do bloco de 20 pc
   * disparava sempre que a cartografia estava ligada, mesmo com a
   * poeira desligada ou a variante 'fino' (que não a assava — E2); e,
   * uma vez disparado, NUNCA disparava de novo — nem quando o pedido
   * trocava de FONTE (sintética ↔ Gaia): "Gaia média" depois de
   * `?poeira=teste` ficava com o volume de bancada no ar, porque a
   * fonte era lida da URL CONGELADA (`this.debug`), não do pedido atual
   * (`fonteDesejada`, que segue `poeiraTeste` — MUTÁVEL por
   * `forcarPoeira`).
   *
   * Agora dispara com os DOIS: pedida (`poeiraModoPedido != 0`) e
   * cartografia já RESOLVIDA (`this.cartResolvido`, só verdadeiro
   * depois que `init()` decide `this.cartOn` — antes disso não há nada
   * a decidir, e um pedido chegando agora só fica guardado). Cartografia
   * resolvida em falso (`?cart=off`, ou o manifesto sem o volume) encerra
   * o pedido IMEDIATAMENTE como falha (`nebula.setPoeiraMedida(null)` +
   * `poeiraCarga = 'falhou'`) — sem descritor não há nada a esperar, e
   * sem isto `poeiraCarga` ficava em 'pendente' para sempre, tanto na
   * primeira chamada (dentro de `init()`) quanto num pedido que só
   * chegasse depois (o menu religado com `cartOn` já resolvido em
   * falso). Com cartografia ligada, dispara — ou REDISPARA — só quando
   * a fonte pedida AGORA (`fonteDesejada`) ainda não foi tentada nesta
   * instância (`poeiraFonteTentada`): a MESMA fonte já tentada (sucesso
   * OU falha) não tenta de novo (item D: sem prazo artificial, sem
   * retentativa), mas uma fonte NOVA sempre dispara — "trocar ao vivo" e
   * "reabrir a URL resultante" chegam à mesma fonte.
   *
   * `poeiraPedidoId` marca cada disparo; a resposta (`.then`) só é
   * aplicada se ainda for o pedido MAIS RECENTE — um disparo mais novo
   * (outra fonte, chamado antes do primeiro resolver) descarta o mais
   * velho sem tocar `nebula`/`poeiraCarga`/`poeiraFonte`.
   *
   * Chamada por `definirPoeira` (cobre `forcarPoeira`, que reassa
   * `aplicarPoeira` → `definirPoeira`) e de novo no fim de `init()`,
   * quando `this.cartOn` é escrito. SEM bloquear a cena: só `.then`,
   * nunca `await`. Escreve `poeiraCarga`/`poeiraFonte` (o estado desta
   * instância que `estadoDaPoeira` lê) e publica — ver `publicarPoeira`.
   */
  private tentarCarregarPoeira() {
    if (this.poeiraModoPedido === 0 || !this.cartResolvido) return;
    if (!this.cartOn) {
      if (this.poeiraCarga !== 'falhou') {
        this.nebula.setPoeiraMedida(null);
        this.poeiraCarga = 'falhou';
        this.poeiraFonte = null;
      }
      this.publicarPoeira();
      return;
    }
    const desejada = this.fonteDesejada;
    if (this.poeiraFonteTentada === desejada) return;
    // TROCA DE FONTE: o volume da fonte velha sai da Nebula NA HORA, no
    // mesmo gesto que pediu a nova — antes de qualquer quadro. Sem isto o
    // sintético seguia desenhado (e assentado) durante o download do
    // Gaia, e pela rota "de hoje" → Gaia o `setPoeira` que precede este
    // disparo (em `definirPoeira`) o religava e o próximo bake o assava
    // sob o pedido novo.
    // Quem segura a captura até o volume novo chegar é `get captura`
    // (a Nebula, sem volume e com o pedido encerrado, diria "assentada").
    if (this.poeiraFonteTentada !== null) {
      this.nebula.setPoeiraMedida(null);
      this.poeiraFonte = null;
    }
    this.poeiraFonteTentada = desejada;
    const meuPedido = ++this.poeiraPedidoId;
    this.poeiraCarga = 'carregando';
    this.publicarPoeira();
    const base = import.meta.env.BASE_URL;
    const ehTeste = desejada === 'sintetica';
    const promessa = ehTeste
      ? Promise.resolve<VolumeDePoeira | null>(this.volumeSinteticoDePoeira())
      : this.dustVolumeManifesto
        ? carregarVolumeDePoeira(base, this.dustVolumeManifesto, this.abortController.signal)
        : Promise.resolve(null);
    promessa.then((volume) => {
      if (this.disposed || meuPedido !== this.poeiraPedidoId) return;
      const maiorDim = volume ? Math.max(...volume.descritor.dims) : 0;
      const teto = sondarGl().max3DTextureSize;
      if (volume && teto !== undefined && teto < maiorDim) {
        console.warn(
          `[poeira] Data3DTexture de ${maiorDim} excede o teto do aparelho (${teto}) — poeira desligada.`
        );
        this.nebula.setPoeiraMedida(null);
        this.poeiraCarga = 'falhou';
        this.poeiraFonte = null;
        this.publicarPoeira();
        return;
      }
      this.nebula.setPoeiraMedida(volume);
      this.poeiraCarga = volume ? 'chegou' : 'falhou';
      this.poeiraFonte = volume ? desejada : null;
      this.publicarPoeira();
    });
  }

  /** a bancada `?poeiraniveis=teste` (E3c), montada na primeira vez */
  private get bancada(): ReturnType<typeof bancadaDaPiramide> {
    return (this.bancadaDosNiveis ??= bancadaDaPiramide());
  }

  /**
   * QUAL PIRÂMIDE O PEDIDO QUER AGORA (E3c): nenhuma sem a poeira pedida,
   * sem cartografia ou com `?poeiraniveis=0`; a da bancada com
   * `?poeiraniveis=teste`; nenhuma com o bloco sintético de
   * `?poeira=teste` (outra geometria); a do Gaia quando o manifesto a
   * declara.
   */
  private get piramideDesejada(): 'gaia' | 'sintetica' | null {
    if (this.poeiraModoPedido === 0 || !this.cartResolvido || !this.cartOn) return null;
    if (this.poeiraNiveisDesligada) return null;
    if (this.poeiraTeste) return this.poeiraNiveisTeste ? 'sintetica' : null;
    return this.dustPyramidManifesto ? 'gaia' : null;
  }

  /**
   * ALGUÉM LERIA A PIRÂMIDE AGORA? (E3c) — o gás desenhado (sem
   * `?nonebula=1` nem a aba escondida) e uma variante que lê a poeira
   * (fino/macio; o antigo nunca lê). Sem isto nada da pirâmide é
   * baixado: nem os índices (`garantirPiramide` adia a busca), nem
   * tijolos (a residência fica parada), nem o aquecimento.
   */
  private get gasLeAPiramide(): boolean {
    return !this.noNebula && this.nebula.lePoeira;
  }

  /**
   * A PIRÂMIDE DA POEIRA (E3c), conferida a cada quadro: se a fonte que
   * o pedido quer (`piramideDesejada`) mudou, solta a velha e busca a
   * nova — o desenho de `tentarCarregarPoeira` (o último pedido vence,
   * sem retentativa), só que no quadro em vez de nos gestos, para nenhum
   * caminho do menu precisar lembrar dela. A chegada monta a GPU na hora
   * (a captura nunca vê um intervalo sem ela); um tier novo remonta com
   * o orçamento dele, sem baixar os índices de novo.
   */
  private garantirPiramide() {
    const desejada = this.piramideDesejada;
    if (desejada !== this.piramideFonteTentada) {
      // uma fonte nova com o gás que não a lê (antigo, ou sem nebulosa)
      // espera: nada é baixado até alguém ir lê-la (a que já chegou fica)
      if (desejada !== null && !this.gasLeAPiramide) return;
      this.piramideFonteTentada = desejada;
      const meuPedido = ++this.piramidePedidoId;
      this.piramideCarregada = null;
      this.piramideTier = null;
      this.nebula.setPiramide(null);
      if (desejada === null) {
        this.piramideCarga = 'nenhuma';
        return;
      }
      this.piramideCarga = 'carregando';
      const base = import.meta.env.BASE_URL;
      const promessa =
        desejada === 'sintetica'
          ? Promise.resolve({ piramide: this.bancada.piramide, fonte: this.bancada.fonte })
          : carregarPiramideDePoeira(base, this.dustPyramidManifesto, this.abortController.signal).then(
              (piramide) => (piramide ? { piramide, fonte: fonteDaRede(base) } : null)
            );
      void promessa.then((carregada) => {
        if (this.disposed || meuPedido !== this.piramidePedidoId) return;
        this.piramideCarregada = carregada;
        this.piramideCarga = carregada ? 'chegou' : 'falhou';
        this.montarPiramide();
      });
      return;
    }
    if (this.piramideCarregada && this.piramideTier !== this.engine.quality) this.montarPiramide();
  }

  /** a pirâmide baixada vai à Nebula com o orçamento do tier de agora
   *  (vagas, cache e raios) — o mesmo de antes (cinema ↔ alta) mantém a
   *  que está no ar */
  private montarPiramide() {
    const carregada = this.piramideCarregada;
    if (!carregada) return;
    this.piramideTier = this.engine.quality;
    const orcamento = orcamentoDaPiramide(this.engine.quality, sondarGl().max3DTextureSize);
    const noAr = this.nebula.orcamentoDaPiramide;
    if (noAr && mesmoOrcamento(noAr, orcamento)) return;
    this.nebula.setPiramide({ ...carregada, orcamento });
  }

  /**
   * A PIRÂMIDE PREPARADA ANTES DO CLIQUE (E3c): nos tiers de computador,
   * com o manifesto que a declara e um navegador que abre os tijolos
   * (`DecompressionStream`), a Nebula reserva o atlas do orçamento deste
   * tier e aquece os materiais dela nos quadros de agora
   * (`Nebula.prepararPiramide`) — o clique em Suave/Média/Forte não paga
   * mais nem o atlas nem o pipeline. No Performance (celular) a memória
   * não é gasta antes do clique: ele paga como antes. Só DEPOIS da
   * primeira medição do Auto (os quadros do parto não entram nela; ver
   * a nota abaixo sobre a sugestão). Com um clique pendente quem aquece
   * é `aquecerPiramide`, no mesmo quadro — um desenho a frio por quadro.
   */
  private prepararPiramide() {
    const tier = this.engine.quality;
    if (!this.dustPyramidManifesto || typeof DecompressionStream !== 'function') return;
    if (tier !== 'cinema' && tier !== 'alta') return;
    if (this.piramideDesejada !== null) return;
    // só depois da PRIMEIRA medição do Auto: os quadros do parto ficam de
    // fora dela. A sugestão em si não importa (medido em 30/09: numa
    // janela de 1280×720 a DPR 2 o Cinema mede ~26 fps e a medição
    // sugere Alta o tempo todo — esperar que ela não sugira descer
    // deixaria o clique pagando a trava justo nas máquinas de sempre);
    // um quadro de ~180 ms numa média de vários segundos muda a média
    // em ~1 %, longe de virar sugestão.
    if (!this.engine.medicao) return;
    if (this.orcamentoPreparado?.tier !== tier) {
      this.orcamentoPreparado = { tier, orcamento: orcamentoDaPiramide(tier, sondarGl().max3DTextureSize) };
    }
    this.nebula.prepararPiramide(this.orcamentoPreparado.orcamento, this.engine.renderer);
  }

  /**
   * A PROCEDÊNCIA REAL da poeira medida perto do Sol (revisão
   * independente, 27/09) — ver `EstadoDaPoeira` em `selo.ts` e
   * `derivarEstadoDaPoeira` (topo do arquivo, a derivação pura, testada
   * sem WebGL). Este getter só empacota os cinco valores DESTA
   * instância: o PEDIDO (`poeiraModoPedido`), a CARGA (`poeiraCarga`/
   * `poeiraFonte`, escritos por `tentarCarregarPoeira`/`init`) e o que a
   * `Nebula` DE FATO desenha (`poeiraModoEfetivo`, `poeiraAssentada`).
   */
  get estadoDaPoeira(): EstadoDaPoeira {
    return derivarEstadoDaPoeira({
      poeiraModoPedido: this.poeiraModoPedido,
      poeiraCarga: this.poeiraCarga,
      poeiraFonte: this.poeiraFonte,
      poeiraModoEfetivo: this.nebula.poeiraModoEfetivo,
      poeiraAssentada: this.nebula.poeiraAssentada,
    });
  }

  /** o último veredito que `publicarPoeira` de fato mandou ao React —
   *  `null` antes da primeira publicação. */
  private ultimoEstadoDaPoeiraPublicado: EstadoDaPoeira | null = null;

  /**
   * Publica `estadoDaPoeira` para o React — ver `DirectorEvents.onPoeira`.
   * SÓ dispara quando `situacao`/`fonte` de fato mudam (item B, revisão
   * independente v2, 27/09): chamada a cada `tick()` agora (e não só
   * nos pontos que mudam o pedido/a carga), para a transição que só a
   * `Nebula` decide por conta própria — o bake que assenta o bloco, num
   * quadro futuro, sem nenhum evento explícito — sair do "carregando"
   * no primeiro quadro em que já é verdade, em vez de ficar presa até o
   * próximo disparo de `tentarCarregarPoeira`/`publicarQualidade`. Sem a
   * guarda, chamar isto por quadro republicaria o MESMO estado a 60 Hz.
   */
  private publicarPoeira() {
    const atual = this.estadoDaPoeira;
    const anterior = this.ultimoEstadoDaPoeiraPublicado;
    if (anterior && anterior.situacao === atual.situacao && anterior.fonte === atual.fonte) {
      return;
    }
    this.ultimoEstadoDaPoeiraPublicado = atual;
    this.events.onPoeira(atual);
  }

  /**
   * SÓ O RÓTULO, sem fôlego: é o que a carga em worker precisa. Os ~5 s
   * de CPU pesada (os dois bakes de mapa e a população) rodam fora da
   * thread desde os Ajustes B, e é o próprio worker quem avisa a etapa
   * que está começando — a thread está livre para pintar sozinha, e um
   * `setTimeout(0)` no meio do aviso só atrasaria o rótulo.
   */
  private rotular(id: LoadStageId) {
    const stage = LOAD_STAGES.find((s) => s.id === id);
    if (stage) this.events.onStage(stage);
  }

  /**
   * Rótulo de etapa + fôlego para o browser PINTAR o rótulo, para as
   * etapas que AINDA congelam a thread. O init tinha ~5 s de CPU
   * síncrona (bakes 1,6 s + buildGalaxy 3,27 s) e o loader congelava
   * junto — parecia travado exatamente enquanto mais trabalhava. Barra
   * por byte não conserta (a rede é a fatia pequena; ela pararia em
   * 100%). setTimeout(0) e não rAF: em aba de fundo o rAF é estrangulado
   * e o init nunca terminaria. O conserto DEFINITIVO é o Worker, e ele
   * já cobre `dust`, `structure` e `galaxy` (`montarCarga`); o que
   * sobra bloqueando é `layers` (bake por GPU) e o prime do Sol — fila
   * do C. Para essas, isto continua sendo o que dá para honestamente
   * prometer: o espectador vê O QUE está acontecendo.
   */
  private async stage(id: LoadStageId) {
    this.rotular(id);
    await new Promise<void>((r) => setTimeout(r, 0));
  }

  async init() {
    await this.stage('catalogs');
    const {
      stars: { stars: starArrays, meta },
      galactic,
      cartMode,
    } = await this.assets;
    if (this.disposed) return;
    this.meta = meta;
    await this.stage('stars');

    // expoM0 é o "tempo de exposição": a magnitude aparente cujo pico de
    // PSF chega a 1. Com 3,5 as ~40 estrelas mais brilhantes do céu
    // saturam e ganham disco e spikes; o resto fica sub-saturado, que é
    // o que devolve ao campo os 8,6 mag de faixa dinâmica do catálogo.
    // O halo buildFarStars (mag 7,2–10,6 estático no Sol) morreu na
    // unificação 2: as cascas de wrappedStars cobrem essa população em
    // QUALQUER ponto do disco, com a mesma PSF e anti-dupla-contagem.
    this.stars = new StarField(starArrays, {
      expoM0: CALIBRACAO_DA_CASA.expoM0,
      sigmaPx: CALIBRACAO_DA_CASA.sigmaPx,
      tau: 0.045,
    });
    // ...e a LUT da faixa deixa de emitir de novo a luz que este campo
    // acabou de desenhar. A curva é MEDIDA nestes mesmos arrays, então
    // não tem como divergir do binário — regerar o catálogo a move
    // sozinha, o mesmo contrato que as cascas já têm com magLimit.
    this.nebula.setResolvedCurve(
      resolvedCatalogCurve(starArrays.position, starArrays.logLum)
    );
    // O CLARÃO DE ASAS (M2 da Lei): a óptica das fontes fortes por
    // orçamento de fluxo. As 16 heroes de autor, o casamento posicional
    // hero↔catálogo e a política de dominância (`aFade`) morreram com a
    // migração: o clarão é LENTE — soma óptica por cima do ponto, do
    // raio do sprite para fora, e não pede cessão a ninguém. Quem
    // decide quem o tem é o fluxo, por quadro, com histerese (§5.21).
    this.clarao = new ClaraoDeAsas(this.meta.named);
    // (o `SunStar` morreu no M1 da Lei da Estrela: o Sol de longe é o
    // ponto fotométrico da camada dos dez, em toda distância — a mesma
    // PSF do campo, sem clarão de autor por cima.)

    // AS 16 HEROES DO FILME, RESGATADAS (16/08, ordem do dono): a arte
    // de 30/07 — braço fino, halo e cruz na cor da estrela — volta como
    // era, byte a byte, e o clarão da lei fica só com o Sol. Palavras
    // dele: "resgata no git a versão certa antes de entrar o atlas".
    this.heroes = new HeroStars(this.meta.named);

    // O mapa é bakeado SEMPRE: os canais B/A (braços/warp) alimentam
    // o envelope de gás do raymarch mesmo sem APOGEE (R/G zerados).
    const cartOn = Boolean(galactic) && cartMode !== 'off';
    // POEIRA MEDIDA (E2/E3) — CARGA PREGUIÇOSA (item C) + item B da
    // revisão independente v2 (27/09): só agora `cartOn` fica sabido
    // (`cartResolvido` sobe JUNTO, na mesma linha em espírito — sem ele
    // `tentarCarregarPoeira` não tem como saber se `!cartOn` é "ainda
    // não sei" ou a decisão FINAL), então só agora `tentarCarregarPoeira`
    // pode agir — ela mesma decide: sem cartografia, falha IMEDIATA
    // (`poeiraCarga = 'falhou'`, sem ficar em 'pendente' esperando um
    // fetch que nunca vai existir); com cartografia, dispara se a fonte
    // pedida ainda não foi tentada. Sem `cartOn` não há `volumes` (o
    // manifesto nem foi buscado) e `dustVolumeManifesto` fica `null`.
    this.cartOn = cartOn;
    this.dustVolumeManifesto =
      cartOn && galactic ? galactic.volumes.dustVolumeNear20pc ?? null : null;
    // a pirâmide (E3c): só o descritor; quem busca é `garantirPiramide`
    this.dustPyramidManifesto = cartOn && galactic ? galactic.piramide ?? null : null;
    this.cartResolvido = true;
    this.tentarCarregarPoeira();
    // O CHECK DEPOIS DE CADA `stage` — e não só depois dos três awaits que
    // já o tinham. Cada `stage` cede a thread por um `setTimeout(0)`, e um
    // `dispose()` que caia nessa janela (Fast Refresh em dev, unmount no
    // meio da carga) rodava o teardown NA HORA enquanto o init seguia:
    // `buildGalaxy` (~3,3 s de CPU) e `bakeDiscLayers` realocavam ~2,7 M
    // partículas e render targets num contexto já destruído, e essa Galaxy
    // não era disposta por ninguém. Achado de auditoria externa.
    await this.stage('dust');
    if (this.disposed) return;
    // AS TRÊS ETAPAS PESADAS NASCEM NO WORKER (montarCarga,
    // carregamento.ts): poeira, campo acoplado e população saem da
    // thread juntos, e os rótulos `structure`/`galaxy` andam pelo aviso
    // do próprio worker em vez de congelar. Sem contagem no rótulo da
    // galáxia: cinema semeia 4,02 M, performance 1,1 M — um número fixo
    // mentiria em metade dos aparelhos. Dispose durante o await é o caso
    // dos stage(): o teardown já correu e ninguém mais descartaria estes
    // objetos — descarta os três e sai.
    //
    // O QUE FICA GUARDADO AQUI é o que a troca de tier viva (Ajustes C)
    // precisa para pedir o MESMO mundo com outro número: os catálogos
    // (que o worker leva por cópia e por isso continuam intactos), o
    // modo de cartografia e o tier que de fato foi assado.
    this.catalogos = cartOn ? galactic : null;
    this.cartMode = cartOn ? cartMode : 'off';
    this.tierDoMundo = this.engine.quality;
    const carga = await montarCarga({
      catalogos: this.catalogos,
      tier: this.tierDoMundo,
      aoAvancar: (etapa) => this.rotular(etapa),
    });
    if (this.disposed) {
      descartarCarga(carga);
      return;
    }
    this.dustMapTexture = carga.dustMapTexture;
    this.structureMapTexture = carga.structureMapTexture;
    this.galaxy = carga.galaxy;
    this.vestirGalaxia(this.galaxy);
    // congela as lâminas (estáticas) em texturas — depois do modo
    await this.stage('layers');
    if (this.disposed) return;
    // FATIADO POR LÂMINA (Ajustes C): eram oito render targets de 1024²
    // num bloco só — a maior tarefa longa que sobrou na thread depois
    // que a carga foi para o worker, e o loader congelava nela. O
    // fôlego entre lâminas devolve a thread ao browser; um `dispose()`
    // que caia no meio para o forno em vez de assar numa cena morta.
    if (!(await this.galaxy.bakeDiscLayers(this.engine.renderer, () => this.folego(null)))) {
      return;
    }
    const tauTex = this.galaxy.tauMapTexture;
    this.nebula.setDustMap(carga.dustMapTexture, cartOn ? 1 : 0);
    if (galactic && cartMode !== 'off') {
      this.observedClouds = new ObservedClouds(
        galactic.molecularClouds,
        galactic.largeMolecularClouds
      );
      this.starForges = new StarForges(galactic);
      // Extinção por coluna das forjas: a auditoria da rodada 26 achou a
      // chamada ANTES da criação (?. engolia em silêncio) — ela NUNCA
      // ligou, e toda a dosagem edge das rodadas 15–25 foi calibrada com
      // as forjas sem extinção. Ligar sob a dosagem atual foi MEDIDO:
      // edge 0,6441 → 0,7862 (thickRatio 0,050→0,040 quebra) e face
      // 0,0333 → 0,0301 (melhora). Fica DESLIGADA por padrão até a
      // rodada de re-dosagem sob o regime corrigido; ?forgetau=1 liga
      // para varrer. Detalhe no NORTE.
      if (tauTex && this.debug.has('forgetau')) {
        this.starForges.setTauMap(tauTex);
      }
      this.engine.scene.add(this.observedClouds.mesh);
      // O CÉU DAS NUVENS classifica o campo (item 37): quem não tem nuvem
      // viva entre si e o Sol passa a desenhar DEPOIS do quad
      // multiplicativo e para de ser apagado por poeira que está atrás
      // dele. Uma vez só, aqui, porque é aqui que as nuvens existem.
      const livres = this.stars.marcarNuvensNaFrente((x, y, z) =>
        this.observedClouds!.temNuvemNaFrente(x, y, z)
      );
      console.info(
        `[nuvens] ${livres} estrelas do catálogo na frente de todas as nuvens ` +
          'da visada — desenham depois do quad multiplicativo'
      );
      this.engine.scene.add(this.starForges.points);
      this.nuvensSemente.construir(galactic, this.nebula);
      console.info(
        `[cartografia] APOGEE ${(carga.coberturaDaPoeira * 100).toFixed(1)}% ` +
          'do disco; campo acoplado com ' +
          `${(carga.coberturaDeGas * 100).toFixed(1)}% ` +
          'de suporte material e ' +
          `${(carga.coberturaDeJovens * 100).toFixed(1)}% ` +
          'de suporte em traçadores jovens.'
      );
    }
    if (this.disposed) return;

    // canais B/A do dust map alimentam a densidade das cascas (1 fetch
    // no lugar dos braços/warp analíticos por vértice — medido +5 ms)
    this.wrappedStars = new WrappedStars(this.dustMapTexture, {
      magLimit: this.meta.magLimit,
      horizonPc: this.meta.horizonPc,
    });
    this.engine.scene.add(this.wrappedStars.points);
    // Sagittarius A* — passe de pós que só liga perto do centro
    // (custo ZERO desligado: o composer o pula; shader compila na
    // primeira aproximação). Ver blackHole.ts.
    this.blackHole = new BlackHolePass();
    this.blackHole.setQuality(this.engine.quality);
    this.post.addBlackHole(this.blackHole);
    this.engine.scene.add(this.stars.points);
    // a SEGUNDA passada do campo (item 37) — a de quem está na frente de
    // todas as nuvens da visada, desenhada depois do quad multiplicativo.
    // Nasce invisível e só acende quando o céu das nuvens é classificado.
    this.engine.scene.add(this.stars.pontosNaFrente);
    // a camada 3D nasce preguiçosa: só importa/instancia se a beta
    // ligar um dia nesta sessão (setRotulos3d)
    this.engine.scene.add(this.sun.group);
    this.engine.scene.add(this.dust.points);
    this.engine.scene.add(this.clarao.group);
    this.engine.scene.add(this.heroes.group);
    this.engine.scene.add(this.galaxy.group);
    // O COBERTOR DO CAMPO (R2 do item 44, "cada camada com seu cobertor"):
    // as três camadas de estrelas vivem TAMBÉM na CAMADA_DO_CAMPO — é por
    // ela que o ClaraoDoCampo (post.ts) as re-desenha para vestir o kernel
    // do filme SÓ nelas. Sol, clarão, planetas, poeira, galáxia e nebulosa
    // ficam na camada 0, sob a pirâmide da lei.
    this.stars.points.layers.enable(CAMADA_DO_CAMPO);
    this.stars.pontosNaFrente.layers.enable(CAMADA_DO_CAMPO);
    this.wrappedStars.points.layers.enable(CAMADA_DO_CAMPO);
    this.heroes.group.traverse((o) => o.layers.enable(CAMADA_DO_CAMPO));
    // Os 10 pontos fotométricos (Onda 4, D3). Grupo PRÓPRIO na cena,
    // NUNCA dentro de `sun.group` — de lá herdaria a escala 0,005 do
    // doador e o `return` antecipado quando o disco apaga.
    //
    // O INSTRUMENTO É O DA CASA (M4 da Lei): a MESMA `CALIBRACAO_DA_CASA`
    // que o campo de catálogo recebe acima. A camada era construída com
    // o PRÓPRIO `StarField` no lugar do instrumento — lia a PSF do
    // material do campo —, e o efeito colateral disso era mudo: mover o
    // ponto-zero do catálogo (o gate do M3) teria
    // movido os dez corpos junto, sem uma linha dizendo isso. Passando os
    // dois pelo mesmo objeto, a fotometria planeta↔estrela continua
    // relativa de verdade PORQUE ambos são clientes da lei, não porque um
    // deles copia do outro.
    this.planetas = new Planetas(CALIBRACAO_DA_CASA);
    this.engine.scene.add(this.planetas.points);
    // AS LINHAS DE ÓRBITA (item 77): quarto irmão, pela mesma razão da
    // linha acima. Construtor barato — 30 laços vazios (os nove do
    // retrato e as 21 luas), sem uma pergunta à efeméride: a primeira
    // cônica é escrita no tick, quando o motor existir (`orbitas.ts`, §6).
    this.orbitas = new Orbitas();
    this.engine.scene.add(this.orbitas.group);
    // O PALCO LOCAL (Onda 6, F0): o grupo dos corpos resolvidos entra
    // irmão dos dois acima. Desde a F2a ele tem o primeiro morador: a
    // Terra — construtor barato, sem geometria e sem um byte de textura
    // (a carga é preguiçosa por contrato; as 18 vistas não fazem fetch).
    // O teto de textura congela AQUI (é do aparelho); o TIER, não — ele
    // entra por FUNÇÃO, lida na primeira carga E a cada tick de quem já
    // carregou (o double-buffer do item 59). É o que faz a troca de tier
    // viva (Ajustes C) alcançar os corpos sem os reconstruir —
    // reconstruir tirava o globo da tela por ~2 s, o véu que a letra C
    // proíbe.
    const corpos = montarCorposDoPalco({
      tier: () => this.engine.quality,
      maxTextureSize: sondarGl().maxTextureSize,
      base: import.meta.env.BASE_URL,
      pinos: () => this.filme.pinos,
    });
    this.lua = corpos.lua;
    this.rochosos = corpos.rochosos;
    this.gigantes = corpos.gigantes;
    this.noPalco = corpos.noPalco;
    for (const { corpo } of this.noPalco) {
      this.palco.group.add(corpo.group);
    }
    this.engine.scene.add(this.palco.group);
    this.engine.scene.background = this.nebula.texture;
    this.engine.scene.backgroundIntensity = 1.0;

    // Pré-compilação sob o véu: sem ela, o primeiro uso de cada programa
    // espera o link do ANGLE/FXC bloqueando a thread (medido a frio:
    // ~10–15 s congelados na intro; e o BH compilava sozinho no meio do
    // mergulho, t≈187). KHR_parallel_shader_compile compila em threads
    // do driver — aqui só se espera, com a thread viva. Os quads de pós
    // (nebulosa, BH) não estão na cena: entram por uma cena descartável.
    // Captura (?shot=) pula: o polling queimaria o virtual-time-budget,
    // e sob tempo virtual o stall síncrono de sempre não custa nada.
    if (!this.shotMode) {
      await this.stage('shaders');
      if (this.disposed) return;
      // A chave de programa do three inclui o colorSpace de SAÍDA, que é
      // "tela" quando nenhum render target está amarrado — e no frame real
      // tudo renderiza DENTRO do composer (linear). Compilar sem RT gera a
      // variante errada e o primeiro frame re-linka tudo (medido: 8,7 s).
      const { warm, warmRt, descartar } = montarCenaDeAquecimento({
        comNormal: this.nebula.warmupMaterials,
        semNormal: [
          ...(this.blackHole?.warmupMaterials ?? []),
          ...this.post.warmupMaterials,
        ],
      });
      this.engine.renderer.setRenderTarget(warmRt);
      try {
        // guardado porque o dispose PRECISA esperar por ele: o
        // compileAsync do three faz polling por setTimeout lendo
        // `materialProperties.currentProgram`, e renderer.dispose()
        // apaga essas propriedades — o polling seguinte estoura com
        // "isReady of undefined", fora de qualquer try/catch nosso
        this.warmup = Promise.all([
          this.engine.renderer.compileAsync(this.engine.scene, this.engine.camera),
          this.engine.renderer.compileAsync(warm, this.engine.camera),
        ]);
        await this.warmup;
      } finally {
        this.warmup = null;
        this.engine.renderer.setRenderTarget(null);
        descartar();
      }
      if (this.disposed) return;
    }

    this.setPhase('intro');
    this.engine.start();
    // A CORRIDA DO PAINEL ABERTO DURANTE A CARGA (`?ajustes=1`): um
    // clique em outro tier no meio do init muda o instrumento na hora,
    // mas o mundo já saiu do forno com o tier anterior. Aqui os dois se
    // reconciliam — sem esta linha o app ficaria com "performance" no
    // seletor e a população de cinema na placa, e nenhum clique
    // seguinte consertaria (o tier pedido já é o vivo).
    if (this.engine.quality !== this.tierDoMundo) {
      void this.reassarMundo(this.engine.quality);
    }
  }

  /**
   * A única porta de troca de fase — e, desde a Onda 5, a única DONA do
   * escritor de câmera. Antes três lugares ligavam e desligavam o
   * `enabled` do FreeRoam à mão (`play`, `enterFreeRoam`, `placeCamera`);
   * com a terceira via seriam seis, e "quem manda na câmera agora" não
   * teria resposta num lugar só. Agora tem: `ESCRITOR_DE_CAMERA`.
   */
  private setPhase(p: Phase) {
    this.phase = p;
    // fase nova, tela nova: nada dela foi desenhado ainda (ver
    // `quadrosDaFase` — é o que mantém o deep-link seco)
    this.quadrosDaFase = 0;
    this.escritorDeCamera = ESCRITOR_DE_CAMERA[p];
    // trocar de fase encerra o gesto da roda: meio empurrão guardado não
    // pode virar degrau na próxima entrada no Atlas
    this.gestos?.esquecerRoda();
    this.roam.enabled = this.escritorDeCamera === 'voo';
    this.events.onPhase(p);
    // o HUD da fase nova pode ter mostrador de tempo, e ele monta com o
    // valor de agora em vez de esperar o primeiro passo do relógio
    this.maquinaDoTempo.publicarTempo();
    this.perturbar();
  }

  /** a fase viva — o App precisa dela para a guarda de atalhos */
  get fase(): Phase {
    return this.phase;
  }

  /** a viagem está congelada? (o pause-look tem dois donos — ver D3) */
  get pausado(): boolean {
    return this.freezeJourney;
  }

  // ---- sinal de prontidão para captura -----------------------------
  /**
   * Quadros DESENHADOS desde a última carga/alteração de estado que muda o
   * que a tela mostra. É o coração do `captura` logo abaixo, e ele só é
   * escrito em dois lugares: `perturbar()` (zera) e o fim do `tick` (soma
   * 1, depois do `post.render`).
   */
  private quadrosEstaveis = 0;

  /**
   * Quadros DESENHADOS desde a última troca de fase — a resposta a "o
   * visitante já viu alguma coisa NESTE modo?". Separado do
   * `quadrosEstaveis` de propósito: aquele zera a cada gesto (é sobre
   * estabilidade da cena), e este só zera ao trocar de fase (é sobre o
   * modo já estar na tela). Quem o lê é `rampaDaEscada` — sem um quadro
   * do modo desenhado não existe pose de partida para o olho seguir, e
   * é essa a diferença entre o `?foco=` do boot (seco) e o clique do
   * visitante (com rampa).
   */
  private quadrosDaFase = 0;

  /** algo mudou o que a cena mostra — a contagem de estabilidade recomeça */
  private perturbar() {
    this.quadrosEstaveis = 0;
  }

  /**
   * O PONTEIRO PASSOU AQUI (item 120, F1 · L11): um hit-test só,
   * consumido por DOIS — o cursor, que quer saber se há algo clicável, e
   * a linha de órbita, que quer saber DE QUEM.
   *
   * É AQUI QUE "APONTAR O NOME ACENDE A ÓRBITA" acontece, e a direção é
   * a do Eyes: lá o `mouseenter` mora no `<div>` do RÓTULO e dispara o
   * `hoverchange` que o `TrailManager` escuta; não há picking da
   * geometria da linha em lugar nenhum. Aqui o rótulo é canvas 2D e não
   * tem `<div>` para escutar — o equivalente exato é o hit-test da lista
   * ÚNICA de rótulos desenhados, o mesmo que o clique usa.
   *
   * SÓ CORPO TEM ÓRBITA: uma estrela ou o centro galáctico apontados
   * devolvem `true` para o cursor e APAGAM o hover, porque não há linha
   * deles a acender. `hover` guarda o id do corpo, sem o prefixo da
   * chave, que é a régua que `Orbitas` fala.
   */
  private apontarRotulo(x: number, y: number): boolean {
    const chave = this.escada.chaveApontada(x, y);
    if (this.orbitas) {
      this.orbitas.hover =
        chave?.startsWith(CHAVE_DE_CORPO) === true
          ? chave.slice(CHAVE_DE_CORPO.length)
          : null;
    }
    // O SEGUNDO EFEITO DO MESMO GESTO (item 125, F2 · A12/A13): o alfa
    // do TEXTO do nome apontado sobe ao topo. Vale para qualquer rótulo
    // — estrela e centro galáctico inclusive, que não têm linha a
    // acender — porque no Eyes o `:hover` mora na folha do `<div>` do
    // rótulo, e todo rótulo tem um.
    this.rotulos.apontado = chave;
    return chave !== null;
  }

  /** o ponteiro saiu do alcance do gesto — a órbita apagada junto com a
   *  promessa do cursor (ver `apontarRotulo`) */
  private apagarHover() {
    if (this.orbitas) this.orbitas.hover = null;
    this.rotulos.apontado = null;
  }

  /**
   * A CENA ESTÁ ESTÁVEL PARA CAPTURAR? Bandeira somente-leitura que o
   * harness de identidade espera no lugar de contar 700 quadros no
   * escuro. A COLETA dos termos é daqui (só o director conhece os
   * donos); o JULGAMENTO e a doutrina inteira moram em
   * `director/prontidao.ts` (Parte 1, corte 3). Preserva
   * `window.__director.captura.pronto` — o contrato do harness.
   */
  get captura() {
    const andando =
      (this.phase === 'journey' && !this.freezeJourney) ||
      (this.phase === 'free' && this.roam.animando) ||
      // ENTRADA/SAÍDA DO ATLAS: o véu em curso (ou já pedido e ainda
      // não fechado) é movimento na tela como qualquer outro. O rig do
      // Atlas em si não anima — o reposicionamento acontece atrás do
      // véu —, então este é o único termo novo que a fase traz.
      this.veuDoAtlas.emCurso ||
      // A MÁQUINA DO TEMPO (F4): relógio andando é cena mudando, e
      // efeméride em voo é uma mudança JÁ PEDIDA que ainda não chegou.
      // Sem os dois termos, o `?jd=` do gate poderia ser capturado no
      // quadro anterior à escrita do instante — e a captura mediria a
      // corrida, não a imagem.
      this.maquinaDoTempo.aoVivo ||
      this.maquinaDoTempo.sentidoDoTempo !== 0 ||
      this.maquinaDoTempo.faseDaEfemeride === 'buscando' ||
      // A TERRA (F2a) e A LUA (F2b) e OS ROCHOSOS (F3): textura em voo
      // é uma mudança JÁ PEDIDA que ainda não chegou — capturar antes
      // dela mediria a corrida, não a imagem (o mesmo argumento da
      // efeméride acima).
      this.noPalco.some((p) => p.carregando) ||
      // A RAMPA ENTRE DEGRAUS (F2b/D7): o rig anima entre dois
      // enquadramentos — cena mudando por construção até assentar
      this.atlas.animando ||
      // TROCA DE TIER EM VOO (Ajustes C): mudança JÁ PEDIDA que ainda
      // não chegou — o mesmo argumento da efeméride e da textura acima.
      // Sem este termo o gate fotografaria o mundo VELHO com o `?q=`
      // novo no selo, e mediria a corrida em vez da imagem.
      this.trocaPedida !== null ||
      // O REALCE DO FOCO (item 83 · L1): as linhas de órbita atravessam
      // do neutro para a hierarquia em ~0,45 s, e uma vista de `?foco=`
      // fotografada no meio da travessia devolveria md5 diferente a cada
      // corrida. Mesmo papel de `atlas.animando` logo acima — cena
      // mudando por construção até assentar.
      (this.orbitas?.animando ?? false);
    // CORPO NO GATE A FRIO (auditoria item 5b): o gate diz que o corpo
    // devia estar na tela e a textura não está quente — capturar agora
    // fotografaria o ponto (ou nada) fingindo a vista do globo. O
    // precedente é `sun.assentado`: prontidão espera o retrato completo.
    const corposAssentados = !this.noPalco.some((p) => p.friaNoGate);
    // O RETRATO ACUSADO (item 5c): efeméride PEDIDA indisponível com os
    // corpos em cena segura a janela da retentativa (o tick conta os
    // quadros e dá o aviso único quando ela esgota — ver o bloco no tick).
    const fonteAssentada = !(
      this.palco.ligado &&
      this.maquinaDoTempo.faseDaEfemeride === 'indisponivel' &&
      this.quadrosTentandoFonte < QUADROS_TENTANDO_FONTE
    );
    // A POEIRA MEDIDA (E2): sem cartografia o fetch nem é disparado (ver
    // `init`) — `this.cartMode` só vira 'off' depois que `init` resolve
    // se ligar ou não (linha do `this.cartMode = cartOn ? cartMode :
    // 'off'`), então nada a esperar aqui cobre TANTO `?cart=off` quanto
    // um `loadGalacticAssets` que falhou. Fora disso, quem decide é a
    // própria Nebula (variante, modo pedido, bloco carregado e assado).
    // `noNebula` (?nonebula=1 ou aba escondida): o gás nem é desenhado,
    // então um bake pendente da poeira não é motivo para esperar.
    // CARGA EM VOO com a poeira pedida (a troca de fonte, ver
    // `tentarCarregarPoeira`): a Nebula já soltou o volume velho e, com o
    // pedido encerrado, se diria assentada — quem sabe que um volume novo
    // vem aí é esta instância, e a captura espera ele ou o veredito de falha.
    const poeiraEmVoo = this.poeiraModoPedido !== 0 && this.poeiraCarga === 'carregando';
    // A PIRÂMIDE (E3c): os índices em voo seguram; depois, a Nebula diz
    // quando a residência assentou (ou o teto dela venceu)
    const piramideAssentada = this.piramideCarga !== 'carregando' && this.nebula.piramideAssentada;
    const poeiraAssentada =
      this.cartMode === 'off' ||
      this.noNebula ||
      (this.nebula.poeiraAssentada && !poeiraEmVoo && piramideAssentada);
    return julgarProntidao({
      fase: this.phase,
      andando,
      solAssentado: this.sun.assentado,
      corposAssentados,
      fonteAssentada,
      poeiraAssentada,
      quadrosEstaveis: this.quadrosEstaveis,
      tier: this.engine.quality,
      tierDoMundo: this.tierDoMundo,
    });
  }


  /** posiciona a câmera em modo livre (deep-links/screenshots ?pos=) */
  placeCamera(pos: [number, number, number], look?: [number, number, number]) {
    const cam = this.engine.camera;
    cam.position.set(pos[0], pos[1], pos[2]);
    if (look) cam.lookAt(look[0], look[1], look[2]);
    // quem liga o escritor é o `setPhase` lá embaixo (mapa fase→rig);
    // `syncFromCamera`/`snapCanonical` não dependem do `enabled`
    this.roam.syncFromCamera();
    // captura/deep-link: sem slerp de entrada — orientação exata no frame 1
    this.roam.snapCanonical();
    this.nuvensSemente.zerar(cam.position, this.nebula);
    this.setPhase('free'); // e o setPhase zera a contagem de estabilidade
    this.events.onCaption(-1, '', '');
    this.events.onWarp(0);
  }

  /**
   * A ESCOLHA DO FILME (`?filme=`, E1 da viagem solar): troca o filme em
   * cartaz sem tocá-lo — o `play()` sem argumento toca o escolhido. Id
   * ausente é o galáctico; desconhecido avisa e também cai nele.
   */
  escolherFilme(id: string | null | undefined) {
    const filme = filmeDe(id);
    if (filme === this.filme) return;
    this.filme = filme;
    this.rig.carregar(filme.journey, filme.cima);
  }

  /** o id do filme em cartaz — o espelho da URL o escreve quando não é o padrão */
  get filmeEscolhido(): string {
    return this.filme.id;
  }

  play(id?: string) {
    // o filme troca ANTES de o relógio e o rig recomeçarem
    if (id !== undefined) this.escolherFilme(id);
    this.journeyT = 0;
    this.lastCaptionIdx = -1;
    this.lastCaptionTexto = '';
    this.freezeJourney = false;
    this.playbackRate = 1;
    this.rig.reset();
    // O FILME TOMA O RELÓGIO DO CÉU (item 228), pela mesma parada do
    // `partirDoAtlas` — esta é a outra porta do filme. O Atlas abre AO
    // VIVO por desenho, e o "Ver o filme" (de dentro dele, do voo livre
    // ou o "Reviver" da tela final) deixava esse relógio andando por
    // baixo do filme: na viagem o tick corrige o instante a cada quadro
    // e ninguém via; na tela final o tick para de corrigir e, em menos
    // de 1 s, o AO VIVO escrevia a data de agora — a Terra girava de
    // repente da América do Sul para outro lado (medido em 29/09, nos
    // três formatos: câmera, lente e tela idênticas, só o relógio mudou).
    this.maquinaDoTempo.andarNoTempo(0);
    this.setPhase('journey');
  }

  /**
   * Salta para um instante da viagem (segundos) — usado por deep-links.
   *
   * O TETO É PARTE DO CONTRATO: `?t=` vem de fora e não tem limite, e sem
   * ele o `journeyT` guardava o número cru (99999 com duração 321, medido
   * no navegador). Ele vaza para o link de retomada, que o HUD monta a
   * partir do `currentTime`, e faz `onProgress` depender de um `min` a
   * jusante para não passar de 1. Achado de auditoria externa.
   */
  seek(t: number) {
    this.journeyT = Math.min(t, this.rig.duration);
    this.rig.reset(); // a mira suavizada também salta para o instante certo
    // ...e a cessão dos corpos também: sem isto o ponto de luz animava
    // 300 ms a partir do instante ANTERIOR (o ponto branco sobre Júpiter
    // aos 158 s do solar, 06/10). Só o salto, não `teletransportou()`:
    // o seek anda pelo trajeto do próprio filme, e derrubar a LUT do
    // raymarch mudaria o céu de todo link `?t=` e custaria um recálculo
    // a cada passo do scrub.
    this.saltoDeCamera = true;
    this.perturbar();
  }

  get journeyDuration() {
    return this.rig.duration;
  }

  /** A efeméride precisa estar viva antes da chegada declarada no roteiro. */
  private get palcoQuente(): boolean {
    return efemeridesPrecisamPreCarga(this.phase, this.journeyT, this.filme.apoios);
  }

  /** instante atual da viagem — para gravar o momento num link */
  get currentTime() {
    return this.journeyT;
  }

  /** pausa/retoma a viagem; retorna o novo estado (true = pausado) */
  togglePause(): boolean {
    if (this.phase !== 'journey') return false;
    this.freezeJourney = !this.freezeJourney;
    this.perturbar();
    return this.freezeJourney;
  }

  /** início do Ato IV — o botão "Ir à galáxia" salta para cá; `null`
   *  quando o filme em cartaz não tem galáxia a revelar */
  get revealTime(): number | null {
    return this.filme.revealT;
  }

  /**
   * Troca AO VIVO uma camada — TODAS as do painel, desde 2026-08-12.
   * As três da galáxia (nodisc/nogdust/noglow) recarregavam a página por
   * um motivo que nunca existiu ("são lidas no bake"): o bake roda
   * inteiro de qualquer jeito, e elas só governam visibilidade e bind
   * por quadro. Aqui elas são ROTEADAS para quem as lê — a Galaxy —, sem
   * o Director repetir a lista de flags dela.
   */
  setLayerHidden(flag: string, hidden: boolean) {
    // antes do desvio: o ramo da nebulosa também muda a tela, e sair por
    // ele sem zerar a contagem daria cena "estável" com a camada trocando
    this.perturbar();
    if (flag === 'nonebula') {
      this.noNebula = hidden;
      return;
    }
    if (hidden) this.hide.add(flag);
    else this.hide.delete(flag);
    this.galaxy?.setLayerHidden(flag, hidden);
  }

  // ---- pausar-e-olhar (viagem congelada) -------------------------
  /**
   * A BETA DOS RÓTULOS 3D (item 109) — liga/desliga ao vivo, pelo
   * Ajustes. O 2D continua dono das leis; a camada 3D só pinta.
   */
  setRotulos3d(ligado: boolean) {
    this.rotulos3dLigado = ligado;
    if (ligado && !this.rotulos3d) {
      import('./world/rotulos3d')
        .then((m) => {
          if (this.disposed) return;
          this.rotulos3d = new m.Rotulos3d(this.engine.scene);
          this.perturbar();
        })
        .catch((error) => {
          // o chunk vem pela rede (404 de deploy novo, queda): sem este
          // braço a rejeição ficava sem tratamento e a beta "ligada"
          // apagava os nomes PARA SEMPRE — o gate de `texto3d` exige o
          // pintor vivo, então o 2D segue pintando sozinho
          console.warn('[rotulos3d] a carga da beta falhou; os nomes seguem no 2D.', error);
        });
    }
    this.perturbar();
  }

  private get pauseLookActive() {
    return this.phase === 'journey' && this.freezeJourney;
  }

  // ---- a escada do Atlas (corte 9 — director/escada.ts) ------------
  // O assunto inteiro — clique, busca, casa viva, degraus, religador do
  // relógio e reaplicação pós-efeméride — mora no módulo `Escada`; aqui
  // ficam as delegações de 1 linha que o App, o HUD, os gates
  // (`window.__director`) e as fiações do construtor já chamavam, com
  // as MESMAS assinaturas. O tick segue chamando `recomporAlvo()` no
  // mesmo ponto, e `entrarNoAtlas` segue chamando `focarNoSistema()`.

  focarNoSistema() {
    this.escada.focarNoSistema();
  }

  /** o destino do clique num rótulo, escolhido pelo NOME (busca, F3) */
  visitarEstrela(estrela: { n: string; x: number; y: number; z: number }) {
    this.escada.visitarEstrela(estrela);
  }

  /** as 1.726 nomeadas — o índice da busca monta sobre esta lista */
  get nomeadas(): readonly NamedStar[] {
    return this.escada.nomeadas;
  }

  /** os dez + luas + anões, para o índice da busca (F5) */
  get corpos(): readonly CorpoBuscavel[] {
    return this.escada.corpos;
  }

  focarNoCorpo(id: string, ver: VerDaEscada = 'orbita') {
    this.escada.focarNoCorpo(id, ver);
  }

  aproximarDoCorpo() {
    this.escada.aproximarDoCorpo();
  }

  /** o interruptor da ficha (relevo fingido da cor) do corpo em foco —
   *  `null` onde ele não existe (Terra, Lua, gigantes, esculpidos e todo
   *  rochoso com relevo medido ou bump zerado). */
  relevoDaCor(id: string | null): boolean | null {
    return this.rochosos.find((r) => r.corpo.id === id)?.corpo.relevoDaCor ?? null;
  }

  definirRelevoDaCor(id: string, ligado: boolean) {
    this.rochosos.find((r) => r.corpo.id === id)?.corpo.definirRelevoDaCor(ligado);
    this.perturbar();
  }

  focarNaLua(id: string = 'moon') {
    this.escada.focarNaLua(id);
  }

  subirDegrau(): boolean {
    return this.escada.subirDegrau();
  }

  /**
   * O `ver` vivo. Desde 22/08 (item 73) ele é LIDO e não ESCRITO: a
   * porta `?ver=` continua abrindo todo link antigo, e quem espelha a
   * vista é `?d=` — duas portas para a mesma grandeza seriam duas
   * verdades (AGENTS §4), e `?ver=` não sabe dizer "2,4 raios". O
   * getter fica porque a escada o publica e a bancada o lê.
   */
  get verDaEscada(): VerDaEscada {
    return this.escada.verDaEscada;
  }

  /**
   * A DISTÂNCIA AO ALVO EM RAIOS DELE — o que a porta `?d=` espelha.
   * `null` quando o visitante não pinou nada: aí a URL cala e o link
   * reproduz o ENQUADRAMENTO, que é a conta de sempre, bit a bit.
   */
  get distanciaEmRaios(): number | null {
    return this.atlas.distanciaEstaPinada ? this.atlas.distanciaEmRaios : null;
  }

  /** a porta `?d=` do boot — ver `Escada.pinarEmRaios`. */
  pinarEmRaios(raios: number | null) {
    this.escada.pinarEmRaios(raios);
    this.perturbar();
  }

  get escadaViva(): EstadoDaEscada {
    return this.escada.escadaViva;
  }

  /** o religador do relógio — o tick o chama quando o instante muda */
  private recomporAlvo() {
    this.escada.recomporAlvo();
  }

  /** scrub pela barra de progresso (fração 0..1) */
  seekFraction(fraction: number) {
    if (this.phase === 'end') this.play();
    this.seek(THREE.MathUtils.clamp(fraction, 0, 1) * this.rig.duration);
  }

  /** setas ←/→: salta para o capítulo anterior/seguinte (as legendas) */
  skipChapter(dir: 1 | -1) {
    if (this.phase !== 'journey') return;
    const times = this.rig.ticks.map((k) => k.t * this.rig.duration);
    if (dir > 0) {
      const next = times.find((x) => x > this.journeyT + 0.5);
      if (next !== undefined) this.seek(next);
    } else {
      // como em players de vídeo: volta ao início do capítulo atual;
      // apertando de novo (perto do início), ao anterior
      const prevs = times.filter((x) => x < this.journeyT - 2.5);
      this.seek(prevs.length ? prevs[prevs.length - 1] : 0);
    }
  }

  /** 1× → 2× → 4× → 1× */
  cyclePlaybackRate(): number {
    this.playbackRate = this.playbackRate >= 4 ? 1 : this.playbackRate * 2;
    return this.playbackRate;
  }

  enterFreeRoam() {
    this.roam.syncFromCamera();
    this.setPhase('free');
    this.events.onCaption(-1, '', '');
    this.events.onLabels([]);
    this.events.onWarp(0); // a vinheta de warp ficava presa no CSS
  }

  /**
   * A CAPTURA DE PONTEIRO do voo livre (Onda 5, F5). O HUD é quem
   * OFERECE o opt-in, e é por aqui que ele pede e pergunta; as quatro
   * defesas (backoff, dispose, soltar as teclas no unlock, listener de
   * movimento só com lock) moram no rig, que é o dono das teclas.
   */
  get capturaDePonteiro() {
    return this.roam.captura;
  }

  /**
   * O ZOOM DA RODA AINDA TEM EMBALO? Porta de LEITURA, publicada junto
   * com `captura` em `window.__director` pelo mesmo motivo dela: quem
   * observa o app de fora pergunta "CHEGOU?" e não "passaram N ms?"
   * (§7 — se o juiz não cobre, cria-se a vista que cobre). Não move um
   * pixel: só conta o que o gesto já sabia.
   *
   * `undefined` SEM PUNHO DE GESTOS, e não `false`: "não sei" não é "o
   * gesto acabou". Um `?? false` aqui desligaria sozinho o juiz que
   * espera por `=== false` no dia em que o punho sumisse.
   */
  get zoomEmbalando(): boolean | undefined {
    return this.gestos?.embalandoZoom;
  }

  /**
   * A FICHA ABRIU (ou fechou). O React é quem sabe, e a posição da
   * câmera só sobe para lá enquanto alguém a lê — a doutrina inteira
   * mora em `emitCamera`, em `director/rotulos.ts`.
   */
  lerCamera(quer: boolean) {
    this.rotulos.lerCamera(quer);
  }

  /**
   * O PASSO MÁXIMO QUE O INTEGRADOR ANDA num quadro, em segundos
   * (`GRAMPO_DO_PASSO_S`, em `core/engine.ts`). Mesma porta de leitura
   * das duas acima, e pelo mesmo motivo: o juiz do filme mede "o relógio
   * andou?" em QUADROS do app, e um quadro de filme vale este número.
   * Redigitá-lo no gate faria a régua e o integrador discordarem no dia
   * em que um dos dois mudasse.
   */
  get grampoDoPasso(): number {
    return GRAMPO_DO_PASSO_S;
  }

  // ---- portal do Atlas ---------------------------------------------

  /**
   * A PORTA `?jd=` APLICADA — o instante do céu do ATLAS, e só dele
   * (item 108, 30/08). Ela é lida em DOIS momentos, e por isso mora
   * aqui em vez de escrita duas vezes: no boot, e de novo quando o
   * Atlas abre. A segunda leitura é o que devolve o pino ao relógio
   * depois de o filme ter corrido na data DELE — sem ela, quem chega ao
   * Atlas vindo do filme (`t=250&jd=EPOCA`, o trio da prova 3 do
   * `atlas-smoke`, e o `noCorpoDoSol` da prova 18) chegaria com o
   * calendário do roteiro em vez do que pediu na URL.
   *
   * `garantirEfemerides` é idempotente e abortável: chamar de novo na
   * entrada não custa byte nenhum.
   */
  private aplicarPortaJd() {
    if (!this.debug.has('jd')) return;
    const pedido = lerPortaJd(this.debug.get('jd'), EPOCA_JD_TDB);
    if (pedido === null) console.warn('?jd= inválido:', this.debug.get('jd'));
    else {
      this.maquinaDoTempo.jdPedido = pedido;
      this.maquinaDoTempo.garantirEfemerides();
    }
  }

  /**
   * ENTRAR NO ATLAS. Só o pause-look e o deep-link `?atlas=1` chamam
   * isto. Não é travessia física: o véu fecha, a câmera é reposta pelo
   * AtlasRig e o véu abre.
   *
   * `momento` semeia a volta a partir da URL (`?atlas=1&t=…`): sem ele
   * e sem viagem em curso, o portal guarda NADA — e "Partir" devolve a
   * tela de título, que é o candidato honesto (D3).
   */
  entrarNoAtlas(opcoes: EntradaNoAtlas = {}) {
    if (this.phase === 'atlas' || this.phase === 'loading') return;
    const daViagem = this.phase === 'journey' || this.phase === 'end';
    const olhar = this.rig.olhar;
    this.retomada =
      opcoes.momento !== undefined
        ? {
            journeyT: opcoes.momento,
            lookYaw: 0,
            lookPitch: 0,
            pausado: true,
          }
        : daViagem
          ? {
              journeyT: this.journeyT,
              lookYaw: olhar.yaw,
              lookPitch: olhar.pitch,
              pausado: this.freezeJourney,
            }
          : null;
    // F2b: o Atlas é o modo em que o céu é VIVO — a abertura na época
    // (o override declarado de `focarNoSistema`) e a Lua na busca/escada
    // precisam da fonte, então o fetch nasce na entrada do modo. Sem
    // rede a degradação é a existente: retrato congelado + badge do
    // tempo dizendo a verdade ("sem efeméride"). O filme continua sem
    // pagar um byte: só quem cruza o portal chega aqui.
    this.maquinaDoTempo.garantirEfemerides();
    this.veuDoAtlas.atravessar(
      opcoes.instantaneo === true || this.reducedMotion || this.shotMode,
      () => {
      // O PORTAL LEVA A CÂMERA (item 61, §2 — 23/08). Até aqui a entrada
      // chamava `focarNoSistema()` e jogava a pose fora: t=12, t=90 e
      // t=160 saíam todos na MESMA vista, a 224 UA de casa. Agora ela
      // POUSA — posição exata, alvo derivado em três degraus (o corpo no
      // eixo de vista, senão o Sol, senão o degrau `céu`) — e o fov corta
      // para os 35° do Atlas ATRÁS DO VÉU, que é o que o véu existe para
      // cobrir.
      //
      // Sem pose de filme atrás (o `?atlas=1` puro e o botão da abertura)
      // não há o que pousar, e a vista de abertura continua sendo a
      // resposta: é o mesmo caminho de sempre, bit a bit.
      //
      // Focar ANTES da fase virar, nos dois ramos: `rampaDaEscada()`
      // ainda vê a fase velha e a reposição é seca — a entrada acontece
      // atrás do véu, nunca por rampa (D3: não é travessia física).
      // e o pouso é de quem vem do FILME COM CÂMERA VIVA (`daViagem`),
      // não de quem tem `retomada`: o deep-link `?atlas=1&t=100` também
      // guarda uma volta, mas a câmera dele é a do boot e não a do
      // instante — pousar ali fotografaria o lugar onde a intro parou.
      if (daViagem) {
        this.escada.pousarDoFilme(this.engine.camera.position.clone());
      } else {
        this.focarNoSistema();
      }
      this.setPhase('atlas');
      // O RELÓGIO DO CÉU ABRE ANDANDO (item 61, §3 — 23/08). O Atlas é o
      // relógio do VISITANTE, e nascia parado: o mostrador dizia uma data
      // e ficava nela para sempre, como se o céu fosse um retrato. É o
      // que o NASA Eyes faz, e é o que faz o app parecer ligado ao mundo.
      //
      // O CUSTO EM QUADRO É ZERO NA PRÁTICA: `andarORelogio` relê o
      // calendário a 1 Hz (`PASSO_DO_AO_VIVO_S`) e `recomporAlvo` roda uma
      // vez por INSTANTE de céu, não por quadro.
      //
      // E A HONESTIDADE QUE ISTO PEDE, escrita aqui porque é aqui que a
      // decisão mora: 1× NÃO MOVE PIXEL. A conta foi feita na abertura
      // interna (~9,1 UA, onde 1 UA valia ~156 px): a Terra anda
      // 2,0e-7 UA/s, ou seja 3,1e-5 px/s — um pixel a cada nove horas.
      // Desde 29/08 a abertura é o sistema inteiro (~134 UA, item 61) e
      // sobra ainda MAIS folga: 1 UA vale ~11 px e nada visível anda. O
      // que ganha vida é o MOSTRADOR (a data corre) e o Sol de perto,
      // onde o relógio rápido já mexia. Quem quiser movimento muda a
      // VISTA, não o relógio.
      //
      // AS TRÊS PORTAS QUE O CALAM são as três que pedem uma cena
      // REPRODUZÍVEL: `?jd=` (o operador escolheu o instante), `?shot=`
      // (é foto) e `?t=` (veio de um instante do filme). Consequência
      // declarada: uma captura SEM nenhuma das três nunca vai assentar
      // pelo sinal — e está certo, porque a cena de fato não assenta.
      // Quem fotografa o Atlas pina `&jd=`.
      //
      // E O PINO VOLTA AQUI, ANTES da guarda (item 108): o filme corre
      // na data dele e sobrescreve o `jdPedido` a cada quadro, então a
      // porta precisa ser reaplicada na entrada — senão o `?jd=` da URL
      // valeria só até o primeiro quadro de viagem.
      this.aplicarPortaJd();
      if (
        !this.maquinaDoTempo.aoVivo &&
        !this.debug.has('jd') &&
        !this.debug.has('shot') &&
        !this.debug.has('t')
      ) {
        this.maquinaDoTempo.alternarAoVivo();
      }
      // AO CHEGAR (item 129): quem entra com um alvo na mão — a busca
      // escolhendo um corpo de fora do Atlas — enquadra-o DEPOIS que a
      // fase virou, porque `focarNoCorpo` recusa qualquer outra fase.
      // Roda atrás do véu, no mesmo tique da troca: sem quadro entre a
      // abertura e o alvo.
      opcoes.aoChegar?.();
    });
  }

  /**
   * PARTIR. Devolve os QUATRO do portal de uma vez — o instante, os dois
   * ângulos do olhar e a pausa (um campo só desde 21/08: o
   * `freezeJourney` escreve o `rig.paused`). O `reset()` antes do
   * `restaurarOlhar` é de propósito: ele arma o salto do primeiro
   * quadro, que recompõe mira e fov exatamente a partir do instante.
   *
   * E PARA O RELÓGIO DO CÉU, porque ele é do Atlas: o `andarORelogio`
   * roda no topo do tick sem olhar a fase, e os controles que o param só
   * existem no HUD do modo (`HUD_POR_FASE.atlas.tempo`). Sem esta parada,
   * quem partisse com ⏵ ou AO VIVO ligado voltava ao filme com os dez
   * corpos andando, o HUD re-renderizando a 4 Hz e o sinal de prontidão
   * da captura travado em `andando` — e sem nenhum botão para desfazer,
   * porque a barra do tempo ficou para trás. A parada é o ⏸ da própria
   * barra (`andarNoTempo(0)`), a mesma que o `play()` aperta na outra
   * porta do filme (item 228).
   *
   * O `jdPedido` FICA: o instante escolhido é dado medido, viaja no link
   * (`urlComMomento`) e é a data em que os planetas estão. O que para é
   * o relógio, não o calendário.
   */
  partirDoAtlas() {
    if (this.phase !== 'atlas') return;
    const volta = this.retomada;
    this.maquinaDoTempo.andarNoTempo(0);
    this.veuDoAtlas.atravessar(this.reducedMotion || this.shotMode, () => {
      this.rig.reset();
      this.teletransportou();
      if (!volta) {
        this.setPhase('intro');
        return;
      }
      this.journeyT = volta.journeyT;
      this.rig.restaurarOlhar(volta.lookYaw, volta.lookPitch);
      this.freezeJourney = volta.pausado;
      this.setPhase('journey');
    });
  }

  /** o instante guardado pelo portal — o link copiado de dentro o carrega */
  get momentoGuardado(): number | null {
    return this.retomada?.journeyT ?? null;
  }

  // ---- a máquina do tempo (F4/D2) ----------------------------------

  /** o mostrador, somente leitura — o corpo inteiro mora em
   *  `director/maquinaDoTempo.ts` (Parte 1, corte 4); o contrato
   *  `window.__director.tempo` do atlas-smoke segue daqui */
  get tempo(): EstadoDoTempo {
    return this.maquinaDoTempo.tempo;
  }

  andarNoTempo(sentido: SentidoDoTempo) {
    this.maquinaDoTempo.andarNoTempo(sentido);
  }

  ciclarDegrau(): number {
    return this.maquinaDoTempo.ciclarDegrau();
  }

  alternarAoVivo() {
    this.maquinaDoTempo.alternarAoVivo();
  }

  voltarAEpoca() {
    this.maquinaDoTempo.voltarAEpoca();
  }

  /**
   * ZERA A ORIENTAÇÃO do Atlas — o botão de bússola (item 102), a
   * sugestão que ele deu e aceitou em 26/08. Endireita o horizonte SEM
   * mover a mira, em rampa de meio segundo; quem faz a conta é o rig.
   * `perturbar` porque a câmera vai andar, e a captura precisa saber.
   */
  endireitarOrientacao() {
    if (this.phase !== 'atlas') return;
    this.atlas.endireitar();
    this.perturbar();
  }

  /**
   * A CÂMERA SALTOU. Entrar no Atlas, partir dele e trocar de
   * enquadramento não são voo — a câmera aparece noutro lugar. Além de
   * recomeçar a contagem de estabilidade da captura, isto derruba a
   * LUT do raymarch: o reuso dela tolera 2 pc de deriva de VOO, e um
   * salto pode cair dentro dessa tolerância vindo de outro lugar do
   * disco (ver `Nebula.invalidarLut`, com a medida que o denunciou).
   */
  private teletransportou() {
    this.nebula.invalidarLut();
    // os corpos resolvidos fazem SNAP da cessão neste quadro — animar
    // um crossfade através de um teletransporte é movimento inventado
    this.saltoDeCamera = true;
    this.perturbar();
  }


  /**
   * A ESCOLHA DO SELETOR — os três tiers e o `auto` (Ajustes D do
   * NORTE). Porta ÚNICA: quem troca de qualidade nesta casa passa por
   * aqui, venha do painel, da barra, da URL ou do console.
   *
   * TROCA DE TIER — a metade viva na hora, a metade assada em segundo
   * plano (Ajustes C, a régua do dono: nada recarrega).
   *
   * O que muda AGORA é o instrumento: pixel ratio, passos do raymarch,
   * grão, passos do buraco negro. O que muda DEPOIS é a alocação — a
   * população da galáxia e o tier do Sol —, e ela nasce num mundo
   * paralelo enquanto o atual continua desenhando. Até o swap, a tela
   * segue mostrando o mundo velho com o instrumento novo: nenhum véu,
   * nenhum quadro preto, nenhum "carregando".
   *
   * `auto` NÃO É TIER: é a política de aceitar a sugestão da medição.
   * Escolhê-lo aplica a sugestão que já houver (e se não houver
   * nenhuma, espera a próxima janela de medida) — pela MESMA via viva
   * de qualquer outra troca. Um tier explícito devolve a política ao
   * manual: escolher Cinema é dizer *cinema*, não *cinema por ora*.
   */
  setQuality(escolha: EscolhaDeQualidade) {
    this.politicaDeQualidade = escolha === 'auto' ? 'auto' : 'manual';
    const q = escolha === 'auto' ? this.engine.medicao?.sugestao : escolha;
    if (q !== undefined && q !== this.engine.quality) {
      // (o `setSteps` que havia aqui saiu no item 145: `applyQuality`
      // dispara o `onQuality` acima, que já aplica a nebulosa inteira —
      // era a mesma escrita duas vezes, e agora seria a metade dela)
      this.engine.applyQuality(q);
      this.perturbar();
      void this.reassarMundo(q);
    } else this.publicarQualidade();
  }

  /**
   * A MEDIÇÃO CHEGOU. Em manual ela só ATRAVESSA — vira a nota do
   * painel e para aí, que é a fronteira política da letra D: nada muda
   * de tier sem o visitante ter escolhido Auto. Em Auto ela vira troca,
   * e pela mesma porta de sempre, ou seja, com o mundo assado por trás
   * e sem véu.
   */
  private aoMedirOQuadro(m: MedicaoDoQuadro) {
    if (this.politicaDeQualidade === 'auto' && m.sugestao !== this.engine.quality) {
      this.setQuality('auto');
      return;
    }
    this.publicarQualidade();
  }

  /** o estado inteiro da qualidade, para o HUD desenhar sem adivinhar */
  private publicarQualidade() {
    this.events.onQuality({
      escolha: this.politicaDeQualidade === 'auto' ? 'auto' : this.engine.quality,
      tier: this.engine.quality,
      // O MODO FOTO NÃO TEM INSTRUMENTO (item 66). A nota do painel
      // estreia em "medindo o quadro." e troca pelo NÚMERO na primeira
      // janela do medidor — 50 quadros, porque o `dt` que a alimenta vem
      // grampeado em 0,05 s —, e essa janela fecha DEPOIS dos 10 quadros
      // estáveis da prontidão. Medido em 22/08 na mesma URL: md5
      // `91a7de848027` no `pronto` (quadro 21) e `d58cb662df01` no
      // quadro 60, sem ninguém tocar na cena — duas telas para uma URL
      // só, e o `atlas-smoke` reprovando 1 em ~100 conforme o quadro em
      // que a foto caía.
      //
      // ESPERAR o número seria pior: ele é medida VIVA, muda de máquina
      // para máquina e de boot para boot, e toda captura de HUD passaria
      // a carregar um dígito que ninguém controla. Então `?shot=`
      // congela o instrumento, exatamente como já congela o relógio
      // visual (`const time = this.shotMode ? 0 : rawTime`). A medição
      // segue rodando e o Auto segue ouvindo (`aoMedirOQuadro`): o que
      // para é o mostrador, não a régua.
      medicao: this.shotMode ? null : this.engine.medicao,
      // os SEIS controles vivos da gaveta Avançado (item 145, +145b,
      // +149, +poeira 27/09), cada um lido da sua única casa: o MSAA
      // mora no Post, o nível da nebulosa, o gás, as partículas e a
      // poeira aqui, a escala de resolução no Engine
      amostras: this.post.amostras,
      nebulosa: this.nebulosaForcada,
      escala: this.engine.escala,
      gas: this.gasForcado,
      particulas: this.particulasForcadas,
      poeira: this.poeiraForcada,
    });
    // a variante do gás (um dos seis controles acima) decide o modo
    // efetivo da poeira (`Nebula.poeiraModoEfetivo`) — toda troca de
    // qualidade/preset é gatilho de `estadoDaPoeira` também.
    this.publicarPoeira();
  }

  /**
   * A SUAVIZAÇÃO DE BORDAS, TROCADA AO VIVO (item 145). O estado mora no
   * Post; daqui sai o pedido e a publicação — o painel e a barra releem
   * o mesmo `EstadoDaQualidade` de sempre, e por isso o rótulo do
   * seletor passa a dizer "Personalizado" no mesmo quadro.
   */
  forcarAmostras(amostras: number | null) {
    this.post.forcarAmostras(amostras);
    this.publicarQualidade();
  }

  /**
   * OS DOIS INGREDIENTES DO NÍVEL DA NEBULOSA, num lugar só (item 145):
   * passos do raymarch e escala do alvo de meia resolução. O nível vem
   * do que o visitante escolheu na gaveta ou, na ausência dele, do
   * preset — os números são os da tabela única (`NEBULOSA_POR_NIVEL`).
   */
  private aplicarNebulosa() {
    const nivel = NEBULOSA_POR_NIVEL[this.nebulosaForcada ?? this.engine.preset.nebulosa];
    this.nebula.setScale(nivel.escala);
    this.nebula.setSteps(nivel.passos);
  }

  /**
   * A NEBULOSA, TROCADA AO VIVO (item 145) — o raymarch é o maior item
   * do quadro (58% medido), e por isso é o controle que mais move os
   * quadros/s do painel. `null` devolve o nível ao preset.
   */
  forcarNebulosa(nivel: NivelDaNebulosa | null) {
    this.nebulosaForcada = nivel;
    this.aplicarNebulosa();
    // a imagem mudou: a contagem de estabilidade da captura recomeça,
    // como já recomeça na troca de tier
    this.perturbar();
    this.publicarQualidade();
  }

  /**
   * A VARIANTE DO GÁS VOLUMÉTRICO, num lugar só (item 145b): a que o
   * visitante escolheu na gaveta ou, na ausência dela, a do preset —
   * `Nebula.setVariante` decide sozinha se troca alguma coisa (é
   * no-op se a variante pedida já é a que está no ar).
   */
  private aplicarGas() {
    this.nebula.setVariante(this.gasForcado ?? this.engine.preset.gas);
  }

  /**
   * O GÁS VOLUMÉTRICO, TROCADO AO VIVO (item 145b) — troca de material
   * na `Nebula`, sem recarregar. `null` devolve a variante ao preset.
   */
  forcarGas(variante: GasVolumetrico | null) {
    this.gasForcado = variante;
    this.aplicarGas();
    // a imagem mudou (as três variantes desenham gás diferente, não a
    // mesma nuvem mais barata): a contagem de estabilidade recomeça
    this.perturbar();
    this.publicarQualidade();
  }

  /**
   * A POEIRA PERTO DE CASA, num lugar só (pedido do dono, 27/09): a
   * variante que o visitante escolheu na gaveta ou, na ausência dela, a
   * do preset — mapeada para o motor por `poeiraParaMotor` (a tabela
   * única, `atlasConfig.ts`). As portas de bancada `?poeiragain=`/
   * `?poeiragama=`/`?poeiralanes=` continuam vencendo por cima,
   * clampadas do jeito de sempre; `poeiraTeste` vence a variante
   * inteira — liga com o volume SINTÉTICO nos números de sempre (ver
   * `tentarCarregarPoeira`), porque `teste` não é palavra do menu e por
   * isso não teria como virar variante.
   */
  private aplicarPoeira() {
    const config = this.poeiraTeste
      ? { modo: 1, ganho: 46.9, gama: 1, lanes: 0 }
      : poeiraParaMotor(this.poeiraForcada ?? this.engine.preset.poeira);
    const poeiraGanhoParam = parseFloat(this.debug.get('poeiragain') ?? '');
    const poeiraGamaParam = parseFloat(this.debug.get('poeiragama') ?? '');
    const poeiraLanesParam = parseFloat(this.debug.get('poeiralanes') ?? '');
    this.definirPoeira({
      modo: config.modo,
      ganho: Number.isFinite(poeiraGanhoParam)
        ? THREE.MathUtils.clamp(poeiraGanhoParam, 0, 500)
        : config.ganho,
      gama: Number.isFinite(poeiraGamaParam)
        ? THREE.MathUtils.clamp(poeiraGamaParam, 0.2, 3)
        : config.gama,
      lanes: Number.isFinite(poeiraLanesParam)
        ? THREE.MathUtils.clamp(poeiraLanesParam, 0, 1)
        : config.lanes,
    });
  }

  /**
   * A POEIRA PERTO DE CASA, TROCADA AO VIVO (pedido do dono, 27/09) — a
   * troca entre o modelo de hoje e as três leituras do bloco do Gaia é
   * só reassar `definirPoeira` com o número certo, sem recarregar.
   * `null` devolve a variante ao preset. Forçar uma variante (mesmo
   * `null`) é um gesto explícito do visitante, e por isso desarma
   * `poeiraTeste`: é o que faz o clique de "voltar ao brilho real"
   * desligar de vez um `?poeira=teste` de bancada, em vez de deixar o
   * volume sintético no ar com a URL já limpa.
   */
  forcarPoeira(variante: TipoDePoeira | null) {
    this.poeiraForcada = variante;
    this.poeiraTeste = false;
    this.aplicarPoeira();
    // a imagem mudou (as quatro variantes desenham poeira diferente, do
    // desligado ao mais forte): a contagem de estabilidade recomeça
    this.perturbar();
    this.publicarQualidade();
  }

  /**
   * A FRAÇÃO DE PARTÍCULAS DA GALÁXIA, num lugar só (item 149): a que o
   * visitante escolheu na gaveta ou, na ausência dela, a do preset. É
   * no-op enquanto a galáxia ainda não nasceu (`this.galaxy` é `null`
   * durante o `init`) — `vestirGalaxia` cobre o parto dela.
   */
  private aplicarParticulas() {
    this.galaxy?.setFracaoDeParticulas(
      FRACAO_DE_PARTICULAS[this.particulasForcadas ?? this.engine.preset.particulas]
    );
  }

  /**
   * A FRAÇÃO DE PARTÍCULAS DA GALÁXIA, TROCADA AO VIVO (item 149) —
   * `drawRange` na `Galaxy`, sem recarregar. `null` devolve à fração do
   * preset.
   */
  forcarParticulas(nivel: ParticulasDaGalaxia | null) {
    this.particulasForcadas = nivel;
    this.aplicarParticulas();
    // a granulação mudou (menos pontos, cada um mais forte): a contagem
    // de estabilidade da captura recomeça, como nos outros três controles
    this.perturbar();
    this.publicarQualidade();
  }

  /**
   * A ESCALA DE RESOLUÇÃO, TROCADA AO VIVO (item 145). O estado mora no
   * Engine (é ele o dono da nitidez); daqui saem o pedido, o abalo da
   * captura e a publicação, no mesmo molde dos outros dois controles.
   */
  forcarEscala(fator: number | null) {
    this.engine.forcarEscala(fator);
    this.perturbar();
    this.publicarQualidade();
  }

  /**
   * O QUE UMA GALÁXIA RECÉM-NASCIDA VESTE antes de assar: as camadas que
   * já estavam desligadas e o modo de cartografia do boot. Num lugar só
   * porque são DOIS os partos — o do init e o do mundo novo da troca de
   * tier —, e um mundo novo que nascesse sem isto acenderia de volta o
   * que o visitante tinha desligado, ou trocaria de mapa junto com o
   * tier. `this.hide` é lido AGORA, não no boot: o que vale é o que está
   * desligado no momento em que este mundo nasce.
   */
  private vestirGalaxia(g: Galaxy) {
    for (const f of this.hide) g.setLayerHidden(f, true);
    g.setCartography(this.debug.has('discoff') ? 'off' : this.cartMode);
    // a fração de partículas (item 149) é a mesma lei de `aplicarParticulas`
    // — só que aplicada na galáxia NOVA, antes de ela existir em `this.galaxy`
    g.setFracaoDeParticulas(
      FRACAO_DE_PARTICULAS[this.particulasForcadas ?? this.engine.preset.particulas]
    );
  }

  /**
   * O mundo que está no forno ainda interessa? `null` é o do boot (só a
   * morte do Director o cancela); um número é a GERAÇÃO do pedido da
   * troca viva, e ele deixa de valer no instante em que qualquer outro
   * pedido nasce — inclusive o pedido de VOLTAR ao tier que já está na
   * tela, que não assa mundo nenhum e existe só para cancelar este.
   *
   * A régua era o TIER pedido, e isso tinha um buraco: Alta → Performance
   * → Alta devolvia `trocaPedida = 'performance'` intacto (o segundo
   * clique saía antes de escrevê-lo, porque "o tier já é alta"), o forno
   * de Performance se dava por válido e pousava sobre um seletor que
   * dizia Alta. Geração não tem esse buraco: ela é ÚNICA por pedido, e
   * um pedido só pousa se nenhum outro tiver nascido depois dele.
   */
  private mundoAindaVale(geracao: number | null) {
    return !this.disposed && (geracao === null || geracao === this.geracaoDaTroca);
  }

  /**
   * O fôlego entre duas fatias de trabalho pesado, com a resposta a
   * "continuo?" junto. `setTimeout(0)` e não rAF pelo mesmo motivo do
   * `stage()`: em aba de fundo o rAF é estrangulado e o forno nunca
   * terminaria.
   */
  private folego(geracao: number | null): Promise<boolean> {
    return new Promise((resolver) =>
      setTimeout(() => resolver(this.mundoAindaVale(geracao)), 0)
    );
  }

  /**
   * O MUNDO NOVO, ASSADO EM SEGUNDO PLANO, TROCADO NUM QUADRO SÓ.
   *
   * Isto é o double-buffer da letra C. A cadeia pesada (os dois mapas e
   * a população — 4,02 M partículas em cinema, 1,1 M em performance) vai
   * inteira para o worker que a letra B abriu; as lâminas do disco assam
   * na GPU FORA da cena, fatiadas uma a uma; o Sol novo nasce por
   * último, porque o `prime` dele é um bloco que não se fatia (o miolo
   * de `stellarBody.ts` é território da Lei da Estrela e não se toca
   * aqui). Só então os ponteiros trocam — e essa troca é síncrona de
   * ponta a ponta, sem um `await` no meio: nenhum quadro pode ser
   * desenhado com meio mundo velho e meio mundo novo.
   *
   * CANCELAMENTO: quem clica em três tiers seguidos gera três pedidos, e
   * só o ÚLTIMO vira mundo. Os outros descartam o que já assaram
   * (`descartarCarga`) em vez de virarem tela — é isso que impede a
   * troca de tier de ser uma máquina de vazar 122,7 MiB por clique. Quem
   * decide isso é a GERAÇÃO do pedido (`geracaoDaTroca`) e não o tier
   * pedido: o clique que VOLTA ao tier vivo também é um pedido, e pela
   * régua do tier ele passava batido — cancelando nada e deixando o
   * mundo do meio do caminho pousar sobre um seletor que já dizia outra
   * coisa.
   */
  private async reassarMundo(q: QualityLevel) {
    // DURANTE O INIT NÃO HÁ MUNDO A TROCAR, e a guarda é dupla de
    // propósito. O que o init assa já é o tier vivo, e a reconciliação
    // no fim dele cobre a corrida do painel aberto na carga
    // (`?ajustes=1`); sem esta linha, um clique no meio do init poria
    // DOIS mundos no forno e o segundo poderia pousar antes de o
    // primeiro terminar — sobre um `wrappedStars` que ainda não existe.
    if (this.disposed || this.phase === 'loading' || this.tierDoMundo === null) return;
    // O MESMO PEDIDO DUAS VEZES não abre um segundo forno — e não pode
    // tomar geração nova, senão o forno em curso se cancelaria sozinho.
    if (this.trocaPedida === q) return;
    // DAQUI PARA BAIXO É PEDIDO NOVO, e todo pedido novo invalida o
    // anterior: quem estiver no forno perde a vez neste instante.
    const geracao = ++this.geracaoDaTroca;
    // VOLTAR AO TIER QUE JÁ ESTÁ NA TELA É CANCELAR, e não é no-op: não
    // há mundo a assar, mas há um mundo em forno que precisa saber que
    // ninguém o espera mais. A geração acima já o invalidou; aqui só se
    // apaga o pedido em voo, para a captura parar de esperar por ele.
    if (q === this.tierDoMundo) {
      this.trocaPedida = null;
      return;
    }
    this.trocaPedida = q;
    const carga = await montarCarga({
      catalogos: this.catalogos,
      tier: q,
      // o loader não aparece: a troca é viva, e o rótulo de etapa é do
      // carregamento. O visitante vê o mundo velho até o mundo novo
      // estar pronto — que é a promessa inteira da letra C.
      aoAvancar: () => {},
    });
    if (!this.mundoAindaVale(geracao)) {
      descartarCarga(carga);
      return;
    }
    this.vestirGalaxia(carga.galaxy);
    const assou = await carga.galaxy.bakeDiscLayers(
      this.engine.renderer,
      () => this.folego(geracao)
    );
    if (!assou || !this.mundoAindaVale(geracao)) {
      descartarCarga(carga);
      return;
    }
    const solNovo = new StellarBody(
      SOL_PARAMS,
      this.engine.renderer,
      this.engine.camera,
      q,
      // o Sol do tier novo nasce NA DATA VIVA — é o que faz a troca ao
      // vivo sair igual ao boot direto naquele tier (Ajustes C)
      faseDoCiclo(this.maquinaDoTempo.jdVivo)
    );
    // ---- SWAP ATÔMICO — daqui até o fim nada cede a thread ----------
    const velho = {
      galaxy: this.galaxy,
      poeira: this.dustMapTexture,
      estrutura: this.structureMapTexture,
      sol: this.sun,
    };
    this.engine.scene.remove(velho.galaxy.group);
    this.galaxy = carga.galaxy;
    this.engine.scene.add(this.galaxy.group);
    this.dustMapTexture = carga.dustMapTexture;
    this.structureMapTexture = carga.structureMapTexture;
    // os dois consumidores dos mapas que SOBREVIVEM à troca (a
    // população deles não depende de tier): sem estes dois binds ficariam
    // lendo a textura que o teardown descarta duas linhas abaixo
    this.nebula.setDustMap(carga.dustMapTexture, this.catalogos ? 1 : 0);
    this.wrappedStars.setDustMap(carga.dustMapTexture);
    if (this.starForges && this.debug.has('forgetau')) {
      const tauTex = this.galaxy.tauMapTexture;
      if (tauTex) this.starForges.setTauMap(tauTex);
    }
    this.engine.scene.remove(velho.sol.group);
    this.sun = solNovo;
    this.engine.scene.add(this.sun.group);
    // O PALCO LOCAL NÃO É REFEITO AQUI, e isso é decisão medida:
    // reconstruir os doze corpos para alcançar os que JÁ estão carregados
    // foi tentado e medido em 20/08 — a Terra em close-up some por ~2 s
    // enquanto a textura no tier novo vem pela rede, o véu que a letra C
    // proíbe. Quem alcança os carregados desde o item 59 (31/08) é o
    // DOUBLE-BUFFER POR CORPO (`TexturasDoCorpo`, world/corpos/
    // texturas.ts): cada corpo compara o tier vivo dos pixels que tem com
    // o do seletor, busca o lote novo em segundo plano e troca o ponteiro
    // num quadro só — o mesmo desenho deste swap, um degrau abaixo, e sem
    // um quadro sem globo. Quem nunca carregou continua obedecendo ao
    // tier de agora na primeira carga: textura de corpo é alocação
    // PREGUIÇOSA, do que se visitou, não peso residente do mundo.
    this.tierDoMundo = q;
    this.trocaPedida = null;
    // ---- fim do swap ------------------------------------------------
    // TEARDOWN DO MUNDO VELHO, passo a passo blindado: um dispose que
    // estoure não pode levar os outros junto (a mesma lei do `teardown`
    // da morte do Director) — a diferença é que aqui a sessão CONTINUA,
    // e um passo perdido no meio vazaria pelo resto da visita.
    const passo = (rotulo: string, fn: () => void) =>
      this.passoBlindado('troca de tier', rotulo, fn);
    passo('galaxy', () => velho.galaxy.dispose());
    passo('dustMap', () => velho.poeira?.dispose());
    passo('structureMap', () => velho.estrutura?.dispose());
    passo('sun', () => velho.sol.dispose());
    // o mundo novo tem OUTRO mapa de poeira: a LUT do raymarch foi
    // medida contra o que acabou de ser descartado
    this.nebula.invalidarLut();
    this.perturbar();
  }

  /**
   * Um passo de descarte que NÃO leva os outros junto. Nasceu no
   * `teardown` (uma exceção no meio deixava o Engine vivo, com RAF numa
   * cena zumbi) e serve agora aos dois desmontes da casa — o da morte do
   * Director e o do mundo velho na troca de tier, que é o mais exigente
   * dos dois: ali a sessão CONTINUA, e um passo perdido vaza pelo resto
   * da visita em vez de morrer com a página.
   */
  private passoBlindado(contexto: string, rotulo: string, fn: () => void) {
    try {
      fn();
    } catch (error) {
      console.warn(`[${contexto}] ${rotulo} falhou; seguindo.`, error);
    }
  }

  /**
   * Exposição escolhida à mão (painel ou ?exp=) DESLIGA a auto-exposição por
   * rampa — sem o latch o tick reescrevia o valor no quadro seguinte e o
   * controle ao vivo não fazia nada (o link com ?exp= só funcionava recarregando).
   */
  setExposure(v: number) {
    this.expOverride = true;
    this.engine.setExposure(v);
    this.perturbar();
  }

  /**
   * DESLIGA a exposição escolhida à mão e devolve a auto-exposição por
   * rampa. É o caminho de volta que o latch `expOverride` nunca teve: até
   * a Onda 5 ele só sabia ligar, e por isso a linha BRILHO do selo não
   * teria como cumprir "clicar volta ao real" (D1). O tick reescreve o
   * valor no quadro seguinte — não há número a restaurar aqui, porque a
   * rampa é função da vista.
   */
  limparExposicaoManual() {
    this.expOverride = false;
    this.perturbar();
  }

  /**
   * A ESCALA DO TEXTO DO HUD mudou (`?ui=`, F6). O Director precisa
   * saber porque o HUD do Atlas é parte do enquadramento: texto maior
   * come mais quadro, o retângulo útil encolhe e a câmera recua. É
   * troca de enquadramento como qualquer outra, e por isso zera a
   * contagem de quadros estáveis do sinal de prontidão — a captura do
   * harness não pode assentar no meio de uma troca de imagem.
   */
  escalaDaUiMudou() {
    this.perturbar();
  }

  /**
   * A RESERVA DA FICHA (Lote 3, PLAN-UI.md §6, item 225) — o App chama
   * isto DENTRO do `medir()` dele (nunca por quadro), com os pixels REAIS
   * do painel (mesa) ou da folha (celular). `null` é "a ficha fechou":
   * a reserva volta a 0 nas duas bordas.
   *
   * OS PIXELS VIRAM FRAÇÃO aqui — `basePx` por `window.innerHeight`,
   * `direitaPx` por `larguraDeCss()` — porque é fração que
   * `retanguloUtilDoAtlas` soma; o App só mede DOM, nunca converte.
   *
   * MUDAR O ALVO PERTURBA: o sinal de prontidão das capturas não pode
   * assentar com a câmera ainda a meio caminho da rampa. E a rampa
   * reparte do CORRENTE de agora, não do alvo anterior — uma segunda
   * troca no meio da primeira rampa não pode saltar para trás.
   */
  reservarParaAFicha(px: { basePx: number; direitaPx: number } | null) {
    const alturaJanela = window.innerHeight;
    const larguraJanela = larguraDeCss();
    const base =
      px && Number.isFinite(px.basePx) && px.basePx > 0 && alturaJanela > 0
        ? px.basePx / alturaJanela
        : 0;
    const direita =
      px && Number.isFinite(px.direitaPx) && px.direitaPx > 0 && larguraJanela > 0
        ? px.direitaPx / larguraJanela
        : 0;
    if (base === this.reservaFichaAlvo.base && direita === this.reservaFichaAlvo.direita) {
      return;
    }
    this.reservaFichaPartida = { ...this.reservaFichaCorrente };
    this.reservaFichaAlvo = { base, direita };
    if (this.shotMode || this.reducedMotion) {
      // captura e acessibilidade não esperam animação — o valor pula
      // direto para o alvo, como toda rampa da casa faz com as duas portas
      this.reservaFichaCorrente = { base, direita };
      this.reservaFichaRampaT = 1;
    } else {
      this.reservaFichaRampaT = 0;
    }
    this.perturbar();
  }

  /**
   * C6 — LIGA o halo de contorno para UMA abertura.
   * App.tsx já filtrou o gatilho (flag, mesa, gaveta nascendo do nada,
   * sem `semMovimento()`); a única régua que falta perguntar por fora
   * é esta: NUNCA em `shotMode` (`?shot=`). A captura determinística já
   * congela o tempo visual do resto da cena (`tick`, `time` acima), e
   * este efeito é inerentemente transiente — não existe "acabamento
   * estático" dele que fizesse sentido fotografar, então desligar por
   * completo é a leitura certa da regra 6 da seção 7 ("em shot=1, usar
   * o acabamento estático definido ou desligá-la deterministicamente").
   */
  acenderContorno(parametros: ParametrosDoContorno): void {
    if (this.shotMode) {
      parametros.relogio.cancel();
      return;
    }
    this.contorno.acender(parametros);
  }

  /** C6 — a intenção mudou (o painel fechou ou foi trocado): o halo some na hora. */
  apagarContorno(): void {
    this.contorno.apagar();
  }

  /** C6 — a caixa de repouso do painel mudou com o halo aceso. */
  atualizarContorno(retangulo: RetanguloDoContorno): void {
    this.contorno.atualizarRetangulo(retangulo);
  }

  /**
   * O RETÂNGULO ÚTIL que o enquadramento está usando agora — publicado
   * para o juiz de a11y poder comparar a declaração (`atlasRig.ts`) com
   * as áreas REAIS que o HUD ocupa na página. Sem esta ponte, as duas
   * fontes (o número no TS e a altura no CSS) só se encontrariam a olho.
   *
   * `reservaFichaCorrente` entra aqui pela mesma razão do `atlas.apply`
   * no tick (F2b/item 225): o juiz precisa ver a reserva que a câmera
   * está usando NESTE quadro, e não o alvo dela.
   */
  get retanguloUtil() {
    return retanguloUtilDoAtlas(escalaDaUi(), larguraDeCss(), this.reservaFichaCorrente);
  }

  /**
   * A EFEMÉRIDE VIVA, somente leitura — o que a ficha do objeto (item 74)
   * consulta a cada `onTempo` para escrever distância, velocidade e
   * geometria no céu do corpo em foco.
   *
   * `null` até ela chegar pela rede, e a ficha nasce útil assim mesmo: raio,
   * gravidade, massa e escape não dependem dela. Getter e não cópia no
   * React pelo mesmo motivo do `selo` logo abaixo — um segundo dono do
   * motor seria a segunda fonte de verdade sobre onde os corpos estão.
   */
  get efemerideViva(): MotorEfemerides | null {
    return this.maquinaDoTempo.efemeride;
  }

  /**
   * O ESTADO DA VISTA que o selo de honestidade lê — somente leitura,
   * como o getter `captura`. Ele mora aqui porque só o Director conhece
   * os quatro donos do assunto de uma vez (o latch da exposição, o
   * conjunto de camadas escondidas, o tier vivo e a curva do renderer),
   * e porque a alternativa — o React guardar uma cópia de cada um —
   * seria a segunda fonte de verdade que o selo existe para não ter.
   *
   * As PORTAS saem de `window.location.search` a cada leitura, e não do
   * `this.debug` do construtor: o painel e a gaveta reescrevem a URL ao
   * vivo (`replaceState`), e um selo lendo a URL do boot declararia
   * desvio já desfeito — ou calaria um recém-feito.
   */
  get selo(): EstadoDaVista {
    return {
      distanciaPc: this.engine.camera.position.length(),
      portas: [...new URLSearchParams(window.location.search).keys()],
      exposicaoManual: this.expOverride,
      tom: modoDoToneMapping(this.engine.renderer.toneMapping),
      camadasEscondidas: [...this.hide, ...(this.noNebula ? ['nonebula'] : [])],
      tier: this.engine.quality,
      // os seis controles da gaveta Avançado (item 145, +145b, +149,
      // +poeira 27/09) — estado VIVO, não as portas: o painel os troca
      // sem recarregar, e um selo que lesse só a URL calaria a escolha
      // feita na gaveta
      amostras: this.post.amostras,
      nebulosa: this.nebulosaForcada,
      escala: this.engine.escala,
      gas: this.gasForcado,
      particulas: this.particulasForcadas,
      // a bancada `?poeira=teste` vence a variante enquanto vale (ver
      // `aplicarPoeira`), e o selo a nomeia — `forcarPoeira` a desarma
      poeira: this.poeiraTeste ? 'teste' : this.poeiraForcada,
      luz: this.politicaDeLuz,
      stopsDoGloboEmFoco: this.stopsDoGloboEmFoco(),
      // a DOSE de ocupação do Sol (item 5): < 1 só no arranque do filme,
      // e é aí que o selo tem o que declarar
      doseDoSol: this.phase === 'journey' ? this.filme.doseDoSol(this.journeyT) : 1,
      // a LUZ DO ROTEIRO (F2b): > 0 só dentro do filme, num plano com
      // `camera.luz` — e é aí que o selo declara a travessia
      luzDoRoteiro: this.luzDoRoteiro,
      // (stopsDaPupila saiu do estado no M2: a pupila morreu inteira, e
      // a compressão fixa não é desvio por quadro — é a lei, declarada
      // nas linhas de luz do próprio selo.)
    };
  }

  /**
   * OS PASSOS DE LUZ que o GLOBO em foco está exposto acima (ou abaixo)
   * da luz física que aquele corpo realmente recebe — o rótulo vivo da
   * linha `?luz=` do selo. Lê a distância heliocêntrica VIVA (a mesma
   * que a máquina do tempo reescreve), nunca o retrato congelado. Sem
   * corpo em foco (ou com o Sol, que não tem visita a declarar) devolve
   * null e o rótulo fica só com a copy: o selo não inventa número.
   *
   * MUDOU NO ITEM 91, e mudou porque o número de antes era MENTIRA.
   * Até 25/08 isto devolvia `deslocamentoEVAssistida(dUA)` — o ΔEV que a
   * política `assistida` aplica sobre a `real`. Só que aquele número
   * descrevia a lei do PONTO, e o ponto (`planetas.ts`, MH18) nunca
   * consumiu `ganhoFundido`: o único consumidor sempre foi o globo. O
   * selo declarava +4,2 para Saturno enquanto o globo gastava outra
   * coisa. Agora declara `stopsDaVisita`, que é o gasto REAL da malha —
   * e em `real` é 0 exato, porque em `real` não há nada a declarar.
   *
   * NO ITEM 93 O NÚMERO FICOU EXATO: com o Sol do globo em 1 literal, o
   * gasto é `2·log2(d)` — +6,6 em Saturno, +9,8 em Netuno, −2,2 em
   * Mercúrio. O resíduo do 1/d² que ainda o torcia morreu junto com a
   * compensação por corpo, e por isso o `id` saiu da chamada.
   */
  private stopsDoGloboEmFoco(): number | null {
    const id = this.escada.focoCorpoId;
    if (!id || !this.planetas) return null;
    const stops = (dUA: number | undefined) =>
      dUA !== undefined && Number.isFinite(dUA)
        ? stopsDaVisita(dUA, this.politicaDeLuz, this.luzDoRoteiro)
        : null;
    // as luas (F2b/F3): o dUA é o da CADEIA heliocêntrica dela,
    // publicado pelo próprio mesh (NaN sem efeméride ⇒ o rótulo fica
    // sem número)
    if (LUAS_DO_SISTEMA.some((l) => l.id === id)) {
      return stops(
        id === 'moon'
          ? this.lua?.corpo.estadoVivo.rUA
          : this.rochosos.find((r) => r.corpo.id === id)?.corpo.estadoVivo.rUA
      );
    }
    // anões/asteroides não têm ponto na camada: o dUA é o do mesh
    // (Kepler/retrato). Sem este ramo o selo dizia ASSISTIDO e omitia
    // os passos — justamente nos corpos de maior gasto.
    if (HELIO_SEM_PONTO.some((a) => a.id === id)) {
      return stops(this.rochosos.find((r) => r.corpo.id === id)?.corpo.estadoVivo.rUA);
    }
    const i = CORPOS_DO_SISTEMA.findIndex((c) => c.id === id);
    if (i <= 0) return null;
    const p = this.planetas.posicoes;
    return stops(Math.hypot(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]) * UA_POR_PC);
  }

  /**
   * A AÇÃO da linha `?luz=` do selo (D2): troca a política de luz dos
   * corpos resolvidos AO VIVO — o tick entrega o escalar novo ao
   * material no próximo quadro ("volta ao real com o próximo estado
   * visível"). O estado mora aqui; a URL é espelho, escrita por quem
   * clicou (App), no mesmo protocolo do `?grad=0`.
   */
  definirLuz(politica: PoliticaDeLuz) {
    this.politicaDeLuz = politica;
    this.perturbar();
  }

  /**
   * O AMOSTRADOR DE MEMÓRIA (Onda 6, F8/D9) — somente leitura, como
   * `captura` e `selo`. É o que o juiz `scripts/visual/memoria.mjs` lê
   * para provar que entrar/sair do Atlas, trocar de qualidade e focar
   * corpos devolvem TUDO que alocaram: `renderer.info` é a contagem
   * viva do próprio three (texturas e geometrias na GPU, draws do
   * último quadro), e `heapMB` é o heap de JS quando o navegador o
   * expõe (`performance.memory` é só do Chrome — `null` não é zero, é
   * "este navegador não conta").
   *
   * LEITURA DIRETA POR CHAMADA, sem cadência interna: o D9 oferecia
   * 1 Hz, mas o `renderer.info` já é mantido pelo renderer a cada
   * quadro e o heap é uma leitura pronta do navegador — uma cadência
   * aqui seria estado novo (timer + cópia) para economizar uma leitura
   * que não custa nada. Custo ZERO quando ninguém lê: getter não
   * executa sem chamada, e nenhum caminho de render passa por aqui.
   *
   * PUBLICADO SÓ EM DEV, de carona no objeto inteiro: quem pendura o
   * Director em `window.__director` é o App.tsx, sob
   * `import.meta.env.DEV` — o mesmo portão do `captura` que os juízes
   * de CDP já usam. Em produção não há porta nenhuma.
   */
  get stats() {
    const info = this.engine.renderer.info;
    const heap = (
      performance as Performance & { memory?: { usedJSHeapSize: number } }
    ).memory;
    return {
      memory: {
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      },
      render: {
        calls: info.render.calls,
        triangles: info.render.triangles,
        points: info.render.points,
      },
      heapMB: heap ? heap.usedJSHeapSize / 1048576 : null,
    };
  }

  get progressTicks(): { t: number; text: string }[] {
    return this.rig.ticks;
  }

  private tick(rawTime: number, dt: number) {
    // tempo VISUAL: congelado no modo foto (grão, pulsos, coroa e
    // deriva da poeira idênticos entre capturas do mesmo instante)
    const time = this.shotMode ? 0 : rawTime;
    const cam = this.engine.camera;
    let warp = 0;
    let luzDoRoteiro = 0;

    // VÉU DO ATLAS, antes de tudo (o passo e a razão moram em
    // director/veu.ts — se ele fechar neste quadro, a fase vira AQUI)
    this.veuDoAtlas.tique(dt, this.reducedMotion || this.shotMode);

    // O RELÓGIO DO CÉU, antes de tudo que lê posição: se o instante
    // mudar neste quadro, a camada de planetas já o vê escrito. Parado
    // (o estado de nascimento, e o do filme inteiro) o método devolve
    // na primeira linha.
    this.maquinaDoTempo.andarORelogio(dt);

    // ...e o ENQUADRAMENTO DO ATLAS segue o corpo no instante novo
    // (Onda 7). Aqui, e não dentro do ramo da fase, porque tem de vir
    // ANTES de qualquer leitura de posição — inclusive a da câmera, que
    // é escrita logo abaixo. `jdDoEnquadre` é o limite de frequência:
    // uma recomposição por instante de céu, zero com o relógio parado.
    if (this.phase === 'atlas') {
      const jdAgora = this.maquinaDoTempo.jdVivo;
      if (jdAgora !== this.jdDoEnquadre) {
        this.jdDoEnquadre = jdAgora;
        this.recomporAlvo();
      }
    }

    if (this.phase === 'journey') {
      if (!this.freezeJourney) this.journeyT += dt * this.playbackRate;
      const t = this.journeyT;
      const r = this.rig.apply(cam, t, dt);
      // o CORTE SECO do roteiro salta a câmera neste quadro: a cessão
      // estala junto, como no seek (só o salto, pela mesma razão)
      if (r.corte) this.saltoDeCamera = true;
      warp = r.warp;
      luzDoRoteiro =
        import.meta.env.DEV && this.luzDoRoteiroForcada !== null ? this.luzDoRoteiroForcada : r.luz;
      this.events.onProgress(Math.min(t / this.rig.duration, 1));
      this.events.onWarp(this.reducedMotion ? 0 : warp);

      // A LEGENDA E A LÍNGUA VIVA (item 130/F3): a regra mora em
      // `reemitirLegenda`, pura, no topo deste arquivo.
      const { index, key } = this.rig.captionAt(t);
      if (reemitirLegenda(index, key.caption, this.lastCaptionIdx, this.lastCaptionTexto)) {
        this.lastCaptionIdx = index;
        this.lastCaptionTexto = key.caption;
        this.events.onCaption(index, key.caption, key.sub);
      }

      // ...e a viagem CONGELADA não termina sozinha. O teto do `seek`
      // sozinho não bastava — medido: com ele `journeyT` vira `duration`
      // exato, `>=` continua verdadeiro e a fase virava `end` no quadro
      // seguinte. Quem chega por `?t=` (que congela, contrato das
      // capturas) ou `?freeze=1` pediu UM QUADRO parado, e a tela final
      // não é esse quadro. Congelado ninguém avança: só cai aqui quem
      // pediu o fim por deep-link. Correr até o fim (`&play=1`, ou o
      // filme rodando) segue terminando como sempre.
      if (this.journeyT >= this.rig.duration && !this.freezeJourney) {
        this.setPhase('end');
        this.events.onWarp(0);
      }
    } else if (this.escritorDeCamera === 'voo') {
      this.roam.update(dt);
    } else if (this.escritorDeCamera === 'atlas') {
      // A INÉRCIA DA RODA gasta o embalo ANTES de a câmera ser escrita
      // (item 73): escrever depois deixaria o quadro com a distância do
      // anterior, e a 60 Hz isso é um quadro de atraso em todo estalo.
      // Com a rampa entre degraus em voo, `pinarDistancia` re-mira a
      // distância de DESTINO dela (item 112) — o gesto da roda nunca se
      // perde e continua havendo UMA lei escrevendo a distância.
      this.gestos?.avancarZoom(dt);
      // A RAMPA DA RESERVA DA FICHA (item 225) anda AQUI, no mesmo ponto
      // do quadro — ela só entra na câmera pelo `atlas.apply` de baixo, e
      // fora do Atlas não há o que avançar (filme e voo livre não leem a
      // reserva). Mesmo smoothstep de toda rampa da casa.
      if (this.reservaFichaRampaT < 1) {
        // a preferência que muda NO MEIO da rampa é honrada no próximo
        // quadro — o mesmo contrato das gavetas: t vai a 1 e o smoothstep
        // abaixo pousa `reservaFichaCorrente` exatamente no alvo.
        this.reservaFichaRampaT =
          this.shotMode || this.reducedMotion
            ? 1
            : Math.min(
                1,
                this.reservaFichaRampaT +
                  (Number.isFinite(dt) ? Math.max(dt, 0) : 0) / RESERVA_DA_FICHA_RAMPA_S
              );
        const t = this.reservaFichaRampaT;
        const k = t * t * (3 - 2 * t);
        this.reservaFichaCorrente = {
          base:
            this.reservaFichaPartida.base +
            (this.reservaFichaAlvo.base - this.reservaFichaPartida.base) * k,
          direita:
            this.reservaFichaPartida.direita +
            (this.reservaFichaAlvo.direita - this.reservaFichaPartida.direita) * k,
        };
      }
      // o MESMO ponto do quadro em que a JourneyRig escreveria a dela —
      // inclusive o fov, que aqui é o pino do Atlas e não o resíduo
      // amortecido do shot onde o visitante pausou. O dt alimenta a
      // rampa entre degraus (F2b) — fora dela é ignorado.
      this.atlas.apply(cam, escalaDaUi(), larguraDeCss(), dt, this.reservaFichaCorrente);
      // ...e a bússola do HUD, na BORDA: o rig recalculou o veredito
      // com histerese neste mesmo `apply`, e só a virada atravessa
      const bussola = this.atlas.estadoDaBussola;
      if (bussola !== this.bussola) {
        this.bussola = bussola;
        this.events.onOrientacao(bussola);
      }
    } else {
      // intro/end: deriva lenta contemplativa
      if (this.phase === 'intro') {
        const r = this.rig.apply(cam, 0, dt);
        warp = r.warp;
      }
    }
    this.luzDoRoteiro = luzDoRoteiro;
    const viradaDaLuz = viradaDaLuzDoRoteiro(luzDoRoteiro, this.luzDoRoteiroNoAr);
    if (viradaDaLuz !== null) {
      this.luzDoRoteiroNoAr = viradaDaLuz;
      this.events.onLuzDoRoteiro(viradaDaLuz);
    }

    // a matriz da câmera precisa estar atual ANTES de projeções e
    // extrações de base — labels usavam a matriz do frame anterior
    cam.updateMatrixWorld(true);

    // mundo
    const hPx = this.engine.renderer.domElement.height;
    // INVARIÂNCIA DE RESOLUÇÃO: pr² re-escala o pico para a régua de
    // referência (DPR 1) nos gatilhos do campo e do clarão — sem isso o
    // céu desarma no modo cinema (pista do dono, 16→17/08)
    const prAtual = this.engine.renderer.getPixelRatio();
    const pr2Atual = prAtual * prAtual;
    const dHome = cam.position.length();
    const dGC = cam.position.distanceTo(GAL.GC_POS);
    // o near acompanha a âncora mais PRÓXIMA (Sol ou centro galáctico):
    // na rasante de Sgr A* o near de dezenas de pc comeria o buraco negro.
    // E, desde a Onda 6 (F0/D1), a superfície RESOLVIDA mais próxima em
    // quadro: a porta escreve `ligado` ANTES do getter porque camada
    // desligada (?nocorpos) tira os corpos do quadro — o getter devolve
    // NaN e o par (near, far) fica no vigente bit a bit (pino de
    // neutralidade em engine.test.ts; sem corpo registrado, F0, idem).
    this.palco.ligado =
      (CORPOS_DEFAULT_ON || this.debug.has('corpos')) && !this.hide.has('nocorpos');

    // A CODA RESOLVE A LUA, e a Lua não tem retrato congelado: a fonte
    // de efemérides precisa estar viva antes de o raspão chegar. Mesmo
    // pedido de preload do roteiro (hoje no estilingue, junto às
    // texturas); `garantirEfemerides` é idempotente e abortável — mas só
    // enquanto NINGUÉM pediu ('retrato'): depois de uma falha, pedir de
    // novo a cada quadro refazia o fetch 60× por segundo e o aviso do
    // tempo piscava entre "buscando" e "sem efeméride" (item 132). A
    // segunda tentativa, a única permitida, mora logo abaixo.
    if (this.palcoQuente && this.maquinaDoTempo.faseDaEfemeride === 'retrato') {
      this.maquinaDoTempo.garantirEfemerides();
    }

    // O FILME CORRE NA DATA DELE, do primeiro segundo ao último — o
    // calendário é do filme em cartaz (no galáctico, `jdDoFilme`: o instante do retrato até
    // REVEAL_T, as 16:00 UTC do mesmo dia na coda, para o pouso sobre as
    // Américas). Até 21/08 esta linha só corria a partir de REVEAL_T e
    // vivia dentro do `palcoQuente`, e o buraco era o portal: quem
    // viajasse para 2035 no Atlas e partisse assistia aos atos com os
    // planetas de 2035 e via o relógio saltar sozinho para 2026 na coda,
    // sem nada dizendo. Um relógio só — e dentro do filme ele é do
    // filme. Sem rede a fonte não chega e a coda degrada como a Lua:
    // honesta e visível.
    //
    // E A PORTA `?jd=` PERDEU A PRECEDÊNCIA AQUI em 30/08 (item 108),
    // porque ela não é só do operador: o Atlas abre AO VIVO por desenho,
    // então `naEpoca` é falso sempre e QUALQUER gesto que espelhe a URL
    // (`urlComMomento`) grava `&jd=` de hoje. Um F5, um link
    // compartilhado ou uma aba restaurada devolviam esse `?jd=` ao boot
    // — e a guarda `!this.debug.has('jd')` entregava o relógio do filme
    // a ele: os corpos na data de hoje, a câmera no roteiro, a Terra a
    // 263 milhões de km na coda em vez de 34.868. NENHUMA porta de
    // visitante tira o relógio do filme. O `?jd=` segue mandando no
    // Atlas — `aplicarPortaJd` o reaplica quando o portal abre.
    if (this.phase === 'journey') {
      this.maquinaDoTempo.jdPedido = this.filme.jdDoFilme(this.journeyT);
    }

    // ------------------------------------------------------------
    // O SOL SOB A LEI DO PALCO (F2 da onda do Sol real) — o gate em
    // pixels e o registro no palco moram no módulo (corte 8;
    // director/solNoQuadro.ts, com a aritmética e a doutrina escritas).
    //
    // AQUI e não depois do `sun.update` (onde a F1 o deixou): o near lê
    // o palco umas 100 linhas abaixo, então registrar lá embaixo dava ao
    // clip a superfície do quadro ANTERIOR. É o mesmo lugar em que a
    // Terra e a Lua se registram, pela mesma razão escrita.
    this.solNoQuadro.armarGate({ dHome, hPx, fovDeg: cam.fov });

    // OS DOZE CORPOS DO PALCO num laço só (item 63, 22/08): o passo
    // mora em `director/palco.ts`, junto do contrato dos quatro traços
    // que distinguem um corpo do outro. Roda ANTES de o near ler o
    // palco — o corpo que entra em quadro NESTE tick já governa o clip
    // NESTE tick.
    if (this.stars) {
      const q = this.quadroDoPalco;
      q.jdTdb = this.maquinaDoTempo.jdVivo;
      q.fonte = this.maquinaDoTempo.efemeride;
      q.camPosPc = cam.position;
      q.screenHPx = hPx;
      q.fovDeg = cam.fov;
      q.ligado = this.palco.ligado;
      q.politica = this.politicaDeLuz;
      q.luzDoRoteiro = this.luzDoRoteiro;
      // o relógio de PAREDE, que só a carência da descarga lê; o `dtS` é
      // grampeado e serviria mal a uma espera de 15 s
      q.tS = rawTime;
      q.dtS = dt;
      q.pr = prAtual;
      q.salto = this.saltoDeCamera;
      passoDoPalco(this.noPalco, q, {
        palco: this.palco,
        planetas: this.planetas,
        rotulos: this.rotulos,
        efemeride: this.maquinaDoTempo.efemeride,
        // O encerramento (`end`) ainda é filme para o pino das 16:00: a
        // legenda do pálido ponto azul fica na tela com Terra e Lua, e
        // derrubar o pino ali jogava a Terra a 1,76 milhão de km no
        // primeiro recálculo (item 225).
        noFilme: this.phase === 'journey' || this.phase === 'end',
        noFoco: this.corpoNoFoco,
        noRoteiro: this.corpoNoRoteiro,
        perturbar: this.perturbarDoPalco,
      });
    }
    // O RETRATO NUNCA FINGE EFEMÉRIDE (item 5c da auditoria): com os
    // corpos em cena e a fonte PEDIDA indisponível, o tick tenta a fonte
    // uma SEGUNDA vez (a permitida por `garantirEfemerides`: "quem pediu
    // de novo") e o `captura` segura a prontidão pela janela de
    // QUADROS_TENTANDO_FONTE; se ela ainda não veio, o aviso único ACUSA
    // — quem ler o quadro dali em diante sabe que os corpos estão no
    // retrato congelado, nunca numa efeméride que não chegou.
    if (this.palco.ligado && this.maquinaDoTempo.faseDaEfemeride === 'indisponivel') {
      if (!this.retentouFonte) {
        this.retentouFonte = true;
        this.maquinaDoTempo.garantirEfemerides();
      } else if (this.quadrosTentandoFonte < QUADROS_TENTANDO_FONTE) {
        this.quadrosTentandoFonte++;
        if (this.quadrosTentandoFonte >= QUADROS_TENTANDO_FONTE && !this.acusouRetrato) {
          this.acusouRetrato = true;
          console.warn(
            '[captura] efeméride pedida indisponível: os corpos seguem no RETRATO congelado'
          );
        }
      }
    } else if (this.maquinaDoTempo.faseDaEfemeride === 'viva') {
      this.quadrosTentandoFonte = 0;
    }
    this.saltoDeCamera = false;
    const superficie = this.palco.superficieMaisProxima(cam.position);
    this.engine.updateClip(Math.min(dHome, dGC), superficie.dSuperficiePc, superficie.raioPc);

    // A Via Láctea não é um plano: os fades de AMBIENTE respondem à
    // posição da câmera no DISCO (R, z galactocêntricos), não à
    // distância do Sol — o volume local existe em qualquer ponto da
    // galáxia. Só camadas fisicamente solares continuam com dHome. A
    // conta mora em `baseGalactica` porque o roteiro também a lê.
    const inDisk = dentroDoDisco(cam.position);
    // O AMBIENTE SEGUE A POSIÇÃO em toda fase, sem exceção — o filme lê
    // o disco do mesmo jeito que o Atlas e o voo livre sempre leram
    // (relato do dono, 24/09: a galáxia sumia na volta para casa).
    const env = inDisk;

    // camadas solares (HYG, poeira próxima, hero stars): dHome
    const localFade = 1 - THREE.MathUtils.smoothstep(dHome, 1100, 2300);
    // gás volumétrico + faixa interna: qualquer ponto dentro do disco
    const nebulaFade = env;
    const galaxyFade = 1 - env;
    const localBandFade = env * 0.76;
    const markerFade = THREE.MathUtils.smoothstep(dHome, 1700, 3300);

    this.rotulos.tique(dt);
    // nuvens-semente do raymarch + cavidade do observador itinerante
    this.nuvensSemente.tique(dt, nebulaFade, cam.position, this.nebula);
    // a MESMA cavidade em todos os consumidores da densidade: raymarch,
    // extinção das estrelas e brilho da poeira próxima
    const cavityGate = THREE.MathUtils.smoothstep(dHome, 600, 1300);
    this.nebula.setCavity(cam.position, cavityGate);
    this.stars?.setCavity(cam.position, cavityGate);
    this.dust.setCavity(cam.position, cavityGate);

    if (this.debug.has('dbgfade')) {
      // quem ocupa o orçamento do clarão agora (M2): o único jeito de
      // ver a histerese da seleção viva sem abrir um profiler
      const claroes = this.clarao
        ?.ocupacao()
        .map((o) => `${o.indice}:${o.ganho.toFixed(2)}`)
        .join(' ');
      console.log(
        `[dbgfade] dHome=${dHome.toFixed(0)} gal=${galaxyFade.toFixed(2)} ` +
          `loc=${localFade.toFixed(2)} hide=[${[...this.hide].join(',')}] ` +
          `galVis=${this.galaxy?.group.visible} phase=${this.phase} jt=${this.journeyT.toFixed(1)} ` +
          `clarao=[${claroes ?? ''}]`
      );
    }

    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    this.stars?.update(cam.position, hPx, pr2Atual);
    const catFade = this.hide.has('nocat') ? 0 : localFade;
    this.wrappedStars?.update(
      cam.position,
      hPx,
      this.hide.has('nowrap') ? 0 : 1,
      catFade,
      pr2Atual
    );
    this.stars?.setFade(catFade);
    this.dust.setFade(this.hide.has('nodust') ? 0 : localFade);
    this.nebula.setFade(nebulaFade);
    // o MESMO catFade das cascas: a LUT da faixa desconta do termo
    // estelar a luz que o catálogo já desenha como estrela individual
    this.nebula.setCatalogueFade(catFade);
    // AS HEROES RESGATADAS: a mesma chave de isolamento da óptica das
    // fortes (?noclarao) esconde as duas camadas — heroes e clarão do Sol
    if (this.heroes) {
      // — e o filme em cartaz diz se o céu dele tem a arte delas (F4: o
      // solar não tem; Atlas e voo livre seguem com elas)
      const doFilme = this.phase === 'intro' || this.phase === 'journey' || this.phase === 'end';
      this.heroes.group.visible =
        !this.hide.has('noclarao') && (!doFilme || this.filme.heroes);
      this.heroes.update(
        time,
        cam.position,
        Math.tan((this.engine.camera.fov * Math.PI) / 360)
      );
    }
    // O CORPO E O CLARÃO DO SOL PELA LEI (corte 8): a repartição decide
    // filtro, peso e soltura, e o clarão consome a soltura no MESMO
    // quadro — o assunto inteiro em director/solNoQuadro.ts; a cessão
    // do ponto sai da mesma repartição, no bloco da camada (abaixo)
    this.solNoQuadro.atualizarCorpoEClarao({
      dHome,
      hPx,
      prAtual,
      tanHalfFov,
      camPos: cam.position,
      dtS: dt,
    });
    // O SOL OBEDECE AO CALENDÁRIO (item 5): a fase do ciclo sai da data
    // simulada, e o filme só atenua a OCUPAÇÃO no arranque — uma dose
    // declarada no selo, nunca uma fase inventada. Escrito ANTES do
    // `update` porque o passe do disco (`spotsUpdate`, no
    // `onBeforeRender`) lê a fase: escrever depois desenharia um quadro
    // com as manchas da data anterior.
    this.sun.escreverCiclo(faseDoCiclo(this.maquinaDoTempo.jdVivo));
    this.sun.escreverDose(
      this.phase === 'journey' ? this.filme.doseDoSol(this.journeyT) : 1
    );
    // O SOLAVANCO (item 17): a taxa do relógio do ATLAS, e só dele. No
    // filme e na foto a máquina do tempo está parada, então `taxaViva` é
    // 1 e o lapso é 0 — a fase da cena não muda um pixel.
    this.sun.escreverLapso(
      this.phase === 'atlas' ? this.maquinaDoTempo.taxaViva : 1
    );
    // O GIRO PELA DATA DO FILME (F4): no filme que o pede
    // (`giroPeloRelogio`) o Sol gira pelo relógio dele, e o mesmo instante
    // mostra as mesmas manchas em toda sessão; no galáctico, na capa e
    // fora do filme (Atlas, voo livre, fim), pelo tempo de tela de sempre
    this.sun.escreverRelogioDeCena(
      this.phase === 'journey' && this.filme.giroPeloRelogio
        ? this.filme.jdDoFilme(this.journeyT)
        : null
    );
    this.sun.update(time, this.engine.camera);
    // O OCLUSOR DA NEBULOSA. A fotosfera está na ORIGEM (o grupo do Sol
    // só é escalado, nunca posicionado) e o raio de mundo dele é
    // `solRaioPc` por construção (esfera de 2,2 do doador × escala
    // solRaioPc/2,2). Enquanto ela estiver na cena, o raymarch da
    // nebulosa não precisa integrar o que ela cobre — ver o cone em
    // nebula.ts, que já encolhe sozinho e desliga quando o ângulo seguro
    // fica abaixo de um texel. Com o raio FÍSICO da F3 esse
    // desligamento é a regra em quase toda a viagem: a cavidade que a
    // casa pulava tinha 2.269 UA de raio, e a de agora cabe dentro da
    // órbita de Mercúrio.
    this.nebula.setSunOccluder(ORIGEM, this.sun.group.visible ? this.solRaioPc : 0);
    // (o registro do Sol no palco SUBIU para junto do da Terra e da Lua
    // na F2 — o near lê o palco antes daqui, e da F1 até agora o clip
    // recebia a superfície do quadro anterior.)
    // A CAMADA DE PLANETAS (Onda 4, D3/D7), logo depois do Sol porque é
    // a continuação dele: o Sol de longe É o vértice 0 desta camada, em
    // TODA distância de ponto — a entrega ao `SunStar` e o corte de
    // 0,05 pc morreram no M1 da Lei da Estrela. Quem apaga o Sol-ponto
    // de longe é a magnitude; quem o cede de perto é a repartição. A
    // A CHAVE e a porta `?plan=1` morreram no M4 (regra iv do §4 da
    // Lei): a camada é o padrão desde 2026-08-11 e o ramo de "forçar
    // ligado" não tinha mais lado A para proteger. Fica `?noplan=1`,
    // que é LENTE de régua, não porta de migração.
    if (this.planetas) {
      this.planetas.ligado = !this.hide.has('noplan');
      // A MÁQUINA DO TEMPO (F4/D2), ANTES do quadro e fora dele: o
      // método vivo tem cache por jd e devolve na primeira linha quando
      // o instante não mudou, que é o caso de todo quadro do filme e de
      // todo quadro do Atlas parado. Sem efeméride carregada a camada
      // fica exatamente no retrato — o caminho honesto do "sem rede".
      // `grampearJd` e não `this.tempo`: o mostrador formata strings e
      // aloca um objeto — ele é para o HUD, a 4 Hz, não para o quadro.
      if (this.maquinaDoTempo.efemeride) {
        this.planetas.escreverInstante(this.maquinaDoTempo.jdVivo, this.maquinaDoTempo.efemeride);
      }
      this.planetas.update(hPx, cam.position, pr2Atual);
      // a cessão do Sol-ponto é a MESMA repartição do quadro (corte 8;
      // a doutrina inteira em director/solNoQuadro.ts, §8.5 incluído)
      this.solNoQuadro.cederPonto(this.planetas);
    }
    // AS LINHAS DE ÓRBITA (item 77), logo depois dos pontos porque são a
    // leitura deles: o ponto diz ONDE o corpo está, a linha diz por onde
    // ele anda. A chave governa a CAMADA e só ela, no mesmo idioma de
    // `?noplan`.
    //
    // O INSTANTE VIVO ANTES DO QUADRO, e pela mesma disciplina da camada
    // de cima: o método tem guarda por jd e por linha apagada, então
    // todo quadro de Atlas parado (e todo quadro do filme, que nem
    // chega aqui sem efeméride) sai dele na primeira comparação. SEM
    // EFEMÉRIDE NÃO HÁ LINHA — a curva sai do estado do instante, e o
    // retrato congelado desenharia a órbita de 2026 sob o ponto de 2035
    // (`orbitas.ts`, §6). Nenhum download novo nasce daqui: o Atlas já
    // acende a efeméride ao entrar (`palcoQuente`).
    if (this.orbitas) {
      this.orbitas.ligado = !this.hide.has('noorbitas');
      // O FOCO MANDA NA CENA (item 83 · L1): a camada LÊ o `focoCorpoId`
      // da Escada, que é a única escritora do foco na casa — o mesmo
      // valor que o selo lê para o ΔEV. Escrito aqui, junto da porta,
      // porque as duas são estado de quadro e têm de andar no mesmo
      // passo: uma camada que aprendesse o foco um quadro depois
      // realçaria a órbita do alvo ANTERIOR.
      this.orbitas.foco = this.escada.focoCorpoId;
      if (this.orbitas.ligado && this.maquinaDoTempo.efemeride) {
        this.orbitas.escreverInstante(
          this.maquinaDoTempo.jdVivo,
          this.maquinaDoTempo.efemeride
        );
      }
      // ONDE OS CORPOS ESTÃO ACESOS, para a linha ceder ao núcleo deles
      // (decisão do dono, 25/08 — ver `RAIO_DA_CESSAO_PX`). A fonte é a
      // MESMA que os rótulos do Atlas leem (`Planetas.posicoes`, o
      // Float32Array vivo do atributo), e não um segundo cadastro: uma
      // cópia aqui seria a fonte que a máquina do tempo desmentiria no
      // primeiro salto de data. Camada apagada ⇒ nenhum núcleo, e a
      // linha volta a ser inteira. Quem PROJETA é a camada, no próprio
      // `update` — aqui só se entrega a fonte.
      //
      // AS TRÊS MEDIDAS SÃO DO BUFFER, e é o que o shader espera: largura e
      // altura do canvas mais o `pixelRatio` vivo. `hPx` já era buffer (vem
      // de `domElement.height`); o que faltava era a largura e a escala, e
      // era dessa falta que o disco de cessão nascia torto em Retina.
      this.quadroDasOrbitas.larguraPx = this.engine.renderer.domElement.width;
      this.quadroDasOrbitas.alturaPx = hPx;
      this.quadroDasOrbitas.pixelRatio = this.engine.renderer.getPixelRatio();
      // A FASE VAI JUNTO porque o FILME NÃO TEM LINHA (item 77, decisão
      // 3 — autorização dele de 25/08: *"tirar do filme (aceito recriar
      // a separação entre modos só aí)"*). Quem decide é o mapa
      // `LINHAS_DE_ORBITA_POR_FASE`, e ele é a ÚNICA regra por modo que
      // apaga uma camada: o item 61 matou as outras, e ninguém estende esta para
      // brilho, lente ou nomes. A doutrina está em `fases.ts`; o gate,
      // dentro do `update` (§7 de `orbitas.ts`), onde não há fio a
      // cortar em silêncio.
      this.orbitas.update(
        this.engine.camera,
        this.quadroDasOrbitas,
        tanHalfFov,
        dt,
        this.planetas?.ligado ? this.planetas.posicoes : null,
        // as luas VIVAS, do mesmo array que os nomes leem — o passo do
        // palco já o escreveu neste tique, umas 240 linhas acima
        this.rotulos.posicoesDasLuas,
        this.phase
      );
    }
    this.dust.update(cam.position, hPx, time);
    // Sgr A*: só de perto (a extinção real esconde o centro de longe);
    // as capturas de medição ficam a 24/33 kpc — fade 0, passe desligado
    this.blackHole?.updateFrame(
      cam.position,
      cam,
      time,
      this.hide.has('nobh') ? 0 : 1 - THREE.MathUtils.smoothstep(dGC, 1400, 2400)
    );
    // AUTO-EXPOSIÇÃO: a vista externa é outro assunto fotográfico. A
    // rodada 18 venceu com 1,40 (sem knee); a rodada 20, com o knee
    // asinh no pós e chromsat na extinção assumindo a compressão, mediu
    // o ótimo CONJUNTO em 1,05 (edge 0,8275, face 0,0517 — os dois
    // recordes). Dentro do disco (fade 0) fica o 1,02 de sempre — a
    // vista interna não tem gate e satura fácil de branco.
    //
    // E DESDE A Q14 (26/08, item 91) A POLÍTICA DE LUZ COMPÕE COM A RAMPA:
    // em `?luz=real` o quadro abre +3 passos FIXOS (`exposicaoDoQuadro`,
    // `luzDaVisita.ts`), o que dentro do disco dá os 8,16 da coluna R1 que
    // ele julgou. É exposição do QUADRO — a penumbra física do globo não
    // é tocada, e o teto de brilho continua proibido. A conta vive lá e
    // não aqui porque quem a governa é a POLÍTICA; aqui só se aplica.
    //
    // A LEITURA É VIVA, e é isso que faz a porta de duas vias do selo
    // levar a exposição junto no MESMO gesto: `definirLuz` troca o campo e
    // `perturbar()` acorda o laço — o quadro seguinte já sai com a chapa
    // nova, sem recarga. O latch `expOverride` continua vencendo os dois:
    // a mão do visitante é dona da exposição (ver `exposicaoDoQuadro`).
    // A LUZ DO ROTEIRO (F2b) entra na MESMA conta: na travessia a chapa
    // abre +3·k passos, pelo mesmo `kDaLuz` que move o globo.
    if (!this.expOverride) {
      this.engine.setExposure(
        exposicaoDoQuadro(1.02 + 0.03 * galaxyFade, this.politicaDeLuz, this.luzDoRoteiro)
      );
    }
    // ?galstat=1 — quantos dos 4,02 M pontos da galáxia estão DENTRO do
    // frustum. Roda uma vez, no primeiro quadro, e guarda em window.__galstat.
    // Existe porque o custo do passe é LINEAR na contagem submetida (medido:
    // 1,22 ms por milhão, intercepto zero), então esta fração é o outro fator
    // do produto — e sem ela qualquer conta sobre recorte é fé. Medido:
    // 2,55% em t=0 · 2,00% em t=100 · 49,3% em t=180 · 99,98% no face-on.
    if (this.debug.has('galstat') && !(window as unknown as { __galstat?: unknown }).__galstat) {
      const pts = (this.galaxy as unknown as { brightPts?: THREE.Points })?.brightPts;
      if (pts) {
        const fr = new THREE.Frustum().setFromProjectionMatrix(
          new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)
        );
        const pos = pts.geometry.attributes.position;
        const v = new THREE.Vector3();
        // margem: ponto FORA do frustum ainda aparece pelo tamanho dele (até
        // o teto da lei de tela, 20 px). A 8 kpc, 10 px valem ~37 pc; 50 é folga.
        const sp = new THREE.Sphere(new THREE.Vector3(), 50);
        let dentro = 0;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          sp.center.copy(v);
          if (fr.intersectsSphere(sp)) dentro++;
        }
        (window as unknown as { __galstat: unknown }).__galstat = {
          total: pos.count, dentro, pct: +((100 * dentro) / pos.count).toFixed(2),
        };
      }
    }
    this.galaxy?.update(
      cam.position,
      hPx,
      tanHalfFov,
      time,
      this.hide.has('nogal') ? 0 : galaxyFade,
      this.hide.has('nomarker') ? 0 : markerFade,
      this.hide.has('nogal') ? 0 : localBandFade
    );
    // Nuvens moleculares já entram integradas no structureMap da vista
    // externa. Billboards 3D ficam só no disco, onde a paralaxe comunica
    // profundidade; no zoom-out duplicavam o dado como buracos circulares.
    // Traçadores estelares continuam visíveis em ambas as escalas.
    const cartHidden = this.hide.has('nocart') || this.hide.has('nogal');
    this.observedClouds?.update(
      tanHalfFov,
      // As nuvens CO medidas são as fendas REAIS da Via Láctea; ficarem
      // em fade 0 na vista externa era jogar fora a tonalidade delas
      // justamente na vista que a mostra melhor.
      // soma, não max: rampas complementares (ver galaxy.ts, mesmo defeito)
      cartHidden || this.hide.has('noco')
        ? 0
        : galaxyFade * 0.55 + localBandFade * 0.72
    );
    this.starForges?.update(
      cam.position,
      hPx,
      tanHalfFov,
      time,
      cartHidden || this.hide.has('noforge')
        ? 0
        : galaxyFade + localBandFade * 0.6
    );

    // debug: posição projetada de Betelgeuse
    if (this.debug.has('dbgstar') && this.meta) {
      const b = this.meta.named.find((s) => s.n === 'Betelgeuse');
      if (b) {
        const v = new THREE.Vector3(b.x, b.y, b.z).project(cam);
        console.log(
          `[dbgstar] cam=${cam.position.toArray().map((n) => n.toFixed(1))} ` +
            `betel_ndc=(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(3)}) ` +
            `dist=${cam.position.distanceTo(new THREE.Vector3(b.x, b.y, b.z)).toFixed(2)}`
        );
      }
    }

    // debug: a régua 2 da Onda 4 (D10) — posição projetada dos 10 corpos
    // lida do Float32Array REAL do atributo, com a câmera DESTE quadro.
    // Um `console.log` por quadro com o bloco inteiro (e não dez): o
    // leitor por CDP recebe a tabela em UMA mensagem.
    if (this.debug.has('dbgplan') && this.planetas) {
      console.log(this.planetas.dbg(cam, this.engine.renderer.domElement.width, hPx));
    }

    // debug: as linhas de órbita ACESAS (item 77) — a régua do fade por
    // tamanho angular, que a olho só se julga por ausência ("sumiu por
    // quê?"). Uma mensagem por quadro, no molde do `?dbgplan`.
    if (this.debug.has('dbgorbitas') && this.orbitas) {
      console.log(this.orbitas.dbg());
    }

    // rótulos a cada frame — projeção, linha de rumo e distância do Sol
    // moram no módulo (corte 7); o quadro entrega fase, catálogo, dHome
    // e a camada dos corpos, e o clique lê a MESMA lista por `alvos`
    this.rotulos.projetar(cam, {
      fase: this.phase,
      named: this.meta?.named ?? null,
      dHome,
      planetas: this.planetas,
      // o alvo escolhido tem prioridade 100 na disputa dos nomes (item
      // 73): o dono do foco é a escada, e o rótulo só precisa do id
      foco: this.escada.focoCorpoId,
      // a camada "Nomes na tela" (item 82, N2) — lida aqui com as
      // outras dezoito, e entregue pronta ao produtor
      nomesEscondidos: this.hide.has('nonomes'),
      iconesEscondidos: this.hide.has('noicones'),
      // a beta só cala o texto 2D com o pintor 3D VIVO: o chunk chega
      // pela rede (import tardio) e, até lá — ou se a carga falhar —,
      // o corpo focado continua com nome (item 109)
      texto3d: this.rotulos3dLigado && !!this.rotulos3d,
    });
    // a camada 3D espelha o QUE ESTE QUADRO decidiu desenhar — depois
    // do projetar, para o texto nunca correr um quadro atrás do anel.
    // (O `desenhado` deste quadro é escrito pelo LabelCanvas no draw do
    // MESMO tick, via onLabels; aqui a lista já saiu do forno.)
    this.rotulos3d?.sincronizar(
      this.rotulos3dLigado && this.phase === 'atlas',
      cam,
      this.rotulos.alvos,
      (key) =>
        this.rotulos.posicaoDoCorpo(
          key,
          this.planetas ? this.planetas.posicoes : null,
          CORPOS_DO_SISTEMA
        ),
      // e o RAIO FÍSICO do mesmo corpo, na mesma unidade da posição: é
      // com ele que o nome passa à frente da casca em vez de nascer
      // dentro dela (item 109, o engolimento de perto). A fonte é a da
      // escada — a MESMA que dá o piso do zoom e o raio das malhas.
      (key) => this.escada.raioFisicoDe(key.slice(CHAVE_DE_CORPO.length))
    );
    this.post.setGalaxy(galaxyFade);
    this.post.setWarp(this.reducedMotion ? 0 : warp);
    // A PIRÂMIDE DA POEIRA (E3c): a fonte que o pedido quer agora, o
    // aquecimento dos materiais dela (desde o clique, antes da troca) e,
    // com a câmera DESTE quadro, o lote da residência na GPU — antes do
    // desenho, e mesmo com o gás apagado (longe de casa é assim que ela
    // solta a memória). Sem ninguém que a leia (`gasLeAPiramide`), nada
    // disso roda. `rawTime`: o relógio de parede, o da carência.
    this.garantirPiramide();
    this.prepararPiramide();
    if (this.gasLeAPiramide) {
      if (this.piramideDesejada !== null) this.nebula.aquecerPiramide(this.engine.renderer);
      this.nebula.atualizarPiramide(this.engine.renderer, rawTime, cam);
    }
    // gate 0.02: na casca externa do fade a contribuição é invisível
    // pós-ACES, mas o raymarch custaria integral
    if (this.noNebula || nebulaFade <= 0.02) {
      // longe de casa o céu é o preto profundo — a galáxia é a luz
      this.engine.scene.background = this.noNebula ? this.deepBg : this.bgColor;
    } else {
      this.engine.scene.background = this.nebula.texture;
      this.nebula.render(this.engine.renderer, cam);
    }
    // C6 — o halo de contorno, fundido no FILM_SHADER de `this.post`
    // (zero passe extra): escreve os uniforms ANTES do render, para o
    // halo sair NESTE quadro e não no seguinte; o shader o soma por cima
    // do composite científico. Sai sozinho na primeira linha quando não
    // há abertura em curso (`ContornoDaUi.desenhar`); nada roda em repouso.
    this.contorno.desenhar(this.post);
    this.post.render(time);
    // DEPOIS do render, e é o único lugar que soma: o sinal de prontidão
    // conta quadros DESENHADOS, não quadros agendados (ver `captura`).
    this.quadrosEstaveis++;
    // e o mesmo critério — DESENHADO — para "o modo já está na tela"
    this.quadrosDaFase++;
    // CONTADOR DE FPS NA TELA (E2): só existe com ?fps=1 (ver
    // constructor); lê `window.__poeira` por conta própria (bake mais
    // recente da Nebula + o relógio de quadro logo abaixo — ver
    // `contadorDeFps.ts`). `performance.now()` e não `time`/`rawTime`: o
    // contador mede o quadro REAL, mesmo congelado no modo foto
    // (`shotMode`) ou com a viagem em pausa.
    this.contadorFps?.atualizar(performance.now());
    // RELÓGIO DO QUADRO (item G + item C, revisão independente v2,
    // 27/09): intervalo REAL entre quadros — ver
    // `intervalosDeQuadroMs`/`descartarProximoIntervaloDeQuadro` acima
    // (o quadro 1 e o primeiro depois de a aba voltar de escondida não
    // viram amostra: o vão não é custo de quadro de verdade).
    // `diagnosticoDaPoeira()` (lib/, item 1) é o inicializador ÚNICO de
    // `window.__poeira`, partilhado com `Nebula.bake`: sem ele, o
    // objeto podia nascer PARCIAL (o outro lado escreve primeiro, só
    // com os campos dele) — e devolve um objeto local sob
    // `environment: node` (director.test.ts, sem `window` de verdade),
    // então este trecho não precisa mais da própria guarda de `typeof
    // window`. `estatisticasDeQuadro` (mesmo módulo) é o máximo/p95 da
    // janela recente, extraída para testar sem WebGL;
    // `quadroMaxDesdeMarcaMs` é o pior valor ACUMULADO desde a última
    // marca — sobrevive ao esquecimento da janela de 300 quadros (um
    // pico raro que ela já descartou); `window.__poeira.reiniciar()`
    // zera as duas.
    const agora = performance.now();
    const d = diagnosticoDaPoeira();
    if (this.descartarProximoIntervaloDeQuadro) {
      this.descartarProximoIntervaloDeQuadro = false;
    } else {
      const janela = this.intervalosDeQuadroMs;
      janela.push(agora - this.ultimoQuadroPerf);
      if (janela.length > 300) janela.shift();
      const { maxMs, p95Ms } = estatisticasDeQuadro(janela);
      d.quadroMaxMs = maxMs;
      d.quadroP95Ms = p95Ms;
      d.quadroMaxDesdeMarcaMs = Math.max(d.quadroMaxDesdeMarcaMs, maxMs);
    }
    this.ultimoQuadroPerf = agora;
    d.quadros++;
    // ENCERRAMENTOS PUBLICADOS (item B, revisão independente v2, 27/09):
    // recalcula e publica (com a guarda de mudança de `publicarPoeira`)
    // A CADA quadro — é o único jeito de a transição carregando → ativa
    // que só a `Nebula` decide (o bake que assenta o bloco) chegar ao
    // React sem esperar o próximo `definirPoeira`/troca de qualidade.
    this.publicarPoeira();
  }


  /**
   * A SESSÃO ACABOU NO MEIO — para o laço e manda a falha para o véu.
   *
   * Uma vez só (`desistiu`): contexto perdido e exceção em quadro podem
   * chegar juntos, e o segundo aviso só trocaria a mensagem do primeiro
   * pela consequência dele.
   *
   * NÃO CHAMA `dispose()`, ao contrário do `.catch` do boot. Ali não há
   * nada na tela a preservar; aqui o véu desenha POR CIMA do último
   * quadro, e desmontar o mundo trocaria a imagem congelada por um
   * canvas vazio sem devolver nada — a página inteira morre no
   * "Tentar novamente", que recarrega.
   */
  private desistiu = false;
  private desistir(mensagem: string) {
    if (this.desistiu || this.disposed) return;
    this.desistiu = true;
    this.engine.parar();
    this.events.onErro(mensagem);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.preferenciaDeMovimento?.removeEventListener('change', this.aoMudarMovimento);
    document.removeEventListener('visibilitychange', this.aoMudarVisibilidade);
    // aborta JÁ (os fetches em voo não interessam mais); o resto pode
    // esperar
    this.abortController.abort();
    // A pré-compilação do three faz polling por setTimeout lendo
    // `materialProperties.currentProgram` de cada material da lista.
    // Qualquer material.dispose() nosso remove essas propriedades e o
    // polling seguinte estoura com "isReady of undefined" — dentro de um
    // timer, fora de qualquer try/catch. Então o teardown INTEIRO espera
    // o warm-up assentar. (Só aparecia em dev: a limpeza do efeito do
    // React durante o Fast Refresh caía no meio da carga.)
    if (this.warmup) {
      void this.warmup.catch(() => {}).then(() => this.teardown());
      return;
    }
    this.teardown();
  }

  private teardown() {
    // `disposed` já está travado: um passo que estoure NÃO pode levar
    // junto o resto do teardown. Sem isto, uma exceção no meio deixava
    // o Engine vivo — RAF rodando uma cena zumbi e o contexto WebGL
    // preso para sempre, porque a segunda chamada retorna no início.
    // (A blindagem é a MESMA do desmonte do mundo velho na troca de
    // tier — uma lei, um lugar: `passoBlindado`.)
    const step = (label: string, fn: () => void) =>
      this.passoBlindado('dispose', label, fn);
    step('roam', () => this.roam.dispose());
    step('listeners', () => this.gestos?.desligar());
    // ?fps=1 (E2): o <div> do mostrador não é descartado com o resto —
    // sem isto, um segundo Director (Fast Refresh em dev) herdava o
    // mostrador órfão da sessão anterior na tela.
    step('contadorFps', () => this.contadorFps?.descartar());
    step('blackHole', () => this.blackHole?.dispose());
    // recursos do mundo ANTES do renderer: material descartado depois
    // de renderer.dispose() não chama deleteProgram
    step('stars', () => this.stars?.dispose());
    step('clarao', () => this.clarao?.dispose());
    // as heroes andam com o clarão (as duas camadas de asa) e faltavam
    // desta lista desde que nasceram: medido em 21/08, um `dispose()` do
    // Director deixava 16 geometrias e 16 materiais vivos, que são
    // exatamente os das 16 nomeadas de autor
    step('heroes', () => this.heroes?.dispose());
    step('galaxy', () => this.galaxy?.dispose());
    step('observedClouds', () => this.observedClouds?.dispose());
    step('starForges', () => this.starForges?.dispose());
    step('wrappedStars', () => this.wrappedStars?.dispose());
    step('dustMap', () => this.dustMapTexture?.dispose());
    step('structureMap', () => this.structureMapTexture?.dispose());
    step('sun', () => this.sun.dispose());
    // a camada nasce depois do await do init: falha de carga chega aqui
    // com ela indefinida
    step('planetas', () => this.planetas?.dispose());
    step('orbitas', () => this.orbitas?.dispose());
    // a beta dos rótulos 3D (item 109) nasce de import tardio e pode nem
    // existir; sem este passo, até 31 Texts do troika (geometria +
    // material derivado + textura SDF cada) sobreviviam ao dispose — a
    // mesma classe de vazamento medida nas heroes em 21/08
    step('rotulos3d', () => {
      this.rotulos3d?.dispose();
      this.rotulos3d = undefined;
    });
    // um passo por corpo, e não um por grupo: `passoBlindado` isola a
    // falha (teardown que falha não leva os outros junto — NORTE)
    for (const posto of this.noPalco) {
      step(posto.id, () => posto.corpo.dispose());
    }
    step('palco', () => this.palco.dispose());
    step('dust', () => this.dust.dispose());
    step('nebula', () => this.nebula.dispose());
    step('post', () => this.post.dispose());
    step('contorno', () => this.contorno.dispose()); // C6
    step('engine', () => this.engine.dispose());
  }
}
