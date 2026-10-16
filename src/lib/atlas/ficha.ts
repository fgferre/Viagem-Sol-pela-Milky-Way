// ============================================================
// A FICHA DE UM CORPO — a montagem, e só ela.
//
// O ANTI-PADRÃO QUE ESTE ARQUIVO EXISTE PARA NÃO REPETIR está nomeado no
// `docs/NORTE.md` e é literalmente o painel do doador: `Sidebar.tsx`, 778
// linhas em que vis-viva, parser de sobrescrito Unicode e Tailwind moram no
// mesmo corpo. Aqui a conta e o texto ficam deste lado — sem three, sem
// React, testável em milissegundos —, e `FichaDoObjeto.tsx` só desenha o que
// sair daqui.
//
// SETE SEÇÕES NA ORDEM DO INTERESSE, que é a lição que o doador aprendeu
// tarde ("live state first, reference after"): o que está acontecendo AGORA,
// depois o corpo, depois a órbita, depois o céu, e só então a enciclopédia —
// e a imagem, que é a única que fala do INSTRUMENTO e não do mundo. A ficha
// de ESTRELA tem UMA seção e nenhuma dessas: ela vive de catálogo, e o que
// se escrevesse de prosa sobre as 1.726 nomeadas seria inventado.
//
// CAMPO AUSENTE NÃO VIRA LINHA. Nunca "N/A", nunca "—", nunca zero no lugar
// de uma medida que não existe. Makemake não tem massa no kernel: a ficha
// dele simplesmente não tem a linha da massa. Seção que ficou sem nenhuma
// linha não é desenhada.
//
// E O INGLÊS CHEGA AQUI DESDE O ITEM 130/F2. Os campos editoriais dos 48
// corpos com ficha nasceram em inglês, escritos pelo dono no projeto doador,
// e o pt-BR é que foi traduzido deles; o gerador media uma língua contra a
// outra e jogava o inglês fora. Agora `corpos.json` traz as DUAS, e
// `editorialDoIdioma` escolhe. O pt-BR é o PISO: corpo sem `en` cai nele em
// vez de perder a seção, porque uma ficha muda é pior que uma ficha na outra
// língua. Onde faltarem as duas, a linha SOME, como sempre.
//
// UM VOCABULÁRIO DE PROCEDÊNCIA SÓ: os três tiers de `selo.ts`
// (`medido | derivado | artistico`). O doador tinha quatro rótulos próprios
// ("measured asset", "observational model", "interpretive", "procedural") e
// trazê-los criaria a segunda fonte de verdade sobre honestidade nesta casa.
//
// A GRAFIA NÃO NASCE AQUI. `lib/unidades.ts` decide o degrau da distância
// (`notaDeDistancia`) e a vírgula das três grandezas que a ficha escreve —
// `comCasas`, `formatarMassaKg`, `formatarRazaoTerra` —, e `numeroDoIdioma`
// (`three/tempoDoAtlas`) é o formatador injetado. Quem escrever aqui uma
// formatação nova está criando bug, não exceção.
// ============================================================
import {
  comCasas,
  formatarMassaKg,
  formatarRazaoTerra,
  notaDeDistancia,
  UA_POR_PC,
} from '../unidades';
import { NOMES_DOS_CORPOS, classeEmTexto, nomeDoCorpo } from '../../three/atlasConfig';
import { decimalDoIdioma, idiomaAtual, t } from '../idioma';
import type { Procedencia } from '../../three/selo';
import { numeroDoIdioma } from '../../three/tempoDoAtlas';
import { AU_KM } from './elementosOrbitais';
import {
  gravidadeSuperficie,
  massaDeGm,
  raioEquatorialKm,
  razaoTerra,
  velocidadeDeEscape,
} from './fisicaDoCorpo';
import { geometriaNoCeu, quemTemGeometriaNoCeu } from './geometriaNoCeu';
import { IAU_ORIENTATIONS } from './iauOrientation';
import type { PosicaoEcliptica } from './kepler';
import { REGISTRO_ORBITAL } from './registroOrbital';
import { designacaoDeBayer } from './constelacoes';
import { temperatureFromBV } from './stellarPhysics';
import type { NamedStar } from '../../three/config';
import { REGUA_DOS_MAPAS, alvoDoMapa, type Matiz, type MedidaDoCorpo } from './reguaDosMapas';
import RELATORIO_DA_REGUA from './reguaDosMapas.relatorio.json';
import type {
  EntradaDeTextura,
  ManifestDeTexturas,
  PartesDoSelo,
  TextoBilingue,
} from '../../three/world/corpos/texturas';

// ---------------------------------------------------------------- formas

/** Uma linha da ficha: rótulo à esquerda, valor à direita, procedência. */
export interface LinhaDaFicha {
  rotulo: string;
  valor: string;
  /** o "×Terra", quando ele carrega informação (ver `razaoTerra`) */
  badge?: string;
  /**
   * o selo; AUSENTE só na seção da imagem — no crédito (fonte, licença,
   * atribuição), que não confessa nada, e na linha que não se aplica
   */
  procedencia?: Procedencia;
  /**
   * AS PARTES DO SELO, só na linha mista da imagem (16/10/2026): cada tier
   * presente, de medido a artístico, com a porcentagem da área já escrita na
   * língua de agora. Ausente, o selo é o de um tier só, como sempre; com
   * elas, `procedencia` continua sendo o mais fraco.
   */
  partes?: { procedencia: Procedencia; texto: string }[];
  /** de onde veio o número, em quatro ou cinco palavras */
  fonte?: string;
}

export type IdDeSecao =
  | 'agora'
  | 'fisico'
  | 'orbita'
  | 'ceu'
  | 'contexto'
  | 'curiosidades'
  | 'imagem'
  /** a única de ESTRELA — as outras sete são todas de corpo */
  | 'estrela';

