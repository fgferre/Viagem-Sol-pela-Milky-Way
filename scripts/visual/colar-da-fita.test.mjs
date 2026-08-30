// Serve: chão — o pente do colar reprova quando falta qualquer um dos três termos (grupos, vão de junta, relógio parado) e não confunde curva com junta
// ============================================================
// O JUIZ DO JUIZ DO COLAR — perfis montados à mão, com a resposta ao
// lado, para que a lei do pente não possa mudar em silêncio.
//
// O QUE ESTE ARQUIVO PROTEGE: o veredito de `colar-da-fita.mjs` é uma
// CONJUNÇÃO de três termos (grupos demais, vão de junta, vão regular), e
// conjunção é justamente o que se afrouxa sem ninguém ver. Cada `it`
// abaixo mata UM termo e cobra que o veredito vire.
//
// Os perfis são `Float32Array`, o mesmo tipo que `perfilDaFita` devolve:
// assim a conta esperada é aritmética exata, e não refém do
// arredondamento do cinza de um PNG.
// ============================================================
import { describe, expect, it } from 'vitest';
import {
  DIAS_A_ANDAR,
  FAIXA,
  MARGEM_DA_CONTA,
  MIN_DE_GRUPOS,
  PASSO_MAX,
  julgarColar,
  julgarORelogio,
  pentearOColar,
  perfilDaFita,
} from './colar-da-fita.mjs';

/**
 * Um perfil de fita: corpo chapado com contas de `+altura` a cada
 * `passo` colunas, cada conta com `largura` colunas — o desenho medido
 * na tela (a junta rende ~2 colunas, não uma).
 */
function fitaComContas({
  colunas = 340, corpo = 154, altura = 26, passo = 18, largura = 2, jitter = 0,
} = {}) {
  const p = new Float32Array(colunas).fill(corpo);
  let x = 5;
  let k = 0;
  while (x + largura < colunas) {
    for (let i = 0; i < largura; i++) p[x + i] = corpo + altura;
    // o jitter desloca a k-ésima conta de um passo variável — é como o
    // serrilhado de uma curva se comporta, e é o que o pente NÃO é
    x += passo + (jitter ? ((k * 7) % (2 * jitter + 1)) - jitter : 0);
    k++;
  }
  return p;
}

describe('o perfil sai do recorte', () => {
  it('é o PICO da coluna, não a média — a fita é fina sobre céu escuro', () => {
    // 4 colunas × 3 linhas; a fita mora na linha do meio de duas delas
    const cinza = new Float32Array([
      0, 0, 0, 0,
      0, 200, 0, 180,
      0, 0, 0, 0,
    ]);
    const perfil = perfilDaFita(cinza, 4, { x: 0, y: 0, w: 4, h: 3 });
    expect(Array.from(perfil)).toEqual([0, 200, 0, 180]);
  });

  it('lê SÓ o recorte pedido', () => {
    const cinza = new Float32Array([
      9, 9, 9, 9,
      9, 1, 2, 9,
      9, 9, 9, 9,
    ]);
    const perfil = perfilDaFita(cinza, 4, { x: 1, y: 1, w: 2, h: 1 });
    expect(Array.from(perfil)).toEqual([1, 2]);
  });

  it('a faixa oficial tem as 340 colunas do item 83', () => {
    // PINO DE CONFIGURAÇÃO, e é só isso: ele congela o número que deixa a
    // medida deste juiz comparável com a de 24/08 sem conversão. O
    // COMPORTAMENTO — a fita estar mesmo dentro da faixa — não se afere
    // aqui e nem tem como: quem o mede é o juiz de imagem sobre o quadro
    // vivo, fora da suíte, e ele REPROVA quando a fita sai do recorte.
    expect(FAIXA.w).toBe(340);
  });
});

