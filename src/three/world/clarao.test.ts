// ============================================================
// Oráculo do CLARÃO DE ASAS (M2 da LEI-DA-ESTRELA).
//
// Três assuntos, e por que cada um:
//  1. A HISTERESE DO ORÇAMENTO (§5.21/§8.9) — ranking troca de posição,
//     e ranking sem histerese pisca. O contrato: entrada só com folga
//     declarada sobre o membro mais fraco, saída sempre por rampa,
//     nunca N+1 clarões acesos.
//  2. A ELEGIBILIDADE PELA LEI — quem ganha slot é decidido pelo fluxo
//     (a asa tem de exceder o que o sprite já desenha), nunca por nome:
//     a identidade "as 16" morreu, e o teste prova que ela emerge da
//     física quando a câmera está em casa.
//  3. A CAMADA DE VERDADE — instancia `ClaraoDeAsas` com o sidecar REAL
//     do repo (o mesmo molde de lodStellar.test.ts antes do M2):
//     profundidade pela §5.15, billboards em px pela lei, Sol como
//     candidato apenas enquanto a camada dos dez o desenha.
// ============================================================
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { StarsMeta } from '../config';
import {
  ClaraoDeAsas,
  ELEGIVEIS_POR_QUADRO,
  ORCAMENTO_DO_CLARAO,
  RAZAO_DE_TROCA,
  SOL_BV,
  criarSlots,
  passoDoOrcamento,
} from './clarao';
import type { CandidatoAoClarao } from './clarao';
import {
  BETA_DO_ESPINHO,
  BETA_DA_ASA,
  alcanceDoEspinhoPx,
  raioVisivelDaAsaPx,
} from '../estrela';
import { EXPO_M0, SIGMA_PX, picoDaPsf, psfPointSizePx, sigmaDaPsfPx } from '../luzDaCasa';
import { RAMP_DURATION_MS } from './lodStellar';

const META = JSON.parse(
  readFileSync(new URL('../../../public/data/stars_meta.json', import.meta.url), 'utf8')
) as StarsMeta;

/** um passo de quadro típico (60 fps) */
const DT = 1 / 60;

function elegiveis(...pares: [number, number][]): CandidatoAoClarao[] {
  return pares
    .map(([indice, pico]) => ({ indice, pico }))
    .sort((a, b) => (b.pico === a.pico ? a.indice - b.indice : b.pico - a.pico));
}

/** roda o orçamento até as rampas assentarem (≥ 300 ms de quadros) */
function assentar(slots: ReturnType<typeof criarSlots>, el: CandidatoAoClarao[]) {
  for (let i = 0; i < 30; i++) passoDoOrcamento(slots, el, DT);
}

