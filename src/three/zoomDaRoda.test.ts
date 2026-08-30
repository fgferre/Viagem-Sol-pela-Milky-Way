// Serve: chão — o mesmo giro vale o mesmo zoom em qualquer navegador, a inércia é forma fechada (não v·dt), e a roda escreve só distância, nunca foco nem degrau
// ============================================================
// O ZOOM DA RODA — bancada. Ela substitui a de `rodaDaEscada.test.ts`,
// que morreu junto com o tradutor roda→degrau (item 73), e cobra o que
// a peça nova promete: o mesmo estalo em qualquer navegador, o sinal, a
// inércia com atrito e zona morta, o passo em LOG (velocidade
// proporcional à distância de graça), e o piso e o teto que não se
// atravessam.
//
// A FIAÇÃO vem por texto-fonte no fim, pelo mesmo método do
// `arrastoDePonteiro.test.ts`: `passive: false`, `preventDefault` antes
// de tudo, o gasto do embalo dentro do tick e — o veredito novo — que a
// roda NÃO toque em foco, alvo nem degrau. É esse último que garante
// "o objeto escolhido nunca troca sozinho" no código e não na intenção.
// ============================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ATRITO_POR_S,
  ESTALO_EM_PX,
  IMPULSO_POR_ESTALO,
  LINHA_EM_PX,
  PASSO_LOG_LONGE,
  PASSO_LOG_PERTO,
  ZONA_MORTA,
  ZoomDaRoda,
  distanciaAposEstalos,
  estalosDoGiro,
  passoDeZoomLog,
  pixelsDaPinca,
  pixelsDoGiro,
} from './zoomDaRoda';

const pixel = (deltaY: number, ctrlKey = false) => ({ deltaY, deltaMode: 0, ctrlKey });
const linha = (deltaY: number) => ({ deltaY, deltaMode: 1, ctrlKey: false });
const pagina = (deltaY: number) => ({ deltaY, deltaMode: 2, ctrlKey: false });
/** a pinça do trackpad de Mac: `wheel` com `ctrlKey` e deltas pequenos */
const pinca = (deltaY: number) => ({ deltaY, deltaMode: 0, ctrlKey: true });

describe('deltaMode — o mesmo gesto vale o mesmo zoom em qualquer navegador', () => {
  it('as três unidades viram pixels, e pixels viram estalos', () => {
    expect(pixelsDoGiro(pixel(100), 900)).toBe(100);
    expect(pixelsDoGiro(linha(3), 900)).toBe(3 * LINHA_EM_PX);
    expect(pixelsDoGiro(pagina(1), 900)).toBe(900);
    // altura de página impossível não vira NaN na conta
    expect(pixelsDoGiro(pagina(1), Number.NaN)).toBe(800);
    expect(pixelsDoGiro({ deltaY: Number.NaN, deltaMode: 0, ctrlKey: false }, 900)).toBe(0);
    // um detente de Chrome/Safari é UM estalo, por definição da régua
    expect(estalosDoGiro(pixel(-100), 900)).toBe(-1);
    expect(estalosDoGiro(pixel(100), 900)).toBe(1);
    // o Firefox manda 3 linhas = 48 px: meio estalo, não meia ordem de
    // grandeza — e zoom contínuo aceita fração
    expect(estalosDoGiro(linha(-3), 900)).toBeCloseTo(-48 / ESTALO_EM_PX, 12);
  });
});

