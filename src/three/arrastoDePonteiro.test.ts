// ============================================================
// OS QUATRO DEFEITOS DE PONTEIRO, um oráculo cada. Todos confirmados
// por auditoria em 2026-08-12 e fechados em 2026-08-13.
//
// O arquivo tem TRÊS camadas, e as três precisam existir:
//
//  1. A MÁQUINA (`ArrastoDePonteiro`) — a decisão pura, sem DOM. É onde
//     as regras moram e onde elas são exercidas nos casos difíceis.
//  2. A FIAÇÃO DO VOO LIVRE — o `FreeRoam` de verdade, construído sobre
//     canvas/window/document de mentira que guardam os listeners. Aqui
//     os eventos são DISPARADOS e quem responde é a CÂMERA: conserto
//     arrancado da máquina OU da fiação derruba estes testes. Sem esta
//     camada, "a máquina está certa" não provaria que alguém a chama.
//  3. A FIAÇÃO DO DIRECTOR, por TEXTO-FONTE. O `Director` pede WebGL de
//     verdade e o runner da casa é `node` — mesmo precedente do
//     `App.test.ts` e da "fiação no director" de `terra.test.ts`: ler a
//     fonte, nunca montar. Cobre o que a camada 2 não alcança (o
//     bloqueio do menu de contexto mora no canvas, no Director).
//
// NENHUM destes consertos toca as 22 vistas oficiais: elas são
// capturadas sem toque, sem botão direito e sem gesto cancelado, e o
// cursor não entra em captura de tela nem ocupa espaço de layout.
// ============================================================
import { readFileSync, readdirSync } from 'node:fs';
import * as THREE from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ArrastoDePonteiro,
  BOTAO_PRINCIPAL,
  CLIQUE_MS,
  CLIQUE_MS_DEDO,
  CLIQUE_PX,
  CLIQUE_PX_DEDO,
  janelaDeClique,
  limiarDeClique,
  zonaMortaDoArrasto,
} from './arrastoDePonteiro';
import type { ToqueDePonteiro } from './arrastoDePonteiro';

/** um evento de ponteiro com o mínimo que a decisão lê */
const toque = (
  pointerId: number,
  clientX: number,
  clientY: number,
  button = BOTAO_PRINCIPAL,
  pointerType?: string
): ToqueDePonteiro => ({ pointerId, button, clientX, clientY, pointerType });

// ------------------------------------------------------------
// 1. A MÁQUINA
// ------------------------------------------------------------
describe('ArrastoDePonteiro — o dono do gesto (defeito 1: multitoque)', () => {
  it('o segundo dedo NÃO move: o passo dele vem null', () => {
    const a = new ArrastoDePonteiro();
    a.comecar(toque(1, 100, 100), 0);
    expect(a.mover(toque(1, 110, 100))).toEqual({ dx: 10, dy: 0 });
    // 200 px de separação × 0,0022 rad/px = 0,44 rad = 25° num evento
    // só, e 25° cabem no grampo de ±70° do Atlas: nada segurava
    expect(a.mover(toque(2, 310, 100))).toBeNull();
  });

  it('e não contamina nem o passo SEGUINTE do dedo dono', () => {
    // a armadilha sutil: bastaria o intruso atualizar a última posição
    // para o próximo dx do dono sair com os 600 px do intruso dentro
    const a = new ArrastoDePonteiro();
    a.comecar(toque(1, 100, 100), 0);
    a.mover(toque(2, 700, 700));
    expect(a.mover(toque(1, 105, 100))).toEqual({ dx: 5, dy: 0 });
  });

  it('o segundo dedo NÃO rearma o relógio do clique curto', () => {
    const a = new ArrastoDePonteiro();
    a.comecar(toque(1, 100, 100), 0);
    a.mover(toque(1, 400, 400)); // 600 px: isto é arrasto, não clique
    // sem o dono, este `comecar` zerava `andou` e `desde` — e o soltar
    // seguinte virava "clique curto", que no Atlas foca outro nome,
    // desce um degrau da escada e reescreve o `?foco=`
    expect(a.comecar(toque(2, 100, 100), 10)).toBe(false);
    expect(a.percorrido).toBe(600);
    expect(a.soltar(toque(1, 400, 400), 20)).toBe(false);
  });

  it('levantar o segundo dedo não encerra o arrasto do primeiro', () => {
    const a = new ArrastoDePonteiro();
    a.comecar(toque(1, 100, 100), 0);
    expect(a.soltar(toque(2, 100, 100), 10)).toBe(false);
    expect(a.ativo).toBe(true);
    expect(a.mover(toque(1, 130, 100))).toEqual({ dx: 30, dy: 0 });
  });

  it('só o dono encerra — e depois dele o gesto acabou para todos', () => {
    const a = new ArrastoDePonteiro();
    a.comecar(toque(1, 100, 100), 0);
    expect(a.soltar(toque(1, 100, 100), 10)).toBe(true);
    expect(a.ativo).toBe(false);
    expect(a.mover(toque(1, 900, 900))).toBeNull();
  });
});

