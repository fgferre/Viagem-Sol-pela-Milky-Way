// Serve: dono — o filme solar monta com o prólogo no Sol, o ato I dos mundos de pedra (da Terra vista da Lua a Ceres) e os atos de fora, legendas nas duas línguas e a câmera perto dos corpos sem entrar neles
// A montagem do filme solar: duração, legendas, apoios, a geometria das
// aproximações e a troca de relógio, medidas nos próprios planos (o
// relógio de Journey.at: ritmo do plano, glide quando ausente) — antes de
// o filme ser registrado.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { MetaEfemerides } from '../../../../lib/atlas/efemerides';
import { decodeEfemerides, MotorEfemerides } from '../../../../lib/atlas/efemerides';
import { eclipticaParaEquatorial, AU_PARA_PC } from '../../../../lib/atlas/frameGalactico';
import { IAU_ORIENTATIONS } from '../../../../lib/atlas/iauOrientation';
import { baseCorpoEquatorial } from '../../../../lib/atlas/orientacao';
import { RELEVO_DA_LUA } from '../../../world/corpos/rochoso';

// journey puxa world/galaxy, que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { montarFilmeSolar, raioPc, RAIO_DOS_ANEIS } = await import('./montar');
const { RAIO_SOL_PC } = await import('../../../escala');
const { glide } = await import('../../movimentos');
const { auditarRoteiro, Journey } = await import('../../journey');

const filme = montarFilmeSolar();
const { shots, starts, duracao, apoios, pinos } = filme;

const DATA_DIR = fileURLToPath(new URL('../../../../../public/data/atlas/', import.meta.url));
const binNode = readFileSync(join(DATA_DIR, 'efemerides.bin'));
const motor = new MotorEfemerides(
  decodeEfemerides(
    binNode.buffer.slice(binNode.byteOffset, binNode.byteOffset + binNode.byteLength),
    JSON.parse(readFileSync(join(DATA_DIR, 'efemerides_meta.json'), 'utf8')) as MetaEfemerides
  )
);

/** a câmera no instante t, com o relógio de Journey.at: posição e mira
 *  do plano na fração do relógio */
function amostra(t: number): { pos: THREE.Vector3; look: THREE.Vector3 } {
  let i = shots.length - 1;
  for (let s = 0; s < shots.length; s++) {
    if (t < starts[s] + shots[s].dur) { i = s; break; }
  }
  const s = shots[i];
  const ke = (s.ease ?? glide)(THREE.MathUtils.clamp((t - starts[i]) / s.dur, 0, 1));
  return { pos: s.pos(ke, new THREE.Vector3()), look: s.look(ke, new THREE.Vector3()) };
}
const camera = (t: number) => amostra(t).pos;

/** a menor distância do plano `i` ao corpo, em raios (amostragem fina:
 *  o ritmo é monótono, então os pontos do plano são os de pos(k)) */
function menorDistancia(i: number, id: string, raio = raioPc(id)): number {
  let menor = Infinity;
  const p = new THREE.Vector3();
  for (let j = 0; j <= 20000; j++) {
    menor = Math.min(menor, shots[i].pos(j / 20000, p).distanceTo(pinos.get(id)!) / raio);
  }
  return menor;
}

/** o índice do primeiro plano do ato `n` (0 = prólogo, 1 = ato I…) */
const primeiroDoAto = (n: number) => filme.planosPorAto.slice(0, n).reduce((a, b) => a + b, 0);
const inicioDoAto = (n: number) => starts[primeiroDoAto(n)];
/** os planos do ato I, pela ordem de casa.json */
const ATO_I = {
  chegadaAMercurio: primeiroDoAto(1), raspaoDeMercurio: primeiroDoAto(1) + 1,
  travessiaAVenus: primeiroDoAto(1) + 2, passagemPorVenus: primeiroDoAto(1) + 3,
  chegadaATerra: primeiroDoAto(1) + 4, vooSobreATerra: primeiroDoAto(1) + 5,
  saidaParaALua: primeiroDoAto(1) + 7, mergulhoNaLua: primeiroDoAto(1) + 8,
  nascerDaTerra: primeiroDoAto(1) + 9, terraSobreOHorizonte: primeiroDoAto(1) + 10,
  rumoDeMarte: primeiroDoAto(1) + 11, chegadaAMarte: primeiroDoAto(1) + 12,
  raspaoDeMarte: primeiroDoAto(1) + 13, travessiaACeres: primeiroDoAto(1) + 14,
  passagemPorCeres: primeiroDoAto(1) + 15,
};

