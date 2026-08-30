// ============================================================
// O ENQUADRAMENTO PRIVILEGIADO é conta, não gosto — e é por isso que
// ele é função pura e tem oráculo. O oráculo aqui não repete a
// fórmula: ele PROJETA a esfera enquadrada e cobra que ela tangencie
// a borda do retângulo útil, que é o que a conta promete.
// ============================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import {
  ATLAS_FOV_GRAUS,
  DESVIO_QUE_ACENDE_GRAUS,
  DESVIO_QUE_APAGA_GRAUS,
  ENDIREITAR_S,
  FREIO_MINIMO_DO_SOLO,
  K_MIN_RAIOS,
  AtlasRig,
  LARGURA_DE_MESA_PX,
  LARGURA_UTIL_MINIMA_PX,
  MARGEM_DE_ENQUADRAMENTO,
  MAX_SOLAR_DEVIATION_GRAUS,
  MIN_POLAR_RAD,
  GIRO_PARADO,
  ARRASTO_RAD_POR_PX,
  PARENT_FRAMING_BIAS,
  PHASE_OFFSET_GRAUS,
  POLO_ECLIPTICO,
  RETANGULO_CHEIO,
  RAMPA_DO_DEGRAU_S,
  RAMPA_MAX_S,
  CEDER_COMECA_GRAUS,
  direcaoDaLua,
  direcaoDeRepouso,
  desvioDaOrientacao,
  poseDoVisitante,
  upDoAtlas,
  enquadrar,
  orbitaMaisExterna,
  giroQueProduz,
  raioDeEnquadramentoEstelar,
  retanguloUtilDoAtlas,
} from './atlasRig';
import { distanciaAposEstalos } from '../zoomDaRoda';
import { LARGURA_DO_CELULAR_PX } from '../../lib/uiScale';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../lib/atlas/frameGalactico';
import { RAIO_DO_SOL_NA_CENA, RAIO_SOL_KM, RAIO_SOL_PC } from '../escala';
import { EPOCA_JD_TDB, RETRATO_2026 } from '../world/planetas/retrato2026';
import { baseCorpoEquatorial } from '../../lib/atlas/orientacao';
import { IAU_ORIENTATIONS } from '../../lib/atlas/iauOrientation';

// O POLO DA ECLÍPTICA VEM IMPORTADO (`POLO_ECLIPTICO`, de
// `enquadramento.ts` pelo `export *` do rig): esta bancada o recalculava
// à mão em DOIS lugares, com dois nomes para o mesmo vetor — um deles
// sombreando o outro dentro de um `describe`. Oráculo que redigita a
// constante que julga não julga a constante.
const GRAU = Math.PI / 180;

/**
 * O semi-ângulo que a esfera de raio `rAlvo × margem` ocupa, vista da
 * distância devolvida. É esse ângulo que tem de bater com o que sobra
 * do quadro depois do HUD.
 */
function semiAnguloOcupado(rAlvo: number, distancia: number) {
  return Math.asin((rAlvo * MARGEM_DE_ENQUADRAMENTO) / distancia);
}

/**
 * ENQUADRA O SISTEMA INTEIRO — a esfera centrada no Sol com o raio da
 * órbita mais externa do retrato. Hoje é o TETO do zoom; foi a vista de
 * ABERTURA até 23/08 (item 61), e muitos trilhos abaixo a usam só como
 * um estado inicial conhecido, sem julgá-la.
 *
 * ISTO ERA UM MÉTODO DO RIG (`AtlasRig.focarNoSistema`) e virou fixture
 * de bancada: nenhum caminho de PRODUÇÃO o chamava — quem enquadra é
 * `Escada.focarNoSistema`, com a esfera do sistema INTERNO e por
 * `focar` direto. Duas rotinas com o mesmo nome enquadrando esferas
 * diferentes era armadilha; o que os testes precisavam dele são estas
 * duas linhas, e elas moram aqui, do lado de quem as usa.
 */
function noSistemaInteiro(rig: AtlasRig) {
  const fora = orbitaMaisExterna();
  rig.focar(new THREE.Vector3(), fora.raio, fora.posicao);
}

/**
 * A ABERTURA DE PRODUÇÃO — desde 29/08 (a escolha dele pela folha do
 * item 61 sob a lente de 58°) a esfera é o SISTEMA INTEIRO
 * (`orbitaMaisExterna`), a direção sai do mesmo corpo, e o piso do zoom
 * é o raio FÍSICO do Sol. É o estado em que `Escada.focarNoSistema`
 * deixa o rig. O irmão `noSistemaInteiro` enquadra a MESMA esfera sem o
 * piso do Sol — a diferença entre os dois agora é só a régua de descida.
 *
 * MORA AQUI porque eram estas seis linhas redigitadas em dois trilhos —
 * e trilho que redigita o estado acaba medindo estados diferentes com o
 * mesmo nome, que é exatamente a armadilha que aposentou o
 * `AtlasRig.focarNoSistema`.
 */
function naAberturaDeProducao(rig: AtlasRig) {
  rig.focar(
    new THREE.Vector3(),
    orbitaMaisExterna().raio,
    orbitaMaisExterna().posicao,
    { pisoRaio: RAIO_DO_SOL_NA_CENA }
  );
}

/** semi-ângulos úteis do quadro, vertical e horizontal */
function semiAngulosUteis(fovDeg: number, aspect: number, fracaoV: number, fracaoH: number) {
  const tanV = Math.tan((fovDeg * GRAU) / 2);
  return {
    v: Math.atan(tanV * fracaoV),
    h: Math.atan(tanV * aspect * fracaoH),
  };
}

describe('enquadrar — a esfera tangencia a borda mais apertada', () => {
  it('quadro cheio 16:9: quem aperta é o vertical, e ele fica exato', () => {
    const fovDeg = 35;
    const aspect = 16 / 9;
    const { distancia } = enquadrar({
      rAlvo: 1,
      fovDeg,
      aspect,
      retanguloUtil: RETANGULO_CHEIO,
    });
    const util = semiAngulosUteis(fovDeg, aspect, 1, 1);
    expect(util.h).toBeGreaterThan(util.v);
    expect(semiAnguloOcupado(1, distancia)).toBeCloseTo(util.v, 12);
  });

  it('retrato 0,4: quem aperta é o horizontal — e é ele que a conta obedece', () => {
    const fovDeg = 35;
    const aspect = 0.4;
    const { distancia } = enquadrar({
      rAlvo: 1,
      fovDeg,
      aspect,
      retanguloUtil: RETANGULO_CHEIO,
    });
    const util = semiAngulosUteis(fovDeg, aspect, 1, 1);
    expect(util.v).toBeGreaterThan(util.h);
    expect(semiAnguloOcupado(1, distancia)).toBeCloseTo(util.h, 12);
  });

  it('ultrawide 3:1 não afasta a câmera além do que o vertical pede', () => {
    const base = enquadrar({
      rAlvo: 1,
      fovDeg: 35,
      aspect: 16 / 9,
      retanguloUtil: RETANGULO_CHEIO,
    });
    const wide = enquadrar({
      rAlvo: 1,
      fovDeg: 35,
      aspect: 3,
      retanguloUtil: RETANGULO_CHEIO,
    });
    // com o vertical mandando nos dois, alargar a tela não muda nada:
    // é exatamente o defeito que o `max` das duas contas evita
    expect(wide.distancia).toBeCloseTo(base.distancia, 12);
  });

  it('é linear no raio — esfera 1.000× maior, distância 1.000× maior', () => {
    const um = enquadrar({ rAlvo: 1, fovDeg: 35, aspect: 1.6, retanguloUtil: RETANGULO_CHEIO });
    const mil = enquadrar({ rAlvo: 1000, fovDeg: 35, aspect: 1.6, retanguloUtil: RETANGULO_CHEIO });
    expect(mil.distancia / um.distancia).toBeCloseTo(1000, 9);
  });

  it('a lente larga aproxima e a longa afasta', () => {
    const larga = enquadrar({ rAlvo: 1, fovDeg: 90, aspect: 1.6, retanguloUtil: RETANGULO_CHEIO });
    const longa = enquadrar({ rAlvo: 1, fovDeg: 15, aspect: 1.6, retanguloUtil: RETANGULO_CHEIO });
    expect(larga.distancia).toBeLessThan(longa.distancia);
  });
});

describe('enquadrar — o retângulo útil desconta o HUD', () => {
  it('as tarjas de cinema afastam a câmera, e o afastamento é o do ângulo que sobra', () => {
    const fovDeg = ATLAS_FOV_GRAUS;
    const aspect = 16 / 9;
    const util = retanguloUtilDoAtlas();
    const cheio = enquadrar({ rAlvo: 1, fovDeg, aspect, retanguloUtil: RETANGULO_CHEIO });
    const comHud = enquadrar({ rAlvo: 1, fovDeg, aspect, retanguloUtil: util });
    expect(comHud.distancia).toBeGreaterThan(cheio.distancia);
    const esperado = semiAngulosUteis(fovDeg, aspect, 1 - util.topo - util.base, 1);
    expect(semiAnguloOcupado(1, comHud.distancia)).toBeCloseTo(esperado.v, 12);
  });

  it('o HUD do Atlas é simétrico na horizontal e NÃO na vertical: o alvo sobe o quanto o selo pede', () => {
    const util = retanguloUtilDoAtlas();
    const { giroX, giroY } = enquadrar({
      rAlvo: 1,
      fovDeg: 35,
      aspect: 1.6,
      retanguloUtil: util,
    });
    // nada come as laterais: giro horizontal zero EXATO
    expect(util.esquerda).toBe(0);
    expect(util.direita).toBe(0);
    expect(giroY).toBe(0);
    // o selo (base) é mais alto que a faixa da barra (topo), então o
    // retângulo útil tem o centro ACIMA do centro do quadro — e o alvo
    // tem de subir junto. `rotateX(+)` levanta a câmera e leva o alvo
    // para baixo; aqui o giro é NEGATIVO.
    expect(util.base).toBeGreaterThan(util.topo);
    expect(giroX).toBeLessThan(0);
    expect(giroX).toBeCloseTo(
      Math.atan(Math.tan((35 * GRAU) / 2) * (util.topo - util.base)),
      15
    );
  });

  it('as áreas do HUD do Atlas entram no retângulo, e sobra quadro de verdade', () => {
    const util = retanguloUtilDoAtlas();
    // as tarjas (0,065 em cada borda) são o piso: o HUD do modo SOMA
    expect(util.topo).toBeGreaterThan(0.065);
    expect(util.base).toBeGreaterThan(0.065);
    // e o que sobra ainda é a maior parte do quadro — um retângulo útil
    // que come mais da metade da altura não é HUD, é moldura
    expect(1 - util.topo - util.base).toBeGreaterThan(0.6);
  });

  it('a escala do texto do HUD (?ui=) entra no retângulo — e em 1 nada muda', () => {
    const padrao = retanguloUtilDoAtlas();
    // o default e o 1 explícito são o MESMO objeto de números: é o que
    // mantém o enquadramento de sempre bit-idêntico sem `?ui=` na URL
    expect(retanguloUtilDoAtlas(1)).toEqual(padrao);
    // lixo (NaN, 0, negativo) NÃO envenena a matriz da câmera
    for (const cru of [Number.NaN, 0, -2, Number.POSITIVE_INFINITY]) {
      expect(retanguloUtilDoAtlas(cru)).toEqual(padrao);
    }
    // texto maior ⇒ HUD mais alto ⇒ menos quadro útil ⇒ câmera mais atrás
    const grande = retanguloUtilDoAtlas(1.4);
    expect(grande.topo).toBeGreaterThan(padrao.topo);
    expect(grande.base).toBeGreaterThan(padrao.base);
    // as TARJAS não escalam (são vh puro, não texto) — e no extremo da
    // faixa entra o degrau da barra quebrada em linha dupla (0,04,
    // medido; só acima do limiar 1,3 — em ui = 1 ele NÃO existe)
    expect(grande.topo - padrao.topo).toBeCloseTo((padrao.topo - 0.065) * 0.4 + 0.04, 12);
    const perto = (u: ReturnType<typeof retanguloUtilDoAtlas>) =>
      enquadrar({ rAlvo: 1, fovDeg: ATLAS_FOV_GRAUS, aspect: 1.6, retanguloUtil: u }).distancia;
    expect(perto(grande)).toBeGreaterThan(perto(padrao));
    expect(perto(retanguloUtilDoAtlas(0.85))).toBeLessThan(perto(padrao));
  });

  /**
   * O QUE ESTE TRILHO AFIRMA, agora que ele afirma UMA coisa só. Antes
   * ele era `1 − topo − base > 0,47` — um piso doutrinário ("um retângulo
   * que come mais da metade da altura não é HUD, é moldura") aplicado ao
   * número DECLARADO. Aplicado ali, o piso vira catraca: a declaração
   * paga folga por cima do medido, então o trilho pinava o número de hoje
   * menos um fio, e a próxima peça de HUD o baixaria de novo com
   * derivação escrita, sem ninguém ver a linha ser cruzada.
   *
   * As duas afirmações foram separadas:
   *  - o PISO DOUTRINÁRIO passou para o juiz de a11y, sobre o MEDIDO (é
   *    lá que existe medida, e o número lá não se move);
   *  - aqui fica a FOLGA: quanto a declaração paga a mais que o medido.
   *    É isto que impede a declaração de inchar sem medição nova, e é
   *    isto que uma tabela de constantes pode afirmar sozinha.
   */
  it('a declaração paga FOLGA sobre o medido, e a folga tem teto', () => {
    // MEDIDO pelo juiz de a11y (janela 1200×900, viewport de 813 px de
    // altura, `?atlas=1&shot=1`). Se a CSS crescer, é o juiz que quebra
    // primeiro (declarado ≥ medido); aqui quebra quando a DECLARAÇÃO
    // cresce sem a medição acompanhar.
    // A base em ui = 1,4 subiu de 0,292 para 0,333 em 2026-08-20 (item
    // 9): a linha dos controles do tempo passou a QUEBRAR em duas em vez
    // de ser pintada fora da coluna, por cima do selo. A altura sempre
    // existiu; o que mudou foi ela passar a ocupar lugar em vez de
    // transbordar — e a declaração paga por ela.
    const MEDIDO = [
      { ui: 0.85, topo: 0.119, base: 0.175 },
      { ui: 1, topo: 0.125, base: 0.192 },
      { ui: 1.4, topo: 0.197, base: 0.333 },
    ];
    const TETO_DA_FOLGA = 0.06;
    for (const m of MEDIDO) {
      const util = retanguloUtilDoAtlas(m.ui);
      for (const [borda, medido] of [
        ['topo', m.topo],
        ['base', m.base],
      ] as const) {
        const folga = util[borda] - medido;
        // nunca negativa: declarar menos que o medido põe o alvo atrás
        // do texto — é o que o juiz cobra no navegador
        expect(folga, `${borda} em ui=${m.ui}`).toBeGreaterThanOrEqual(0);
        expect(folga, `${borda} em ui=${m.ui}`).toBeLessThanOrEqual(TETO_DA_FOLGA);
      }
    }
  });

  it('a quebra da barra é de LARGURA, e o degrau entra onde ela acontece', () => {
    // a razão medida: a barra quebra abaixo de ~960 px de CSS por
    // unidade de `?ui=`. Numa tela de mesa a 1,0 o degrau não existe;
    // na MESMA tela a 1,4 ele existe; e numa janela estreita ele existe
    // já em 1,0 — que é o que o limiar só-de-`?ui=` não sabia dizer.
    const semDegrau = retanguloUtilDoAtlas(1, 1200);
    const comDegrau = retanguloUtilDoAtlas(1, 900);
    expect(comDegrau.topo - semDegrau.topo).toBeCloseTo(0.04, 12);
    // e a BASE também anda, desde 2026-08-20: a linha dos controles do
    // tempo quebra em duas abaixo de 1.060 px por unidade de ui — a
    // 1.200 com ui = 1 ela ainda cabe em uma, a 900 não (medido: a
    // quebra vira entre 1.040 e 1.060).
    expect(comDegrau.base - semDegrau.base).toBeCloseTo(0.03, 12);
    // o degrau a 1.200 px cai entre 1,25 e 1,26 (1.200 / 960 = 1,25) —
    // e a quebra REAL a 1.200 px começa em 1,30, medida: a declaração
    // entra um degrau ANTES, que é o lado seguro do erro
    expect(retanguloUtilDoAtlas(1.25, 1200).topo).toBeCloseTo(0.065 + 0.09 * 1.25, 12);
    expect(retanguloUtilDoAtlas(1.3, 1200).topo).toBeCloseTo(
      0.065 + 0.09 * 1.3 + 0.04,
      12
    );
    // A TERCEIRA LINHA DA MÁQUINA DO TEMPO é o mesmo fenômeno um degrau
    // adiante (medido em 2026-08-20, viewport exato por override, 900 px
    // de altura): com ui = 1,4 os controles cabem em duas linhas a 980 e
    // 1.000 px e vão para três a 940 — o degrau vive entre 940 e 980 px
    // por 1,4 de ui. Limiar no topo da faixa (714), o lado seguro.
    expect(retanguloUtilDoAtlas(1.4, 900).base).toBeCloseTo(
      0.065 + 0.175 * 1.4 + 0.03 + 0.09,
      12
    );
    expect(retanguloUtilDoAtlas(1.4, 1000).base).toBeCloseTo(
      0.065 + 0.175 * 1.4 + 0.03,
      12
    );
    // e a 1.800 px (a janela das vistas oficiais) com ui = 1 nenhum dos
    // dois degraus existe: o enquadramento de mesa é o de sempre
    expect(retanguloUtilDoAtlas(1, 1800)).toEqual(semDegrau);
    // largura envenenada cai na tela de mesa de referência, não em NaN
    for (const cru of [Number.NaN, 0, -100, Number.POSITIVE_INFINITY]) {
      expect(retanguloUtilDoAtlas(1, cru)).toEqual(retanguloUtilDoAtlas(1, LARGURA_DE_MESA_PX));
    }
    // a faixa declarada de validade é um número, não um adjetivo
    expect(LARGURA_UTIL_MINIMA_PX).toBeGreaterThan(0);
    expect(LARGURA_UTIL_MINIMA_PX).toBeLessThan(LARGURA_DE_MESA_PX);
  });

  it('o TELEFONE tem conta própria, e ela vira no mesmo pixel que o CSS', () => {
    // A fronteira é `LARGURA_DO_CELULAR_PX` (760), o número que o
    // `@media` do HUD usa e que o `useCelular` lê. A 760 o retângulo é o
    // do telefone; a 761 é o de mesa — se os dois lados discordassem, a
    // câmera recuaria por um rodapé que o CSS já desmontou (ou o
    // contrário, que é pior: o alvo atrás do selo).
    const celular = retanguloUtilDoAtlas(1, LARGURA_DO_CELULAR_PX);
    const mesa = retanguloUtilDoAtlas(1, LARGURA_DO_CELULAR_PX + 1);
    // O TELEFONE NÃO PAGA TARJA desde 24/08 (decisão dele em 23/08): o topo é a
    // caixa da barra de cima e nada mais, a base é a fileira mais o selo.
    // Os 0,045 de tarja que somavam em cada borda saíram das duas contas.
    expect(celular.topo).toBeCloseTo(0.065, 12);
    expect(celular.base).toBeCloseTo(0.11 + 0.05, 12);
    // ...e a conta de mesa nessa largura é a que ela sempre foi: a barra
    // quebrada em cima, a primeira quebra da máquina do tempo embaixo (a
    // segunda só entra abaixo de 714 px)
    expect(mesa.topo).toBeCloseTo(0.065 + 0.09 + 0.04, 12);
    expect(mesa.base).toBeCloseTo(0.065 + 0.175 + 0.03, 12);

    // O GANHO É O ASSUNTO DO ITEM 62: numa tela de 390 px a conta de
    // mesa disparava TODOS os degraus e deixava 44,5% de céu; a do
    // telefone deixa 77,5% — a câmera para de recuar por peças que a
    // fatia 9 do HUD já desmontou, e desde 24/08 nem por tarja, que lá
    // não existe.
    const ceu = (u: ReturnType<typeof retanguloUtilDoAtlas>) => 1 - u.topo - u.base;
    expect(ceu(retanguloUtilDoAtlas(1, 390))).toBeCloseTo(0.775, 12);
    expect(ceu(retanguloUtilDoAtlas(1, 320))).toBeCloseTo(0.775, 12);
    // a conta de MESA a 390 px, que é o que valia até 2026-08-23:
    // 0,065 + 0,09 + 0,04 de topo e 0,065 + 0,175 + 0,03 + 0,09 de base
    expect(1 - (0.065 + 0.09 + 0.04) - (0.065 + 0.175 + 0.03 + 0.09)).toBeCloseTo(0.445, 12);

    // O TEXTO GRANDE ESCALA as três frações do telefone, como na mesa.
    const grande = retanguloUtilDoAtlas(1.4, 390);
    expect(grande.topo).toBeCloseTo(0.065 * 1.4, 12);
    expect(grande.base).toBeCloseTo((0.11 + 0.05) * 1.4, 12);
    // NENHUMA PARCELA FIXA SOBROU NO TELEFONE, e é a lei que a saída da
    // tarja escreveu: as duas bordas são HUD puro, e HUD escala com o
    // texto. Uma tarja de volta — ou qualquer faixa em `vh` — apareceria
    // aqui como termo constante, e as duas contas deixariam de dobrar
    // quando o `?ui=` dobra. É o dente que impede a moldura de cinema de
    // voltar ao telefone por um nome novo.
    const dobro = retanguloUtilDoAtlas(2, 390);
    expect(dobro.topo).toBeCloseTo(2 * celular.topo, 12);
    expect(dobro.base).toBeCloseTo(2 * celular.base, 12);
    // ...e com texto MINÚSCULO a base encolhe junto: até 23/08 o
    // `Math.max` a segurava nos 0,045 da tarja de baixo, e sem tarja não
    // há piso a garantir.
    expect(retanguloUtilDoAtlas(0.1, 390).base).toBeCloseTo(0.016, 12);
  });

  it('painel só à direita joga o alvo para a esquerda do quadro', () => {
    const { giroY } = enquadrar({
      rAlvo: 1,
      fovDeg: 35,
      aspect: 1.6,
      retanguloUtil: { esquerda: 0, direita: 0.25, topo: 0, base: 0 },
    });
    // o retângulo útil fica à esquerda ⇒ a câmera vira para a DIREITA
    // (giro negativo) e o alvo anda para a esquerda na tela
    expect(giroY).toBeLessThan(0);
    const tanH = Math.tan((35 * GRAU) / 2) * 1.6;
    expect(giroY).toBeCloseTo(Math.atan(tanH * -0.25), 12);
  });

  it('faixa só embaixo empurra o alvo para cima', () => {
    const { giroX } = enquadrar({
      rAlvo: 1,
      fovDeg: 35,
      aspect: 1.6,
      retanguloUtil: { esquerda: 0, direita: 0, topo: 0, base: 0.3 },
    });
    // o retângulo útil sobe ⇒ a câmera abaixa (giro negativo) e o alvo
    // sobe na tela
    expect(giroX).toBeLessThan(0);
  });

  it('o giro põe o alvo no CENTRO do retângulo útil, medido por projeção', () => {
    const retanguloUtil = { esquerda: 0.3, direita: 0, topo: 0.2, base: 0 };
    const { distancia, giroX, giroY } = enquadrar({
      rAlvo: 1,
      fovDeg: 40,
      aspect: 1.5,
      retanguloUtil,
    });
    const camera = new THREE.PerspectiveCamera(40, 1.5, 0.01, 1000);
    const alvo = new THREE.Vector3(0, 0, 0);
    camera.position.set(0, 0, distancia);
    camera.lookAt(alvo);
    camera.rotateY(giroY);
    camera.rotateX(giroX);
    camera.updateMatrixWorld(true);
    const ndc = alvo.clone().project(camera);
    // centro do retângulo útil em NDC: x de −1+2·esq a 1, y de −1 a 1−2·topo
    expect(ndc.x).toBeCloseTo(retanguloUtil.esquerda, 9);
    expect(ndc.y).toBeCloseTo(-retanguloUtil.topo, 9);
  });
});