export interface SecaoDaFicha {
  id: IdDeSecao;
  titulo: string;
  linhas: LinhaDaFicha[];
}

export interface Ficha {
  id: string;
  /** o nome que o visitante lê, na língua de agora (item 130/F2) */
  nome: string;
  /** a palavra que diz o que ele é, no vocabulário da legenda */
  classe: string;
  secoes: SecaoDaFicha[];
}

/** O editorial de um corpo, como ele sai de `public/data/atlas/corpos.json`. */
export interface EditorialDoCorpo {
  description?: string;
  curiosity?: string;
  facts?: string[];
  records?: string[];
  explorationMilestone?: { year: number; description: string };
  info?: string;
}

export interface CorpoNoJson {
  id: string;
  type: string;
  name: { en: string; pt: string };
  orbita?: { periodoDias: number; minUa: number; maxUa: number };
  semAlvo?: boolean;
  /**
   * Só os 48 alvos têm; os seis sem alvo saem do gerador sem a chave. As
   * duas línguas trazem, POR CONSTRUÇÃO DO GERADOR, os mesmos campos e o
   * mesmo tamanho de lista — `en` é opcional aqui só para que um
   * `corpos.json` antigo, de antes do item 130/F2, ainda monte a ficha em
   * pt-BR em vez de quebrar.
   */
  editorial?: { pt: EditorialDoCorpo; en?: EditorialDoCorpo };
}

/**
 * A PROSA NA LÍNGUA DE AGORA, com o pt-BR de piso (item 130/F2). Chamada uma
 * vez por montagem de ficha, e o resultado atravessa as duas seções de prosa
 * — nenhuma delas pergunta a língua, que é o que as manteve puras.
 */
function editorialDoIdioma(corpo: CorpoNoJson | null | undefined): EditorialDoCorpo | undefined {
  const editorial = corpo?.editorial;
  if (!editorial) return undefined;
  return idiomaAtual() === 'en' ? (editorial.en ?? editorial.pt) : editorial.pt;
}

export interface CorposDoAtlas {
  corpos: CorpoNoJson[];
}

/**
 * O QUE A FICHA PRECISA DA EFEMÉRIDE — as quatro perguntas, e nada além
 * delas. `MotorEfemerides` satisfaz esta forma sem saber que ela existe, e é
 * assim que a montagem se testa sem carregar um `.bin` de 785 KB.
 */
export interface FonteDaFicha {
  posicao(bodyId: string, jdTdb: number): PosicaoEcliptica;
  velocidade(bodyId: string, jdTdb: number): PosicaoEcliptica;
  posicaoHeliocentrica(bodyId: string, jdTdb: number): PosicaoEcliptica;
  notaDeValidade(bodyId: string, jdTdb: number): TextoBilingue;
}

export interface EntradaDaFicha {
  id: string;
  /** o instante MOSTRADO pela máquina do tempo; sem ele não há "agora" */
  jd?: number | null;
  /** a efeméride viva; `null` antes de ela chegar pela rede */
  fonte?: FonteDaFicha | null;
  /** o corpo em `corpos.json`; `null` antes de o arquivo chegar */
  editorial?: CorpoNoJson | null;
  /** o manifesto de `texturas.json`; `null` antes de o arquivo chegar */
  texturas?: ManifestDeTexturas | null;
  /** onde a CÂMERA está, em eclíptica heliocêntrica UA; `null` fora do
   *  Atlas — é o "daqui" da linha de iluminação */
  camaraUa?: readonly [number, number, number] | null;
  /** o fator das alturas que a TELA desenha (item 232) — 1 (ou ausente)
   *  é o relevo medido; acima disso a seção da imagem confessa o realce */
  realceDoRelevo?: number;
}

// ------------------------------------------------------------ formatação

const HORAS_POR_DIA = 24;
const DIAS_POR_ANO = 365.25;

/**
 * Uma DURAÇÃO em pt-BR — horas abaixo de um dia, dias abaixo de dois anos,
 * anos acima. Serve ao período orbital e ao dia sideral, que são a mesma
 * grandeza vista de dois eixos.
 *
 * NÃO É O `formatarTaxa` de `tempoDoAtlas`, e a diferença não é de estilo:
 * aquele escreve uma RAZÃO ("2,8 horas por segundo"), começa em segundos e
 * tem nome próprio para o tempo real. Aqui o piso é a HORA — nenhum corpo do
 * catálogo gira ou orbita em minutos, e "27.383 segundos" não é uma resposta
 * para "quanto dura o dia dele".
 *
 * `export` é ARESTA DE TESTE: quem a consome é este arquivo (o período
 * orbital e o dia sideral), e o gate dela cobra os degraus — a meia hora, o
 * plural, a duração sem medida — que nenhum corpo do catálogo exercita.
 */
export function formatarDuracao(dias: number): string | null {
  if (!Number.isFinite(dias) || dias <= 0) return null;
  if (dias < 1) {
    const horas = dias * HORAS_POR_DIA;
    return `${numeroDoIdioma(horas)} ${t(horas >= 2 ? 'ficha.horas' : 'ficha.hora')}`;
  }
  if (dias < 2 * DIAS_POR_ANO) {
    return `${numeroDoIdioma(dias)} ${t(dias >= 2 ? 'ficha.dias' : 'ficha.dia')}`;
  }
  const anos = dias / DIAS_POR_ANO;
  return `${numeroDoIdioma(anos)} ${t('tempo.anos')}`;
}

const modulo = (v: PosicaoEcliptica) => Math.hypot(v.x, v.y, v.z);

/** UA/dia → km/s, o passe único desta casa entre as duas unidades. */
const KM_POR_S_POR_UA_DIA = AU_KM / 86_400;

// ------------------------------------------------------------- montagem

