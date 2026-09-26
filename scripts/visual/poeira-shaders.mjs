// Serve: chão — cada combinação de gás/poeira compila no shader e desenha algo, não uma tela preta
// Custo: 0,4 min (medido 26/09, as 4 combinações, Chrome novo por captura)
//
// Onda E2: o bloco de poeira do Gaia perto do Sol entra pela mesma
// gaveta de gás volumétrico (`?gas=`, `?poeira=`). Este juiz NÃO mede
// composição nem exatidão física — só que a combinação COMPILA (nenhum
// erro de shader/GL no console) e DESENHA algo (a foto não sai
// praticamente preta). Roda contra o `vite` já aberto em 5173; não
// sobe nem mata nada.
//
//   node scripts/visual/poeira-shaders.mjs
import sharp from 'sharp';
import { capturarCDP, APP_PADRAO } from './chrome.mjs';

const APP = process.env.APP_URL || APP_PADRAO;

// cada combinação em cinema/shot=2/t=60, 640×360, DPR 1 — só a prova
// de compilação, não uma vista de composição.
const COMBINACOES = [
  'gas=macio&poeira=0',
  'gas=macio&poeira=1',
  'gas=fino&poeira=1',
  'gas=macio&poeira=teste',
];

const ERRO_DE_SHADER = /THREE\.WebGLProgram|Shader Error|Uncaught|GL_INVALID|Program Info Log/i;
const LUMINANCIA_MINIMA = 2; // /255 — abaixo disso a foto é praticamente preta

async function main() {
  // `porta` é a porta de depuração remota do Chrome que capturarCDP
  // sobe sozinho — nada a ver com a 5173 do vite, ocupada por ele.
  // Chrome novo a cada captura, porta nova a cada captura (padrão de
  // previas-de-destino.mjs/sky-capture.mjs).
  let porta = 9700 + (process.pid % 100);
  let falhou = false;

  for (const combinacao of COMBINACOES) {
    process.stdout.write(`${combinacao}: `);
    try {
      const url = `${APP}/?${combinacao}&q=cinema&shot=2&t=60`;
      const { png, linhas } = await capturarCDP({
        url, largura: 640, altura: 360, dpr: 1, porta: porta++,
        coletar: ERRO_DE_SHADER,
      });
      const erro = linhas.length ? linhas.join(' | ') : null;
      const { channels } = await sharp(png).stats();
      const luminancia = channels.slice(0, 3).reduce((soma, c) => soma + c.mean, 0) / 3;
      const pretaDemais = luminancia < LUMINANCIA_MINIMA;

      if (erro) {
        falhou = true;
        process.stdout.write(`FALHA — erro de shader/GL no console: ${erro}\n`);
      } else if (pretaDemais) {
        falhou = true;
        process.stdout.write(
          `FALHA — tela praticamente preta (luminância ${luminancia.toFixed(2)}/255)\n`
        );
      } else {
        process.stdout.write(`ok — luminância ${luminancia.toFixed(2)}/255\n`);
      }
    } catch (e) {
      falhou = true;
      process.stdout.write(`FALHA — ${e.message}\n`);
    }
  }

  process.exit(falhou ? 1 : 0);
}

main();
