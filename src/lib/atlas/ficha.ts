// ============================================================
// A FICHA DE UM CORPO — a montagem, e só ela.
//
// O ANTI-PADRÃO QUE ESTE ARQUIVO EXISTE PARA NÃO REPETIR está nomeado no
// `PLANO-ATLAS` §3 e é literalmente o painel do doador: `Sidebar.tsx`, 778
// linhas em que vis-viva, parser de sobrescrito Unicode e Tailwind moram no
// mesmo corpo. Aqui a conta e o texto ficam deste lado — sem three, sem
// React, testável em milissegundos —, e `FichaDoObjeto.tsx` só desenha o que
// sair daqui.
//
// SETE SEÇÕES NA ORDEM DO INTERESSE, que é a lição que o doador aprendeu
// tarde ("live state first, reference after"): o que está acontecendo AGORA,
// depois o corpo, depois a órbita, depois o céu, e só então a enciclopédia.
//
// CAMPO AUSENTE NÃO VIRA LINHA. Nunca "N/A", nunca "—", nunca zero no lugar
// de uma medida que não existe. Makemake não tem massa no kernel: a ficha
// dele simplesmente não tem a linha da massa. Seção que ficou sem nenhuma
// linha não é desenhada.
//
// E O INGLÊS NÃO VAI PARA A TELA. Os campos editoriais dos 45 corpos vieram
// do doador em inglês; desde 22/08 os 39 alvos têm o par em pt-BR
// (`fonte/editorial-pt.json`) e é ELE que a ficha lê — `editorial.en` existe
// no JSON e não tem consumidor de tela nenhum. Onde o `pt` faltar, a linha
// SOME: mostrar inglês "por enquanto" seria a casa decidindo pelo dono que
// meia língua é melhor que nenhuma.
//
// UM VOCABULÁRIO DE PROCEDÊNCIA SÓ: os três tiers de `selo.ts`
// (`medido | derivado | artistico`). O doador tinha quatro rótulos próprios
// ("measured asset", "observational model", "interpretive", "procedural") e
// trazê-los criaria a segunda fonte de verdade sobre honestidade nesta casa.
//
// AS UNIDADES SÃO AS DA ESCADA ÚNICA: `notaDeDistancia` (`lib/unidades.ts`)
// decide km, UA ou anos-luz, e `numeroPtBr` decide a vírgula. Quem escrever
// aqui uma quinta formatação de distância está criando bug, não exceção.
// ============================================================
import { notaDeDistancia } from '../unidades';
import { NOMES_DOS_CORPOS } from '../../three/atlasConfig';
import type { Procedencia } from '../../three/selo';
import { numeroPtBr } from '../../three/tempoDoAtlas';
import { AU_KM } from './elementosOrbitais';
import {
  formatarRazaoTerra,
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
import type {
  EntradaDeTextura,
  ManifestDeTexturas,
} from '../../three/world/corpos/texturas';

// ---------------------------------------------------------------- formas

/** Uma linha da ficha: rótulo à esquerda, valor à direita, procedência. */
export interface LinhaDaFicha {
  rotulo: string;
  valor: string;
  /** o "×Terra", quando ele carrega informação (ver `razaoTerra`) */
  badge?: string;
  procedencia: Procedencia;
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
  | 'imagem';

export interface SecaoDaFicha {
  id: IdDeSecao;
  titulo: string;
  linhas: LinhaDaFicha[];
}

export interface Ficha {
  id: string;
  /** o nome pt-BR que o visitante lê */
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
  editorial: { en: EditorialDoCorpo; pt?: EditorialDoCorpo };
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
  notaDeValidade(bodyId: string, jdTdb: number): string;
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
 */
export function formatarDuracao(dias: number): string | null {
  if (!Number.isFinite(dias) || dias <= 0) return null;
  if (dias < 1) {
    const horas = dias * HORAS_POR_DIA;
    return `${numeroPtBr(horas)} ${horas >= 2 ? 'horas' : 'hora'}`;
  }
  if (dias < 2 * DIAS_POR_ANO) {
    return `${numeroPtBr(dias)} ${dias >= 2 ? 'dias' : 'dia'}`;
  }
  const anos = dias / DIAS_POR_ANO;
  return `${numeroPtBr(anos)} anos`;
}

const SOBRESCRITOS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

/**
 * A MASSA EM NOTAÇÃO CIENTÍFICA COMO SE ESCREVE, e não como o JavaScript
 * escreve: `1,35 × 10²³ kg` no lugar de `1.345e+23 kg`. Um `e+23` é
 * endereço de programador; o visitante desta casa é leigo, e a potência de
 * dez com o expoente sobrescrito é a forma que ele viu na escola.
 *
 * A IRONIA DECLARADA: o doador guardava a massa exatamente assim, como
 * STRING de exibição ("3.301 × 10²³ kg"), e a reparseava em runtime varrendo
 * sobrescritos Unicode para recuperar o número. Aqui o caminho vai na
 * direção certa — o número vem do kernel, a conta é `GM/G`, e a grafia
 * bonita nasce no fim, sem ninguém precisar desfazê-la depois.
 */
export function formatarMassaKg(kg: number): string | null {
  if (!Number.isFinite(kg) || kg <= 0) return null;
  const [mantissa, expoente] = kg.toExponential(2).split('e');
  const n = Number(expoente);
  const digitos = String(Math.abs(n))
    .split('')
    .map((d) => SOBRESCRITOS[Number(d)])
    .join('');
  return `${mantissa!.replace('.', ',')} × 10${n < 0 ? '⁻' : ''}${digitos} kg`;
}

/**
 * Um número adimensional com casas fixas e vírgula — excentricidade e
 * fração iluminada. Duas casas achatariam a excentricidade da Terra (0,017)
 * em "0,02", e uma casa a mataria de vez.
 */
function comCasas(valor: number, casas: number): string {
  return valor.toFixed(casas).replace('.', ',');
}

const modulo = (v: PosicaoEcliptica) => Math.hypot(v.x, v.y, v.z);

/** UA/dia → km/s, o passe único desta casa entre as duas unidades. */
const KM_POR_S_POR_UA_DIA = AU_KM / 86_400;

// ------------------------------------------------------------- montagem

function linha(
  rotulo: string,
  valor: string | null | undefined,
  procedencia: Procedencia,
  fonte?: string,
  badge?: string | null
): LinhaDaFicha | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const feita: LinhaDaFicha = { rotulo, valor, procedencia };
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

function secaoAgora(entrada: EntradaDaFicha): LinhaDaFicha[] {
  const { id, jd, fonte } = entrada;
  if (!fonte || jd === null || jd === undefined || !Number.isFinite(jd)) return [];
  const registro = REGISTRO_ORBITAL[id];
  if (!registro || id === 'sun') return [];
  const pai = NOMES_DOS_CORPOS[registro.centro]?.nome ?? registro.centro;

  let distancia: string | null = null;
  let velocidade: string | null = null;
  try {
    distancia = notaDeDistancia(modulo(fonte.posicao(id, jd)), numeroPtBr);
    const v = modulo(fonte.velocidade(id, jd)) * KM_POR_S_POR_UA_DIA;
    velocidade = Number.isFinite(v) ? `${numeroPtBr(v)} km/s` : null;
  } catch {
    // FORA DA JANELA DA TABELA o motor LANÇA, de propósito (adaptação b de
    // `efemerides.ts`), e é a máquina do tempo que já avisa o visitante na
    // linha dela. A ficha some com as duas linhas em vez de repetir o aviso
    // ou, pior, imprimir um número extrapolado em silêncio.
    return [];
  }

  return [
    linha(`distância — ${pai}`, distancia, 'medido', registro.modelo),
    linha('velocidade orbital', velocidade, 'derivado', 'da efeméride'),
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
      'raio (equador)',
      raio === null ? null : `${numeroPtBr(Math.round(raio))} km`,
      'medido',
      'IAU/WGCCRE, kernel pck00011',
      eDaTerra ? undefined : selo(raio, raioDaTerra)
    ),
    linha(
      'gravidade',
      g === null ? null : `${numeroPtBr(g)} m/s²`,
      'derivado',
      'de GM e do raio',
      eDaTerra ? undefined : selo(g, gravidadeSuperficie('earth'))
    ),
    linha(
      'velocidade de escape',
      escape === null ? null : `${numeroPtBr(escape)} km/s`,
      'derivado',
      'de GM e do raio',
      eDaTerra ? undefined : selo(escape, velocidadeDeEscape('earth'))
    ),
    linha(
      'massa',
      massa === null ? null : formatarMassaKg(massa),
      'derivado',
      'de GM (gm_de440) e de G',
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
    const pai = NOMES_DOS_CORPOS[registro?.centro ?? '']?.nome ?? registro?.centro;
    linhas.push(
      linha('período orbital', formatarDuracao(orbita.periodoDias), 'derivado', 'dos elementos da casa')
    );
    // AS DUAS PONTAS NUMA LINHA SÓ, porque é assim que se lê a órbita: "de
    // 29,7 a 49,1 UA" diz num golpe o que duas linhas de "periélio" e
    // "afélio" diriam em quatro. A escada de unidade é a mesma dos dois
    // lados — em par lua↔pai as duas saem em quilômetros.
    const min = notaDeDistancia(orbita.minUa, numeroPtBr);
    const max = notaDeDistancia(orbita.maxUa, numeroPtBr);
    if (min && max) {
      linhas.push(
        linha(
          `distância — ${pai}`,
          min === max ? min : `${min} a ${max}`,
          'derivado',
          'mín e máx da órbita'
        )
      );
    }
    const soma = orbita.maxUa + orbita.minUa;
    if (soma > 0) {
      linhas.push(
        linha(
          'excentricidade',
          comCasas((orbita.maxUa - orbita.minUa) / soma, 3),
          'derivado',
          'dos elementos da casa'
        )
      );
    }
  }

  const iau = IAU_ORIENTATIONS[id];
  if (iau && iau.spinRateDegPerDay !== 0) {
    const dia = formatarDuracao(Math.abs(360 / iau.spinRateDegPerDay));
    linhas.push(
      linha(
        'dia sideral',
        dia === null ? null : iau.spinRateDegPerDay < 0 ? `${dia} (retrógrado)` : dia,
        'derivado',
        'do modelo IAU de rotação'
      )
    );
  }

  // A JANELA DE VALIDADE é o outro braço do contrato de honestidade da
  // efeméride (`notaDeValidade`), e ela entra na ficha como entra em
  // qualquer lugar: inteira, sem resumo. Ainda em inglês na origem — o
  // texto dela é do `registroOrbital`, e traduzi-lo é obra própria.
  if (fonte && jd !== null && jd !== undefined && Number.isFinite(jd)) {
    try {
      linhas.push(linha('modelo e validade', fonte.notaDeValidade(id, jd), 'medido'));
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
  const FONTE = 'geométrico, de centro a centro';
  return [
    linha('elongação do Sol', `${numeroPtBr(geometria.elongacaoDeg)}°`, 'derivado', FONTE),
    linha(
      'disco iluminado',
      `${Math.round(geometria.fracaoIluminada * 100)}%`,
      'derivado',
      FONTE
    ),
  ].filter((l): l is LinhaDaFicha => l !== null);
}

/**
 * AS DUAS SEÇÕES DE PROSA. Elas leem `editorial.pt` e mais nada — e é por
 * isso que a parte B do item 74 foi DADO e não código: o arquivo de tradução
 * nasceu, o gerador o fundiu, e estas funções não mudaram uma linha.
 */
function secaoContexto(pt: EditorialDoCorpo | undefined): LinhaDaFicha[] {
  if (!pt) return [];
  return [
    linha('o que é', pt.description, 'derivado', 'texto editorial, sem fonte citada'),
    linha('em uma linha', pt.info, 'derivado', 'texto editorial, sem fonte citada'),
  ].filter((l): l is LinhaDaFicha => l !== null);
}

function secaoCuriosidades(pt: EditorialDoCorpo | undefined): LinhaDaFicha[] {
  if (!pt) return [];
  const linhas: (LinhaDaFicha | null)[] = [
    linha('curiosidade', pt.curiosity, 'derivado', 'texto editorial, sem fonte citada'),
  ];
  for (const fato of pt.facts ?? []) {
    linhas.push(linha('fato', fato, 'derivado', 'texto editorial, sem fonte citada'));
  }
  for (const recorde of pt.records ?? []) {
    linhas.push(linha('recorde', recorde, 'derivado', 'texto editorial, sem fonte citada'));
  }
  if (pt.explorationMilestone) {
    linhas.push(
      linha(
        'exploração',
        `${pt.explorationMilestone.year}: ${pt.explorationMilestone.description}`,
        'derivado',
        'texto editorial, sem fonte citada'
      )
    );
  }
  return linhas.filter((l): l is LinhaDaFicha => l !== null);
}

/**
 * A FONTE DE UM CANAL, entre as variantes que o manifesto lista. A regra é
 * de uma linha: a mais LARGA, e no empate a que não é reencode nosso — o
 * `map.jpg` de 8192 px e o `map.webp` de 8192 px são a mesma imagem, e só o
 * primeiro carrega a procedência da fonte declarada.
 *
 * `origem` e `nota` são idênticos em todas as variantes (o mapa de Ceres
 * continua inventado em 512 px); quem varia é a `proveniencia`, e é por ela
 * que a escolha existe.
 */
function fonteDoCanal(
  entradas: readonly EntradaDeTextura[],
  corpo: string,
  canal: string
): EntradaDeTextura | null {
  let melhor: EntradaDeTextura | null = null;
  for (const e of entradas) {
    if (e.corpo !== corpo || e.canal !== canal) continue;
    if (
      !melhor ||
      e.larguraPx > melhor.larguraPx ||
      (e.larguraPx === melhor.larguraPx &&
        melhor.proveniencia === 'derivado' &&
        e.proveniencia !== 'derivado')
    ) {
      melhor = e;
    }
  }
  return melhor;
}

/**
 * O TIER DA IMAGEM na língua do selo. `medido` e `derivado` casam nome a
 * nome; `nao-resolvida` é a política do dono (a imagem entra MARCADA em vez
 * de ficar de fora) e não tem par entre os três — quem não conseguiu fechar
 * a fonte não pode chamar a foto de medida, então ela cai no tier que diz
 * "não tome isto por observação". Hoje são ZERO entradas assim, e o
 * `data:verify` cobra que continuem zero.
 */
const TIER_DA_IMAGEM: Record<
  NonNullable<EntradaDeTextura['proveniencia']>,
  Procedencia
> = {
  medido: 'medido',
  derivado: 'derivado',
  'nao-resolvida': 'artistico',
};

/**
 * A IMAGEM CONFESSA (item 74 parte B; fecha os itens 19 e 20).
 *
 * `texturas.json` guardava `origem{fonte,url,licenca,atribuicao}` e
 * `proveniencia` por entrada desde a Onda 6 — e nada no app lia esses
 * campos. A ficha é o primeiro leitor, e ela imprime as quatro coisas que o
 * visitante tem direito de saber sobre a foto que está olhando: de onde
 * veio, sob que licença, a quem creditar, e QUAL É O DEFEITO dela.
 *
 * O DEFEITO É MEDIDO, e por isso leva o selo `medido`: a frase nasce na
 * bancada de texturas (`docs/reference/ASSETS.md`), o gerador do manifesto a
 * lê de lá, e ela chega aqui como dado. Ausência de nota quer dizer "a
 * bancada não achou defeito", nunca "ninguém olhou".
 *
 * SEM MAPA, A SUPERFÍCIE É INVENTADA: Palas, Haumea, Makemake, Éris e Quaoar
 * não têm textura licenciada e `rochoso.ts` os desenha com o `−3` procedural.
 * A ficha diz isso na cara, com o terceiro tier do selo — que até aqui não
 * tinha nenhum uso nesta peça.
 *
 * O SOL FICA DE FORA, e é decisão declarada: a imagem dele não é textura
 * nenhuma, é a `LEI-DA-ESTRELA` inteira (forma assada, tinta por cor,
 * granulação). Uma linha aqui seria a segunda fonte de verdade sobre um
 * assunto que tem contrato próprio.
 */
function secaoImagem(
  id: string,
  manifest: ManifestDeTexturas | null | undefined
): LinhaDaFicha[] {
  if (!manifest || id === 'sun') return [];
  const linhas: (LinhaDaFicha | null)[] = [];
  const mapa = fonteDoCanal(manifest.entradas, id, 'map');

  if (mapa?.origem) {
    const tier = TIER_DA_IMAGEM[mapa.proveniencia ?? 'nao-resolvida'];
    linhas.push(
      linha('fonte', mapa.origem.fonte, tier, `${numeroPtBr(mapa.larguraPx)} px de largura`),
      linha('licença', mapa.origem.licenca, tier),
      linha('atribuição', mapa.origem.atribuicao, tier)
    );
    if (mapa.nota) {
      linhas.push(linha('o defeito', mapa.nota, 'medido', 'bancada de texturas'));
    }
  } else {
    linhas.push(
      linha(
        'superfície',
        'sem mapa: a cor e o relevo deste corpo são inventados',
        'artistico',
        'não há textura com licença fechada'
      )
    );
  }

  const forma = manifest.formas?.[id];
  if (forma) linhas.push(linha('forma', forma, 'artistico', 'bancada de texturas'));

  return linhas.filter((l): l is LinhaDaFicha => l !== null);
}

const TITULOS: Record<IdDeSecao, string> = {
  agora: 'agora',
  fisico: 'físico',
  orbita: 'órbita',
  ceu: 'no céu',
  contexto: 'contexto',
  curiosidades: 'curiosidades',
  imagem: 'a imagem',
};

/**
 * A FICHA DE UMA ESTRELA, ainda só com o CABEÇALHO (item 74, parte A).
 *
 * Ela existe agora, vazia de seções, porque a antiga `ContextLine`
 * anunciava QUALQUER foco — corpo ou estrela — e carregava o gesto de voltar
 * ao sistema. Se a ficha só nascesse para corpos, escolher Sirius deixaria o
 * HUD sem dizer o que foi escolhido e sem o "⌂ Sistema": um buraco de
 * função, não uma seção que falta.
 *
 * O CONTEÚDO É O COMMIT 7 do item 74 (a constelação que o
 * `build-star-catalog.mjs` lê e descarta, a temperatura de
 * `stellarPhysics.temperatureFromBV`, a distância em anos-luz). Aqui não se
 * inventa nada: a escada sabe o NOME e mais nada, então é o nome que
 * aparece. "estrela" é a classe genérica porque o tipo espectral mora no
 * `NamedStar`, que ainda não chega até aqui.
 */
export function montarFichaDeEstrela(nome: string): Ficha | null {
  if (!nome) return null;
  return { id: 'estrela', nome, classe: 'estrela', secoes: [] };
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

  const pt = entrada.editorial?.editorial?.pt;
  const secoes: SecaoDaFicha[] = [
    { id: 'agora', titulo: TITULOS.agora, linhas: secaoAgora(entrada) },
    { id: 'fisico', titulo: TITULOS.fisico, linhas: secaoFisico(entrada.id) },
    { id: 'orbita', titulo: TITULOS.orbita, linhas: secaoOrbita(entrada) },
    { id: 'ceu', titulo: TITULOS.ceu, linhas: secaoCeu(entrada) },
    { id: 'contexto', titulo: TITULOS.contexto, linhas: secaoContexto(pt) },
    { id: 'curiosidades', titulo: TITULOS.curiosidades, linhas: secaoCuriosidades(pt) },
    { id: 'imagem', titulo: TITULOS.imagem, linhas: secaoImagem(entrada.id, entrada.texturas) },
  ];

  return {
    id: entrada.id,
    nome: nomes.nome,
    classe: nomes.classe,
    secoes: secoes.filter((s) => s.linhas.length > 0),
  };
}