describe('enquadrar — casos-limite não viram NaN na matriz da câmera', () => {
  it('alvo sem raio devolve distância zero, não NaN', () => {
    for (const rAlvo of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const { distancia } = enquadrar({
        rAlvo,
        fovDeg: 35,
        aspect: 1.6,
        retanguloUtil: RETANGULO_CHEIO,
      });
      expect(distancia).toBe(0);
    }
  });

  it('lente e aspecto impossíveis caem nos neutros mais próximos', () => {
    for (const fovDeg of [0, -10, 400, Number.NaN]) {
      const r = enquadrar({ rAlvo: 1, fovDeg, aspect: 1.6, retanguloUtil: RETANGULO_CHEIO });
      expect(Number.isFinite(r.distancia)).toBe(true);
      expect(r.distancia).toBeGreaterThan(0);
    }
    for (const aspect of [0, -2, Number.NaN]) {
      const r = enquadrar({ rAlvo: 1, fovDeg: 35, aspect, retanguloUtil: RETANGULO_CHEIO });
      expect(Number.isFinite(r.distancia)).toBe(true);
    }
  });

  it('HUD que comeria o quadro inteiro é grampeado, não dividido por zero', () => {
    const r = enquadrar({
      rAlvo: 1,
      fovDeg: 35,
      aspect: 1.6,
      retanguloUtil: { esquerda: 5, direita: 5, topo: Number.NaN, base: -3 },
    });
    expect(Number.isFinite(r.distancia)).toBe(true);
    expect(Number.isFinite(r.giroX)).toBe(true);
    expect(Number.isFinite(r.giroY)).toBe(true);
  });
});

describe('o viés do pai NÃO é fator de distância', () => {
  it('a distância é só a conta da esfera — nada a multiplica por 0,78', () => {
    const fovDeg = 35;
    const aspect = 1.6;
    const { distancia } = enquadrar({
      rAlvo: 1,
      fovDeg,
      aspect,
      retanguloUtil: RETANGULO_CHEIO,
    });
    // a tangência EXATA: `d = r·margem / sen(meia-abertura útil)`. Com o
    // 0,78 no meio, `1,2 × 0,78 = 0,936 < 1` e a esfera que a conta
    // promete tangenciar TRANSBORDA o quadro — foi o que aconteceu
    // enquanto o peso de mistura do doador se disfarçou de distância.
    const util = semiAngulosUteis(fovDeg, aspect, 1, 1);
    expect(distancia).toBeCloseTo(MARGEM_DE_ENQUADRAMENTO / Math.sin(util.v), 12);
    expect(distancia).not.toBeCloseTo(
      (MARGEM_DE_ENQUADRAMENTO / Math.sin(util.v)) * PARENT_FRAMING_BIAS,
      6
    );
    // e o número segue declarado, com o papel que ele tem no doador:
    // peso de `lerp` entre direções, sem consumidor até as luas (Onda 6)
    expect(PARENT_FRAMING_BIAS).toBeGreaterThan(0);
    expect(PARENT_FRAMING_BIAS).toBeLessThan(1);
  });
});

describe('direcaoDeRepouso — os 30° do lado ACESO, e só isso', () => {
  const polo = new THREE.Vector3(0, 0, 1);
  /** Sol→alvo: é o que a função recebe */
  const eixo = new THREE.Vector3(1, 0, 0);
  /** alvo→Sol: a direção ILUMINADA, e é dela que os ângulos se medem */
  const aceso = eixo.clone().negate();

  it('a câmera vai para o lado do SOL, não para além do alvo', () => {
    const out = new THREE.Vector3();
    direcaoDeRepouso(eixo.clone(), polo, out);
    // o produto escalar com o eixo Sol→alvo é NEGATIVO: pôr a câmera em
    // `alvo + out·d` a deixa entre o Sol e o alvo. Com o eixo sem negar,
    // este número seria +cos(30°) e todo enquadramento fotografaria o
    // lado escuro (fração iluminada 6,7% em vez de 93,3%).
    expect(out.dot(eixo)).toBeCloseTo(-Math.cos(PHASE_OFFSET_GRAUS * GRAU), 12);
    // a fração iluminada do disco, `(1+cos φ)/2`, com φ o ângulo de fase
    const fase = out.angleTo(aceso);
    expect((1 + Math.cos(fase)) / 2).toBeGreaterThan(0.93);
  });

  it('a pose de repouso é o pino de fase, e não depende de mais nada', () => {
    const out = new THREE.Vector3();
    direcaoDeRepouso(eixo.clone(), polo, out);
    expect(out.length()).toBeCloseTo(1, 12);
    expect(out.angleTo(aceso) / GRAU).toBeCloseTo(PHASE_OFFSET_GRAUS, 10);
  });

  /**
   * O GRAMPO POLAR NÃO TOCA A POSE DE REPOUSO onde ela é legal — bit a
   * bit, e é esta identidade que segura os md5 do `atlas-smoke` e toda
   * vista pinada.
   *
   * A VARREDURA É PELO POLO, e não mais pela órbita do visitante: desde
   * o giro livre a pose de repouso é UM ponto por (eixo solar, polo), e
   * o que a faz cair ou não na calota é a orientação do polo. Varrer o
   * dedo aqui deixou de fazer sentido — o dedo não passa mais por esta
   * função.
   */
  it('o grampo polar NÃO TOCA na pose de repouso legal — bit a bit', () => {
    const out = new THREE.Vector3();
    const referencia = new THREE.Vector3();
    for (let t = 0; t < 180; t += 3) {
      for (let f = 0; f < 360; f += 17) {
        const p = new THREE.Vector3(
          Math.sin(t * GRAU) * Math.cos(f * GRAU),
          Math.sin(t * GRAU) * Math.sin(f * GRAU),
          Math.cos(t * GRAU)
        );
        // reconstrói pelo caminho SEM grampo (inclina o pino) e cobra
        // igualdade EXATA — nenhum `toBeCloseTo` aqui
        referencia.copy(eixo).negate().normalize();
        const eixoDoGiro = new THREE.Vector3().crossVectors(referencia, p);
        if (eixoDoGiro.lengthSq() < 1e-12) continue;
        referencia.applyAxisAngle(eixoDoGiro.normalize(), PHASE_OFFSET_GRAUS * GRAU);
        // a faixa se decide na direção CRUA: uma já grampeada pousa
        // exatamente na borda e passaria por "dentro" sem ser
        if (Math.abs(referencia.dot(p)) > Math.cos(MIN_POLAR_RAD)) continue;
        direcaoDeRepouso(eixo.clone(), p, out);
        expect(out.x).toBe(referencia.x);
        expect(out.y).toBe(referencia.y);
        expect(out.z).toBe(referencia.z);
      }
    }
  });

  it('...e onde toca, para EXATAMENTE em MIN_POLAR — nunca atravessa', () => {
    const out = new THREE.Vector3();
    // o pino de fase inclina 30° rumo ao polo; um polo a 30°±ε da linha
    // do Sol põe a pose de repouso EM CIMA dele, dentro da calota
    for (const desvio of [-0.5, -0.05, 0, 0.05, 0.5]) {
      const ang = (PHASE_OFFSET_GRAUS + desvio) * GRAU;
      const p = new THREE.Vector3(-Math.cos(ang), 0, Math.sin(ang)).normalize();
      direcaoDeRepouso(eixo.clone(), p, out);
      const polar = out.angleTo(p);
      expect(Math.min(polar, Math.PI - polar)).toBeGreaterThanOrEqual(MIN_POLAR_RAD - 1e-12);
      expect(out.length()).toBeCloseTo(1, 12);
    }
    // `|up × z| = sen(φ)`, e é isso que separa o grampo do ruído de
    // float32 — o número que a docstring de MIN_POLAR_RAD declara
    expect(Math.sin(MIN_POLAR_RAD)).toBeCloseTo(0.0998, 4);
  });

  it('alvo em cima do polo não devolve NaN', () => {
    const out = new THREE.Vector3();
    direcaoDeRepouso(polo.clone(), polo, out);
    expect(out.length()).toBeCloseTo(1, 12);
    direcaoDeRepouso(new THREE.Vector3(0, 0, 0), polo, out);
    expect(out.length()).toBeCloseTo(1, 12);
  });

  /**
   * O CONE DE 70° NÃO TOCA MAIS NO DEDO — e este trilho é o que sobrou
   * do que julgava a inclinação grampeada. Ele guarda a mistura da lua
   * (`direcaoDaLua`) e nada mais; a pose de repouso comum não chega
   * perto dele, e o giro do visitante não passa por aqui.
   */
  it('o cone dos 70° não aparece na pose de repouso', () => {
    const out = new THREE.Vector3();
    direcaoDeRepouso(eixo.clone(), polo, out);
    expect(out.angleTo(aceso) / GRAU).toBeLessThan(MAX_SOLAR_DEVIATION_GRAUS);
  });
});

// ============================================================
// O GIRO LIVRE (item 102, 26/08) — a lei única do dedo, e a frase dele
// é o contrato: "liberdade total e responsividade... navegação livre e
// sem travas para qualquer dos lados sem nenhum limitador de angulo ou
// coisa parecida".
//
// O QUE ESTA BANCADA TEM DE PROVAR são três coisas, e nenhuma delas é
// uma fórmula repetida:
//
//  1. NÃO HÁ GRAMPO. Medido pelo COMPORTAMENTO: o ângulo que a câmera
//     varre é o ângulo que o dedo pediu, passo a passo, atravessando o
//     polo e dando voltas inteiras. Qualquer trava recolocada come um
//     pedaço e o total não fecha;
//  2. NENHUM EIXO MORRE, em nenhuma fase — inclusive na fase cheia,
//     onde a lei antiga tinha o horizontal literalmente parado;
//  3. A CONDIÇÃO DE NASCIMENTO, e ela cobre a direção E o `up`, em
//     geometria DENTRO e FORA da faixa da cedência (a lição do P4: lá a
//     alegação valia para a direção e não para o `up`, e os corpos de
//     eixo deitado eram os expostos).
// ============================================================
describe('o giro livre — sem trava, sem eixo morto, sem roll de surpresa', () => {
  const polo = new THREE.Vector3(0, 0, 1);
  const eixo = new THREE.Vector3(1, 0, 0);

  /** a pose que o rig escreveria, sem rig: repouso + giro acumulado */
  const pose = (giro: THREE.Quaternion, p = polo) => {
    const dir = new THREE.Vector3();
    const up = new THREE.Vector3();
    direcaoDeRepouso(eixo.clone(), p, dir);
    poseDoVisitante(dir, p, giro, dir, up);
    return { dir, up };
  };

  it('o dedo parado não escreve um bit — direção E `up`', () => {
    const dirRepouso = new THREE.Vector3();
    direcaoDeRepouso(eixo.clone(), polo, dirRepouso);
    const upRepouso = new THREE.Vector3();
    upDoAtlas(dirRepouso, polo, upRepouso);
    const { dir, up } = pose(GIRO_PARADO.clone());
    expect(dir.x).toBe(dirRepouso.x);
    expect(dir.y).toBe(dirRepouso.y);
    expect(dir.z).toBe(dirRepouso.z);
    expect(up.x).toBe(upRepouso.x);
    expect(up.y).toBe(upRepouso.y);
    expect(up.z).toBe(upRepouso.z);
  });

  /**
   * A CONDIÇÃO DE NASCIMENTO VARRIDA — dentro E fora da faixa da
   * cedência, e com corpo DEITADO. É a lição que o P4 pagou: lá o
   * bit-idêntico valia para a direção mas NÃO para o `up`, e o único
   * dente usava uma geometria fora da faixa. Os corpos expostos eram os
   * de eixo deitado (Urano, Plutão, anões no solstício).
   *
   * AQUI NÃO HÁ COMO ESCAPAR, e é por construção e não por varredura: o
   * `up` de repouso sai do MESMO `upDoAtlas` de sempre e a guarda da
   * identidade devolve os dois vetores sem uma multiplicação no meio. A
   * varredura existe para provar que a construção não tem exceção.
   */
  it('...em TODA geometria, dentro e fora da faixa da cedência', () => {
    const dirRepouso = new THREE.Vector3();
    const upRepouso = new THREE.Vector3();
    let dentroDaFaixa = 0;
    for (let t = 1; t < 180; t += 2) {
      for (let f = 0; f < 360; f += 23) {
        const p = new THREE.Vector3(
          Math.sin(t * GRAU) * Math.cos(f * GRAU),
          Math.sin(t * GRAU) * Math.sin(f * GRAU),
          Math.cos(t * GRAU)
        ).normalize();
        direcaoDeRepouso(eixo.clone(), p, dirRepouso);
        upDoAtlas(dirRepouso, p, upRepouso);
        if (Math.abs(dirRepouso.dot(p)) > Math.cos(CEDER_COMECA_GRAUS * GRAU)) {
          dentroDaFaixa += 1;
        }
        const { dir, up } = pose(GIRO_PARADO.clone(), p);
        expect(dir.x).toBe(dirRepouso.x);
        expect(dir.y).toBe(dirRepouso.y);
        expect(dir.z).toBe(dirRepouso.z);
        expect(up.x).toBe(upRepouso.x);
        expect(up.y).toBe(upRepouso.y);
        expect(up.z).toBe(upRepouso.z);
      }
    }
    // A VARREDURA TEM DE ALCANÇAR A FAIXA, senão ela prova o mesmo que a
    // do P4 provava — nada. Este número é a diferença entre um dente que
    // morde e um que passa por perto.
    expect(dentroDaFaixa).toBeGreaterThan(0);
  });

  /**
   * E COM O POLO DE UM CORPO DEITADO DE VERDADE — Urano perto do
   * solstício, que é o caso que o auditor do P4 nomeou. Sem número
   * inventado: o polo sai do kernel IAU, e a data é escolhida para o
   * eixo apontar para perto do Sol.
   */
  it('...inclusive com Urano deitado, o corpo que expôs o P4', () => {
    const p = baseCorpoEquatorial(IAU_ORIENTATIONS.uranus, EPOCA_JD_TDB).polo;
    const poloDeUrano = new THREE.Vector3(p[0], p[1], p[2]).normalize();
    // o eixo solar é escolhido para o polo cair DENTRO da faixa da
    // cedência a partir da pose de repouso — é lá que o P4 sangrava
    const solar = poloDeUrano
      .clone()
      .applyAxisAngle(
        new THREE.Vector3(1, 0, 0).cross(poloDeUrano).normalize(),
        PHASE_OFFSET_GRAUS * GRAU
      )
      .negate();
    const dirRepouso = new THREE.Vector3();
    direcaoDeRepouso(solar.clone(), poloDeUrano, dirRepouso);
    const upRepouso = new THREE.Vector3();
    upDoAtlas(dirRepouso, poloDeUrano, upRepouso);
    expect(Math.abs(dirRepouso.dot(poloDeUrano))).toBeGreaterThan(
      Math.cos(CEDER_COMECA_GRAUS * GRAU)
    );
    const dir = dirRepouso.clone();
    const up = new THREE.Vector3();
    poseDoVisitante(dir, poloDeUrano, GIRO_PARADO.clone(), dir, up);
    expect(dir.x).toBe(dirRepouso.x);
    expect(dir.y).toBe(dirRepouso.y);
    expect(dir.z).toBe(dirRepouso.z);
    expect(up.x).toBe(upRepouso.x);
    expect(up.y).toBe(upRepouso.y);
    expect(up.z).toBe(upRepouso.z);
  });

  it('cruzar o polo é contínuo — sem NaN e sem flip do horizonte', () => {
    // uma volta e meia SUBINDO, em passos pequenos: o caminho passa por
    // cima do polo do corpo duas vezes
    const giro = new THREE.Quaternion();
    const passo = new THREE.Quaternion();
    const eixoX = new THREE.Vector3(1, 0, 0);
    let anterior = pose(giro.clone());
    const salto = { dir: 0, up: 0 };
    for (let k = 0; k < 540; k += 1) {
      passo.setFromAxisAngle(eixoX, GRAU);
      giro.multiply(passo).normalize();
      const agora = pose(giro.clone());
      expect(Number.isFinite(agora.dir.x + agora.dir.y + agora.dir.z)).toBe(true);
      expect(Number.isFinite(agora.up.x + agora.up.y + agora.up.z)).toBe(true);
      salto.dir = Math.max(salto.dir, agora.dir.angleTo(anterior.dir));
      salto.up = Math.max(salto.up, agora.up.angleTo(anterior.up));
      anterior = agora;
    }
    // NENHUM passo pula: o maior salto de direção é o próprio passo de
    // 1°, e o do `up` também — é isso que "o horizonte não vira" quer
    // dizer quando dito em número. A lei antiga dava 14,58° de roll num
    // ÚNICO quadro na travessia do polo (medido no item 102).
    expect(salto.dir / GRAU).toBeLessThan(1.001);
    expect(salto.up / GRAU).toBeLessThan(1.001);
  });

  /**
   * NENHUM EIXO MORRE EM FASE NENHUMA — o dedo bate 1:1 com os dois
   * eixos da tela em toda geometria, inclusive na fase cheia, onde a lei
   * antiga tinha o horizontal parado (o efeito escalava com `sen φ`, e
   * o item 102 mediu 2,2e-15 rad para uma entrada de 1e-4).
   */
  it('o ganho é 1,0000 nos DOIS eixos, em qualquer fase', () => {
    const eixoX = new THREE.Vector3(1, 0, 0);
    const eixoY = new THREE.Vector3(0, 1, 0);
    const passo = new THREE.Quaternion();
    const entrada = 1e-4;
    for (let fase = 0; fase < 360; fase += 15) {
      // leva a câmera a uma fase qualquer, inclusive a cheia e a nova
      const base = new THREE.Quaternion().setFromAxisAngle(eixoX, fase * GRAU);
      const partida = pose(base.clone());
      for (const eixoDaTela of [eixoX, eixoY]) {
        passo.setFromAxisAngle(eixoDaTela, entrada);
        const depois = pose(base.clone().multiply(passo));
        // o ganho: quanto a MIRA andou por radiano pedido
        const ganho = depois.dir.angleTo(partida.dir) / entrada;
        expect(ganho).toBeGreaterThan(0.9999);
        expect(ganho).toBeLessThan(1.0001);
      }
    }
  });
});