describe('o filme solar monta', () => {
  it('dura o prólogo no Sol, o ato I de Mercúrio a Ceres e os atos de fora da v3 (330–345 s), em cinco atos', () => {
    expect(duracao).toBeGreaterThanOrEqual(330);
    expect(duracao).toBeLessThanOrEqual(345);
    expect(filme.planosPorAto).toHaveLength(5);
    expect(filme.planosPorAto[1]).toBe(16);
  });

  it('toda legenda tem o par em inglês', () => {
    const semIngles = shots.flatMap((s) => s.captions ?? [])
      .filter((c) => !c.en?.text || (c.sub !== undefined && !c.en.sub))
      .map((c) => c.text);
    expect(semIngles).toEqual([]);
  });

  it('as legendas não se sobrepõem nem atravessam um corte sem ponte', () => {
    const janelas = shots.flatMap((s, i) => (s.captions ?? []).map((c) => ({
      texto: c.text, i,
      t0: starts[i] + c.at * s.dur,
      t1: starts[i] + c.at * s.dur + (c.dur ?? 8.6),
      ponte: c.bridge ?? false,
    }))).sort((a, b) => a.t0 - b.t0);
    const sobrepostas = janelas.slice(1).filter((c, j) => c.t0 < janelas[j].t1).map((c) => c.texto);
    const vazadas = janelas.filter((c) =>
      c.i < shots.length - 1 && !c.ponte && c.t1 > starts[c.i] + shots[c.i].dur).map((c) => c.texto);
    expect(sobrepostas).toEqual([]);
    expect(vazadas).toEqual([]);
  });

  it('os corpos são pedidos antes de a câmera chegar a eles', () => {
    const antesDe = (t: number, ids: string[]) =>
      ids.filter((id) => !apoios.preAquecerCorpo(t - 1e-6, id));
    // Mercúrio e Vênus desde a partida do Sol, um plano inteiro antes da
    // chegada a Mercúrio; a Terra e a Lua desde a travessia para Vênus
    const partida = starts[filme.planosPorAto[0] - 1];
    expect(['mercury', 'venus'].filter((id) => !apoios.preAquecerCorpo(partida, id))).toEqual([]);
    expect(apoios.precisaEfemerides(partida)).toBe(true);
    const travessia = starts[ATO_I.travessiaAVenus];
    expect(['earth', 'moon'].filter((id) => !apoios.preAquecerCorpo(travessia, id))).toEqual([]);
    // Marte e Ceres desde a saída para a Lua, antes do corte para Marte
    expect(antesDe(starts[ATO_I.saidaParaALua] + 1e-6, ['mars', 'ceres'])).toEqual([]);
    expect(antesDe(inicioDoAto(2), ['jupiter', 'io', 'europa', 'ganymede', 'callisto'])).toEqual([]);
    expect(antesDe(inicioDoAto(3), ['saturn', 'enceladus', 'hyperion', 'mimas', 'titan'])).toEqual([]);
  });

  it('a auditoria editorial do motor não acha sobreposição nem legenda vazando um corte sem ponte', () => {
    const auditoria = auditarRoteiro(shots, starts);
    expect(auditoria.duration).toBe(duracao);
    expect(auditoria.overlaps).toEqual([]);
    expect(auditoria.crossings.filter((c) => !c.bridge)).toEqual([]);
  });

  it('cada ato tem ao menos um ponto de conferência (qa)', () => {
    const porAto = filme.planosPorAto.map((_, n) => {
      const de = filme.planosPorAto.slice(0, n).reduce((a, b) => a + b, 0);
      return shots.slice(de, de + filme.planosPorAto[n])
        .flatMap((s) => Object.keys(s.qa ?? {}));
    });
    for (const nomes of porAto) expect(nomes.length).toBeGreaterThan(0);
  });
});