describe('ArrastoDePonteiro — gesto cancelado (defeito 2)', () => {
  it('cancelar encerra: o ponteiro solto para de girar a cena', () => {
    const a = new ArrastoDePonteiro();
    a.comecar(toque(1, 100, 100), 0);
    expect(a.cancelar(toque(1, 100, 100))).toBe(true);
    expect(a.ativo).toBe(false);
    // sem este tratador o `pointerup` NUNCA chegava (gesto do iOS, palma
    // rejeitada, janela trocada com o botão preso) e a cena seguia
    // girando com o ponteiro solto até a página ser recarregada
    expect(a.mover(toque(1, 900, 900))).toBeNull();
  });

  it('cancelar NÃO é clique: gesto abortado pelo sistema não foca nada', () => {
    const a = new ArrastoDePonteiro();
    a.comecar(toque(1, 100, 100), 0);
    a.cancelar(toque(1, 100, 100)); // curto no espaço e no tempo…
    // …e mesmo assim o `soltar` que vier depois não devolve clique:
    // não há mais dono, e o cancelar já consumiu o gesto
    expect(a.soltar(toque(1, 100, 100), 1)).toBe(false);
  });

  it('cancelamento de OUTRO ponteiro não mata o gesto do dono', () => {
    const a = new ArrastoDePonteiro();
    a.comecar(toque(1, 100, 100), 0);
    expect(a.cancelar(toque(2, 100, 100))).toBe(false);
    expect(a.ativo).toBe(true);
  });

  it('esquecer larga o gesto sem evento — troca de modo, teardown, HMR', () => {
    const a = new ArrastoDePonteiro();
    a.comecar(toque(1, 100, 100), 0);
    a.esquecer();
    expect(a.ativo).toBe(false);
    expect(a.mover(toque(1, 900, 900))).toBeNull();
  });
});

describe('ArrastoDePonteiro — botão principal (defeito 3)', () => {
  it('o botão direito não abre gesto nenhum', () => {
    const a = new ArrastoDePonteiro();
    expect(a.comecar(toque(1, 100, 100, 2), 0)).toBe(false);
    expect(a.ativo).toBe(false);
    expect(a.mover(toque(1, 400, 100))).toBeNull();
  });

  it('nem o do meio, nem os dois laterais', () => {
    for (const botao of [1, 3, 4]) {
      const a = new ArrastoDePonteiro();
      expect(a.comecar(toque(1, 0, 0, botao), 0), `botão ${botao}`).toBe(false);
    }
  });

  it('o principal (mouse esquerdo, toque e caneta em contato) abre', () => {
    const a = new ArrastoDePonteiro();
    expect(a.comecar(toque(1, 0, 0, BOTAO_PRINCIPAL), 0)).toBe(true);
  });
});