describe('o dente do relógio', () => {
  // Este é o único termo do veredito que não mora no pixel: ele protege a
  // FOTO, não a fita. Sem ele, um gancho que parasse de disparar devolvia
  // aprovação sobre cena parada.
  it('REPROVA quando o relógio não foi medido — silêncio não é aprovação', () => {
    expect(julgarORelogio(null).ok).toBe(false);
    expect(julgarORelogio(undefined).ok).toBe(false);
    expect(julgarORelogio(null).motivo).toMatch(/PARADA/);
  });

  it('REPROVA quando o relógio não saiu do lugar', () => {
    expect(julgarORelogio({ diasAndados: 0, quadrosNaAndada: 137 }).ok).toBe(false);
    expect(julgarORelogio({ diasAndados: -3, quadrosNaAndada: 137 }).ok).toBe(false);
  });

  it('REPROVA quando o relógio andou mas NADA foi desenhado', () => {
    // o eco do mesmo defeito por outra porta: `quadrosNaAndada` sai de
    // `window.__f`, e um `|| 0` calado o devolveria zerado se o contador
    // sumisse — o `jd` teria andado na CPU sem nenhuma tela pintada com
    // ele, que é de novo a foto de cena parada.
    const v = julgarORelogio({ diasAndados: DIAS_A_ANDAR, quadrosNaAndada: 0 });
    expect(v.ok).toBe(false);
    expect(v.motivo).toMatch(/nada foi desenhado/);
    expect(julgarORelogio({ diasAndados: DIAS_A_ANDAR }).ok).toBe(false);
  });

  it('APROVA quando andou E desenhou', () => {
    expect(julgarORelogio({ diasAndados: DIAS_A_ANDAR, quadrosNaAndada: 137 }).ok).toBe(true);
    expect(julgarORelogio({ diasAndados: 0.001, quadrosNaAndada: 1 }).ok).toBe(true);
  });

  it('a andada é contada em DIAS DE EFEMÉRIDE, não em segundos dormidos', () => {
    // PINO DE CONFIGURAÇÃO, e o que ele prende é a UNIDADE da andada. Quem
    // mede a reprodutibilidade de verdade não é este `expect`: são DUAS
    // CORRIDAS SEGUIDAS do juiz devolvendo corpo, piso, limiar, contas,
    // grupos e vão IGUAIS — feito em 26/08, com o resíduo do pouso (0,0046
    // contra 0,0022 dia) como única diferença. Dormir relógio de parede
    // fazia a efeméride variar com a carga (34,1 / 33,6 / 31,2 dias na
    // mesma casa, 21,4 na de um auditor) e levava o corpo da fita junto.
    expect(DIAS_A_ANDAR).toBeGreaterThan(0);
  });
});

describe('o pente', () => {
  it('acha as contas, os grupos e o vão de uma fita com colar', () => {
    const m = pentearOColar(fitaComContas());
    expect(m.corpo).toBe(154);
    expect(m.limiar).toBe(154 + MARGEM_DA_CONTA);
    expect(m.grupos).toBe(19);
    expect(m.contas).toBe(38); // 19 grupos × 2 colunas
    expect(m.vaoMediano).toBe(18);
    expect(m.regulares).toBe(1);
  });

  it('conta a partir do CORPO, não de um nível absoluto — a mesma fita, mais escura', () => {
    const clara = pentearOColar(fitaComContas({ corpo: 204 }));
    const escura = pentearOColar(fitaComContas({ corpo: 60 }));
    expect(escura.grupos).toBe(clara.grupos);
    expect(escura.vaoMediano).toBe(clara.vaoMediano);
  });

  it('uma conta que só encosta na margem não conta', () => {
    const m = pentearOColar(fitaComContas({ altura: MARGEM_DA_CONTA - 1 }));
    expect(m.contas).toBe(0);
    expect(m.grupos).toBe(0);
  });
});

describe('o veredito', () => {
  const sadia = () => pentearOColar(new Float32Array(340).fill(154));

  it('REPROVA a fita com colar', () => {
    const v = julgarColar(pentearOColar(fitaComContas()));
    expect(v.colar).toBe(true);
    expect(v.aprovado).toBe(false);
    expect(v.motivo).toMatch(/COLAR/);
  });

  it('APROVA a fita chapada', () => {
    const v = julgarColar(sadia());
    expect(v.colar).toBe(false);
    expect(v.aprovado).toBe(true);
  });

  it('APROVA o serrilhado: contas na mesma altura, mas de passo VARIÁVEL', () => {
    // é o termo que separa a junta da curva, e o item 83 o nomeia: o
    // passo do serrilhado é variável, o da junta é rigorosamente
    // constante. Sem ele, toda curva desenhada reprovaria.
    const v = julgarColar(pentearOColar(fitaComContas({ jitter: 5 })));
    expect(v.regulares).toBeLessThan(0.7);
    expect(v.aprovado).toBe(true);
  });

  it('APROVA poucas contas: um planeta no recorte não é colar', () => {
    const p = new Float32Array(340).fill(154);
    for (let i = 100; i < 110; i++) p[i] = 240;
    const v = julgarColar(pentearOColar(p));
    expect(v.grupos).toBeLessThan(MIN_DE_GRUPOS);
    expect(v.aprovado).toBe(true);
  });

  it('APROVA um pente largo demais para ser junta', () => {
    const v = julgarColar(pentearOColar(fitaComContas({ passo: PASSO_MAX + 10 })));
    expect(v.vaoMediano).toBeGreaterThan(PASSO_MAX);
    expect(v.aprovado).toBe(true);
  });

  it('REPROVA quando não há fita no recorte — não avisa, reprova', () => {
    const v = julgarColar(pentearOColar(new Float32Array(340).fill(3)));
    expect(v.aprovado).toBe(false);
    expect(v.colar).toBe(false);
    expect(v.motivo).toMatch(/sem fita/);
  });

  it('REPROVA quando a fita SAI do recorte no meio da faixa', () => {
    const p = fitaComContas();
    for (let i = 200; i < 240; i++) p[i] = 10; // a fita escapou da faixa
    const v = julgarColar(pentearOColar(p));
    expect(v.aprovado).toBe(false);
    expect(v.motivo).toMatch(/sai do recorte/);
  });
});