// ============================================================
// ONDA 7 — O ARRASTO DE DOIS EIXOS. O `dy` era calculado e jogado fora,
// e o eixo que existia subia em LATITUDE enquanto a dica prometia "girar
// em torno do alvo".
//
// O QUE MUDOU EM 26/08 (item 102), e está declarado: a `volta` deixou de
// girar em torno da linha alvo→Sol, então a promessa "o arrasto
// horizontal não compra um grau de sombra" MORREU com ela. Era ela que
// autorizava o cone de 70° a ficar escrito do jeito que estava, e o
// trilho que a cobrava saiu junto — cobrar uma invariância que a lei não
// promete mais é guarda que reprova obra boa. O PREÇO é dele e está
// escrito no item: girar livre gira a sombra junto.
//
// O QUE FICA são as provas de COMPORTAMENTO, e elas valem em qualquer
// lei: os sinais de tela medidos na matriz REAL da câmera, o custo em
// pixels de uma volta, e o alcance do dedo.
// ============================================================
describe('o arrasto de dois eixos — os sinais, o alcance e o custo', () => {
  it('a SUPERFÍCIE SEGUE O DEDO nos dois eixos, medido na base da câmera', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1000);
    const rig = new AtlasRig();
    // o oráculo não repete a fórmula: lê os eixos da câmera JÁ escrita
    // (coluna X = direita da tela, coluna Y = cima) e pergunta para que
    // lado a câmera andou. Trocar um sinal em `consumirOGiro` reprova.
    const medir = (dx: number, dy: number) => {
      noSistemaInteiro(rig);
      rig.apply(camera);
      const antes = camera.position.clone();
      const direita = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const cima = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      rig.addOrbitDelta(dx, dy);
      rig.apply(camera);
      const passo = camera.position.clone().sub(antes);
      return { x: passo.dot(direita), y: passo.dot(cima) };
    };
    // arrastar para a DIREITA leva a câmera para a esquerda da tela — e o
    // alvo, portanto, para a direita, junto com o dedo
    const horizontal = medir(40, 0);
    expect(horizontal.x).toBeLessThan(0);
    expect(Math.abs(horizontal.y)).toBeLessThan(Math.abs(horizontal.x) * 0.15);
    // arrastar para BAIXO leva a câmera para cima — e o alvo para baixo
    const vertical = medir(0, 40);
    expect(vertical.y).toBeGreaterThan(0);
    expect(Math.abs(vertical.x)).toBeLessThan(Math.abs(vertical.y) * 0.15);
    // e o eixo horizontal não é o vertical disfarçado: os dois passos
    // existem e são quase ortogonais (era o defeito — um eixo só)
    expect(Math.abs(horizontal.x)).toBeGreaterThan(1e-12);
    expect(Math.abs(vertical.y)).toBeGreaterThan(1e-12);
  });

  it('uma volta inteira do dedo são 2.856 px, e devolve a MESMA vista', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1000);
    const rig = new AtlasRig();
    // a POSE DE PRODUÇÃO (piso = raio físico do Sol): é nela que o freio
    // do solo vale 1 e o dedo bate 1:1 — sem o piso, a régua do freio é
    // a esfera enquadrada, e sob a lente de 58° o enquadramento cai a
    // 3,77 raios dela, dentro da faixa do freio (0,925 do gesto)
    naAberturaDeProducao(rig);
    rig.apply(camera);
    const inicial = camera.position.clone();
    const pxPorVolta = (2 * Math.PI) / ARRASTO_RAD_POR_PX;
    // 0,0022 rad/px = 0,126°/px, o número medido do eixo único: a volta
    // inteira custa 2.856 px de arrasto
    expect(pxPorVolta).toBeCloseTo(2856, 0);
    rig.addOrbitDelta(pxPorVolta, 0);
    rig.apply(camera);
    expect(camera.position.distanceTo(inicial)).toBeLessThan(1e-9 * inicial.length());
    // meia volta é OUTRA vista, e bem outra: a corda de 60° a 30° de fase
    rig.addOrbitDelta(pxPorVolta / 2, 0);
    rig.apply(camera);
    expect(camera.position.distanceTo(inicial)).toBeGreaterThan(0.5 * inicial.length());
  });

  it('o VERTICAL atravessa o terminador e chega ao LADO ESCURO (item 73)', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1000);
    const rig = new AtlasRig();
    const casa = orbitaMaisExterna();
    const iluminada = casa.posicao.clone().negate().normalize();
    const faseAgora = () =>
      camera.position.clone().sub(rig.alvo).normalize().angleTo(iluminada) / GRAU;
    noSistemaInteiro(rig);
    // 140 × 8 px × 0,0022 = 2,464 rad = 141,2°, somados ao pino de 30°
    for (let i = 0; i < 140; i++) rig.addOrbitDelta(0, 8);
    rig.apply(camera);
    const escuro = faseAgora();
    // passou do cone de 70° que era a trava do item 73 e está no escuro
    expect(escuro).toBeGreaterThan(MAX_SOLAR_DEVIATION_GRAUS);
    expect(escuro).toBeGreaterThan(160);
    // a fração iluminada lá é `(1+cos φ)/2` — quase zero: é o lado
    // escuro, que é o que ele pediu para ver
    expect((1 + Math.cos(escuro * GRAU)) / 2).toBeLessThan(0.03);
    // ...E NÃO PARA AÍ, que é a diferença do item 102: a lei antiga
    // encostava numa parede perto do polo e os últimos quadros eram o
    // mesmo quadro. Aqui o dedo continua e a câmera continua.
    const antesDeSeguir = camera.position.clone();
    for (let i = 0; i < 60; i++) rig.addOrbitDelta(0, 8);
    rig.apply(camera);
    expect(camera.position.distanceTo(antesDeSeguir)).toBeGreaterThan(
      0.1 * antesDeSeguir.length()
    );
  });

  /**
   * O DEDO NÃO BATE EM NADA — o dente da frase dele, medido pelo
   * COMPORTAMENTO e não por ausência de código: *"sem travas para
   * qualquer dos lados sem nenhum limitador de angulo ou coisa
   * parecida"*.
   *
   * A RÉGUA É O ÂNGULO VARRIDO CONTRA O PEDIDO. Cada passo do dedo tem
   * de mover a mira EXATAMENTE o que pediu, passo a passo, por três
   * voltas inteiras e nos dois sentidos. Uma trava recolocada em
   * qualquer lugar come um pedaço de algum passo, e a soma deixa de
   * fechar — é isto que a sabotagem "põe um clamp de volta" reprova.
   *
   * COM `dt = 0` DE PROPÓSITO: sem relógio o filtro da inércia é
   * pass-through declarado, então o que se mede é a LEI do giro e não a
   * rampa do filtro. O freio do solo vale 1 no enquadramento puro (6,4
   * raios, bem acima dos 4 em que ele sai do caminho).
   */
  it('NÃO HÁ TRAVA: o ângulo varrido é o ângulo pedido, por 3 voltas', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1000);
    const rig = new AtlasRig();
    for (const eixoDoDedo of ['vertical', 'horizontal'] as const) {
      for (const sentido of [1, -1]) {
        // pose de produção: freio do solo em 1 (ver o teste da volta)
        naAberturaDeProducao(rig);
        rig.apply(camera, 1, LARGURA_DE_MESA_PX, 0);
        let anterior = camera.position.clone().sub(rig.alvo).normalize();
        const passoPx = 20 * sentido;
        const passoRad = Math.abs(passoPx) * ARRASTO_RAD_POR_PX;
        // 3 voltas: 3 × 2π / (20 × 0,0022) = 429 passos
        const passos = Math.round((3 * 2 * Math.PI) / passoRad);
        let varrido = 0;
        let menorPasso = Infinity;
        for (let i = 0; i < passos; i++) {
          if (eixoDoDedo === 'vertical') rig.addOrbitDelta(0, passoPx);
          else rig.addOrbitDelta(passoPx, 0);
          rig.apply(camera, 1, LARGURA_DE_MESA_PX, 0);
          const agora = camera.position.clone().sub(rig.alvo).normalize();
          const andou = agora.angleTo(anterior);
          menorPasso = Math.min(menorPasso, andou);
          varrido += andou;
          anterior = agora;
        }
        // NENHUM passo foi comido: o menor deles ainda é o passo inteiro
        expect(menorPasso).toBeGreaterThan(passoRad * 0.999);
        // ...e a soma fecha com o pedido, a três voltas de distância
        expect(varrido).toBeCloseTo(passos * passoRad, 6);
        expect(varrido / (2 * Math.PI)).toBeGreaterThan(2.99);
      }
    }
  });

  it('o acumulador não guarda arrasto morto — um pixel move na hora', () => {
    // a "borracha" de todo controle mal grampeado: se o acumulador
    // seguisse somando depois de um limite, a volta custaria desfazer o
    // arrasto morto antes de a câmera se mexer. Sem limite não há
    // borracha possível, e é isso que este trilho cobra do outro lado.
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1000);
    const rig = new AtlasRig();
    noSistemaInteiro(rig);
    for (let i = 0; i < 500; i++) rig.addOrbitDelta(0, 50);
    rig.apply(camera);
    const longe = camera.position.clone();
    rig.addOrbitDelta(0, -1);
    rig.apply(camera);
    expect(camera.position.distanceTo(longe)).toBeGreaterThan(0);
  });
});

// ------------------------------------------------------------
// A INÉRCIA DO GIRO (item 102, P1) — a queixa do dono é de TATO:
// «o movimento de rotacionar objetos selecionados do app é péssimo…
// porque somos diferentes do nasa eyes nisso?». A causa medida: o giro
// deles passa por um filtro exponencial e morre macio; o nosso somava
// seco e parava seco. Estes oráculos medem o COMPORTAMENTO da câmera —
// nenhum deles repete a fórmula do filtro.
// ------------------------------------------------------------
describe('a inércia do giro — o filtro 20/80 com correção de delta-time', () => {
  const QUADRO = 1 / 60;
  const camera = () => new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1000);

  /** um quadro de `dt` segundos com `px` de dedo na horizontal */
  const quadro = (rig: AtlasRig, cam: THREE.PerspectiveCamera, px: number, dt: number) => {
    if (px !== 0) rig.addOrbitDelta(px, 0);
    rig.apply(cam, 1, LARGURA_DE_MESA_PX, dt);
  };

  /**
   * Quantos quadros a câmera ainda anda DEPOIS de o dedo soltar, e
   * quanto tempo isso dá. Mede a POSIÇÃO — se o filtro sumir, a resposta
   * é zero.
   */
  const rastroDepoisDeSoltar = (dt: number, pxPorSegundo: number) => {
    const cam = camera();
    const rig = new AtlasRig();
    noSistemaInteiro(rig);
    rig.apply(cam, 1, LARGURA_DE_MESA_PX, dt);
    // arrasta meio segundo para o filtro chegar ao regime (o dedo em
    // velocidade constante: o mesmo px/s em qualquer fps)
    for (let i = 0; i < Math.round(0.5 / dt); i++) quadro(rig, cam, pxPorSegundo * dt, dt);
    // ...e SOLTA: daqui para a frente nenhum pixel entra
    let quadros = 0;
    let anterior = cam.position.clone();
    let andou = 0;
    for (let i = 0; i < 600; i++) {
      quadro(rig, cam, 0, dt);
      const passo = cam.position.distanceTo(anterior);
      if (passo === 0) break;
      andou += passo;
      quadros++;
      anterior = cam.position.clone();
    }
    return { quadros, segundos: quadros * dt, andou, fim: cam.position.clone() };
  };

  it('ao SOLTAR, o giro MORRE MACIO — e morre de vez', () => {
    const rastro = rastroDepoisDeSoltar(QUADRO, 600);
    // ANTES DO P1 a resposta era ZERO: o delta ia seco no acumulador e a
    // câmera parava no mesmo quadro em que o dedo parava. É esta linha
    // que morde quem desfizer o filtro.
    // MEDIDO com este dedo (600 px/s): 24 quadros a 60 fps.
    expect(rastro.quadros).toBeGreaterThan(10);
    // ...e não é um rastro sem fim: `GIRO_MORTO_RAD` zera de vez.
    // MEDIDO: 0,400 s — meio segundo é o teto do gosto.
    expect(rastro.segundos).toBeLessThan(0.6);
    // e o giro CONTINUOU no mesmo sentido, não voltou nem tremeu
    expect(rastro.andou).toBeGreaterThan(0);
    // depois de morto, a pose fica parada BIT a bit — nenhum quadro
    // seguinte reescreve nada
    const depois = rastro.fim.clone();
    expect(rastro.fim.equals(depois)).toBe(true);
  });

  it('o DEGRAU BRUTO chega diluído: o primeiro quadro anda 20% do que o dedo pediu', () => {
    // é a metade "suavização" do mesmo filtro — a 40 fps (o app é
    // GPU-bound no M1) o 1:1 sem filtro lê serrilhado
    const cam = camera();
    const rig = new AtlasRig();
    noSistemaInteiro(rig);
    rig.apply(cam, 1, LARGURA_DE_MESA_PX, QUADRO);
    const zero = cam.position.clone();
    quadro(rig, cam, 100, QUADRO);
    const comFiltro = cam.position.distanceTo(zero);

    // o mesmo degrau entregue SEM quadro nenhum (o `apply` avulso, dt=0)
    // é o caminho de antes: entra inteiro
    const cam2 = camera();
    const rig2 = new AtlasRig();
    noSistemaInteiro(rig2);
    rig2.apply(cam2, 1, LARGURA_DE_MESA_PX, QUADRO);
    rig2.addOrbitDelta(100, 0);
    rig2.apply(cam2);
    const inteiro = cam2.position.distanceTo(zero);

    expect(comFiltro / inteiro).toBeCloseTo(0.2, 2);
  });

  it('o RASTRO dura o mesmo TEMPO a 60 e a 30 fps — é a correção de delta-time', () => {
    // sem a correção (o filtro do Eyes é por quadro), metade do fps
    // dobra a duração do embalo: o mesmo app teria dois tatos, e o
    // nosso vive perto de 40 fps. Com ela, o mesmo dedo (px por
    // SEGUNDO) deixa o mesmo rastro em segundos.
    // MEDIDO: 0,400 s nos DOIS (24 quadros a 60, 12 a 30) — e 0,400
    // também a 40 e a 120 fps. Sem a correção, 30 fps daria 0,800.
    const rapido = rastroDepoisDeSoltar(QUADRO, 600);
    const lento = rastroDepoisDeSoltar(2 / 60, 600);
    expect(lento.segundos / rapido.segundos).toBeGreaterThan(0.95);
    expect(lento.segundos / rapido.segundos).toBeLessThan(1.05);
    // e o dedo em REGIME anda o mesmo tanto por segundo nos dois fps —
    // a suavização não é perda de sensibilidade
    expect(lento.fim.distanceTo(rapido.fim)).toBeLessThan(0.02 * rapido.fim.length());
  });

  it('a VISTA PARADA não anda um bit — quadros sem dedo não escrevem pose nova', () => {
    // a CONDIÇÃO DE NASCIMENTO do item 102: o filtro só existe onde há
    // gesto. Sem dedo, o `apply` de cada quadro tem de devolver a MESMA
    // pose, bit a bit, senão as 54 vistas paradas do gate acusam.
    const cam = camera();
    const rig = new AtlasRig();
    naAberturaDeProducao(rig);
    rig.apply(cam, 1, LARGURA_DE_MESA_PX, QUADRO);
    const pose = cam.position.clone();
    const giro = cam.quaternion.clone();
    for (const dt of [QUADRO, 2 / 60, 0.5, 0]) {
      rig.apply(cam, 1, LARGURA_DE_MESA_PX, dt);
      expect(cam.position.equals(pose)).toBe(true);
      expect(cam.quaternion.equals(giro)).toBe(true);
    }
  });

  it('PERTO DO SOLO o giro anda menos — o mesmo arrasto a 2 raios e a 10', () => {
    // item 102, P3: no Eyes o giro desacelera ao raspar a superfície;
    // aqui o ganho era fixo, e o mesmo arrasto em pixels que varria 20°
    // de céu de longe jogava a câmera para o outro lado do planeta de
    // perto. A régua é o ÂNGULO em torno do alvo, não a distância
    // percorrida (essa escala com o raio da órbita e não mediria nada).
    const varreu = (raios: number) => {
      const cam = camera();
      const rig = new AtlasRig();
      naAberturaDeProducao(rig); // alvo na origem, régua = raio FÍSICO do Sol
      rig.apply(cam, 1, LARGURA_DE_MESA_PX, QUADRO);
      rig.pinarDistancia(raios * RAIO_DO_SOL_NA_CENA);
      rig.apply(cam, 1, LARGURA_DE_MESA_PX, QUADRO);
      const antes = cam.position.clone().sub(rig.alvo).normalize();
      // um arrasto curto (10 px), entregue e consumido até a inércia morrer:
      // curto porque o ângulo varrido só é LINEAR na volta perto de zero,
      // e o que se compara aqui é o ganho, não a parametrização
      quadro(rig, cam, 10, QUADRO);
      for (let i = 0; i < 200; i++) quadro(rig, cam, 0, QUADRO);
      return cam.position.clone().sub(rig.alvo).normalize().angleTo(antes);
    };
    const noPiso = varreu(K_MIN_RAIOS); // 2 raios: um raio de altura
    const longe = varreu(10);
    expect(longe).toBeGreaterThan(0);
    // MEDIDO: 0,333338 — no piso o giro anda um TERÇO do que anda longe,
    // que é o `FREIO_MINIMO_DO_SOLO` contra o freio solto de 10 raios.
    // Os 4e-6 que sobram são a curvatura da parametrização (o ângulo
    // varrido não é exatamente linear na volta), não o freio.
    expect(noPiso / longe).toBeCloseTo(FREIO_MINIMO_DO_SOLO, 4);
    // e de 4 raios para cima (3 de altura) o freio já saiu do caminho
    expect(varreu(4) / longe).toBeCloseTo(1, 6);
  });

  it('o gesto NÃO ATRAVESSA a troca de alvo — a inércia morre com o foco', () => {
    // o resto de um giro em Marte não tem o que fazer chegando em
    // Saturno: `focar` zera o acumulador, e teria de zerar o embalo
    // junto, senão o alvo novo nasceria andando sozinho
    const cam = camera();
    const rig = new AtlasRig();
    noSistemaInteiro(rig);
    for (let i = 0; i < 30; i++) quadro(rig, cam, 10, QUADRO);
    naAberturaDeProducao(rig);
    rig.apply(cam, 1, LARGURA_DE_MESA_PX, QUADRO);
    const nasceu = cam.position.clone();
    rig.apply(cam, 1, LARGURA_DE_MESA_PX, QUADRO);
    expect(cam.position.equals(nasceu)).toBe(true);
  });
});

