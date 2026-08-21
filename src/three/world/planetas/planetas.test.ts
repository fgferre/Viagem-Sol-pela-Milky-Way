// ============================================================
// Régua 1 da D10, ELO FINAL: da tabela congelada ao pixel.
//
// As duas fases anteriores já julgaram o dado (`retrato.test.ts`: a
// proveniência bit-exata e o oráculo Horizons; `fotometria.test.ts`: as
// duas leis e a tabela dos 10). O que falta — e é o que este arquivo
// faz — é julgar a CAMADA: a ponte de frame que vira posição de cena, a
// magnitude que o vertex calcula por quadro, a projeção em NDC e px nas
// três vistas profundas, e o corte de custo que promete não piscar.
//
// TRÊS COISAS QUE ESTE ARQUIVO DESCOBRIU E PINA, ditas antes de tudo:
//
// (1) A CÂMERA DO QUADRO NÃO TEM `up` PADRÃO. Com `?pos=&look=` o app
//     entra em voo livre, e o `FreeRoam` escreve `camera.up` = polo
//     galáctico a cada quadro (`cameraRig.ts:33-40` e `:363-365`). Uma
//     régua 1 montada com o `up` default do three (0,1,0) julgaria uma
//     imagem GIRADA em torno do eixo de visada em relação à que o
//     navegador desenha — o raio ao centro bateria, o par (x,y) não. Por
//     isso as tabelas abaixo vêm em DUAS convenções: a NEUTRA (up
//     padrão, geometria pura) e a DO QUADRO (up = polo galáctico), e é a
//     segunda que a régua 2 (CDP) tem de reproduzir.
// (2) NO LIMIAR DO DOMÍNIO O CORTE NÃO PISCA — mas não pelo motivo que
//     o desenho previa. Em 0,05 pc o corpo mais brilhante NÃO é Júpiter
//     (m = 15,53): é VÊNUS (m = 15,37), porque a fase Lambertiana cobra
//     1,27 mag de Júpiter e só 0,38 de Vênus naquela geometria. Os dois
//     estão quatro ordens de grandeza abaixo de um passo de 8 bits, que
//     é o que importa; o "Júpiter" da D3 era uma previsão sem a fase.
// (3) O SOL É O ÚNICO QUE PRECISARIA DO CORTE, e ele já está apagado
//     por outro caminho: em 0,05 pc o pico da PSF dele vale 1.010, mas
//     `deepPointGain(0,05)` era 0 EXATO (teorema de complementaridade,
//     `lodStellar.ts`), e o alpha zera cor e espinhos juntos.
// ============================================================

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import {
  AU_PARA_PC,
  eclipticaParaEquatorial,
  galacticaParaEquatorial,
} from '../../../lib/atlas/frameGalactico';
import { farPlanePc, nearPlanePc } from '../../core/engine';
import { StarField } from '../stars';
import {
  catalogApparentMag,
} from '../lodStellar';
import { LIMIAR_SISTEMA_SOLAR_PC } from '../../escala';
import type { MetaEfemerides } from '../../../lib/atlas/efemerides';
import { MotorEfemerides, decodeEfemerides } from '../../../lib/atlas/efemerides';
import {
  A_MAG_BASE,
  FOTOMETRIA,
  IDS_FOTOMETRIA,
  aMagBaseDe,
  faseLambertiana,
  magAparente,
  magAparenteEstelar,
} from './fotometria';
import { EPOCA_JD_TDB, IDS_RETRATO, RETRATO_2026 } from './retrato2026';
import type { FonteDeEfemerides } from './planetas';
import {
  A_MAG_BASE_PC,
  DESLOCAMENTO_UA_PARA_PC,
  DIST_MIN_PC,
  FASE_MIN,
  LOG10_DE_2,
  PLANETAS_DEFAULT_ON,
  PONTO_ZERO_SOL_PC,
  Planetas,
  UA_POR_PC,
  faseDoVertice,
  magDoVertice,
} from './planetas';
import { fluxoDeMagnitude, picoDaPsf } from '../../luzDaCasa';

/**
 * O buffer EFETIVO do harness: `--window-size=1800,1800` com
 * `--force-device-scale-factor=1` deixa 1800×1713 de viewport (a barra
 * do navegador come 87 px), e `pixelRatio` fica em 1 — logo
 * `renderer.domElement` é 1800×1713 e é ele que vira `uScreenH` e a
 * régua de px. Fixado aqui porque a régua 2 lê o MESMO número do
 * `?dbgplan`.
 */
const LARGURA_PX = 1800;
const ALTURA_PX = 1713;

/** As três vistas profundas da D9, em pc de cena (o eixo z, olhando a origem). */
const VISTAS = [
  ['ua500', 0.0024241],
  ['ua150', 0.00072722],
  ['ua40', 0.00019393],
] as const;

/**
 * A CADEIA FLOAT64 recomputada AQUI, elo a elo, sem tocar em
 * `planetas.ts`: é o oráculo independente da posição de cena (D1).
 */
function cadeiaFloat64(): [number, number, number][] {
  return IDS_FOTOMETRIA.map((id) => {
    if (id === 'sun') return [0, 0, 0] as [number, number, number];
    const v = RETRATO_2026[id].vetorUA;
    const eq = eclipticaParaEquatorial([v[0], v[1], v[2]]);
    return [eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC];
  });
}

/** O polo norte galáctico em equatorial J2000, DERIVADO do frame da
 *  casa — é o `GALACTIC_NORTH` do `cameraRig.ts:13-17`, que não é
 *  exportado (e cuja igualdade este arquivo pina). */
const POLO_GALACTICO = galacticaParaEquatorial([0, 0, 1]);

function camera(dPc: number, up: THREE.Vector3): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(
    58,
    LARGURA_PX / ALTURA_PX,
    nearPlanePc(dPc),
    farPlanePc(dPc)
  );
  cam.up.copy(up);
  cam.position.set(0, 0, dPc);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld(true);
  return cam;
}

const UP_NEUTRO = new THREE.Vector3(0, 1, 0);
const UP_DO_QUADRO = new THREE.Vector3(
  POLO_GALACTICO[0],
  POLO_GALACTICO[1],
  POLO_GALACTICO[2]
).normalize();

function projetar(
  p: readonly [number, number, number],
  cam: THREE.PerspectiveCamera
): [number, number, number, number, number] {
  const v = new THREE.Vector3(p[0], p[1], p[2]).project(cam);
  return [v.x, v.y, ((v.x + 1) / 2) * LARGURA_PX, ((1 - v.y) / 2) * ALTURA_PX, v.z];
}

// ------------------------------------------------------------
// AS TABELAS PINADAS — [ndcX, ndcY, pxX, pxY] por corpo, na ordem de
// `IDS_FOTOMETRIA` (sol primeiro). Geradas desta mesma cadeia e
// congeladas: qualquer mexida em época, tabela, ponte de frame, fov,
// aspecto ou near/far mexe nestes números.
// ------------------------------------------------------------
const PROJ_NEUTRA: Record<string, [number, number, number, number][]> = {
  ua500: [
    [0, 0, 900, 856.5],
    [-0.0007386116346358158, -0.001334501319003517, 899.3352495288277, 857.6430003797266],
    [0.0003050419625841915, -0.002366199770567463, 900.2745377663259, 858.5266501034911],
    [-0.0005989372973562329, 0.0032061352787499642, 899.4609564323794, 853.7539451337507],
    [0.0011681166851161013, -0.004532349206436136, 901.0513050166045, 860.3819570953126],
    [-0.005839755269058357, 0.01635580785680893, 894.7442202578475, 842.4912505706432],
    [0.03262874690603189, 0.0014021372961464985, 929.3658722154286, 855.2990694058506],
    [0.03438135796136751, 0.056455382028082174, 930.9432221652307, 808.1459652929476],
    [0.10248133977645102, 0.0027194937457432305, 992.2332057988059, 854.170753606771],
    [0.06422572215339932, -0.092154194142485, 957.8031499380594, 935.4300672830384],
  ],
  ua150: [
    [0, 0, 900, 856.5],
    [-0.0024600602420618853, -0.0044447629632566096, 897.7859457821443, 860.3069394780293],
    [0.001015395563134409, -0.007876387655553237, 900.913856006821, 863.2461260269813],
    [-0.0020000804186237693, 0.010706510378953161, 898.1999276232386, 847.3298738604266],
    [0.0038831682849536564, -0.015066880662712551, 903.4948514564583, 869.4047832876133],
    [-0.019648074010500595, 0.05502972444321751, 882.3167333905494, 809.3670410143842],
    [0.10863790593225123, 0.004668437317606728, 997.7741153390261, 852.5014834374699],
    [0.11831153781945992, 0.19427164783405876, 1006.4803840375139, 690.1063336301287],
    [0.3409179071092834, 0.009046760300147925, 1206.826116398355, 848.7514498029233],
    [0.2013076033716568, -0.28884595363772253, 1081.1768430344912, 1103.8965592907093],
  ],
  ua40: [
    [0, 0, 900, 856.5],
    [-0.009195477913683007, -0.0166141133299752, 891.7240698776852, 870.7299880671238],
    [0.003786794509813339, -0.029374031770574537, 903.408115058832, 881.6588582114972],
    [-0.007553557751899788, 0.040434496391092305, 893.2017980232902, 821.8678538410294],
    [0.014407344433275847, -0.05590119286971717, 912.9666099899482, 904.3793716929126],
    [-0.07648711693846068, 0.21422277655968616, 831.1615947553854, 673.0181918766289],
    [0.4055356042563382, 0.017426859734475476, 1264.9820438307045, 841.5738946374217],
    [0.5082066101541123, 0.8344928771482956, 1357.385949138701, 141.75685072248484],
    [1.2683290941763568, 0.03365698620530101, 2041.4961847587213, 827.6727913151597],
    [0.6114776915128911, -0.8773779726896388, 1450.329922361602, 1607.9742336086756],
  ],
};

