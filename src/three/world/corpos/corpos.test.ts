// ============================================================
// O ESQUELETO DO PALCO LOCAL (Onda 6, F0 — D1): o contrato do registro
// de corpos resolvidos, o getter que o near consome e a CONTA que torna
// a sobreposição Sol-ator × corpo impossível por construção.
//
// Não instancia Engine nem Director: tudo aqui é o contrato puro do
// módulo — o mesmo precedente de `stellarBody.test.ts`.
// ============================================================
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AU_KM } from '../../../lib/atlas/elementosOrbitais';
import { AU_PARA_PC } from '../../../lib/atlas/frameGalactico';
import { BODY_AXES } from '../../../lib/atlas/iauOrientation';
import {
  DEEP_LIMIAR_PC,
  DISC_VISIBLE_MIN,
  deepDiscFade,
  isDiscGroupVisible,
  psfPointSizePx,
  solWorldFade,
} from '../lodStellar';
import { PONTO_ZERO_SOL_PC, magDoVertice } from '../planetas/planetas';
import { cessaoAlvo } from './terra';
import {
  CORPOS_DEFAULT_ON,
  CUSHION_DO_GATE,
  CorposResolvidos,
  LIMIAR_DO_GATE_PX,
  diametroAparentePx,
  gateBinario,
} from './corpos';

/** raio equatorial de Júpiter em pc, DERIVADO da fonte única (BODY_AXES
 *  em km → UA pelo `AU_KM` → pc pelo `AU_PARA_PC`) — nenhum literal
 *  novo de raio ou de conversão entra neste arquivo. */
const RAIO_JUPITER_PC = (BODY_AXES.jupiter[0] / AU_KM) * AU_PARA_PC;

/** a câmera da casa: fov 58° vertical (engine.ts), tela de 1080 px. */
const FOV_DEG = 58;
const SCREEN_H = 1080;

