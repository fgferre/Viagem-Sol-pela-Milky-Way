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
// O QUE SE CONTA (30/09): quadros DESENHADOS pelo director
// (`window.__poeira.quadros`, um por tick), não chamadas de rAF (`__f`): o
// app tem outros laços de rAF (o mapa da cartografia, por exemplo) que
// entram e saem conforme a vista, e contá-los inflou a régua (os "25–31 %
// de custo dos níveis do Gaia" de 30/09 eram esse laço a mais com os
// níveis desligados). Fora do dev server (`__poeira` ausente) cai no `__f`
// e avisa. E `?t=` PARADO congela o raymarch da nebulosa (câmera parada =
// quadro congelado): para medir o custo do gás, passe `--tocar` — o filme
// RETOMA de onde `?t=` o deixou e a câmera anda durante a janela; a saída
// imprime o trecho coberto (t a → b), e é por ele que se confere a medida.
//
//   node scripts/visual/fps-real.mjs 't=100' [--seg=6] [--dpr=2] [--janela=1280x720] [--tocar]
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
const TOCAR = argv.includes('--tocar');
const APP = process.env.APP_URL || APP_PADRAO;

const sessao = await abrirSessao({
  janela: JANELA, app: APP, dpr: DPR, visivel: true, prefixo: 'fps-real',
});
try {
  await sessao.ir(QUERY); // já espera captura.pronto
  if (TOCAR) {
    // RETOMAR, não `play()`: `play()` zera o relógio do filme (`journeyT = 0`)
    // e a janela mediria o começo do filme, não o instante pedido (achado
    // em 01/10 pelo investigador do custo da galáxia). `freezeJourney =
    // false` solta a viagem de onde `?t=` a deixou.
    await sessao.js('window.__director.freezeJourney = false; true');
    await dorme(1500); // o primeiro passo do filme assenta (bake, LUT)
  }
  const temDirector = await sessao.js('typeof window.__poeira?.quadros === "number"');
  if (!temDirector) process.stderr.write('aviso: sem window.__poeira (fora do dev server?) — contando rAF, que inflam\n');
  const contador = temDirector ? 'window.__poeira.quadros' : 'window.__f';
  const f0 = await sessao.js(contador);
  const t0 = TOCAR ? await sessao.js('window.__director.journeyT') : null;
  await dorme(SEG * 1000);
  const f1 = await sessao.js(contador);
  const t1 = TOCAR ? await sessao.js('window.__director.journeyT') : null;
  const fps = (f1 - f0) / SEG;
  // com `--tocar` imprime o trecho do filme que a janela cobriu, para a
  // leitura nunca mais confundir o começo do filme com o instante pedido
  const trecho = TOCAR ? ` (tocando, t ${Number(t0).toFixed(1)} → ${Number(t1).toFixed(1)} s)` : '';
  process.stdout.write(`${QUERY}${trecho}  ${fps.toFixed(1)} fps\n`);
} finally {
  await sessao.fechar();
}