const PROJ_DO_QUADRO: Record<string, [number, number, number, number][]> = {
  ua500: [
    [0, 0, 900, 856.5],
    [-0.0010737614073871571, 0.001053665757625911, 899.0336147333516, 855.5975352785935],
    [-0.00226324519435322, 0.0002141279980690684, 897.9630793250822, 856.3165993696539],
    [0.003107945027324448, -0.00009998852511694361, 902.797150524592, 856.5856401717626],
    [-0.004465080299511251, -0.00018793457756093173, 895.9814277304399, 856.6609659656808],
    [0.016474581884088752, 0.002342278523284416, 914.8271236956799, 854.4938384448069],
    [-0.005960976974302792, -0.033738029039033605, 894.6351207231276, 885.3966218719323],
    [0.044727237687312425, -0.047786150606771875, 940.2545139185812, 897.4288379947001],
    [-0.020285178713081976, -0.10559052914985191, 881.7433391582261, 946.9382882168483],
    [-0.09979457647674163, -0.0452850535854066, 810.1848811709325, 895.2866483959008],
  ],
  ua150: [
    [0, 0, 900, 856.5],
    [-0.003576328375975291, 0.0035093967075614527, 896.7813044616222, 853.4942017199736],
    [-0.007533681953666492, 0.0007127695394438526, 893.2196862417002, 855.8895128894663],
    [0.01037861562261924, -0.00033389987909622124, 909.3407540603574, 856.785985246446],
    [-0.014843258751252352, -0.0006247505925816442, 886.6410671238729, 857.0350988825461],
    [0.05542934407982868, 0.007880683292079013, 949.8864096718457, 849.7501947603344],
    [-0.019847162922426023, -0.11233127755833378, 882.1375533698166, 952.7117392287129],
    [0.15391330031665693, -0.16443948988612378, 1038.521970284991, 997.3424230874651],
    [-0.06748136477613438, -0.3512610421258479, 839.266771701479, 1157.3550825807888],
    [-0.3127937895667411, -0.14194041421693496, 618.485589389933, 978.0719647768047],
  ],
  ua40: [
    [0, 0, 900, 856.5],
    [-0.013367985072509993, 0.013117800679419866, 887.9688134347409, 845.2646037180768],
    [-0.02809595245104272, 0.002658187485472476, 874.7136427940616, 854.2232624186928],
    [0.03919616019448196, -0.001261015305495122, 935.2765441750337, 857.5800596091565],
    [-0.05507151007854937, -0.0023179518145256895, 850.4356409293056, 858.4853257291413],
    [0.21577843814056413, 0.030678362886564843, 1094.2005943265076, 830.2239821876572],
    [-0.07408768734496207, -0.4193226308128024, 833.3210813895341, 1215.6498332911654],
    [0.661133800246272, -0.7063489941109775, 1495.0204202216446, 1461.4879134560522],
    [-0.2510533371098716, -1.306809029647443, 674.0519966011157, 1975.7819338930349],
    [-0.9501202198047195, -0.4311481303441669, 44.891802175752446, 1225.778373639779],
  ],
};

const FONTE = readFileSync(new URL('./planetas.ts', import.meta.url), 'utf8');

/**
 * O `update` inteiro, para as afirmações de "sem alocação / sem D8". O
 * fim do recorte é o comentário do CAMINHO VIVO da F4, que passou a ser
 * o método seguinte: o caminho vivo é irmão do `update`, não parte
 * dele — ele roda na troca de instante, não no quadro.
 */
const CORPO_DO_UPDATE = FONTE.slice(
  FONTE.indexOf('  update(screenH: number'),
  FONTE.indexOf('  /**\n   * O CAMINHO VIVO')
);

function camada(): Planetas {
  return new Planetas({ expoM0: 3.5, sigmaPx: 0.85 });
}

const atributo = (p: Planetas, nome: string) =>
  p.points.geometry.getAttribute(nome) as THREE.BufferAttribute;

// ============================================================
// 1. Estrutura: o objeto, o material, o lugar na cena
// ============================================================
describe('a camada nasce com a estrutura que a D3 manda', () => {
  it('são DEZ vértices — o Sol e os nove do retrato, nessa ordem', () => {
    const p = camada();
    expect(atributo(p, 'position').count).toBe(10);
    expect(IDS_FOTOMETRIA).toHaveLength(10);
    expect(IDS_FOTOMETRIA[0]).toBe('sun');
    p.dispose();
  });

  it('os quatro atributos existem com o itemSize certo', () => {
    const p = camada();
    expect(atributo(p, 'position').itemSize).toBe(3);
    expect(atributo(p, 'aMagBase').itemSize).toBe(1);
    expect(atributo(p, 'aCor').itemSize).toBe(3);
    expect(atributo(p, 'aEhSol').itemSize).toBe(1);
    p.dispose();
  });

  it('o material é aditivo, sem escrita e COM teste de profundidade (Onda 6)', () => {
    // depthTest virou true na F0 da Onda 6: o motivo do false era a
    // esfera do Sol, que não escreve depth — contra o buffer que só o
    // grupo dos corpos resolvidos escreve, testar é o correto (ponto
    // atrás de corpo resolvido some). depthWrite segue false: a camada
    // só soma luz, nunca oclui ninguém.
    const p = camada();
    expect(p.material.blending).toBe(THREE.AdditiveBlending);
    expect(p.material.depthWrite).toBe(false);
    expect(p.material.depthTest).toBe(true);
    expect(p.material.transparent).toBe(true);
    p.dispose();
  });

  it('renderOrder 7 (slot livre) e frustumCulled desligado', () => {
    const p = camada();
    expect(p.points.renderOrder).toBe(7);
    expect(p.points.frustumCulled).toBe(false);
    p.dispose();
  });

  it('é objeto PRÓPRIO: nasce sem pai, nunca dentro do grupo do Sol', () => {
    // pendurado em `sun.group` herdaria a escala 0,005 do doador e o
    // `return` antecipado quando o disco apaga (stellarBody.ts).
    const p = camada();
    expect(p.points.parent).toBe(null);
    expect(p.points).toBeInstanceOf(THREE.Points);
    p.dispose();
  });

  it('a PSF é a DO CAMPO, recebida por parâmetro e não redigitada', () => {
    const campo = new StarField({
      position: new Float32Array(3),
      logLum: new Float32Array(1),
      ci: new Float32Array(1),
    });
    const p = new Planetas(campo);
    expect(p.material.uniforms.uExpoM0.value).toBe(campo.expoM0);
    expect(p.material.uniforms.uSigmaPx.value).toBe(campo.sigmaPx);
    expect(campo.expoM0).toBe(3.5);
    expect(campo.sigmaPx).toBe(0.85);
    p.dispose();
    campo.dispose();
  });

  it('o vertex traz a PSF compartilhada e o fragment É o do campo', () => {
    const p = camada();
    const comum = readFileSync(new URL('../../shaders/common.ts', import.meta.url), 'utf8');
    const shaders = readFileSync(new URL('../../shaders/starShaders.ts', import.meta.url), 'utf8');
    expect(p.material.vertexShader).toContain('void starPSF(');
    expect(comum).toContain('export const GLSL_STAR_PSF');
    // o fragment não é cópia: é o mesmo objeto de string do campo
    expect(shaders).toContain('export const STAR_FRAG');
    expect(p.material.fragmentShader).toContain('if (r2 > 1.0) discard;');
    expect(p.material.fragmentShader).toContain('varying float vPeak;');
    p.dispose();
  });

  it('a chave está LIGADA desde a F4, e o objeto ainda nasce apagado', () => {
    // A F3 pinava `false` aqui. A F4 virou a chave depois do envelope
    // medido (régua 3 no pixel + as quatro distâncias do mergulho), e as
    // três vistas profundas do gate mudaram de md5 — as quinze antigas
    // não. A porta de volta é `?noplan=1`, e é EXATA: com ela as três
    // devolvem os md5 de antes da camada, bit a bit, com o mesmo binário.
    expect(PLANETAS_DEFAULT_ON).toBe(true);
    // e o `ligado` do OBJETO segue nascendo false: quem o escreve é o
    // director, por quadro, cruzando a constante com as duas portas. Um
    // default `true` aqui acenderia a camada entre o construtor e o
    // primeiro `update`.
    expect(camada().ligado).toBe(false);
  });

  it('dispose devolve geometria e material sem estourar', () => {
    const p = camada();
    expect(() => p.dispose()).not.toThrow();
  });
});

