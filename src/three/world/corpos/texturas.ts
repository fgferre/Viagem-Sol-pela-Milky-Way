// ============================================================
// O PIPELINE DE TEXTURAS de todos os corpos resolvidos.
//
// O manifest, o alvo de pixels por tier e canal (a dose de VRAM), a
// escolha de variante, a detecção de webp, a política de recarga — e,
// desde 22/08, A CARGA EM SI. Morava em terra.ts; serve a Terra, Lua,
// rochosos e gigantes.
//
// POR QUE A CARGA MUDOU DE CASA. Os quatro corpos tinham cada um o SEU
// `iniciarCarga` quase igual — 71/54/58/65 linhas de EXTENSÃO (Terra, Lua,
// rochoso, gigante), medidas no método inteiro em `12b2394^`; a mensagem
// daquele commit conta as mesmas quatro em LINHAS DE CÓDIGO (58/45/51/62),
// que é outra unidade e não outra medida — e as diferenças entre eles não
// eram desenho, eram os três furos que quatro cópias sempre acabam tendo:
//
//  (a) a Terra pedia os cinco canais com `Promise.all`, que REJEITA no
//      primeiro canal que cai: os outros quatro terminavam para lugar
//      nenhum, e o catch não descartava nada — até 12 imagens
//      abandonadas em três tentativas;
//  (b) Saturno publicava o `map` ANTES de buscar o `ring`, então uma
//      falha do anel voltava tudo a 'fria' e recarregava, deixando até
//      três mapas de superfície residentes (42,7 MiB cada em cinema) e
//      o planeta nunca aparecia;
//  (c) cada corpo buscava o SEU `texturas.json` — 33 pedidos do mesmo
//      arquivo de 3,44 MiB ao entrar no Atlas.
//
// A carga daqui é TRANSACIONAL: o manifest é buscado uma vez por
// buscador (`buscarManifestUmaVez`), os canais descem para um lote
// TEMPORÁRIO, e o lote inteiro é entregue ao corpo num passo só — ou
// nenhum canal é entregue e TODOS os que chegaram são descartados. O
// corpo continua dono do seu estado ('fria'/'buscando'/'pronta'/
// 'falhou'), do seu material e do seu `dispose`; o que ele delega é o
// caminho de rede e a transação.
//
// E A DESCARGA (item 115, bloco A da colheita do Eyes, 31/08). Até
// aqui a carga era uma via de mão única: uma vez baixada, a textura de
// um corpo ficava residente pela sessão inteira — o único `dispose()`
// de textura de corpo morava no teardown do Director. MEDIDO no
// passeio de oito corpos em cinema (`capturas/item115-passeio-memoria
// .mjs`): 54,1 MiB no boot, 1.082,9 MiB depois da visita, e 1.082,9
// MiB vinte segundos depois de sair — 100% do pico, porque não havia
// caminho de volta. Agora há três: quem SEGURA os texels
// (`Seguradores`), a CARÊNCIA de 15 s entre o último soltar e o
// `dispose` de verdade (`CARENCIA_DA_DESCARGA_S`), e o `soltar` do
// corpo, que apaga os uniforms antes de os texels voltarem para a GPU.
// ============================================================
import * as THREE from 'three';
import type { QualityLevel } from '../../core/engine';

/**
 * RECARGAS além da primeira tentativa antes de `'falhou'` virar terminal
 * (auditoria item 6: um 404 transitório matava o globo a sessão inteira).
 * O precedente é o backoff CONTADO dos 3 `pointerlockerror` da Onda 5
 * (`ERROS_ATE_DESISTIR`, cameraRig.ts): 1 carga + 2 recargas = 3
 * tentativas, e só então o estado desiste — com um aviso único, porque
 * três falhas seguidas não são degradação projetada, são um defeito que
 * alguém precisa ler.
 */
export const RECARGAS_ATE_DESISTIR = 2;

/**
 * O filtro ANISOTRÓPICO de todo mapa de corpo (o teto do three é o da
 * GPU). A amostra segura no polo (`GLSL_AMOSTRA_EQUIRETANGULAR`) encolhe o
 * gradiente em u até a razão caber neste número — os dois andam juntos.
 */
export const ANISOTROPIA_DOS_MAPAS = 4;

/**
 * DE ONDE VEIO ESTA IMAGEM — os quatro campos que `texturas.json` guarda por
 * entrada desde a Onda 6, e que até 22/08 não tinham leitor nenhum: o
 * manifesto os escrevia e o app os ignorava. A ficha do objeto (item 74) é o
 * primeiro consumidor, na seção "a imagem".
 */
export interface OrigemDaTextura {
  fonte: TextoBilingue | null;
  url: string | null;
  licenca: TextoBilingue;
  atribuicao: TextoBilingue | null;
}

/**
 * UMA FRASE DO MANIFESTO NAS DUAS LÍNGUAS (item 130/F4). Elas são texto de
 * TELA — a ficha as imprime na seção "a imagem" —, e o app fala pt-BR e
 * inglês desde a F1. O pt-BR é a CHAVE da tradução no gerador e o PISO na
 * leitura: manifesto antigo, sem `en`, ainda monta a ficha em português em
 * vez de quebrar.
 */
export interface TextoBilingue {
  pt: string;
  en?: string;
}

/**
 * Uma entrada do manifest de texturas (public/data/atlas/texturas.json).
 *
 * SÃO DOIS LEITORES E NÃO UM, e é por isso que a interface deixou de
 * declarar só os quatro campos da carga: o PIPELINE usa `corpo`, `canal`,
 * `arquivo` e `larguraPx` para escolher a variante e baixá-la; a FICHA usa
 * `origem`, `proveniencia` e `nota` para dizer ao visitante de onde a foto
 * veio, sob que licença, e qual é o defeito medido dela. O tipo é a forma do
 * ARQUIVO, e agora ele a declara inteira até onde alguém a lê.
 */
export interface EntradaDeTextura {
  corpo: string;
  canal: string;
  arquivo: string;
  larguraPx: number;
  origem?: OrigemDaTextura;
  /** o vocabulário do selo, mais o `nao-resolvida` da política do dono */
  proveniencia?: 'medido' | 'derivado' | 'nao-resolvida';
  /**
   * O DEFEITO MEDIDO, quando a bancada achou um — Ceres inventado pela
   * fonte, as emendas de Titã, as 68 linhas de Europa, Vênus sem luz
   * visível. A frase nasce em `docs/reference/ASSETS.md` (§ A CONFISSÃO NA
   * TELA), o gerador a lê de lá, e AUSÊNCIA quer dizer "a bancada não achou
   * defeito" — nunca "ninguém olhou".
   */
  nota?: TextoBilingue;
  /**
   * O SELO DO QUE A NOTA CONFESSA — o tier mais fraco dela, da coluna
   * `selo` da mesma tabela do ASSETS.md. Vem sempre junto da `nota`.
   */
  seloDaNota?: 'medido' | 'derivado' | 'inventado';
  /** As partes do selo, quando o canal é misto (ver `PartesDoSelo`). */
  partes?: PartesDoSelo;
}

/**
 * AS PARTES DO SELO MISTO (16/10/2026): a porcentagem da ÁREA em cada tier
 * presente, da mesma coluna `selo` do ASSETS.md (`medido 21 · derivado 41 ·
 * inventado 38`); soma 100 (±1), e o `seloDaNota` continua sendo o mais
 * fraco delas. Ausente quando o canal é de um tier só.
 */
export type PartesDoSelo = Partial<
  Record<NonNullable<EntradaDeTextura['seloDaNota']>, number>
>;

/**
 * A CONFISSÃO DA FORMA de um corpo: a frase bilíngue de sempre — quem lê só
 * `pt`/`en` continua lendo — com o selo ao lado, no mesmo nome e vocabulário
 * da imagem, da coluna `selo` da tabela "a forma" do ASSETS.md. Opcional só
 * para o manifesto anterior ao selo.
 */
export interface FormaConfessada extends TextoBilingue {
  seloDaNota?: EntradaDeTextura['seloDaNota'];
  partes?: PartesDoSelo;
}

export interface ManifestDeTexturas {
  entradas: EntradaDeTextura[];
  /**
   * A FORMA, por corpo (item 20; tabela "a forma" do ASSETS.md): os que têm
   * malha irregular publicada e são desenhados como elipsoide de
   * `BODY_AXES`, e as luas esculpidas por código. Fica no topo e não na
   * entrada porque a forma é do corpo, não de um mapa — as esculpidas não
   * têm textura nenhuma onde pendurar a confissão.
   */
  formas?: Record<string, FormaConfessada>;
}

/** Teto de cinema para os canais de APOIO (tudo que não é `map`) —
 *  a dose de VRAM; a conta mora no doc de `alvoDePixels`. */
export const ALVO_DE_APOIO_CINEMA = 4096;

/**
 * Os canais que o olho LÊ como assunto, e por isso ficam com o 8k de
 * cinema. O `map` sempre foi um. O `ring` de Saturno entrou por escrito
 * em 22/08 e saiu no item 137: o anel lê o perfil medido
 * (`PERFIL_DO_ANEL`), não textura, então o canal não tem mais dono.
 */
const CANAIS_DE_ASSUNTO = new Set(['map']);

