// ============================================================
// Oráculo de `StellarParams` (Onda 3, fase 2).
//
// O que este arquivo guarda é UMA afirmação: a parametrização não mudou
// a instância 1. Cada campo de `SOL_PARAMS` é conferido contra o literal
// que estava solto dentro de `novoSol.ts` antes do `git mv` — os valores
// abaixo foram lidos do arquivo no commit 87d9b9b, não copiados da nova
// tabela (copiar da tabela testaria a tabela contra si mesma).
//
// O gate de verdade desta fase é o md5 do `ab-identidade`; isto aqui é o
// alarme BARATO, o que quebra em 200 ms em vez de 45 min de GPU — e o que
// diz POR QUE quebrou.
//
// Não instancia a classe: o construtor pede WebGLRenderer, câmera e
// `window.location.search`. O que se testa é o CONTRATO de parâmetros,
// que é puro.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RAIO_ARTISTICO_DO_SOL_PC, RAIO_DO_SOL_NA_CENA, RAIO_SOL_PC } from '../escala';
import {
  RADIANCIA_DA_FOTOSFERA,
  comprimir,
  lerPortaFotosfera,
  radianciaDeTela,
} from '../luzDaCasa';
import {
  SOL_PARAMS,
  SOL_ROT_PERIOD_DAYS,
  StellarBody,
  cirurgiaDaFotosfera,
  epsilonDeSegmentoGlsl,
  literalGlsl,
  rotSpeedFromPeriod,
} from './stellarBody';

