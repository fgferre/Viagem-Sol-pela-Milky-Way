// ============================================================
// O MEDIDOR DE LUZ DE UM PAR — o que o A/B de uma obra de luz mede, e de
// onde cada número sai.
//
//   node scripts/visual/luz-ab.mjs par    <pasta>              # todos os pares antes-*/depois-*
//   node scripts/visual/luz-ab.mjs par    antes.png depois.png # um par só
//   node scripts/visual/luz-ab.mjs faixas antes.png depois.png
//   node scripts/visual/luz-ab.mjs aneis  antes.png depois.png [limiar]
//   node scripts/visual/luz-ab.mjs umbra  antes.png depois.png [ref.png]
//
// Imprime JSON no formato dos `capturas/item93-*.json`. Sem navegador e
// sem dependência: o PNG é decodificado aqui (zlib do próprio Node), e a
// conta roda em Node — é o que faz este juiz ser rodável por qualquer um,
// a qualquer hora, sem GPU.
//
// ------------------------------------------------------------
// POR QUE ELE EXISTE
// ------------------------------------------------------------
// O item 93 pousou em 25/08 com dez fotos e oito arquivos de medida, e a
// auditoria seguinte fez a pergunta certa: QUEM produziu aqueles números?
// Nenhum script do projeto sabia escrever `nasceramDoPreto`. O medidor
// existia — cinco arquivos de bancada num scratchpad de sessão —, e para
// quem vier depois isso é o mesmo que não existir: a pasta é efêmera, o
// git não a vê e a auditoria não a achou. É a doença que o item 81 já
// tinha curado uma vez ("número de comentário sem script é número que
// ninguém confere") voltando por outra porta.
//
// ESTE ARQUIVO É AQUELE MEDIDOR, TRAZIDO PARA DENTRO, definição por
// definição — e a fidelidade não é promessa: rodado sobre os quadros crus
// de 1100×900 que produziram as medidas, ele devolve os oito arquivos de
// 25/08 NÚMERO POR NÚMERO, 473 campos de 473. As duas mudanças de fora
// para dentro são de encanamento: o `sharp` (que nem é dependência
// declarada da casa) deu lugar a um leitor de PNG de meia página, e os
// cinco arquivos de bancada viraram quatro modos de um só.
//
// ------------------------------------------------------------
// A CONFERÊNCIA, para quem quiser refazê-la
// ------------------------------------------------------------
// Os quadros crus foram salvos ao lado das fotos, em `capturas/item93-cru/`
// (a pasta é ignorada pelo git como toda captura, e o item 93 do
// `PENDENCIAS.md` manda não apagá-la enquanto ele não julgar). Cada
// arquivo de 25/08 sai de uma linha:
//
//   par    capturas/item93-cru/vistas             → item93-medidas.json
//   par    capturas/item93-cru/pontos             → item93-pontos.json
//   par    capturas/item93-cru/ruido              → item93-ruido-do-instrumento.json
//   faixas vistas/antes-jupiter-flanco.png  vistas/depois-jupiter-flanco.png  → item93-flanco.json
//   aneis  vistas/antes-lua.png             vistas/depois-lua.png             → item93-lua-radial.json
//   aneis  vistas/antes-mercurio.png        vistas/depois-mercurio.png        → item93-mercurio-radial.json
//   umbra  vistas/antes-terra.png           vistas/depois-terra.png           → item93-umbra.json
//   umbra  vistas/antes-terra.png           semsombra/semsombra-terra.png     → item93-umbra-semsombra.json
//
// ------------------------------------------------------------
// AS DEFINIÇÕES, uma a uma — e cada uma tem juiz em `luz-ab.test.mjs`
// ------------------------------------------------------------
//  · CINZA: luminância Rec.709 (0,2126 R + 0,7152 G + 0,0722 B), em bytes
//    de tela, guardada em `Float32Array` — é o que o olho pesa, e é o
//    mesmo eixo em que as legendas das fotos falam ("de 255").
//  · O LIMIAR DO PRETO é 2, não 0. Abaixo de 2 de 255 não há imagem: há
//    o piso de ruído do próprio quadro. Por isso "nasceu do preto" é
//    CRUZAR o 2 para cima, e "morreu" é cruzá-lo para baixo.
//  · MÁSCARA: pixel com cinza ≥ 2 em PELO MENOS UM dos lados. É sobre ela
//    que saem médias, percentis e saturados: fundo preto dos dois lados
//    não é medida, é área.
//  · MUDOU: |Δcinza| ≥ 0,5 — meio nível de 255. Abaixo disso não há como
//    separar mudança de arredondamento do próprio PNG.
//  · pctQueMudaram: fração do QUADRO INTEIRO, não da máscara.
//  · PERDEU LUZ: `depois < antes − 0,5`, no quadro inteiro — a contagem
//    do que ESCURECEU, que é o que distingue "acrescentou" de "trocou".
//  · PERCENTIL: a amostra na posição `floor(p·n)` do cinza ordenado da
//    máscara. Sem interpolação, de propósito: o que se quer é um pixel
//    que existe, não uma média entre dois.
//  · SATURADO: cinza ≥ 254 dentro da máscara.
//  · FAIXAS: reparte o quadro pelo NÍVEL do lado ANTES (que num Lambert
//    cru é o N·L), normalizado pelo `pico` = p99,9 do ANTES — o p99,9, e
//    não o máximo, porque uma estrela do fundo é mais brilhante que o
//    subsolar e mandaria a régua para o espaço. Dez faixas de meia-largura
//    0,05, centradas em 0,1 … 1,0.
//  · ANÉIS: o disco é achado no ANTES — pixels ≥ `limiar` (25 por padrão)
//    a mais de 60 px da borda do quadro; `centro` é o centroide deles e
//    `raioPx` = √(área/π). Os anéis são de r/raioPx, e param em 0,98:
//    o último décimo é meio anel, porque o limbo é onde a máscara mente.
//    `chato` = anel 0,8–0,9 sobre anel 0,0–0,1 — 1 é o disco chato de
//    Lommel-Seeliger, e quanto menor, mais o limbo cai.
//  · UMBRA: o próprio script ACHA o ponto mais escuro do lado de
//    referência dentro do disco (varredura de 2 em 2 px, média de 5×5
//    amostras), e mede janelas de 17×17 ali e a 220 px ao lado.
//    `contraste` = média do vizinho / média do núcleo, que é como a umbra
//    de um eclipse se lê: o buraco contra o chão iluminado ao lado.
// ============================================================
import { inflateSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** abaixo disto o pixel é PRETO: piso de ruído, não imagem */
export const LIMIAR_DO_PRETO = 2;
/** meio nível de 255 — abaixo disso é arredondamento, não mudança */
export const LIMIAR_DE_MUDANCA = 0.5;
/** cinza a partir do qual um pixel conta como saturado */
export const LIMIAR_DE_SATURACAO = 254;
/** cinza mínimo para um pixel entrar no disco dos anéis */
export const LIMIAR_DO_DISCO = 25;

const arred = (v, casas) => +v.toFixed(casas);
const media = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

// ------------------------------------------------------------
// PNG → RGBA, sem dependência. Aceita 8 bits, sem entrelace, nas cores
// que o Chrome grava (cinza, RGB, RGBA); RECUSA o resto em vez de
// devolver pixel errado — juiz que não consegue ler reprova.
// ------------------------------------------------------------
export function lerPng(bytes) {
  const assinatura = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== assinatura[i]) throw new Error('não é PNG');
  }
  let largura = 0;
  let altura = 0;
  let cor = -1;
  const idat = [];
  for (let p = 8; p + 8 <= bytes.length; ) {
    const tamanho = bytes.readUInt32BE(p);
    const tipo = bytes.toString('latin1', p + 4, p + 8);
    const dados = bytes.subarray(p + 8, p + 8 + tamanho);
    if (tipo === 'IHDR') {
      largura = dados.readUInt32BE(0);
      altura = dados.readUInt32BE(4);
      if (dados[8] !== 8) throw new Error(`PNG de ${dados[8]} bits: este leitor só lê 8`);
      cor = dados[9];
      if (![0, 2, 6].includes(cor)) throw new Error(`PNG de cor tipo ${cor}: só 0, 2 e 6`);
      if (dados[12] !== 0) throw new Error('PNG entrelaçado: este leitor não lê');
    } else if (tipo === 'IDAT') idat.push(Buffer.from(dados));
    else if (tipo === 'IEND') break;
    p += 12 + tamanho;
  }
  if (!largura || !altura) throw new Error('PNG sem IHDR');
  const canais = cor === 0 ? 1 : cor === 2 ? 3 : 4;
  const cru = inflateSync(Buffer.concat(idat));
  const linha = largura * canais;
  const saida = Buffer.alloc(altura * linha);
  let anterior = Buffer.alloc(linha);
  for (let y = 0; y < altura; y++) {
    const filtro = cru[y * (linha + 1)];
    const fonte = cru.subarray(y * (linha + 1) + 1, (y + 1) * (linha + 1));
    const atual = saida.subarray(y * linha, (y + 1) * linha);
    for (let i = 0; i < linha; i++) {
      const a = i >= canais ? atual[i - canais] : 0;
      const b = anterior[i];
      const c = i >= canais ? anterior[i - canais] : 0;
      let v = fonte[i];
      if (filtro === 1) v += a;
      else if (filtro === 2) v += b;
      else if (filtro === 3) v += (a + b) >> 1;
      else if (filtro === 4) {
        const pp = a + b - c;
        const da = Math.abs(pp - a);
        const db = Math.abs(pp - b);
        const dc = Math.abs(pp - c);
        v += da <= db && da <= dc ? a : db <= dc ? b : c;
      } else if (filtro !== 0) throw new Error(`filtro PNG ${filtro} desconhecido`);
      atual[i] = v & 255;
    }
    anterior = atual;
  }
  return { largura, altura, canais, dados: saida };
}