// ============================================================
// 2. A ponte de frame (D1)
// ============================================================
describe('a ponte AU→cena é uma rotação e uma multiplicação (D1)', () => {
  it('o Sol é o vértice 0, em (0,0,0) EXATO — ele não é posicionado', () => {
    const p = camada();
    const a = atributo(p, 'position');
    expect([a.getX(0), a.getY(0), a.getZ(0)]).toEqual([0, 0, 0]);
    expect(atributo(p, 'aEhSol').getX(0)).toBe(1);
    p.dispose();
  });

  it('só o vértice 0 é o Sol; os outros nove marcam 0', () => {
    const p = camada();
    const s = atributo(p, 'aEhSol');
    for (let i = 1; i < 10; i++) expect(s.getX(i)).toBe(0);
    p.dispose();
  });

  it('o Float32Array do atributo É a cadeia float64 quantizada', () => {
    const p = camada();
    const a = atributo(p, 'position');
    const f64 = cadeiaFloat64();
    for (let i = 0; i < 10; i++) {
      expect(a.getX(i), IDS_FOTOMETRIA[i]).toBe(Math.fround(f64[i][0]));
      expect(a.getY(i), IDS_FOTOMETRIA[i]).toBe(Math.fround(f64[i][1]));
      expect(a.getZ(i), IDS_FOTOMETRIA[i]).toBe(Math.fround(f64[i][2]));
    }
    p.dispose();
  });

  it('a quantização custa menos de 1e-3 px na pior das três vistas', () => {
    // é o ORÇAMENTO da régua 2 (D10): se o float32 já gastasse o
    // limiar, a comparação CDP↔vitest não teria o que medir.
    const p = camada();
    const a = atributo(p, 'position');
    const f64 = cadeiaFloat64();
    let pior = 0;
    for (const [, d] of VISTAS) {
      const cam = camera(d, UP_DO_QUADRO);
      for (let i = 0; i < 10; i++) {
        const q = projetar([a.getX(i), a.getY(i), a.getZ(i)], cam);
        const e = projetar(f64[i], cam);
        pior = Math.max(pior, Math.abs(q[2] - e[2]), Math.abs(q[3] - e[3]));
      }
    }
    expect(pior).toBeLessThan(1e-3);
    p.dispose();
  });

  it('a rotação preserva a norma: |cena| em UA é o r_UA do retrato', () => {
    const f64 = cadeiaFloat64();
    IDS_RETRATO.forEach((id, k) => {
      const n = Math.hypot(...f64[k + 1]) * UA_POR_PC;
      expect(Math.abs(n / RETRATO_2026[id].rUA - 1), id).toBeLessThan(1e-14);
    });
  });

  it('o conversor de UA é DERIVADO do único da casa, não redigitado', () => {
    expect(UA_POR_PC).toBe(1 / AU_PARA_PC);
    expect(UA_POR_PC).toBeCloseTo(206264.80624548031, 6);
    expect(DESLOCAMENTO_UA_PARA_PC).toBe(5 * Math.log10(UA_POR_PC));
  });

  it('as cores do atributo são as da F1, canal a canal', () => {
    const p = camada();
    const c = atributo(p, 'aCor');
    IDS_FOTOMETRIA.forEach((id, i) => {
      const alvo = FOTOMETRIA[id].corLinear;
      expect(c.getX(i), id).toBe(Math.fround(alvo[0]));
      expect(c.getY(i), id).toBe(Math.fround(alvo[1]));
      expect(c.getZ(i), id).toBe(Math.fround(alvo[2]));
    });
    p.dispose();
  });
});

// ============================================================
// 3. Régua 1 — a projeção nas três vistas profundas
// ============================================================
describe('régua 1 — o polo galáctico É o up da câmera do quadro', () => {
  it('o polo derivado do frame da casa bate com o literal do cameraRig', () => {
    // `GALACTIC_NORTH` não é exportado (cameraRig.ts:13-17); a
    // igualdade fica pinada aqui, derivada e não copiada.
    const rig = readFileSync(new URL('../../cinematic/cameraRig.ts', import.meta.url), 'utf8');
    expect(rig).toContain('-0.867666149');
    expect(rig).toContain('-0.1980763734');
    expect(rig).toContain('0.4559837762');
    expect(POLO_GALACTICO[0]).toBeCloseTo(-0.867666149, 9);
    expect(POLO_GALACTICO[1]).toBeCloseTo(-0.1980763734, 9);
    expect(POLO_GALACTICO[2]).toBeCloseTo(0.4559837762, 9);
  });

  it('as duas convenções são a MESMA imagem girada — não outra imagem', () => {
    // o mesmo corpo, o mesmo quadro, dois `up`: trocar o up gira em
    // torno do eixo de visada, então o RAIO ao centro se conserva e o
    // par (x,y) não. (O raio conservado é o de espaço de vista, com o
    // x desfeito do aspecto — em NDC o x já vem dividido por ele.)
    const raio = (t: [number, number, number, number]) =>
      Math.hypot((t[0] * LARGURA_PX) / ALTURA_PX, t[1]);
    for (const [nome] of VISTAS) {
      for (let i = 1; i < 10; i++) {
        expect(
          raio(PROJ_NEUTRA[nome][i]) / raio(PROJ_DO_QUADRO[nome][i]),
          `${nome}/${IDS_FOTOMETRIA[i]}`
        ).toBeCloseTo(1, 9);
      }
      // e a imagem NÃO é a mesma: uma régua 1 com up padrão reprovaria a
      // régua 2 por um giro, não por um defeito
      expect(PROJ_NEUTRA[nome][5][0]).not.toBeCloseTo(PROJ_DO_QUADRO[nome][5][0], 6);
    }
  });
});

for (const [nome, dPc] of VISTAS) {
  describe(`régua 1 — projeção pinada da vista ${nome} (${(dPc * 206264.80624548031).toFixed(2)} UA)`, () => {
    it('convenção NEUTRA (up padrão do three): NDC e px', () => {
      const cam = camera(dPc, UP_NEUTRO);
      const f64 = cadeiaFloat64();
      f64.forEach((p, i) => {
        const [ndcX, ndcY, pxX, pxY] = projetar(p, cam);
        const alvo = PROJ_NEUTRA[nome][i];
        expect(ndcX, IDS_FOTOMETRIA[i]).toBeCloseTo(alvo[0], 9);
        expect(ndcY, IDS_FOTOMETRIA[i]).toBeCloseTo(alvo[1], 9);
        expect(pxX, IDS_FOTOMETRIA[i]).toBeCloseTo(alvo[2], 6);
        expect(pxY, IDS_FOTOMETRIA[i]).toBeCloseTo(alvo[3], 6);
      });
    });

    it('convenção DO QUADRO (up = polo galáctico): NDC e px', () => {
      const cam = camera(dPc, UP_DO_QUADRO);
      const f64 = cadeiaFloat64();
      f64.forEach((p, i) => {
        const [ndcX, ndcY, pxX, pxY] = projetar(p, cam);
        const alvo = PROJ_DO_QUADRO[nome][i];
        expect(ndcX, IDS_FOTOMETRIA[i]).toBeCloseTo(alvo[0], 9);
        expect(ndcY, IDS_FOTOMETRIA[i]).toBeCloseTo(alvo[1], 9);
        expect(pxX, IDS_FOTOMETRIA[i]).toBeCloseTo(alvo[2], 6);
        expect(pxY, IDS_FOTOMETRIA[i]).toBeCloseTo(alvo[3], 6);
      });
    });

    it('os dez estão À FRENTE da câmera e dentro do near/far do quadro', () => {
      const cam = camera(dPc, UP_DO_QUADRO);
      for (const p of cadeiaFloat64()) {
        const z = projetar(p, cam)[4];
        expect(z).toBeGreaterThan(-1);
        expect(z).toBeLessThan(1);
      }
      expect(cam.near).toBe(nearPlanePc(dPc));
      expect(cam.far).toBe(farPlanePc(dPc));
    });
  });
}

describe('régua 1 — o que as três vistas mostram, em quadro', () => {
  it('ua150 tem o sistema INTEIRO dentro da tela (o desfile da D9)', () => {
    const cam = camera(0.00072722, UP_DO_QUADRO);
    for (const p of cadeiaFloat64()) {
      const [x, y] = projetar(p, cam);
      expect(Math.abs(x)).toBeLessThan(1);
      expect(Math.abs(y)).toBeLessThan(1);
    }
  });

  it('ua40 já perdeu Netuno pela borda — a família em close', () => {
    const cam = camera(0.00019393, UP_DO_QUADRO);
    const fora = cadeiaFloat64()
      .map((p, i) => [IDS_FOTOMETRIA[i], projetar(p, cam)] as const)
      .filter(([, v]) => Math.abs(v[0]) > 1 || Math.abs(v[1]) > 1)
      .map(([id]) => id);
    expect(fora).toEqual(['neptune']);
    // Plutão fica por um fio (ndc x = −0,950), e é a régua de que o
    // enquadramento da D9 não mudou por acidente
    expect(PROJ_DO_QUADRO.ua40[9][0]).toBeCloseTo(-0.9501202198047195, 9);
  });

  it('o near do quadro NÃO clipa nada nas três (D5 fazendo o trabalho)', () => {
    for (const [nome, d] of VISTAS) {
      const cam = camera(d, UP_DO_QUADRO);
      const maisPerto = Math.min(
        ...cadeiaFloat64().map((p) => Math.hypot(p[0], p[1], d - p[2]))
      );
      expect(cam.near, nome).toBeLessThan(maisPerto);
      // o near VELHO era o piso de 0,001 pc = 206 UA: nas duas vistas
      // mais fundas ele clipava o Sol e a família inteira
      if (nome !== 'ua500') expect(maisPerto, nome).toBeLessThan(0.001);
    }
  });
});

