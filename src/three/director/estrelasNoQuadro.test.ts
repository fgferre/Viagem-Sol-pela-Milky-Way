// Serve: lei — os parâmetros do motor do Sol pela física de cada estrela visitável, o eixo de Vega e a exposição da visita
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  EXPOENTE_SEM_O_FILTRO,
  NIVEL_DO_PICO_DAS_QUENTES,
  EXPOENTE_DO_BRILHO_ASSISTIDO,
  EstrelasNoQuadro,
  eixoDeRotacao,
  escurecimentoDoMotor,
  ganhoDaVisita,
  parametrosDaCompanheira,
  parametrosDoMotor,
  stopsDoPico,
  SOL_PARAMS,
} from './estrelasNoQuadro';
import { RAIO_DO_SOL_NA_CENA } from '../escala';
import type { NamedStar } from '../config';
import type { StarField } from '../world/stars';
import type { CorposResolvidos } from '../world/corpos/corpos';
import { VAGAS_DE_VISITADAS } from '../world/clarao';
import { ESTRELAS_VISITAVEIS, estrelaVisitavelPorNome, celulaQuenteDe } from '../../lib/atlas/estrelasVisitaveis';
import { radianciaVisivelDeCorpoNegro } from '../luzDaCasa';
import { pesoDoFiltro } from '../world/stellarBody';
import { BORDA_DA_MANCHA_FRIA, MANCHA_DE_HAUBOIS, pesoDoPico, regiaoDoEscurecimento } from '../world/forjaDaEstrela';
import { anoDoJd } from '../world/ventoDaEstrela';

