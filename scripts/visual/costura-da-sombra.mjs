// ============================================================
// A COSTURA DA SOMBRA — a prancha do item 104, e a quem este script serve.
//
//   node scripts/visual/costura-da-sombra.mjs <pasta> <estado> [app] [vistas...]
//   node scripts/visual/costura-da-sombra.mjs --folha [pasta-cru] [saida]
//
// SERVE A UMA QUEIXA DELE (26/08): *"a transicao da sombra dos aneis para
// regiao de penumbra/noite nao está bem feita. tinha que ser seamless"*. A
// entrega é UMA prancha — a sombra do anel CRUZANDO o terminador, antes ×
// depois —, e este script é quem produz os quadros CRUS dela.
//
// ------------------------------------------------------------
// POR QUE ELE TEM DUAS FILHAS NUMA MÃE SÓ
// ------------------------------------------------------------
// Este arquivo NASCEU como `calibracao-da-luz.mjs`, a folha das três
// calibrações candidatas do item 93. Aquela folha cumpriu o que devia: ele
// escolheu a **C1**, ela virou o padrão do brilho assistido e a porta
// `?calib=` morreu com a escolha, como estava escrito. O que NÃO devia
// morrer junto era a máquina — derivar uma câmera das vistas PINADAS do
// `ab-identidade`, capturar em 1100×900 com `dpr` fixo e recompor a
// prancha com legenda medida. Ela é a mesma máquina que o item 104 pede, e
// reescrevê-la do zero num arquivo novo seria duplicar código que já
// existe para apagar o original em seguida. Então o arquivo MUDOU DE DONO:
// as colunas de candidata saíram, e no lugar delas entrou o eixo que o 104
// mede — o ESTADO DO CÓDIGO.
//
// ------------------------------------------------------------
// COLUNA NÃO É MAIS URL: É CÓDIGO
// ------------------------------------------------------------
// Na folha do 93 as quatro colunas eram quatro URLs do MESMO binário
// (`?calib=c1`…), e uma leva só produzia a prancha inteira. Aqui não dá: o
// que muda entre `antes` e `depois` é o SHADER, não a URL. Por isso a leva
// roda DUAS vezes, uma de cada lado da obra, e o `estado` entra na linha de
// comando e no nome do arquivo (`antes-costura.png`, `depois-costura.png`).
// A prancha se recompõe depois, dos dois lados já em disco.
//
// ------------------------------------------------------------
// AS VISTAS — nenhuma é inventada
// ------------------------------------------------------------
// Todas saem das vistas PINADAS de `ab-identidade.mjs`, com o mesmo `jd`
// (2024-04-08) e o mesmo `?shot=2`; `camaraNaFase` só gira aquele MESMO
// vetor até o ângulo de fase pedido, sem redigitar raio de corpo nenhum.
//
//   · `costura`      — Saturno a 4 raios, fase 60°, na data em que a
//                      sombra do anel EXISTE sobre o hemisfério visível
//                      (ver `JD_DA_COSTURA`). A câmera não sai de um pino:
//                      sai de uma âncora MEDIDA no próprio app
//                      (`ancoraDoApp`), porque para essa data não há vista
//                      pinada de onde ler.
//   · `costura-real` — a mesma câmera, `?luz=real`: a sombra do anel sem a
//                      lanterna e sem a logística, para ver o que o S1
//                      faz onde não há fill nenhum.
//   · as cinco `*-real` — a PROVA de que a C1 não vazou para o modo real.
//                      Elas cobrem os quatro fragmentos que incluem o
//                      chunk da receita — gigante com véu (Saturno),
//                      gigante sem véu (Júpiter), rochoso LS (Mercúrio),
//                      `LUA_FRAG` e `TERRA_FRAG` — e o anel de quebra. O
//                      par mede-se com `luz-ab.mjs par <pasta>`, que já
//                      casa `antes-*` com `depois-*` sozinho.
//
// 1100×900 e `dpr: 1` porque é a geometria dos quadros crus do item 93
// (`capturas/item93-cru/`), que é onde os números daquele item nasceram —
// e `capturarCDP` com `dpr` fixa a área útil exata, sem a moldura do
// navegador (a lição do item 81).
//
// NÃO TEM TESTE DE UNIDADE, e é de propósito. Aqui não há conta a
// conferir: quem MEDE é `luz-ab.mjs`, que tem o seu `luz-ab.test.mjs`
// campo por campo. O que este arquivo tem é ENDEREÇO — a vista de cada
// prancha e a URL de cada coluna —, e endereço se confere olhando a foto.
// ============================================================
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { APP_PADRAO, capturarCDP } from './chrome.mjs';
import { VISTAS as VISTAS_PINADAS } from './ab-identidade.mjs';