describe('ArrastoDePonteiro — o clique curto continua o de sempre', () => {
  it('curto no espaço E no tempo', () => {
    const a = new ArrastoDePonteiro();
    a.comecar(toque(1, 100, 100), 1000);
    a.mover(toque(1, 102, 101)); // 3 px < 6
    expect(a.soltar(toque(1, 102, 101), 1000 + CLIQUE_MS - 1)).toBe(true);
  });

  it('andou demais: é arrasto', () => {
    const a = new ArrastoDePonteiro();
    a.comecar(toque(1, 100, 100), 0);
    a.mover(toque(1, 100 + CLIQUE_PX, 100));
    expect(a.soltar(toque(1, 100 + CLIQUE_PX, 100), 1)).toBe(false);
  });

  it('demorou demais: é segurar', () => {
    const a = new ArrastoDePonteiro();
    a.comecar(toque(1, 100, 100), 0);
    expect(a.soltar(toque(1, 100, 100), CLIQUE_MS)).toBe(false);
  });

  it('os limiares são os dois de sempre — 6 px e 400 ms', () => {
    expect(CLIQUE_PX).toBe(6);
    expect(CLIQUE_MS).toBe(400);
  });

  it('...mas o DEDO não é o mouse: 16 px de quarteirão e 500 ms', () => {
    // 6 px é tolerância de MÃO SOBRE BOTÃO; um dedo apoia e escorrega
    // muito mais que isso, e com a régua de mouse tocar num nome no
    // telefone virava arrasto — o céu não respondia ao toque. 16 são os
    // 8 px de `touchSlop` do Chrome em CADA eixo, na régua de
    // quarteirão que esta classe usa; 500 ms é o long-press das DUAS
    // plataformas (Android e iOS), e 400 é o número do mouse.
    expect(limiarDeClique('touch')).toBe(CLIQUE_PX_DEDO);
    expect(janelaDeClique('touch')).toBe(CLIQUE_MS_DEDO);
    expect(CLIQUE_PX_DEDO).toBe(16);
    expect(CLIQUE_MS_DEDO).toBe(500);
    // mouse, caneta e evento sem tipo ficam com os de sempre — a caneta
    // apoia numa ponta, como o mouse num botão
    for (const tipo of ['mouse', 'pen', undefined]) {
      expect(limiarDeClique(tipo)).toBe(CLIQUE_PX);
      expect(janelaDeClique(tipo)).toBe(CLIQUE_MS);
    }

    // e os limiares são os do GESTO: quem decide é o `pointerType` do
    // `pointerdown`, guardado no dono
    const dedo = new ArrastoDePonteiro();
    dedo.comecar(toque(1, 100, 100, BOTAO_PRINCIPAL, 'touch'), 0);
    dedo.mover(toque(1, 106, 106, BOTAO_PRINCIPAL, 'touch')); // 12 de quarteirão
    expect(dedo.soltar(toque(1, 106, 106, BOTAO_PRINCIPAL, 'touch'), CLIQUE_MS)).toBe(true);
    // o MESMO gesto com o mouse é arrasto, e continua sendo
    const mouse = new ArrastoDePonteiro();
    mouse.comecar(toque(1, 100, 100), 0);
    mouse.mover(toque(1, 106, 106));
    expect(mouse.soltar(toque(1, 106, 106), 1)).toBe(false);
    // 16 já é arrasto até para o dedo — o limiar é estrito nos dois
    const longe = new ArrastoDePonteiro();
    longe.comecar(toque(1, 100, 100, BOTAO_PRINCIPAL, 'touch'), 0);
    longe.mover(toque(1, 100 + CLIQUE_PX_DEDO, 100, BOTAO_PRINCIPAL, 'touch'));
    expect(longe.soltar(toque(1, 116, 100, BOTAO_PRINCIPAL, 'touch'), 1)).toBe(false);
    // ...e 500 ms já é segurar
    const demorou = new ArrastoDePonteiro();
    demorou.comecar(toque(1, 100, 100, BOTAO_PRINCIPAL, 'touch'), 0);
    expect(demorou.soltar(toque(1, 100, 100, BOTAO_PRINCIPAL, 'touch'), CLIQUE_MS_DEDO))
      .toBe(false);
  });

  it('A ZONA MORTA DO DEDO: enquanto é toque, a cena não anda', () => {
    // MEDIDO a 390×844 em 2026-08-23: sem ela, 12 px de tremor de dedo
    // arrastavam os rótulos até 21,5 px na tela ANTES de a soltura
    // decidir que aquilo era um toque — o dedo pousava num nome e
    // soltava em cima de outro. Escolher o objeto errado é pior que não
    // escolher.
    expect(zonaMortaDoArrasto('touch')).toBe(CLIQUE_PX_DEDO);
    // e ela é SÓ do dedo: o mouse não treme sobre o botão, e uma zona
    // morta ali seria mudança de tato na mesa sem defeito que a peça
    for (const tipo of ['mouse', 'pen', undefined]) expect(zonaMortaDoArrasto(tipo)).toBe(0);

    const dedo = new ArrastoDePonteiro();
    dedo.comecar(toque(1, 100, 100, BOTAO_PRINCIPAL, 'touch'), 0);
    // dentro da zona morta: o percurso conta, o passo não sai
    expect(dedo.mover(toque(1, 104, 104, BOTAO_PRINCIPAL, 'touch'))).toBeNull(); // 8
    expect(dedo.mover(toque(1, 106, 106, BOTAO_PRINCIPAL, 'touch'))).toBeNull(); // 12
    expect(dedo.percorrido).toBe(12);
    // o passo que ATRAVESSA a zona morta sai inteiro, e o que ela comeu
    // é descartado — o trecho abaixo do limiar pertence ao TOQUE
    expect(dedo.mover(toque(1, 116, 106, BOTAO_PRINCIPAL, 'touch'))).toEqual({ dx: 10, dy: 0 });
    expect(dedo.soltar(toque(1, 116, 106, BOTAO_PRINCIPAL, 'touch'), 1)).toBe(false);
    // no MOUSE o primeiro pixel já move a cena, como sempre moveu
    const mouse = new ArrastoDePonteiro();
    mouse.comecar(toque(1, 100, 100), 0);
    expect(mouse.mover(toque(1, 101, 100))).toEqual({ dx: 1, dy: 0 });
  });
});

