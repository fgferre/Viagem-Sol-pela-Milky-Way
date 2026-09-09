// Serve: chão — quantos quadros por segundo o dono vê de verdade, não o headless sem vsync
// Custo: 0,3 min
// A RÉGUA DE FLUIDEZ (BACKLOG "Régua de fluidez" / "ARMADILHA DA RÉGUA"): Chrome
// VISÍVEL — o headless não passa pelo compositor do SO nem sofre vsync de
// verdade —, DPR forçado e vsync sempre LIGADO (nunca `--disable-gpu-vsync`:
// sem ele o Chrome enfileira quadros à frente da placa e o fps sai inflado,
// sem bater com o que o dono vê). A janela precisa ficar NA FRENTE: o macOS
// detecta janela ocultada por outra e o Chrome congela o rAF da aba — atrás
// de outra janela a contagem sai zerada ou baixa demais.
//
//   node scripts/visual/fps-real.mjs 't=100' [--seg=6] [--dpr=2] [--janela=1280x720]
import { abrirSessao, APP_PADRAO, dorme } from './chrome.mjs';

const argv = process.argv.slice(2);
const QUERY = (argv.find((a) => !a.startsWith('--')) ?? '').replace(/^\?/, '');
if (!QUERY) {
  process.stderr.write(
    "uso: node scripts/visual/fps-real.mjs 't=100' [--seg=6] [--dpr=2] [--janela=1280x720]\n"
  );
  process.exit(1);
}
const flag = (nome, padrao) => {
  const a = argv.find((x) => x.startsWith(`--${nome}=`));
  return a ? a.slice(nome.length + 3) : padrao;
};
const SEG = Number(flag('seg', '6'));
const DPR = Number(flag('dpr', '2'));
const JANELA = flag('janela', '1280x720');
const APP = process.env.APP_URL || APP_PADRAO;

const sessao = await abrirSessao({
  janela: JANELA, app: APP, dpr: DPR, visivel: true, prefixo: 'fps-real',
});
try {
  await sessao.ir(QUERY); // já espera captura.pronto
  const f0 = await sessao.js('window.__f');
  await dorme(SEG * 1000);
  const f1 = await sessao.js('window.__f');
  const fps = (f1 - f0) / SEG;
  process.stdout.write(`${QUERY}  ${fps.toFixed(1)} fps\n`);
} finally {
  await sessao.fechar();
}