export const LARGURA = 1100;
export const ALTURA = 900;

const CAUDA = '&jd=2460409.26395835&corpos=1&shot=2';
const PARAMS_DA_CAUDA = new URLSearchParams(CAUDA.slice(1));

/**
 * A DISTÂNCIA de cada vista pinada, em raios do corpo. Este número NÃO
 * está no `?pos=` — é o que o cabeçalho do `ab-identidade` declara sobre
 * cada uma (6 raios equatoriais para o anel de Saturno, 4 para o resto) —,
 * então continua escrito aqui, e é a lista destas chaves que diz QUAIS
 * vistas esta folha usa.
 */
const RAIOS_DA_PINADA = { 'saturno-anel': 6, jupiter: 4, mercurio: 4, terra: 4, lua: 4 };

/**
 * AS ÂNCORAS SÃO LIDAS DO `ab-identidade`, não redigitadas. Até 26/08 os
 * cinco pares `pos`/`look` viviam copiados aqui, e a cópia não tinha como
 * saber de um re-baseline: bastava alguém repinar uma vista lá para esta
 * folha passar a citar uma câmera que já não é a do md5 oficial, sem que
 * nada reclamasse. É o mesmo argumento que já fez o `planeta-pixel.mjs`
 * importar a lista em vez de copiá-la.
 *
 * A CAUDA TAMBÉM SE CONFERE (`jd`, `corpos`, `shot`): se a vista pinada
 * mudar de data, isto REPROVA na hora em vez de capturar um céu de outro
 * dia com a legenda do anterior.
 */
function pinada(nome) {
  const achada = VISTAS_PINADAS.find(([n]) => n === nome);
  if (!achada) throw new Error(`a vista pinada sumiu do ab-identidade: ${nome}`);
  const q = new URLSearchParams(achada[1]);
  const pos = q.get('pos');
  const look = q.get('look');
  if (!pos || !look) throw new Error(`a vista pinada ${nome} não é ?pos=/?look=`);
  for (const [chave, valor] of PARAMS_DA_CAUDA) {
    if (q.get(chave) !== valor) {
      throw new Error(`a vista pinada ${nome} mudou de ${chave}: ${q.get(chave)} ≠ ${valor}`);
    }
  }
  const numeros = (s) => s.split(',').map(Number);
  return { raios: RAIOS_DA_PINADA[nome], pos: numeros(pos), look: numeros(look) };
}

const PINADAS = Object.fromEntries(
  Object.keys(RAIOS_DA_PINADA).map((nome) => [nome, pinada(nome)])
);

const menos = (a, b) => a.map((v, i) => v - b[i]);
const norma = (a) => Math.hypot(...a);
const versor = (a) => { const n = norma(a); return a.map((v) => v / n); };
const escala = (a, k) => a.map((v) => v * k);
const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * A MESMA CÂMERA da vista pinada, girada até o ângulo de FASE pedido.
 *
 * A base é a que a própria vista pinada já define: `L` é a direção do Sol
 * vista do corpo, e `P` é o que sobra do deslocamento pinado depois de
 * tirar a componente em `L` — isto é, o plano em que a vista pinada já
 * girou. A distância ao centro é a da pinada, ao bit. Com o ângulo da
 * pinada (20°) esta conta devolve a pinada.
 */
