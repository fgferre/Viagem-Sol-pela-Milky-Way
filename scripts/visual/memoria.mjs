// Serve: chão — sair devolve o que entrar alocou: texturas, bytes de texel, geometrias e workers sem vazamento
// Custo: ~5,3 min por tier (estimado: 4,4 medidos em 31/08 com a régua E, mais as duas esperas da carência dos focos de 21/11)
// O AMOSTRADOR DE MEMÓRIA — o juiz que prova que sair DEVOLVE o que
// entrar alocou (Onda 6, F8/D9).
//
//   node scripts/visual/memoria.mjs               # veredito (tier alta)
//   TIER=cinema node scripts/visual/memoria.mjs   # onde os texels dobram
//   node scripts/visual/memoria.mjs --sabotagem   # TEM de REPROVAR (sair ≠ 0)
//
// O QUE ELE MEDE, em números e não em impressão: `window.__director.stats`
// (DEV, o mesmo portão do `captura` que os juízes de CDP já usam) publica
// `renderer.info.memory` — a contagem viva de texturas e geometrias que o
// PRÓPRIO three mantém na GPU — e o heap de JS; o CDP acrescenta o heap
// preciso e a lista de alvos vivos do browser. O protocolo repete os três
// gestos que alocam e desalocam de verdade (A, B, C), a régua D olha a
// memória que saiu da thread, e a E o que a sessão DEVOLVE:
//
//  A. N=3 ciclos entra/sai do Atlas — o portal "Partir" e a volta, o mesmo
//     caminho vivo que o `atlas-smoke` navega. VEREDITO: `textures` e
//     `geometries` do ciclo N iguais aos do ciclo 1 com delta ZERO. Zero e
//     não "quase": um recurso de GPU que sobra por ciclo é dispose faltando,
//     e cresce sem teto em quem deixa a aba aberta.
//  B. N=3 trocas de qualidade pelo CAMINHO VIVO (`director.setQuality`,
//     TIER→performance→TIER). Desde os Ajustes C esta régua é a mais
//     exigente das três: a troca deixou de recarregar a página e passou a
//     RECONSTRUIR o mundo dentro da mesma sessão — galáxia nova (4,02 M
//     partículas em cinema contra 1,1 M), dois mapas novos, Sol novo, doze
//     corpos de palco novos —, e o mundo velho tem de ser desmontado
//     inteiro no mesmo quadro. Um `dispose()` que faltasse ali vazaria
//     ~123 MiB POR CLIQUE, e antes desta rodada o reload escondia o
//     defeito atrás de um documento novo. O juiz cobra que o mundo tenha
//     de fato trocado (`captura.tierDoMundo`), senão o delta zero seria
//     zero por não ter acontecido nada.
//  C. Foco em 3 corpos — `focarNoCorpo`, o MESMO ponto de pouso do
//     `?foco=` (App.tsx: resolverFoco → escolherAlvo → focarNoCorpo).
//     Enquadrar não VAZA (lei de 21/11/2026, `julgarFocos`): o app sobe
//     à GPU o mapa do corpo em foco assim que chega (rodada do peso,
//     19/11) e o solta 15 s depois de o foco sair, então "delta ZERO"
//     reprovava o app certo. As três contas: a 1ª visita aloca NO MÁXIMO
//     uma textura por corpo; a 2ª visita, dentro da carência, aloca zero;
//     e depois que o foco sai e a carência passa a contagem VOLTA à base.
//     As geometrias seguem em delta ZERO nas três. A base NASCE com o
//     episódico já contado (a fita da órbita de Mercúrio só acende no
//     primeiro foco interno; ver `estrearOFoco`) e sem mapa de corpo.
//     Além das contas, o
//     veredito cobra um TETO residente (texturas, BYTES DE TEXEL e
//     geometrias): Atlas quente com delta zero e 400 texturas ainda é
//     vazamento permanente — e delta zero com 1,2 GiB também é.
//  D. WORKERS VIVOS, contados pelo BROWSER (CDP `Target.getTargets`) e não
//     pelo app. Esta régua nasceu com os Ajustes B: a carga pesada — os dois
//     bakes de mapa e a população — mudou de thread, e memória de worker é
//     INVISÍVEL para as duas réguas de cima. `Runtime.getHeapUsage` mede o
//     isolate da PÁGINA (um Float64Array retido DENTRO do worker não move o
//     número), e `renderer.info` só conta o que subiu para a GPU. Um worker
//     que sobreviva à carga leva junto os catálogos copiados e os buffers que
//     alocou, e o juiz ficaria verde por cegueira. VEREDITO: ZERO worker vivo
//     em TODA amostra — quem sobe o da carga o termina na mesma linha em que
//     recebe a resposta (`assarCargaEmWorker`, director/carregamento.ts).
//     Contar pelo browser e não pelo app é o que dá dentes: worker vazado por
//     QUALQUER caminho aparece, inclusive um que o app não conheça.
//  E. O PASSEIO (item 115, bloco A) — a régua que faltava, e é OUTRA
//     pergunta: as quatro de cima medem o PICO de uma sessão; esta mede
//     o que SOBRA depois de o visitante ir embora. Até 31/08 os dois
//     números eram o MESMO, porque o app não descarregava textura
//     nenhuma: medido no passeio de oito corpos em cinema, pico 1.082,9
//     MiB e repouso 1.082,9 MiB — 100% do pico. Com a descarga adiada de
//     15 s: 966,1 de pico e 70,1 de repouso, 7%. O bloco continua de
//     onde o protocolo parou (sem boot novo), faz uma ida e volta,
//     sai para o sistema, ESPERA além da carência e cobra três
//     números: o repouso abaixo de `TETO_REPOUSO_MIB`, a VOLTA DENTRO da
//     carência sem UM pedido novo do corpo, e o repouso abaixo de dois
//     terços do pico (sem descarga a razão é 1,0×; medida, 2,6× em alta
//     e 13,8× em cinema). Os dentes são por construção: apagar a
//     descarga faz o repouso voltar a ser o pico e estourar o teto;
//     zerar a carência faz a volta rápida recarregar.
//
// O HEAP: veredito por INCLINAÇÃO, não por igualdade — o heap de V8 oscila
// por natureza (GC, caches do JIT). O juiz força GC (HeapProfiler.
// collectGarbage) antes de CADA amostra e compara a MEDIANA da primeira
// janela de 4 amostras com a da última: diferença < LIMIAR_HEAP_MB.
//   - LIMIAR_HEAP_MB = 12: medido nesta máquina, amostras pós-GC do
//     protocolo inteiro oscilam <1 MB (caches que aquecem uma vez);
//     12 MB fica acima desse ruído com folga e ABAIXO de um único ciclo da
//     sabotagem (16 MB retidos por ciclo) — um vazamento por ciclo que
//     importe atravessa o limiar já no meio do protocolo.
//   - A RÉGUA do veredito é `usedSize + backingStorageSize` do
//     `Runtime.getHeapUsage` (CDP), e o segundo termo NÃO é enfeite: a
//     PRIMEIRA rodada do M5 reprovou o juiz por medidor cego — 32 MB de
//     Float64Array injetados e o `JSHeapUsedSize` imóvel, porque backing
//     store de ArrayBuffer é memória EXTERNA ao heap de V8. Num app de
//     three.js o vazamento de JS mais provável é JUSTAMENTE TypedArray
//     retido (atributos de geometria, dados de textura); uma régua que
//     não o vê mediria o heap errado. O `heapMB` do getter (`performance.
//     memory`, também só V8) é conferido como CONTRATO e impresso ao
//     lado, com o mesmo ponto cego declarado.
//
// AUTOVALIDAÇÃO M5 — o verde só vale com dentes. O run padrão termina
// executando um braço SABOTADO curto (navegação nova, 2 ciclos): a cada
// ciclo o juiz injeta um vazamento DE VERDADE pelo próprio app, um por
// régua — uma DataTexture nova subida pelo renderer (`initTexture`, que
// incrementa o MESMO `info.memory.textures` que o veredito lê), 16 MB de
// Float64Array retidos num array global (o formato de vazamento que cegou a
// primeira régua — ver acima) e um WORKER que ninguém termina, com outros
// 16 MB retidos lá dentro (o formato que cega as DUAS réguas antigas e que
// a régua D existe para ver). Se os medidores NÃO acusarem o vazamento, o
// juiz REPROVA A SI MESMO — veredito verde de medidor cego não é veredito.
// `--sabotagem` roda o protocolo INTEIRO com a injeção por ciclo e aplica
// os mesmos vereditos: TEM de sair ≠ 0; se sair 0, o medidor está sem
// dentes.
//
// Método herdado dos juízes da casa (`atlas-smoke`, `a11y`): uma sessão de
// Chrome só (comparar contadores entre processos não prova ciclo nenhum),
// `?q=` pinado via porta (o tier não troca sozinho no meio da medida:
// desde a letra D dos Ajustes nada troca sem escolha do visitante, e o tier
// pedido é escolha explícita) e o SINAL de prontidão do próprio app no
// lugar de espera cega.
import { pathToFileURL } from 'node:url';
import { abrirSessao, APP_PADRAO, dorme, esperarAssentar, esperarCapaSair } from './chrome.mjs';