describe('a inércia — impulso, atrito, zona morta', () => {
  it('um estalo anda UM estalo ao todo, e é por isso que o impulso é o atrito', () => {
    // a integral de um impulso `I` sob atrito `F` é `I/F`. Com o 4,0 do
    // doador um detente andaria MEIO estalo, e o passo declarado valeria
    // metade do que diz.
    expect(IMPULSO_POR_ESTALO / ATRITO_POR_S).toBe(1);
    const roda = new ZoomDaRoda();
    roda.girar(pixel(-100));
    let total = 0;
    for (let i = 0; i < 600; i++) total += roda.avancar(1 / 60);
    // ...menos a fatia que a zona morta come, que é `ZONA_MORTA/ATRITO`
    expect(total).toBeLessThan(-1 + ZONA_MORTA / ATRITO_POR_S);
    expect(total).toBeGreaterThan(-1);
    expect(roda.embalando).toBe(false);
  });

  it('e anda o MESMO tanto em qualquer taxa de quadros', () => {
    const andar = (hz: number) => {
      const roda = new ZoomDaRoda();
      roda.girar(pixel(-100));
      let total = 0;
      for (let i = 0; i < hz * 10; i++) total += roda.avancar(1 / hz);
      return total;
    };
    // o que sobra de diferença é só ONDE a zona morta corta o rabo:
    // 0,15% entre 30 e 240 Hz
    expect(Math.abs(andar(30) - andar(240))).toBeLessThan(0.002);
    expect(andar(30)).toBeGreaterThan(-1);
    expect(andar(30)).toBeLessThan(-1 + ZONA_MORTA / ATRITO_POR_S);
  });

  it('...e o `v·dt` do doador NÃO andaria — o número é medido aqui', () => {
    // A DIVERGÊNCIA DECLARADA no commit de 22/08 dizia "93,5% a 60 Hz e
    // 99,9% a 1.000 Hz" e não tinha quem a medisse: a bancada só
    // comparava a forma FECHADA consigo mesma. Agora a variante do
    // doador roda ao lado, com a MESMA zona morta e o MESMO atrito, e o
    // veredito é o número que sai — não o que a mensagem lembrava.
    //
    // A variante é a soma de Riemann pela DIREITA (o doador aplica o
    // atrito e só então anda `v·dt`), e é ela que faz o mesmo gesto
    // andar MENOS na máquina mais lenta.
    const comVezesDt = (hz: number) => {
      let v = IMPULSO_POR_ESTALO;
      let total = 0;
      const dt = 1 / hz;
      for (let i = 0; i < hz * 10 && v !== 0; i++) {
        v *= Math.exp(-ATRITO_POR_S * dt);
        total += v * dt;
        if (Math.abs(v) < ZONA_MORTA) v = 0;
      }
      return total;
    };
    const fechada = (hz: number) => {
      const roda = new ZoomDaRoda();
      roda.girar(pixel(100));
      let total = 0;
      for (let i = 0; i < hz * 10; i++) total += roda.avancar(1 / hz);
      return total;
    };
    // a forma fechada: 0,9877 a 60 Hz e 0,9875 a 1.000 Hz — 0,02% de
    // espalhamento, e o que sobra é a zona morta
    expect(fechada(60)).toBeCloseTo(0.9877, 4);
    expect(fechada(1000)).toBeCloseTo(0.9875, 4);
    // o `v·dt`: 0,9233 a 60 Hz contra 0,9836 a 1.000 Hz — 6,1%, e a 30 Hz
    // (a máquina ruim, que é onde isto importa) 0,8632: 12% a menos de
    // câmera pelo MESMO gesto
    expect(comVezesDt(60)).toBeCloseTo(0.9233, 4);
    expect(comVezesDt(1000)).toBeCloseTo(0.9836, 4);
    expect(comVezesDt(30)).toBeCloseTo(0.8632, 4);
    expect(Math.abs(comVezesDt(1000) - comVezesDt(30))).toBeGreaterThan(0.1);
    expect(Math.abs(fechada(1000) - fechada(30))).toBeLessThan(0.002);
  });

  it('o sinal: roda para cima e pinça abrindo APROXIMAM', () => {
    const roda = new ZoomDaRoda();
    roda.girar(pixel(-100));
    expect(roda.avancar(1 / 60)).toBeLessThan(0);
    const outra = new ZoomDaRoda();
    outra.girar(pixel(100));
    expect(outra.avancar(1 / 60)).toBeGreaterThan(0);
    // a pinça é o MESMO `wheel`, com `ctrlKey` e deltas pequenos: ela
    // soma em fração de estalo, sem limiar nenhum
    const trackpad = new ZoomDaRoda();
    for (let i = 0; i < 4; i++) trackpad.girar(pinca(-12));
    expect(trackpad.avancar(1 / 60)).toBeLessThan(0);
  });

  it('o embalo MORRE sozinho — captura que não assenta é captura que não existe', () => {
    const roda = new ZoomDaRoda();
    roda.girar(pixel(-100));
    let quadros = 0;
    while (roda.embalando && quadros < 600) {
      roda.avancar(1 / 60);
      quadros += 1;
    }
    // meia-vida 87 ms, zona morta 0,1 estalo/s: a partir de 8 estalos/s
    // isso são `ln(80)/8` = 548 ms — 33 quadros a 60 Hz
    expect(quadros).toBeLessThan(40);
    expect(roda.avancar(1 / 60)).toBe(0);
  });

  it('um quadro perdido não inverte o zoom — o atrito é a forma FECHADA', () => {
    // com a aproximação linear `v·(1 − F·dt)` e `dt = 0,25 s` o fator
    // seria −1: a câmera andaria PARA TRÁS num engasgo
    const roda = new ZoomDaRoda();
    roda.girar(pixel(-100));
    expect(roda.avancar(0.25)).toBeLessThan(0);
    expect(1 - ATRITO_POR_S * 0.25).toBeLessThan(0);
  });

  it('esquecer() zera o embalo — sair da fase não deixa zoom guardado', () => {
    const roda = new ZoomDaRoda();
    roda.girar(pixel(-100));
    roda.esquecer();
    expect(roda.embalando).toBe(false);
    expect(roda.avancar(1 / 60)).toBe(0);
  });
});