describe('o rig e a esfera do sistema inteiro — o teto do zoom', () => {
  it('a esfera do sistema é a órbita mais externa do retrato, pelo caminho da camada de planetas', () => {
    const { posicao, raio } = orbitaMaisExterna();
    const eq = eclipticaParaEquatorial(RETRATO_2026.pluto.vetorUA);
    expect(posicao.x).toBe(eq[0] * AU_PARA_PC);
    expect(posicao.y).toBe(eq[1] * AU_PARA_PC);
    expect(posicao.z).toBe(eq[2] * AU_PARA_PC);
    expect(raio).toBe(RETRATO_2026.pluto.rUA * AU_PARA_PC);
    // é mesmo o MAIOR do retrato — o teste falha se alguém acrescentar
    // um corpo mais distante e esquecer de reconferir o teto do zoom
    for (const c of Object.values(RETRATO_2026)) {
      expect(c.rUA).toBeLessThanOrEqual(RETRATO_2026.pluto.rUA);
    }
    // o raio é ORBITAL, e a esfera é CENTRADA NO SOL: o
    // corpo mais externo fica sobre a superfície dela (|posição| = raio)
    // e tudo que orbita por dentro fica dentro — que é a promessa
    expect(posicao.length()).toBeCloseTo(raio, 15);
  });

  it('enquadrar a esfera do SISTEMA a centra no Sol, e tudo cabe dentro', () => {
    const camera = new THREE.PerspectiveCamera(112, 1.6, 0.001, 100);
    const rig = new AtlasRig();
    noSistemaInteiro(rig);
    rig.apply(camera);
    const casa = orbitaMaisExterna();
    // o alvo é a ORIGEM: a câmera olha o Sol, e a distância a ele é a
    // distância de enquadramento — sem o triângulo que havia quando a
    // esfera pendia do corpo
    expect(rig.alvo.length()).toBe(0);
    expect(camera.position.length()).toBeCloseTo(
      enquadrar({
        rAlvo: casa.raio,
        fovDeg: ATLAS_FOV_GRAUS,
        aspect: 1.6,
        retanguloUtil: retanguloUtilDoAtlas(),
      }).distancia,
      15
    );
    // e TODA órbita do retrato cabe: a mais externa tangencia por dentro
    // da margem, e nenhuma outra passa dela
    for (const c of Object.values(RETRATO_2026)) {
      expect(c.rUA * AU_PARA_PC).toBeLessThanOrEqual(casa.raio);
    }
  });

  it('a DISTÂNCIA DO TETO é a que a docstring de tetoDeZoom declara', () => {
    // O número mora num lugar só — `AtlasRig.tetoDeZoom`, que é onde ele
    // é CALCULADO —, e este trilho o deriva de `enquadrar()`: quando a
    // próxima faixa de HUD entrar, ele quebra em vez de deixar a
    // docstring envelhecer calada.
    //
    // O RIG VAI NO ESTADO DE PRODUÇÃO, e é a mudança de 23/08: a câmera
    // é posta na ABERTURA (a borda do sistema interno, item 61) e o que
    // se lê é `tetoDeZoom` — ou seja, o mais longe a que a RODA leva o
    // visitante. Antes o trilho enquadrava a esfera do sistema e media a
    // câmera; isso media um método que produção nenhuma chamava.
    const camera = new THREE.PerspectiveCamera(112, 16 / 9, 0.001, 100);
    const rig = new AtlasRig();
    naAberturaDeProducao(rig);
    rig.apply(camera);
    const tetoEmUA = () => rig.tetoDeZoom / AU_PARA_PC;
    // 133,68 UA sob a lente de 58° (a de 35° dava 226,84) — a faixa de
    // meio UA é o que separa "a docstring está certa" de "a docstring
    // envelheceu"
    expect(tetoEmUA()).toBeGreaterThan(133.4);
    expect(tetoEmUA()).toBeLessThan(133.9);
    // e ele ANDA com `?ui=` nos dois sentidos (213,4 e 317,1 UA). O
    // extremo de cima subiu de 296,8 em 2026-08-20 (item 9): a 1.200 px
    // com o texto em 140% os controles do tempo quebram em duas linhas,
    // a base declarada paga o degrau, e a câmera recua o que o HUD
    // ocupa. Recuo é o preço declarado de HUD mais alto — o contrário
    // (declarar menos) é o alvo atrás do texto.
    rig.apply(camera, 0.85);
    expect(tetoEmUA()).toBeGreaterThan(126.1);
    expect(tetoEmUA()).toBeLessThan(126.6);
    rig.apply(camera, 1.4);
    expect(tetoEmUA()).toBeGreaterThan(183.5);
    expect(tetoEmUA()).toBeLessThan(184.0);
    // E O TETO NÃO DEPENDE DE ONDE O VISITANTE ESTÁ — só do alvo e da
    // lente. A prova é MOVER o visitante e reler: pinar a distância lá
    // embaixo, no piso, deixa a câmera a menos de um centésimo do teto, e
    // o teto não se mexe um dígito. (Antes este trecho REFOCAVA o rig no
    // sistema inteiro e comparava a câmera com o teto NOVO: isso mede que
    // o teto é o enquadramento do sistema — verdade, mas outra verdade,
    // e não a que a frase acima promete.)
    rig.apply(camera);
    const tetoParado = tetoEmUA();
    rig.pinarDistancia(rig.pisoDeZoom);
    rig.apply(camera);
    // o companheiro, com o número medido para não virar limiar solto: a
    // câmera pousa em 0,0093 UA (dois raios solares, o piso do zoom)
    // contra um limiar de 2,268 UA — 244× de folga. Ele não está aqui
    // para ser apertado; está para provar que a câmera SAIU do lugar,
    // que é o que dá sentido à igualdade da linha seguinte.
    expect(camera.position.length() / AU_PARA_PC).toBeLessThan(tetoParado / 100);
    expect(tetoEmUA()).toBeCloseTo(tetoParado, 12);
    rig.pinarDistancia(null);
  });

  it('a ABERTURA é o sistema INTEIRO e nasce NO teto (29/08, itens 61+86)', () => {
    // A ESCOLHA DELE pela folha `item61-abertura-folha.png` sob a lente
    // de 58°: o Atlas abre como o NASA Eyes, com o sistema todo em
    // quadro. A câmera nasce exatamente onde a roda para — o teto é o
    // enquadramento da MESMA esfera —, então o curso da roda é todo
    // para DENTRO: mais longe que "o sistema em quadro" não há assunto.
    // Entre 23/08 e 29/08 a abertura foi a borda do sistema interno
    // (~9 UA); se ela voltar a nascer abaixo do teto, ou o teto
    // descolar do raio enquadrado, é este trilho que grita.
    const camera = new THREE.PerspectiveCamera(112, 16 / 9, 0.001, 100);
    const rig = new AtlasRig();
    naAberturaDeProducao(rig);
    rig.apply(camera);
    // a abertura É o teto — a mesma esfera, a mesma conta
    expect(rig.distanciaDoEnquadramento).toBeCloseTo(rig.tetoDeZoom, 12);
    // e a roda tem curso inteiro para dentro, até o corpo do Sol
    expect(rig.pisoDeZoom).toBeLessThan(rig.distanciaDoEnquadramento / 1000);
  });

  it('a roda desce do TETO até o corpo do Sol — 38 estalos, não cinco', () => {
    // item 73, 22/08. Na abertura o ALVO É O SOL (a esfera do sistema é
    // centrada nele), então o piso do zoom é o raio FÍSICO dele. Com o
    // piso na esfera enquadrada eram 70,8 UA e cinco estalos: a roda
    // parava a meio caminho de casa e a lei "um alvo e uma distância"
    // valia em Saturno e não valia na vista com que o Atlas abre.
    const camera = new THREE.PerspectiveCamera(112, 16 / 9, 0.001, 100);
    const rig = new AtlasRig();
    const casa = orbitaMaisExterna();
    rig.focar(new THREE.Vector3(), casa.raio, casa.posicao, {
      pisoRaio: RAIO_DO_SOL_NA_CENA,
    });
    rig.apply(camera);
    const emUA = (pc: number) => pc / AU_PARA_PC;
    // o piso: 2 raios solares, 0,00930 UA — e não os 70,8 UA de antes
    expect(emUA(rig.pisoDeZoom)).toBeCloseTo(2 * emUA(RAIO_SOL_PC), 6);
    expect(emUA(rig.pisoDeZoom)).toBeLessThan(0.01);
    expect(emUA(rig.tetoDeZoom)).toBeGreaterThan(133.4);
    // o CURSO, contado com o mesmo passo em log que a roda gasta
    let d = rig.tetoDeZoom;
    let estalos = 0;
    while (d > rig.pisoDeZoom * 1.000001 && estalos < 500) {
      d = distanciaAposEstalos(d, rig.pisoDeZoom, rig.tetoDeZoom, -1);
      estalos += 1;
    }
    // 38 sob a lente de 58° (o curso encurtou com o teto; eram 40 a 35°)
    expect(estalos).toBe(38);
    // e a mesma conta com o piso ANTIGO (a esfera enquadrada) devolve o
    // curso raso que motivou o item 73: DOIS estalos sob a lente de 58°
    // (eram quatro a 35°; a nota do item diz "cinco" porque lá o gesto
    // começava fora do teto exato) — a roda parava a meio caminho de casa
    const pisoAntigo = 2 * casa.raio;
    let e2 = 0;
    let d2 = rig.tetoDeZoom;
    while (d2 > pisoAntigo * 1.000001 && e2 < 500) {
      d2 = distanciaAposEstalos(d2, pisoAntigo, rig.tetoDeZoom, -1);
      e2 += 1;
    }
    expect(e2).toBe(2);
  });

  it('a ABERTURA é quem entrega o piso do Sol — a escada, não o rig', () => {
    // a fonte única do tamanho do Sol é o `solRaioPc` do director (a
    // MESMA que o palco e o portão de 4 px leem); o rig não a conhece.
    const ESCADA = readFileSync(
      new URL('../director/escada.ts', import.meta.url),
      'utf8'
    );
    const sistema = ESCADA.slice(
      ESCADA.indexOf('  focarNoSistema() {'),
      ESCADA.indexOf('private rampaDaEscada()')
    );
    expect(sistema).toContain('pisoRaio: this.solRaioPc,');
    // ...e o Esc desfaz o zoom antes de subir a escada, senão quem
    // desceu da abertura ao Sol fica preso (no degrau `sistema` a
    // subida não tem para onde ir)
    const sobe = ESCADA.slice(
      ESCADA.indexOf('  subirDegrau(): boolean {'),
      ESCADA.indexOf('  reenquadrarAposEfemeride()')
    );
    expect(sobe).toContain('if (this.atlas.distanciaEstaPinada) {');
    expect(sobe.indexOf('distanciaEstaPinada')).toBeLessThan(
      sobe.indexOf("if (degrau === 'sistema') return false;")
    );
  });

  it('o fov do Atlas é pino, não herança: o rig o escreve todo quadro', () => {
    const camera = new THREE.PerspectiveCamera(112, 1.6, 0.001, 100);
    const rig = new AtlasRig();
    noSistemaInteiro(rig);
    rig.apply(camera);
    expect(camera.fov).toBe(ATLAS_FOV_GRAUS);
  });

  it('a câmera do TETO fica do lado ACESO do corpo mais externo', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 0.001, 100);
    const rig = new AtlasRig();
    noSistemaInteiro(rig);
    rig.apply(camera);
    // o eixo sai do CORPO (o alvo é a origem, e Sol→origem é nulo), e a
    // câmera se põe do lado do Sol em relação a ele: o ângulo entre
    // "para onde a câmera está" e "para onde o corpo está" passa de 90°
    const casa = orbitaMaisExterna();
    expect(camera.position.angleTo(casa.posicao) / GRAU).toBeGreaterThan(90);
  });

  it('a órbita do ponteiro é determinística e grampeada', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 0.001, 100);
    const rig = new AtlasRig();
    noSistemaInteiro(rig);
    rig.apply(camera);
    const inicial = camera.position.clone();
    for (let i = 0; i < 2000; i++) rig.addOrbitDelta(50, 50);
    rig.apply(camera);
    const girada = camera.position.clone();
    expect(girada.distanceTo(inicial)).toBeGreaterThan(0);
    // grampeado no POLO, que é o único limite que sobrou (item 73): a
    // direção da câmera nunca entra na calota de MIN_POLAR em volta do
    // polo da eclíptica, que é o `up` deste degrau
    const daCamera = girada.clone().sub(rig.alvo).normalize();
    const polar = daCamera.angleTo(POLO_ECLIPTICO);
    expect(Math.min(polar, Math.PI - polar)).toBeGreaterThanOrEqual(MIN_POLAR_RAD - 1e-9);
    // e focar de novo zera a órbita — o alvo novo nasce no pino
    noSistemaInteiro(rig);
    rig.apply(camera);
    expect(camera.position.distanceTo(inicial)).toBeCloseTo(0, 15);
  });

  it('o enquadramento de uma estrela é função do ALVO: clicar duas vezes dá a MESMA vista', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 0.001, 1000);
    const rig = new AtlasRig();
    // Sirius, a 2,64 pc: o raio sai da distância dela ao SOL
    const sirius = new THREE.Vector3(-0.494, 2.474, -0.888);
    const enquadra = () => {
      rig.focar(sirius, raioDeEnquadramentoEstelar(sirius.length()));
      rig.apply(camera);
      return camera.position.clone();
    };
    const primeira = enquadra();
    const segunda = enquadra();
    const terceira = enquadra();
    // idempotência EXATA: é o que faz `?foco=hd48915` reproduzir a vista
    // de quem copiou o link, e o que o raio saído da câmera destruía
    expect(segunda.distanceTo(primeira)).toBe(0);
    expect(terceira.distanceTo(primeira)).toBe(0);
    // e o raio é o piso da lei (2,64 pc × 0,08 = 0,21 < 0,8)
    expect(raioDeEnquadramentoEstelar(sirius.length())).toBe(0.8);
    expect(raioDeEnquadramentoEstelar(152)).toBeCloseTo(9, 12);
    expect(raioDeEnquadramentoEstelar(8150)).toBe(9);
  });
});

// ============================================================
// F2b — o consumidor de PARENT_FRAMING_BIAS e a rampa entre degraus.
// ============================================================
describe('direcaoDaLua — o degrau "lua" (F2b/D7)', () => {
  const polo = new THREE.Vector3(0, 0, 1);

  it('sem pai degenera na direção privilegiada de sempre', () => {
    const doSol = new THREE.Vector3(1, 0, 0);
    const a = direcaoDeRepouso(doSol.clone(), polo, new THREE.Vector3());
    const b = direcaoDaLua(
      doSol.clone(),
      new THREE.Vector3(),
      polo,
      new THREE.Vector3()
    );
    expect(b.distanceTo(a)).toBeLessThan(1e-12);
  });

  it('é a MISTURA de direções com peso 0,78 no termo do pai — nunca fator de distância', () => {
    const doSol = new THREE.Vector3(1, 0, 0); // Sol→lua
    // longe-do-pai a ~27° da direção iluminada: a mistura fica DENTRO
    // do grampo de 70° e sai crua (renormalizada)
    const doPai = new THREE.Vector3(-1, 0.5, 0);
    const out = direcaoDaLua(
      doSol.clone(),
      doPai.clone(),
      polo,
      new THREE.Vector3()
    );
    const solar = direcaoDeRepouso(doSol.clone(), polo, new THREE.Vector3());
    const esperado = solar
      .clone()
      .lerp(doPai.clone().normalize(), PARENT_FRAMING_BIAS)
      .normalize();
    expect(out.distanceTo(esperado)).toBeLessThan(1e-12);
    expect(out.length()).toBeCloseTo(1, 12);
  });

  it('NUNCA além do terminador: pai do lado do Sol → grampo nos 70°', () => {
    // pai→lua apontando PARA LONGE do Sol (lua em oposição ao pai visto
    // do Sol): a mistura cairia no lado noturno — a cicatriz do doador
    // (Japeto/Titã/Lua "não carregou"); o grampo gira de volta para o
    // máximo desvio compatível com luz
    const doSol = new THREE.Vector3(1, 0, 0);
    const doPai = new THREE.Vector3(0.99, 0.141, 0).normalize(); // quase o eixo solar
    const out = direcaoDaLua(doSol.clone(), doPai, polo, new THREE.Vector3());
    const iluminada = doSol.clone().negate().normalize();
    const desvio = THREE.MathUtils.radToDeg(out.angleTo(iluminada));
    expect(desvio).toBeLessThanOrEqual(MAX_SOLAR_DEVIATION_GRAUS + 1e-9);
    // e mais de meio disco segue iluminado: (1+cos 70°)/2 = 67%
    expect((1 + Math.cos(out.angleTo(iluminada))) / 2).toBeGreaterThan(0.5);
  });

  it('o azimute "longe do pai" sobrevive onde é compatível com luz', () => {
    const doSol = new THREE.Vector3(1, 0, 0);
    const doPai = new THREE.Vector3(0.99, 0.141, 0).normalize();
    const out = direcaoDaLua(doSol.clone(), doPai, polo, new THREE.Vector3());
    const iluminada = doSol.clone().negate().normalize();
    // o grampo entrega EXATAMENTE o desvio máximo (girou até a borda,
    // não desistiu para a solar pura) e preserva o lado do pai (y > 0)
    expect(THREE.MathUtils.radToDeg(out.angleTo(iluminada))).toBeCloseTo(
      MAX_SOLAR_DEVIATION_GRAUS,
      9
    );
    expect(out.y).toBeGreaterThan(0);
  });
});