const APP = process.env.APP_URL || APP_PADRAO;
const JANELA = process.env.JANELA || '1200x900';
/**
 * O TIER da medida. `alta` é o padrão histórico (o tier não troca sozinho
 * no meio da medida, e `alta` é escolha explícita), mas a régua de BYTES
 * só tem sentido se rodar também onde os texels dobram: `TIER=cinema node
 * scripts/visual/memoria.mjs`. O teto sai de `TETO_MIB[TIER]`.
 */
const TIER = process.env.TIER || 'alta';
/**
 * O BOOT DA MEDIDA, com o relógio do céu PINADO (`&jd=`) desde 23/08
 * (item 61, §3). O Atlas passou a abrir com o relógio AO VIVO, e relógio
 * andando é cena mudando: o sinal de prontidão (`captura.pronto`) fica
 * eternamente em `andando` e o juiz cai no teto de segurança dos 700
 * quadros — medido, 44,8 s por boot, com o veredito acusando
 * `via=quadros`. É o modo caro de falhar que `julgarProntidao` existe
 * para não deixar passar, e ele funcionou.
 *
 * O pino é o idioma da casa para isto (o `atlas-smoke` e MB1 fazem o
 * mesmo), e aqui ele não custa nada de medida: este juiz conta TEXTURAS,
 * BYTES, geometrias, heap e workers — nada disso é função da data do céu.
 * A data é o instante das vistas oficiais da Terra.
 */
const JD_PINADO = 2460409.26395835;
const BOOT = `atlas=1&jd=${JD_PINADO}&q=${TIER}`;
/**
 * O TETO DO BOOT É DE TEMPO, NÃO DE QUADROS (21/11/2026). A carga a frio
 * leva ~34 s no Direct3D 11 desta máquina, e os 700 quadros do `ir()`
 * (`chrome.mjs`) venciam aos ~20 s, antes do sinal: o juiz reprovava um
 * boot que só era lento. O `ir()` continua o mesmo; se ele desiste pelos
 * quadros, a espera segue SÓ pelo sinal até 90 s contados do `navigate`.
 * Sinal que não chega em 90 s fica `via=quadros` e reprova como antes.
 */
export const TETO_DO_BOOT_MS = 90000;
export async function bootAteOSinal({ ir, esperarSinal, teto = TETO_DO_BOOT_MS, agora = Date.now }) {
  const t0 = agora();
  let r = await ir();
  if (r.via !== 'sinal') {
    const resta = teto - (agora() - t0);
    if (resta > 0) {
      try {
        r = await esperarSinal(resta);
      } catch {
        // o teto venceu sem sinal: fica o `via` do `ir()`, e o veredito reprova
      }
    }
  }
  return { ...r, ms: agora() - t0 };
}
/** O VEREDITO DO BOOT: assentou pelo SINAL do app, dentro do teto de tempo. */
export function julgarBoot({ via, ms }, teto = TETO_DO_BOOT_MS) {
  return via === 'sinal' && ms <= teto;
}

/** o que há em `depois` e não em `antes` (multiconjunto de rótulos) */
export function novosNaLista(antes = [], depois = []) {
  const resta = [...antes];
  const novos = [];
  for (const t of depois) {
    const i = resta.indexOf(t);
    if (i >= 0) resta.splice(i, 1);
    else novos.push(t);
  }
  return novos;
}

/**
 * Quantos mapas cada corpo DECLARA: os canais distintos de `entradas` do
 * manifesto `data/atlas/texturas.json` (o mesmo que `texturas.ts` lê em
 * `buscarManifestUmaVez`; as várias resoluções/formatos de um canal são UMA
 * textura). Puro: o juiz o busca pela rede da página.
 */
export function contarDeclarados(manifest) {
  const canais = {};
  for (const e of manifest.entradas) (canais[e.corpo] ??= new Set()).add(e.canal);
  return Object.fromEntries(Object.entries(canais).map(([c, v]) => [c, v.size]));
}

/**
 * O VEREDITO DOS FOCOS (lei de 21/11/2026) — "enquadrar não vaza", em três
 * contas sobre as amostras do protocolo, pelos rótulos que ele escreve:
 * `base focos`, `foco <id>` (1ª visita), `revisita <id>` e `volta focos`.
 *
 *   1. a 1ª visita aloca NO MÁXIMO o CONJUNTO de mapas que o corpo DECLARA
 *      (`declarados[id]`, contado do manifesto de texturas do próprio app:
 *      `contarDeclarados`) contra a amostra anterior — menos é permitido: o
 *      mapa de quem saiu do foco pode ter vencido a carência no caminho;
 *   2. a 2ª visita ao mesmo corpo, dentro da carência, aloca ZERO e não
 *      pede a textura de novo (`pedidos`, o grampo da régua E);
 *   3. com o foco fora e a carência vencida, a contagem VOLTA à base.
 *
 * As geometrias ficam em delta ZERO nas três: enquadrar não cria malha.
 * Sem `base focos` (o braço M5) não há o que julgar e volta `null`.
 */
