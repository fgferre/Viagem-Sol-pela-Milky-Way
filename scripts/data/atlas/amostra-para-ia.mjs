// A AMOSTRA QUE VAI À IA (item 148) — o mapa real com o hemisfério nunca
// fotografado tapado em tom liso, no tamanho pedido. É o que o dono sobe ao
// ChatGPT para que a imagem devolvida (o mapa inteiro, sem montagem) entre
// como fonte local em `baixa-texturas.mjs` (`arquivoLocal`). Fica aqui para
// a receita ser reproduzível: a decisão de "o que é vazio" mora em
// `preencherVazioSemDado` (lib-texturas.mjs), medida no item 147.
//
//   node scripts/data/atlas/amostra-para-ia.mjs <mapa.jpg> <saida.jpg> [largura]
//
// Amostras usadas em 03/09/2026: Miranda do mapa NASA 3D (1440); Ariel,
// Umbriel, Titânia e Oberon dos mosaicos de Schenk (LPI 2020) na resolução
// nativa (3652, 918, 1722, 956); Tritão do mapa NASA/LPI PIA18668 em 4096.
import sharp from 'sharp';
import { preencherVazioSemDado } from './lib-texturas.mjs';

const [origem, destino, larguraTexto] = process.argv.slice(2);
if (!origem || !destino) {
  console.error('uso: amostra-para-ia.mjs <mapa.jpg> <saida.jpg> [largura]');
  process.exit(1);
}
let entrada = sharp(origem, { limitInputPixels: false }).removeAlpha();
if (larguraTexto) {
  const largura = Number(larguraTexto);
  entrada = entrada.resize(largura, largura / 2, { fit: 'fill', kernel: 'lanczos3' });
}
const { data, info } = await entrada.raw().toBuffer({ resolveWithObject: true });
// a janela do vazio cresce com a resolução: 7 texels em 1440 px
const raio = Math.max(7, Math.round((7 * info.width) / 1440));
const conta = preencherVazioSemDado(data, info.width, info.height, info.channels, { raio });
await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true })
  .toFile(destino);
console.log(
  `${destino}: ${info.width}x${info.height}, ${((100 * conta.semDado) / (info.width * info.height)).toFixed(1)} % sem dado ` +
    `tapado com o tom ${conta.tom.join('/')}.`
);
