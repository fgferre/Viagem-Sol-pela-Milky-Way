// Serve: dono — o filme solar monta com o prólogo no Sol, o ato I dos mundos de pedra (da Terra vista da Lua a Ceres) e os atos de fora, legendas nas duas línguas e a câmera perto dos corpos sem entrar neles
// A montagem do filme solar: duração, legendas, apoios, a geometria das
// aproximações e a troca de relógio do ato I para o II, medidas nos
// próprios planos (o
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
const { RELOGIOS_SOLAR } = await import('./pinos');
const { RAIO_SOL_PC } = await import('../../../escala');
const { glide } = await import('../../movimentos');
const { auditarRoteiro, Journey } = await import('../../journey');
const { PONTOS_DOS_CORPOS } = await import('./atos/geometria');
const { NUMEROS_PROLOGO, PONTOS_PROLOGO } = await import('./atos/prologo');
const { NUMEROS_CASA, PONTOS_CASA } = await import('./atos/casa');
const { NUMEROS_JUPITER, PONTOS_JUPITER } = await import('./atos/jupiter');
const { NUMEROS_SATURNO, PONTOS_SATURNO } = await import('./atos/saturno');
const { NUMEROS_AFASTAMENTO, PONTOS_AFASTAMENTO } = await import('./atos/afastamento');
const { NUMEROS_EPILOGO, PONTOS_EPILOGO } = await import('./atos/epilogo');

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

/** o plano de nome `nome` (o campo `nome` dos roteiros): índice, plano e início em segundos */
const plano = (nome: string) => {
  const i = shots.findIndex((s) => s.nome === nome);
  if (i < 0) throw new Error(`filme solar: sem plano “${nome}”`);
  return { i, shot: shots[i], inicio: starts[i] };
};

