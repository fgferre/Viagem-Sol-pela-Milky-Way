// Serve: dono — a coda pousa em casa como ele pediu: raspão na Lua, chegada pelo escuro, Terra grande com os polos para cima
// O JUIZ DA VOLTA PARA CASA (coda de 19/08).
//
// Duas coisas se cobram aqui, e nenhuma é estética:
//
// 1. OS VETORES PINADOS SÃO A EFEMÉRIDE. TERRA_PC e LUA_PC vivem como
//    literais no journey.ts (o roteiro é puro e não pode fazer fetch);
//    este arquivo recomputa os dois pela MESMA cadeia do app
//    (efemerides.bin → posicaoHeliocentrica → eclipticaParaEquatorial ×
//    AU_PARA_PC) na época pinada do céu e cobra igualdade bit a bit.
//    Se a época, a tabela ou o frame mudarem, quebra AQUI — antes de a
//    câmera chegar numa Terra que não está mais lá.
//
// 2. A ENCENAÇÃO QUE O DONO PEDIU É GEOMETRIA VERIFICÁVEL: raspão que
//    enche o quadro, Lua acesa no flanco, chegada pelo lado escuro,
//    pouso no lado claro com a Terra grande e o filme parando congelado.
//    Desde o item 108 v2 ela assenta EMBAIXO À ESQUERDA, e não no
//    centro, e depois de pousar a câmera ainda RECUA com a lente
//    ancorada (o dolly zoom): o último bloco deste arquivo cobra o
//    retrato de família — a Lua no quadro junto com ela, com disco
//    legível —, que é a razão das duas coisas.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { MetaEfemerides } from '../../lib/atlas/efemerides';
import { decodeEfemerides, MotorEfemerides } from '../../lib/atlas/efemerides';
import { eclipticaParaEquatorial, AU_PARA_PC } from '../../lib/atlas/frameGalactico';
import { EPOCA_JD_TDB } from '../world/planetas/retrato2026';
import { BODY_AXES } from '../../lib/atlas/iauOrientation';
import { AU_KM } from '../../lib/atlas/elementosOrbitais';

// mesmo stub e mesma razão do cameraRig.test: journey puxa world/galaxy,
// que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const {
  Journey, TERRA_PC, LUA_PC, MIRA_DO_POUSO, JD_DO_FILME_TDB,
  T_DO_TAKE, T_DA_VOLTA, T_DO_DOLLY,
} = await import('./journey');
const { galacticUp } = await import('./cameraRig');

const DATA_DIR = fileURLToPath(new URL('../../../public/data/atlas/', import.meta.url));
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

const cadeiaPc = (id: 'earth' | 'moon') => {
  const v = motor.posicaoHeliocentrica(id, JD_DO_FILME_TDB);
  const eq = eclipticaParaEquatorial([v.x, v.y, v.z]);
  return [eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC];
};

const RAIO_TERRA_PC = (BODY_AXES.earth[0] / AU_KM) * AU_PARA_PC;
const RAIO_LUA_PC = (BODY_AXES.moon[0] / AU_KM) * AU_PARA_PC;
const grausEntre = (a: THREE.Vector3, b: THREE.Vector3) =>
  THREE.MathUtils.radToDeg(a.angleTo(b));
/** ângulo Sol–corpo–câmera: 0° = câmera do lado aceso, 180° = do escuro */
function faseVista(corpo: THREE.Vector3, cam: THREE.Vector3): number {
  const aoSol = corpo.clone().negate(); // o Sol é a origem da cena
  const aCamera = cam.clone().sub(corpo);
  return grausEntre(aoSol, aCamera);
}

const j = new Journey();
const T_CODA = j.duration - 17;

describe('os vetores pinados são a efeméride', () => {
  it('TERRA_PC e LUA_PC batem bit a bit com a cadeia na época pinada', () => {
    const terra = cadeiaPc('earth');
    const lua = cadeiaPc('moon');
    expect([TERRA_PC.x, TERRA_PC.y, TERRA_PC.z]).toEqual(terra);
    expect([LUA_PC.x, LUA_PC.y, LUA_PC.z]).toEqual(lua);
  });
});