/**
 * O ALVO de pixels por tier E POR CANAL — a política do dono (D4/decisão
 * 2) com a DOSE DE VRAM da auditoria: cinema usa a MELHOR variante que o
 * aparelho aguenta (`maxTextureSize` da sonda da Onda 1) SÓ no canal
 * `map`, que é o que o olho lê; os canais de apoio (clouds/night/normal/
 * roughness) tetam em 4k. Alta 2k, performance 1k, em todos os canais.
 *
 * A CONTA (RGBA8 + mipmaps 4/3). As nossas texturas são EQUIRET 2:1,
 * não quadradas — a conta antiga (w×w) era 2× alta. Map cinema
 * 8192×4096 = 179 MB; 4 apoios 4096×2048 = 179 MB; um corpo Terra =
 * 0,36 GB com mip. A lição N-9 do doador (tela branca por 3,9 GB)
 * continua válida: a dose existe para não empilhar 8k em todo canal.
 * A 795 px de disco os apoios em 4k já estão acima de 2 texels/pixel.
 * A regra mora AQUI, por canal, e vale para qualquer corpo futuro:
 * um corpo de poucos canais (a Lua: `map` + o `normal` do item 140)
 * mantém o 8k no `map` de graça.
 *
 * Sem sonda legível o teto é 2k — errar para baixo é barato, estourar o
 * limite do driver é tela preta.
 *
 * `assunto` (07/10): o corpo pode declarar um canal de apoio como
 * assunto do olho no PEDIDO (`CanalPedido.assunto`) — as nuvens da Terra
 * na variante `profundidade`, que o relevo e a sombra põem em primeiro
 * plano, e (item 232, 08/10) a normal dela, o relevo medido de 8192. Em
 * cinema ele sobe ao 8k como o `map`; nos outros tiers nada muda. A dose
 * dessa Terra em cinema: três canais de 8k (map, clouds, normal) = 537 MB
 * e quatro de 4k (night, roughness, os dois horizontes) = 179 MB, ~0,72 GB
 * com mip; a `classica` fica nos 0,36 GB de cima.
 */
export function alvoDePixels(
  tier: QualityLevel,
  canal: string,
  maxTextureSize?: number,
  assunto = false
): number {
  const teto =
    typeof maxTextureSize === 'number' && Number.isFinite(maxTextureSize) && maxTextureSize > 0
      ? maxTextureSize
      : 2048;
  const alvo =
    tier === 'cinema'
      ? assunto || CANAIS_DE_ASSUNTO.has(canal)
        ? 8192
        : ALVO_DE_APOIO_CINEMA
      : tier === 'alta'
        ? 2048
        : 1024;
  return Math.min(alvo, teto);
}

/**
 * A variante de um canal de um CORPO para um alvo: a MAIOR largura ≤
 * alvo, webp quando o navegador decodifica (a guarda de pessimização já
 * morou no pipeline — só existe webp vencedor no manifest). Sem
 * candidata (canal ausente, alvo abaixo do menor degrau) devolve null e
 * o chamador decide. `corpo` entrou na F2b (a Lua é o segundo
 * consumidor); a escada é a mesma para todos.
 */
export function escolherVariante(
  entradas: readonly EntradaDeTextura[],
  corpo: string,
  canal: string,
  alvoPx: number,
  webpOk: boolean
): EntradaDeTextura | null {
  let melhor: EntradaDeTextura | null = null;
  for (const e of entradas) {
    if (e.corpo !== corpo || e.canal !== canal) continue;
    const ehWebp = e.arquivo.endsWith('.webp');
    if (ehWebp && !webpOk) continue;
    if (!(e.larguraPx <= alvoPx)) continue;
    if (
      !melhor ||
      e.larguraPx > melhor.larguraPx ||
      (e.larguraPx === melhor.larguraPx && webpOk && ehWebp)
    ) {
      melhor = e;
    }
  }
  return melhor;
}

/**
 * O navegador decodifica webp? Detecção por reencode de canvas — quem
 * não encoda webp devolve um data-URL de png. Safari antigo cai no jpg
 * com honestidade; falso negativo custa bytes, nunca imagem quebrada.
 */
export function detectarWebp(): boolean {
  try {
    return document
      .createElement('canvas')
      .toDataURL('image/webp')
      .startsWith('data:image/webp');
  } catch {
    return false;
  }
}

// ------------------------------------------------------------
// O DEGRAU DA TELA — a imagem igual, com menos bytes (peso de rede,
// 18/10/2026)
// ------------------------------------------------------------
//
// MEDIDO (`capturas/peso/rede.md`): o gate de 4 px arma pelo TAMANHO, não
// pelo quadro, e o tier mandava cada corpo armado baixar a variante cheia.
// Em Saturno de perto 11,7 dos 11,8 MB de textura eram de Dione, fora do
// quadro; na Terra de perto, 18,5 eram da Lua, um disco de ~15 px.
//
// A REGRA É DE IMAGEM IGUAL, e por isso tem só dois degraus. As variantes
// menores do manifesto NÃO são o mip da cheia (`capturas/peso/rede-v2.md`:
// a `map_4096` da Lua contra a cheia reduzida 2× difere até 51 níveis —
// outro filtro, outra compressão), então um degrau intermediário para um
// corpo VISÍVEL muda a imagem em qualquer tamanho onde o disco se lê. O
// corpo no quadro com mais de `LIMIAR_DA_IMAGEM_PX` de diâmetro pede o teto
// do tier, como antes; fora do quadro, ou menor que isso, o PISO da escada.
// Destino declarado (o foco do Atlas, o roteiro do filme) pede o teto
// sempre: a viagem até ele não pode chegar borrada. O teto do tier continua
// mandando por cima de tudo (`alvoDePixels`).

/** O menor degrau da escada do manifesto: todo canal tem variante ≤ 1024. */
export const PISO_DA_TELA_PX = 1024;

/**
 * T: o diâmetro aparente (px) abaixo do qual o piso desenha a MESMA imagem
 * que o teto (A/B: média |Δ| < 0,5/255, máximo ≤ 3/255). MEDIDO na
 * varredura de tamanho (`capturas/peso/rede-v3.md`, piso × teto, o corpo
 * sozinho no centro): Jano passa até 16 px (máx 2); Terra e Lua passam até
 * 8 px e falham a 10 (máx 9 e 4); Dione, sem ponto que a cubra, passa a
 * 4 px e já falha a 5 (máx 5). T fica nos 4 px do gate: todo disco armado
 * no quadro pede o teto, e o piso é só de quem está fora dele.
 */
export const LIMIAR_DA_IMAGEM_PX = 4;

/**
 * A MARGEM sobre T: o teto é pedido quando o disco passa de T / MARGEM, para
 * o lote chegar antes de o corpo cruzar T na aproximação.
 */
export const MARGEM_DO_LIMIAR = 2;

/**
 * A margem do cone da tela: corpo até este ângulo além da borda já conta
 * como no quadro — girar a câmera não revela um corpo no piso.
 */
export const MARGEM_DO_QUADRO_RAD = 0.15;

/**
 * O que a tela informa ao corpo para ele pedir o degrau. Os campos da mira
 * são opcionais: sem eles o corpo conta como no quadro (o pedido vira só o
 * tamanho) e sem `destinoDoAtlas` ele não é destino.
 */
export interface MiraDaTela {
  /** o eixo da câmera, unitário (o Director escreve a cada quadro) */
  direcaoDaCamera?: THREE.Vector3;
  /** meia diagonal do quadro, em radianos (`meioConeDaTela`) */
  meioConeDaTelaRad?: number;
  /** o Atlas está focado NESTE corpo — não na lua dele, não no pai */
  destinoDoAtlas?: boolean;
  /**
   * o corpo é do SISTEMA do foco do Atlas (`corpoNaVizinhancaDoAtlas`) e a
   * rede pode adiantá-lo: armado, ele pede o teto na última vez da fila
   */
  vizinhoDoAtlas?: boolean;
}

/** A meia diagonal do quadro (o cone que o circunscreve), em radianos. */
export function meioConeDaTela(fovDeg: number, aspecto: number): number {
  const meiaAltura = Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
  return Math.atan(meiaAltura * Math.hypot(1, aspecto));
}

/**
 * O DIÂMETRO que a tela pede deste corpo AGORA (`diametroPx`, a régua do
 * gate): infinito = o teto (destino declarado, ou câmera dentro do raio);
 * 0 = o piso (fora do quadro, ou sem posição). `raioPc` é o MAIOR semieixo.
 */
export function diametroPedidoPelaTela(
  diametroPx: number,
  raioPc: number,
  centroPc: THREE.Vector3,
  q: MiraDaTela & { camPosPc: THREE.Vector3; pedidoDoRoteiro: boolean }
): number {
  if (q.pedidoDoRoteiro || q.destinoDoAtlas) return Number.POSITIVE_INFINITY;
  const dPc = q.camPosPc.distanceTo(centroPc);
  if (!Number.isFinite(dPc)) return 0;
  if (dPc <= raioPc) return Number.POSITIVE_INFINITY;
  const eixo = q.direcaoDaCamera;
  if (eixo && q.meioConeDaTelaRad !== undefined) {
    const cos =
      (eixo.x * (centroPc.x - q.camPosPc.x) +
        eixo.y * (centroPc.y - q.camPosPc.y) +
        eixo.z * (centroPc.z - q.camPosPc.z)) /
      dPc;
    const foraDoEixo = Math.acos(Math.min(1, Math.max(-1, cos))) - Math.asin(raioPc / dPc);
    if (foraDoEixo > q.meioConeDaTelaRad + MARGEM_DO_QUADRO_RAD) return 0;
  }
  return diametroPx;
}


// ------------------------------------------------------------
// A CARGA — uma só, para os quatro corpos
// ------------------------------------------------------------

/** O estado da textura de um corpo. Um enum, quatro moradores, e desde
 *  o item 59 um único leitor — `TexturasDoCorpo`, aqui dentro. */