describe('o contrato do registro (F0)', () => {
  it('nasce vazio, desligado e com o grupo invisível — o Director liga', () => {
    const c = new CorposResolvidos();
    expect(c.tamanho).toBe(0);
    expect(c.group.children).toHaveLength(0);
    expect(c.ligado).toBe(false);
    expect(c.group.visible).toBe(false);
    c.ligado = true;
    expect(c.group.visible).toBe(true);
  });

  it('sem corpo registrado o getter devolve NaN/NaN — o near fica no vigente', () => {
    const c = new CorposResolvidos();
    c.ligado = true;
    const s = c.superficieMaisProxima(new THREE.Vector3(0, 0, 0.0007));
    expect(Number.isNaN(s.dSuperficiePc)).toBe(true);
    expect(Number.isNaN(s.raioPc)).toBe(true);
  });

  it('com um corpo, d é a distância à SUPERFÍCIE (centro menos raio)', () => {
    const c = new CorposResolvidos();
    c.ligado = true;
    c.registrar('earth', 1e-8, new THREE.Vector3(0, 0, 1e-6));
    const s = c.superficieMaisProxima(new THREE.Vector3(0, 0, 0));
    expect(s.dSuperficiePc).toBeCloseTo(1e-6 - 1e-8, 20);
    expect(s.raioPc).toBe(1e-8);
  });

  it('com dois corpos ganha a superfície mais próxima, com o raio DO dono', () => {
    // Terra E Lua simultâneas em quadro (emenda T-E13): o near segue a
    // mais próxima das duas, nunca só o corpo "em foco"
    const c = new CorposResolvidos();
    c.ligado = true;
    c.registrar('earth', 2e-10, new THREE.Vector3(0, 0, 4e-6));
    c.registrar('moon', 5e-11, new THREE.Vector3(0, 0, 1e-6));
    const s = c.superficieMaisProxima(new THREE.Vector3(0, 0, 0));
    expect(s.dSuperficiePc).toBeCloseTo(1e-6 - 5e-11, 20);
    expect(s.raioPc).toBe(5e-11);
  });

  it('câmera DENTRO do corpo devolve d negativo — é o caso que o piso segura', () => {
    const c = new CorposResolvidos();
    c.ligado = true;
    c.registrar('earth', 1e-8, new THREE.Vector3(0, 0, 0));
    const s = c.superficieMaisProxima(new THREE.Vector3(0, 0, 1e-9));
    expect(s.dSuperficiePc).toBeLessThan(0);
    expect(s.raioPc).toBe(1e-8);
  });

  it('camada desligada tira os corpos do QUADRO: getter volta a NaN', () => {
    // é isto que faz o A/B de `?nocorpos` devolver a baseline bit a
    // bit — superfície fora do quadro não governa plano de corte
    const c = new CorposResolvidos();
    c.ligado = true;
    c.registrar('earth', 1e-8, new THREE.Vector3(0, 0, 1e-6));
    c.ligado = false;
    const s = c.superficieMaisProxima(new THREE.Vector3(0, 0, 0));
    expect(Number.isNaN(s.dSuperficiePc)).toBe(true);
    expect(Number.isNaN(s.raioPc)).toBe(true);
  });

  it('mesmo id atualiza em vez de duplicar; a posição registrada é CÓPIA', () => {
    const c = new CorposResolvidos();
    c.ligado = true;
    const pos = new THREE.Vector3(0, 0, 1e-6);
    c.registrar('earth', 1e-8, pos);
    pos.z = 999; // o chamador mexe no rascunho dele — o palco não vê
    c.registrar('earth', 2e-8, new THREE.Vector3(0, 0, 2e-6));
    expect(c.tamanho).toBe(1);
    const s = c.superficieMaisProxima(new THREE.Vector3(0, 0, 0));
    expect(s.dSuperficiePc).toBeCloseTo(2e-6 - 2e-8, 20);
    expect(s.raioPc).toBe(2e-8);
  });

  it('remover devolve o getter a NaN; dispose esvazia o registro', () => {
    const c = new CorposResolvidos();
    c.ligado = true;
    c.registrar('earth', 1e-8, new THREE.Vector3(0, 0, 1e-6));
    c.remover('earth');
    expect(Number.isNaN(c.superficieMaisProxima(new THREE.Vector3()).dSuperficiePc)).toBe(true);
    c.registrar('moon', 1e-8, new THREE.Vector3(0, 0, 1e-6));
    c.dispose();
    expect(c.tamanho).toBe(0);
    expect(Number.isNaN(c.superficieMaisProxima(new THREE.Vector3()).dSuperficiePc)).toBe(true);
  });

  it('raio ou posição envenenados são RECUSADOS alto — defeito de chamador', () => {
    const c = new CorposResolvidos();
    for (const ruim of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => c.registrar('x', ruim, new THREE.Vector3()), String(ruim)).toThrow();
    }
    expect(() => c.registrar('x', 1e-8, new THREE.Vector3(Number.NaN, 0, 0))).toThrow();
    expect(c.tamanho).toBe(0);
  });

  it('o getter reusa a MESMA saída — zero alocação por quadro (M4)', () => {
    const c = new CorposResolvidos();
    const a = c.superficieMaisProxima(new THREE.Vector3());
    const b = c.superficieMaisProxima(new THREE.Vector3(1, 2, 3));
    expect(a).toBe(b);
  });

  it('a chave nasce ligada, como PLANETAS_DEFAULT_ON — ?nocorpos é a volta', () => {
    expect(CORPOS_DEFAULT_ON).toBe(true);
  });
});

