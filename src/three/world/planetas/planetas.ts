// ============================================================
// A CAMADA `planetas` (D3 da Onda 4) — dez pontos fotométricos: o Sol
// e os nove corpos do retrato congelado, desenhados pela MESMA PSF das
// 328.749 estrelas do campo.
//
// A DOUTRINA, em uma frase: nada aqui é inflado. Um planeta aparece
// quando o brilho aparente dele manda, como no céu de verdade — e é por
// isso que este arquivo não tem nenhum tamanho, nenhuma exposição
// própria e nenhum escalar didático. O que ele tem é posição real
// (D1), magnitude por quadro (D3) e a PSF compartilhada da casa
// (`GLSL_STAR_PSF`, `shaders/common.ts`).
//
// ------------------------------------------------------------
// 1. A PONTE DE FRAME (D1) — uma rotação e uma multiplicação
// ------------------------------------------------------------
// A cena JÁ é heliocêntrica equatorial J2000 cartesiana em pc com o Sol
// na ORIGEM (`galaxy.ts:42-53` + `config.ts:172-179`). Logo a ponte é
//     posição de cena = eclipticaParaEquatorial(vetorUA) × AU_PARA_PC,
// e o Sol é o vértice 0 em (0,0,0) — não por convenção, por construção.
// PROIBIDO (pinado por teste de texto-fonte, que cobra a AUSÊNCIA dos
// dois nomes neste arquivo) o caminho galactocêntrico composto de
// `frameGalactico` + `galaxy`: ele dá a volta por 8.150 pc e erra a
// origem em 0,1134 UA MEDIDOS, além de morrer na quantização de float32
// (o epsilon a 8.150 pc é ~100 UA — risco declarado no mapa da casa).
//
// As posições são ESTÁTICAS: escritas UMA vez no construtor, a partir
// da época FIXA (`retrato2026.ts`, D4). Nenhum relógio de runtime,
// nenhuma efeméride viva — o anti-padrão nº 6 da casa, também pinado
// pela ausência.
//
// ------------------------------------------------------------
// 2. UMA CONVENÇÃO SÓ DE MAGNITUDE — o porquê de `aMagBase` ser em pc
// ------------------------------------------------------------
// A F1 entrega DUAS leis (fotometria.ts), e elas falam unidades
// diferentes:
//     planetária  m = H + 5·log10(r_UA) + 5·log10(d_obs_UA) − 2,5·log10(Φ)
//     estelar     m = M_V + 5·log10(d_pc/10)
// Deixar as duas no shader significaria uma ramificação por vértice E
// duas réguas de distância no mesmo laço — erro esperando acontecer.
// Em vez disso o atributo é NORMALIZADO para uma convenção única:
//
//     aMagBase = a magnitude do corpo visto de 1 pc, em fase zero.
//
// Com ela o vertex tem UMA linha para os dez:
//     m = aMagBase + 5·log10(d_pc) − 2,5·log10(Φ)
// (o Sol entra com Φ = 1, ver abaixo). A conversão dos nove é exata e
// derivada do conversor ÚNICO, nunca de um literal novo:
//     aMagBase_pc = aMagBase_UA + 5·log10(UA por pc),
// porque 5·log10(d_pc · UA_por_pc) = 5·log10(d_pc) + 5·log10(UA_por_pc).
// O Sol entra direto: `−0,15` É a magnitude dele a 1 pc.
//
// O PONTO-ZERO DO SOL, e por que a função do campo não entra aqui. A
// lei de magnitude aparente do catálogo (`lodStellar.ts`) é
// `−0,15 − 2,5·logLum + 5·log10(d)`, e com logLum 0 (o Sol) dá
// exatamente `−0,15 + 5·log10(d)` — equivalente a M_V☉ = 4,85, MEDIDO
// pela F1 (o 4,83 publicado difere 0,02 mag; ver o cabeçalho de
// `fotometria.ts`). Reusar a FUNÇÃO seria o erro: ela CLAMPA a
// distância em 1e-3 pc = 206 UA e satura exatamente DENTRO do domínio
// profundo — achado da F1, pinado em `fotometria.test.ts`, e o motivo
// de o teste de texto-fonte desta camada cobrar que o nome dela NÃO
// apareça neste arquivo. Aqui a mesma lei é escrita SEM o clamp, com
// uma guarda mínima contra d = 0 (`DIST_MIN_PC`), e a igualdade do
// ponto-zero com a função do campo avaliada em 1 pc (onde o clamp não
// age) é pinada em `planetas.test.ts`.
//
// A CONTA QUE A GPU FAZ, e não outra: `log2(x) · 0,30103`, o mesmo
// idioma do `STAR_VERT` (`starShaders.ts`) e do espelho JS que vive ao
// lado dele. Não vira `Math.log10` no espelho TS abaixo pelo mesmo
// motivo de lá: o espelho existe para PREVER o pixel da GPU.
//
// FASE LAMBERTIANA (D3, aproximação declarada). Φ = (1+cos α)/2 com α o
// ângulo Sol–corpo–observador. Com o Sol na origem, os dois braços do
// ângulo saem de graça: do corpo para o Sol é `−pos`, do corpo para o
// observador é `uCamPos − pos`. A mesma matemática de
// `faseLambertiana`/`magAparente` (F1), espelhada aqui e pinada por
// teste de paridade. As polinomiais por corpo de Mallama & Hilton são
// pendência NOMEADA da Onda 6.
//
// ------------------------------------------------------------
// 3. O QUE ESTA CAMADA NÃO FAZ
// ------------------------------------------------------------
// Sem extinção interestelar e sem cessão (`aFade`/`aFocus`): o gás
// entre a câmera e um planeta a 40 UA é nada, e ninguém cede a ninguém
// dentro do sistema solar. Sem `uFocus`. Não assina a troca de
// qualidade e não zera a contagem de estabilidade da captura (D8:
// qualidade não recria geometria — e esta camada não tem geometria para
// recriar). Sem alocação por quadro: três uniforms, escritos só quando
// mudam (M4 da casa).
//
// O FRAGMENT é o `STAR_FRAG` do campo, IMPORTADO e não copiado. É o que
// torna a fotometria relativa planeta↔estrela honesta de verdade: os
// dois pontos passam pelo mesmo gaussiano, pelo mesmo halo, pelos
// mesmos espinhos de difração e pelo mesmo `discard r² > 1`.
// ============================================================
import * as THREE from 'three';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../../lib/atlas/frameGalactico';
import { GLSL_STAR_PSF } from '../../shaders/common';
import { STAR_FRAG } from '../../shaders/starShaders';
import { DEEP_LIMIAR_PC, deepPointGain } from '../lodStellar';
import { A_MAG_BASE, FOTOMETRIA, IDS_FOTOMETRIA } from './fotometria';
import { EPOCA_ISO, EPOCA_JD_TDB, IDS_RETRATO, RETRATO_2026 } from './retrato2026';

