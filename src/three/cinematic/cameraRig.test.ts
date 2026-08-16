// ============================================================
// Oráculo do VOO NO DOMÍNIO PROFUNDO (Onda 4, fase 2 — decisão D6) e
// da varredura do ROTEIRO INTEIRO.
//
// Duas afirmações:
//  1. acima do limiar do sistema solar a velocidade de entrada do voo
//     livre é o MESMO double de antes da Onda 4 (oráculo: a fórmula
//     antiga reescrita aqui, do commit em que ela vivia inline no
//     `syncFromCamera`);
//  2. o filme, DEPOIS DA ABERTURA, fica acima desse limiar — e por isso
//     os planos de corte e a velocidade saem bit a bit idênticos em
//     cada instante dele.
//
// A SEGUNDA AFIRMAÇÃO MUDOU NA F3, e a mudança é a fase. Até
// 2026-08-13 o filme INTEIRO ficava acima do limiar, porque a abertura
// era filmada a 13.027 UA de um Sol 487.441× maior. Agora ela é filmada
// a 5,74 raios solares do Sol de verdade, e os primeiros ~20 s do filme
// atravessam o domínio profundo de ponta a ponta — 6,65 décadas de
// distância. O que este arquivo ganhou junto é O JUIZ DA TRAJETÓRIA:
// a prova de que essa descida não tem salto, medida no tamanho aparente
// do Sol entre quadros consecutivos.
//
// A varredura do roteiro mora AQUI, e não em `lodStellar.test.ts`,
// porque quem sabe as posições é o `Journey`, o vizinho deste arquivo.
// Não se instancia `FreeRoam` (o construtor pede canvas e `window`): o
// que se testa é a conta, que é pura — mesmo precedente de
// `stellarBody.test.ts`.
// ============================================================
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { LIMIAR_SISTEMA_SOLAR_PC, RAIO_SOL_PC } from '../escala';
import { diametroAparentePx } from '../world/corpos/corpos';
import { farPlanePc, nearPlanePc } from '../core/engine';

// STUB MÍNIMO DE `window`: `journey.ts` importa `world/galaxy.ts`, que lê
// `window.location.search` NO TOPO do módulo (os knobs de `?tune=`), e o
// vitest roda em `node`. Por isso os três imports abaixo são DINÂMICOS —
// import estático é içado e rodaria ANTES do stub, e `cameraRig.ts`
// também cai nessa rede (ele importa o `Journey`). Nada aqui depende dos
// knobs: busca vazia é o que o app carrega sem parâmetro nenhum.
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const {
  ERROS_ATE_DESISTIR,
  EstadoDaCaptura,
  RODA_MIN_PC_POR_S,
  VOO_MIN_PC_POR_S,
  pisoDaRoda,
  velocidadeDeVoo,
} = await import('./cameraRig');
const { Journey, D_ABERTURA_PC, D_SAIDA_PC, DECADAS_DA_ABERTURA, distanciaDaAbertura } =
  await import('./journey');
const { GAL } = await import('../world/galaxy');

/** A fórmula ANTIGA, verbatim da linha que vivia no `syncFromCamera`. */
const velocidadeAntiga = (d: number) => THREE.MathUtils.clamp(d * 0.02, 2, 600);
const nearAntigo = (d: number) => THREE.MathUtils.clamp(d * 0.004, 0.001, 40);
const farAntigo = (d: number) => THREE.MathUtils.clamp(d * 12, 60000, 400000);

/** As onze vistas por `?pos=` do `ab-identidade`, |pos| em pc. */
const VISTAS_POS: readonly (readonly [string, number])[] = [
  ['soldisco', 0.1],
  ['solrampa', 0.25],
  ['solestouro', 0.32],
  ['solestrela', 0.5],
  ['hero200', 352.67182647915047],
  ['hero600', 752.6718049107726],
  ['hero950', 1102.671756611173],
  ['hero8', 144.67177658942327],
  ['ua500', 0.0024241],
  ['ua150', 0.00072722],
  ['ua40', 0.00019393],
];