export function camaraNaFase(nome, faseGraus, raiosAlvo, plano = 'pinado') {
  const { pos, look, raios } = PINADAS[nome];
  const desloc = menos(pos, look);
  const raio = norma(desloc) * ((raiosAlvo ?? raios) / raios);
  const L = versor(escala(look, -1));
  // `pinado` gira no MESMO plano da vista pinada — para Saturno isso
  // guarda os +18° de elevação sobre o plano do anel, que é o que ABRE o
  // anel no quadro e põe a sombra dele no disco junto com o terminador.
  // `deitado` gira no plano perpendicular ao eixo Z do frame: a câmera
  // fica na latitude do Sol e o anel se vê quase de perfil (foi o
  // enquadramento das fotos de noite do item 93).
  const eixo = [0, 0, 1];
  const bruto = plano === 'deitado'
    ? [eixo[1] * L[2] - eixo[2] * L[1], eixo[2] * L[0] - eixo[0] * L[2], eixo[0] * L[1] - eixo[1] * L[0]]
    : menos(desloc, escala(L, ponto(desloc, L)));
  const P = versor(bruto);
  const a = (faseGraus * Math.PI) / 180;
  const dir = L.map((v, i) => Math.cos(a) * v + Math.sin(a) * P[i]);
  return { pos: look.map((v, i) => v + raio * dir[i]), look };
}

const query = ({ pos, look }) => `?pos=${pos.join(',')}&look=${look.join(',')}${CAUDA}`;

/** VERBATIM: a vista pinada, sem girar um bit */
const comoPinada = (nome) => query(PINADAS[nome]);

/**
 * A DATA DA COSTURA — e por que ela NÃO é a de 2024 das outras vistas.
 *
 * A sombra do anel cai sempre no hemisfério OPOSTO ao Sol. Entre 2009 e
 * 2025 o Sol esteve ao NORTE do plano do anel, então a sombra caía no SUL
 * — o lado que a visita não mostra —, e nas vistas pinadas de 2024 ela
 * simplesmente não aparece no globo (medido: o terminador de lá é um
 * degradê liso, sem banda escura nenhuma). Depois do cruzamento de 2025 a
 * sombra passou para o NORTE, que é o lado que se vê; hoje, porém, o Sol
 * está a ~3° do plano e a sombra é um fio.
 *
 * `JD_DA_COSTURA` é o solstício seguinte (2032), onde o Sol chega a ~26°
 * do plano e a sombra é uma FAIXA LARGA sobre o hemisfério visível. Não é
 * escolher a data que embeleza: é escolher a data em que o fenômeno EXISTE
 * com tamanho para ser medido. A lei do item 91 — *"sempre a data real"* —
 * governa a VISITA que o app abre, não uma foto de diagnóstico, e o mesmo
 * `?jd=` que o `ab-identidade` usa em todas as suas vistas é quem a leva.
 */
const JD_DA_COSTURA = 2463232.5;

/** a fase da costura, em graus fora do eixo Sol–corpo: 60° põe o
 *  terminador dentro do disco COM a faixa da sombra atravessando-o. */
const FASE_DA_COSTURA = 60;

/**
 * A ÂNCORA VEM DO PRÓPRIO APP, e não de um `?pos=` digitado aqui.
 *
 * Para 2024 há vistas PINADAS no `ab-identidade` e a âncora se lê delas
 * ({@link pinada}). Para qualquer outra data não há pino nenhum — e o
 * `?pos=`/`?look=` do app são absolutos no frame da cena, então o par de
 * 2024 aponta para onde Saturno NÃO está em 2032. Digitar um par novo à
 * mão seria exatamente o que o cabeçalho de `pinada` recusa.
 *
 * A saída é perguntar ao app. O `?foco=` dele enquadra o corpo a `?d=`
 * raios, e duas leituras da câmera — a `?d=4` e a `?d=8` — bastam para
 * resolver o CENTRO por álgebra: elas estão na mesma reta, a 4 e a 8
 * raios, então `centro = 2·cam4 − cam8` e `raio = |cam4 − centro| / 4`.
 * O que sai daqui é a geometria que o app usa, medida nele, com o raio de
 * Saturno conferindo com o cadastro em seis casas.
 */