describe('o filme solar monta', () => {
  it('dura o prólogo no Sol, o ato I de Mercúrio a Ceres, Júpiter, Saturno, o ato IV de Urano ao retrato de família e o epílogo de volta à Terra (390–400 s), em seis atos', () => {
    expect(duracao).toBeGreaterThanOrEqual(390);
    expect(duracao).toBeLessThanOrEqual(400); // 395,25 s: o retrato acaba em 379,25 s e o epílogo dura 16 s
    expect(filme.planosPorAto).toHaveLength(6);
    expect(filme.planosPorAto[1]).toBe(16);
  });

  it('todo plano tem nome, e os nomes são únicos (os testes acham os planos por ele)', () => {
    const semNome = shots.flatMap((s, i) => (s.nome?.trim() ? [] : [i]));
    const nomes = shots.map((s) => s.nome);
    const repetidos = nomes.filter((n, i) => nomes.indexOf(n) !== i);
    expect(semNome).toEqual([]);
    expect(repetidos).toEqual([]);
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
    const partida = plano('solPartida').inicio;
    expect(['mercury', 'venus'].filter((id) => !apoios.preAquecerCorpo(partida, id))).toEqual([]);
    expect(apoios.precisaEfemerides(partida)).toBe(true);
    const travessia = plano('venusChegada').inicio;
    expect(['earth', 'moon'].filter((id) => !apoios.preAquecerCorpo(travessia, id))).toEqual([]);
    // Marte e Ceres desde a saída para a Lua, antes do corte para Marte
    expect(antesDe(plano('luaChegada').inicio + 1e-6, ['mars', 'ceres'])).toEqual([]);
    expect(antesDe(plano('jupiterChegada').inicio, ['jupiter', 'io', 'europa', 'ganymede', 'callisto'])).toEqual([]);
    expect(antesDe(plano('saturnoChegada').inicio, ['saturn', 'enceladus', 'hyperion', 'mimas', 'titan'])).toEqual([]);
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

describe('os pontos e números nomeados dos atos', () => {
  // montar.ts os reúne num objeto só: uma chave repetida entre dois atos
  // faria o último calar o primeiro, sem erro
  const repetidas = (porAto: Record<string, Readonly<Record<string, unknown>>>) => {
    const dono = new Map<string, string>();
    const achadas: string[] = [];
    for (const [ato, tabela] of Object.entries(porAto)) {
      for (const chave of Object.keys(tabela)) {
        if (dono.has(chave)) achadas.push(`${chave}: ${dono.get(chave)} e ${ato}`);
        else dono.set(chave, ato);
      }
    }
    return achadas;
  };

  it('os pontos dos corpos e dos seis atos não repetem nome', () => {
    expect(repetidas({
      corpos: PONTOS_DOS_CORPOS, prologo: PONTOS_PROLOGO, casa: PONTOS_CASA,
      jupiter: PONTOS_JUPITER, saturno: PONTOS_SATURNO, afastamento: PONTOS_AFASTAMENTO,
      epilogo: PONTOS_EPILOGO,
    })).toEqual([]);
  });

  it('os números dos seis atos não repetem nome', () => {
    expect(repetidas({
      prologo: NUMEROS_PROLOGO, casa: NUMEROS_CASA, jupiter: NUMEROS_JUPITER,
      saturno: NUMEROS_SATURNO, afastamento: NUMEROS_AFASTAMENTO, epilogo: NUMEROS_EPILOGO,
    })).toEqual([]);
  });
});

describe('a geometria das aproximações', () => {
  // plano → corpo que ele aproxima, na ordem dos planos
  const APROXIMACOES: [string, string][] = [
    ['mercurioRaspao', 'mercury'], ['venusRaspao', 'venus'],
    ['terraChegada', 'earth'], ['terraVoo', 'earth'],
    ['luaNascerDaTerra', 'moon'], ['luaTerraNoHorizonte', 'moon'],
    ['marteRaspao', 'mars'], ['ceresPassagem', 'ceres'],
    ['ioRaspao', 'io'], ['jupiterArco', 'jupiter'],
    ['saturnoRasante', 'saturn'], ['enceladoRaspao', 'enceladus'],
    ['hiperionRaspao', 'hyperion'],
  ];

  it('o voo do prólogo não desce de 2 raios do Sol (a régua das fotos de 05/10: abaixo, a granulação amolece)', () => {
    let menor = Infinity;
    for (let t = 0; t <= plano('mercurioChegada').inicio; t += 0.01) menor = Math.min(menor, camera(t).length() / RAIO_SOL_PC);
    expect(menor).toBeGreaterThanOrEqual(2);
    expect(menor).toBeLessThan(2.2); // e chega perto: é o voo rasante
  });

  it.each(APROXIMACOES)('o plano %s passa entre 1,3 e 4 raios de %s', (nome, id) => {
    const d = menorDistancia(plano(nome).i, id);
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
        if (menorDistancia(i, id, raio) < 1.3) dentro.push(`${id} no plano ${shots[i].nome}`);
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
    'solDisco', 'solPartida', 'mercurioChegada', 'mercurioRaspao', 'venusRaspao', 'terraVoo',
    // o raspão da Lua é UMA curva cortada em quatro planos (a lente fecha,
    // segura e reabre): passa de um para o outro com a mesma velocidade
    'luaNascerDaTerra', 'luaTerraNoHorizonte', 'luaRumoDeMarte',
  ])('a junta que abre o plano %s não salta', (nome) => {
    const { i, inicio: t } = plano(nome);
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
    const { i } = plano('venusChegada');
    const fim = shots[i - 1].pos(1, new THREE.Vector3());
    expect(fim.distanceTo(shots[i].pos(0, new THREE.Vector3()))).toBeLessThan(1e-9 * fim.length());
    expect(olhar(i - 1, 1).angleTo(olhar(i, 0))).toBeLessThan(1e-6);
    expect(j.at(starts[i]).warp).toBeCloseTo(0.8, 6); // o efeito de velocidade nasce alto e cai
  });

  it('Vênus → Terra é um corte: a posição salta mais de 1 UA, o olhar e a lente não mudam', () => {
    const { i } = plano('terraChegada');
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
    const { i } = plano('marteChegada');
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

describe('o retrato de família', () => {
  // os planetas no céu do ato IV (JD_E), pela cadeia dos pinos — é onde o
  // app os desenha no retrato —, vistos da câmera do roteiro: a mira é o
  // Sol (centro do quadro), então a distância em px é a do ângulo, na
  // lente do plano, num quadro de 1280×720
  const planeta = (id: string) => {
    const v = motor.posicaoHeliocentrica(id, RELOGIOS_SOLAR.escuro);
    return new THREE.Vector3(...eclipticaParaEquatorial([v.x, v.y, v.z])).multiplyScalar(AU_PARA_PC);
  };
  const j = new Journey(shots, starts);
  const { i } = plano('pontoAzulPalido');
  /** o último instante do retrato (o epílogo começa no seguinte) */
  const fimDoRetrato = starts[i] + shots[i].dur - 1e-9;
  const c = shots[i].captions!.find((x) => x.text === 'O retrato de família')!;
  const t0 = starts[i] + c.at * shots[i].dur;
  const t1 = t0 + (c.dur ?? 8.6);
  /** onde um ponto cai no quadro, em px do centro (x para a direita, y para cima) */
  const px = (t: number, p: THREE.Vector3) => {
    const { pos, look, fov } = j.at(t);
    const frente = look.clone().sub(pos).normalize();
    const cima = filme.cima.clone().addScaledVector(frente, -filme.cima.dot(frente)).normalize();
    const direita = new THREE.Vector3().crossVectors(frente, cima);
    const v = p.clone().sub(pos);
    const f = 360 / Math.tan(THREE.MathUtils.degToRad(fov / 2));
    return { x: (f * v.dot(direita)) / v.dot(frente), y: (f * v.dot(cima)) / v.dot(frente) };
  };

  it('a mira é o Sol, no centro do quadro, do começo ao fim da legenda', () => {
    for (let t = t0; t <= t1; t += 0.5) {
      const { pos, look } = j.at(t);
      expect(look.clone().sub(pos).angleTo(pos.clone().negate())).toBeLessThan(1e-6);
    }
  });

  it('a Terra fica fora do clarão e dentro do quadro: a 50–150 px do Sol do começo ao fim da legenda, a 60 px ou mais no fim', () => {
    const terra = planeta('earth');
    const fora: string[] = [];
    for (let t = t0; t <= t1; t += 0.05) {
      const { x, y } = px(t, terra);
      const d = Math.hypot(x, y);
      if (d < 50 || d > 150) fora.push(`t=${t.toFixed(2)}: ${d.toFixed(0)} px`);
    }
    expect(fora).toEqual([]); // medido 57 px quando a legenda entra
    const fim = px(fimDoRetrato, terra);
    expect(Math.hypot(fim.x, fim.y)).toBeGreaterThanOrEqual(60); // medido 70 px
  });

  it('no fim, a lente de 12°: a Terra e Júpiter à direita do Sol, Vênus e Marte à esquerda, Saturno à direita e dentro do quadro', () => {
    const lado = (id: string) => px(fimDoRetrato, planeta(id));
    expect(j.at(fimDoRetrato).fov).toBeCloseTo(12, 6);
    const [terra, venus, marte, jupiter, saturno] = ['earth', 'venus', 'mars', 'jupiter', 'saturn'].map(lado);
    expect(terra.x).toBeGreaterThan(0);
    expect(jupiter.x).toBeGreaterThan(terra.x);
    expect(venus.x).toBeLessThan(0);
    expect(marte.x).toBeLessThan(venus.x);
    expect(Math.hypot(venus.x, venus.y)).toBeGreaterThan(40); // medido 55 px
    // todos dentro do quadro de 1280×720, com folga para o nome
    for (const p of [terra, venus, marte, jupiter, saturno]) {
      expect(Math.abs(p.x)).toBeLessThan(560);
      expect(Math.abs(p.y)).toBeLessThan(300);
    }
  });
});

describe('os quatro relógios: o prólogo e o ato I em JD_A, Júpiter em JD_J, Saturno em JD2, o ato IV em JD_E e o epílogo de volta em JD_A', () => {
  // o primeiro plano de jupiter.json: a travessia para Júpiter
  const { shot: planoDaTravessia, inicio: inicioDaTravessia } = plano('jupiterChegada');
  const fimDaTravessia = inicioDaTravessia + planoDaTravessia.dur;
  const [paraJupiter, paraFora, paraEscuro, paraCasa] = filme.trocas;
  const fimDaTroca = paraJupiter.t + paraJupiter.duracao;
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

  it('quatro trocas: de JD_A a JD_J, de JD_J a JD2 e de JD2 a JD_E em rampas de 1,5 s, e de JD_E a JD_A num degrau no corte do epílogo', () => {
    expect(filme.trocas.map((x) => [x.de, x.para, x.duracao])).toEqual([
      ['a', 'jupiter', 1.5], ['jupiter', 'fora', 1.5], ['fora', 'escuro', 1.5], ['escuro', 'a', 0],
    ]);
    // o degrau cai EXATAMENTE no corte, e o corte salta: a câmera vem de 40 UA
    const { i, inicio } = plano('mesmaLuz');
    expect(paraCasa.t).toBe(inicio);
    const salto = shots[i - 1].pos(1, new THREE.Vector3()).distanceTo(shots[i].pos(0, new THREE.Vector3()));
    expect(salto / AU_PARA_PC).toBeGreaterThan(39); // medido 40,7 UA
  });

  it('o calendário dá o relógio de cada ato fora das rampas e anda sem voltar dentro delas; o retrato (jd) é JD2', () => {
    const { a, jupiter, fora, escuro } = RELOGIOS_SOLAR;
    expect(filme.jdDoFilme(0)).toBe(a);
    expect(filme.jdDoFilme(paraJupiter.t)).toBe(a);
    expect(filme.jdDoFilme(fimDaTroca)).toBe(jupiter);
    expect(filme.jdDoFilme(paraFora.t)).toBe(jupiter);
    expect(filme.jdDoFilme(paraFora.t + paraFora.duracao)).toBe(fora);
    expect(filme.jdDoFilme(paraEscuro.t)).toBe(fora);
    expect(filme.jdDoFilme(paraEscuro.t + paraEscuro.duracao)).toBe(escuro);
    expect(filme.jdDoFilme(paraCasa.t - 1e-6)).toBe(escuro);
    // no degrau, o instante do corte já é o céu novo
    expect(filme.jdDoFilme(paraCasa.t)).toBe(a);
    expect(filme.jdDoFilme(duracao)).toBe(a);
    expect(filme.jd).toBe(fora);
    for (const troca of filme.trocas) {
      const de = RELOGIOS_SOLAR[troca.de];
      const para = RELOGIOS_SOLAR[troca.para];
      let anterior = de;
      for (let t = troca.t; t <= troca.t + troca.duracao; t += 0.01) {
        const jd = filme.jdDoFilme(t);
        // sem passar do destino nem voltar para a origem
        expect(Math.sign(para - de) * (jd - anterior)).toBeGreaterThanOrEqual(0);
        expect(Math.sign(para - de) * (para - jd)).toBeGreaterThanOrEqual(0);
        anterior = jd;
      }
    }
  });

  it('a rampa para JD_J acaba onde a travessia para Júpiter começa, e Terra e Lua ficam fora do quadro dela até o fim da travessia', () => {
    expect(fimDaTroca).toBeCloseTo(inicioDaTravessia, 9);
    let menor = Infinity;
    for (let t = paraJupiter.t; t <= fimDaTravessia; t += 0.01) menor = Math.min(menor, foraDaVisada(t));
    // de Ceres (a 2,7 UA delas) Terra e Lua são pontos, não discos que giram;
    // o canto do quadro de 16:9 com a lente de 58° está a 48,5° do centro
    expect(menor).toBeGreaterThanOrEqual(45); // medido 46,9°, no começo da travessia
  });

  it('Júpiter, para onde o olhar vira durante a rampa, anda menos de 0,1° por quadro de 1/30 s', () => {
    const passo = 1 / 30;
    let maior = 0;
    for (let t = paraJupiter.t; t < fimDaTroca; t += passo) {
      const { pos } = amostra(t + passo);
      maior = Math.max(maior, THREE.MathUtils.radToDeg(
        jupiterEm(t).sub(pos).angleTo(jupiterEm(t + passo).sub(pos))
      ));
    }
    expect(maior).toBeLessThan(0.1); // medido 0,021°
    // e o pulo que um degrau daria: os nove dias e meio entre os dois céus
    const { pos } = amostra(paraJupiter.t);
    const degrau = THREE.MathUtils.radToDeg(
      jupiterEm(paraJupiter.t).sub(pos).angleTo(jupiterEm(fimDaTroca).sub(pos))
    );
    expect(degrau).toBeGreaterThan(0.5); // medido 0,62°: por isso a rampa
  });

  it('nenhuma legenda está aberta quando a troca para JD_J começa', () => {
    const abertas = shots.flatMap((s, i) => (s.captions ?? []).map((c) => ({
      texto: c.text,
      t0: starts[i] + c.at * s.dur,
      t1: starts[i] + c.at * s.dur + (c.dur ?? 8.6),
    }))).filter((c) => c.t0 <= paraJupiter.t && paraJupiter.t < c.t1).map((c) => c.texto);
    expect(abertas).toEqual([]);
  });

  it('o cima é o polo norte da eclíptica na cena (equatorial J2000, ε = 23,4393°)', () => {
    // a cena é equatorial J2000: o polo galáctico do rig (GALACTIC_NORTH,
    // −0,8677, −0,1981, 0,4560) é RA 192,86°, Dec +27,13°; o da eclíptica
    // é RA 270°, Dec 66,56°
    expect(filme.cima.distanceTo(new THREE.Vector3(0, -0.3978, 0.9175))).toBeLessThan(1e-3);
  });
});
