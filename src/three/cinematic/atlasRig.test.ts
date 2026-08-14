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
  ORBITA_PARADA,
  ARRASTO_RAD_POR_PX,
  PARENT_FRAMING_BIAS,
  PHASE_OFFSET_GRAUS,
  RETANGULO_CHEIO,
  RAMPA_DO_DEGRAU_S,
  CEDER_COMECA_GRAUS,
  direcaoDaLua,
  direcaoPrivilegiada,
  upDoAtlas,
  enquadrar,
  orbitaMaisExterna,
  raioDeEnquadramentoEstelar,
  retanguloUtilDoAtlas,
} from './atlasRig';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../lib/atlas/frameGalactico';
import { RAIO_DO_SOL_NA_CENA, RAIO_SOL_KM, RAIO_SOL_PC } from '../escala';
import { EPOCA_JD_TDB, RETRATO_2026 } from '../world/planetas/retrato2026';
import { baseCorpoEquatorial } from '../../lib/atlas/orientacao';
import { IAU_ORIENTATIONS } from '../../lib/atlas/iauOrientation';

const GRAU = Math.PI / 180;

/**
 * O semi-ângulo que a esfera de raio `rAlvo × margem` ocupa, vista da
 * distância devolvida. É esse ângulo que tem de bater com o que sobra
 * do quadro depois do HUD.
 */
function semiAnguloOcupado(rAlvo: number, distancia: number) {
  return Math.asin((rAlvo * MARGEM_DE_ENQUADRAMENTO) / distancia);
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
    // o selo (base) é mais alto que a ContextLine (topo), então o
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
    // MEDIDO pelo juiz de a11y (2026-08-12, janela 1200×900, viewport de
    // 813 px de altura, `?atlas=1&shot=1`). Se a CSS crescer, é o juiz
    // que quebra primeiro (declarado ≥ medido); aqui quebra quando a
    // DECLARAÇÃO cresce sem a medição acompanhar.
    const MEDIDO = [
      { ui: 0.85, topo: 0.119, base: 0.175 },
      { ui: 1, topo: 0.125, base: 0.192 },
      { ui: 1.4, topo: 0.197, base: 0.292 },
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
    // e a base não depende da largura: quem quebra é a barra do topo
    expect(comDegrau.base).toBe(semDegrau.base);
    // o degrau a 1.200 px cai entre 1,25 e 1,26 (1.200 / 960 = 1,25) —
    // e a quebra REAL a 1.200 px começa em 1,30, medida: a declaração
    // entra um degrau ANTES, que é o lado seguro do erro
    expect(retanguloUtilDoAtlas(1.25, 1200).topo).toBeCloseTo(0.065 + 0.09 * 1.25, 12);
    expect(retanguloUtilDoAtlas(1.3, 1200).topo).toBeCloseTo(
      0.065 + 0.09 * 1.3 + 0.04,
      12
    );
    // largura envenenada cai na tela de mesa de referência, não em NaN
    for (const cru of [Number.NaN, 0, -100, Number.POSITIVE_INFINITY]) {
      expect(retanguloUtilDoAtlas(1, cru)).toEqual(retanguloUtilDoAtlas(1, LARGURA_DE_MESA_PX));
    }
    // a faixa declarada de validade é um número, não um adjetivo
    expect(LARGURA_UTIL_MINIMA_PX).toBeGreaterThan(0);
    expect(LARGURA_UTIL_MINIMA_PX).toBeLessThan(LARGURA_DE_MESA_PX);
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

  it('a órbita do visitante soma — e para no máximo solar', () => {
    const out = new THREE.Vector3();
    direcaoPrivilegiada(eixo.clone(), polo, { altura: 20 * GRAU, volta: 0 }, out);
    expect(out.angleTo(aceso) / GRAU).toBeCloseTo(PHASE_OFFSET_GRAUS + 20, 10);
    direcaoPrivilegiada(eixo.clone(), polo, { altura: 180 * GRAU, volta: 0 }, out);
    expect(out.angleTo(aceso) / GRAU).toBeCloseTo(MAX_SOLAR_DEVIATION_GRAUS, 10);
    // e o PISO do cone é a fase cheia (0°), não mais −70°: a metade
    // negativa do arco virou redundante quando a volta ganhou 360°
    // (ver `OrbitaDoVisitante`) — arrastar sem parar para cima para na
    // linha do Sol em vez de atravessá-la e inverter a horizontal
    direcaoPrivilegiada(eixo.clone(), polo, { altura: -180 * GRAU, volta: 0 }, out);
    expect(out.angleTo(aceso) / GRAU).toBeCloseTo(0, 10);
    // no extremo do grampo mais de meio disco continua aceso — é a única
    // serventia do 70°, e é o que a docstring dele promete
    expect((1 + Math.cos(MAX_SOLAR_DEVIATION_GRAUS * GRAU)) / 2).toBeGreaterThan(0.5);
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
      rig.focarNoSistema();
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
    rig.focarNoSistema();
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

  it('o VERTICAL para no cone: 70° para um lado, a linha do Sol para o outro', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 1e-9, 1000);
    const rig = new AtlasRig();
    const casa = orbitaMaisExterna();
    const iluminada = casa.posicao.clone().negate().normalize();
    const faseDepoisDe = (dy: number) => {
      rig.focarNoSistema();
      for (let i = 0; i < 500; i++) rig.addOrbitDelta(0, dy);
      rig.apply(camera);
      return camera.position.clone().sub(rig.alvo).normalize().angleTo(iluminada) / GRAU;
    };
    // para BAIXO sem parar: a câmera desce até o terminador e para lá
    expect(faseDepoisDe(50)).toBeCloseTo(MAX_SOLAR_DEVIATION_GRAUS, 9);
    // para CIMA sem parar: para na fase CHEIA, sem atravessar o eixo —
    // atravessar inverteria a horizontal do outro lado
    expect(faseDepoisDe(-50)).toBeCloseTo(0, 6);
  });
});

