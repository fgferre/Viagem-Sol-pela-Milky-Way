// ============================================================
// A RECEITA DO GLOBO — os juízes da segunda lei de luz (itens 91 e 93).
//
// O QUE ESTE ARQUIVO COBRA, e por quê. Ele não pina texto de shader:
// pina o NÚMERO que a malha consome e EXECUTA o CORPO das três funções
// que o shader compila. `GLSL_LUZ_DA_VISITA` é a única casa da receita;
// este arquivo lê aquele texto, traduz o dialeto para JS e roda o que
// saiu contra o oráculo do Eyes. Não existe uma segunda cópia da conta
// para divergir, e não existe pino de texto que passe raspando: apagar
// o `* sombras` do corpo da lanterna, tirar a guarda do `s <= 0` ou
// trocar a curva por `max(x, 0)` muda o que roda aqui, e reprova.
//
//  1. AS TRÊS PEÇAS DA RECEITA: Sol = 1 em `assistida`, lanterna 0,15,
//     terminador logístico s = 3. Reverter qualquer uma reprova aqui.
//  2. A DECISÃO 2 DO DONO, intacta: em `real` o ganho é E(d) BIT A BIT,
//     a lanterna é 0 exato e o `s` é 0 — isto é, Lambert cru.
//  3. O QUE A OBRA MOVEU, DECLARADO: a Terra e a Lua deixaram de ser
//     bit-idênticas ao pré-91, e o delta está medido aqui, não escondido.
//  4. O SELO: `stopsDaVisita` é 2·log2(d) em `assistida` e 0 em `real`.
//  5. O HANDOFF PONTO↔GLOBO continua sem degrau — a exposição da visita
//     não olha a câmera, e isso não mudou no 93.
// ============================================================
import { describe, expect, it } from 'vitest';
import { ROCHOSOS } from '../../three/world/corpos/rochoso';
import { GIGANTES } from '../../three/world/corpos/gigante';
import { LIMIAR_DO_GATE_PX, cessaoAlvo } from '../../three/world/corpos/terra';
import { diametroAparentePx } from '../../three/world/corpos/corpos';
import { BODY_AXES } from './iauOrientation';
import { ganhoFundido, irradianciaRelativa } from './luz';
import type { PoliticaDeLuz } from './luz';
import {
  CALIBRACOES,
  COR_DO_VEU,
  GLSL_LUZ_DA_VISITA,
  GLSL_VEU_DE_SATURNO,
  LANTERNA_DE_LEITURA,
  S_DO_TERMINADOR,
  VEU_DE_SATURNO,
  colunaVerticalDoVeu,
  densidadeDoVeu,
  escreverLuzDaVisita,
  espessuraDoVeu,
  ganhoDoGlobo,
  lanternaDaVisita,
  lerPortaCalibracao,
  sDoTerminador,
  type CalibracaoDaLuz,
  stopsDaVisita,
  uniformsDaLuzDaVisita,
  uniformsDoVeu,
} from './luzDaVisita';

/** OS 38 RESOLVIDOS, derivados das listas vivas — nunca redigitados. */
const RESOLVIDOS: readonly string[] = [
  'earth',
  'moon',
  ...ROCHOSOS.map((r) => r.id),
  ...GIGANTES.map((g) => g.id),
];

/** Distâncias heliocêntricas VIVAS de referência, uma por família — as
 *  mesmas rUA que as vistas oficiais do gate produzem. */
const D_SATURNO = 9.5185438390236552;
const D_MERCURIO = 0.46254827132617393;
const D_TERRA = 0.98332668220797514;

// ============================================================
// O INSTRUMENTO — como este arquivo EXECUTA o shader
//
// Um tradutor de meia página, GLSL → JS, para o dialeto que
// `GLSL_LUZ_DA_VISITA` usa e SÓ para ele. Ele extrai o corpo de uma
// função do chunk, troca a declaração com tipo por `const`, lê `vec3(x)`
// como o próprio x (a conta é canal a canal: o shader faz o mesmo em R,
// G e B) e monta a função com `new Function`.
//
// ELE RECUSA O QUE NÃO ENTENDE. Todo identificador que sobra na tradução
// tem de ser um parâmetro, um uniforme, um local declarado ali mesmo, um
// embutido da lista, uma OUTRA PEÇA do chunk ou uma palavra de JS —
// qualquer outro faz o juiz LANÇAR, isto é, reprovar. É de propósito:
// juiz que não consegue medir reprova, não avisa. Quem levar uma
// construção nova para o chunk ensina o tradutor no mesmo commit.
//
// E RECUSA TAMBÉM A RECURSÃO, nomeando a peça: uma função que chama a si
// mesma escapa da varredura de identificadores (o nome dela está em
// `nomesDoChunk()`) e só estouraria em tempo de execução, num
// `ReferenceError` que não diz nada. QUEM LISTA AS PEÇAS É O CHUNK —
// `nomesDoChunk()`, nunca uma lista redigitada: peça nova é compilada
// pelo juiz no dia em que nasce, chamada pelo `main` ou não.
//
// O QUE O VÉU (§4.4) ENSINOU A ELE, em 2026-08-25: `sqrt` e `mix`, e
// CHAMADA ENTRE PEÇAS — `globoComVeu` chama o `luzDoGlobo` da receita, e
// sem isso o juiz não conseguiria executar a última linha do fragmento,
// que é justamente onde mora a ordem "o véu DEPOIS da superfície".
// ============================================================

/**
 * O TEXTO QUE O `GIGANTE_LAMBERT_FRAG` COMPILA: a receita e, colada
 * nela, o véu. É a mesma concatenação que o shader de Saturno monta —
 * medir uma metade seria medir um programa que não existe.
 */
const CHUNK = `${GLSL_LUZ_DA_VISITA}\n${GLSL_VEU_DE_SATURNO}`;

/** os embutidos do GLSL que este chunk usa, em JS. `dot` é o de VERDADE,
 *  sobre três componentes — a lanterna depende dele; `mix` é o do
 *  spec, `x·(1−a) + y·a`, e é ele que mistura o véu no limbo. */
const EMBUTIDOS = {
  max: (a: number, b: number) => Math.max(a, b),
  min: (a: number, b: number) => Math.min(a, b),
  clamp: (x: number, a: number, b: number) => Math.min(Math.max(x, a), b),
  exp: (x: number) => Math.exp(x),
  sqrt: (x: number) => Math.sqrt(x),
  mix: (x: number, y: number, a: number) => x * (1 - a) + y * a,
  pow: (x: number, y: number) => Math.pow(x, y),
  step: (borda: number, x: number) => (x < borda ? 0 : 1),
  dot: (a: readonly number[], b: readonly number[]) =>
    a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!,
};

/** os uniformes do chunk, sempre injetados — o corpo usa o que precisar.
 *  `uVeuCor` entra como UM CANAL, como todo `vec3` deste tradutor. */
const UNIFORMES = [
  'uTerminadorS',
  'uLanternaLeitura',
  'uVeuColuna',
  'uVeuEspessura',
  'uVeuCor',
  'uTraduzDaTela',
  'uLanternaDepois',
] as const;

type Ligados = Partial<Record<(typeof UNIFORMES)[number], number>>;

const PALAVRAS_DE_JS = new Set(['if', 'else', 'return', 'const', 'true', 'false']);

/** os nomes que o PRÓPRIO chunk declara — uma peça pode chamar a outra,
 *  e é por esta lista que o tradutor sabe que `luzDoGlobo` existe. */