type EstadoDasTexturas = 'fria' | 'buscando' | 'pronta' | 'falhou';

export type BuscadorDeManifest = (url: string) => Promise<ManifestDeTexturas>;
/**
 * O carregador de UMA imagem. O `sinal` é a peça 3 do bloco A: pedido
 * que perdeu o dono no meio do caminho para de descer. `aoChegar` é
 * chamado a cada pedaço de bytes que desce — o relógio da casa
 * (`PRAZO_SEM_BYTES_S`); quem não o chama conta só a imagem que pousa.
 */
export type CarregadorDeTextura = (
  url: string,
  sinal?: AbortSignal,
  aoChegar?: () => void
) => Promise<THREE.Texture>;

/**
 * O DESCARTE DE UMA TEXTURA DE CORPO — as DUAS metades, e a segunda é a
 * que quase todo projeto three.js esquece (mergulho 09, §1.5, o
 * `ThreeJsHelper.destroyTexture` deles).
 *
 * `dispose()` devolve a textura da GPU. O `ImageBitmap` que a
 * alimentou é memória do lado da CPU, num objeto que o GC não coleta
 * sozinho enquanto não for fechado — e desde a peça 2 do bloco A TODA
 * textura de corpo nasce de um bitmap. Fechar antes de `dispose()` é
 * seguro: o three já subiu os texels no `needsUpdate` do primeiro
 * quadro em que o material desenhou.
 *
 * A guarda de `typeof` existe porque a suíte roda em Node, onde
 * `ImageBitmap` não é global — e a alternativa (`instanceof` cru)
 * estouraria em todo teste que descarta textura.
 */
export function descartarTextura(tex: THREE.Texture): void {
  const dado: unknown = tex.source?.data;
  if (typeof ImageBitmap !== 'undefined' && dado instanceof ImageBitmap) dado.close();
  tex.dispose();
}

/**
 * O que TODO corpo resolvido precisa saber para pedir os pixels dele —
 * o bloco que era copiado nas quatro `Opcoes*`, palavra por palavra.
 */
export interface OpcoesDeTextura {
  /**
   * O TIER, LIDO NA HORA DE ALOCAR — função, não valor. É a regra do
   * NORTE ("knob que decide alocação lê-se ANTES de quem aloca") escrita
   * ao pé da letra: a textura destes corpos é preguiçosa, então o número
   * que decide o alvo de pixels só faz sentido no instante em que ela é
   * pedida. Congelado no construtor (como era até os Ajustes C), trocar
   * de qualidade ao vivo não alcançava corpo nenhum; e reconstruí-los
   * para alcançar tirava o globo da tela por ~2 s enquanto a textura
   * nova vinha — medido, e é exatamente o véu que a letra C proíbe.
   * Desde o item 59 esta função é lida A CADA TICK por quem já está
   * carregado, e não só na primeira carga: é ela que o double-buffer de
   * `TexturasDoCorpo` compara com o `tierVivo` para decidir se há um
   * lote novo a buscar em segundo plano.
   */
  tier: () => QualityLevel;
  maxTextureSize?: number;
  /** BASE_URL do vite — o Director injeta; teste injeta ''. */
  base: string;
  /** injeção de teste; default = detectarWebp() no primeiro uso. */
  webp?: boolean;
  /** injeção de teste do fetch do manifest. */
  buscarManifest?: BuscadorDeManifest;
  /** injeção de teste do loader de imagem. */
  carregarTextura?: CarregadorDeTextura;
}

/** Um canal que o corpo quer, com o pouco que varia entre eles. */
export interface CanalPedido {
  /** o nome no manifest — 'map', 'night', 'clouds'… */
  canal: string;
  /**
   * COR (sRGB, o sampler decodifica para linear) ou DADO (linear cru).
   * `normal` e `roughness` da Terra são dado; todo o resto é cor.
   */
  cor: boolean;
  /**
   * Wrap em U: REPEAT fecha a emenda 0/360 do equiretangular sem risca
   * de mipmap. O anel de Saturno não é equiretangular — é uma placa
   * radial — e prende nas bordas.
   */
  repetirEmU: boolean;
  /**
   * O canal é ASSUNTO do olho neste corpo e sobe ao 8k de cinema como o
   * `map` (ver `alvoDePixels`). Lido a CADA carga, então o corpo pode
   * mudá-lo e a próxima carga obedece; ausente = apoio.
   */
  assunto?: boolean;
}

/** O canal comum: superfície equiretangular em cor. */
export const CANAL_MAP: CanalPedido = { canal: 'map', cor: true, repetirEmU: true };

/**
 * OS DOIS CANAIS DO RELEVO (item 134/S2) — DADO, nunca cor: a altura
 * desloca o vértice e a normal gira a luz. Em sRGB os dois sairiam
 * torcidos em silêncio, pelo mesmo motivo que o `normal` da Terra é
 * linear. Equiretangulares como as irmãs, então repetem em U.
 */
export const CANAL_ALTURA: CanalPedido = { canal: 'height', cor: false, repetirEmU: true };
export const CANAL_NORMAL: CanalPedido = { canal: 'normal', cor: false, repetirEmU: true };

/**
 * OS DOIS CANAIS DO HORIZONTE (PLAN-HIPERION, contrato do mapa de
 * horizonte) — DADO como a altura e a normal: cada texel guarda
 * sen(elevação do horizonte) em três azimutes por mapa (rgb, sem alfa),
 * `horizon` em 0°, 120°, 240° e `horizon2` em 60°, 180°, 300°. Não são assunto do
 * olho, então a dose de `alvoDePixels` os trata como os outros apoios.
 */
export const CANAL_HORIZONTE: CanalPedido = { canal: 'horizon', cor: false, repetirEmU: true };
export const CANAL_HORIZONTE2: CanalPedido = { canal: 'horizon2', cor: false, repetirEmU: true };

/**
 * QUEM SEGURA os texels de um corpo neste quadro (item 115, bloco A).
 *
 * Não é um flag de "pode descarregar": é a lista das razões REAIS pelas
 * quais a imagem precisa existir agora, e basta UMA para os bytes
 * ficarem. Quem solta não decide sozinho — só o último a soltar começa
 * a contar a carência. É a diferença entre uma contagem e um botão: com
 * um botão, a mão que solta o foco levaria junto a imagem que a TELA
 * ainda está desenhando.
 *
 *  - `tela`: o gate binário de 4 px está armado — o corpo ESTÁ (ou está
 *    prestes a estar) desenhando. É este segurador que torna a descarga
 *    segura POR CONSTRUÇÃO: `emQuadro` exige `armado` nos quatro
 *    corpos, então nenhuma textura é tirada de um corpo em quadro.
 *  - `foco`: o Atlas está focado neste corpo (ou na lua dele) — a dose
 *    antecipada de `director/preAquecimento.ts`. Solta no clique
 *    seguinte do visitante, e é EXATAMENTE esse caso que a carência
 *    protege: quem vai a Marte e volta à Terra em cinco segundos não
 *    paga rede nenhuma.
 *  - `filme`: o roteiro declarou o corpo (`preload.corpos`). É
 *    MONOTÔNICO no tempo do filme — `montarApoiosDoRoteiro` guarda o
 *    INÍCIO e responde `t >= inicio` —, então uma vez pedido o corpo
 *    fica segurado até o filme acabar. É por isso que a descarga não
 *    pode estrangular a viagem: ela nunca alcança um corpo que o
 *    roteiro ainda vai usar.
 */
export interface Seguradores {
  tela: boolean;
  foco: boolean;
  filme: boolean;
}

/**
 * A CARÊNCIA entre "o último soltou" e o `dispose()` de verdade — o
 * número literal do `ResourceManager` do NASA Eyes (mergulho 09, §1.5:
 * `unloadTimeout = setTimeout(_deleteEntry, 15e3)`).
 *
 * Não é folga arbitrária: é a peça que faz a ida e volta sair de graça.
 * Dentro dela o corpo continua INTEIRO — os texels na GPU, os uniforms
 * escritos, o estado 'pronta' —, e um segurador que volte é o
 * `clearTimeout` deles: o relógio simplesmente zera, sem tocar a rede.
 *
 * A conta corre no relógio de PAREDE do app (o `tS` do quadro, que é o
 * `Timer.getElapsed()` do Engine), e não na soma dos `dtS`: o `dtS` é
 * grampeado em `GRAMPO_DO_PASSO_S` e numa vista pesada a carência
 * esticaria sozinha. Aba escondida congela o relógio junto com o rAF —
 * e isso é o certo: sem quadro não há visitante indo a lugar nenhum.
 */
export const CARENCIA_DA_DESCARGA_S = 15;

const buscarPelaRede: BuscadorDeManifest = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json() as Promise<ManifestDeTexturas>;
};