function linha(
  rotulo: string,
  valor: string | null | undefined,
  procedencia: Procedencia | null,
  fonte?: string,
  badge?: string | null
): LinhaDaFicha | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const feita: LinhaDaFicha = { rotulo, valor };
  if (procedencia) feita.procedencia = procedencia;
  if (fonte) feita.fonte = fonte;
  if (badge) feita.badge = badge;
  return feita;
}

/** O "×Terra" de um par de medidas, ou `undefined` quando não há selo. */
function selo(
  valor: number | null,
  daTerra: number | null
): string | undefined {
  const razao = razaoTerra(valor, daTerra);
  return razao === null ? undefined : formatarRazaoTerra(razao);
}

/**
 * QUANTO DO DISCO ESTÁ ILUMINADO VISTO DAQUI — "daqui" sendo a câmera, que
 * é o único ponto de vista que o visitante realmente tem.
 *
 * É A OUTRA PERGUNTA, e o cabeçalho de `geometriaNoCeu` já nomeia as duas: a
 * seção "no céu" responde "dá para ver isso hoje à noite?", medida DA TERRA;
 * esta linha responde "o que estou vendo agora?", medida do ponto em que a
 * câmera está. A conta é a mesma função, com outro observador — e é isso que
 * fazia dela uma armadilha: rodá-la com o vetor errado devolve um número
 * plausível e falso.
 *
 * VALE PARA TODO CORPO, e não só para os heliocêntricos: a fase de Titã
 * vista de perto é exatamente o que está na tela. `quemTemGeometriaNoCeu` é
 * a régua da outra pergunta (lá "Titã a 46,2°" ao lado de "Saturno a 46,1°"
 * seria ruído), e não desta.
 */
function iluminacaoDaqui(entrada: EntradaDaFicha): string | null {
  const { id, jd, fonte, camaraUa } = entrada;
  if (!fonte || !camaraUa || jd === null || jd === undefined || !Number.isFinite(jd)) {
    return null;
  }
  if (id === 'sun') return null;
  let geometria: ReturnType<typeof geometriaNoCeu> = null;
  try {
    geometria = geometriaNoCeu(fonte.posicaoHeliocentrica(id, jd), {
      x: camaraUa[0],
      y: camaraUa[1],
      z: camaraUa[2],
    });
  } catch {
    return null;
  }
  return geometria === null
    ? null
    : `${Math.round(geometria.fracaoIluminada * 100)}%`;
}

function secaoAgora(entrada: EntradaDaFicha): LinhaDaFicha[] {
  const { id, jd, fonte } = entrada;
  if (!fonte || jd === null || jd === undefined || !Number.isFinite(jd)) return [];
  const registro = REGISTRO_ORBITAL[id];
  if (!registro || id === 'sun') return [];
  const pai = nomeDoCorpo(registro.centro) ?? registro.centro;

  let distancia: string | null = null;
  let velocidade: string | null = null;
  try {
    distancia = notaDeDistancia(modulo(fonte.posicao(id, jd)), numeroDoIdioma);
    const v = modulo(fonte.velocidade(id, jd)) * KM_POR_S_POR_UA_DIA;
    velocidade = Number.isFinite(v) ? `${numeroDoIdioma(v)} km/s` : null;
  } catch {
    // FORA DA JANELA DA TABELA o motor LANÇA, de propósito (adaptação b de
    // `efemerides.ts`), e é a máquina do tempo que já avisa o visitante na
    // linha dela. A ficha some com as duas linhas em vez de repetir o aviso
    // ou, pior, imprimir um número extrapolado em silêncio.
    return [];
  }

  return [
    linha(t('ficha.campo.distanciaDe', { pai }), distancia, 'medido', registro.modelo),
    linha(
      t('ficha.campo.velocidadeOrbital'),
      velocidade,
      'derivado',
      t('ficha.fonte.daEfemeride')
    ),
    linha(
      t('ficha.campo.iluminadoDaqui'),
      iluminacaoDaqui(entrada),
      'derivado',
      t('ficha.fonte.daCamera')
    ),
  ].filter((l): l is LinhaDaFicha => l !== null);
}

function secaoFisico(id: string): LinhaDaFicha[] {
  const raio = raioEquatorialKm(id);
  const raioDaTerra = raioEquatorialKm('earth');
  const g = gravidadeSuperficie(id);
  const escape = velocidadeDeEscape(id);
  const massa = massaDeGm(id);
  const eDaTerra = id === 'earth';

  return [
    linha(
      t('ficha.campo.raio'),
      raio === null ? null : `${numeroDoIdioma(Math.round(raio))} km`,
      'medido',
      'IAU/WGCCRE, kernel pck00011',
      eDaTerra ? undefined : selo(raio, raioDaTerra)
    ),
    linha(
      t('ficha.campo.gravidade'),
      g === null ? null : `${numeroDoIdioma(g)} m/s²`,
      'derivado',
      t('ficha.fonte.deGmEDoRaio'),
      eDaTerra ? undefined : selo(g, gravidadeSuperficie('earth'))
    ),
    linha(
      t('ficha.campo.escape'),
      escape === null ? null : `${numeroDoIdioma(escape)} km/s`,
      'derivado',
      t('ficha.fonte.deGmEDoRaio'),
      eDaTerra ? undefined : selo(escape, velocidadeDeEscape('earth'))
    ),
    linha(
      t('ficha.campo.massa'),
      massa === null ? null : formatarMassaKg(massa),
      'derivado',
      t('ficha.fonte.deGm'),
      eDaTerra ? undefined : selo(massa, massaDeGm('earth'))
    ),
  ].filter((l): l is LinhaDaFicha => l !== null);
}