describe('SOL_PARAMS — a instância 1 reproduz os literais de antes', () => {
  it('raio: é o FÍSICO, pela fonte única do cadastro (F3)', () => {
    // até 2026-08-13 esta linha cobrava `WORLD.sunRadius` = 0,011 pc, o
    // raio artístico. A F3 trocou o raio de vez; o que o teste guarda é
    // que ele continua vindo de UM símbolo — e que esse símbolo é o
    // MESMO que o cadastro de escala divide por `RAIO_SOL_PC` para
    // acusar quem infla. Digitar 2,2567e-8 aqui deixaria o cadastro
    // cego para uma futura inflação.
    expect(SOL_PARAMS.radiusPc).toBe(RAIO_DO_SOL_NA_CENA);
    expect(SOL_PARAMS.radiusPc).toBe(RAIO_SOL_PC);
    expect(SOL_PARAMS.radiusPc / 0.011).toBeCloseTo(2.0515e-6, 10);
    // e a escala do group acompanha: raio / 2,2 (DONOR_RADIUS)
    expect(SOL_PARAMS.radiusPc / 2.2).toBe(RAIO_SOL_PC / 2.2);
  });

  it('rotação: o período devolve EXATAMENTE o 0,042 do doador', () => {
    // não `toBeCloseTo` — a igualdade tem de ser de bit. Um ULP aqui
    // seria regressão de md5 assim que o relógio voltasse a andar.
    expect(rotSpeedFromPeriod(SOL_PARAMS.rotPeriodDays)).toBe(0.042);
    expect(SOL_PARAMS.rotPeriodDays).toBe(SOL_ROT_PERIOD_DAYS);
    expect(SOL_ROT_PERIOD_DAYS).toBe(25.38);
  });

  it('rotação: a âncora é a RELAÇÃO — meio período gira o dobro', () => {
    expect(rotSpeedFromPeriod(SOL_ROT_PERIOD_DAYS / 2)).toBeCloseTo(0.084, 12);
    expect(rotSpeedFromPeriod(SOL_ROT_PERIOD_DAYS * 4)).toBeCloseTo(0.0105, 12);
  });

  it('rotação: período inválido não gira (0), nunca NaN', () => {
    expect(rotSpeedFromPeriod(0)).toBe(0);
    expect(rotSpeedFromPeriod(-1)).toBe(0);
    expect(rotSpeedFromPeriod(NaN)).toBe(0);
    expect(rotSpeedFromPeriod(Infinity)).toBe(0);
  });

  it('inclinação, sementes e janelas do ciclo batem os literais antigos', () => {
    expect(SOL_PARAMS.tiltRad).toBe(0.1265); // ~7,25°
    expect(SOL_PARAMS.seed).toBe(20260803);
    expect(SOL_PARAMS.cyclePhaseMin).toBe(0.02);
    expect(SOL_PARAMS.cyclePhaseMax).toBe(0.5);
    expect(SOL_PARAMS.dramaT0).toBe(5);
    expect(SOL_PARAMS.dramaT1).toBe(29);
    expect(SOL_PARAMS.knobPrefix).toBe('sol');
    // a fase inicial do ciclo é derivada da fase mínima: 1206 s
    expect((1 + SOL_PARAMS.cyclePhaseMin - 0.35) * 1800).toBe(1206);
  });

  it('os 3 streams derivados da semente-mãe continuam nos mesmos XOR', () => {
    expect(SOL_PARAMS.seed ^ 0x59075eed).toBe(20260803 ^ 0x59075eed);
    expect(SOL_PARAMS.seed ^ 0x5eedc0de).toBe(20260803 ^ 0x5eedc0de);
    expect(SOL_PARAMS.seed ^ 0x00c0e5ed).toBe(20260803 ^ 0x00c0e5ed);
  });

  it('os 14 knobs são a tabela do doador, valor por valor', () => {
    expect(SOL_PARAMS.knobs).toEqual({
      spots: 1, cycle: 1, lapse: 0, speed: 1, pmode: 0,
      plageglow: 0.35, halo: 0.55, ray: 0.9, cact: 0.5,
      // cme 1,4 e não os 0,9 do doador: recalibrado contra o nosso ACES
      loops: 0.55, fprom: 0.55, cvol: 0.5, cme: 1.4, edu: 0,
    });
  });

  it('activityLevel = 1 é NEUTRO por multiplicação, bit a bit', () => {
    // o construtor faz `kn.spots *= activityLevel` ANTES do override de
    // URL; com 1 o produto é o mesmo bit, e é por isso que a promoção
    // não move um pixel
    expect(SOL_PARAMS.activityLevel).toBe(1);
    expect(SOL_PARAMS.knobs.spots * SOL_PARAMS.activityLevel).toBe(1);
    expect(SOL_PARAMS.knobs.cycle * SOL_PARAMS.activityLevel).toBe(1);
    // e o parâmetro é VIVO: metade da atividade, metade dos dois knobs
    expect(SOL_PARAMS.knobs.spots * 0.5).toBe(0.5);
  });

  it('teffK e convective nascem RESERVADOS: declarados, sem consumidor', () => {
    expect(SOL_PARAMS.teffK).toBe(5772);
    expect(SOL_PARAMS.convective).toBe(true);
    // a prova de que são reservados: o módulo não os lê em lugar nenhum
    // além da própria tabela (a lei de cor por classe é da Onda 7, e o
    // núcleo do doador não tem caminho radiativo)
    const src = readFileSync(new URL('./stellarBody.ts', import.meta.url), 'utf8');
    expect(src.match(/params\.teffK|p\.teffK/g)).toBeNull();
    expect(src.match(/params\.convective|p\.convective/g)).toBeNull();
  });
});

describe('o que NÃO foi promovido está declarado, não escondido', () => {
  const src = readFileSync(new URL('./stellarBody.ts', import.meta.url), 'utf8');

  it('o 2.2 do doador segue duplicado em sol/sun.js — e o texto diz isso', () => {
    // D5: os 14 vendorizados ficam intocados, então o raio interno do
    // doador continua sendo DOIS literais que precisam concordar à mão.
    // Se alguém "consertar" um dos lados sem o outro, quebra em silêncio;
    // este teste garante ao menos que o aviso continua no lugar.
    const sunJs = readFileSync(new URL('./sol/sun.js', import.meta.url), 'utf8');
    expect(sunJs).toContain('var SUN_RADIUS = 2.2;');
    expect(src).toContain('const DONOR_RADIUS = 2.2;');
    expect(src).toContain('sol/sun.js:13');
  });

  it('a paleta H-alfa e a captura de câmera do CME estão nomeadas', () => {
    expect(src).toContain('PALETA H-alfa');
    expect(src).toContain('sol/cme.js:10');
  });
});

