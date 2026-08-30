// Serve: chão — os consertos dos gigantes (sombra do anel, ganho de Saturno, tradução da visita) não regridem
// ============================================================
// OS GIGANTES (F4) — os juízes do módulo:
//
//  1. O ORÁCULO DE ORIENTAÇÃO (D-E4) POR CORPO: o transform do
//     mesh de CADA um dos quatro, em dois instantes, tem de pôr
//     o sub-ponto solar onde `subSolarPoint` (julgado por Horizons)
//     diz — textura girada passa em md5, não passa aqui.
//  2. O NEEDLE dos GLSL montados: eclipse, sombra do anel, squash
//     no .z com `a = dot(d',d')`, scattering frente/trás.
//  3. A FIGURA: flattening BODY_AXES, gradiente EXATO.
//  4. O ANEL: raios 1,110–2,326; Saturno não é receptor.
//  5. A CLASSE: gate, carga, cessão, Saturno pede o canal ring.
//  6. TEXTO-FONTE: relógio único; advecção ESTÁTICA com pendência
//     nomeada; sem cisalhamento por banda.
// ============================================================
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { MetaEfemerides } from '../../../lib/atlas/efemerides';
import { decodeEfemerides, MotorEfemerides } from '../../../lib/atlas/efemerides';
import { CORPOS_COM_ANEL } from '../../../lib/atlas/eclipse';
import { subSolarPoint } from '../../../lib/atlas/orientacao';
import { eclipticaParaEquatorial, AU_PARA_PC } from '../../../lib/atlas/frameGalactico';
import { AU_KM } from '../../../lib/atlas/elementosOrbitais';
import { BODY_AXES } from '../../../lib/atlas/iauOrientation';
import { RAIO_SOL_KM } from '../../escala';
import { EPOCA_JD_TDB } from '../planetas/retrato2026';
import { eixosDoMesh } from './terra';
import type { ManifestDeTexturas } from './terra';
import {
  COR_DO_VEU,
  GLSL_VEU_DE_SATURNO,
  LANTERNA_DE_LEITURA,
  colunaVerticalDoVeu,
  densidadeDoVeu,
  espessuraDoVeu,
  ganhoDoGlobo,
  sDoTerminador,
} from '../../../lib/atlas/luzDaVisita';
import {
  ANEIS_CITADOS,
  ANEL_FRAG,
  ANEL_PROC_FRAG,
  ANEL_SATURNO,
  G_DO_ANEL,
  GIGANTE_LAMBERT_FRAG,
  GIGANTES,
  GiganteResolvido,
  K_DIFRACAO,
  posicaoDoGiganteUA,
  raiosDoGigantePc,
} from './gigante';

const DATA_DIR = fileURLToPath(new URL('../../../../public/data/atlas/', import.meta.url));
const meta = JSON.parse(
  readFileSync(join(DATA_DIR, 'efemerides_meta.json'), 'utf8')
) as MetaEfemerides;
const binNode = readFileSync(join(DATA_DIR, 'efemerides.bin'));
const motor = new MotorEfemerides(
  decodeEfemerides(
    binNode.buffer.slice(binNode.byteOffset, binNode.byteOffset + binNode.byteLength),
    meta
  )
);
const MANIFEST = JSON.parse(
  readFileSync(join(DATA_DIR, 'texturas.json'), 'utf8')
) as ManifestDeTexturas;

const JDS = [2460409.26395835, EPOCA_JD_TDB];
const JD = JDS[0];

const FONTE = readFileSync(new URL('./gigante.ts', import.meta.url), 'utf8');

function grau360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

function dirSolCena(id: string, jd: number): readonly [number, number, number] {
  const p = motor.posicaoHeliocentrica(id, jd);
  const norma = Math.hypot(p.x, p.y, p.z);
  return eclipticaParaEquatorial([-p.x / norma, -p.y / norma, -p.z / norma]);
}

function subSolarDosEixos(
  eixos: { colunaX: readonly number[]; colunaY: readonly number[]; colunaZ: readonly number[] },
  dir: readonly number[]
): { lonEastDeg: number; latDeg: number } {
  const dot = (a: readonly number[], b: readonly number[]) =>
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return {
    lonEastDeg: grau360(Math.atan2(-dot(dir, eixos.colunaZ), dot(dir, eixos.colunaX)) / (Math.PI / 180)),
    latDeg: Math.asin(Math.max(-1, Math.min(1, dot(dir, eixos.colunaY)))) / (Math.PI / 180),
  };
}

function malhaDaSuperficie(group: THREE.Object3D): THREE.Mesh {
  for (const c of group.children) {
    if (c instanceof THREE.Mesh && c.geometry instanceof THREE.SphereGeometry) return c;
  }
  throw new Error('malhaDaSuperficie: nenhuma esfera no grupo');
}

function malhaDoAnel(group: THREE.Object3D): THREE.Mesh {
  for (const c of group.children) {
    if (c instanceof THREE.Mesh && c.geometry instanceof THREE.RingGeometry) return c;
  }
  throw new Error('malhaDoAnel: nenhum anel no grupo');
}

