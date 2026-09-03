// Serve: lei — o registro de corpos resolvidos e a lei do palco julgando o Sol decidem near, gate e cessão
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
import { repartir } from '../../estrela';
import { PISO_DO_NEAR_EM_RAIOS, nearPlanePc } from '../../core/engine';
import {
  passoDoPalco,
  quadroDoPalcoVazio,
  type AtorDoPalco,
  type EstadoNoPalco,
  type PostoNoPalco,
} from '../../director/palco';
import {
  BUMP_DO_ALBEDO,
  BUMP_DO_ALBEDO_PADRAO,
  CORPOS_DEFAULT_ON,
  CUSHION_DO_GATE,
  CorposResolvidos,
  GLSL_BUMP_DO_ALBEDO,
  LIMIAR_DO_GATE_PX,
  diametroAparentePx,
  escalaDoBumpDoAlbedo,
  gateBinario,
} from './corpos';
// a tabela de quem tem relevo MEDIDO mora com os rochosos; aqui ela é a
// régua da regra "uma fonte de relevo por corpo" (itens 140/141)
import { NORMAL_MEDIDA } from './rochoso';

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

  it('a chave nasce ligada — ?nocorpos é a volta (a irmã morreu no M4)', () => {
    expect(CORPOS_DEFAULT_ON).toBe(true);
  });
});