describe('a PINÇA DE DOIS DEDOS — o gesto que não existia em tela de toque', () => {
  it('afastar os dedos ao DOBRO aproxima a câmera à METADE', () => {
    // a lei é manipulação direta, e o 1:1 é EXATO junto ao piso, onde um
    // estalo vale `PASSO_LOG_PERTO`: meia distância são log10(2) = 0,301
    // década, ou 6,02 estalos, ou 602 px pela régua de `ESTALO_EM_PX`
    expect(pixelsDaPinca(2)).toBeCloseTo(-(ESTALO_EM_PX * Math.log10(2)) / PASSO_LOG_PERTO, 12);
    expect(pixelsDaPinca(2) / ESTALO_EM_PX).toBeCloseTo(-6.0206, 4);
    const meia = distanciaAposEstalos(100, 1, 1e6, pixelsDaPinca(2) / ESTALO_EM_PX);
    // a 100 de uma faixa [1, 1e6] o passo já não é o de perto — o gesto
    // é MAIS forte longe, que é o mesmo tempero da roda
    expect(meia).toBeLessThan(50);
    // ...e junto ao piso ele é a metade exata
    expect(distanciaAposEstalos(1.0001, 1, 1e6, pixelsDaPinca(2) / ESTALO_EM_PX))
      .toBeCloseTo(1, 3);
  });

  it('o sinal e a simetria: aproximar os dedos AFASTA, e ida e volta se cancelam', () => {
    expect(pixelsDaPinca(2)).toBeLessThan(0);
    expect(pixelsDaPinca(0.5)).toBeGreaterThan(0);
    // (`-0`: log10(1) é zero e o sinal negativo da fórmula o carrega —
    // impulso zero é impulso zero, e a velocidade nem se mexe)
    expect(pixelsDaPinca(1)).toBeCloseTo(0, 15);
    // log é aditivo: uma pinça em N passos vale o mesmo que num passo só
    const emUm = pixelsDaPinca(2);
    let emQuatro = 0;
    for (let i = 0; i < 4; i++) emQuatro += pixelsDaPinca(Math.pow(2, 1 / 4));
    expect(emQuatro).toBeCloseTo(emUm, 10);
  });

  it('dedos no mesmo pixel não mandam a câmera para o infinito', () => {
    for (const cru of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(pixelsDaPinca(cru)).toBe(0);
    }
  });

  it('um dono do impulso: `girar` é a casca de `empurrar`', () => {
    const pelaRoda = new ZoomDaRoda();
    pelaRoda.girar(pixel(-100));
    const peloEmpurrao = new ZoomDaRoda();
    peloEmpurrao.empurrar(-100);
    expect(peloEmpurrao.avancar(1 / 60)).toBe(pelaRoda.avancar(1 / 60));
    // e a pinça soma na MESMA velocidade, com o MESMO atrito e a MESMA
    // zona morta — dois donos seriam duas inércias na câmera
    const misto = new ZoomDaRoda();
    misto.girar(pixel(-100));
    misto.empurrar(pixelsDaPinca(2));
    let total = 0;
    for (let i = 0; i < 600 && misto.embalando; i++) total += misto.avancar(1 / 60);
    expect(total).toBeCloseTo((-100 + pixelsDaPinca(2)) / ESTALO_EM_PX, 1);
    expect(misto.embalando).toBe(false);
  });
});