describe('2. o needle dos GLSL montados', () => {
  it('o chunk do eclipse existe e multiplica SÓ a direta, depois do BRDF', () => {
    expect(GIGANTE_LAMBERT_FRAG).toContain('vec3 fatorDeEclipse(vec3 p, vec3 n, float ndotlGeo)');
    expect(GIGANTE_LAMBERT_FRAG).toContain('if (uEclipseAtivo < 0.5) return vec3(1.0);');
    expect(GIGANTE_LAMBERT_FRAG).toContain(
      'vec3 eclipse = fatorDeEclipse(pElip, n, ndotlGeo);'
    );
    expect(GIGANTE_LAMBERT_FRAG).toContain(
      'vec3 sombras = eclipse * sombraDoAnel(pElip);'
    );
    // ITEM 93: a luz do Sol passa pela logística e SÓ DEPOIS a lanterna soma-se
    expect(GIGANTE_LAMBERT_FRAG).toContain(
      'vec3 luzSol = vec3(terminadorSuave(ndotlGeo)) * uLuzGanho * sombras;'
    );
    // a LANTERNA leva o ECLIPSE, e SÓ ele (item 104, S2): a sombra do
    // anel morde o termo do Sol e não o piso da noite
    expect(GIGANTE_LAMBERT_FRAG).toContain('vec3 view = normSeguro(uCamLocal - pElip);');
    expect(GIGANTE_LAMBERT_FRAG).toContain('lanternaDeLeitura(n, view, eclipse);');
    expect(GIGANTE_LAMBERT_FRAG).not.toContain('lanternaDeLeitura(n, view, sombras)');
    // §4.4: o VÉU é a ÚLTIMA coisa, e quem o acende é `luzSol` — nunca a
    // soma com a lanterna. Este pino é o que segura a exclusão da luz de
    // câmera do véu no lugar onde ela se decide: o argumento.
    expect(GIGANTE_LAMBERT_FRAG).toContain(
      'vec4(globoComVeu(albedo, luzSol, fill, opacidadeDoVeu(dot(n, view))), 1.0)'
    );
    expect(GIGANTE_LAMBERT_FRAG).not.toContain('globoComVeu(albedo, luzDoGlobo');
  });

  /**
   * PINO 104 — A COSTURA SOMBRA → NOITE, na fiação do fragmento.
   *
   * A QUEIXA DELE, 26/08: *"precisa haver um fade gradual até a sombra, de
   * forma seamless — isso deve se aplicar a qualquer transição de sombra
   * para penumbra"*. A resposta não foi uma rampa: foi a ORDEM do NASA
   * Eyes, e ela cabe em duas frases — a sombra multiplica a luz que CHEGA
   * (antes do terminador, para os dois morrerem juntos na fronteira), e o
   * piso da noite é somado FORA de qualquer sombra.
   *
   * ESTE DENTE GUARDA A FIAÇÃO, que é o que se pode perder sem ninguém
   * ver: (1) `sombraDoAnel` não pode voltar a receber N·L — o
   * `smoothstep(0.0, 0.05, ndotl)` que morreu aqui matava a sombra na
   * fronteira e deixava o vazamento de 5 % do terminador ACESO sozinho,
   * uma tira clara medida em ~65 bytes contra os ~8 da sombra ao lado; e
   * (2) a lanterna não pode voltar a receber o pacote `sombras` — com a
   * sombra do anel dentro dela o piso caía ~10× e a sombra ficava mais
   * escura que a noite vizinha. As duas reversões são de UMA linha, e
   * nenhuma delas muda um tipo: sem este dente, as duas compilam.
   *
   * O QUE ELE NÃO COBRA: o que o chunk FAZ com esses argumentos. Isso é
   * `luzDaVisita.test.ts`, que executa o GLSL e mede a lei do piso comum.
   */
  it('PINO 104: a sombra do anel é só geométrica, e a lanterna leva o eclipse', () => {
    // (1) a assinatura perdeu o N·L, e o CORPO da função não tem fade
    // nenhum. O recorte é a função, não o fragmento: o chunk do eclipse
    // usa `smoothstep` de propósito (o fade de terminador DELE, que é
    // penumbra de cone e continua valendo).
    const decl = 'float sombraDoAnel(vec3 p) {';
    expect(GIGANTE_LAMBERT_FRAG).toContain(decl);
    const corpo = GIGANTE_LAMBERT_FRAG.slice(
      GIGANTE_LAMBERT_FRAG.indexOf(decl),
      GIGANTE_LAMBERT_FRAG.indexOf('\n}', GIGANTE_LAMBERT_FRAG.indexOf(decl))
    );
    expect(corpo).not.toContain('smoothstep');
    expect(corpo).not.toContain('ndotl');
    expect(corpo).toContain('return 1.0 - a * 0.9;');
    // a validade que FICA é a geométrica — o raio para o lado do Sol e a
    // janela de raios do anel
    expect(corpo).toContain('if (t <= 0.0) return 1.0;');
    expect(corpo).toContain('if (r <= uAnelRaios.x || r >= uAnelRaios.y) return 1.0;');

    // (1b) E A BUSCA NA PLACA VEM ANTES DAS DUAS RECUSAS. Isto não é
    // gosto de ordem: `texture2D` sem LOD escolhe o mip pela DERIVADA de
    // `u` no quad de 2×2 que a GPU sombreia junto, e um quad partido por
    // `return` lê `u` de registrador não escrito — o mip vira o topo da
    // pirâmide (a placa inteira, alpha médio 0,5957) e a função devolve
    // 0,464 em pleno dia. Foi o ARCO DE PONTINHOS medido em 26/08, e com
    // ele um quadro NÃO-DETERMINÍSTICO (o par nulo saltou de 446 px para
    // 1.333). O `clamp` é o que torna a coordenada legítima em toda
    // parte, e é por isso que ele entra junto.
    const busca = corpo.indexOf('texture2D(uMapaAnel');
    expect(busca, 'a busca na placa sumiu de `sombraDoAnel`').toBeGreaterThan(0);
    expect(corpo).toContain('vec2(clamp(u, 0.0, 1.0), 0.5)');
    for (const recusa of [
      'if (t <= 0.0) return 1.0;',
      'if (r <= uAnelRaios.x || r >= uAnelRaios.y) return 1.0;',
    ]) {
      expect(
        corpo.indexOf(recusa),
        `\`${recusa}\` voltou para ANTES da busca — o quad se parte e o mip vem lixo`
      ).toBeGreaterThan(busca);
    }

    // (2) o argumento da lanterna NÃO é o pacote que leva a sombra do anel
    const main = GIGANTE_LAMBERT_FRAG.slice(GIGANTE_LAMBERT_FRAG.indexOf('void main()'));
    const comAnel = /vec3 (\w+) = [^;]*sombraDoAnel\(/.exec(main);
    expect(comAnel, 'ninguém multiplica a sombra do anel no `main`').not.toBeNull();
    const daLanterna = /lanternaDeLeitura\(\s*\w+,\s*\w+,\s*(\w+)\s*\)/.exec(main);
    expect(daLanterna, 'o `main` não chama mais a lanterna').not.toBeNull();
    expect(daLanterna![1], 'a lanterna voltou a receber a sombra do anel')
      .not.toBe(comAnel![1]);
    // e o que ela recebe é o fator do eclipse, sozinho
    expect(new RegExp(`vec3 ${daLanterna![1]} = fatorDeEclipse\\(`).test(main)).toBe(true);
    // o termo do SOL, esse leva as duas: é sobre ele que os fatores caem
    expect(main).toContain(`* uLuzGanho * ${comAnel![1]};`);
  });

  /**
   * O VÉU PALHA (§4.4) MORA EM `luzDaVisita.ts`, e o fragmento só o
   * INCLUI. Um número do Eyes redigitado aqui seria a segunda cópia que
   * o contrato §4.5 existe para impedir.
   */
  it('o véu vem do chunk único: nem 5e−5, nem 200, nem a palha nascem aqui', () => {
    expect(GIGANTE_LAMBERT_FRAG).toContain('uniform float uVeuColuna;');
    expect(GIGANTE_LAMBERT_FRAG).toContain('float opacidadeDoVeu(float mu)');
    expect(GIGANTE_LAMBERT_FRAG).toContain(GLSL_VEU_DE_SATURNO);
    for (const literal of ['5e-5', '0.00005', '234, 202, 151', '700']) {
      expect(FONTE, literal).not.toContain(literal);
      expect(GIGANTE_LAMBERT_FRAG, literal).not.toContain(literal);
    }
  });

  it('a sombra planeta→anel é elipsoide: squash no eixo POLAR do anel', () => {
    // o ocultador continua ELIPSOIDE — o squash no polo é a cicatriz W5-B
    // que o dono manda preservar. O que saiu foi o teste BINÁRIO com
    // interior 0,22; entrou a fração do disco solar (ver PENUMBRA_DO_ANEL).
    expect(ANEL_FRAG).toContain('p.z / k');
    expect(ANEL_FRAG).toContain('uDirSolLocal.z / k');
    // o degrau com interior herdado não voltou em nenhum dos dois
    // (o 0,22 que sobra no procedural é a opacidade do ε de Urano)
    for (const glsl of [ANEL_FRAG, ANEL_PROC_FRAG]) {
      expect(glsl).not.toMatch(/hit \? 0\.22/);
      expect(glsl).not.toMatch(/bool hit/);
    }
  });

  /**
   * PENUMBRA MEDIDA — o interior da sombra não é mais um número herdado.
   * A umbra vale ZERO (nenhuma luz DIRETA do Sol entra ali) e a borda é a
   * fração do disco solar cortada por um limbo reto, com a meia-penumbra
   * dada pelo raio ANGULAR do Sol visto do corpo.
   */
  it('o interior é 0 e a borda é a fração do disco solar, não um degrau', () => {
    expect(ANEL_FRAG).toContain('uniform float uSolAngRad;');
    expect(ANEL_PROC_FRAG).toContain('uniform float uSolAngRad;');
    expect(ANEL_FRAG).toContain('uSolAngRad * aproxima');
    expect(ANEL_FRAG).toContain('acos(x) - x * sqrt(');
    // a fração do disco: 0 em x=−1, 1/2 em x=0, 1 em x=+1
    const fracao = (x: number) => 1 - (Math.acos(x) - x * Math.sqrt(1 - x * x)) / Math.PI;
    expect(fracao(-1)).toBeCloseTo(0, 12);
    expect(fracao(0)).toBeCloseTo(0.5, 12);
    expect(fracao(1)).toBeCloseTo(1, 12);
  });

  it('scattering frente/trás no anel — o 0,34 fixo do doador não atravessa', () => {
    expect(ANEL_FRAG).toContain('mesmoLado');
    // os dois ramos da camada, que é o que "frente/trás" virou
    expect(ANEL_FRAG).toContain('1.0 - exp(-tau * (1.0 / mu + 1.0 / mu0))');
    expect(ANEL_FRAG).toContain('exp(-tau / mu0) - exp(-tau / mu)');
    expect(ANEL_FRAG).toContain('K_DIFRACAO * pow(max(cosTheta, 0.0), 6.0)');
    expect(ANEL_FRAG).not.toContain('0.34');
    expect(GIGANTE_LAMBERT_FRAG).not.toContain('0.34');
    expect(FONTE).not.toMatch(/RING_SHADOW_INTENSITY/);
  });

  /**
   * PINO 91-ANEL — a queixa do dono de 2026-08-25: "os anéis de Saturno
   * não estão visíveis". O que o apagava não era o ganho da visita (esse
   * já chegava certo no uniform, e o pino de baixo o cobre): era o
   * SOMBREAMENTO. O anel era `max(abs(nDotL), 0.12)`, uma chapa Lambert
   * com piso, e na data da vista `saturno-anel` (jd 2460409, latitude
   * subsolar 5,73°) o cosseno vale 0,0998 — ABAIXO do piso. O piso
   * assumia, e o anel inteiro virava 0,12 × uma placa que é foto escura.
   *
   * O ORÁCULO VEM DE FORA: 0,398170346608 é o que o espalhamento simples
   * de camada plano-paralela devolve na geometria daquela vista
   * (μ₀ = sen 5,73°, μ = sen 23,7°, retro, τ = −ln 0,05), calculado à
   * parte. O espelho abaixo é o MESMO cálculo escrito em JS — se ele e o
   * GLSL divergirem, os `toContain` acima caem; se os dois mudarem
   * juntos, este literal cai. Sabotagem declarada: com o piso de volta o
   * número seria 0,12, e o anel voltaria a 6,6× mais escuro.
   */
  it('PINO 91-ANEL: a camada de partículas substitui o piso Lambert de 0,12', () => {
    const fase = (cosTheta: number) => {
      const g2 = G_DO_ANEL * G_DO_ANEL;
      const hg = (1 - g2) * Math.pow(1 + g2 - 2 * G_DO_ANEL * cosTheta, -1.5);
      const retro = (1 - g2) * Math.pow(1 + g2 + 2 * G_DO_ANEL, -1.5);
      return hg / retro + K_DIFRACAO * Math.pow(Math.max(cosTheta, 0), 6);
    };
    const camada = (tau: number, mu0: number, mu: number, f: number, mesmoLado: number) => {
      const cobertura = 1 - Math.exp(-tau / mu);
      const amp = 2 * f;
      const d = mu0 - mu;
      const iF =
        mesmoLado > 0
          ? amp * (mu0 / (mu + mu0)) * (1 - Math.exp(-tau * (1 / mu + 1 / mu0)))
          : Math.abs(d) < 1e-3
            ? amp * (tau / mu0) * Math.exp(-tau / mu0)
            : amp * (mu0 / d) * (Math.exp(-tau / mu0) - Math.exp(-tau / mu));
      return { brilho: iF / Math.max(cobertura, 1e-4), cobertura };
    };

    // A ÂNCORA, e é ela que dá sentido a IF_RETRO_DO_GELO: camada
    // espessa, Sol às costas da câmera, μ = μ₀ → o modelo devolve 1, e o
    // anel sai exatamente no I/F medido pela Voyager/Cassini.
    expect(camada(40, 0.4, 0.4, fase(-1), 1).brilho).toBeCloseTo(1, 12);
    expect(fase(-1)).toBeCloseTo(1, 12);

    // A VISTA `saturno-anel`, onde o dono viu a lama.
    const mu0 = Math.sin((5.73 * Math.PI) / 180);
    const mu = Math.sin((23.7 * Math.PI) / 180);
    const tau = -Math.log(1 - 0.95); // a banda mais opaca do B na placa
    const naVista = camada(tau, mu0, mu, fase(-1), 1);
    expect(naVista.brilho).toBeCloseTo(0.398170346608, 9);
    expect(naVista.cobertura).toBeGreaterThan(0.999);

    // O PISO É O QUE SAIU, e o dono vê a diferença em bytes de tela.
    const SOB_A_REVERSAO = 0.12;
    expect(naVista.brilho).not.toBeCloseTo(SOB_A_REVERSAO, 2);
    expect(naVista.brilho / SOB_A_REVERSAO).toBeCloseTo(3.318, 3);
    // e o piso mordia porque a data põe o Sol quase no plano do anel
    expect(mu0).toBeLessThan(0.12);

    // A DIVISÃO DE CASSINI CONTINUA TRANSPARENTE — o conserto não pode
    // fechar o vão. Com a opacidade dela na placa, a cobertura fica em
    // ~0,60: o céu atravessa, e é isso que desenha a divisão.
    const divisao = camada(-Math.log(1 - 0.31), mu0, mu, fase(-1), 1);
    expect(divisao.cobertura).toBeCloseTo(0.602739845018, 9);
    expect(divisao.cobertura).toBeLessThan(naVista.cobertura);

    // A FASE CAI COM O ÂNGULO, mas não desaba: em 90° sobra ~38%, e
    // contra o Sol o lobo de difração acende o anel.
    expect(fase(0)).toBeCloseTo(0.385203639764, 9);
    expect(fase(1)).toBeCloseTo(1.716, 9);
  });

  it('o anel procedural usa a MESMA camada — nenhuma segunda política', () => {
    for (const glsl of [ANEL_FRAG, ANEL_PROC_FRAG]) {
      expect(glsl).toContain('vec2 camadaDeParticulas(');
      expect(glsl).toContain('float tauDaOpacidade(');
      expect(glsl).toContain('float sombraDoPlaneta('); // a sombra elipsoide
      expect(glsl).not.toContain('0.12'); // o piso Lambert não voltou
      expect(glsl).not.toMatch(/uAmbient|ambientLight|uPiso/);
    }
    // o que separa os dois é o ALBEDO, não o modelo de luz
    expect(ANEL_FRAG).toContain('IF_RETRO');
    expect(ANEL_PROC_FRAG).toContain('vec3(0.06, 0.055, 0.05)');
  });

  it('não existe termo ambiente (anti-padrões 3 e 9)', () => {
    expect(GIGANTE_LAMBERT_FRAG).not.toMatch(/uAmbient|ambientLight|uPiso/);
    expect(ANEL_FRAG).not.toMatch(/uAmbient|ambientLight|uPiso/);
  });
});

describe('3. a figura — BODY_AXES e o gradiente EXATO', () => {
  it('os raios saem de BODY_AXES — nenhum literal novo de comprimento', () => {
    expect(FONTE).toContain('BODY_AXES[id]');
    expect(FONTE).not.toContain('71492');
    expect(FONTE).not.toContain('60268');
    expect(raiosDoGigantePc('jupiter').a).toBeGreaterThan(raiosDoGigantePc('saturn').a);
    expect(raiosDoGigantePc('saturn').c / raiosDoGigantePc('saturn').a).toBeCloseTo(
      BODY_AXES.saturn[2] / BODY_AXES.saturn[0],
      12
    );
  });

  it('a normal é o gradiente exato (x/a²…), não a aproximação de 1ª ordem', () => {
    expect(FONTE).toContain('1 / (this.razaoC * this.razaoC)');
    expect(FONTE).toContain('1 / (this.razaoB * this.razaoB)');
  });
});

describe('4. o anel de Saturno (D6 / W5-B)', () => {
  it('os raios são 1,110–2,326 contra o raio equatorial', () => {
    expect(ANEL_SATURNO.rInt).toBeCloseTo(66_900 / 60_268, 3);
    expect(ANEL_SATURNO.rExt).toBeCloseTo(140_180 / 60_268, 3);
    expect(FONTE).toContain('66 900');
    expect(FONTE).toContain('140 180');
  });

  it('Quaoar: os raios do anel dividem pelo equatorial da malha, não por 543', () => {
    expect(ANEIS_CITADOS.quaoar.rInt).toBeCloseTo(2520 / BODY_AXES.quaoar[0], 12);
    expect(ANEIS_CITADOS.quaoar.rExt).toBeCloseTo(4057 / BODY_AXES.quaoar[0], 12);
    expect(ANEIS_CITADOS.quaoar.rInt).not.toBeCloseTo(2520 / 543, 3);
  });

  it('Saturno NÃO é receptor de eclipse — o contrato CORPOS_COM_ANEL', () => {
    expect(CORPOS_COM_ANEL).toEqual(['saturn', 'uranus', 'neptune', 'quaoar']);
    expect(FONTE).toContain('CORPOS_COM_ANEL');
  });
});

const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

// ------------------------------------------------------------
// O JUIZ DA SOMBRA (item 91) — a mesma conta do fragmento, em TS.
// Não é oráculo da FÓRMULA (essa é trivial e as duas concordariam
// mesmo erradas): é o juiz do FRAME. Ele come o uniform que a classe
// escreveu e o transform que o mesh gravou, e pergunta em COORDENADAS
// DE CENA onde a sombra caiu.
// ------------------------------------------------------------
function coberturaDoSol(
  pAnel: THREE.Vector3,
  dirSolLocal: THREE.Vector3,
  kPolar: number,
  solAngRad: number
): number {
  const k = Math.max(kPolar, 1e-4);
  const o = new THREE.Vector3(pAnel.x, pAnel.y, pAnel.z / k);
  const d = new THREE.Vector3(dirSolLocal.x, dirSolLocal.y, dirSolLocal.z / k).normalize();
  const aproxima = -o.dot(d);
  if (aproxima <= 0) return 1;
  const impacto = o.clone().addScaledVector(d, aproxima).length();
  const meia = Math.max(solAngRad * aproxima, 1e-6);
  const x = Math.min(1, Math.max(-1, (impacto - 1) / meia));
  return 1 - (Math.acos(x) - x * Math.sqrt(Math.max(1 - x * x, 0))) / Math.PI;
}

/**
 * Onde a sombra caiu, EM CENA: a direção média (unitária) dos pontos do
 * anel que o globo escurece, medida a partir do centro do planeta.
 * Devolve `null` quando nenhum ponto ficou na sombra.
 */
function direcaoDaSombraNaCena(
  malha: THREE.Mesh,
  dirSolLocal: THREE.Vector3,
  kPolar: number,
  solAngRad: number,
  centro: THREE.Vector3,
  raio = 1.7
): { direcao: THREE.Vector3; sombreados: number; claros: number } | null {
  const soma = new THREE.Vector3();
  let sombreados = 0;
  let claros = 0;
  const N = 720;
  for (let i = 0; i < N; i++) {
    const fi = (2 * Math.PI * i) / N;
    const p = new THREE.Vector3(raio * Math.cos(fi), raio * Math.sin(fi), 0);
    const cobertura = coberturaDoSol(p, dirSolLocal, kPolar, solAngRad);
    const mundo = p.clone().applyMatrix4(malha.matrix).sub(centro).normalize();
    if (cobertura < 0.5) {
      sombreados++;
      soma.add(mundo);
    } else if (cobertura > 0.999) {
      claros++;
    }
  }
  if (sombreados === 0 || soma.length() < 1e-9) return null;
  return { direcao: soma.normalize(), sombreados, claros };
}

const grausEntre = (a: THREE.Vector3, b: THREE.Vector3) =>
  (Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * 180) / Math.PI;

function giganteDeTeste(id: string) {
  const chamadas: string[] = [];
  const corpo = new GiganteResolvido({
    id,
    tier: () => 'cinema',
    maxTextureSize: 16384,
    base: '',
    webp: true,
    buscarManifest: async (url) => {
      chamadas.push(`manifest:${url}`);
      return MANIFEST;
    },
    carregarTextura: async (url) => {
      chamadas.push(`tex:${url}`);
      return new THREE.Texture();
    },
  });
  return { corpo, chamadas };
}

function centroPc(id: string, jd: number): THREE.Vector3 {
  const p = motor.posicaoHeliocentrica(id, jd);
  const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
  return new THREE.Vector3(eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC);
}

const PSF_FALSA = { expoM0: 0, sigmaPx: 2, beta: 300 };

function quadro(id: string, distanciaRaios: number, extra: Record<string, unknown> = {}) {
  const jd = typeof extra.jdTdb === 'number' ? extra.jdTdb : JD;
  const c = centroPc(id, jd);
  const raio = raiosDoGigantePc(id).a;
  const cam = c.clone().add(new THREE.Vector3(0, 0, distanciaRaios * raio));
  return {
    jdTdb: jd,
    fonte: motor as unknown as {
      posicaoHeliocentrica(id2: string, jd: number): { x: number; y: number; z: number };
    },
    camPosPc: cam,
    screenHPx: 1080,
    fovDeg: 58,
    ligado: true,
    atlasQuente: false,
    politica: 'assistida' as const,
    dtS: 0.016,
    psf: PSF_FALSA,
    salto: true,
    ...extra,
  };
}

describe('1. o oráculo de orientação por corpo (D-E4)', () => {
  for (const { id } of GIGANTES) {
    it(`${id}: o transform do MESH põe o Sol a pino nos dois instantes`, async () => {
      const { corpo } = giganteDeTeste(id);
      for (const jd of JDS) {
        const q = quadro(id, 4, { jdTdb: jd });
        corpo.atualizar(q);
        await flush();
        expect(corpo.atualizar(q).emQuadro, id).toBe(true);
        const doMesh = subSolarDosEixos(eixosDoMesh(malhaDaSuperficie(corpo.group)), dirSolCena(id, jd));
        const oraculo = subSolarPoint(id, jd, motor);
        expect(doMesh.lonEastDeg).toBeCloseTo(oraculo.lonEastDeg, 8);
        expect(doMesh.latDeg).toBeCloseTo(oraculo.latPlanetocentricaDeg, 8);
      }
      corpo.dispose();
    });
  }

  it('controle negativo: deitar o polo no equador no MESH reprova', async () => {
    const { corpo } = giganteDeTeste('jupiter');
    const q = quadro('jupiter', 4);
    corpo.atualizar(q);
    await flush();
    expect(corpo.atualizar(q).emQuadro).toBe(true);
    const mesh = malhaDaSuperficie(corpo.group);
    const e = mesh.matrix.elements;
    for (let i = 0; i < 3; i++) {
      const tmp = e[4 + i];
      e[4 + i] = e[8 + i];
      e[8 + i] = tmp;
    }
    const doMesh = subSolarDosEixos(eixosDoMesh(mesh), dirSolCena('jupiter', JD));
    const oraculo = subSolarPoint('jupiter', JD, motor);
    expect(Math.abs(doMesh.latDeg - oraculo.latPlanetocentricaDeg)).toBeGreaterThan(10);
    corpo.dispose();
  });

  it('o anel é inercial: um terço de dia não gira o padrão, e o globo sim', async () => {
    const { corpo } = giganteDeTeste('uranus');
    const q1 = quadro('uranus', 4, { jdTdb: JD });
    corpo.atualizar(q1);
    await flush();
    expect(corpo.atualizar(q1).emQuadro).toBe(true);
    const xAnel1 = eixosDoMesh(malhaDoAnel(corpo.group)).colunaX.slice();
    const xGlobo1 = eixosDoMesh(malhaDaSuperficie(corpo.group)).colunaX.slice();
    const q2 = quadro('uranus', 4, { jdTdb: JD + 0.3 });
    expect(corpo.atualizar(q2).emQuadro).toBe(true);
    const xAnel2 = eixosDoMesh(malhaDoAnel(corpo.group)).colunaX;
    const xGlobo2 = eixosDoMesh(malhaDaSuperficie(corpo.group)).colunaX;
    const dot = (a: readonly number[], b: readonly number[]) =>
      a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    expect(dot(xAnel1, xAnel2)).toBeGreaterThan(0.999);
    expect(dot(xGlobo1, xGlobo2)).toBeLessThan(0.5);
    corpo.dispose();
  });
});

/**
 * ITEM 91 — A SOMBRA DO GLOBO NO ANEL É ANTI-SOLAR.
 *
 * A QUEIXA DO DONO (2026-08-25, olhando `item91-anel-antes-depois.png`):
 * "o globo está iluminado pela ESQUERDA e a sombra sobre o anel também
 * aparece à esquerda — do lado do Sol". Fisicamente impossível.
 *
 * A causa era de FRAME, não de fórmula: a classe escrevia o Sol e a
 * câmera no frame do anel aplicando Rx(−π/2) PARA A FRENTE, quando o que
 * leva um vetor da base da cena para a base local é a INVERSA. As duas
 * diferem por meia volta em torno de x̂ — a sombra saía espelhada.
 *
 * ESTE JUIZ NÃO OLHA O FRAME: ele lê o uniform que a classe escreveu e a
 * matriz que o mesh gravou, acha os pontos escuros e pergunta, EM CENA,
 * de que lado do Sol eles estão. Um espelhamento pode acertar por acaso
 * numa pose — por isso são TRÊS datas, com Saturno em pedaços bem
 * diferentes da órbita.
 */
describe('4b. item 91 — a sombra do globo cai do lado OPOSTO ao Sol', () => {
  // Quatro poses, de propósito em pedaços bem diferentes da órbita E com
  // o anel apresentando as DUAS faces: 2017 mostra a face NORTE aberta,
  // 2003 a face SUL. Um erro de sinal no eixo polar acerta numa e erra
  // na outra; a época do retrato entra porque o anel quase de perfil é o
  // caso em que qualquer engano é mais difícil de ver a olho.
  const DATAS: readonly { jd: number; nome: string }[] = [
    { jd: 2460409.26395835, nome: '2024-04-01' },
    { jd: 2457920.5, nome: '2017-06-15 (face norte)' },
    { jd: 2452641.0, nome: '2003-01-01 (face sul)' },
    { jd: EPOCA_JD_TDB, nome: 'época do retrato' },
  ];

  async function anelDeSaturno(jd: number) {
    const { corpo } = giganteDeTeste('saturn');
    const q = quadro('saturn', 4, { jdTdb: jd });
    corpo.atualizar(q);
    await flush();
    expect(corpo.atualizar(q).emQuadro).toBe(true);
    const malha = malhaDoAnel(corpo.group);
    const mat = malha.material as THREE.ShaderMaterial;
    const centro = centroPc('saturn', jd);
    const dirSolCena = centro.clone().multiplyScalar(-1).normalize();
    return { corpo, malha, mat, centro, dirSolCena, q };
  }

  for (const { jd, nome } of DATAS) {
    it(`${nome}: o uniform do anel volta ao Sol de verdade quando o mesh o desfaz`, async () => {
      const { corpo, malha, mat, centro, dirSolCena, q } = await anelDeSaturno(jd);
      // o uniform, levado de volta à cena pelo PRÓPRIO transform do mesh,
      // tem de ser o vetor Saturno→Sol. É o teste de transposta.
      const solDeVolta = (mat.uniforms.uDirSolLocal.value as THREE.Vector3)
        .clone()
        .transformDirection(malha.matrix);
      expect(grausEntre(solDeVolta, dirSolCena)).toBeLessThan(1e-6);

      // e a câmera do uniform tem de voltar à câmera do quadro
      const camDeVolta = (mat.uniforms.uCamLocal.value as THREE.Vector3)
        .clone()
        .applyMatrix4(malha.matrix);
      expect(camDeVolta.distanceTo(q.camPosPc)).toBeLessThan(1e-9 * centro.length());
      corpo.dispose();
    });

    it(`${nome}: os pontos escuros do anel estão no lado anti-solar`, async () => {
      const { corpo, malha, mat, centro, dirSolCena } = await anelDeSaturno(jd);
      const achado = direcaoDaSombraNaCena(
        malha,
        mat.uniforms.uDirSolLocal.value as THREE.Vector3,
        mat.uniforms.uKPolar.value as number,
        mat.uniforms.uSolAngRad.value as number,
        centro
      );
      expect(achado, `${nome}: nenhum ponto na sombra`).not.toBeNull();
      // a vista não é vazia dos dois lados: há sombra E há anel aceso
      expect(achado!.sombreados).toBeGreaterThan(20);
      expect(achado!.claros).toBeGreaterThan(200);

      // A LEI, na língua do dono: a sombra fica do lado oposto ao Sol.
      expect(achado!.direcao.dot(dirSolCena)).toBeLessThan(0);

      // E não só "do outro lado": o eixo do cone de sombra É o anti-Sol,
      // e o que ele risca no plano do anel é a PROJEÇÃO desse eixo nesse
      // plano — o Sol está elevado sobre o anel, e é essa elevação que
      // separa a mancha do anti-Sol em 3D. Comparar com o anti-Sol cru
      // acusaria 26,7° em 2017 e chamaria de erro a abertura do anel.
      const normalDoAnel = new THREE.Vector3(0, 0, 1).transformDirection(malha.matrix);
      const antiNoPlano = dirSolCena
        .clone()
        .multiplyScalar(-1)
        .addScaledVector(normalDoAnel, dirSolCena.dot(normalDoAnel))
        .normalize();
      expect(grausEntre(achado!.direcao, antiNoPlano)).toBeLessThan(0.5);
      corpo.dispose();
    });
  }

  /**
   * CONTROLE NEGATIVO — a sabotagem que o dono viu na foto. Repor o
   * frame ERRADO (Rx(−π/2) para a frente: y e z do uniform trocados de
   * sinal) tem de reprovar o mesmo juiz, e reprovar FEIO.
   */
  it('sabotagem: com o frame invertido, a sombra sai do lugar em todas as datas', async () => {
    const desvios: number[] = [];
    let doLadoDoSol = 0;
    for (const { jd } of DATAS) {
      const { corpo, malha, mat, centro, dirSolCena } = await anelDeSaturno(jd);
      const certo = mat.uniforms.uDirSolLocal.value as THREE.Vector3;
      const invertido = new THREE.Vector3(certo.x, -certo.y, -certo.z);
      const achado = direcaoDaSombraNaCena(
        malha,
        invertido,
        mat.uniforms.uKPolar.value as number,
        mat.uniforms.uSolAngRad.value as number,
        centro
      );
      expect(achado).not.toBeNull();
      const normalDoAnel = new THREE.Vector3(0, 0, 1).transformDirection(malha.matrix);
      const antiNoPlano = dirSolCena
        .clone()
        .multiplyScalar(-1)
        .addScaledVector(normalDoAnel, dirSolCena.dot(normalDoAnel))
        .normalize();
      desvios.push(grausEntre(achado!.direcao, antiNoPlano));
      if (achado!.direcao.dot(dirSolCena) > 0) doLadoDoSol++;
      corpo.dispose();
    }
    // nenhuma das três poses "acerta por coincidência"
    for (const d of desvios) expect(d).toBeGreaterThan(30);
    // e o que o dono viu na foto — sombra DO LADO DO SOL — acontece
    // mesmo, em pelo menos uma das três
    expect(doLadoDoSol).toBeGreaterThan(0);
  });

  /**
   * UM CADASTRO SÓ DE "ONDE ESTÁ O SOL". Antes de 25/08 o anel refazia a
   * conta por conta própria (`-this.centro.x / nSol`, três linhas) em vez
   * de beber do `dirSol` que o globo já tinha. Duas derivações da mesma
   * verdade no MESMO método foi o esconderijo da inversão: o globo
   * acendia certo e o anel não, e nada acusava. Vale para os dois
   * arquivos que têm anel.
   */
  it('o Sol nasce UMA vez por corpo — o anel não refaz a conta', () => {
    const rochoso = readFileSync(new URL('./rochoso.ts', import.meta.url), 'utf8');
    for (const fonte of [FONTE, rochoso]) {
      expect(fonte).not.toMatch(/-\s*this\.centro\.[xyz]\s*\/\s*nSol/);
      expect((fonte.match(/copy\(this\.centro\)\.multiplyScalar\(-1\)/g) ?? []).length).toBe(1);
      expect(fonte).toContain('componentesNoFrameDoAnel(');
    }
  });

  it('o raio angular do Sol é MEDIDO da distância do corpo, não constante', async () => {
    const { corpo, mat, q } = await anelDeSaturno(DATAS[0].jd);
    const p = motor.posicaoHeliocentrica('saturn', q.jdTdb);
    const esperado = RAIO_SOL_KM / (Math.hypot(p.x, p.y, p.z) * AU_KM);
    expect(mat.uniforms.uSolAngRad.value as number).toBeCloseTo(esperado, 12);
    // ~0,0275° em Saturno: o Sol daqui é quase um ponto, mas não é um ponto
    expect((mat.uniforms.uSolAngRad.value as number) * (180 / Math.PI)).toBeCloseTo(0.0275, 3);
    corpo.dispose();
  });
});

describe('5. a classe — gate, carga, cessão, anel', () => {
  it('perto, o mesh nasce com a textura do manifest REAL; longe, nada carrega', async () => {
    const { corpo, chamadas } = giganteDeTeste('jupiter');
    corpo.atualizar(quadro('jupiter', 100_000));
    await flush();
    expect(chamadas).toHaveLength(0);
    corpo.atualizar(quadro('jupiter', 4));
    await flush();
    const e2 = corpo.atualizar(quadro('jupiter', 4));
    expect(chamadas.some((c) => c.startsWith('manifest:'))).toBe(true);
    expect(chamadas.some((c) => c.includes('jupiter/map'))).toBe(true);
    expect(e2.emQuadro).toBe(true);
    expect(e2.cede).toBeGreaterThan(0);
    corpo.dispose();
  });

  it('Saturno pede o canal ring além do map', async () => {
    const { corpo, chamadas } = giganteDeTeste('saturn');
    corpo.atualizar(quadro('saturn', 4));
    await flush();
    expect(chamadas.some((c) => c.includes('saturn/map'))).toBe(true);
    expect(chamadas.some((c) => c.includes('saturn/ring'))).toBe(true);
    expect(corpo.atualizar(quadro('saturn', 4)).emQuadro).toBe(true);
    corpo.dispose();
  });

  it('sem efeméride cai no RETRATO (os quatro são planetas)', () => {
    const p = posicaoDoGiganteUA('jupiter', Number.NaN, null);
    expect(p).not.toBeNull();
    expect(Math.hypot(p!.x, p!.y, p!.z)).toBeGreaterThan(4);
    expect(Math.hypot(p!.x, p!.y, p!.z)).toBeLessThan(6);
  });

  /**
   * O PINO DE REGRESSÃO DO ITEM 91 — e ele nasceu de uma SABOTAGEM que
   * passou. Em 25/08 o auditor reverteu a obra inteira alimentando
   * `ganhoDoGlobo` com o id `'earth'` em vez do id do corpo, aqui e no
   * rochoso, e os 2.249 testes passaram TODOS. O conserto de Saturno
   * existia sem nada que o protegesse: bastava um `find`/`replace`
   * distraído para o dono voltar a ver carvão, em silêncio.
   *
   * O buraco era de COBERTURA, não de lei. A lib estava pinada
   * (`luzDaVisita.test.ts`), a Terra e a Lua estavam pinadas — e as duas
   * têm compensação 1 EXATA, então a reversão não as move um bit. Ninguém
   * pinava o que gigante e rochoso ESCREVEM no uniform. Com `'earth'` a
   * compensação vale 1 e o produto vira `ganhoFundido` puro: exatamente a
   * lei do ponto no globo, que é o defeito original.
   *
   * O NÚMERO É LITERAL, e é a lição da casa: um oráculo que recalcula a
   * fórmula do código concorda com o código mesmo quando os dois estão
   * errados. Este vem de fora — 0,987500172598 é o que Saturno deve valer
   * a 9,709593622 UA no JD do teste, e sob a reversão o uniform sairia
   * 0,203685100863 (4,85× menor). Se um dia mudar a efeméride ou a
   * política, este número muda COM DECLARAÇÃO, nunca por conveniência.
   */
  it('PINO 93: o uniform de Saturno é o SOL DO EYES — 1 literal, sem resíduo de 1/d²', async () => {
    const { corpo } = giganteDeTeste('saturn');
    corpo.atualizar(quadro('saturn', 4));
    await flush();
    const e = corpo.atualizar(quadro('saturn', 4));
    expect(e.emQuadro).toBe(true);

    const globo = malhaDaSuperficie(corpo.group).material as THREE.ShaderMaterial;
    expect(globo.uniforms.uLuzGanho.value).toBe(1);

    // O ANEL PAGA A MESMA CONTA — era o 0,2 dele que o apagava junto com
    // o globo, e um anel que ficasse para trás seria meio conserto.
    const anel = malhaDoAnel(corpo.group).material as THREE.ShaderMaterial;
    expect(anel.uniforms.uLuzGanho.value).toBe(globo.uniforms.uLuzGanho.value);

    // AS DUAS REVERSÕES POSSÍVEIS, ditas por extenso. 0,9875 é o que o
    // ITEM 91 escrevia aqui (lei viva × compensação — o resíduo do
    // pontinho ainda vivo no globo); 0,2037 é o que a sabotagem do
    // auditor produzia (compensação de `'earth'`), e foi ela que passou
    // calada em 25/08 antes de existir pino nenhum.
    expect(globo.uniforms.uLuzGanho.value).not.toBeCloseTo(0.987500172598, 6);
    expect(globo.uniforms.uLuzGanho.value).not.toBeCloseTo(0.203685100863, 6);

    // AS DUAS PEÇAS NOVAS chegam ao GLOBO e NÃO chegam ao ANEL — o
    // modelo do anel é camada de partículas com função de fase, e um
    // fill de câmera por cima quebraria o I/F ancorado na Cassini.
    expect(globo.uniforms.uLanternaLeitura.value).toBe(LANTERNA_DE_LEITURA);
    // O `s` DE SATURNO NÃO É 3: ele tem véu, e o Eyes amacia o terminador
    // onde há atmosfera (`sharpness /= 1 + 700·density`). 2,8986.
    expect(globo.uniforms.uTerminadorS.value)
      .toBe(sDoTerminador('assistida', densidadeDoVeu('saturn')));
    expect(globo.uniforms.uTerminadorS.value).toBeCloseTo(2.898551, 6);
    expect(anel.uniforms.uLanternaLeitura).toBeUndefined();
    expect(anel.uniforms.uTerminadorS).toBeUndefined();

    // O VÉU (§4.4) chega ao GLOBO com a forma do CORPO, e NÃO chega ao
    // anel: o modelo dele é camada de partículas, e uma palha por cima
    // quebraria o I/F ancorado na Cassini.
    expect(globo.uniforms.uVeuColuna.value).toBe(colunaVerticalDoVeu('saturn'));
    expect(globo.uniforms.uVeuColuna.value).toBeCloseTo(0.01, 15);
    expect(globo.uniforms.uVeuEspessura.value).toBe(espessuraDoVeu('saturn'));
    expect(globo.uniforms.uVeuCor.value).toEqual([...COR_DO_VEU]);
    expect(anel.uniforms.uVeuColuna).toBeUndefined();

    // EM `real` AS TRÊS PEÇAS APAGAM JUNTAS: o ganho volta a ser E(d) na
    // rUA viva, e os dois uniformes zeram. É a decisão 2 do dono.
    corpo.atualizar(quadro('saturn', 4, { politica: 'real' }));
    expect(globo.uniforms.uLuzGanho.value).toBe(ganhoDoGlobo(e.rUA, 'real'));
    expect(globo.uniforms.uLuzGanho.value).toBeCloseTo(0.010607130027, 9);
    expect(globo.uniforms.uLanternaLeitura.value).toBe(0);
    expect(globo.uniforms.uTerminadorS.value).toBe(0);
    corpo.dispose();
  });

  /**
   * PINO 93 §4.4, O OUTRO LADO: os três gigantes SEM véu compilam o mesmo
   * fragmento de Saturno e têm de sair dele intocados. Sem este pino,
   * espalhar o véu para os quatro — um `densidadeDoVeu` que devolvesse a
   * densidade a todo gigante, por exemplo — passaria calado, e Júpiter
   * ganharia um limbo palha que nem o Eyes nem a física lhe dão.
   */
  it.each(['jupiter', 'uranus', 'neptune'])(
    'PINO 93: %s NÃO tem véu — coluna 0 e o `s` de volta ao 3 exato',
    async (id) => {
      const { corpo } = giganteDeTeste(id);
      corpo.atualizar(quadro(id, 4));
      await flush();
      corpo.atualizar(quadro(id, 4));
      const globo = malhaDaSuperficie(corpo.group).material as THREE.ShaderMaterial;
      expect(globo.uniforms.uVeuColuna.value).toBe(0);
      expect(globo.uniforms.uVeuEspessura.value).toBe(0);
      expect(Object.is(globo.uniforms.uTerminadorS.value, 3)).toBe(true);
      corpo.dispose();
    }
  );

  /**
   * PINO 93/104 — O INVARIANTE NOVO: assistido SEMPRE traduzido, real
   * SEMPRE cru. Este dente nasceu em 26/08 cobrando a fiação da porta
   * `?calib=`, achada por SABOTAGEM: apagar o `q.calibracao` da chamada de
   * `escreverLuzDaVisita` (§ da classe, logo acima) compilava e
   * atravessava os 2.360 testes calado — a porta continuava viva no
   * Director, o selo continuava declarando, e o pixel simplesmente não
   * mudava.
   *
   * A porta MORREU no mesmo dia — ele escolheu a C1, ela virou o padrão —,
   * e o dente ficou, com o alvo que sobrou. O gate da tradução passou a
   * ser o `uTerminadorS` (a convenção "0 = Lambert cru", que é dizer
   * `?luz=real`), então este uniforme deixou de ser só a suavidade do
   * terminador: é ele que acende e apaga a TRADUÇÃO. Um corpo que o
   * escrevesse sem passar a política acenderia a curva do Eyes dentro do
   * modo que promete penumbra física — a decisão 2 do dono desfeita por
   * dentro, e sem uma linha vermelha. O que o chunk FAZ com o uniforme é
   * cobrado em `luzDaVisita.test.ts`, que executa o GLSL.
   *
   * EM SATURNO O NÚMERO É O DO VÉU (2,8986, não 3), e isso é de propósito:
   * é o corpo em que a política e a densidade chegam JUNTAS ao escritor, e
   * o único em que trocar a ordem dos dois argumentos apareceria.
   */
  it('PINO 93/104: o gigante assistido traduz, e em `real` os dois zeram', async () => {
    const { corpo } = giganteDeTeste('saturn');
    corpo.atualizar(quadro('saturn', 4));
    await flush();
    corpo.atualizar(quadro('saturn', 4));
    const globo = malhaDaSuperficie(corpo.group).material as THREE.ShaderMaterial;
    expect(globo.uniforms.uTraduzDaTela).toBeUndefined();
    expect(globo.uniforms.uLanternaDepois).toBeUndefined();
    expect(globo.uniforms.uLanternaLeitura.value).toBe(LANTERNA_DE_LEITURA);
    expect(globo.uniforms.uTerminadorS.value)
      .toBe(sDoTerminador('assistida', densidadeDoVeu('saturn')));
    expect(globo.uniforms.uTerminadorS.value).toBeGreaterThan(0);
    corpo.atualizar(quadro('saturn', 4, { politica: 'real' }));
    expect(Object.is(globo.uniforms.uLanternaLeitura.value, 0)).toBe(true);
    expect(Object.is(globo.uniforms.uTerminadorS.value, 0)).toBe(true);
    corpo.atualizar(quadro('saturn', 4));
    expect(globo.uniforms.uTerminadorS.value).toBeGreaterThan(0);
    corpo.dispose();
  });
});

describe('6. texto-fonte (as leis do cabeçalho, pinadas)', () => {
  it('não tem relógio: o jd é do Director (D-E6)', () => {
    expect(FONTE).not.toContain('Date.now');
    expect(FONTE).not.toContain('new Date(');
    expect(FONTE).not.toContain('performance.now');
  });

  it('advecção de Júpiter é ESTÁTICA com pendência nomeada — sem cisalhamento', () => {
    expect(FONTE).toContain('ADVECÇÃO ZONAL DE JÚPITER: ESTÁTICA');
    expect(FONTE).toContain('P-E12');
    expect(GIGANTE_LAMBERT_FRAG).not.toMatch(/vUv\.x\s*\+/);
    expect(GIGANTE_LAMBERT_FRAG).not.toMatch(/uVento|uAdvec|windProfile/);
  });

  it('a tabela da fase é o dado vivo: os 4 gigantes, Lambert, Saturno com anel', () => {
    expect(GIGANTES.map((c) => c.id)).toEqual(['jupiter', 'saturn', 'uranus', 'neptune']);
    expect(FONTE).toContain("this.idCorpo === 'saturn'");
  });
});
