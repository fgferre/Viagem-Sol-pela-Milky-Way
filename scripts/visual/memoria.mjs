// O AMOSTRADOR DE MEMÓRIA — o juiz que prova que sair DEVOLVE o que
// entrar alocou (Onda 6, F8/D9).
//
//   node scripts/visual/memoria.mjs               # veredito
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
//     alta→performance→alta — pixelRatio, render targets do pós e passos do
//     raymarch trocam e voltam). REGISTRADO AQUI porque é fato do desenho:
//     a troca DO VISITANTE (painel de Ajustes) é RELOAD por decisão —
//     metade da qualidade é assada na construção (`changeQuality` no
//     App.tsx grava `?q=` e recarrega) — então o juiz também mede um reload
//     ao final, a título de registro. O caminho vivo existe (é o que o boot
//     com `?q=` usa) e é ele que pode vazar dentro de uma sessão.
//  C. Foco em 5 corpos — `focarNoCorpo`, o MESMO ponto de pouso do
//     `?foco=` (App.tsx: resolverFoco → escolherAlvo → focarNoCorpo).
//     Enquadrar não aloca: delta ZERO também. Além do delta, o
//     veredito cobra um TETO residente (texturas/geometrias): Atlas
//     quente com delta zero e 400 texturas ainda é vazamento permanente.
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
// `?q=alta` pinado via porta (o boot chama `setQuality` manual e desliga o
// autoQuality — o tier não troca sozinho no meio da medida) e o SINAL de
// prontidão do próprio app no lugar de espera cega.
import { abrirSessao, APP_PADRAO } from './chrome.mjs';

const APP = process.env.APP_URL || APP_PADRAO;
const JANELA = process.env.JANELA || '1200x900';
const BOOT = 'atlas=1&q=alta';
const CICLOS = 5;
const TROCAS = 3;
// os 5 corpos do foco — ids de `IDS_FOTOMETRIA` (o pouso do ?foco=)
const FOCOS = ['earth', 'jupiter', 'saturn', 'neptune', 'mars'];
const LIMIAR_HEAP_MB = 12;
// Teto RESIDENTE (não o delta). O Atlas em alta pré-aquece os 38
// canais de corpo + pós + campo. Delta ZERO com 400 texturas ainda
// é um vazamento permanente. Cinema usa o MESMO número de objetos
// (os texels é que dobram) — o GB mora no comentário de alvoDePixels.
const TETO_TEXTURAS = 120;
const TETO_GEOMETRIAS = 80;
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
    return {
      rotulo,
      textures: stats.memory.textures,
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
      '        amostra           textures  geometries  heap V8+ext  heapGetter(MB)  workers\n'
    );
    for (const a of linhas) {
      process.stdout.write(
        `        ${a.rotulo.padEnd(18)}${String(a.textures).padStart(8)}`
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
  const protocolo = async ({ sabotar, ciclos, trocas, focos }) => {
    const boot = await sessao.ir(BOOT);
    const fase = await sessao.js('window.__director.captura.fase');
    if (fase !== 'atlas') throw new Error(`boot não abriu no Atlas (fase '${fase}')`);
    const amostras = [await amostrar('boot')];
    for (let c = 1; c <= ciclos; c++) {
      await sessao.js('window.__director.partirDoAtlas()');
      await sessao.assentar();
      await sessao.js('window.__director.entrarNoAtlas()');
      await sessao.assentar();
      if (sabotar) await sessao.js(INJETAR);
      amostras.push(await amostrar(`ciclo ${c}`));
    }
    for (let t = 1; t <= trocas; t++) {
      await sessao.js("window.__director.setQuality('performance')");
      await sessao.assentar();
      await sessao.js("window.__director.setQuality('alta')");
      await sessao.assentar();
      amostras.push(await amostrar(`troca q ${t}`));
    }
    for (const id of focos) {
      await sessao.js(`window.__director.focarNoCorpo('${id}')`);
      await sessao.assentar();
      amostras.push(await amostrar(`foco ${id}`));
    }
    return { boot, amostras };
  };

  /** Os vereditos do D9 sobre um conjunto de amostras, sem imprimir. */
  const julgar = (amostras) => {
    const ciclos = amostras.filter((a) => a.rotulo.startsWith('ciclo'));
    const base = ciclos[0];
    const deltaPortal = Math.max(
      ...ciclos.map((a) => Math.abs(a.textures - base.textures)),
      ...ciclos.map((a) => Math.abs(a.geometries - base.geometries))
    );
    const posPortal = amostras.filter(
      (a) => a.rotulo.startsWith('troca') || a.rotulo.startsWith('foco')
    );
    const deltaResto = posPortal.length
      ? Math.max(
          ...posPortal.map((a) => Math.abs(a.textures - ciclos[ciclos.length - 1].textures)),
          ...posPortal.map((a) => Math.abs(a.geometries - ciclos[ciclos.length - 1].geometries))
        )
      : 0;
    const heaps = amostras.map((a) => a.heap);
    const janela = Math.max(1, Math.min(4, heaps.length >> 1));
    const inclinacao =
      mediana(heaps.slice(-janela)) - mediana(heaps.slice(0, janela));
    const picoTextures = Math.max(...amostras.map((a) => a.textures));
    const picoGeometries = Math.max(...amostras.map((a) => a.geometries));
    const picoWorkers = Math.max(...amostras.map((a) => a.workers));
    return {
      deltaPortal, deltaResto, inclinacao, picoTextures, picoGeometries, picoWorkers,
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
    conferir(v.deltaResto === 0, `trocas+focos: delta ZERO (max ${v.deltaResto})`);
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
    const { amostras, boot } = primeira;
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
      v.deltaResto === 0,
      `${TROCAS} trocas de qualidade (caminho vivo) + ${FOCOS.length} focos: delta ZERO`
        + ` (max ${v.deltaResto})`
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

    // ---- 5: a troca do visitante é RELOAD — registrado e medido ------
    // Não é veredito: é fato do desenho (App.tsx, changeQuality). O que
    // se mede é o custo do caminho que o visitante paga.
    const recarga = await sessao.ir(BOOT);
    process.stdout.write(
      `        registro: a troca de qualidade do PAINEL é reload por decisão `
      + `(App.tsx changeQuality);\n        um reload medido: via=${recarga.via}, `
      + `${(recarga.ms / 1000).toFixed(1)}s até assentar\n`
    );

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
