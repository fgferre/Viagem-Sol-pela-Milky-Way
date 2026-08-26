// ============================================================
// A FOLHA DA CALIBRAÇÃO — quem ele vai olhar, e a quem este script serve.
//
//   node scripts/visual/calibracao-da-luz.mjs <pasta> [app] [vistas...]
//
// SERVE A UMA DECISÃO DELE que ainda não foi tomada: qual das três
// candidatas do item 93 (`?calib=c1|c2|c3`) vira o brilho assistido da
// casa, e o que se faz com o `?luz=real` que ele chamou de *"escuro
// demais, repensar"* (item 91(c)). A entrega é UMA folha de fotos, e
// este script é quem produz os quadros CRUS dela. **Ele morre com a
// escolha** — a vencedora vira o padrão, a porta sai, e este arquivo sai
// junto.
//
// NÃO TEM TESTE DE UNIDADE, e é de propósito. Aqui não há conta a
// conferir: quem MEDE é `luz-ab.mjs`, que já tem o seu `luz-ab.test.mjs`
// campo por campo. O que este arquivo tem é ENDEREÇO — a vista de cada
// prancha e a URL de cada coluna —, e endereço se confere olhando a foto.
// Somar um juiz aqui seria engordar a lista que o item 99 existe para
// emagrecer.
//
// ------------------------------------------------------------
// DE ONDE VÊM AS VISTAS — nenhuma é inventada
// ------------------------------------------------------------
// As três âncoras são as vistas PINADAS de `ab-identidade.mjs`, com o
// mesmo `jd` (2024-04-08) e o mesmo `?shot=2`. Duas delas entram giradas,
// e a rotação não precisa do raio de nenhum corpo: o `?pos=` pinado já
// está a uma distância conhecida do centro e a 20° do Sol, então basta
// girar aquele MESMO vetor no MESMO plano até o ângulo de fase pedido.
//
//   · `saturno`         — a `saturno-anel` pinada, verbatim (fase 26,4°:
//                         globo, anel e a sombra dele no disco). É a
//                         vista da noite de Saturno, a pergunta Q9.
//   · `jupiter-flanco`  — a `jupiter` pinada, girada de 20° para 65° de
//                         fase: o terminador atravessa o disco e o
//                         crescente é o que se julga (Q10).
//   · `mercurio-subsolar` — a `mercurio` pinada, girada de 20° para 0°:
//                         a câmera fica na linha Sol–planeta e o subsolar
//                         cai no meio do disco (Q11).
//
// AS OUTRAS TRÊS (`terra`, `lua`, `saturno-real`) não vão para a folha:
// são a PROVA de que sem a porta o pixel não muda. Elas cobrem os quatro
// fragmentos que incluem o chunk da receita — gigante (com e sem véu),
// rochoso LS, `LUA_FRAG` e `TERRA_FRAG`.
//
// ------------------------------------------------------------
// AS COLUNAS
// ------------------------------------------------------------
//   hoje  · sem porta nenhuma          c1 · `?calib=c1`
//   c2    · `?calib=c2`                c3 · `?calib=c3`
//   real  · `?luz=real`                r1 · `?luz=real&exp=8.16`
//   r2    · `?luz=real&exp=9.69`
//
// O `?exp=` é a porta de exposição que JÁ EXISTE (`lerPortaExposicao`,
// `core/engine.ts`), e o Director não a reescreve por cima: `?exp=`
// arma o latch `expOverride`, que é o que segura a auto-exposição da
// vista externa. R1 e R2 não são código novo — são a mesma porta com
// dois números, e é isso que as torna propostas em FOTO e não em prosa.
//
// 1100×900 e `dpr: 1` porque é a geometria dos quadros crus de 25/08
// (`capturas/item93-cru/`), que é onde os números do item 93 nasceram —
// e `capturarCDP` com `dpr` fixa a área útil exata, sem a moldura do
// navegador (a lição do item 81).
// ============================================================
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { APP_PADRAO, capturarCDP } from './chrome.mjs';

