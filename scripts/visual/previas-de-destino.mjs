// Serve: dono — uma imagem-prévia por destino da busca (cartão da lista)
// Custo: ~0,3 min por destino (15 capturas de Chrome, uma por vez)
//
// Lote 6 · Prévias (PLAN-UI.md §3.4, bullet "Prévias"): cada cartão da
// busca ganha uma miniatura carregada só com a caixa aberta e vazia
// (`loading="lazy"`; some sem quebrar o cartão se a imagem falhar). A
// imagem é sempre uma CAPTURA DO PRÓPRIO APP rodando — nunca gerada por
// IA, nunca uma textura equiretangular usada como "foto" da estrela.
// Corpo/anéis inteiros no quadro para planetas e luas; a estrela no
// contexto do céu do Atlas para os alvos estelares e o centro galáctico.
//
// Orçamento: ≤ 40 KB por arquivo, ≤ 480 KB no total (15 arquivos).
//
//   node scripts/visual/previas-de-destino.mjs             # todos
//   node scripts/visual/previas-de-destino.mjs earth mars  # só estes (reajustar enquadramento)
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { capturarCDP, APP_PADRAO } from './chrome.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = resolve(ROOT, 'public/previas');
const APP = process.env.APP_URL || APP_PADRAO;

const LIMITE_ARQUIVO = 40 * 1024;
const LIMITE_TOTAL = 480 * 1024;

// O instante fixo do céu — o mesmo `jd` de ab-identidade.mjs, para as
// prévias serem reproduzíveis entre corridas.
const CINEMA = 'q=cinema&shot=2&jd=2460409.26395835';

// A tabela dos destinos: `d` é a distância de câmera em raios do
// corpo (só planetas/luas, `ver=corpo`); estrelas e o centro galáctico
// dispensam ver/d porque a vista é o céu ao redor do alvo, e não o
// corpo dele. Números aqui para reajustar o enquadramento sem mexer no
// resto do script. O `d` dos corpos é também a distância de CHEGADA do
// cartão (`raios` em `src/lib/destinosDaBusca.ts`): mexeu aqui, mexa lá.
const DESTINOS = [
  { id: 'earth', foco: 'earth', ver: 'corpo', d: 4 },
  { id: 'moon', foco: 'moon', ver: 'corpo', d: 4 },
  { id: 'mars', foco: 'mars', ver: 'corpo', d: 4 },
  // d=10: o disco ainda tem tamanho de planeta e a órbita de Io cabe na
  // largura; em d=14 Júpiter virava uma bolinha de gude (visto na 1ª rodada).
  { id: 'jupiter', foco: 'jupiter', ver: 'corpo', d: 10 },
  { id: 'saturn', foco: 'saturn', ver: 'corpo' },
  { id: 'pluto', foco: 'pluto', ver: 'corpo', d: 5 },
  { id: 'sirius', foco: 'sirius' },
  { id: 'betelgeuse', foco: 'betelgeuse' },
  { id: 'rigil-kentaurus', foco: 'rigil kentaurus' },
  // O PRIMEIRO SISTEMA PLANETÁRIO (12/11/2026): os sete na chegada
  { id: 'trappist-1', foco: 'TRAPPIST-1' },
  // O BURACO NEGRO NO CENTRO DA GALÁXIA: a vista de perto do cartão
  // (disco laranja e sombra escura), como o visitante chega.
  { id: 'sagittarius-a', foco: 'sagittarius-a', ver: 'corpo' },
  // OS LUGARES DO CÉU (céu profundo, 12/11/2026): a vista de chegada de
  // cada um, pelo mesmo `?foco=` do cartão — o enquadramento é do lugar
  { id: 'via-lactea', foco: 'via-lactea' },
  { id: 'nosso-lugar', foco: 'nosso-lugar' },
  { id: 'pleiades', foco: 'pleiades' },
  { id: 'hyades', foco: 'hyades' },
  { id: 'ana-de-sagitario', foco: 'ana-de-sagitario' },
  // AS VIZINHAS (pilar 3, 12/11/2026): a chegada de cada uma
  { id: 'grande-nuvem-de-magalhaes', foco: 'grande-nuvem-de-magalhaes' },
  { id: 'andromeda', foco: 'andromeda' },
  // A PRIMEIRA SONDA (pilar 4, 12/11/2026): a chegada dela, o Sol de um
  // lado e a sonda do outro
  { id: 'voyager-1', foco: 'voyager-1' },
  // O PRIMEIRO COMETA (pilar 4, 12/11/2026): Halley no quadro de chegada
  { id: 'halley', foco: 'halley' },
];

function urlDoDestino({ foco, ver, d, consulta }) {
  if (consulta) return `${APP}/?${consulta}`;
  const partes = ['atlas=1', `foco=${encodeURIComponent(foco)}`];
  if (ver) partes.push(`ver=${ver}`);
  if (d) partes.push(`d=${d}`);
  partes.push(CINEMA);
  return `${APP}/?${partes.join('&')}`;
}

// Recorte central 640×400 de uma captura 800×500, em WebP. Começa em
// qualidade 78 e desce de 6 em 6 (piso 60) até caber no orçamento por
// arquivo.
async function paraWebp(png) {
  let qualidade = 78;
  const recorta = (q) => sharp(png)
    .extract({ left: 80, top: 50, width: 640, height: 400 })
    .webp({ quality: q })
    .toBuffer();
  let buf = await recorta(qualidade);
  while (buf.length > LIMITE_ARQUIVO && qualidade > 60) {
    qualidade -= 6;
    buf = await recorta(qualidade);
  }
  return { buf, qualidade };
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const pedidos = process.argv.slice(2);
  const lista = pedidos.length
    ? DESTINOS.filter((d) => pedidos.includes(d.id))
    : DESTINOS;
  if (pedidos.length && lista.length === 0) {
    throw new Error(`nenhum id reconhecido em: ${pedidos.join(', ')}`);
  }

  // `porta` é a porta de depuração remota do Chrome que capturarCDP
  // sobe sozinho — nada a ver com a porta 5173 do dev server, que já
  // está ocupada por ele. Um Chrome novo por destino, porta nova a
  // cada captura (padrão de rodada.mjs/sky-capture.mjs), evita a trava
  // conhecida de reaproveitar aba/porta entre capturas.
  let porta = 9900 + (process.pid % 100);
  let total = 0;
  let falhou = false;

  for (const destino of lista) {
    process.stdout.write(`${destino.id}: `);
    try {
      const { png, via, ms } = await capturarCDP({
        url: urlDoDestino(destino), largura: 800, altura: 500, dpr: 1, porta: porta++,
      });
      const { buf, qualidade } = await paraWebp(png);
      writeFileSync(resolve(OUT, `${destino.id}.webp`), buf);
      total += buf.length;
      const kb = (buf.length / 1024).toFixed(1);
      const acima = buf.length > LIMITE_ARQUIVO;
      if (acima) falhou = true;
      process.stdout.write(
        `via=${via} em ${(ms / 1000).toFixed(1)}s · q=${qualidade} · ${kb} kB`
        + `${acima ? ' ACIMA DO LIMITE' : ''}\n`
      );
    } catch (erro) {
      falhou = true;
      process.stdout.write(`FALHOU — ${erro.message}\n`);
    }
  }

  const totalAcima = total > LIMITE_TOTAL;
  if (totalAcima) falhou = true;
  process.stdout.write(`\ntotal: ${(total / 1024).toFixed(1)} kB${totalAcima ? ' ACIMA DO LIMITE' : ''}\n`);
  process.exit(falhou ? 1 : 0);
}

main();
