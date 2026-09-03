// Serve: chão — a faixa de guarda do campo e a porta ?nobloom continuam com o tamanho e o alcance que a auditoria mediu depois do buraco
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
import * as THREE from 'three';
import { AMOSTRAS_DO_ALVO, AMOSTRAS_POR_TIER, MARGEM_DO_CAMPO, criarSomaComRecorte } from './post';

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
  // AQUI NÃO SE VARRE TEXTO, e a razão é uma auditoria: a guarda anterior
  // era `expect(post).toMatch(/premultipliedAlpha: true/)`, e a sabotagem
  // `premultipliedAlpha: false // outrora premultipliedAlpha: true` PASSAVA
  // — a palavra seguia no arquivo, dentro de um comentário. Material do
  // three é objeto de CPU pura: dá para fabricar o MESMO que o passe usa e
  // perguntar a ele.
  const soma = criarSomaComRecorte();

  it('é PREMULTIPLICADA — sem isso o céu sai 28% mais escuro', () => {
    // A REVERSÃO EXATA: sem a flag o aditivo do three vira
    // `blendFunc(SRC_ALPHA, ONE)` e a cor entra MULTIPLICADA pelo alpha do
    // composite, que quase nunca vale 1. Medido na vista `fov-0` do MB1:
    // luz média do quadro 10,17 contra 14,10 bytes. E o MB1 APLAUDIA — um
    // cobertor mais fraco também tem menos pedestal para perder na borda —,
    // que é a lição mais cara desta etapa: **céu mais escuro parece
    // melhoria para um juiz de estabilidade**. Esta é a guarda.
    expect(soma.premultipliedAlpha).toBe(true);
  });

  it('e o resto do blend é o do `blendMaterial` que ela substituiu', () => {
    // a flag sozinha não diz nada: `premultipliedAlpha` só muda o
    // `blendFunc` de um material ADITIVO e TRANSPARENTE. Trocar o blending
    // apagaria a soma inteira com a flag intacta.
    expect(soma.blending).toBe(THREE.AdditiveBlending);
    expect(soma.transparent).toBe(true);
    expect(soma.depthTest).toBe(false);
    expect(soma.depthWrite).toBe(false);
  });
});