describe('a geometria das aproximações', () => {
  // plano → corpo que ele aproxima, na ordem dos planos
  const APROXIMACOES: [number, string][] = [
    [ATO_I.raspaoDeMercurio, 'mercury'], [ATO_I.passagemPorVenus, 'venus'],
    [ATO_I.chegadaATerra, 'earth'], [ATO_I.vooSobreATerra, 'earth'],
    [ATO_I.nascerDaTerra, 'moon'], [ATO_I.terraSobreOHorizonte, 'moon'],
    [ATO_I.raspaoDeMarte, 'mars'], [ATO_I.passagemPorCeres, 'ceres'],
    [primeiroDoAto(2) + 1, 'io'], [primeiroDoAto(2) + 2, 'jupiter'],
    [primeiroDoAto(3) + 2, 'saturn'], [primeiroDoAto(3) + 3, 'enceladus'],
    [primeiroDoAto(3) + 5, 'hyperion'],
  ];

  it('o voo do prólogo não desce de 2 raios do Sol (a régua das fotos de 05/10: abaixo, a granulação amolece)', () => {
    let menor = Infinity;
    for (let t = 0; t <= inicioDoAto(1); t += 0.01) menor = Math.min(menor, camera(t).length() / RAIO_SOL_PC);
    expect(menor).toBeGreaterThanOrEqual(2);
    expect(menor).toBeLessThan(2.2); // e chega perto: é o voo rasante
  });

  it.each(APROXIMACOES)('o plano %i passa entre 1,3 e 4 raios de %s', (i, id) => {
    const d = menorDistancia(i, id);
    expect(d).toBeGreaterThanOrEqual(1.3);
    expect(d).toBeLessThanOrEqual(4);
  });

  it('a câmera nunca entra num corpo (Hipérion pela forma medida, até 1,37 raio)', () => {
    const h = RELEVO_DA_LUA.hyperion;
    const dentro: string[] = [];
    for (const id of pinos.keys()) {
      if (id === 'sun') continue;
      const raio = raioPc(id) * (id === 'hyperion' ? 1 + h.vies + h.escala : 1);
      for (let i = 0; i < shots.length; i++) {
        if (menorDistancia(i, id, raio) < 1.3) dentro.push(`${id} no plano ${i}`);
      }
    }
    expect(dentro).toEqual([]);
  });

  it('o plano dos anéis só é cruzado uma vez dentro do anel, na divisão de Cassini', () => {
    const polo = new THREE.Vector3(...baseCorpoEquatorial(IAU_ORIENTATIONS.saturn, filme.jd).polo);
    const saturno = pinos.get('saturn')!;
    const rs = raioPc('saturn');
    const cruzamentos: number[] = [];
    let anterior = NaN;
    for (let t = 0; t <= duracao; t += 0.002) {
      const v = camera(t).sub(saturno);
      const h = v.dot(polo) / rs;
      const r = Math.sqrt(Math.max(v.lengthSq() / (rs * rs) - h * h, 0));
      if (anterior * h < 0 && r < RAIO_DOS_ANEIS) cruzamentos.push(r);
      anterior = h;
    }
    expect(cruzamentos).toHaveLength(1);
    expect(cruzamentos[0]).toBeGreaterThan(1.95);
    expect(cruzamentos[0]).toBeLessThan(2.03);
  });
});