// ============================================================
// 4. Paridade shader ↔ JS (a lei de magnitude)
// ============================================================
describe('a convenção única de magnitude fecha com as DUAS leis da F1', () => {
  const f64 = cadeiaFloat64();

  it('o `aMagBase` do Sol É o ponto-zero do campo a 1 pc', () => {
    expect(PONTO_ZERO_SOL_PC).toBe(-0.15);
    // a igualdade com a lei do campo, avaliada onde o clamp não age
    expect(catalogApparentMag(0, 1)).toBe(PONTO_ZERO_SOL_PC);
    expect(A_MAG_BASE_PC.sun).toBe(PONTO_ZERO_SOL_PC);
  });

  it('o `aMagBase` dos nove é o da F1 deslocado para a régua de pc', () => {
    for (const id of IDS_RETRATO) {
      expect(A_MAG_BASE_PC[id], id).toBe(A_MAG_BASE[id] + DESLOCAMENTO_UA_PARA_PC);
    }
    expect(Object.keys(A_MAG_BASE_PC)).toEqual([...IDS_FOTOMETRIA]);
  });

  it('o atributo carrega exatamente esse número (float32)', () => {
    const p = camada();
    const a = atributo(p, 'aMagBase');
    IDS_FOTOMETRIA.forEach((id, i) => {
      expect(a.getX(i), id).toBe(Math.fround(A_MAG_BASE_PC[id]));
    });
    p.dispose();
  });

  it('planetas: o m do espelho bate com `magAparente` da F1 (3 distâncias)', () => {
    let pior = 0;
    for (const [, d] of VISTAS) {
      for (let i = 1; i < 10; i++) {
        const id = IDS_RETRATO[i - 1];
        const p = f64[i];
        const dObsPc = Math.hypot(p[0], p[1], d - p[2]);
        // o oráculo monta o ângulo do zero, por acos, como a F1 pede
        const sol = [-p[0], -p[1], -p[2]];
        const obs = [-p[0], -p[1], d - p[2]];
        const cos =
          (sol[0] * obs[0] + sol[1] * obs[1] + sol[2] * obs[2]) /
          (Math.hypot(...sol) * Math.hypot(...obs));
        const phi = faseLambertiana(Math.acos(Math.min(1, Math.max(-1, cos))));
        const mF1 = magAparente(A_MAG_BASE[id], dObsPc * UA_POR_PC, phi);
        const mVert = magDoVertice(
          A_MAG_BASE_PC[id],
          dObsPc,
          faseDoVertice(p[0], p[1], p[2], 0, 0, d)
        );
        pior = Math.max(pior, Math.abs(mF1 - mVert));
      }
    }
    // a diferença é só o `log2·0,30103` que a GPU faz (e o espelho
    // repete de propósito) contra o `Math.log10` da F1
    expect(pior).toBeLessThan(1e-6);
  });

  it('Sol: o m do espelho bate com `magAparenteEstelar(4,85, d)`', () => {
    let pior = 0;
    for (const [, d] of [...VISTAS, ['limiar', LIMIAR_SISTEMA_SOLAR_PC] as const]) {
      const mF1 = magAparenteEstelar(4.85, d);
      const mVert = magDoVertice(PONTO_ZERO_SOL_PC, d, 1);
      pior = Math.max(pior, Math.abs(mF1 - mVert));
    }
    expect(pior).toBeLessThan(1e-6);
  });

  it('e fica 0,02 mag do M_V publicado (4,83) — a diferença medida na F1', () => {
    const d = 0.001;
    expect(magAparenteEstelar(4.83, d) - magDoVertice(PONTO_ZERO_SOL_PC, d, 1)).toBeCloseTo(
      -0.02,
      6
    );
  });

  it('SEM O CLAMP: abaixo de 206 UA o Sol continua ganhando brilho', () => {
    // `catalogApparentMag` clampa distPc em 1e-3 pc e satura EXATAMENTE
    // dentro do domínio profundo (achado da F1). A camada não pode.
    expect(catalogApparentMag(0, 1e-3)).toBe(catalogApparentMag(0, 1e-6));
    expect(magDoVertice(PONTO_ZERO_SOL_PC, 1e-3, 1)).toBeCloseTo(-15.15, 6);
    expect(magDoVertice(PONTO_ZERO_SOL_PC, 1e-6, 1)).toBeCloseTo(-30.15, 6);
    // e a queda é contínua, não um degrau
    let anterior = Infinity;
    for (let k = 0; k <= 60; k++) {
      const d = 1e-3 * Math.pow(10, -k / 20);
      const m = magDoVertice(PONTO_ZERO_SOL_PC, d, 1);
      expect(m).toBeLessThan(anterior);
      anterior = m;
    }
  });

  it('a 1 UA o Sol tem a magnitude que se vê da Terra (−26,7)', () => {
    expect(magDoVertice(PONTO_ZERO_SOL_PC, AU_PARA_PC, 1)).toBeCloseTo(-26.72, 2);
  });

  it('a fonte do arquivo NÃO importa `catalogApparentMag` (o clamp fica fora)', () => {
    expect(FONTE).not.toContain('catalogApparentMag');
  });

  it('a lei do espelho é a que a GPU faz: log2 × 0,30103, não log10', () => {
    expect(LOG10_DE_2).toBe(0.30103);
    expect(FONTE).toContain('log2(dPc)');
    expect(FONTE).toContain('Math.log2(d)');
    expect(LOG10_DE_2).not.toBe(Math.log10(2));
  });
});

describe('a fase Lambertiana do vertex é a mesma matemática da F1', () => {
  const f64 = cadeiaFloat64();

  it('Φ do espelho = `faseLambertiana(acos(cos α))` nos nove, 3 distâncias', () => {
    let pior = 0;
    for (const [, d] of VISTAS) {
      for (let i = 1; i < 10; i++) {
        const p = f64[i];
        const sol = [-p[0], -p[1], -p[2]];
        const obs = [-p[0], -p[1], d - p[2]];
        const cos =
          (sol[0] * obs[0] + sol[1] * obs[1] + sol[2] * obs[2]) /
          (Math.hypot(...sol) * Math.hypot(...obs));
        const phi = faseLambertiana(Math.acos(Math.min(1, Math.max(-1, cos))));
        pior = Math.max(pior, Math.abs(phi - faseDoVertice(p[0], p[1], p[2], 0, 0, d)));
      }
    }
    expect(pior).toBeLessThan(1e-12);
  });

  it('cheio dá 1, quadratura 0,5, novo dá o piso — sem NaN em nenhum', () => {
    // corpo em (1,0,0). O observador ENTRE o Sol e o corpo vê a face
    // toda iluminada (α = 0); ao lado, meia fase; atrás do corpo, a face
    // escura (α = 180°, o "novo").
    expect(faseDoVertice(1, 0, 0, 0.5, 0, 0)).toBeCloseTo(1, 12);
    expect(faseDoVertice(1, 0, 0, 1, 1, 0)).toBeCloseTo(0.5, 12);
    expect(faseDoVertice(1, 0, 0, 2, 0, 0)).toBe(FASE_MIN);
  });

  it('o vértice do Sol não pode gerar NaN: |pos| = 0 é tratado', () => {
    // `normalize(0)` daria NaN e `NaN * 0` continuaria NaN — por isso o
    // shader divide por `max(length, 1e-30)` e o espelho faz igual.
    expect(Number.isFinite(faseDoVertice(0, 0, 0, 0, 0, 0.05))).toBe(true);
    expect(FONTE).toContain('1.0e-30');
    expect(FONTE).not.toContain('normalize(-worldPos');
  });

  it('o Sol entra com Φ = 1 — ele é o iluminante, não tem fase', () => {
    const p = camada();
    expect(p.material.vertexShader).toContain('fase = mix(fase, 1.0, aEhSol);');
    p.dispose();
  });

  it('a guarda de distância existe nos dois lados, com o mesmo número', () => {
    expect(DIST_MIN_PC).toBe(1e-9);
    expect(camada().material.vertexShader).toContain('1.0e-9');
    expect(magDoVertice(0, 0, 1)).toBe(magDoVertice(0, DIST_MIN_PC, 1));
  });
});

// ============================================================
// 5. Continuidade: nenhuma faixa sem render
// ============================================================
describe('CONTINUIDADE — o Sol-ponto é o desenhista único de longe (M1)', () => {
  // Até o M1 a continuidade era um TEOREMA de duas rampas: deepPointGain
  // + sunStarGain = 1 em ~3.000 distâncias, entregando o Sol ao SunStar
  // na janela {0,02; 0,05} pc. As duas rampas e a classe morreram; a
  // continuidade virou CONSTRUÇÃO: o vértice 0 desenha em toda distância
  // de ponto (sem uGain, sem corte), o alpha dele é (1 − aCede) com
  // aCede = wResolvido da repartição (pesos somam 1 — estrela.test.ts), e
  // quem o apaga de longe é a magnitude, como qualquer estrela do céu.

  it('o shader não tem mais uGain, e o alpha é só a cessão da lei', () => {
    const fonte = camada().material.vertexShader;
    expect(fonte).not.toContain('uniform float uGain');
    expect(fonte).toContain('float alpha = 1.0 - aCede;');
  });

  it('de longe a FÍSICA apaga: m 9,85 a 100 pc, m 19,4 no núcleo galáctico', () => {
    expect(magDoVertice(A_MAG_BASE_PC.sun, 100, 1)).toBeCloseTo(9.85, 2);
    expect(magDoVertice(A_MAG_BASE_PC.sun, 8150, 1)).toBeCloseTo(19.4, 1);
    // e o pico de PSF a 100 pc já está sob o passo de 8 bits da tela
    const pico = picoDaPsf(magDoVertice(A_MAG_BASE_PC.sun, 100, 1), 3.5, 0.85, ALTURA_PX);
    expect(pico).toBeLessThan(1 / 255);
  });
});

