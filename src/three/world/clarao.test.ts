// Serve: lei — o orçamento do clarão entra e sai por rampa, e a elegibilidade nasce do fluxo, nunca do nome
// ============================================================
// Oráculo do CLARÃO DE ASAS (M2 da LEI-DA-ESTRELA).
//
// Três assuntos, e por que cada um:
//  1. A HISTERESE DO ORÇAMENTO (§5.21/§8.9) — ranking troca de posição,
//     e ranking sem histerese pisca. O contrato: entrada só com folga
//     declarada sobre o membro mais fraco, saída sempre por rampa,
//     nunca N+1 clarões acesos.
//  2. A ELEGIBILIDADE PELA LEI — quem ganha slot é decidido pelo fluxo
//     (a asa tem de exceder o que o sprite já desenha), nunca por nome,
//     e o teste prova que a escolha emerge da física quando a câmera
//     está em casa — o Sol, as nomeadas e as visitadas pela mesma régua
//     (a luz única, 13/11; as heroes de autor morreram com ela).
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
  BV_MEDIDO,
  ClaraoDeAsas,
  ELEGIVEIS_POR_QUADRO,
  FATOR_DE_ENCHIMENTO_DO_SOL,
  OCUPACAO_MAXIMA_DA_TELA,
  ORCAMENTO_DO_CLARAO,
  RAZAO_DE_TROCA,
  SOL_BV,
  deslocamentoDaCessao,
  criarSlots,
  fatiaDoCampo,
  haloDaLuz,
  HALO_NO_TETO,
  MARGEM_DO_VEU,
  meiaDaArtePx,
  passoDoOrcamento,
  presencaNaFronteira,
  escreverAneisNosPontos,
  transmitanciaDosAneis,
  veuDaLente,
  veuDaLenteNaTela,
} from './clarao';
import type { CandidatoAoClarao } from './clarao';
import {
  BETA_DO_ESPINHO,
  BETA_DA_ASA,
  alcanceDoEspinhoPx,
  raioVisivelDaAsaPx,
} from '../estrela';
import { EXPO_M0, SIGMA_PX, picoDaPsf, sigmaDaPsfPx } from '../luzDaCasa';
import { RAMP_DURATION_MS } from './lodStellar';
import { U_PERFIL_BASE, U_PERFIL_ESCALA, regiaoDoAnelCpu } from './corpos/gigante';
import {
  AMOSTRAS_DO_FATOR_TAU,
  LARGURA_DA_TABELA_DO_ANEL,
  UNIFORMES_DOS_ANEIS,
} from '../shaders/starShaders';

const META = JSON.parse(
  readFileSync(new URL('../../../public/data/stars_meta.json', import.meta.url), 'utf8')
) as StarsMeta;

/** um passo de quadro típico (60 fps) */
const DT = 1 / 60;

/**
 * OS INSTRUMENTOS DOS DENTES DE ESTRUTURA — lista FECHADA de campos, em
 * vez de regex de nome próprio.
 *
 * Existem porque um dente de nome já cedeu: a sonda de auditoria que
 * ressuscitou o teto por fase só precisou batizar tudo de outro jeito.
 * Um `toEqual` sobre a lista de campos não tem esse buraco — o campo
 * novo reprova sem que ninguém tenha de adivinhar como ele se chamaria.
 */
const semComentarios = (fonte: string) =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

function corpoDoBloco(fonte: string, abertura: string): string {
  const limpa = semComentarios(fonte);
  const i = limpa.indexOf(abertura);
  if (i < 0) throw new Error(`bloco não encontrado: ${abertura}`);
  const inicio = limpa.indexOf('{', i + abertura.length - 1);
  let nivel = 0;
  for (let k = inicio; k < limpa.length; k++) {
    if (limpa[k] === '{') nivel += 1;
    else if (limpa[k] === '}') {
      nivel -= 1;
      if (nivel === 0) return limpa.slice(inicio + 1, k);
    }
  }
  throw new Error(`bloco não fecha: ${abertura}`);
}

const camposDoBloco = (corpo: string) =>
  [...corpo.matchAll(/^\s*(\w+)\??:/gm)].map((m) => m[1]);

const camposDaInterface = (fonte: string, nome: string) =>
  camposDoBloco(corpoDoBloco(fonte, `interface ${nome} {`));