/**
 * A CARGA DE UMA IMAGEM — `fetch` + `createImageBitmap`, e não mais o
 * `THREE.TextureLoader` (item 115, bloco A, peça 2).
 *
 * O `TextureLoader` monta um `<img>`, e `<img>` DECODIFICA NA THREAD
 * PRINCIPAL. Medido em 31/08 (`capturas/item115-thread-na-carga.mjs`,
 * 3 repetições, navegação nova por repetição): pousar na Terra em
 * cinema — cinco canais, o `map` 8192×4096 virando 134 MB de RGBA8 —
 * travava a thread por **1.308 ms** no pior bloqueio, TBT 1.413 ms.
 * `createImageBitmap` decodifica FORA da thread, que é a mesma escolha
 * de engenharia do Eyes (mergulho 09, §1.2).
 *
 * AS TRÊS OPÇÕES NÃO SÃO ENFEITE, e duas existem para o pixel NÃO mudar:
 *
 *  - `imageOrientation: 'flipY'` COM `tex.flipY = false`. O three IGNORA
 *    `Texture.flipY` quando a fonte é um `ImageBitmap` (está escrito no
 *    docblock do `ImageBitmapLoader` dele), então o flip que o caminho
 *    do `<img>` fazia no UPLOAD passa a ser feito na DECODIFICAÇÃO. Sem
 *    isto todo globo da casa nasceria de cabeça para baixo — e o par é à
 *    prova dos dois comportamentos: o bitmap já vem virado, e o
 *    `UNPACK_FLIP_Y` desligado não o vira de novo se o navegador o
 *    respeitar.
 *  - `premultiplyAlpha: 'none'`: o `<img>` subia com
 *    `UNPACK_PREMULTIPLY_ALPHA_WEBGL` = `texture.premultiplyAlpha`, que
 *    é `false` por padrão. Mesma conta, do outro lado da fronteira.
 *  - `colorSpaceConversion: 'none'`: nenhum dos webp do atlas carrega
 *    perfil ICC (medido: 7 dos 174 arquivos têm perfil, e são os
 *    `.jpg`/`.png` do fallback, todos sRGB), então converter ou não dá o
 *    mesmo byte — e 'none' é o que protege `normal` e `roughness`, que
 *    são DADO e não cor.
 *
 * A prova de que o pixel não mudou é o `ab-identidade` nas 54 vistas.
 */
const carregarPelaRede: CarregadorDeTextura = async (url, sinal, aoChegar) => {
  const r = await fetch(url, { signal: sinal });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const bitmap = await createImageBitmap(await contandoOsBytes(r, aoChegar).blob(), {
    imageOrientation: 'flipY',
    premultiplyAlpha: 'none',
    colorSpaceConversion: 'none',
  });
  // O CANCELAMENTO PODE CAIR DURANTE A DECODIFICAÇÃO, que é justamente o
  // trecho longo desta função: o bitmap já existe, é memória de CPU, e
  // ninguém mais vai buscá-lo para fechar. É o mesmo guard do
  // `t.isCanceled` deles (mergulho 09, §1.2).
  if (sinal?.aborted) {
    bitmap.close();
    throw new Error(`${url}: carga cancelada`);
  }
  const tex = new THREE.Texture(bitmap);
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
};

/**
 * A RESPOSTA COM OS BYTES CONTADOS: cada pedaço que desce avisa
 * `aoChegar`, e os cabeçalhos também contam. Os bytes passam os mesmos,
 * na mesma ordem, e o tipo do blob sai dos mesmos cabeçalhos — o blob é
 * o mesmo, e o pixel também. O aborto do `fetch` derruba o corpo da
 * resposta, e o cano leva o erro até o `blob()`. Navegador sem
 * `TransformStream` recebe a resposta crua: sem contar, só o prazo do
 * destino parado vale, e a textura chega igual.
 */
function contandoOsBytes(r: Response, aoChegar?: () => void): Response {
  if (!aoChegar || !r.body || typeof TransformStream === 'undefined') return r;
  aoChegar();
  const contar = new TransformStream<Uint8Array, Uint8Array>({
    transform(pedaco, saida) {
      aoChegar();
      saida.enqueue(pedaco);
    },
  });
  return new Response(r.body.pipeThrough(contar), { headers: r.headers });
}

/**
 * O manifest é UM arquivo de 3,44 MiB e treze corpos o pediam ao mesmo
 * tempo (33 pedidos medidos ao entrar no Atlas em cinema, um por corpo
 * e por recarga). A promessa em voo é reusada por (buscador, url).
 *
 * A chave é o BUSCADOR e não só a url porque o buscador é injetável: um
 * teste que dá o seu próprio `buscarManifest` tem o seu próprio cache, e
 * dois testes nunca leem o manifest um do outro. O buscador de rede é um
 * só (`buscarPelaRede`, módulo), então em produção o cache é global de
 * verdade. WeakMap: buscador que morre leva o cache dele junto.
 *
 * FALHA NÃO SE GUARDA. A recarga contada (`RECARGAS_ATE_DESISTIR`)
 * existe porque um 404 transitório não é sentença; guardar a promessa
 * rejeitada faria a segunda tentativa reler o mesmo erro sem tocar a
 * rede, e as três tentativas do contrato viravam uma.
 */
const manifestosEmVoo = new WeakMap<
  BuscadorDeManifest,
  Map<string, Promise<ManifestDeTexturas>>
>();

export function buscarManifestUmaVez(
  buscar: BuscadorDeManifest,
  url: string
): Promise<ManifestDeTexturas> {
  let porUrl = manifestosEmVoo.get(buscar);
  if (!porUrl) {
    porUrl = new Map();
    manifestosEmVoo.set(buscar, porUrl);
  }
  const emVoo = porUrl.get(url);
  if (emVoo) return emVoo;
  const nova = buscar(url);
  porUrl.set(url, nova);
  // o `.catch` cria um RAMO — a promessa devolvida ao chamador continua
  // sendo `nova`, com o erro dele para tratar; o ramo só limpa o cache
  // (e, de quebra, tira a rejeição de "não tratada" caso ninguém a leia)
  void nova.catch(() => {
    if (porUrl.get(url) === nova) porUrl.delete(url);
  });
  return nova;
}

/**
 * A CARGA TRANSACIONAL de um corpo: manifest (uma vez), os canais em
 * paralelo, e a entrega ATÔMICA.
 *
 * Devolve o lote por canal, ou `null` se o pedido foi CANCELADO no
 * caminho (corpo descartado, ou geração vencida por uma carga mais nova)
 * — e nesse caso tudo que chegou já foi descartado aqui dentro. Se
 * QUALQUER canal falhar, o que chegou também é descartado e o erro sobe:
 * é o furo (a) do cabeçalho fechado por construção, e o (b) junto, porque
 * o anel de Saturno é só mais um canal do MESMO lote.
 *
 * `Promise.allSettled` e não `Promise.all`: com `all`, o primeiro canal
 * que cai resolve a espera e os outros terminam sozinhos, sem ninguém
 * para descartá-los. Aqui todos são esperados até o fim, sempre.
 *
 * O `tier` vem PRONTO de quem pede, e não de `opcoes.tier()`: um lote é
 * de um tier só (ou os canais da Terra viriam de duas doses diferentes),
 * e quem pede já o leu para anotar o lote em voo. Duas leituras da mesma
 * função hoje coincidem por serem o mesmo turno síncrono — se um dia
 * divergirem, o `tierVivo` que a casa grava mentiria sobre os pixels que
 * ela acabou de publicar.
 */
export async function carregarCanaisDoCorpo(
  corpo: string,
  canais: readonly CanalPedido[],
  opcoes: OpcoesDeTextura,
  tier: QualityLevel,
  cancelado: () => boolean,
  sinal?: AbortSignal,
  /** o degrau da tela (`degrauPara`); infinito = só o teto do tier */
  degrau = Number.POSITIVE_INFINITY
): Promise<Map<string, THREE.Texture> | null> {
  const { base, maxTextureSize } = opcoes;
  const buscar = opcoes.buscarManifest ?? buscarPelaRede;
  const carregar = opcoes.carregarTextura ?? carregarPelaRede;
  const webpOk = opcoes.webp ?? detectarWebp();

  const manifest = await buscarManifestUmaVez(buscar, `${base}data/atlas/texturas.json`);

  const lote = await Promise.allSettled(
    canais.map(async (pedido) => {
      // o alvo é POR CANAL — a dose de VRAM mora em `alvoDePixels` — e a
      // tela só o baixa, nunca o sobe
      const alvo = Math.min(
        alvoDePixels(tier, pedido.canal, maxTextureSize, pedido.assunto),
        degrau
      );
      const variante = escolherVariante(manifest.entradas, corpo, pedido.canal, alvo, webpOk);
      if (!variante) {
        throw new Error(`${corpo} sem variante para '${pedido.canal}' ≤ ${alvo}px`);
      }
      const tex = await carregar(`${base}${variante.arquivo}`, sinal);
      if (pedido.cor) tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = pedido.repetirEmU ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = ANISOTROPIA_DOS_MAPAS;
      return { canal: pedido.canal, tex };
    })
  );

  const chegaram = lote.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  const caiu = lote.find((r) => r.status === 'rejected');
  if (caiu || cancelado()) {
    for (const { tex } of chegaram) descartarTextura(tex);
    if (caiu) throw (caiu as PromiseRejectedResult).reason;
    return null;
  }
  return new Map(chegaram.map(({ canal, tex }) => [canal, tex]));
}

/**
 * A POLÍTICA DE RECARGA, uma vez para os quatro (auditoria item 6): UMA
 * falha não é sentença — volta a 'fria' e o MESMO gatilho de sempre
 * (gate armado ou fase atlas) rearma no tick seguinte, até
 * `RECARGAS_ATE_DESISTIR`. Só então 'falhou' é terminal, com o aviso
 * ÚNICO: três falhas seguidas não são degradação projetada, são um
 * defeito que alguém precisa ler. Quem desiste degrada honesto — o
 * planeta conserva o PONTO com a fotometria certa, a lua simplesmente
 * não nasce — e a captura REPROVA em vez de fingir (o `captura` do
 * Director segura com o gate armado a frio).
 *
 * `oQueNaoNasce` é a única coisa que variava entre as quatro cópias.
 */
