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
 * DE ONDE VEIO ESTA IMAGEM — os quatro campos que `texturas.json` guarda por
 * entrada desde a Onda 6, e que até 22/08 não tinham leitor nenhum: o
 * manifesto os escrevia e o app os ignorava. A ficha do objeto (item 74) é o
 * primeiro consumidor, na seção "a imagem".
 */
export interface OrigemDaTextura {
  fonte: string | null;
  url: string | null;
  licenca: string;
  atribuicao: string | null;
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
  nota?: string;
}
export interface ManifestDeTexturas {
  entradas: EntradaDeTextura[];
  /**
   * A FORMA, por corpo: os quatro que têm malha irregular publicada e são
   * desenhados como elipsoide de `BODY_AXES` (item 20). Fica no topo e não
   * na entrada porque Palas e Haumea não têm textura nenhuma — a superfície
   * deles é procedural — e não teriam onde pendurar a confissão.
   */
  formas?: Record<string, string>;
}

/** Teto de cinema para os canais de APOIO (tudo que não é `map`) —
 *  a dose de VRAM; a conta mora no doc de `alvoDePixels`. */
export const ALVO_DE_APOIO_CINEMA = 4096;

/**
 * Os canais que o olho LÊ como assunto, e por isso ficam com o 8k de
 * cinema. O `map` sempre foi um; o `ring` de Saturno entrou por escrito
 * em 22/08 — não é mudança de dose, é a dose que já vigorava saindo do
 * esconderijo: `gigante.ts` calculava o alvo do anel com o canal 'map'
 * (`alvoDePixels(tier, 'map')`) e a linha não dizia por quê. O anel É o
 * assunto de Saturno em close, e a placa 8192×500 custa 21,8 MiB com
 * mip — um oitavo do que um `map` 8k custa, porque não é equiretangular.
 */
const CANAIS_DE_ASSUNTO = new Set(['map', 'ring']);

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
 * um corpo de 1 canal (a Lua) mantém o 8k no `map` de graça.
 *
 * Sem sonda legível o teto é 2k — errar para baixo é barato, estourar o
 * limite do driver é tela preta.
 */
export function alvoDePixels(
  tier: QualityLevel,
  canal: string,
  maxTextureSize?: number
): number {
  const teto =
    typeof maxTextureSize === 'number' && Number.isFinite(maxTextureSize) && maxTextureSize > 0
      ? maxTextureSize
      : 2048;
  const alvo =
    tier === 'cinema'
      ? CANAIS_DE_ASSUNTO.has(canal)
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
// A CARGA — uma só, para os quatro corpos
// ------------------------------------------------------------

/** O estado da textura de um corpo. Um enum, quatro moradores. */
export type EstadoDasTexturas = 'fria' | 'buscando' | 'pronta' | 'falhou';

export type BuscadorDeManifest = (url: string) => Promise<ManifestDeTexturas>;
export type CarregadorDeTextura = (url: string) => Promise<THREE.Texture>;

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
   * Quem já está carregado guarda os pixels que tem; quem carregar
   * daqui em diante obedece ao tier de agora.
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
  /** o nome no manifest — 'map', 'night', 'clouds', 'ring'… */
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
}

/** O canal comum: superfície equiretangular em cor. */
export const CANAL_MAP: CanalPedido = { canal: 'map', cor: true, repetirEmU: true };

const buscarPelaRede: BuscadorDeManifest = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json() as Promise<ManifestDeTexturas>;
};

const carregarPelaRede: CarregadorDeTextura = (url) =>
  new THREE.TextureLoader().loadAsync(url);

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
 */
