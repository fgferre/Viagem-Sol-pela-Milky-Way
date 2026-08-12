// ============================================================
// O CONFIG ÚNICO existe para não haver duas listas de camadas. Estes
// testes cobram exatamente isso: que a gaveta do Atlas seja um RECORTE
// da tabela da casa (nunca uma segunda lista), que o recorte seja o
// declarado em D6, e que nenhuma flag oferecida na UI seja flag que o
// Director não conhece — oferecer um controle que não controla nada é a
// forma mais barata de a UI mentir.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAMADAS, CAMADAS_DO_ATLAS, NOME_DO_SISTEMA } from './atlasConfig';

const DIRECTOR = readFileSync(new URL('./director.ts', import.meta.url), 'utf8');
const GALAXY = readFileSync(new URL('./world/galaxy.ts', import.meta.url), 'utf8');

describe('a tabela de camadas da casa', () => {
  it('não repete flag — duas linhas com a mesma flag seriam dois donos', () => {
    const flags = CAMADAS.map((c) => c.flag);
    expect(new Set(flags).size).toBe(flags.length);
  });

  it('toda flag oferecida é flag que ALGUÉM lê por quadro', () => {
    for (const c of CAMADAS) {
      const lida =
        DIRECTOR.includes(`this.hide.has('${c.flag}')`) ||
        DIRECTOR.includes(`this.debug.has('${c.flag}')`) ||
        // as três da galáxia são lidas LÁ: o boot semeia por `Galaxy.dbg`
        // e a troca viva entra pelo setter que o Director roteia
        GALAXY.includes(`'${c.flag}'`);
      expect(lida, `${c.flag} não é lida por ninguém`).toBe(true);
    }
  });

  it('as TREZE trocam ao vivo — nenhuma opção do painel recarrega a página', () => {
    // A régua do dono: nenhuma opção do painel de Ajustes recarrega. As
    // três da galáxia (nodisc/nogdust/noglow) recarregavam por um
    // comentário podre — `bakeDiscLayers` roda inteiro de qualquer
    // jeito. Quem marcar uma camada como `viva: false` quebra aqui e
    // vai ter de provar que o mundo precisa MESMO ser reconstruído.
    // A 13ª é `nocorpos`, o palco local da Onda 6 (F0).
    expect(CAMADAS.length).toBe(13);
    expect(CAMADAS.filter((c) => !c.viva)).toEqual([]);
  });
});

describe('a gaveta do Atlas', () => {
  it('oferece as cinco de D6 + a do palco (Onda 6) — e as galácticas ficam de fora', () => {
    expect(CAMADAS_DO_ATLAS.map((c) => c.flag)).toEqual([
      'nocat',
      'nohero',
      'nomarker',
      'noplan',
      'nocorpos',
      'nobh',
    ]);
    for (const galactica of ['nogal', 'nodisc', 'nogdust', 'noglow', 'nowrap', 'nocart']) {
      expect(CAMADAS_DO_ATLAS.some((c) => c.flag === galactica)).toBe(false);
    }
  });

  it('é RECORTE da tabela da casa, não uma segunda lista', () => {
    for (const c of CAMADAS_DO_ATLAS) {
      expect(CAMADAS).toContain(c);
    }
  });

  it('toda camada da gaveta troca AO VIVO', () => {
    // uma gaveta que recarrega a página tiraria o visitante do modo —
    // e o Atlas é um lugar onde se está, não uma tela de configuração
    for (const c of CAMADAS_DO_ATLAS) expect(c.viva).toBe(true);
  });

  it('cada uma tem ícone e rótulo em pt-BR', () => {
    for (const c of CAMADAS_DO_ATLAS) {
      expect(c.icone && c.icone.length).toBeGreaterThan(0);
      expect(c.nome.length).toBeGreaterThan(2);
    }
  });
});

describe('o nome do enquadramento de abertura', () => {
  it('é o do SISTEMA, não o do Sol — a ContextLine não chuta', () => {
    // o alvo de abertura é a órbita mais externa do retrato: o que
    // aparece é o sistema inteiro visto de fora, e é isso que se lê
    expect(NOME_DO_SISTEMA).toBe('Sistema solar');
  });
});