describe('Sol-ator × corpo resolvido: impossível POR CONSTRUÇÃO (D1)', () => {
  it('abaixo de 0,02 pc o disco artístico está dissolvido e o grupo dele some', () => {
    // primeira metade da proteção: onde um corpo resolvido PODE ter
    // pixels (a câmera perto), o disco de 2.269 UA nem é submetido
    expect(DISC_VISIBLE_MIN).toBe(0.02);
    for (const d of [0.02, 0.015, 0.005, 1e-4]) {
      expect(deepDiscFade(d), `deepDiscFade(${d})`).toBe(0);
      expect(isDiscGroupVisible(solWorldFade(d)), `grupo em ${d} pc`).toBe(false);
    }
  });

  it('a conta do desenho: Júpiter só teria ≈0,2 px com a câmera a 4,125 UA DELE', () => {
    // o número da onda ("Júpiter ≈ 0,2 px") é o corpo mais largo visto
    // de 4,125 UA — já sub-pixel a 4 UA de distância
    const px = diametroAparentePx(RAIO_JUPITER_PC, 4.125 * AU_PARA_PC, SCREEN_H, FOV_DEG);
    expect(px).toBeGreaterThan(0.2);
    expect(px).toBeLessThan(0.25);
  });

  it('na faixa 0,02–0,05 pc a câmera está MIL vezes mais longe: ≤ ~2e-4 px', () => {
    // segunda metade: com o disco visível (d ≥ 0,02 pc do Sol) a câmera
    // está a ≥ 0,02 pc = 4.125 UA da origem, e todo corpo do retrato
    // orbita a ≤ 40 UA (Plutão, o mais distante, a 35,4 — planetas.ts).
    // O corpo mais largo fica então a ≥ 4.085 UA da câmera:
    const bordaUA = DISC_VISIBLE_MIN / AU_PARA_PC; // 0,02 pc = 4.125,3 UA
    expect(bordaUA).toBeCloseTo(4125.3, 1);
    const dMinUA = bordaUA - 40;
    const px = diametroAparentePx(RAIO_JUPITER_PC, dMinUA * AU_PARA_PC, SCREEN_H, FOV_DEG);
    expect(px).toBeLessThan(1e-3); // três ordens abaixo de um pixel
    // e na borda de fora do crossfade (0,05 pc) é menor ainda
    const px005 = diametroAparentePx(
      RAIO_JUPITER_PC,
      DEEP_LIMIAR_PC - 40 * AU_PARA_PC,
      SCREEN_H,
      FOV_DEG
    );
    expect(px005).toBeLessThan(px);
  });
});

describe('texto-fonte do palco (o relógio é do Director — D2)', () => {
  const FONTE = readFileSync(new URL('./corpos.ts', import.meta.url), 'utf8');

  it('não há relógio nenhum aqui: sem Date, sem performance.now', () => {
    expect(FONTE.includes('Date')).toBe(false);
    expect(FONTE.includes('performance.now')).toBe(false);
  });

  it('nenhum caminho galactocêntrico: o palco mede do Sol na origem', () => {
    // a mesma proibição da camada de planetas (D1 da Onda 4): a volta
    // por 8.150 pc erra a origem em 0,1134 UA medidos
    expect(FONTE.includes('frameGalactico')).toBe(false);
    expect(FONTE.includes('galaxy')).toBe(false);
  });
});

