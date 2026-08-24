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
  AtlasRig,
  LARGURA_DE_MESA_PX,
  LARGURA_UTIL_MINIMA_PX,
  MARGEM_DE_ENQUADRAMENTO,
  MAX_SOLAR_DEVIATION_GRAUS,
  MIN_POLAR_RAD,
  ORBITA_PARADA,
  ARRASTO_RAD_POR_PX,
  PARENT_FRAMING_BIAS,
  PHASE_OFFSET_GRAUS,
  POLO_ECLIPTICO,
  RETANGULO_CHEIO,
  RAMPA_DO_DEGRAU_S,
  BORDA_DO_SISTEMA_INTERNO,
  CEDER_COMECA_GRAUS,
  direcaoDaLua,
  direcaoPrivilegiada,
  upDoAtlas,
  enquadrar,
  orbitaMaisExterna,
  orbitaQueProduz,
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
 * A ABERTURA DE PRODUÇÃO (item 61) — a esfera é a borda do sistema
 * INTERNO, a direção continua saindo do corpo mais externo, e o piso do
 * zoom é o raio FÍSICO do Sol. É o estado em que `Escada.focarNoSistema`
 * deixa o rig, e o irmão de `noSistemaInteiro`: um é o TETO, o outro é o
 * lugar de onde o visitante parte.
 *
 * MORA AQUI porque eram estas seis linhas redigitadas em dois trilhos —
 * e trilho que redigita o estado acaba medindo estados diferentes com o
 * mesmo nome, que é exatamente a armadilha que aposentou o
 * `AtlasRig.focarNoSistema`.
 */
