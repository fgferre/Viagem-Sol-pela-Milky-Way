// Serve: chão — o veredito do md5 nunca fica em silêncio: vista só de um lado é NOVA ou AUSENTE, nunca some da leva
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
import { julgarVistas, carimboDoCodigo } from './ab-identidade.mjs';

const VISTAS = ['sol', 'interno', 'ua150'];
// H = o par (as vistas pinadas em ×2 e a era pré-113); U = a captura ÚNICA,
// que desde a F3a do item 113 é a norma — o veredito aceita os dois formatos
// e qualquer mistura, e os casos abaixo cobram exatamente isso.
const H = (x) => [`${x}@1800x1713`, `${x}@1800x1713`];
const U = (x) => [`${x}@1800x1713`];

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

  it('vista única (o recorte de SMOKE/`ab-identidade depois <vista>`): singular', () => {
    const r = julgarVistas({
      vistas: ['sol'],
      antes: { sol: H('a4fbf427778a'), interno: H('d98cbef70849') },
      depois: { sol: H('a4fbf427778a') },
    });
    // quem NÃO está na lista desta invocação não vira AUSENTE — cobrar as 18
    // num SMOKE de 4 reprovaria o fluxo de iterar
    expect(r.linhas).toHaveLength(1);
    expect(r.erro).toBe(false);
    expect(r.resumo).toBe('>>> BIT-IDÊNTICO (1 vista julgada)');
  });

  // ACHADO em 2026-08-21: este teste EXIGIA o contrário — `bitIdentico: true`
  // para uma lista vazia. `julgarVistas({})` imprimia ">>> BIT-IDÊNTICO
  // (0 vistas julgadas)" e o gate saía 0: verde de comparação nenhuma, com o
  // teste de guarda cobrando o verde. É a mesma família do `continue`
  // silencioso que este juiz nasceu para fechar — gate que aprova o que não
  // mediu —, e o teste que a protegia era parte do defeito.
  it('sem lista não há juízo — e "sem juízo" NÃO é bit-idêntico', () => {
    const r = julgarVistas({});
    expect(r.linhas).toHaveLength(0);
    expect(r.julgadas).toBe(0);
    expect(r.bitIdentico).toBe(false);
    expect(r.erro).toBe(true);
    expect(r.resumo).toContain('VEREDITO INVÁLIDO');
    expect(r.resumo).toContain('0 vistas julgadas');
  });

  it('lista inteira NOVA: nada foi comparado, então nada foi provado', () => {
    // o caso vivo: `antes` perdido (TMPDIR limpo) e `depois` completo. Antes
    // daqui isto saía ">>> BIT-IDÊNTICO (0 vistas julgadas) · 2 NOVA(s)…" e
    // com status 0 — o pior verde possível, porque parece uma leva inteira.
    const r = julgarVistas({
      vistas: ['sol', 'interno'],
      antes: {},
      depois: { sol: H('a4fbf427778a'), interno: H('d98cbef70849') },
    });
    expect(r.conta).toMatchObject({ NOVA: 2, AUSENTE: 0 });
    expect(r.julgadas).toBe(0);
    expect(r.bitIdentico).toBe(false);
    expect(r.erro).toBe(true);
    expect(r.resumo).toContain('VEREDITO INVÁLIDO');
    // e o que É verdade continua dito: as duas nascem sem baseline
    expect(r.resumo).toContain('2 NOVA(s) sem baseline');
  });

  it('uma vista comparada JÁ é juízo — o piso é 1, não 0', () => {
    const r = julgarVistas({
      vistas: ['sol', 'interno'],
      antes: { sol: H('a4fbf427778a') },
      depois: { sol: H('a4fbf427778a'), interno: H('d98cbef70849') },
    });
    expect(r.julgadas).toBe(1);
    expect(r.erro).toBe(false);
    expect(r.bitIdentico).toBe(true);
    expect(r.resumo).toContain('BIT-IDÊNTICO (1 vista julgada)');
  });
});

// A CAPTURA ADAPTATIVA (F3a do item 113): 1× por vista é a norma, ×2 só nas
// pinadas trêmulas e na re-mira de quem DIFERE — e a re-mira ACUMULA (a nova
// dupla soma-se à 1ª captura em vez de apagá-la). Estes casos pinam o
// contrato que o motor novo entrega ao veredito: arrays de 1 e de 3 hashes
// são entrada legítima, e é o hash DESTOANTE acumulado que separa INSTÁVEL
// de DIFERE.
describe('julgarVistas com a captura adaptativa (item 113)', () => {
  it('captura única dos dois lados: IGUAL e DIFERE saem de 1 hash por lado', () => {
    const r = julgarVistas({
      vistas: ['sol', 'interno'],
      antes: { sol: U('a4fbf427778a'), interno: U('d98cbef70849') },
      depois: { sol: U('a4fbf427778a'), interno: U('0000deadbeef') },
    });
    expect(r.linhas.map((l) => l.veredito)).toEqual(['IGUAL', 'DIFERE']);
    expect(r.erro).toBe(false);
  });

  it('re-mira que desmente: 1ª captura destoante + ×2 que repetem o antes → INSTÁVEL', () => {
    // o caso que a 2ª captura incondicional pagava para separar: a 1ª não
    // assentou; as duas da re-mira batem com o outro lado. O lado não repete
    // o próprio md5 — INSTÁVEL, nunca DIFERE nem IGUAL calado.
    const r = julgarVistas({
      vistas: ['sol'],
      antes: { sol: U('a4fbf427778a') },
      depois: { sol: [...U('0000deadbeef'), ...U('a4fbf427778a'), ...U('a4fbf427778a')] },
    });
    expect(r.linhas[0].veredito).toBe('INSTÁVEL');
    expect(r.bitIdentico).toBe(false);
  });

  it('re-mira que confirma: ×3 iguais entre si contra antes estável → DIFERE maduro', () => {
    const r = julgarVistas({
      vistas: ['sol'],
      antes: { sol: U('a4fbf427778a') },
      depois: { sol: [...U('0000deadbeef'), ...U('0000deadbeef'), ...U('0000deadbeef')] },
    });
    expect(r.linhas[0].veredito).toBe('DIFERE');
    expect(r.resumo).toContain('NÃO é bit-idêntico');
  });

  it('lado misto (pinada ×2 contra ×1 do outro lado) compara sem cerimônia', () => {
    const r = julgarVistas({
      vistas: ['saturno-anel'],
      antes: { 'saturno-anel': H('1cc87d169e7b') },
      depois: { 'saturno-anel': U('1cc87d169e7b') },
    });
    expect(r.linhas[0].veredito).toBe('IGUAL');
  });
});

// O CARIMBO DE ÁRVORE (F2 do item 113): conteúdo, não commit. A invariância
// que importa — mesmo conteúdo antes e depois de `git add`/commit — está
// provada no ritual do próprio juiz (a prova do carimbo); aqui fica o que um
// teste puro alcança sem tocar no repositório: determinismo e formato.
describe('carimboDoCodigo', () => {
  it('é determinístico dentro do mesmo estado e tem formato arv-<12 hex> (ou sem-git)', () => {
    const a = carimboDoCodigo();
    expect(a).toMatch(/^(arv-[0-9a-f]{12}|sem-git)$/);
    expect(carimboDoCodigo()).toBe(a);
  });
});
