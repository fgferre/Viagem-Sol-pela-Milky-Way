// A RÉGUA DA LUZ — quanto do quadro está lavado, e qual é o tamanho do borrão.
//
//   node scripts/visual/luz-do-quadro.mjs                 # a escada do Sol inteira
//   node scripts/visual/luz-do-quadro.mjs 1 4 40 500      # só estas distâncias, em UA
//   EXTRA='&noplan=1' node scripts/visual/luz-do-quadro.mjs 1   # isolando uma camada
//   JANELA=900x900 node scripts/visual/luz-do-quadro.mjs        # (padrão)
//   DPR=2 node scripts/visual/luz-do-quadro.mjs           # a perna retina (o céu do Mac do dono)
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
// AS CINCO COLUNAS, e cada uma responde uma pergunta diferente:
//
//   luzMedia    — média de luminância do quadro em display (0..1). É o número
//                 comparável aos três já registrados no repo (0,927 a 2,2 UA;
//                 0,904 a 228 UA; 0,101 a 20.183 UA). Céu honesto vive perto de
//                 0,02; quadro lavado passa de 0,5.
//   acimaDeMeia — fração de pixels com luminância > 0,5. É a mesma conta dos
//                 "31,85% do quadro satura com bloom" (Onda 4, no NORTE antigo).
//   borrao      — DIÂMETRO da mancha de luz no centro, em px: a maior largura,
//                 na linha do meio, em que a luminância continua acima de 0,5.
//                 Saturar a coluna (`>=H`) quer dizer que a mancha atravessa o
//                 quadro inteiro.
//   discoReal   — o diâmetro que o Sol TEM naquela distância, em px, pela
//                 geometria e nada mais: 2·R☉/d, projetado na mesma lente e no
//                 mesmo buffer. NÃO é medido na imagem — é a verdade contra a
//                 qual o borrão é julgado.
//   clarao      — o diâmetro que o clarão do Sol-ponto tem DIREITO de ter,
//                 pela PSF que a casa já desenha (`common.ts:300-314`).
//                 Também não é medido na imagem. Sem ele o julgamento seria
//                 injusto: a 2.000 UA o disco vale 0,004 px, e cobrar "borrão
//                 igual ao disco" seria cobrar o impossível.
//
// São as duas últimas colunas que transformam a régua em juiz — e desde 15/08
// o juiz existe de verdade, em `julgarEscada`, no molde puro e testável de
// `julgarVistas` e `julgarProntidao`. O defeito do item 3 não é "a tela está
// clara": é que `borrao` fica GRUDADO no tamanho da tela enquanto `discoReal`
// cai três ordens de grandeza e o clarão legítimo só encolhe de ~14,5 px para
// ~9,9 px. Um Sol honesto tem borrão que acompanha o maior dos dois; um Sol
// quebrado tem borrão constante. Hoje a régua REPROVA, e reprovar é o
// comportamento certo: é a linha de base do defeito, medida em vez de citada.
//
// COMO LER O QUE ELE IMPRIME. Duas armadilhas herdadas, as duas já registradas:
//  1. NUNCA julgar por PNG achado em `capturas/` — a pasta é cache e sobrevive
//     entre sessões; em 2026-08-13 um PNG velho levou à conclusão errada de que
//     1 UA saía limpa. Esta régua sempre recaptura.
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
import { capturarCDP, julgarProntidao, APP_PADRAO } from './chrome.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = process.env.APP_URL || APP_PADRAO;
const EXTRA = process.env.EXTRA || '';
const [JW, JH] = (process.env.JANELA || '900x900').split('x').map(Number);
// A PERNA RETINA (`DPR=2 node …`): o dono vê o app num Mac retina e esta
// régua media SEMPRE em DPR 1 — foi assim que o céu vazio do modo cinema
// passou meses invisível para todo "verde" (a raiz do item 44). Com DPR=2 o
// Chrome emula a tela dele (capturarCDP), o app arma o caminho retina de
// verdade (pr=2, buffer 1800), e o BORRÃO medido volta para px de CSS antes
// do juízo — a doutrina da invariância ("a aparência não muda com a
// resolução") vira o próprio critério: a MESMA régua, os MESMOS tetos.
// luzMedia/acimaDeMeia são frações e pico é por pixel — já são invariantes.
//
// E a perna trouxe um conserto de GEOMETRIA para as DUAS: a trava de
// tamanho pegou, no primeiro tiro (17/08), a janela do Chrome descontando a
// barra do navegador — a viewport real era 900×813 com as previsões
// assumindo 900 de altura, um descompasso de ~10% silencioso em todos os
// registros. A escada agora pede a área útil EXATA ao CDP (`dpr: 1`
// também fixa a geometria), então o registro DPR 1 re-baseia em ~10% —
// declarado aqui e no commit; os números antigos ficam no histórico do git.
const DPR = Number.isFinite(Number(process.env.DPR)) && Number(process.env.DPR) >= 1
  ? Number(process.env.DPR)
  : 1;
