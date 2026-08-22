// ============================================================
// A RODA DA ESCADA — bancada. As três coisas que decidiam se o gesto
// funcionava ou não (a varredura da auditoria achou as três ausentes):
// normalizar `deltaMode`, reconhecer a PINÇA pelo `ctrlKey` e travar o
// EMBALO do trackpad. Cada uma tem prova aqui, e a fiação (o
// `passive: false`, o `preventDefault`, os dois consumidores no
// Director) é cobrada por texto-fonte no fim — é o mesmo método do
// `arrastoDePonteiro.test.ts`, e é o que pega um listener registrado
// com a opção errada, que não é coisa que um teste de unidade veja.
// ============================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ESQUECIMENTO_MS,
  LIMIAR_DO_DEGRAU_PX,
  LINHA_EM_PX,
  RodaDaEscada,
  TRAVA_DO_DEGRAU_MS,
  deltaEmPixels,
} from './rodaDaEscada';

const pixel = (deltaY: number, ctrlKey = false) => ({ deltaY, deltaMode: 0, ctrlKey });
const linha = (deltaY: number) => ({ deltaY, deltaMode: 1, ctrlKey: false });
const pagina = (deltaY: number) => ({ deltaY, deltaMode: 2, ctrlKey: false });
/** a pinça do trackpad de Mac: `wheel` com `ctrlKey` e deltas pequenos */
const pinca = (deltaY: number) => ({ deltaY, deltaMode: 0, ctrlKey: true });

describe('deltaMode — o mesmo estalo vale o mesmo degrau em qualquer navegador', () => {
  it('as três unidades viram pixels', () => {
    expect(deltaEmPixels(pixel(100), 900)).toBe(100);
    expect(deltaEmPixels(linha(3), 900)).toBe(3 * LINHA_EM_PX);
    expect(deltaEmPixels(pagina(1), 900)).toBe(900);
    // altura de página impossível não vira NaN na conta do limiar
    expect(deltaEmPixels(pagina(1), Number.NaN)).toBe(800);
    expect(deltaEmPixels({ deltaY: Number.NaN, deltaMode: 0, ctrlKey: false }, 900)).toBe(0);
  });

  it('UM estalo é UM degrau nos dois navegadores — e é daí que o limiar sai', () => {
    // Chrome/Safari: 100 px em modo pixel. Firefox: 3 linhas = 48 px.
    // O limiar tem de caber nos DOIS, senão o Firefox precisaria de dois
    // estalos para o mesmo degrau que o Chrome dá com um.
    expect(LIMIAR_DO_DEGRAU_PX).toBeLessThanOrEqual(100);
    expect(LIMIAR_DO_DEGRAU_PX).toBeLessThanOrEqual(3 * LINHA_EM_PX);
    const chrome = new RodaDaEscada();
    expect(chrome.girar(pixel(-100), 0)).toBe(-1);
    const firefox = new RodaDaEscada();
    expect(firefox.girar(linha(-3), 0)).toBe(-1);
  });
});

describe('o sentido, e a pinça', () => {
  it('roda para cima e pinça abrindo APROXIMAM (−1); para baixo AFASTAM (+1)', () => {
    const roda = new RodaDaEscada();
    expect(roda.girar(pixel(-100), 0)).toBe(-1);
    expect(roda.girar(pixel(100), 1000)).toBe(1);
    const trackpad = new RodaDaEscada();
    // a pinça chega em muitos eventos pequenos: soma até o limiar
    expect(trackpad.girar(pinca(-12), 0)).toBe(0);
    expect(trackpad.girar(pinca(-12), 16)).toBe(0);
    expect(trackpad.girar(pinca(-12), 32)).toBe(0);
    expect(trackpad.girar(pinca(-12), 48)).toBe(-1);
  });
});

