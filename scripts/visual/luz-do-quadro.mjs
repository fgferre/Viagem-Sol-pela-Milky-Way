// A RÉGUA DA LUZ — quanto do quadro está lavado, e qual é o tamanho do borrão.
//
//   node scripts/visual/luz-do-quadro.mjs                 # a escada do Sol inteira
//   node scripts/visual/luz-do-quadro.mjs 1 4 40 500      # só estas distâncias, em UA
//   EXTRA='&noplan=1' node scripts/visual/luz-do-quadro.mjs 1   # isolando uma camada
//   JANELA=900x900 node scripts/visual/luz-do-quadro.mjs        # (padrão)
//
// POR QUE ELE EXISTE. O item 3 das pendências ("a tela fica branca quando o Sol
// está longe") nunca teve ferramenta. Os números que o projeto cita — "99,0% do
// quadro acima de meia luz a 2,2 UA", "luz média 0,927" — foram medidos À MÃO
// no scratchpad em 2026-08-12 e vivem em COMENTÁRIO (`atlasConfig.ts:262-284`),
// não em código que alguém possa rodar de novo. Sem régua versionada, um
// conserto de exposição não tem como provar que consertou: o `ab-identidade`
// responde "mudou?" e não "melhorou?", e perto do Sol ele fica CEGO — `ua150` e
// `ua40` devolvem md5 IGUAIS com céus diferentes, porque o branco satura os dois.
//
// AS QUATRO COLUNAS, e cada uma responde uma pergunta diferente:
//
//   luzMedia    — média de luminância do quadro em display (0..1). É o número
//                 comparável aos três já registrados no repo (0,927 a 2,2 UA;
//                 0,904 a 228 UA; 0,101 a 20.183 UA). Céu honesto vive perto de
//                 0,02; quadro lavado passa de 0,5.
//   acimaDeMeia — fração de pixels com luminância > 0,5. É a mesma conta dos
//                 "31,85% do quadro satura com bloom" do `NORTE.md:3487`.
//   borrao      — DIÂMETRO da mancha de luz no centro, em px: a maior largura,
//                 na linha do meio, em que a luminância continua acima de 0,5.
//                 Saturar a coluna (`>=H`) quer dizer que a mancha atravessa o
//                 quadro inteiro.
//   discoReal   — o diâmetro que o Sol TEM naquela distância, em px, pela
//                 geometria e nada mais: 2·R☉/d, projetado na mesma lente e no
//                 mesmo buffer. NÃO é medido na imagem — é a verdade contra a
//                 qual o borrão é julgado.
//
// É a última coluna que transforma a régua em juiz. O defeito do item 3 não é
// "a tela está clara": é que `borrao` fica GRUDADO no tamanho da tela enquanto
// `discoReal` cai três ordens de grandeza. Um Sol honesto tem borrão que
// acompanha o disco (mais o clarão do instrumento, que é logarítmico no fluxo e
// portanto encolhe devagar); um Sol quebrado tem borrão constante.
//
// COMO LER O QUE ELE IMPRIME. Duas armadilhas herdadas, as duas já registradas:
//  1. NUNCA julgar por PNG achado em `capturas/` — a pasta é cache e sobrevive
//     entre sessões; em 2026-08-13 um PNG velho levou à conclusão errada de que
//     1 UA saía limpa (`ESCALA-HONESTA.md:731`). Esta régua sempre recaptura.
//  2. A luminância é medida DEPOIS do tonemap e depois do grão/vinheta do
//     `FILM_SHADER` — é o que o olho vê, não o HDR. Para ver o HDR por baixo do
//     clarão, rode com `EXTRA='&nobloom=1'`, que é o par honesto que o
//     `ab-identidade` já usa quando o md5 fica cego.
//
// A ESCADA PADRÃO cobre o vão do item 3 de ponta a ponta: da parede de fogo
// (0,067 UA) até onde o clarão com espinhos começa a acender (4.000 UA). O
// meio dela — de 1 a 40 UA — é justamente a faixa em que a bancada é cega
// (item 12), e por isso a régua nasce medindo lá.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { capturarCDP, APP_PADRAO } from './chrome.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = process.env.APP_URL || APP_PADRAO;
const EXTRA = process.env.EXTRA || '';
const [JW, JH] = (process.env.JANELA || '900x900').split('x').map(Number);
// O MESMO PIN do `ab-identidade`: sem `?q=` o `autoQuality` rebaixa o tier no
// meio da espera e a régua compara duas qualidades diferentes.
const PIN = '&q=cinema';

// ── as constantes da conta, todas com procedência ─────────────────────────
/** 1 UA em pc. O mesmo conversor de `escala.ts` (AU_PARA_PC). */
const UA_EM_PC = 1 / 206264.80624548031;
/** Raio do Sol em pc — `RAIO_SOL_PC` de `src/three/escala.ts`. */
const RAIO_SOL_PC = 2.2566840209436597e-8;
/** A lente do deep-link `?pos=`: o fov VERTICAL de fábrica da câmera
 *  (`engine.ts:217`, `new THREE.PerspectiveCamera(58, …)`). `?fov=` não é
 *  usado por nenhuma vista desta escada. */
const FOV_GRAUS = 58;

/**
 * Diâmetro aparente do Sol, em px — a coluna `discoReal`.
 * Mesma forma de `diametroAparentePx` (`corpos.ts`): ângulo pequeno, buffer em
 * px de ALTURA, lente pela tangente da metade do fov vertical.
 */