function secaoOrbita(entrada: EntradaDaFicha): LinhaDaFicha[] {
  const { id, jd, fonte, editorial } = entrada;
  if (id === 'sun') return [];
  const registro = REGISTRO_ORBITAL[id];
  const orbita = editorial?.orbita;
  const linhas: (LinhaDaFicha | null)[] = [];

  if (orbita) {
    const pai = nomeDoCorpo(registro?.centro ?? '') ?? registro?.centro;
    linhas.push(
      linha(
        t('ficha.campo.periodo'),
        formatarDuracao(orbita.periodoDias),
        'derivado',
        t('ficha.fonte.dosElementos')
      )
    );
    // AS DUAS PONTAS NUMA LINHA SÓ, porque é assim que se lê a órbita: "de
    // 29,7 a 49,1 UA" diz num golpe o que duas linhas de "periélio" e
    // "afélio" diriam em quatro. A escada de unidade é a mesma dos dois
    // lados — em par lua↔pai as duas saem em quilômetros.
    const min = notaDeDistancia(orbita.minUa, numeroDoIdioma);
    const max = notaDeDistancia(orbita.maxUa, numeroDoIdioma);
    if (min && max) {
      linhas.push(
        linha(
          t('ficha.campo.distanciaDe', { pai }),
          min === max ? min : t('ficha.valor.faixa', { min, max }),
          'derivado',
          t('ficha.fonte.minEMax')
        )
      );
    }
    const soma = orbita.maxUa + orbita.minUa;
    if (soma > 0) {
      linhas.push(
        linha(
          t('ficha.campo.excentricidade'),
          comCasas((orbita.maxUa - orbita.minUa) / soma, 3),
          'derivado',
          t('ficha.fonte.dosElementos')
        )
      );
    }
  }

  const iau = IAU_ORIENTATIONS[id];
  if (iau && iau.spinRateDegPerDay !== 0) {
    const dia = formatarDuracao(Math.abs(360 / iau.spinRateDegPerDay));
    linhas.push(
      linha(
        t('ficha.campo.diaSideral'),
        dia === null
          ? null
          : iau.spinRateDegPerDay < 0
            ? t('ficha.valor.retrogrado', { dia })
            : dia,
        'derivado',
        t('ficha.fonte.rotacaoIau')
      )
    );
  }

  // A JANELA DE VALIDADE é o outro braço do contrato de honestidade da
  // efeméride (`notaDeValidade`), e ela entra na ficha como entra em
  // qualquer lugar: inteira, sem resumo. A nota já nasce bilíngue no
  // `registroOrbital`; aqui só se escolhe a língua de agora.
  if (fonte && jd !== null && jd !== undefined && Number.isFinite(jd)) {
    try {
      linhas.push(
        linha(t('ficha.campo.modeloEValidade'), noIdioma(fonte.notaDeValidade(id, jd)), 'medido')
      );
    } catch {
      // corpo fora do registro: sem nota, sem linha
    }
  }

  return linhas.filter((l): l is LinhaDaFicha => l !== null);
}

function secaoCeu(entrada: EntradaDaFicha): LinhaDaFicha[] {
  const { id, jd, fonte } = entrada;
  if (!fonte || jd === null || jd === undefined || !Number.isFinite(jd)) return [];
  if (!quemTemGeometriaNoCeu(id)) return [];
  let geometria: ReturnType<typeof geometriaNoCeu> = null;
  try {
    geometria = geometriaNoCeu(
      fonte.posicaoHeliocentrica(id, jd),
      fonte.posicaoHeliocentrica('earth', jd)
    );
  } catch {
    return [];
  }
  if (!geometria) return [];
  const FONTE = t('ficha.fonte.geometrico');
  return [
    linha(
      t('ficha.campo.elongacao'),
      `${numeroDoIdioma(geometria.elongacaoDeg)}°`,
      'derivado',
      FONTE
    ),
    linha(
      t('ficha.campo.discoIluminado'),
      `${Math.round(geometria.fracaoIluminada * 100)}%`,
      'derivado',
      FONTE
    ),
  ].filter((l): l is LinhaDaFicha => l !== null);
}

/**
 * AS DUAS SEÇÕES DE PROSA. Elas leem O EDITORIAL JÁ ESCOLHIDO e mais nada —
 * e é por isso que a parte B do item 74 foi DADO e não código, e que a F2 do
 * item 130 também foi: o arquivo de tradução nasceu, o gerador o fundiu,
 * depois o inglês voltou a atravessar, e estas funções seguem sem saber que
 * existe língua. Quem escolhe é `editorialDoIdioma`, uma vez por ficha.
 */
function secaoContexto(pt: EditorialDoCorpo | undefined): LinhaDaFicha[] {
  if (!pt) return [];
  return [
    linha(t('ficha.campo.oQueE'), pt.description, 'derivado', t('ficha.fonte.editorial')),
    linha(t('ficha.campo.emUmaLinha'), pt.info, 'derivado', t('ficha.fonte.editorial')),
  ].filter((l): l is LinhaDaFicha => l !== null);
}

function secaoCuriosidades(pt: EditorialDoCorpo | undefined): LinhaDaFicha[] {
  if (!pt) return [];
  const linhas: (LinhaDaFicha | null)[] = [
    linha(t('ficha.campo.curiosidade'), pt.curiosity, 'derivado', t('ficha.fonte.editorial')),
  ];
  for (const fato of pt.facts ?? []) {
    linhas.push(linha(t('ficha.campo.fato'), fato, 'derivado', t('ficha.fonte.editorial')));
  }
  for (const recorde of pt.records ?? []) {
    linhas.push(
      linha(t('ficha.campo.recorde'), recorde, 'derivado', t('ficha.fonte.editorial'))
    );
  }
  if (pt.explorationMilestone) {
    linhas.push(
      linha(
        t('ficha.campo.exploracao'),
        `${pt.explorationMilestone.year}: ${pt.explorationMilestone.description}`,
        'derivado',
        t('ficha.fonte.editorial')
      )
    );
  }
  return linhas.filter((l): l is LinhaDaFicha => l !== null);
}