describe('Sol-ator × corpo resolvido: o conflito que a F3 dissolveu (D1)', () => {
  it('não há mais Sol-ator: quem desenha o Sol é o corpo OU o ponto, nunca um terceiro', () => {
    // A F0 tinha de PROVAR que o disco de 2.269 UA e um corpo resolvido
    // nunca dividiam quadro. A F3 apagou o disco inflado; o M1 apagou o
    // TERCEIRO desenhista (o clarão do SunStar e a janela de entrega):
    // desde então o Sol é o corpo (régua do palco) ou o ponto
    // fotométrico da camada dos dez, repartidos pela lei — e a soma dos
    // pesos é 1 por construção (estrela.test.ts), não por janela. O
    // clarão de asas (clarao.ts) não é um terceiro DESENHISTA do Sol: é
    // a óptica POR CIMA, do raio do sprite para fora. As heroes
    // RESGATADAS (item 44, ordem do dono 16/08) desenham as 16 NOMEADAS
    // e nunca o Sol — o invariante cobrado aqui é esse, não a ausência
    // do arquivo.
    const heroes = readFileSync(new URL('../heroStars.ts', import.meta.url), 'utf8');
    expect(heroes).not.toMatch(/class SunStar/);
    const clarao = readFileSync(new URL('../clarao.ts', import.meta.url), 'utf8');
    expect(clarao).not.toMatch(/class SunStar/);
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

describe('a fiação do Sol no Director (F2 → M1)', () => {
  // o assunto migrou INTEIRO para director/solNoQuadro.ts (corte 8 da
  // onda da arquitetura) — os pinos internos seguem o código e leem o
  // módulo; o DIRECTOR fica para os pinos de COSTURA (as chamadas nos
  // três pontos do tick), vigiando o fio dos dois lados.
  const DIRECTOR = readFileSync(new URL('../../director.ts', import.meta.url), 'utf8');
  const SOL_NO_QUADRO = readFileSync(
    new URL('../../director/solNoQuadro.ts', import.meta.url),
    'utf8'
  );
  const RAIO_SOL_FISICO_PC = (696_340 / AU_KM) * AU_PARA_PC;
  const H_HARNESS = 1713;
  const TAN_HALF = Math.tan((FOV_DEG * Math.PI) / 360);
  /**
   * Chama a LEI DE VERDADE (`repartir`) com a geometria que põe o disco
   * do Sol em ~`discoPx` na tela do harness — inversa em ângulo pequeno,
   * então o disco devolvido difere do pedido por <1e-6 relativo; os
   * oráculos de valor EXATO usam pontos claramente dentro de cada lado
   * da rampa, nunca a fronteira em cima do float.
   */
  const repartirDoSol = (discoPx: number) => {
    const dPc = (RAIO_SOL_FISICO_PC * H_HARNESS) / (TAN_HALF * discoPx);
    return repartir(
      {
        id: 'sol',
        semente: 1,
        posicaoPc: [0, 0, 0],
        raioPc: RAIO_SOL_FISICO_PC,
        teffK: 5772,
        tempo: 0,
        fase: 0,
        rotacao: { periodo: 1, eixo: [0, 1, 0] },
        atividade: { nivel: 1 },
      },
      { distPc: dPc, direcao: [0, 0, 1] },
      {
        alturaPx: H_HARNESS,
        tanHalfFov: TAN_HALF,
        expoM0: 3.5,
        sigmaPx: 0.85,
        beta: 300,
        trocaPx: LIMIAR_DO_GATE_PX,
        requisitoGeometrico: 1,
      }
    );
  };

  it('o gate do Sol usa a régua do palco, com o raio da instância', () => {
    expect(SOL_NO_QUADRO).toContain('this.solArmado = gateBinario(');
    expect(SOL_NO_QUADRO).toContain(
      'diametroAparentePx(this.fios.solRaioPc, q.dHome, q.hPx, q.fovDeg)'
    );
    expect(SOL_NO_QUADRO).toMatch(
      /import \{[\s\S]*?\bgateBinario\b[\s\S]*?\} from '\.\.\/world\/corpos\/corpos'/
    );
    // a COSTURA: o director entrega a geometria do quadro no mesmo ponto
    expect(DIRECTOR).toContain(
      'this.solNoQuadro.armarGate({ dHome, hPx, fovDeg: cam.fov });'
    );
  });

  it('o grupo do Sol depende do gate, e o `?nosun` continua mandando', () => {
    expect(SOL_NO_QUADRO).toContain(
      "sun.group.visible = !this.fios.escondido('nosun') && this.solArmado;"
    );
  });

  it('o palco recebe o Sol com o raio FÍSICO, e só quando ele está em quadro', () => {
    // a guarda `solRaioPc !== WORLD.sunRadius` da F2 saiu na F3 porque
    // saiu o caso que ela recusava (o corpo inflado). A doutrina do
    // palco — ali só entra superfície real — passou a valer por
    // construção: só existe um raio, e ele é o de verdade — e o módulo
    // o recebe UMA vez, do campo único do director.
    expect(DIRECTOR).toContain('private readonly solRaioPc = RAIO_DO_SOL_NA_CENA;');
    expect(DIRECTOR).toContain('solRaioPc: this.solRaioPc,');
    expect(SOL_NO_QUADRO).toContain("if (this.solArmado && !this.fios.escondido('nosun')) {");
    expect(SOL_NO_QUADRO).toContain(
      "this.fios.palco().registrar('sun', this.fios.solRaioPc, ORIGEM)"
    );
    expect(SOL_NO_QUADRO).toContain("this.fios.palco().remover('sun')");
    // e a porta que escolhia o raio morreu junto
    expect(DIRECTOR).not.toContain("this.debug.has('solreal')");
    expect(SOL_NO_QUADRO).not.toContain("escondido('solreal')");
  });

  it('o registro do Sol acontece ANTES de o near ler o palco', () => {
    // era o defeito herdado da F1: registrado depois do `sun.update`, o
    // clip recebia a superfície do quadro ANTERIOR. O registro mora no
    // módulo; a ORDEM é do director — a costura `armarGate` tem de vir
    // antes da leitura do near, no mesmo tick.
    const registro = DIRECTOR.indexOf('this.solNoQuadro.armarGate(');
    const leitura = DIRECTOR.indexOf('this.palco.superficieMaisProxima(');
    expect(registro).toBeGreaterThan(0);
    expect(leitura).toBeGreaterThan(0);
    expect(registro).toBeLessThan(leitura);
  });

  it('o Sol é UMA repartição (M1): a lei decide cessão, filtro e peso da malha', () => {
    // as quatro rampas viraram uma função pura: `repartir` (estrela.ts).
    // O módulo escreve as três saídas nos três sítios — e o teste de
    // texto cobra a fiação, enquanto a conta é cobrada em números logo
    // abaixo, direto na lei.
    expect(SOL_NO_QUADRO).toContain('const leiDoSol = repartir(');
    expect(SOL_NO_QUADRO).toContain('sun.escreverFiltroSolar(leiDoSol.overrideExpoente);');
    expect(SOL_NO_QUADRO).toContain(
      'sun.escreverPesoDaLei(leiDoSol.wResolvido * leiDoSol.wMalha);'
    );
    expect(SOL_NO_QUADRO).toContain('planetas.escreverCessao(');
    expect(SOL_NO_QUADRO).toContain(
      "this.fios.sun().group.visible ? this.leiDoSol.wResolvido : 0"
    );
    // o trocaPx do Sol é o gate de corpo texturizado do palco — o 4 px
    // deixou de ser uma segunda lei e virou PARÂMETRO da repartição (§3)
    expect(SOL_NO_QUADRO).toContain('trocaPx: LIMIAR_DO_GATE_PX');
    // e a lei é IMPORTADA de onde mora, não recopiada
    expect(SOL_NO_QUADRO).toMatch(/import \{ repartir \} from '\.\.\/estrela'/);
    // as COSTURAS dos dois sítios do tick: corpo+clarão e cessão
    expect(DIRECTOR).toContain('this.solNoQuadro.atualizarCorpoEClarao({');
    expect(DIRECTOR).toContain('this.solNoQuadro.cederPonto(this.planetas);');
  });

  it('no armar do gate (4 px) o peso da malha é 0 — o liga/desliga fica invisível', () => {
    // o gate do palco continua BINÁRIO (custo), mas a lei entrega a malha
    // DO ZERO: wResolvido = smoothstep(4 px, 8 px, disco) é 0 no armar e
    // no desarmar (2 px) — sem pop nos dois sentidos da histerese.
    const r39 = repartirDoSol(3.9);
    expect(r39.wResolvido).toBe(0);
    expect(r39.wPonto).toBe(1);
    expect(repartirDoSol(LIMIAR_DO_GATE_PX / CUSHION_DO_GATE).wResolvido).toBe(0);
    // logo depois do armar a entrega ainda é imperceptível (C¹: a rampa
    // nasce com derivada zero)
    expect(repartirDoSol(4.05).wResolvido).toBeLessThan(2e-3);
    // e com o disco folgado além de 2 gates o ponto cedeu INTEIRO
    expect(repartirDoSol(8.1).wResolvido).toBe(1);
    // monotônica no meio — sem passo para trás
    let anterior = 0;
    for (let px = 3.9; px <= 8.1; px += 0.05) {
      const v = repartirDoSol(px).wResolvido;
      expect(v).toBeGreaterThanOrEqual(anterior);
      anterior = v;
    }
  });

  it('a 1 UA (tela do harness) o disco tem 14,4 px: ponto cedido, paleta autorada', () => {
    // ANTES do M1: cessão por max(dominância, gate) = 1 e filtro 0,9006 —
    // a fotosfera a ~2,6 mag do topo, com a costura medida em 5,2× no voo.
    // AGORA: as duas saem da MESMA régua (disco em px contra 4 px), então
    // a 14,4 px o ponto cedeu (wResolvido = 1) E o filtro já devolveu a
    // paleta autorada (override = 0, disco ≥ 10 px) — não existe mais o
    // trecho em que uma rampa entrega e a outra ainda não pegou, que era
    // exatamente a costura do item 3.
    const dPc = 4.8481e-6; // 1 UA
    const disco = diametroAparentePx(RAIO_SOL_FISICO_PC, dPc, H_HARNESS, FOV_DEG);
    expect(disco).toBeCloseTo(14.4, 1);
    const r = repartirDoSol(disco);
    expect(r.wResolvido).toBe(1);
    expect(r.overrideExpoente).toBe(0);
  });

  it('o override tem a largura própria da lei: 1 exato até 4 px, 0 exato de 10 px em diante', () => {
    // §5.7: mesma régua do eixo óptico (discoPx), largura própria (2,5).
    // Longe (disco < 4 px) a malha nem existe (palco desarmado) e a lei
    // manda radiância verdadeira; perto, a paleta autorada em stops.
    expect(repartirDoSol(1).overrideExpoente).toBe(1);
    expect(repartirDoSol(3.9).overrideExpoente).toBe(1);
    expect(repartirDoSol(10.1).overrideExpoente).toBe(0);
    expect(repartirDoSol(40).overrideExpoente).toBe(0);
    // monotônico e C¹ no meio (smoothstep)
    let anterior = 1;
    for (let px = 3.9; px <= 10.1; px += 0.05) {
      const g = repartirDoSol(px).overrideExpoente;
      expect(g).toBeLessThanOrEqual(anterior);
      anterior = g;
    }
  });
});

// ------------------------------------------------------------
// O CHÃO DO ANEL COMO SUPERFÍCIE DO PALCO (item 139)
// ------------------------------------------------------------

/** km → pc pelos conversores únicos (nenhum literal novo de comprimento) */
const kmParaPc = (km: number) => (km / AU_KM) * AU_PARA_PC;
const pcParaKm = (pc: number) => (pc / AU_PARA_PC) * AU_KM;

const RAIO_SATURNO_PC = kmParaPc(BODY_AXES.saturn[0]);
/** a meia-espessura da lajota (12 km), que é o "raio" do chão do anel */
const MEIA_ESPESSURA_PC = kmParaPc(12);
/** Saturno a ~9,5 UA do Sol — o `distFromSun` do quadro */
const SATURNO_UA = 9.5;

describe('o chão do anel: a SEGUNDA superfície do mesmo corpo (item 139)', () => {
  /**
   * A CENA MEDIDA no item: câmera a 40 km do plano do anel, 110 000 km do
   * eixo. O globo está a 49 732 km dali (o raio equatorial subtraído), o
   * chão de gelo a 40 — e era o globo que mandava no near.
   */
  function palcoDaCena() {
    const c = new CorposResolvidos();
    c.ligado = true;
    // o centro de Saturno na origem, a câmera 110 000 km ao lado e 40 km
    // acima do plano (o eixo do anel é o z deste arranjo)
    const cam = new THREE.Vector3(kmParaPc(110_000), 0, kmParaPc(40));
    c.registrar('saturn', RAIO_SATURNO_PC, new THREE.Vector3(0, 0, 0));
    // o chão: a PROJEÇÃO da câmera no plano, com raio = meia-espessura
    c.registrar('saturn-anel', MEIA_ESPESSURA_PC, new THREE.Vector3(cam.x, cam.y, 0));
    return { c, cam };
  }

  it('com os dois registrados, a superfície mais próxima é a do ANEL', () => {
    const { c, cam } = palcoDaCena();
    const s = c.superficieMaisProxima(cam);
    // d = 40 km de altura menos os 12 km de meia-espessura
    expect(pcParaKm(s.dSuperficiePc)).toBeCloseTo(28, 6);
    expect(s.raioPc).toBe(MEIA_ESPESSURA_PC);
  });

  it('e o near sai nos 0,4% DELA: 0,112 km, não os 199 km do globo', () => {
    const { c, cam } = palcoDaCena();
    const s = c.superficieMaisProxima(cam);
    const near = nearPlanePc(SATURNO_UA * AU_PARA_PC, s.dSuperficiePc, s.raioPc);
    expect(pcParaKm(near)).toBeCloseTo(0.112, 3);
    // é o REGIME proporcional, nunca o anteparo (12 km × 1e-3 = 12 m)
    expect(near).toBeGreaterThan(s.raioPc * PISO_DO_NEAR_EM_RAIOS);
  });

  it('APAGADO o registro do anel, o near volta a 199 km — o defeito do item', () => {
    const { c, cam } = palcoDaCena();
    c.remover('saturn-anel');
    const s = c.superficieMaisProxima(cam);
    const near = nearPlanePc(SATURNO_UA * AU_PARA_PC, s.dSuperficiePc, s.raioPc);
    expect(pcParaKm(near)).toBeCloseTo(198.9, 1);
    // ...e é isso que cortava o chão de gelo: 1 700 vezes mais longe
    expect(pcParaKm(near) / 0.112).toBeGreaterThan(1000);
  });

  it('DENTRO da lajota o anteparo é de 12 m — e só ele segura', () => {
    const c = new CorposResolvidos();
    c.ligado = true;
    // a câmera a 2 km do plano: dentro dos ±12 km, d fica negativo
    const cam = new THREE.Vector3(kmParaPc(110_000), 0, kmParaPc(2));
    c.registrar('saturn', RAIO_SATURNO_PC, new THREE.Vector3(0, 0, 0));
    c.registrar('saturn-anel', MEIA_ESPESSURA_PC, new THREE.Vector3(cam.x, cam.y, 0));
    const s = c.superficieMaisProxima(cam);
    expect(pcParaKm(s.dSuperficiePc)).toBeCloseTo(-10, 6);
    const near = nearPlanePc(SATURNO_UA * AU_PARA_PC, s.dSuperficiePc, s.raioPc);
    expect(pcParaKm(near) * 1000).toBeCloseTo(12, 3);
  });
});

describe('o passo do palco publica o chão do anel como `<id>-anel`', () => {
  /** um ator de mentira: devolve o estado que o teste mandar. */
  function ator(estado: EstadoNoPalco): AtorDoPalco {
    return { group: new THREE.Group(), atualizar: () => estado, dispose: () => {} };
  }

  function cenaDoPasso(superficieDoAnel: EstadoNoPalco['superficieDoAnel'], emQuadro = true) {
    const palco = new CorposResolvidos();
    palco.ligado = true;
    const estado: EstadoNoPalco = {
      emQuadro,
      carregando: false,
      gateArmado: true,
      raioPc: RAIO_SATURNO_PC,
      centroPc: new THREE.Vector3(0, 0, 0),
      superficieDoAnel,
    };
    const posto: PostoNoPalco = {
      corpo: ator(estado),
      id: 'saturn',
      pinoNoFilme: null,
      temPonto: false,
      temRetrato: true,
      rotuloDeLua: false,
      emQuadroAntes: false,
      carregavaAntes: false,
      carregando: false,
      friaNoGate: false,
    };
    passoDoPalco([posto], quadroDoPalcoVazio(), {
      palco,
      planetas: null,
      rotulos: {} as never,
      efemeride: null,
      noFilme: false,
      noFoco: () => false,
      noRoteiro: () => false,
      perturbar: () => {},
    });
    return palco;
  }

  const chao = () => ({
    raioPc: MEIA_ESPESSURA_PC,
    centroPc: new THREE.Vector3(kmParaPc(110_000), 0, 0),
  });

  it('com o chão devolvido pelo corpo, o posto `saturn-anel` entra no palco', () => {
    const palco = cenaDoPasso(chao());
    expect(palco.tamanho).toBe(2);
    const cam = new THREE.Vector3(kmParaPc(110_000), 0, kmParaPc(40));
    expect(pcParaKm(palco.superficieMaisProxima(cam).dSuperficiePc)).toBeCloseTo(28, 6);
  });

  it('sem chão (`null`), só o globo entra — e o posto do anel SAI do palco', () => {
    const palco = cenaDoPasso(null);
    expect(palco.tamanho).toBe(1);
    const cam = new THREE.Vector3(kmParaPc(110_000), 0, kmParaPc(40));
    // sem o anel manda o globo: 49 732 km, os 199 km de near do defeito
    expect(pcParaKm(palco.superficieMaisProxima(cam).dSuperficiePc)).toBeCloseTo(49_732, 0);
  });

  it('corpo FORA de quadro não publica chão nenhum — chão invisível não corta', () => {
    const palco = cenaDoPasso(chao(), false);
    expect(palco.tamanho).toBe(0);
  });
});

// ------------------------------------------------------------
// O RELEVO INVENTADO, APOSENTADO (itens 140 e 141)
// ------------------------------------------------------------

describe('o bump por derivada do albedo: quem tem normal medida saiu (140/141)', () => {
  it('A REGRA: quem entra na normal MEDIDA sai do bump — uma fonte de relevo por corpo', () => {
    // Não é lista de nomes: é a lei que vale para o próximo corpo também.
    // Quem ganhar `NORMAL_MEDIDA` sem zerar o bump levaria as duas contas
    // ao mesmo tempo — a medida e a inventada por cima dela.
    const comNormalMedida = Object.keys(NORMAL_MEDIDA);
    expect(comNormalMedida.length).toBeGreaterThan(0);
    for (const id of comNormalMedida) {
      expect(BUMP_DO_ALBEDO[id], `${id} na tabela`).toBe(0);
      expect(escalaDoBumpDoAlbedo(id), `${id} na conta`).toBe(0);
    }
  });

  it('Europa e Io estão zeradas SEM normal medida — decisão dele, não troca de fonte', () => {
    // O outro lado da regra: zero também acontece por falta de dado (a
    // mancha das duas é cor, não forma). Se um dia entrarem em
    // `NORMAL_MEDIDA`, este teste avisa que a decisão mudou de natureza.
    for (const id of ['europa', 'io']) {
      expect(escalaDoBumpDoAlbedo(id), id).toBe(0);
      expect(id in NORMAL_MEDIDA, `${id} sem DEM global`).toBe(false);
    }
  });

  it('a LUA nem está na tabela: ela não consome este chunk (item 140)', () => {
    expect('moon' in BUMP_DO_ALBEDO).toBe(false);
    // e o shader da Lua não tem o bloco nem o uniform dele
    const luaFonte = readFileSync(new URL('./lua.ts', import.meta.url), 'utf8');
    expect(luaFonte).not.toContain('normalComBumpDoAlbedo');
    expect(luaFonte).not.toContain('uBumpAlbedo');
    expect(luaFonte).toContain('GLSL_NORMAL_DO_MAPA');
  });

  it('quem NÃO tem relevo medido continua com a aproximação declarada', () => {
    // Ganimedes e Calisto não têm DEM público na árvore: o padrão dele
    expect(escalaDoBumpDoAlbedo('ganymede')).toBe(BUMP_DO_ALBEDO_PADRAO);
    expect(BUMP_DO_ALBEDO_PADRAO).toBe(0.02);
  });

  it('os zeros de NUVEM seguem lá — Vênus e Titã, que não têm chão no mapa', () => {
    // Ceres saiu desta lista no item 141: o zero dele agora é o da regra
    // acima (tem normal medida da Dawn), não o da invenção do mapa.
    for (const id of ['venus', 'titan']) {
      expect(escalaDoBumpDoAlbedo(id), id).toBe(0);
      expect(id in NORMAL_MEDIDA, `${id} não tem DEM`).toBe(false);
    }
  });

  it('o chunk inteiro apaga com escala 0 — o zero DESLIGA, não atenua', () => {
    expect(GLSL_BUMP_DO_ALBEDO).toContain('if (uBumpAlbedo <= 0.0) return n;');
  });
});