async function ancoraDoApp(app, id, jd) {
  const { abrirSessao, esperarAssentar } = await import('./chrome.mjs');
  // O `app` DA LINHA DE COMANDO VALE TAMBÉM AQUI. Até 26/08 este argumento
  // era recebido e largado, e a âncora saía sempre do dev server padrão —
  // isto é, de OUTRO binário que não o que a leva estava fotografando. Numa
  // árvore compartilhada (dois editores, obras diferentes em curso) isso é
  // medir a câmera num código e o quadro noutro.
  const sessao = await abrirSessao({ janela: `${LARGURA}x${ALTURA}`, app, prefixo: 'ancora' });
  try {
    const camEm = async (d) => {
      await sessao.ir(`foco=${id}&ver=corpo&d=${d}&jd=${jd}&corpos=1&shot=2`);
      await esperarAssentar({ send: sessao.send, cartografia: () => true });
      const r = await sessao.send('Runtime.evaluate', {
        expression:
          '(() => { const c = window.__director.quadroDoPalco.camPosPc;'
          + ' return JSON.stringify([c.x, c.y, c.z]); })()',
        returnByValue: true,
      });
      return JSON.parse(r.result.value);
    };
    const perto = await camEm(4);
    const longe = await camEm(8);
    const centro = perto.map((v, i) => 2 * v - longe[i]);
    const desloc = menos(perto, centro);
    const raio = norma(desloc) / 4;
    if (!(raio > 0)) throw new Error('a âncora do app não resolveu o raio do corpo');
    const L = versor(escala(centro, -1));
    const P = versor(menos(desloc, escala(L, ponto(desloc, L))));
    return { centro, raio, L, P };
  } finally {
    await sessao.fechar();
  }
}

/** a mesma rotação de {@link camaraNaFase}, sobre uma âncora medida no app */
function naFaseDaAncora({ centro, raio, L, P }, faseGraus, raiosAlvo) {
  const a = (faseGraus * Math.PI) / 180;
  const dir = L.map((v, i) => Math.cos(a) * v + Math.sin(a) * P[i]);
  const pos = centro.map((v, i) => v + raiosAlvo * raio * dir[i]);
  return `?pos=${pos.join(',')}&look=${centro.join(',')}`
    + `&jd=${JD_DA_COSTURA}&corpos=1&shot=2`;
}

/**
 * AS VISTAS. `costura` e `costura-real` são a prancha do item 104 e saem
 * de uma âncora MEDIDA no app (`ancora: true`); as cinco `*-real` são a
 * prova de que a C1 (item 93) não atravessou a porta do modo real — cada
 * uma cobre um fragmento diferente que inclui `GLSL_LUZ_DA_VISITA`.
 */
export const VISTAS = {
  costura: { ancora: true, sufixo: '' },
  'costura-real': { ancora: true, sufixo: '&luz=real' },
  // AS DUAS TESTEMUNHAS DO S1/S2, e elas dizem coisas diferentes.
  // `terra-sem-anel` é um corpo de OUTRO fragmento; `jupiter-sem-anel` é
  // um gigante que compila o MESMO `GIGANTE_LAMBERT_FRAG` de Saturno e
  // simplesmente não tem anel aceso (`uAnelAtivo < 0.5`, e aí
  // `sombraDoAnel` devolve 1 e `sombras` é o próprio eclipse). As duas
  // têm de sair bit a bit iguais dos dois lados: se a segunda se mexer, a
  // obra vazou para dentro do fragmento inteiro em vez de ficar onde a
  // sombra do anel cai.
  'terra-sem-anel': { url: comoPinada('terra') },
  'jupiter-sem-anel': { url: query(camaraNaFase('jupiter', 60)) },
  'saturno-real': { url: `${query(camaraNaFase('saturno-anel', 67, 4, 'deitado'))}&luz=real` },
  'jupiter-real': { url: `${query(camaraNaFase('jupiter', 60))}&luz=real` },
  'mercurio-real': { url: `${query(camaraNaFase('mercurio', 0))}&luz=real` },
  'terra-real': { url: `${comoPinada('terra')}&luz=real` },
  'lua-real': { url: `${comoPinada('lua')}&luz=real` },
};