describe('toda estrela visitável vira parâmetros do MESMO motor, sem nome', () => {
  it('cada uma tem raio, período e atividade finitos', () => {
    for (const e of ESTRELAS_VISITAVEIS) {
      const p = parametrosDoMotor(e);
      expect(p.radiusPc).toBeGreaterThan(0);
      expect(Number.isFinite(p.rotPeriodDays) && p.rotPeriodDays > 0).toBe(true);
      expect(Number.isFinite(p.activityLevel)).toBe(true);
      // fora da origem é de quem põe a estrela no céu, não da lei da estrela
      expect(p.foraDaOrigem).toBeUndefined();
    }
  });
  it('o Sol sai da mesma lei, sobre o registro dele: os números do motor de antes', () => {
    expect(SOL_PARAMS).toMatchObject({ nome: 'sol', radiusPc: RAIO_DO_SOL_NA_CENA, rotPeriodDays: 25.38, tiltRad: 0.1265 });
    expect(SOL_PARAMS).toMatchObject({ activityLevel: 1, teffK: 5772, dinamo: true, seed: 20260803, knobPrefix: 'sol' });
    expect(SOL_PARAMS).toMatchObject({ granuloRelativoAoSol: 1, contrasteRelativoAoSol: 1, bordaU: 0.3 });
    expect(SOL_PARAMS.foraDaOrigem).toBeUndefined();
    expect(SOL_PARAMS.veu).toBeUndefined();
    expect(SOL_PARAMS.gas).toBeUndefined();
    expect(SOL_PARAMS.achatamento).toBeUndefined();
  });
  it('Betelgeuse: sem dínamo', () => {
    const b = parametrosDoMotor(estrelaVisitavelPorNome('Betelgeuse')!);
    expect(b.dinamo).toBe(false);
    expect(b.veu).toBeUndefined();
    // a mancha quente medida (Haubois) vai ao motor; quem não tem medida vai pela regra, sem o campo
    expect(b.celulaQuente).toEqual(MANCHA_DE_HAUBOIS);
    expect(parametrosDoMotor(estrelaVisitavelPorNome('Aldebaran')!).celulaQuente).toBeUndefined();
    // a tabela é por nome próprio: um nome que é chave do protótipo não acerta nada
    for (const nome of ['constructor', 'toString', '__proto__']) {
      const e = { ...estrelaVisitavelPorNome('Aldebaran')!, nomeNoCatalogo: nome };
      expect(celulaQuenteDe(e).medida).toBe(false);
      expect(parametrosDoMotor(e).celulaQuente).toBeUndefined();
    }
  });
  it('a quente leva o véu (a luz que a exposição não põe no disco) e é lisa: sem convecção na superfície', () => {
    const s = parametrosDoMotor(estrelaVisitavelPorNome('Sirius')!);
    expect(s.veu).toBeCloseTo(1 - ganhoDaVisita(9845, 'assistida'), 12);
    expect(s.veu!).toBeGreaterThan(0.5);
    expect(s.contrasteRelativoAoSol).toBe(0);
    // com envelope convectivo a textura é a dos dados (Proxima: 0,04 sobre 0,15)
    expect(parametrosDoMotor(estrelaVisitavelPorNome('Proxima Centauri')!).contrasteRelativoAoSol).toBeCloseTo(0.04 / 0.15, 12);
    // mais fria que o Sol (51 Peg, 5.761 K): nenhum véu
    expect(parametrosDoMotor(estrelaVisitavelPorNome('Helvetios')!).veu).toBeUndefined();
  });
  it('os campos da regra do pico só aparecem com peso do pico > 0', () => {
    for (const nome of ['Altair', 'Proxima Centauri', 'Betelgeuse']) {
      const p = parametrosDoMotor(estrelaVisitavelPorNome(nome)!);
      expect(p.pesoDoPico).toBeUndefined();
      expect(p.stopsDoPico).toBeUndefined();
    }
    const regulo = parametrosDoMotor(estrelaVisitavelPorNome('Regulus')!);
    expect(regulo.pesoDoPico).toBe(1);
    // os stops tirados: o ganho de sempre (radiância^(⅖ − 1)) sobre o da visita, pelo polo
    expect(regulo.stopsDoPico).toBeCloseTo(
      Math.log(radianciaVisivelDeCorpoNegro(12730) ** (EXPOENTE_SEM_O_FILTRO - 1) / ganhoDaVisita(12730, 'assistida', 14520)),
      2
    );
    expect(stopsDoPico(8000)).toBe(0);
    // a anã branca, pela MESMA lei
    const b = parametrosDaCompanheira(estrelaVisitavelPorNome('Sirius')!)!;
    expect(b.pesoDoPico).toBe(1);
    expect(b.stopsDoPico).toBeCloseTo(stopsDoPico(b.teffK), 12);
    expect(b.stopsDoPico!).toBeGreaterThan(regulo.stopsDoPico!);
  });
  it('as anãs são de dínamo', () => {
    const p = parametrosDoMotor(estrelaVisitavelPorNome('Proxima Centauri')!);
    expect(p.dinamo).toBe(true);
  });
});

describe('o eixo de Vega (Monnier 2012)', () => {
  it('fica a 6,2° da linha até o Sol', () => {
    const pos = new THREE.Vector3(0.9605, -5.9082, 4.8097);
    const eixo = eixoDeRotacao(estrelaVisitavelPorNome('Vega')!, pos, new THREE.Vector3());
    const paraOSol = pos.clone().normalize().negate();
    expect((eixo.angleTo(paraOSol) * 180) / Math.PI).toBeCloseTo(6.2, 9);
  });
});