describe('as emendas do prólogo até o voo sobre a Terra', () => {
  // A REGRA DE EMENDA DO MOTOR (a mesma de voltaParaCasa.test.ts): a junta
  // não corta posição, mira, lente nem efeito de velocidade; e a câmera
  // ou pousa dos dois lados (ritmos que assentam) ou passa com a mesma
  // velocidade (a partida do Sol entrega à chegada a Mercúrio no meio do
  // caminho). Só o rig amacia a junta, e só mira e lente — a posição não.
  // Duas juntas do ato I são de outra espécie, e declaradas abaixo: a
  // partida de Mercúrio para Vênus SALTA para a travessia (como todas as
  // travessias do filme) e Vênus → Terra é um CORTE.
  const j = new Journey(shots, starts);
  const h = 1e-3;
  const velocidade = (t0: number, t1: number) =>
    j.at(t1).pos.sub(j.at(t0).pos).divideScalar(t1 - t0);
  /** a velocidade média do plano pelo CAMINHO (e não pela corda: a
   *  passagem por Vênus desce e volta, e a corda dela é curta) */
  const media = (i: number) => {
    let caminho = 0;
    const a = shots[i].pos(0, new THREE.Vector3());
    const b = new THREE.Vector3();
    for (let n = 1; n <= 200; n++) {
      shots[i].pos(n / 200, b);
      caminho += a.distanceTo(b);
      a.copy(b);
    }
    return caminho / shots[i].dur;
  };
  const olhar = (i: number, k: number) =>
    shots[i].look(k, new THREE.Vector3()).sub(shots[i].pos(k, new THREE.Vector3())).normalize();

  it.each([
    1, 2, 3, ATO_I.raspaoDeMercurio, ATO_I.passagemPorVenus, ATO_I.vooSobreATerra,
    // o raspão da Lua é UMA curva cortada em quatro planos (a lente fecha,
    // segura e reabre): passa de um para o outro com a mesma velocidade
    ATO_I.nascerDaTerra, ATO_I.terraSobreOHorizonte, ATO_I.rumoDeMarte,
  ])('a junta que abre o plano %i não salta', (i) => {
    const t = starts[i];
    const fim = shots[i - 1].pos(1, new THREE.Vector3());
    expect(fim.distanceTo(shots[i].pos(0, new THREE.Vector3()))).toBeLessThan(1e-9 * fim.length());
    expect(olhar(i - 1, 1).angleTo(olhar(i, 0))).toBeLessThan(1e-6);
    const antes = j.at(t - 1e-9);
    const depois = j.at(t);
    expect(Math.abs(antes.fov - depois.fov)).toBeLessThan(1e-3);
    expect(Math.abs(antes.warp - depois.warp)).toBeLessThan(1e-3);
    const vAntes = velocidade(t - 2 * h, t - h);
    const vDepois = velocidade(t + h, t + 2 * h);
    const pousa = vAntes.length() < 0.01 * media(i - 1) && vDepois.length() < 0.01 * media(i);
    const passaIgual = vAntes.distanceTo(vDepois) < 0.15 * vAntes.length();
    expect(pousa || passaIgual).toBe(true);
  });
});

describe('as duas juntas declaradas do ato I', () => {
  const j = new Journey(shots, starts);
  const olhar = (i: number, k: number) =>
    shots[i].look(k, new THREE.Vector3()).sub(shots[i].pos(k, new THREE.Vector3())).normalize();

  it('a travessia para Vênus salta de velocidade, não de posição nem de olhar (como as outras travessias)', () => {
    const i = ATO_I.travessiaAVenus;
    const fim = shots[i - 1].pos(1, new THREE.Vector3());
    expect(fim.distanceTo(shots[i].pos(0, new THREE.Vector3()))).toBeLessThan(1e-9 * fim.length());
    expect(olhar(i - 1, 1).angleTo(olhar(i, 0))).toBeLessThan(1e-6);
    expect(j.at(starts[i]).warp).toBeCloseTo(0.8, 6); // o efeito de velocidade nasce alto e cai
  });

  it('Vênus → Terra é um corte: a posição salta mais de 1 UA, o olhar e a lente não mudam', () => {
    const i = ATO_I.chegadaATerra;
    const salto = shots[i - 1].pos(1, new THREE.Vector3()).distanceTo(shots[i].pos(0, new THREE.Vector3()));
    expect(salto / AU_PARA_PC).toBeGreaterThan(1);
    // o disco de Vênus dá lugar ao Sol no mesmo ponto do quadro: a mola da junta não gira nada
    expect(olhar(i - 1, 1).angleTo(olhar(i, 0))).toBeLessThan(1e-6);
    expect(Math.abs(j.at(starts[i] - 1e-9).fov - j.at(starts[i]).fov)).toBeLessThan(1e-3);
    // a câmera do fim de Vênus está do lado do Sol: Vênus a menos de 5° de fase, cheia
    const venus = pinos.get('venus')!;
    const camera = shots[i - 1].pos(1, new THREE.Vector3());
    const fase = THREE.MathUtils.radToDeg(camera.clone().sub(venus).angleTo(venus.clone().negate()));
    expect(fase).toBeLessThan(5);
  });

  it('Lua → Marte é um corte: a posição salta mais de 2 UA, o olhar e a lente não mudam, e Marte está cheio', () => {
    const i = ATO_I.chegadaAMarte;
    const salto = shots[i - 1].pos(1, new THREE.Vector3()).distanceTo(shots[i].pos(0, new THREE.Vector3()));
    expect(salto / AU_PARA_PC).toBeGreaterThan(2);
    expect(olhar(i - 1, 1).angleTo(olhar(i, 0))).toBeLessThan(1e-6);
    expect(Math.abs(j.at(starts[i] - 1e-9).fov - j.at(starts[i]).fov)).toBeLessThan(1e-3);
    // a chegada vem do lado do Sol: Marte a menos de 2° de fase
    const marte = pinos.get('mars')!;
    const camera = shots[i].pos(0, new THREE.Vector3());
    expect(THREE.MathUtils.radToDeg(camera.clone().sub(marte).angleTo(marte.clone().negate()))).toBeLessThan(2);
    // e a reta da Lua a Marte (em conjunção, a 1° do Sol) passaria a menos de 5 raios do Sol
    const lua = pinos.get('moon')!;
    const d = marte.clone().sub(lua);
    const u = THREE.MathUtils.clamp(-lua.dot(d) / d.lengthSq(), 0, 1);
    expect(lua.clone().addScaledVector(d, u).length() / RAIO_SOL_PC).toBeLessThan(5);
  });

  it('a linha reta de Vênus à Terra passaria a menos de 6 raios do Sol — por isso o corte', () => {
    const v = pinos.get('venus')!;
    const t = pinos.get('earth')!;
    const d = t.clone().sub(v);
    const u = THREE.MathUtils.clamp(-v.dot(d) / d.lengthSq(), 0, 1);
    expect(v.clone().addScaledVector(d, u).length() / RAIO_SOL_PC).toBeLessThan(6); // medido 4,7
  });
});

