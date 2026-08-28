// Serve: dono — o roteiro deve dirigir a câmera, não só passar no parser (item 75).
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { lerPlanoDeCamera } from './lerPlanoDeCamera';
import {
  easeOut, glide, launch, line, linear, lookEvento, lookPan,
  orbit, panLook, panThenHold, quadratic, settle, settleFreeze, smooth, still,
} from './movimentos';
import cinturao from './roteiros/cinturao.json';
import mergulho from './roteiros/mergulho.json';
import abertura from './roteiros/abertura.json';

const passoAoLado = cinturao.planos.find((p) => p.legendas[0].texto === 'UM PASSO AO LADO')!.camera;

const a = new THREE.Vector3(2, 5, -3);
const b = new THREE.Vector3(-1, 6, 2);
const c = new THREE.Vector3(9, -2, 5);
const d = new THREE.Vector3(-7, 3, 11);
const base = {
  duracao: 12,
  movimento: { tipo: 'reta', de: a.toArray(), para: b.toArray() },
  mira: { tipo: 'fixo', ponto: c.toArray() },
  lente: [24, 72],
};
const fases = [0, 0.2, 0.6, 0.9, 1];

describe('lerPlanoDeCamera — item 75', () => {
  it('liga cada trajetória à primitiva existente e respeita o vetor de saída', () => {
    const curva = new THREE.CubicBezierCurve3(a, c, d, b);
    const trajetorias = [
      [{ tipo: 'fixo', ponto: a.toArray() }, still(a)],
      [base.movimento, line(a, b)],
      [{ tipo: 'curva', de: a.toArray(), controle1: c.toArray(), controle2: d.toArray(), para: b.toArray() }, curva.getPoint.bind(curva)],
      [{ tipo: 'orbita', centro: a.toArray(), raio: [2, 5], angulo: [-0.3, 1.7], altura: [-1, 4] }, orbit(a, 2, 5, -0.3, 1.7, -1, 4)],
    ] as const;
    for (const [movimento, esperado] of trajetorias) {
      const plano = lerPlanoDeCamera({ ...base, movimento });
      for (const k of fases) {
        const out = new THREE.Vector3();
        expect(plano.pos(k, out)).toBe(out);
        expect(out.toArray()).toEqual(esperado(k, new THREE.Vector3()).toArray());
      }
    }
  });

  it('atravessa os pontos pela curva nativa, copia as âncoras e permite buscar para trás', () => {
    const dado = { ...base, movimento: { tipo: 'trajeto', pontos: ['inicio', c.toArray(), 'fim'] } };
    const pontos = { inicio: a.clone(), fim: b.clone() };
    const antes = JSON.stringify(dado);
    const plano = lerPlanoDeCamera(dado, pontos);
    const nativa = new THREE.CatmullRomCurve3([a, c, b]);
    expect(JSON.stringify(dado)).toBe(antes);
    pontos.inicio.set(99, 99, 99);
    pontos.fim.set(99, 99, 99);
    dado.movimento.pontos[1] = [99, 99, 99];
    for (const k of [...fases, 0.2, 0.9, 0]) {
      const out = new THREE.Vector3();
      expect(plano.pos(k, out)).toBe(out);
      expect(out.distanceTo(nativa.getPointAt(k))).toBeLessThan(1e-10);
    }
    expect(plano.pos(0, new THREE.Vector3()).toArray()).toEqual(a.toArray());
    expect(plano.pos(1, new THREE.Vector3()).toArray()).toEqual(b.toArray());
    expect(plano.pos(0.5, new THREE.Vector3()).distanceTo(a.clone().lerp(b, 0.5))).toBeGreaterThan(1);
  });

  it('avança por distância, sem disparar entre pontos desiguais nem perder a escala solar', () => {
    for (const escala of [1, 1e-10, 1e5]) {
      const plano = lerPlanoDeCamera({
        ...base,
        movimento: { tipo: 'trajeto', pontos: [0, 0.1, 10, 11].map((x) => [x * escala, 0, 0]) },
      });
      for (const k of fases) {
        const p = plano.pos(k, new THREE.Vector3()).divideScalar(escala);
        // Em linha reta o comprimento é conhecido, independente da biblioteca.
        expect(p.x).toBeCloseTo(11 * k, 3);
        expect([p.y, p.z]).toEqual([0, 0]);
      }
    }
  });

  it('a hélice atravessa escalas por razão constante, com centro e giro independentes', () => {
    const forma = { tipo: 'helice', raio: [2, 5], angulo: [-0.3, 1.7], altura: [-1, 4] };
    const direcao = orbit(new THREE.Vector3(), 2, 5, -0.3, 1.7, -1, 4);
    for (const centro of [new THREE.Vector3(), a]) {
      for (const distancia of [[1.3e-7, 0.576], [0.576, 1.3e-7], [2, 200]]) {
        for (const ritmo of [undefined, 'linear', 'smooth']) {
          const plano = lerPlanoDeCamera({
            ...base, ritmo: 'linear',
            movimento: { ...forma, centro: centro.toArray(), distancia, ritmoDaDirecao: ritmo },
          });
          const ease = ritmo === 'linear' ? linear : ritmo === 'smooth' ? smooth : glide;
          for (const k of [...fases, 0.2, 0.9, 0]) {
            const out = new THREE.Vector3();
            expect(plano.pos(k, out)).toBe(out);
            const radial = out.sub(centro);
            const d = Math.exp(Math.log(distancia[0]) * (1 - k) + Math.log(distancia[1]) * k);
            // A origem deslocada perde alguns bits ao subtrair distâncias solares.
            expect(Math.abs(radial.length() - d)).toBeLessThan(Math.max(d, 1) * 1e-12);
            expect(radial.normalize().distanceTo(direcao(ease(k), new THREE.Vector3()).normalize()))
              .toBeLessThan(1e-8);
          }
        }
      }
    }
    for (const [campo, valor] of [
      ['raio', [0, 1]], ['raio', [-1, 1]],
      ['distancia', [0, 1]], ['distancia', [-1, 1]], ['distancia', [1, Infinity]],
      ['distancia', [Number.MIN_VALUE, Number.MAX_VALUE]],
      ['distancia', [Number.MAX_VALUE, Number.MIN_VALUE]],
      ['ritmoDaDirecao', 'constructor'],
    ] as const) {
      expect(() => lerPlanoDeCamera({
        ...base, movimento: { ...forma, centro: [0, 0, 0], distancia: [1, 10], [campo]: valor },
      })).toThrow(`movimento.${campo}`);
    }
  });

  it('resolve números nomeados uma vez e mantém a validação dos campos', () => {
    const numeros = { duracao: 12, lente: 24, raio: 2, angulo: -0.3, altura: -1, entrada: 0.3,
      saida: 0.7, amplitude: 0.4, base: 0, frequencia: 0.9 };
    const dado = {
      ...base, duracao: 'duracao', lente: ['lente', 72],
      movimento: { tipo: 'orbita', centro: a.toArray(), raio: ['raio', 5], angulo: ['angulo', 1.7], altura: ['altura', 4] },
      mira: { tipo: 'passagem', de: c.toArray(), assunto: d.toArray(), rumo: a.toArray(), entrada: 'entrada', saida: 'saida' },
      inclinacao: { tipo: 'rampa', de: 'altura', para: 'amplitude' },
      efeitoDeVelocidade: { tipo: 'pulso', amplitude: 'amplitude', base: 'base', frequencia: 'frequencia' },
    };
    const literal = JSON.parse(JSON.stringify(dado), (_chave, valor) =>
      typeof valor === 'string' && Object.hasOwn(numeros, valor) ? numeros[valor as keyof typeof numeros] : valor);
    const antes = JSON.stringify(dado);
    const plano = lerPlanoDeCamera(dado, {}, numeros);
    const esperado = lerPlanoDeCamera(literal);
    expect(JSON.stringify(dado)).toBe(antes);
    for (const chave of Object.keys(numeros) as (keyof typeof numeros)[]) numeros[chave] = 99;
    expect([plano.dur, plano.fov0, plano.fov1]).toEqual([12, 24, 72]);
    for (const k of fases) {
      expect(plano.pos(k, new THREE.Vector3())).toEqual(esperado.pos(k, new THREE.Vector3()));
      expect(plano.look(k, new THREE.Vector3())).toEqual(esperado.look(k, new THREE.Vector3()));
      expect(plano.roll?.(k)).toBe(esperado.roll?.(k));
      expect(plano.warp?.(k)).toBe(esperado.warp?.(k));
    }
    for (const nome of ['ausente', 'constructor', '2 + 2']) {
      expect(() => lerPlanoDeCamera({ ...base, duracao: nome })).toThrow('duracao');
    }
    for (const invalido of [NaN, Infinity, 0, -1]) {
      expect(() => lerPlanoDeCamera({ ...base, duracao: 'tempo' }, {}, { tempo: invalido })).toThrow('duracao');
    }
    expect(() => lerPlanoDeCamera({ ...base, lente: ['lente', 72] }, {}, { lente: 180 })).toThrow('lente');
  });

  it('liga cada mira ao movimento do próprio plano, inclusive na passagem', () => {
    const pos = line(a, b);
    const miras = [
      [base.mira, still(c)],
      [{ tipo: 'pan', de: c.toArray(), para: d.toArray() }, panLook(c, d)],
      [{ tipo: 'pan', de: c.toArray(), para: d.toArray(), ritmo: 'linear' }, panLook(c, d, linear)],
      [{ tipo: 'pan-cedo', de: c.toArray(), para: d.toArray(), ate: 0.4 }, panThenHold(c, d, 0.4)],
      [{ tipo: 'pan-direcao', de: c.toArray(), para: d.toArray(), ate: 0.4 }, lookPan(pos, c, d, 0.4)],
      [{ tipo: 'passagem', de: c.toArray(), assunto: d.toArray(), rumo: a.toArray(), entrada: 0.3, saida: 0.7 }, lookEvento(pos, c, d, a, 0.3, 0.7)],
    ] as const;
    for (const [mira, esperado] of miras) {
      const plano = lerPlanoDeCamera({ ...base, mira });
      for (const k of fases) {
        expect(plano.look(k, new THREE.Vector3()).toArray())
          .toEqual(esperado(k, new THREE.Vector3()).toArray());
      }
    }
  });

  it('lê duração, lente e ritmos independentes sem inventar outro padrão', () => {
    const padrao = lerPlanoDeCamera(base);
    expect([padrao.dur, padrao.fov0, padrao.fov1]).toEqual([12, 24, 72]);
    expect(padrao.ease).toBeUndefined();
    expect(padrao.fovEase).toBeUndefined();
    for (const [nome, funcao] of Object.entries({ linear, quadratic, smooth, easeOut, glide, launch, settle, settleFreeze })) {
      const plano = lerPlanoDeCamera({ ...base, ritmo: nome, ritmoDaLente: 'linear' });
      for (const k of fases) {
        expect(plano.ease?.(k)).toBe(funcao(k));
        expect(plano.fovEase?.(k)).toBe(k);
      }
      const soLente = lerPlanoDeCamera({ ...base, ritmoDaLente: nome });
      expect(soLente.fovEase?.(0.2)).toBe(funcao(0.2));
    }
  });

  it('lê o JSON de exemplo, resolve nomes e copia os dados sem os modificar', () => {
    const dado = JSON.parse(JSON.stringify(passoAoLado));
    const cru = JSON.stringify(dado);
    const pontos = { mirante: a.clone(), curvaDoDesvio: d.clone(), desvio: b.clone(), Alnilam: c.clone() };
    const plano = lerPlanoDeCamera(dado, pontos);
    expect(JSON.stringify(dado)).toBe(cru);
    expect(pontos.mirante.toArray()).toEqual(a.toArray());
    pontos.mirante.set(99, 99, 99);
    pontos.Alnilam.set(99, 99, 99);
    expect(plano.pos(0, new THREE.Vector3()).toArray()).toEqual(a.toArray());
    expect(plano.look(0.8, new THREE.Vector3()).toArray()).toEqual(c.toArray());
    const literal = structuredClone(base);
    const outro = lerPlanoDeCamera(literal);
    literal.movimento.de.fill(99);
    expect(outro.pos(0, new THREE.Vector3()).toArray()).toEqual(a.toArray());
  });

  it('lê inclinação e efeito fixos ou pulsantes, copiando os valores em tempo de relógio', () => {
    const padrao = lerPlanoDeCamera(base);
    expect([padrao.roll, padrao.warp]).toEqual([undefined, undefined]);
    for (const tipo of ['fixo', 'pulso']) {
      const chave = tipo === 'fixo' ? 'valor' : 'amplitude';
      const dado = {
        ...base, ritmo: 'launch',
        inclinacao: { tipo, [chave]: -0.12 },
        efeitoDeVelocidade: { tipo, [chave]: 0.7 },
      };
      const antes = JSON.stringify(dado);
      const plano = lerPlanoDeCamera(dado);
      expect(JSON.stringify(dado)).toBe(antes);
      dado.inclinacao[chave] = 0.9;
      dado.efeitoDeVelocidade[chave] = 0;
      for (const k of fases) {
        const fator = tipo === 'fixo' ? 1 : Math.sin(Math.PI * k);
        expect(plano.roll?.(k)).toBe(-0.12 * fator);
        expect(plano.warp?.(k)).toBe(0.7 * fator);
      }
    }
  });

  it('recusa dados inválidos antes de entregá-los à câmera, com o campo no erro', () => {
    const casos: [unknown, RegExp][] = [
      [null, /plano/],
      [{ ...base, duracao: 0 }, /duracao/],
      [{ ...base, duracao: Infinity }, /duracao/],
      [{ ...base, lente: [0, 72] }, /lente/],
      [{ ...base, lente: [24, 180] }, /lente/],
      [{ ...base, lente: [24] }, /lente/],
      [{ ...base, lente: [24, '72'] }, /lente/],
      [{ ...base, ritmo: 'constructor' }, /ritmo/],
      [{ ...base, ritmoDaLente: 'inexistente' }, /ritmoDaLente/],
      [{ ...base, movimento: { tipo: 'voar' } }, /movimento.tipo/],
      [{ ...base, movimento: { tipo: 'fixo', ponto: 'constructor' } }, /movimento.ponto/],
      [{ ...base, movimento: { tipo: 'fixo', ponto: [1, NaN, 3] } }, /movimento.ponto/],
      [{ ...base, movimento: { tipo: 'fixo', ponto: [1, 2] } }, /movimento.ponto/],
      [{ ...base, movimento: { tipo: 'fixo', ponto: new Array(3) } }, /movimento.ponto/],
      ...[null, [], [[0, 0, 0]], ['ausente', [1, 0, 0]], [[0, 0, 0], [0, 0, 0]],
        [[0, 0, 0], [NaN, 1, 2]], [[0, 0, 0], [1e308, 0, 0]]].map((pontos): [unknown, RegExp] => [
        { ...base, movimento: { tipo: 'trajeto', pontos } }, /movimento.pontos/,
      ]),
      [{ ...base, movimento: { tipo: 'orbita', centro: [0, 0, 0], raio: [-1, 2], angulo: [0, 1], altura: [0, 1] } }, /movimento.raio/],
      [{ ...base, mira: { tipo: 'espiar' } }, /mira.tipo/],
      [{ ...base, mira: { tipo: 'pan-cedo', de: [1, 2, 3], para: [4, 5, 6], ate: 0 } }, /mira.ate/],
      [{ ...base, mira: { tipo: 'pan-direcao', de: [1, 2, 3], para: [4, 5, 6], ate: 1.1 } }, /mira.ate/],
      [{ ...base, mira: { tipo: 'passagem', de: a.toArray(), assunto: b.toArray(), rumo: c.toArray(), entrada: 0.8, saida: 0.3 } }, /mira.saida/],
      [{ ...base, inclinacao: null }, /inclinacao/],
      [{ ...base, inclinacao: { tipo: 'formula', valor: 1 } }, /inclinacao.tipo/],
      [{ ...base, inclinacao: { tipo: 'fixo', valor: NaN } }, /inclinacao.valor/],
      [{ ...base, inclinacao: { tipo: 'pulso' } }, /inclinacao.amplitude/],
      [{ ...base, efeitoDeVelocidade: { tipo: 'fixo', valor: -0.1 } }, /efeitoDeVelocidade.valor/],
      [{ ...base, efeitoDeVelocidade: { tipo: 'pulso', amplitude: 1.1 } }, /efeitoDeVelocidade.amplitude/],
      [{ ...base, efeitoDeVelocidade: { tipo: 'pulso', amplitude: '0.5' } }, /efeitoDeVelocidade.amplitude/],
      [{ ...base, efeitoDeVelocidade: { tipo: 'rampa', de: -0.1, para: 0.5 } }, /efeitoDeVelocidade.de/],
      [{ ...base, efeitoDeVelocidade: { tipo: 'rampa', de: 0, para: 1.1 } }, /efeitoDeVelocidade.para/],
      [{ ...base, inclinacao: { tipo: 'rampa', de: 0, para: NaN } }, /inclinacao.para/],
      [{ ...base, inclinacao: { tipo: 'rampa', de: 0, para: 1, ritmo: 'constructor' } }, /inclinacao.ritmo/],
      [{ ...base, efeitoDeVelocidade: { tipo: 'frenagem', amplitude: -1 } }, /efeitoDeVelocidade.amplitude/],
      [{ ...base, efeitoDeVelocidade: { tipo: 'pulso', amplitude: 0.5, base: 0.6 } }, /efeitoDeVelocidade.base/],
      [{ ...base, efeitoDeVelocidade: { tipo: 'pulso', amplitude: 0.5, base: -0.1 } }, /efeitoDeVelocidade.base/],
      [{ ...base, inclinacao: { tipo: 'pulso', amplitude: 1e308, base: 1e308 } }, /inclinacao.base/],
      ...[0, 1.1, null].map((frequencia): [unknown, RegExp] => [
        { ...base, inclinacao: { tipo: 'pulso', amplitude: 0.1, frequencia } }, /inclinacao.frequencia/,
      ]),
    ];
    for (const [dado, erro] of casos) expect(() => lerPlanoDeCamera(dado)).toThrow(erro);
  });

  it('interpola rampas, freia e sobrepõe pulsos sem acompanhar mutações do dado', () => {
    const casos: [Record<string, unknown>, (k: number) => number][] = [
      [{ tipo: 'rampa', de: 0.8, para: 0.2 }, (k) => THREE.MathUtils.lerp(0.8, 0.2, k)],
      [{ tipo: 'rampa', de: 0.1, para: 0.7, ritmo: 'quadratic' }, (k) => THREE.MathUtils.lerp(0.1, 0.7, k * k)],
      [{ tipo: 'rampa', de: 0.2, para: 0.8, ritmo: 'smooth' }, (k) => THREE.MathUtils.lerp(0.2, 0.8, smooth(k))],
      [{ tipo: 'frenagem', amplitude: 0.9 }, (k) => 0.9 * (1 - k) * (1 - k)],
      [{ tipo: 'pulso', amplitude: 0.4, base: 0.3 }, (k) => 0.3 + 0.4 * Math.sin(Math.PI * k)],
      [{ tipo: 'pulso', amplitude: 0.4, base: 0.3, frequencia: 0.9 }, (k) => 0.3 + 0.4 * Math.sin(Math.PI * k * 0.9)],
    ];
    for (const [curva, esperado] of casos) {
      const dado = { ...base, ritmo: 'launch', inclinacao: curva, efeitoDeVelocidade: curva };
      const antes = JSON.stringify(dado);
      const plano = lerPlanoDeCamera(dado);
      expect(JSON.stringify(dado)).toBe(antes);
      Object.assign(curva, { de: 0, para: 0, amplitude: 0, base: 0, frequencia: 1, ritmo: 'linear' });
      for (const k of fases) {
        expect(plano.roll?.(k)).toBe(esperado(k));
        expect(plano.warp?.(k)).toBe(esperado(k));
      }
    }
    expect(lerPlanoDeCamera({ ...base, inclinacao: { tipo: 'rampa', de: -0.4, para: 0.4 } }).roll?.(0.25))
      .toBeCloseTo(-0.2, 15);
  });

  it('o passo lateral real faz um arco, entra e sai suavemente e mantém o assunto no quadro', async () => {
    const { Journey, auditarRoteiro } = await import('./journey');
    const { JourneyRig } = await import('./cameraRig');
    const audit = auditarRoteiro();
    const legenda = audit.captions.find((c) => c.text === 'UM PASSO AO LADO')!;
    const { t0, dur } = audit.shots[legenda.shotIndex];
    const filme = new Journey();
    const inicio = filme.at(t0).pos;
    const fim = filme.at(t0 + dur).pos;
    const meio = filme.at(t0 + dur / 2).pos;
    expect(inicio.distanceTo(filme.at(t0 - 1e-6).pos)).toBe(0);
    expect(fim.distanceTo(filme.at(t0 + dur - 1e-6).pos)).toBeLessThan(1e-9);
    expect(meio.distanceTo(inicio.clone().lerp(fim, 0.5))).toBeGreaterThan(0.1);
    const dt = 1 / 60;
    const passoCentral = meio.distanceTo(filme.at(t0 + dur / 2 + dt).pos);
    expect(inicio.distanceTo(filme.at(t0 + dt).pos)).toBeLessThan(passoCentral / 10);
    expect(fim.distanceTo(filme.at(t0 + dur - dt).pos)).toBeLessThan(passoCentral / 10);
    const rig = new JourneyRig();
    const camera = new THREE.PerspectiveCamera();
    for (let i = 0; i <= dur * 60; i++) {
      const t = t0 + i / 60;
      rig.apply(camera, t, dt);
      const direcao = filme.at(t).look.sub(camera.position).normalize();
      expect(camera.getWorldDirection(new THREE.Vector3()).angleTo(direcao) * THREE.MathUtils.RAD2DEG)
        .toBeLessThan(1);
    }
  });

  it('mudar o JSON dirige posição, mira, lente, duração, inclinação e pulso no filme real', async () => {
    vi.resetModules();
    vi.doMock('./roteiros/cinturao.json', () => ({
      default: {
        planos: cinturao.planos.map((plano) => plano.camera !== passoAoLado ? plano : {
          ...plano,
          camera: {
            ...plano.camera,
            duracao: 9,
            movimento: { tipo: 'trajeto', pontos: [[13, 17, 19], [20, 25, 12], [27, 17, 19]] },
            mira: { tipo: 'fixo', ponto: [29, 31, 37] },
            lente: [23, 23],
            inclinacao: { tipo: 'pulso', amplitude: 0.3 },
            efeitoDeVelocidade: { tipo: 'pulso', amplitude: 0.7 },
          },
        }),
      },
    }));
    try {
      const { Journey, auditarRoteiro } = await import('./journey');
      const { JourneyRig, galacticUp } = await import('./cameraRig');
      const audit = auditarRoteiro();
      const legenda = audit.captions.find((c) => c.text === 'UM PASSO AO LADO')!;
      const plano = audit.shots[legenda.shotIndex];
      expect(plano.dur).toBe(9);
      const t = plano.t0 + plano.dur / 4;
      const pose = new Journey().at(t);
      const nativa = new THREE.CatmullRomCurve3([
        new THREE.Vector3(13, 17, 19), new THREE.Vector3(20, 25, 12), new THREE.Vector3(27, 17, 19),
      ]);
      const posEsperada = nativa.getPointAt(0.25 ** 2 * (3 - 2 * 0.25));
      expect(pose.pos.distanceTo(posEsperada)).toBeLessThan(1e-12);
      expect(pose.look.toArray()).toEqual([29, 31, 37]);
      const pulso = 0.7 * Math.sin(Math.PI / 4);
      const inclinacao = 0.3 * Math.sin(Math.PI / 4);
      expect(pose.warp).toBe(pulso);
      expect(pose.roll).toBe(inclinacao);
      const camera = new THREE.PerspectiveCamera();
      const efeito = new JourneyRig().apply(camera, t, 1 / 60);
      expect(camera.position.distanceTo(posEsperada)).toBeLessThan(1e-12);
      expect(camera.fov).toBe(23 + pulso * 3.5);
      expect(efeito.warp).toBe(pulso);
      const direcao = new THREE.Vector3(29, 31, 37).sub(posEsperada).normalize();
      expect(camera.getWorldDirection(new THREE.Vector3()).distanceTo(direcao)).toBeLessThan(1e-14);
      const esperada = new THREE.PerspectiveCamera();
      esperada.position.copy(pose.pos);
      galacticUp(direcao, esperada.up);
      esperada.lookAt(pose.look);
      esperada.rotateZ(inclinacao);
      expect(camera.quaternion.angleTo(esperada.quaternion)).toBeLessThan(1e-7);
    } finally {
      vi.doUnmock('./roteiros/cinturao.json');
      vi.resetModules();
    }
  });

  it('as cinco cenas do mergulho respondem ao JSON, incluindo rampas no giro e no pós-processamento', async () => {
    const { auditarRoteiro: auditarAntes } = await import('./journey');
    const antes = auditarAntes();
    const indice = antes.captions.find((c) => c.text === 'ANTARES')!.shotIndex;
    const inicio = antes.shots[indice].t0;
    const efeitos = [
      { tipo: 'fixo', valor: 0.5 },
      { tipo: 'rampa', de: 0.1, para: 0.9, ritmo: 'quadratic' },
      { tipo: 'pulso', amplitude: 0.4, base: 0.2 },
      { tipo: 'pulso', amplitude: 0.3, base: 0.15, frequencia: 0.9 },
      { tipo: 'frenagem', amplitude: 0.7 },
    ];
    const dados = {
      planos: mergulho.planos.map((plano, i) => ({
        ...plano,
        camera: {
          ...plano.camera, duracao: i === 0 ? 9 : plano.camera.duracao,
          movimento: { tipo: 'fixo', ponto: [13 + i, 17, 19] },
          mira: { tipo: 'fixo', ponto: [29, 31, 37] }, lente: [23, 23], ritmo: 'launch',
          inclinacao: { tipo: 'rampa', de: -0.2, para: 0.4, ritmo: 'smooth' },
          efeitoDeVelocidade: efeitos[i],
        },
      })),
    };
    vi.resetModules();
    vi.doMock('./roteiros/mergulho.json', () => ({ default: dados }));
    try {
      const { Journey, auditarRoteiro } = await import('./journey');
      const { JourneyRig, galacticUp } = await import('./cameraRig');
      const depois = auditarRoteiro();
      expect(depois.shotCount).toBe(antes.shotCount);
      expect(depois.duration).toBe(antes.duration + 1);
      const k = 0.25;
      const esperados = [
        0.5,
        THREE.MathUtils.lerp(0.1, 0.9, k * k),
        0.2 + 0.4 * Math.sin(Math.PI * k),
        0.15 + 0.3 * Math.sin(Math.PI * k * 0.9),
        0.7 * (1 - k) * (1 - k),
      ];
      let t0 = inicio;
      for (const [i, plano] of dados.planos.entries()) {
        const t = t0 + plano.camera.duracao * k;
        const pose = new Journey().at(t);
        expect(pose.pos.toArray()).toEqual([13 + i, 17, 19]);
        expect(pose.warp).toBe(esperados[i]);
        const inclinacao = THREE.MathUtils.lerp(-0.2, 0.4, smooth(k));
        expect(pose.roll).toBe(inclinacao);
        const camera = new THREE.PerspectiveCamera();
        expect(new JourneyRig().apply(camera, t, 1 / 60).warp).toBe(esperados[i]);
        expect(camera.fov).toBe(23 + esperados[i] * 3.5);
        const esperada = new THREE.PerspectiveCamera();
        esperada.position.copy(pose.pos);
        galacticUp(pose.look.clone().sub(pose.pos).normalize(), esperada.up);
        esperada.lookAt(pose.look);
        esperada.rotateZ(inclinacao);
        expect(camera.quaternion.angleTo(esperada.quaternion)).toBeLessThan(1e-7);
        t0 += plano.camera.duracao;
      }
    } finally {
      vi.doUnmock('./roteiros/mergulho.json');
      vi.resetModules();
    }
  });

  it('a abertura e Sirius usam o JSON e as distâncias calculadas no filme real', async () => {
    const { auditarRoteiro: auditarAntes } = await import('./journey');
    const antes = auditarAntes();
    const dados = {
      planos: abertura.planos.map((plano, i) => ({
        ...plano,
        camera: {
          ...plano.camera, duracao: i === 0 ? 8 : plano.camera.duracao,
          movimento: i === 1 ? {
            tipo: 'helice', centro: [0, 0, 0], raio: [2, 5], angulo: [-0.3, 1.7], altura: [-1, 4],
            distancia: ['distanciaFinal', 'distanciaInicial'], ritmoDaDirecao: 'linear',
          } : { tipo: 'fixo', ponto: [13 + i, 17, 19] },
          mira: { tipo: 'fixo', ponto: [29, 31, 37] },
          lente: [23, 43], ritmo: 'linear', ritmoDaLente: 'smooth',
          inclinacao: { tipo: 'fixo', valor: -0.2 },
          efeitoDeVelocidade: { tipo: 'pulso', amplitude: 0.7 },
        },
        legendas: [{ em: 0.1, texto: `abertura pelo roteiro ${i}`, duracao: 1 }],
      })),
    };
    vi.resetModules();
    vi.doMock('./roteiros/abertura.json', () => ({ default: dados }));
    try {
      const { Journey, auditarRoteiro, D_ABERTURA_PC, D_SAIDA_PC } = await import('./journey');
      const { JourneyRig, galacticUp } = await import('./cameraRig');
      const depois = auditarRoteiro();
      expect(depois.shotCount).toBe(antes.shotCount);
      expect(depois.duration).toBe(antes.duration + 2);
      const filme = new Journey();
      const k = 0.25;
      let t0 = 0;
      for (const [i, plano] of dados.planos.entries()) {
        const t = t0 + plano.camera.duracao * k;
        const pose = filme.at(t);
        const pos = i === 1 ? orbit(new THREE.Vector3(), 2, 5, -0.3, 1.7, -1, 4)(k, new THREE.Vector3())
          .normalize().multiplyScalar(D_SAIDA_PC * (D_ABERTURA_PC / D_SAIDA_PC) ** k)
          : new THREE.Vector3(13 + i, 17, 19);
        expect(pose.pos.distanceTo(pos)).toBeLessThan(1e-14);
        expect(pose.look.toArray()).toEqual([29, 31, 37]);
        const pulso = 0.7 * Math.sin(Math.PI * k);
        expect(pose.warp).toBe(pulso);
        expect(pose.roll).toBe(-0.2);
        expect(pose.fov).toBe(THREE.MathUtils.lerp(23, 43, smooth(k)));
        const camera = new THREE.PerspectiveCamera();
        expect(new JourneyRig().apply(camera, t, 1 / 60).warp).toBe(pulso);
        expect(camera.position.distanceTo(pos)).toBeLessThan(1e-14);
        expect(camera.fov).toBe(pose.fov + pulso * 3.5);
        const esperada = new THREE.PerspectiveCamera();
        esperada.position.copy(pos);
        galacticUp(pose.look.clone().sub(pos).normalize(), esperada.up);
        esperada.lookAt(pose.look);
        esperada.rotateZ(-0.2);
        expect(camera.quaternion.angleTo(esperada.quaternion)).toBeLessThan(1e-7);
        expect(depois.captions.find((c) => c.text === plano.legendas[0].texto)?.t0)
          .toBe(t0 + plano.camera.duracao * 0.1);
        t0 += plano.camera.duracao;
      }
      expect(depois.shots[3].t0).toBe(t0);
    } finally {
      vi.doUnmock('./roteiros/abertura.json');
      vi.resetModules();
    }
  });
});