// ============================================================
// F2 (onda do Sol real) — O SOL SOB A LEI DO PALCO.
//
// A lei que era "a régua da Terra" (4 px de diâmetro, cushion 2×) virou a
// régua do palco e passou a julgar TAMBÉM o Sol. O que este bloco prova é
// a ARITMÉTICA que paga a fase: as duas representações do Sol — o corpo de
// raio físico e o disco artístico inflado — têm faixas de atividade a três
// ordens de grandeza uma da outra e NUNCA coexistem em quadro. É por isso
// que as 22 vistas oficiais sobrevivem sem uma medição nova.
// ============================================================
describe('a lei do palco julgando o Sol (F2)', () => {
  const RAIO_SOL_FISICO_PC = (696_340 / AU_KM) * AU_PARA_PC;
  /** o raio artístico de `config.ts` — declarado aqui como o número que é */
  const RAIO_SOL_ARTISTICO_PC = 0.011;
  /**
   * A tela do harness de captura: o buffer EFETIVO das vistas oficiais é
   * 1800×1713 (a janela pedida é 1800×1800; o chrome do headless come 87
   * px de altura, e é o buffer que o md5 carrega — a coluna `@1800x1713`
   * de `ab-identidade.mjs`). Lente de 58° ⇒ 1.545,1 px por radiano.
   */
  const H_HARNESS = 1713;

  /** a que distância (pc) um corpo de raio `r` mede `px` de diâmetro —
   *  a INVERSA exata de `diametroAparentePx`, não a de ângulo pequeno */
  const distanciaParaPx = (r: number, px: number, h: number) =>
    r / Math.tan((px * Math.tan((FOV_DEG * Math.PI) / 180 / 2)) / h);

  it('a lei mudou de casa sem virar cópia: terra.ts reexporta o MESMO símbolo', async () => {
    const daTerra = await import('./terra');
    expect(daTerra.gateBinario).toBe(gateBinario);
    expect(daTerra.LIMIAR_DO_GATE_PX).toBe(LIMIAR_DO_GATE_PX);
    expect(daTerra.CUSHION_DO_GATE).toBe(CUSHION_DO_GATE);
    // e o texto do arquivo velho não guarda uma segunda implementação
    const terraFonte = readFileSync(new URL('./terra.ts', import.meta.url), 'utf8');
    expect(terraFonte).not.toContain('export function gateBinario');
    expect(terraFonte).not.toContain('export const LIMIAR_DO_GATE_PX');
  });

  it('o corpo de raio REAL só arma abaixo de 3,60 UA e desarma acima de 7,19 UA', () => {
    const entraUA = distanciaParaPx(RAIO_SOL_FISICO_PC, LIMIAR_DO_GATE_PX, H_HARNESS) / AU_PARA_PC;
    const saiUA =
      distanciaParaPx(RAIO_SOL_FISICO_PC, LIMIAR_DO_GATE_PX / CUSHION_DO_GATE, H_HARNESS) /
      AU_PARA_PC;
    expect(entraUA).toBeCloseTo(3.6, 1);
    expect(saiUA).toBeCloseTo(7.19, 1);
    // e o gate obedece: armado dentro, desarmado fora, estado preservado no meio
    const px = (dUA: number) =>
      diametroAparentePx(RAIO_SOL_FISICO_PC, dUA * AU_PARA_PC, H_HARNESS, FOV_DEG);
    expect(gateBinario(false, px(3.0))).toBe(true);
    expect(gateBinario(true, px(9.0))).toBe(false);
    expect(gateBinario(true, px(5.0))).toBe(true); // dentro do cushion
    expect(gateBinario(false, px(5.0))).toBe(false); // …e não liga sozinho
  });

  it('A PROVA DA FASE: corpo real e disco artístico nunca coexistem', () => {
    // o disco artístico só existe acima de `DISC_VISIBLE_MIN` do domínio
    // profundo — 0,02 pc = 4.125 UA, onde `deepDiscFade` deixa de ser 0
    const bordaDoDiscoUA = 0.02 / AU_PARA_PC;
    const armaUA = distanciaParaPx(RAIO_SOL_FISICO_PC, LIMIAR_DO_GATE_PX, H_HARNESS) / AU_PARA_PC;
    expect(bordaDoDiscoUA / armaUA).toBeGreaterThan(1000);
    // dito nas duas direções, que é o que o gate faz de verdade:
    // onde o corpo real arma, o disco artístico está DISSOLVIDO…
    expect(deepDiscFade(armaUA * AU_PARA_PC)).toBe(0);
    expect(isDiscGroupVisible(solWorldFade(armaUA * AU_PARA_PC))).toBe(false);
    // …e onde o disco artístico desenha, o corpo real é sub-pixel
    expect(
      diametroAparentePx(RAIO_SOL_FISICO_PC, 0.02, H_HARNESS, FOV_DEG)
    ).toBeLessThan(0.01);
  });

  it('com o raio ARTÍSTICO o gate é INERTE — nunca é ele quem decide', () => {
    // ele só desarmaria além de 8,50 pc (entrada) / 17,0 pc (saída), e o
    // corte duro de custo já apaga o grupo em d ≈ 0,3249 pc: 26× antes.
    const entraPc = distanciaParaPx(RAIO_SOL_ARTISTICO_PC, LIMIAR_DO_GATE_PX, H_HARNESS);
    expect(entraPc).toBeCloseTo(8.5, 1);
    // resolvendo o corte duro na rampa do disco: `world > 0.02`
    let corteDuroPc = 0;
    for (let d = 0.16; d < 0.4; d += 1e-6) {
      if (!isDiscGroupVisible(solWorldFade(d))) { corteDuroPc = d; break; }
    }
    expect(corteDuroPc).toBeCloseTo(0.3249, 3);
    expect(entraPc / corteDuroPc).toBeGreaterThan(26);
    // varredura: em toda a faixa em que o grupo do Sol artístico pode
    // estar visível, o gate está ARMADO — logo o `&&` do Director não
    // muda um único quadro do filme
    for (let d = 1e-4; d < 0.4; d *= 1.05) {
      if (!isDiscGroupVisible(solWorldFade(d))) continue;
      const px = diametroAparentePx(RAIO_SOL_ARTISTICO_PC, d, H_HARNESS, FOV_DEG);
      expect(gateBinario(false, px), `d=${d}`).toBe(true);
    }
  });
});