describe('o ponto azul pálido', () => {
  // a Terra no céu dos atos II–IV, pela cadeia dos pinos, vista da câmera
  // do roteiro, enquanto a legenda está no ar: a mira é o Sol (centro do
  // quadro), então a distância em px é a do ângulo, na lente do plano
  const v = motor.posicaoHeliocentrica('earth', filme.jd2);
  const terra = new THREE.Vector3(...eclipticaParaEquatorial([v.x, v.y, v.z])).multiplyScalar(AU_PARA_PC);
  const i = shots.findIndex((s) => s.captions?.some((c) => c.text === 'A Terra, daqui'));
  const c = shots[i].captions!.find((x) => x.text === 'A Terra, daqui')!;
  const t0 = starts[i] + c.at * shots[i].dur;
  const t1 = t0 + (c.dur ?? 8.6);

  it('a Terra fica a 60–150 px do Sol, num quadro de 1280×720, do começo ao fim da legenda', () => {
    const s = shots[i];
    const fora: string[] = [];
    for (let t = t0; t <= t1; t += 0.05) {
      const k = THREE.MathUtils.clamp((t - starts[i]) / s.dur, 0, 1);
      const { pos, look } = amostra(t);
      const fov = THREE.MathUtils.lerp(s.fov0, s.fov1, s.fovEase ? s.fovEase(k) : (s.ease ?? glide)(k));
      const angulo = look.clone().sub(pos).angleTo(terra.clone().sub(pos));
      const px = (360 / Math.tan(THREE.MathUtils.degToRad(fov / 2))) * Math.tan(angulo);
      if (px < 60 || px > 150) fora.push(`t=${t.toFixed(2)}: ${px.toFixed(0)} px`);
    }
    expect(look0EhOSol()).toBe(true);
    expect(fora).toEqual([]);
  });

  /** a mira do plano é o Sol em toda a janela da legenda */
  function look0EhOSol() {
    for (let t = t0; t <= t1; t += 0.5) {
      const { pos, look } = amostra(t);
      if (look.clone().sub(pos).angleTo(pos.clone().negate()) > 1e-6) return false;
    }
    return true;
  }
});