/** 0,05 → 40.000 pc */
const ACIMA: number[] = [];
for (let i = 0; i <= 2000; i++) ACIMA.push(LIMIAR_SISTEMA_SOLAR_PC + i * 0.0001);
for (let i = 1; i <= 1000; i++) ACIMA.push(i * 0.05);
for (let i = 1; i <= 1000; i++) ACIMA.push(i * 40);

const UA_POR_PC = 206264.80624548031;

describe('velocidadeDeVoo — acima do limiar é a de sempre (D6)', () => {
  it('bate o oráculo antigo em toda a faixa de 0,05 a 40.000 pc', () => {
    for (const d of ACIMA) {
      expect(Object.is(velocidadeDeVoo(d), velocidadeAntiga(d))).toBe(true);
    }
  });

  it('nas oito vistas por `?pos=` que ficam fora do domínio profundo', () => {
    for (const [nome, d] of VISTAS_POS.filter(([, d]) => d >= LIMIAR_SISTEMA_SOLAR_PC)) {
      expect(Object.is(velocidadeDeVoo(d), velocidadeAntiga(d)), nome).toBe(true);
    }
  });

  it('os três regimes do clamp antigo seguem inteiros: piso, proporção, teto', () => {
    expect(velocidadeDeVoo(LIMIAR_SISTEMA_SOLAR_PC)).toBe(2); // piso
    expect(velocidadeDeVoo(1)).toBe(2); // piso ainda
    expect(velocidadeDeVoo(500)).toBe(10); // proporção
    expect(velocidadeDeVoo(30000)).toBe(600); // teto
  });
});

describe('velocidadeDeVoo — abaixo do limiar o piso de 2 pc/s SAI', () => {
  it('nas três vistas do domínio profundo a escala é a do lugar', () => {
    for (const [nome, d] of VISTAS_POS.filter(([, d]) => d < LIMIAR_SISTEMA_SOLAR_PC)) {
      expect(velocidadeDeVoo(d), nome).toBe(d * 0.02);
      expect(velocidadeDeVoo(d), nome).toBeLessThan(velocidadeAntiga(d));
    }
    // em UA/s, para leitura humana: a 150 UA de casa o voo entra a 3 UA/s
    // (o antigo entrava a 2 pc/s = 412.530 UA/s — o sistema solar inteiro
    // atravessado em menos de 1 ms)
    // (as vistas cravam a distância arredondada, daí a 5ª casa)
    expect(velocidadeDeVoo(0.00072722) * UA_POR_PC).toBeCloseTo(3, 5);
    expect(velocidadeDeVoo(0.00019393) * UA_POR_PC).toBeCloseTo(0.8, 4);
    expect(velocidadeAntiga(0.00072722) * UA_POR_PC).toBeCloseTo(412529.6, 1);
  });

  it('é a MESMA lei de 2% da distância por segundo, agora sem interrupção', () => {
    for (let i = 1; i <= 4999; i++) {
      const d = i * 1e-5; // 1e-5 → 0,04999 pc
      expect(velocidadeDeVoo(d)).toBe(d * 0.02);
    }
    // e a lei é contínua ATRAVÉS do limiar quando lida como proporção:
    // o degrau é do PISO, não dela
    expect(velocidadeDeVoo(LIMIAR_SISTEMA_SOLAR_PC - 1e-15)).toBeCloseTo(0.001, 12);
    expect(velocidadeDeVoo(LIMIAR_SISTEMA_SOLAR_PC)).toBe(2);
  });

  it('a guarda mínima é 1e-9 pc/s e só age praticamente na origem', () => {
    expect(VOO_MIN_PC_POR_S).toBe(1e-9);
    expect(velocidadeDeVoo(0)).toBe(VOO_MIN_PC_POR_S);
    expect(velocidadeDeVoo(1e-9)).toBe(VOO_MIN_PC_POR_S);
    // fronteira: 1e-9/0,02 = 5e-8 pc = 0,0103 UA (1,5 milhão de km)
    expect(velocidadeDeVoo(0.01 / UA_POR_PC)).toBe(VOO_MIN_PC_POR_S);
    expect(velocidadeDeVoo(1 / UA_POR_PC)).toBe((1 / UA_POR_PC) * 0.02);
    expect(velocidadeDeVoo(0)).toBeGreaterThan(0); // nunca trava
  });

  it('é monotônica: chegar mais perto nunca acelera o voo', () => {
    let anterior = 0;
    for (let i = 1; i <= 20000; i++) {
      const v = velocidadeDeVoo(i * 1e-5);
      expect(v).toBeGreaterThanOrEqual(anterior);
      anterior = v;
    }
  });
});