/**
 * A CHAVE da camada (D7). Nasce `false`: a F3 entrega a camada
 * DESLIGADA, e as 18 vistas saem bit-idênticas por construção. Quem a
 * vira é a F4, depois de medir o envelope com `?plan=1`. As duas portas
 * de URL (`?plan=1` liga, `?noplan=1` desliga) existem para o A/B ser
 * feito com o MESMO binário dos dois lados — precedente `?dom/?nodom`
 * da Onda 3.
 */
export const PLANETAS_DEFAULT_ON = false;

/**
 * UA por pc, DERIVADO do conversor único (`AU_PARA_PC`,
 * `frameGalactico.ts`) — nunca um literal novo. O ida-e-volta
 * `1/(1/x)` custa no máximo 1 ulp (~1e-11 relativo, 2e-11 mag depois do
 * `5·log10`), e vale o preço de não ter um segundo 206.264,806 no
 * repositório para divergir em silêncio.
 */
export const UA_POR_PC = 1 / AU_PARA_PC;

/**
 * O deslocamento que traz a lei planetária (distância em UA) para a
 * régua de pc da cena: `5·log10(UA por pc)`. Ver a seção 2 do
 * cabeçalho.
 */
export const DESLOCAMENTO_UA_PARA_PC = 5 * Math.log10(UA_POR_PC);

/**
 * O ponto-zero do CAMPO: a magnitude do Sol a 1 pc. Redigitado da lei
 * do catálogo (`lodStellar.ts`) de propósito — a igualdade com ela
 * avaliada em 1 pc é pinada em `planetas.test.ts`, e o que NÃO pode
 * entrar aqui é a função inteira, que clampa em 1e-3 pc = 206 UA bem no
 * meio do domínio profundo (achado da F1).
 */
export const PONTO_ZERO_SOL_PC = -0.15;

/** `log10(2)` como a GPU o escreve (`STAR_VERT`) — ver a seção 2. */
export const LOG10_DE_2 = 0.30103;

/** Guarda contra d = 0 na lei de magnitude (D3), em pc. */
export const DIST_MIN_PC = 1e-9;

/**
 * Anos-luz por pc — o MESMO fator que o rótulo da casa já usa para
 * falar com o visitante (`LabelCanvas.ts:128`). Só serve ao readout do
 * `?dbgplan`: nenhuma conta de pixel passa por aqui.
 */
