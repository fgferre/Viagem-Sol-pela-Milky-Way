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
import {
  ARRASTO_QUE_FECHA_PX,
  aoAlternar,
  aoFechar,
  aoFocar,
  aoTravessar,
  arrastoFecha,
} from './useGavetas';
// a zona morta do dedo vem da peça que o arrasto realmente usa: o gesto
// que o dono aprovou é a SOMA dos dois números, e ela só se mede juntando
import { limiarDeClique } from '../three/arrastoDePonteiro';

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
    expect(APP).toContain('useGavetas(escada, foco, phase, celular)');
    for (const regra of ['aoFocar', 'aoTravessar', 'aoAlternar', 'aoFechar']) {
      expect(APP, `${regra} voltou para o App`).not.toContain(regra);
    }
  });
});

describe('6. a QUARTA saída: arrastar a folha para baixo (item 62, 23/08)', () => {
  it('desce o bastante e mais para baixo do que para o lado ⇒ fecha', () => {
    // OS NÚMEROS SÃO LITERAIS, e isso é o dente (apertado em 24/08,
    // depois de o auditor sabotar a constante para 8 e os dezesseis
    // vereditos deste arquivo passarem verdes). Escrever o limiar em
    // função de si mesmo — `arrastoFecha(0, ARRASTO_QUE_FECHA_PX)` — não
    // mede número nenhum: prova só que a função lê a própria constante,
    // e segue verde com ela valendo 8 ou 800. O que o dono aprovou foi
    // um GESTO, e gesto se mede em pixels de tela.
    expect(arrastoFecha(0, 47)).toBe(false);
    expect(arrastoFecha(0, 48)).toBe(true);
    expect(arrastoFecha(10, 200)).toBe(true);
    // ...e a constante é o mesmo 48, escrito uma vez só
    expect(ARRASTO_QUE_FECHA_PX).toBe(48);
  });

  it('o que o DEDO anda são 64 px — a zona morta é comida antes', () => {
    // `arrastoFecha` recebe o que `mover` devolve, e `mover` já
    // DESCARTOU a zona morta do toque. O número que o polegar sente é a
    // soma dos dois, e é ele que o comentário da constante promete: 16
    // (zona morta do dedo) + 48 = 64 px, 7,6% da altura num aparelho de
    // 844. Sem esta conta, mexer na zona morta mudaria o gesto do dono
    // sem quebrar nada.
    const zonaMorta = limiarDeClique('touch');
    expect(zonaMorta).toBe(16);
    expect(zonaMorta + ARRASTO_QUE_FECHA_PX).toBe(64);
    // um dedo que desce 63 px NÃO fecha; 64 fecha
    expect(arrastoFecha(0, 63 - zonaMorta)).toBe(false);
    expect(arrastoFecha(0, 64 - zonaMorta)).toBe(true);
  });

  it('subir NUNCA fecha — a folha sai por baixo, não por cima', () => {
    expect(arrastoFecha(0, -200)).toBe(false);
    expect(arrastoFecha(0, 0)).toBe(false);
  });

  it('gesto que anda mais para o LADO não fecha — é rolar, ou um controle', () => {
    // a folha de Ajustes tem deslizantes e a fileira de alças rola em X:
    // descer 60 px enquanto anda 200 é qualquer coisa menos "fecha"
    expect(arrastoFecha(200, 60)).toBe(false);
    expect(arrastoFecha(-200, 60)).toBe(false);
    // ...e o empate também não fecha: quem fecha é o vertical DOMINANTE
    expect(arrastoFecha(60, 60)).toBe(false);
  });

  it('a mecânica é a da casa: o ArrastoDePonteiro, e nenhuma outra', () => {
    // o item 62 decidiu isto por escrito ("reusando o ArrastoDePonteiro"),
    // e o que o dedo anda de verdade são os 48 px MAIS a zona morta do
    // toque, que a classe come antes do primeiro passo
    expect(HOOK).toContain("import { ArrastoDePonteiro } from '../three/arrastoDePonteiro'");
    expect(HOOK).toContain('arrasto.mover(comoPonteiro(dedo), performance.now())');
    // e a decisão de desenho que o item deixou em aberto: só arma com a
    // rolagem NO TOPO, senão o mesmo gesto seria "rola" e "fecha"
    expect(HOOK).toContain('folha.scrollTop > 0');
  });

  it('escuta TOQUE, e não ponteiro — o navegador cancela o ponteiro', () => {
    // MEDIDO a 390×844 com dedo sintético: numa folha rolável o Chrome
    // manda `pointercancel` ~30 px depois do primeiro toque e assume a
    // rolagem; os `touchmove` do MESMO gesto continuam chegando. Escutar
    // ponteiro aqui é escutar um fluxo que morre antes do limiar.
    // O `touchstart` ganhou `{ passive: true }` em 24/08 e o parêntese de
    // fecho saiu daqui — mas tirar a pontuação sem pôr FRONTEIRA abriu um
    // buraco estreito: `comecar` virou PREFIXO, e um ouvinte ligado a um
    // `comecarNada` qualquer passava verde. A borda de palavra (`\b`)
    // cobra o nome inteiro e continua aceitando as opções depois dele.
    expect(HOOK).toMatch(/folha\.addEventListener\('touchstart', comecar\b/);
    // e este NUNCA precisou ceder: o fonte tem o parêntese, então o dente
    // fica exato. Afrouxar o que não quebrou é perder medida de graça.
    expect(HOOK).toContain("window.addEventListener('touchmove', mover)");
    expect(HOOK).not.toContain("addEventListener('pointermove'");
    // ...e o mouse fica de fora de graça: `touchstart` não existe para ele
    expect(HOOK).not.toContain("addEventListener('pointerdown'");
  });

  it('fecha "a mim", como as outras três saídas', () => {
    expect(HOOK).toContain('setGaveta((atual) => aoFechar(atual, gaveta))');
  });
});