describe('pisoDaRoda — o OUTRO grampo de velocidade (D6)', () => {
  it('fora do domínio profundo é o 0,01 pc/s de sempre', () => {
    expect(RODA_MIN_PC_POR_S).toBe(0.01);
    expect(pisoDaRoda(LIMIAR_SISTEMA_SOLAR_PC)).toBe(0.01);
    expect(pisoDaRoda(0.1)).toBe(0.01);
    expect(pisoDaRoda(8000)).toBe(0.01);
  });

  it('dentro dele cede à guarda: sem isso a D6 seria letra morta', () => {
    // 0,01 pc/s são 2.063 UA/s — a roda devolveria num tique tudo o que
    // a velocidade proporcional tinha acabado de dar
    expect(RODA_MIN_PC_POR_S * UA_POR_PC).toBeCloseTo(2062.6, 1);
    expect(pisoDaRoda(0.00072722)).toBe(VOO_MIN_PC_POR_S);
    expect(pisoDaRoda(0.049)).toBe(VOO_MIN_PC_POR_S);
    // e a roda continua podendo desacelerar até parar de fato: 0,85^n
    let v = velocidadeDeVoo(0.00072722);
    for (let i = 0; i < 50; i++) v = Math.max(v * 0.85, pisoDaRoda(0.00072722));
    expect(v).toBeLessThan(velocidadeDeVoo(0.00072722) * 1e-3);
  });
});