describe('a exposição da visita: ¼ com o filtro do Sol, o pico do disco nas quentes', () => {
  const nivel = (nome: string) => {
    const e = estrelaVisitavelPorNome(nome)!;
    return radianciaVisivelDeCorpoNegro(e.teffK.v) * ganhoDaVisita(e.teffK.v, 'assistida');
  };
  it('no assistido a M sobe; no real nada muda; até a Teff do Sol é o ¼ de sempre', () => {
    expect(EXPOENTE_DO_BRILHO_ASSISTIDO).toBe(0.25);
    expect(nivel('Proxima Centauri')).toBeCloseTo(0.372, 2);
    expect(nivel('Betelgeuse')).toBeCloseTo(0.51, 2);
    expect(nivel('Proxima Centauri')).toBeLessThan(nivel('Betelgeuse'));
    expect(nivel('Betelgeuse')).toBeLessThan(1);
    expect(ganhoDaVisita(5772, 'assistida')).toBe(1);
    expect(ganhoDaVisita(3054, 'real')).toBe(1);
    // até a Teff do Sol é o ¼ de sempre, bit a bit (o Sol e as frias não mudam)
    for (const T of [2566, 3600, 4286, 5772]) {
      expect(ganhoDaVisita(T, 'assistida')).toBe(Math.pow(radianciaVisivelDeCorpoNegro(T), EXPOENTE_DO_BRILHO_ASSISTIDO - 1));
    }
  });
  it('na quente o ponto mais quente do disco cai no nível do pico', () => {
    const pico = (T: number, Tp: number) => radianciaVisivelDeCorpoNegro(Tp) * ganhoDaVisita(T, 'assistida', Tp);
    // redonda (Sirius): o pico é o centro; achatada (Régulo): o polo
    expect(pico(9845, 9845)).toBeCloseTo(NIVEL_DO_PICO_DAS_QUENTES, 12);
    expect(pico(12730, 14520)).toBeCloseTo(NIVEL_DO_PICO_DAS_QUENTES, 12);
    // o disco de Régulo desce (era radiância^⅖ = 2,82), e o véu é o que sobra dele
    expect(radianciaVisivelDeCorpoNegro(12730) * ganhoDaVisita(12730, 'assistida', 14520)).toBeLessThan(1.3);
    // e nenhuma das quentes do piloto fica mais clara que antes (era radiância^⅖)
    for (const T of [8039, 8590, 9600, 9845, 12730, 15539]) {
      expect(radianciaVisivelDeCorpoNegro(T) * ganhoDaVisita(T, 'assistida')).toBeLessThan(radianciaVisivelDeCorpoNegro(T) ** EXPOENTE_SEM_O_FILTRO);
    }
    const regulo = parametrosDoMotor(estrelaVisitavelPorNome('Regulus')!);
    expect(regulo.veu).toBeCloseTo(1 - ganhoDaVisita(12730, 'assistida', 14520), 12);
    // até os 8.000 K é a exposição de sempre (Altair, com a rede de convecção, não muda);
    // o pico entra daí até a convecção de superfície sumir (~9.320 K)
    expect(ganhoDaVisita(7570, 'assistida', 8450)).toBe(Math.pow(radianciaVisivelDeCorpoNegro(7570), 0.25 * pesoDoFiltro(7570) + EXPOENTE_SEM_O_FILTRO * (1 - pesoDoFiltro(7570)) - 1));
    expect(ganhoDaVisita(8000, 'assistida')).toBe(Math.pow(radianciaVisivelDeCorpoNegro(8000), EXPOENTE_SEM_O_FILTRO - 1));
    expect(pesoDoPico(8000)).toBe(0);
    expect(pesoDoPico(9330)).toBe(1);
    expect(pico(9330, 9330)).toBeCloseTo(NIVEL_DO_PICO_DAS_QUENTES, 12);
  });
});

// o motor do Sol precisa de WebGL: no teste ele é um corpo vazio
vi.mock('../world/stellarBody', async (original) => ({
  ...(await original<typeof import('../world/stellarBody')>()),
  StellarBody: class {
    group = new THREE.Group();
    escreverFiltroSolar() {}
    escreverBrilho() {}
    escreverPesoDaLei() {}
    escreverCiclo() {}
    update() {}
    dispose() {}
  },
}));