// ============================================================
// AS DUAS PONTES DE ESCALA PARA O GLSL (F1 da onda do Sol real).
//
// Este bloco é o TESTE-AGULHA das duas quebras SILENCIOSAS — as que não
// dão erro de compilação, não escrevem no console e só se manifestam
// como ausência na tela. Sem ele, trocar o raio do Sol apaga a coroa e a
// ejeção de massa e ninguém fica sabendo.
//
// A varredura textual dos dois arquivos vendorizados existe pelo mesmo
// motivo do resto da casa: se alguém "limpar" o `||` lá dentro e voltar
// ao `.toFixed(6)` cru, isto reprova ANTES de a GPU calar.
// ============================================================
describe('F1 — as pontes de escala para o texto do shader', () => {
  const RAIO_SOL_FISICO_PC = 2.2566840209436597e-8;

  describe('literalGlsl', () => {
    it('AGULHA: o raio físico NÃO pode virar "0.000000"', () => {
      // a quebra, escrita: é isto que o caminho herdado faz
      expect((RAIO_SOL_FISICO_PC).toFixed(6)).toBe('0.000000');
      // e é isto que a ponte impede
      const literal = literalGlsl(RAIO_SOL_FISICO_PC);
      expect(literal).not.toBe('0.000000');
      expect(Number(literal)).toBeGreaterThan(0);
    });

    it('AGULHA: o literal volta ao MESMO float32 — senão o raio mente', () => {
      expect(Math.fround(Number(literalGlsl(RAIO_SOL_FISICO_PC)))).toBe(
        Math.fround(RAIO_SOL_FISICO_PC)
      );
    });

    it('o literal é float de GLSL válido (ponto decimal E expoente)', () => {
      expect(literalGlsl(RAIO_SOL_FISICO_PC)).toMatch(/^\d\.\d+e[-+]?\d+$/);
    });

    it('o raio ARTÍSTICO devolvia a string de sempre, byte a byte', () => {
      // foi por causa desta linha que a porta da F1 pôde entrar sem
      // custar um pixel: com o raio de então, a forma fixa de 6 casas
      // voltava ao mesmo float32. O caso fica como registro — o raio
      // saiu de cena, a regra do formatador não.
      expect(literalGlsl(RAIO_ARTISTICO_DO_SOL_PC)).toBe(RAIO_ARTISTICO_DO_SOL_PC.toFixed(6));
      expect(literalGlsl(RAIO_ARTISTICO_DO_SOL_PC)).toBe('0.011000');
    });

    it('nem infinito, nem NaN, nem zero no denominador do cme', () => {
      // `1.0/SUN_R` (cme.js) com SUN_R = 0 é o segundo estrago
      expect(1 / Number(literalGlsl(RAIO_SOL_FISICO_PC))).toBeLessThan(Infinity);
    });
  });

  describe('epsilonDeSegmentoGlsl', () => {
    it('O RAMO LITERAL MORREU NA F3, como o comentário dele prometia', () => {
      // "quando a F3 tirar o raio artístico de cena, este ramo morre
      // junto com ele" — e morreu. Sobra a lei proporcional, e ela
      // devolve para o raio artístico um texto que vale o MESMO float32
      // que o `1e-4` de sempre: a lei generalizou o caso, não o trocou.
      const fonte = readFileSync(new URL('./stellarBody.ts', import.meta.url), 'utf8');
      expect(fonte).not.toContain("return '1e-4';");
      expect(Math.fround(Number(epsilonDeSegmentoGlsl(RAIO_ARTISTICO_DO_SOL_PC)))).toBe(
        Math.fround(1e-4)
      );
    });

    it('AGULHA: no raio físico o limiar cai proporcional, não fica em 1e-4', () => {
      // a travessia do volume de coroa no raio real mede ~1,3e-7 pc;
      // com o limiar herdado (1e-4) TODO raio desiste antes do 1º passo
      const eps = Number(epsilonDeSegmentoGlsl(RAIO_SOL_FISICO_PC));
      const travessiaPc = RAIO_SOL_FISICO_PC * 2 * 2.9; // ~2,9 R de CVOL_ROUT
      expect(1e-4).toBeGreaterThan(travessiaPc); // a quebra, escrita
      expect(eps).toBeLessThan(travessiaPc); // e a ponte
      expect(eps).toBeGreaterThan(0);
    });

    it('a proporção com o raio é a herdada, não um número novo', () => {
      // EM FLOAT32, que é onde o literal vai viver. O texto carrega 9
      // casas decimais e não volta em double bit a bit (erra por ~6e-13,
      // mil vezes abaixo de um ULP de float32 nessa faixa) — cobrar
      // igualdade de double aqui seria exigir uma precisão que a GPU nem
      // tem, e reprovaria a ponte certa. A primeira versão deste teste
      // cobrava double e reprovou; o defeito era da régua, não da ponte.
      const eps = Number(epsilonDeSegmentoGlsl(RAIO_SOL_FISICO_PC));
      expect(Math.fround(eps / RAIO_SOL_FISICO_PC)).toBe(
        Math.fround(1e-4 / RAIO_ARTISTICO_DO_SOL_PC)
      );
    });
  });

  describe('os dois arquivos vendorizados consomem as pontes', () => {
    const ler = (f: string) =>
      readFileSync(new URL(`./sol/${f}`, import.meta.url), 'utf8');

    for (const arquivo of ['coronaVolume.js', 'cme.js']) {
      it(`${arquivo} lê ctx.SUN_R_GLSL antes do toFixed herdado`, () => {
        expect(ler(arquivo)).toContain('ctx.SUN_R_GLSL ||');
      });

      it(`${arquivo} lê ctx.SEG_EPS_GLSL no guarda de segmento`, () => {
        expect(ler(arquivo)).toContain("ctx.SEG_EPS_GLSL || '1e-4'");
      });

      it(`${arquivo} NÃO tem mais o 1e-4 absoluto solto no guarda`, () => {
        // a regressão exata que se quer impedir: alguém "limpa" o `||`
        expect(ler(arquivo)).not.toContain('if (t1 <= t0 + 1e-4)');
      });
    }
  });
});

