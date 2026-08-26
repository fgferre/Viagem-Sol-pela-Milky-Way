// ============================================================
// O INVENTÁRIO DE FASES é pino, não documentação. O `satisfies` já
// obriga os mapas a cobrirem a união em tempo de compilação; o que
// falta — e é o que uma fase nova esquece — é que ninguém acrescente
// uma fase sem DECIDIR o que ela faz em cada eixo, e que as decisões
// da Onda 5 sobre 'atlas' não sejam desfeitas por descuido.
// ============================================================
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ESCRITOR_DE_CAMERA,
  HUD_POR_FASE,
  LINHAS_DE_ORBITA_POR_FASE,
  arrastoFazAlgo,
} from './fases';
import type { Phase } from './fases';

const FASES = Object.keys(HUD_POR_FASE) as Phase[];

/** o nome que a varredura de estreiteza procura — ver o último bloco */
const NOME_DO_MAPA = 'LINHAS_DE_ORBITA_POR_FASE';

describe('as fases e os dois mapas', () => {
  it('são as seis de hoje — acrescentar uma é decisão, não detalhe', () => {
    expect(FASES).toEqual(['loading', 'intro', 'journey', 'end', 'free', 'atlas']);
    expect(Object.keys(ESCRITOR_DE_CAMERA)).toEqual(FASES);
  });

  it('toda fase tem um escritor de câmera declarado', () => {
    for (const fase of FASES) {
      expect(['nenhum', 'viagem', 'voo', 'atlas']).toContain(ESCRITOR_DE_CAMERA[fase]);
    }
  });

  it('cada rig tem as fases que tem — e só elas', () => {
    const por = (quem: string) => FASES.filter((f) => ESCRITOR_DE_CAMERA[f] === quem);
    expect(por('viagem')).toEqual(['intro', 'journey']);
    expect(por('voo')).toEqual(['free']);
    expect(por('atlas')).toEqual(['atlas']);
    expect(por('nenhum')).toEqual(['loading', 'end']);
  });

  it('toda peça do HUD tem resposta em toda fase', () => {
    const eixos = Object.keys(HUD_POR_FASE.journey);
    expect(eixos.length).toBeGreaterThan(0);
    for (const fase of FASES) {
      expect(Object.keys(HUD_POR_FASE[fase])).toEqual(eixos);
      for (const eixo of eixos) {
        expect(typeof (HUD_POR_FASE[fase] as Record<string, boolean>)[eixo]).toBe('boolean');
      }
    }
  });

  it('o carregamento não mostra HUD nenhum', () => {
    expect(Object.values(HUD_POR_FASE.loading).every((v) => v === false)).toBe(true);
  });

  it('o HUD do Atlas é o declarado na Onda 5', () => {
    const atlas = HUD_POR_FASE.atlas;
    // a porta dos Ajustes MORA na barra de controles: sem ela, F5 e F6
    // chegariam à fase sem acesso nenhum
    expect(atlas.controles).toBe(true);
    expect(atlas.botaoPartir).toBe(true);
    // o ProgressBar é slider de capítulos do FILME — dentro do Atlas
    // daria scrub do filme (D6)
    expect(atlas.progresso).toBe(false);
    // nada do vocabulário do filme atravessa
    expect(atlas.legenda).toBe(false);
    expect(atlas.rumo).toBe(false);
    expect(atlas.veuDeTitulo).toBe(false);
    expect(atlas.botoesDaViagem).toBe(false);
    expect(atlas.botaoReviver).toBe(false);
    // as peças da F2: a ficha do objeto, a gaveta de camadas e o selo
    expect(atlas.ficha).toBe(true);
    expect(atlas.gaveta).toBe(true);
    expect(atlas.selo).toBe(true);
    // e a da F4: a máquina do tempo — o tempo do CÉU, que não é o
    // tempo do filme (esse é o `progresso`, e ele fica de fora)
    expect(atlas.tempo).toBe(true);
  });

  it('as peças do Atlas não vazam para o filme', () => {
    expect(FASES.filter((f) => HUD_POR_FASE[f].ficha)).toEqual(['atlas']);
    expect(FASES.filter((f) => HUD_POR_FASE[f].selo)).toEqual(['atlas']);
    expect(FASES.filter((f) => HUD_POR_FASE[f].tempo)).toEqual(['atlas']);
  });

  it('a gaveta de camadas (item 61) monta em TODA fase com barra, e só nelas', () => {
    // Ela DEIXOU de ser peça do Atlas em 22/08. Palavras do dono:
    // *"atlas - camadas e ajustes concorrem"* — as camadas eram 17 dos 32
    // controles do painel de Ajustes E seis linhas desta gaveta. Com uma
    // porta só, ela tem de existir onde o painel existia: nas três fases
    // com barra de controles. Uma gaveta só do Atlas deixaria o filme sem
    // camadas nenhuma.
    expect(FASES.filter((f) => HUD_POR_FASE[f].gaveta)).toEqual([
      'journey',
      'free',
      'atlas',
    ]);
    expect(FASES.filter((f) => HUD_POR_FASE[f].gaveta)).toEqual(
      FASES.filter((f) => HUD_POR_FASE[f].controles)
    );
  });

  it('a busca (F3) monta nas DUAS fases que têm destino, e em nenhuma outra', () => {
    // ela não é peça só do Atlas: no voo livre a escolha VOA, no Atlas
    // ENQUADRA. No filme não monta — lá quem manda na câmera é o
    // roteiro, e escolher um destino não teria efeito nenhum.
    expect(FASES.filter((f) => HUD_POR_FASE[f].busca)).toEqual(['free', 'atlas']);
    // e ela mora na barra de controles: fase com busca tem a barra
    for (const f of FASES.filter((x) => HUD_POR_FASE[x].busca)) {
      expect(HUD_POR_FASE[f].controles, `${f} tem busca sem barra de controles`).toBe(true);
    }
  });

  it('só a viagem tem os botões da viagem, e só o Atlas tem o Partir', () => {
    expect(FASES.filter((f) => HUD_POR_FASE[f].botoesDaViagem)).toEqual(['journey']);
    expect(FASES.filter((f) => HUD_POR_FASE[f].botaoPartir)).toEqual(['atlas']);
    expect(FASES.filter((f) => HUD_POR_FASE[f].veuDeTitulo)).toEqual(['intro', 'end']);
    expect(FASES.filter((f) => HUD_POR_FASE[f].progresso)).toEqual(['journey', 'end']);
  });
});

