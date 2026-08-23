// ============================================================
// O INVENTÁRIO DE FASES é pino, não documentação. O `satisfies` já
// obriga os mapas a cobrirem a união em tempo de compilação; o que
// falta — e é o que uma fase nova esquece — é que ninguém acrescente
// uma fase sem DECIDIR o que ela faz em cada eixo, e que as decisões
// da Onda 5 sobre 'atlas' não sejam desfeitas por descuido.
// ============================================================
import { describe, expect, it } from 'vitest';
import { ESCRITOR_DE_CAMERA, HUD_POR_FASE, arrastoFazAlgo } from './fases';
import type { Phase } from './fases';

const FASES = Object.keys(HUD_POR_FASE) as Phase[];

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
