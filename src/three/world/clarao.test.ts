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
//     está em casa. (A identidade "as 16" NÃO morreu: as heroes de
//     autor voltaram em 16/08 e vivem em `heroStars.ts` — esta camada é
//     que ficou só com o Sol.)
//  3. A CAMADA DE VERDADE — instancia `ClaraoDeAsas` com o sidecar REAL
//     do repo (o mesmo molde de lodStellar.test.ts antes do M2):
//     profundidade pela §5.15, billboards em px pela lei, Sol como
//     candidato apenas enquanto a camada dos dez o desenha.
// ============================================================
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { StarsMeta } from '../config';
import { HeroStars } from './heroStars';
import {
  BV_MEDIDO,
  ClaraoDeAsas,
  ELEGIVEIS_POR_QUADRO,
  FATOR_DE_ENCHIMENTO_DO_SOL,
  OCUPACAO_MAXIMA_DA_TELA,
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
import { EXPO_M0, SIGMA_PX, picoDaPsf, sigmaDaPsfPx } from '../luzDaCasa';
import { RAMP_DURATION_MS } from './lodStellar';

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
    expect(c.group.children).toHaveLength(ORCAMENTO_DO_CLARAO);
    for (const filho of c.group.children) {
      const mat = (filho as THREE.Mesh).material as THREE.ShaderMaterial;
      expect(mat.depthTest).toBe(false);
      expect(mat.depthWrite).toBe(false);
      expect(mat.blending).toBe(THREE.AdditiveBlending);
    }
    c.dispose();
  });

  it('a receita montada é BYTE A BYTE a de antes, nos DOIS shaders', () => {
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
    const h = new HeroStars(META.named);
    const fragDo = (o: THREE.Object3D) =>
      ((o as THREE.Mesh).material as THREE.ShaderMaterial).fragmentShader;
    const fragDoSol = fragDo(c.group.children[0]);
    const fragDasHeroes = fragDo(h.group.children[0]);

    expect(fragDoSol).toContain(
      `  float core = exp(-r * r * 90.0) * 3.0;
  float glow = exp(-r * 4.5) * 0.9;
  float ax = exp(-abs(uv.y) * 16.0) * exp(-abs(uv.x) * 2.4);
  float ay = exp(-abs(uv.x) * 16.0) * exp(-abs(uv.y) * 2.4);
  float spikes = (ax + ay) * 0.8;`
    );
    // nas heroes o núcleo e os braços levam `uCore` (1,0 nelas): é a
    // ÚNICA diferença entre os dois, e é o parâmetro da receita
    expect(fragDasHeroes).toContain(
      `  float core = exp(-r * r * 90.0) * 3.0 * uCore;
  float glow = exp(-r * 4.5) * 0.9;

  // spikes de difração
  float ax = exp(-abs(uv.y) * 16.0) * exp(-abs(uv.x) * 2.4);
  float ay = exp(-abs(uv.x) * 16.0) * exp(-abs(uv.y) * 2.4);
  float spikes = (ax + ay) * 0.8 * uCore;`
    );
    for (const frag of [fragDoSol, fragDasHeroes]) {
      expect(frag).toContain('vec3(1.0, 0.98, 0.95)');
    }
    c.dispose();
    h.dispose();
  });

  it('os números da receita NÃO voltam a ser redigitados nos dois fontes', () => {
    // A VARREDURA INVERTIDA do endereço único, no idioma de
    // `simbolosProibidos.test.ts`: o que os fontes tinham de conter
    // agora não podem conter. Sem ela, nada impede a cópia de renascer
    // — e a cópia só é notada quando alguém corrige um lado só.
    const heroes = readFileSync(new URL('./heroStars.ts', import.meta.url), 'utf8');
    const clarao = readFileSync(new URL('./clarao.ts', import.meta.url), 'utf8');
    for (const linha of [
      'exp(-r * r * 90.0) * 3.0',
      'exp(-r * 4.5) * 0.9',
      'exp(-abs(uv.y) * 16.0) * exp(-abs(uv.x) * 2.4)',
      'exp(-abs(uv.x) * 16.0) * exp(-abs(uv.y) * 2.4)',
      '(ax + ay) * 0.8',
      'vec3(1.0, 0.98, 0.95)',
    ]) {
      expect(heroes, linha).not.toContain(linha);
      expect(clarao, linha).not.toContain(linha);
    }
  });

  it('no RESGATE a camada é SÓ do Sol: nomeada nunca ocupa slot', () => {
    // ordem do dono (16/08): as 16 voltaram à arte do filme
    // (heroStars.ts); esta camada fica só com o Sol até o M3 unificar de
    // novo, com o visto dele na estética
    const c = new ClaraoDeAsas(META.named);
    for (let i = 0; i < 30; i++) c.atualizar(quadroEmCasa(true));
    expect(c.ocupacao().every((o) => o.indice === 0)).toBe(true);
    // e com o Sol-ponto oculto, a camada fica VAZIA
    for (let i = 0; i < 30; i++) c.atualizar(quadroEmCasa(false));
    expect(c.ocupacao()).toHaveLength(0);
    c.dispose();
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
        Math.max(raioVisivelDaAsaPx(pico, sigma), alcanceDoEspinhoPx(pico, sigma)),
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
    // heroStars.ts, com diff vazio nas 16. A fusão só é honesta se
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
    // ESTE TRILHO JÁ FOI SABOTADO E CEDEU — a versão de 23/08 guardava a
    // decisão com REGEX DE NOME PRÓPRIO (`OCUPACAO_NA_OBSERVACAO`,
    // `tetoDeOcupacao`, `q.fase`), e uma sonda de auditoria atravessou
    // 20/20 verdes: bastou chamar o segundo teto de outro nome
    // (`TETO_DA_LEITURA`), passá-lo por um campo de outro nome
    // (`doseDoQuadro`) e escolher por modo sem tocar em `q.fase`. Dente
    // que decora nomes não guarda comportamento nenhum. Os dentes de
    // agora não perguntam COMO a coisa se chama:
    //
    //  1. o NÚMERO é o do filme, 0,55 — recalibrar é mudar aqui junto.
    expect(OCUPACAO_MAXIMA_DA_TELA).toBe(0.55);

    //  2. COMPORTAMENTO: onde o teto MORDE, a meia do Sol É o teto — e
    //     o número sai do UNIFORM do material, não de uma constante
    //     relida. A 1 UA a asa pede 649,7 px numa tela de 900 e o teto
    //     só deixa 495: quem manda no número é o teto. Qualquer segundo
    //     teto MENOR — com qualquer nome, por qualquer caminho, escolhido
    //     por qualquer modo — muda este número e reprova aqui.
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
    expect(camposDaInterface(CLARAO, 'QuadroDoClarao')).toEqual([
      'camPos', 'screenH', 'dtS', 'solVisivel', 'solturaDoSol', 'expoM0', 'sigmaPx', 'pr',
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