describe('1. o orçamento com histerese (§5.21)', () => {
  it('elegível entra na vaga livre e sobe em RAMPA, nunca em degrau', () => {
    const slots = criarSlots();
    passoDoOrcamento(slots, elegiveis([7, 100]), DT);
    const dono = slots.find((s) => s.indice === 7)!;
    expect(dono).toBeDefined();
    expect(dono.alvo).toBe(1);
    // um quadro de 60 fps percorre dt/0,3 s da rampa — nunca 1 de uma vez
    expect(dono.ganho).toBeGreaterThan(0);
    expect(dono.ganho).toBeCloseTo((DT * 1000) / RAMP_DURATION_MS, 10);
  });

  it('quem sai da elegibilidade desce em rampa e SÓ então vira vaga', () => {
    const slots = criarSlots();
    assentar(slots, elegiveis([7, 100]));
    expect(slots.find((s) => s.indice === 7)!.ganho).toBe(1);
    // a fonte apagou (fora da lista): rampa desce, slot ainda ocupado
    passoDoOrcamento(slots, [], DT);
    const saindo = slots.find((s) => s.indice === 7)!;
    expect(saindo.alvo).toBe(0);
    expect(saindo.ganho).toBeGreaterThan(0);
    expect(saindo.ganho).toBeLessThan(1);
    // ...e depois de assentar, a vaga existe
    assentar(slots, []);
    expect(slots.every((s) => s.indice === -1)).toBe(true);
  });

  it('com o orçamento CHEIO, entrante fraco não desloca ninguém', () => {
    const slots = criarSlots();
    const cheios: [number, number][] = Array.from({ length: ORCAMENTO_DO_CLARAO }, (_, i) => [
      i,
      100,
    ]);
    assentar(slots, elegiveis(...cheios));
    // desafiante com pico 110 < 100 × 1,25: espera do lado de fora
    const comDesafiante = elegiveis(...cheios, [99, 110]);
    assentar(slots, comDesafiante);
    expect(slots.some((s) => s.indice === 99)).toBe(false);
    expect(slots.filter((s) => s.indice >= 0)).toHaveLength(ORCAMENTO_DO_CLARAO);
  });

  it('entrante com a folga da RAZAO_DE_TROCA desloca o mais fraco — e espera a vaga', () => {
    const slots = criarSlots();
    const cheios: [number, number][] = Array.from({ length: ORCAMENTO_DO_CLARAO }, (_, i) => [
      i,
      i === 3 ? 100 : 500, // o índice 3 é o mais fraco
    ]);
    assentar(slots, elegiveis(...cheios));
    const forte: [number, number] = [99, 100 * RAZAO_DE_TROCA * 1.01];
    passoDoOrcamento(slots, elegiveis(...cheios, forte), DT);
    // o mais fraco começou a SAIR, o entrante ainda não tem slot
    expect(slots.find((s) => s.indice === 3)!.alvo).toBe(0);
    expect(slots.some((s) => s.indice === 99)).toBe(false);
    // a casa nunca tem N+1 clarões com ganho > 0 além do que a rampa cruza
    assentar(slots, elegiveis(...cheios, forte));
    expect(slots.some((s) => s.indice === 99)).toBe(true);
    expect(slots.some((s) => s.indice === 3)).toBe(false);
    expect(slots.filter((s) => s.indice >= 0)).toHaveLength(ORCAMENTO_DO_CLARAO);
  });

  it('dois quase-empatados na fronteira NÃO piscam: o de dentro fica', () => {
    const slots = criarSlots();
    const cheios: [number, number][] = Array.from({ length: ORCAMENTO_DO_CLARAO }, (_, i) => [
      i,
      100 + i,
    ]);
    assentar(slots, elegiveis(...cheios));
    // desafiante 1% acima do mais fraco — dentro da banda de histerese
    for (let k = 0; k < 120; k++) {
      passoDoOrcamento(slots, elegiveis(...cheios, [99, 101]), DT);
      // em NENHUM quadro o conjunto muda
      expect(slots.some((s) => s.indice === 99)).toBe(false);
      expect(slots.find((s) => s.indice === 0)!.alvo).toBe(1);
    }
  });

  it('membro que oscila para fora e volta re-entra PELA RAMPA, do ganho em que estava', () => {
    const slots = criarSlots();
    assentar(slots, elegiveis([7, 100]));
    passoDoOrcamento(slots, [], DT); // dois quadros fora
    passoDoOrcamento(slots, [], DT);
    const meio = slots.find((s) => s.indice === 7)!.ganho;
    expect(meio).toBeLessThan(1);
    passoDoOrcamento(slots, elegiveis([7, 100]), DT); // voltou
    const dono = slots.find((s) => s.indice === 7)!;
    expect(dono.alvo).toBe(1);
    // um passo de rampa acima de onde estava — nunca um salto a 1
    expect(dono.ganho).toBeCloseTo(meio + (DT * 1000) / RAMP_DURATION_MS, 10);
    expect(dono.ganho).toBeLessThan(1);
  });

  it('o passo não aloca: os slots são MUTADOS, a lista é só lida', () => {
    const slots = criarSlots();
    const el = elegiveis([1, 10], [2, 20]);
    const antes = slots;
    passoDoOrcamento(slots, el, DT);
    expect(slots).toBe(antes);
    expect(el).toHaveLength(2); // intocada
  });
});