describe('O ROTEIRO INTEIRO — onde o filme encosta no domínio profundo', () => {
  // A varredura que o desenho da onda pede: t = 0 → 321 s, e em cada
  // instante as consequências julgadas contra os oráculos antigos. O
  // `updateClip` recebe `min(dHome, dGC)` (director.ts) e a velocidade
  // recebe `dHome` (|posição|).
  const j = new Journey();
  const AMOSTRAS: { t: number; dHome: number; dClip: number }[] = [];
  for (let i = 0; i <= 32100; i++) {
    const t = i * 0.01;
    const s = j.at(t);
    const dHome = s.pos.length();
    AMOSTRAS.push({ t, dHome, dClip: Math.min(dHome, s.pos.distanceTo(GAL.GC_POS)) });
  }
  /** o instante em que a hélice cruza o limiar do sistema solar. */
  const T_SAIDA = AMOSTRAS.find((a) => a.dHome >= LIMIAR_SISTEMA_SOLAR_PC)?.t ?? -1;

  it('a duração é 321 s e o piso do filme é a abertura refilmada, em t=0', () => {
    expect(j.duration).toBe(321);
    // a PAREDE (t<6) devolve a constante bit a bit; a hélice em k=0
    // devolve o mesmo ponto a 1 ULP, porque ela normaliza a direção e
    // reescala (`v · (d/|v|)`). É 1,7e-23 pc — 5e-10 metro.
    expect(j.at(0).pos.length()).toBe(D_ABERTURA_PC);
    expect(j.at(5.999).pos.length()).toBe(D_ABERTURA_PC);
    const piso = AMOSTRAS.reduce((m, a) => Math.min(m, a.dHome), Infinity);
    expect(Math.abs(piso / D_ABERTURA_PC - 1)).toBeLessThan(1e-15);
    expect(AMOSTRAS.find((a) => a.dHome === piso)?.t).toBeLessThanOrEqual(6);
    // 3,998 milhões de km, 5,741 raios solares — e o piso ANTIGO era
    // 0,0631506 pc, 487.441× mais longe
    expect(piso / RAIO_SOL_PC).toBeCloseTo(5.741, 3);
    expect(0.06315061361538779 / piso).toBeCloseTo(487440.81, 1);
  });

  it('o filme atravessa o domínio profundo nos primeiros ~20 s, e só neles', () => {
    expect(T_SAIDA).toBeCloseTo(26.17, 2); // 6 s de parede + 20,17 s de hélice
    for (const a of AMOSTRAS) {
      expect(a.dHome < LIMIAR_SISTEMA_SOLAR_PC, `t=${a.t}`).toBe(a.t < T_SAIDA);
    }
  });

  it('depois da saída, dHome e min(dHome, dGC) nunca voltam a descer', () => {
    // a rasante de Sgr A* é o que poderia surpreender aqui: lá quem
    // alimenta o near é o centro galáctico, não o Sol. Mínimo medido:
    // 1,397 pc em t≈229,3 — 28× o limiar.
    const depois = AMOSTRAS.filter((a) => a.t >= T_SAIDA);
    const pisoClip = depois.reduce((m, a) => Math.min(m, a.dClip), Infinity);
    expect(pisoClip).toBeGreaterThanOrEqual(LIMIAR_SISTEMA_SOLAR_PC);
    const pisoGC = AMOSTRAS.reduce(
      (m, a) => Math.min(m, j.at(a.t).pos.distanceTo(GAL.GC_POS)),
      Infinity
    );
    expect(pisoGC).toBeCloseTo(1.3972179743, 8);
  });

  it('em cada instante DEPOIS da saída: o par (near, far) é o de antes, bit a bit', () => {
    for (const a of AMOSTRAS.filter((x) => x.t >= T_SAIDA)) {
      expect(Object.is(nearPlanePc(a.dClip), nearAntigo(a.dClip))).toBe(true);
      expect(Object.is(farPlanePc(a.dClip), farAntigo(a.dClip))).toBe(true);
    }
  });

  it('em cada instante DEPOIS da saída: a velocidade de voo é a de antes, bit a bit', () => {
    for (const a of AMOSTRAS.filter((x) => x.t >= T_SAIDA)) {
      expect(Object.is(velocidadeDeVoo(a.dHome), velocidadeAntiga(a.dHome))).toBe(true);
    }
  });

  it('e os 20 planos DEPOIS da hélice não se moveram um bit', () => {
    // a hélice pousa em `ORBIT_EXIT`, a constante de onde o plano
    // seguinte parte — então tudo a partir de t=30 s é o filme de
    // sempre. É a razão aritmética de `interno` (t=40), `travessia`,
    // `mergulho`, `edgeon`, `faceon` e `retrato` saírem bit-idênticas.
    const p = j.at(30).pos;
    expect(p.length()).toBeCloseTo(D_SAIDA_PC, 12);
    expect(j.at(40).pos.length()).toBeCloseTo(4.486971350060561, 9);
    expect(j.at(100).pos.length()).toBeCloseTo(221.22434784471977, 6);
    expect(j.at(261).pos.length()).toBeCloseTo(15904.56497361685, 4);
    expect(j.at(293).pos.length()).toBeCloseTo(32790.153293328774, 4);
  });
});

