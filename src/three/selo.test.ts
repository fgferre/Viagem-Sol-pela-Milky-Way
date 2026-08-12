// ============================================================
// O SELO SÓ VALE SE NÃO PUDER ENVELHECER CALADO. São dois testes-tranca
// (D1) e o resto é comportamento:
//
//  1. COMPLETUDE — varre os arquivos que governam a imagem procurando
//     porta de URL lida por literal, e cobra entrada no registro para
//     cada uma. Porta nova sem entrada quebra aqui, e é por isso que a
//     gradação por contexto da F6 não tem como nascer calada.
//     A varredura é TEXTUAL (pega até menção em comentário): ela só
//     pode exigir declaração a mais, nunca a menos.
//
//  2. NENHUM CONTROLE DESMENTE O SELO — para CADA controle que a UI
//     oferece (as camadas dos dois hospedeiros, as curvas de tom, a
//     exposição, o tier), usar o controle tem de virar desvio declarado.
//     Um controle que muda a imagem sem mover o selo é exatamente a
//     mentira que o doador cometeu.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAMADAS, CAMADAS_DO_ATLAS } from './atlasConfig';
import {
  ARQUIVOS_GOVERNADOS,
  BRILHO_ASSISTIDO,
  BRILHO_REAL,
  ESCALA_REAL,
  FORA_DE_ESCALA,
  PROCEDENCIA,
  REGISTRO,
  aoVoltarAoReal,
  escalaDaVista,
  estadoDoSelo,
} from './selo';
import type { EstadoDaVista } from './selo';
import { DEEP_LIMIAR_PC } from './world/lodStellar';
import { PISO_DO_CLARAO, REFERENCIA_UA, claraoDoAtlas } from './atlasConfig';
import { AU_PARA_PC } from '../lib/atlas/frameGalactico';
import { TONE_MAPPINGS } from './core/engine';
import type { ToneMapMode } from './core/engine';

/** o estado de uma vista limpa: nada tocado, nada na URL */
const LIMPA: EstadoDaVista = {
  distanciaPc: 0.0007, // ~150 UA: o enquadramento de abertura do Atlas
  portas: [],
  exposicaoManual: false,
  tom: 'aces',
  camadasEscondidas: [],
  tier: 'cinema',
  // 1 = o clarão do filme: a vista limpa é a do filme, sem gradação
  gradacao: 1,
};

const com = (mudanca: Partial<EstadoDaVista>): EstadoDaVista => ({ ...LIMPA, ...mudanca });

/**
 * A varredura: toda leitura de parâmetro de URL por literal nos
 * arquivos governados. Os receptores possíveis estão listados porque
 * são os que a casa usa (`debug`, `query`, `q`, `hide`, `params`,
 * `dbg`) mais a construção direta do URLSearchParams.
 */
const PADRAO_DE_PORTA =
  /(?:URLSearchParams\([^)]*\)|\b(?:debug|query|q|hide|dbg|params)\b)\s*\.\s*(?:has|get)\(\s*'([a-zA-Z0-9_]+)'\s*\)/g;

function portasLidas(): Map<string, string[]> {
  const achado = new Map<string, string[]>();
  for (const arquivo of ARQUIVOS_GOVERNADOS) {
    const fonte = readFileSync(new URL(`./../${arquivo}`, import.meta.url), 'utf8');
    for (const m of fonte.matchAll(PADRAO_DE_PORTA)) {
      const lista = achado.get(m[1]) ?? [];
      if (!lista.includes(arquivo)) lista.push(arquivo);
      achado.set(m[1], lista);
    }
  }
  return achado;
}

const CHAVES = new Set(REGISTRO.map((c) => c.chave));