export const LARGURA = 1100;
export const ALTURA = 900;

/** as três âncoras pinadas — copiadas de `ab-identidade.mjs`, com o nome
 *  de lá, para que a origem de cada número seja rastreável a UMA casa */
const PINADAS = {
  'saturno-anel': {
    raios: 6,
    pos: [0.0000444068440660703, -0.000013639700232235952, -0.000007543925357433521],
    look: [0.000044415067790719945, -0.000013646416397844129, -0.0000075488848424994925],
  },
  jupiter: {
    raios: 4,
    pos: [0.000014120014161765692, 0.000018255528587957974, 0.00000748112563397955],
    look: [0.000014127656995165159, 0.000018260414310732658, 0.000007483024335340463],
  },
  mercurio: {
    raios: 4,
    pos: [-0.0000019148588355801608, -3.9725638498650736e-7, -1.3749003726820043e-8],
    look: [-0.0000019151695742340926, -3.9722379598669784e-7, -1.3699318312906234e-8],
  },
  terra: {
    raios: 4,
    pos: [-0.0000045882235587153385, -0.0000014555632225072523, -6.307425015010789e-7],
    look: [-0.0000045890070378484725, -0.000001455314175436054, -6.308304960541221e-7],
  },
  lua: {
    raios: 4,
    pos: [-0.000004577765217805196, -0.0000014518586579005272, -6.2925581919652e-7],
    look: [-0.000004577990409167882, -0.000001451855297832381, -6.292543536189472e-7],
  },
};

const CAUDA = '&jd=2460409.26395835&corpos=1&shot=2';

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
  // `pinado` gira no MESMO plano da vista pinada (para Júpiter e Mercúrio
  // isso é o azimute em torno do polo, que é como elas nasceram). `deitado`
  // gira no plano perpendicular ao eixo Z do frame — a câmera fica na
  // latitude do Sol e o anel de Saturno se vê quase de perfil, que é o
  // enquadramento da foto que ele JULGOU (a `saturno-meio` de 25/08); a
  // `saturno-anel` pinada tem +18° de elevação e abriria o anel.
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

/** as vistas da folha e as da prova, com a coluna de cada uma */
export const VISTAS = {
  saturno: {
    url: query(camaraNaFase('saturno-anel', 67, 4, 'deitado')),
    colunas: ['hoje', 'c1', 'c2', 'c3'],
  },
  'jupiter-flanco': {
    url: query(camaraNaFase('jupiter', 60)),
    colunas: ['hoje', 'c1', 'c2', 'c3', 'real', 'r1j', 'r2j'],
  },
  'mercurio-subsolar': { url: query(camaraNaFase('mercurio', 0)), colunas: ['hoje', 'c1', 'c2', 'c3'] },
  'saturno-real': {
    url: query(camaraNaFase('saturno-anel', 67, 4, 'deitado')),
    colunas: ['real', 'r1', 'r2', 'realc1'],
  },
  'saturno-anel': { url: comoPinada('saturno-anel'), colunas: ['hoje'] },
  terra: { url: comoPinada('terra'), colunas: ['hoje'] },
  lua: { url: comoPinada('lua'), colunas: ['hoje'] },
};

/** o que cada coluna acrescenta à URL da vista */
export const COLUNAS = {
  hoje: '',
  c1: '&calib=c1',
  c2: '&calib=c2',
  c3: '&calib=c3',
  real: '&luz=real',
  r1: '&luz=real&exp=8.16',
  r2: '&luz=real&exp=9.69',
  // a MESMA lei em Júpiter (5,006 UA): o R1 abre sempre os mesmos +3 passos,
  // o R2 abre `d` — menos aqui do que em Saturno, porque a câmera está mais
  // perto do Sol. É com DOIS corpos que a lei do R2 aparece; com um só, R1 e
  // R2 são a mesma foto.
  r1j: '&luz=real&exp=8.16',
  r2j: '&luz=real&exp=5.01',

  // a coluna que NÃO vai para a folha: `?calib=` dentro do `real` tem de
  // sair byte a byte igual a `real` — é o dente de imagem da decisão 2.
  realc1: '&luz=real&calib=c1',
};