describe('o passo em LOG — velocidade proporcional à distância, de graça', () => {
  it('um estalo vale a MESMA fração da distância em qualquer escala', () => {
    // é isto que o log compra: 0,05 década é 12,2% da distância, seja
    // ela 2 raios da Terra ou 200 UA
    const piso = 1;
    const teto = 1e6;
    for (const d of [1, 100, 1e4, 1e6]) {
      const passo = passoDeZoomLog(d, piso, teto);
      const depois = distanciaAposEstalos(d, piso, teto, -1);
      if (depois <= piso) continue;
      expect(Math.log10(d / depois)).toBeCloseTo(passo, 12);
    }
    expect(Math.pow(10, PASSO_LOG_PERTO) - 1).toBeCloseTo(0.1220, 4);
  });

  it('o passo CRESCE com a distância, do piso ao teto', () => {
    const piso = 1;
    const teto = 1e6;
    expect(passoDeZoomLog(piso, piso, teto)).toBeCloseTo(PASSO_LOG_PERTO, 12);
    expect(passoDeZoomLog(teto, piso, teto)).toBeCloseTo(PASSO_LOG_LONGE, 12);
    expect(passoDeZoomLog(1e3, piso, teto)).toBeCloseTo(
      (PASSO_LOG_PERTO + PASSO_LOG_LONGE) / 2,
      12
    );
    // faixa degenerada não vira NaN nem passo gigante
    expect(passoDeZoomLog(10, 5, 5)).toBe(PASSO_LOG_PERTO);
    expect(passoDeZoomLog(Number.NaN, 1, 10)).toBe(PASSO_LOG_PERTO);
  });

  it('a travessia inteira cabe em dezenas de estalos, não em centenas', () => {
    // a faixa de um corpo escolhido: do piso (2 raios FÍSICOS) ao
    // sistema em quadro. MEDIDO em Saturno pelo `atlas-smoke`: 5,55
    // décadas — a 0,05 fixo seriam 111 estalos; com o passo crescendo
    // do piso ao teto são ~51.
    const piso = 1;
    const teto = Math.pow(10, 5.55);
    let d = piso;
    let estalos = 0;
    while (d < teto * 0.999 && estalos < 1000) {
      d = distanciaAposEstalos(d, piso, teto, 1);
      estalos += 1;
    }
    expect(estalos).toBeGreaterThan(40);
    expect(estalos).toBeLessThan(80);
    expect(5.55 / PASSO_LOG_PERTO).toBeGreaterThan(110);
  });
});

describe('o piso e o teto não se atravessam', () => {
  it('mil estalos para dentro param no piso; mil para fora, no teto', () => {
    const piso = 2;
    const teto = 200;
    let d = 20;
    for (let i = 0; i < 1000; i++) d = distanciaAposEstalos(d, piso, teto, -1);
    expect(d).toBe(piso);
    for (let i = 0; i < 1000; i++) d = distanciaAposEstalos(d, piso, teto, 1);
    expect(d).toBe(teto);
  });

  it('entradas impossíveis não escrevem NaN na câmera', () => {
    expect(distanciaAposEstalos(Number.NaN, 1, 10, -1)).toBeNaN();
    expect(distanciaAposEstalos(5, 0, 10, -1)).toBe(5);
    expect(distanciaAposEstalos(5, 1, 10, Number.NaN)).toBe(5);
  });
});