function naAberturaDeProducao(rig: AtlasRig) {
  rig.focar(
    new THREE.Vector3(),
    BORDA_DO_SISTEMA_INTERNO.raio,
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

describe('direcaoPrivilegiada — os 30° e o grampo dos 70°, do lado ACESO', () => {
  const polo = new THREE.Vector3(0, 0, 1);
  /** Sol→alvo: é o que a função recebe */
  const eixo = new THREE.Vector3(1, 0, 0);
  /** alvo→Sol: a direção ILUMINADA, e é dela que os ângulos se medem */
  const aceso = eixo.clone().negate();

  it('a câmera vai para o lado do SOL, não para além do alvo', () => {
    const out = new THREE.Vector3();
    direcaoPrivilegiada(eixo.clone(), polo, ORBITA_PARADA, out);
    // o produto escalar com o eixo Sol→alvo é NEGATIVO: pôr a câmera em
    // `alvo + out·d` a deixa entre o Sol e o alvo. Com o eixo sem negar,
    // este número seria +cos(30°) e todo enquadramento fotografaria o
    // lado escuro (fração iluminada 6,7% em vez de 93,3%).
    expect(out.dot(eixo)).toBeCloseTo(-Math.cos(PHASE_OFFSET_GRAUS * GRAU), 12);
    // a fração iluminada do disco, `(1+cos φ)/2`, com φ o ângulo de fase
    const fase = out.angleTo(aceso);
    expect((1 + Math.cos(fase)) / 2).toBeGreaterThan(0.93);
  });

  it('sem órbita do visitante, o desvio é o ângulo de fase herdado', () => {
    const out = new THREE.Vector3();
    direcaoPrivilegiada(eixo.clone(), polo, ORBITA_PARADA, out);
    expect(out.length()).toBeCloseTo(1, 12);
    expect(out.angleTo(aceso) / GRAU).toBeCloseTo(PHASE_OFFSET_GRAUS, 10);
  });

  it('a órbita do visitante soma — e o CONE morreu (item 73)', () => {
    const out = new THREE.Vector3();
    direcaoPrivilegiada(eixo.clone(), polo, { altura: 20 * GRAU, volta: 0 }, out);
    expect(out.angleTo(aceso) / GRAU).toBeCloseTo(PHASE_OFFSET_GRAUS + 20, 10);
    // O QUE MUDOU: 70° era o teto, e passar dele era impossível. Agora a
    // inclinação vai até 180° — o lado escuro visto de trás —, e é isso
    // que o dono pediu quando disse que a navegação virou um monstro.
    // 75° de inclinação: passa dos 70° do cone e ainda fica 15° fora da
    // calota do polo (aqui o polo é perpendicular à linha do Sol, então
    // inclinação de 90° seria o polo em cheio)
    direcaoPrivilegiada(eixo.clone(), polo, { altura: 45 * GRAU, volta: 0 }, out);
    expect(out.angleTo(aceso) / GRAU).toBeCloseTo(75, 10);
    expect(75).toBeGreaterThan(MAX_SOLAR_DEVIATION_GRAUS);
    direcaoPrivilegiada(eixo.clone(), polo, { altura: 400 * GRAU, volta: 0 }, out);
    expect(out.angleTo(aceso) / GRAU).toBeCloseTo(180, 6);
    // e o PISO continua sendo a fase cheia (0°), não −180°: a metade
    // negativa do arco é redundante com a volta de 360° (ver
    // `OrbitaDoVisitante`) — arrastar sem parar para cima para na linha
    // do Sol em vez de atravessá-la e inverter a horizontal
    direcaoPrivilegiada(eixo.clone(), polo, { altura: -400 * GRAU, volta: 0 }, out);
    expect(out.angleTo(aceso) / GRAU).toBeCloseTo(0, 10);
  });

  it('o grampo polar NÃO TOCA em nada dentro da faixa — bit a bit', () => {
    // é esta identidade que segura os md5 do `atlas-smoke` e toda vista
    // pinada: fora da calota o grampo devolve a direção sem escrever um
    // bit. Varre a esfera inteira, menos as duas calotas.
    const out = new THREE.Vector3();
    const referencia = new THREE.Vector3();
    for (let alt = -PHASE_OFFSET_GRAUS; alt <= 150; alt += 3) {
      for (let v = 0; v < 360; v += 11) {
        const orbita = { altura: alt * GRAU, volta: v * GRAU };
        // reconstrói pelo caminho SEM grampo (inclina, gira) e cobra
        // igualdade EXATA — nenhum `toBeCloseTo` aqui
        referencia.copy(eixo).negate().normalize();
        const linha = referencia.clone();
        const angulo = THREE.MathUtils.clamp(
          PHASE_OFFSET_GRAUS * GRAU + orbita.altura,
          0,
          Math.PI
        );
        const eixoDoGiro = new THREE.Vector3().crossVectors(referencia, polo).normalize();
        referencia.applyAxisAngle(eixoDoGiro, angulo);
        if (orbita.volta !== 0) referencia.applyAxisAngle(linha, orbita.volta);
        // a faixa se decide na direção CRUA: uma já grampeada pousa
        // exatamente na borda e passaria por "dentro" sem ser
        if (Math.abs(referencia.dot(polo)) > Math.cos(MIN_POLAR_RAD)) continue;
        direcaoPrivilegiada(eixo.clone(), polo, orbita, out);
        expect(out.x).toBe(referencia.x);
        expect(out.y).toBe(referencia.y);
        expect(out.z).toBe(referencia.z);
      }
    }
  });

  it('...e onde toca, para EXATAMENTE em MIN_POLAR — nunca atravessa', () => {
    const out = new THREE.Vector3();
    // o polo aqui é (0,0,1) e o eixo Sol→alvo é (1,0,0): a inclinação de
    // 90° põe a direção EM CIMA do polo, e a de 90°±ε dentro da calota
    for (const alt of [59.5, 60, 60.5, 119.5, 120, 120.5]) {
      direcaoPrivilegiada(eixo.clone(), polo, { altura: alt * GRAU, volta: 0 }, out);
      const polar = out.angleTo(polo);
      expect(Math.min(polar, Math.PI - polar)).toBeGreaterThanOrEqual(MIN_POLAR_RAD - 1e-12);
      expect(out.length()).toBeCloseTo(1, 12);
    }
    // `|up × z| = sen(φ)`, e é isso que separa o grampo do ruído de
    // float32 — o número que a docstring de MIN_POLAR_RAD declara
    expect(Math.sin(MIN_POLAR_RAD)).toBeCloseTo(0.0998, 4);
  });

  it('alvo em cima do polo não devolve NaN', () => {
    const out = new THREE.Vector3();
    direcaoPrivilegiada(polo.clone(), polo, ORBITA_PARADA, out);
    expect(out.length()).toBeCloseTo(1, 12);
    direcaoPrivilegiada(
      new THREE.Vector3(0, 0, 0),
      polo,
      { altura: Number.NaN, volta: Number.NaN },
      out
    );
    expect(out.length()).toBeCloseTo(1, 12);
  });
});

// ============================================================
// ONDA 7 — O ARRASTO DE DOIS EIXOS. O `dy` era calculado e jogado fora,
// e o eixo que existia subia em LATITUDE enquanto a dica prometia "girar
// em torno do alvo". Estas provas cobram as duas coisas que o conserto
// promete: que a volta seja de verdade (360°) e que ela NÃO compre nem
// um grau de sombra — que é o que autoriza o grampo de 70° a continuar
// escrito do jeito que está.
// ============================================================
describe('o arrasto de dois eixos — a volta em torno da linha alvo→Sol', () => {
  const polo = new THREE.Vector3(0, 0, 1);
  const doSol = new THREE.Vector3(0.6, -0.8, 0).normalize(); // Sol→alvo
  const aceso = doSol.clone().negate(); // alvo→Sol: a direção ILUMINADA

  it('a VOLTA não muda um dígito da fase — é a conta que libera os 360°', () => {
    const out = new THREE.Vector3();
    // a faixa inteira que o dedo alcança: −30° (fase cheia) a +40° (o
    // grampo de 70°), que é `altura` somado ao pino de 30°
    for (const alturaG of [-30, -22.5, -7, 0, 13.25, 40]) {
      const orbita = { altura: alturaG * GRAU, volta: 0 };
      const semVolta = direcaoPrivilegiada(
        doSol.clone(),
        polo,
        orbita,
        new THREE.Vector3()
      );
      const fase = semVolta.angleTo(aceso);
      expect(fase / GRAU).toBeCloseTo(PHASE_OFFSET_GRAUS + alturaG, 10);
      for (let i = 1; i <= 72; i++) {
        const volta = (i / 72) * 2 * Math.PI;
        direcaoPrivilegiada(doSol.clone(), polo, { ...orbita, volta }, out);
        // A INVARIÂNCIA, a 1e-12: `(R(u,ψ)d)·u = d·u`. É ela, e só ela,
        // que deixa o grampo de 70° valer palavra por palavra com o eixo
        // novo solto — se alguém trocar o eixo do giro por outro
        // qualquer, é aqui que aparece.
        expect(out.angleTo(aceso)).toBeCloseTo(fase, 12);
        expect(out.length()).toBeCloseTo(1, 12);
        // ...e a fração iluminada nunca desce dos 67% que o 70° promete
        expect((1 + Math.cos(out.angleTo(aceso))) / 2).toBeGreaterThan(0.67 - 1e-9);
      }
    }
  });

  it('a volta é um eixo VIVO: meia volta espelha, volta inteira volta', () => {
    const parada = direcaoPrivilegiada(
      doSol.clone(),
      polo,
      ORBITA_PARADA,
      new THREE.Vector3()
    );
    const meia = direcaoPrivilegiada(
      doSol.clone(),
      polo,
      { altura: 0, volta: Math.PI },
      new THREE.Vector3()
    );
    // o eixo NÃO é inerte (era: o `dy` nem chegava ao rig)
    expect(meia.distanceTo(parada)).toBeGreaterThan(0.5);
    // e meia volta é o ESPELHO da inclinação em torno da linha do Sol —
    // a prova de que `(−φ, ψ)` e `(φ, ψ+180°)` são a mesma direção, que
    // é o que torna o piso do cone em 0° uma restrição sem perda
    const soma = meia.clone().add(parada).normalize();
    expect(soma.distanceTo(aceso)).toBeLessThan(1e-12);
    const inteira = direcaoPrivilegiada(
      doSol.clone(),
      polo,
      { altura: 0, volta: 2 * Math.PI },
      new THREE.Vector3()
    );
    expect(inteira.distanceTo(parada)).toBeLessThan(1e-12);
  });

  it('a SUPERFÍCIE SEGUE O DEDO nos dois eixos, medido na base da câmera', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1000);
    const rig = new AtlasRig();
    // o oráculo não repete a fórmula: lê os eixos da câmera JÁ escrita
    // (coluna X = direita da tela, coluna Y = cima) e pergunta para que
    // lado a câmera andou. Trocar um sinal em `addOrbitDelta` reprova.
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
    noSistemaInteiro(rig);
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

  it('o VERTICAL atravessa o terminador e para no LADO ESCURO (item 73)', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1000);
    const rig = new AtlasRig();
    const casa = orbitaMaisExterna();
    const iluminada = casa.posicao.clone().negate().normalize();
    const faseDepoisDe = (dy: number) => {
      noSistemaInteiro(rig);
      for (let i = 0; i < 500; i++) rig.addOrbitDelta(0, dy);
      rig.apply(camera);
      return camera.position.clone().sub(rig.alvo).normalize().angleTo(iluminada) / GRAU;
    };
    // para BAIXO sem parar: a câmera vai até o outro lado do alvo. O
    // grampo polar corta os últimos 5,73° quando a linha do Sol e o polo
    // não são perpendiculares — Plutão tem 17° de inclinação, então a
    // parada fica a MIN_POLAR do polo, não em 180° exatos
    const escuro = faseDepoisDe(50);
    expect(escuro).toBeGreaterThan(MAX_SOLAR_DEVIATION_GRAUS);
    expect(escuro).toBeGreaterThan(160);
    // a fração iluminada lá é `(1+cos φ)/2` — quase zero: é o lado
    // escuro, que é o que ele pediu para ver
    expect((1 + Math.cos(escuro * GRAU)) / 2).toBeLessThan(0.03);
    // para CIMA sem parar: para na fase CHEIA, sem atravessar o eixo —
    // atravessar inverteria a horizontal do outro lado
    expect(faseDepoisDe(-50)).toBeCloseTo(0, 6);
  });

  it('o ACUMULADOR para junto com a inclinação — sem arrasto morto', () => {
    // a "borracha" de todo controle mal grampeado: se o acumulador
    // seguisse somando depois do limite, a volta custaria desfazer o
    // arrasto morto antes de a câmera se mexer. Um pixel de volta tem de
    // mover a câmera na hora.
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1000);
    const rig = new AtlasRig();
    noSistemaInteiro(rig);
    for (let i = 0; i < 500; i++) rig.addOrbitDelta(0, 50);
    rig.apply(camera);
    const noLimite = camera.position.clone();
    rig.addOrbitDelta(0, -1);
    rig.apply(camera);
    expect(camera.position.distanceTo(noLimite)).toBeGreaterThan(0);
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
    // 226,84 UA — a faixa de meio UA é o que separa "a docstring está
    // certa" de "a docstring envelheceu" (era 221,55 até a linha da
    // escada da F2b crescer a faixa do topo)
    expect(tetoEmUA()).toBeGreaterThan(226.6);
    expect(tetoEmUA()).toBeLessThan(227.1);
    // e ele ANDA com `?ui=` nos dois sentidos (213,4 e 317,1 UA). O
    // extremo de cima subiu de 296,8 em 2026-08-20 (item 9): a 1.200 px
    // com o texto em 140% os controles do tempo quebram em duas linhas,
    // a base declarada paga o degrau, e a câmera recua o que o HUD
    // ocupa. Recuo é o preço declarado de HUD mais alto — o contrário
    // (declarar menos) é o alvo atrás do texto.
    rig.apply(camera, 0.85);
    expect(tetoEmUA()).toBeGreaterThan(213.1);
    expect(tetoEmUA()).toBeLessThan(213.6);
    rig.apply(camera, 1.4);
    expect(tetoEmUA()).toBeGreaterThan(316.9);
    expect(tetoEmUA()).toBeLessThan(317.4);
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

  it('a ABERTURA encolheu e o TETO do zoom NÃO desceu junto (item 61)', () => {
    // A CONTRAPARTIDA DA VISTA NOVA, e é o que a torna aceitável: o
    // Atlas passou a abrir na borda do sistema INTERNO, mas o teto
    // continua sendo o sistema INTEIRO — quem quiser a vista antiga
    // puxa a roda para fora e chega nela. Se um dia o teto passar a
    // sair do raio enquadrado, o visitante nasce numa vista de onde não
    // pode mais sair, e é este trilho que grita.
    const camera = new THREE.PerspectiveCamera(112, 16 / 9, 0.001, 100);
    const rig = new AtlasRig();
    naAberturaDeProducao(rig);
    rig.apply(camera);
    const emUA = (pc: number) => pc / AU_PARA_PC;
    // a abertura: ~9,1 UA, e ela É menor que a esfera do sistema
    expect(emUA(rig.distanciaDoEnquadramento)).toBeGreaterThan(8);
    expect(emUA(rig.distanciaDoEnquadramento)).toBeLessThan(11);
    // o VALOR do teto tem dono, e não é este trilho: quem o pina é "a
    // DISTÂNCIA DO TETO", acima. Aqui o que se cobra é a RELAÇÃO — a
    // abertura fica ENTRE o piso e o teto, e não colada em nenhum dos
    // dois —, e por isso a roda tem curso para OS DOIS LADOS, que é o
    // que o visitante perdia quando nascia colado no teto
    expect(rig.tetoDeZoom).toBeGreaterThan(rig.distanciaDoEnquadramento);
    expect(rig.pisoDeZoom).toBeLessThan(rig.distanciaDoEnquadramento);
    // e a esfera de dentro CABE na de fora, que é a promessa do nome
    expect(BORDA_DO_SISTEMA_INTERNO.raio).toBeLessThan(orbitaMaisExterna().raio);
  });

  it('a roda desce do TETO até o corpo do Sol — 40 estalos, não cinco', () => {
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
    expect(emUA(rig.tetoDeZoom)).toBeGreaterThan(226.6);
    // o CURSO, contado com o mesmo passo em log que a roda gasta
    let d = rig.tetoDeZoom;
    let estalos = 0;
    while (d > rig.pisoDeZoom * 1.000001 && estalos < 500) {
      d = distanciaAposEstalos(d, rig.pisoDeZoom, rig.tetoDeZoom, -1);
      estalos += 1;
    }
    expect(estalos).toBe(40);
    // e a mesma conta com o piso ANTIGO (a esfera enquadrada) devolve o
    // curso que o dono viu: quatro estalos (a nota do item 73 diz
    // "cinco" porque lá o gesto começa fora do teto exato)
    const pisoAntigo = 2 * casa.raio;
    let e2 = 0;
    let d2 = rig.tetoDeZoom;
    while (d2 > pisoAntigo * 1.000001 && e2 < 500) {
      d2 = distanciaAposEstalos(d2, pisoAntigo, rig.tetoDeZoom, -1);
      e2 += 1;
    }
    expect(e2).toBe(4);
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
    const a = direcaoPrivilegiada(doSol.clone(), polo, ORBITA_PARADA, new THREE.Vector3());
    const b = direcaoDaLua(
      doSol.clone(),
      new THREE.Vector3(),
      polo,
      ORBITA_PARADA,
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
      ORBITA_PARADA,
      new THREE.Vector3()
    );
    const solar = direcaoPrivilegiada(doSol.clone(), polo, ORBITA_PARADA, new THREE.Vector3());
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
    const out = direcaoDaLua(doSol.clone(), doPai, polo, ORBITA_PARADA, new THREE.Vector3());
    const iluminada = doSol.clone().negate().normalize();
    const desvio = THREE.MathUtils.radToDeg(out.angleTo(iluminada));
    expect(desvio).toBeLessThanOrEqual(MAX_SOLAR_DEVIATION_GRAUS + 1e-9);
    // e mais de meio disco segue iluminado: (1+cos 70°)/2 = 67%
    expect((1 + Math.cos(out.angleTo(iluminada))) / 2).toBeGreaterThan(0.5);
  });

  it('o azimute "longe do pai" sobrevive onde é compatível com luz', () => {
    const doSol = new THREE.Vector3(1, 0, 0);
    const doPai = new THREE.Vector3(0.99, 0.141, 0).normalize();
    const out = direcaoDaLua(doSol.clone(), doPai, polo, ORBITA_PARADA, new THREE.Vector3());
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
    // construção EXATA: `u` (alvo→Sol) a 60° do polo e `altura` de 30°
    // PEDEM a direção da câmera em cima do polo, sem depender de busca
    const t = new THREE.Vector3(1, 0, 0).cross(polo).normalize();
    const u = polo
      .clone()
      .multiplyScalar(Math.cos(60 * GRAU))
      .addScaledVector(t, Math.sin(60 * GRAU));
    const doSol = u.clone().negate();
    const dir = direcaoPrivilegiada(
      doSol,
      polo,
      { altura: (60 - PHASE_OFFSET_GRAUS) * GRAU, volta: 0 },
      new THREE.Vector3()
    );
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
      const dir = direcaoPrivilegiada(
        doSol.clone(),
        polo,
        ORBITA_PARADA,
        new THREE.Vector3()
      );
      const separacao = 90 - Math.abs(90 - dir.angleTo(polo) / GRAU);
      expect(separacao).toBeGreaterThan(CEDER_COMECA_GRAUS);
      const up = upDoAtlas(dir, polo, new THREE.Vector3());
      expect(up.distanceTo(polo.clone().normalize())).toBe(0);
    }
  });

  it('VARREDURA: em nenhum ponto alcançável a mira encosta no up', () => {
    // os dois corpos que têm degrau "corpo"/"lua" hoje, um ano de datas,
    // e a ESFERA INTEIRA do arrasto (item 73 — era o cone de 70°).
    //
    // O PISO DECLARADO CAIU, e é o preço declarado do arrasto livre. No
    // cone o pior caso media 17,6° (Terra) e 19,9° (Lua), porque o dedo
    // nunca chegava perto do eixo. Hoje ele chega até a borda da calota,
    // e quem segura é `MIN_POLAR_RAD` — aplicado DUAS vezes: na mira
    // contra o polo, e no `up` contra a mira (`upDoAtlas`). MEDIDO nesta
    // varredura: 5,7296° nos dois corpos, que é MIN_POLAR_RAD exato — a
    // guarda encosta no próprio piso e não passa dele.
    //
    // O que importa é o número que sai disso: `|direita| = |up × z| =
    // sen(separação) = 9,98e-2`, três ordens de grandeza acima do ruído
    // de float32 — que é a razão de a guarda existir.
    const PISO_GRAUS = MIN_POLAR_RAD / GRAU - 1e-9;
    let pior = 180;
    for (const id of ['earth', 'moon']) {
      for (let d = 0; d < 366; d += 11) {
        const polo = poloDe(id, EPOCA_JD_TDB + d);
        for (const doSol of direcoesDoAno(15)) {
          for (let alt = -PHASE_OFFSET_GRAUS; alt <= 150; alt += 5) {
            for (let v = 0; v < 360; v += 20) {
              const dir = direcaoPrivilegiada(
                doSol.clone(),
                polo,
                { altura: alt * GRAU, volta: v * GRAU },
                new THREE.Vector3()
              );
              const up = upDoAtlas(dir, polo, new THREE.Vector3());
              pior = Math.min(pior, dir.angleTo(up) / GRAU);
            }
          }
        }
      }
    }
    expect(pior).toBeGreaterThan(PISO_GRAUS);
    expect(Math.sin(pior * GRAU)).toBeGreaterThan(0.09);
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
    const ESCADA = readFileSync(
      new URL('../director/escada.ts', import.meta.url),
      'utf8'
    );
    expect(ESCADA).toContain(
      "import { baseCorpoEquatorial } from '../../lib/atlas/orientacao'"
    );
    expect(ESCADA).toContain('polo: this.poloDoCorpo(id),');
    expect(ESCADA).toContain('polo: this.poloDoCorpo(LUAS_DO_SISTEMA[0].id),');
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
    rig.apply(camera, 1, LARGURA_DE_MESA_PX, RAMPA_DO_DEGRAU_S / 2);
    expect(rig.animando).toBe(true);
    rig.recompor(b, 1e-9, b);
    expect(rig.animando).toBe(true);
    // a segunda metade ainda termina a rampa: o relógio dela não voltou
    rig.apply(camera, 1, LARGURA_DE_MESA_PX, RAMPA_DO_DEGRAU_S / 2);
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
    // meio da rampa: a câmera está ENTRE as poses (nem lá nem cá)
    rig.apply(animado, 1, LARGURA_DE_MESA_PX, RAMPA_DO_DEGRAU_S / 2);
    expect(animado.position.equals(seco.position)).toBe(false);
    // fim: os passos somam a duração e a pose é a PURA, bit a bit
    rig.apply(animado, 1, LARGURA_DE_MESA_PX, RAMPA_DO_DEGRAU_S);
    expect(rig.animando).toBe(false);
    rig.apply(animado, 1, LARGURA_DE_MESA_PX, 0.016);
    expect(animado.position.equals(seco.position)).toBe(true);
    expect(animado.quaternion.equals(seco.quaternion)).toBe(true);
  });

  it('focar o MESMO alvo com rampa é no-op — nem reinicia a animação', () => {
    const rig = new AtlasRig();
    noSistemaInteiro(rig);
    rig.apply(cam());
    const alvo = new THREE.Vector3(1e-6, 0, 0);
    rig.focar(alvo, 1e-7, alvo, { rampa: true });
    rig.apply(cam(), 1, LARGURA_DE_MESA_PX, RAMPA_DO_DEGRAU_S);
    expect(rig.animando).toBe(false);
    rig.focar(alvo, 1e-7, alvo, { rampa: true });
    expect(rig.animando).toBe(false);
  });
});