// ============================================================
// A FOLHA — as quatro pranchas, recompostas dos crus
//
//   node scripts/visual/calibracao-da-luz.mjs --folha [pasta-cru] [saida]
//
// A LEGENDA É PARTE DA PROVA, não enfeite: cada prancha carrega o número
// MEDIDO e o ARQUIVO da medida, e quem duvidar refaz a conta com
// `luz-ab.mjs` sobre o mesmo cru. A regra da casa vale aqui: prancha
// recomposta grava-se AO LADO (`-v2`), nunca por cima.
// ============================================================
const PRANCHAS = [
  {
    arquivo: 'item93-calib-saturno',
    vista: 'saturno',
    lupa: { x: 655, y: 505 },
    corte: { cx: 550, cy: 440, lado: 700 },
    colunas: [
      ['hoje', 'HOJE — a receita como pousou'],
      ['c1', 'C1 — o Eyes na nossa língua'],
      ['c2', 'C2 — terminador traduzido, lanterna 0,05'],
      ['c3', 'C3 — só girando botão (s=1,2)'],
    ],
    titulo: 'Item 93 · Q9 — a noite de Saturno, as três calibrações lado a lado',
    texto: [
      'Câmera a 4 raios de Saturno, 67° fora do eixo Sol–Saturno, 2024-04-08 — a MESMA receita de câmera da foto que você julgou. O azimute em volta do corpo é outro, então o enquadramento não repete pixel a pixel; a luz e a data são as mesmas. Você disse: "a noite ficou clara demais".',
      'A causa não era a dose. Os números da receita do NASA Eyes são bytes de TELA (lá a luz multiplica o que se vê); aqui eles entraram na conta em espaço LINEAR, sem tradução — e o nosso tonemap ainda multiplica por 1,70. É a mesma lição do véu palha, agora no termo de luz.',
      'C1 e C2 traduzem; C3 só gira os botões, e está aqui para mostrar que girar botão NÃO resolve — a noite dela fica mais clara que a de hoje.',
      'Medido (média do quadro / p99, bytes de tela): hoje 22,24 / 212,3 · C1 17,56 / 210,1 · C2 17,05 / 201,7 · C3 23,46 / 207,4. Arquivo: capturas/item93-calib-saturno.json.',
    ],
  },
  {
    arquivo: 'item93-calib-jupiter',
    vista: 'jupiter-flanco',
    lupa: { x: 482, y: 471 },
    corte: { cx: 555, cy: 450, lado: 560 },
    colunas: [
      ['hoje', 'HOJE — o crescente sumiu'],
      ['c1', 'C1 — o Eyes na nossa língua'],
      ['c2', 'C2 — terminador traduzido, lanterna 0,05'],
      ['c3', 'C3 — só girando botão (s=1,2)'],
    ],
    titulo: 'Item 93 · Q10 — o flanco de Júpiter: o crescente volta ou não',
    texto: [
      'Câmera a 4 raios de Júpiter, 60° fora do eixo Sol–Júpiter — a MESMA receita de câmera da foto que você julgou, com o azimute em outro lugar (o enquadramento não repete pixel a pixel). Você disse: "clareou demais".',
      'A NOITE DO GLOBO, em duas janelas DECLARADAS (bytes de tela). No TERMINADOR, 51×51 px em (442, 490): hoje 121,9 · C1 46,0 · C2 46,2 · C3 151,5. No FUNDO da noite, 31×31 px em (373, 511): hoje 45,9 · C1 <b>4,3</b> · C2 <b>16,6</b> · C3 39,7.',
      'É NO FUNDO DA NOITE QUE C1 E C2 SE SEPARAM, e essa é a escolha: a C1 apaga a noite quase por inteiro (é o Eyes ao pé da letra); a C2 mantém um fio de leitura, porque a lanterna dela foi re-dosada contra o byte que o Eyes mostra na tela. Arquivo: capturas/item93-calib-noite.json.',
      'C3 deixa o terminador MAIS claro que hoje: baixar o botão abre o vazamento de 5% para 30%. É botão de contraste, não de dose — nenhum valor dele devolve o crescente.',
      'A repartição faixa a faixa está em capturas/item93-calib-jupiter.json — e ela reparte por NÍVEL DE BYTE, não por N·L: o byte já passou pelo tonemap, e chamar aquilo de N·L era o rótulo errado que este item corrigiu.',
    ],
  },
  {
    arquivo: 'item93-calib-mercurio',
    vista: 'mercurio-subsolar',
    lupa: { x: 549, y: 448 },
    corte: { cx: 555, cy: 450, lado: 520 },
    colunas: [
      ['hoje', 'HOJE — ganho 1, sem freio'],
      ['c1', 'C1 — o Eyes na nossa língua'],
      ['c2', 'C2 — terminador traduzido, lanterna 0,05'],
      ['c3', 'C3 — só girando botão (s=1,2)'],
    ],
    titulo: 'Item 93 · Q11 — Mercúrio no subsolar: domado sem freio de corpo',
    texto: [
      'Câmera a 4 raios de Mercúrio, no eixo do Sol (o pior caso de estouro). Esta é, BIT A BIT, a mesma foto que você julgou — ZERO pixel de diferença contra o quadro cru de 25/08. Você disse: "voltou a incomodar — prefiro domado".',
      'Medido no anel central do disco (bytes de tela): hoje 148,1 · C1 129,7 · C2 106,2 · C3 138,8. O item 91 domava Mercúrio à mão, com um freio por corpo, e chegava a 131,5.',
      'Ou seja: C1 entrega o Mercúrio domado que você preferiu SEM freio nenhum, só por consertar a cadeia. Se ainda quiser o freio por cima, ele existe e é uma linha.',
      'Arquivo: capturas/item93-calib-mercurio.json.',
    ],
  },
  {
    arquivo: 'item93-calib-real',
    vista: 'saturno-real',
    lupa: { x: 550, y: 452 },
    segunda: {
      rotulo: 'a MESMA lei em Júpiter, a 5,0 UA — é aqui que R1 e R2 deixam de ser a mesma foto',
      vista: 'jupiter-flanco',
      corte: { cx: 555, cy: 450, lado: 560 },
      colunas: [
        ['real', 'JÚPITER hoje — ?luz=real'],
        ['r1j', 'R1 — +3 passos, os MESMOS de Saturno'],
        ['r2j', 'R2 — abre MENOS: a câmera está mais perto do Sol'],
      ],
    },
    corte: { cx: 550, cy: 440, lado: 720 },
    colunas: [
      ['real', 'HOJE — ?luz=real, "escuro demais"'],
      ['r1', 'R1 — +3 passos declarados'],
      ['r2', 'R2 — a exposição segue a câmera'],
    ],
    titulo: 'Item 91(c) · o modo real: honesto E legível, sem teto de brilho',
    texto: [
      'A MESMA vista de Saturno da prancha da noite, agora em ?luz=real — a penumbra FÍSICA que você mandou manter. Você disse: "escuro demais, repensar".',
      'Nenhuma das duas propostas toca o globo: as duas mexem só na EXPOSIÇÃO DO QUADRO, que é a fotografia, e nenhuma põe teto de brilho (o NORTE proíbe). A penumbra continua real — o que muda é o tempo de exposição da foto.',
      'R1 abre +3 passos, sempre, e declara isso no selo. R2 faz a exposição SEGUIR A CÂMERA: a foto fica aberta na medida da distância ao Sol (a conta é exp = d em UA — Júpiter 5,0 · Saturno 9,7 · Netuno 30). R1 é o mesmo número em toda parte; R2 é menos perto e mais longe, que é o que mantém Netuno legível sem estourar Júpiter. R2 só vira obra se você escolher.',
      'Medido em Saturno (média do quadro / p99, bytes de tela): hoje 4,49 / 20,3 · R1 26,21 / 107,1 · R2 30,29 / 118,5. Em Saturno as duas quase coincidem — a segunda fileira mostra Júpiter, onde R2 abre 5,0 contra os 8,16 fixos do R1. Repare no CÉU: a exposição também acende o fundo, e isso é parte da escolha. Arquivo: capturas/item93-calib-real.json.',
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
  // a segunda fileira é a LUPA no ponto em que a candidata age — ou, quando
  // a prancha declara uma, OUTRA VISTA: é o caso do modo real, em que a lei
  // do R2 só aparece com dois corpos a distâncias diferentes do Sol.
  const segunda = p.segunda
    ? { rotulo: p.segunda.rotulo, html: fileira(p.segunda.vista, p.segunda.colunas, p.segunda.corte, true) }
    : {
      rotulo: 'a mesma coisa, ampliada 2,8× no ponto em que a mudança acontece',
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
  <footer>Quadros crus em capturas/item93-calib-cru/ · recompõe-se com
    <b>node scripts/visual/calibracao-da-luz.mjs --folha</b> · sem a porta ?calib= o pixel não muda
    (prova em capturas/item93-calib-identidade.json)</footer>`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [destino, app = APP_PADRAO, ...pedidas] = process.argv.slice(2);
  if (!destino) throw new Error('uso: calibracao-da-luz.mjs <pasta|--folha> [app] [vistas...]');
  if (destino === '--folha') {
    await comporFolha(app === APP_PADRAO ? 'capturas/item93-calib-cru' : app, pedidas[0] ?? 'capturas');
    process.exit(0);
  }
  mkdirSync(destino, { recursive: true });
  const nomes = pedidas.length ? pedidas : Object.keys(VISTAS);
  let porta = 9611;
  for (const nome of nomes) {
    const vista = VISTAS[nome];
    if (!vista) throw new Error(`vista desconhecida: ${nome}`);
    for (const coluna of vista.colunas) {
      process.stdout.write(`${nome} · ${coluna}: `);
      const { png } = await capturarCDP({
        url: `${app}/${vista.url}${COLUNAS[coluna]}`,
        largura: LARGURA, altura: ALTURA, porta: porta++, dpr: 1,
      });
      writeFileSync(resolve(destino, `${coluna}-${nome}.png`), png);
    }
  }
}

/** desenha as quatro pranchas com o próprio Chrome — o mesmo caminho que
 *  `diff-pixel.mjs` usa para contar com o decodificador de PNG dele */
async function comporFolha(dirCru, dirSaida) {
  const { abrirSessao } = await import('./chrome.mjs');
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const larguraDaFolha = 1920;
  const tmp = mkdtempSync(resolve(tmpdir(), 'folha93-'));
  // a sessão sobe uma vez e serve as quatro pranchas; o `--allow-file-...`
  // não é preciso porque nada aqui lê canvas — só se DESENHA
  const sessao = await abrirSessao({ janela: `${larguraDaFolha}x1200`, prefixo: 'folha93' });
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
      const saida = resolve(dirSaida, `${p.arquivo}.png`);
      const buf = Buffer.from(shot.data, 'base64');
      writeFileSync(saida, buf);
      console.log(`  ${saida} · ${larguraDaFolha}x${altura} · ${(buf.length / 1024).toFixed(0)} kB`);
    }
  } finally {
    await sessao.fechar();
    rmSync(tmp, { recursive: true, force: true });
  }
}