export async function carregarCanaisDoCorpo(
  corpo: string,
  canais: readonly CanalPedido[],
  opcoes: OpcoesDeTextura,
  cancelado: () => boolean
): Promise<Map<string, THREE.Texture> | null> {
  const { base, maxTextureSize } = opcoes;
  // o tier é lido UMA vez, no começo do pedido: um lote é de um tier só,
  // ou os canais da Terra viriam de duas doses diferentes
  const tierAgora = opcoes.tier();
  const buscar = opcoes.buscarManifest ?? buscarPelaRede;
  const carregar = opcoes.carregarTextura ?? carregarPelaRede;
  const webpOk = opcoes.webp ?? detectarWebp();

  const manifest = await buscarManifestUmaVez(buscar, `${base}data/atlas/texturas.json`);

  const lote = await Promise.allSettled(
    canais.map(async (pedido) => {
      // o alvo é POR CANAL — a dose de VRAM mora em `alvoDePixels`
      const alvo = alvoDePixels(tierAgora, pedido.canal, maxTextureSize);
      const variante = escolherVariante(manifest.entradas, corpo, pedido.canal, alvo, webpOk);
      if (!variante) {
        throw new Error(`${corpo} sem variante para '${pedido.canal}' ≤ ${alvo}px`);
      }
      const tex = await carregar(`${base}${variante.arquivo}`);
      if (pedido.cor) tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = pedido.repetirEmU ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = 4;
      return { canal: pedido.canal, tex };
    })
  );

  const chegaram = lote.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  const caiu = lote.find((r) => r.status === 'rejected');
  if (caiu || cancelado()) {
    for (const { tex } of chegaram) tex.dispose();
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
export function estadoAposFalha(
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
 * seletor discorda dele, sai um pedido em SEGUNDO PLANO (o corpo segue
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
  /** o tier do lote EM VOO — null quando não há pedido no ar */
  private tierEmVoo: QualityLevel | null = null;
  /**
   * O tier cuja TROCA esgotou as três tentativas. Sem ele o tick
   * repetiria o pedido para sempre, 60 vezes por segundo, contra uma
   * rede que já disse não três vezes. Uma troca bem-sucedida o apaga.
   */
  private tierRecusado: QualityLevel | null = null;
  /** o pedido que vale; qualquer outro que chegue é descartado */
  private geracao = 0;

  constructor(pedido: PedidoDeTexturas) {
    this.pedido = pedido;
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
   * O GATILHO, uma vez por tick. `gatilho` é o par de sempre (gate
   * armado OU fase atlas); a carga preguiçosa é o contrato — sem
   * gatilho nenhum byte desce, e as vistas oficiais não fazem fetch.
   *
   * A TROCA DE TIER não pede gatilho: o corpo já está na tela, e é
   * justamente por estar que ele precisa dos pixels certos.
   */
  aoTick(gatilho: boolean): void {
    if (this.disposto) return;
    if (this.estado === 'fria' && gatilho) {
      this.pedir();
      return;
    }
    // corpo procedural (sem canais) não tem pixel de arquivo a trocar
    if (this.estado !== 'pronta' || this.pedido.canais.length === 0) return;
    const tier = this.pedido.rede.tier();
    // contra o lote EM VOO quando há um: dois cliques no mesmo tier não
    // abrem dois pedidos, e o pedido em voo não se cancela sozinho
    if (tier === (this.tierEmVoo ?? this.tierVivo) || tier === this.tierRecusado) return;
    // VOLTAR AO TIER QUE JÁ ESTÁ NA TELA É CANCELAR, e não pedir de
    // novo: não há lote a buscar, mas há um em voo que ninguém espera
    // mais — a geração nova o invalida. É a lição do `reassarMundo`
    // (21/08) num corpo só.
    if (tier === this.tierVivo) {
      this.geracao += 1;
      this.tierEmVoo = null;
      return;
    }
    this.pedir();
  }

  private pedir(): void {
    // com o globo já na tela o pedido é de TROCA: o estado continua
    // 'pronta' e os pixels velhos seguem desenhando até o lote chegar
    const daPrimeiraVez = this.estado !== 'pronta';
    if (daPrimeiraVez) this.estado = 'buscando';
    // corpo procedural: nada a baixar, e a casca nasce no `publicar`
    if (this.pedido.canais.length === 0) {
      this.pedido.publicar(new Map());
      this.estado = 'pronta';
      return;
    }
    const { corpo, canais, rede, publicar } = this.pedido;
    const minha = ++this.geracao;
    const tier = rede.tier();
    this.tierEmVoo = tier;
    const vencida = () => this.disposto || minha !== this.geracao;
    void carregarCanaisDoCorpo(corpo, canais, rede, vencida)
      .then((porCanal) => {
        // cancelada no caminho: o lote já foi descartado lá dentro
        if (!porCanal) return;
        // e o microtask entre a chegada e esta linha ainda cabe um
        // `dispose()` do Director ou um clique num terceiro tier — o
        // lote não fica sem dono
        if (vencida()) {
          for (const t of porCanal.values()) t.dispose();
          return;
        }
        // ---- A TROCA DE PONTEIRO: síncrona, sem um `await` no meio ---
        // publicar ANTES de descartar; entre as duas linhas nenhum
        // quadro é desenhado, então nenhum material aponta para um texel
        // já devolvido à GPU
        publicar(porCanal);
        for (const t of this.vivas) t.dispose();
        this.vivas = [...porCanal.values()];
        // ---- fim da troca -------------------------------------------
        this.tierVivo = tier;
        this.tierEmVoo = null;
        this.tierRecusado = null;
        this.recargas = 0;
        this.estado = 'pronta';
      })
      .catch(() => {
        if (vencida()) return;
        this.tierEmVoo = null;
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
        console.warn(
          `[${etiqueta}] troca de qualidade falhou ${1 + RECARGAS_ATE_DESISTIR}×; ` +
            `o corpo segue no tier '${this.tierVivo}'`
        );
      });
  }

  dispose(): void {
    this.disposto = true;
    for (const t of this.vivas) t.dispose();
    this.vivas.length = 0;
  }
}