/**
 * A FONTE DE UM CANAL, entre as variantes que o manifesto lista: a mais
 * LARGA, que é a que o crédito cita. `origem`, `nota` e `seloDaNota` são
 * idênticos em todas as variantes (o mapa de Ceres confessa o tingimento
 * também em 512 px); quem varia é a `proveniencia` do reencode, e ela não
 * sai mais na ficha — desde a R3 o crédito não leva selo.
 */
function fonteDoCanal(
  entradas: readonly EntradaDeTextura[],
  corpo: string,
  canal: string
): EntradaDeTextura | null {
  let melhor: EntradaDeTextura | null = null;
  for (const e of entradas) {
    if (e.corpo !== corpo || e.canal !== canal) continue;
    if (!melhor || e.larguraPx > melhor.larguraPx) melhor = e;
  }
  return melhor;
}

/**
 * O TIER DA CONFISSÃO na língua do selo: `inventado` é o artístico. Nota
 * sem selo é manifesto malformado (ou anterior ao selo, como a forma até a
 * R3) e cai no mesmo tier — quem não fechou o selo não chama a frase de
 * medida.
 */
const TIER_DA_NOTA: Record<NonNullable<EntradaDeTextura['seloDaNota']>, Procedencia> = {
  medido: 'medido',
  derivado: 'derivado',
  inventado: 'artistico',
};

/** Do mais fraco ao mais forte: o selo de uma linha é o do mais fraco que ela confessa. */
const FORCA_DO_TIER: Record<Procedencia, number> = { artistico: 0, derivado: 1, medido: 2 };

/** O mais fraco de uma lista de tiers; a lista vazia não confessa defeito nenhum. */
function oMaisFraco(tiers: readonly Procedencia[]): Procedencia {
  return tiers.reduce<Procedencia>(
    (fraco, tier) => (FORCA_DO_TIER[tier] < FORCA_DO_TIER[fraco] ? tier : fraco),
    'medido'
  );
}

/** A ordem das partes na tela: do mais forte ao mais fraco. */
const ORDEM_DAS_PARTES = ['medido', 'derivado', 'inventado'] as const;

/**
 * O SELO EM PARTES (16/10/2026, decisão do dono: "mostrar o selo junto com
 * a porcentagem, em todos os corpos"): a linha mista leva cada tier
 * presente com a porcentagem da área, de medido a artístico. O `teto` é o
 * tier mais forte que a linha admite — a política da régua, na cor: uma
 * parte medida num mapa tingido é derivada, e as partes que caem no mesmo
 * tier se somam. Sobrando um tier só, a linha fica como sempre, sem partes.
 */
function comPartes(
  feita: LinhaDaFicha | null,
  partes: PartesDoSelo | undefined,
  teto: Procedencia = 'medido'
): LinhaDaFicha | null {
  if (!feita || !partes) return feita;
  const porTier = new Map<Procedencia, number>();
  for (const selo of ORDEM_DAS_PARTES) {
    const porcento = partes[selo];
    if (porcento === undefined) continue;
    const tier = oMaisFraco([TIER_DA_NOTA[selo], teto]);
    porTier.set(tier, (porTier.get(tier) ?? 0) + porcento);
  }
  if (porTier.size < 2) return feita;
  feita.partes = [...porTier].map(([procedencia, porcento]) => ({
    procedencia,
    texto: t('ficha.parteDoSelo', {
      tier: t(`selo.tier.${procedencia}` as 'selo.tier.medido'),
      porcento: decimalDoIdioma(String(Math.round(porcento * 10) / 10)),
    }),
  }));
  return feita;
}

/**
 * A POLÍTICA DA RÉGUA (`matiz`, reguaDosMapas.ts) na língua do selo: a foto
 * em cor verdadeira só tem a média movida para a medida; a tinta é o
 * desenho da foto em cinza tingido pela cor medida, um método declarado;
 * a família esculpida não tem mapa nenhum por baixo.
 */
const TIER_DA_POLITICA: Record<Matiz, Procedencia> = {
  foto: 'medido',
  tinta: 'derivado',
  esculpido: 'artistico',
};

/** O γ que a cadeia mediu em cada mapa; as esculpidas não têm mapa, nem γ. */
const GAMA_DA_REGUA: Readonly<Partial<Record<string, { gama: number }>>> = RELATORIO_DA_REGUA;

/**
 * O FATOR DO PICO POR MODELO: a tabela da régua marca no texto da fonte os
 * S de H,G (Bowell 1989), que são modelo e não medida — "S(H,G)",
 * "S(H,G), G = 0.32".
 */
const PICO_POR_MODELO = /H,G/;

/**
 * ONDE O QUE SE VÊ É ATMOSFERA: os quatro gigantes, o topo de nuvens de
 * Vênus e a névoa de Titã. Para eles a linha do relevo não se aplica — o
 * chão, mesmo onde o radar o mediu, não aparece na imagem —, e dizer
 * "liso" confessaria a falta de um mapa que nada mudaria na tela.
 */
const SO_ATMOSFERA = new Set(['jupiter', 'saturn', 'uranus', 'neptune', 'venus', 'titan']);

/**
 * A FRASE DO MANIFESTO NA LÍNGUA DE AGORA (item 130/F4), com o pt-BR de
 * PISO — o mesmo molde de `editorialDoIdioma`. Fonte, licença, atribuição,
 * defeito e forma são texto de tela que nasce fora do código: a tabela
 * `ORIGENS` do gerador e o `docs/reference/ASSETS.md`. Manifesto sem `en`
 * (ou de antes desta fase) cai no português em vez de sumir da ficha.
 */
function noIdioma(texto: TextoBilingue): string;
function noIdioma(texto: TextoBilingue | null | undefined): string | null;
function noIdioma(texto: TextoBilingue | null | undefined): string | null {
  if (!texto) return null;
  return idiomaAtual() === 'en' ? (texto.en ?? texto.pt) : texto.pt;
}