describe('1. completude do registro', () => {
  it('a varredura acha portas de verdade — um padrão quebrado passaria calado', () => {
    const portas = portasLidas();
    // se este número despencar, é o REGEX que quebrou, não o código
    expect(portas.size).toBeGreaterThan(30);
    for (const obrigatoria of ['exp', 'tone', 'knee', 'nobloom', 'q', 'shot']) {
      expect(portas.has(obrigatoria), `a varredura perdeu ?${obrigatoria}=`).toBe(true);
    }
  });

  it('toda porta lida nos arquivos governados tem entrada no registro', () => {
    const semEntrada = [...portasLidas()]
      .filter(([chave]) => !CHAVES.has(chave))
      .map(([chave, onde]) => `?${chave}= (${onde.join(', ')})`);
    expect(semEntrada, 'porta sem entrada em selo.ts').toEqual([]);
  });

  it('toda camada oferecida na UI tem entrada no registro', () => {
    for (const c of [...CAMADAS, ...CAMADAS_DO_ATLAS]) {
      expect(CHAVES.has(c.flag), `camada ${c.flag} fora do registro`).toBe(true);
    }
  });

  it('não há entrada MORTA: toda chave do registro é citada em arquivo governado', () => {
    const fontes = ARQUIVOS_GOVERNADOS.map((a) =>
      readFileSync(new URL(`./../${a}`, import.meta.url), 'utf8')
    ).join('\n');
    for (const c of REGISTRO) {
      expect(fontes.includes(`'${c.chave}'`), `${c.chave} não é citada em lugar nenhum`).toBe(
        true
      );
    }
  });

  it('não há chave repetida — duas entradas para a mesma porta são dois vereditos', () => {
    expect(CHAVES.size).toBe(REGISTRO.length);
  });

  it('todo caminho de brilho tem rótulo em pt-BR e uma volta declarada', () => {
    for (const c of REGISTRO) {
      expect(c.rotulo.length).toBeGreaterThan(3);
      expect(['vivo', 'recarregar', 'nenhuma']).toContain(c.volta);
      // rótulo é copy de UI: nada de inglês
      expect(/\b(the|layer|off|on|hidden|brightness)\b/i.test(c.rotulo)).toBe(false);
    }
  });
});

describe('2. nenhum controle desmente o selo', () => {
  it('a vista limpa é REAL nos dois eixos — um selo que nunca diz real não serve', () => {
    const v = estadoDoSelo(LIMPA);
    expect(v.brilho).toBe('real');
    expect(v.escala).toBe('real');
    expect(v.desvios).toEqual([]);
  });

  it('desligar QUALQUER camada dos dois hospedeiros vira desvio declarado', () => {
    for (const c of [...CAMADAS, ...CAMADAS_DO_ATLAS]) {
      const v = estadoDoSelo(com({ camadasEscondidas: [c.flag] }));
      expect(v.brilho, `${c.flag} não moveu o selo`).toBe('assistido');
      expect(v.desvios.map((d) => d.chave)).toContain(c.flag);
      // e o rótulo NOMEIA a camada — "algo está desligado" não serve
      expect(v.desvios[0].rotulo).toContain(c.nome);
    }
  });

  it('QUALQUER curva de tom fora do padrão vira desvio', () => {
    for (const tom of Object.keys(TONE_MAPPINGS) as ToneMapMode[]) {
      const v = estadoDoSelo(com({ tom }));
      expect(v.brilho, `tom ${tom}`).toBe(tom === 'aces' ? 'real' : 'assistido');
    }
  });

  it('exposição à mão e tier abaixo de cinema viram desvio', () => {
    expect(estadoDoSelo(com({ exposicaoManual: true })).brilho).toBe('assistido');
    expect(estadoDoSelo(com({ tier: 'alta' })).brilho).toBe('assistido');
    expect(estadoDoSelo(com({ tier: 'performance' })).brilho).toBe('assistido');
  });

  it('porta NÃO declarada na URL também vira desvio — o selo não promete o que não conhece', () => {
    const v = estadoDoSelo(com({ portas: ['chromsat'] }));
    expect(v.brilho).toBe('assistido');
    expect(v.desvios[0].rotulo).toContain('chromsat');
  });

  it('as portas declaradas como neutras NÃO movem o selo', () => {
    const neutras = [
      't', 'play', 'freeze', 'atlas', 'pos', 'look', 'shot', 'ajustes', 'loader', 'jd',
      'foco',
    ];
    expect(estadoDoSelo(com({ portas: neutras })).brilho).toBe('real');
  });

  it('o TEMPO não é desvio de brilho — e a decisão está escrita no registro', () => {
    // A máquina do tempo MUDA a imagem e mesmo assim não move o eixo
    // BRILHO: efeméride é dado medido, do mesmo tier do catálogo. Quem
    // quiser inverter esta decisão quebra aqui e vai ler o porquê em
    // `selo.ts` antes de inverter — que é o ponto de escrevê-la.
    const jd = REGISTRO.find((c) => c.chave === 'jd');
    expect(jd, '?jd= sem entrada no registro').toBeDefined();
    expect(jd!.eixo).toBe('nenhum');
    expect(jd!.desvia(com({ portas: ['jd'] }))).toBe(false);
    expect(estadoDoSelo(com({ portas: ['jd'] })).brilho).toBe('real');
    // e o vocabulário: o tier "medido" já promete catálogo E efeméride
    expect(PROCEDENCIA.medido.oQue).toContain('efeméride');
  });

  it('as portas de luz movem o selo só por estarem na URL', () => {
    for (const chave of ['nobloom', 'knee', 'kneeamt', 'kneemode', 'fov', 'dom', 'forgetau']) {
      expect(estadoDoSelo(com({ portas: [chave] })).brilho, chave).toBe('assistido');
    }
  });
});