export function discoRealPx(distanciaUa, alturaPx = JH, fovGraus = FOV_GRAUS) {
  const dPc = distanciaUa * UA_EM_PC;
  const theta = (2 * RAIO_SOL_PC) / dPc; // rad de DIÂMETRO
  return (theta * alturaPx) / (2 * Math.tan((fovGraus * Math.PI) / 360));
}

/**
 * As três medições da imagem. `dados` é RGB entrelaçado (sem alfa), como o
 * `raw()` do sharp devolve com `.removeAlpha()`.
 *
 * A luminância é a Rec.709 de sempre (0,2126/0,7152/0,0722), a MESMA do
 * `KNEE_SHADER` em `post.ts:51` — usar outra aqui faria a régua e o shader
 * discordarem sobre o que é "meia luz".
 */
export function medirQuadro(dados, largura, altura) {
  const N = largura * altura;
  let soma = 0;
  let acima = 0;
  let pico = 0;
  const linha = new Float64Array(largura);
  const yMeio = Math.floor(altura / 2);
  for (let i = 0, p = 0; i < N; i++, p += 3) {
    const y = (0.2126 * dados[p] + 0.7152 * dados[p + 1] + 0.0722 * dados[p + 2]) / 255;
    soma += y;
    if (y > 0.5) acima++;
    if (y > pico) pico = y;
    const yy = (i / largura) | 0;
    if (yy === yMeio) linha[i - yy * largura] = y;
  }
  // O BORRÃO é medido na linha do meio e a partir do CENTRO, não é a maior
  // corrida da imagem inteira: todas as vistas desta escada olham o Sol na
  // origem, então a mancha que interessa é a que está no meio do quadro. Uma
  // estrela brilhante fora do eixo não deve entrar na conta.
  const xMeio = Math.floor(largura / 2);
  let esq = xMeio;
  let dir = xMeio;
  if (linha[xMeio] > 0.5) {
    while (esq > 0 && linha[esq - 1] > 0.5) esq--;
    while (dir < largura - 1 && linha[dir + 1] > 0.5) dir++;
    return { luzMedia: soma / N, acimaDeMeia: acima / N, pico, borrao: dir - esq + 1 };
  }
  return { luzMedia: soma / N, acimaDeMeia: acima / N, pico, borrao: 0 };
}

/**
 * A ESCADA PADRÃO, em UA. Os degraus não são redondos por acaso:
 *  0,067 UA = 10 M km — a parede de fogo, onde a bola sai certa hoje;
 *  1 UA     — a janela de casa, o disco de 0,53°;
 *  3,6 / 7,2 UA — as duas bordas do gate do palco (arma em 4 px, desarma em 2);
 *  20 / 40 / 150 / 500 UA — o domínio profundo, onde só o ponto desenha;
 *  2.000 UA — o meio do vão, sem juiz nenhum até hoje;
 *  4.000 UA — a véspera de 0,02 pc, onde o clarão com espinhos começa.
 * As três marcadas com ✓ têm vista oficial no `ab-identidade`; as outras seis
 * são exatamente a cegueira do item 12.
 */
export const ESCADA_UA = [0.067, 1, 3.6, 7.2, 20, 40, 150, 500, 2000, 4000];

function urlDaDistancia(ua) {
  const z = (ua * UA_EM_PC).toPrecision(8);
  return `${APP}/?pos=0,0,${z}&look=0,0,0&shot=2${PIN}${EXTRA}`;
}

async function principal() {
  const pedidas = process.argv.slice(2).map(Number).filter(Number.isFinite);
  const escada = pedidas.length ? pedidas : ESCADA_UA;
  const saida = resolve(ROOT, 'capturas');
  mkdirSync(saida, { recursive: true });

  const linhas = [];
  let porta = 9500;
  for (const ua of escada) {
    process.stdout.write(`${String(ua).padStart(8)} UA … `);
    const { png, via } = await capturarCDP({
      url: urlDaDistancia(ua), largura: JW, altura: JH, porta: porta++,
    });
    const arquivo = resolve(saida, `luz-${String(ua).replace('.', 'p')}ua.png`);
    writeFileSync(arquivo, png);
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const m = medirQuadro(data, info.width, info.height);
    linhas.push({ ua, via, ...m, disco: discoRealPx(ua) });
  }

  const num = (v, c = 3) => v.toFixed(c).replace('.', ',');
  process.stdout.write('\n');
  process.stdout.write(`janela ${JW}x${JH}${EXTRA ? `  EXTRA=${EXTRA}` : ''}\n\n`);
  process.stdout.write('      UA   luzMedia   acimaDeMeia    pico   borrao(px)   discoReal(px)\n');
  process.stdout.write('  ' + '─'.repeat(68) + '\n');
  for (const l of linhas) {
    const borrao = l.borrao >= JW ? `>=${JW}` : String(l.borrao);
    process.stdout.write(
      `${String(l.ua).padStart(8)}   ${num(l.luzMedia).padStart(8)}   ` +
      `${num(100 * l.acimaDeMeia, 1).padStart(9)}%   ${num(l.pico, 2).padStart(5)}   ` +
      `${borrao.padStart(10)}   ${num(l.disco, 2).padStart(13)}\n`
    );
  }
  const jsonPath = resolve(saida, 'luz-do-quadro.json');
  writeFileSync(jsonPath, JSON.stringify({ janela: [JW, JH], extra: EXTRA, linhas }, null, 2));
  process.stdout.write(`\n  ${jsonPath}\n`);
}

// Importável sem rodar: as duas contas puras (`medirQuadro` e `discoRealPx`)
// têm teste, e teste não sobe Chrome. Só a execução direta captura.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await principal();
}