function estadoAposFalha(
  recargas: number,
  etiqueta: string,
  oQueNaoNasce: string
): { texturas: EstadoDasTexturas; recargas: number } {
  if (recargas < RECARGAS_ATE_DESISTIR) {
    return { texturas: 'fria', recargas: recargas + 1 };
  }
  console.warn(
    `[${etiqueta}] carga de textura falhou ${1 + RECARGAS_ATE_DESISTIR}×; ${oQueNaoNasce}`
  );
  return { texturas: 'falhou', recargas };
}

// ------------------------------------------------------------
// A FILA DAS CARGAS — quem desce primeiro (peso de rede, 18/10/2026)
// ------------------------------------------------------------
//
// MEDIDO (`capturas/peso/rede-v3.md`): com o vizinho fora do quadro no
// piso, a Lua clicada da Terra de perto ficou 6,6 s no 1024 e Dione,
// clicada de Saturno, 4,6 s — antes do piso as duas já estavam no teto.
// E os lotes desciam todos de uma vez, dividindo a banda: o corpo que o
// visitante escolheu disputava com cada vizinho armado.
//
// UMA FILA, TRÊS VEZES, e o lote é a unidade (os canais de um corpo
// descem juntos, como sempre):
//  - o DESTINO declarado (pedido infinito: o foco do Atlas desde o clique,
//    o roteiro do filme) desce na hora, todos juntos, e não espera nada;
//  - a TELA espera o destino e desce pelo diâmetro no quadro, o maior
//    primeiro, `LOTES_DA_TELA_DE_UMA_VEZ` por vez;
//  - a VIZINHANÇA (o armado do sistema do foco, já servido pela tela) só
//    desce com a fila quieta, um lote por vez, e sobe ao teto do tier: o
//    próximo clique acha a imagem cheia. Um destino que chega a
//    INTERROMPE — ela volta a esperar, e os bytes dela param.
// Nenhuma vez muda o degrau que a tela pede: muda só QUANDO ele desce.
//
// E NENHUM LOTE SEGURA A FILA PARA SEMPRE (a casa mede, no relógio do
// tick): o destino no ar sem imagem pousada há `ESPERA_PELO_DESTINO_S`
// continua descendo, mas não segura mais a tela nem a vizinhança; e o
// lote, de qualquer vez, sem byte nenhum há `PRAZO_SEM_BYTES_S` CAI, pelo
// mesmo caminho de toda falha — volta a fria e rearma pelo gatilho.

/**
 * Quanto a tela espera por um destino que não pousa imagem nenhuma: 10 s.
 * O lote de destino mais lento medido a 25 Mbps (a Lua no teto, ~7 s,
 * `capturas/peso/rede-v4.md`) cabe com folga, então na rede de referência
 * o destino desce sempre sozinho, como antes. Passado isso ele está
 * pendurado ou rastejando, e a tela não fica vazia esperando por ele.
 */
export const ESPERA_PELO_DESTINO_S = 10;

/**
 * Lote sem byte nenhum há 20 s é FALHA. Rede lenta não é rede muda: a
 * 1 Mbps um pedaço de 64 KB chega a cada meio segundo. Vinte segundos de
 * silêncio são uma conexão morta, e o dobro da espera do destino: a tela
 * já andou antes de ele cair. O relógio só corre com as imagens no ar —
 * o manifest, de todos, não conta.
 */
export const PRAZO_SEM_BYTES_S = 20;

/** A VEZ de um lote na fila — o menor desce primeiro. */
export const VEZ_DO_DESTINO = 0;
export const VEZ_DA_TELA = 1;
export const VEZ_DA_VIZINHANCA = 2;
export type VezDaCarga = typeof VEZ_DO_DESTINO | typeof VEZ_DA_TELA | typeof VEZ_DA_VIZINHANCA;

/**
 * Quantos lotes da TELA descem juntos: dois, para a banda de um cobrir a
 * decodificação do outro, e o maior disco não dividir a rede com todos.
 */
export const LOTES_DA_TELA_DE_UMA_VEZ = 2;

/** Um lote na fila: esperando a vez, ou já descendo. A casa o monta. */
export interface LugarNaFila {
  vez: VezDaCarga;
  /** o diâmetro na tela (px): na vez da tela, o maior desce primeiro */
  tamanhoPx: number;
  /** a ordem de chegada (a fila escreve) — o desempate */
  chegada: number;
  /** a fila já mandou descer */
  descendo: boolean;
  /** o destino no ar sem avanço (`ESPERA_PELO_DESTINO_S`): desce, sem segurar ninguém */
  parado: boolean;
  /** a casa começa a baixar o lote */
  comecar: () => void;
  /** a casa corta o lote em voo; ele continua na fila, esperando */
  interromper: () => void;
}

/**
 * A FILA. Não baixa nada: decide QUANDO cada casa baixa o lote dela, e a
 * casa avisa quando ele sai (pousou, caiu ou foi cancelado). Uma por
 * carregador de imagem (`filaDoCarregador`), como o manifest.
 *
 * A VEZ SE DECIDE NO FIM DO TICK (um microtask), nunca no meio: o palco
 * percorre os corpos numa ordem fixa — Terra, Lua, rochosos, gigantes —, e
 * Dione armada não pode começar a descer antes de Saturno, o destino que só
 * entra na fila mais adiante no MESMO tick.
 */
export class FilaDeCargas {
  private readonly lugares = new Set<LugarNaFila>();
  private chegadas = 0;
  private agendada = false;

  entrar(lugar: LugarNaFila): void {
    lugar.chegada = this.chegadas++;
    lugar.descendo = false;
    lugar.parado = false;
    this.lugares.add(lugar);
    this.agendar();
  }

  /** o destino no ar parou de avançar: a fila anda sem ele, que segue descendo */
  parou(lugar: LugarNaFila): void {
    if (lugar.parado || !this.lugares.has(lugar)) return;
    lugar.parado = true;
    this.agendar();
  }

  /** a vez do lote mudou: o corpo virou destino, entrou na tela, cresceu nela */
  mudarVez(lugar: LugarNaFila, vez: VezDaCarga, tamanhoPx: number): void {
    lugar.tamanhoPx = tamanhoPx;
    if (lugar.vez === vez) return;
    lugar.vez = vez;
    this.agendar();
  }

  sair(lugar: LugarNaFila): void {
    if (this.lugares.delete(lugar)) this.agendar();
  }

  private agendar(): void {
    if (this.agendada) return;
    this.agendada = true;
    queueMicrotask(() => {
      this.agendada = false;
      this.escoar();
    });
  }

  private comecar(lugar: LugarNaFila): void {
    lugar.descendo = true;
    lugar.parado = false;
    lugar.comecar();
  }

  /** o próximo que espera nesta vez: o maior disco, e o mais antigo no empate */
  private proximo(vez: VezDaCarga): LugarNaFila | null {
    let melhor: LugarNaFila | null = null;
    for (const l of this.lugares) {
      if (l.vez !== vez || l.descendo) continue;
      if (
        !melhor ||
        l.tamanhoPx > melhor.tamanhoPx ||
        (l.tamanhoPx === melhor.tamanhoPx && l.chegada < melhor.chegada)
      ) {
        melhor = l;
      }
    }
    return melhor;
  }

  private escoar(): void {
    let destino = false;
    let tela = false;
    let telaDescendo = 0;
    let vizinhancaDescendo = false;
    for (const l of this.lugares) {
      // o destino parado não segura ninguém, e também não ocupa vez nenhuma
      if (l.vez === VEZ_DO_DESTINO) destino ||= !l.parado;
      else if (l.vez === VEZ_DA_TELA) {
        tela = true;
        if (l.descendo) telaDescendo += 1;
      } else if (l.descendo) vizinhancaDescendo = true;
    }
    if (destino) {
      for (const l of this.lugares) {
        if (l.vez === VEZ_DO_DESTINO && !l.descendo) this.comecar(l);
        else if (l.vez === VEZ_DA_VIZINHANCA && l.descendo) {
          l.descendo = false;
          l.interromper();
        }
      }
      return;
    }
    if (tela) {
      for (; telaDescendo < LOTES_DA_TELA_DE_UMA_VEZ; telaDescendo++) {
        const l = this.proximo(VEZ_DA_TELA);
        if (!l) break;
        this.comecar(l);
      }
      return;
    }
    if (vizinhancaDescendo) return;
    const l = this.proximo(VEZ_DA_VIZINHANCA);
    if (l) this.comecar(l);
  }
}

/**
 * Uma fila por CARREGADOR, pela mesma razão do cache do manifest: em
 * produção o carregador é um só (`carregarPelaRede`) e a fila é global de
 * verdade; o teste que injeta o seu tem a sua, e um nunca espera o outro.
 */
const filasPorCarregador = new WeakMap<CarregadorDeTextura, FilaDeCargas>();

export function filaDoCarregador(carregar: CarregadorDeTextura): FilaDeCargas {
  let fila = filasPorCarregador.get(carregar);
  if (!fila) {
    fila = new FilaDeCargas();
    filasPorCarregador.set(carregar, fila);
  }
  return fila;
}

/**
 * O relógio de UM lote no ar. Os avisos do carregador só marcam o que
 * chegou; quem lê o relógio é o tick (`vigiar`), no tempo do app.
 */
interface VigiaDoLote {
  /** as imagens já foram pedidas (o manifest chegou): o relógio corre */
  noAr: boolean;
  /** chegaram bytes desde o tick anterior */
  chegou: boolean;
  /** pousou imagem desde o tick anterior */
  pousou: boolean;
  /** o tick do último byte e da última imagem; null antes do primeiro */
  byteS: number | null;
  pousoS: number | null;
  /** o lote cai como qualquer falha */
  desistir: () => void;
}