/**
 * OS DECIMAIS DE UMA CITAÇÃO na língua de agora: a fonte da régua é escrita
 * com ponto ("0.55 µm", "G = 0.32"), e na ficha em português ela sai ao lado
 * de "0,31". Todo dígito-ponto-dígito vira dígito-vírgula-dígito — o
 * `decimalDoIdioma` para um texto inteiro, não para um número só.
 */
function decimaisDoIdioma(texto: string): string {
  return idiomaAtual() === 'en' ? texto : texto.replace(/(\d)\.(\d)/g, '$1,$2');
}

/** O crédito de uma imagem: a fonte e a largura da variante citada. */
function comLargura(fonte: string | null, px: number): string | null {
  return fonte && `${fonte} · ${t('ficha.fonte.larguraPx', { px: numeroDoIdioma(px) })}`;
}

/**
 * O RELEVO: as imagens `height` e `normal` do corpo, com o selo da mais
 * fraca das notas da bancada e as notas juntas (a mesma frase nos dois
 * canais sai uma vez). O canal é `height` onde ele desloca vértice e
 * `normal` onde só gira a luz (item 140: a Lua) — a linha é sobre a IMAGEM
 * de onde o relevo vem, não sobre o que o shader faz com ela.
 */
function linhaDoRelevo(
  id: string,
  mapa: EntradaDeTextura | null,
  imagens: readonly (EntradaDeTextura | null)[]
): LinhaDaFicha | null {
  const rotulo = t('ficha.campo.relevo');
  if (SO_ATMOSFERA.has(id)) return linha(rotulo, t('ficha.relevo.naoSeAplica'), null);
  const presentes = imagens.filter((e): e is EntradaDeTextura => e !== null);
  // SEM IMAGEM DE RELEVO o chão é liso — ou, sem mapa nenhum (as
  // esculpidas), é o da malha feita por código.
  if (presentes.length === 0) {
    return linha(rotulo, t(mapa ? 'ficha.relevo.liso' : 'ficha.relevo.semMapa'), 'artistico');
  }
  const notas = presentes.flatMap((e) =>
    e.nota
      ? [{ frase: noIdioma(e.nota), tier: TIER_DA_NOTA[e.seloDaNota ?? 'inventado'], partes: e.partes }]
      : []
  );
  if (notas.length === 0) return linha(rotulo, t('ficha.relevo.semDefeito'), 'medido');
  const tier = oMaisFraco(notas.map((n) => n.tier));
  // AS PARTES são as da nota que dá o selo — em Fobos, a da normal (o relevo
  // fino); a altura é a forma inteira, medida. Duas notas no mesmo tier só
  // as mostram se forem as mesmas (Encélado, Pã: a mesma frase nos dois).
  const fracas = notas.filter((n) => n.tier === tier);
  const mesmas = fracas.every((n) => JSON.stringify(n.partes) === JSON.stringify(fracas[0]!.partes));
  return comPartes(
    linha(rotulo, [...new Set(notas.map((n) => n.frase))].join('; '), tier, t('ficha.fonte.bancada')),
    mesmas ? fracas[0]!.partes : undefined
  );
}

/**
 * A COR: o mais fraco entre a nota do `map` e a política da régua. A frase
 * é a da nota, quando há; a da régua (gerada, citando a fonte da cor) entra
 * quando não há nota — ou junto dela, quando é a régua que enfraquece o
 * selo (Vênus e Titã: a nota mede, a tinta deriva). Fora da régua (a
 * Terra) e sem nota, a frase diz isso, sem selo.
 */
function linhaDaCor(
  mapa: EntradaDeTextura | null,
  regua: MedidaDoCorpo | undefined
): LinhaDaFicha | null {
  const rotulo = t('ficha.campo.cor');
  const nota = mapa?.nota
    ? { frase: noIdioma(mapa.nota), tier: TIER_DA_NOTA[mapa.seloDaNota ?? 'inventado'] }
    : null;
  if (!regua) {
    return nota
      ? comPartes(linha(rotulo, nota.frase, nota.tier, t('ficha.fonte.bancada')), mapa?.partes)
      : linha(rotulo, t('ficha.cor.foraDaRegua'), null);
  }
  const politica = TIER_DA_POLITICA[regua.matiz];
  const daRegua = t(`ficha.cor.${regua.matiz}` as 'ficha.cor.foto', {
    fonte: decimaisDoIdioma(regua.fonteDaCor),
  });
  if (!nota) return linha(rotulo, daRegua, politica);
  const frase =
    FORCA_DO_TIER[politica] < FORCA_DO_TIER[nota.tier] ? `${nota.frase}; ${daRegua}` : nota.frase;
  return comPartes(
    linha(rotulo, frase, oMaisFraco([nota.tier, politica]), t('ficha.fonte.bancada')),
    mapa?.partes,
    politica
  );
}

/**
 * O BRILHO: o p0 da régua, com a fonte do nível. DERIVADO quando o fator do
 * pico é modelo (H,G), quando o nível repousa numa suposição ou numa média
 * (`nivelDerivado`) ou quando a média desenhada é estimada (as
 * esculpidas escalam a família de regolito até o p0); o γ < 1 que a cadeia
 * aplicou para o mapa caber no alvo sem estourar é confessado junto.
 */