// ============================================================
// 6. O antigo corte de custo morreu — e os nove continuam invisíveis
// ============================================================
describe('sem corte por distância (M1): a magnitude é quem decide', () => {
  /** o pico do gaussiano que a PSF entrega — espelho de `GLSL_STAR_PSF`
   *  recomputado AQUI, como todo oráculo desta régua. A paridade com o
   *  `picoDaPsf` da casa (`luzDaCasa.ts`, o endereço único desde o F0 —
   *  que o `?dbgplan` publica e a régua 3 consome) é cobrada logo abaixo:
   *  são duas escritas da mesma lei, e o dia em que divergirem a régua 3
   *  passa a classificar `SOB-LIMIAR` por um número que a GPU não usa. */
  function picoPsf(m: number): number {
    const sigma = (0.85 * ALTURA_PX) / 1080;
    return Math.pow(10, -0.4 * (m - 3.5)) / (6.2831853 * sigma * sigma);
  }

  it('`picoDaPsf` (o que o ?dbgplan publica) é o MESMO número, bit a bit', () => {
    for (const m of [-18.71, -15.84, 0, 3.5, 12.3, 15.37, 21.18, 27.66]) {
      expect(picoDaPsf(m, 3.5, 0.85, ALTURA_PX), `m=${m}`).toBe(picoPsf(m));
      expect(fluxoDeMagnitude(m, 3.5), `m=${m}`).toBe(Math.pow(10, -0.4 * (m - 3.5)));
    }
  });

  const f64 = cadeiaFloat64();
  const noLimiar = f64.map((p, i) => {
    const d = LIMIAR_SISTEMA_SOLAR_PC;
    const dObs = Math.hypot(p[0], p[1], d - p[2]);
    const fase = i === 0 ? 1 : faseDoVertice(p[0], p[1], p[2], 0, 0, d);
    return magDoVertice(A_MAG_BASE_PC[IDS_FOTOMETRIA[i]], dObs, fase);
  });

  it('no limiar os NOVE estão entre m 15,3 e 27,7 — pinado por corpo', () => {
    const alvo: Record<string, number> = {
      mercury: 18.183353613871372,
      venus: 15.368423628929492,
      earth: 17.33202632807603,
      mars: 19.62006330420029,
      jupiter: 15.526054498775792,
      saturn: 16.769464981655492,
      uranus: 20.605265300753217,
      neptune: 21.17811805458461,
      pluto: 27.655271583241035,
    };
    IDS_RETRATO.forEach((id, k) => expect(noLimiar[k + 1], id).toBeCloseTo(alvo[id], 9));
  });

  it('o mais brilhante no limiar é VÊNUS, não Júpiter — a fase manda', () => {
    // a D3 previa Júpiter (m ≈ 12,3) contando só a distância; com a fase
    // Lambertiana Júpiter leva 1,27 mag de penalidade e Vênus 0,38.
    const ordem = IDS_RETRATO.map((id, k) => [id, noLimiar[k + 1]] as const).sort(
      (a, b) => a[1] - b[1]
    );
    expect(ordem[0][0]).toBe('venus');
    expect(ordem[1][0]).toBe('jupiter');
  });

  it('o pico de PSF dos nove no limiar é ≤ 1,6e-6: quatro ordens sob 1/255', () => {
    for (let i = 1; i < 10; i++) {
      expect(picoPsf(noLimiar[i]), IDS_FOTOMETRIA[i]).toBeLessThan(1.6e-6);
    }
    expect(picoPsf(noLimiar[2])).toBeCloseTo(1.566554881325689e-6, 15);
    expect(1 / 255).toBeGreaterThan(1e-3);
  });

  it('o Sol no antigo limiar CONTINUA ACESO — era o uGain que o apagava', () => {
    // m −6,65 a 0,05 pc: dez vezes Vênus. Apagá-lo ali era o preço da
    // entrega ao SunStar; sem entrega, o pico fica — e o M1 é isso.
    expect(magDoVertice(A_MAG_BASE_PC.sun, LIMIAR_SISTEMA_SOLAR_PC, 1)).toBeCloseTo(-6.655, 2);
    expect(picoPsf(noLimiar[0])).toBeGreaterThan(1000);
  });

  it('`visible` é só `ligado` — nenhum corte por distância', () => {
    const p = camada();
    const cam = new THREE.Vector3(0, 0, 0.001);
    p.ligado = true;
    for (const h of [0.001, LIMIAR_SISTEMA_SOLAR_PC, 1, 100]) {
      p.update(ALTURA_PX, cam);
      expect(p.points.visible, `dHome=${h}`).toBe(true);
    }
    p.ligado = false;
    p.update(ALTURA_PX, cam);
    expect(p.points.visible).toBe(false);
    p.dispose();
  });
});

// ============================================================
// 7. O quadro: dois uniforms, escritos só quando mudam (M4)
// ============================================================
describe('o update escreve dois uniforms e nada mais', () => {
  it('uCamPos e uScreenH chegam ao material — o uGain morreu no M1', () => {
    const p = camada();
    p.ligado = true;
    p.update(1713, new THREE.Vector3(0.01, 0.02, 0.03));
    expect((p.material.uniforms.uCamPos.value as THREE.Vector3).toArray()).toEqual([
      0.01, 0.02, 0.03,
    ]);
    expect(p.material.uniforms.uScreenH.value).toBe(1713);
    expect(p.material.uniforms.uGain).toBeUndefined();
    p.dispose();
  });

  it('reafirmar o MESMO quadro não reescreve nada (M4)', () => {
    const p = camada();
    const cam = new THREE.Vector3(0, 0, 0.03);
    p.update(1713, cam);
    const vetor = p.material.uniforms.uCamPos.value as THREE.Vector3;
    const marcado = { escrito: false };
    // sentinela: se o update copiar de novo, o objeto muda de conteúdo
    vetor.set(9, 9, 9);
    p.update(1713, cam);
    expect(vetor.toArray()).toEqual([9, 9, 9]);
    expect(marcado.escrito).toBe(false);
    // e volta a escrever assim que a câmera de fato anda
    p.update(1713, new THREE.Vector3(0, 0, 0.02));
    expect(vetor.toArray()).toEqual([0, 0, 0.02]);
    p.dispose();
  });

  it('a geometria NUNCA é recriada: o mesmo buffer sobrevive ao quadro', () => {
    const p = camada();
    const geo = p.points.geometry;
    const a = atributo(p, 'position');
    const versao = a.version;
    for (let i = 0; i < 50; i++) {
      p.update(1713, new THREE.Vector3(0, 0, 0.001 + i * 1e-5));
    }
    expect(p.points.geometry).toBe(geo);
    expect(atributo(p, 'position')).toBe(a);
    expect(a.version).toBe(versao); // nenhum upload: as posições são estáticas
    p.dispose();
  });
});

