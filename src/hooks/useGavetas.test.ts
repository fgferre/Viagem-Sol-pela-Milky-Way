// ============================================================
// AS QUATRO GAVETAS — as regras, não o React (item 62, 23/08).
//
// O runner da casa é `node`, sem DOM: um hook não se monta aqui, e é
// por isso que as quatro decisões do enum são funções PURAS
// (`aoAlternar`, `aoFechar`, `aoTravessar`, `aoFocar`). O que se pina é
// o que uma corrida de navegador não acusaria como regressão: as três
// EXCEÇÕES escritas — o ⚙ Ajustes que resiste à fase e à seleção, o
// fechar que é "feche-me" e não "feche o que estiver aberto", e a
// ficha que obedece à seleção — são cláusulas de uma linha, e cada uma
// nasceu de um defeito medido. Apagar qualquer uma delas continua
// passando em todos os juízes de tela; só reaparece no dia em que o
// visitante perder o painel que tinha aberto.
//
// A quinta prova é a do ARQUIVO: os dois efeitos (seleção→ficha e
// travessia→fecha) saem do `App.tsx` e moram aqui. Enquanto um deles
// voltar para lá, há duas casas para a mesma regra.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Gaveta } from './useGavetas';
import { aoAlternar, aoFechar, aoFocar, aoTravessar } from './useGavetas';

const APP = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const HOOK = readFileSync(new URL('./useGavetas.ts', import.meta.url), 'utf8');

/** as quatro do enum, escritas uma vez para os laços abaixo */
const TODAS: Gaveta[] = ['camadas', 'busca', 'ajustes', 'ficha', 'tempo'];

describe('1. abrir é ESCOLHER — uma de cada vez, por construção', () => {
  it('a alça abre a dela e fecha a que estiver aberta', () => {
    for (const antes of [null, ...TODAS]) {
      for (const qual of TODAS) {
        const depois = aoAlternar(antes, qual);
        expect(depois, `${antes} → ${qual}`).toBe(antes === qual ? null : qual);
      }
    }
  });

  it('a MESMA alça fecha — o gatilho é um interruptor', () => {
    for (const qual of TODAS) expect(aoAlternar(qual, qual)).toBeNull();
  });
});

describe('2. fechar é "FECHE-ME", nunca "feche o que estiver aberto"', () => {
  it('o ✕ de uma gaveta não mexe na gaveta de outra', () => {
    // o caso REAL: a paleta fecha no tique SEGUINTE ao Enter, e nesse
    // meio-tempo a escolha já abriu a FICHA do alvo — um `null` cru
    // fecharia a ficha que acabou de nascer
    expect(aoFechar('ficha', 'busca')).toBe('ficha');
    for (const aberta of TODAS) {
      for (const qual of TODAS) {
        expect(aoFechar(aberta, qual), `${aberta} recebe ✕ de ${qual}`).toBe(
          aberta === qual ? null : aberta
        );
      }
    }
  });
});

describe('3. a travessia de modo fecha as DUAS que tinham o defeito', () => {
  it('a busca, as camadas e o tempo fecham — renasciam sozinhos ao voltar', () => {
    expect(aoTravessar('busca')).toBeNull();
    expect(aoTravessar('camadas')).toBeNull();
    // a máquina do tempo é do telefone, e só a fase que a hospeda a tem
    expect(aoTravessar('tempo')).toBeNull();
  });

  it('o ⚙ Ajustes e a FICHA resistem — nenhum dos dois é painel de fase', () => {
    // o `?ajustes=1` abre o painel sobre a tela de TÍTULO, onde fase
    // nenhuma o hospeda: fechá-lo por fase mataria a porta
    expect(aoTravessar('ajustes')).toBe('ajustes');
    // a ficha obedece à SELEÇÃO: se ainda há corpo em foco quando o modo
    // volta, a ficha dele é a resposta certa
    expect(aoTravessar('ficha')).toBe('ficha');
    expect(aoTravessar(null)).toBeNull();
  });
});

describe('4. há seleção ⇒ há ficha (item 74)', () => {
  it('um alvo NOVO abre a ficha dele, venha de onde vier', () => {
    expect(aoFocar(null, 'marte')).toBe('ficha');
    expect(aoFocar('camadas', 'marte')).toBe('ficha');
    expect(aoFocar('busca', 'titan')).toBe('ficha');
  });

  it('soltar a seleção fecha a ficha — e só a ficha', () => {
    expect(aoFocar('ficha', null)).toBeNull();
    expect(aoFocar('camadas', null)).toBe('camadas');
    expect(aoFocar(null, null)).toBeNull();
  });

  it('o ⚙ Ajustes resiste à seleção — o link ?ajustes=1&foco= é a razão', () => {
    // sem esta cláusula, uma configuração inteira num endereço perdia o
    // painel no instante em que o foco chegava
    expect(aoFocar('ajustes', 'hd48915')).toBe('ajustes');
    expect(aoFocar('ajustes', null)).toBe('ajustes');
  });
});

describe('5. os dois efeitos são do HOOK, e não do App', () => {
  it('a seleção→ficha e a travessia→fecha moram em useGavetas', () => {
    expect(HOOK).toContain('setGaveta((atual) => aoFocar(atual, alvo))');
    expect(HOOK).toContain('setGaveta(aoTravessar)');
  });

  it('o App só CONSOME o enum — nenhuma regra dele sobrou lá', () => {
    expect(APP).toContain('useGavetas(escada, foco, phase)');
    for (const regra of ['aoFocar', 'aoTravessar', 'aoAlternar', 'aoFechar']) {
      expect(APP, `${regra} voltou para o App`).not.toContain(regra);
    }
  });
});