describe('a TRAVA — um empurrão de trackpad não desce a escada inteira', () => {
  it('o embalo depois do degrau é engolido, e não ressuscita quando a trava abre', () => {
    const roda = new RodaDaEscada();
    // o dedo: quatro eventos de 30 px somam 120 e dão UM degrau no
    // terceiro (90 ≥ 40 já no segundo, na verdade)
    expect(roda.girar(pixel(-30), 0)).toBe(0);
    expect(roda.girar(pixel(-30), 16)).toBe(-1);
    // o EMBALO: o sistema segue mandando eventos por centenas de ms
    let embalo = 0;
    for (let t = 32; t < TRAVA_DO_DEGRAU_MS; t += 16) {
      if (roda.girar(pixel(-60), t) !== 0) embalo += 1;
    }
    expect(embalo).toBe(0);
    // ...e quando a trava abre, o que foi engolido NÃO volta: o primeiro
    // evento depois dela recomeça do zero e não completa degrau sozinho
    expect(roda.girar(pixel(-30), TRAVA_DO_DEGRAU_MS + 1)).toBe(0);
  });

  it('um empurrão longo de 600 ms dá 2 degraus, não 20', () => {
    const roda = new RodaDaEscada();
    let degraus = 0;
    for (let t = 0; t <= 600; t += 16) {
      if (roda.girar(pixel(-80), t) !== 0) degraus += 1;
    }
    // 600 ms / 300 ms de trava = 2 janelas
    expect(degraus).toBe(2);
  });
});

describe('o acumulador não guarda o que não é gesto', () => {
  it('trocar de sentido no meio zera o que estava somado', () => {
    const roda = new RodaDaEscada();
    expect(roda.girar(pixel(-30), 0)).toBe(0);
    // 30 para baixo NÃO cancela para 0 nem completa nada: recomeça
    expect(roda.girar(pixel(30), 16)).toBe(0);
    expect(roda.girar(pixel(30), 32)).toBe(1);
  });

  it('gesto abandonado é esquecido — 20 px de ontem não somam com os de hoje', () => {
    const roda = new RodaDaEscada();
    expect(roda.girar(pixel(-30), 0)).toBe(0);
    expect(roda.girar(pixel(-30), ESQUECIMENTO_MS + 1)).toBe(0);
    expect(roda.girar(pixel(-30), ESQUECIMENTO_MS + 17)).toBe(-1);
  });

  it('esquecer() zera tudo — sair da fase não deixa meio empurrão guardado', () => {
    const roda = new RodaDaEscada();
    roda.girar(pixel(-30), 0);
    roda.esquecer();
    expect(roda.girar(pixel(-30), 16)).toBe(0);
  });
});

// ------------------------------------------------------------
// A FIAÇÃO, por texto-fonte
// ------------------------------------------------------------
const DIRECTOR = readFileSync(new URL('./director.ts', import.meta.url), 'utf8');
const GESTOS = readFileSync(
  new URL('./director/gestos.ts', import.meta.url),
  'utf8'
);
const APP = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

describe('Director — a roda está ligada, e ligada do jeito que funciona', () => {
  it('o listener é do CANVAS e com passive: false — sem isso o preventDefault é recusado', () => {
    expect(GESTOS).toContain(
      "canvas.addEventListener('wheel', onRoda, { passive: false })"
    );
    // e sai no dispose: o HMR do vite recria o Director a cada salvamento
    expect(GESTOS).toContain("canvas.removeEventListener('wheel', onRoda)");
  });

  it('o preventDefault vem ANTES da decisão de degrau', () => {
    const corpo = GESTOS.slice(
      GESTOS.indexOf('const onRoda'),
      GESTOS.indexOf('const onContextMenu')
    );
    expect(corpo).toContain('evento.preventDefault();');
    expect(corpo.indexOf('evento.preventDefault()')).toBeLessThan(
      corpo.indexOf('roda.girar')
    );
    // os dois consumidores, e a escada é a de sempre (nada de zoom novo)
    expect(corpo).toContain('fios.descerDegrau()');
    expect(corpo).toContain('fios.subirDegrau()');
    // e o DIRECTOR liga os fios na escada de sempre
    expect(DIRECTOR).toContain('descerDegrau: () => this.descerDegrau()');
    expect(DIRECTOR).toContain('subirDegrau: () => this.subirDegrau()');
  });

  it('a dica conta ao visitante que a roda existe', () => {
    // O VERBO saiu do trilho em 22/08 (item 73): a dica deixou de
    // prometer degrau porque a roda vai deixar de dar degrau. O que esta
    // prova cobra continua sendo o que ela sempre cobrou — que a linha do
    // rodapé NOMEIE a roda —, sem pinar qual gesto ela executa.
    expect(APP).toMatch(/roda —/);
  });
});