// ============================================================
// ONDA 7 — O POLO DO CORPO NO ALTO, e a GUARDA que ele obriga.
//
// `escreverPose` escrevia `camera.up = POLO_ECLIPTICO` sempre: a Terra
// saía 4,2° torta na data de abertura e até 27,8° noutras. O dado
// existia pronto e puro (o modelo IAU do kernel, o MESMO que orienta a
// malha do planeta) — o Atlas é que não o consultava.
//
// A guarda não é capricho: com o polo do corpo no alto E o arrasto de
// dois eixos solto, a direção da câmera ALCANÇA o eixo da Terra, e ali
// o `lookAt` degenera (a imagem gira sozinha em torno da mira). Estas
// provas medem as duas coisas: que o encontro acontece, e que a mistura
// suave o desarma sem vazar para o caso comum.
// ============================================================
describe('o polo do corpo no alto, e a guarda da mira', () => {
  const poloDe = (id: string, jd: number) => {
    const p = baseCorpoEquatorial(IAU_ORIENTATIONS[id], jd).polo;
    return new THREE.Vector3(p[0], p[1], p[2]);
  };
  /** as direções Sol→alvo de um ano, no plano da eclíptica */
  const direcoesDoAno = (passoGraus: number) => {
    const fora: THREE.Vector3[] = [];
    for (let a = 0; a < 360; a += passoGraus) {
      const r = a * GRAU;
      const eq = eclipticaParaEquatorial([Math.cos(r), Math.sin(r), 0]);
      fora.push(new THREE.Vector3(eq[0], eq[1], eq[2]).normalize());
    }
    return fora;
  };

  it('a degenerescência é ALCANÇÁVEL — e desde o item 73, em qualquer data', () => {
    // o eixo da Terra faz com a direção do Sol, no solstício, 90° − 23,4°
    // = 66,6°. No cone de 70° ele já era alcançável só nessa janela do
    // ano; com a inclinação varrendo [0°, 180°] ele é alcançável SEMPRE,
    // e é por isso que a guarda deixou de ser opcional.
    const polo = poloDe('earth', EPOCA_JD_TDB);
    let menor = 180;
    let maior = 0;
    for (const doSol of direcoesDoAno(1)) {
      const iluminada = doSol.clone().negate();
      menor = Math.min(menor, iluminada.angleTo(polo) / GRAU);
      maior = Math.max(maior, iluminada.angleTo(polo) / GRAU);
    }
    expect(menor).toBeGreaterThan(66);
    expect(menor).toBeLessThan(67);
    // no cone de então só o solstício chegava lá (66,6 < 70); no
    // equinócio a linha do Sol fica a 90° do eixo e faltavam 20°
    expect(menor).toBeLessThan(MAX_SOLAR_DEVIATION_GRAUS);
    expect(maior).toBeGreaterThan(MAX_SOLAR_DEVIATION_GRAUS + 40);
    // hoje a inclinação chega a 180°, então o polo está DENTRO do
    // alcance em todo dia do ano — a guarda vale sempre
    expect(maior).toBeLessThan(180);
  });

  it('no encontro exato o grampo polar segura a mira em MIN_POLAR, e o up cede', () => {
    const polo = poloDe('earth', EPOCA_JD_TDB);
    // construção EXATA: `u` (alvo→Sol) a 30° do polo — o pino de fase
    // inclina exatamente esses 30° rumo a ele, então a pose de REPOUSO
    // pede a câmera em cima do polo, sem depender de busca nem do dedo.
    // (Era construída com o arrasto; desde o giro livre o dedo não passa
    // por esta função, e a geometria que a alcança é a do próprio pino.)
    const t = new THREE.Vector3(1, 0, 0).cross(polo).normalize();
    const u = polo
      .clone()
      .multiplyScalar(Math.cos(PHASE_OFFSET_GRAUS * GRAU))
      .addScaledVector(t, Math.sin(PHASE_OFFSET_GRAUS * GRAU));
    const doSol = u.clone().negate();
    const dir = direcaoDeRepouso(doSol, polo, new THREE.Vector3());
    // o pedido era o polo EXATO; o grampo o para a MIN_POLAR dele, e
    // esse é o piso duro de `|direita| = |up × z| = sen(φ)`
    expect(dir.angleTo(polo)).toBeCloseTo(MIN_POLAR_RAD, 9);
    expect(Math.abs(dir.dot(polo))).toBeLessThan(Math.cos(MIN_POLAR_RAD) + 1e-12);
    // e o up ainda cede à eclíptica — as duas guardas somam: para a
    // Terra a eclíptica fica a 23,4° do eixo, e a mira a 5,73° dele,
    // então a separação mira↔up sobe para ~18°
    const up = upDoAtlas(dir, polo, new THREE.Vector3());
    expect(up.distanceTo(POLO_ECLIPTICO)).toBeLessThan(1e-12);
    expect(dir.angleTo(up) / GRAU).toBeGreaterThan(15);
  });

  it('a guarda NÃO vaza: longe do eixo o up é o polo do corpo, bit a bit', () => {
    const polo = poloDe('earth', EPOCA_JD_TDB);
    // o repouso do degrau "corpo" — 30° de fase, sem arrasto — fica a
    // dezenas de graus do eixo em qualquer dia do ano
    for (const doSol of direcoesDoAno(15)) {
      const dir = direcaoDeRepouso(
        doSol.clone(),
        polo,
        new THREE.Vector3()
      );
      const separacao = 90 - Math.abs(90 - dir.angleTo(polo) / GRAU);
      expect(separacao).toBeGreaterThan(CEDER_COMECA_GRAUS);
      const up = upDoAtlas(dir, polo, new THREE.Vector3());
      expect(up.distanceTo(polo.clone().normalize())).toBe(0);
    }
  });

  it('VARREDURA: em nenhuma pose de repouso a mira encosta no up', () => {
    // os dois corpos que têm degrau "corpo"/"lua" hoje, um ano de datas
    // e o ano inteiro de direções do Sol.
    //
    // A VARREDURA DEIXOU DE PERCORRER O DEDO, e o trilho abaixo diz por
    // quê: desde o giro livre a separação mira↔up é INVARIANTE sob o
    // arrasto (os dois giram pela mesma rotação), então o pior caso mora
    // todo na pose de REPOUSO. Varrer o dedo aqui seria medir 4.000 vezes
    // o mesmo número.
    //
    // Quem segura é `MIN_POLAR_RAD`, aplicado DUAS vezes: na mira contra
    // o polo, e no `up` contra a mira (`upDoAtlas`). O número que importa
    // é `|direita| = |up × z| = sen(separação)`, que tem de ficar ordens
    // de grandeza acima do ruído de float32 — é a razão de a guarda
    // existir.
    const PISO_GRAUS = MIN_POLAR_RAD / GRAU - 1e-9;
    let pior = 180;
    for (const id of ['earth', 'moon']) {
      for (let d = 0; d < 366; d += 11) {
        const polo = poloDe(id, EPOCA_JD_TDB + d);
        for (const doSol of direcoesDoAno(5)) {
          const dir = direcaoDeRepouso(doSol.clone(), polo, new THREE.Vector3());
          const up = upDoAtlas(dir, polo, new THREE.Vector3());
          pior = Math.min(pior, dir.angleTo(up) / GRAU);
        }
      }
    }
    expect(pior).toBeGreaterThan(PISO_GRAUS);
    expect(Math.sin(pior * GRAU)).toBeGreaterThan(0.09);
  });

  /**
   * ...E O DEDO NÃO PIORA ISSO, NUNCA — a razão de a varredura acima
   * poder parar no repouso.
   *
   * A câmera do Atlas é um CORPO RÍGIDO desde o item 102: a mira e o
   * `up` giram pela MESMA rotação, e rotação preserva ângulo. Então a
   * separação que o repouso tem é a separação que qualquer pose
   * arrastada tem — a degenerescência do `lookAt` deixou de ser
   * alcançável PELO DEDO, e passou a depender só da geometria do foco.
   *
   * Era exatamente o contrário antes: o `up` era recalculado depois do
   * giro, e o item 73 mediu o dedo levando a mira até a borda da calota.
   */
  it('...e o dedo NÃO muda essa separação — a câmera é corpo rígido', () => {
    const polo = poloDe('earth', EPOCA_JD_TDB);
    const doSol = direcoesDoAno(1)[0];
    const dirRepouso = direcaoDeRepouso(doSol.clone(), polo, new THREE.Vector3());
    const upRepouso = upDoAtlas(dirRepouso, polo, new THREE.Vector3());
    const separacao = dirRepouso.angleTo(upRepouso);
    const giro = new THREE.Quaternion();
    const passo = new THREE.Quaternion();
    for (let k = 0; k < 200; k += 1) {
      // um caminho torto de propósito: os dois eixos da tela, em passos
      // que não se anulam — é onde o roll se acumula
      passo.setFromAxisAngle(new THREE.Vector3(0.6, 0.8, 0), 7 * GRAU);
      giro.multiply(passo).normalize();
      const dir = dirRepouso.clone();
      const up = new THREE.Vector3();
      poseDoVisitante(dir, polo, giro, dir, up);
      expect(dir.angleTo(up)).toBeCloseTo(separacao, 9);
    }
  });

  it('a cedência sozinha PERSEGUIA a mira — é o `up` grampeado que fecha', () => {
    // o defeito que a varredura achou quando o cone morreu, reduzido ao
    // ponto exato: mira a 20° do eixo da Terra, no azimute da eclíptica.
    // `cede` vale 0,83 e põe o `up` cru a 19,4° do eixo — 0,6° da mira.
    const polo = poloDe('earth', EPOCA_JD_TDB);
    const rumo = POLO_ECLIPTICO.clone()
      .addScaledVector(polo, -POLO_ECLIPTICO.dot(polo))
      .normalize();
    const mira = polo
      .clone()
      .multiplyScalar(Math.cos(20 * GRAU))
      .addScaledVector(rumo, Math.sin(20 * GRAU))
      .normalize();
    const cede = THREE.MathUtils.smoothstep(
      Math.abs(mira.dot(polo)),
      Math.cos(CEDER_COMECA_GRAUS * GRAU),
      Math.cos(15 * GRAU)
    );
    const cru = polo.clone().lerp(POLO_ECLIPTICO, cede).normalize();
    expect(cru.angleTo(mira) / GRAU).toBeLessThan(1);
    // com o grampo, o `up` publicado nunca chega lá
    const up = upDoAtlas(mira, polo, new THREE.Vector3());
    expect(up.angleTo(mira)).toBeCloseTo(MIN_POLAR_RAD, 9);
    expect(up.length()).toBeCloseTo(1, 12);
  });

  it('o Director LIGA o polo do corpo nos dois degraus que o pedem', () => {
    // a fiação por texto-fonte: o rig honrar o polo não adianta nada se
    // ninguém o passar, e isso não é coisa que teste de unidade veja
    // (o Director precisa de WebGL). A fonte do dado é cobrada junto —
    // é a MESMA que orienta a malha, e uma segunda tabela de eixos aqui
    // faria a câmera e o planeta discordarem sem ninguém notar.
    //
    // QUEM MEDE O VALOR mora em `director/escada.test.ts` desde o item
    // 88: lá a escada roda com o rig REAL e o julgamento é o
    // `camera.up` publicado — Titã sobe com o eixo de Titã, e o
    // religador do relógio repete o mesmo alto de tela bit a bit. Esta
    // prova aqui ficou só com o que grep faz melhor que bancada: dizer
    // de que TABELA o eixo sai, e que os degraus de fora não pedem polo
    // nenhum.
    const ESCADA = readFileSync(
      new URL('../director/escada.ts', import.meta.url),
      'utf8'
    );
    expect(ESCADA).toContain(
      "import { baseCorpoEquatorial } from '../../lib/atlas/orientacao'"
    );
    // (a linha que casava 'polo: this.poloDoCorpo(id),' saiu: casava em
    // DOIS lugares e não mordia a reversão do item 88 — quem julga o
    // polo por VALOR é o dente de escada.test.ts)
    // ...e os degraus de fora NÃO o pedem: lá o assunto é o plano do
    // sistema, e o eixo de um corpo qualquer não governa o horizonte
    const sistema = ESCADA.slice(
      ESCADA.indexOf('  focarNoSistema() {'),
      ESCADA.indexOf('private rampaDaEscada()')
    );
    expect(sistema).not.toContain('polo:');
  });

  it('o rig honra o polo pedido — e sem pedido continua a eclíptica', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1000);
    const rig = new AtlasRig();
    const alvo = new THREE.Vector3(1e-6, 2e-6, 0.5e-6);
    rig.focar(alvo, 1e-9);
    rig.apply(camera);
    expect(camera.up.distanceTo(POLO_ECLIPTICO)).toBeLessThan(1e-12);
    const polo = poloDe('earth', EPOCA_JD_TDB);
    rig.focar(alvo, 1e-9, alvo, { polo });
    rig.apply(camera);
    expect(camera.up.distanceTo(polo.clone().normalize())).toBeLessThan(1e-12);
    // e o eixo do planeta NÃO é o da eclíptica: 23,4° de diferença — é
    // essa a torção que o visitante via no globo
    expect((polo.angleTo(POLO_ECLIPTICO) / GRAU).toFixed(1)).toBe('23.4');
  });
});

// ============================================================
// ONDA 7 — O ALVO VIVO. `focar` copiava a posição UMA VEZ e a câmera
// perseguia um ponto morto: com a máquina do tempo andando (116 dias de
// céu por segundo) a Terra saía do quadro em ~1 s. O religador é
// CORREÇÃO, não gesto — e a pose de PARTIDA da rampa tem de virar viva
// junto com o destino, senão a transição é reprojetada num referencial
// que se moveu.
// ============================================================
describe('o alvo vivo — recompor sem quebrar o que o visitante estava fazendo', () => {
  const cam = () => new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1000);
  const direcaoDa = (c: THREE.PerspectiveCamera, rig: AtlasRig) =>
    c.position.clone().sub(rig.alvo).normalize();

  it('o arrasto do visitante SOBREVIVE — `focar` é que o zera', () => {
    const camera = cam();
    const rig = new AtlasRig();
    const casa = orbitaMaisExterna();
    noSistemaInteiro(rig);
    rig.addOrbitDelta(300, 120);
    rig.apply(camera);
    const antes = direcaoDa(camera, rig);
    // recompor o MESMO enquadramento não pode mover um bit: o eixo solar
    // é o mesmo e a órbita do dedo continua onde estava
    rig.recompor(new THREE.Vector3(0, 0, 0), casa.raio, casa.posicao);
    rig.apply(camera);
    expect(direcaoDa(camera, rig).distanceTo(antes)).toBeLessThan(1e-12);
    // ...e o GESTO, esse sim, devolve o alvo ao pino de 30°
    rig.focar(new THREE.Vector3(0, 0, 0), casa.raio, casa.posicao);
    rig.apply(camera);
    expect(direcaoDa(camera, rig).distanceTo(antes)).toBeGreaterThan(1e-3);
  });

  it('recompor não reinicia a rampa entre degraus', () => {
    const camera = cam();
    const rig = new AtlasRig();
    const a = new THREE.Vector3(1e-6, 0, 0);
    const b = new THREE.Vector3(1e-6, 1e-8, 0);
    rig.focar(a, 1e-8);
    rig.apply(camera);
    rig.focar(b, 1e-9, b, { rampa: true });
    // a duração é a que a travessia escolheu (item 110) — o teste anda
    // em metades DELA, não da constante
    const dur = rig.duracaoDaRampa;
    rig.apply(camera, 1, LARGURA_DE_MESA_PX, dur / 2);
    expect(rig.animando).toBe(true);
    rig.recompor(b, 1e-9, b);
    expect(rig.animando).toBe(true);
    // a segunda metade ainda termina a rampa: o relógio dela não voltou
    rig.apply(camera, 1, LARGURA_DE_MESA_PX, dur / 2);
    expect(rig.animando).toBe(false);
  });

  it('com a rampa VIVA, o religador não dá guinada — a partida anda junto', () => {
    // as escalas são as REAIS da troca corpo→lua, que é onde a razão
    // aperta: a Lua está a 1,25e-8 pc do enquadramento da Terra e a
    // Terra anda 1,6e-7 pc por quadro a 116 dias de céu por segundo —
    // 13× mais do que a distância que a rampa está interpolando.
    const UA_PC = 4.84813681e-6;
    const RAIO_TERRA_PC = 2.0676e-10; // 6.378,1 km
    const RAIO_LUA_PC = 5.6297e-11; // 1.737,4 km
    const LUA_PC = 1.2464e-8; // 384.400 km
    const terra = new THREE.Vector3(UA_PC, 0, 0);
    const lua = terra.clone().add(new THREE.Vector3(0, LUA_PC, 0));
    const passo = new THREE.Vector3(0, 0, 1.6e-7); // um quadro de relógio

    // CONTROLE: a mesma recomposição com a rampa PARADA. O que ela mexe
    // é só o que é real — o eixo solar do alvo girou 1,9° com o passo.
    const camControle = cam();
    const controle = new AtlasRig();
    controle.focar(lua, RAIO_LUA_PC, lua, { pai: terra });
    controle.apply(camControle);
    const antesControle = direcaoDa(camControle, controle);
    controle.recompor(
      lua.clone().add(passo),
      RAIO_LUA_PC,
      lua.clone().add(passo),
      { pai: terra.clone().add(passo) }
    );
    controle.apply(camControle);
    const puro = antesControle.angleTo(direcaoDa(camControle, controle));
    expect(puro).toBeGreaterThan(1e-3); // o controle mede alguma coisa

    // O CASO: a mesma recomposição no meio da rampa corpo→lua
    const camera = cam();
    const rig = new AtlasRig();
    rig.focar(terra, RAIO_TERRA_PC, terra);
    rig.apply(camera);
    rig.focar(lua, RAIO_LUA_PC, lua, { rampa: true, pai: terra });
    rig.apply(camera, 1, LARGURA_DE_MESA_PX, RAMPA_DO_DEGRAU_S / 2);
    const antes = direcaoDa(camera, rig);
    rig.recompor(lua.clone().add(passo), RAIO_LUA_PC, lua.clone().add(passo), {
      pai: terra.clone().add(passo),
    });
    rig.apply(camera, 1, LARGURA_DE_MESA_PX, 0); // dt = 0: o mesmo ponto da rampa
    const naRampa = antes.angleTo(direcaoDa(camera, rig));
    // a rampa não AMPLIFICA a correção. Com a partida congelada, a
    // direção `(posPartida − alvo)` seria reprojetada num alvo que
    // andou 13× a própria distância e a câmera daria uma guinada de
    // dezenas de graus; com ela transladada pelo mesmo delta, a rampa
    // só vê a mudança do destino.
    // A SEPARAÇÃO É MEDIDA, e é enorme: com a partida transladada pelo
    // mesmo delta a câmera gira 1,87°; com ela congelada — a direção
    // `(posPartida − alvo)` reprojetada num alvo que andou 13× a
    // própria distância — gira 95,2°. A rampa vira teletransporte.
    expect(THREE.MathUtils.radToDeg(naRampa)).toBeLessThan(5);
    expect(THREE.MathUtils.radToDeg(naRampa)).toBeGreaterThan(0);
  });

  it('o Director religa o enquadramento quando o relógio anda, uma vez por instante', () => {
    const DIRECTOR = readFileSync(new URL('../director.ts', import.meta.url), 'utf8');
    // o limite de frequência é o INSTANTE e não um teto em ms: a 116
    // dias/s um teto de 10 Hz deixaria 29 milhões de km de Terra entre
    // correções, contra um enquadramento de 25 mil km
    expect(DIRECTOR).toContain('if (jdAgora !== this.jdDoEnquadre)');
    expect(DIRECTOR).toContain('this.recomporAlvo();');
    // e ele vem ANTES da escrita da câmera no mesmo tick
    expect(DIRECTOR.indexOf('this.recomporAlvo();')).toBeLessThan(
      DIRECTOR.indexOf('this.atlas.apply(cam,')
    );
    // o religador NÃO passa pelo caminho do gesto (que zera o arrasto,
    // derruba a LUT do raymarch e reinicia a contagem da captura) — o
    // corpo dele mora na escada (corte 9); a costura do tick fica acima
    const ESCADA = readFileSync(
      new URL('../director/escada.ts', import.meta.url),
      'utf8'
    );
    const corpo = ESCADA.slice(
      ESCADA.indexOf('  recomporAlvo() {'),
      ESCADA.indexOf('  subirDegrau()')
    );
    expect(corpo).toContain('this.atlas.recompor(');
    expect(corpo).not.toContain('this.teletransportou()');
    expect(corpo).not.toContain('this.atlas.focar(');
  });
});