export function julgarFocos(amostras, declarados = {}) {
  const iBase = amostras.findIndex((a) => a.rotulo === 'base focos');
  if (iBase < 0) return null;
  const base = amostras[iBase];
  const primeiras = [];
  let revisita = null;
  let volta = null;
  for (let i = iBase + 1; i < amostras.length; i++) {
    const a = amostras[i];
    const antes = amostras[i - 1];
    const [tipo, id] = a.rotulo.split(' ');
    const delta = {
      id,
      texturas: a.textures - antes.textures,
      geometrias: a.geometries - antes.geometries,
    };
    if (tipo === 'foco') {
      primeiras.push({
        ...delta,
        declarados: declarados[id],
        subiram: novosNaLista(antes.lista, a.lista),
      });
    } else if (tipo === 'revisita') revisita = { ...delta, pedidos: a.pedidos };
    else if (a.rotulo === 'volta focos') {
      volta = {
        texturas: a.textures - base.textures,
        geometrias: a.geometries - base.geometries,
      };
    }
  }
  const primeiraOk =
    primeiras.length > 0 && primeiras.every((p) => p.texturas <= p.declarados && p.geometrias === 0);
  const revisitaOk =
    revisita !== null && revisita.texturas === 0 && revisita.geometrias === 0
    && revisita.pedidos === 0;
  const voltaOk = volta !== null && volta.texturas === 0 && volta.geometrias === 0;
  return { primeiras, revisita, volta, primeiraOk, revisitaOk, voltaOk };
}

/** a rede do `soltar` da tela de carga (`hospedeiro.ts`: `terminate` 1 s
 *  depois de a capa desmontar), com folga — ver a amostra do boot */
const REDE_DO_WORKER_DA_CAPA_MS = 1200;
// ERAM 5 ciclos até 30/08 (corte iii do item 113, decisão do dono): o
// veredito é delta ZERO por ciclo, e um dispose faltando aparece já no
// 2º–3º. O que fica SEM VIGIA: vazamento que só se manifesta depois do
// 3º ciclo (um cache que estoura tarde, uma pool que cresce em degraus).
const CICLOS = 3;
const TROCAS = 3;
// os corpos do foco — ids de `IDS_FOTOMETRIA` (o pouso do ?foco=).
// ERAM 5 (…, 'neptune', 'mars') até 30/08 (corte iii do item 113): 3
// focos provam as mesmas contas de `julgarFocos`, e o PRIMEIRO é o da
// revisita. O que fica SEM VIGIA: alocação que só o foco de Netuno/Marte
// dispararia.
const FOCOS = ['earth', 'jupiter', 'saturn'];
const LIMIAR_HEAP_MB = 12;
// Teto RESIDENTE (não o delta). Delta ZERO com 400 texturas ainda é um
// vazamento permanente.
const TETO_TEXTURAS = 120;
const TETO_GEOMETRIAS = 80;

/**
 * O TETO EM BYTES, POR TIER — a régua que faltava (item 22/08).
 *
 * A régua de OBJETOS é cega para o que mais pesa. O comentário que
 * morava aqui admitia: "cinema usa o MESMO número de objetos (os texels
 * é que dobram)". Media-se em `alta` e ficava verde — e em cinema, com
 * o pré-aquecimento antigo, o Atlas ficava com **1.200 MiB** residentes
 * (1.146 deles de corpo) contando as MESMAS 36 texturas. Contar objeto
 * e chamar de memória era medir a caixa e ignorar o que tem dentro.
 *
 * A conta é a de `alvoDePixels`: largura × altura × 4 canais × 4/3 de
 * mipmap, sobre as texturas VIVAS na cena (o walker abaixo).
 *
 * OS NÚMEROS. Medidos em 22/08 nesta máquina, com o protocolo de então
 * (5 idas ao Atlas, 3 trocas de tier e 5 focos — earth, jupiter,
 * saturn, neptune, mars, a dose de corpo mais pesada que o protocolo
 * alcançava; desde o corte iii do item 113 ele anda 3/3/3, o que só
 * pode DIMINUIR o pico — o teto fica). O teto fica ~25% acima do pico
 * medido: acima do ruído de um foco a mais, e MUITO abaixo do que o
 * pré-aquecimento antigo deixava (1.200 MiB em cinema, 291 em alta).
 */
const TETO_MIB = { cinema: 900, alta: 200, performance: 120 };

/**
 * O PASSEIO (régua E, item 115) — os corpos visitados, a espera e o
 * teto do REPOUSO.
 *
 * DOIS corpos e não os oito do instrumento de bancada
 * (`capturas/item115-passeio-memoria.mjs`): o veredito não precisa do
 * pico máximo — ele herda o pico do protocolo inteiro —, precisa da
 * diferença entre o pico e o que sobra, e de UM par de corpos para a
 * ida e volta. Cada foco a mais custa um `assentar`.
 *
 * A ESPERA é 22 s e não 15: a carência conta o relógio de PAREDE do app
 * (`CARENCIA_DA_DESCARGA_S`, texturas.ts), e a folga cobre o boot do
 * tick e o `assentar` do último foco.
 *
 * OS TETOS, medidos em 31/08 nesta máquina com o instrumento de bancada
 * (oito corpos, cinema): ANTES da descarga, pico 1.082,9 MiB e repouso
 * 1.082,9 — 100% do pico, porque o app não devolvia nada. DEPOIS, pico
 * 966,1 e repouso 70,1 (7%). O teto fica ~2,5× acima do repouso medido
 * (folga para um corpo a mais ainda dentro da carência no instante da
 * amostra) e MUITO abaixo do pico — que é o que dá dentes: apagar a
 * descarga faz o repouso virar o pico e estourar o teto por mais de 5×.
 */
const PASSEIO = ['earth', 'mars'];
const ESPERA_DA_CARENCIA_S = 22;
/** o desvio da volta rápida — poucos segundos, bem DENTRO da carência */
const DESVIO_DA_VOLTA_S = 3;
const TETO_REPOUSO_MIB = { cinema: 180, alta: 60, performance: 40 };
const SABOTAGEM = process.argv.includes('--sabotagem');

const falhas = [];
const conferir = (ok, texto) => {
  process.stdout.write(`${ok ? '  OK  ' : '  FALHA '} ${texto}\n`);
  if (!ok) falhas.push(texto);
};

