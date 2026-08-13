// ============================================================
// CAPTURA NO LADDER POR TIER (Onda 6, F8 / D4)
//
//   APP_URL=… node scripts/visual/ladder-tier.mjs
//
// A mesma vista de corpo (`terra`, jd pinado) nos três tiers.
// Reporta: via, md5, memory.textures/geometries, e a largura do
// `map` que o runtime escolheu. Sem rebaseline de oficiais.
// ============================================================
import { abrirSessao, APP_PADRAO } from './chrome.mjs';
import { VISTAS } from './ab-identidade.mjs';

const APP = process.env.APP_URL || APP_PADRAO;
const JANELA = process.env.JANELA || '1800x1800';
const TIERS = ['performance', 'alta', 'cinema'];
const vista = VISTAS.find((v) => v[0] === 'terra')[1].replace(/^\?/, '');

const ping = await fetch(APP).then((r) => r.text()).catch(() => '');
if (!ping.includes('<div id="root"')) throw new Error(`dev server não respondeu em ${APP}`);

const sessao = await abrirSessao({ janela: JANELA, app: APP, prefixo: 'ladder' });
try {
  console.log('tier         via     md5          tex geo  mapPx');
  for (const q of TIERS) {
    const assentou = await sessao.ir(`${vista}&q=${q}`);
    const md5 = await sessao.md5();
    const info = JSON.parse(
      await sessao.js(`JSON.stringify((() => {
        const d = window.__director;
        const st = d.stats && d.stats.memory;
        const tex = d.terra && d.terra.group;
        let mapPx = 0;
        if (tex) {
          for (const m of tex.children) {
            const u = m.material && m.material.uniforms && m.material.uniforms.uMapaDia;
            const img = u && u.value && u.value.image;
            if (img && img.width) mapPx = Math.max(mapPx, img.width);
          }
        }
        return { tex: st ? st.textures : -1, geo: st ? st.geometries : -1, mapPx };
      })())`)
    );
    console.log(
      `${q.padEnd(12)} ${(assentou.via || '?').padEnd(7)} ${md5}  `
        + `${String(info.tex).padStart(3)} ${String(info.geo).padStart(3)}  ${info.mapPx}`
    );
  }
} finally {
  sessao.fechar();
}