// ============================================================
// A PRANCHA — recomposta dos crus dos DOIS estados
//
//   node scripts/visual/costura-da-sombra.mjs --folha [pasta-cru] [saida]
//
// A LEGENDA É PARTE DA PROVA, não enfeite: ela carrega o número MEDIDO e o
// ARQUIVO da medida, e quem duvidar refaz a conta com `luz-ab.mjs perfil`
// sobre o mesmo cru. A regra da casa vale aqui: prancha recomposta
// grava-se AO LADO, nunca por cima — quem faz isso é `semSobrescrever`.
// ============================================================
const PRANCHAS = [
  {
    arquivo: 'item104-costura',
    vista: 'costura',
    lupa: { x: 628, y: 468 },
    corte: { cx: 545, cy: 450, lado: 760 },
    colunas: [
      ['antes', 'ANTES — a tira clara e o degrau de piso'],
      ['depois', 'DEPOIS — a sombra morre com o dia, no mesmo piso'],
    ],
    titulo: 'Item 104 · a sombra do anel cruzando o terminador de Saturno',
    texto: [
      'Câmera a 4 raios de Saturno, 60° fora do eixo Sol–Saturno, numa data em que o anel está bem aberto — a sombra dele cai no hemisfério OPOSTO ao Sol, e só numa data assim ela é larga o bastante para se medir (em 2026 o Sol está a 3° do plano e a sombra é um fio). Os dois lados têm o MESMO brilho assistido, a C1 que virou o padrão: o que muda entre eles é só a costura.',
      'Você disse: "precisa haver um fade gradual até a sombra, de forma seamless". O NASA Eyes faz isso sem rampa nenhuma — a sombra multiplica a luz que CHEGA, antes do terminador, então sombra e crepúsculo morrem juntos; e o piso da noite é somado fora de qualquer sombra, então a sombra e a noite descem para o MESMO chão.',
      'ANTES a casa fazia o contrário nos dois pontos: um fade por N·L matava a sombra na fronteira (e a luz vazada do terminador ficava acesa sozinha: a tira clara), e a lanterna de leitura era mordida pela sombra do anel (a sombra ficava ~10× mais escura que a noite ao lado: o degrau).',
      'O PERFIL MEDIDO, atravessando a sombra para a noite na linha y = 470, de x = 600 a x = 700 (41 amostras, janela 5×5, bytes de tela): ANTES o brilho desce a <b>5,03</b> e depois SOBE de novo até <b>14,91</b> — a tira clara, quase três vezes o fundo da sombra ao lado dela, com uma subida de 4,04 bytes entre amostras vizinhas. DEPOIS a mesma linha desce 36,52 → 6,03 sem voltar atrás uma única vez (maior subida 0,25, abaixo do meio-nível que o instrumento chama de mudança). Arquivo: capturas/item104-perfil.json.',
      'O PISO VOLTOU PARA DENTRO DA SOMBRA: numa janela declarada de 25×25 em (540, 470), no meio da sombra do anel, o pixel vai de <b>11,02</b> para <b>33,15</b> (×3,0) — é a lanterna de leitura que a sombra comia. E a noite FORA da sombra não se mexe: em (660, 470), 8,22 → 8,08. As duas séries do perfil ficam idênticas byte a byte a partir de x = 655, onde a sombra do anel acaba. Arquivos: capturas/item104-piso.json e item104-noite-fora.json.',
      'UM DEFEITO A MAIS, ACHADO PELA AUDITORIA E CONSERTADO NO MESMO DIA: a busca da placa do anel (<b>texture2D</b>) ficava DEPOIS dos <b>return</b> que recusam o pixel, e uma busca sem LOD escolhe o nível da textura pela derivada medida no quadrado de 2×2 pixels que a placa de vídeo sombreia junto. Com metade do quadrado já fora da função, essa derivada é lixo — e saía um ARCO DE PONTINHOS no lado do dia, num nível fixo de 0,464. Pior: o valor lido muda a cada execução, então o quadro deixou de ser repetível. Agora a busca vem primeiro e as recusas depois.',
      'PAR NULO — duas capturas do MESMO binário, que é como se separa mudança de tremor. ANTES da obra o par nulo já dava <b>292 px</b> (Δmáx 104,9); com o fade removido e o defeito da placa solto ele foi a <b>618 px</b> (Δmáx 99,5); com a busca consertada ele é <b>ZERO — o mesmo md5, pixel por pixel</b>. Arquivos: capturas/item104-parnulo-v2.json e item104-parnulo-antes-v2.json. Isto muda a conta do "antes": parte do que se lia como tremor da vista era este defeito, e o que sobrar dele é o que o item 101 continua guardando.',
      'E A OBRA NÃO VAZOU: Júpiter compila o MESMO fragmento sem anel aceso, e a Terra é outro fragmento — as duas saem com o md5 idêntico ao do código anterior, zero pixel.',
    ],
  },
];