describe('a rampa entre degraus do rig (F2b/D7)', () => {
  const cam = () => new THREE.PerspectiveCamera(35, 1.6, 1e-9, 100);

  it('sem rampa o apply é a pose pura de sempre — bit a bit', () => {
    const a = cam();
    const b = cam();
    const rig1 = new AtlasRig();
    noSistemaInteiro(rig1);
    rig1.apply(a);
    const rig2 = new AtlasRig();
    noSistemaInteiro(rig2);
    rig2.apply(b, 1, LARGURA_DE_MESA_PX, 0.016); // dt não muda nada fora da rampa
    expect(a.position.equals(b.position)).toBe(true);
    expect(a.quaternion.equals(b.quaternion)).toBe(true);
  });

  it('a rampa TERMINA na pose exata do destino — ?foco= continua reproduzível', () => {
    const seco = cam();
    const rigSeco = new AtlasRig();
    noSistemaInteiro(rigSeco);
    const alvo = new THREE.Vector3(1e-6, 2e-6, 0.5e-6);
    rigSeco.focar(alvo, 1e-7);
    rigSeco.apply(seco);

    const animado = cam();
    const rig = new AtlasRig();
    noSistemaInteiro(rig);
    rig.apply(animado);
    rig.focar(alvo, 1e-7, alvo, { rampa: true });
    expect(rig.animando).toBe(true);
    const dur = rig.duracaoDaRampa;
    // meio da rampa: a câmera está ENTRE as poses (nem lá nem cá)
    rig.apply(animado, 1, LARGURA_DE_MESA_PX, dur / 2);
    expect(animado.position.equals(seco.position)).toBe(false);
    // fim: os passos somam a duração e a pose é a PURA, bit a bit
    rig.apply(animado, 1, LARGURA_DE_MESA_PX, dur);
    expect(rig.animando).toBe(false);
    rig.apply(animado, 1, LARGURA_DE_MESA_PX, 0.016);
    expect(animado.position.equals(seco.position)).toBe(true);
    expect(animado.quaternion.equals(seco.quaternion)).toBe(true);
  });

  it('a duração é a da travessia — cruzar o céu demora mais que mergulhar (item 110)', () => {
    // palavras dele (29/08): "hoje parece que há um salto abrupto". O
    // conserto: a rampa dura conforme o gesto — PAN (radianos que a
    // mira varre) e ZOOM (décadas de distância) somam tempo sobre o
    // piso de meio segundo, até o teto. Reverter para 0,5 s fixos
    // reprova as três réguas abaixo.

    // o MERGULHO: da abertura para um corpo quase no centro do quadro —
    // pan mínimo, zoom manda; fica perto do piso, nunca abaixo dele
    const mergulho = new AtlasRig();
    noSistemaInteiro(mergulho);
    mergulho.apply(cam());
    const alvoAoCentro = new THREE.Vector3(1e-6, 0, 0);
    mergulho.focar(alvoAoCentro, 1e-7, alvoAoCentro, { rampa: true });
    const doMergulho = mergulho.duracaoDaRampa;
    expect(doMergulho).toBeGreaterThanOrEqual(RAMPA_DO_DEGRAU_S);
    expect(doMergulho).toBeLessThan(1.5);

    // a TRAVESSIA: a câmera COLADA num corpo e o gesto pede outro, bem
    // do lado — a mira varre um ângulo grande e o tempo cresce
    const travessia = new AtlasRig();
    const corpoA = new THREE.Vector3(1e-6, 0, 0);
    travessia.focar(corpoA, 1e-9, corpoA);
    travessia.apply(cam());
    const corpoB = new THREE.Vector3(0, 1e-6, 0);
    travessia.focar(corpoB, 1e-9, corpoB, { rampa: true });
    const daTravessia = travessia.duracaoDaRampa;
    expect(daTravessia).toBeGreaterThan(doMergulho);
    expect(daTravessia).toBeLessThanOrEqual(RAMPA_MAX_S);

    // ...e a rampa mais longa TERMINA exata como sempre (t ≥ 1 escreve
    // a conta pura): a travessia muda o relógio, não o destino
    const chegada = cam();
    travessia.apply(chegada, 1, LARGURA_DE_MESA_PX, daTravessia);
    expect(travessia.animando).toBe(false);
    const seco = cam();
    const rigSeco = new AtlasRig();
    rigSeco.focar(corpoA, 1e-9, corpoA);
    rigSeco.apply(seco);
    rigSeco.focar(corpoB, 1e-9, corpoB);
    rigSeco.apply(seco);
    travessia.apply(chegada, 1, LARGURA_DE_MESA_PX, 0.016);
    expect(chegada.position.equals(seco.position)).toBe(true);
    expect(chegada.quaternion.equals(seco.quaternion)).toBe(true);
  });

  it('a re-mira da SELEÇÃO desliza — e re-selecionar o mesmo alvo é seco (item 110)', () => {
    // medido antes do conserto: escolher uma estrela estando no degrau
    // corpo girava a vista 45,5° num único quadro. Com `rampa: true` a
    // mesma troca desliza — e o DESTINO é bit a bit o da seleção seca,
    // que é o que a prova do smoke ("a câmera não sai do lugar") mede.
    const corpoA = new THREE.Vector3(1e-6, 0, 0);
    const estrela = new THREE.Vector3(0.4, 0.9, 0);

    const seco = cam();
    const rigSeco = new AtlasRig();
    rigSeco.focar(corpoA, 1e-9, corpoA);
    rigSeco.apply(seco);
    rigSeco.selecionar(estrela, 0.05, estrela);
    rigSeco.apply(seco);

    const animado = cam();
    const rig = new AtlasRig();
    rig.focar(corpoA, 1e-9, corpoA);
    rig.apply(animado);
    const antes = animado.quaternion.clone();
    rig.selecionar(estrela, 0.05, estrela, { rampa: true });
    expect(rig.animando).toBe(true);
    const dur = rig.duracaoDaRampa;
    expect(dur).toBeGreaterThanOrEqual(RAMPA_DO_DEGRAU_S);
    // meio da rampa: a vista está ENTRE as miras, não já na nova
    rig.apply(animado, 1, LARGURA_DE_MESA_PX, dur / 2);
    expect(animado.quaternion.equals(antes)).toBe(false);
    expect(animado.quaternion.equals(seco.quaternion)).toBe(false);
    // fim: a pose PURA da seleção de sempre, bit a bit
    rig.apply(animado, 1, LARGURA_DE_MESA_PX, dur);
    expect(rig.animando).toBe(false);
    rig.apply(animado, 1, LARGURA_DE_MESA_PX, 0.016);
    expect(animado.position.equals(seco.position)).toBe(true);
    expect(animado.quaternion.equals(seco.quaternion)).toBe(true);

    // re-selecionar o alvo que JÁ se olha não balança um bit
    rig.selecionar(estrela, 0.05, estrela, { rampa: true });
    expect(rig.animando).toBe(false);
  });

  it('focar o MESMO alvo com rampa é no-op — nem reinicia a animação', () => {
    const rig = new AtlasRig();
    noSistemaInteiro(rig);
    rig.apply(cam());
    const alvo = new THREE.Vector3(1e-6, 0, 0);
    rig.focar(alvo, 1e-7, alvo, { rampa: true });
    rig.apply(cam(), 1, LARGURA_DE_MESA_PX, rig.duracaoDaRampa);
    expect(rig.animando).toBe(false);
    rig.focar(alvo, 1e-7, alvo, { rampa: true });
    expect(rig.animando).toBe(false);
  });
});

// ============================================================
// CLIQUE COM RAMPA EM VOO — a partida da rampa nova é a pose QUE ESTÁ
// NA TELA, não o estado do rig (que durante uma rampa é o DESTINO
// dela). Antes do conserto, o pedaço que faltava da rampa antiga
// acontecia num quadro de 16 ms — sonda mediu saltos de 50° a 128° — e
// o par canônico clique-escolhe + duplo-clique-mergulha caía SEMPRE
// nisso, porque a janela do duplo (0,5 s) é menor que a rampa da
// seleção. A régua de todas as provas: a rampa amaciada a 60 fps nunca
// passa de ~2°/quadro por construção, então 5°/quadro separa o deslize
// do salto com folga dos dois lados.
// ============================================================
describe('clique com rampa em voo — a partida é a pose da tela', () => {
  const cam = () => new THREE.PerspectiveCamera(35, 1.6, 1e-9, 100);
  const QUADRO_S = 1 / 60;
  /** avança `quadros` de 16 ms e devolve o MAIOR passo de orientação, em graus */
  const passoMaximo = (
    rig: AtlasRig,
    camera: THREE.PerspectiveCamera,
    quadros: number
  ) => {
    let maior = 0;
    const antes = camera.quaternion.clone();
    for (let i = 0; i < quadros; i++) {
      rig.apply(camera, 1, LARGURA_DE_MESA_PX, QUADRO_S);
      maior = Math.max(
        maior,
        THREE.MathUtils.radToDeg(antes.angleTo(camera.quaternion))
      );
      antes.copy(camera.quaternion);
    }
    return maior;
  };

  const corpoA = new THREE.Vector3(1e-6, 0, 0);
  const estrelaA = new THREE.Vector3(0.4, 0.9, 0);

  it('segundo clique em alvo NOVO no meio do deslize — sem salto por quadro', () => {
    const camera = cam();
    const rig = new AtlasRig();
    rig.focar(corpoA, 1e-9, corpoA);
    rig.apply(camera);
    rig.selecionar(estrelaA, 0.05, estrelaA, { rampa: true });
    // ~30% da primeira rampa — o clique chega com o deslize em voo
    const aTrinta = Math.max(1, Math.round((0.3 * rig.duracaoDaRampa) / QUADRO_S));
    let maior = passoMaximo(rig, camera, aTrinta);
    expect(rig.animando).toBe(true);
    const estrelaB = new THREE.Vector3(-0.9, 0.1, 0.3);
    rig.selecionar(estrelaB, 0.05, estrelaB, { rampa: true });
    const resto = Math.ceil(rig.duracaoDaRampa / QUADRO_S) + 2;
    maior = Math.max(maior, passoMaximo(rig, camera, resto));
    expect(rig.animando).toBe(false);
    // derivar a partida do ESTADO reprova aqui: a rampa nova nasceria no
    // FIM da antiga e o pedaço que faltava (~50°) entraria num quadro
    expect(maior).toBeLessThan(5);
    // ...e a chegada olha o alvo novo (a folga é o recentrar do HUD)
    const mira = camera.getWorldDirection(new THREE.Vector3());
    const ate = estrelaB.clone().sub(camera.position).normalize();
    expect(THREE.MathUtils.radToDeg(mira.angleTo(ate))).toBeLessThan(10);
  });

  it('o par canônico — clique escolhe, duplo clique mergulha — desliza inteiro', () => {
    const camera = cam();
    const rig = new AtlasRig();
    const planeta = new THREE.Vector3(4.6e-5, 0, 0);
    rig.focar(planeta, 2e-9, planeta);
    rig.apply(camera);
    const alvo = new THREE.Vector3(0, 1.4e-4, 0);
    rig.selecionar(alvo, 1e-8, alvo, { rampa: true });
    expect(rig.duracaoDaRampa).toBeGreaterThan(0.5); // a janela do duplo cabe dentro
    // ~350 ms depois (a janela do duplo clique) vem o mergulho
    let maior = passoMaximo(rig, camera, 21);
    expect(rig.animando).toBe(true);
    rig.focar(alvo, 1e-8, alvo, { rampa: true });
    const resto = Math.ceil(rig.duracaoDaRampa / QUADRO_S) + 2;
    maior = Math.max(maior, passoMaximo(rig, camera, resto));
    expect(rig.animando).toBe(false);
    expect(maior).toBeLessThan(5);
    // o destino é o PRESET de sempre, bit a bit — a rampa muda o
    // caminho, nunca a chegada
    const seco = cam();
    const rigSeco = new AtlasRig();
    rigSeco.focar(alvo, 1e-8, alvo);
    rigSeco.apply(seco);
    expect(camera.position.equals(seco.position)).toBe(true);
    expect(camera.quaternion.equals(seco.quaternion)).toBe(true);
  });

  it('re-clicar o MESMO alvo no meio do deslize não teleporta', () => {
    const camera = cam();
    const rig = new AtlasRig();
    rig.focar(corpoA, 1e-9, corpoA);
    rig.apply(camera);
    rig.selecionar(estrelaA, 0.05, estrelaA, { rampa: true });
    const aMeio = Math.round((0.4 * rig.duracaoDaRampa) / QUADRO_S);
    let maior = passoMaximo(rig, camera, aMeio);
    expect(rig.animando).toBe(true);
    // antes do conserto a pose derivada do estado dava pan≈0, caía no
    // ramo seco e o quadro seguinte escrevia o DESTINO — o pedaço que
    // faltava da re-mira (~40°) virava teleporte
    rig.selecionar(estrelaA, 0.05, estrelaA, { rampa: true });
    expect(rig.animando).toBe(true);
    maior = Math.max(
      maior,
      passoMaximo(rig, camera, Math.ceil(rig.duracaoDaRampa / QUADRO_S) + 2)
    );
    expect(rig.animando).toBe(false);
    expect(maior).toBeLessThan(5);
    // a chegada é a da seleção de sempre: mesma posição (a câmera não
    // saiu do lugar), dentro do resto de float da conta fechada
    const seco = cam();
    const rigSeco = new AtlasRig();
    rigSeco.focar(corpoA, 1e-9, corpoA);
    rigSeco.apply(seco);
    rigSeco.selecionar(estrelaA, 0.05, estrelaA);
    rigSeco.apply(seco);
    expect(camera.position.distanceTo(seco.position)).toBeLessThan(
      1e-9 * seco.position.length()
    );
  });

  it('a roda no meio do deslize re-mira o DESTINO — o estalo não se perde', () => {
    const camera = cam();
    const rig = new AtlasRig();
    rig.focar(corpoA, 1e-9, corpoA);
    rig.apply(camera);
    rig.selecionar(estrelaA, 0.05, estrelaA, { rampa: true });
    const aTrinta = Math.round((0.3 * rig.duracaoDaRampa) / QUADRO_S);
    let maiorGiro = passoMaximo(rig, camera, aTrinta);
    expect(rig.animando).toBe(true);
    // o gesto da roda: antes do conserto `pinarDistancia` recusava
    // durante a rampa e o estalo — já consumido por gestos.ts — sumia
    const antes = rig.distancia;
    rig.pinarDistancia(antes * 0.5);
    expect(rig.distancia / (antes * 0.5)).toBeCloseTo(1, 10);
    // ...e o deslize continua rumo à distância corrigida, sem salto:
    // nem de orientação, nem de zoom — o passo de distância por quadro
    // fica abaixo de UM estalo assentado (PASSO_LOG_LONGE = 0,2 década;
    // medido: 0,068 no quadro do pino, o resto ≪ isso)
    let maiorZoom = 0;
    let dAntes = camera.position.distanceTo(rig.alvo);
    const resto = Math.ceil(rig.duracaoDaRampa / QUADRO_S) + 2;
    for (let i = 0; i < resto; i++) {
      const antesQ = camera.quaternion.clone();
      rig.apply(camera, 1, LARGURA_DE_MESA_PX, QUADRO_S);
      maiorGiro = Math.max(
        maiorGiro,
        THREE.MathUtils.radToDeg(antesQ.angleTo(camera.quaternion))
      );
      const dAgora = camera.position.distanceTo(rig.alvo);
      maiorZoom = Math.max(maiorZoom, Math.abs(Math.log10(dAgora / dAntes)));
      dAntes = dAgora;
    }
    expect(rig.animando).toBe(false);
    expect(maiorGiro).toBeLessThan(5);
    expect(maiorZoom).toBeLessThan(0.1);
    // a distância final REFLETE o ajuste — o gesto chegou inteiro
    expect(camera.position.distanceTo(estrelaA) / (antes * 0.5)).toBeCloseTo(1, 10);
  });
});