// ------------------------------------------------------------
// 2. A FIAÇÃO DO VOO LIVRE — eventos de verdade, câmera de verdade
// ------------------------------------------------------------

/** alvo de eventos de mentira: guarda os listeners e os dispara */
class Barramento {
  private ouvintes = new Map<string, Set<(e: unknown) => void>>();
  addEventListener(tipo: string, fn: (e: unknown) => void) {
    let s = this.ouvintes.get(tipo);
    if (!s) this.ouvintes.set(tipo, (s = new Set()));
    s.add(fn);
  }
  removeEventListener(tipo: string, fn: (e: unknown) => void) {
    this.ouvintes.get(tipo)?.delete(fn);
  }
  /** quantos ouvintes deste tipo — é como se confere o `dispose` */
  quantos(tipo: string): number {
    return this.ouvintes.get(tipo)?.size ?? 0;
  }
  emitir(tipo: string, evento: unknown) {
    for (const fn of [...(this.ouvintes.get(tipo) ?? [])]) fn(evento);
  }
}

const janela = Object.assign(new Barramento(), {
  // `world/galaxy.ts` lê `window.location.search` NO TOPO do módulo (os
  // knobs de `?tune=`) — mesmo stub de `cameraRig.test.ts`. Busca vazia
  // é o que o app carrega sem parâmetro nenhum.
  location: { search: '' },
  // 1000×800 para o clique curto cair em (0,5 · 0,5) com números redondos
  innerWidth: 1000,
  innerHeight: 800,
});
const documento = Object.assign(new Barramento(), { pointerLockElement: null });
Object.assign(globalThis, { window: janela, document: documento });

// dinâmico: import estático é içado e rodaria ANTES dos stubs acima
const { FreeRoam } = await import('./cinematic/cameraRig');