// ------------------------------------------------------------
// A CASA DO ESTADO — uma por corpo
// ------------------------------------------------------------

/**
 * O que o corpo declara UMA vez, no construtor, e nunca mais repete.
 *
 * `publicar` é o único passo que continua sendo do corpo: só ele sabe em
 * que uniform cada canal entra (a Terra tem cinco, Saturno escreve o
 * anel em DOIS materiais). Ele é chamado com o lote INTEIRO já em mãos,
 * e é dentro dele que a casca nasce na primeira necessidade.
 */
export interface PedidoDeTexturas {
  /** o id no manifest — 'earth', 'moon', 'io'… */
  corpo: string;
  /**
   * Os canais que este corpo quer. VAZIO é o corpo PROCEDURAL (Palas,
   * Haumea): não há imagem para pedir, então ele nasce pronto no
   * primeiro gatilho, sem tocar a rede — e nenhuma troca de qualidade o
   * alcança, porque não há pixel de arquivo para trocar.
   */
  canais: readonly CanalPedido[];
  /** o bloco comum de rede e tier (`OpcoesDeTextura`) */
  rede: OpcoesDeTextura;
  /** a fiação nos uniforms, com o lote inteiro em mãos */
  publicar: (porCanal: Map<string, THREE.Texture>) => void;
  /**
   * O ESPELHO de `publicar`, e obrigatório pelo mesmo motivo que ele: só
   * o corpo sabe em que uniform cada canal entrou. Chamado ANTES do
   * `dispose()` da descarga, e a ordem não é detalhe — um uniform
   * apontando para textura já devolvida à GPU é um texel que o walker da
   * memória continua contando e que o three re-subiria se o material
   * voltasse a desenhar. Depois dele os uniforms ficam nulos, e o corpo
   * volta a 'fria': quem manda no que aparece é `emQuadro`, que exige
   * `pronta`.
   */
  soltar: () => void;
  /** o que o visitante perde se as três tentativas caírem */
  oQueNaoNasce: string;
  /** a etiqueta do aviso; default = `corpo` (a Terra avisa 'terra') */
  etiqueta?: string;
}

/**
 * O ESTADO DE TEXTURA DE UM CORPO, numa casa só — o quarteto
 * ('fria'/'buscando'/'pronta'/'falhou' + as recargas + as texturas
 * residentes + o `disposto`) que morava COPIADO nas quatro classes.
 *
 * Por que mudou de casa: enquanto o estado morava em cada corpo, uma
 * mudança de política de carga tinha de ser escrita quatro vezes — e as
 * quatro cópias da carga em si já haviam provado (cabeçalho) que o que
 * se repete diverge no que importa. O corpo continua dono do material,
 * da casca e do `dispose` dele; o que ele delega é QUANDO pedir, o que
 * fazer quando cai, e quem descarta os texels no fim.
 *
 * ------------------------------------------------------------
 * O DOUBLE-BUFFER DA TROCA DE TIER (item 59, 31/08)
 * ------------------------------------------------------------
 * Até aqui o tier era lido só na HORA do primeiro pedido: quem já
 * estava carregado ficava com os pixels do tier velho para sempre, e a
 * Terra em close-up continuava em 1k depois de o visitante escolher
 * Cinema. Refazer o corpo para alcançá-lo tirava o globo da tela por
 * ~2 s (medido em 20/08) — o véu que a letra C dos Ajustes proíbe.
 *
 * O conserto é o MESMO desenho do `reassarMundo`, um degrau abaixo: o
 * `tierVivo` diz de que tier são os pixels QUE ESTÃO NA TELA; quando o
 * seletor discorda dele — e o corpo está na tela, que é o gatilho de
 * `aoTick` —, sai um pedido em SEGUNDO PLANO (o corpo segue
 * 'pronta', desenhando os pixels velhos), e a troca de ponteiro
 * acontece num passo síncrono só — `publicar` o lote novo, descartar o
 * velho. Nunca existe um quadro sem globo.
 *
 * A GERAÇÃO é quem decide validade, não o tier pedido: quem clica em
 * três tiers seguidos gera três pedidos, e só o último vira pixel — os
 * outros descartam o que baixaram pela transação que já existe
 * (`carregarCanaisDoCorpo` recebe `cancelado`). Pela régua do tier, um
 * clique que VOLTA ao tier vivo passaria batido e deixaria o lote do
 * meio do caminho pousar; é a mesma lição que o `geracaoDaTroca` do
 * Director aprendeu em 21/08.
 */
export class TexturasDoCorpo {
  private estado: EstadoDasTexturas = 'fria';
  /** recargas já gastas depois de falha — ver RECARGAS_ATE_DESISTIR */
  private recargas = 0;
  /** os texels residentes, dos quais esta casa é a dona */
  private vivas: THREE.Texture[] = [];
  private disposto = false;
  private readonly pedido: PedidoDeTexturas;

  /** de que tier são os pixels QUE ESTÃO NA TELA (null: nenhum ainda) */
  private tierVivo: QualityLevel | null = null;
  /**
   * o tier do lote PEDIDO — esperando a vez na fila ou já no ar; null
   * quando não há pedido. `degrauEmVoo` é o degrau dele.
   */
  private tierEmVoo: QualityLevel | null = null;
  private degrauEmVoo = 0;
  /** o lugar do lote pedido na fila (`FilaDeCargas`); null sem pedido */
  private lugar: LugarNaFila | null = null;
  private readonly fila: FilaDeCargas;
  /**
   * O tier cuja TROCA esgotou as três tentativas. Sem ele o tick
   * repetiria o pedido para sempre, 60 vezes por segundo, contra uma
   * rede que já disse não três vezes. Uma troca bem-sucedida o apaga.
   */
  private tierRecusado: QualityLevel | null = null;
  /**
   * O DEGRAU DA TELA dos pixels vivos e da troca recusada (o piso ou o
   * teto do tier — `degrauPara`): um lote é o par (tier, degrau). 0 =
   * nenhum.
   */
  private degrauVivo = 0;
  private degrauRecusado = 0;
  /** o degrau que a imagem igual exige no último tick (T sem a margem) */
  private degrauPreciso = 0;
  /** o pedido que vale; qualquer outro que chegue é descartado */
  private geracao = 0;
  /**
   * O INSTANTE em que o ÚLTIMO segurador soltou (relógio de parede do
   * app), ou `null` enquanto alguém segura. É o `unloadTimeout` deles
   * sem timer: o tick já passa aqui sessenta vezes por segundo, e um
   * `setTimeout` por corpo seria um relógio a mais para o `dispose`
   * lembrar de limpar.
   */
  private soltoDesde: number | null = null;
  /** quantos seguram os texels AGORA — 0 é a carência correndo */
  private quantosSeguram = 0;
  /**
   * NINGUÉM SEGURAVA NO TICK ANTERIOR (item 225) — a BORDA que a
   * ressurreição de `'falhou'` espera, nunca o NÍVEL: sem ela, um corpo
   * desistido e CONTINUAMENTE segurado martelaria a rede a cada tick
   * enquanto o teto de `RECARGAS_ATE_DESISTIR` reabrisse e fechasse de
   * novo. Começa `true` — ninguém segura antes do primeiro tick.
   */
  private ninguemSegurava = true;
  /**
   * O ABORTO do lote EM VOO (item 115, peça 3). A geração já invalidava
   * o lote — mas invalidar é decidir que os bytes não servem, não parar
   * de recebê-los: até aqui o `map` de cinema da Terra descia INTEIRO
   * para ser descartado na chegada. `AbortController` corta a
   * transferência. `null` quando não há pedido no ar.
   */
  private abortoEmVoo: AbortController | null = null;
  /** o relógio do lote NO AR (`vigiar`); null sem lote descendo */
  private vigia: VigiaDoLote | null = null;

  constructor(pedido: PedidoDeTexturas) {
    this.pedido = pedido;
    this.fila = filaDoCarregador(pedido.rede.carregarTextura ?? carregarPelaRede);
  }

  /** quantos dos três seguram os texels neste quadro (0 = carência) */
  get segurando(): number {
    return this.quantosSeguram;
  }

  /** há pixels na tela? (o `emQuadro` dos quatro corpos depende disto) */
  get pronta(): boolean {
    return this.estado === 'pronta';
  }

  /**
   * Há carga EM VOO — mudança já pedida que ainda não chegou, seja a
   * primeira (sem globo na tela) ou a troca de tier (com o globo velho
   * ainda desenhando). Os dois casos contam pelo mesmo motivo: o
   * `captura` do Director espera por eles para fotografar a imagem em
   * vez da corrida, e o `perturbar` do palco recomeça a contagem de
   * estabilidade quando o lote novo entra.
   */
  get carregando(): boolean {
    return this.estado === 'buscando' || this.tierEmVoo !== null;
  }

  /** o tier dos pixels na tela — a sonda da troca lê isto. */
  get tierNaTela(): QualityLevel | null {
    return this.tierVivo;
  }