// ============================================================
// 8. Texto-fonte — a D1, a D8 e os anti-padrões
// ============================================================
describe('texto-fonte da camada (D1, D3, D8)', () => {
  it('usa a ponte curta e SÓ ela', () => {
    expect(FONTE).toContain('eclipticaParaEquatorial');
    expect(FONTE).toContain('AU_PARA_PC');
  });

  it('não passa pela base galactocêntrica (a armadilha da D1)', () => {
    expect(FONTE).not.toContain('galactocentricToScene');
    expect(FONTE).not.toContain('heliocentricaEclipticaUAParaBaseGalactocentricaPc');
  });

  it('não tem relógio: a época é literal e congelada (D4)', () => {
    expect(FONTE).not.toContain('Date.now');
    expect(FONTE).not.toContain('new Date(');
    expect(FONTE).not.toContain('performance.now');
  });

  it('não responde a qualidade nem perturba a captura (D8)', () => {
    expect(FONTE).not.toContain('onQuality');
    expect(FONTE).not.toContain('setQuality');
    expect(FONTE).not.toContain('QualityLevel');
    expect(FONTE).not.toContain('perturbar');
  });

  it('o update não aloca: nenhum `new` no corpo dele', () => {
    expect(CORPO_DO_UPDATE).toContain('this.points.visible');
    expect(CORPO_DO_UPDATE).not.toContain('new ');
    expect(CORPO_DO_UPDATE).not.toContain('.map(');
    expect(CORPO_DO_UPDATE).not.toContain('.filter(');
  });

  it('o caminho vivo é IRMÃO do update, nunca parte dele (D2)', () => {
    // A D2 manda a escrita do instante morar em MÉTODO PRÓPRIO, fora do
    // `update` que os testes de texto pinam. Se um dia alguém a mudar
    // para dentro do quadro, é aqui que se descobre.
    expect(FONTE).toContain('escreverInstante(jdTdb: number');
    expect(CORPO_DO_UPDATE).not.toContain('escreverInstante');
    expect(CORPO_DO_UPDATE).not.toContain('posicaoHeliocentrica');
  });

  it('a escrita instanciada tem `fround` ANTES de decidir, e nenhuma faixa', () => {
    const gravar = FONTE.slice(
      FONTE.indexOf('  private gravar(array: Float32Array'),
      FONTE.indexOf('  /**\n   * `?dbgplan`')
    );
    expect(gravar).toContain('Math.fround(valor)');
    expect(gravar).toContain('needsAttributeWrite');
    // obrigações (ii) e (iii): sem faixa parcial não há teto a estourar
    // nem latch a segurar — a política é upload cheio, e é declarada
    // a CHAMADA, não a palavra: o cabeçalho cita as duas obrigações por
    // nome para explicar por que elas viram teto zero aqui
    expect(FONTE).not.toContain('.addUpdateRange(');
    expect(FONTE).not.toContain('.clearUpdateRanges(');
  });

  it('o gate de visibilidade por distância MORREU no M1 — nem símbolo, nem 0,05', () => {
    // A F3 tinha trocado a fonte do número; o M1 apagou o próprio corte:
    // a camada não lê limiar nenhum — `visible = ligado`, e quem decide o
    // que aparece é a magnitude de cada vértice, como o cabeçalho promete.
    expect(FONTE).not.toMatch(/import \{[^}]*LIMIAR_SISTEMA_SOLAR_PC/);
    expect(FONTE).not.toMatch(/import \{[^}]*DEEP_LIMIAR_PC/);
    // o único 0,05 aceitável no arquivo é prosa, nunca código
    expect(FONTE).not.toContain('< 0.05');
    expect(FONTE).not.toContain('0.05;');
  });

  it('nenhum escalar de comprimento além do conversor único (D1)', () => {
    // o corpo do construtor, onde as posições nascem
    const construtor = FONTE.slice(
      FONTE.indexOf('  constructor(psf: PsfDoCampo)'),
      FONTE.indexOf('  /**\n   * O quadro inteiro')
    );
    expect(construtor).toContain('eq[0] * AU_PARA_PC');
    expect(construtor).toContain('eq[1] * AU_PARA_PC');
    expect(construtor).toContain('eq[2] * AU_PARA_PC');
    // e nada mais toca no comprimento: nem a régua do doador, nem a
    // origem galactocêntrica, nem uma escala de grupo
    for (const proibido of [
      'RAIO_SOL_PC',
      'ALTURA_SOL_PC',
      'GC_POS',
      'sunRadius',
      'DONOR',
      'scale',
      'WORLD.',
    ]) {
      expect(construtor, proibido).not.toContain(proibido);
    }
  });

  it('a fase do ponto é MH18 (D10) e a cessão continua Lambert', () => {
    expect(FONTE).toContain('fatorDeFaseMh18');
    expect(FONTE).toContain('aFase');
    expect(FONTE).toContain('faseDoVertice');
    expect(FONTE).toContain('betaEfetivoAnel');
  });
});

describe('texto-fonte da fiação no director', () => {
  const director = readFileSync(new URL('../../director.ts', import.meta.url), 'utf8');
// o corte 4 da onda moveu a máquina do tempo para o módulo próprio —
// os pinos da D8 seguem o código para lá, e o fio de volta se pina aqui
const maquina = readFileSync(
  new URL('../../director/maquinaDoTempo.ts', import.meta.url),
  'utf8'
);

  it('as duas portas existem com o nome exato, e a chave passa por elas', () => {
    expect(director).toContain('PLANETAS_DEFAULT_ON');
    expect(director).toContain("this.debug.has('plan')");
    expect(director).toContain("!this.hide.has('noplan')");
    // a semeadura URL→hide deixou de ser array digitado no director
    // (item 33): o laço deriva da tabela única, onde a flag tem linha
    expect(director).toContain('for (const { flag } of CAMADAS)');
    const config = readFileSync(new URL('../../atlasConfig.ts', import.meta.url), 'utf8');
    expect(config).toContain("flag: 'noplan',");
  });

  it('a camada entra na cena por conta própria, nunca em `sun.group`', () => {
    expect(director).toContain('this.engine.scene.add(this.planetas.points)');
    expect(director).not.toContain('this.sun.group.add');
  });

  it('o update do quadro vem DEPOIS do bloco do Sol', () => {
    const sol = director.indexOf('this.nebula.setSunOccluder(');
    const plan = director.indexOf('this.planetas.update(');
    expect(sol).toBeGreaterThan(0);
    expect(plan).toBeGreaterThan(sol);
  });

  it('o teardown descarta a camada ANTES do engine', () => {
    const planetas = director.indexOf("step('planetas'");
    const engine = director.indexOf("step('engine'");
    expect(planetas).toBeGreaterThan(0);
    expect(planetas).toBeLessThan(engine);
  });

  // ---- A MÁQUINA DO TEMPO, e o DESTINO DA D8 POR ESCRITO (F4) ------
  // A D8 dizia: "esta camada não responde a qualidade e não zera a
  // contagem de estabilidade da captura". A F4 acrescentou um caminho
  // que MUDA a imagem — e a decisão, escrita aqui e no cabeçalho da
  // camada, é que a D8 fica INTEIRA: quem chama `perturbar` continua
  // sendo o Director, porque é ele que sabe quando o instante muda; a
  // camada só obedece. Os testes de texto da camada (nenhum `Date`,
  // nenhum `perturbar`, nenhum `QualityLevel`) seguem valendo palavra
  // por palavra, e são estes três aqui que cobram o outro lado do fio.
  it('quem escreve o instante é o Director, e ANTES do update do quadro', () => {
    expect(director).toContain('this.planetas.escreverInstante(');
    const escrita = director.indexOf('this.planetas.escreverInstante(');
    const quadro = director.indexOf('this.planetas.update(');
    expect(escrita).toBeGreaterThan(0);
    expect(escrita).toBeLessThan(quadro);
  });

  it('quem chama `perturbar` na troca de instante é o Director (D8)', () => {
    // os quatro gestos moram na máquina (corte 4) e puxam o fio
    // `fios.perturbar` — que o director liga na própria `perturbar()`:
    // a D8 continua inteira, com o fio pinado dos DOIS lados
    for (const metodo of [
      'andarNoTempo(sentido: SentidoDoTempo)',
      'ciclarDegrau(): number',
      'alternarAoVivo()',
      'voltarAEpoca()',
    ]) {
      const i = maquina.indexOf(`  ${metodo} {`);
      expect(i, metodo).toBeGreaterThan(0);
      const corpo = maquina.slice(i, maquina.indexOf('\n  }', i));
      expect(corpo, metodo).toContain('this.fios.perturbar()');
    }
    // e a chegada da efeméride também perturba: a imagem pode mudar
    const busca = maquina.indexOf('garantirEfemerides()');
    expect(maquina.slice(busca, maquina.indexOf('\n  }\n', busca))).toContain(
      'this.fios.perturbar()'
    );
    // o outro lado do fio: quem o liga é o Director, na própria perturbar
    expect(director).toContain('perturbar: () => this.perturbar()');
  });

  it('a porta `?jd=` existe com o nome exato e o relógio entra na prontidão', () => {
    expect(director).toContain("this.debug.has('jd')");
    expect(director).toContain("this.debug.get('jd')");
    // o relógio andando é cena andando: sem isto o gate capturaria no
    // meio de um salto no tempo
    const captura = director.slice(
      director.indexOf('  get captura() {'),
      director.indexOf('    return {', director.indexOf('  get captura() {'))
    );
    expect(captura).toContain('this.maquinaDoTempo.aoVivo');
    expect(captura).toContain('this.maquinaDoTempo.sentidoDoTempo !== 0');
    expect(captura).toContain("this.maquinaDoTempo.faseDaEfemeride === 'buscando'");
  });

  it('o bloco de qualidade continua sem tocar na camada (D8)', () => {
    const i = director.indexOf('this.engine.onQuality(');
    const bloco = director.slice(i, director.indexOf('});', i));
    expect(bloco).not.toContain('this.planetas');
  });

  it('`?dbgplan` existe e lê o atributo real', () => {
    expect(director).toContain("this.debug.has('dbgplan')");
    expect(FONTE).toContain("getAttribute('position')");
    expect(FONTE).toContain('EPOCA_JD_TDB');
    expect(FONTE).toContain('EPOCA_ISO');
  });

  // A tabela de camadas saiu do `Ajustes.tsx` na F2 da Onda 5: com a
  // gaveta do Atlas ela ganhou um SEGUNDO leitor, e tabela com dois
  // leitores dentro de um deles é a segunda fonte de verdade nascendo.
  // O que este teste cobra é o mesmo de sempre — a camada dos planetas
  // está listada como VIVA (troca sem reload) —, agora no config único.
  it('o config único lista a camada como viva, e o painel desenha a tabela dele', () => {
    const config = readFileSync(new URL('../../atlasConfig.ts', import.meta.url), 'utf8');
    expect(config).toContain("{ flag: 'noplan', nome: 'Planetas', viva: true");
    const ajustes = readFileSync(new URL('../../../components/Ajustes.tsx', import.meta.url), 'utf8');
    // (a lista dos quatro estados do seletor de qualidade entrou no
    // mesmo import na letra D dos Ajustes, pelo mesmo motivo)
    expect(ajustes).toMatch(/import \{[^}]*\bCAMADAS\b[^}]*\} from '\.\.\/three\/atlasConfig'/);
    expect(ajustes).toContain('CAMADAS.map(');
  });
});