// ============================================================
// O JUIZ DA TRAJETÓRIA (F3) — a descida não pode saltar.
//
// POR QUE ELE EXISTE, e a razão é uma armadilha que quase passou. A
// primitiva `orbit()` do roteiro interpola raio, ângulo e altura
// LINEARMENTE. Enquanto a abertura ia de 0,0631506 a 0,5757 pc isso era
// inofensivo — 0,96 década, um fator 9 na distância inteira. Com o
// ponto de partida a 1,2956e-7 pc a mesma interpolação linear poria a
// câmera 1.000× mais longe no primeiro CENTÉSIMO de segundo: o Sol
// sairia de 75% da altura do quadro para um ponto antes do segundo
// quadro, e sobrariam 23,99 s de estrela parada. O plano de abertura
// existiria no papel e não na tela.
//
// O QUE O JUIZ MEDE, e é de propósito que não é a distância: é o TAMANHO
// APARENTE do Sol em pixels, quadro a quadro a 60 fps, com a lente viva
// do plano (26°→56°) — que é o que o espectador vê. A régua é a mesma
// `diametroAparentePx` do palco, não uma reescrita.
// ============================================================
describe('a MESMA COMPOSIÇÃO — a promessa que o dono aprovou', () => {
  // A F3 tinha três saídas na mesa e o dono escolheu uma: "mesma
  // composição, lugar real". Este bloco é a cobrança dessa escolha, e
  // ela é aritmética e não estética — composição, aqui, é o ângulo que
  // o Sol subtende, e ângulo é `r/d`. Se o raio e a distância forem
  // divididos pelo MESMO fator, o ângulo não se mexe um bit.
  const j = new Journey();
  const R_ART = 0.011; // o raio que a casa desenhava até 2026-08-13
  const D_ANTIGA = 0.06315061361538779; // e a distância de onde filmava

  it('o Sol subtende 19,762° — o MESMO ângulo do plano antigo, a 1 ULP', () => {
    const anguloNovo = 2 * Math.atan(RAIO_SOL_PC / D_ABERTURA_PC);
    const anguloAntigo = 2 * Math.atan(R_ART / D_ANTIGA);
    expect((anguloNovo * 180) / Math.PI).toBeCloseTo(19.762, 3);
    // A DISTÂNCIA nova é a antiga vezes R☉/R_artístico, e a fase a
    // construiu ESCALANDO O VETOR (não recalculando a hélice com
    // números novos) justamente para essa razão ser a única conta que
    // separa os dois planos.
    expect(D_ABERTURA_PC / D_ANTIGA).toBeCloseTo(RAIO_SOL_PC / R_ART, 20);
    // o que sobra é o arredondamento — do escalar componente a
    // componente e das DUAS divisões: 1,6e-16 relativo, 0,72 ULP de
    // double, 3e-15 grau.
    // Chamar isso de "mesma composição" não é licença poética — é menos
    // de um bilionésimo de pixel em qualquer tela que exista.
    const relativo = Math.abs(anguloNovo - anguloAntigo) / anguloAntigo;
    expect(relativo).toBeLessThan(Number.EPSILON);
    expect(relativo).toBeCloseTo(1.6094e-16, 20);
  });

  it('e isso é 76,0% da altura do quadro na lente de 26° do plano', () => {
    // a fração que o desenho da fase prometeu, lida como razão de
    // ângulos (é assim que o bastão a escreve)
    const anguloDeg = (2 * Math.atan(RAIO_SOL_PC / D_ABERTURA_PC) * 180) / Math.PI;
    expect(anguloDeg / 26).toBeCloseTo(0.76, 3);
    expect(j.at(0).fov).toBe(26);
  });

  it('o lugar EXISTE: 3,998 milhões de km, 5,741 raios solares', () => {
    const km = D_ABERTURA_PC * 206264.80624548031 * 149597870.7;
    expect(km / 1e6).toBeCloseTo(3.998, 3);
    expect(D_ABERTURA_PC / RAIO_SOL_PC).toBeCloseTo(5.741, 3);
    // a Parker Solar Probe chega a 9,86 raios — a abertura é 1,7× mais
    // perto, mas é uma distância que se pode conferir
    expect(D_ABERTURA_PC / RAIO_SOL_PC).toBeLessThan(9.86);
  });

  it('SABOTAGEM: mudar o fator de escala quebra a composição na hora', () => {
    // se o ponto de partida não sair da razão dos dois raios, o ângulo
    // muda — e é isso que este teste existe para pegar
    const dErrada = D_ABERTURA_PC * 1.01;
    const anguloErrado = 2 * Math.atan(RAIO_SOL_PC / dErrada);
    expect(Object.is(anguloErrado, 2 * Math.atan(R_ART / D_ANTIGA))).toBe(false);
  });
});

