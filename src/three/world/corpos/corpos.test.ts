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
import { LIMIAR_SISTEMA_SOLAR_PC, RAIO_ARTISTICO_DO_SOL_PC } from '../../escala';
import { deepPointGain, filtroSolarAlvo, heroDominanceFade, sunStarGain } from '../lodStellar';
import { psfPointSizePx } from '../../luzDaCasa';
import { PONTO_ZERO_SOL_PC, magDoVertice } from '../planetas/planetas';
import { CESSAO_PELO_GATE_MULT, cessaoAlvo, cessaoPeloGate } from './terra';
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

describe('Sol-ator × corpo resolvido: o conflito que a F3 dissolveu (D1)', () => {
  it('não há mais Sol-ator: dentro do sistema solar quem desenha o Sol é o PONTO', () => {
    // A F0 tinha de PROVAR que o disco de 2.269 UA e um corpo resolvido
    // nunca dividiam quadro, porque os dois eram desenháveis. A F3
    // apagou o disco: onde um corpo resolvido pode ter pixels, o Sol é
    // ou o próprio corpo (raio físico, régua do palco) ou o ponto
    // fotométrico — nunca uma esfera de 4.125 UA por cima.
    for (const d of [0.02, 0.015, 0.005, 1e-4]) {
      expect(Object.is(deepPointGain(d), 1), `ponto em ${d} pc`).toBe(true);
      expect(Object.is(sunStarGain(d), 0), `clarão em ${d} pc`).toBe(true);
    }
  });

  it('a conta do desenho: Júpiter só teria ≈0,2 px com a câmera a 4,125 UA DELE', () => {
    // o número da onda ("Júpiter ≈ 0,2 px") é o corpo mais largo visto
    // de 4,125 UA — já sub-pixel a 4 UA de distância
    const px = diametroAparentePx(RAIO_JUPITER_PC, 4.125 * AU_PARA_PC, SCREEN_H, FOV_DEG);
    expect(px).toBeGreaterThan(0.2);
    expect(px).toBeLessThan(0.25);
  });

  it('na janela de entrega a câmera está MIL vezes mais longe: ≤ ~2e-4 px', () => {
    // a mesma conta continua valendo, agora sobre a janela de ENTREGA
    // ponto↔clarão: entrando nela (d ≥ 0,02 pc do Sol) a câmera está a
    // ≥ 4.125 UA da origem, e todo corpo do retrato orbita a ≤ 40 UA
    // (Plutão, o mais distante, a 35,4 — planetas.ts). O corpo mais
    // largo fica então a ≥ 4.085 UA da câmera:
    const bordaUA = 0.02 / AU_PARA_PC; // 0,02 pc = 4.125,3 UA
    expect(bordaUA).toBeCloseTo(4125.3, 1);
    const dMinUA = bordaUA - 40;
    const px = diametroAparentePx(RAIO_JUPITER_PC, dMinUA * AU_PARA_PC, SCREEN_H, FOV_DEG);
    expect(px).toBeLessThan(1e-3); // três ordens abaixo de um pixel
    // e na borda de fora do crossfade (0,05 pc) é menor ainda
    const px005 = diametroAparentePx(
      RAIO_JUPITER_PC,
      LIMIAR_SISTEMA_SOLAR_PC - 40 * AU_PARA_PC,
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

  it('A PROVA DA F2, mantida como registro: as duas faixas nunca se cruzavam', () => {
    // o disco artístico só existia acima de 0,02 pc = 4.125 UA, e o
    // corpo real só arma abaixo de 3,60 UA — 1.147× de separação. Foi
    // por causa desta distância que o gate do palco pôde entrar na F2
    // sem custar um pixel; a F3 apagou a faixa de cima e o gate virou o
    // único juiz do grupo do Sol.
    const bordaDoDiscoUA = 0.02 / AU_PARA_PC;
    const armaUA = distanciaParaPx(RAIO_SOL_FISICO_PC, LIMIAR_DO_GATE_PX, H_HARNESS) / AU_PARA_PC;
    expect(armaUA).toBeCloseTo(3.6, 1);
    expect(bordaDoDiscoUA / armaUA).toBeGreaterThan(1000);
    // e onde o disco artístico desenhava, o corpo real é sub-pixel
    expect(
      diametroAparentePx(RAIO_SOL_FISICO_PC, 0.02, H_HARNESS, FOV_DEG)
    ).toBeLessThan(0.01);
  });

  it('o raio ARTÍSTICO saiu da cena: nenhum caminho de runtime o constrói', () => {
    // com ele, este gate era INERTE — só desarmaria além de 8,50 pc,
    // 26× depois do corte duro de custo que já apagava o grupo. Era essa
    // inércia que pagava a F2. Hoje o número existe só como lápide, e a
    // guarda que importa é que ninguém o use para desenhar.
    const entraPc = distanciaParaPx(RAIO_ARTISTICO_DO_SOL_PC, LIMIAR_DO_GATE_PX, H_HARNESS);
    expect(entraPc).toBeCloseTo(8.5, 1);
    expect(RAIO_SOL_ARTISTICO_PC).toBe(RAIO_ARTISTICO_DO_SOL_PC);
    const stellarBody = readFileSync(new URL('../stellarBody.ts', import.meta.url), 'utf8');
    expect(stellarBody).toContain('radiusPc: RAIO_DO_SOL_NA_CENA,');
    expect(stellarBody).not.toMatch(/radiusPc:\s*(WORLD\.sunRadius|0\.011)/);
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

  it('o palco recebe o Sol com o raio FÍSICO, e só quando ele está em quadro', () => {
    // a guarda `solRaioPc !== WORLD.sunRadius` da F2 saiu na F3 porque
    // saiu o caso que ela recusava (o corpo inflado). A doutrina do
    // palco — ali só entra superfície real — passou a valer por
    // construção: só existe um raio, e ele é o de verdade.
    expect(DIRECTOR).toContain('private readonly solRaioPc = RAIO_DO_SOL_NA_CENA;');
    expect(DIRECTOR).toContain("if (this.solArmado && !this.hide.has('nosun')) {");
    expect(DIRECTOR).toContain("this.palco.registrar('sun', this.solRaioPc, ORIGEM)");
    expect(DIRECTOR).toContain("this.palco.remover('sun')");
    // e a porta que escolhia o raio morreu junto
    expect(DIRECTOR).not.toContain("this.debug.has('solreal')");
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
    // e "corpo em quadro" é agora só a decisão do gate do palco
    expect(DIRECTOR).toContain('const solCorpoEmQuadro = this.sun.group.visible;');
  });

  it('a MESMA régua guia o filtro solar da fotosfera (F2)', () => {
    // as duas trocas do Sol leem o MESMO número: no trecho em que o ponto
    // cede ao corpo, o corpo troca a radiância verdadeira pela paleta
    // autorada. O halo virou SÍMBOLO para as duas leis lerem a mesma
    // medida; se cada uma calculasse a sua, poderiam divergir sem ninguém
    // ver. A RAMPA, essa, é própria do filtro desde 15/08 — ver o teste
    // seguinte, que mede o que a diferença vale.
    expect(DIRECTOR).toContain('const solHaloPx = this.stars');
    expect(DIRECTOR).toContain('cessaoAlvo(solCorpoEmQuadro, solDiscoPx, solHaloPx)');
    expect(DIRECTOR).toContain('this.sun.escreverFiltroSolar(');
    expect(DIRECTOR).toContain(
      'filtroSolarAlvo(solHaloPx > 0 ? solDiscoPx / solHaloPx : 0)'
    );
    // e a rampa é IMPORTADA de onde ela mora, não recopiada no Director
    expect(DIRECTOR).toMatch(
      /import \{[\s\S]*?\bfiltroSolarAlvo\b[\s\S]*?\} from '\.\/world\/lodStellar'/
    );
    // a 0,027 UA — a distância em que a F2 crua entregou 100% branco — o
    // disco domina com folga (r = 19) ⇒ g = 0 EXATO: a superfície autorada
    // de volta. A borda de CIMA não se moveu com o alargamento.
    const perto = 0.027 * 4.8481e-6;
    const discoPerto = diametroAparentePx(RAIO_SOL_FISICO_PC, perto, H_HARNESS, FOV_DEG);
    const haloPerto = psfPointSizePx(
      magDoVertice(PONTO_ZERO_SOL_PC, perto, 1),
      3.5,
      0.85,
      H_HARNESS
    );
    expect(discoPerto / haloPerto).toBeCloseTo(19.038, 3);
    expect(Object.is(filtroSolarAlvo(discoPerto / haloPerto), 0)).toBe(true);
  });

  it('A RAMPA DO FILTRO ALCANÇA 1 UA — e é o conserto, não o efeito colateral', () => {
    // ORÁCULO REESCRITO em 15/08. Ele cobrava `1 − heroDominanceFade` = 1
    // EXATO aqui, com o argumento de que "o filtro NÃO apaga a vista que a
    // F1 aprovou". O argumento caiu com o voo de ida e volta: a 1 UA o
    // disco mede 0,572 do halo, e com a rampa velha (1 → 2,5) isso era
    // radiância verdadeira PLENA — a troca inteira ficava espremida entre
    // 0,562 e 0,219 UA, e o voo pegou 60% dela num degrau só (0,232 →
    // 0,341 UA). A rampa nova começa em 0,4, ou seja em 1,446 UA, e por
    // isso ESTA distância deixa de ser branco puro de propósito.
    const dPc = 4.8481e-6;
    const disco = diametroAparentePx(RAIO_SOL_FISICO_PC, dPc, H_HARNESS, FOV_DEG);
    const halo = psfPointSizePx(magDoVertice(PONTO_ZERO_SOL_PC, dPc, 1), 3.5, 0.85, H_HARNESS);
    expect(disco / halo).toBeCloseTo(0.5719, 4);
    // o valor NOVO, derivado: g = 1 − smoothstep(−ln2,5, ln2,5, ln 0,5719)
    expect(filtroSolarAlvo(disco / halo)).toBeCloseTo(0.9006, 4);
    // e o que ele custa em luz: o filtro é EXPOENTE (`pow(fator, g)`) sobre
    // uma razão de 26,09 magnitudes, então 0,0994 de rampa são 2,59 mag —
    // a `solreal1ua` escurece esse tanto, e escurecer ali é a direção que o
    // item 3 pede, não o preço dela
    expect((1 - filtroSolarAlvo(disco / halo)) * 26.09).toBeCloseTo(2.592, 3);
    // a lei ANTIGA, transcrita, para a diferença ser medida e não afirmada
    expect(1 - heroDominanceFade(disco / halo)).toBe(1);
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

describe('a cessão pelo gate (padrão desde 15/08; ?bcede= é o caminho de volta)', () => {
  const DIRECTOR = readFileSync(new URL('../../director.ts', import.meta.url), 'utf8');
  const RAIO_SOL_FISICO_PC = (696_340 / AU_KM) * AU_PARA_PC;
  const H_HARNESS = 1713;

  it('fora de quadro, mult 0 ou diâmetro envenenado ⇒ 0 EXATO', () => {
    expect(cessaoPeloGate(false, 500, 1)).toBe(0);
    expect(cessaoPeloGate(true, 40, 0)).toBe(0);
    expect(cessaoPeloGate(true, 40, Number.NaN)).toBe(0);
    expect(cessaoPeloGate(true, Number.NaN, 1)).toBe(0);
  });

  it('o MULTIPLICADOR PADRÃO é 1 — a rampa começa no próprio gate do palco', () => {
    // 1 não é um número escolhido: é dizer que não há deslocamento nenhum
    // sobre o limiar que o palco já usa para decidir se o corpo existe na
    // tela. Qualquer outro valor seria uma segunda régua para o mesmo gate.
    expect(CESSAO_PELO_GATE_MULT).toBe(1);
    expect(cessaoPeloGate(true, LIMIAR_DO_GATE_PX, CESSAO_PELO_GATE_MULT)).toBe(0);
  });

  it('no armar do gate (4 px, mult 1) a cessão é 0 EXATO — sem pop na fronteira', () => {
    // é o que separa esta âncora do corte binário que o comentário do
    // Director proíbe: armar o gate NÃO muda o ponto em nada
    expect(cessaoPeloGate(true, LIMIAR_DO_GATE_PX, 1)).toBe(0);
    // e abaixo do gate (corpo desarmado ⇒ fora de quadro) também é 0
    expect(cessaoPeloGate(false, LIMIAR_DO_GATE_PX / CUSHION_DO_GATE, 1)).toBe(0);
  });

  it('com a bola a 2,5 gates (10 px) a cessão é 1 EXATO — a bola assumiu', () => {
    expect(cessaoPeloGate(true, 2.5 * LIMIAR_DO_GATE_PX, 1)).toBe(1);
  });

  it('a 1 UA, com mult 1, o ponto cede INTEIRO — a bola de 14,4 px aparece', () => {
    const dPc = 4.8481e-6; // 1 UA
    const disco = diametroAparentePx(RAIO_SOL_FISICO_PC, dPc, H_HARNESS, FOV_DEG);
    expect(disco).toBeCloseTo(14.4, 1);
    expect(cessaoPeloGate(true, disco, 1)).toBe(1);
  });

  it('monotônica na bola, e o multiplicador empurra a rampa inteira', () => {
    let anterior = 0;
    for (let px = LIMIAR_DO_GATE_PX; px <= 12; px += 0.05) {
      const v = cessaoPeloGate(true, px, 1);
      expect(v).toBeGreaterThanOrEqual(anterior);
      anterior = v;
    }
    // mult 2 dobra a régua: 10 px ainda não é plena, 20 px é
    expect(cessaoPeloGate(true, 10, 2)).toBeLessThan(1);
    expect(cessaoPeloGate(true, 20, 2)).toBe(1);
  });

  it('o Director compõe por MAX com a dominância, e o padrão sai da constante', () => {
    expect(DIRECTOR).toContain("this.debug.get('bcede')");
    expect(DIRECTOR).toContain('cessaoPeloGate(');
    // `?bcede=0` ⇒ o valor herdado, bit a bit — o ramo `:` do ternário, que
    // é o lado A do A/B e continua existindo
    expect(DIRECTOR).toContain(': alvoPorDominancia');
    expect(DIRECTOR).toContain('this.cessaoPeloGateMult > 0');
    // e o default não é um literal solto no parse: sai da constante que
    // carrega a derivação (terra.ts), nos dois lugares que o escrevem
    expect(DIRECTOR).toContain('private cessaoPeloGateMult = CESSAO_PELO_GATE_MULT;');
    expect(DIRECTOR).toContain('bcede >= 0 ? bcede : CESSAO_PELO_GATE_MULT');
  });
});