// ============================================================
// 9. O readout do ?dbgplan
// ============================================================
describe('?dbgplan — o que a régua 2 vai ler', () => {
  it('traz época, os dez corpos, NDC, px e m, em unidades de visitante', () => {
    const p = camada();
    p.ligado = true;
    const cam = camera(0.00072722, UP_DO_QUADRO);
    p.update(ALTURA_PX, cam.position);
    const texto = p.dbg(cam, LARGURA_PX, ALTURA_PX);
    const linhas = texto.split('\n');
    expect(linhas).toHaveLength(11);
    expect(linhas[0]).toContain('2026-01-01T00:00:00Z');
    expect(linhas[0]).toContain('2461041.5008692136');
    expect(linhas[0]).toContain('UA');
    expect(linhas[0]).toContain('anos-luz');
    expect(linhas[0]).toContain('régua interna');
    IDS_FOTOMETRIA.forEach((id, i) => expect(linhas[i + 1]).toContain(id));
    p.dispose();
  });

  it('o px que ele imprime é o da régua 1, dígito a dígito', () => {
    const p = camada();
    const cam = camera(0.00072722, UP_DO_QUADRO);
    const texto = p.dbg(cam, LARGURA_PX, ALTURA_PX);
    const linhas = texto.split('\n').slice(1);
    linhas.forEach((linha, i) => {
      const m = linha.match(/px=\(([-0-9.]+), ([-0-9.]+)\)/);
      expect(m, IDS_FOTOMETRIA[i]).not.toBeNull();
      const alvo = PROJ_DO_QUADRO.ua150[i];
      // o readout lê o FLOAT32 do atributo; a régua 1 lê o float64 —
      // a diferença é a quantização, e ela cabe no orçamento da régua 2
      expect(Number(m![1]), IDS_FOTOMETRIA[i]).toBeCloseTo(alvo[2], 3);
      expect(Number(m![2]), IDS_FOTOMETRIA[i]).toBeCloseTo(alvo[3], 3);
    });
    p.dispose();
  });
});

// ============================================================
// 10. O CAMINHO VIVO (Onda 5, F4/D2) — a máquina do tempo escrevendo
//     os DOIS atributos.
//
// O oráculo é o mesmo `efemerides.bin` que gerou o retrato, lido de
// disco pelo motor de verdade (caminho de `retrato.test.ts`). Duas
// coisas se provam aqui, e a primeira é a que sustenta o gate de
// pixel da fase:
//
//  (a) NA ÉPOCA O CAMINHO VIVO É UM NÃO-EVENTO. Ele roda inteiro — o
//      cache nasce NaN de propósito — e não muda UM bit: nem posição,
//      nem magnitude, nem `version` de atributo. É por isso que o A/B
//      de `?jd=EPOCA` nas três vistas profundas pode ser exigido
//      bit-idêntico.
//  (b) FORA DA ÉPOCA A MAGNITUDE ANDA, e anda na direção e no VALOR
//      que a efeméride manda: o periélio e o afélio de Marte saem de
//      uma varredura da própria tabela, não de uma data escolhida a
//      olho, e a diferença esperada é `5·log10(r_af/r_pe)`.
// ============================================================
const META_EF = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../../public/data/atlas/efemerides_meta.json', import.meta.url)),
    'utf8'
  )
) as MetaEfemerides;
const BIN_EF = readFileSync(
  fileURLToPath(new URL('../../../../public/data/atlas/efemerides.bin', import.meta.url))
);
const motorReal = () =>
  new MotorEfemerides(
    decodeEfemerides(
      BIN_EF.buffer.slice(BIN_EF.byteOffset, BIN_EF.byteOffset + BIN_EF.byteLength),
      META_EF
    )
  );

/** o motor de verdade, contando quantas vezes foi consultado */
function espiao(): FonteDeEfemerides & { chamadas: number } {
  const motor = motorReal();
  return {
    chamadas: 0,
    posicaoHeliocentrica(id: string, jd: number) {
      this.chamadas++;
      return motor.posicaoHeliocentrica(id, jd);
    },
  };
}

const copia = (p: Planetas, nome: string) =>
  Float32Array.from(atributo(p, nome).array as Float32Array);

describe('10a. na época, o caminho vivo reproduz o retrato bit a bit', () => {
  it('nenhum float muda, e o método diz que não mudou', () => {
    const p = camada();
    const posAntes = copia(p, 'position');
    const magAntes = copia(p, 'aMagBase');
    const versaoPos = atributo(p, 'position').version;
    const versaoMag = atributo(p, 'aMagBase').version;

    const mexeu = p.escreverInstante(EPOCA_JD_TDB, motorReal());

    expect(mexeu).toBe(false);
    // Object.is elo a elo: "quase igual" aqui seria md5 diferente
    const posDepois = copia(p, 'position');
    const magDepois = copia(p, 'aMagBase');
    for (let i = 0; i < posAntes.length; i++) {
      expect(Object.is(posAntes[i], posDepois[i]), `position[${i}]`).toBe(true);
    }
    for (let i = 0; i < magAntes.length; i++) {
      expect(Object.is(magAntes[i], magDepois[i]), `aMagBase[${i}]`).toBe(true);
    }
    // e nenhum upload foi pedido: `version` só sobe com `needsUpdate`
    expect(atributo(p, 'position').version).toBe(versaoPos);
    expect(atributo(p, 'aMagBase').version).toBe(versaoMag);
    p.dispose();
  });

  it('a conta rodou mesmo — o cache não engoliu a primeira chamada', () => {
    const p = camada();
    const fonte = espiao();
    p.escreverInstante(EPOCA_JD_TDB, fonte);
    // os NOVE do retrato; o Sol é a origem em qualquer instante
    expect(fonte.chamadas).toBe(IDS_RETRATO.length);
    p.dispose();
  });

  it('NUNCA abre faixa de upload — a obrigação (ii) vira teto zero', () => {
    const p = camada();
    const versao = atributo(p, 'position').version;
    p.escreverInstante(EPOCA_JD_TDB + 400, motorReal());
    // upload CHEIO: `version` sobe (é o que `needsUpdate = true` faz) e
    // nenhuma faixa parcial é aberta — sem faixa não há teto a estourar
    // nem latch a segurar, que é o argumento das obrigações (ii) e (iii)
    expect(atributo(p, 'position').version).toBe(versao + 1);
    expect(atributo(p, 'position').updateRanges).toHaveLength(0);
    expect(atributo(p, 'aMagBase').updateRanges).toHaveLength(0);
    p.dispose();
  });
});

describe('10b. o cache por jd', () => {
  it('o mesmo instante duas vezes consulta a efeméride UMA vez', () => {
    const p = camada();
    const fonte = espiao();
    p.escreverInstante(EPOCA_JD_TDB + 1000, fonte);
    const depoisDaPrimeira = fonte.chamadas;
    expect(p.escreverInstante(EPOCA_JD_TDB + 1000, fonte)).toBe(false);
    expect(fonte.chamadas).toBe(depoisDaPrimeira);
    p.dispose();
  });

  it('instante não-finito é recusado sem tocar na efeméride', () => {
    const p = camada();
    const fonte = espiao();
    expect(p.escreverInstante(Number.NaN, fonte)).toBe(false);
    expect(p.escreverInstante(Number.POSITIVE_INFINITY, fonte)).toBe(false);
    expect(fonte.chamadas).toBe(0);
    p.dispose();
  });

  it('voltar à época devolve o retrato EXATO — a ida e a volta fecham', () => {
    const p = camada();
    const retrato = copia(p, 'position');
    const magRetrato = copia(p, 'aMagBase');
    p.escreverInstante(EPOCA_JD_TDB + 3000, motorReal());
    p.escreverInstante(EPOCA_JD_TDB, motorReal());
    const volta = copia(p, 'position');
    const magVolta = copia(p, 'aMagBase');
    for (let i = 0; i < retrato.length; i++) {
      expect(Object.is(retrato[i], volta[i]), `position[${i}]`).toBe(true);
    }
    for (let i = 0; i < magRetrato.length; i++) {
      expect(Object.is(magRetrato[i], magVolta[i]), `aMagBase[${i}]`).toBe(true);
    }
    p.dispose();
  });

  it('o Sol é a origem em qualquer instante — o vértice 0 não se mexe', () => {
    const p = camada();
    p.escreverInstante(EPOCA_JD_TDB + 5000, motorReal());
    const pos = atributo(p, 'position');
    expect(pos.getX(0)).toBe(0);
    expect(pos.getY(0)).toBe(0);
    expect(pos.getZ(0)).toBe(0);
    expect(atributo(p, 'aMagBase').getX(0)).toBe(Math.fround(PONTO_ZERO_SOL_PC));
    p.dispose();
  });
});