describe('o rig e o alvo de abertura', () => {
  it('a abertura é a órbita mais externa do retrato, pelo caminho da camada de planetas', () => {
    const { posicao, raio } = orbitaMaisExterna();
    const eq = eclipticaParaEquatorial(RETRATO_2026.pluto.vetorUA);
    expect(posicao.x).toBe(eq[0] * AU_PARA_PC);
    expect(posicao.y).toBe(eq[1] * AU_PARA_PC);
    expect(posicao.z).toBe(eq[2] * AU_PARA_PC);
    expect(raio).toBe(RETRATO_2026.pluto.rUA * AU_PARA_PC);
    // é mesmo o MAIOR do retrato — o teste falha se alguém acrescentar
    // um corpo mais distante e esquecer de reconferir a vista de abertura
    for (const c of Object.values(RETRATO_2026)) {
      expect(c.rUA).toBeLessThanOrEqual(RETRATO_2026.pluto.rUA);
    }
    // o raio é ORBITAL, e a esfera de abertura é CENTRADA NO SOL: o
    // corpo mais externo fica sobre a superfície dela (|posição| = raio)
    // e tudo que orbita por dentro fica dentro — que é a promessa
    expect(posicao.length()).toBeCloseTo(raio, 15);
  });

  it('a abertura enquadra a esfera do SISTEMA, centrada no Sol', () => {
    const camera = new THREE.PerspectiveCamera(112, 1.6, 0.001, 100);
    const rig = new AtlasRig();
    rig.focarNoSistema();
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

  it('a DISTÂNCIA DE ABERTURA é a que a docstring de focarNoSistema declara', () => {
    // o número mora num lugar só (`AtlasRig.focarNoSistema`) e este
    // trilho o deriva de `enquadrar()`: quando a próxima faixa de HUD
    // entrar, ele quebra em vez de deixar a docstring envelhecer calada.
    const camera = new THREE.PerspectiveCamera(112, 16 / 9, 0.001, 100);
    const rig = new AtlasRig();
    rig.focarNoSistema();
    rig.apply(camera);
    const emUA = () => camera.position.length() / AU_PARA_PC;
    // 226,84 UA — a faixa de meio UA é o que separa "a docstring está
    // certa" de "a docstring envelheceu" (era 221,55 até a linha da
    // escada da F2b crescer a faixa do topo)
    expect(emUA()).toBeGreaterThan(226.6);
    expect(emUA()).toBeLessThan(227.1);
    // e ela ANDA com `?ui=` nos dois sentidos (213,4 e 296,8 UA)
    rig.apply(camera, 0.85);
    expect(emUA()).toBeGreaterThan(213.1);
    expect(emUA()).toBeLessThan(213.6);
    rig.apply(camera, 1.4);
    expect(emUA()).toBeGreaterThan(296.5);
    expect(emUA()).toBeLessThan(297.0);
  });

  it('o fov do Atlas é pino, não herança: o rig o escreve todo quadro', () => {
    const camera = new THREE.PerspectiveCamera(112, 1.6, 0.001, 100);
    const rig = new AtlasRig();
    rig.focarNoSistema();
    rig.apply(camera);
    expect(camera.fov).toBe(ATLAS_FOV_GRAUS);
  });

  it('a câmera da abertura fica do lado ACESO do corpo mais externo', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 0.001, 100);
    const rig = new AtlasRig();
    rig.focarNoSistema();
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
    rig.focarNoSistema();
    rig.apply(camera);
    const inicial = camera.position.clone();
    for (let i = 0; i < 2000; i++) rig.addOrbitDelta(50, 50);
    rig.apply(camera);
    const girada = camera.position.clone();
    expect(girada.distanceTo(inicial)).toBeGreaterThan(0);
    // grampeado: o desvio contra a direção ILUMINADA — a que aponta do
    // corpo mais externo para o Sol — nunca passa do máximo
    const casa = orbitaMaisExterna();
    const aceso = casa.posicao.clone().negate().normalize();
    const daCamera = girada.clone().sub(rig.alvo).normalize();
    expect(daCamera.angleTo(aceso) / GRAU).toBeLessThanOrEqual(
      MAX_SOLAR_DEVIATION_GRAUS + 1e-9
    );
    // e focar de novo zera a órbita — o alvo novo nasce no pino
    rig.focarNoSistema();
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
  const POLO_ECLIPTICO = (() => {
    const v = eclipticaParaEquatorial([0, 0, 1]);
    return new THREE.Vector3(v[0], v[1], v[2]).normalize();
  })();
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

  it('a degenerescência é ALCANÇÁVEL: o eixo da Terra entra no cone do arrasto', () => {
    // o eixo da Terra faz com a direção do Sol, no solstício, 90° − 23,4°
    // = 66,6°. O grampo do arrasto vale 70°, então a inclinação passa DO
    // OUTRO LADO do polo — e é por isso que a guarda existe.
    const polo = poloDe('earth', EPOCA_JD_TDB);
    let menor = 180;
    for (const doSol of direcoesDoAno(1)) {
      const iluminada = doSol.clone().negate();
      menor = Math.min(menor, iluminada.angleTo(polo) / GRAU);
    }
    expect(menor).toBeGreaterThan(66);
    expect(menor).toBeLessThan(67);
    // ...e 66,6 < 70: o dedo do visitante CHEGA ao eixo do planeta
    expect(menor).toBeLessThan(MAX_SOLAR_DEVIATION_GRAUS);
  });

  it('no encontro exato, sem guarda o up é a própria mira — com guarda são 23,4°', () => {
    const polo = poloDe('earth', EPOCA_JD_TDB);
    // construção EXATA: `u` (alvo→Sol) a 60° do polo e `altura` de 30°
    // põem a direção da câmera em cima do polo, sem depender de busca
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
    // a mira caiu EM CIMA do eixo do planeta
    expect(dir.angleTo(polo) / GRAU).toBeCloseTo(0, 9);
    // sem guarda, `up = polo` seria paralelo à mira: `direita = up × z`
    // colapsa e a imagem gira sozinha
    expect(Math.abs(dir.dot(polo))).toBeCloseTo(1, 12);
    // com guarda, o up cede à eclíptica — que para a Terra fica a 23,4°
    const up = upDoAtlas(dir, polo, new THREE.Vector3());
    expect(up.distanceTo(POLO_ECLIPTICO)).toBeLessThan(1e-12);
    expect(dir.angleTo(up) / GRAU).toBeCloseTo(23.44, 1);
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
    // o cone inteiro do arrasto. O piso MEDIDO nesta varredura é 17,6°
    // (Terra) e 19,9° (Lua); 15° é o que se declara, com folga.
    const PISO_GRAUS = 15;
    let pior = 180;
    for (const id of ['earth', 'moon']) {
      for (let d = 0; d < 366; d += 11) {
        const polo = poloDe(id, EPOCA_JD_TDB + d);
        for (const doSol of direcoesDoAno(15)) {
          for (let alt = -PHASE_OFFSET_GRAUS; alt <= 40; alt += 5) {
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
  });

  it('o Director LIGA o polo do corpo nos dois degraus que o pedem', () => {
    // a fiação por texto-fonte: o rig honrar o polo não adianta nada se
    // ninguém o passar, e isso não é coisa que teste de unidade veja
    // (o Director precisa de WebGL). A fonte do dado é cobrada junto —
    // é a MESMA que orienta a malha, e uma segunda tabela de eixos aqui
    // faria a câmera e o planeta discordarem sem ninguém notar.
    const DIRECTOR = readFileSync(new URL('../director.ts', import.meta.url), 'utf8');
    expect(DIRECTOR).toContain(
      "import { baseCorpoEquatorial } from '../lib/atlas/orientacao'"
    );
    expect(DIRECTOR).toContain('polo: this.poloDoCorpo(id),');
    expect(DIRECTOR).toContain('polo: this.poloDoCorpo(LUAS_DO_SISTEMA[0].id),');
    // ...e os degraus de fora NÃO o pedem: lá o assunto é o plano do
    // sistema, e o eixo de um corpo qualquer não governa o horizonte
    const sistema = DIRECTOR.slice(
      DIRECTOR.indexOf('  focarNoSistema() {'),
      DIRECTOR.indexOf('private rampaDaEscada()')
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
    rig.focarNoSistema();
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
    // derruba a LUT do raymarch e reinicia a contagem da captura)
    const corpo = DIRECTOR.slice(
      DIRECTOR.indexOf('  private recomporAlvo() {'),
      DIRECTOR.indexOf('  subirDegrau()')
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
    rig1.focarNoSistema();
    rig1.apply(a);
    const rig2 = new AtlasRig();
    rig2.focarNoSistema();
    rig2.apply(b, 1, LARGURA_DE_MESA_PX, 0.016); // dt não muda nada fora da rampa
    expect(a.position.equals(b.position)).toBe(true);
    expect(a.quaternion.equals(b.quaternion)).toBe(true);
  });

  it('a rampa TERMINA na pose exata do destino — ?foco= continua reproduzível', () => {
    const seco = cam();
    const rigSeco = new AtlasRig();
    rigSeco.focarNoSistema();
    const alvo = new THREE.Vector3(1e-6, 2e-6, 0.5e-6);
    rigSeco.focar(alvo, 1e-7);
    rigSeco.apply(seco);

    const animado = cam();
    const rig = new AtlasRig();
    rig.focarNoSistema();
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
    rig.focarNoSistema();
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
    rig.focarNoSistema();
    rig.apply(camera);
    const deCasa = camera.position.clone().normalize();
    const distCasa = camera.position.length();
    // o degrau do corpo: MESMO alvo (a origem), MESMO eixo, raio do Sol
    rig.focar(new THREE.Vector3(0, 0, 0), RAIO_DO_SOL_NA_CENA, casa.posicao);
    rig.apply(camera);
    expect(camera.position.clone().normalize().distanceTo(deCasa)).toBeLessThan(1e-12);
    // só a distância muda — e muda 7.612× (226,84 UA → 0,0298 UA)
    expect(distCasa / camera.position.length()).toBeCloseTo(7609, -1);
    expect(camera.position.length() / RAIO_DO_SOL_NA_CENA).toBeCloseTo(6.4042, 4);
  });

  it('o Director lê o `ver` ANTES de desviar o Sol — e só o `corpo` desce', () => {
    const DIRECTOR = readFileSync(new URL('../director.ts', import.meta.url), 'utf8');
    const corpo = DIRECTOR.slice(
      DIRECTOR.indexOf('  focarNoCorpo(id: string'),
      DIRECTOR.indexOf('  private poloDoCorpo(')
    );
    const ramo = corpo.slice(corpo.indexOf("if (id === 'sun')"));
    // o desvio deixou de ser incondicional: `corpo` desce, `orbita`
    // (o default, e a semântica de sempre de `?foco=sol`) volta para casa
    expect(ramo).toContain("if (ver === 'corpo') this.aproximarDoSol();");
    expect(ramo).toContain('else this.focarNoSistema();');
  });

  it('o enquadramento do Sol sai do raio ÚNICO, sem literal de distância e sem polo', () => {
    const DIRECTOR = readFileSync(new URL('../director.ts', import.meta.url), 'utf8');
    const metodo = DIRECTOR.slice(
      DIRECTOR.indexOf('  private aproximarDoSol() {'),
      DIRECTOR.indexOf('  private escreverPosicaoDeLua(')
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
    const DIRECTOR = readFileSync(new URL('../director.ts', import.meta.url), 'utf8');
    const visita = DIRECTOR.slice(
      DIRECTOR.indexOf('  private tryVisit('),
      DIRECTOR.indexOf('  get nomeadas()')
    );
    // o gesto irmão do "clicar no MESMO corpo já focado desce um degrau"
    // (D7), no único corpo cujo degrau de cima é a ABERTURA
    expect(visita).toContain("if (id === 'sun' && this.escada.degrau === 'sistema')");
    expect(visita).toContain("this.focarNoCorpo('sun', 'corpo');");
    // ...e de QUALQUER outro degrau o clique no Sol continua sendo
    // voltar para casa, pelo caminho de sempre
    expect(visita).toContain('this.focarNoCorpo(id);');
    // o gesto mora AQUI e não dentro de `focarNoCorpo`: a porta
    // `?foco=sol` também chama aquele método e chega com a abertura já
    // na tela — lá dentro as duas seriam indistinguíveis, e `?foco=sol`
    // (sem `ver=`) passaria a cair no Sol em vez da casa
    const foco = DIRECTOR.slice(
      DIRECTOR.indexOf('  focarNoCorpo(id: string'),
      DIRECTOR.indexOf('  private poloDoCorpo(')
    );
    expect(foco).not.toContain("degrau === 'sistema'");
  });

  it('o religador do relógio conhece o Sol — senão a câmera saltaria para a Terra', () => {
    const DIRECTOR = readFileSync(new URL('../director.ts', import.meta.url), 'utf8');
    const vivo = DIRECTOR.slice(
      DIRECTOR.indexOf('  private enquadreVivo()'),
      DIRECTOR.indexOf('  private posicaoDesenhada(')
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
    const tarde = DIRECTOR.slice(
      DIRECTOR.indexOf('  private reenquadrarAposEfemeride()'),
      DIRECTOR.indexOf('  get corpos()')
    );
    expect(tarde).toContain("if (this.focoCorpoId === 'sun') this.aproximarDoSol();");
  });

  it('a SUBIDA sai do Sol pela escada de sempre, e a roda não perde a Terra', () => {
    const DIRECTOR = readFileSync(new URL('../director.ts', import.meta.url), 'utf8');
    // do degrau `corpo` a subida chama `focarNoCorpo(foco, 'orbita')`, e
    // para o Sol isso é a abertura — nenhum ramo novo precisou nascer
    const sobe = DIRECTOR.slice(
      DIRECTOR.indexOf('  subirDegrau(): boolean {'),
      DIRECTOR.indexOf('  descerDegrau(): boolean {')
    );
    expect(sobe).toContain("this.focarNoCorpo(this.focoCorpoId!, 'orbita');");
    // e a DESCIDA da roda continua indo do sistema à órbita da casa: o
    // corpo do Sol não é um degrau abaixo do sistema, é o outro ramo que
    // sai dali — trocar este ramo tiraria da roda o único caminho até a
    // Terra, que é a queixa que a Onda 7 consertou
    const desce = DIRECTOR.slice(
      DIRECTOR.indexOf('  descerDegrau(): boolean {'),
      DIRECTOR.indexOf('  private reenquadrarAposEfemeride()')
    );
    expect(desce).toContain("this.focarNoCorpo(paiDaLua, 'orbita');");
    expect(desce).not.toContain("'sun'");
  });

  it('a abertura e o corpo do Sol leem UMA conta do "mais externo"', () => {
    // duas contas seriam duas direções, e elas divergiriam no primeiro
    // salto de data — a descida deixaria de ser dolly puro sem aviso
    const DIRECTOR = readFileSync(new URL('../director.ts', import.meta.url), 'utf8');
    expect(DIRECTOR.split('posicaoHeliocentrica(c.id, jd)').length - 1).toBe(1);
    const abertura = DIRECTOR.slice(
      DIRECTOR.indexOf('  focarNoSistema() {'),
      DIRECTOR.indexOf('  private rampaDaEscada()')
    );
    expect(abertura).toContain('const casa = this.casaViva();');
  });
});