// ============================================================
// O DEGRAU DO CORPO DO SOL — a escada do Atlas recusava exatamente um
// corpo, e era o da casa: `focarNoCorpo` desviava o Sol para a abertura
// ANTES de olhar o `ver`, então `?foco=sol&ver=corpo` não existia e o
// visitante não tinha caminho NENHUM até o Sol procedural. No teto
// (226,84 UA na época; 133,7 sob a lente de 58°) ele não tem corpo
// desenhado (o portão de 4 px desarma muitas UA antes) nem
// clarão de estrela (só começa em 0,02 pc): o que sobra é um ponto que
// o bloom espalha — a mancha branca da queixa do dono.
// ============================================================
describe('o degrau do CORPO DO SOL', () => {
  it('a distância NÃO é número novo: é o mesmo fator de enquadramento da abertura', () => {
    // a lei é `d = r·1,2/sen(θ/2)`, e ela não sabe de que corpo se
    // trata — o Sol entra nela pelo raio FÍSICO e sai a 6,40 raios
    // solares. Se alguém trocar isto por um literal "bonito", a razão
    // deixa de bater com a da abertura e este trilho quebra.
    const pedido = (rAlvo: number) =>
      enquadrar({
        rAlvo,
        fovDeg: ATLAS_FOV_GRAUS,
        aspect: 1,
        retanguloUtil: retanguloUtilDoAtlas(),
      }).distancia;
    const fatorSol = pedido(RAIO_DO_SOL_NA_CENA) / RAIO_DO_SOL_NA_CENA;
    const casa = orbitaMaisExterna();
    expect(fatorSol).toBeCloseTo(pedido(casa.raio) / casa.raio, 12);
    // MEDIDO sob a lente de 58° (29/08): 3,7741 raios solares = 2,63
    // milhões de km — mais perto ainda do lugar de onde o FILME já
    // filma o Sol (5,74 raios, 4,00 milhões de km, a vista `sol` do
    // gate de md5), a prova medida de que a composição aguenta esta
    // distância. Sob a lente antiga de 35° eram 6,4042 raios.
    expect(fatorSol).toBeCloseTo(3.7741, 4);
    const km = (pedido(RAIO_DO_SOL_NA_CENA) / RAIO_SOL_PC) * RAIO_SOL_KM;
    expect(km / 1e6).toBeCloseTo(2.628, 2);
    // e o Sol INTEIRO cabe no que sobra do quadro: a margem de 1,2 é
    // folga, não corte — ~30,7° de disco dentro do retângulo útil
    expect((2 * Math.asin(1 / fatorSol)) / GRAU).toBeCloseTo(30.73, 2);
  });

  it('descer da casa ao Sol é DOLLY PURO: a direção não se mexe um bit', () => {
    // é o que compra o eixo da abertura para o degrau do corpo: a rampa
    // atravessa quatro ordens de grandeza sem girar o visitante
    const camera = new THREE.PerspectiveCamera(112, 1.6, 1e-12, 100);
    const rig = new AtlasRig();
    const casa = orbitaMaisExterna();
    noSistemaInteiro(rig);
    rig.apply(camera);
    const deCasa = camera.position.clone().normalize();
    const distCasa = camera.position.length();
    // o degrau do corpo: MESMO alvo (a origem), MESMO eixo, raio do Sol
    rig.focar(new THREE.Vector3(0, 0, 0), RAIO_DO_SOL_NA_CENA, casa.posicao);
    rig.apply(camera);
    expect(camera.position.clone().normalize().distanceTo(deCasa)).toBeLessThan(1e-12);
    // só a distância muda — e muda ~7.609× (133,68 UA → 0,0176 UA sob a
    // lente de 58°); a razão é a das esferas e não sabe da lente, então
    // ela é a MESMA que valia a 35° (226,84 → 0,0298)
    expect(distCasa / camera.position.length()).toBeCloseTo(7609, -1);
    expect(camera.position.length() / RAIO_DO_SOL_NA_CENA).toBeCloseTo(3.7741, 4);
  });

  it('o Director lê o `ver` ANTES de desviar o Sol — e só o `corpo` desce', () => {
    const ESCADA = readFileSync(
      new URL('../director/escada.ts', import.meta.url),
      'utf8'
    );
    const corpo = ESCADA.slice(
      ESCADA.indexOf('  focarNoCorpo(id: string'),
      ESCADA.indexOf('  private poloDoCorpo(')
    );
    const ramo = corpo.slice(corpo.indexOf("if (id === 'sun')"));
    // o desvio deixou de ser incondicional: `corpo` desce, `orbita`
    // (o default, e a semântica de sempre de `?foco=sol`) volta para casa
    expect(ramo).toContain("if (ver === 'corpo') this.aproximarDoSol();");
    expect(ramo).toContain('else this.focarNoSistema();');
  });

  it('o enquadramento do Sol sai do raio ÚNICO, sem literal de distância e sem polo', () => {
    const ESCADA = readFileSync(
      new URL('../director/escada.ts', import.meta.url),
      'utf8'
    );
    // o vizinho de baixo era `escreverPosicaoDeLua`, que migrou para o
    // módulo dos rótulos (corte 7) — o delimitador seguiu o código
    const metodo = ESCADA.slice(
      ESCADA.indexOf('  private aproximarDoSol() {'),
      ESCADA.indexOf('  focarNaLua(')
    );
    expect(metodo).toContain('this.atlas.focar(');
    // o raio é a fonte única do tamanho do Sol (a MESMA que o palco e o
    // portão de 4 px leem), e o centro é a origem do frame heliocêntrico
    expect(metodo).toContain('this.solRaioPc');
    expect(metodo).toContain('ORIGEM,');
    // NENHUM número escolhido a olho: quem decide a distância é a lente
    expect(metodo).not.toMatch(/\d\.\d*e-\d|\d{3,}/);
    // e SEM polo do corpo: a malha do Sol é a do corpo procedural
    // transplantado (Y da cena + 7,25° em Z), não a do modelo IAU —
    // pedir o polo IAU aqui alinharia a câmera a um eixo que o Sol
    // desenhado não tem (a lei da Onda 7 vale onde câmera e malha leem
    // a MESMA fonte)
    expect(metodo).not.toContain('polo:');
    // o eixo é o da CASA, e é o que faz a descida ser um dolly puro
    expect(metodo).toContain('this.casaViva()?.eixo');
  });

  it('o degrau é alcançável por GESTO: clicar no Sol estando em casa desce', () => {
    const ESCADA = readFileSync(
      new URL('../director/escada.ts', import.meta.url),
      'utf8'
    );
    // o GESTO mudou de casa no corte do §11 (22/08): o hit-test, a
    // memória do clique e os dois cliques do Atlas moram em `escolha.ts`
    const ESCOLHA = readFileSync(
      new URL('../director/escolha.ts', import.meta.url),
      'utf8'
    );
    const visita = ESCOLHA.slice(
      ESCOLHA.indexOf('  mergulharNoEscolhido() {'),
      ESCOLHA.indexOf('  selecionarNoPonto(')
    );
    // O DUPLO CLIQUE É QUEM DESCE desde 22/08 (item 73): o clique
    // simples passou a ESCOLHER, e o degrau já é o do Sol quando o
    // segundo clique chega — por isso a condição de degrau saiu e o
    // `ver` passa a ser explícito. Sem isso `focarNoCorpo('sun')`
    // mandaria de volta para casa, que é o oposto do gesto.
    expect(visita).toContain(
      "if (escolha.id === 'sun') this.escada.focarNoCorpo('sun', 'corpo');"
    );
    // ...e o duplo clique em qualquer outro corpo desce pelo caminho de
    // sempre
    expect(visita).toContain('else this.escada.focarNoCorpo(escolha.id);');
    // e ele NÃO refaz o hit-test: escolher re-mira a câmera, e o rótulo
    // já não está debaixo do dedo quando o `dblclick` chega
    expect(visita).not.toContain('alvoNoPonto');
    // o gesto mora AQUI e não dentro de `focarNoCorpo`: a porta
    // `?foco=sol` também chama aquele método e chega com a abertura já
    // na tela — lá dentro as duas seriam indistinguíveis, e `?foco=sol`
    // (sem `ver=`) passaria a cair no Sol em vez da casa
    const foco = ESCADA.slice(
      ESCADA.indexOf('  focarNoCorpo(id: string'),
      ESCADA.indexOf('  private poloDoCorpo(')
    );
    expect(foco).not.toContain("degrau === 'sistema'");
  });

  it('o religador do relógio conhece o Sol — senão a câmera saltaria para a Terra', () => {
    const ESCADA = readFileSync(
      new URL('../director/escada.ts', import.meta.url),
      'utf8'
    );
    const vivo = ESCADA.slice(
      ESCADA.indexOf('  private enquadreVivo()'),
      ESCADA.indexOf('  private posicaoDesenhada(')
    );
    const ramo = vivo.slice(vivo.indexOf("if (degrau === 'corpo')"));
    // o ramo do Sol vem ANTES do de sempre (que só conhece os corpos com
    // efeméride e malha), e o Sol não anda: ele É a origem do frame
    // heliocêntrico. O ramo de sempre DEVOLVIA A TERRA em literal até
    // 24/08 — o defeito que punha a Terra em quadro com a ficha
    // anunciando Júpiter; hoje ele lê o corpo em foco, e quem julga isso
    // em câmera é `director/escada.test.ts`
    expect(ramo.indexOf("id === 'sun'")).toBeGreaterThan(-1);
    expect(ramo.indexOf("id === 'sun'")).toBeLessThan(ramo.indexOf('this.centroDoCorpo(id)'));
    const doSol = ramo.slice(ramo.indexOf("if (id === 'sun')"));
    expect(doSol).toContain('raio: this.solRaioPc,');
    expect(doSol).toContain('alvo: ORIGEM.clone(),');
    // e a efeméride que chega tarde reaplica o degrau do Sol pelo método
    // dele — `aproximarDoCorpo` só conhece mesh de planeta e sairia sem
    // fazer nada
    const tarde = ESCADA.slice(
      ESCADA.indexOf('  reenquadrarAposEfemeride()'),
      ESCADA.indexOf('  get corpos()')
    );
    expect(tarde).toContain("if (this.focoCorpoId === 'sun') this.aproximarDoSol();");
  });

  it('a SUBIDA sai do Sol pela escada de sempre — e a DESCIDA da roda morreu', () => {
    const ESCADA = readFileSync(
      new URL('../director/escada.ts', import.meta.url),
      'utf8'
    );
    // do degrau `corpo` a subida chama `focarNoCorpo(foco, 'orbita')`, e
    // para o Sol isso é a abertura — nenhum ramo novo precisou nascer
    const sobe = ESCADA.slice(
      ESCADA.indexOf('  subirDegrau(): boolean {'),
      ESCADA.indexOf('  reenquadrarAposEfemeride()')
    );
    expect(sobe).toContain("this.focarNoCorpo(this.focoCorpoId!, 'orbita');");
    // e `descerDegrau` não existe mais (item 73): ela era o consumidor
    // da roda, e ia para o literal do pai da única lua construída — a
    // roda "para dentro" na abertura escolhia um corpo que ninguém
    // pediu. Com a roda escrevendo distância, o método ficou sem
    // chamador e a descida virou o botão, o clique e o `?ver=corpo`.
    // (o NOME sobrevive na lápide do método; o que não pode voltar é a
    // declaração dele)
    expect(ESCADA).not.toContain('  descerDegrau(');
    expect(ESCADA.slice(ESCADA.indexOf('  subirDegrau'))).not.toContain('paiDaLua');
  });

  it('a abertura e o corpo do Sol leem UMA conta da DIREÇÃO privilegiada', () => {
    // duas contas seriam duas direções, e elas divergiriam no primeiro
    // salto de data — a descida deixaria de ser dolly puro sem aviso
    const ESCADA = readFileSync(
      new URL('../director/escada.ts', import.meta.url),
      'utf8'
    );
    expect(ESCADA.split('posicaoHeliocentrica(c.id, jd)').length - 1).toBe(1);
    const abertura = ESCADA.slice(
      ESCADA.indexOf('  focarNoSistema() {'),
      ESCADA.indexOf('  private rampaDaEscada()')
    );
    expect(abertura).toContain('this.casaViva() ??');
    expect(abertura.split('this.casaViva()').length - 1).toBe(1);

    // E O RAIO SAI DO MESMO CORPO QUE A DIREÇÃO (29/08) — o mais
    // externo, no mesmo `jd` e no mesmo laço. É a amarra que liga a
    // ESCADA à vista que ele escolheu pela folha do item 61: a abertura
    // é o sistema INTEIRO. Sem ela, pendurar o raio de volta em Marte
    // (a vista de 23/08–29/08) devolveria a abertura interna sem nenhum
    // trilho vermelho: os outros testes desta vista recebem a esfera
    // pela constante, não pela escada, e passariam iguais.
    const casaViva = ESCADA.slice(
      ESCADA.indexOf('  private casaViva()'),
      ESCADA.indexOf('  focarNoSistema() {')
    );
    expect(casaViva).toContain('raio: maisLonge * AU_PARA_PC');
    // a borda de Marte morreu com a escolha — nenhum sítio da escada
    // pode citá-la de novo
    expect(ESCADA).not.toContain('BORDA_DO_SISTEMA_INTERNO');
    // ...e o retrato congelado, o caminho SEM efeméride, tem de usar a
    // MESMA esfera do sistema inteiro — senão a vista muda quando a
    // rede cai. DOIS sítios: `focarNoSistema` e o degrau `sistema` do
    // POUSO, que o religador do relógio recompõe.
    expect(ESCADA.split('raio: orbitaMaisExterna().raio,').length - 1).toBe(2);
  });
});

// ============================================================
// OS DOIS DEFEITOS DECLARADOS DO DEGRAU DO SOL (`51d7777`), fechados em
// 2026-08-14. Nenhum dos dois era o que a nota do commit supunha, e por
// isso a causa medida está escrita ao lado de cada trilho:
//
//  1. "o rótulo diz FOBOS" NÃO era o degrau esquecendo de escrever o
//     foco — `aproximarDoSol` sempre escreveu `focoCorpoId = 'sun'`. Era
//     o CLIQUE lendo a lista inteira de rótulos projetados enquanto o
//     desenho joga fora quase tudo (pendência 30). A prova de
//     comportamento mora em `src/components/LabelCanvas.test.ts`; aqui
//     fica a fiação no Director, que o runner `node` não monta.
//  2. "`?foco=sol&ver=corpo` não desce" NÃO era o índice de busca
//     resolvendo o Sol como estrela — ele resolve como CORPO (`sun`,
//     score exato). Era a RAMPA: no boot a fase já é `atlas` quando o
//     App aplica o `?foco=`, então o deep-link animava a partir da
//     abertura em vez de nascer no degrau. Medido antes do conserto:
//     `rampaT = 0` e câmera parada em 226,845 UA com o degrau já
//     dizendo `corpo`/`sun`.
// ============================================================
describe('os dois defeitos declarados do degrau do Sol', () => {
  const DIRECTOR = readFileSync(new URL('../director.ts', import.meta.url), 'utf8');
  // o corte 9 moveu a escada para o módulo próprio: as fatias INTERNAS
  // (clique, rampa) leem escada.ts; as COSTURAS (setPhase, o somador do
  // tick, a ordem da entrada no modo) continuam lidas no director
  const ESCADA = readFileSync(
    new URL('../director/escada.ts', import.meta.url),
    'utf8'
  );

  it('o clique só mira rótulo DESENHADO — e descarta antes de medir distância', () => {
    // o hit-test virou peça própria em 22/08 (item 73): os DOIS gestos
    // do Atlas o leem — o clique que escolhe e o duplo que mergulha —,
    // e a lista continua sendo UMA (pendência 30). No corte do §11 a
    // peça foi com o GESTO para `escolha.ts`.
    const ESCOLHA = readFileSync(
      new URL('../director/escolha.ts', import.meta.url),
      'utf8'
    );
    const visita = ESCOLHA.slice(
      ESCOLHA.indexOf('  private alvoNoPonto('),
      ESCOLHA.indexOf('  tryVisit(')
    );
    expect(visita).toContain('if (label.desenhado === false) continue;');
    expect(visita).toContain('const dx = label.x - x;');
    // antes da conta de distância: um rótulo invisível não pode nem
    // disputar o desempate
    expect(visita.indexOf('label.desenhado === false')).toBeLessThan(
      visita.indexOf('const dx = label.x - x;')
    );
    // e o descarte é do `false` EXPLÍCITO: sem canvas de rótulos a marca
    // é `undefined` e vale a lista projetada, como sempre valeu
    expect(visita).not.toContain('if (!label.desenhado) continue;');
  });

  // A OUTRA METADE — que quem ESCREVE a marca é o desenho, no mesmo
  // objeto que o clique lê — vive em `components/LabelCanvas.test.ts`,
  // que é onde o duplo do canvas 2D já existe. Ela era medida AQUI
  // lendo o texto-fonte do laço, e em 24/08 (item 82) a leitura quebrou
  // por dois motivos que não mudavam promessa nenhuma: o laço passou a
  // ser indexado e a soleira de opacidade ganhou nome. Um dente que se
  // quebra quando o código melhora não estava medindo a promessa — ele
  // estava medindo a redação. Agora a mesma promessa é cobrada pelo
  // COMPORTAMENTO: nenhum rótulo sai do desenho sem resposta, e a
  // resposta é escrita no objeto que o Director guarda.

  it('a rampa exige um quadro do modo JÁ DESENHADO — o deep-link nasce seco', () => {
    const rampa = ESCADA.slice(
      ESCADA.indexOf('  private rampaDaEscada(): boolean {'),
      ESCADA.indexOf('  private get escada()')
    );
    expect(rampa).toContain('this.quadrosDaFase > 0');
    // a contagem zera na troca de fase e só soma DEPOIS do render — o
    // mesmo critério do sinal de prontidão (quadro desenhado, não
    // quadro agendado)
    const fase = DIRECTOR.slice(
      DIRECTOR.indexOf('  private setPhase(p: Phase) {'),
      DIRECTOR.indexOf('  get fase(): Phase {')
    );
    expect(fase).toContain('this.quadrosDaFase = 0;');
    const fim = DIRECTOR.slice(DIRECTOR.indexOf('    this.post.render(time);'));
    expect(fim.indexOf('this.quadrosDaFase++;')).toBeGreaterThan(0);
    expect(fim.indexOf('this.quadrosDaFase++;')).toBeLessThan(fim.indexOf('\n  }'));
  });

  it('a ENTRADA no modo continua seca pela ordem, sem depender da cláusula nova', () => {
    // `focarNoSistema()` ANTES de `setPhase('atlas')`: a fase velha já
    // derrubava a rampa, e é por isso que a abertura nunca animou. As
    // duas guardas convivem — tirar a ordem quebraria o `?atlas=1` puro
    const entrada = DIRECTOR.slice(
      DIRECTOR.indexOf('  entrarNoAtlas(opcoes:'),
      DIRECTOR.indexOf('  partirDoAtlas() {')
    );
    expect(entrada.indexOf('this.focarNoSistema();')).toBeLessThan(
      entrada.indexOf("this.setPhase('atlas');")
    );
  });
});

// ============================================================
// AS FAIXAS LARANJA (defeito 3 de `51d7777`), medidas e fechadas em
// 2026-08-14. A fita dos loops coronais devolvia ao clip um
// deslocamento multiplicado pelo `w` GRAMPEADO (`max(w, 0.01)`) em vez
// do `w` do próprio vértice. O piso de 0,01 é do app doador, onde o Sol
// media 2,2 unidades de MUNDO; nesta casa o grupo do Sol é escalado
// para parsec e o `w` de um vértice de loop vale ~1,4e-7 — o piso pega
// sempre e a fita de 3 px saía ~7e4 vezes maior, cruzando a tela.
// Só aparecia VIVO porque `?shot=` congela o tempo visual do Sol e
// nenhum loop chega a nascer nas capturas (pendência 11).
// ============================================================
describe('a fita dos loops coronais volta ao clip com o w certo', () => {
  const LOOPS = readFileSync(
    new URL('../world/sol/loops.js', import.meta.url),
    'utf8'
  );

  it('as DUAS fitas (emissiva e absorção) expandem pelo w do vértice', () => {
    const usos = LOOPS.split('nrm * (aSide * wpx * 2.0 / uRes) * clipA.w;').length - 1;
    expect(usos).toBe(2);
    // e nenhuma sobrou com o grampeado — é a linha que fazia a faixa
    expect(LOOPS).not.toContain('nrm * (aSide * wpx * 2.0 / uRes) * wA;');
  });

  it('o grampo continua onde ele é guarda de DIVISÃO, e só lá', () => {
    // `wA`/`wB` seguem protegendo os quocientes (vértice atrás da
    // câmera); o que mudou é o caminho de volta para clip
    expect(LOOPS).toContain('float wA = max(clipA.w, 0.01);');
    expect(LOOPS).toContain('float rawPx = uLoopW * pxScale / wA;');
  });
});


// ============================================================
// UM CLIQUE ESCOLHE, DOIS VÃO (item 73, 22/08). Trocar o alvo sem mexer
// na câmera é uma conta FECHADA: a mesma pose, escrita noutro
// referencial. O que se cobra aqui é a conta — o gesto vivo é do
// `atlas-smoke`, que é onde há ponteiro.
//
// A POSE PASSOU A TER TRÊS GRAUS DE LIBERDADE (item 102, 26/08): com o
// giro livre o alto da tela é escolha do visitante, não conta da casa, e
// "não mexer na câmera" passou a incluir "não endireitar o horizonte". É
// por isso que a inversa devolve um QUATERNION e não mais um par de
// ângulos — dois números não sabiam guardar o roll, e a seleção o perdia
// em silêncio.
// ============================================================
describe('a pose de volta — giroQueProduz inverte poseDoVisitante', () => {
  const eixos = [
    new THREE.Vector3(1e-5, 0, 0),
    new THREE.Vector3(-3e-6, 5e-6, 1e-6),
    new THREE.Vector3(0, 0, 2e-5),
    new THREE.Vector3(1e-6, -4e-6, -7e-6),
  ];
  const poloDaTerra = (() => {
    const p = baseCorpoEquatorial(IAU_ORIENTATIONS.earth, EPOCA_JD_TDB).polo;
    return new THREE.Vector3(p[0], p[1], p[2]).normalize();
  })();
  const polos = [POLO_ECLIPTICO, poloDaTerra];

  /** um giro qualquer, montado como o dedo o monta: eixos da tela */
  const giroDeTeste = (emX: number, emY: number, roll: number) => {
    const q = new THREE.Quaternion();
    const p = new THREE.Quaternion();
    q.multiply(p.setFromAxisAngle(new THREE.Vector3(1, 0, 0), emX));
    q.multiply(p.setFromAxisAngle(new THREE.Vector3(0, 1, 0), emY));
    q.multiply(p.setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll));
    return q.normalize();
  };

  it('ida e volta: a POSE que sai é a pose que entrou — mira e horizonte', () => {
    const repouso = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const up = new THREE.Vector3();
    const devoltaDir = new THREE.Vector3();
    const devoltaUp = new THREE.Vector3();
    const giroDeVolta = new THREE.Quaternion();
    let piorDir = 0;
    let piorUp = 0;
    for (const eixo of eixos) {
      for (const polo of polos) {
        for (let ia = 0; ia <= 8; ia++) {
          for (let iv = 0; iv <= 8; iv++) {
            const giro = giroDeTeste(
              (-180 + (ia * 360) / 8) * GRAU,
              (-180 + (iv * 360) / 8) * GRAU,
              // um roll de verdade no meio: é ELE que a inversa antiga
              // jogava fora, e é ele que o clique tem de preservar
              (ia * 37 - 100) * GRAU
            );
            direcaoDeRepouso(eixo, polo, repouso);
            dir.copy(repouso);
            poseDoVisitante(dir, polo, giro, dir, up);
            giroQueProduz(dir, up, repouso, polo, giroDeVolta);
            devoltaDir.copy(repouso);
            poseDoVisitante(devoltaDir, polo, giroDeVolta, devoltaDir, devoltaUp);
            // a CORDA, não `angleTo`: aquele passa por `acos` e não
            // consegue medir abaixo de ~1,5e-8 rad (o erro do `acos`
            // perto de 1 é `√ε`), que é justamente a faixa em que a
            // conta fechada trabalha. Para ângulos pequenos a corda É o
            // ângulo, e ela se mede por subtração, sem `acos` nenhum.
            piorDir = Math.max(piorDir, dir.distanceTo(devoltaDir));
            piorUp = Math.max(piorUp, up.distanceTo(devoltaUp));
          }
        }
      }
    }
    // 648 poses × 8 referenciais: MEDIDO 1,20e-14 de corda no pior caso
    // (mira) e 1,16e-14 no `up` — é conta fechada, não busca. O caminho
    // passa por uma base de câmera, um `setFromRotationMatrix` e dois
    // produtos de quaternion, e é daí que vem o punhado de ULPs; a régua
    // antiga, com dois `atan2`, media 1e-14.
    //
    // O TETO É FOLGADO DE PROPÓSITO (4× o medido): este número é soma de
    // ULPs e anda com a máquina, e um teto colado no medido reprovaria
    // noutra arquitetura sem nada ter piorado. Ele ainda morde o que
    // importa — trocar o `atan2` por `acos` custava 1e-6 rad, OITO
    // ordens de grandeza acima daqui, e 1e-6 rad na abertura são 33 mil
    // km de câmera num gesto que promete não mover nada.
    expect(piorDir).toBeLessThan(5e-14);
    expect(piorUp).toBeLessThan(5e-14);
  });

  /**
   * O ROLL SOBREVIVE À VOLTA, e este trilho é o que a inversa antiga não
   * podia passar: `(altura, volta)` eram dois números para uma pose de
   * três graus de liberdade, então o alto da tela era recalculado pela
   * lei da casa a cada seleção — quem tivesse inclinado o horizonte via
   * a imagem endireitar sozinha, com "não mexe na câmera" escrito ao
   * lado.
   */
  it('o ROLL atravessa a volta — a promessa "não mexe na câmera" inteira', () => {
    const polo = poloDaTerra;
    const eixo = eixos[1];
    const repouso = new THREE.Vector3();
    direcaoDeRepouso(eixo, polo, repouso);
    for (const rollGraus of [7, 45, 120, -160]) {
      const giro = giroDeTeste(20 * GRAU, -35 * GRAU, rollGraus * GRAU);
      const dir = repouso.clone();
      const up = new THREE.Vector3();
      poseDoVisitante(dir, polo, giro, dir, up);
      // o horizonte ESTÁ torto — senão o trilho não julgaria nada
      const torto = Math.abs(desvioDaOrientacao(dir, up, polo)) / GRAU;
      expect(torto).toBeGreaterThan(1);
      const devolta = new THREE.Quaternion();
      giroQueProduz(dir, up, repouso, polo, devolta);
      const dir2 = repouso.clone();
      const up2 = new THREE.Vector3();
      poseDoVisitante(dir2, polo, devolta, dir2, up2);
      // ...e o mesmo torto do outro lado, não um horizonte endireitado
      expect(Math.abs(desvioDaOrientacao(dir2, up2, polo)) / GRAU).toBeCloseTo(torto, 9);
    }
  });

  it('a pose de repouso volta como a identidade, a menos de ULPs', () => {
    // é o que faz `pousar` num enquadramento puro devolver a vista de
    // repouso: a volta tem de reconhecer o repouso como "dedo nenhum".
    //
    // MEDIDO NA POSE E NÃO NO QUATERNION, e a razão é a mesma que esta
    // bancada já declara duas vezes: `Quaternion.angleTo` passa por
    // `acos` e perde METADE dos dígitos perto de 1 — ele relata 3e-8
    // para um quaternion que está a 1e-16 da identidade. O que importa é
    // a pose que sai, e ela se mede por subtração de vetor.
    const repouso = new THREE.Vector3();
    const up = new THREE.Vector3();
    const giro = new THREE.Quaternion();
    const dir2 = new THREE.Vector3();
    const up2 = new THREE.Vector3();
    let pior = 0;
    for (const eixo of eixos) {
      for (const polo of polos) {
        direcaoDeRepouso(eixo, polo, repouso);
        upDoAtlas(repouso, polo, up);
        giroQueProduz(repouso, up, repouso, polo, giro);
        // as três componentes imaginárias são o seno de meio ângulo: a
        // 1e-8 delas corresponde 2e-8 rad, ou 4 milissegundos de arco
        expect(Math.abs(giro.x)).toBeLessThan(1e-8);
        expect(Math.abs(giro.y)).toBeLessThan(1e-8);
        expect(Math.abs(giro.z)).toBeLessThan(1e-8);
        dir2.copy(repouso);
        poseDoVisitante(dir2, polo, giro, dir2, up2);
        pior = Math.max(pior, dir2.distanceTo(repouso), up2.distanceTo(up));
      }
    }
    expect(pior).toBeLessThan(1e-14);
  });

  it('entradas impossíveis devolvem o repouso, nunca NaN', () => {
    const repouso = new THREE.Vector3();
    direcaoDeRepouso(eixos[0], POLO_ECLIPTICO, repouso);
    const giro = new THREE.Quaternion(0.1, 0.2, 0.3, 0.9).normalize();
    giroQueProduz(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
      repouso,
      POLO_ECLIPTICO,
      giro
    );
    expect(giro.x).toBe(0);
    expect(giro.y).toBe(0);
    expect(giro.z).toBe(0);
    expect(giro.w).toBe(1);
    // mira e `up` COLINEARES: não há base de câmera a montar, e a
    // resposta honesta é o repouso — nunca um quaternion com NaN dentro
    giroQueProduz(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(1, 0, 0),
      repouso,
      POLO_ECLIPTICO,
      giro
    );
    expect(Number.isFinite(giro.x + giro.y + giro.z + giro.w)).toBe(true);
    expect(giro.w).toBe(1);
  });
});