describe('o MSAA do alvo da cena (item 120, F1 · L6; resolvido uma vez desde o 144)', () => {
  it('são QUATRO amostras — o número da referência e o teto da placa', () => {
    // O literal deles (`{samples: 4}`, offset 261 634 do bundle) é também
    // o `MAX_SAMPLES` medido no ANGLE/Metal do M1: pedir 8 seria pedir 4
    // com outro nome.
    expect(AMOSTRAS_DO_ALVO).toBe(4);
  });

  it('a escada de tiers decide, e `performance` leva DUAS amostras', () => {
    // DUAS REVERSÕES DE UMA VEZ, e as duas foram fotografadas antes de o
    // número ser escolhido:
    //   · quatro em TODO tier — a tentadora. O preço está medido nesta
    //     máquina, +51% a +54% de tempo de quadro em dpr 2, e
    //     `performance` é justamente o tier de quem pediu para pagar
    //     menos (por `?q=` ou por auto-degradação abaixo de 34 fps).
    //   · ZERO em `performance` — o que esta obra entregou primeiro. Ali
    //     a fita vira UM pixel de dispositivo duro (FWHM 1,121 px) e o
    //     zoom mostra a escada que o item 83 nasceu para matar. Duas
    //     amostras devolvem FWHM 1,793 por +3,5 ms/quadro.
    expect(AMOSTRAS_POR_TIER.cinema).toBe(AMOSTRAS_DO_ALVO);
    expect(AMOSTRAS_POR_TIER.alta).toBe(AMOSTRAS_DO_ALVO);
    expect(AMOSTRAS_POR_TIER.performance).toBe(2);
    // e ela é MENOR que a dos outros dois: um `performance` que pagasse o
    // mesmo que o `cinema` não seria mais o tier barato
    expect(AMOSTRAS_POR_TIER.performance).toBeLessThan(AMOSTRAS_DO_ALVO);
    // ...e MAIOR que zero: sem amostra nenhuma volta a escada
    expect(AMOSTRAS_POR_TIER.performance).toBeGreaterThan(0);
  });

  it('as amostras vão para o alvo PRÓPRIO da cena, não para o renderer nem para o composer', () => {
    // A REVERSÃO INERTE, e ela já custou uma medição inteira em 31/08:
    // `antialias: true` no renderer governa só o framebuffer do CANVAS,
    // que neste app recebe um quad de tela cheia. Quem rasteriza a cena
    // 3D é o alvo da `CenaResolvidaUmaVez`.
    const classe = post.slice(post.indexOf('class CenaResolvidaUmaVez'));
    const corpo = classe.slice(0, classe.indexOf('\nexport class Post'));
    expect(corpo).toMatch(/samples: amostras/);
    const engine = readFileSync(new URL('./engine.ts', import.meta.url), 'utf8');
    expect(engine, 'o AA voltou para o renderer, onde é inerte')
      .toMatch(/antialias: false/);
    // E A REVERSÃO CARA (item 144): amostras no buffer do composer fazem
    // o three resolver o alvo de 15 MP a cada passe que escreve nele —
    // três resolves a mais por quadro, 37% do quadro em cinema Retina.
    expect(post, 'as amostras voltaram para o buffer do composer').not.toMatch(
      /renderTarget1\.samples/
    );
  });

  it('a troca de tier DISPÕE o alvo — senão ela não vale nada', () => {
    // A SABOTAGEM SILENCIOSA: escrever `rt.samples = n` e parar aí. O
    // three só lê `samples` em `setupRenderTarget`, e essa só roda quando
    // o alvo não tem framebuffer — sem o `dispose()` o campo muda e o
    // pixel não.
    const metodo = post.slice(post.indexOf('aplicarAmostras(tier'));
    const corpo = metodo.slice(0, metodo.indexOf('\n  }'));
    expect(corpo).toMatch(/rt\.samples = alvo/);
    expect(corpo).toMatch(/rt\.dispose\(\)/);
    // e o director tem de CHAMAR o método, nos dois caminhos: a troca
    // viva e a semeadura inicial (o engine aplica a qualidade no próprio
    // construtor, antes de os ouvintes existirem)
    expect(director.match(/this\.post\.aplicarAmostras\(/g) ?? []).toHaveLength(2);
    // E O CONTROLE VIVO DO PAINEL (item 145) reaplica PELO MESMO
    // caminho: um `rt.samples = n` escrito dentro de `forcarAmostras`
    // seria a mesma sabotagem silenciosa com outro nome — e o override
    // mora DENTRO do Post, então o director continua com duas chamadas.
    const forcar = post.slice(post.indexOf('forcarAmostras(amostras'));
    const corpoForcar = forcar.slice(0, forcar.indexOf('\n  }'));
    expect(corpoForcar).toMatch(/this\.aplicarAmostras\(this\.tierDasAmostras\)/);
    expect(corpoForcar).not.toMatch(/samples\s*=/);
  });

  it('a cena resolve UMA vez: desenha no alvo próprio e copia para o buffer liso', () => {
    // A SABOTAGEM ÓBVIA: renderizar a cena direto no `readBuffer` (o
    // `RenderPass` de addons) e deixar o alvo multiamostrado ocioso —
    // o pixel perde o MSAA e ninguém vê no md5 de uma vista sem fita.
    const classe = post.slice(post.indexOf('class CenaResolvidaUmaVez'));
    const corpo = classe.slice(0, classe.indexOf('\nexport class Post'));
    const alvo = corpo.indexOf('renderer.setRenderTarget(this.alvo)');
    const cena = corpo.indexOf('renderer.render(this.cena, this.camera)');
    const copia = corpo.indexOf('renderer.setRenderTarget(readBuffer)');
    expect(alvo).toBeGreaterThan(-1);
    expect(cena).toBeGreaterThan(alvo);
    expect(copia).toBeGreaterThan(cena);
    // o resultado fica no `readBuffer`: sem `needsSwap = false` o passe
    // seguinte leria o buffer errado
    expect(corpo).toMatch(/this\.needsSwap = false/);
    // e os buffers do composer nascem SEM profundidade: a cena não
    // rasteriza mais neles
    expect(post).toMatch(/depthBuffer: false,\n\s*\}\)\n\s*\);\n/);
  });

  it('o resolve cai DIRETO na textura do renderTarget1 — sem cópia, e o grampo garante o leitor', () => {
    // A REVERSÃO CARA, medida em A/B alternado: copiar o alvo resolvido
    // com um quad de tela cheia custava −15% em 1200×900 Retina. A
    // textura é compartilhada, e o grampo fixa o `readBuffer` em
    // `renderTarget1` para o passe seguinte ler onde o resolve caiu.
    const classe = post.slice(post.indexOf('class CenaResolvidaUmaVez'));
    const corpo = classe.slice(0, classe.indexOf('\nexport class Post'));
    expect(corpo).toMatch(/this\.alvo\.texture = destino\.texture/);
    expect(corpo).toMatch(/resolveDepthBuffer: false/);
    // e o alvo segue o TAMANHO do destino a cada quadro (item 146): com
    // a textura compartilhada, alvo de 5120×3200 num destino de
    // 2560×1600 era framebuffer inválido — cena sumida, lençol cinza
    const corpoRender = corpo.slice(corpo.indexOf('render(\n'));
    expect(corpoRender.indexOf('this.sincronizar()')).toBeGreaterThan(-1);
    expect(corpoRender.indexOf('this.sincronizar()')).toBeLessThan(
      corpoRender.indexOf('renderer.render(this.cena')
    );
    // e quem dispõe o destino dispõe o alvo
    expect(corpo).toMatch(/destino\.addEventListener\('dispose'/);
    const metodo = post.slice(post.indexOf('render(time: number)'));
    const render = metodo.slice(0, metodo.indexOf('\n  }'));
    expect(render).toMatch(/readBuffer = this\.composer\.renderTarget1/);
    expect(render.indexOf('renderTarget1')).toBeLessThan(render.indexOf('composer.render()'));
    // e trocar as amostras dispõe os DOIS alvos — dispor só o da cena
    // apaga a textura de GL que o framebuffer do composer ainda aponta
    const amostras = post.slice(post.indexOf('aplicarAmostras(tier'));
    const corpoAmostras = amostras.slice(0, amostras.indexOf('\n  }'));
    expect(corpoAmostras).toMatch(/this\.composer\.renderTarget1\.dispose\(\)/);
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
