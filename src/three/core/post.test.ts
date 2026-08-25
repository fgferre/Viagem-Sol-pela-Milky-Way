// ============================================================
// AS DUAS GUARDAS DO PÓS — a faixa de guarda do campo (item 70) e a porta
// `?nobloom` (item 72).
//
// POR QUE ELE EXISTE, e a data é 25/08: as duas peças entraram na main SEM
// guarda nenhuma. A auditoria da etapa mediu o buraco com as reversões
// exatas — pôr `MARGEM_DO_CAMPO` de volta em 0, e devolver o segundo passe
// ao mundo dos vivos sob `?nobloom=1` — e as duas sabotagens passavam
// 2.254 de 2.254 testes. Conserto sem guarda é conserto que volta.
//
// A VARREDURA DE TEXTO é o idioma da casa para o que não roda sem GPU (o
// molde é `luzDaCasa.test.ts`): `Post` só se instancia com um
// `WebGLRenderer`, e um teste que precisa de GPU não é teste que roda no
// gate. O que se cobra aqui é o CONTRATO escrito no arquivo — que é
// exatamente o que as reversões da auditoria apagam.
// ============================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { MARGEM_DO_CAMPO } from './post';

const post = readFileSync(new URL('./post.ts', import.meta.url), 'utf8');
const director = readFileSync(new URL('../director.ts', import.meta.url), 'utf8');

describe('a faixa de guarda do cobertor do campo (item 70)', () => {
  it('é MAIOR QUE ZERO — em zero o céu volta a apagar num passo de câmera', () => {
    // A REVERSÃO EXATA DA AUDITORIA. Medido na família `fov` do MB1, quadro
    // 1128×1080: com margem 0 o resíduo do passo 5 é 3,80 degraus contra o
    // teto de 0,34 + 2,00, e a luz do quadro cai 27,0% num passo só. Com
    // 128 o resíduo é 0,44 e a queda é 2,1%.
    expect(MARGEM_DO_CAMPO).toBeGreaterThan(0);
  });

  it('é MÚLTIPLO DE 32 — a pirâmide tem cinco mips e o mais grosso vive a 1/32', () => {
    // Não é gosto: margem fora do múltiplo desalinha a grade de texels de
    // algum nível contra a grade do quadro, e o INTERIOR — que este
    // conserto não quer mexer — passaria a se reamostrar sozinho.
    expect(MARGEM_DO_CAMPO % 32).toBe(0);
  });

  it('vale 128, que é o joelho medido da varredura', () => {
    // 0 → 3,80 · 32 → 2,14 · 64 → 2,84 · 96 → 0,85 · 128 → 0,51 · 192 →
    // 0,57 · 256 → 0,53 (pior resíduo da família `fov`, teto 2,34). De 96
    // para cima a curva assenta e 192/256 não compram nada; o preço é área
    // do passe mais caro do quadro, então o joelho é o número.
    expect(MARGEM_DO_CAMPO).toBe(128);
  });

  it('o rascunho é dimensionado COM a margem nos dois eixos', () => {
    // sem isto a faixa existe na constante e não no buffer
    expect(post).toMatch(/larguraCss \+ 2 \* MARGEM_DO_CAMPO/);
    expect(post).toMatch(/alturaCss \+ 2 \* MARGEM_DO_CAMPO/);
  });

  it('a câmera do rascunho é uma CÓPIA — a do app não sai deste passe mexida', () => {
    // `setViewOffset` reescreve `camera.aspect` e `clearViewOffset` não o
    // devolve. A cópia é o que impede o passe de depender da coincidência
    // de o quadro ser a janela.
    expect(post).toMatch(/larga\.copy\(camera, false\)/);
    expect(post).not.toMatch(/\n\s*camera\.setViewOffset\(/);
  });
});

describe('a soma com recorte (a armadilha do premultiplied)', () => {
  it('é PREMULTIPLICADA — sem isso o céu sai 28% mais escuro', () => {
    // A REVERSÃO EXATA: sem a flag o aditivo do three vira
    // `blendFunc(SRC_ALPHA, ONE)` e a cor entra MULTIPLICADA pelo alpha do
    // composite, que quase nunca vale 1. Medido na vista `fov-0` do MB1:
    // luz média do quadro 10,17 contra 14,10 bytes. E o MB1 APLAUDIA — um
    // cobertor mais fraco também tem menos pedestal para perder na borda —,
    // que é a lição mais cara desta etapa: **céu mais escuro parece
    // melhoria para um juiz de estabilidade**. Esta linha é a guarda.
    expect(post).toMatch(/premultipliedAlpha: true/);
  });
});

describe('a porta `?nobloom=1` (item 72)', () => {
  it('o director apaga OS DOIS cobertores, não só o principal', () => {
    // A REVERSÃO EXATA DA AUDITORIA: devolver `this.post.bloom.enabled =
    // false` no lugar de `bloomLigado`. Até 25/08 a porta mudava 0,49% da
    // luz do quadro (o cobertor do campo seguia inteiro); agora muda 31,4%.
    expect(director).toMatch(/this\.post\.bloomLigado = false/);
    expect(director).not.toMatch(/this\.post\.bloom\.enabled = false/);
  });

  it('`bloomLigado` alcança o passe do campo, e não só o da lei', () => {
    // A OUTRA REVERSÃO: tirar o `claraoDoCampo` do setter deixa a porta
    // mentindo de novo, com o director inocente.
    const setter = post.slice(post.indexOf('set bloomLigado'));
    const corpo = setter.slice(0, setter.indexOf('\n  }'));
    expect(corpo).toMatch(/this\.bloom\.enabled = ligado/);
    expect(corpo).toMatch(/this\.claraoDoCampo\.enabled = ligado/);
  });
});