function linhaDoBrilho(id: string, regua: MedidaDoCorpo | undefined): LinhaDaFicha | null {
  const rotulo = t('ficha.campo.brilho');
  if (!regua) return linha(rotulo, t('ficha.brilho.foraDaRegua'), null);
  const picoPorModelo = PICO_POR_MODELO.test(regua.fonteDoNivel);
  const esculpida = regua.matiz === 'esculpido';
  const chave = picoPorModelo
    ? 'ficha.brilho.picoPorModelo'
    : regua.nivelDerivado
      ? 'ficha.brilho.estimado'
      : 'ficha.brilho.medido';
  // as ressalvas vêm antes da fonte, que fecha a frase depois do travessão
  let ressalvas = esculpida ? t('ficha.brilho.mediaEstimada') : '';
  const gama = GAMA_DA_REGUA[id]?.gama;
  if (gama !== undefined && gama < 1) {
    ressalvas += t('ficha.brilho.gama', { gama: comCasas(gama, 2) });
  }
  const frase = t(chave, {
    p0: decimalDoIdioma(alvoDoMapa(id).p0.toPrecision(2)),
    ressalvas,
    fonte: decimaisDoIdioma(regua.fonteDoNivel),
  });
  return linha(
    rotulo,
    frase,
    picoPorModelo || esculpida || regua.nivelDerivado ? 'derivado' : 'medido'
  );
}

/**
 * A IMAGEM CONFESSA (item 74 parte B; itens 19 e 20; o formato da R3,
 * PLAN-REGUA-UNICA.md).
 *
 * QUATRO LINHAS FIXAS, uma por canal do que se vê — forma, relevo, cor,
 * brilho —, cada uma com UM selo, o do mais fraco que ela confessa, e uma
 * frase; no canal misto o selo vem em partes, com a porcentagem da área
 * de cada tier (`comPartes`). Uma fonte por canal: a forma é a tabela "a forma" do ASSETS.md
 * (sem linha, o elipsoide dos eixos medidos); o relevo, as notas dos mapas
 * de altura e de normais; a cor, a nota do `map` e a política da régua; o
 * brilho, a régua (`reguaDosMapas.ts`). As notas nascem na bancada de
 * texturas (`docs/reference/ASSETS.md`) e chegam aqui pelo manifesto;
 * ausência de nota quer dizer "a bancada não achou defeito", nunca
 * "ninguém olhou". As frases geradas moram nas tabelas de idioma.
 *
 * DEPOIS, O CRÉDITO SEM SELO: de onde veio o mapa, sob que licença, a quem
 * creditar, e de onde veio o relevo. Crédito não confessa nada — o selo
 * que ele levava (a `proveniencia` do arquivo) brigava com o da nota.
 *
 * O SOL FICA DE FORA, e é decisão declarada: a imagem dele não é textura
 * nenhuma, é a `LEI-DA-ESTRELA` inteira (forma assada, tinta por cor,
 * granulação). Uma linha aqui seria a segunda fonte de verdade sobre um
 * assunto que tem contrato próprio.
 */
function secaoImagem(
  id: string,
  manifest: ManifestDeTexturas | null | undefined,
  realceDoRelevo = 1
): LinhaDaFicha[] {
  if (!manifest || id === 'sun') return [];
  const mapa = fonteDoCanal(manifest.entradas, id, 'map');
  const altura = fonteDoCanal(manifest.entradas, id, 'height');
  const normal = fonteDoCanal(manifest.entradas, id, 'normal');
  const relevo = altura ?? normal;
  const regua: MedidaDoCorpo | undefined = REGUA_DOS_MAPAS[id];

  const forma = manifest.formas?.[id];
  const linhas: (LinhaDaFicha | null)[] = [
    forma
      ? comPartes(
          linha(
            t('ficha.campo.forma'),
            noIdioma(forma),
            TIER_DA_NOTA[forma.seloDaNota ?? 'inventado'],
            t('ficha.fonte.bancada')
          ),
          forma.partes
        )
      : linha(
          t('ficha.campo.forma'),
          t(altura ? 'ficha.forma.elipsoideComAltura' : 'ficha.forma.elipsoide'),
          'medido'
        ),
  ];
  // O RELEVO REALÇADO (item 232) CONFESSA-SE ANTES DO RELEVO: as alturas na
  // tela não são as do mapa, e a nota da bancada logo abaixo ("sem
  // exagero") descreve o mapa — a linha diz as duas coisas, e o tier é o
  // artístico, o de "não tome isto por observação".
  if (relevo?.origem && realceDoRelevo !== 1) {
    linhas.push(
      linha(
        t('ficha.campo.relevoRealcado'),
        t('ficha.relevoRealcado', { fator: decimalDoIdioma(String(realceDoRelevo)) }),
        'artistico',
        t('ficha.fonte.modoDeclarado')
      )
    );
  }
  linhas.push(
    linhaDoRelevo(id, mapa, [altura, normal]),
    linhaDaCor(mapa, regua),
    linhaDoBrilho(id, regua)
  );

  if (mapa?.origem) {
    linhas.push(
      linha(t('ficha.campo.fonte'), comLargura(noIdioma(mapa.origem.fonte), mapa.larguraPx), null),
      linha(t('ficha.campo.licenca'), noIdioma(mapa.origem.licenca), null),
      linha(t('ficha.campo.atribuicao'), noIdioma(mapa.origem.atribuicao), null)
    );
  }
  if (relevo?.origem) {
    linhas.push(
      linha(
        t('ficha.campo.fonteDoRelevo'),
        comLargura(noIdioma(relevo.origem.fonte), relevo.larguraPx),
        null
      )
    );
  }

  return linhas.filter((l): l is LinhaDaFicha => l !== null);
}

/** O título de cada seção, na língua de agora (item 130). */
const TITULO = (id: IdDeSecao): string => t(`ficha.secao.${id}` as 'ficha.secao.agora');

