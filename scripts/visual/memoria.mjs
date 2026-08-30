// Serve: chão — sair devolve o que entrar alocou: texturas, bytes de texel, geometrias e workers sem vazamento
// Custo: 2,9 min por tier
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
// gestos que alocam e desalocam de verdade (A, B, C), e a régua D olha a
// memória que saiu da thread:
//
//  A. N=5 ciclos entra/sai do Atlas — o portal "Partir" e a volta, o mesmo
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
//  C. Foco em 5 corpos — `focarNoCorpo`, o MESMO ponto de pouso do
//     `?foco=` (App.tsx: resolverFoco → escolherAlvo → focarNoCorpo).
//     Enquadrar não aloca: delta ZERO também. Além do delta, o
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
import { abrirSessao, APP_PADRAO, dorme } from './chrome.mjs';

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
const CICLOS = 5;
const TROCAS = 3;
// os 5 corpos do foco — ids de `IDS_FOTOMETRIA` (o pouso do ?foco=)
const FOCOS = ['earth', 'jupiter', 'saturn', 'neptune', 'mars'];
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
 * OS NÚMEROS. Medidos em 22/08 nesta máquina, com o protocolo inteiro
 * (5 idas ao Atlas, 3 trocas de tier e 5 focos — earth, jupiter,
 * saturn, neptune, mars, que é a dose de corpo mais pesada que o
 * protocolo alcança). O teto fica ~25% acima do pico medido: acima do
 * ruído de um foco a mais, e MUITO abaixo do que o pré-aquecimento
 * antigo deixava (1.200 MiB em cinema, 291 em alta).
 */
const TETO_MIB = { cinema: 900, alta: 200, performance: 120 };
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
  const cont = (t) => {
    if (!t || !t.isTexture || vistas.has(t)) return;
    vistas.add(t);
    const im = t.image || {};
    const w = im.width || (t.source && t.source.data && t.source.data.width) || 0;
    const h = im.height || (t.source && t.source.data && t.source.data.height) || 0;
    if (!w || !h) return;
    const mip = t.generateMipmaps !== false && t.minFilter !== 1003 && t.minFilter !== 1006;
    n++;
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
  return { n, MiB: bytes / 1048576 };
})()`;

const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
if (!ping.includes('<div id="root"')) throw new Error(`dev server não respondeu em ${APP}`);

const sessao = await abrirSessao({ janela: JANELA, app: APP, prefixo: 'memoria' });
try {
  // domínio extra do CDP, uma vez por sessão (sobrevive à navegação)
  await sessao.send('HeapProfiler.enable');

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

  const protocolo = async ({ sabotar, ciclos, trocas, focos }) => {
    const boot = await sessao.ir(BOOT);
    const fase = await sessao.js('window.__director.captura.fase');
    if (fase !== 'atlas') throw new Error(`boot não abriu no Atlas (fase '${fase}')`);
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
    for (const id of focos) {
      await sessao.js(`window.__director.focarNoCorpo('${id}')`);
      await sessao.assentar();
      amostras.push(await amostrar(`foco ${id}`));
    }
    return { boot, amostras, mundos };
  };

  /** Os vereditos do D9 sobre um conjunto de amostras, sem imprimir. */
  const julgar = (amostras) => {
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
    const ancora = trocas[trocas.length - 1] ?? ciclos[ciclos.length - 1];
    const focos = amostras.filter((a) => a.rotulo.startsWith('foco'));
    const deltaFocos = focos.length
      ? Math.max(
          ...focos.map((a) => Math.abs(a.textures - ancora.textures)),
          ...focos.map((a) => Math.abs(a.geometries - ancora.geometries))
        )
      : 0;
    const heaps = amostras.map((a) => a.heap);
    const janela = Math.max(1, Math.min(4, heaps.length >> 1));
    const inclinacao =
      mediana(heaps.slice(-janela)) - mediana(heaps.slice(0, janela));
    const picoTextures = Math.max(...amostras.map((a) => a.textures));
    const picoTexelMiB = Math.max(...amostras.map((a) => a.texelMiB));
    const picoGeometries = Math.max(...amostras.map((a) => a.geometries));
    const picoWorkers = Math.max(...amostras.map((a) => a.workers));
    return {
      deltaPortal, deltaTrocas, deltaFocos, inclinacao,
      picoTextures, picoTexelMiB, picoGeometries, picoWorkers,
    };
  };

  if (SABOTAGEM) {
    // ---- o protocolo inteiro, sabidamente vazado ---------------------
    process.stdout.write('MODO --sabotagem: o veredito abaixo TEM de reprovar.\n\n');
    const { amostras } = await protocolo({
      sabotar: true, ciclos: CICLOS, trocas: TROCAS, focos: FOCOS,
    });
    tabela(amostras);
    const v = julgar(amostras);
    conferir(v.deltaPortal === 0, `portal: delta ZERO em textures/geometries (max ${v.deltaPortal})`);
    conferir(v.deltaTrocas === 0, `trocas de tier: delta ZERO entre trocas (max ${v.deltaTrocas})`);
    conferir(v.deltaFocos === 0, `focos: delta ZERO (max ${v.deltaFocos})`);
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
      boot.via === 'sinal',
      `boot no Atlas assentou por via=${boot.via} em ${(boot.ms / 1000).toFixed(1)}s`
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
    const v = julgar(amostras);
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
    conferir(
      v.deltaFocos === 0,
      `${FOCOS.length} focos: enquadrar não aloca — delta ZERO (max ${v.deltaFocos})`
    );
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

    // ---- 5: O PREÇO DO SWAP NA THREAD — registrado e medido ----------
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

    // ---- 6: AUTOVALIDAÇÃO M5 — o verde só vale com dentes ------------
    // Navegação nova (zera o array da sabotagem) e 2 ciclos VAZADOS de
    // verdade. Os mesmos medidores do veredito têm de acusar: textures
    // sobe 1 por ciclo, heap sobe 16 MB por ciclo. Medidor que não vê o
    // vazamento que o juiz mesmo injetou reprova o JUIZ.
    const m5 = await protocolo({ sabotar: true, ciclos: 2, trocas: 0, focos: [] });
    const vm5 = julgar(m5.amostras);
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