// ------------------------------------------------------------
// O CURSOR DE AGARRAR (defeito 4 dos quatro de ponteiro): a promessa
// tem de bater com quem responde ao arrasto. Prometer "agarrar" onde
// nada se move é pior que a seta de sempre — o visitante arrasta, não
// acontece nada, e conclui que a cena não se arrasta EM LUGAR NENHUM.
// ------------------------------------------------------------
describe('arrastoFazAlgo — a fase promete o que o arrasto entrega', () => {
  it('a tabela inteira das seis fases, nos dois estados de pausa', () => {
    // exaustiva de propósito: fase nova sem decisão aqui quebra o teste
    const esperado: Record<Phase, [correndo: boolean, pausada: boolean]> = {
      // sem cena montada, sem gesto
      loading: [false, false],
      // a intro é deriva contemplativa do roteiro: o ponteiro não entra
      intro: [false, false],
      // A ÚNICA fase em que a pausa muda a resposta — é o pausar-e-olhar
      journey: [false, true],
      // 'end' congela no último quadro do filme; ninguém escreve a câmera
      end: [false, false],
      // voo livre: arrastar OLHA (e é o `roam.enabled` do ESCRITOR_DE_CAMERA)
      free: [true, true],
      // Atlas: arrastar ORBITA o alvo, em qualquer estado da viagem
      atlas: [true, true],
    };
    for (const fase of FASES) {
      const [correndo, pausada] = esperado[fase];
      expect(arrastoFazAlgo(fase, false), `${fase} sem pausa`).toBe(correndo);
      expect(arrastoFazAlgo(fase, true), `${fase} pausada`).toBe(pausada);
    }
  });

  it('sai do ESCRITOR_DE_CAMERA, não de uma segunda lista de fases', () => {
    // se alguém trocar o dono da câmera de uma fase e esquecer o cursor,
    // é aqui que a incoerência aparece — a fonte é uma só
    for (const fase of FASES) {
      if (ESCRITOR_DE_CAMERA[fase] === 'voo') {
        expect(arrastoFazAlgo(fase, false), `${fase} voa e não arrasta`).toBe(true);
      }
    }
  });

  it('com o filme CORRENDO o cursor não convida — o dono da câmera é o roteiro', () => {
    expect(arrastoFazAlgo('journey', false)).toBe(false);
    expect(arrastoFazAlgo('intro', false)).toBe(false);
  });
});

