// ============================================================
// O ENQUADRAMENTO PRIVILEGIADO é conta, não gosto — e é por isso que
// ele é função pura e tem oráculo. O oráculo aqui não repete a
// fórmula: ele PROJETA a esfera enquadrada e cobra que ela tangencie
// a borda do retângulo útil, que é o que a conta promete.
// ============================================================
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  ATLAS_FOV_GRAUS,
  AtlasRig,
  MARGEM_DE_ENQUADRAMENTO,
  MAX_SOLAR_DEVIATION_GRAUS,
  PARENT_FRAMING_BIAS,
  PHASE_OFFSET_GRAUS,
  RETANGULO_CHEIO,
  direcaoPrivilegiada,
  enquadrar,
  orbitaMaisExterna,
  retanguloUtilDoAtlas,
} from './atlasRig';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../lib/atlas/frameGalactico';
import { RETRATO_2026 } from '../world/planetas/retrato2026';

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
    // e mesmo no maior degrau ainda sobra quadro de verdade. A conta
    // re-derivada com o HUD que a onda inteira construiu (tempo na
    // base, busca na barra): o MEDIDO a 1,4 come 0,489 do quadro
    // (topo 0,197 + base 0,292 — juiz de a11y, 1200×900) e sobram 51%
    // reais; a declaração paga ~3% de folga por cima disso. O trilho
    // aqui só impede a declaração de virar moldura — quem garante que
    // o alvo nunca cai atrás do texto é o juiz (declarado ≥ medido).
    expect(1 - grande.topo - grande.base).toBeGreaterThan(0.47);
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

describe('enquadrar — o viés do pai', () => {
  it('com o pai no quadro a câmera chega a 78% da distância isolada', () => {
    const pedido = {
      rAlvo: 1,
      fovDeg: 35,
      aspect: 1.6,
      retanguloUtil: RETANGULO_CHEIO,
    };
    const sozinho = enquadrar(pedido);
    const comPai = enquadrar({ ...pedido, comPai: true });
    expect(comPai.distancia / sozinho.distancia).toBeCloseTo(PARENT_FRAMING_BIAS, 12);
  });
});

describe('direcaoPrivilegiada — os 30° e o grampo dos 70°', () => {
  const polo = new THREE.Vector3(0, 0, 1);
  const eixo = new THREE.Vector3(1, 0, 0);

  it('sem órbita do visitante, o desvio é o ângulo de fase herdado', () => {
    const out = new THREE.Vector3();
    direcaoPrivilegiada(eixo.clone(), polo, 0, out);
    expect(out.length()).toBeCloseTo(1, 12);
    expect(out.angleTo(eixo) / GRAU).toBeCloseTo(PHASE_OFFSET_GRAUS, 10);
  });

  it('a órbita do visitante soma — e para no máximo solar', () => {
    const out = new THREE.Vector3();
    direcaoPrivilegiada(eixo.clone(), polo, 20 * GRAU, out);
    expect(out.angleTo(eixo) / GRAU).toBeCloseTo(PHASE_OFFSET_GRAUS + 20, 10);
    direcaoPrivilegiada(eixo.clone(), polo, 180 * GRAU, out);
    expect(out.angleTo(eixo) / GRAU).toBeCloseTo(MAX_SOLAR_DEVIATION_GRAUS, 10);
    direcaoPrivilegiada(eixo.clone(), polo, -180 * GRAU, out);
    expect(out.angleTo(eixo) / GRAU).toBeCloseTo(MAX_SOLAR_DEVIATION_GRAUS, 10);
  });

  it('alvo em cima do polo não devolve NaN', () => {
    const out = new THREE.Vector3();
    direcaoPrivilegiada(polo.clone(), polo, 0, out);
    expect(out.length()).toBeCloseTo(1, 12);
    direcaoPrivilegiada(new THREE.Vector3(0, 0, 0), polo, Number.NaN, out);
    expect(out.length()).toBeCloseTo(1, 12);
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
    // o raio é ORBITAL: o Sol, na origem, está a uma distância igual
    // ao raio enquadrado — ou seja, dentro do quadro por construção
    expect(posicao.length()).toBeCloseTo(raio, 15);
  });

  it('o fov do Atlas é pino, não herança: o rig o escreve todo quadro', () => {
    const camera = new THREE.PerspectiveCamera(112, 1.6, 0.001, 100);
    const rig = new AtlasRig();
    rig.focarNoSistema();
    rig.apply(camera);
    expect(camera.fov).toBe(ATLAS_FOV_GRAUS);
    // a câmera olha o alvo e fica à distância que a conta pediu
    const casa = orbitaMaisExterna();
    expect(camera.position.distanceTo(casa.posicao)).toBeCloseTo(
      enquadrar({
        rAlvo: casa.raio,
        fovDeg: ATLAS_FOV_GRAUS,
        aspect: 1.6,
        retanguloUtil: retanguloUtilDoAtlas(),
        comPai: true,
      }).distancia,
      15
    );
  });

  it('a órbita do ponteiro é determinística e grampeada', () => {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 0.001, 100);
    const rig = new AtlasRig();
    rig.focarNoSistema();
    rig.apply(camera);
    const inicial = camera.position.clone();
    for (let i = 0; i < 2000; i++) rig.addOrbitDelta(50);
    rig.apply(camera);
    const girada = camera.position.clone();
    expect(girada.distanceTo(inicial)).toBeGreaterThan(0);
    // grampeado: o desvio contra o eixo solar nunca passa do máximo
    const casa = orbitaMaisExterna();
    const eixoSolar = casa.posicao.clone().normalize();
    const daCamera = girada.clone().sub(casa.posicao).normalize();
    expect(daCamera.angleTo(eixoSolar) / GRAU).toBeLessThanOrEqual(
      MAX_SOLAR_DEVIATION_GRAUS + 1e-9
    );
    // e focar de novo zera a órbita — o alvo novo nasce no pino
    rig.focarNoSistema();
    rig.apply(camera);
    expect(camera.position.distanceTo(inicial)).toBeCloseTo(0, 15);
  });
});