type Rig = InstanceType<typeof FreeRoam>;

/**
 * Toda bancada viva. Os listeners do rig moram na `janela` COMPARTILHADA
 * (é o que o `FreeRoam` faz no app), então uma bancada que sobrevivesse
 * ao próprio teste ouviria os eventos do teste seguinte — e um oráculo
 * que depende de quem está ouvindo não é oráculo.
 */
const bancadas: Rig[] = [];
afterEach(() => {
  while (bancadas.length) bancadas.pop()?.dispose();
});

/**
 * Voo livre pronto para receber eventos: câmera parada, sem visita, sem
 * tecla, com o slerp de entrada JÁ dissolvido (`snapCanonical`). Assim o
 * único movimento possível da câmera entre dois `update` é o que o
 * ponteiro mandar — qualquer giro medido abaixo é do gesto, e só dele.
 */
function bancada() {
  const canvas = new Barramento();
  const cam = new THREE.PerspectiveCamera(50, 1.6, 0.1, 1000);
  cam.position.set(10, 0, 0);
  const rig = new FreeRoam(canvas as unknown as HTMLCanvasElement, cam);
  bancadas.push(rig);
  rig.enabled = true;
  rig.syncFromCamera();
  rig.snapCanonical();
  const toques: [number, number][] = [];
  rig.onTap = (x, y) => toques.push([x, y]);
  /** para onde a câmera olha depois de aplicar um quadro */
  const mira = () => {
    rig.update(1 / 60);
    return cam.getWorldDirection(new THREE.Vector3());
  };
  return {
    rig,
    toques,
    mira,
    down: (e: ToqueDePonteiro) => canvas.emitir('pointerdown', e),
    move: (e: ToqueDePonteiro) => janela.emitir('pointermove', e),
    up: (e: ToqueDePonteiro) => janela.emitir('pointerup', e),
    cancel: (e: ToqueDePonteiro) => janela.emitir('pointercancel', e),
    perdeuCaptura: (e: ToqueDePonteiro) => janela.emitir('lostpointercapture', e),
  };
}

/**
 * A MIRA NÃO SE MEXEU — bit a bit, não "quase". Com o gesto filtrado,
 * `update` recomputa a orientação dos MESMOS yaw/pitch, da MESMA
 * posição: o resultado tem de ser o double idêntico. Um `angleTo` com
 * tolerância aceitaria erro de arredondamento como "não girou", e é
 * justamente aí que um filtro meio feito se esconderia.
 */
const imovel = (a: THREE.Vector3, b: THREE.Vector3) =>
  Object.is(a.x, b.x) && Object.is(a.y, b.y) && Object.is(a.z, b.z);

/** o ganho do olhar, o de sempre: 0,0022 rad por pixel (`girar()`) */
const RAD_POR_PX = 0.0022;

/**
 * O ORÁCULO DO GIRO, fechado. A câmera da bancada nasce em (10,0,0)
 * olhando para −Z, então no referencial galáctico o pitch dela é
 * asin(−Nz) — Nz é a componente do polo galáctico, os mesmos três
 * literais do `cameraRig.ts`, normalizados como lá.
 *
 * Um giro de YAW de Δ nessa latitude não abre Δ na esfera: abre
 * acos(cos²p·cosΔ + sin²p), que a pequenos ângulos vale Δ·cos(p) ≈
 * 0,890·Δ e já foge disso em 8e-5 rad aos 100 px. Por isso a conta vai
 * inteira, e não pela aproximação linear.
 *
 * Medir o valor EXATO (a 5e-10 rad), e não só "girou alguma coisa", é o
 * que prova que os 200 px do intruso não vazaram NEM PARCIALMENTE para
 * dentro do passo do dono — um filtro meio feito passaria por um
 * `toBeGreaterThan`.
 */
const POLO_Z = 0.4559837762 / Math.hypot(-0.867666149, -0.1980763734, 0.4559837762);
const SEN2_PITCH = POLO_Z ** 2;
const giroDe = (px: number) =>
  Math.acos(
    THREE.MathUtils.clamp(
      (1 - SEN2_PITCH) * Math.cos(px * RAD_POR_PX) + SEN2_PITCH,
      -1,
      1
    )
  );

