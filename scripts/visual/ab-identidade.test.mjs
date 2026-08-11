// O VEREDITO da leva de md5, sem subir Chrome e sem tocar em disco.
//
// Existe porque o defeito que ele fecha era invisível por construção: o laço
// antigo abria com `if (!md5[nome] || !antes[nome]) continue;`, e uma vista
// que só existisse num dos lados sumia da tela SEM linha nenhuma — o
// `>>> BIT-IDÊNTICO` saía verde tendo julgado uma vista a menos. Nenhum
// arranjo de servidor encena isso: é preciso montar os dois mapas na mão, que
// é exatamente o que um teste faz.
//
// O caso 1 é o SABIDAMENTE QUEBRADO da Onda 3→4: vista acrescentada à lista
// depois de o "antes" ter sido capturado (só no "depois").
//
// Importar `ab-identidade.mjs` NÃO roda a leva — o corpo executável está sob
// a guarda de `process.argv[1]`; só importar `chrome.mjs` ainda exige o Chrome
// instalado (ele resolve o caminho no topo do módulo, de propósito).
import { describe, it, expect } from 'vitest';
import { julgarVistas } from './ab-identidade.mjs';

const VISTAS = ['sol', 'interno', 'ua150'];
const H = (x) => [`${x}@1800x1713`, `${x}@1800x1713`];

describe('julgarVistas', () => {
  it('vista SÓ no depois (a que era pulada em silêncio): linha NOVA', () => {
    const r = julgarVistas({
      vistas: VISTAS,
      antes: { sol: H('a4fbf427778a'), interno: H('d98cbef70849') },
      depois: { sol: H('a4fbf427778a'), interno: H('d98cbef70849'), ua150: H('facade000001') },
    });
    // NUNCA silêncio: uma linha por vista da lista, na ordem da lista
    expect(r.linhas.map((l) => l.nome)).toEqual(VISTAS);
    expect(r.linhas[2]).toMatchObject({ nome: 'ua150', veredito: 'NOVA' });
    expect(r.linhas[2].texto).toContain('antes=—');
    expect(r.conta).toMatchObject({ IGUAL: 2, NOVA: 1, AUSENTE: 0 });
    // não é erro (a baseline dela nasce agora), mas o resumo TEM de dizer
    expect(r.erro).toBe(false);
    expect(r.bitIdentico).toBe(true);
    expect(r.resumo).toContain('BIT-IDÊNTICO (2 vistas julgadas)');
    expect(r.resumo).toContain('1 NOVA(s) sem baseline');
  });

  it('vista SÓ no antes: AUSENTE, e o veredito inteiro é inválido', () => {
    const r = julgarVistas({
      vistas: VISTAS,
      antes: { sol: H('a4fbf427778a'), interno: H('d98cbef70849'), ua150: H('facade000001') },
      depois: { sol: H('a4fbf427778a'), interno: H('d98cbef70849') },
    });
    expect(r.linhas[2]).toMatchObject({ nome: 'ua150', veredito: 'AUSENTE' });
    expect(r.linhas[2].texto).toContain('depois=—');
    expect(r.erro).toBe(true);
    expect(r.bitIdentico).toBe(false);
    expect(r.resumo).toContain('VEREDITO INVÁLIDO');
    expect(r.resumo).toContain('1 vista(s) AUSENTE(s)');
  });

  it('vista em lado nenhum também é AUSENTE — não some da tela', () => {
    const r = julgarVistas({ vistas: ['sol'], antes: {}, depois: {} });
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0].veredito).toBe('AUSENTE');
    expect(r.erro).toBe(true);
  });

  it('array vazio conta como ausente (estado gravado sem hash)', () => {
    const r = julgarVistas({ vistas: ['sol'], antes: { sol: H('a4fbf427778a') }, depois: { sol: [] } });
    expect(r.linhas[0].veredito).toBe('AUSENTE');
    expect(r.erro).toBe(true);
  });

  it('os três vereditos de sempre: IGUAL, DIFERE e INSTÁVEL', () => {
    const r = julgarVistas({
      vistas: ['sol', 'interno', 'travessia'],
      antes: {
        sol: H('a4fbf427778a'),
        interno: H('d98cbef70849'),
        travessia: H('b85162ede6cf'),
      },
      depois: {
        sol: H('a4fbf427778a'),
        interno: H('0000deadbeef'),
        travessia: ['b85162ede6cf@1800x1713', '145263085c23@1800x1713'],
      },
    });
    expect(r.linhas.map((l) => l.veredito)).toEqual(['IGUAL', 'DIFERE', 'INSTÁVEL']);
    expect(r.bitIdentico).toBe(false);
    expect(r.erro).toBe(false);
    expect(r.resumo).toContain('NÃO é bit-idêntico');
  });

  it('leva inteira igual: bit-idêntico com a contagem do que foi julgado', () => {
    const antes = { sol: H('a4fbf427778a'), interno: H('d98cbef70849') };
    const r = julgarVistas({ vistas: ['sol', 'interno'], antes, depois: { ...antes } });
    expect(r.bitIdentico).toBe(true);
    expect(r.erro).toBe(false);
    expect(r.julgadas).toBe(2);
    expect(r.resumo).toBe('>>> BIT-IDÊNTICO (2 vistas julgadas)');
  });

  it('sem lista não há juízo — e nem por isso mente', () => {
    const r = julgarVistas({});
    expect(r.linhas).toHaveLength(0);
    expect(r.erro).toBe(false);
    expect(r.bitIdentico).toBe(true);
  });
});