// O MESMO PIN do `ab-identidade`, pelo mesmo argumento e com a mesma
// história: era defesa contra o `autoQuality` rebaixando o tier no meio da
// espera; desde a letra D dos Ajustes nada troca de tier sozinho, e o pino
// virou a declaração de em que qualidade esta régua foi medida.
const PIN = '&q=cinema';
// ...e o MESMO SUFIXO (`ab-identidade.mjs:595-596`), pelo mesmo argumento,
// palavra por palavra: uma leva com knob não pode pisar no arquivo da leva
// oficial. Aqui isso não era teoria. Em 15/08 o `capturas/luz-do-quadro.json`
// em disco tinha `"extra":"&pupila=1"` dentro — três degraus medidos com a
// pupila REPROVADA ligada, ou seja, números bonitos que, tomados por "antes",
// fariam o conserto do item 3 parecer piora. A régua gravava sempre no mesmo
// caminho e não deixava rastro do knob no NOME: a culpa é dela, não de quem
// rodou. Com o sufixo, cada modo tem o seu arquivo e o "antes" oficial é
// intocável.
const CHAVE_DO_ESTADO = `${EXTRA}${process.env.JANELA || ''}${DPR !== 1 ? `dpr${DPR}` : ''}`;
const SUFIXO = CHAVE_DO_ESTADO ? `-${CHAVE_DO_ESTADO.replace(/[^a-z0-9]+/gi, '')}` : '';

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

// ── a segunda verdade: o clarão que o instrumento tem DIREITO de fazer ────
/** `expoM0` — a magnitude cujo pico de PSF vale 1. `director.ts` (`new
 *  StarField(..., { expoM0: 3.5, sigmaPx: 0.85, ... })`). */
const EXPO_M0 = 3.5;
/** `sigmaPx` — a largura do instrumento, na mesma chamada. */
const SIGMA_PX = 0.85;
/** `PONTO_ZERO_SOL_PC` — a magnitude do Sol a 1 pc, de
 *  `src/three/world/planetas/planetas.ts:164`. */
const PONTO_ZERO_SOL_PC = -0.15;
/** O 2π do shader, com os dígitos DELE (`common.ts:307`). Usar `2*Math.PI`
 *  aqui faria a régua e o shader discordarem na oitava casa por nada. */
const DOIS_PI_DO_SHADER = 6.2831853;

/**
 * Diâmetro do clarão do Sol-ponto, em px — a coluna que faltava para a régua
 * poder julgar sem ser injusta.
 *
 * "Um Sol honesto tem borrão que acompanha o disco" é armadilha se lido ao pé
 * da letra: a 2.000 UA o disco vale 0,004 px, e qualquer clarão maior que zero
 * daria razão infinita. O próprio cabeçalho já concedia a correção — "mais o
 * clarão do instrumento, que é logarítmico no fluxo e portanto encolhe
 * devagar" — e o que faltava era o NÚMERO. Ele não é parâmetro livre nem gosto
 * de quem mede: sai da PSF que a casa já desenha, e só dela.
 *
 * O resultado quantifica a frase: de 1 UA a 2.000 UA o clarão legítimo encolhe
 * de ~14,5 px para ~9,9 px enquanto a distância cresce 60.000×. É isso que
 * "logarítmico no fluxo" quer dizer. O borrão medido hoje está DUAS ORDENS DE
 * GRANDEZA acima disso, e é essa distância que o item 3 nomeia.
 *
 * PROCEDÊNCIA. As quatro constantes acima são redigitadas de `starPSF`
 * (`src/three/shaders/common.ts:300-314`), de `director.ts` e de
 * `planetas.ts:164`, porque esta régua roda em node puro e não importa
 * TypeScript. As quatro têm espelho em `luz-do-quadro.test.mjs`, no molde de
 * `escala.test.ts:63-69`: quem mover o número na fonte é obrigado, pelo teste,
 * a mover aqui — e é o mesmo contrato que impede a lei de existir em duas
 * versões que por acaso se parecem.
 */
export function claraoPsfPx(distanciaUa, alturaPx = JH, expoM0 = EXPO_M0, sigmaPx = SIGMA_PX) {
  const dPc = distanciaUa * UA_EM_PC;
  // a MESMA forma do vertex de `planetas.ts` (log2 · 0,30103, sem o clamp de
  // 1e-3 pc do `catalogApparentMag` — que cai bem no meio deste domínio)
  const m = PONTO_ZERO_SOL_PC + 5 * (Math.log2(dPc) * 0.30103);
  const sigma = (sigmaPx * alturaPx) / 1080;
  const E = Math.pow(10, -0.4 * (m - expoM0));
  const pico = E / (DOIS_PI_DO_SHADER * sigma * sigma);
  const rSat = pico > 1 ? sigma * Math.sqrt(2 * Math.log(pico)) : 0;
  return 2 * (2.2 * sigma + rSat);
}

// ── o clarão DA LEI — o teto que o §5.10 mandou derivar da lei nova ──────
// As quatro constantes da asa são REDIGITADAS de `src/three/estrela.ts`
// (esta régua roda em node puro), e `luz-do-quadro.test.mjs` cobra o acordo
// por NÚMERO contra `repartir` — o mesmo contrato de procedência de
// `claraoPsfPx`. Antes do L1 o teto usava só o núcleo `√ln`, que é quase
// constante: o juiz EXIGIA o halo constante que é a própria doença do
// item 42. Agora o direito de espalhar é núcleo + asa Moffat — generoso
// perto (o quadro honesto a 1 UA é claro mesmo, âncora do dono) e apertado
// longe (a asa encolhe com a luz, R ∝ F^(1/2β)).
/** fração do fluxo na asa explícita — `FRACAO_DA_ASA` de estrela.ts */
const FRACAO_DA_ASA = 0.06;
/** limiar de visibilidade em luz de tela — `LIMIAR_DO_CLARAO` */
const LIMIAR_DO_CLARAO = 1 / 255;
/** raio de dobra da asa em σ — `NUCLEO_DA_ASA_EM_SIGMAS` */
const NUCLEO_DA_ASA_EM_SIGMAS = 2;
/** expoente Moffat — `BETA_DA_ASA` */
const BETA_DA_ASA = 2.4;