describe('FreeRoam — a fiação: dois dedos não trocam o enquadramento', () => {
  it('o pointermove do 2º dedo gira ZERO (antes: 0,44 rad num evento só)', () => {
    const b = bancada();
    b.down(toque(1, 500, 400));
    const inicio = b.mira();
    b.move(toque(1, 510, 400)); // o dono gira: 10 px × 0,0022 = 0,022 rad
    const doDono = b.mira();
    expect(inicio.angleTo(doDono)).toBeCloseTo(giroDe(10), 9);
    b.move(toque(2, 710, 400)); // o intruso, 200 px ao lado
    expect(imovel(doDono, b.mira())).toBe(true);
  });

  it('o 2º dedo pousando e saindo não dispara visita nenhuma', () => {
    const b = bancada();
    b.down(toque(1, 100, 100));
    b.move(toque(1, 400, 400)); // 600 px de arrasto: ninguém clicou
    b.down(toque(2, 100, 100));
    b.up(toque(2, 100, 100));
    // sem o dono, `andou` e `desde` tinham acabado de ser zerados pelo
    // 2º dedo, e este `up` virava clique curto → mini-viagem sem pedido
    expect(b.toques).toEqual([]);
  });

  it('e o dedo que ficou continua arrastando depois disso', () => {
    const b = bancada();
    b.down(toque(1, 100, 100));
    b.down(toque(2, 700, 700));
    b.up(toque(2, 700, 700)); // antes: matava o arrasto do dedo 1
    const antes = b.mira();
    b.move(toque(1, 200, 100));
    expect(antes.angleTo(b.mira())).toBeCloseTo(giroDe(100), 9);
  });
});

describe('FreeRoam — a fiação: gesto cancelado não fica preso', () => {
  it('pointercancel encerra: o ponteiro solto para de girar a cena', () => {
    const b = bancada();
    b.down(toque(1, 500, 400));
    const antes = b.mira();
    b.move(toque(1, 520, 400));
    const girado = b.mira();
    expect(antes.angleTo(girado)).toBeCloseTo(giroDe(20), 9);
    b.cancel(toque(1, 520, 400));
    b.move(toque(1, 900, 400)); // 380 px com o ponteiro solto
    expect(imovel(girado, b.mira())).toBe(true);
  });

  it('lostpointercapture faz o mesmo — é o único aviso do toque com captura implícita', () => {
    const b = bancada();
    b.down(toque(1, 500, 400));
    const antes = b.mira();
    b.perdeuCaptura(toque(1, 500, 400));
    b.move(toque(1, 900, 400));
    expect(imovel(antes, b.mira())).toBe(true);
  });

  it('gesto cancelado não vira clique curto', () => {
    const b = bancada();
    b.down(toque(1, 500, 400));
    b.cancel(toque(1, 500, 400));
    b.up(toque(1, 500, 400));
    expect(b.toques).toEqual([]);
  });
});

describe('FreeRoam — a fiação: só o botão principal voa', () => {
  it('arrastar com o botão direito não gira a cena', () => {
    const b = bancada();
    b.down(toque(1, 100, 100, 2));
    const antes = b.mira();
    b.move(toque(1, 400, 100)); // 300 px com o direito apertado
    expect(imovel(antes, b.mira())).toBe(true);
  });

  it('e soltar o direito não dispara visita', () => {
    const b = bancada();
    b.down(toque(1, 100, 100, 2));
    b.up(toque(1, 100, 100, 2));
    expect(b.toques).toEqual([]);
  });

  it('o esquerdo continua girando como sempre', () => {
    const b = bancada();
    b.down(toque(1, 500, 400));
    const antes = b.mira();
    b.move(toque(1, 600, 400));
    expect(antes.angleTo(b.mira())).toBeCloseTo(giroDe(100), 9);
  });

  it('e o clique curto do esquerdo continua virando visita', () => {
    const b = bancada();
    b.down(toque(1, 500, 400));
    b.up(toque(1, 500, 400));
    // a mira vai em FRAÇÃO de tela: 500/1000 e 400/800
    expect(b.toques).toEqual([[0.5, 0.5]]);
  });
});