describe('2. a elegibilidade pela lei — a identidade "as 16" emerge, não se declara', () => {
  const sigma = sigmaDaPsfPx(SIGMA_PX, 900);

  /** a régua da camada: a óptica excede o sprite? */
  const elegivel = (m: number) => {
    const pico = picoDaPsf(m, EXPO_M0, SIGMA_PX, 900);
    const nucleo = psfPointSizePx(m, EXPO_M0, SIGMA_PX, 900);
    return (
      Math.max(2 * raioVisivelDaAsaPx(pico, sigma), 2 * alcanceDoEspinhoPx(pico, sigma)) > nucleo
    );
  };

  it('em casa, as elegíveis são as brilhantes clássicas — e Sirius manda', () => {
    // m visto de CASA = o `m` do sidecar; a fronteira fica perto de m ~ 1,5
    expect(elegivel(-1.46)).toBe(true); // Sirius
    expect(elegivel(0.0)).toBe(true); // Vega / α Cen
    expect(elegivel(1.25)).toBe(true); // Deneb
    expect(elegivel(3.5)).toBe(false); // uma estrela mediana não tem asa
    expect(elegivel(6.0)).toBe(false);
  });

  it('a asa ENCOLHE com a luz: R ∝ F^(1/2β) na cauda, e zera sob o limiar', () => {
    const picoDe = (m: number) => picoDaPsf(m, EXPO_M0, SIGMA_PX, 900);
    const r1 = raioVisivelDaAsaPx(picoDe(-26.7), sigma); // o Sol a 1 UA
    const r2 = raioVisivelDaAsaPx(picoDe(-21.7), sigma); // 100× menos fluxo
    // na cauda Moffat, 100× de fluxo dão 100^(1/2β) ≈ 2,61× de raio
    expect(r1 / r2).toBeCloseTo(Math.pow(100, 1 / (2 * BETA_DA_ASA)), 1);
    expect(raioVisivelDaAsaPx(picoDe(8), sigma)).toBe(0); // fraca: sem asa
  });

  it('o braço do espinho decai MAIS RÁPIDO que o halo — cruz que afina, nunca parede', () => {
    // A LIÇÃO DO DONO (16/08): a primeira forma usava ¾·β ("a cruz tem de
    // alcançar mais que o halo") e produzia braços saturados de ~2.400 px
    // atravessando a tela — "os spikes ficaram horríveis e enormes". A
    // cruz de câmera é o contrário: mais curta que o halo visível, com a
    // ponta afinando. O expoente segue DERIVADO (1,5·β), nunca livre.
    const pico = picoDaPsf(-15, EXPO_M0, SIGMA_PX, 900); // fonte forte
    expect(alcanceDoEspinhoPx(pico, sigma)).toBeLessThan(raioVisivelDaAsaPx(pico, sigma));
    expect(alcanceDoEspinhoPx(pico, sigma)).toBeGreaterThan(0); // mas a cruz EXISTE
    expect(BETA_DO_ESPINHO).toBeCloseTo(1.5 * BETA_DA_ASA, 12);
  });
});