describe('2b. a gradação por contexto se declara (F6)', () => {
  it('o clarão moderado é desvio de BRILHO, nomeado e desfazível', () => {
    const v = estadoDoSelo(com({ gradacao: PISO_DO_CLARAO }));
    expect(v.brilho).toBe('assistido');
    const linha = v.desvios.find((d) => d.chave === 'grad');
    expect(linha, 'a gradação não moveu o selo').toBeDefined();
    expect(linha!.volta, 'sem volta viva a linha BRILHO não pode desfazê-la').toBe('vivo');
    expect(linha!.rotulo).toContain('clarão');
  });

  it('fator 1 é o clarão do filme e NÃO é desvio — é o que mantém as 18 vistas', () => {
    expect(estadoDoSelo(com({ gradacao: 1 })).brilho).toBe('real');
  });

  it('desligar a gradação volta ao real, e o clique é o caminho', () => {
    const comGradacao = com({ gradacao: PISO_DO_CLARAO });
    const limpo = aoVoltarAoReal(comGradacao);
    expect(limpo.gradacao).toBe(1);
    expect(estadoDoSelo(limpo).brilho).toBe('real');
  });

  it('a lei do clarão: 1 exato de 20.000 UA para fora, piso dentro do sistema', () => {
    const emUA = (ua: number) => claraoDoAtlas(ua * AU_PARA_PC);
    // fora: 1 EXATO (é o que faz o termo ser neutro em IEEE754)
    expect(emUA(REFERENCIA_UA)).toBe(1);
    expect(emUA(1e6)).toBe(1);
    expect(claraoDoAtlas(Number.NaN)).toBe(1);
    // dentro do sistema: o piso medido
    for (const ua of [2.2, 5.8, 30, 228, 1999]) {
      expect(emUA(ua), `${ua} UA`).toBe(PISO_DO_CLARAO);
    }
    // entre os dois: a lei do inverso do quadrado, monotônica
    expect(emUA(10000)).toBeCloseTo(0.25, 12);
    expect(emUA(4000)).toBeCloseTo(0.04, 12);
    let anterior = 0;
    for (let ua = 1; ua <= 40000; ua *= 1.05) {
      const f = emUA(ua);
      expect(f).toBeGreaterThanOrEqual(anterior);
      expect(f).toBeLessThanOrEqual(1);
      anterior = f;
    }
    // o piso e a lei se encontram em 2.000 UA — o limiar é DERIVADO, não
    // escolhido (o resíduo é a ida e volta pc↔UA em ponto flutuante)
    expect((2000 / REFERENCIA_UA) ** 2).toBeCloseTo(PISO_DO_CLARAO, 15);
    expect(emUA(2000)).toBeCloseTo(PISO_DO_CLARAO, 15);
  });
});

