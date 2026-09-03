// ============================================================
// A LÍNGUA DO VISITANTE — as guardas do item 130 (lista do §19).
//
// Quatro perguntas, e todas medem COMPORTAMENTO (§15), nunca texto de
// fonte:
//   (1) a ESCADA da escolha — storage > inglês, com pt-BR fora do
//       navegador. O padrão virou inglês em 03/09 e a língua do
//       navegador SAIU da escada; um teste que só olhasse a tabela
//       nunca veria essa mudança.
//   (2) as duas TABELAS com as mesmas chaves e os mesmos `{param}` —
//       o tipo já cobra a chave, mas não cobra o buraco: `en` que
//       esqueça o `{n}` sai na tela sem número, calado.
//   (3) a troca AO VIVO — `definirIdioma` muda a data, a distância, a
//       qualidade e o nome da camada SEM recarregar. É a promessa do
//       seletor do painel de Ajustes.
//   (5) a VARREDURA por sobra — literal acentuado de tela fora das
//       tabelas. Comentário e `console` não contam: não são tela.
//
// A suíte roda em `environment: node`, então `window` não existe e a
// preferência do visitante é `null` por padrão. Quem quer testar o
// storage o encena aqui, e o desfaz no fim.
// ============================================================
import { describe, expect, it, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  IDIOMAS,
  definirIdioma,
  idiomaAtual,
  iniciarIdioma,
  lerPreferenciaDeIdioma,
  normalizarIdioma,
  t,
  type Idioma,
} from './idioma';
import { PT } from './idioma/pt';
import { EN } from './idioma/en';
import { notaDeDistancia } from './unidades';
import { formatarInstante } from '../three/tempoDoAtlas';
import { CAMADAS, rotuloDaQualidade } from '../three/atlasConfig';

const RAIZ = resolve(__dirname, '../..');

/** O storage do navegador encenado — o boot só lê `getItem`. */
function comStorage(valor: string | null): void {
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: () => valor,
      setItem: () => {},
    },
  };
}

function semStorage(): void {
  delete (globalThis as { window?: unknown }).window;
}

afterEach(() => {
  semStorage();
  definirIdioma('pt-BR');
});

// ============================================================
// (1) idioma.escolha — A ESCADA
// ============================================================
describe('idioma.escolha', () => {
  it('sem navegador nenhum, a casa fica em pt-BR e ninguém a resolve', () => {
    // é o caso da suíte inteira e dos scripts de dado: `iniciarIdioma`
    // não é chamado, e toda função de texto sai como sempre saiu
    expect(idiomaAtual()).toBe('pt-BR');
    expect(t('hud.nome')).toBe(PT['hud.nome']);
  });

  it('sem preferência guardada, o padrão é INGLÊS (ordem dele, 03/09)', () => {
    comStorage(null);
    expect(iniciarIdioma('')).toBe('en');
    expect(idiomaAtual()).toBe('en');
  });

  it('a preferência guardada VENCE o padrão', () => {
    comStorage('pt-BR');
    expect(iniciarIdioma('')).toBe('pt-BR');
    comStorage('en');
    expect(iniciarIdioma('')).toBe('en');
  });

  it('a LÍNGUA DO NAVEGADOR não entra mais na escada', () => {
    // antes de 03/09 um navegador em pt-* abria o app em português sem
    // preferência nenhuma; hoje não abre — quem quer pt-BR escolhe
    comStorage(null);
    vi.stubGlobal('navigator', { languages: ['pt-BR', 'pt'], language: 'pt-BR' });
    expect(iniciarIdioma('')).toBe('en');
    vi.unstubAllGlobals();
  });

  it('`?lang=` é instrumento e VENCE tudo, sem gravar nada', () => {
    comStorage('pt-BR');
    expect(iniciarIdioma('?lang=en')).toBe('en');
    // o storage não foi tocado: a próxima carga sem a porta volta ao pt
    expect(lerPreferenciaDeIdioma()).toBe('pt-BR');
    expect(iniciarIdioma('')).toBe('pt-BR');
  });

  it('rótulo desconhecido não vira língua', () => {
    expect(normalizarIdioma('ja')).toBeNull();
    expect(normalizarIdioma('')).toBeNull();
    expect(normalizarIdioma(null)).toBeNull();
    expect(normalizarIdioma('PT-br')).toBe('pt-BR');
    expect(normalizarIdioma('en-GB')).toBe('en');
    comStorage('klingon');
    expect(iniciarIdioma('')).toBe('en');
  });

  it('storage bloqueado não trava o boot', () => {
    (globalThis as { window?: unknown }).window = {
      get localStorage(): never {
        throw new Error('bloqueado');
      },
    };
    expect(iniciarIdioma('')).toBe('en');
  });
});

