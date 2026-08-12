// ============================================================
// O INVENTÁRIO DE FASES é pino, não documentação. O `satisfies` já
// obriga os mapas a cobrirem a união em tempo de compilação; o que
// falta — e é o que uma fase nova esquece — é que ninguém acrescente
// uma fase sem DECIDIR o que ela faz em cada eixo, e que as decisões
// da Onda 5 sobre 'atlas' não sejam desfeitas por descuido.
// ============================================================
import { describe, expect, it } from 'vitest';
import { ESCRITOR_DE_CAMERA, HUD_POR_FASE } from './fases';
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
    // as peças da F2: a ContextLine, a gaveta de camadas e o selo
    expect(atlas.contexto).toBe(true);
    expect(atlas.gaveta).toBe(true);
    expect(atlas.selo).toBe(true);
  });

  it('as peças do Atlas não vazam para o filme', () => {
    expect(FASES.filter((f) => HUD_POR_FASE[f].contexto)).toEqual(['atlas']);
    expect(FASES.filter((f) => HUD_POR_FASE[f].gaveta)).toEqual(['atlas']);
    expect(FASES.filter((f) => HUD_POR_FASE[f].selo)).toEqual(['atlas']);
  });

  it('só a viagem tem os botões da viagem, e só o Atlas tem o Partir', () => {
    expect(FASES.filter((f) => HUD_POR_FASE[f].botoesDaViagem)).toEqual(['journey']);
    expect(FASES.filter((f) => HUD_POR_FASE[f].botaoPartir)).toEqual(['atlas']);
    expect(FASES.filter((f) => HUD_POR_FASE[f].veuDeTitulo)).toEqual(['intro', 'end']);
    expect(FASES.filter((f) => HUD_POR_FASE[f].progresso)).toEqual(['journey', 'end']);
  });
});