describe('10c. o oráculo da magnitude viva', () => {
  // O periélio e o afélio de Marte na janela — VARRIDOS DA TABELA, um
  // dia por passo ao longo de um período orbital a partir da época.
  // Data escolhida a olho seria número chutado; isto é medida.
  const motor = motorReal();
  const rDe = (jd: number) => {
    const p = motor.posicaoHeliocentrica('mars', jd);
    return Math.hypot(p.x, p.y, p.z);
  };
  let jdPerielio = EPOCA_JD_TDB;
  let jdAfelio = EPOCA_JD_TDB;
  for (let d = 0; d <= 687; d++) {
    const jd = EPOCA_JD_TDB + d;
    if (rDe(jd) < rDe(jdPerielio)) jdPerielio = jd;
    if (rDe(jd) > rDe(jdAfelio)) jdAfelio = jd;
  }
  const iMarte = IDS_FOTOMETRIA.indexOf('mars');

  const baseEsperada = (jd: number) =>
    aMagBaseDe(FOTOMETRIA.mars.H, rDe(jd)) + DESLOCAMENTO_UA_PARA_PC;

  it('a varredura achou uma órbita de verdade (excentricidade de Marte)', () => {
    // Marte tem e ≈ 0,0934: r vai de ~1,381 a ~1,666 UA
    expect(rDe(jdPerielio)).toBeGreaterThan(1.35);
    expect(rDe(jdPerielio)).toBeLessThan(1.42);
    expect(rDe(jdAfelio)).toBeGreaterThan(1.63);
    expect(rDe(jdAfelio)).toBeLessThan(1.70);
  });

  it('`aMagBase` escrito é o VALOR que a efeméride manda, nas duas pontas', () => {
    for (const jd of [jdPerielio, jdAfelio]) {
      const p = camada();
      p.escreverInstante(jd, motorReal());
      expect(atributo(p, 'aMagBase').getX(iMarte)).toBe(Math.fround(baseEsperada(jd)));
      p.dispose();
    }
  });

  it('perto do Sol o corpo fica MAIS brilhante, e por 5·log10(r_af/r_pe)', () => {
    const esperado = 5 * Math.log10(rDe(jdAfelio) / rDe(jdPerielio));
    expect(baseEsperada(jdAfelio) - baseEsperada(jdPerielio)).toBeCloseTo(esperado, 12);
    // magnitude MAIOR é mais fraco: o afélio tem de estar acima
    expect(baseEsperada(jdAfelio)).toBeGreaterThan(baseEsperada(jdPerielio));
    expect(esperado).toBeGreaterThan(0.35);
  });

  /** o m que a GPU vai desenhar na vista `ua150`, lido dos atributos */
  const mNaVista = (jd: number) => {
    const cam = camera(0.00072722, UP_DO_QUADRO);
    const p = camada();
    p.escreverInstante(jd, motorReal());
    const pos = atributo(p, 'position');
    const x = pos.getX(iMarte);
    const y = pos.getY(iMarte);
    const z = pos.getZ(iMarte);
    const c = cam.position;
    const fase = faseDoVertice(x, y, z, c.x, c.y, c.z);
    const dPc = Math.hypot(c.x - x, c.y - y, c.z - z);
    const m = magDoVertice(atributo(p, 'aMagBase').getX(iMarte), dPc, fase);
    p.dispose();
    return { m, fase, dPc };
  };

  it('o m vivo é o que a LEI DA F1 devolve para a efeméride daquele instante', () => {
    // ORÁCULO CRUZADO, o mesmo que julga a tabela congelada mais acima:
    // a lei planetária da F1 (`magAparente`, em UA) contra o espelho do
    // vertex (em pc). Aqui ela é alimentada com o `r` VIVO, e é isso que
    // separa "a magnitude mudou" de "a magnitude mudou pelo motivo
    // certo".
    for (const jd of [jdPerielio, jdAfelio]) {
      const vista = mNaVista(jd);
      const esperado = magAparente(
        aMagBaseDe(FOTOMETRIA.mars.H, rDe(jd)),
        vista.dPc * UA_POR_PC,
        vista.fase
      );
      expect(vista.m, `jd ${jd}`).toBeCloseTo(esperado, 5);
    }
  });

  it('com a fase neutralizada, o periélio é MAIS brilhante que o afélio', () => {
    // a fase entra na conta e anda junto (Marte muda de longitude entre
    // as duas datas); o que o `r` sozinho manda é isto, e é medido:
    const so = (jd: number) => {
      const v = mNaVista(jd);
      return magDoVertice(Math.fround(baseEsperada(jd)), v.dPc, 1);
    };
    expect(so(jdPerielio)).toBeLessThan(so(jdAfelio));
    // e a diferença é EXATAMENTE os dois termos de distância: o do Sol
    // ao corpo (o que a época congelava) mais o do corpo ao observador,
    // que a 150 UA vale ~0,008 mag e não some por ser pequeno
    const dPerielio = mNaVista(jdPerielio).dPc;
    const dAfelio = mNaVista(jdAfelio).dPc;
    expect(so(jdAfelio) - so(jdPerielio)).toBeCloseTo(
      baseEsperada(jdAfelio)
        - baseEsperada(jdPerielio)
        + 5 * Math.log10(dAfelio / dPerielio),
      5
    );
    // e o m COMPLETO das duas datas também difere — o corpo não fica
    // com o brilho de janeiro o ano inteiro, que é o defeito que a D2
    // manda não cometer
    expect(mNaVista(jdPerielio).m).not.toBe(mNaVista(jdAfelio).m);
  });

  it('a posição também anda: nenhum corpo do retrato fica onde estava', () => {
    const p = camada();
    const antes = copia(p, 'position');
    expect(p.escreverInstante(jdAfelio, motorReal())).toBe(true);
    const depois = copia(p, 'position');
    for (let i = 1; i < IDS_FOTOMETRIA.length; i++) {
      const mudou =
        antes[i * 3] !== depois[i * 3]
        || antes[i * 3 + 1] !== depois[i * 3 + 1]
        || antes[i * 3 + 2] !== depois[i * 3 + 2];
      expect(mudou, IDS_FOTOMETRIA[i]).toBe(true);
    }
    p.dispose();
  });
});

// ============================================================
// 10. A CESSÃO SOB CORPO RESOLVIDO (Onda 6, F2a) — a renegociação do
// "único alpha": o texto antigo da camada prometia que só o Sol tinha
// alpha; o globo da F2a exige que o PONTO do corpo em quadro apague, e
// a promessa nova (dois donos declarados, aCede binário, 1,0 exato fora
// do corpo) entra AQUI com teste, como a emenda manda.
// ============================================================
describe('a cessão sob corpo resolvido (aCede, F2a)', () => {
  it('nasce 0 em TODOS os vértices — fora do corpo resolvido nada muda', () => {
    const p = camada();
    const cede = p.points.geometry.getAttribute('aCede');
    expect(cede.count).toBe(IDS_FOTOMETRIA.length);
    for (let i = 0; i < cede.count; i++) expect(cede.getX(i)).toBe(0);
    p.dispose();
  });

  it('o alpha do shader tem UM dono desde o M1: (1 − aCede)', () => {
    // (1 − 0) = 1,0 EXATO em IEEE754: o fator é neutro até alguém
    // escrever — o gate do globo nos nove, a repartição da lei no Sol
    expect(FONTE).toContain('float alpha = 1.0 - aCede;');
    expect(FONTE).toContain("attribute float aCede;");
  });

  it('escreverCessao é idempotente e só sobe upload quando MUDA', () => {
    const p = camada();
    const cede = p.points.geometry.getAttribute('aCede') as THREE.BufferAttribute;
    const v0 = cede.version;
    // reescrever o valor que já está lá (0) não sobe nada — é o que o
    // Director faz 60×/s com o gate desarmado
    expect(p.escreverCessao('earth', 0)).toBe(false);
    expect(cede.version).toBe(v0);
    // armar cede TOTALMENTE (binário nesta fase)
    expect(p.escreverCessao('earth', 1)).toBe(true);
    const iTerra = IDS_FOTOMETRIA.indexOf('earth');
    expect(cede.getX(iTerra)).toBe(1);
    expect(cede.version).toBeGreaterThan(v0);
    // e os OUTROS vértices ficam intocados — cessão é por corpo
    for (let i = 0; i < cede.count; i++) {
      if (i !== iTerra) expect(cede.getX(i), IDS_FOTOMETRIA[i]).toBe(0);
    }
    // idempotência do 1 também
    const v1 = cede.version;
    expect(p.escreverCessao('earth', 1)).toBe(false);
    expect(cede.version).toBe(v1);
    // desarmar devolve a fotometria
    expect(p.escreverCessao('earth', 0)).toBe(true);
    expect(cede.getX(iTerra)).toBe(0);
    p.dispose();
  });

  it('corpo desconhecido é recusado sem tocar o buffer', () => {
    const p = camada();
    const cede = p.points.geometry.getAttribute('aCede') as THREE.BufferAttribute;
    const v0 = cede.version;
    expect(p.escreverCessao('vulcan', 1)).toBe(false);
    expect(cede.version).toBe(v0);
    p.dispose();
  });

  it('a cessão mora FORA do update — método irmão, como escreverInstante', () => {
    expect(CORPO_DO_UPDATE).not.toContain('escreverCessao');
    expect(CORPO_DO_UPDATE).not.toContain('aCede');
  });
});