/**
 * A FICHA DE UMA ESTRELA (item 74; o cabeçalho na parte A, o conteúdo aqui).
 *
 * ELA EXISTE por FUNÇÃO e não por conteúdo: o cabeçalho da ficha é quem
 * anuncia o foco — corpo ou estrela — e quem carrega o gesto de voltar ao
 * sistema. Se a ficha só valesse para corpos, escolher Sirius deixaria o HUD
 * sem dizer o que foi escolhido e sem o "⌂ Sistema".
 *
 * UMA SEÇÃO SÓ, e é decisão medida: são sete linhas, e a ficha desenha
 * FECHADAS todas as seções menos a primeira. Duas seções aqui esconderiam
 * metade do que existe atrás de um clique que ninguém pediu — o corpo tem
 * cinco seções porque tem cinquenta linhas.
 *
 * TUDO MEDIDO OU DERIVADO, NADA DE EDITORIAL. As 1.726 nomeadas não têm
 * prosa nesta casa e não vão ter: o que se escreveria sobre elas seria
 * inventado ou copiado, e nenhuma das duas coisas passa no selo. O que a
 * ficha diz é o que o catálogo mede (distância, magnitude, tipo espectral,
 * B−V, os índices HD/HIP/GJ) mais UMA conta: a temperatura efetiva por
 * Ballesteros. Esta linha é o primeiro consumidor de TELA de
 * `temperatureFromBV` — até aqui a fórmula só alimentava cor de shader.
 *
 * SEM `NamedStar`, SÓ O CABEÇALHO. É o caso do centro galáctico
 * (Sagittarius A✱), que é foco e não é estrela do catálogo: ele continua
 * abrindo a ficha com o nome e o "⌂ Sistema", e sem uma linha inventada.
 */
export function montarFichaDeEstrela(
  nome: string,
  estrela?: NamedStar | null
): Ficha | null {
  if (!nome) return null;
  const linhas: (LinhaDaFicha | null)[] = [];
  if (estrela) {
    const CATALOGO = t('ficha.fonte.catalogoHyg');
    const designacao = designacaoDeBayer(estrela.b, estrela.c);
    const catalogos = [
      estrela.hd === undefined ? null : `HD ${estrela.hd}`,
      estrela.hip === undefined ? null : `HIP ${estrela.hip}`,
      estrela.gl || null,
    ].filter((x): x is string => x !== null);
    linhas.push(
      // A designação de Bayer é a MESMA estrela dita de outro jeito, e para
      // quem só conhece "Sirius" ela é a ponte com qualquer carta do céu.
      linha(t('ficha.campo.designacao'), designacao, 'medido', t('ficha.fonte.bayerIau')),
      linha(
        t('ficha.campo.distancia'),
        notaDeDistancia(estrela.d * UA_POR_PC, numeroDoIdioma),
        'medido',
        t('ficha.fonte.paralaxe')
      ),
      linha(t('ficha.campo.magnitude'), comCasas(estrela.m, 2), 'medido', CATALOGO),
      linha(t('ficha.campo.tipoEspectral'), estrela.s || null, 'medido', CATALOGO),
      linha(
        t('ficha.campo.corBV'),
        estrela.ci === undefined ? null : comCasas(estrela.ci, 3),
        'medido',
        CATALOGO
      ),
      linha(
        t('ficha.campo.temperatura'),
        estrela.ci === undefined
          ? null
          : `${numeroDoIdioma(Number(temperatureFromBV(estrela.ci).toPrecision(3)))} K`,
        'derivado',
        t('ficha.fonte.ballesteros')
      ),
      // OS TRÊS ÍNDICES NUMA LINHA SÓ: eles não são três fatos, são três
      // endereços do mesmo objeto, e é assim que se procura por ele.
      linha(t('ficha.campo.catalogos'), catalogos.join(' · ') || null, 'medido', CATALOGO)
    );
  }
  const cheias = linhas.filter((l): l is LinhaDaFicha => l !== null);
  return {
    id: 'estrela',
    nome,
    // A PALAVRA DA CLASSE DIZ O QUE O OBJETO É (ordem dele, 01/09, ao ver
    // "Sagittarius A✱ · estrela"): a ficha só de cabeçalho é a do centro
    // galáctico, e ele é um buraco negro, não uma estrela do catálogo.
    classe: classeEmTexto(estrela ? 'estrela' : 'buraco negro'),
    secoes:
      cheias.length > 0 ? [{ id: 'estrela', titulo: TITULO('estrela'), linhas: cheias }] : [],
  };
}

/**
 * A FICHA INTEIRA. `null` para id que esta casa não desenha — os seis do
 * doador sem alvo aqui (gonggong, orcus, sedna, salacia, vanth, weywot) e
 * qualquer coisa que não seja um corpo. Não chutar é a lei do arquivo: uma
 * ficha vazia com um nome inventado seria pior que ficha nenhuma.
 */
export function montarFicha(entrada: EntradaDaFicha): Ficha | null {
  const nomes = NOMES_DOS_CORPOS[entrada.id];
  if (!nomes) return null;

  const pt = editorialDoIdioma(entrada.editorial);
  const secoes: SecaoDaFicha[] = [
    { id: 'agora', titulo: TITULO('agora'), linhas: secaoAgora(entrada) },
    { id: 'fisico', titulo: TITULO('fisico'), linhas: secaoFisico(entrada.id) },
    { id: 'orbita', titulo: TITULO('orbita'), linhas: secaoOrbita(entrada) },
    { id: 'ceu', titulo: TITULO('ceu'), linhas: secaoCeu(entrada) },
    { id: 'contexto', titulo: TITULO('contexto'), linhas: secaoContexto(pt) },
    { id: 'curiosidades', titulo: TITULO('curiosidades'), linhas: secaoCuriosidades(pt) },
    { id: 'imagem', titulo: TITULO('imagem'), linhas: secaoImagem(entrada.id, entrada.texturas, entrada.realceDoRelevo) },
  ];

  return {
    id: entrada.id,
    nome: nomeDoCorpo(entrada.id) ?? nomes.nome,
    classe: classeEmTexto(nomes.classe),
    secoes: secoes.filter((s) => s.linhas.length > 0),
  };
}