describe('a nomeada fora da lista à mão ganha piloto pelo foco', () => {
  // as da lista à mão espalhadas a 50 pc (fora do preparo), e Arcturus pelo catálogo
  const named: NamedStar[] = ESTRELAS_VISITAVEIS.map((e, i) => ({
    n: e.nomeNoCatalogo, x: 50 * Math.cos(i), y: 50 * Math.sin(i), z: 0, m: 1, s: '', d: 50,
  }));
  named.push({ n: 'Arcturus', x: 0, y: 11.26, z: 0, m: -0.05, s: 'K1.5III', d: 11.26, ci: 1.23 });
  const xyz = new Float32Array(named.flatMap((n) => [n.x, n.y, n.z]));
  const logLum = new Float32Array(named.map((n) => (-0.15 - (n.m - 5 * Math.log10(n.d))) / 2.5));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(xyz, 3));
  geo.setAttribute('aLogLum', new THREE.BufferAttribute(logLum, 1));
  geo.setAttribute('aCi', new THREE.BufferAttribute(new Float32Array(named.length), 1));
  const cedencias = new Map<number, number>();
  const stars = {
    points: new THREE.Points(geo),
    expoM0: 1,
    sigmaPx: 1,
    writeFocus: (i: number, v: number) => cedencias.set(i, v),
  } as unknown as StarField;
  const palco = { registrar() {}, remover() {} } as unknown as CorposResolvidos;
  const quadro = new EstrelasNoQuadro(named, {
    stars: () => stars,
    palco: () => palco,
    escondido: () => false,
    janelaDoQuadro: 'hoje',
    politicaDeLuz: () => 'real',
    motorDoSol: () => ({ renderer: {} as THREE.WebGLRenderer, camera: new THREE.PerspectiveCamera(), quality: 'alta' }),
  });
  const passo = (focoNome: string | null, camPos = new THREE.Vector3()) =>
    quadro.atualizar({ camPos, hPx: 1000, prAtual: 1, fovDeg: 50, jd: 2461000, tempoS: 0, focoNome });

  it('em foco nasce o corpo no ponto do catálogo, na vaga reservada; sem foco e longe, sai da lista', () => {
    expect(quadro.posicaoDe('Arcturus')).toBeNull();
    passo('Arcturus');
    expect(quadro.posicaoDe('Arcturus')?.toArray()).toEqual([0, Math.fround(11.26), 0]);
    expect(quadro.group.children).toHaveLength(1);
    const [c] = quadro.candidatasAoClarao();
    expect(c.vaga).toBe(VAGAS_DE_VISITADAS - 1);
    expect(c.nomeada).toBe(named.length - 1);
    passo(null);
    expect(quadro.group.children).toHaveLength(0);
    expect(quadro.posicaoDe('Arcturus')).toBeNull();
    expect(cedencias.get(named.length - 1) ?? 0).toBe(0);
  });

  it('o cadastro do clarão cabe: a lista à mão (2 × índice, + 1 se há companheira com corpo) não chega à vaga sob demanda', () => {
    const maior = Math.max(...ESTRELAS_VISITAVEIS.map((e, i) => 2 * i + (e.companheira ? 1 : 0)));
    expect(maior).toBeLessThan(VAGAS_DE_VISITADAS - 1);
  });

  it('as da lista à mão ficam na vaga de sempre (2 × índice)', () => {
    passo('Vega');
    passo('Arcturus');
    const vega = ESTRELAS_VISITAVEIS.findIndex((e) => e.nomeNoCatalogo === 'Vega');
    passo('Vega');
    expect(quadro.candidatasAoClarao().map((c) => c.vaga)).toEqual([2 * vega]);
    passo(null);
  });
});

