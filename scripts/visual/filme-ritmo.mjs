// Serve: dono — onde olhar na revisão de ritmo: quanto a imagem muda por segundo no corte inteiro
// Custo: ~2,3 min no passo padrão (extrapolado de 10 quadros)
// A EXIBIÇÃO COMPLETA, MEDIDA — o instrumento da revisão de ritmo.
//
//   node scripts/visual/filme-ritmo.mjs
//   FILME_RITMO_DIR=/tmp/ritmo PASSO=2 node scripts/visual/filme-ritmo.mjs
//
// O juiz de roteiro (`filme-smoke.mjs`) salta às MARGENS das janelas de
// legenda: ele prova texto e corte, não ritmo. Este varre o corte INTEIRO
// em passo constante e mede o movimento de verdade: quanto a imagem muda
// por segundo, quadro assentado contra quadro assentado. Ritmo deixa de
// ser impressão e vira curva — um trecho longo com a curva no chão e sem
// legenda é candidato a ceder segundos; um pico colado no outro é
// atropelo. A decisão continua sendo de quem OLHA (a folha de contato
// existe para isso); a curva diz ONDE olhar.
//
// Saída (temporária por padrão — o repositório não acumula capturas):
//   ritmo.tsv           t, movimento/s, legenda visível
//   quadros/t###.png    cada quadro varrido, 600px, para inspeção fina
//   folha-N.png         folhas de contato do filme inteiro, em ordem
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { abrirSessao } from './chrome.mjs';

const DIR = process.env.FILME_RITMO_DIR
  || resolve(tmpdir(), `filme-ritmo-${process.pid}`);
const PASSO = Number(process.env.PASSO || 2); // segundos de viagem por quadro

// medida em miniatura cinza: o delta é por PIXEL da miniatura, então a
// resolução dela só precisa ser estável dentro da varredura
const MED_W = 300;
const MED_H = 225;

async function medida(png) {
  const { data } = await sharp(png)
    .resize(MED_W, MED_H, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

function deltaMedio(a, b) {
  let soma = 0;
  for (let i = 0; i < a.length; i++) soma += Math.abs(a[i] - b[i]);
  return soma / a.length; // 0..255 por pixel
}

const xml = (t) => String(t)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

async function cartao(png, rotulo) {
  const frame = await sharp(png)
    .resize(480, 360, { fit: 'contain', background: '#080b13' })
    .png().toBuffer();
  const faixa = Buffer.from(
    `<svg width="480" height="30" xmlns="http://www.w3.org/2000/svg">`
      + '<rect width="480" height="30" fill="#080b13"/>'
      + `<text x="10" y="21" fill="#f4d8a5" font-size="15" font-family="Arial, sans-serif">${xml(rotulo)}</text>`
      + '</svg>'
  );
  return sharp({
    create: { width: 480, height: 390, channels: 4, background: '#080b13' },
  }).composite([
    { input: faixa, left: 0, top: 0 },
    { input: frame, left: 0, top: 30 },
  ]).png().toBuffer();
}

async function salvarFolhas(cards) {
  const COLS = 6;
  const LINHAS_POR_FOLHA = 5;
  const porFolha = COLS * LINHAS_POR_FOLHA;
  const folhas = Math.ceil(cards.length / porFolha);
  for (let f = 0; f < folhas; f++) {
    const grupo = cards.slice(f * porFolha, (f + 1) * porFolha);
    const linhas = Math.ceil(grupo.length / COLS);
    await sharp({
      create: {
        width: COLS * 480,
        height: linhas * 390,
        channels: 4,
        background: '#080b13',
      },
    }).composite(grupo.map((input, i) => ({
      input,
      left: (i % COLS) * 480,
      top: Math.floor(i / COLS) * 390,
    }))).png().toFile(resolve(DIR, `folha-${f + 1}.png`));
  }
  return folhas;
}

mkdirSync(resolve(DIR, 'quadros'), { recursive: true });
const sessao = await abrirSessao({ janela: '1200x900', prefixo: 'filme-ritmo' });
try {
  await sessao.send('Emulation.setDeviceMetricsOverride', {
    width: 1200, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  // `&t=0` é o que TIRA o filme do véu de título: com `?t=` presente o
  // director dá play e congela (contrato das capturas, useDirector).
  // Sem ele a varredura fotografa a tela "INICIAR A VIAGEM" 161 vezes.
  const abriu = await sessao.ir('q=cinema&shot=1&t=0');
  process.stdout.write(`abertura assentou por ${abriu.via}\n`);
  // a duração vem do app — o instrumento acompanha o corte, não o contrário
  const DURACAO = await sessao.js('window.__director.journeyDuration');
  process.stdout.write(`duração do corte: ${DURACAO}s\n`);

  const linhas = ['t\tmov_por_s\tlegenda'];
  const cards = [];
  let anterior = null;
  for (let t = 0; t <= DURACAO - 1; t += PASSO) {
    await sessao.js(`window.__director.seek(${t})`);
    const assentou = await sessao.assentar();
    if (assentou.via !== 'sinal') {
      throw new Error(`t=${t}: assentou por ${assentou.via} — sinal de prontidão quebrado`);
    }
    const shot = await sessao.send('Page.captureScreenshot', { format: 'png' });
    const png = Buffer.from(shot.data, 'base64');
    const legenda = await sessao.js(
      "(document.querySelector('.caption-title')?.textContent || '').trim()"
    );
    const cinza = await medida(png);
    const mov = anterior ? deltaMedio(cinza, anterior) / PASSO : 0;
    anterior = cinza;
    linhas.push(`${t}\t${mov.toFixed(3)}\t${legenda}`);
    const rotulo = `t=${String(t).padStart(3, '0')} · mov ${mov.toFixed(1)}${legenda ? ` · ${legenda}` : ''}`;
    process.stdout.write(`  ${rotulo}\n`);
    await sharp(png).resize(600, 450).png()
      .toFile(resolve(DIR, 'quadros', `t${String(t).padStart(3, '0')}.png`));
    cards.push(await cartao(png, rotulo));
  }

  writeFileSync(resolve(DIR, 'ritmo.tsv'), linhas.join('\n') + '\n');
  const folhas = await salvarFolhas(cards);
  const gritos = sessao.gritos();
  if (gritos.length) {
    process.stdout.write(`\no app gritou ${gritos.length}×:\n${gritos.slice(0, 10).join('\n')}\n`);
  }
  process.stdout.write(`\n${cards.length} quadros · ${folhas} folhas · ${DIR}\n`);
} finally {
  sessao.fechar();
}