describe('FreeRoam — o teardown leva TODOS os listeners do gesto', () => {
  it('as duas saídas novas saem no dispose (o HMR do vite chama isto por salvamento)', () => {
    const antesCancel = janela.quantos('pointercancel');
    const antesPerda = janela.quantos('lostpointercapture');
    const b = bancada();
    expect(janela.quantos('pointercancel')).toBe(antesCancel + 1);
    expect(janela.quantos('lostpointercapture')).toBe(antesPerda + 1);
    b.rig.dispose();
    expect(janela.quantos('pointercancel')).toBe(antesCancel);
    expect(janela.quantos('lostpointercapture')).toBe(antesPerda);
  });
});

// ------------------------------------------------------------
// 3. A FIAÇÃO DO DIRECTOR (e o cursor), por texto-fonte
// ------------------------------------------------------------
const DIRECTOR = readFileSync(new URL('./director.ts', import.meta.url), 'utf8');
// o corte 6 da Parte 1 moveu os gestos do canvas para o módulo próprio —
// os pinos da fiação seguem o código, e o fio de volta se pina no DIRECTOR
const GESTOS = readFileSync(
  new URL('./director/gestos.ts', import.meta.url),
  'utf8'
);
const RIG = readFileSync(new URL('./cinematic/cameraRig.ts', import.meta.url), 'utf8');
const APP = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const HUD_DIR = new URL('../hud/', import.meta.url);
const CSS = readdirSync(HUD_DIR)
  .sort()
  .map((fatia) => readFileSync(new URL(fatia, HUD_DIR), 'utf8'))
  .join('\n');

