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

/** O estado da textura de um corpo. Um enum, quatro moradores, e desde
 *  o item 59 um único leitor — `TexturasDoCorpo`, aqui dentro. */
type EstadoDasTexturas = 'fria' | 'buscando' | 'pronta' | 'falhou';

export type BuscadorDeManifest = (url: string) => Promise<ManifestDeTexturas>;
export type CarregadorDeTextura = (url: string) => Promise<THREE.Texture>;

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
const carregarPelaRede: CarregadorDeTextura = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const bitmap = await createImageBitmap(await r.blob(), {
    imageOrientation: 'flipY',
    premultiplyAlpha: 'none',
    colorSpaceConversion: 'none',
  });
  const tex = new THREE.Texture(bitmap);
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
};

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
  cancelado: () => boolean
): Promise<Map<string, THREE.Texture> | null> {
  const { base, maxTextureSize } = opcoes;
  const buscar = opcoes.buscarManifest ?? buscarPelaRede;
  const carregar = opcoes.carregarTextura ?? carregarPelaRede;
  const webpOk = opcoes.webp ?? detectarWebp();

  const manifest = await buscarManifestUmaVez(buscar, `${base}data/atlas/texturas.json`);

  const lote = await Promise.allSettled(
    canais.map(async (pedido) => {
      // o alvo é POR CANAL — a dose de VRAM mora em `alvoDePixels`
      const alvo = alvoDePixels(tier, pedido.canal, maxTextureSize);
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

  constructor(pedido: PedidoDeTexturas) {
    this.pedido = pedido;
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
   */
  aoTick(seguram: Seguradores, tS: number): void {
    if (this.disposto) return;
    const gatilho = seguram.tela || seguram.foco || seguram.filme;
    this.quantosSeguram =
      (seguram.tela ? 1 : 0) + (seguram.foco ? 1 : 0) + (seguram.filme ? 1 : 0);
    if (!gatilho) {
      this.aoSoltar(tS);
      return;
    }
    // RESSURREIÇÃO: qualquer segurador que volte zera o relógio da
    // carência — é o `clearTimeout` do `acquire` deles.
    this.soltoDesde = null;
    if (this.estado === 'fria') {
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
    // (21/08) num corpo só. Fora da tela quem cancela é o `aoSoltar`,
    // que não olha tier nenhum: sem segurador, nenhum lote tem dono.
    if (tier === this.tierVivo) {
      this.geracao += 1;
      this.tierEmVoo = null;
      return;
    }
    this.pedir();
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
      this.geracao += 1;
      this.tierEmVoo = null;
      this.estado = 'fria';
      this.soltoDesde = null;
      return;
    }
    // TROCA DE TIER EM VOO: os pixels velhos continuam servindo, então
    // o lote novo é que perde o dono. A carência abaixo julga os velhos.
    if (this.tierEmVoo !== null) {
      this.geracao += 1;
      this.tierEmVoo = null;
    }
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
    this.geracao += 1;
    this.pedido.soltar();
    for (const t of this.vivas) descartarTextura(t);
    this.vivas = [];
    this.estado = 'fria';
    this.tierVivo = null;
    this.tierEmVoo = null;
    this.tierRecusado = null;
    this.recargas = 0;
    this.soltoDesde = null;
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
    void carregarCanaisDoCorpo(corpo, canais, rede, tier, vencida)
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
    for (const t of this.vivas) descartarTextura(t);
    this.vivas.length = 0;
  }
}