describe('o Grande Escurecimento de Betelgeuse pelo relógio do app', () => {
  const bet = estrelaVisitavelPorNome('Betelgeuse')!;
  const x = escurecimentoDoMotor(bet.escurecimento!);
  // uma estrela que não gira e um céu de brinquedo: o lado escuro a `pa` graus vira (cos, sen, 0)
  const naEstrela = (pa: number) => [Math.cos((pa * Math.PI) / 180), Math.sin((pa * Math.PI) / 180), 0] as const;
  // a corda nas imagens de volta do raio da calota (raio = acos(corda − B)); fora da janela, 9
  const em = (jd: number) => {
    const r = regiaoDoEscurecimento(x, anoDoJd(jd), naEstrela);
    if (!r) return { c: 9, k: 1, pa: NaN, raio: 0 };
    return {
      c: Math.cos(r.raio) + BORDA_DA_MANCHA_FRIA,
      k: r.razoes.miolo,
      pa: (Math.atan2(r.centro[1], r.centro[0]) * 180) / Math.PI + (r.centro[1] < 0 ? 360 : 0),
      raio: r.raio,
    };
  };
  const jdDe = (iso: string) => Date.parse(iso) / 86400000 + 2440587.5;

  it('só Betelgeuse tem escurecimento, e só ela leva a região aos parâmetros do motor', () => {
    expect(ESTRELAS_VISITAVEIS.filter((e) => e.escurecimento).map((e) => e.nomeNoCatalogo)).toEqual(['Betelgeuse']);
    for (const e of ESTRELAS_VISITAVEIS) {
      expect(parametrosDoMotor(e).escurecimento !== undefined, e.id).toBe(e.nomeNoCatalogo === 'Betelgeuse');
    }
  });

  it('nada fora da janela; as épocas medidas nas datas do SPHERE; sem salto entre elas', () => {
    // a data padrão do app (jan/2026), a época de antes (jan/2019) e as pontas
    for (const jd of [2461041.5008692136, jdDe('2019-01-01T01:58Z'), jdDe('2019-10-31T00:00Z'), jdDe('2020-04-02T00:00Z')]) {
      expect(em(jd).raio).toBe(0);
    }
    const dez = em(jdDe('2019-12-27T03:27Z'));
    expect(dez.c).toBeCloseTo(0, 9);
    expect(dez.k).toBeCloseTo(3400 / 3700, 9);
    expect(dez.pa).toBeCloseTo(180, 9);
    const jan = em(jdDe('2020-01-28T02:00Z'));
    expect(jan.c).toBeCloseTo(-0.4, 9);
    const mar = em(jdDe('2020-03-18T23:49Z'));
    expect(mar.c).toBeCloseTo(0.2, 9);
    expect(mar.k).toBeCloseTo(3200 / 3700, 9);
    expect(mar.pa).toBeCloseTo(225, 9);
    // a borda larga: o miolo começa em acos(corda + B)
    const r = regiaoDoEscurecimento(x, anoDoJd(jdDe('2019-12-27T03:27Z')), naEstrela)!;
    expect(r.raio * r.miolo).toBeCloseTo(Math.acos(BORDA_DA_MANCHA_FRIA), 9);
    expect(r.penumbra[1]).toBeLessThanOrEqual(r.penumbra[0]);
    // o mínimo (fevereiro): entre janeiro e março, no sudoeste do sul
    const fev = em(jdDe('2020-02-10T00:00Z'));
    expect(fev.c).toBeGreaterThan(-0.4);
    expect(fev.c).toBeLessThan(0.2);
    expect(fev.pa).toBeGreaterThan(180);
    expect(fev.pa).toBeLessThan(225);
    // contínuo: um minuto não muda nada perceptível, de novembro a abril
    for (let jd = jdDe('2019-10-30T00:00Z'); jd < jdDe('2020-04-03T00:00Z'); jd += 0.5) {
      const a = em(jd);
      const b = em(jd + 1 / 1440);
      expect(Math.abs(a.raio - b.raio)).toBeLessThan(1e-3);
      expect(Math.abs(a.k - b.k)).toBeLessThan(1e-4);
      if (a.raio > 0 && b.raio > 0) expect(Math.abs(a.pa - b.pa)).toBeLessThan(1e-3);
    }
  });

  it('a época é um retrato do céu: entre duas a região anda no referencial da estrela', () => {
    // uma estrela que gira 90° entre dezembro e janeiro: a região de janeiro
    // continua a de dezembro no referencial dela (o centro da reta, normalizado)
    const a0 = anoDoJd(jdDe('2019-12-27T03:27Z'));
    const a1 = anoDoJd(jdDe('2020-01-28T02:00Z'));
    const gira = (pa: number, ano: number) => naEstrela(pa - (90 * (ano - a0)) / (a1 - a0));
    const meio = regiaoDoEscurecimento(x, (a0 + a1) / 2, gira)!;
    expect(Math.hypot(...meio.centro)).toBeCloseTo(1, 12);
    expect((Math.atan2(meio.centro[1], meio.centro[0]) * 180) / Math.PI).toBeCloseTo(135, 9);
    // nada não finito: sem região
    expect(regiaoDoEscurecimento(x, NaN, naEstrela)).toBeNull();
    expect(regiaoDoEscurecimento(x, (a0 + a1) / 2, () => [NaN, 0, 0])).toBeNull();
  });
});