describe('3. clicar volta ao real', () => {
  it('desfazendo o que é desfazível, o selo volta a REAL', () => {
    const sujo = com({
      exposicaoManual: true,
      tom: 'agx',
      camadasEscondidas: ['noplan', 'nocat'],
      portas: ['exp', 'tone', 'noplan', 'nobloom', 'chromsat', 't', 'atlas'],
    });
    expect(estadoDoSelo(sujo).brilho).toBe('assistido');
    const limpo = aoVoltarAoReal(sujo);
    expect(estadoDoSelo(limpo).brilho).toBe('real');
    // o que NÃO era desvio fica na URL: voltar ao brilho real não pode
    // custar ao visitante o instante da viagem nem o modo
    expect(limpo.portas).toContain('t');
    expect(limpo.portas).toContain('atlas');
    expect(limpo.portas).not.toContain('chromsat');
  });

  it('o que não é desfazível fica declarado — sem fingir que o clique resolveu', () => {
    const so = com({ tier: 'performance' });
    const depois = aoVoltarAoReal(so);
    expect(estadoDoSelo(depois).brilho).toBe('assistido');
    expect(estadoDoSelo(depois).desvios.map((d) => d.chave)).toEqual(['q']);
  });
});

describe('4. o eixo ESCALA sai da geometria, não de porta', () => {
  it('o enquadramento de abertura (~150 UA) é ESCALA REAL', () => {
    expect(escalaDaVista(0.0007)).toBe('real');
  });

  it('acima do limiar do domínio profundo quem domina é o Sol-ator', () => {
    expect(escalaDaVista(DEEP_LIMIAR_PC)).toBe('fora');
    expect(escalaDaVista(1)).toBe('fora');
    expect(escalaDaVista(8000)).toBe('fora');
  });

  it('a troca acontece DENTRO da janela do crossfade, e uma vez só', () => {
    // o eixo não é um limiar novo: ele lê as duas rampas que a cena já
    // usa para trocar o disco artístico pelo ponto fotométrico
    let trocas = 0;
    let anterior = escalaDaVista(1e-6);
    expect(anterior).toBe('real');
    for (let i = 1; i <= 2000; i++) {
      const d = (i / 2000) * 0.1;
      const agora = escalaDaVista(d);
      if (agora !== anterior) {
        trocas++;
        expect(d).toBeGreaterThan(0.02);
        expect(d).toBeLessThan(DEEP_LIMIAR_PC);
      }
      anterior = agora;
    }
    expect(trocas).toBe(1);
  });

  it('distância envenenada declara o desvio em vez de prometer', () => {
    expect(escalaDaVista(Number.NaN)).toBe('fora');
  });
});

describe('5. a copy do selo', () => {
  it('é a de D1, verbatim', () => {
    expect(ESCALA_REAL).toBe('ESCALA REAL');
    expect(FORA_DE_ESCALA).toBe('FORA DE ESCALA');
    expect(BRILHO_REAL).toBe('BRILHO REAL');
    expect(BRILHO_ASSISTIDO).toBe('BRILHO ASSISTIDO');
  });

  it('os três tiers de procedência estão nomeados no vocabulário da legenda', () => {
    expect(Object.keys(PROCEDENCIA)).toEqual(['medido', 'derivado', 'artistico']);
    for (const t of Object.values(PROCEDENCIA)) {
      expect(t.rotulo.length).toBeGreaterThan(2);
      expect(t.oQue.length).toBeGreaterThan(10);
    }
  });
});