  /**
   * O GATILHO, uma vez por tick. `seguram` são os três de sempre (gate
   * armado, foco do Atlas, pedido do roteiro) — e qualquer um deles é o
   * gatilho da carga; a carga preguiçosa é o contrato — sem segurador
   * nenhum byte desce, e as vistas oficiais não fazem fetch.
   *
   * A TROCA DE TIER PEDE O MESMO GATILHO, porque ele é justamente quem
   * diz "este corpo está NA TELA agora": gate armado (grande o bastante
   * para o olho ler) ou o foco do Atlas. Sem essa condição bastava
   * 'pronta' — "carregou alguma vez" —, e um clique no seletor mandava
   * os 38 corpos do palco que alguém já visitou e abandonou re-baixar o
   * lote inteiro (34,4 MiB de variante de cinema, medidos na auditoria
   * de 31/08), cada um disparando o `perturbar` do palco por pixels que
   * ninguém olha. Quem VOLTA pede a troca no primeiro tick em que o
   * segurador volta, pela mesma comparação com `tierVivo` que já está
   * aqui — ela não some, só não dispara enquanto ninguém olha.
   *
   * E QUANDO NINGUÉM SEGURA (item 115, bloco A) a mão vai para o outro
   * lado, com a regra do `releaseByUrl` deles copiada letra a letra:
   *
   *  - lote em voo SEM pixel na tela → cancela NA HORA, sem carência.
   *    Não há imagem a preservar, e a volta recomeçaria do zero de
   *    qualquer jeito; o que a espera compraria seria só banda descendo
   *    para ninguém (mergulho 09, §1.5: "senão (ainda baixando) →
   *    `_deleteEntry` imediato").
   *  - com pixels residentes → a CARÊNCIA de 15 s, e só então o
   *    `dispose`. Um lote de TROCA que ainda esteja no ar perde o dono
   *    junto, porque os pixels velhos continuam servindo.
   *
   * `tS` é o relógio de parede do app (o `t` do tick). Ver
   * `CARENCIA_DA_DESCARGA_S` para o porquê de não ser a soma dos `dtS`.
   *
   * `diametroPx` é o que a TELA pede (`diametroPedidoPelaTela`); ausente,
   * o teto do tier, como antes do degrau. A troca de DEGRAU é a troca de
   * tier um passo abaixo, com duas regras a mais: no mesmo tier o degrau
   * SÓ SOBE enquanto alguém segura (encolher na tela não troca pixel nenhum
   * — quem devolve os texels é a carência), e uma subida em voo POUSA
   * antes de qualquer outra troca no mesmo tier.
   *
   * O pedido infinito é o DESTINO e desce na frente; o finito espera na
   * vez da tela, pelo tamanho (`FilaDeCargas`). Um lote que ainda espera
   * a vez não baixou nada: segue o pedido de agora a cada tick, ou sai.
   * `vizinho` (`MiraDaTela.vizinhoDoAtlas`): com a tela servida, o corpo
   * ARMADO pede o teto do tier na última vez — o que o visitante ainda não
   * vê, mas o próximo clique ou giro mostra.
   */
  aoTick(
    seguram: Seguradores,
    tS: number,
    diametroPx = Number.POSITIVE_INFINITY,
    vizinho = false
  ): void {
    if (this.disposto) return;
    const gatilho = seguram.tela || seguram.foco || seguram.filme;
    this.quantosSeguram =
      (seguram.tela ? 1 : 0) + (seguram.foco ? 1 : 0) + (seguram.filme ? 1 : 0);
    if (!gatilho) {
      this.ninguemSegurava = true;
      this.aoSoltar(tS);
      return;
    }
    // RESSURREIÇÃO: qualquer segurador que volte zera o relógio da
    // carência — é o `clearTimeout` do `acquire` deles.
    this.soltoDesde = null;
    // E 'falhou' TAMBÉM RESSUSCITA (item 225) — mas só na BORDA de um
    // segurador que VOLTA depois de ter ido embora, nunca a cada tick:
    // martelar a rede a 60 Hz contra quem já disse não três vezes é o
    // mesmo defeito que a carência evita do outro lado. O teto de
    // `RECARGAS_ATE_DESISTIR` reabre por ciclo de armação — um 404 de
    // uma visita não deve envenenar a visita seguinte.
    if (this.estado === 'falhou' && this.ninguemSegurava) {
      this.estado = 'fria';
      this.recargas = 0;
    }
    this.ninguemSegurava = false;
    this.vigiar(tS);
    // o tier lido AGORA, na hora do pedido (pino de `atlasConfig.test.ts`)
    const { rede } = this.pedido;
    const tier = rede.tier();
    const degrauDaTela = this.degrauPara(tier, diametroPx, LIMIAR_DA_IMAGEM_PX / MARGEM_DO_LIMIAR);
    this.degrauPreciso = this.degrauPara(tier, diametroPx, LIMIAR_DA_IMAGEM_PX);
    const vezDaTela = diametroPx === Number.POSITIVE_INFINITY ? VEZ_DO_DESTINO : VEZ_DA_TELA;
    if (this.estado === 'fria') {
      this.pedir(tier, degrauDaTela, vezDaTela, diametroPx);
      return;
    }
    if (this.estado === 'buscando') {
      // a PRIMEIRA carga: na fila, segue o pedido de agora; no ar, pousa
      // antes de qualquer troca — e nos dois casos a vez acompanha a tela
      if (!this.lugar) return;
      if (!this.lugar.descendo) {
        this.tierEmVoo = tier;
        this.degrauEmVoo = degrauDaTela;
      }
      this.fila.mudarVez(this.lugar, vezDaTela, diametroPx);
      return;
    }
    // corpo procedural (sem canais) não tem pixel de arquivo a trocar
    if (this.estado !== 'pronta' || this.pedido.canais.length === 0) return;
    let degrau =
      tier === this.tierVivo ? Math.max(this.degrauVivo, degrauDaTela) : degrauDaTela;
    let vez: VezDaCarga = vezDaTela;
    // A VIZINHANÇA: a tela já está servida, e o vizinho armado pede o teto
    // do tier na última vez da fila
    if (vizinho && seguram.tela && tier === this.tierVivo && degrau === this.degrauVivo) {
      const teto = this.degrauPara(tier, Number.POSITIVE_INFINITY, 0);
      if (teto > degrau) {
        degrau = teto;
        vez = VEZ_DA_VIZINHANCA;
      }
    }
    const nadaATrocar = tier === this.tierVivo && degrau === this.degrauVivo;
    const recusado = tier === this.tierRecusado && degrau === this.degrauRecusado;
    if (this.lugar && !this.lugar.descendo) {
      // NA FILA, nada desceu ainda: o lote segue o pedido de agora, ou sai
      if (nadaATrocar || recusado) {
        this.cancelarEmVoo();
        return;
      }
      this.tierEmVoo = tier;
      this.degrauEmVoo = degrau;
      this.fila.mudarVez(this.lugar, vez, diametroPx);
      return;
    }
    if (this.lugar) {
      // contra o lote EM VOO: dois cliques no mesmo tier não abrem dois
      // pedidos, e a subida de degrau em voo pousa antes da próxima — a
      // não ser a da VIZINHANÇA, que ninguém mais pede: essa para
      if (tier === this.tierEmVoo) {
        if (degrau === this.degrauEmVoo) {
          this.fila.mudarVez(this.lugar, vez, diametroPx);
          return;
        }
        if (this.lugar.vez !== VEZ_DA_VIZINHANCA) return;
        this.cancelarEmVoo();
      }
      // VOLTAR AO TIER QUE JÁ ESTÁ NA TELA É CANCELAR o que está no ar:
      // ninguém o espera mais — a geração nova o invalida. É a lição do
      // `reassarMundo` (21/08) num corpo só. Fora da tela quem cancela é
      // o `aoSoltar`, que não olha tier nenhum: sem segurador, nenhum
      // lote tem dono.
      else if (tier === this.tierVivo) this.cancelarEmVoo();
    }
    if (nadaATrocar || recusado) return;
    this.pedir(tier, degrau, vez, diametroPx);
  }

  /** os pixels na tela são de que degrau (0: nenhum) — a sonda da aproximação */
  get degrauNaTela(): number {
    return this.degrauVivo;
  }

  /** o degrau que a imagem igual exige agora (T, sem a margem) — a sonda */
  get degrauPrecisoNaTela(): number {
    return this.degrauPreciso;
  }

  /**
   * O degrau de um diâmetro pedido: o TETO do tier (o maior alvo entre os
   * canais deste corpo) a partir de `limiarPx`, o piso abaixo. O teto é um
   * número só para o foco (infinito) e para o close: virar destino de um
   * corpo já carregado no teto não baixa nada de novo.
   */
  private degrauPara(tier: QualityLevel, diametroPx: number, limiarPx: number): number {
    if (!(diametroPx >= limiarPx)) return PISO_DA_TELA_PX;
    const { rede, canais } = this.pedido;
    let teto = PISO_DA_TELA_PX;
    for (const c of canais) {
      teto = Math.max(teto, alvoDePixels(tier, c.canal, rede.maxTextureSize, c.assunto));
    }
    return teto;
  }

  /**
   * O LOTE EM VOO PERDE O DONO — a geração nova o invalida (quem chegar
   * é descartado) e o aborto corta os bytes que ainda estão descendo.
   * As duas metades andam juntas: sem a geração, um lote abortado
   * poderia pousar; sem o aborto, um lote invalidado continua custando
   * banda. Um `abort()` depois de a carga terminar é inócuo. E o lote
   * sai da fila, esperando ou no ar: a vez dele passa adiante.
   */
  private cancelarEmVoo(): void {
    this.interromper();
    this.tierEmVoo = null;
    this.degrauEmVoo = 0;
    const lugar = this.lugar;
    this.lugar = null;
    if (lugar) this.fila.sair(lugar);
  }