const AL_POR_PC = 3.262;

/**
 * Piso do fator de fase. Φ = 0 (conjunção exata) manda `m` a +∞, que é
 * a resposta certa da física e a errada para um float: `magAparente`
 * (F1) devolve `+Infinity` e deixa a decisão para quem desenha. Quem
 * desenha é este arquivo, e a decisão é um piso — 1e-6 vale 15 mag de
 * penalidade, o que apaga qualquer corpo desta tabela muito antes de
 * qualquer pixel.
 */
export const FASE_MIN = 1e-6;

/**
 * `aMagBase` dos dez na convenção única (magnitude a 1 pc, fase zero).
 * O Sol pelo ponto-zero do campo; os nove pelo `A_MAG_BASE` da F1
 * (que já carrega a efeméride dentro, via `r_UA` do retrato) deslocado
 * para a régua de pc.
 */
export const A_MAG_BASE_PC: Record<string, number> = {
  sun: PONTO_ZERO_SOL_PC,
  ...Object.fromEntries(
    IDS_RETRATO.map((id) => [id, A_MAG_BASE[id] + DESLOCAMENTO_UA_PARA_PC])
  ),
};

/**
 * O FATOR DE FASE do vertex, espelhado em TS. Φ = (1+cos α)/2 com α
 * medido no corpo, entre a direção do Sol (a ORIGEM) e a direção do
 * observador. As guardas são as do shader, na mesma ordem: divisão por
 * `max(·, ·)` em vez de `normalize` (o Sol tem posição nula e
 * `normalize(0)` é NaN — e NaN×0 continua NaN, então mascarar depois
 * não salvaria), e o piso `FASE_MIN`.
 */
export function faseDoVertice(
  px: number, py: number, pz: number,
  cx: number, cy: number, cz: number
): number {
  const ox = cx - px;
  const oy = cy - py;
  const oz = cz - pz;
  const dObs = Math.max(Math.hypot(ox, oy, oz), DIST_MIN_PC);
  const rSol = Math.max(Math.hypot(px, py, pz), 1e-30);
  const cosAlfa = (-px * ox - py * oy - pz * oz) / (rSol * dObs);
  return Math.max(0.5 * (1 + cosAlfa), FASE_MIN);
}

/**
 * A LEI DE MAGNITUDE do vertex, espelhada em TS — uma linha para os
 * dez (seção 2 do cabeçalho). `fase` é o FATOR (saída de
 * `faseDoVertice`), 1 para o Sol. Espelho, não fonte: se o VERT mudar,
 * este espelho e a paridade em `planetas.test.ts` quebram — é o alarme.
 */
export function magDoVertice(aMagBasePc: number, dPc: number, fase: number): number {
  const d = Math.max(dPc, DIST_MIN_PC);
  const f = Math.max(fase, FASE_MIN);
  return aMagBasePc + 5 * (Math.log2(d) * LOG10_DE_2) - 2.5 * (Math.log2(f) * LOG10_DE_2);
}

const PLANETAS_VERT = /* glsl */ `
attribute float aMagBase; // magnitude a 1 pc, fase zero (convenção única)
attribute vec3 aCor;      // RGB linear da F1 (iluminante × razão de banda)
attribute float aEhSol;   // 1 no vértice 0, 0 nos nove — ver o alpha

uniform vec3 uCamPos;
uniform float uScreenH;
uniform float uGain;    // deepPointGain(dHome): o Sol-ponto assumindo
uniform float uExpoM0;  // a MESMA exposição do campo (StarField publica)
uniform float uSigmaPx; // o MESMO instrumento do campo

varying vec3 vColor;
varying float vSat;
varying float vSigma;
varying float vPeak;

${GLSL_STAR_PSF}

void main() {
  vec3 worldPos = position;
  vec3 paraObs = uCamPos - worldPos;
  float dPc = max(length(paraObs), ${DIST_MIN_PC.toExponential(1)});

  // Fase Lambertiana (aproximação declarada, D3): o Sol está na ORIGEM,
  // então o braço corpo→Sol é -worldPos. Divisão por max(...) e não
  // normalize(): no vértice do Sol o braço é nulo e normalize daria NaN,
  // que o mix abaixo NÃO limparia (NaN * 0.0 = NaN).
  float rSol = max(length(worldPos), 1.0e-30);
  float cosAlfa = dot(-worldPos / rSol, paraObs / dPc);
  float fase = max(0.5 * (1.0 + cosAlfa), ${FASE_MIN.toExponential(1)});
  // o Sol é o ILUMINANTE: não tem fase (e o cosAlfa dele é lixo).
  fase = mix(fase, 1.0, aEhSol);

  // m = aMagBase + 5·log10(d_pc) − 2,5·log10(Φ). log2·0,30103 é a conta
  // que a GPU faz no campo (STAR_VERT) — o espelho TS repete esta.
  float m = aMagBase + 5.0 * (log2(dPc) * ${LOG10_DE_2})
                     - 2.5 * (log2(fase) * ${LOG10_DE_2});

  // A PSF compartilhada da casa, sem uma vírgula de diferença.
  float size; float peak; float sat; float sigmaFrac;
  starPSF(m, uExpoM0, uSigmaPx, uScreenH, size, peak, sat, sigmaFrac);

  // O ÚNICO alpha desta camada, e ele é só do Sol: o crossfade reverso
  // da D2 (disco artístico ↔ ponto fotométrico). Os nove entram com 1 —
  // quem decide o brilho deles é a física, não uma rampa. E cede aos
  // DOIS varyings juntos (lição do vSat, commit 2e16689): atenuar só o
  // vPeak deixaria os espinhos de difração com força cheia.
  float alpha = mix(1.0, uGain, aEhSol);

  vColor = aCor;
  vSat = sat * alpha;
  vSigma = sigmaFrac;
  vPeak = peak * alpha;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
  gl_PointSize = size;
}
`;