describe('a encenação pedida, medida na trajetória', () => {
  // varredura fina da coda (passo 4 ms): raspão e chegada são rápidos
  const AMOSTRAS: { t: number; pos: THREE.Vector3 }[] = [];
  for (let t = T_CODA; t <= j.duration; t += 0.004) {
    AMOSTRAS.push({ t, pos: j.at(t).pos.clone() });
  }

  it('a coda parte do quadro congelado da deriva, sem salto', () => {
    const fimDaDeriva = j.at(T_CODA - 0.001).pos;
    const inicioDaCoda = j.at(T_CODA).pos;
    expect(inicioDaCoda.distanceTo(fimDaDeriva) / fimDaDeriva.length()).toBeLessThan(1e-12);
  });

  it('o raspão toca ~7 raios lunares e a Lua enche o quadro', () => {
    const menor = AMOSTRAS.reduce(
      (m, a) => Math.min(m, a.pos.distanceTo(LUA_PC)),
      Infinity
    );
    expect(menor).toBeGreaterThan(3.1e-10);
    expect(menor).toBeLessThan(3.9e-10);
    const diametroGraus = 2 * THREE.MathUtils.radToDeg(Math.atan(RAIO_LUA_PC / menor));
    expect(diametroGraus).toBeGreaterThan(14);
    // o dono pediu um instante, não um piscar: ~1,5–2 s com ela grande
    const dezRaios = 10 * RAIO_LUA_PC;
    const perto = AMOSTRAS.filter((a) => a.pos.distanceTo(LUA_PC) < dezRaios);
    expect(perto.length * 0.004).toBeGreaterThan(1.4);
    expect(perto.length * 0.004).toBeLessThan(3.2);
  });

  it('a Lua do raspão está acesa (flanco solar), não de costas', () => {
    const noRaspao = AMOSTRAS.reduce((m, a) =>
      a.pos.distanceTo(LUA_PC) < m.pos.distanceTo(LUA_PC) ? a : m
    );
    expect(faseVista(LUA_PC, noRaspao.pos)).toBeLessThan(120);
  });

  it('no raspão a Lua fica DENTRO do quadro', () => {
    const noRaspao = AMOSTRAS.reduce((m, a) =>
      a.pos.distanceTo(LUA_PC) < m.pos.distanceTo(LUA_PC) ? a : m
    );
    const s = j.at(noRaspao.t);
    const camLua = LUA_PC.clone().sub(s.pos);
    const olhar = s.look.clone().sub(s.pos);
    expect(grausEntre(camLua, olhar)).toBeLessThan(s.fov * 0.45);
  });

  // A mira do take é MIRA_DO_POUSO (item 108): a Terra deslocada 11° pelo
  // norte da tela NO RAIO DO POUSO, para o retrato de família caber no
  // último quadro. É um PONTO EM MUNDO, então de longe ele e a Terra são o
  // mesmo alvo — a costura com o plano anterior (que mira a Terra) está
  // medida abaixo em graus, e é ela que garante que a troca não é um corte.
  it('o take começa e termina na mira do pouso — no joelho o olhar cede à Lua', () => {
    const tTake = T_DO_TAKE;
    const noRaspao = AMOSTRAS.reduce((m, a) =>
      a.pos.distanceTo(LUA_PC) < m.pos.distanceTo(LUA_PC) ? a : m
    );
    expect(j.at(tTake).look.distanceTo(MIRA_DO_POUSO)).toBeLessThan(1e-12);
    const noJoelho = j.at(noRaspao.t);
    const paraTerra = TERRA_PC.clone().sub(noJoelho.pos).normalize();
    const paraLua = LUA_PC.clone().sub(noJoelho.pos).normalize();
    const olhar = noJoelho.look.clone().sub(noJoelho.pos).normalize();
    expect(grausEntre(olhar, paraTerra)).toBeGreaterThan(20);
    expect(grausEntre(olhar, paraLua)).toBeLessThan(12);
    expect(j.at(j.duration).look.distanceTo(MIRA_DO_POUSO)).toBeLessThan(1e-12);
  });

  it('a troca de mira na costura dos dois planos da coda é invisível', () => {
    // o plano anterior mira a TERRA; o take mira MIRA_DO_POUSO. A troca só
    // vale porque, de 2,9 milhões de km, os dois pontos são o mesmo alvo.
    const antes = j.at(T_DO_TAKE - 0.001);
    const depois = j.at(T_DO_TAKE + 0.001);
    const salto = grausEntre(
      antes.look.clone().sub(antes.pos),
      depois.look.clone().sub(depois.pos)
    );
    expect(salto).toBeLessThan(0.2);
  });

  /**
   * AS COSTURAS QUE O DOLLY ZOOM ABRIU (item 108 v2). A coda ganhou dois
   * planos no fim — o recuo e a parada —, e com eles duas emendas novas:
   * take→dolly e dolly→parada. Nenhuma pode ser um corte, nem de
   * posição, nem de lente, nem de VELOCIDADE, que é o que só este bloco
   * cobra: o arco pousa com derivada zero (`progresso` de pouso) e o
   * recuo parte com derivada zero (`rampa` com ritmo `glide`), e trocar
   * qualquer um dos dois por um ritmo que arranca com velocidade abre um
   * degrau aqui. O ponto do meio entra como controle: ele NÃO é emenda,
   * e mede o mesmo que os outros dois no meio do movimento.
   */
  it('as emendas do dolly zoom não saltam — nem posição, nem lente, nem velocidade', () => {
    // O SALTO SE MEDE CONTRA A VIZINHANÇA, não contra zero: na emenda a
    // câmera está em movimento, e um limiar absoluto ou reprovaria o
    // movimento legítimo ou deixaria passar um corte de câmera lenta.
    const passo = 0.002;
    const desloca = (x: number) => j.at(x + passo).pos.distanceTo(j.at(x - passo).pos);
    const abreLente = (x: number) => Math.abs(j.at(x + passo).fov - j.at(x - passo).fov);
    const taxa = (x: number) => {
      const r0 = j.at(x - passo).pos.distanceTo(TERRA_PC);
      const r1 = j.at(x + passo).pos.distanceTo(TERRA_PC);
      return (r1 - r0) / (2 * passo) / r1;
    };
    for (const t of [T_DO_DOLLY, T_DO_DOLLY + 1.25, T_DO_DOLLY + 2.5]) {
      const vizinhos = (f: (x: number) => number) =>
        Math.max(f(t - 4 * passo), f(t + 4 * passo));
      expect(desloca(t)).toBeLessThan(3 * vizinhos(desloca) + 1e-14);
      expect(abreLente(t)).toBeLessThan(3 * vizinhos(abreLente) + 1e-6);
      // e a VELOCIDADE radial não dá degrau (medida em raios por segundo)
      expect(Math.abs(taxa(t - 3 * passo) - taxa(t + 3 * passo))).toBeLessThan(0.06);
    }
  });

  it('a volta chega pelo lado escuro e pousa no claro, com a Terra grande', () => {
    expect(faseVista(TERRA_PC, j.at(T_DA_VOLTA).pos)).toBeGreaterThan(135);
    const fim = j.at(j.duration).pos;
    expect(faseVista(TERRA_PC, fim)).toBeLessThan(45);
    // O PONTO MAIS PERTO do filme é o POUSO, não o último quadro: desde o
    // dolly zoom a câmera recua depois de pousar, e é a lente que segura
    // o tamanho. O que "Terra grande" quer dizer se mede nos DOIS:
    // ângulo no pouso e fração do quadro no fim.
    const noPouso = j.at(T_DO_DOLLY).pos.distanceTo(TERRA_PC);
    const anguloNoPouso = 2 * THREE.MathUtils.radToDeg(Math.atan(RAIO_TERRA_PC / noPouso));
    expect(anguloNoPouso).toBeGreaterThan(21);
    expect(anguloNoPouso).toBeLessThan(25);
    const s = j.at(j.duration);
    const discoNdc = Math.tan(Math.atan(RAIO_TERRA_PC / fim.distanceTo(TERRA_PC)))
      / Math.tan(THREE.MathUtils.degToRad(s.fov / 2));
    expect(discoNdc).toBeGreaterThan(0.55); // o disco toma 60% da altura
    expect(discoNdc).toBeLessThan(0.66);
    expect(s.look.distanceTo(MIRA_DO_POUSO)).toBeLessThan(1e-12);
  });

  it('o filme termina CONGELADO na Terra (o pouso é antes do fim)', () => {
    const p1 = j.at(j.duration - 0.4).pos;
    const p2 = j.at(j.duration).pos;
    expect(p1.distanceTo(p2)).toBe(0);
  });

  it('o instante da coda é 16:00 UTC do dia do retrato', () => {
    expect(JD_DO_FILME_TDB).toBe(EPOCA_JD_TDB + 16 / 24);
  });

  it('o último quadro tem os POLOS PARA CIMA (pedido do dono)', () => {
    // a câmera reconstruída com as MESMAS peças do rig: galacticUp,
    // lookAt e rotateZ(roll) — não uma reescrita da conta
    const s = j.at(j.duration);
    const cam = new THREE.PerspectiveCamera(s.fov, 4 / 3, 0.1, 10);
    cam.position.copy(s.pos);
    const viewDir = s.look.clone().sub(s.pos).normalize();
    galacticUp(viewDir, cam.up);
    cam.lookAt(s.look);
    cam.rotateZ(s.roll);
    cam.updateMatrixWorld();
    // o "para cima" da tela é o +Y da câmera no mundo; o norte da Terra
    // é o +Z do frame equatorial, projetado perpendicular ao olhar
    const upDaTela = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const norte = new THREE.Vector3(0, 0, 1)
      .addScaledVector(viewDir, -viewDir.z)
      .normalize();
    expect(grausEntre(upDaTela, norte)).toBeLessThan(0.5);
  });
});