// ============================================================
// F2 — A CIRURGIA DA FOTOSFERA (onda da luz).
//
// A malha emite ~1 e o ponto deposita ~2,7e10 para a mesma superfície.
// A F2 põe a malha na unidade da casa reescrevendo o texto do fragment
// do vendorizado NO PONTO DE USO — sem abrir `sol/sun.js`, que este
// arquivo pina linha por linha logo acima.
//
// Uma cirurgia de texto tem UM modo de falhar que não dá erro: a âncora
// muda de forma no vendorizado e a operação vira no-op silencioso (ou,
// pior, acha meio texto e escreve GLSL inválido). Por isso os testes
// abaixo leem o arquivo REAL: o alarme toca no `npm test`, em 200 ms,
// e não numa captura de GPU meia hora depois.
// ============================================================
describe('F2 — a fotosfera na unidade, por cirurgia de texto', () => {
  const sunJs = readFileSync(new URL('./sol/sun.js', import.meta.url), 'utf8');
  const ALVO = 'gl_FragColor = vec4(color * uWorldFade, 1.0);';
  /** o fator REAL da instância 1, pela PONTE DE UNIDADES — a mesma escrita
   *  que `stellarBody.ts` usa no material e que o invariante da troca cobra
   *  em `luzDaCasa.test.ts`. Se a lei tiver duas escritas, é aqui que se vê. */
  const FATOR = radianciaDeTela(RADIANCIA_DA_FOTOSFERA, RAIO_SOL_PC);

  /** um fragment de mentira com a MESMA última linha do de verdade */
  const fragmentFalso = ['vec3 color = vec3(1.0);', `  ${ALVO}`, '}'].join('\n');

  it('AGULHA: a âncora existe no vendorizado REAL, e uma só vez', () => {
    // se `sol/sun.js` reescrever esta linha, a F2 perde o ponto de
    // entrada — e é AQUI que se descobre, não na tela
    expect(sunJs).toContain(ALVO);
    expect(sunJs.match(/gl_FragColor = vec4\(color \* uWorldFade, 1\.0\);/g)).toHaveLength(1);
    // e o alvo é o mesmo texto que a cirurgia procura (o arquivo de
    // produção não expõe a constante; a igualdade se prova por uso)
    expect(() => cirurgiaDaFotosfera(sunJs, FATOR, 300)).not.toThrow();
  });

  it('a cirurgia injeta a curva, o fator e o FILTRO — cada um UMA vez', () => {
    const novo = cirurgiaDaFotosfera(fragmentFalso, FATOR, 300);
    // o fator entra como EXPOENTE do filtro: g = 1 devolve o fator
    // inteiro (radiância verdadeira), g = 0 devolve 1 (a paleta autorada)
    expect(novo).toContain(`comprimir3(color * pow(${literalGlsl(FATOR)}, uFiltroSolar)`);
    expect(novo).toContain('* uWorldFade, 1.0);');
    // e o uniform é DECLARADO junto, uma vez só — sem a declaração o
    // fragment nem compila, e com duas também não
    expect(novo.match(/uniform float uFiltroSolar;/g)).toHaveLength(1);
    // a definição da curva vem do endereço único (`shaders/common.ts`) e
    // entra uma vez só: duas definições de `asinh3` não compilam
    expect(novo.match(/vec3 asinh3\(vec3 v\)/g)).toHaveLength(1);
    expect(novo.match(/vec3 comprimir3\(vec3 x, float b\)/g)).toHaveLength(1);
    // e a linha antiga não sobrou junto com a nova
    expect(novo).not.toContain(ALVO);
  });

  it('as duas pontas do filtro, no espelho em CPU: verdadeira ↔ autorada', () => {
    // g = 1: o expoente devolve o fator INTEIRO — é a F2 crua, bit a bit
    expect(Math.pow(FATOR, 1)).toBe(FATOR);
    // g = 0: `pow(x, 0)` é 1 EXATO, e a emissão volta a ser a cor da
    // paleta H-alfa (o override declarado da Lei §E3). O que sobra da
    // cirurgia é `comprimir3(color, β)` — e nessa faixa a curva é
    // identidade a menos de um centésimo de milésimo: a superfície
    // autorada volta INTACTA, não "parecida"
    expect(Math.pow(FATOR, 0)).toBe(1);
    for (const cor of [0.5, 1, 1.7, 2.4]) {
      expect(comprimir(cor * Math.pow(FATOR, 0), 300)).toBeCloseTo(cor, 4);
      expect(Math.abs(1 - comprimir(cor, 300) / cor)).toBeLessThan(1e-4);
    }
    // e o MEIO da rampa é o meio em STOPS (raiz do fator), não o meio
    // aritmético — é toda a diferença entre `pow` e um `mix` linear:
    // o `mix` no meio ainda estaria a menos de uma magnitude do topo
    expect(Math.pow(FATOR, 0.5)).toBeCloseTo(Math.sqrt(FATOR), 0);
    expect(2.5 * Math.log10(FATOR / Math.pow(FATOR, 0.5))).toBeCloseTo(13.0, 1);
    expect(2.5 * Math.log10(FATOR / (1 + 0.5 * (FATOR - 1)))).toBeLessThan(1);
  });

  it('o fator é ~2,7e10 e vira literal float VÁLIDO de GLSL', () => {
    // o número não se digita em lugar nenhum: sai da mesma função que
    // `escala.ts` usa para declarar a dívida em `fatorDeBrilho`
    expect(FATOR).toBeGreaterThan(2e10);
    expect(FATOR).toBeLessThan(4e10);
    // ponto decimal (com ou sem expoente) — um inteiro cru seria `int`
    // em GLSL e a multiplicação por `vec3` nem compilaria
    expect(literalGlsl(FATOR)).toMatch(/^\d+\.\d+(e[-+]?\d+)?$/);
    expect(Math.fround(Number(literalGlsl(FATOR)))).toBe(Math.fround(FATOR));
  });

  it('ÂNCORA AUSENTE LANÇA — nunca no-op silencioso', () => {
    expect(() => cirurgiaDaFotosfera('void main() { }', FATOR, 300)).toThrow(
      /cirurgiaDaFotosfera/
    );
    // e a mensagem diz ONDE procurar, que é o que separa um erro de um susto
    expect(() => cirurgiaDaFotosfera('void main() { }', FATOR, 300)).toThrow(/sol\/sun\.js/);
  });

  it('DUAS VEZES REPROVA — aplicar o fator ao quadrado tem de doer', () => {
    // depois da cirurgia a âncora não existe mais, então a segunda
    // passada cai no mesmo erro alto. É a resposta certa: engolir a
    // segunda chamada em silêncio elevaria a emissão ao quadrado
    const uma = cirurgiaDaFotosfera(fragmentFalso, FATOR, 300);
    expect(() => cirurgiaDaFotosfera(uma, FATOR, 300)).toThrow(/cirurgiaDaFotosfera/);
  });

  it('O CAMINHO DE VOLTA: com `?bfoto=0` (ou `?bemis=0`) o material não é tocado', () => {
    // a porta virou PADRÃO em 15/08 — ausente é a radiância verdadeira — e
    // `?bfoto=0` é o lado A do A/B, o único que devolve o vendorizado intacto
    expect(lerPortaFotosfera('')).toBe(true);
    expect(lerPortaFotosfera('?bfoto=0')).toBe(false);

    const src = readFileSync(new URL('./stellarBody.ts', import.meta.url), 'utf8');
    // e a chamada é guardada pelas duas condições, na mesma linha: com
    // `?bemis=0` a curva é identidade, e identidade sobre 2,7e10 é o
    // buffer half-float saturado — a fotosfera "honesta" entregando o quadro
    // branco que a onda existe para consertar. Quem pede a volta do joelho
    // leva junto a volta da paleta autorada.
    expect(src).toContain('if (lerPortaFotosfera(window.location.search) && BETA_DA_EMISSAO > 0)');
    // a cirurgia é CHAMADA uma vez só no arquivo (a outra ocorrência do
    // nome é a definição), e a chamada é a que escreve no material
    expect(src.match(/= cirurgiaDaFotosfera\(/g)).toHaveLength(1);
    expect(src).toContain('mat.fragmentShader = cirurgiaDaFotosfera(');
    // e o β é o DOS PONTOS, importado, não uma segunda leitura da URL
    expect(src).toContain("import { BETA_DA_EMISSAO } from '../shaders/starShaders';");
    expect(src).not.toMatch(/get\(\s*'bemis'\s*\)/);
    // o uniform do filtro nasce DENTRO do mesmo ramo das duas portas, no
    // objeto de uniforms do material (o que `sun.js` deu ao
    // ShaderMaterial) — e com a porta fechada ele nem existe, que é o que
    // faz `escreverFiltroSolar` ser no-op no produto
    expect(src).toContain('ctx.sunUniforms.uFiltroSolar = { value: 1 };');
    expect(src).toContain('this.filtroSolarLigado = true;');
  });
});

// ============================================================
// F2 — O FILTRO SOLAR DECLARADO (a segunda metade da onda).
//
// O construtor de `StellarBody` pede WebGLRenderer e 14 subsistemas de
// GPU; `escreverFiltroSolar`, não — ele só mexe em três campos de
// estado. Então o teste chama o MÉTODO REAL sobre um `this` de mentira
// com esses três campos. Não é um clone da lógica (que provaria a si
// mesmo): é a função de produção, com o mesmo corpo que roda 60×/s.
// ============================================================
describe('F2 — o filtro solar: clamp, cache e no-op de porta fechada', () => {
  /** o mínimo de `this` que o método toca */
  const fingir = (ligado: boolean) => ({
    filtroSolarLigado: ligado,
    filtroSolarAnterior: 1,
    ctx: { sunUniforms: { uFiltroSolar: { value: 1 } } },
  });
  type Falso = ReturnType<typeof fingir>;
  const escrever = (alvo: Falso, g: number) =>
    (StellarBody.prototype.escreverFiltroSolar as (this: unknown, g: number) => void).call(alvo, g);

  it('escreve o g no uniform, e CLAMPA nas duas pontas', () => {
    const s = fingir(true);
    escrever(s, 0.25);
    expect(s.ctx.sunUniforms.uFiltroSolar.value).toBe(0.25);
    escrever(s, -7);
    expect(s.ctx.sunUniforms.uFiltroSolar.value).toBe(0);
    escrever(s, 42);
    expect(s.ctx.sunUniforms.uFiltroSolar.value).toBe(1);
    // e as pontas são EXATAS: 0 é `pow(fator, 0) = 1`, a paleta autorada
    // intacta, e 1 é o fator inteiro. Um 0,999 na ponta deixaria a
    // superfície 1,06× brilhante "quase" no lugar certo
    escrever(s, 0);
    expect(s.ctx.sunUniforms.uFiltroSolar.value).toBe(0);
  });

  it('CACHEIA: valor repetido não volta a escrever no uniform', () => {
    // o precedente é o `uGain` de `planetas.ts` — o g fica parado em 1 na
    // viagem inteira e só acorda no fim da aproximação
    const s = fingir(true);
    escrever(s, 0.4);
    s.ctx.sunUniforms.uFiltroSolar = { value: 999 }; // sentinela
    escrever(s, 0.4);
    expect(s.ctx.sunUniforms.uFiltroSolar.value).toBe(999);
    escrever(s, 0.4000001);
    expect(s.ctx.sunUniforms.uFiltroSolar.value).toBe(0.4000001);
  });

  it('PORTA FECHADA é no-op SILENCIOSO — o director chama sempre', () => {
    // sem `?bfoto=1` a cirurgia não rodou e o uniform não existe no
    // material; lançar aqui transformaria o caso de PRODUÇÃO em erro por
    // quadro. A prova é dupla: nada muda e nada estoura, mesmo sem o
    // uniform no objeto
    const s = fingir(false);
    expect(() => escrever(s, 0)).not.toThrow();
    expect(s.ctx.sunUniforms.uFiltroSolar.value).toBe(1);
    const semUniforme = { ...fingir(false), ctx: { sunUniforms: {} } };
    expect(() => escrever(semUniforme as unknown as Falso, 0.3)).not.toThrow();
  });

  it('valor ENVENENADO não é escrito — NaN pintaria o disco de lixo', () => {
    const s = fingir(true);
    escrever(s, 0.6);
    escrever(s, Number.NaN);
    expect(s.ctx.sunUniforms.uFiltroSolar.value).toBe(0.6);
    escrever(s, Number.POSITIVE_INFINITY);
    expect(s.ctx.sunUniforms.uFiltroSolar.value).toBe(0.6);
  });
});