function paginaDaPrancha(p, dirCru, largura) {
  const painel = Math.round((largura - 40 - 10 * (p.colunas.length - 1)) / p.colunas.length);
  const fileira = (vista, colunas, { cx, cy, lado }, rotulos) => {
    const k = painel / lado;
    return colunas.map(([col, rot]) => `<div class="col">
      ${rotulos ? `<div class="rot">${rot}</div>` : ''}
      <div class="p"><img src="file://${resolve(dirCru, `${col}-${vista}.png`)}"
        style="width:${LARGURA * k}px;height:${ALTURA * k}px;
               margin-left:${-(cx - lado / 2) * k}px;margin-top:${-(cy - lado / 2) * k}px"></div>
      </div>`).join('');
  };
  const zoom = Math.round(p.corte.lado / 2.8);
  // a segunda fileira é a LUPA no ponto em que a costura acontece — ou,
  // quando a prancha declara uma, OUTRA VISTA.
  const segunda = p.segunda
    ? { rotulo: p.segunda.rotulo, html: fileira(p.segunda.vista, p.segunda.colunas, p.segunda.corte, true) }
    : {
      rotulo: 'a mesma coisa, ampliada 2,8× no ponto em que a sombra encontra a noite',
      html: fileira(p.vista, p.colunas, { cx: p.lupa.x, cy: p.lupa.y, lado: zoom }, false),
    };
  return `<!doctype html><meta charset="utf-8"><style>
    :root { color-scheme: dark }
    * { box-sizing: border-box }
    body { margin:0; background:#07080c; color:#e8e8ee;
      font: 15.5px/1.42 -apple-system, "Helvetica Neue", Arial, sans-serif; width:${largura}px }
    header { padding:18px 20px 12px }
    h1 { margin:0 0 9px; font-size:26px; letter-spacing:-.2px }
    p { margin:0 0 6px; color:#b9bcc9; font-size:15px }
    .cols { display:flex; gap:10px; padding:0 20px }
    .lupa { padding:9px 20px 2px; color:#8d93a6; font-size:14px; font-weight:600;
      letter-spacing:.3px; text-transform:uppercase }
    .col { width:${painel}px }
    .rot { color:#e8b45a; font-weight:700; font-size:15px; padding:0 0 6px }
    .p { width:${painel}px; height:${painel}px; overflow:hidden; border-radius:3px; background:#000 }
    img { display:block }
    footer { padding:12px 20px 18px; color:#6f7488; font-size:13.5px }
  </style><header><h1>${p.titulo}</h1>${p.texto.map((t) => `<p>${t}</p>`).join('')}</header>
  <div class="cols">${fileira(p.vista, p.colunas, p.corte, true)}</div>
  <div class="lupa">${segunda.rotulo}</div>
  <div class="cols">${segunda.html}</div>
  <footer>Quadros crus em ${dirCru} · recompõe-se com
    <b>node scripts/visual/costura-da-sombra.mjs --folha ${dirCru}</b> · o perfil mede-se com
    <b>luz-ab.mjs perfil</b></footer>`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [destino, estado, app = APP_PADRAO, ...pedidas] = process.argv.slice(2);
  if (!destino) {
    throw new Error('uso: costura-da-sombra.mjs <pasta> <antes|depois> [app] [vistas...]');
  }
  if (destino === '--folha') {
    await comporFolha(estado ?? 'capturas/item104-cru', app === APP_PADRAO ? 'capturas' : app);
    process.exit(0);
  }
  if (estado !== 'antes' && estado !== 'depois') {
    throw new Error('o estado do código tem de ser `antes` ou `depois`');
  }
  mkdirSync(destino, { recursive: true });
  const nomes = pedidas.length ? pedidas : Object.keys(VISTAS);
  // a âncora do app custa duas cargas de página; só se paga por ela se
  // alguma das vistas pedidas de fato a usar
  const ancora = nomes.some((n) => VISTAS[n]?.ancora)
    ? await ancoraDoApp(app, 'saturn', JD_DA_COSTURA)
    : null;
  let porta = 9611;
  for (const nome of nomes) {
    const vista = VISTAS[nome];
    if (!vista) throw new Error(`vista desconhecida: ${nome}`);
    const url = vista.ancora
      ? naFaseDaAncora(ancora, FASE_DA_COSTURA, 4) + vista.sufixo
      : vista.url;
    process.stdout.write(`${nome} · ${estado}: `);
    const { png } = await capturarCDP({
      url: `${app}/${url}`,
      largura: LARGURA, altura: ALTURA, porta: porta++, dpr: 1,
    });
    writeFileSync(resolve(destino, `${estado}-${nome}.png`), png);
  }
}