describe('3. a camada de verdade, com o sidecar real', () => {
  const quadroEmCasa = (solVisivel = true) => ({
    camPos: new THREE.Vector3(0, 0, 0.001), // em casa (0 exato não tem direção)
    screenH: 900,
    dtS: DT,
    solVisivel,
    // filtro solar FORA e ponto INTEIRO (regime de longe) — o engate do
    // filtro e a entrega ao bloom têm teste próprio abaixo
    atenuacaoDoSol: 1,
    pesoDoPontoDoSol: 1,
    expoM0: EXPO_M0,
    sigmaPx: SIGMA_PX,
  });

  it('nasce com o orçamento de billboards, aditivos e SEM teste de profundidade (§5.15)', () => {
    const c = new ClaraoDeAsas(META.named);
    expect(c.group.children).toHaveLength(ORCAMENTO_DO_CLARAO);
    for (const filho of c.group.children) {
      const mat = (filho as THREE.Mesh).material as THREE.ShaderMaterial;
      expect(mat.depthTest).toBe(false);
      expect(mat.depthWrite).toBe(false);
      expect(mat.blending).toBe(THREE.AdditiveBlending);
    }
    c.dispose();
  });

  it('em casa, os slots se enchem com as brilhantes clássicas — por FLUXO, não por lista', () => {
    const c = new ClaraoDeAsas(META.named);
    for (let i = 0; i < 30; i++) c.atualizar(quadroEmCasa());
    const ocupantes = c.ocupacao();
    expect(ocupantes.length).toBeGreaterThanOrEqual(8);
    expect(ocupantes.length).toBeLessThanOrEqual(ORCAMENTO_DO_CLARAO);
    // os nomes: traduz índice → nomeada (0 = Sol; i>0 = named[i−1])
    const nomes = ocupantes.map((o) => (o.indice === 0 ? 'Sol' : META.named[o.indice - 1].n));
    for (const esperado of ['Sirius', 'Canopus', 'Rigil Kentaurus', 'Vega', 'Capella']) {
      expect(nomes, nomes.join(', ')).toContain(esperado);
    }
    // e TODOS os assentados estão com a rampa plena
    for (const o of ocupantes) expect(o.ganho).toBe(1);
    c.dispose();
  });

  it('o Sol RESOLVIDO entrega a óptica ao bloom: peso do ponto 0 ⇒ sem asa', () => {
    // a segunda lição do dono (16/08): a asa modela a óptica do PONTO —
    // aplicá-la a um disco resolvido concentrava o fluxo inteiro numa
    // conta de PSF e desenhava um círculo branco no meio da fotosfera.
    // Com wPonto = 0 (corpo resolvido) a asa some pela rampa da lei e o
    // clarão do disco é a convolução do bloom sobre a imagem real.
    const c = new ClaraoDeAsas(META.named);
    const perto = {
      ...quadroEmCasa(true),
      camPos: new THREE.Vector3(0, 0, 0.1 / 206264.80624548031), // 0,1 UA
      atenuacaoDoSol: 2.7e10, // filtro pleno (overrideFator da repartição)
      pesoDoPontoDoSol: 0, // corpo resolvido: o ponto cedeu inteiro
    };
    for (let i = 0; i < 30; i++) c.atualizar(perto);
    expect(c.ocupacao().some((o) => o.indice === 0)).toBe(false);
    c.dispose();
  });

  it('o Sol só é candidato enquanto a camada dos dez o desenha', () => {
    const c = new ClaraoDeAsas(META.named);
    // a 40 UA do Sol, olhando para ele: o Sol é DE LONGE o mais forte
    const perto = {
      ...quadroEmCasa(true),
      camPos: new THREE.Vector3(0, 0, 40 / 206264.80624548031),
    };
    for (let i = 0; i < 30; i++) c.atualizar(perto);
    expect(c.ocupacao().some((o) => o.indice === 0)).toBe(true);
    // fonte oculta não tem óptica: some pela rampa
    for (let i = 0; i < 30; i++) c.atualizar({ ...perto, solVisivel: false });
    expect(c.ocupacao().some((o) => o.indice === 0)).toBe(false);
    c.dispose();
  });

  it('o billboard é dimensionado em PX pela lei — o mesmo número da régua da luz', () => {
    const c = new ClaraoDeAsas(META.named);
    const dPc = 40 / 206264.80624548031;
    const q = { ...quadroEmCasa(true), camPos: new THREE.Vector3(0, 0, dPc) };
    for (let i = 0; i < 30; i++) c.atualizar(q);
    const slotDoSol = c.ocupacao().findIndex((o) => o.indice === 0);
    expect(slotDoSol).toBeGreaterThanOrEqual(0);
    // a MESMA conta que claraoDaLeiPx/luz-do-quadro faz para o teto:
    // m do Sol pela lei do campo, pico, asa Moffat + braço do espinho
    const m = -0.15 + 5 * Math.log10(dPc);
    const pico = picoDaPsf(m, EXPO_M0, SIGMA_PX, 900);
    const sigma = sigmaDaPsfPx(SIGMA_PX, 900);
    const esperado = Math.max(raioVisivelDaAsaPx(pico, sigma), alcanceDoEspinhoPx(pico, sigma));
    const meshes = c.group.children.filter(
      (f) => (f as THREE.Mesh).visible
    ) as THREE.Mesh[];
    const doSol = meshes.find((mh) => mh.position.length() === 0)!;
    const uMeiaPx = ((doSol.material as THREE.ShaderMaterial).uniforms.uMeiaPx as { value: number })
      .value;
    expect(uMeiaPx).toBeCloseTo(esperado, 6);
    c.dispose();
  });

  it('SOL_BV continua o número medido (a cor do Sol sai da mesma lei)', () => {
    expect(SOL_BV).toBe(0.653);
  });

  it('o teto de elegíveis por quadro é orçamento + folga de desafiantes', () => {
    expect(ELEGIVEIS_POR_QUADRO).toBe(ORCAMENTO_DO_CLARAO + 8);
  });
});