describe('o juiz da trajetória — o Sol encolhe sem saltar', () => {
  const j = new Journey();
  const H_PX = 1713; // a altura de buffer do harness de captura
  /** quadros a 60 fps da hélice inteira (t = 6 → 30 s). */
  const QUADROS: { t: number; dPc: number; px: number }[] = [];
  for (let i = 0; i <= 24 * 60; i++) {
    const t = 6 + i / 60;
    const s = j.at(t);
    const dPc = s.pos.length();
    QUADROS.push({ t, dPc, px: diametroAparentePx(RAIO_SOL_PC, dPc, H_PX, s.fov) });
  }

  it('a distância é MONOTÔNICA e a taxa é constante: 0,277 década/s', () => {
    for (let i = 1; i < QUADROS.length; i++) {
      expect(QUADROS[i].dPc, `t=${QUADROS[i].t}`).toBeGreaterThan(QUADROS[i - 1].dPc);
    }
    expect(DECADAS_DA_ABERTURA).toBeCloseTo(6.6477, 4);
    expect(DECADAS_DA_ABERTURA / 24).toBeCloseTo(0.27699, 5);
    // taxa constante = razão constante entre quadros consecutivos
    const razoes = QUADROS.slice(1).map((q, i) => q.dPc / QUADROS[i].dPc);
    const min = Math.min(...razoes);
    const max = Math.max(...razoes);
    expect(max / min - 1).toBeLessThan(1e-9);
    expect(min).toBeCloseTo(Math.pow(10, DECADAS_DA_ABERTURA / 24 / 60), 12);
  });

  it('REPROVA A LINHA RETA: a lei antiga saltaria 1.000× no 1º centésimo', () => {
    // o juiz tem de ser capaz de reprovar, senão é decoração. O oráculo
    // abaixo é a `orbit()` de sempre com o raio novo — a versão que a F3
    // NÃO embarcou — e ela falha o mesmo critério que a curva boa passa.
    const linear = (k: number) =>
      D_ABERTURA_PC + (D_SAIDA_PC - D_ABERTURA_PC) * k;
    const kUmCentesimo = 0.01 / 24;
    expect(linear(kUmCentesimo) / D_ABERTURA_PC).toBeGreaterThan(1000);
    // a curva boa cresce 0,64% no mesmo centésimo de segundo — quatro
    // ordens de grandeza de diferença entre as duas leis
    expect(distanciaDaAbertura(kUmCentesimo) / D_ABERTURA_PC).toBeCloseTo(1.0064, 4);
    expect(distanciaDaAbertura(kUmCentesimo) / D_ABERTURA_PC).toBeLessThan(1.01);
  });

  it('nenhum quadro perde mais de 3% do diâmetro aparente do anterior', () => {
    // 3% por quadro a 60 fps são 84% por segundo — folgado para a taxa
    // real (a queda é 3,05% por quadro no trecho de lente parada e menos
    // onde a lente abre), e apertado o bastante para um salto de escala
    // reprovar. O teto é do JUIZ, não da curva: ele é a promessa que a
    // fase faz ao espectador.
    for (let i = 1; i < QUADROS.length; i++) {
      const razao = QUADROS[i].px / QUADROS[i - 1].px;
      expect(razao, `t=${QUADROS[i].t}`).toBeGreaterThan(0.97);
      expect(razao, `t=${QUADROS[i].t}`).toBeLessThanOrEqual(1);
    }
  });

  it('e o filme mostra a escada inteira: corpo → ponto, sem buraco', () => {
    // os degraus, com o instante de cada troca medido:
    //  · CORPO enquanto o disco tem ≥ 4 px (a régua do palco);
    //  · PONTO fotométrico da camada dos dez dali em diante — desde o M1
    //    da Lei da Estrela ele é o dono do Sol em TODA distância de
    //    ponto (a entrega ao SunStar morreu), então "o Sol tem dono" é
    //    por construção: aCede = wResolvido zera fora do corpo resolvido
    //    e os pesos da repartição somam 1 (pinado em estrela.test.ts).
    const tGate = QUADROS.find((q) => q.px < 4)?.t ?? -1;
    expect(tGate - 6).toBeCloseTo(8.583, 2); // 8,58 s de hélice
    expect(QUADROS[0].px / H_PX).toBeCloseTo(0.747, 3); // 74,7% da altura
    // a órbita da Terra é cruzada em t≈5,68 s de hélice
    const tUA = QUADROS.find((q) => q.dPc >= 1 / UA_POR_PC)?.t ?? -1;
    expect(tUA - 6).toBeCloseTo(5.68, 1);
  });

  it('a lente segue a curva de sempre: 26° no início, 56° no fim', () => {
    // o `fovEase` foi criado para isto — a posição precisa do parâmetro
    // cru, o zoom não. Se alguém tirar o campo, o fov vira linear em t e
    // esta comparação com o smoothstep quebra.
    const glide = (x: number) => THREE.MathUtils.smoothstep(x, 0, 1);
    for (const q of QUADROS) {
      const k = (q.t - 6) / 24;
      expect(j.at(q.t).fov, `t=${q.t}`).toBeCloseTo(THREE.MathUtils.lerp(26, 56, glide(k)), 12);
    }
  });

  it('a parede de fogo dos 6 s iniciais está PARADA no ponto de partida', () => {
    for (const t of [0, 1, 3, 5, 5.999]) {
      expect(j.at(t).pos.length(), `t=${t}`).toBe(D_ABERTURA_PC);
      expect(j.at(t).fov, `t=${t}`).toBe(26);
    }
  });
});