/**
 * O RETRATO DE FAMÍLIA — VERSÃO 2 (item 108, conferência do dono de
 * 31/08: *"a lua nao está fácil de entender que é a Lua... aproximar
 * mais ela e a terra e melhorar o enquadramento para que as 2 ocupem a
 * mesma cena de forma incontestável"*).
 *
 * A v1 punha os dois no quadro e parava aí: com a lente de 52° a Lua
 * valia 0,51° de disco, isto é 7,4 px de altura na vista oficial, e um
 * disco de 7 px é um ponto. A v2 ataca o TAMANHO, e são três peças —
 * cada cobrança abaixo mata uma delas:
 *   - o POUSO se ancora na LINHA ANTI-LUA (14° fora dela) em vez do
 *     eixo solar: a Lua cai a 12,0° do centro da Terra, e não a 32,9°;
 *   - a LENTE final fecha em 20°, não em 52° — o que só cabe porque a
 *     separação encolheu;
 *   - o DOLLY ZOOM recua a câmera 1,9× com a lente na razão que segura
 *     a Terra: a Lua cresce de 10,8 px para 19,1 px sem a Terra mudar
 *     de tamanho nem de lugar.
 * As medidas são no quadro do rig (mesmas peças: galacticUp, lookAt,
 * rotateZ) e no aspecto da vista oficial `fim-do-filme` (1200×813).
 */