const mediana = (v) => {
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// O VAZAMENTO INJETADO (M5): real, pelo próprio app, visível aos TRÊS
// medidores do veredito — um formato para cada um. O construtor da
// DataTexture é colhido de um objeto vivo do app (o dust map) — o bundle
// não exporta THREE — e o `initTexture` do renderer sobe a textura DE
// VERDADE para a GPU, incrementando o mesmo `info.memory.textures` que o
// juiz lê. O array global segura a textura E 16 MB de Float64Array: nem o
// GC forçado leva. E o WORKER (blob, nunca terminado) segura mais 16 MB
// no isolate DELE, que é justamente o que a régua do heap não enxerga.
const INJETAR = `(() => {
  const d = window.__director;
  const Ctor = d.dustMapTexture.constructor;
  const t = new Ctor(new Uint8Array(512 * 512 * 4), 512, 512);
  t.needsUpdate = true;
  d.engine.renderer.initTexture(t);
  const w = new Worker(URL.createObjectURL(new Blob(
    ['self.__peso = new Float64Array(2 * 1024 * 1024); onmessage = () => {};'],
    { type: 'text/javascript' }
  )));
  window.__sabotagem = window.__sabotagem || [];
  window.__sabotagem.push(t, new Float64Array(2 * 1024 * 1024), w);
  return window.__sabotagem.length / 3;
})()`;

/**
 * O WALKER DOS TEXELS. O three não publica a lista de texturas que subiu
 * (`renderer.properties` é WeakMap), então quem quer BYTES percorre a
 * cena: cada material, cada uniform, mais os dois mapas da cartografia e
 * o fundo. Conta cada textura UMA vez (Set por identidade — a mesma
 * placa do anel entra em dois materiais de Saturno) e cobra o 4/3 do
 * mipmap só de quem gera mipmap.
 */
const MEDIR_TEXELS = `(() => {
  const d = window.__director;
  const vistas = new Set();
  let bytes = 0, n = 0;
  const lista = [];
  const cont = (t) => {
    if (!t || !t.isTexture || vistas.has(t)) return;
    vistas.add(t);
    const im = t.image || {};
    // o bitmap do corpo é fechado depois da subida (largura 0): o tamanho fica no userData
    const w = im.width || (t.source && t.source.data && t.source.data.width) || (t.userData && t.userData.largura) || 0;
    const h = im.height || (t.source && t.source.data && t.source.data.height) || (t.userData && t.userData.altura) || 0;
    if (!w || !h) return;
    const mip = t.generateMipmaps !== false && t.minFilter !== 1003 && t.minFilter !== 1006;
    n++;
    lista.push((t.name || 'sem-nome') + ' ' + w + 'x' + h);
    bytes += w * h * 4 * (mip ? 4 / 3 : 1);
  };
  const doMat = (m) => {
    if (!m) return;
    for (const k of Object.keys(m)) { const v = m[k]; if (v && v.isTexture) cont(v); }
    if (m.uniforms) for (const k of Object.keys(m.uniforms)) {
      const v = m.uniforms[k] && m.uniforms[k].value; if (v && v.isTexture) cont(v);
    }
  };
  d.engine.scene.traverse((o) => {
    const m = o.material;
    if (Array.isArray(m)) m.forEach(doMat); else doMat(m);
  });
  cont(d.engine.scene.background);
  cont(d.dustMapTexture);
  cont(d.structureMapTexture);
  return { n, MiB: bytes / 1048576, lista };
})()`;

async function principal() {
  const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
  if (!ping.includes('<div id="root"')) throw new Error(`dev server não respondeu em ${APP}`);

  const sessao = await abrirSessao({ janela: JANELA, app: APP, prefixo: 'memoria' });
  try {
    // domínio extra do CDP, uma vez por sessão (sobrevive à navegação)
    await sessao.send('HeapProfiler.enable');

    /**
     * O GRAMPO DE PEDIDOS da régua E, instalado antes de qualquer
     * navegação. Conta o que o APP pede, e não o que a REDE entrega:
     * medido em 31/08, `performance.getEntriesByType('resource')` NÃO
     * registra o que o Chrome serve do cache de memória, e a recarga da
     * Terra depois da carência aparecia como zero — igual à volta rápida,
     * que é justamente o contrário. E é o pedido que importa: mesmo com
     * o arquivo em cache, pedir de novo custa decodificação e uma subida
     * nova para a GPU. Os dois caminhos da casa: o `src` do `<img>` (o
     * `THREE.TextureLoader`) e o `fetch`.
     */
    await sessao.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `window.__texPedidos = [];
        const anota = (u) => {
          if (typeof u === 'string' && /\\/textures\\/atlas\\//.test(u)) {
            window.__texPedidos.push(u);
          }
        };
        const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
          ...d, set(v) { anota(v); d.set.call(this, v); },
        });
        const f = window.fetch;
        window.fetch = (u, o) => {
          anota(typeof u === 'string' ? u : u && u.url); return f(u, o);
        };`,
    });

    /** A RÉGUA D: workers vivos pelo olho do BROWSER. `Target.getTargets` é
     *  domínio de browser e responde na mesma conexão da página; contar aqui,
     *  e não em `__director.stats`, é o que faz a régua ver worker de qualquer
     *  origem — inclusive o blob que a sabotagem injeta, que o app não conhece. */
    const workersVivos = async () => {
      const { targetInfos } = await sessao.send('Target.getTargets');
      return targetInfos.filter((t) => t.type === 'worker').length;
    };

    /** GC forçado + uma amostra: stats do app, heap preciso do CDP
     *  (V8 + backing stores — ver o cabeçalho sobre o ponto cego) e os
     *  workers vivos, que nenhum dos dois primeiros enxerga. */
    const amostrar = async (rotulo) => {
      await sessao.send('HeapProfiler.collectGarbage');
      const stats = JSON.parse(await sessao.js('JSON.stringify(window.__director.stats)'));
      const uso = await sessao.send('Runtime.getHeapUsage');
      const heap = (uso.usedSize + (uso.backingStorageSize ?? 0)) / 1048576;
      const texels = await sessao.js(MEDIR_TEXELS);
      return {
        rotulo,
        textures: stats.memory.textures,
        texelMiB: texels.MiB,
        lista: texels.lista,
        geometries: stats.memory.geometries,
        calls: stats.render.calls,
        triangles: stats.render.triangles,
        points: stats.render.points,
        heap,
        heapGetter: stats.heapMB,
        workers: await workersVivos(),
      };
    };

    const tabela = (linhas) => {
      process.stdout.write(
        '        amostra           textures  texel MiB  geometries  heap V8+ext  heapGetter(MB)  workers\n'
      );
      for (const a of linhas) {
        process.stdout.write(
          `        ${a.rotulo.padEnd(18)}${String(a.textures).padStart(8)}`
          + `${a.texelMiB.toFixed(0).padStart(11)}`
          + `${String(a.geometries).padStart(12)}${a.heap.toFixed(1).padStart(13)}`
          + `${(a.heapGetter === null ? 'null' : a.heapGetter.toFixed(1)).padStart(16)}`
          + `${String(a.workers).padStart(9)}\n`
        );
      }
    };

    /**
     * O PROTOCOLO, parametrizado para servir o run padrão e os braços
     * sabotados: boot no Atlas, ciclos do portal (com ou sem injeção),
     * trocas de qualidade pelo caminho vivo, focos. Devolve as amostras;
     * quem julga é quem chamou.
     */
    /**
     * O MUNDO MORNO ANTES DA LINHA DE BASE — o passo que faltava (item 67).
     *
     * `renderer.info.memory.geometries` conta o que o renderer JÁ VIU
     * desenhar, não o que existe: uma geometria alocada no boot só entra na
     * conta no quadro em que é desenhada pela primeira vez. O Sol tem um
     * subsistema EPISÓDICO — a ejeção de massa (`world/sol/cme.js`): a
     * casca e as duas nuvens de partículas nascem com o Sol e ficam em
     * `visible = false` até uma ejeção acontecer, e ela acontece por
     * SORTEIO (só flare grande solta CME, com probabilidade na amplitude).
     *
     * Sem este passo, a estreia caía onde o sorteio mandasse. Medido em
     * 22/08 com `TIER=cinema`: 45 geometrias nos ciclos 1 a 4 e 48 no
     * QUINTO, e o veredito do portal acusava `delta 3` de vazamento onde
     * não havia nenhum — as três seguem em 48 no sexto ciclo, porque
     * estrearam, não vazaram. Em `alta` o mesmo sorteio simplesmente não
     * tinha caído ainda.
     *
     * `ctx.launchCME` é o emissor CANÔNICO, e o próprio `cme.js` declara
     * que é por ele que a QA passa. Duas coisas o passo respeita:
     *
     *  - ELE CORRE DO LADO DO FILME, e não dentro do Atlas. Medido: uma
     *    ejeção disparada em `fase = atlas` não mexe na conta (dali o Sol
     *    está longe e as três malhas nunca chegam ao renderer); a mesma
     *    ejeção, com o mundo em `fase = intro`, registra as três na hora.
     *    Por isso ele mora DENTRO do primeiro ciclo, entre o `partir` e o
     *    `entrar` — a linha de base do portal é a amostra do ciclo 1.
     *  - E ESPERA O DESENHO, não o disparo: a conta é lida até parar de
     *    subir, porque é o primeiro quadro desenhado que registra.
     */
    const estrearOEpisodico = async () => {
      const conta = () =>
        sessao.js('window.__director.engine.renderer.info.memory.geometries');
      const antes = await conta();
      await sessao.js('window.__director.sun.ctx.launchCME(1.3)');
      let agora = antes;
      for (let i = 0, parado = 0; i < 40 && parado < 3; i++) {
        await dorme(100);
        const n = await conta();
        parado = n === agora ? parado + 1 : 0;
        agora = n;
      }
      process.stdout.write(
        `  ejeção de massa estreada antes da linha de base:`
        + ` ${antes} → ${agora} geometrias\n`
      );
    };

    /**
     * A ESTREIA DO FOCO — o MESMO remédio do `estrearOEpisodico` acima,
     * para o outro episódico da casa, e pelo mesmo motivo: a linha de base
     * tem de NASCER com o que só estreia.
     *
     * O QUE ESTREAVA, medido em 30/08 (item 113): o bloco acusava `+1
     * geometria` no PRIMEIRO foco e nunca mais — 43 no boot e depois das
     * trocas, 44 em `earth`, e 44 em jupiter, saturn, neptune, mars e
     * earth de novo. A geometria é a FITA DA ÓRBITA DE MERCÚRIO: no
     * enquadramento de abertura as órbitas acesas são venus…pluto (a de
     * Mercúrio fica apagada, colada no Sol) e o primeiro foco num corpo
     * interno acende `mercury` pela primeira vez. Como
     * `renderer.info.memory.geometries` conta o que o renderer JÁ VIU
     * DESENHAR, a fita entra na conta no quadro em que acende — e a troca
     * de tier refaz o mundo, então quem tem de estrear é a fita do mundo
     * VIVO, depois da última troca.
     *
     * NÃO É VAZAMENTO, e a diferença se mede: vazamento cresce a cada
     * foco, estreia acontece uma vez. O número ficou preso em 44 por seis
     * focos seguidos, incluindo um repetido. O que a régua continua
     * cobrando é exatamente isso — delta ZERO a partir daqui.
     *
     * E VOLTA AO SISTEMA no fim, que é a parte que custou uma corrida
     * inteira para aparecer: `focarNoCorpo` no corpo JÁ FOCADO em órbita
     * DESCE um degrau (o gesto da descida, D7/item 92) e o degrau "corpo"
     * carrega o globo. Estrear em `earth` e deixar o bloco medir `earth`
     * em seguida punha **+9 texturas e +7 geometrias** no primeiro foco —
     * trocaria um episódico de 1 por um de 16, que é o oposto do conserto.
     * A volta é pelo mesmo caminho vivo (`focarNoCorpo('sun')` sem `ver=` é
     * `focarNoSistema`, o pouso de `?foco=sol`), e ela NÃO desfaz a
     * estreia: o renderer não esquece o que já desenhou, e as fitas são
     * objetos persistentes que só acendem e apagam (medido por uuid).
     *
     * ESTREAR COM OUTRO CORPO resolveria a descida e criaria outro
     * problema: `mercury` enquadra uma órbita de 0,39 UA, a câmera cai
     * muito mais perto do Sol e o LOD registra **+6 geometrias e +4
     * texturas** que os focos medidos nunca alocariam — linha de base
     * gorda é acomodação, não conserto. Por isso a estreia é o MESMO corpo
     * e o MESMO caminho do bloco, e o que se desfaz é só o degrau.
     */
    const estrearOFoco = async (id) => {
      const conta = () =>
        sessao.js('window.__director.engine.renderer.info.memory.geometries');
      const antes = await conta();
      await sessao.js(`window.__director.focarNoCorpo('${id}')`);
      await sessao.assentar();
      const acendeu = await conta();
      await sessao.js("window.__director.focarNoCorpo('sun')");
      await sessao.assentar();
      const depois = await conta();
      process.stdout.write(
        `  foco '${id}' disparado e desfeito antes da linha de base dos focos:`
        + ` ${antes} → ${acendeu} → ${depois} geometrias`
        + ' (a fita de Mercúrio acendendo, e o degrau de volta ao sistema)\n'
      );
    };

    // OS PEDIDOS DE UM CORPO (o grampo da régua E), e não a lista inteira:
    // o desvio carrega o mapa do OUTRO corpo, e o contador global acusava
    // um pedido novo numa volta que não pediu nada do primeiro.
    const pedidosDoCorpo = async (id) => Number(await sessao.js(
      `window.__texPedidos.filter((u) => /\\/${id}\\//.test(u)).length`
    ));

    /**
     * O PASSEIO (régua E) — sai, espera, e volta.
     *
     * CONTINUA DE ONDE O PROTOCOLO PAROU, sem boot novo: ele termina no
     * Atlas com os três corpos do bloco C já focados e devolvidos (a
     * `volta focos` espera a carência), que é a linha de base que este
     * bloco quer — uma sessão que andou. Booted de novo custava um `ir()` e dois focos a mais (5,4 min
     * de juiz contra os 2,1 de antes, medido); assim o bloco cobra só o
     * que é DELE — o desvio, a saída e a espera da carência.
     *
     * O PICO entra pela porta: são as amostras do protocolo inteiro, e
     * não só as marcas daqui — o pico de uma sessão é o da sessão.
     */
    const passeio = async (picoDoProtocolo) => {
      const texels = async () => (await sessao.js(MEDIR_TEXELS)).MiB;
      const pedidos = () => pedidosDoCorpo(PASSEIO[0]);
      const focar = async (id) => {
        await sessao.js(`window.__director.focarNoCorpo('${id}','corpo')`);
        await sessao.assentar();
        return texels();
      };
      const marcas = [picoDoProtocolo, await focar(PASSEIO[0])];

      // A VOLTA RÁPIDA — o gesto do visitante que clica noutro corpo e se
      // arrepende. O DESVIO NÃO ESPERA ASSENTAR, e isso é medida e não
      // pressa: em cinema um `focarNoCorpo` + `assentar` custa da ordem
      // dos 15 s nesta máquina — o MESMO tempo da carência —, e a
      // primeira versão deste bloco gastava a carência inteira DENTRO do
      // próprio instrumento (medido: 6 pedidos novos onde o certo é 0).
      const antesDaVolta = await pedidos();
      await sessao.js(`window.__director.focarNoCorpo('${PASSEIO[1]}','corpo')`);
      await dorme(DESVIO_DA_VOLTA_S * 1000);
      marcas.push(await focar(PASSEIO[0]));
      const novosNaVoltaRapida = (await pedidos()) - antesDaVolta;

      await sessao.js("window.__director.focarNoCorpo('sun')");
      await sessao.assentar();
      marcas.push(await texels());
      // e o tempo passa com a aba na frente (a carência só corre no rAF)
      await dorme(ESPERA_DA_CARENCIA_S * 1000);
      const repouso = await texels();
      marcas.push(repouso);
      return { marcas, repouso, pico: Math.max(...marcas), novosNaVoltaRapida };
    };

    // o manifesto de texturas do app, lido pela rede da PÁGINA (mesma URL
    // relativa à base que `texturas.ts` usa); só os corpos dos focos importam
    let declarados = {};
    const declaradosPelaPagina = async () => {
      const r = await sessao.send('Runtime.evaluate', {
        expression: "fetch(new URL('data/atlas/texturas.json', document.baseURI)).then((x) => x.json())",
        awaitPromise: true,
        returnByValue: true,
      });
      if (r.exceptionDetails) throw new Error('manifesto de texturas não lido pela página');
      return contarDeclarados(r.result.value);
    };

    const protocolo = async ({ sabotar, ciclos, trocas, focos }) => {
      const boot = await bootAteOSinal({
        ir: () => sessao.ir(BOOT),
        // cartografia que nunca acende: sem base de quadros, a espera só
        // termina pelo sinal ou pelo teto de tempo
        esperarSinal: (teto) =>
          esperarAssentar({ send: sessao.send, cartografia: () => false, teto }),
      });
      const fase = await sessao.js('window.__director.captura.fase');
      if (fase !== 'atlas') throw new Error(`boot não abriu no Atlas (fase '${fase}')`);
      // A AMOSTRA DO BOOT ESPERA A CAPA SAIR (13/11/2026). A tela de carga
      // desenha num worker PRÓPRIO (`telaDeCarga/hospedeiro.ts`) e fica na
      // frente ~2 s depois do sinal de assentar, de propósito (ver
      // `esperarCapaSair`); esse worker só fecha quando a capa desmonta. Com
      // o assentar em ~7 s a amostra caía nessa janela e contava a capa
      // como worker que sobreviveu à carga (o falso 1 de b0a4fe33 e de
      // 9b28d710 em diante). Os workers da CARGA terminam antes do sinal
      // (`assarCargaEmWorker`), e qualquer worker vivo depois da capa
      // continua contado.
      await esperarCapaSair(sessao.send);
      await dorme(REDE_DO_WORKER_DA_CAPA_MS);
      const amostras = [await amostrar('boot')];
      for (let c = 1; c <= ciclos; c++) {
        await sessao.js('window.__director.partirDoAtlas()');
        await sessao.assentar();
        if (c === 1) await estrearOEpisodico();
        await sessao.js('window.__director.entrarNoAtlas()');
        await sessao.assentar();
        if (sabotar) await sessao.js(INJETAR);
        amostras.push(await amostrar(`ciclo ${c}`));
      }
      // o mundo TEM de trocar dos dois lados: delta zero sobre uma troca
      // que não aconteceu é zero por omissão, não por higiene
      const mundos = [];
      for (let t = 1; t <= trocas; t++) {
        // a ida é sempre a 'performance' e a VOLTA é ao tier da medida —
        // com TIER=cinema os focos são medidos onde os texels dobram
        for (const q of ['performance', TIER]) {
          await sessao.js(`window.__director.setQuality('${q}')`);
          await sessao.assentar();
          mundos.push(await sessao.js('window.__director.captura.tierDoMundo'));
        }
        amostras.push(await amostrar(`troca q ${t}`));
      }
      // a linha de base dos focos nasce COM o episódico já contado — ver
      // `estrearOFoco` — e SEM mapa de corpo: a estreia sobe o mapa do
      // primeiro foco, e a base só é tirada depois de a carência dele
      // vencer. Ela é a âncora de `julgarFocos`, e por isso a estreia vem
      // ANTES dela e depois da última troca de tier.
      if (!focos.length) return { boot, amostras, mundos };
      const focar = async (id) => {
        await sessao.js(`window.__director.focarNoCorpo('${id}')`);
        await sessao.assentar();
      };
      const sairParaOSistema = () => sessao.js("window.__director.focarNoCorpo('sun')");
      await estrearOFoco(focos[0]);
      declarados = await declaradosPelaPagina();
      await dorme(ESPERA_DA_CARENCIA_S * 1000);
      amostras.push(await amostrar('base focos'));
      // A 2ª VISITA É LOGO DEPOIS DA 1ª, ao PRIMEIRO corpo: com a base sem
      // mapa nenhum, o único residente é o dele, e nada vence a carência
      // no meio da conta — a revisita tem de dar ZERO exato. Sai pelo
      // sistema (o mesmo corpo de novo DESCERIA um degrau, ver
      // `estrearOFoco`) sem assentar, como o desvio do passeio.
      const [primeiro, ...resto] = focos;
      await focar(primeiro);
      amostras.push(await amostrar(`foco ${primeiro}`));
      const antesDaRevisita = await pedidosDoCorpo(primeiro);
      await sairParaOSistema();
      await dorme(DESVIO_DA_VOLTA_S * 1000);
      await focar(primeiro);
      amostras.push({
        ...(await amostrar(`revisita ${primeiro}`)),
        pedidos: (await pedidosDoCorpo(primeiro)) - antesDaRevisita,
      });
      for (const id of resto) {
        await focar(id);
        amostras.push(await amostrar(`foco ${id}`));
      }
      // o foco sai e o tempo passa com a aba na frente: a carência de
      // TODOS os mapas vence, e a contagem tem de voltar à base
      await sairParaOSistema();
      await sessao.assentar();
      await dorme(ESPERA_DA_CARENCIA_S * 1000);
      amostras.push(await amostrar('volta focos'));
      return { boot, amostras, mundos };
    };

    /** Os vereditos do D9 sobre um conjunto de amostras, sem imprimir. */
    const julgar = (amostras, declarados) => {
      const ciclos = amostras.filter((a) => a.rotulo.startsWith('ciclo'));
      const base = ciclos[0];
      const deltaPortal = Math.max(
        ...ciclos.map((a) => Math.abs(a.textures - base.textures)),
        ...ciclos.map((a) => Math.abs(a.geometries - base.geometries))
      );
      // AS TROCAS SE COMPARAM ENTRE SI, e não com os ciclos do portal:
      // o mundo novo nasce com um Sol RECÉM-PRIMADO, e o Sol aloca peças
      // preguiçosas enquanto anima (as malhas da ejeção, os laços). Um Sol
      // que rodou cinco ciclos de Atlas tem ~10 geometrias que o recém-nascido
      // ainda não pediu — a troca DEVOLVE memória, e cobrar "delta zero
      // contra o ciclo 5" reprovaria a higiene em vez do vazamento. O que
      // tem de ser zero é o delta ENTRE trocas: seis swaps seguidos que
      // não crescem provam que cada um desmontou o que montou.
      const trocas = amostras.filter((a) => a.rotulo.startsWith('troca'));
      const deltaTrocas = trocas.length
        ? Math.max(
            ...trocas.map((a) => Math.abs(a.textures - trocas[0].textures)),
            ...trocas.map((a) => Math.abs(a.geometries - trocas[0].geometries))
          )
        : 0;
      // os focos têm veredito próprio, puro e testado (`julgarFocos`)
      const focos = julgarFocos(amostras, declarados);
      const heaps = amostras.map((a) => a.heap);
      const janela = Math.max(1, Math.min(4, heaps.length >> 1));
      const inclinacao =
        mediana(heaps.slice(-janela)) - mediana(heaps.slice(0, janela));
      const picoTextures = Math.max(...amostras.map((a) => a.textures));
      const picoTexelMiB = Math.max(...amostras.map((a) => a.texelMiB));
      const picoGeometries = Math.max(...amostras.map((a) => a.geometries));
      const picoWorkers = Math.max(...amostras.map((a) => a.workers));
      return {
        deltaPortal, deltaTrocas, focos, inclinacao,
        picoTextures, picoTexelMiB, picoGeometries, picoWorkers,
      };
    };

    /** As três contas dos focos (`julgarFocos`), as MESMAS nos dois braços. */
    const conferirFocos = (f) => {
      const delta = (d) => `${d.texturas} tex/${d.geometrias} geo`;
      conferir(
        f.primeiraOk,
        `${FOCOS.length} focos, 1ª visita: no máximo o conjunto DECLARADO de mapas por corpo,`
          + ` geometrias em delta ZERO (${f.primeiras.map((p) => `${p.id} ${delta(p)} de ${p.declarados} declaradas`).join(' · ')})`
      );
      if (!f.primeiraOk) {
        for (const p of f.primeiras) {
          process.stdout.write(`         subiu em ${p.id}: ${p.subiram.join(' | ') || '(o walker não viu nome novo)'}
`);
        }
      }
      conferir(
        f.revisitaOk,
        `2ª visita a '${f.revisita?.id}' dentro da carência: aloca ZERO e não pede a`
          + ` textura de novo (${f.revisita ? delta(f.revisita) : '—'},`
          + ` ${f.revisita?.pedidos} pedidos)`
      );
      conferir(
        f.voltaOk,
        `foco fora e carência vencida: a contagem VOLTA à base`
          + ` (${f.volta ? delta(f.volta) : '—'} contra a base)`
      );
    };

    if (SABOTAGEM) {
      // ---- o protocolo inteiro, sabidamente vazado ---------------------
      process.stdout.write('MODO --sabotagem: o veredito abaixo TEM de reprovar.\n\n');
      const { amostras } = await protocolo({
        sabotar: true, ciclos: CICLOS, trocas: TROCAS, focos: FOCOS,
      });
      tabela(amostras);
      const v = julgar(amostras, declarados);
      conferir(v.deltaPortal === 0, `portal: delta ZERO em textures/geometries (max ${v.deltaPortal})`);
      conferir(v.deltaTrocas === 0, `trocas de tier: delta ZERO entre trocas (max ${v.deltaTrocas})`);
      conferirFocos(v.focos);
      conferir(
        v.inclinacao < LIMIAR_HEAP_MB,
        `heap: inclinação ${v.inclinacao.toFixed(1)} MB < ${LIMIAR_HEAP_MB} MB`
      );
      conferir(v.picoWorkers === 0, `workers: ZERO vivo em toda amostra (pico ${v.picoWorkers})`);
    } else {
      // ---- 1: o contrato do getter -------------------------------------
      const primeira = await protocolo({
        sabotar: false, ciclos: CICLOS, trocas: TROCAS, focos: FOCOS,
      });
      const { amostras, boot, mundos } = primeira;
      conferir(
        julgarBoot(boot),
        `boot no Atlas assentou por via=${boot.via} em ${(boot.ms / 1000).toFixed(1)}s`
          + ` (teto ${TETO_DO_BOOT_MS / 1000} s)`
      );
      const a0 = amostras[0];
      conferir(
        Number.isInteger(a0.textures) && Number.isInteger(a0.geometries)
          && Number.isInteger(a0.calls) && Number.isInteger(a0.triangles)
          && Number.isInteger(a0.points),
        `__director.stats publica memory+render (textures ${a0.textures}, geometries `
          + `${a0.geometries}, calls ${a0.calls}, triangles ${a0.triangles}, points ${a0.points})`
      );
      conferir(
        Number.isFinite(a0.heapGetter) && a0.heapGetter > 0,
        `stats.heapMB é número no Chrome (${a0.heapGetter?.toFixed(1)} MB; null seria só fora dele)`
      );

      // ---- 2, 3 e 4: os números do D9 ----------------------------------
      tabela(amostras);
      const v = julgar(amostras, declarados);
      conferir(
        v.deltaPortal === 0,
        `${CICLOS} ciclos do portal: textures/geometries voltam ao ciclo 1 com delta ZERO`
          + ` (max ${v.deltaPortal})`
      );
      conferir(
        mundos.length === TROCAS * 2
          && mundos.every((m, i) => m === (i % 2 === 0 ? 'performance' : TIER)),
        `as ${TROCAS * 2} trocas RECONSTRUÍRAM o mundo de verdade (${mundos.join(' → ')})`
      );
      conferir(
        v.deltaTrocas === 0,
        `${TROCAS * 2} trocas de tier (mundo inteiro refeito, ida e volta): textures/`
          + `geometries não crescem — delta ZERO entre trocas (max ${v.deltaTrocas})`
      );
      conferirFocos(v.focos);
      conferir(
        v.inclinacao < LIMIAR_HEAP_MB,
        `heap pós-GC: inclinação ${v.inclinacao.toFixed(1)} MB entre medianas de janelas`
          + ` < ${LIMIAR_HEAP_MB} MB`
      );
      conferir(
        v.picoTextures <= TETO_TEXTURAS,
        `teto residente: ${v.picoTextures} texturas ≤ ${TETO_TEXTURAS}`
      );
      conferir(
        v.picoTexelMiB <= TETO_MIB[TIER],
        `teto residente em BYTES: ${v.picoTexelMiB.toFixed(0)} MiB de texel`
          + ` ≤ ${TETO_MIB[TIER]} MiB (tier ${TIER}) — a régua que a contagem de`
          + ' objetos não vê'
      );
      conferir(
        v.picoGeometries <= TETO_GEOMETRIAS,
        `teto residente: ${v.picoGeometries} geometrias ≤ ${TETO_GEOMETRIAS}`
      );
      conferir(
        v.picoWorkers === 0,
        'nenhum worker sobrevive à carga: ZERO vivo em toda amostra'
          + ` (pico ${v.picoWorkers}) — a memória que mudou de thread nos Ajustes B`
      );
      const faseFinal = await sessao.js('window.__director.captura.fase');
      conferir(faseFinal === 'atlas', `o protocolo termina onde começou (fase '${faseFinal}')`);

      // ---- 5: O PASSEIO — o que o corpo DEVOLVE (régua E, item 115) ----
      const p = await passeio(v.picoTexelMiB);
      process.stdout.write(
        `        passeio: pico ${p.pico.toFixed(0)} MiB → repouso`
        + ` ${p.repouso.toFixed(0)} MiB (${((p.repouso / p.pico) * 100).toFixed(0)}% do pico)\n`
      );
      conferir(
        p.repouso <= TETO_REPOUSO_MIB[TIER],
        `passeio: REPOUSO ${p.repouso.toFixed(0)} MiB ≤ ${TETO_REPOUSO_MIB[TIER]} MiB`
          + ` (tier ${TIER}) — sem a descarga adiada o repouso É o pico`
      );
      conferir(
        p.novosNaVoltaRapida === 0,
        `passeio: a VOLTA dentro da carência não pede a textura de novo`
          + ` (${p.novosNaVoltaRapida} pedidos)`
      );
      // E O PASSEIO TEM DE TER DEVOLVIDO ALGO, senão o teto acima passaria
      // por omissão numa máquina onde nada carregou. Sem a descarga os
      // dois números são o MESMO (razão 1,00, medido); com ela a razão foi
      // 2,6 em alta e 13,8 em cinema — os dois terços deixam a folga do
      // corpo que ainda estiver dentro da carência no instante da amostra.
      conferir(
        p.repouso < p.pico / 1.5,
        `passeio: o repouso ficou abaixo de dois terços do pico`
          + ` (razão ${(p.pico / p.repouso).toFixed(1)}× — sem descarga é 1,0×)`
      );

      // ---- 6: O PREÇO DO SWAP NA THREAD — registrado e medido ----------
      // Até 2026-08-20 esta linha registrava um RELOAD: a troca do painel
      // gravava `?q=` e trocava de documento, e o que se media era o custo
      // do caminho que o visitante pagava. Os Ajustes C mataram a recarga;
      // o que sobra a medir é o preço do swap NA THREAD — quanto tempo até
      // o mundo novo entrar e, sobretudo, o PIOR bloqueio de quadro no
      // caminho (Long Tasks). Registro, não veredito: quem julga vazamento
      // são as réguas acima, e o número aqui é para o NORTE saber o que
      // ainda não foi fatiado.
      await sessao.send('Page.addScriptToEvaluateOnNewDocument', {
        source: 'window.__longs=[];window.__marca=0;'
          + 'new PerformanceObserver((l)=>{for(const e of l.getEntries())'
          + 'if(e.startTime>=window.__marca)window.__longs.push(Math.round(e.duration));'
          + '}).observe({entryTypes:["longtask"]});',
      });
      await sessao.ir(BOOT);
      for (const q of ['cinema', 'alta']) {
        await sessao.js('window.__longs=[];window.__marca=performance.now();'
          + `window.__t0=performance.now();window.__director.setQuality('${q}')`);
        await sessao.assentar();
        const swap = JSON.parse(await sessao.js(`JSON.stringify({
          ms: Math.round(performance.now() - window.__t0),
          pior: Math.max(0, ...window.__longs),
          n: window.__longs.length,
          mundo: window.__director.captura.tierDoMundo })`));
        process.stdout.write(
          `        registro: troca viva → ${q} em ${(swap.ms / 1000).toFixed(1)}s até`
          + ` assentar (mundo '${swap.mundo}');\n        pior bloqueio de thread`
          + ` ${swap.pior} ms em ${swap.n} tarefas longas\n`
        );
      }

      // ---- 7: AUTOVALIDAÇÃO M5 — o verde só vale com dentes ------------
      // Navegação nova (zera o array da sabotagem) e 2 ciclos VAZADOS de
      // verdade. Os mesmos medidores do veredito têm de acusar: textures
      // sobe 1 por ciclo, heap sobe 16 MB por ciclo. Medidor que não vê o
      // vazamento que o juiz mesmo injetou reprova o JUIZ.
      const m5 = await protocolo({ sabotar: true, ciclos: 2, trocas: 0, focos: [] });
      const vm5 = julgar(m5.amostras, declarados);
      const heapM5 =
        m5.amostras[m5.amostras.length - 1].heap - m5.amostras[0].heap;
      conferir(
        vm5.deltaPortal > 0,
        `M5: o medidor de texturas ACUSA o vazamento injetado (delta ${vm5.deltaPortal})`
      );
      conferir(
        heapM5 >= LIMIAR_HEAP_MB,
        `M5: o medidor de heap ACUSA os 16 MB/ciclo retidos (+${heapM5.toFixed(1)} MB em 2 ciclos)`
      );
      conferir(
        vm5.picoWorkers > 0,
        `M5: a régua de workers ACUSA o worker vazado por ciclo (pico ${vm5.picoWorkers})`
      );
    }
  } finally {
    sessao.fechar();
  }

  if (falhas.length) {
    process.stdout.write(
      SABOTAGEM
        ? `\nAMOSTRADOR DE MEMÓRIA: REPROVADO com ${falhas.length} falha(s) — sob --sabotagem é o esperado\n`
        : `\nAMOSTRADOR DE MEMÓRIA: ${falhas.length} falha(s)\n`
    );
    process.exit(1);
  }
  if (SABOTAGEM) {
    process.stdout.write(
      '\nAMOSTRADOR DE MEMÓRIA: a sabotagem NÃO reprovou — medidor sem dentes; '
      + 'NÃO aceite nenhum verde deste juiz\n'
    );
    process.exit(1);
  }
  process.stdout.write('\nAMOSTRADOR DE MEMÓRIA: tudo verde (e a sabotagem interna reprovou como devia)\n');
}

// Importável sem rodar: as contas puras do veredito (`julgarFocos`,
// `julgarBoot`) têm teste, e teste não sobe Chrome. Só a execução direta mede.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await principal();
}