  /**
   * O LOTE NO AR PARA, mas o pedido fica: a geração nova invalida o que
   * chegar e o aborto corta os bytes. É o que a fila chama quando um
   * destino passa à frente da vizinhança — ela volta a esperar a vez.
   */
  private interromper(): void {
    this.geracao += 1;
    this.abortoEmVoo?.abort();
    this.abortoEmVoo = null;
    this.vigia = null;
  }

  /**
   * O RELÓGIO DO LOTE NO AR, a cada tick em que alguém segura: o que
   * chegou desde o tick anterior zera o relógio dele. Sem imagem pousada
   * há `ESPERA_PELO_DESTINO_S`, o destino deixa a fila andar; sem byte há
   * `PRAZO_SEM_BYTES_S`, o lote desiste e cai no `catch` de sempre.
   */
  private vigiar(tS: number): void {
    const v = this.vigia;
    const lugar = this.lugar;
    if (!v || !lugar || !v.noAr) return;
    if (v.byteS === null || v.chegou || v.pousou) v.byteS = tS;
    if (v.pousoS === null || v.pousou) v.pousoS = tS;
    v.chegou = false;
    v.pousou = false;
    if (tS - v.byteS >= PRAZO_SEM_BYTES_S) v.desistir();
    else if (lugar.vez === VEZ_DO_DESTINO && tS - v.pousoS >= ESPERA_PELO_DESTINO_S) {
      this.fila.parou(lugar);
    }
  }

  /**
   * NINGUÉM SEGURA — o outro lado do gatilho. Devolve na primeira linha
   * que puder: quem não tem nada residente nem nada no ar não está em
   * carência de coisa nenhuma, está simplesmente frio (é o estado dos 30
   * corpos que o visitante nunca visitou).
   */
  private aoSoltar(tS: number): void {
    // PRIMEIRA CARGA EM VOO: nada na tela para preservar. Cancela já —
    // a geração nova invalida o lote, e o `abortar` corta os bytes.
    if (this.estado === 'buscando') {
      this.cancelarEmVoo();
      this.estado = 'fria';
      this.soltoDesde = null;
      return;
    }
    // TROCA DE TIER EM VOO: os pixels velhos continuam servindo, então
    // o lote novo é que perde o dono. A carência abaixo julga os velhos.
    if (this.tierEmVoo !== null) this.cancelarEmVoo();
    // nada residente (corpo frio, procedural ou que desistiu): sem relógio
    if (this.vivas.length === 0) {
      this.soltoDesde = null;
      return;
    }
    if (this.soltoDesde === null) {
      this.soltoDesde = tS;
      return;
    }
    if (tS - this.soltoDesde >= CARENCIA_DA_DESCARGA_S) this.descarregar();
  }

  /**
   * A DESCARGA — os texels voltam para a GPU e o corpo volta a 'fria'.
   *
   * A ordem é o espelho exato da troca de ponteiro do `pedir`: `soltar`
   * (os uniforms deixam de apontar) ANTES do `dispose` (os texels
   * somem). Entre as duas linhas nenhum quadro é desenhado.
   *
   * Volta a 'fria' e não a 'falhou': descarregar não é fracasso, e o
   * corpo tem de poder recarregar no primeiro tick em que alguém o
   * segurar de novo — por isso as recargas e o `tierRecusado` também
   * zeram. Quem desistiu de verdade ('falhou') nunca chega aqui, porque
   * não tem texel residente.
   */
  private descarregar(): void {
    this.cancelarEmVoo();
    this.pedido.soltar();
    for (const t of this.vivas) descartarTextura(t);
    this.vivas = [];
    this.estado = 'fria';
    this.tierVivo = null;
    this.tierEmVoo = null;
    this.tierRecusado = null;
    this.degrauVivo = 0;
    this.degrauRecusado = 0;
    this.recargas = 0;
    this.soltoDesde = null;
  }

  private pedir(tier: QualityLevel, degrau: number, vez: VezDaCarga, tamanhoPx: number): void {
    // com o globo já na tela o pedido é de TROCA: o estado continua
    // 'pronta' e os pixels velhos seguem desenhando até o lote chegar
    if (this.estado !== 'pronta') this.estado = 'buscando';
    // corpo procedural: nada a baixar, e a casca nasce no `publicar`
    if (this.pedido.canais.length === 0) {
      this.pedido.publicar(new Map());
      this.estado = 'pronta';
      return;
    }
    // um pedido novo cancela o anterior — a geração já o invalidava, e
    // agora os bytes dele também param
    this.cancelarEmVoo();
    this.tierEmVoo = tier;
    this.degrauEmVoo = degrau;
    // o lote espera a vez dele; a fila manda descer (`baixar`), talvez já
    const lugar: LugarNaFila = {
      vez,
      tamanhoPx,
      chegada: 0,
      descendo: false,
      parado: false,
      comecar: () => this.baixar(lugar),
      interromper: () => {
        if (this.lugar === lugar) this.interromper();
      },
    };
    this.lugar = lugar;
    this.fila.entrar(lugar);
  }

  /** a fila mandou descer: o lote pedido (`tierEmVoo`, `degrauEmVoo`) vai à rede */
  private baixar(lugar: LugarNaFila): void {
    const tier = this.tierEmVoo;
    if (this.disposto || this.lugar !== lugar || tier === null) return;
    const degrau = this.degrauEmVoo;
    const daPrimeiraVez = this.estado !== 'pronta';
    const { corpo, canais, rede, publicar } = this.pedido;
    const aborto = new AbortController();
    this.abortoEmVoo = aborto;
    const minha = ++this.geracao;
    const vencida = () => this.disposto || minha !== this.geracao;
    // O PRAZO: o lote mudo desiste por aqui, mesmo que o carregador não
    // obedeça ao aborto — e o que chegar depois é descartado lá dentro
    let desistiu = false;
    let cair: (erro: Error) => void = () => {};
    const prazo = new Promise<never>((_, rejeitar) => {
      cair = rejeitar;
    });
    const vigia: VigiaDoLote = {
      noAr: false,
      chegou: false,
      pousou: false,
      byteS: null,
      pousoS: null,
      desistir: () => {
        desistiu = true;
        aborto.abort();
        cair(new Error(`${corpo}: nenhum byte há ${PRAZO_SEM_BYTES_S} s`));
      },
    };
    this.vigia = vigia;
    const carregar = rede.carregarTextura ?? carregarPelaRede;
    const vigiado: CarregadorDeTextura = (url, sinal) => {
      vigia.noAr = true;
      return carregar(url, sinal, () => {
        vigia.chegou = true;
      }).then((tex) => {
        vigia.pousou = true;
        return tex;
      });
    };
    /** o lote saiu (pousou ou caiu): a vez dele passa adiante */
    const sair = () => {
      this.tierEmVoo = null;
      this.degrauEmVoo = 0;
      this.lugar = null;
      if (this.abortoEmVoo === aborto) this.abortoEmVoo = null;
      if (this.vigia === vigia) this.vigia = null;
      this.fila.sair(lugar);
    };
    void Promise.race([
      carregarCanaisDoCorpo(
        corpo,
        canais,
        { ...rede, carregarTextura: vigiado },
        tier,
        () => vencida() || desistiu,
        aborto.signal,
        degrau
      ),
      prazo,
    ])
      .then((porCanal) => {
        // cancelada no caminho: o lote já foi descartado lá dentro
        if (!porCanal) return;
        // e o microtask entre a chegada e esta linha ainda cabe um
        // `dispose()` do Director ou um clique num terceiro tier — o
        // lote não fica sem dono
        if (vencida()) {
          for (const t of porCanal.values()) descartarTextura(t);
          return;
        }
        // ---- A TROCA DE PONTEIRO: síncrona, sem um `await` no meio ---
        // publicar ANTES de descartar; entre as duas linhas nenhum
        // quadro é desenhado, então nenhum material aponta para um texel
        // já devolvido à GPU
        publicar(porCanal);
        for (const t of this.vivas) descartarTextura(t);
        this.vivas = [...porCanal.values()];
        // ---- fim da troca -------------------------------------------
        this.tierVivo = tier;
        this.degrauVivo = degrau;
        this.tierRecusado = null;
        this.degrauRecusado = 0;
        this.recargas = 0;
        this.estado = 'pronta';
        sair();
      })
      .catch(() => {
        if (vencida()) return;
        sair();
        const etiqueta = this.pedido.etiqueta ?? corpo;
        if (daPrimeiraVez) {
          const r = estadoAposFalha(this.recargas, etiqueta, this.pedido.oQueNaoNasce);
          this.recargas = r.recargas;
          this.estado = r.texturas;
          return;
        }
        // A TROCA QUE CAI não é sentença nem véu: o corpo continua com
        // os pixels que tem. A política de recarga é a mesma da primeira
        // carga (uma falha não é sentença), e o aviso é OUTRO porque a
        // verdade é outra — o globo está na tela, no tier de antes.
        if (this.recargas < RECARGAS_ATE_DESISTIR) {
          this.recargas += 1;
          return;
        }
        this.recargas = 0;
        this.tierRecusado = tier;
        this.degrauRecusado = degrau;
        console.warn(
          `[${etiqueta}] troca de qualidade falhou ${1 + RECARGAS_ATE_DESISTIR}×; ` +
            `o corpo segue no tier '${this.tierVivo}' (degrau ${this.degrauVivo})`
        );
      });
  }

  dispose(): void {
    this.disposto = true;
    // o que ainda está descendo para uma cena que morreu para de descer,
    // e o que esperava a vez sai da fila
    this.cancelarEmVoo();
    for (const t of this.vivas) descartarTextura(t);
    this.vivas.length = 0;
  }
}