describe('selecionar — o alvo troca e a câmera NÃO sai do lugar', () => {
  const cam = () => new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1000);

  it('a posição da câmera é a MESMA depois de trocar de alvo', () => {
    const camera = cam();
    const rig = new AtlasRig();
    const casa = orbitaMaisExterna();
    rig.focar(new THREE.Vector3(), casa.raio, casa.posicao, {
      pisoRaio: RAIO_DO_SOL_NA_CENA,
    });
    rig.apply(camera);
    // um arrasto qualquer, para a pose não ser a de repouso
    rig.addOrbitDelta(213, -97);
    rig.apply(camera);
    const antes = camera.position.clone();
    // Netuno: o alvo mais externo do retrato, e o mais longe do Sol
    const netuno = RETRATO_2026.neptune;
    const eq = eclipticaParaEquatorial([netuno.rUA, 0, 0]);
    const alvo = new THREE.Vector3(eq[0], eq[1], eq[2]).multiplyScalar(AU_PARA_PC);
    rig.selecionar(alvo, alvo.length(), alvo, { pisoRaio: 1e-9 });
    rig.apply(camera);
    // 1e-12 pc são 0,2 metros: a câmera não se moveu
    expect(camera.position.distanceTo(antes)).toBeLessThan(1e-12 * antes.length());
    expect(rig.alvo.distanceTo(alvo)).toBe(0);
    // ...e a distância publicada é a distância REAL ao alvo novo
    expect(Math.abs(rig.distancia - antes.distanceTo(alvo)) / rig.distancia)
      .toBeLessThan(1e-9);
    expect(rig.distanciaEstaPinada).toBe(true);
  });

  it('selecionar duas vezes o MESMO alvo não anda — é o par do duplo clique', () => {
    const camera = cam();
    const rig = new AtlasRig();
    const casa = orbitaMaisExterna();
    rig.focar(new THREE.Vector3(), casa.raio, casa.posicao);
    rig.addOrbitDelta(-140, 61);
    rig.apply(camera);
    const alvo = casa.posicao.clone();
    rig.selecionar(alvo, alvo.length(), alvo);
    rig.apply(camera);
    const uma = camera.position.clone();
    const d1 = rig.distancia;
    rig.selecionar(alvo, alvo.length(), alvo);
    rig.apply(camera);
    // NÃO é bit a bit, e o número diz por quê: a volta pela conta
    // fechada perde os últimos bits de float (medido, 6,4e-19 pc — dois
    // centésimos de MICRÔMETRO), e é isso que sobra depois de a pose
    // atravessar acos/atan2 e voltar. O duplo clique dispara duas
    // seleções antes do mergulho, e as duas param no mesmo lugar.
    expect(camera.position.distanceTo(uma)).toBeLessThan(1e-15 * uma.length());
    expect(Math.abs(rig.distancia / d1 - 1)).toBeLessThan(1e-12);
  });

  it('a roda continua de onde a seleção parou, e o alvo é o NOVO', () => {
    const camera = cam();
    const rig = new AtlasRig();
    const casa = orbitaMaisExterna();
    rig.focar(new THREE.Vector3(), casa.raio, casa.posicao, {
      pisoRaio: RAIO_DO_SOL_NA_CENA,
    });
    rig.apply(camera);
    const alvo = casa.posicao.clone();
    const raioFisico = 2.5e-9;
    rig.selecionar(alvo, alvo.length(), alvo, { pisoRaio: raioFisico });
    rig.apply(camera);
    // o piso passou a ser o do corpo NOVO
    expect(rig.pisoDeZoom).toBeCloseTo(2 * raioFisico, 20);
    const antes = rig.distancia;
    rig.pinarDistancia(antes * 0.5);
    rig.apply(camera);
    expect(rig.distancia).toBeCloseTo(antes * 0.5, 20);
    // e a câmera está onde a distância publicada diz, medida ao alvo NOVO
    expect(camera.position.distanceTo(alvo)).toBeCloseTo(rig.distancia, 18);
  });

  it('o PAI morre na seleção — a mistura da lua é do preset', () => {
    const camera = cam();
    const rig = new AtlasRig();
    const alvo = new THREE.Vector3(1e-6, 2e-6, 0);
    const pai = new THREE.Vector3(1.1e-6, 2e-6, 0);
    rig.focar(alvo, 1e-11, alvo, { pai });
    rig.apply(camera);
    expect(rig.temPai).toBe(true);
    const antes = camera.position.clone();
    rig.selecionar(alvo, 1e-11, alvo);
    rig.apply(camera);
    expect(rig.temPai).toBe(false);
    // e mesmo com a mistura saindo de cena a câmera não se move: a pose
    // é resolvida contra a direção que ESTAVA na tela
    expect(camera.position.distanceTo(antes)).toBeLessThan(1e-12 * antes.length());
  });
});

// ============================================================
// O POUSO VINDO DO FILME (item 61, §2 — 2026-08-23). O portal deixou de
// jogar a câmera fora: `AtlasRig.pousar` é o irmão de `selecionar`, com
// a pose de partida chegando por argumento em vez de sair do rig.
// ============================================================
describe('pousar — o portal leva a câmera', () => {
  it('a POSE que veio de fora é a pose que a câmera escreve', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1e6);
    const rig = new AtlasRig();
    // uma posição arbitrária, fora do sistema: o degrau `céu`
    const pos = new THREE.Vector3(-447.7578554320078, -1203.9213299912858, -1415.640649901612);
    rig.pousar(pos, new THREE.Vector3(), pos.length(), pos);
    rig.apply(camera);
    expect(camera.position.distanceTo(pos) / pos.length()).toBeLessThan(1e-12);
  });

  it('o fov é o do Atlas no primeiro quadro — o corte que o véu cobre', () => {
    const camera = new THREE.PerspectiveCamera(70, 1.6, 1e-9, 1e6);
    const rig = new AtlasRig();
    const pos = new THREE.Vector3(0, 0, 3e-6);
    rig.pousar(pos, new THREE.Vector3(), pos.length(), pos);
    rig.apply(camera);
    expect(camera.fov).toBe(ATLAS_FOV_GRAUS);
  });

  it('a distância NÃO é grampeada: o rig ainda não tem réguas quando o pouso chega', () => {
    // é a única diferença de verdade contra `selecionar`. Rig recém-nascido
    // tem `distanciaEnquadrada` e `fatorDeEnquadramento` em zero, então o
    // teto do zoom é zero e o grampo puxaria a câmera para o piso no ato.
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1e6);
    const rig = new AtlasRig();
    const pos = new THREE.Vector3(0, 0, 0.13);
    rig.pousar(pos, new THREE.Vector3(), pos.length(), pos);
    expect(rig.distanciaEstaPinada).toBe(true);
    rig.apply(camera);
    expect(camera.position.length()).toBeCloseTo(0.13, 10);
  });

  it('com alvo e câmera no MESMO ponto cai no enquadramento, sem NaN', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1e6);
    const rig = new AtlasRig();
    rig.pousar(new THREE.Vector3(), new THREE.Vector3(), 1e-7, new THREE.Vector3(1, 0, 0));
    rig.apply(camera);
    expect(Number.isFinite(camera.position.x)).toBe(true);
    expect(rig.distanciaEstaPinada).toBe(false);
  });

  it('o EIXO vem de fora — é contra ele que a pose é guardada', () => {
    // o religador do relógio recompõe contra o eixo do DEGRAU; se o pouso
    // guardasse a órbita contra outro eixo, o primeiro tique giraria a
    // câmera. Aqui: mesma posição, dois eixos, duas órbitas — e cada uma
    // reproduz a MESMA pose quando o eixo dela é o usado.
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1e6);
    const pos = new THREE.Vector3(0.03, -0.05, 0.02);
    for (const eixo of [pos.clone(), new THREE.Vector3(1, 0.2, -0.4)]) {
      const rig = new AtlasRig();
      rig.pousar(pos, new THREE.Vector3(), pos.length(), eixo);
      rig.apply(camera);
      expect(camera.position.distanceTo(pos) / pos.length()).toBeLessThan(1e-12);
    }
  });

  it('a escada deriva o alvo em TRÊS degraus, e o `céu` anda no mesmo diff', () => {
    // o degrau `céu` sem o `pousar` não existe, e o `pousar` sem ele sai
    // mentindo: `tetoDeZoom` com o raio do sistema grampeia o pouso de
    // 26.911 pc em ~226,8 UA no primeiro gesto de roda
    const ESCADA = readFileSync(
      new URL('../director/escada.ts', import.meta.url),
      'utf8'
    );
    expect(ESCADA).toContain("degrau: 'ceu',");
    expect(ESCADA).toContain('raio: distancia,');
    // e o religador NÃO recompõe o degrau `céu` — a esfera do observador
    // não tem efeméride, e cair no ramo do sistema puxaria a câmera
    const vivo = ESCADA.slice(
      ESCADA.indexOf('  private enquadreVivo()'),
      ESCADA.indexOf('  private posicaoDesenhada(')
    );
    expect(vivo).toContain("if (degrau === 'ceu') return null;");
  });
});


// ============================================================
// A BÚSSOLA (item 102, 26/08) — o botão de zerar a orientação, a
// sugestão dele: "podemos colocar um botao de zerar orientacao, assim
// como o google maps tem um botao de norte".
//
// TRÊS COISAS A PROVAR, e a terceira é a que o desenho promete:
//  1. o desvio MEDE o que diz medir — zero no repouso, e o roll que se
//     pôs quando se põe um roll;
//  2. o botão acende e apaga COM HISTERESE, e não pisca em volta do
//     limiar;
//  3. endireitar zera o horizonte SEM mover a mira. É a lei do botão de
//     norte do Maps: ele acerta a bússola, não teletransporta o mapa.
// ============================================================
describe('a bússola — endireitar o horizonte sem mover a mira', () => {
  const polo = new THREE.Vector3(0, 0, 1);
  const eixo = new THREE.Vector3(1, 0, 0);

  it('no repouso o desvio é ZERO — a referência é o `up` da casa', () => {
    const dir = new THREE.Vector3();
    direcaoDeRepouso(eixo.clone(), polo, dir);
    const up = new THREE.Vector3();
    upDoAtlas(dir, polo, up);
    expect(desvioDaOrientacao(dir, up, polo)).toBe(0);
  });

  it('um roll puro mede EXATAMENTE o roll que se pôs', () => {
    const dir = new THREE.Vector3();
    direcaoDeRepouso(eixo.clone(), polo, dir);
    const up = new THREE.Vector3();
    for (const rollGraus of [3, 17, 90, 150, -40]) {
      const giro = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        rollGraus * GRAU
      );
      const d = dir.clone();
      poseDoVisitante(d, polo, giro, d, up);
      // a mira NÃO andou — roll é rotação em torno dela
      expect(d.distanceTo(dir)).toBeLessThan(1e-12);
      expect(Math.abs(desvioDaOrientacao(d, up, polo)) / GRAU).toBeCloseTo(
        Math.abs(rollGraus),
        9
      );
    }
  });

  it('o rig acende e apaga com HISTERESE — e não pisca no limiar', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1000);
    const rig = new AtlasRig();
    noSistemaInteiro(rig);
    rig.apply(camera, 1, LARGURA_DE_MESA_PX, 0);
    expect(rig.horizonteTorto).toBe(false);
    // um arrasto na diagonal acumula roll (a holonomia da esfera): é o
    // gesto real que acende a bússola, não um roll injetado à mão
    for (let i = 0; i < 40; i++) {
      rig.addOrbitDelta(30, 30);
      rig.apply(camera, 1, LARGURA_DE_MESA_PX, 0);
    }
    const torto = Math.abs(rig.desvioDoHorizonte) / GRAU;
    expect(torto).toBeGreaterThan(DESVIO_QUE_ACENDE_GRAUS);
    expect(rig.horizonteTorto).toBe(true);
    // A HISTERESE: entre os dois limiares o veredito NÃO troca — quem
    // já estava aceso continua aceso, e é isso que impede o pisca-pisca
    // enquanto o dedo anda em volta do número.
    expect(DESVIO_QUE_APAGA_GRAUS).toBeLessThan(DESVIO_QUE_ACENDE_GRAUS);
  });

  it('endireitar zera o horizonte e NÃO move a mira — em rampa', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1000);
    const rig = new AtlasRig();
    noSistemaInteiro(rig);
    rig.apply(camera, 1, LARGURA_DE_MESA_PX, 0);
    for (let i = 0; i < 40; i++) {
      rig.addOrbitDelta(30, 30);
      rig.apply(camera, 1, LARGURA_DE_MESA_PX, 0);
    }
    const antes = camera.position.clone();
    const desvioAntes = Math.abs(rig.desvioDoHorizonte);
    expect(desvioAntes / GRAU).toBeGreaterThan(DESVIO_QUE_ACENDE_GRAUS);

    rig.endireitar();
    // A RAMPA É DE VERDADE: no primeiro terço dela o horizonte ainda
    // está torto. Endireitar num quadro seria a imagem girando sozinha,
    // que é a queixa do item 102 posta ao contrário.
    rig.apply(camera, 1, LARGURA_DE_MESA_PX, ENDIREITAR_S / 3);
    expect(Math.abs(rig.desvioDoHorizonte)).toBeGreaterThan(0);
    expect(Math.abs(rig.desvioDoHorizonte)).toBeLessThan(desvioAntes);
    // ...e o botão fica ACESO enquanto ela corre, para o clique não
    // parecer que falhou
    expect(rig.horizonteTorto).toBe(true);

    // o resto da rampa
    for (let i = 0; i < 12; i++) rig.apply(camera, 1, LARGURA_DE_MESA_PX, ENDIREITAR_S / 6);
    expect(Math.abs(rig.desvioDoHorizonte) / GRAU).toBeLessThan(1e-6);
    expect(rig.horizonteTorto).toBe(false);
    // A MIRA NÃO ANDOU: é a promessa do botão de norte, e a régua é a
    // distância da câmera ao alvo em fração do raio.
    const depois = camera.position.clone();
    expect(depois.distanceTo(antes) / antes.length()).toBeLessThan(1e-9);
  });

  it('o arrasto CANCELA o endireitar — a vontade dele ganha da rampa', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1000);
    const rig = new AtlasRig();
    noSistemaInteiro(rig);
    rig.apply(camera, 1, LARGURA_DE_MESA_PX, 0);
    for (let i = 0; i < 40; i++) {
      rig.addOrbitDelta(30, 30);
      rig.apply(camera, 1, LARGURA_DE_MESA_PX, 0);
    }
    rig.endireitar();
    rig.apply(camera, 1, LARGURA_DE_MESA_PX, ENDIREITAR_S / 4);
    const noMeio = Math.abs(rig.desvioDoHorizonte);
    // o dedo entra no meio da rampa
    rig.addOrbitDelta(0, 5);
    rig.apply(camera, 1, LARGURA_DE_MESA_PX, ENDIREITAR_S / 4);
    // ...e a rampa PAROU onde estava, em vez de seguir endireitando: o
    // desvio não continuou caindo pelo caminho dela
    const depois = Math.abs(rig.desvioDoHorizonte);
    expect(depois).toBeGreaterThan(noMeio * 0.5);
    // e mais quadros sem dedo não retomam a rampa — ela morreu, não
    // ficou pendurada esperando
    rig.apply(camera, 1, LARGURA_DE_MESA_PX, ENDIREITAR_S);
    rig.apply(camera, 1, LARGURA_DE_MESA_PX, ENDIREITAR_S);
    expect(Math.abs(rig.desvioDoHorizonte)).toBeGreaterThan(noMeio * 0.5);
  });

  it('focar zera o giro — alvo novo nasce de pé', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1000);
    const rig = new AtlasRig();
    noSistemaInteiro(rig);
    for (let i = 0; i < 40; i++) rig.addOrbitDelta(30, 30);
    rig.apply(camera, 1, LARGURA_DE_MESA_PX, 0);
    expect(Math.abs(rig.desvioDoHorizonte) / GRAU).toBeGreaterThan(
      DESVIO_QUE_ACENDE_GRAUS
    );
    naAberturaDeProducao(rig);
    rig.apply(camera, 1, LARGURA_DE_MESA_PX, 0);
    expect(rig.desvioDoHorizonte).toBe(0);
    expect(rig.horizonteTorto).toBe(false);
  });
});