describe('a fiação do Sol no Director (F2)', () => {
  const DIRECTOR = readFileSync(new URL('../../director.ts', import.meta.url), 'utf8');
  const RAIO_SOL_FISICO_PC = (696_340 / AU_KM) * AU_PARA_PC;
  const H_HARNESS = 1713;

  it('o gate do Sol usa a régua do palco, com o raio da instância', () => {
    expect(DIRECTOR).toContain('this.solArmado = gateBinario(');
    expect(DIRECTOR).toContain('diametroAparentePx(this.solRaioPc, dHome, hPx, cam.fov)');
    expect(DIRECTOR).toMatch(
      /import \{[\s\S]*?\bgateBinario\b[\s\S]*?\} from '\.\/world\/corpos\/corpos'/
    );
  });

  it('o grupo do Sol depende do gate, e o `?nosun` continua mandando', () => {
    expect(DIRECTOR).toContain(
      "this.sun.group.visible = !this.hide.has('nosun') && this.solArmado;"
    );
  });

  it('SABOTAGEM: o palco recusa o Sol INFLADO — ali só entra superfície real', () => {
    // sem esta guarda o near ganharia uma superfície a 0,011 pc da origem
    // e o plano de corte mudaria em toda vista com a câmera além de 1,4 pc
    expect(DIRECTOR).toContain("this.solRaioPc !== WORLD.sunRadius &&");
    expect(DIRECTOR).toContain("this.palco.registrar('sun', this.solRaioPc, ORIGEM)");
    expect(DIRECTOR).toContain("this.palco.remover('sun')");
  });

  it('o registro do Sol acontece ANTES de o near ler o palco', () => {
    // era o defeito herdado da F1: registrado depois do `sun.update`, o
    // clip recebia a superfície do quadro ANTERIOR
    const registro = DIRECTOR.indexOf("this.palco.registrar('sun'");
    const leitura = DIRECTOR.indexOf('this.palco.superficieMaisProxima(');
    expect(registro).toBeGreaterThan(0);
    expect(leitura).toBeGreaterThan(0);
    expect(registro).toBeLessThan(leitura);
  });

  it('o Sol-ponto cede por DOMINÂNCIA, na mesma máquina da Terra', () => {
    // e NÃO por gate binário: cortar o halo no armar do gate apagaria
    // ~25 px de luz para pôr 4 px no lugar — passo para trás na luz
    expect(DIRECTOR).toContain("this.planetas.escreverCessao(");
    expect(DIRECTOR).toContain('cessaoAlvo(');
    expect(DIRECTOR).toContain('solCorpoEmQuadro');
    expect(DIRECTOR).toContain('magDoVertice(PONTO_ZERO_SOL_PC, dHome, 1)');
    // a mesma guarda do palco: corpo inflado nunca é "corpo em quadro"
    expect(DIRECTOR).toContain(
      "this.solRaioPc !== WORLD.sunRadius && this.sun.group.visible;"
    );
  });

  it('a 1 UA o disco AINDA NÃO domina o halo: cessão 0 EXATA', () => {
    // é o que mantém a `solreal1ua` no md5 da F1 — a tela branca de
    // dentro do sistema continua sendo defeito de EXPOSIÇÃO (bastão §5.6),
    // e esta fase não a apaga por acidente
    const dPc = 4.8481e-6; // 1 UA
    const disco = diametroAparentePx(RAIO_SOL_FISICO_PC, dPc, H_HARNESS, FOV_DEG);
    const halo = psfPointSizePx(magDoVertice(PONTO_ZERO_SOL_PC, dPc, 1), 3.5, 0.85, H_HARNESS);
    expect(disco).toBeCloseTo(14.4, 1);
    expect(halo).toBeCloseTo(25.2, 1);
    expect(cessaoAlvo(true, disco, halo)).toBe(0);
    // …e mais perto ela acorda, sem degrau: o cruzamento fica por volta
    // de 0,55 UA, ou seja BEM depois do gate de 3,60 UA
    const perto = 0.4 * 4.8481e-6;
    expect(
      cessaoAlvo(
        true,
        diametroAparentePx(RAIO_SOL_FISICO_PC, perto, H_HARNESS, FOV_DEG),
        psfPointSizePx(magDoVertice(PONTO_ZERO_SOL_PC, perto, 1), 3.5, 0.85, H_HARNESS)
      )
    ).toBeGreaterThan(0);
  });
});
