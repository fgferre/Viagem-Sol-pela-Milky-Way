// O CLIQUE ACHA O RÓTULO PELO TEXTO DESENHADO, não só pela âncora (07/09).
// Medido no juiz de a11y: a ponta de "Júpiter" ficava a 77 px da âncora
// numa tela de 1200 (fora do raio de 6%) e o clique ali não escolhia nada.
import { describe, it, expect } from 'vitest';
import { Escolha } from './escolha';
import type { StarLabel } from '../world/labels';

const TELA = { largura: 1200, altura: 800 };
const rotulo = (
  key: string,
  x: number,
  y: number,
  caixa?: { left: number; right: number; top: number; bottom: number },
  desenhado = true
): StarLabel =>
  ({
    key,
    name: key,
    x: x / TELA.largura,
    y: y / TELA.altura,
    opacity: 1,
    desenhado,
    caixaDaDisputa: caixa && { ...caixa, folga: 2 },
  }) as unknown as StarLabel;

const montar = (alvos: StarLabel[]) =>
  new Escolha({
    escada: {} as never,
    rotulos: { alvos } as never,
    fios: { fase: () => 'atlas', meta: () => undefined, tela: () => TELA },
  });

const jupiter = () =>
  rotulo('corpo:jupiter', 519, 158, { left: 530, right: 632, top: 141, bottom: 167 });

describe('o clique acha o rótulo pelo TEXTO desenhado', () => {
  it('a ponta de um nome longo escolhe o corpo dele, mesmo longe da âncora', () => {
    expect(montar([jupiter()]).chaveApontada(596 / 1200, 146 / 800)).toBe('corpo:jupiter');
  });

  it('perto da âncora continua valendo, sem caixa nenhuma', () => {
    expect(montar([rotulo('corpo:mars', 519, 158)]).chaveApontada(530 / 1200, 165 / 800)).toBe(
      'corpo:mars'
    );
  });

  it('fora da caixa e longe da âncora, nada', () => {
    expect(montar([jupiter()]).chaveApontada(900 / 1200, 600 / 800)).toBeNull();
  });

  it('rótulo NÃO desenhado não vale nem pela caixa', () => {
    const cortado = rotulo('corpo:saturn', 519, 158, { left: 530, right: 632, top: 141, bottom: 167 }, false);
    expect(montar([cortado]).chaveApontada(596 / 1200, 146 / 800)).toBeNull();
  });
});