describe('Director — o gesto do Atlas/pausar-e-olhar usa a MESMA máquina', () => {
  it('os dois gestos da casa importam uma máquina só', () => {
    // os gestos trazem junto o `limiarDeClique`: a imobilidade do PAR de
    // cliques é o MESMO limiar do clique curto, e ele tem um endereço só
    // — e desde 2026-08-23 esse endereço responde ao `pointerType`, para
    // que a régua de mão sobre botão (6 px) não seja aplicada ao dedo
    expect(GESTOS).toContain(
      "import { ArrastoDePonteiro, limiarDeClique } from '../arrastoDePonteiro'"
    );
    expect(GESTOS).toContain('limiarDeClique(event.pointerType)');
    expect(GESTOS).not.toMatch(/const IMOVEL_PX\b/);
    expect(RIG).toContain("import { ArrastoDePonteiro } from '../arrastoDePonteiro'");
    // e nenhum dos dois guarda mais o estado do gesto por conta própria
    expect(RIG).not.toMatch(/private dragging|private dragMoved|private downAt/);
    // os campos soltos do Director morreram — só o texto dos comentários
    // ainda os cita, para quem vier ler por que eles não existem mais
    expect(DIRECTOR).not.toMatch(/this\.pause(Dragging|LastX|LastY|Desde|Arrasto)/);
  });

  it('o delta NÃO é mais calculado à mão contra a última posição', () => {
    // era esta subtração — cega a qual dedo estava do outro lado dela —
    // que dava os 25° de giro num evento só
    expect(GESTOS).not.toMatch(/clientX - this\.pause/);
    expect(GESTOS).toContain('arrasto.mover(event)');
    expect(GESTOS).toContain('if (!passo) return;');
    // e o passo FILTRADO é o que chega aos dois consumidores do gesto —
    // a órbita do Atlas e o olhar da viagem congelada. Sem este pino,
    // um `mover` chamado e depois ignorado passaria pelos de cima.
    // (Onda 7: o passo chega INTEIRO — o `dy` era calculado e jogado
    // fora, e era esse descarte que deixava o Atlas com um eixo só)
    expect(GESTOS).toContain('fios.orbitar(passo.dx, passo.dy)');
    expect(GESTOS).toContain('fios.olhar(passo.dx, passo.dy)');
    // e o DIRECTOR liga os fios nos dois consumidores de sempre
    expect(DIRECTOR).toContain('this.atlas.addOrbitDelta(dx, dy)');
    expect(DIRECTOR).toContain('this.rig.addLookDelta(dx, dy)');
  });

  it('down e up passam pela máquina (botão principal e dono do gesto)', () => {
    expect(GESTOS).toContain('arrasto.comecar(event, performance.now())');
    // o `agora` do soltar é o MESMO relógio do par de cliques (item 73):
    // uma leitura só de `performance.now()` decide "foi curto?" e "foi o
    // segundo de um duplo?" — duas leituras dariam duas verdades
    expect(GESTOS).toContain('const agora = performance.now();');
    expect(GESTOS).toContain('arrasto.soltar(event, agora)');
    // o clique curto só existe se o `soltar` disser que houve
    expect(GESTOS).toMatch(/if \(!curto \|\| !fios\.noAtlas\(\)\) return;/);
  });

  it('as DUAS saídas de gesto cancelado estão registradas e caem no cancelar', () => {
    for (const tipo of ['pointercancel', 'lostpointercapture']) {
      expect(GESTOS).toContain(`window.addEventListener('${tipo}', onPointerCancel)`);
      expect(GESTOS).toContain(`window.removeEventListener('${tipo}', onPointerCancel)`);
    }
    expect(GESTOS).toContain('arrasto.cancelar(event)');
    // o gesto vivo não sobrevive ao próprio Director (HMR do vite)
    expect(GESTOS).toContain('arrasto.esquecer()');
  });

  it('o menu do sistema não abre sobre o canvas — e sai no teardown', () => {
    expect(GESTOS).toContain("canvas.addEventListener('contextmenu', onContextMenu)");
    expect(GESTOS).toMatch(
      /onContextMenu = \(event: MouseEvent\) => \{\s*event\.preventDefault\(\);/
    );
    expect(GESTOS).toContain("canvas.removeEventListener('contextmenu', onContextMenu)");
  });

  it('o bloqueio é do CANVAS, não da janela — o HUD mantém o menu normal', () => {
    expect(GESTOS).not.toContain("window.addEventListener('contextmenu'");
    // e é UM dono só: dois `preventDefault` no mesmo canvas seriam a
    // mesma decisão escrita em dois lugares
    expect(RIG).not.toContain('contextmenu');
  });
});

describe('o cursor de agarrar (defeito 4) chega ao canvas', () => {
  it('a classe sai do arrastoFazAlgo, e `scene-canvas` continua intacta', () => {
    expect(APP).toContain("import { HUD_POR_FASE, arrastoFazAlgo } from './three/fases'");
    expect(APP).toContain(
      "className={`scene-canvas${arrastoFazAlgo(phase, paused) ? ' arrastavel' : ''}`}"
    );
    // `.bare-mode > *:not(.scene-canvas)` (o ?shot=2) e o `voo-smoke`
    // procuram por esta classe: ela tem de continuar existindo inteira
    expect(CSS).toContain('.bare-mode > *:not(.scene-canvas)');
  });

  it('o CSS diz agarrar em repouso e agarrando durante o gesto', () => {
    expect(CSS).toMatch(/\.scene-canvas\.arrastavel \{\s*cursor: grab;/);
    expect(CSS).toMatch(/\.scene-canvas\.arrastavel:active \{\s*cursor: grabbing;/);
  });

  it('e o canvas continua sem gesto nativo do navegador por cima', () => {
    // `touch-action: none` é o que entrega o `pointermove` do dedo em vez
    // de o navegador rolar a página com ele — o filtro por pointerId só
    // vale se esses eventos chegarem
    expect(CSS).toMatch(/\.scene-canvas \{[^}]*touch-action: none;/);
  });
});