// ============================================================
// O BACKOFF DA CAPTURA DE PONTEIRO (Onda 5, F5).
//
// A defesa 1 das quatro: um navegador que NEGA a captura (política de
// permissão, sandbox, gesto que não conta) negaria para sempre, e o
// botão do opt-in ficaria oferecendo o que não pode entregar. A regra
// mora num estado sem DOM justamente para caber aqui — o vitest da casa
// roda em `node`, e regra que só se conferisse com um `document` na mesa
// não seria conferida.
// ============================================================
describe('EstadoDaCaptura — o backoff das três negativas', () => {
  it('nasce oferecendo: sem erro e sem lock, vale pedir', () => {
    const e = new EstadoDaCaptura();
    expect(e.ativa).toBe(false);
    expect(e.desistiu).toBe(false);
    expect(e.podePedir).toBe(true);
  });

  it('DUAS negativas ainda deixam pedir; a TERCEIRA desiste', () => {
    const e = new EstadoDaCaptura();
    for (let i = 1; i < ERROS_ATE_DESISTIR; i++) {
      e.errou();
      expect(e.desistiu).toBe(false);
      expect(e.podePedir).toBe(true);
    }
    e.errou();
    expect(e.erros).toBe(ERROS_ATE_DESISTIR);
    expect(e.desistiu).toBe(true);
    expect(e.podePedir).toBe(false);
  });

  it('desistiu até SAIR DO MODO: erro a mais não reabre, soltar não reabre, sair do modo reabre', () => {
    const e = new EstadoDaCaptura();
    for (let i = 0; i < ERROS_ATE_DESISTIR + 4; i++) e.errou();
    expect(e.podePedir).toBe(false);
    // soltar o ponteiro NÃO reabre: soltar acontece o tempo todo (Esc,
    // alt-tab), e reabrir ali devolveria o pedido por clique para sempre
    e.soltou();
    expect(e.podePedir).toBe(false);
    // sair do modo, sim — é o escopo do doador (`surfaceModeActive`
    // virando falso). O `pointerlockerror` dispara em negativas
    // TRANSITÓRIAS, e sem esta volta três ciclos de Esc-e-clicar
    // matavam o opt-in até a recarga, num navegador que suporta tudo.
    e.saiuDoModo();
    expect(e.erros).toBe(0);
    expect(e.desistiu).toBe(false);
    expect(e.podePedir).toBe(true);
  });

  it('um lock que dá certo ZERA a conta — negativas são SEGUIDAS', () => {
    const e = new EstadoDaCaptura();
    e.errou();
    e.errou();
    e.trancou();
    expect(e.erros).toBe(0);
    expect(e.ativa).toBe(true);
    // capturado, não se pede de novo: o pedido duplicado é o que o
    // navegador contaria como erro
    expect(e.podePedir).toBe(false);
    e.soltou();
    expect(e.podePedir).toBe(true);
    // e as duas negativas de antes não somam com as de agora
    e.errou();
    e.errou();
    expect(e.desistiu).toBe(false);
  });
});