// ── a SOLTURA do clarão (R2 do item 44 — substituiu o filtro na asa) ─────
// O clarão da lei é a óptica PLENA do ponto vestida por UMA rampa C¹ no
// domínio do TAMANHO: zero com disco ≥ 10 px (a superfície é a dona — o
// filtro solar segue lá, cuidando DELA), um com disco ≤ 2 px (ponto
// pleno), smoothstep em LOG do disco no meio. A forma anterior (dividir o
// fluxo pelo filtro e tirar raiz) explodia o clarão no recuo — 10→417 px
// entre 0,8 e 2 UA, as "2 violações" da sonda densa de 17/08.
/** limiar e largura da rampa do override — `LIMIAR_DO_OVERRIDE_PX`,
 *  `LARGURA_DO_OVERRIDE` de estrela.ts */
const LIMIAR_DO_OVERRIDE_PX = 4;
const LARGURA_DO_OVERRIDE = 2.5;
/** o disco em que a soltura completa — `SOLTURA_PLENA_PX` de estrela.ts */
const SOLTURA_PLENA_PX = 2;

/** espelho de `solturaDoClarao` (estrela.ts) — cobrado por conformidade
 *  numérica no teste, como toda a família */
export function solturaDaLei(distanciaUa, alturaPx = JH) {
  const disco = discoRealPx(distanciaUa, alturaPx);
  if (!(disco > 0)) return 1;
  return (
    1 -
    suave(
      Math.log(SOLTURA_PLENA_PX),
      Math.log(LIMIAR_DO_OVERRIDE_PX * LARGURA_DO_OVERRIDE),
      Math.log(disco)
    )
  );
}