/** o CINZA de cada pixel, em bytes de tela — luminância Rec.709 */
export function cinzaDoPng({ largura, altura, canais, dados }) {
  const g = new Float32Array(largura * altura);
  for (let i = 0; i < g.length; i++) {
    const j = i * canais;
    g[i] = canais === 1
      ? dados[j]
      : 0.2126 * dados[j] + 0.7152 * dados[j + 1] + 0.0722 * dados[j + 2];
  }
  return g;
}

export function cinzaDoArquivo(caminho) {
  const png = lerPng(readFileSync(caminho));
  return { largura: png.largura, altura: png.altura, cinza: cinzaDoPng(png) };
}

/** o cinza na posição `floor(p·n)` da máscara ordenada — sem interpolação */
export function percentil(amostras, p) {
  if (!amostras.length) return 0;
  const s = [...amostras].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

// ------------------------------------------------------------
// O BLOCO A/B — o formato de `item93-medidas.json`
// ------------------------------------------------------------
export function medirPar(antes, depois, limiar = LIMIAR_DO_PRETO) {
  if (antes.length !== depois.length) throw new Error('quadros de tamanhos diferentes');
  const mA = [];
  const mB = [];
  let mudou = 0;
  let deltaSoma = 0;
  let deltaMax = 0;
  let nasceram = 0;
  let morreram = 0;
  let perdidos = 0;
  for (let i = 0; i < antes.length; i++) {
    const va = antes[i];
    const vb = depois[i];
    if (Math.max(va, vb) >= limiar) {
      mA.push(va);
      mB.push(vb);
    }
    const d = Math.abs(vb - va);
    if (d >= LIMIAR_DE_MUDANCA) {
      mudou++;
      deltaSoma += d;
      if (d > deltaMax) deltaMax = d;
    }
    if (va < limiar && vb >= limiar) nasceram++;
    if (va >= limiar && vb < limiar) morreram++;
    if (vb < va - LIMIAR_DE_MUDANCA) perdidos++;
  }
  return {
    pixels: antes.length,
    mascara: mA.length,
    mediaAntes: arred(media(mA), 3),
    mediaDepois: arred(media(mB), 3),
    razao: arred(media(mB) / Math.max(media(mA), 1e-9), 4),
    p90Antes: arred(percentil(mA, 0.9), 2),
    p90Depois: arred(percentil(mB, 0.9), 2),
    p99Antes: arred(percentil(mA, 0.99), 2),
    p99Depois: arred(percentil(mB, 0.99), 2),
    saturadosAntes: mA.filter((v) => v >= LIMIAR_DE_SATURACAO).length,
    saturadosDepois: mB.filter((v) => v >= LIMIAR_DE_SATURACAO).length,
    pixelsQueMudaram: mudou,
    pctQueMudaram: arred((100 * mudou) / antes.length, 3),
    deltaMedio: arred(deltaSoma / Math.max(mudou, 1), 3),
    deltaMax: arred(deltaMax, 1),
    nasceramDoPreto: nasceram,
    morreramNoPreto: morreram,
    pixelsQuePerderamLuz: perdidos,
  };
}

/** a leva inteira de uma pasta `antes-<nome>.png` / `depois-<nome>.png` */
export function medirPasta(dir, limiar = LIMIAR_DO_PRETO) {
  const nomes = [...new Set(
    readdirSync(dir)
      .filter((f) => f.endsWith('.png') && f.startsWith('depois-'))
      .map((f) => f.replace(/^depois-/, '').replace(/\.png$/, ''))
  )].sort();
  const saida = {};
  for (const nome of nomes) {
    const a = cinzaDoArquivo(resolve(dir, `antes-${nome}.png`));
    const b = cinzaDoArquivo(resolve(dir, `depois-${nome}.png`));
    saida[nome] = medirPar(a.cinza, b.cinza, limiar);
  }
  return saida;
}

// ------------------------------------------------------------
// AS FAIXAS DE N·L — o formato de `item93-flanco.json`
// ------------------------------------------------------------
export function medirFaixas(antes, depois) {
  const pico = percentil(antes, 0.999);
  const faixas = [];
  for (let k = 1; k <= 10; k++) {
    const lo = k / 10 - 0.05;
    const hi = k / 10 + 0.05;
    let n = 0;
    let sa = 0;
    let sb = 0;
    for (let i = 0; i < antes.length; i++) {
      const f = antes[i] / pico;
      if (f >= lo && f < hi) {
        n++;
        sa += antes[i];
        sb += depois[i];
      }
    }
    faixas.push({
      faixa: `${lo.toFixed(2)}–${hi.toFixed(2)}`,
      n,
      antes: arred(sa / Math.max(n, 1), 2),
      depois: arred(sb / Math.max(n, 1), 2),
      razao: arred(sb / Math.max(sa, 1e-9), 4),
    });
  }
  return { pico: arred(pico, 2), faixas };
}

// ------------------------------------------------------------
// OS ANÉIS DO DISCO — o formato de `item93-*-radial.json`
// ------------------------------------------------------------
export function medirAneis(antes, depois, largura, altura, limiar = LIMIAR_DO_DISCO) {
  const MARGEM = 60;
  let sx = 0;
  let sy = 0;
  let area = 0;
  for (let i = 0; i < antes.length; i++) {
    if (antes[i] < limiar) continue;
    const x = i % largura;
    const y = (i / largura) | 0;
    if (x < MARGEM || x > largura - MARGEM || y < MARGEM || y > altura - MARGEM) continue;
    sx += x;
    sy += y;
    area++;
  }
  if (!area) throw new Error('nenhum disco acima do limiar');
  const cx = sx / area;
  const cy = sy / area;
  const raio = Math.sqrt(area / Math.PI);
  const soma = Array.from({ length: 10 }, () => ({ a: 0, b: 0, n: 0 }));
  for (let i = 0; i < antes.length; i++) {
    const x = i % largura;
    const y = (i / largura) | 0;
    const r = Math.hypot(x - cx, y - cy) / raio;
    if (r >= 0.98) continue;
    const s = soma[Math.min(9, Math.floor(r * 10))];
    s.a += antes[i];
    s.b += depois[i];
    s.n++;
  }
  const aneis = soma.map((s, k) => ({
    r: `${(k / 10).toFixed(1)}–${((k + 1) / 10).toFixed(1)}`,
    n: s.n,
    antes: arred(s.a / s.n, 2),
    depois: arred(s.b / s.n, 2),
    razao: arred(s.b / Math.max(s.a, 1e-9), 4),
  }));
  return {
    centro: [arred(cx, 1), arred(cy, 1)],
    raioPx: arred(raio, 1),
    aneis,
    chatoAntes: arred(aneis[8].antes / aneis[0].antes, 3),
    chatoDepois: arred(aneis[8].depois / aneis[0].depois, 3),
  };
}

// ------------------------------------------------------------
// A UMBRA E O CHÃO AO LADO — o formato de `item93-umbra.json`
// ------------------------------------------------------------
/** o ponto mais escuro do disco em `ref`, por varredura de 2 em 2 px */
export function nucleoMaisEscuro(ref, largura, altura, raioDoDisco = 340) {
  const cx = largura / 2;
  const cy = altura / 2;
  let melhor = { v: Infinity, x: 0, y: 0 };
  for (let y = 120; y < altura - 120; y += 2) {
    for (let x = 120; x < largura - 120; x += 2) {
      if (Math.hypot(x - cx, y - cy) > raioDoDisco) continue;
      let s = 0;
      let n = 0;
      for (let dy = -6; dy <= 6; dy += 3) {
        for (let dx = -6; dx <= 6; dx += 3) {
          s += ref[(y + dy) * largura + (x + dx)];
          n++;
        }
      }
      const m = s / n;
      if (m < melhor.v) melhor = { v: m, x, y };
    }
  }
  return { x: melhor.x, y: melhor.y };
}

export function medirUmbra(antes, depois, largura, altura, ref = antes, dx = 220, raioDoDisco = 340) {
  const { x, y } = nucleoMaisEscuro(ref, largura, altura, raioDoDisco);
  const janela = (v, jx, jy, raio = 8) => {
    let s = 0;
    let n = 0;
    let min = Infinity;
    for (let b = jy - raio; b <= jy + raio; b++) {
      for (let a = jx - raio; a <= jx + raio; a++) {
        if (a < 0 || b < 0 || a >= largura || b >= altura) throw new Error('janela fora do quadro');
        const g = v[b * largura + a];
        s += g;
        n++;
        if (g < min) min = g;
      }
    }
    return { media: arred(s / n, 2), min: arred(min, 2) };
  };
  const a = janela(antes, x, y);
  const d = janela(depois, x, y);
  const va = janela(antes, x + dx, y);
  const vd = janela(depois, x + dx, y);
  return {
    nucleo: { x, y },
    antes: a,
    depois: d,
    vizinhoAntes: va,
    vizinhoDepois: vd,
    contrasteAntes: arred(va.media / Math.max(a.media, 1e-6), 1),
    contrasteDepois: arred(vd.media / Math.max(d.media, 1e-6), 1),
  };
}

/* c8 ignore start */
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [modo, alvo, arqB, extra] = process.argv.slice(2);
  if (!modo || !alvo) {
    throw new Error('uso: luz-ab.mjs <par|faixas|aneis|umbra> <pasta | antes.png depois.png>');
  }
  let saida;
  if (modo === 'par' && !arqB) saida = medirPasta(alvo);
  else {
    if (!arqB) throw new Error(`o modo \`${modo}\` precisa de DOIS arquivos`);
    const A = cinzaDoArquivo(alvo);
    const B = cinzaDoArquivo(arqB);
    if (A.largura !== B.largura || A.altura !== B.altura) {
      throw new Error(`tamanhos diferentes: ${A.largura}×${A.altura} e ${B.largura}×${B.altura}`);
    }
    saida =
      modo === 'par' ? medirPar(A.cinza, B.cinza)
      : modo === 'faixas' ? medirFaixas(A.cinza, B.cinza)
      : modo === 'aneis' ? medirAneis(
          A.cinza, B.cinza, A.largura, A.altura,
          extra === undefined ? LIMIAR_DO_DISCO : Number(extra)
        )
      : modo === 'umbra' ? medirUmbra(
          A.cinza, B.cinza, A.largura, A.altura,
          extra ? cinzaDoArquivo(extra).cinza : A.cinza
        )
      : null;
  }
  if (!saida) throw new Error(`modo desconhecido: ${modo}`);
  console.log(JSON.stringify(saida, null, 2));
}
/* c8 ignore stop */