// ============================================================
// O DEGRAU DO CORPO DO SOL — a escada do Atlas recusava exatamente um
// corpo, e era o da casa: `focarNoCorpo` desviava o Sol para a abertura
// ANTES de olhar o `ver`, então `?foco=sol&ver=corpo` não existia e o
// visitante não tinha caminho NENHUM até o Sol procedural. A 226,84 UA
// ele não tem corpo desenhado (o portão de 4 px desarma em 7,19 UA) nem
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
    // MEDIDO: 6,4042 raios solares = 4,459 milhões de km. Vizinho de
    // perto do lugar de onde o FILME já filma o Sol (5,74 raios,
    // 4,00 milhões de km, a vista `sol` do gate de md5) — a prova
    // medida de que a composição aguenta esta distância.
    expect(fatorSol).toBeCloseTo(6.4042, 4);
    const km = (pedido(RAIO_DO_SOL_NA_CENA) / RAIO_SOL_PC) * RAIO_SOL_KM;
    expect(km / 1e6).toBeCloseTo(4.459, 3);
    // e o Sol INTEIRO cabe no que sobra do quadro: a margem de 1,2 é
    // folga, não corte — 18,0° de disco dentro do retângulo útil
    expect((2 * Math.asin(1 / fatorSol)) / GRAU).toBeCloseTo(17.97, 2);
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
    // só a distância muda — e muda 7.612× (226,84 UA → 0,0298 UA); da
    // abertura de hoje (~9,15 UA) o mesmo dolly é de ~307×
    expect(distCasa / camera.position.length()).toBeCloseTo(7609, -1);
    expect(camera.position.length() / RAIO_DO_SOL_NA_CENA).toBeCloseTo(6.4042, 4);
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
    // o ramo do Sol vem ANTES do de sempre (que devolve a TERRA), e o
    // Sol não anda: ele É a origem do frame heliocêntrico
    expect(ramo.indexOf("id === 'sun'")).toBeGreaterThan(-1);
    expect(ramo.indexOf("id === 'sun'")).toBeLessThan(ramo.indexOf('posicaoDaTerraUA'));
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

    // E O RAIO VEM DA BORDA DE DENTRO (item 61) — a outra metade de
    // `casaViva`, e a única amarra que liga a ESCADA à vista que o dono
    // escolheu. Sem ela, trocar a borda de volta pelo corpo mais externo
    // devolveria a abertura para 226,84 UA sem nenhum trilho vermelho:
    // os outros dois testes desta vista recebem a esfera pela constante,
    // não pela escada, e passariam iguais.
    const casaViva = ESCADA.slice(
      ESCADA.indexOf('  private casaViva()'),
      ESCADA.indexOf('  focarNoSistema() {')
    );
    expect(casaViva).toContain('BORDA_DO_SISTEMA_INTERNO.id');
    expect(casaViva).toContain('raio: Math.hypot(borda.x, borda.y, borda.z) * AU_PARA_PC');
    // ...e o retrato congelado, o caminho SEM efeméride, tem de usar a
    // MESMA borda — senão a vista muda quando a rede cai
    expect(abertura).toContain('raio: BORDA_DO_SISTEMA_INTERNO.raio');
    // TRÊS sítios da escada citam a mesma esfera, e o terceiro é o
    // degrau `sistema` do POUSO, que o religador do relógio recompõe. O
    // primeiro (`casaViva`) a cita pelo `.id`, e está cobrado logo
    // acima; os OUTROS DOIS a citam pelo `.raio` — daí o 2, que é a
    // contagem de `.raio`, não a de sítios.
    expect(ESCADA.split('BORDA_DO_SISTEMA_INTERNO.raio').length - 1).toBe(2);
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
// ============================================================
describe('a pose de volta — orbitaQueProduz inverte direcaoPrivilegiada', () => {
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

  it('ida e volta: a direção que sai é a direção que entrou', () => {
    const dir = new THREE.Vector3();
    const devolta = new THREE.Vector3();
    const orbita = { altura: 0, volta: 0 };
    let pior = 0;
    for (const eixo of eixos) {
      for (const polo of polos) {
        for (let ia = 0; ia <= 12; ia++) {
          for (let iv = 0; iv <= 12; iv++) {
            const altura = (-30 + (ia * 180) / 12) * GRAU;
            const volta = (-180 + (iv * 360) / 12) * GRAU;
            direcaoPrivilegiada(eixo, polo, { altura, volta }, dir);
            orbitaQueProduz(dir, eixo, polo, orbita);
            direcaoPrivilegiada(eixo, polo, orbita, devolta);
            // a CORDA, não `angleTo`: aquele passa por `acos` e não
            // consegue medir abaixo de ~1,5e-8 rad (o erro do `acos`
            // perto de 1 é `√ε`), que é justamente a faixa em que a
            // conta fechada trabalha. Para ângulos pequenos a corda É o
            // ângulo, e ela se mede por subtração, sem `acos` nenhum.
            pior = Math.max(pior, dir.distanceTo(devolta));
          }
        }
      }
    }
    // 676 poses × 8 referenciais: a volta reproduz a direção a menos de
    // 1e-14 — é conta fechada, não busca. O número depende de o ângulo
    // sair de `atan2` e não de `acos`: com `acos` o pior caso media
    // 1e-6 rad, e 1e-6 rad na abertura são 33 mil km de câmera num
    // gesto que promete não mover nada.
    expect(pior).toBeLessThan(1e-14);
  });

  it('a altura sai na MESMA faixa que o arrasto grampeia', () => {
    const pino = PHASE_OFFSET_GRAUS * GRAU;
    const dir = new THREE.Vector3();
    const orbita = { altura: 0, volta: 0 };
    for (const eixo of eixos) {
      for (let i = 0; i <= 24; i++) {
        direcaoPrivilegiada(eixo, POLO_ECLIPTICO, {
          altura: (-30 + (i * 180) / 24) * GRAU,
          volta: 0.7,
        }, dir);
        orbitaQueProduz(dir, eixo, POLO_ECLIPTICO, orbita);
        expect(orbita.altura).toBeGreaterThanOrEqual(-pino - 1e-9);
        expect(orbita.altura).toBeLessThanOrEqual(Math.PI - pino + 1e-9);
        expect(Math.abs(orbita.volta)).toBeLessThanOrEqual(Math.PI + 1e-9);
      }
    }
  });

  it('entradas impossíveis devolvem o repouso, nunca NaN', () => {
    const orbita = { altura: 1, volta: 1 };
    orbitaQueProduz(new THREE.Vector3(0, 0, 0), eixos[0], POLO_ECLIPTICO, orbita);
    expect(orbita).toEqual({ altura: 0, volta: 0 });
    orbitaQueProduz(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      POLO_ECLIPTICO,
      orbita
    );
    expect(Number.isFinite(orbita.altura)).toBe(true);
    expect(Number.isFinite(orbita.volta)).toBe(true);
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