describe('o fim mostra a Lua E a Terra', () => {
  const ASPECTO_DA_VISTA = 1200 / 813;
  /** NDC de um corpo no quadro do rig; +∞ atrás da câmera */
  function noQuadro(t: number, alvo: THREE.Vector3) {
    const s = j.at(t);
    const cam = new THREE.PerspectiveCamera(s.fov, ASPECTO_DA_VISTA, 1e-12, 10);
    cam.position.copy(s.pos);
    const viewDir = s.look.clone().sub(s.pos).normalize();
    galacticUp(viewDir, cam.up);
    cam.lookAt(s.look);
    cam.rotateZ(s.roll);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
    if (alvo.clone().applyMatrix4(cam.matrixWorldInverse).z >= 0) {
      return { x: Infinity, y: Infinity, fora: Infinity };
    }
    const p = alvo.clone().project(cam);
    return { x: p.x, y: p.y, fora: Math.max(Math.abs(p.x), Math.abs(p.y)) };
  }

  /** altura do disco em px na vista oficial (1200×813) */
  function emPixels(t: number, raioPc: number) {
    const s = j.at(t);
    const raio = Math.atan(raioPc / s.pos.distanceTo(
      raioPc === RAIO_LUA_PC ? LUA_PC : TERRA_PC));
    return 2 * 813 * Math.tan(raio) / Math.tan(THREE.MathUtils.degToRad(s.fov / 2)) / 2;
  }

  it('no último quadro a Lua está no quadro com folga, e a Terra manda', () => {
    const lua = noQuadro(j.duration, LUA_PC);
    expect(lua.fora).toBeLessThan(0.78); // medido 0,662
    expect(lua.x).toBeGreaterThan(0.15); // ela entra pela DIAGONAL de cima
    expect(lua.y).toBeGreaterThan(0.4); //  à direita, não pelo lado nem por cima
    const terra = noQuadro(j.duration, TERRA_PC);
    // a Terra assenta embaixo à esquerda: o disco INTEIRO no quadro, com
    // ar nas quatro bordas e a diagonal de cima livre para a Lua
    const s = j.at(j.duration);
    const raio = Math.atan(RAIO_TERRA_PC / s.pos.distanceTo(TERRA_PC));
    const meioQuadro = Math.tan(THREE.MathUtils.degToRad(s.fov / 2));
    const emNdc = Math.tan(raio) / meioQuadro;
    expect(terra.y - emNdc).toBeGreaterThan(-0.95); // não corta embaixo
    expect(terra.y - emNdc).toBeLessThan(-0.78); // nem flutua no meio
    expect(terra.x - emNdc / ASPECTO_DA_VISTA).toBeGreaterThan(-0.95); // nem à esquerda
    expect(terra.y + emNdc).toBeLessThan(0.45); // o alto do quadro é da Lua
  });

  /**
   * A COBRANÇA QUE O DONO PEDIU EM PALAVRAS ("a lua nao está fácil de
   * entender que é a Lua"): a Lua tem de ter DISCO, não ponto. Na v1
   * ela media 7,4 px de altura na vista oficial; o piso abaixo é o que
   * separa um globo com fase de uma estrela com halo, e ele reprova
   * qualquer volta à lente aberta ou ao pouso ancorado no eixo solar.
   */
  it('a Lua tem disco, não ponto, e a Terra continua a dona do quadro', () => {
    const lua = emPixels(j.duration, RAIO_LUA_PC);
    expect(lua).toBeGreaterThan(16); // medido 19,1 px (a v1 dava 7,4)
    const terra = emPixels(j.duration, RAIO_TERRA_PC);
    expect(terra).toBeGreaterThan(440); // medido 489 px
  });

  /**
   * O DOLLY ZOOM (pedido do dono em 31/08: "nao tem um truque de lente
   * que muda essa perspectiva?"). A promessa é exata e é esta: enquanto
   * a câmera recua, a Terra não muda de tamanho NEM DE LUGAR, e a Lua
   * cresce. Tirar o recuo (pousar direto no raio final) mata o
   * crescimento; tirar a lei da lente (uma lente digitada à mão) mata a
   * âncora — e as duas mortes aparecem aqui.
   */
  it('no dolly zoom a Terra fica parada e a Lua cresce', () => {
    const ref = noQuadro(T_DO_DOLLY, TERRA_PC);
    let menor = Infinity, maior = -Infinity, deriva = 0;
    for (let t = T_DO_DOLLY; t <= j.duration; t += 0.02) {
      const px = emPixels(t, RAIO_TERRA_PC);
      menor = Math.min(menor, px);
      maior = Math.max(maior, px);
      const q = noQuadro(t, TERRA_PC);
      deriva = Math.max(deriva, Math.hypot(q.x - ref.x, q.y - ref.y));
    }
    // A ÂNCORA É EXATA, e o teto cobra isso: a lente ancorada é função
    // da POSIÇÃO (`lente: {tipo:'ancorada'}`), não do relógio. Trocá-la
    // por keyframes de graus — o primeiro desenho desta obra — devolve
    // 1,2% de respiro e reprova aqui.
    expect(maior / menor - 1).toBeLessThan(0.004); // respiro medido 0,00%
    expect(deriva).toBeLessThan(0.006); // deriva medida 0,0021 NDC (1 px)
    // e a câmera RECUOU de verdade — sem isso não há efeito nenhum
    const recuo = j.at(j.duration).pos.distanceTo(TERRA_PC)
      / j.at(T_DO_DOLLY).pos.distanceTo(TERRA_PC);
    expect(recuo).toBeGreaterThan(1.7); // medido 1,90×
    const cresceu = emPixels(j.duration, RAIO_LUA_PC) / emPixels(T_DO_DOLLY, RAIO_LUA_PC);
    expect(cresceu).toBeGreaterThan(1.6); // medido 1,77×
  });

  it('o retrato dura pelo menos 2 s antes do fim', () => {
    let entrou = NaN;
    for (let t = j.duration - 6; t <= j.duration; t += 0.01) {
      if (noQuadro(t, LUA_PC).fora <= 0.85 && noQuadro(t, TERRA_PC).fora <= 1) {
        entrou = t;
        break;
      }
    }
    expect(j.duration - entrou).toBeGreaterThan(2); // medido 3,85 s
  });
});