// ============================================================
// (2) idioma.tabelas — MESMAS CHAVES, MESMOS BURACOS
// ============================================================
describe('idioma.tabelas', () => {
  const buracos = (texto: string): string[] =>
    [...texto.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

  it('as duas tabelas têm exatamente as mesmas chaves', () => {
    expect(Object.keys(EN).sort()).toEqual(Object.keys(PT).sort());
  });

  it('cada chave tem os MESMOS `{param}` nas duas línguas', () => {
    const divergentes: string[] = [];
    for (const chave of Object.keys(PT) as (keyof typeof PT)[]) {
      const pt = buracos(PT[chave]);
      const en = buracos(EN[chave]);
      if (pt.join('|') !== en.join('|')) {
        divergentes.push(`${chave}: pt {${pt.join(',')}} × en {${en.join(',')}}`);
      }
    }
    expect(divergentes).toEqual([]);
  });

  it('nenhum valor é vazio — chave sem texto é buraco de tela', () => {
    const vazias = Object.entries({ ...PT, ...EN })
      .filter(([, v]) => v.trim().length === 0)
      .map(([k]) => k);
    expect(vazias).toEqual([]);
  });

  it('`t` preenche o buraco na língua viva', () => {
    definirIdioma('en');
    expect(t('unidade.anosLuz', { n: '1.5' })).toContain('1.5');
    expect(t('unidade.anosLuz', { n: '1.5' })).not.toContain('{n}');
  });
});

// ============================================================
// (3) idioma.aoVivo — NADA RECARREGA
// ============================================================
describe('idioma.aoVivo', () => {
  const numeroCru = (v: number): string => String(v);

  it('a DATA por extenso muda de língua e de ORDEM', () => {
    // J2000.0 = 1 de janeiro de 2000, 12:00 TT
    const pt = formatarInstante(2451545.0);
    definirIdioma('en');
    const en = formatarInstante(2451545.0);
    expect(pt).not.toBe(en);
    expect(pt).toMatch(/janeiro/);
    expect(en).toMatch(/January/);
    // a ordem é do idioma, não do código: em pt o dia vem antes do mês
    expect(pt.indexOf('1')).toBeLessThan(pt.indexOf('janeiro'));
    expect(en.indexOf('January')).toBeLessThan(en.indexOf('2000'));
  });

  it('a NOTA DE DISTÂNCIA muda de língua', () => {
    const pt = notaDeDistancia(8.6 * 63_241, numeroCru);
    definirIdioma('en');
    const en = notaDeDistancia(8.6 * 63_241, numeroCru);
    expect(pt).toMatch(/anos-luz/);
    expect(en).toMatch(/light-years/);
  });

  it('o RÓTULO DA QUALIDADE muda de língua', () => {
    const estado = { tier: 'alta', escolha: 'auto', medicao: null } as Parameters<
      typeof rotuloDaQualidade
    >[0];
    const pt = rotuloDaQualidade(estado);
    definirIdioma('en');
    const en = rotuloDaQualidade(estado);
    expect(pt).not.toBe(en);
  });

  it('o NOME DA CAMADA é lido por acesso, então troca sem recriar a tabela', () => {
    const camada = CAMADAS[0]!;
    const pt = camada.nome;
    definirIdioma('en');
    // MESMO objeto, nome diferente: é o getter que faz a troca ao vivo
    expect(camada.nome).not.toBe(pt);
    expect(camada.nome).toBe(EN[`camada.${camada.flag}` as keyof typeof EN]);
  });

  it('voltar a língua devolve o texto de antes, byte a byte', () => {
    const antes = CAMADAS.map((c) => c.nome).join('|');
    definirIdioma('en');
    definirIdioma('pt-BR');
    expect(CAMADAS.map((c) => c.nome).join('|')).toBe(antes);
  });

  it('as duas línguas do seletor são as duas tabelas', () => {
    expect(IDIOMAS.map((i) => i.id).sort()).toEqual(['en', 'pt-BR'] as Idioma[]);
  });
});

// ============================================================
// (5) idioma.semSobra — A VARREDURA
// ============================================================
describe('idioma.semSobra', () => {
  // OS LUGARES ONDE O VISITANTE LÊ. Fora, e cada um por decisão escrita
  // no item 130, não por conveniência do teste:
  //   · `three/selo.ts` — o selo é o CARIMBO da captura e os rótulos das
  //     ~50 portas de depuração só aparecem para quem digitou a porta
  //     (F1). O que dele importa tem guarda própria: `selo.portaLang`.
  //   · `three/atlasConfig.ts` — os nomes próprios, a `classe` e a
  //     `familia` em pt-BR são CHAVES, não tela: quem as põe na tela é
  //     `nomeNaLingua`/`classeEmTexto`/`familiaEmTexto`, e o espelho do
  //     inglês tem guarda própria (`atlasConfig.nomeEn`).
  //   · `three/cadastroDeRepresentacoes.ts` e a `razao` de `escala.ts` —
  //     texto de AUDITORIA, nunca chega ao visitante (F1).
  const ALVOS = [
    'src/components',
    'src/hooks',
    'src/lib/atlas/ficha.ts',
    'src/lib/unidades.ts',
    'src/lib/buscaEstrelas.ts',
    'src/three/tempoDoAtlas.ts',
    'src/three/director/rotulos.ts',
  ];

  /**
   * Um arquivo sem comentário, sem `console.*`, sem `import` e sem
   * `throw new Error` — nenhum deles é tela. O `throw` fica de fora
   * porque a casa engole esses erros (`.catch(() => {})` na ficha) ou os
   * troca pela frase da tabela (`erro.renderizador`, `erro.iniciar`):
   * a mensagem crua é para quem abre o console, não para o visitante.
   */
  function soCodigoDeTela(fonte: string): string {
    return fonte
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^[ \t]*\/\/.*$/gm, ' ')
      .replace(/console\.\w+\([\s\S]*?\);/g, ' ')
      .replace(/throw new Error\([\s\S]*?\);/g, ' ')
      .replace(/^import[\s\S]*?from\s+'[^']*';$/gm, ' ');
  }

  function varrer(caminho: string, achados: string[]): void {
    const alvo = join(RAIZ, caminho);
    if (statSync(alvo).isDirectory()) {
      for (const nome of readdirSync(alvo)) {
        if (nome.endsWith('.test.ts') || nome.endsWith('.test.tsx')) continue;
        varrer(join(caminho, nome), achados);
      }
      return;
    }
    if (!/\.tsx?$/.test(caminho)) return;
    const codigo = soCodigoDeTela(readFileSync(alvo, 'utf8'));
    for (const linha of codigo.split('\n')) {
      // literal de string com acento: em pt é texto de gente, e texto
      // de gente que chega à tela tem de vir da tabela
      const m = linha.match(/(['"`])[^'"`\n]*[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ][^'"`\n]*\1/);
      if (m) achados.push(`${caminho}: ${m[0].slice(0, 60)}`);
    }
  }

  it('nenhum literal acentuado de tela vive fora das tabelas', () => {
    const achados: string[] = [];
    for (const alvo of ALVOS) varrer(alvo, achados);
    expect(achados).toEqual([]);
  });

  it('a própria varredura MORDE: um literal acentuado é achado', () => {
    // a prova de que o filtro de comentário não comeu o alvo junto
    const achados: string[] = [];
    const codigo = soCodigoDeTela(
      "// um comentário com acento é ignorado\nconst x = 'Câmera';\nconsole.log('acentuação');\n"
    );
    for (const linha of codigo.split('\n')) {
      const m = linha.match(/(['"`])[^'"`\n]*[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ][^'"`\n]*\1/);
      if (m) achados.push(m[0]);
    }
    expect(achados).toEqual(["'Câmera'"]);
  });
});