// ------------------------------------------------------------
// A ÚNICA REGRA POR MODO VIVA DA CASA (item 77 · decisão 3, 25/08).
//
// O item 61 matou as regras por modo com lápide, e `simbolosProibidos.
// test.ts` vigia cada uma para que não ressuscite. Esta UMA está viva
// porque ELE a autorizou pelo nome, depois de ver as linhas dentro do
// filme: *"tirar do filme (aceito recriar a separação entre modos só
// aí)"*. O "só aí" é o tamanho da permissão, e o que segue é o que o
// torna cobrável em vez de prometido:
//
//  1. o VALOR de cada fase, exaustivo — inverter o gate reprova aqui;
//  2. a ESTREITEZA, varrida na árvore — estender a exceção a uma segunda
//     camada reprova aqui;
//  3. e o COMPORTAMENTO (a camada de verdade, no quadro de verdade) mora
//     em `world/orbitas.test.ts`, §7.
//
// O QUE ISTO NÃO PROMETE, na disciplina de `clarao.test.ts`: um dente de
// unidade mede o caminho padrão, e a varredura de texto mede um NOME.
// Quem quiser distinguir modo por outro caminho — outro nome, outro
// canal — passa por aqui. O que a lista encarece é a extensão ÓBVIA
// desta exceção, que é a que a conversa futura tentaria primeiro. Quem
// vier depois: acrescente o dente, não a promessa.
// ------------------------------------------------------------
describe('as linhas de órbita são a ÚNICA regra por modo (item 77 · decisão 3)', () => {
  it('o mapa responde as seis fases — o filme fora, o Atlas e o voo dentro', () => {
    // exaustivo e digitado: fase nova sem decisão já não compila (o
    // `satisfies Record<Phase, boolean>`), e inverter um valor cai aqui
    const esperado: Record<Phase, boolean> = {
      loading: false,
      intro: false,
      journey: false,
      end: false,
      free: true,
      atlas: true,
    };
    expect(Object.keys(LINHAS_DE_ORBITA_POR_FASE)).toEqual(FASES);
    for (const fase of FASES) {
      expect(LINHAS_DE_ORBITA_POR_FASE[fase], fase).toBe(esperado[fase]);
    }
    // e a forma da lei, dita sem depender da tabela acima: TODA fase de
    // filme está fora, e ela é exatamente o complemento das duas que
    // ficam
    const fora = FASES.filter((f) => !LINHAS_DE_ORBITA_POR_FASE[f]);
    expect(fora).toEqual(['loading', 'intro', 'journey', 'end']);
    expect(FASES.filter((f) => LINHAS_DE_ORBITA_POR_FASE[f])).toEqual(['free', 'atlas']);
  });

  it('a exceção não vaza: só a camada das órbitas consulta o mapa', () => {
    const SRC = fileURLToPath(new URL('..', import.meta.url));
    const consumidores = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
      .filter((rel) => /\.(ts|tsx)$/.test(rel))
      .filter((rel) => readFileSync(join(SRC, rel), 'utf8').includes(NOME_DO_MAPA))
      .map((rel) => rel.split(sep).join('/'))
      .sort();
    // A CASA INTEIRA, e é curta de propósito: quem DECLARA (fases.ts),
    // quem CONSOME (a camada das órbitas), quem CITA (o `director.ts`,
    // no comentário do ponto de chamada — a regra tem de ser legível
    // onde a fase é entregue) e os três testes que os cobram. Uma linha
    // a mais aqui é a exceção sendo estendida — para brilho, para lente,
    // para nomes —, e é exatamente isso que ele NÃO autorizou.
    expect(consumidores).toEqual([
      'three/director.test.ts',
      'three/director.ts',
      'three/fases.test.ts',
      'three/fases.ts',
      'three/world/orbitas.ts',
    ]);
    // ...e o director CITA sem LER: quem decide é a camada, num lugar
    // só. Um import aqui seria um segundo ponto de decisão.
    const doDirector = readFileSync(join(SRC, 'three', 'director.ts'), 'utf8');
    expect(doDirector).not.toMatch(new RegExp(`import[^;]*${NOME_DO_MAPA}`));
  });

  it('a varredura acha o que procura — um padrão quebrado passaria calado', () => {
    // o cinto do selo: se o nome mudar e ninguém atualizar a busca, a
    // lista acima ficaria VAZIA e o `toEqual` passaria a ser um teste de
    // nada. Aqui se prova que o nome procurado é o nome que existe.
    expect(Object.keys({ LINHAS_DE_ORBITA_POR_FASE })[0]).toBe(NOME_DO_MAPA);
    const fonte = readFileSync(new URL('./fases.ts', import.meta.url), 'utf8');
    expect(fonte).toContain(`export const ${NOME_DO_MAPA}`);
    // e a autorização fica ESCRITA junto do mapa: quem ler a regra tem
    // de encontrar de quem é a permissão, sem sair do arquivo. O texto
    // corre num parágrafo de bloco `/** */`, então o `*` de margem sai
    // antes da comparação — senão a citação só passaria por sorte de
    // quebra de linha.
    const corrido = fonte.replace(/\n\s*\*\s?/g, ' ');
    expect(corrido).toContain('tirar do filme (aceito recriar a separação entre modos só aí)');
    expect(corrido).toContain('item 77');
    // o cinto do cinto: a normalização acha o que a crua perderia
    expect('a *\n * b'.replace(/\n\s*\*\s?/g, ' ')).toBe('a * b');
  });
});