function suave(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** o vão radiométrico da fotosfera na troca de 1 px — espelho de
 *  `vaoRadiometricoNaTroca`/`radianciaDeTela` (luzDaCasa.ts); a 900 px
 *  vale 2,735e10, cobrado por teste contra a fonte */
export function vaoDoFiltro(alturaPx = JH) {
  const dTroca = (RAIO_SOL_PC * alturaPx) / Math.tan((FOV_GRAUS * Math.PI) / 360);
  const m = PONTO_ZERO_SOL_PC + 5 * Math.log10(dTroca);
  const E = Math.pow(10, -0.4 * (m - EXPO_M0));
  return E / (Math.PI * 0.25);
}


export function claraoDaLeiPx(distanciaUa, alturaPx = JH, expoM0 = EXPO_M0, sigmaPx = SIGMA_PX) {
  const dPc = distanciaUa * UA_EM_PC;
  const m = PONTO_ZERO_SOL_PC + 5 * (Math.log2(dPc) * 0.30103);
  const sigma = (sigmaPx * alturaPx) / 1080;
  const E = Math.pow(10, -0.4 * (m - expoM0));
  // o clarão é a óptica PLENA do ponto (sem filtro) vestida pela SOLTURA
  // no tamanho — é o que `repartir` faz desde a R2; conformidade cobrada
  // por teste
  const pico = E / (DOIS_PI_DO_SHADER * sigma * sigma);
  const rSat = pico > 1 ? sigma * Math.sqrt(2 * Math.log(pico)) : 0;
  const nucleo = 2 * (2.2 * sigma + rSat);
  const excesso = (FRACAO_DA_ASA * pico) / LIMIAR_DO_CLARAO;
  const raioDaAsa =
    excesso > 1
      ? NUCLEO_DA_ASA_EM_SIGMAS * sigma * Math.sqrt(Math.pow(excesso, 1 / BETA_DA_ASA) - 1)
      : 0;
  return Math.max(nucleo, 2 * raioDaAsa) * solturaDaLei(distanciaUa, alturaPx);
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
  const meia = new Uint8Array(N);
  const yMeio = Math.floor(altura / 2);
  for (let i = 0, p = 0; i < N; i++, p += 3) {
    const y = (0.2126 * dados[p] + 0.7152 * dados[p + 1] + 0.0722 * dados[p + 2]) / 255;
    soma += y;
    if (y > 0.5) {
      acima++;
      meia[i] = 1;
    }
    if (y > pico) pico = y;
    const yy = (i / largura) | 0;
    if (yy === yMeio) linha[i - yy * largura] = y;
  }
  // AS FAÍSCAS — a régua do céu-nunca-vazio (item 4; palavras do dono:
  // "nao quero que o ceu vire nunca uma coisa vazia, pois ele nao é").
  // `faiscantes` conta as MANCHAS acima de meia luz: componentes conexos
  // (4 vizinhos) da máscara, não máximos locais — núcleo saturado é platô,
  // e um máximo estrito o perderia. Foi exatamente esta contagem que faltou
  // quando o M2 apagou a faísca de centenas de estrelas e todo "verde"
  // continuou verde: as métricas de média não enxergam pontos que somem.
  // O Sol e o clarão dele contam como UMA mancha (braços encostam no
  // núcleo) — o sinal do céu morto não é 12 contra 11, é o colapso de
  // centenas para dezenas.
  let faiscantes = 0;
  const fila = new Int32Array(N);
  for (let i = 0; i < N; i++) {
    if (!meia[i]) continue;
    faiscantes++;
    meia[i] = 0;
    fila[0] = i;
    let topo = 1;
    while (topo) {
      const q = fila[--topo];
      const x = q % largura;
      const yy = (q / largura) | 0;
      if (x > 0 && meia[q - 1]) { meia[q - 1] = 0; fila[topo++] = q - 1; }
      if (x < largura - 1 && meia[q + 1]) { meia[q + 1] = 0; fila[topo++] = q + 1; }
      if (yy > 0 && meia[q - largura]) { meia[q - largura] = 0; fila[topo++] = q - largura; }
      if (yy < altura - 1 && meia[q + largura]) { meia[q + largura] = 0; fila[topo++] = q + largura; }
    }
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
    return { luzMedia: soma / N, acimaDeMeia: acima / N, pico, faiscantes, borrao: dir - esq + 1 };
  }
  return { luzMedia: soma / N, acimaDeMeia: acima / N, pico, faiscantes, borrao: 0 };
}

// ── O JUÍZO ───────────────────────────────────────────────────────────────
// Até aqui a régua MEDIA e não JULGAVA: imprimia seis colunas e ia embora. Um
// instrumento sem veredito devolve a decisão para quem lê a tabela, e é assim
// que "melhorou" vira opinião. `julgarVistas` (`ab-identidade.mjs:786`) e
// `julgarProntidao` (`chrome.mjs:94`) já são puros e testados exatamente por
// isso; esta é a terceira do mesmo molde.
//
// TODOS os limiares abaixo saem de número que já existe na casa — nenhum é
// gosto. É a trava contra o modo de falha mais barato de todos: afrouxar o
// juiz até o conserto passar.

/** Folga do borrão sobre a verdade, no par honesto (`EXTRA='&nobloom=1'`): o
 *  `size` da PSF é o suporte do sprite, e a largura ACIMA DE MEIA LUZ depois do
 *  ACES e do grão do `FILM_SHADER` não é a mesma coisa. Meia folga. */
const FOLGA_SEM_BLOOM = 1.5;
/** Com bloom, o `UnrealBloomPass` espalha por desenho (raio 0,58,
 *  `post.ts:74-78`). O dobro da folga — declarada, não frouxa. */
const FOLGA_COM_BLOOM = 3;
/** O borrão é medido em px inteiros sobre uma imagem com grão e vinheta. 1 px
 *  de tremor não é o Sol deixando de encolher. */
const TOLERANCIA_MONOTONIA_PX = 1;
/** §5.10: razão máxima de borrão entre degraus vizinhos, POR OITAVA de
 *  distância, nos dois sentidos (piso de 1 oitava para degraus densos).
 *  3×/oitava engole a lei honesta mais íngreme (o disco, 2×/oitava) e
 *  reprova o penhasco de dezenas de vezes num degrau curto. */
const RAZAO_MAXIMA_POR_OITAVA = 3;
/** abaixo disto o borrão é ruído de medição, não degrau — a razão não julga */
const PISO_DO_BORRAO_PX = 8;
// A PAREDE DE FOGO NÃO É MAIS CASO ESPECIAL. Havia aqui um `UA_DA_PAREDE = 1`
// com tetos dobrados abaixo dele, porque a 0,067 UA o disco tem 113 px e ser
// branco ali é HONESTO. Com os dois orçamentos saindo da ÁREA do borrão
// permitido, o caso especial desapareceu sozinho: lá o disco é grande, o teto
// cresce com ele, e a régua não precisa de exceção escrita à mão.
/**
 * O PISO DO CÉU — o que o quadro já tem de luz SEM o Sol ter culpa: as
 * estrelas brilhantes do campo e a galáxia.
 *
 * MEDIDO COM O SOL DESLIGADO, que é a única forma não circular de medi-lo:
 * `EXTRA='&noplan=1'` tira a camada dos dez corpos (o vértice 0 é o Sol) e o
 * que sobra no quadro é o céu e só ele. Leitura de 15/08, 900×900, `?q=cinema`,
 * idêntica a 1 UA e a 2.000 UA:
 *
 *     com bloom:  luz média 0,048 · 0,300% acima de meia luz
 *     sem bloom:  luz média 0,039 · 0,113% acima de meia luz
 *
 * O bloom espalha as estrelas brilhantes do próprio céu, e é por isso que os
 * dois pisos são diferentes. Cobrar o piso sem bloom de um quadro com bloom
 * seria cobrar do Sol o brilho das outras estrelas.
 *
 * ESTE NÚMERO JÁ ESTEVE ERRADO DUAS VEZES, e as duas ficam escritas porque a
 * lição é a mesma: a primeira versão cobrava 1e-3 absolutos derivados no papel
 * (e o papel esqueceu o céu); a segunda mediu o piso só no par SEM bloom e o
 * aplicou aos dois. Teto abaixo do piso é critério impossível, e critério
 * impossível reprova o conserto certo — o pior defeito que um juiz pode ter.
 *
 * E NÃO AFROUXA NADA: o quadro de hoje, com bloom, está em 100% acima de meia
 * luz e luz média 0,945. Contra o piso do céu isso é 330× e 20×.
 *
 * RE-DERIVADO em 17/08 (item 4 do mapa da R2) e RE-DERIVADO DE NOVO no
 * mesmo dia, depois do aceite negado do dono ("perdemos muitas estrelas,
 * densidade parece que caiu"): o cobertor do campo desceu o limiar a ZERO
 * (todo pontinho respira — `LIMIAR_DO_CAMPO`, post.ts) e a extensão do
 * bloom foi à régua de referência (parte 3 da invariância, `setSize`).
 * Medição `EXTRA='&noplan=1'` em 1/40/2000 UA, nas DUAS pernas —
 * DPR 1: luz média ≤ 0,0600, acima de meia ≤ 0,63%; DPR 2: 0,0586 /
 * 0,57%. AS PERNAS AGORA QUASE EMPATAM (antes 0,049 × 0,0446): fechar a
 * extensão em px de CSS fechou também o vão entre as telas — a
 * invariância completa, medida. A constante é a da perna de REFERÊNCIA
 * (DPR 1); prova versionada em `capturas/luz-do-quadro-noplan1{,dpr2}.json`.
 * A linhagem dos pisos: 0,048/0,30% (15/08, céu do filme) → 0,049/0,44%
 * (bloom seletivo, limiar 0,82 isolado — o céu que o dono REPROVOU) →
 * 0,060/0,63% (limiar zero + extensão de referência — o céu cheio).
 *
 * O PAR SEM BLOOM ficou HISTÓRICO: a porta `?nobloom=` NÃO EXISTE no app
 * (o lado A morreu com `?bbloom` no M2 e virou captura versionada) — o
 * runner agora RECUSA `EXTRA` com nobloom em vez de fotografar com bloom
 * e julgar sem, que era o que o par vinha fazendo em silêncio.
 */
const PISO_ACIMA_DE_MEIA_COM_BLOOM = 6.3e-3;
const PISO_ACIMA_DE_MEIA_SEM_BLOOM = 1.133e-3;
const PISO_LUZ_MEDIA_COM_BLOOM = 0.06;
const PISO_LUZ_MEDIA_SEM_BLOOM = 0.039;

/**
 * O PISO DE FAÍSCAS — a régua do céu-nunca-vazio, agora LEI EXECUTÁVEL
 * (item 4; palavras do dono: "nao quero que o ceu vire nunca uma coisa
 * vazia, pois ele nao é"). Nenhuma régua contava PONTOS: o M2 apagou a
 * faísca de centenas de estrelas e toda métrica de média continuou verde.
 *
 * O número vem de medição, não de gosto (17/08, bloom seletivo com o
 * limiar do campo em zero): as 11 vistas oficiais têm 68–82 faíscas em
 * DPR 1 e 83–102 em DPR 2 (retina resolve mais pontinhos acima de meia
 * luz — riqueza, não defeito); as capturas FÓSSEIS da era do céu morto,
 * achadas na mesma pasta, têm 1 (o Sol sozinho). O piso é ~⅗ do mínimo
 * observado — folga declarada para cintilação e variação de vista,
 * morte certa para o colapso (70 → 1 é o defeito; 70 → 60 é uma noite
 * diferente). Vale para as DUAS pernas.
 */
const PISO_DE_FAISCAS = 40;
/**
 * A margem da luz média sobre o piso, e por que ela existe separada do
 * orçamento geométrico: `acimaDeMeia` conta pixel acima de MEIA LUZ, então a
 * área permitida do borrão a traduz direto. A luz MÉDIA não — o clarão
 * legítimo tem uma cauda ABAIXO de meia luz que não entra no borrão e mesmo
 * assim soma na média. 15% é a folga declarada para essa cauda; medida, ela
 * vale ~6% no conserto de 15/08.
 */
const MARGEM_DA_CAUDA = 1.15;

/**
 * O TETO DE LAVAGEM da lei, por distância — a regra 2 e a 3 do juiz num
 * endereço EXPORTADO (M2): o voo de ida e volta usa o MESMO teto no
 * critério de cegueira, em vez de um 50% chapado que não conhecia a asa.
 * Perto do Sol o clarão da lei cobre o quadro e lavar É honesto (a
 * parede de fogo — a âncora do dono é R ≈ 450 px já a 1 UA); longe, o
 * orçamento encolhe com a asa e cegueira volta a ser defeito.
 */
export function tetoDeLavagem(ua, { alturaPx = JH, larguraPx = JW, comBloom = true } = {}) {
  const folga = comBloom ? FOLGA_COM_BLOOM : FOLGA_SEM_BLOOM;
  const disco = discoRealPx(ua, alturaPx);
  const clarao = claraoDaLeiPx(ua, alturaPx);
  const teto = folga * Math.max(disco, clarao);
  const orcamento = (Math.PI * 0.25 * teto * teto) / (larguraPx * alturaPx);
  const pisoAcima = comBloom ? PISO_ACIMA_DE_MEIA_COM_BLOOM : PISO_ACIMA_DE_MEIA_SEM_BLOOM;
  const pisoLuz = comBloom ? PISO_LUZ_MEDIA_COM_BLOOM : PISO_LUZ_MEDIA_SEM_BLOOM;
  return {
    disco,
    clarao,
    tetoBorraoPx: teto,
    tetoAcimaDeMeia: pisoAcima + orcamento,
    tetoLuzMedia: pisoLuz * MARGEM_DA_CAUDA + orcamento,
  };
}

/**
 * O veredito da escada. Puro: recebe as linhas que `medirQuadro` produziu e
 * devolve aprovação por degrau, sem subir Chrome.
 *
 * O QUE ELE COBRA, em ordem de dureza:
 *
 *  1. MONOTONIA — o borrão nunca cresce com a distância. É a asserção mais
 *     dura e a mais barata, e é a assinatura exata do item 3: hoje o borrão é
 *     CONSTANTE em `>=900` de 1 a 500 UA enquanto o disco cai três ordens de
 *     grandeza. Um borrão que não encolhe é o defeito, escrito em uma linha.
 *  2. TETO — o borrão cabe num múltiplo do maior entre o disco real e o clarão
 *     legítimo da PSF. É o "acompanha o disco" do cabeçalho, corrigido pelo
 *     que o instrumento tem direito de fazer.
 *  3. ORÇAMENTO — `acimaDeMeia` e `luzMedia`, com teto diferente dentro e fora
 *     da parede de fogo.
 *
 * O QUE ELE NÃO COBRA, e isto é tão importante quanto o resto: **`pico` não é
 * critério.** No centro do disco o pico É 1 — aquilo é a fotosfera. Quem
 * "consertar" o item 3 baixando o pico está aplicando teto de brilho, que
 * `docs/NORTE.md:183` proíbe e que a lista de becos do NORTE já registra. O
 * defeito é a ÁREA da mancha, nunca a altura dela. Um juiz que olhasse o pico
 * aprovaria justamente o conserto errado.
 */
export function julgarEscada({
  linhas = [],
  alturaPx = JH,
  larguraPx = JW,
  comBloom = true,
} = {}) {
  const folga = comBloom ? FOLGA_COM_BLOOM : FOLGA_SEM_BLOOM;
  const ordenadas = [...linhas].sort((a, b) => a.ua - b.ua);
  const motivosPorUa = new Map(ordenadas.map((l) => [l.ua, []]));

  // 1. monotonia, degrau a degrau, do perto para o longe — ONDE A LEI NÃO
  // CRESCE. O filtro solar (§5.7) desengata quando o disco cai abaixo de
  // 4 px (~0,8 a 1,9 UA para o Sol), e ali o clarão da LEI legitimamente
  // ENTRA — câmera que tira o filtro ganha flare. Cobrar monotonia
  // absoluta nesse degrau seria reprovar o instrumento declarado; fora
  // dele a régua continua a de sempre: borrão nunca cresce.
  for (let i = 1; i < ordenadas.length; i++) {
    const ant = ordenadas[i - 1];
    const cur = ordenadas[i];
    const leiAnt = Math.max(claraoDaLeiPx(ant.ua, alturaPx), discoRealPx(ant.ua, alturaPx));
    const leiCur = Math.max(claraoDaLeiPx(cur.ua, alturaPx), discoRealPx(cur.ua, alturaPx));
    const leiCresce = leiCur > leiAnt * 1.001;
    if (!leiCresce && cur.borrao > ant.borrao + TOLERANCIA_MONOTONIA_PX) {
      motivosPorUa
        .get(cur.ua)
        .push(
          `borrão CRESCEU com a distância: ${cur.borrao} px a ${cur.ua} UA `
          + `contra ${ant.borrao} px a ${ant.ua} UA`
        );
    }
    // 1b. CONTINUIDADE (§5.10): monotonia com 1 px de tolerância deixava um
    // penhasco de 10× (619 → 15,9 px em degraus a 1,46× de distância) passar
    // sem uma linha vermelha. A régua é POR OITAVA de distância: entre
    // degraus vizinhos o borrão pode variar no máximo 3× por oitava — a lei
    // honesta mais íngreme da casa é o disco (1/d, 2× por oitava), que cabe
    // com folga; um penhasco de dezenas de vezes num degrau curto, não. Onde
    // a PRÓPRIA LEI dá um degrau (o filtro desengatando), o teto da razão
    // escala com a razão da lei — derivado, nunca frouxo.
    const grande = Math.max(ant.borrao, cur.borrao);
    const pequeno = Math.max(Math.min(ant.borrao, cur.borrao), PISO_DO_BORRAO_PX);
    const oitavas = Math.max(Math.log2(cur.ua / ant.ua), 1);
    const razaoDaLei = Math.max(leiCur, leiAnt) / Math.max(Math.min(leiCur, leiAnt), 1);
    const maximo = Math.pow(RAZAO_MAXIMA_POR_OITAVA, oitavas) * Math.max(1, razaoDaLei);
    if (grande / pequeno > maximo && grande > PISO_DO_BORRAO_PX) {
      motivosPorUa
        .get(cur.ua)
        .push(
          `PENHASCO entre vizinhos: ${ant.borrao} px a ${ant.ua} UA → `
          + `${cur.borrao} px a ${cur.ua} UA (${(grande / pequeno).toFixed(1)}×, `
          + `máximo ${maximo.toFixed(1)}× para ${oitavas.toFixed(2)} oitava(s))`
        );
    }
  }

  const julgadas = ordenadas.map((l) => {
    const motivos = motivosPorUa.get(l.ua);
    // as regras 2 e 3 saem do MESMO endereço que o voo consome
    // (`tetoDeLavagem`) — o disco pode vir pré-calculado da captura
    const t = tetoDeLavagem(l.ua, { alturaPx, larguraPx, comBloom });
    const disco = l.disco ?? t.disco;
    const clarao = t.clarao;
    const teto = folga * Math.max(disco, clarao);

    // 2. teto do borrão
    if (l.borrao > teto) {
      motivos.push(
        `borrão ${l.borrao} px contra teto de ${teto.toFixed(1)} px `
        + `(disco ${disco.toFixed(2)} · clarão ${clarao.toFixed(2)} · folga ${folga}×)`
      );
    }
    // 3. orçamento do quadro. O teto é o PISO DO CÉU mais a área do borrão que
    //    a regra 2 já permite — não um número solto: o que o Sol tem direito de
    //    lavar é exatamente o disco que ele tem direito de fazer. Com isso a
    //    parede de fogo deixa de precisar de caso especial: lá o disco tem 113
    //    px e o orçamento cresce sozinho.
    if (l.acimaDeMeia > t.tetoAcimaDeMeia) {
      motivos.push(
        `${(100 * l.acimaDeMeia).toFixed(3)}% do quadro acima de meia luz `
        + `(teto ${(100 * t.tetoAcimaDeMeia).toFixed(3)}% = céu + o borrão permitido)`
      );
    }
    // a luz MÉDIA sobre o piso do céu, com a margem da cauda declarada
    if (l.luzMedia > t.tetoLuzMedia) {
      motivos.push(
        `luz média ${l.luzMedia.toFixed(3)} (teto ${t.tetoLuzMedia.toFixed(3)} = `
        + `céu × ${MARGEM_DA_CAUDA} + o borrão permitido)`
      );
    }
    // 4. O CÉU NUNCA VAZIO — o piso de faíscas. É a regra que faltava
    //    quando o M2 apagou o campo: as três acima só têm TETO, e céu
    //    morto passa por qualquer teto. Linhas antigas (sem a contagem)
    //    não são julgadas — replay de json histórico continua honesto.
    if (l.faiscantes !== undefined && l.faiscantes < PISO_DE_FAISCAS) {
      motivos.push(
        `céu com ${l.faiscantes} faísca(s) — piso ${PISO_DE_FAISCAS} `
        + '("o céu nunca vazio", item 4)'
      );
    }

    return {
      ua: l.ua,
      veredito: motivos.length ? 'REPROVA' : 'PASSA',
      teto,
      disco,
      clarao,
      motivos,
    };
  });

  const reprovadas = julgadas.filter((j) => j.veredito === 'REPROVA');
  const erro = reprovadas.length > 0;
  const resumo = erro
    ? `>>> REPROVA — ${reprovadas.length} de ${julgadas.length} degraus fora da lei`
    : `>>> PASSA — ${julgadas.length} degraus dentro da lei`;
  const texto = julgadas
    .flatMap((j) => [
      `${j.veredito.padEnd(8)} ${String(j.ua).padStart(8)} UA`,
      ...j.motivos.map((m) => `           · ${m}`),
    ])
    .join('\n');
  return { linhas: julgadas, reprovadas: reprovadas.length, erro, resumo, texto };
}

/**
 * A ESCADA PADRÃO, em UA. Os degraus não são redondos por acaso:
 *  0,067 UA = 10 M km — a parede de fogo, onde a bola sai certa hoje;
 *  1 UA     — a janela de casa, o disco de 0,53°;
 *  3,6 / 7,2 UA — as duas bordas do gate do palco (arma em 4 px, desarma em 2);
 *  20 / 40 / 150 / 500 UA — o domínio profundo, onde só o ponto desenha;
 *  2.000 UA — o meio do vão, sem juiz nenhum até hoje;
 *  4.000 UA — a véspera de 0,02 pc, onde o clarão com espinhos começa;
 *  15.800 UA — a âncora do item 42 (o alvo do dono: ~8 px de raio de clarão)
 *  e a régua de aceite do M2 (borrão ≤ 20 px) — a escada tinha de chegar lá,
 *  senão o defeito que a Lei nomeia vivia além do último degrau julgado.
 * As três marcadas com ✓ têm vista oficial no `ab-identidade`; as outras
 * são exatamente a cegueira do item 12.
 */
export const ESCADA_UA = [0.067, 1, 3.6, 7.2, 20, 40, 150, 500, 2000, 4000, 15800];

function urlDaDistancia(ua) {
  const z = (ua * UA_EM_PC).toPrecision(8);
  return `${APP}/?pos=0,0,${z}&look=0,0,0&shot=2${PIN}${EXTRA}`;
}

async function principal() {
  // A TRAVA DO BOTÃO MORTO (17/08): `?nobloom=` não existe no app — o lado
  // A do bloom morreu com `?bbloom` no M2 e vive nas capturas versionadas.
  // Rodar com este EXTRA fotografava COM bloom e julgava com os pisos de
  // SEM — números com cara de honestos e origem de mentira. Recusar é o
  // único comportamento decente; o par sem-bloom volta no dia em que
  // existir de novo um caminho REAL de desligar o bloom para medição.
  if (/nobloom=1/.test(EXTRA)) {
    throw new Error(
      'EXTRA com nobloom=1: a porta morreu no M2 (lado A vive nas capturas '
      + 'versionadas) — este par fotografava COM bloom e julgava sem'
    );
  }
  const pedidas = process.argv.slice(2).map(Number).filter(Number.isFinite);
  const escada = pedidas.length ? pedidas : ESCADA_UA;
  const saida = resolve(ROOT, 'capturas');
  mkdirSync(saida, { recursive: true });

  const linhas = [];
  const vias = [];
  let porta = 9500;
  for (const ua of escada) {
    process.stdout.write(`${String(ua).padStart(8)} UA … `);
    const { png, via } = await capturarCDP({
      url: urlDaDistancia(ua), largura: JW, altura: JH, porta: porta++, dpr: DPR,
    });
    const arquivo = resolve(saida, `luz-${String(ua).replace('.', 'p')}ua${SUFIXO}.png`);
    writeFileSync(arquivo, png);
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    // A TRAVA DA PERNA: se o override de DPR não pegou, a imagem volta no
    // tamanho de CSS e a régua estaria medindo DPR 1 com nome de retina —
    // a mentira silenciosa exata que esta perna existe para matar. Quebrar
    // é o comportamento certo.
    if (info.width !== Math.round(JW * DPR) || info.height !== Math.round(JH * DPR)) {
      throw new Error(
        `captura em ${info.width}x${info.height}, esperado ${JW * DPR}x${JH * DPR} — `
        + 'o override de DPR não pegou'
      );
    }
    const m = medirQuadro(data, info.width, info.height);
    vias.push(via);
    linhas.push({
      ua,
      via,
      ...m,
      // o borrão volta à régua de referência (px de CSS): é NELA que os
      // tetos moram, e é ela que a invariância promete igual nas duas pernas
      borrao: m.borrao / DPR,
      disco: discoRealPx(ua),
      // o DIREITO da lei (núcleo + asa) e o núcleo sozinho, lado a lado —
      // a diferença entre os dois é exatamente o que o M2 vai construir
      clarao: claraoDaLeiPx(ua),
      claraoNucleo: claraoPsfPx(ua),
    });
  }

  const num = (v, c = 3) => v.toFixed(c).replace('.', ',');
  process.stdout.write('\n');
  process.stdout.write(
    `janela ${JW}x${JH}${DPR !== 1 ? ` · DPR ${DPR} (borrão em px de CSS)` : ''}`
    + `${EXTRA ? `  EXTRA=${EXTRA}` : ''}\n\n`
  );
  process.stdout.write(
    '      UA   luzMedia   acimaDeMeia    pico   faiscas   borrao(px)   discoReal(px)   clarao(px)\n'
  );
  process.stdout.write('  ' + '─'.repeat(90) + '\n');
  for (const l of linhas) {
    const borrao = l.borrao >= JW ? `>=${JW}` : String(l.borrao);
    process.stdout.write(
      `${String(l.ua).padStart(8)}   ${num(l.luzMedia).padStart(8)}   ` +
      `${num(100 * l.acimaDeMeia, 1).padStart(9)}%   ${num(l.pico, 2).padStart(5)}   ` +
      `${String(l.faiscantes).padStart(7)}   ${borrao.padStart(10)}   ` +
      `${num(l.disco, 2).padStart(13)}   ${num(l.clarao, 2).padStart(10)}\n`
    );
  }
  // O VEREDITO — a régua deixa de devolver a decisão para quem lê a tabela.
  // Hoje ele REPROVA, e reprovar é o comportamento certo: é a linha de base do
  // item 3, medida em vez de citada de comentário.
  const comBloom = !/nobloom=1/.test(EXTRA);
  const juizo = julgarEscada({ linhas, alturaPx: JH, larguraPx: JW, comBloom });
  process.stdout.write('\n');
  if (juizo.texto) process.stdout.write(`${juizo.texto}\n`);
  process.stdout.write(`${juizo.resumo}\n`);

  const jsonPath = resolve(saida, `luz-do-quadro${SUFIXO}.json`);
  writeFileSync(
    jsonPath,
    JSON.stringify(
      { janela: [JW, JH], dpr: DPR, extra: EXTRA, comBloom, veredito: juizo.resumo, linhas },
      null,
      2
    )
  );
  process.stdout.write(`\n  ${jsonPath}\n`);

  // e o mesmo juiz de prontidão que os outros harnesses já usam: sem ele a
  // coluna `via` era colhida e nunca julgada, e uma leva inteira no modo lento
  // produzia números com cara de bons (`chrome.mjs:70-92`).
  const prontidao = julgarProntidao({
    vias,
    appUrl: process.env.APP_URL || '',
    fallbackOk: process.env.FALLBACK_OK === '1',
  });
  if (prontidao.mensagem) process.stdout.write(prontidao.mensagem);
  if (prontidao.erro) process.exitCode = 1;
  else if (juizo.erro) process.exitCode = 1;
}

// Importável sem rodar: as duas contas puras (`medirQuadro` e `discoRealPx`)
// têm teste, e teste não sobe Chrome. Só a execução direta captura.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await principal();
}