describe('os dois relógios: o prólogo e o ato I em JD_A, os atos de fora em JD2', () => {
  // o primeiro plano de jupiter.json: a travessia para Júpiter
  const travessia = filme.planosPorAto[0] + filme.planosPorAto[1];
  const fimDaTravessia = starts[travessia] + shots[travessia].dur;
  const fimDaTroca = filme.tTroca + filme.duracaoDaTroca;
  /** o menor ângulo entre a visada e as direções da câmera à Terra e à Lua */
  const foraDaVisada = (t: number) => {
    const { pos, look } = amostra(t);
    const visada = look.clone().sub(pos);
    return THREE.MathUtils.radToDeg(Math.min(
      visada.angleTo(pinos.get('earth')!.clone().sub(pos)),
      visada.angleTo(pinos.get('moon')!.clone().sub(pos))
    ));
  };
  /** Júpiter desenhado no instante t: a efeméride no céu do filme nesse segundo */
  const jupiterEm = (t: number) => {
    const v = motor.posicaoHeliocentrica('jupiter', filme.jdDoFilme(t));
    return new THREE.Vector3(...eclipticaParaEquatorial([v.x, v.y, v.z])).multiplyScalar(AU_PARA_PC);
  };

  it('o calendário dá JD_A até a troca, JD2 depois da rampa e anda sem voltar no meio; o retrato (jd) é JD2', () => {
    expect(filme.jdDoFilme(0)).toBe(filme.jdA);
    expect(filme.jdDoFilme(filme.tTroca)).toBe(filme.jdA);
    expect(filme.jdDoFilme(fimDaTroca)).toBe(filme.jd2);
    expect(filme.jdDoFilme(duracao)).toBe(filme.jd2);
    expect(filme.jd).toBe(filme.jd2);
    let anterior = filme.jdDoFilme(filme.tTroca);
    for (let t = filme.tTroca; t <= fimDaTroca; t += 0.01) {
      const jd = filme.jdDoFilme(t);
      expect(jd).toBeLessThanOrEqual(anterior); // JD2 é nove dias ANTES de JD_A
      anterior = jd;
    }
  });

  it('a rampa acaba onde a travessia para Júpiter começa, e Terra e Lua ficam fora do quadro dela até o fim da travessia', () => {
    expect(fimDaTroca).toBe(starts[travessia]);
    let menor = Infinity;
    for (let t = filme.tTroca; t <= fimDaTravessia; t += 0.01) menor = Math.min(menor, foraDaVisada(t));
    // de Ceres (a 2,7 UA delas) Terra e Lua são pontos, não discos que giram;
    // o canto do quadro de 16:9 com a lente de 58° está a 48,5° do centro
    expect(menor).toBeGreaterThanOrEqual(45); // medido 46,9°, no começo da travessia
  });

  it('Júpiter, para onde o olhar vira durante a rampa, anda menos de 0,1° por quadro de 1/30 s', () => {
    const passo = 1 / 30;
    let maior = 0;
    for (let t = filme.tTroca; t < fimDaTroca; t += passo) {
      const { pos } = amostra(t + passo);
      maior = Math.max(maior, THREE.MathUtils.radToDeg(
        jupiterEm(t).sub(pos).angleTo(jupiterEm(t + passo).sub(pos))
      ));
    }
    expect(maior).toBeLessThan(0.1); // medido 0,020°
    // e o pulo que um degrau daria: os nove dias entre os dois céus
    const { pos } = amostra(filme.tTroca);
    const degrau = THREE.MathUtils.radToDeg(
      jupiterEm(filme.tTroca).sub(pos).angleTo(jupiterEm(fimDaTroca).sub(pos))
    );
    expect(degrau).toBeGreaterThan(0.5); // medido 0,61°: por isso a rampa
  });

  it('nenhuma legenda está aberta quando a troca começa', () => {
    const abertas = shots.flatMap((s, i) => (s.captions ?? []).map((c) => ({
      texto: c.text,
      t0: starts[i] + c.at * s.dur,
      t1: starts[i] + c.at * s.dur + (c.dur ?? 8.6),
    }))).filter((c) => c.t0 <= filme.tTroca && filme.tTroca < c.t1).map((c) => c.texto);
    expect(abertas).toEqual([]);
  });

  it('o cima é o polo norte da eclíptica na cena (equatorial J2000, ε = 23,4393°)', () => {
    // a cena é equatorial J2000: o polo galáctico do rig (GALACTIC_NORTH,
    // −0,8677, −0,1981, 0,4560) é RA 192,86°, Dec +27,13°; o da eclíptica
    // é RA 270°, Dec 66,56°
    expect(filme.cima.distanceTo(new THREE.Vector3(0, -0.3978, 0.9175))).toBeLessThan(1e-3);
  });
});