/** desenha a prancha com o próprio Chrome — o mesmo caminho que
 *  `diff-pixel.mjs` usa para contar com o decodificador de PNG dele */
async function comporFolha(dirCru, dirSaida) {
  const { abrirSessao } = await import('./chrome.mjs');
  const { semSobrescrever } = await import('./luz-ab.mjs');
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const larguraDaFolha = 1920;
  const tmp = mkdtempSync(resolve(tmpdir(), 'folha104-'));
  // a sessão sobe uma vez e serve as pranchas; o `--allow-file-...`
  // não é preciso porque nada aqui lê canvas — só se DESENHA
  const sessao = await abrirSessao({ janela: `${larguraDaFolha}x1200`, prefixo: 'folha104' });
  try {
    for (const p of PRANCHAS) {
      const html = resolve(tmp, `${p.arquivo}.html`);
      writeFileSync(html, paginaDaPrancha(p, dirCru, larguraDaFolha));
      await sessao.send('Page.navigate', { url: `file://${html}` });
      // as imagens são de disco: espera o navegador dizer que TODAS
      // decodificaram, em vez de dormir um número inventado
      const prazo = Date.now() + 60000;
      let altura = 0;
      for (;;) {
        const r = await sessao.send('Runtime.evaluate', {
          expression: `(() => {
            const imgs = [...document.images];
            if (!imgs.length || !imgs.every((i) => i.complete && i.naturalWidth)) return 0;
            return document.documentElement.scrollHeight;
          })()`,
          returnByValue: true,
        });
        altura = r?.result?.value ?? 0;
        if (altura > 0 || Date.now() > prazo) break;
        await new Promise((f) => setTimeout(f, 200));
      }
      if (!altura) throw new Error(`a prancha não carregou as imagens: ${p.arquivo}`);
      const shot = await sessao.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: larguraDaFolha, height: altura, scale: 1 },
      });
      // AO LADO, NUNCA POR CIMA: a prancha de ontem é a testemunha do que
      // se alega, e sobrescrevê-la mata a única prova do "antes".
      const saida = semSobrescrever(resolve(dirSaida, `${p.arquivo}.png`));
      const buf = Buffer.from(shot.data, 'base64');
      writeFileSync(saida, buf);
      console.log(`  ${saida} · ${larguraDaFolha}x${altura} · ${(buf.length / 1024).toFixed(0)} kB`);
    }
  } finally {
    await sessao.fechar();
    rmSync(tmp, { recursive: true, force: true });
  }
}