// ------------------------------------------------------------
// A FIAÇÃO, por texto-fonte
// ------------------------------------------------------------
const DIRECTOR = readFileSync(new URL('./director.ts', import.meta.url), 'utf8');
const GESTOS = readFileSync(new URL('./director/gestos.ts', import.meta.url), 'utf8');
const APP = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

describe('Director — a roda está ligada, e ligada do jeito que funciona', () => {
  it('o listener é do CANVAS e com passive: false — sem isso o preventDefault é recusado', () => {
    expect(GESTOS).toContain(
      "canvas.addEventListener('wheel', onRoda, { passive: false })"
    );
    // e sai no dispose: o HMR do vite recria o Director a cada salvamento
    expect(GESTOS).toContain("canvas.removeEventListener('wheel', onRoda)");
  });

  it('o preventDefault vem ANTES de qualquer decisão', () => {
    const corpo = GESTOS.slice(
      GESTOS.indexOf('const onRoda'),
      GESTOS.indexOf('const onContextMenu')
    );
    expect(corpo).toContain('evento.preventDefault();');
    expect(corpo.indexOf('evento.preventDefault()')).toBeLessThan(
      corpo.indexOf('roda.girar')
    );
  });

  it('a roda escreve DISTÂNCIA e SÓ distância — nem foco, nem alvo, nem degrau', () => {
    // o veredito do item 73 em código: os dois defeitos medidos (a
    // descida indo ao literal `earth`, a subida zerando `focoCorpoId`)
    // não voltam por descuido, porque não há caminho da roda até eles
    const fio = DIRECTOR.slice(
      DIRECTOR.indexOf('      zoom: (estalos) => {'),
      DIRECTOR.indexOf('    // clique curto no voo livre')
    );
    expect(fio).toContain('this.atlas.pinarDistancia(d)');
    expect(fio).not.toContain('focoCorpoId');
    expect(fio).not.toContain('focar');
    expect(fio).not.toContain('Degrau');
    // e a escada não tem mais para onde a roda descer
    expect(DIRECTOR).not.toContain('descerDegrau');
    expect(GESTOS).not.toContain('Degrau');
  });

  it('o embalo é gasto DENTRO do tick, antes de a câmera ser escrita', () => {
    const bloco = DIRECTOR.slice(
      DIRECTOR.indexOf("} else if (this.escritorDeCamera === 'atlas') {"),
      DIRECTOR.indexOf('      // intro/end: deriva lenta contemplativa')
    );
    expect(bloco).toContain('this.gestos?.avancarZoom(dt);');
    expect(bloco.indexOf('avancarZoom')).toBeLessThan(bloco.indexOf('this.atlas.apply'));
  });

  it('a dica conta ao visitante que a roda dá zoom', () => {
    expect(APP).toMatch(/roda — zoom/);
    // ...e em TELA DE TOQUE ela conta o gesto que existe lá: a pinça. O
    // convite do Atlas deixou de ser pulado no `coarse` pela mesma razão
    // — a frase que o pulava ("a roda não existe em tela de toque")
    // deixou de valer no dia em que a pinça passou a existir.
    expect(APP).toMatch(/pinça — zoom/);
    expect(APP).toMatch(/toque duplo — ir/);
    expect(APP).toContain("if (onde === 'voo' && telaDeToque()) return;");
  });

  it('a PINÇA DE DOIS DEDOS está ligada, e o segundo dedo suspende o arrasto', () => {
    // o gesto de toque existe no canvas: dois ponteiros vivos, a razão
    // entre as distâncias, e o MESMO impulso da roda
    expect(GESTOS).toContain('roda.empurrar(pixelsDaPinca(agora / pincaAnterior))');
    // sem esta linha o primeiro dedo continuaria ORBITANDO durante a
    // pinça — a mão inteira anda numa pinça, e o giro sairia de graça
    const abertura = GESTOS.slice(
      GESTOS.indexOf('const onPointerDown'),
      GESTOS.indexOf('const onPointerMove')
    );
    expect(abertura).toContain('arrasto.esquecer();');
    expect(abertura.indexOf('arrasto.esquecer()')).toBeLessThan(
      abertura.indexOf('arrasto.comecar')
    );
    // e o par se desfaz nas DUAS saídas do gesto, senão a primeira razão
    // do gesto seguinte seria medida contra uma distância de outro gesto
    for (const saida of ['const onPointerUp', 'const onPointerCancel']) {
      const corpo = GESTOS.slice(GESTOS.indexOf(saida), GESTOS.indexOf(saida) + 900);
      expect(corpo).toContain('dedos.delete(event.pointerId)');
      expect(corpo).toContain('if (dedos.size < 2) pincaAnterior = 0;');
    }
  });
});