const camposDoParametro = (fonte: string, metodo: string) =>
  camposDoBloco(corpoDoBloco(fonte, `${metodo}(q: {`));

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

  it('a luz única: o piso de arte ordena pela luz e o halo cede à luz que a lente acende', () => {
    const teto = OCUPACAO_MAXIMA_DA_TELA * 900;
    // as âncoras de gosto (13/11): Sirius de casa no teto, m ≈ 0 com 0,4
    // dele, m = 2 já ponto — e sempre menor quanto mais fraca
    expect(meiaDaArtePx(-1.5, 900)).toBeCloseTo(teto, 9);
    expect(meiaDaArtePx(0, 900) / teto).toBeCloseTo(0.4, 1);
    expect(meiaDaArtePx(2, 900) / teto).toBeCloseTo(0.05, 2);
    for (let m = -1.5; m < 6; m += 0.25)
      expect(meiaDaArtePx(m + 0.25, 900)).toBeLessThan(meiaDaArtePx(m, 900));
    // o halo: inteiro sem lente, zero exato com ela plena, descendo entre os dois
    expect(fatiaDoCampo(0)).toBe(1);
    expect(fatiaDoCampo(1)).toBe(0);
    expect(fatiaDoCampo(NaN)).toBe(1);
    for (let l = 0; l < 1; l += 0.1) expect(fatiaDoCampo(l + 0.1)).toBeLessThan(fatiaDoCampo(l));
  });

  it('a luz única: o halo cresce devagar com a luz e o véu da lente só vale com a fonte à vista', () => {
    // o céu de casa inteiro (m ≥ −1,5) tem o mesmo halo; acima dele o halo
    // cresce com a luz, nunca passa de 1 e nunca desce
    expect(haloDaLuz(-1.5)).toBeCloseTo(HALO_NO_TETO, 12);
    expect(haloDaLuz(2)).toBeCloseTo(HALO_NO_TETO, 12);
    for (let m = -1.5; m > -30; m -= 0.5) {
      expect(haloDaLuz(m - 0.5)).toBeGreaterThanOrEqual(haloDaLuz(m));
      expect(haloDaLuz(m - 0.5)).toBeLessThanOrEqual(1);
    }
    expect(haloDaLuz(-16)).toBeGreaterThan(haloDaLuz(-11)); // Sirius A sobre B, de perto
    expect(haloDaLuz(NaN)).toBe(0);
    // o véu: a luz da lente × quanto a fonte está no quadro; sem `naTela`, nenhum
    expect(veuDaLente({ fracao: 0.8, candidata: null, naTela: 1 })).toBeCloseTo(0.8, 12);
    expect(veuDaLente({ fracao: 0.8, candidata: null })).toBe(0);
    expect(veuDaLente(undefined)).toBe(0);
    // no quadro 1, atrás da câmera 0, e fora da borda cai suave até a margem
    expect(veuDaLenteNaTela(0, 0, true, 16 / 9)).toBe(1);
    expect(veuDaLenteNaTela(0, 0, false, 16 / 9)).toBe(0);
    expect(veuDaLenteNaTela(0, 1 + 2 * MARGEM_DO_VEU, true, 16 / 9)).toBe(0);
    const meio = veuDaLenteNaTela(0, 1 + MARGEM_DO_VEU, true, 16 / 9);
    expect(meio).toBeGreaterThan(0);
    expect(meio).toBeLessThan(1);
    // a fronteira das vagas: presença 0 no corte, 1 num fator 2 acima, contínua
    expect(presencaNaFronteira(5, 0)).toBe(1); // sem ninguém de fora, sem fronteira
    expect(presencaNaFronteira(2, 2)).toBe(0);
    expect(presencaNaFronteira(4, 2)).toBe(1);
    expect(presencaNaFronteira(2.0001, 2)).toBeLessThan(1e-3);
  });

  it('numa dupla, nada se desloca sem a forte acima do teto, entre iguais, ou para a forte', () => {
    // (fraca: m, meia; forte: m, meia, presença; separação; teto)
    expect(deslocamentoDaCessao(0, 25, -1.4, 60, 1, 0, 900)).toBe(0); // forte abaixo do teto
    expect(deslocamentoDaCessao(-8, 63, -8, 63, 1, 0, 900)).toBe(0); // duas iguais
    expect(deslocamentoDaCessao(-18, 63, -8, 63, 1, 0, 900)).toBe(0); // a forte não cede
    // Sirius B ao lado de A (Δm 10, A 16,5 mag acima do teto): desce 10 mag
    expect(deslocamentoDaCessao(-8.24, 63, -18.07, 63, 1, 0, 900)).toBeCloseTo(9.83, 12);
    // Plêiades: a forte 3,7 acima do teto, a vizinha 1,6 abaixo dela desce 1,6
    expect(deslocamentoDaCessao(-3.6, 50, -5.17, 50, 1, 0, 900)).toBeCloseTo(1.57, 12);
  });

  it('numa dupla, o deslocamento é contínuo na separação, em Δm e na forte cruzando o teto', () => {
    const passo = (f: (x: number) => number, de: number, ate: number, h: number, max: number) => {
      let antes = f(de);
      for (let x = de + h; x <= ate; x += h) {
        const agora = f(x);
        expect(Math.abs(agora - antes)).toBeLessThan(max);
        antes = agora;
      }
    };
    passo((px) => deslocamentoDaCessao(-8, 63, -18, 63, 1, px, 900), 0, 1000, 1, 0.05);
    expect(deslocamentoDaCessao(-8, 63, -18, 63, 1, 900, 900)).toBe(0); // além de um quadro, nada
    passo((dm) => deslocamentoDaCessao(-5 + dm, 50, -5, 50, 1, 20, 900), 0, 12, 0.01, 0.02);
    passo((x) => deslocamentoDaCessao(0.5 - x, 50, -1.5 - x, 50, 1, 20, 900), -1, 2, 0.01, 0.02);
    expect(deslocamentoDaCessao(-8, 63, -18, 63, 0.5, 40, 900)).toBeCloseTo(
      0.5 * deslocamentoDaCessao(-8, 63, -18, 63, 1, 40, 900),
      12
    );
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
    solturaDoSol: 1,
    expoM0: EXPO_M0,
    sigmaPx: SIGMA_PX,
  });

  it('nasce com o orçamento de billboards, aditivos e SEM teste de profundidade (§5.15)', () => {
    const c = new ClaraoDeAsas(META.named);
    // os ORCAMENTO_DO_CLARAO billboards são os PRIMEIROS filhos do grupo —
    // a sonda de oclusão (teste dedicado abaixo) entra DEPOIS, e
    // por isso não conta aqui: ela tem profundidade LIGADA de propósito.
    const billboards = c.group.children.slice(0, ORCAMENTO_DO_CLARAO);
    expect(billboards).toHaveLength(ORCAMENTO_DO_CLARAO);
    for (const filho of billboards) {
      const mat = (filho as THREE.Mesh).material as THREE.ShaderMaterial;
      expect(mat.depthTest).toBe(false);
      expect(mat.depthWrite).toBe(false);
      expect(mat.blending).toBe(THREE.AdditiveBlending);
    }
    c.dispose();
  });

  it('a sonda de oclusão, uma por vaga, mora no MESMO grupo, com profundidade LIGADA e sem pintar nada', () => {
    // outro corpo pode tapar o clarão — a §5.15 acima só proíbe a estrela
    // ocluir a si mesma. A sonda testa profundidade contra o resto da cena;
    // por isso ela é o OPOSTO dos billboards de cima em todo campo
    // relevante, e mora no mesmo `group` para desenhar no mesmo passe.
    const c = new ClaraoDeAsas(META.named);
    const sondas = c.group.children.slice(-ORCAMENTO_DO_CLARAO) as THREE.Mesh[];
    expect(c.group.children).toHaveLength(2 * ORCAMENTO_DO_CLARAO);
    for (const sonda of sondas) {
      const mat = sonda.material as THREE.ShaderMaterial;
      expect(mat.depthTest).toBe(true);
      expect(mat.depthWrite).toBe(false);
      expect(mat.colorWrite).toBe(false);
      expect(mat.transparent).toBe(true);
      expect(sonda.renderOrder).toBe(-1);
      expect(sonda.frustumCulled).toBe(false);
    }
    c.dispose();
  });

  it('um corpo tapando QUALQUER estrela apaga clarão e halo pela rampa de 300 ms, mantém a vaga e os traz de volta', () => {
    // Não há GPU nesta suíte (`node`, sem WebGLRenderer): a consulta de
    // oclusão de verdade só corre no navegador. O que se prova aqui é o
    // contrato entre ela e a vaga — `registrarOclusao` é o MESMO método
    // que o callback da sonda chamaria com um resultado de GPU; o cast
    // alcança-o sem abrir a API pública da camada. Uma regra para toda
    // vaga: o Sol e Sirius passam pelo mesmo caminho.
    const c = new ClaraoDeAsas(META.named, { camadaDoCampo: 1 });
    const interna = c as unknown as {
      registrarOclusao(vaga: number, oculto: boolean): void;
      slots: { indice: number }[];
      mats: THREE.ShaderMaterial[];
      matsDoCampo: THREE.ShaderMaterial[];
      meshes: THREE.Mesh[];
      sondas: THREE.Mesh[];
    };
    for (let i = 0; i < 30; i++) c.atualizar(quadroEmCasa(true));
    const iSirius = 1 + META.named.findIndex((s) => s.n === 'Sirius');
    for (const indice of [0, iSirius]) {
      const k = interna.slots.findIndex((s) => s.indice === indice);
      expect(k).toBeGreaterThanOrEqual(0);
      const pleno = interna.mats[k].uniforms.uGanho.value as number;
      const halo = interna.matsDoCampo[k].uniforms.uGanho.value as number;
      expect(pleno).toBeGreaterThan(0);

      interna.registrarOclusao(k, true);
      c.atualizar(quadroEmCasa(true)); // 16 ms: um degrau da rampa, nunca o estalo
      const passo = interna.mats[k].uniforms.uGanho.value as number;
      expect(passo).toBeLessThan(pleno);
      expect(passo).toBeGreaterThan(0.9 * pleno);
      expect((interna.matsDoCampo[k].uniforms.uGanho.value as number) / halo).toBeCloseTo(passo / pleno, 6);
      for (let i = 0; i < 30; i++) c.atualizar(quadroEmCasa(true));
      // apagado — mas a vaga fica, e a sonda continua correndo
      expect(interna.slots[k].indice).toBe(indice);
      expect(interna.meshes[k].visible).toBe(false);
      expect(interna.sondas[k].visible).toBe(true);

      interna.registrarOclusao(k, false);
      for (let i = 0; i < 30; i++) c.atualizar(quadroEmCasa(true));
      expect(interna.mats[k].uniforms.uGanho.value as number).toBeCloseTo(pleno, 9);
    }
    c.dispose();
  });

  it('um anel no caminho apaga clarão e halo pela opacidade DELE, no mesmo quadro: e^(−τ/μ)', () => {
    // perfil sintético: α = 1 no meio da régua, 0,5 nas bordas — a lei do
    // `ANEL_FRAG` (τ = −ln(1 − α)·fatorTau, μ = |d·n|) e nada inventado
    const caixas = 2048;
    const perfil = new Uint8Array(caixas * 4);
    for (let i = 0; i < caixas; i++) perfil[i * 4 + 3] = i >= 900 && i < 1100 ? 255 : 128;
    const c = new ClaraoDeAsas(META.named, { camadaDoCampo: 1 });
    const interna = c as unknown as {
      slots: { indice: number }[];
      mats: THREE.ShaderMaterial[];
      matsDoCampo: THREE.ShaderMaterial[];
    };
    const q = quadroEmCasa(true);
    const s = META.named.find((x) => x.n === 'Sirius')!;
    const u = new THREE.Vector3(s.x, s.y, s.z).sub(q.camPos).normalize();
    const e = new THREE.Vector3(0, 0, 1).cross(u).normalize();
    const raioPc = 1e-6;
    const kmPorRaio = 60268;
    // o anel inclinado 60° da linha de visada (μ = 0,5), furado a r raios
    const polo = u.clone().multiplyScalar(0.5).addScaledVector(e, Math.sqrt(0.75));
    const anelEm = (r: number, dist = 1e-4) => ({
      centroPc: q.camPos.clone().addScaledVector(u, dist).addScaledVector(new THREE.Vector3().crossVectors(polo, e).normalize(), -r * raioPc),
      polo, raioPc, rInt: 1.11, rExt: 2.326, kmPorRaio, perfil,
    });
    const esperado = (r: number, alfa: number) =>
      Math.exp(-(-Math.log(Math.max(1 - alfa, 1e-3)) * regiaoDoAnelCpu(r * kmPorRaio).fatorTau) / 0.5);
    const sirius = new THREE.Vector3(s.x, s.y, s.z);
    // no centro de uma caixa longe das bordas da faixa, a pegada de uma
    // caixa é o próprio α
    const rMeio = 1.11 + ((1000.5 / caixas - U_PERFIL_BASE) / U_PERFIL_ESCALA) * (2.326 - 1.11);
    const rBorda = 1.11 + ((300.5 / caixas - U_PERFIL_BASE) / U_PERFIL_ESCALA) * (2.326 - 1.11);
    expect(transmitanciaDosAneis([anelEm(rMeio)], q.camPos, sirius, 0)).toBeCloseTo(esperado(rMeio, 1), 9);
    expect(transmitanciaDosAneis([anelEm(rBorda)], q.camPos, sirius, 0)).toBeCloseTo(esperado(rBorda, 128 / 255), 6);
    // fora da malha, ou ATRÁS da estrela, não tapa
    expect(transmitanciaDosAneis([anelEm(2.5)], q.camPos, sirius, 0)).toBe(1);
    expect(transmitanciaDosAneis([anelEm(rBorda, 10)], q.camPos, sirius, 0)).toBe(1);
    // de longe o pixel mistura as caixas, como o mipmap: a pegada larga
    // leva a faixa opaca para a média
    const rVizinho = 1.11 + ((880.5 / caixas - U_PERFIL_BASE) / U_PERFIL_ESCALA) * (2.326 - 1.11);
    const fino = transmitanciaDosAneis([anelEm(rVizinho)], q.camPos, sirius, 0);
    expect(fino).toBeCloseTo(esperado(rVizinho, 128 / 255), 6);
    expect(transmitanciaDosAneis([anelEm(rVizinho)], q.camPos, sirius, 1e-3)).toBeLessThan(0.5 * fino);

    for (let i = 0; i < 30; i++) c.atualizar(q);
    const k = interna.slots.findIndex((x) => x.indice === 1 + META.named.indexOf(s));
    const pleno = interna.mats[k].uniforms.uGanho.value as number;
    const halo = interna.matsDoCampo[k].uniforms.uGanho.value as number;
    c.atualizar({ ...q, aneis: [anelEm(rBorda)], tanHalfFov: 0 });
    const t = esperado(rBorda, 128 / 255);
    expect((interna.mats[k].uniforms.uGanho.value as number) / pleno).toBeCloseTo(t, 6);
    expect((interna.matsDoCampo[k].uniforms.uGanho.value as number) / halo).toBeCloseTo(t, 6);
    c.dispose();

    // o PONTO lê a mesma lei (starShaders.ts): sem anel o termo desliga, e
    // com anel os uniforms carregam o plano relativo à câmera e as tabelas
    // da CPU — a soma de α em bytes inteiros e o fatorTau — numa textura
    const ua = UNIFORMES_DOS_ANEIS;
    escreverAneisNosPontos([], q.camPos, 1e-3);
    expect(ua.uAnelLigado.value).toBe(0);
    const anel = anelEm(rBorda);
    escreverAneisNosPontos([anel], q.camPos, 1e-3);
    expect(ua.uAnelLigado.value).toBe(1);
    const cRel = anel.centroPc.clone().sub(q.camPos).divideScalar(raioPc);
    expect(ua.uAnelCentro.value.distanceTo(cRel)).toBeLessThan(1e-9 * cRel.length());
    expect(ua.uAnelRadPorPx.value).toBe(1e-3);
    const dados = (ua.uAnelTabela.value as THREE.DataTexture).image.data as Float32Array;
    expect(dados[1000]).toBe(255 * 100 + 128 * 900);
    expect(dados[caixas]).toBe(255 * 200 + 128 * (caixas - 200));
    const base = ua.uAnelBaseDoTau.value;
    expect(base % LARGURA_DA_TABELA_DO_ANEL).toBe(0);
    expect(dados[base]).toBe(Math.fround(regiaoDoAnelCpu(1.11 * kmPorRaio).fatorTau));
    expect(dados[base + AMOSTRAS_DO_FATOR_TAU - 1]).toBe(
      Math.fround(regiaoDoAnelCpu(2.326 * kmPorRaio).fatorTau)
    );
    escreverAneisNosPontos([], q.camPos, 1e-3);
  });

  it('a receita montada é BYTE A BYTE a de antes', () => {
    // "claramente a regra que desenha sirius é totalmente diferente da
    // que desenha o sol... o desenho de spikes de sirius é muito
    // superioir" (dono, 16/08). Resposta: o mesmo desenho — e desde
    // 21/08 ele é UMA string (`shaders/common.ts`), não duas iguais.
    //
    // O ORÁCULO MUDOU DE ALVO junto, e é essa a prova de pixel-neutro:
    // antes lia os dois FONTES e cobrava que cada um CONTIVESSE os
    // números; com o endereço único nenhum dos dois os contém mais.
    // Quem tem de contê-los é o texto MONTADO — o `fragmentShader` que
    // chega à GPU. Os blocos abaixo foram copiados byte a byte do texto
    // de ANTES da unificação: se a montagem mover um espaço, cai aqui.
    const c = new ClaraoDeAsas(META.named);
    const fragDoSol = ((c.group.children[0] as THREE.Mesh).material as THREE.ShaderMaterial)
      .fragmentShader;

    expect(fragDoSol).toContain(
      `  float core = exp(-r * r * 90.0) * 3.0;
  float glow = exp(-r * 4.5) * 0.9;
  float ax = exp(-abs(uv.y) * 16.0) * exp(-abs(uv.x) * 2.4);
  float ay = exp(-abs(uv.x) * 16.0) * exp(-abs(uv.y) * 2.4);
  float spikes = (ax + ay) * 0.8;`
    );
    expect(fragDoSol).toContain('vec3(1.0, 0.98, 0.95)');
    c.dispose();
  });

  it('os números da receita NÃO voltam a ser redigitados no fonte', () => {
    // A VARREDURA INVERTIDA do endereço único, no idioma de
    // `simbolosProibidos.test.ts`: o que os fontes tinham de conter
    // agora não podem conter. Sem ela, nada impede a cópia de renascer
    // — e a cópia só é notada quando alguém corrige um lado só.
    const clarao = readFileSync(new URL('./clarao.ts', import.meta.url), 'utf8');
    for (const linha of [
      'exp(-r * r * 90.0) * 3.0',
      'exp(-r * 4.5) * 0.9',
      'exp(-abs(uv.y) * 16.0) * exp(-abs(uv.x) * 2.4)',
      'exp(-abs(uv.x) * 16.0) * exp(-abs(uv.y) * 2.4)',
      '(ax + ay) * 0.8',
      'vec3(1.0, 0.98, 0.95)',
    ]) {
      expect(clarao, linha).not.toContain(linha);
    }
  });

  it('a luz única: as nomeadas disputam os slots com o Sol, só pelo fluxo', () => {
    // a decisão do dono (13/11): nenhum desenho de autor por classe — o
    // Sol e as nomeadas pela MESMA régua; Sirius de casa tem clarão
    const c = new ClaraoDeAsas(META.named);
    const sirius = 1 + META.named.findIndex((s) => s.n === 'Sirius');
    for (let i = 0; i < 30; i++) c.atualizar(quadroEmCasa(true));
    expect(c.ocupacao().some((o) => o.indice === 0)).toBe(true);
    expect(c.ocupacao().some((o) => o.indice === sirius)).toBe(true);
    // com o Sol-ponto oculto só o Sol sai
    for (let i = 0; i < 30; i++) c.atualizar(quadroEmCasa(false));
    expect(c.ocupacao().some((o) => o.indice === 0)).toBe(false);
    expect(c.ocupacao().some((o) => o.indice === sirius)).toBe(true);
    c.dispose();
  });

  it('numa dupla, a mais fraca cede o clarão à mais forte; sozinha, nenhuma muda', () => {
    // longe de casa, olhando para um par: A em m −8, B 8 mag mais fraca a
    // ~37 px dela na tela (o caso de Sirius B, sem nome nenhum)
    const camPos = new THREE.Vector3(100, 0, 0);
    const A = { vaga: 0, pos: { x: 100, y: 0, z: -0.1 }, mBase: -3, cor: [1, 1, 1] as const, soltura: 1 };
    const B = { vaga: 1, pos: { x: 100, y: 0.003, z: -0.1 }, mBase: 5, cor: [1, 1, 1] as const, soltura: 1 };
    const ganhos = (visitadas: (typeof A)[]) => {
      const c = new ClaraoDeAsas(META.named);
      const quadro = { ...quadroEmCasa(false), camPos, visitadas, tanHalfFov: Math.tan(Math.PI / 9) };
      for (let i = 0; i < 30; i++) c.atualizar(quadro);
      const interna = c as unknown as { slots: { indice: number }[]; mats: THREE.ShaderMaterial[] };
      const ganho = (vaga: number) => {
        const k = interna.slots.findIndex((s) => s.indice === META.named.length + 1 + vaga);
        return k < 0 ? 0 : (interna.mats[k].uniforms.uGanho.value as number);
      };
      const g = [ganho(0), ganho(1)];
      c.dispose();
      return g;
    };
    const [aSo] = ganhos([A]);
    const [, bSo] = ganhos([B]);
    const [aJunto, bJunto] = ganhos([A, B]);
    expect(aSo).toBeGreaterThan(0);
    expect(bSo).toBeGreaterThan(0);
    expect(aJunto).toBe(aSo); // a forte, bit a bit
    expect(bJunto).toBeLessThan(0.1 * bSo); // a fraca cede
  });

  it('numa dupla, o céu de casa (nenhuma acima do teto) fica bit a bit', () => {
    const ler = (tanHalfFov?: number) => {
      const c = new ClaraoDeAsas(META.named, { camadaDoCampo: 1 });
      for (let i = 0; i < 30; i++) c.atualizar({ ...quadroEmCasa(false), tanHalfFov });
      const interna = c as unknown as { mats: THREE.ShaderMaterial[]; matsDoCampo: THREE.ShaderMaterial[] };
      const v = [...interna.mats, ...interna.matsDoCampo].map((m) => [
        m.uniforms.uGanho.value as number,
        m.uniforms.uMeiaPx.value as number,
      ]);
      c.dispose();
      return v;
    };
    expect(ler(Math.tan(Math.PI / 9))).toEqual(ler());
  });

  it('o Sol RESOLVIDO entrega a óptica ao bloom: soltura 0 ⇒ sem asa', () => {
    // a segunda lição do dono (16/08): a asa modela a óptica do PONTO —
    // aplicá-la a um disco resolvido concentrava o fluxo inteiro numa
    // conta de PSF e desenhava um círculo branco no meio da fotosfera.
    // Com a soltura em 0 (superfície dona — R2 do item 44, a rampa única
    // no domínio do tamanho) a asa nem candidata, e o clarão do disco é
    // a convolução do bloom sobre a imagem real.
    const c = new ClaraoDeAsas(META.named);
    const perto = {
      ...quadroEmCasa(true),
      camPos: new THREE.Vector3(0, 0, 0.1 / 206264.80624548031), // 0,1 UA
      solturaDoSol: 0, // corpo resolvido: a superfície é a dona
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
    // o SOL: a asa dá a ESCALA e o teto de ocupação do dono dá o LIMITE
    // ("nenhuma estrela ocupa a tela toda") — nunca exposição de cena
    const m = -0.15 + 5 * Math.log10(dPc);
    const pico = picoDaPsf(m, EXPO_M0, SIGMA_PX, 900);
    const sigma = sigmaDaPsfPx(SIGMA_PX, 900);
    const esperado = Math.min(
      FATOR_DE_ENCHIMENTO_DO_SOL *
        Math.max(raioVisivelDaAsaPx(pico, sigma), alcanceDoEspinhoPx(pico, sigma), meiaDaArtePx(m, 900)),
      OCUPACAO_MAXIMA_DA_TELA * 900
    );
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

  it('BV_MEDIDO é o literal de antes da fusão, entrada por entrada', () => {
    // A tabela existia DUAS vezes — aqui e como `HERO_BV` em
    // heroStars.ts (apagado em 13/11), com diff vazio nas 16. A fusão só é honesta se
    // nenhum número tiver andado no caminho: este é o literal que as
    // duas cópias tinham no commit anterior, colado inteiro.
    expect(BV_MEDIDO).toEqual({
      Sirius: 0.0,
      Canopus: 0.15,
      Arcturus: 1.23,
      'Rigil Kentaurus': 0.71,
      Vega: 0.0,
      Capella: 0.8,
      Rigel: -0.03,
      Procyon: 0.42,
      Achernar: -0.16,
      Betelgeuse: 1.85,
      Hadar: -0.23,
      Altair: 0.22,
      Acrux: -0.26,
      Aldebaran: 1.54,
      Spica: -0.23,
      Antares: 1.83,
    });
  });

  it('o teto de elegíveis por quadro é orçamento + folga de desafiantes', () => {
    expect(ELEGIVEIS_POR_QUADRO).toBe(ORCAMENTO_DO_CLARAO + 8);
  });

  it('o teto do clarão é UM SÓ, e não há porta por onde um segundo entrar', () => {
    // A LEI NOVA, decidida por ele em 23/08: *"vamos igualar o clarao…
    // nao quero essa distincao entre modo atlas e modo filme, para mim o
    // filme é um feature do atlas"*.
    //
    // ESTE TRILHO JÁ FOI SABOTADO E CEDEU DUAS VEZES, e a segunda é a
    // razão de este comentário não prometer mais o que promete um lacre.
    //
    //  · 23/08 — a versão de então guardava a decisão com REGEX DE NOME
    //    PRÓPRIO (`OCUPACAO_NA_OBSERVACAO`, `tetoDeOcupacao`, `q.fase`), e
    //    uma sonda atravessou 20/20: bastou chamar o segundo teto de
    //    outro nome (`TETO_DA_LEITURA`), passá-lo por um campo de outro
    //    nome (`doseDoQuadro`) e escolher por modo sem tocar em `q.fase`.
    //    Dente que decora nome não guarda comportamento nenhum.
    //  · 24/08 — os dentes de FORMA que substituíram aqueles cederam a
    //    uma sonda nova: um segundo teto como VARIÁVEL DE MÓDULO com
    //    setter exportado (`let tetoDaLeitura` + `setTetoDaLeitura`, a
    //    forma exata do falecido `setGradacao`) passou 20/20 aqui, 67/67
    //    em `simbolosProibidos` e a suíte inteira. O estado entrou POR
    //    FORA de `QuadroDoClarao` — e a lista fechada de campos, por
    //    construção, não enxerga o que não passa pelo quadro.
    //
    // A LIÇÃO, escrita para não se perder: um `it` de unidade mede o
    // CAMINHO PADRÃO. Ele não pode provar que nenhum caminho existe —
    // essa é a pergunta que a varredura invertida responde, e por isso a
    // resposta ao segundo furo foi uma regra nova em
    // `simbolosProibidos.test.ts` (estado mutável de módulo em
    // `clarao.ts`), provada por sabotagem antes e depois.
    //
    // OS DENTES REAIS, sem retórica — o que cada um cobre DE FATO:
    //  (1) o PINO do número, aqui;
    //  (2) o COMPORTAMENTO NO PADRÃO: com a construção normal da camada,
    //      quem manda no tamanho é o teto;
    //  (3) as PORTAS NOMEADAS: a lista FECHADA de campos do quadro, que
    //      barra a entrada por dado;
    //  (4) o SÍMBOLO PROIBIDO (`simbolosProibidos`), que barra a entrada
    //      por estado de módulo — o canal do furo de 24/08.
    // Juntos encarecem muito a volta da distinção por modo; NÃO a tornam
    // impossível. Uma propriedade mutável dentro de um objeto exportado,
    // por exemplo, ainda passaria. Quem vier depois: acrescente o dente,
    // não a promessa.
    //
    //  1. o NÚMERO — recalibrar é mudar aqui junto, e o pino MUDOU em
    //     24/08, com declaração. Era 0,55 (o do filme, escolhido em
    //     23/08 quando a unificação subiu); ele OLHOU as fotos e
    //     reprovou o tamanho — *"essa estrela spiked desse tamanho (sol)
    //     ocupa todo sistema solar na visão afastada… acho que a versão
    //     anterior fica melhor em todo o app, unificada"* —, e o teto
    //     único desceu para 0,07, o número que a observação tinha.
    //     O QUE NÃO MUDOU é a LEI que este `it` guarda: continua sendo
    //     UM teto para o app inteiro, filme incluído. Este dente pina o
    //     VALOR — mexer no número é recalibrar (com declaração, como
    //     agora); mexer na lei é outra coisa.
    expect(OCUPACAO_MAXIMA_DA_TELA).toBe(0.07);

    //  2. COMPORTAMENTO NO CAMINHO PADRÃO: onde o teto MORDE, a meia do
    //     Sol É o teto — e o número sai do UNIFORM do material, não de
    //     uma constante relida. A 1 UA a asa pede 649,7 px numa tela de
    //     900 e o teto só deixa 63,0 (eram 495 com o 0,55 de 23/08):
    //     quem manda no número é o teto. Um segundo teto MENOR que
    //     agisse na construção NORMAL da camada muda este número e
    //     reprova aqui — mas um que só acenda por chamada externa em
    //     runtime NÃO passa por este caminho, e foi assim que a sonda de
    //     24/08 sobreviveu. Quem cobre aquele canal é a varredura
    //     invertida, não este `it`.
    //     (A soltura entra em 1 pelo fixture: é entrada SINTÉTICA, o
    //     "regime de longe" que ele declara. Em produção a 1 UA a rampa
    //     já estaria entregando a óptica ao bloom — o que se mede aqui é
    //     a lei do teto, e para isso o clarão precisa existir.)
    const meiaDoSolEm = (screenH: number) => {
      const c = new ClaraoDeAsas(META.named);
      const dPc = 1 / 206264.80624548031;
      const q = {
        ...quadroEmCasa(true),
        screenH,
        camPos: new THREE.Vector3(0, 0, dPc),
      };
      for (let i = 0; i < 30; i++) c.atualizar(q);
      const m = -0.15 + 5 * Math.log10(dPc);
      const pico = picoDaPsf(m, EXPO_M0, SIGMA_PX, screenH);
      const sigma = sigmaDaPsfPx(SIGMA_PX, screenH);
      const asa =
        FATOR_DE_ENCHIMENTO_DO_SOL *
        Math.max(raioVisivelDaAsaPx(pico, sigma), alcanceDoEspinhoPx(pico, sigma));
      const doSol = (
        c.group.children.filter((f) => (f as THREE.Mesh).visible) as THREE.Mesh[]
      ).find((mh) => mh.position.length() === 0)!;
      const meia = (
        (doSol.material as THREE.ShaderMaterial).uniforms.uMeiaPx as { value: number }
      ).value;
      c.dispose();
      return { asa, meia };
    };
    // a 900 px de tela: a asa PASSA do teto, logo quem manda é o teto
    const alto = meiaDoSolEm(900);
    expect(alto.asa).toBeGreaterThan(OCUPACAO_MAXIMA_DA_TELA * 900);
    expect(alto.meia).toBeCloseTo(OCUPACAO_MAXIMA_DA_TELA * 900, 9);
    // e o número É o teto, não uma coincidência de escala: com a tela
    // pela metade a meia acompanha o teto, não a asa
    const baixo = meiaDoSolEm(450);
    expect(baixo.asa).toBeGreaterThan(OCUPACAO_MAXIMA_DA_TELA * 450);
    expect(baixo.meia).toBeCloseTo(OCUPACAO_MAXIMA_DA_TELA * 450, 9);
    expect(alto.meia / baixo.meia).toBeCloseTo(2, 9);

    //  3. ESTRUTURA: o quadro do clarão declara ESTES campos e mais
    //     nenhum. É a porta que a sonda usou — ela entrou por um campo
    //     novo no quadro —, e uma lista fechada a fecha sem depender do
    //     nome que o próximo invente. Campo novo aqui é decisão de
    //     desenho: passa por quem decide, não por um diff distraído.
    const CLARAO = readFileSync(new URL('./clarao.ts', import.meta.url), 'utf8');
    //     (08/10: `transmitanciaDoSol` entrou por decisão — o ar da Terra
    //     no raio até o Sol multiplica a EMISSÃO, não o tamanho; teto
    //     nenhum passa por ela.)
    //     (12/11: `visitadas` entrou por decisão — as estrelas montadas
    //     pelo motor do Sol candidatam pela MESMA lei; cada uma traz só
    //     posição, magnitude, cor e a soltura dela, que é ≤ 1 e só encolhe
    //     o quad abaixo do MESMO `meiaDaLei` — teto nenhum entra por ela.)
    //     (13/11: `lente` entrou por decisão — a luz que a lente de cinema
    //     acendeu, só lida pela luz única: ela só TIRA do halo do campo
    //     (`fatiaDoCampo` ≤ 1), nunca toca tamanho, teto nem a camada 0.)
    //     (13/11: `aneis` e `tanHalfFov` entraram por decisão — o anel no
    //     caminho multiplica a presença por uma transmitância ≤ 1; tamanho
    //     e teto não passam por eles.)
    expect(camposDaInterface(CLARAO, 'QuadroDoClarao')).toEqual([
      'camPos', 'screenH', 'dtS', 'solVisivel', 'solturaDoSol', 'expoM0', 'sigmaPx', 'pr',
      'transmitanciaDoSol', 'visitadas', 'lente', 'aneis', 'tanHalfFov',
    ]);
    //     ...e o módulo do Sol no quadro não recebe MODO nenhum para
    //     repassar: o `fase: Phase` que sobrava no parâmetro (sem leitor,
    //     desde que o ternário morreu) saiu, e a lista fechada impede que
    //     ele volte com outro nome.
    const SOL_NO_QUADRO = readFileSync(
      new URL('../director/solNoQuadro.ts', import.meta.url),
      'utf8'
    );
    expect(camposDoParametro(SOL_NO_QUADRO, 'atualizarCorpoEClarao')).toEqual([
      'dHome', 'hPx', 'prAtual', 'tanHalfFov', 'camPos', 'dtS',
    ]);
  });
});