/** O que a camada precisa saber da PSF do campo — `StarField` publica
 *  os dois (`stars.ts`), e é de lá que eles vêm: redigitar 3,5/0,85
 *  aqui compraria a divergência que a fase 2 da Onda 3 desfez. */
export interface PsfDoCampo {
  readonly expoM0: number;
  readonly sigmaPx: number;
}

export class Planetas {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;

  /**
   * A porta do quadro (D7/D11a). O director a escreve ANTES do
   * `update`, como já faz com `sunStar.quad.visible` — as portas
   * governam a CAMADA, nunca o palco (o domínio profundo é fundação,
   * como o near).
   */
  ligado = false;

  /** digitais dos três uniforms — só escreve o que mudou (M4). */
  private readonly camAnterior = new THREE.Vector3(NaN, NaN, NaN);
  private screenHAnterior = NaN;
  private gainAnterior = NaN;
  /** rascunho da projeção do `?dbgplan` (fora do caminho do quadro). */
  private readonly rascunho = new THREE.Vector3();

  constructor(psf: PsfDoCampo) {
    const n = IDS_FOTOMETRIA.length;
    const posicao = new Float32Array(n * 3);
    const magBase = new Float32Array(n);
    const cor = new Float32Array(n * 3);
    const ehSol = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const id = IDS_FOTOMETRIA[i];
      if (id === 'sun') {
        // o Sol É a origem da cena — não é posicionado, é onde tudo mede.
        ehSol[i] = 1;
      } else {
        // D1: uma rotação e uma multiplicação, e nada mais.
        const v = RETRATO_2026[id].vetorUA;
        const eq = eclipticaParaEquatorial([v[0], v[1], v[2]]);
        posicao[i * 3] = eq[0] * AU_PARA_PC;
        posicao[i * 3 + 1] = eq[1] * AU_PARA_PC;
        posicao[i * 3 + 2] = eq[2] * AU_PARA_PC;
      }
      magBase[i] = A_MAG_BASE_PC[id];
      const c = FOTOMETRIA[id].corLinear;
      cor[i * 3] = c[0];
      cor[i * 3 + 1] = c[1];
      cor[i * 3 + 2] = c[2];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posicao, 3));
    geo.setAttribute('aMagBase', new THREE.BufferAttribute(magBase, 1));
    geo.setAttribute('aCor', new THREE.BufferAttribute(cor, 3));
    geo.setAttribute('aEhSol', new THREE.BufferAttribute(ehSol, 1));
    // Plutão, o mais distante da tabela, está a 35,4 UA = 1,72e-4 pc.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e-3);

    this.material = new THREE.ShaderMaterial({
      vertexShader: PLANETAS_VERT,
      // O MESMO fragment do ponto do catálogo — importado, não copiado.
      fragmentShader: STAR_FRAG,
      uniforms: {
        uCamPos: { value: new THREE.Vector3() },
        uScreenH: { value: 1080 },
        uGain: { value: 0 },
        uExpoM0: { value: psf.expoM0 },
        uSigmaPx: { value: psf.sigmaPx },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      // depthTest FALSE pelo mesmo motivo do SunStar (`heroStars.ts`): a
      // camada SÓ soma luz. E aqui há um segundo motivo, específico: o
      // disco artístico do Sol tem 2.269 UA de raio e engolfa o sistema
      // solar inteiro — com depthTest, os dez pontos seriam furados por
      // uma esfera que a D2 está justamente dissolvendo.
      depthTest: false,
      transparent: true,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    // slots ocupados hoje: −1…0,5 (sol/*.js), 1 (lâminas), 2 (campo),
    // 3 (heroes/SunStar), 4 (poeira), 5 (nuvens CO), 6 (marcador).
    this.points.renderOrder = 7;
  }

  /**
   * O quadro inteiro da camada: um corte de custo e três uniforms.
   *
   * O CORTE não é de conteúdo, é de custo — e ele NÃO pisca: em
   * `DEEP_LIMIAR_PC` (0,05 pc) o corpo mais brilhante da tabela
   * (Júpiter) tem m ≈ 14,2, o que dá um pico de PSF na casa de 1e-6 —
   * quatro ordens abaixo de um passo de 8 bits (pinado por teste). O
   * Sol-ponto ali já está com `uGain` 0 EXATO, pelo teorema de
   * complementaridade de `deepPointGain`.
   */
  update(dHomePc: number, screenH: number, camPos: THREE.Vector3) {
    this.points.visible = this.ligado && dHomePc < DEEP_LIMIAR_PC;
    const u = this.material.uniforms;
    if (!this.camAnterior.equals(camPos)) {
      this.camAnterior.copy(camPos);
      (u.uCamPos.value as THREE.Vector3).copy(camPos);
    }
    if (screenH !== this.screenHAnterior) {
      this.screenHAnterior = screenH;
      u.uScreenH.value = screenH;
    }
    const ganho = deepPointGain(dHomePc);
    if (ganho !== this.gainAnterior) {
      this.gainAnterior = ganho;
      u.uGain.value = ganho;
    }
  }

  /**
   * `?dbgplan` (D7) — a auditoria da régua 2, no molde do `?dbgstar`.
   * Lê o Float32Array REAL do atributo (é o que a GPU vai ler) e projeta
   * com a câmera DO QUADRO, para que a comparação com a régua 1 (vitest
   * puro) julgue a mesma coisa dos dois lados.
   *
   * UNIDADES VOLTADAS AO VISITANTE (decisão do dono): distâncias em UA e
   * anos-luz; o pc aparece anotado como o que é — régua interna da cena.
   */
  dbg(camera: THREE.PerspectiveCamera, larguraPx: number, alturaPx: number): string {
    const pos = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const mag = this.points.geometry.getAttribute('aMagBase') as THREE.BufferAttribute;
    const c = camera.position;
    const dHome = c.length();
    const linhas = [
      `[dbgplan] época ${EPOCA_ISO} = JD ${EPOCA_JD_TDB} TDB · ` +
        `câmera a ${(dHome * UA_POR_PC).toFixed(3)} UA ` +
        `(${(dHome * AL_POR_PC).toFixed(6)} anos-luz; ${dHome} pc, régua interna) · ` +
        `tela ${larguraPx}×${alturaPx} px · uGain=${this.material.uniforms.uGain.value} · ` +
        `visível=${this.points.visible}`,
    ];
    for (let i = 0; i < pos.count; i++) {
      const id = IDS_FOTOMETRIA[i];
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const ndc = this.rascunho.set(x, y, z).project(camera);
      const px = ((ndc.x + 1) / 2) * larguraPx;
      const py = ((1 - ndc.y) / 2) * alturaPx;
      const dObs = Math.hypot(c.x - x, c.y - y, c.z - z);
      const fase = i === 0 ? 1 : faseDoVertice(x, y, z, c.x, c.y, c.z);
      const m = magDoVertice(mag.getX(i), dObs, fase);
      const ua = id === 'sun' ? ([0, 0, 0] as const) : RETRATO_2026[id].vetorUA;
      linhas.push(
        `[dbgplan] ${id.padEnd(8)} ` +
          `ecl=(${ua[0].toFixed(9)}, ${ua[1].toFixed(9)}, ${ua[2].toFixed(9)}) UA · ` +
          `cena=(${x}, ${y}, ${z}) pc[régua interna] · ` +
          `ndc=(${ndc.x.toFixed(9)}, ${ndc.y.toFixed(9)}, ${ndc.z.toFixed(9)}) · ` +
          `px=(${px.toFixed(6)}, ${py.toFixed(6)}) · ` +
          `dObs=${(dObs * UA_POR_PC).toFixed(6)} UA · fase=${fase.toFixed(9)} · ` +
          `m=${m.toFixed(6)}`
      );
    }
    return linhas.join('\n');
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