// ============================================================
// A PORTA `?d=` — o espelho da roda (item 73, 22/08). A distância era a
// única grandeza da vista que o link não sabia contar. O que se cobra
// aqui é a FIAÇÃO: que haja UM escritor, UM leitor, e que `?ver=` tenha
// perdido a caneta — duas portas para a mesma grandeza são duas
// verdades (AGENTS §4), e a que sabe menos ganharia na leitura.
// A ida e volta viva é do `atlas-smoke`: entre o escritor e o leitor há
// uma NAVEGAÇÃO, que bancada nenhuma tem.
// ============================================================
const ESPELHO = readFileSync(new URL('../hooks/useEspelhoDaUrl.ts', import.meta.url), 'utf8');
const BOOT = readFileSync(new URL('../hooks/useDirector.ts', import.meta.url), 'utf8');
const SELO = readFileSync(new URL('./selo.ts', import.meta.url), 'utf8');

describe('?d= entra no espelho; ?ver= vira só leitura', () => {
  it('o espelho ESCREVE a distância e APAGA o degrau', () => {
    const escritor = ESPELHO.slice(
      ESPELHO.indexOf('  const urlComMomento = () => {'),
      ESPELHO.indexOf('  const changeQuality')
    );
    expect(escritor).toContain("url.searchParams.set('d', String(Number(emRaios.toPrecision(4))))");
    expect(escritor).toContain("url.searchParams.delete('ver');");
    // ...e não há um segundo caminho que ressuscite a escrita do degrau
    expect(ESPELHO).not.toContain("searchParams.set('ver'");
  });

  it('a porta se declara no REGISTRO do selo, como toda porta da casa', () => {
    expect(SELO).toContain("neutra('d', 'distância ao alvo, em raios dele')");
    // e `?ver=` continua LIDO: é o contrato com todo link já copiado
    expect(SELO).toContain('export function lerPortaVer');
    expect(BOOT).toContain("lerPortaVer(query.get('ver'))");
  });

  it('o leitor vem DEPOIS do alvo — a régua do ?d= é o raio dele', () => {
    const boot = BOOT.slice(BOOT.indexOf("const foco = query.get('foco');"));
    expect(boot).toContain('d.pinarEmRaios(raios);');
    expect(boot.indexOf('lerPortaVer')).toBeLessThan(boot.indexOf('pinarEmRaios'));
    // lixo não vira câmera: a porta avisa e a vista fica no enquadramento
    expect(boot).toContain("console.warn('?d= inválido:'");
  });

  it('o `?d=` do link sobrevive à efeméride que chega tarde', () => {
    const ESCADA = readFileSync(new URL('./director/escada.ts', import.meta.url), 'utf8');
    const tarde = ESCADA.slice(
      ESCADA.indexOf('  reenquadrarAposEfemeride()'),
      ESCADA.indexOf('  pinarEmRaios(')
    );
    expect(tarde).toContain('if (this.pinoDeBoot !== null) this.pinarEmRaios(this.pinoDeBoot);');
    // ...e morre no primeiro gesto: a partir dali quem manda é a mão
    expect(DIRECTOR).toContain('this.escada.esquecerPinoDoLink();');
  });
});