function nomesDoChunk(): string[] {
  return [...CHUNK.matchAll(/\b(?:float|vec3)\s+(\w+)\s*\(/g)].map((m) => m[1]!);
}

/** o corpo CRU de uma função do chunk, achado por contagem de chaves */
function corpoNoChunk(nome: string): { params: string[]; corpo: string } {
  const decl = new RegExp(`(?:float|vec3)\\s+${nome}\\s*\\(([^)]*)\\)\\s*\\{`).exec(CHUNK);
  if (!decl) throw new Error(`o chunk não declara \`${nome}\``);
  const abre = decl.index + decl[0].length;
  let nivel = 1;
  let i = abre;
  for (; i < CHUNK.length && nivel > 0; i++) {
    if (CHUNK[i] === '{') nivel++;
    else if (CHUNK[i] === '}') nivel--;
  }
  if (nivel !== 0) throw new Error(`chave que não fecha em \`${nome}\``);
  const lista = decl[1]!.trim();
  const params = lista === '' ? [] : lista.split(',').map((p) => {
    const m = /^\s*(?:float|vec3)\s+(\w+)\s*$/.exec(p);
    if (!m) throw new Error(`parâmetro que o tradutor não entende em \`${nome}\`: "${p.trim()}"`);
    return m[1]!;
  });
  return { params, corpo: CHUNK.slice(abre, i - 1) };
}

/**
 * `vec3(x)` é o PRÓPRIO x — a conta deste juiz é canal a canal, e o
 * shader faz a mesma em R, G e B. `vec3(a, b, c)` não é: três
 * componentes distintas pediriam outro juiz, e por isso o tradutor para.
 */
function abrirVec3(texto: string, nome: string): string {
  let js = texto;
  for (;;) {
    const i = js.search(/\bvec3\s*\(/);
    if (i < 0) return js;
    const abre = js.indexOf('(', i);
    let nivel = 1;
    let virgula = false;
    let j = abre + 1;
    for (; j < js.length && nivel > 0; j++) {
      if (js[j] === '(') nivel++;
      else if (js[j] === ')') nivel--;
      else if (js[j] === ',' && nivel === 1) virgula = true;
    }
    if (nivel !== 0) throw new Error(`\`vec3(\` que não fecha em \`${nome}\``);
    if (virgula) {
      throw new Error(`\`vec3\` de vários componentes em \`${nome}\` — este juiz mede um canal`);
    }
    js = `${js.slice(0, i)}(${js.slice(abre + 1, j - 1)})${js.slice(j)}`;
  }
}

/** GLSL → JS, e um berro em vez de um passe livre quando não dá */
function traduzirGlsl(corpo: string, params: readonly string[], nome: string): string {
  const js = abrirVec3(corpo.replace(/\/\/[^\n]*/g, ''), nome)
    .replace(/\b(?:float|vec3)\s+(\w+)\s*=/g, 'const $1 =');
  /**
   * RECURSÃO NÃO PASSA, e a recusa é NOMEADA. A varredura de
   * identificadores logo abaixo NÃO pegaria uma peça que chama a si
   * mesma: o próprio nome está em `nomesDoChunk()`, portanto em
   * `conhecidos`. Quem a pegaria seria a assinatura de `funcaoDoChunk`,
   * que amarra as IRMÃS e exclui o próprio nome — mas ali o estouro
   * chega como um `ReferenceError` cru em tempo de execução, sem dizer
   * que peça nem o que fazer. Juiz que não consegue medir reprova, e
   * reprova NOMEANDO.
   */
  if (new RegExp(`\\b${nome}\\s*\\(`).test(js)) {
    throw new Error(`\`${nome}\` chama a SI MESMA — este juiz não executa recursão`);
  }
  const locais = [...js.matchAll(/\bconst\s+(\w+)/g)].map((m) => m[1]!);
  const conhecidos = new Set<string>([
    ...params, ...locais, ...UNIFORMES, ...Object.keys(EMBUTIDOS),
    ...nomesDoChunk(), ...PALAVRAS_DE_JS,
  ]);
  const semNumeros = js.replace(/\b\d+\.?\d*(?:[eE][+-]?\d+)?/g, ' ');
  for (const [ident] of semNumeros.matchAll(/[A-Za-z_]\w*/g)) {
    if (!conhecidos.has(ident)) {
      throw new Error(
        `o tradutor de GLSL não conhece \`${ident}\` (em \`${nome}\`) — ensine-o aqui`
      );
    }
  }
  return js;
}

/**
 * A função do chunk, pronta para rodar: `(argumentos, uniformes) => número`.
 *
 * As IRMÃS entram como argumentos, amarradas aos MESMOS uniformes desta
 * chamada — é assim que `globoComVeu` consegue chamar `luzDoGlobo` sem
 * que exista uma segunda cópia da conta em lugar nenhum.
 */
function funcaoDoChunk(nome: string) {
  const { params, corpo } = corpoNoChunk(nome);
  const js = traduzirGlsl(corpo, params, nome);
  const irmas = nomesDoChunk().filter((n) => n !== nome);
  const assinatura = [...params, ...UNIFORMES, ...Object.keys(EMBUTIDOS), ...irmas];
  const fn = new Function(...assinatura, js) as (...a: unknown[]) => number;
  return (args: readonly unknown[], u: Ligados = {}): number =>
    fn(
      ...args,
      ...UNIFORMES.map((chave) => u[chave] ?? 0),
      ...Object.values(EMBUTIDOS),
      ...irmas.map((irma) => (...a: unknown[]) => doChunk(irma)(a, u))
    );
}

/**
 * A TRADUÇÃO É PREGUIÇOSA DE PROPÓSITO. Se ela morresse no topo do
 * arquivo, um chunk que o tradutor não entende derrubaria a COLETA — e
 * uma suíte que não coleta reprova com "nenhum teste", que é um veredito
 * pior de ler do que trinta linhas vermelhas dizendo o que quebrou.
 */
const MEMORIA = new Map<string, ReturnType<typeof funcaoDoChunk>>();
const doChunk = (nome: string) => {
  const pronta = MEMORIA.get(nome) ?? funcaoDoChunk(nome);
  MEMORIA.set(nome, pronta);
  return pronta;
};

/** `terminadorSuave(x)` do shader, com o `s` que a política acende */
const terminadorSuave = (x: number, s = S_DO_TERMINADOR): number =>
  doChunk('terminadorSuave')([x], { uTerminadorS: s });

/**
 * `lanternaDeLeitura(n, dirCam, sombras)` do shader, num canal.
 *
 * `n` e `dirCam` entram como VERSORES de verdade, montados para que
 * `dot(n, dirCam)` valha exatamente o `ndotv` pedido — o `dot` do
 * tradutor é o produto escalar, não um atalho.
 */
const lanterna = (ndotv: number, sombras: number, acesa = LANTERNA_DE_LEITURA): number => {
  const seno = Math.sqrt(Math.max(0, 1 - ndotv * ndotv));
  return doChunk('lanternaDeLeitura')(
    [[ndotv, seno, 0], [1, 0, 0], sombras],
    { uLanternaLeitura: acesa }
  );
};

/** `luzDoGlobo(luzSol, fill)` do shader, num canal — sem calibração é a
 *  soma que satura em 1, o de sempre. */
const somaComTeto = (luzSol: number, fill: number, u: Ligados = {}): number =>
  doChunk('luzDoGlobo')([luzSol, fill], u);

/** as duas chaves de `?calib=` como o shader as recebe (item 93) */
const chavesDe = (calib: CalibracaoDaLuz): Ligados => ({
  uTraduzDaTela: CALIBRACOES[calib].traduz ? 1 : 0,
  uLanternaDepois: CALIBRACOES[calib].depois ? 1 : 0,
});

/** `daTelaParaLinear(c)` do shader, num canal */
const daTelaParaLinear = (c: number, u: Ligados = { uTraduzDaTela: 1 }): number =>
  doChunk('daTelaParaLinear')([c], u);

/** os dois uniformes de FORMA do véu, resolvidos pelo módulo para um corpo */
const veuDe = (id: string): Ligados => ({
  uVeuColuna: colunaVerticalDoVeu(id),
  uVeuEspessura: espessuraDoVeu(id),
});

/** `opacidadeDoVeu(μ)` do shader, com a forma do véu daquele corpo */
const opacidadeDoVeu = (mu: number, id = 'saturn'): number =>
  doChunk('opacidadeDoVeu')([mu], veuDe(id));

/**
 * `globoComVeu(albedo, luzSol, fill, aVeu)` do shader, NUM CANAL — o
 * `canal` escolhe qual componente da palha entra (0 = R, 2 = B), que é
 * como este juiz lê uma cor de três componentes com um tradutor de um.
 */
const globoComVeu = (
  albedo: number,
  luzSol: number,
  fill: number,
  aVeu: number,
  canal = 0
): number =>
  doChunk('globoComVeu')([albedo, luzSol, fill, aVeu], { uVeuCor: COR_DO_VEU[canal]! });

/**
 * A MASSA DE AR que o chunk EXECUTOU, lida de volta da opacidade —
 * `a = 1 − e^(−coluna·massa)` invertido. É assim que os dois extremos do
 * modelo (1 no subsolar, Chapman no limbo) se conferem sem uma segunda
 * cópia da fórmula em JS.
 */
const massaDeArDoVeu = (mu: number, id = 'saturn'): number =>
  -Math.log(1 - opacidadeDoVeu(mu, id)) / colunaVerticalDoVeu(id);

describe('1. peça (a) — o Sol do globo vale 1 em `assistida`', () => {
  it.each(RESOLVIDOS)('%s: 1 LITERAL, em qualquer distância', (id) => {
    for (const d of [0.31, 1, 5.2, D_SATURNO, 30, 95, 970]) {
      expect(ganhoDoGlobo(d, 'assistida'), `${id} a ${d} UA`).toBe(1);
    }
  });

  /**
   * O QUE A REVERSÃO PRODUZIRIA, por extenso. Antes do 93 o ganho era
   * `ganhoFundido(d) × compensação(corpo)`, e o resíduo `(dRef/d)^0,7`
   * deixava o globo fora de 1 — a conta do PONTINHO ainda viva lá dentro.
   *
   * O DONO DESTE PINO É O `toBe(1)`, e ele basta porque é EXATO: o
   * resíduo não tem um valor só (depende da distância viva de cada
   * quadro), e qualquer um deles — 0,9875, 1,0013, 0,883 — deixa de ser
   * 1 e reprova. Até 25/08 havia aqui um `not.toBeCloseTo(0,9875)` que
   * prometia mais do que fazia: nas distâncias VIVAS destas linhas a
   * reversão daria ~1,0013, longe de 0,9875, e o pino passava calado.
   */
  it('o resíduo do 1/d² MORREU: nem Saturno nem Mercúrio ficam fora de 1', () => {
    expect(ganhoDoGlobo(D_SATURNO, 'assistida')).toBe(1);
    expect(ganhoDoGlobo(D_MERCURIO, 'assistida')).toBe(1);
  });

  it('Saturno sai do carvão: a lei crua daria 0,207 — o globo vê 1', () => {
    expect(ganhoFundido(D_SATURNO, 'assistida')).toBeCloseTo(0.2065, 4);
    expect(ganhoDoGlobo(D_SATURNO, 'assistida') / ganhoFundido(D_SATURNO, 'assistida'))
      .toBeCloseTo(4.842, 3);
  });

  it('distância não-finita devolve o neutro 1, como a lei sempre fez', () => {
    for (const politica of ['assistida', 'real'] as PoliticaDeLuz[]) {
      expect(ganhoDoGlobo(Number.NaN, politica)).toBe(1);
      expect(ganhoDoGlobo(Number.POSITIVE_INFINITY, politica)).toBe(1);
    }
    expect(stopsDaVisita(Number.NaN, 'assistida')).toBeNull();
  });
});

describe('2. peça (b) — a lanterna de leitura, 15 % na câmera', () => {
  it('acende em `assistida` e é ZERO EXATO em `real`', () => {
    expect(lanternaDaVisita('assistida')).toBe(LANTERNA_DE_LEITURA);
    expect(LANTERNA_DE_LEITURA).toBe(0.15);
    expect(lanternaDaVisita('real')).toBe(0);
  });

  /**
   * O PAPEL DELA É A NOITE, e é isto que o número prova: no subsolar o
   * Sol já está no teto e a lanterna não tem o que acrescentar; na noite
   * voltada para a câmera ela é a ÚNICA luz.
   */
  it('não clareia o subsolar e É a luz da noite', () => {
    const fill = lanternaDaVisita('assistida');
    expect(somaComTeto(1, fill)).toBe(1); // subsolar: já no teto
    expect(somaComTeto(0, fill)).toBe(0.15); // noite de frente: só ela
    expect(somaComTeto(0.5, fill)).toBeCloseTo(0.65, 12);
  });

  /**
   * O TETO NÃO MORDE ACIMA DE 1, e isso não é detalhe: o modo `real` em
   * Mercúrio manda E = 6,7 pelo mesmo caminho, e o realce de limbo do
   * Lommel-Seeliger chega a 4/3. Um `saturate` cru cortaria os dois —
   * seria teto de brilho, que o NORTE proíbe em letra.
   */
  it('acima de 1 a função é a IDENTIDADE — não existe teto de brilho', () => {
    for (const luzSol of [4 / 3, 6.674, 400]) {
      expect(somaComTeto(luzSol, 0.15)).toBe(luzSol);
    }
  });

  it('com a lanterna em 0 a soma é a identidade BIT A BIT (o modo real)', () => {
    for (const luzSol of [0, 0.011037, 0.5, 1, 6.674]) {
      expect(Object.is(somaComTeto(luzSol, lanternaDaVisita('real')), luzSol)).toBe(true);
    }
  });

  /**
   * A DIVERGÊNCIA DECLARADA, EXECUTADA. O `* sombras` do corpo de
   * `lanternaDeLeitura` é o que impede a lanterna de acender a umbra de
   * um eclipse — sem ele o núcleo sobre Durango ia de 2,80 para 42,21 e
   * ficava MAIS CLARO que o deserto ao lado.
   *
   * Este bloco roda o corpo do chunk: apagar a multiplicação lá reprova
   * aqui, na mesma execução, e não numa foto seis meses depois. (O guarda
   * de texto dos corpos — `rochoso.test.ts`, `gigante.test.ts` — prova
   * outra coisa, e continua valendo: que o SHADER passa `sombras` para
   * esta função. Ele nunca soube o que o corpo dela faz com o argumento.)
   */
  it('a lanterna LEVA as sombras: 0 na umbra, 15 % cheios fora dela', () => {
    // noite de frente para a câmera, fora de qualquer sombra: os 15 %
    expect(lanterna(1, 1)).toBeCloseTo(LANTERNA_DE_LEITURA, 12);
    // no núcleo da umbra a lanterna é ZERO EXATO — é isto que o `* sombras` faz
    expect(lanterna(1, 0)).toBe(0);
    // e na penumbra ela entra pela FRAÇÃO da sombra, sem degrau
    expect(lanterna(1, 0.5)).toBeCloseTo(LANTERNA_DE_LEITURA / 2, 12);
    // costas para a câmera: o clamp do N·V a apaga, sombra ou não
    expect(lanterna(-0.4, 1)).toBe(0);
    // e em `real` a lanterna está apagada: não há fill para sombra nenhuma
    expect(lanterna(1, 1, lanternaDaVisita('real'))).toBe(0);
  });
});

describe('3. peça (c) — o terminador logístico s = 3', () => {
  it('o `s` é 3 em `assistida` e 0 (= Lambert cru) em `real`', () => {
    expect(sDoTerminador('assistida')).toBe(S_DO_TERMINADOR);
    expect(S_DO_TERMINADOR).toBe(3);
    expect(sDoTerminador('real')).toBe(0);
  });

  /**
   * ONDE HÁ VÉU O TERMINADOR AMACIA MAIS — `sharpness /= 1 + 700·density`
   * do Eyes. Saturno é o único corpo desta casa com densidade, e o efeito
   * é pequeno de propósito: 5e−5 × 700 = 3,5 %.
   */
  it('o véu de Saturno divide o `s`: 2,8986 lá, 3 EXATO em todo o resto', () => {
    expect(sDoTerminador('assistida', densidadeDoVeu('saturn'))).toBeCloseTo(2.898551, 6);
    for (const id of ['jupiter', 'uranus', 'neptune', 'earth', 'moon', 'mercury']) {
      expect(Object.is(sDoTerminador('assistida', densidadeDoVeu(id)), 3), id).toBe(true);
    }
    // e a política manda mais alto que a atmosfera: em `real` é 0 com véu ou sem
    expect(sDoTerminador('real', densidadeDoVeu('saturn'))).toBe(0);
  });

  it('o que o `s` de Saturno faz na curva: vaza mais no terminador, cede 1 % no flanco', () => {
    const s = sDoTerminador('assistida', densidadeDoVeu('saturn'));
    // o vazamento em N·L = 0 sobe de 4,98 % para 5,51 %
    expect(terminadorSuave(0)).toBeCloseTo(0.049787, 6);
    expect(terminadorSuave(0, s)).toBeCloseTo(0.055103, 6);
    // e o flanco cede 1 %: 0,7165 → 0,7091
    expect(terminadorSuave(0.5, s) / terminadorSuave(0.5)).toBeCloseTo(0.9895, 4);
  });

  /**
   * O ORÁCULO VEM DE FORA: é a tabela do §1.2 do contrato, lida no fonte
   * do NASA Eyes em 24/08. Quem a responde é o CORPO de `terminadorSuave`
   * tal como está no chunk, executado — trocar a curva por `max(x, 0)` ou
   * mexer no `s` muda o que roda aqui, e a tabela reprova.
   */
  it.each([
    [1.0, 1.0],
    [0.5, 0.72],
    [0.2, 0.36],
    [0.0, 0.05],
    [-0.5, 0.0],
    [-1.0, 0.0],
  ])('N·L cru %s devolve %s, como no Eyes', (ndotl, esperado) => {
    expect(terminadorSuave(ndotl)).toBeCloseTo(esperado, 2);
  });

  it('o flanco a N·L = 0,5 sobe 43 % sobre o Lambert puro — o ganho da peça', () => {
    const razao = terminadorSuave(0.5) / 0.5;
    // 1,433 é o número EXECUTADO, e é dele que sai o "+43 %" escrito no
    // módulo e no contrato. O 1,44 do §1.2 é a mesma razão lida na tabela
    // ARREDONDADA do Eyes (0,72/0,50) — uma casa decimal, não outra conta.
    expect(razao).toBeCloseTo(1.433, 3);
    expect(razao).toBeGreaterThan(1.4);
  });

  it('o subsolar continua exatamente 1 — a curva não estoura o dia', () => {
    expect(terminadorSuave(1)).toBeCloseTo(1, 12);
    for (let x = 0; x <= 1.0001; x += 0.05) {
      expect(terminadorSuave(x)).toBeLessThanOrEqual(1);
    }
  });

  it('é estritamente crescente: a curva não inverte o terminador', () => {
    let anterior = -1;
    for (let x = -1; x <= 1.0001; x += 0.02) {
      const y = terminadorSuave(x);
      expect(y).toBeGreaterThanOrEqual(anterior);
      anterior = y;
    }
  });

  /**
   * A IDENTIDADE DO MODO REAL, e ela mora numa LINHA SÓ do chunk: a
   * guarda `if (uTerminadorS <= 0.0) return max(x, 0.0);`. Sem ela a
   * logística com s = 0 degenera na CONSTANTE 1 — `2·(1+1)/(1+1) − 1` —
   * e o globo inteiro do modo real sairia em dia pleno, noite incluída.
   * Por isso o pino é bit a bit e varre também o lado escuro.
   */
  it('com s = 0 o shader devolve o Lambert cru, BIT A BIT (o modo real)', () => {
    for (const x of [-1, -0.7, -0.3, -0.05, 0, 0.2, 0.5, 0.9, 1]) {
      expect(Object.is(terminadorSuave(x, sDoTerminador('real')), Math.max(x, 0)), `x=${x}`)
        .toBe(true);
    }
  });
});

/**
 * O JUIZ CONFERE O PRÓPRIO INSTRUMENTO. O tradutor de GLSL desta página é
 * quem faz os blocos de cima serem execução e não texto; se ele passar a
 * engolir o que não entende, os blocos de cima viram teatro sem avisar.
 */
describe('3b. o instrumento — o tradutor que executa o chunk', () => {
  /**
   * A LISTA DAS PEÇAS SAI DO TEXTO, não da memória de quem escreveu o
   * teste — e até 25/08 saía da memória. Redigitados à mão, os cinco
   * nomes ficavam para trás do chunk: uma SEXTA peça, com uma construção
   * que o tradutor não conhece, entrava sem reprovar nada enquanto o
   * `main` do shader não a chamasse, e este bloco jurava executar "as
   * peças" medindo só as de que se lembrava. Agora quem lista é
   * `nomesDoChunk()`, o mesmo descobridor que o tradutor usa.
   */
  it('TODA peça do chunk COMPILA no juiz — a lista sai do texto', () => {
    const pecas = nomesDoChunk();
    expect(pecas.length).toBeGreaterThan(0);
    for (const nome of pecas) {
      expect(CHUNK, nome).toContain(`${nome}(`);
      expect(() => funcaoDoChunk(nome), nome).not.toThrow();
    }
  });

  /**
   * E O CENSO FECHA. A lista derivada cobre a peça que CHEGA; este pino
   * cobre a que SOME — peça apagada ou renomeada sem que ninguém aqui
   * soubesse deixaria o laço de cima passeando por quatro nomes e verde.
   */
  it('o censo fecha: as SEIS peças da receita, nem uma a mais nem a menos', () => {
    expect(nomesDoChunk()).toEqual([
      'terminadorSuave', 'lanternaDeLeitura', 'daTelaParaLinear', 'luzDoGlobo',
      'opacidadeDoVeu', 'globoComVeu',
    ]);
  });

  /**
   * A CHAMADA ENTRE PEÇAS é execução de verdade, não um `luzDoGlobo`
   * paralelo escrito em JS: `globoComVeu` recebe a IRMÃ compilada do
   * mesmo texto, com os mesmos uniformes. Se o teto da soma mudar lá, a
   * conta do véu muda aqui na mesma execução.
   */
  it('uma peça chama a outra, e é a peça de VERDADE que responde', () => {
    expect(nomesDoChunk()).toContain('luzDoGlobo');
    // sem véu, `globoComVeu` É `albedo × luzDoGlobo(luzSol, fill)` — e o
    // teto da soma aparece: 0,5 + 0,15 passa, 1 + 0,15 não
    expect(globoComVeu(0.4, 0.5, 0.15, 0)).toBeCloseTo(0.4 * 0.65, 12);
    expect(globoComVeu(0.4, 1, 0.15, 0)).toBeCloseTo(0.4, 12);
  });

  it('função que não existe no chunk REPROVA — não devolve um zero educado', () => {
    expect(() => funcaoDoChunk('lanternaQueNinguemEscreveu')).toThrow(/não declara/);
  });

  it('construção que o tradutor não conhece REPROVA — quem não mede, reprova', () => {
    // `mix` e `sqrt` ATRAVESSAM desde o véu (§4.4); `smoothstep` não, e
    // é ela que ocupa o lugar de exemplo que o `mix` tinha até 25/08
    expect(() => traduzirGlsl('return smoothstep(0.0, 0.05, x);', ['x'], 'inventada'))
      .toThrow(/smoothstep/);
    expect(() => traduzirGlsl('return texture2D(uMapa, vUv).r;', [], 'inventada'))
      .toThrow(/texture2D/);
    // e o que ele CONHECE atravessa: declaração com tipo, vec3 de um canal
    expect(traduzirGlsl('vec3 t = vec3(1.0);\nreturn max(x, t);', ['x'], 'ok'))
      .toContain('const t =');
  });

  /**
   * RECURSÃO REPROVA COM O NOME. É o único buraco que a varredura de
   * identificadores não podia fechar sozinha: o nome da própria peça
   * está em `nomesDoChunk()`, logo em `conhecidos`, e passaria — para
   * estourar depois num `ReferenceError` cru, porque a assinatura de
   * `funcaoDoChunk` amarra as IRMÃS e exclui o próprio nome.
   */
  it('peça que chama a SI MESMA reprova, e a recusa DIZ qual peça', () => {
    // o nome é o de uma peça DE VERDADE do chunk, e é isso que prova o
    // buraco: `terminadorSuave` está em `nomesDoChunk()`, portanto em
    // `conhecidos`, e a varredura de identificadores o deixaria passar
    expect(() => traduzirGlsl('return terminadorSuave(x);', ['x'], 'terminadorSuave'))
      .toThrow(/`terminadorSuave` chama a SI MESMA/);
    // e a chamada a uma IRMÃ continua atravessando — é ela que faz
    // `globoComVeu` executar o `luzDoGlobo` de verdade
    expect(() => traduzirGlsl('return luzDoGlobo(x, x);', ['x'], 'vizinha')).not.toThrow();
  });
});

/**
 * A PEÇA (d) — O VÉU PALHA DE SATURNO, o §4.4 do contrato, a última a
 * pousar. Aqui não há pino de texto: cada número sai do CORPO de
 * `opacidadeDoVeu` e de `globoComVeu` tal como o shader os compila.
 */
describe('3c. peça (d) — o véu palha de Saturno', () => {
  it('os números do Eyes chegaram inteiros: 200 km, 5e−5 e a palha de três bytes', () => {
    expect(VEU_DE_SATURNO.escalaDeAlturaKm).toBe(200);
    expect(VEU_DE_SATURNO.densidadePorKm).toBe(5e-5);
    expect(VEU_DE_SATURNO.corEmBytesSRgb).toEqual([234, 202, 151]);
  });

  it('SÓ Saturno tem véu — os outros 37 resolvidos saem com ZERO', () => {
    expect(densidadeDoVeu('saturn')).toBe(5e-5);
    for (const id of RESOLVIDOS.filter((r) => r !== 'saturn')) {
      expect(densidadeDoVeu(id), id).toBe(0);
      expect(colunaVerticalDoVeu(id), id).toBe(0);
      expect(espessuraDoVeu(id), id).toBe(0);
    }
  });

  /**
   * A COLUNA VERTICAL é a única leitura das duas grandezas do Eyes que
   * fecha em unidades: `density` em 1/km vezes `scaleHeight` em km é a
   * integral `∫ρ₀e^(−z/H)dz`, adimensional. Dá 0,01 — e é essa dose que
   * o véu inteiro escala.
   */
  it('a coluna vertical é ρ₀·H = 0,01, e é ela que dá a dose', () => {
    expect(colunaVerticalDoVeu('saturn')).toBeCloseTo(0.01, 15);
    expect(colunaVerticalDoVeu('saturn')).toBe(
      VEU_DE_SATURNO.densidadePorKm * VEU_DE_SATURNO.escalaDeAlturaKm
    );
  });

  /**
   * OS DOIS EXTREMOS DO MODELO, EXECUTADOS. A casca equivalente de
   * `4H/π` existe para acertar os dois: 1 no subsolar (a coluna vertical
   * é a coluna vertical) e a Chapman rasante no limbo. Os números saem
   * do chunk pela opacidade, invertida — não há segunda fórmula em JS.
   */
  it('a massa de ar bate nos DOIS extremos: 1 no subsolar, Chapman no limbo', () => {
    expect(massaDeArDoVeu(1)).toBeCloseTo(1, 9);
    const chapman = Math.sqrt(
      (Math.PI * BODY_AXES.saturn![0]) / (2 * VEU_DE_SATURNO.escalaDeAlturaKm)
    );
    expect(chapman).toBeCloseTo(21.7565, 4);
    // a casca fica 0,1 % acima da Chapman — a sobra do `t²` da raiz
    expect(massaDeArDoVeu(0) / chapman - 1).toBeLessThan(0.002);
    expect(massaDeArDoVeu(0)).toBeGreaterThan(chapman);
    // e a espessura é a que faz isso acontecer: 4H/πR
    expect(espessuraDoVeu('saturn')).toBeCloseTo(0.00422526, 8);
  });

  it('o perfil do véu abraça a BORDA: 1 % no centro do disco, 19,6 % no limbo', () => {
    expect(opacidadeDoVeu(1)).toBeCloseTo(0.009950, 6);
    expect(opacidadeDoVeu(0.5)).toBeCloseTo(0.019679, 6);
    expect(opacidadeDoVeu(0.2)).toBeCloseTo(0.046582, 6);
    expect(opacidadeDoVeu(0.1)).toBeCloseTo(0.081452, 6);
    expect(opacidadeDoVeu(0)).toBeCloseTo(0.195709, 6);
  });

  it('é monótona e nunca passa de 1 — véu não é tinta por cima do planeta', () => {
    let anterior = 1;
    for (let mu = 0; mu <= 1.0001; mu += 0.02) {
      const a = opacidadeDoVeu(mu);
      expect(a, `μ=${mu.toFixed(2)}`).toBeLessThanOrEqual(anterior);
      expect(a).toBeGreaterThan(0);
      expect(a).toBeLessThan(1);
      anterior = a;
    }
    // fora do domínio o clamp segura: costas para a câmera não inventam véu
    expect(opacidadeDoVeu(-0.5)).toBe(opacidadeDoVeu(0));
  });

  /**
   * O CORPO SEM VÉU NÃO PAGA NADA. Júpiter, Urano e Netuno compilam o
   * MESMO fragmento de Saturno e passam por `opacidadeDoVeu` e
   * `globoComVeu` em todo pixel — a garantia é que saem BIT A BIT como
   * antes desta obra, e ela vale pela guarda `uVeuColuna <= 0`.
   */
  it('coluna 0 = corpo sem véu: opacidade ZERO e mistura IDÊNTICA, bit a bit', () => {
    for (const id of ['jupiter', 'uranus', 'neptune']) {
      for (const mu of [0, 0.2, 0.5, 1]) {
        expect(opacidadeDoVeu(mu, id), `${id} μ=${mu}`).toBe(0);
      }
    }
    for (const [albedo, luzSol, fill] of [
      [0.5, 1, 0.15], [0.5, 0, 0.15], [0.42, 0.5, 0.15], [0.7, 0.011037, 0],
    ]) {
      const semVeu = somaComTeto(luzSol!, fill!) * albedo!;
      expect(Object.is(globoComVeu(albedo!, luzSol!, fill!, 0), semVeu)).toBe(true);
    }
  });

  /**
   * A COR SAI EM LINEAR, e isto é o oposto de um detalhe. A palha do
   * Eyes está escrita em BYTES DE TELA; o albedo que ela se mistura já
   * chega decodificado (o sampler de `texturas.ts`), e o quadro sai por
   * ACES. Passar o byte cru pintaria um véu claro e lavado — a mesma
   * classe de erro de um normal map em sRGB, e igualmente silenciosa.
   */
  it('a palha atravessa em LINEAR — 0,823/0,591/0,309, não o byte cru', () => {
    expect(COR_DO_VEU[0]).toBeCloseTo(0.822786, 6);
    expect(COR_DO_VEU[1]).toBeCloseTo(0.590619, 6);
    expect(COR_DO_VEU[2]).toBeCloseTo(0.309469, 6);
    // e NÃO é o byte de tela: cada canal está abaixo dele, como a curva manda
    for (let c = 0; c < 3; c++) {
      const byte = VEU_DE_SATURNO.corEmBytesSRgb[c]! / 255;
      expect(COR_DO_VEU[c]!, `canal ${c}`).toBeLessThan(byte);
      // e volta ao byte pela codificação inversa — a conta é reversível
      expect(1.055 * COR_DO_VEU[c]! ** (1 / 2.4) - 0.055).toBeCloseTo(byte, 12);
    }
  });

  /**
   * A LANTERNA NÃO ENTRA NO VÉU — a sabotagem que este bloco existe para
   * pegar. No Eyes a atmosfera percorre as luzes com
   * `length(lightPositions[i]) > 0` e pula a luz de câmera, que está na
   * origem. Aqui isso é `globoComVeu` acender a palha com `luzSol`, não
   * com a soma. Trocar o argumento pela soma acenderia palha na noite.
   */
  it('a noite não ganha auréola: com o Sol em 0, o véu ACRESCENTA zero', () => {
    const a = opacidadeDoVeu(0);
    const albedo = 0.5;
    const soLanterna = globoComVeu(albedo, 0, LANTERNA_DE_LEITURA, a);
    // o que sobra é a lanterna EXTINGUIDA pela palha apagada — e nada mais
    expect(soLanterna).toBeCloseTo(albedo * LANTERNA_DE_LEITURA * (1 - a), 12);
    // o que a sabotagem produziria (a palha acesa pela soma), por extenso
    const comLanternaNoVeu =
      albedo * LANTERNA_DE_LEITURA * (1 - a) + COR_DO_VEU[0]! * LANTERNA_DE_LEITURA * a;
    expect(soLanterna).toBeLessThan(comLanternaNoVeu);
    expect(comLanternaNoVeu / soLanterna).toBeGreaterThan(1.3);
    // e sem Sol E sem lanterna a noite é PRETA — emissividade 0, literal
    expect(globoComVeu(albedo, 0, 0, a)).toBe(0);
  });

  /**
   * O CASO GERAL da mesma lei, e ele pega a sabotagem em qualquer ponto
   * do terminador, não só na noite fechada: o que o véu acende é o termo
   * do SOL, então o resultado tem de bater com `luzSol` sozinho — e NÃO
   * com a soma que a superfície usa. No subsolar as duas contas
   * coincidem (o teto), e é por isso que o pino vive no meio da curva.
   */
  it('no MEIO da curva o véu ainda lê só o Sol — 0,5, não 0,65', () => {
    const a = opacidadeDoVeu(0.1); // um limbo de verdade, nem borda nem centro
    const albedo = 0.45;
    const luzSol = 0.5;
    const fill = LANTERNA_DE_LEITURA;
    const certo = albedo * (luzSol + fill) * (1 - a) + COR_DO_VEU[0]! * luzSol * a;
    const comLanternaNoVeu =
      albedo * (luzSol + fill) * (1 - a) + COR_DO_VEU[0]! * (luzSol + fill) * a;
    expect(globoComVeu(albedo, luzSol, fill, a)).toBeCloseTo(certo, 12);
    expect(globoComVeu(albedo, luzSol, fill, a)).not.toBeCloseTo(comLanternaNoVeu, 6);
  });

  it('o véu ACENDE do lado do Sol: no limbo iluminado a palha entra de verdade', () => {
    const a = opacidadeDoVeu(0);
    const albedo = 0.45; // o tom do mapa SSS de Saturno, ordem de grandeza
    const semVeu = globoComVeu(albedo, 1, LANTERNA_DE_LEITURA, 0);
    const comVeu = globoComVeu(albedo, 1, LANTERNA_DE_LEITURA, a);
    expect(comVeu).toBeGreaterThan(semVeu);
    expect(comVeu / semVeu).toBeCloseTo(1 + a * (COR_DO_VEU[0]! / albedo - 1), 12);
  });

  /**
   * `sunsetIntensity` 0 — a palha NÃO muda de cor com o Sol. O véu
   * multiplica a cor por um escalar, então a razão entre canais do termo
   * dele é constante. Um poente (o 1,2 da Terra deles) faria esta razão
   * andar com o ângulo, e é isso que Saturno não tem.
   */
  it('a croma do véu não anda: R/B parado, só a intensidade muda', () => {
    const a = opacidadeDoVeu(0);
    const razoes = [1, 0.5, 0.05, 0.011037].map((luzSol) => {
      const r = globoComVeu(0, luzSol, 0, a, 0);
      const b = globoComVeu(0, luzSol, 0, a, 2);
      return r / b;
    });
    for (const razao of razoes) {
      expect(razao).toBeCloseTo(COR_DO_VEU[0]! / COR_DO_VEU[2]!, 12);
    }
  });

  /**
   * `?luz=real` NÃO GANHA BRILHO INDEVIDO, e a lei EXATA que garante
   * isso é a LINEARIDADE: o termo do véu é `cor × luzSol × opacidade`,
   * sem parcela própria, então E(d) vezes o MESMO `luzSol` dá E(d) vezes
   * o véu — e nada mais. A penumbra física do dono continua de pé,
   * escalada, não desfeita.
   *
   * O QUE ESTE PINO DEIXOU DE PROMETER (o achado A5 da auditoria de
   * 25/08): que o véu de `real` seja E(d) vezes o de `assistida` PIXEL A
   * PIXEL. Não é, e o pino antigo só parecia prová-lo porque entregava
   * aos dois modos um `luzSol` que nenhum dos dois produz — o ganho
   * cru, sem terminador. O bloco seguinte mede o desmentido.
   */
  it('o véu é LINEAR no Sol: E(d) × o MESMO luzSol, e nenhuma luz própria', () => {
    const a = opacidadeDoVeu(0);
    const E = ganhoDoGlobo(D_SATURNO, 'real');
    expect(E).toBeCloseTo(0.011037, 6);
    // os quatro `luzSol` são pontos REAIS da curva de `assistida`
    // (subsolar, flanco, meio e o vazamento do terminador), e o véu
    // escala com cada um deles pelo mesmo E(d) — o TERMO da palha sai
    // sozinho com albedo 0
    for (const luzSol of [1, 0.709057, 0.36, 0.055103]) {
      const cheio = globoComVeu(0, luzSol, 0, a);
      const escalado = globoComVeu(0, E * luzSol, 0, a);
      expect(escalado / cheio, `luzSol=${luzSol}`).toBeCloseTo(E, 12);
      expect(escalado, `luzSol=${luzSol}`).toBeLessThan(cheio / 90);
    }
    // e sem Sol nenhum não há véu: a linearidade passa pela origem
    expect(globoComVeu(0, 0, 0, a)).toBe(0);
  });

  /**
   * E(d) É O TETO DA RAZÃO ENTRE MODOS, NÃO A RAZÃO. Os dois modos não
   * entregam o mesmo `luzSol` para o mesmo N·L: `real` manda o Lambert
   * cru vezes E(d), `assistida` manda a logística. A razão entre eles
   * anda com o N·L, e no terminador ela vai a ZERO — porque a logística
   * ainda vaza 5,5 % onde o Lambert cru já não vaza nada.
   */
  it('a razão entre MODOS anda com o N·L — E(d) só no subsolar', () => {
    const E = ganhoDoGlobo(D_SATURNO, 'real');
    const s = sDoTerminador('assistida', densidadeDoVeu('saturn'));
    const luzDe = (ndotl: number) => ({
      assistida: terminadorSuave(ndotl, s),
      real: E * Math.max(ndotl, 0),
    });
    const razao = (ndotl: number) => {
      const { assistida, real } = luzDe(ndotl);
      return real / assistida;
    };
    // no subsolar as duas curvas valem 1, e SÓ ali a razão é E(d)
    expect(luzDe(1).assistida).toBe(1);
    expect(razao(1)).toBeCloseTo(E, 12);
    // no flanco a logística já levantou a `assistida`: a razão cede ~30 %
    expect(razao(0.5) / E).toBeCloseTo(0.705, 3);
    // e no terminador vai a ZERO: a logística vaza 5,5 %, o Lambert não
    expect(luzDe(0).assistida).toBeCloseTo(0.055103, 6);
    expect(razao(0)).toBe(0);
    // o teto nunca é ultrapassado no disco iluminado
    for (const ndotl of [0, 0.1, 0.2, 0.35, 0.5, 0.7, 0.85, 0.95, 1]) {
      expect(razao(ndotl), `N·L=${ndotl}`).toBeLessThanOrEqual(E);
    }
  });

  it('os uniformes do véu nascem por CORPO, e só Saturno os traz acesos', () => {
    const saturno = uniformsDoVeu('saturn');
    expect(saturno.uVeuColuna!.value).toBe(colunaVerticalDoVeu('saturn'));
    expect(saturno.uVeuEspessura!.value).toBe(espessuraDoVeu('saturn'));
    expect(saturno.uVeuCor!.value).toEqual([...COR_DO_VEU]);
    for (const id of ['jupiter', 'uranus', 'neptune']) {
      const u = uniformsDoVeu(id);
      expect(u.uVeuColuna!.value, id).toBe(0);
      expect(u.uVeuEspessura!.value, id).toBe(0);
    }
  });
});

describe('4. decisão 2 do dono — `real` conserva a penumbra FÍSICA', () => {
  it.each([0.31, D_MERCURIO, D_TERRA, 5.2, D_SATURNO, 30, 95])(
    'a %s UA o ganho em `real` é E(d) BIT A BIT',
    (d) => {
      expect(Object.is(ganhoDoGlobo(d, 'real'), irradianciaRelativa(d))).toBe(true);
      expect(Object.is(ganhoDoGlobo(d, 'real'), ganhoFundido(d, 'real'))).toBe(true);
    }
  );

  it('em `real` Saturno é MUITO mais escuro que a Terra — a posição 1:1', () => {
    const saturno = ganhoDoGlobo(D_SATURNO, 'real');
    const terra = ganhoDoGlobo(D_TERRA, 'real');
    expect(saturno).toBeCloseTo(0.011037, 6);
    expect(terra / saturno).toBeGreaterThan(90);
  });

  it('em `assistida` a mesma dupla fica JUNTA — e agora é 1 contra 1', () => {
    expect(ganhoDoGlobo(D_SATURNO, 'assistida')).toBe(ganhoDoGlobo(D_TERRA, 'assistida'));
  });

  /**
   * AS TRÊS PEÇAS ACENDEM E APAGAM JUNTAS, por um interruptor só. É o
   * que impede a receita de virar meia-receita — um modo com lanterna e
   * sem logística, por exemplo, não é alcançável desta casa.
   */
  it('o interruptor é UM: as três peças concordam com a política', () => {
    const neutro = { ganho: 1, lanterna: 0, s: 0 };
    expect({
      ganho: ganhoDoGlobo(D_TERRA, 'real') === irradianciaRelativa(D_TERRA) ? 1 : 0,
      lanterna: lanternaDaVisita('real'),
      s: sDoTerminador('real'),
    }).toEqual(neutro);
    expect(lanternaDaVisita('assistida')).toBeGreaterThan(0);
    expect(sDoTerminador('assistida')).toBeGreaterThan(0);
  });
});

describe('5. os uniformes que a malha recebe — um escritor só', () => {
  it('nascem NEUTROS: um material que ninguém ticou não inventa luz', () => {
    const u = uniformsDaLuzDaVisita();
    expect(u.uLanternaLeitura!.value).toBe(0);
    expect(u.uTerminadorS!.value).toBe(0);
  });

  it('o escritor acende os dois com a MESMA política, e apaga os dois', () => {
    const u = uniformsDaLuzDaVisita();
    escreverLuzDaVisita(u, 'assistida');
    expect(u.uLanternaLeitura!.value).toBe(LANTERNA_DE_LEITURA);
    expect(u.uTerminadorS!.value).toBe(S_DO_TERMINADOR);
    escreverLuzDaVisita(u, 'real');
    expect(u.uLanternaLeitura!.value).toBe(0);
    expect(u.uTerminadorS!.value).toBe(0);
  });
});

/**
 * O QUE A OBRA MOVEU, DITO COM NÚMERO. O item 91 pinava Terra e Lua
 * bit-idênticas ao pré-91 — a distância da visita delas era a `ANCORA_UA`
 * e a compensação valia 1 exato. O contrato do 93 autoriza a queda desse
 * pino em letra ("Bit-idêntico da Terra/Lua do item 91: **cai**"), e ela
 * cai por três motivos somados. Este bloco existe para que a queda seja
 * MEDIDA e não silenciosa.
 */
describe('6. o pino que caiu — a Terra deixou de ser bit-idêntica, e quanto', () => {
  it('o ganho de casa: era E(d)^σ na distância viva, agora é 1 exato', () => {
    const antes = ganhoFundido(D_TERRA, 'assistida');
    const agora = ganhoDoGlobo(D_TERRA, 'assistida');
    expect(agora).toBe(1);
    // o delta do GANHO sozinho é minúsculo — a Terra vive na âncora
    expect(antes).toBeCloseTo(1.011839253200, 9);
    expect(Math.abs(agora / antes - 1)).toBeLessThan(0.012);
    expect(Object.is(agora, antes)).toBe(false);
  });

  it('quem move a Terra de verdade são a logística e a lanterna', () => {
    // no flanco a 45° o terminador sozinho já vale +24 %
    const flanco = Math.cos(Math.PI / 4);
    expect(terminadorSuave(flanco) / flanco).toBeCloseTo(1.237, 3);
    // e a noite voltada para a câmera passa de PRETA a 15 %
    expect(somaComTeto(0, lanternaDaVisita('assistida'))).toBe(0.15);
    expect(somaComTeto(0, lanternaDaVisita('real'))).toBe(0);
  });
});

describe('7. o que o selo declara — os passos de luz', () => {
  it('em `real` não há nada a declarar: 0 EXATO', () => {
    for (const d of [D_MERCURIO, D_TERRA, D_SATURNO, 30, 95]) {
      expect(stopsDaVisita(d, 'real')).toBe(0);
    }
  });

  it('em `assistida` o gasto é exatamente 2·log2(d) — a conta ficou legível', () => {
    for (const d of [D_MERCURIO, D_TERRA, 5.2, D_SATURNO, 30, 95]) {
      expect(stopsDaVisita(d, 'assistida')!).toBeCloseTo(2 * Math.log2(d), 12);
      expect(stopsDaVisita(d, 'assistida')!).toBeCloseTo(
        Math.log2(ganhoDoGlobo(d, 'assistida') / irradianciaRelativa(d)),
        12
      );
    }
  });

  it('os números que o selo vai mostrar, um por um', () => {
    const stops = (d: number) => stopsDaVisita(d, 'assistida')!;
    expect(stops(D_SATURNO)).toBeCloseTo(6.5, 1);
    expect(stops(5.2118928954384449)).toBeCloseTo(4.8, 1);
    expect(stops(29.884744842988464)).toBeCloseTo(9.8, 1);
    expect(stops(95)).toBeCloseTo(13.1, 1);
    // a âncora não gasta nada — a Terra sai em ~0
    expect(Math.abs(stops(D_TERRA))).toBeLessThan(0.05);
    // Mercúrio é NEGATIVO: a visita gasta luz para BAIXO
    expect(stops(D_MERCURIO)).toBeCloseTo(-2.2, 1);
  });
});

/**
 * O HANDOFF PONTO↔GLOBO, e por que ele continua sem degrau no item 93.
 *
 * O medo é legítimo e está escrito na `cessaoAlvo`: a borda 2,5 da rampa
 * foi DERIVADA de "a luz combinada nunca dá passo para trás na
 * aproximação". O 91 multiplicou a radiância do globo de Saturno por
 * 4,85; o 93 a multiplica por mais 1,3 % e acrescenta a lanterna.
 *
 * O QUE ESTE BLOCO PROVA, e é o que fecha o argumento: a exposição da
 * visita não é função da câmera, e o globo nasce SOB o clarão. Então
 * nada na aproximação pode dar um pulo POR CAUSA do ganho — o que cresce
 * é a ÁREA, continuamente, a partir dos 4 px do gate.
 *
 * A LANTERNA NÃO ABRE BURACO NOVO AQUI: ela é constante em toda a
 * aproximação (não olha a distância) e está limitada pelo teto de 1, que
 * é o mesmo teto de sempre.
 *
 * A prova MEDIDA da escada de aproximação (a captura de 25/08, com os
 * degraus 800→3 raios sem recuo) continua no item 91 do
 * `docs/PENDENCIAS-ARQUIVO.md`.
 */
describe('8. o handoff ponto↔globo — o degrau que não existe', () => {
  it('a exposição da visita NÃO é função da câmera: o mesmo corpo, o mesmo ganho', () => {
    for (const d of [D_MERCURIO, D_TERRA, D_SATURNO, 30, 95]) {
      const ganho = ganhoDoGlobo(d, 'assistida');
      for (let i = 0; i < 4; i++) {
        expect(Object.is(ganhoDoGlobo(d, 'assistida'), ganho), `${d} UA`).toBe(true);
      }
    }
  });

  it('o globo NASCE sob o clarão: aos 4 px do gate a cessão ainda é 0', () => {
    for (const halo of [8, 12, 16]) {
      expect(cessaoAlvo(true, LIMIAR_DO_GATE_PX, halo)).toBe(0);
    }
  });

  it('o fluxo do globo na tela CRESCE em toda a aproximação — área × radiância fixa', () => {
    const raioPc = 2.9e-9; // ordem de grandeza de um gigante, em pc
    const ganho = ganhoDoGlobo(D_SATURNO, 'assistida');
    let anterior = 0;
    for (let raios = 5000; raios >= 2; raios *= 0.9) {
      const px = diametroAparentePx(raioPc, raioPc * raios, 1080, 58);
      if (px < LIMIAR_DO_GATE_PX) continue;
      const fluxo = px * px * ganho;
      expect(fluxo, `raios=${raios.toFixed(1)}`).toBeGreaterThan(anterior);
      anterior = fluxo;
    }
    expect(anterior).toBeGreaterThan(0);
  });
});

/**
 * A CALIBRAÇÃO DO ITEM 93 — a quem este bloco serve.
 *
 * Serve a UMA decisão do dono que ainda não foi tomada: qual das três
 * candidatas vira o brilho assistido da casa. Enquanto ela não é tomada, o
 * que ele cobra é o contrário de uma escolha — que **sem a porta `?calib=`
 * nada mude**, e que `?luz=real` continue sem uma gota da calibração. As
 * duas coisas são afirmações de PIXEL, e aqui elas viram conta executada.
 *
 * A CAUSA que estas linhas encapsulam (investigada antes de girar botão):
 * os números da receita do Eyes são bytes de TELA — lá o Phong multiplica
 * o que se vê, sem gerência de cor e sem tonemap — e atravessaram para o
 * nosso shader em LINEAR. É a lição do `COR_DO_VEU` aplicada ao termo de
 * LUZ. `daTelaParaLinear` é a tradução; `?calib=` é quem a acende.
 *
 * QUANDO ESTE BLOCO MORRE: com a escolha dele. A vencedora vira o padrão,
 * a porta sai, e o que sobrevive aqui é só o que a vencedora executar.
 */
describe('9. a calibração candidata (item 93) — a porta e o que ela promete', () => {
  const CANDIDATAS: readonly CalibracaoDaLuz[] = ['padrao', 'c1', 'c2', 'c3'];

  /** o oráculo da IEC 61966-2-1, escrito à parte do módulo de propósito:
   *  se o chunk e o módulo divergirem, é aqui que aparece. */
  const iec = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

  it('a porta aceita as três e recusa o resto — `padrao` NÃO se pede', () => {
    for (const c of ['c1', 'c2', 'c3']) expect(lerPortaCalibracao(c)).toBe(c);
    for (const lixo of ['padrao', 'C1', '', null, undefined, 'constructor', 'c4', '1']) {
      expect(lerPortaCalibracao(lixo), String(lixo)).toBeNull();
    }
  });

  /**
   * O GATE DO ITEM: sem a porta, o pixel não muda. `daTelaParaLinear`
   * apagada devolve o ARGUMENTO — `Object.is`, não `toBeCloseTo` —, e
   * `luzDoGlobo` volta a ser caractere por caractere a soma com teto.
   */
  it('sem a porta, a tradução é a IDENTIDADE e a soma é a de sempre', () => {
    for (const c of [0, 1e-9, 0.0404, 0.04045, 0.05, 0.15, 0.5, 1, 6.7]) {
      expect(Object.is(daTelaParaLinear(c, { uTraduzDaTela: 0 }), c), String(c)).toBe(true);
    }
    for (const [luzSol, fill] of [[0, 0.15], [0.5, 0.15], [1, 0.15], [6.7, 0.15], [0.0498, 0]]) {
      const teto = Math.max(luzSol!, Math.min(luzSol! + fill!, 1));
      expect(Object.is(somaComTeto(luzSol!, fill!, chavesDe('padrao')), teto)).toBe(true);
    }
  });

  it('`?luz=real` não recebe uma gota de calibração — nem com `?calib=`', () => {
    for (const calib of CANDIDATAS) {
      const u = uniformsDaLuzDaVisita();
      escreverLuzDaVisita(u, 'real', densidadeDoVeu('saturn'), calib);
      expect({ ...u }, calib).toEqual({
        uLanternaLeitura: { value: 0 },
        uTerminadorS: { value: 0 },
        uTraduzDaTela: { value: 0 },
        uLanternaDepois: { value: 0 },
      });
    }
  });

  it('o escritor acende as quatro chaves conforme a candidata', () => {
    for (const calib of CANDIDATAS) {
      const u = uniformsDaLuzDaVisita();
      escreverLuzDaVisita(u, 'assistida', 0, calib);
      expect(u.uLanternaLeitura!.value, calib).toBe(CALIBRACOES[calib].lanterna);
      expect(u.uTerminadorS!.value, calib).toBe(CALIBRACOES[calib].s);
      expect(u.uTraduzDaTela!.value, calib).toBe(CALIBRACOES[calib].traduz ? 1 : 0);
      expect(u.uLanternaDepois!.value, calib).toBe(CALIBRACOES[calib].depois ? 1 : 0);
    }
    // e a divisão do véu do Eyes continua valendo por cima da candidata
    const u = uniformsDaLuzDaVisita();
    escreverLuzDaVisita(u, 'assistida', densidadeDoVeu('saturn'), 'c3');
    expect(u.uTerminadorS!.value).toBeCloseTo(1.2 / 1.035, 12);
  });

  it('acesa, a tradução É a curva da IEC — os dois ramos e o joelho', () => {
    for (const c of [0, 0.001, 0.02, 0.0404, 0.04045, 0.0405, 0.05, 0.15, 0.5, 1]) {
      expect(daTelaParaLinear(c), String(c)).toBeCloseTo(iec(c), 12);
    }
    // e é a MESMA que decodificou a palha do véu — uma curva, duas bocas
    expect(daTelaParaLinear(234 / 255)).toBeCloseTo(COR_DO_VEU[0], 12);
    expect(daTelaParaLinear(151 / 255)).toBeCloseTo(COR_DO_VEU[2], 12);
    // preto continua preto: é o que o `pow` sozinho erraria (8,3e−4)
    expect(daTelaParaLinear(0)).toBe(0);
  });

  /**
   * O QUE CADA CANDIDATA FAZ COM A NOITE — a resposta a Q9, em conta.
   * A noite é `luzSol = 0`: só a lanterna trabalha. Os números são a LUZ
   * (linear), antes do albedo e do ACES; o byte de tela mora na folha.
   */
  it('a noite: c1 derruba 7,6×, c2 e c3 pousam em 0,05 e o padrão fica em 0,15', () => {
    const noite = (calib: CalibracaoDaLuz) =>
      somaComTeto(0, lanternaDaVisita('assistida', calib), chavesDe(calib));
    expect(noite('padrao')).toBe(0.15);
    expect(noite('c1')).toBeCloseTo(iec(0.15), 12);
    expect(noite('c1')).toBeCloseTo(0.0196066, 6);
    expect(noite('c2')).toBe(0.05);
    expect(noite('c3')).toBe(0.05);
    // a ordem é o que a folha vai mostrar: c1 « c2 = c3 « padrão
    expect(noite('c1')).toBeLessThan(noite('c2'));
    expect(noite('c2')).toBeLessThan(noite('padrao'));
  });

  /**
   * O QUE CADA CANDIDATA FAZ COM O DIA — e a prova de que o subsolar NÃO
   * cai: no teto da tela a tradução vale 1 exato, então a c1 e a c2
   * entregam o mesmo dia de hoje. O que elas mexem é o que está ABAIXO.
   */
  it('o subsolar não se mexe em nenhuma delas — a tradução vale 1 em 1', () => {
    for (const calib of CANDIDATAS) {
      const dia = somaComTeto(1, lanternaDaVisita('assistida', calib), chavesDe(calib));
      // a c2 soma a lanterna DEPOIS do teto: 1 + 0,05 (o ACES é o ombro)
      expect(dia, calib).toBeCloseTo(CALIBRACOES[calib].depois ? 1.05 : 1, 12);
    }
  });

  /**
   * O TERMINADOR — a resposta a Q10, e é ela que explica por que a c3
   * está na folha para PERDER. Baixar o `s` não devolve o crescente: no
   * vazamento (N·L = 0) a logística de s = 1,2 deixa passar 30 % contra
   * os 5 % de s = 3, e é isso que a foto vai mostrar como flanco lavado.
   */
  it('o `s` é botão de CONTRASTE, não de dose: baixá-lo ABRE o terminador', () => {
    const vazaEm = (s: number) => terminadorSuave(0, s);
    expect(vazaEm(S_DO_TERMINADOR)).toBeCloseTo(0.049787, 6);
    expect(vazaEm(CALIBRACOES.c3.s)).toBeCloseTo(0.3011942, 6);
    expect(vazaEm(CALIBRACOES.c3.s)).toBeGreaterThan(6 * vazaEm(S_DO_TERMINADOR));
    // e em N·L = 0,5 a família NUNCA desce abaixo de Lambert: o mínimo é
    // 0,657 (em s ≈ 1,76), ainda ×1,31 — não há `s` que devolva o flanco
    let minimo = Infinity;
    for (let s = 0.05; s <= 12; s += 0.005) minimo = Math.min(minimo, terminadorSuave(0.5, s));
    expect(minimo).toBeCloseTo(0.657, 3);
    expect(minimo / 0.5).toBeGreaterThan(1.3);
    // a c1 responde onde o `s` não responde: no N·L = 0,5 ela CEDE
    expect(daTelaParaLinear(terminadorSuave(0.5))).toBeLessThan(terminadorSuave(0.5));
  });

  /**
   * O VÉU NÃO SE MEXE (Q12). A opacidade é geometria — `mu` e a casca —,
   * então sai BIT A BIT igual nas quatro; e o que acende a palha segue a
   * MESMA tradução da superfície, para a razão véu/superfície do Eyes não
   * ser trocada por uma inventada aqui.
   */
  it('a opacidade do véu é bit a bit a mesma nas quatro candidatas', () => {
    for (const mu of [1, 0.6, 0.2, 0.05, 0]) {
      const base = opacidadeDoVeu(mu);
      for (const calib of CANDIDATAS) {
        const comChaves = doChunk('opacidadeDoVeu')([mu], { ...veuDe('saturn'), ...chavesDe(calib) });
        expect(Object.is(comChaves, base), `${calib} μ=${mu}`).toBe(true);
      }
    }
  });

  it('a palha do véu é acesa pela MESMA luz traduzida que a superfície', () => {
    const a = opacidadeDoVeu(0.05);
    const luzSol = terminadorSuave(0.5);
    const comVeu = (calib: CalibracaoDaLuz) =>
      doChunk('globoComVeu')([0, luzSol, 0, a], {
        uVeuCor: COR_DO_VEU[0]!, ...chavesDe(calib),
      });
    // com albedo 0 o que resta é SÓ o termo do véu
    expect(comVeu('padrao')).toBeCloseTo(a * COR_DO_VEU[0]! * luzSol, 12);
    expect(comVeu('c1')).toBeCloseTo(a * COR_DO_VEU[0]! * iec(luzSol), 12);
    // e é MENOS palha, não mais: o limbo não salta à frente do disco
    expect(comVeu('c1')).toBeLessThan(comVeu('padrao'));
  });
});
