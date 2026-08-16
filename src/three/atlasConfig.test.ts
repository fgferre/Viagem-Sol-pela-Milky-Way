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
import {
  CAMADAS,
  CAMADAS_DO_ATLAS,
  CORPOS_DO_SISTEMA,
  LUAS_DO_SISTEMA,
  ANOES_DO_SISTEMA,
  ASTEROIDES_DO_SISTEMA,
  NOMES_DOS_CORPOS,
  NOME_DO_SISTEMA,
  tituloDeCorpo,
} from './atlasConfig';

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
      // era 'nohero' até o M2 — a chave passou a desligar a camada do
      // clarão de asas, e o nome acompanhou o que ela desliga
      'noclarao',
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

// ============================================================
// F2b (emenda P-E10b): UMA fonte de nome pt-BR. A tabela
// `NOMES_DOS_CORPOS` é espelho declarado do `i18n.pt` de
// `public/data/atlas/corpos.json` com o case tratado — e este teste é o
// que impede as duas fontes de divergirem em silêncio: todo corpo
// buscável tem nome IGUAL ao título-caso do JSON real.
// ============================================================
describe('a fonte única de nomes pt-BR (F2b, P-E10b)', () => {
  interface CorposJson {
    corpos: { id: string; name: { pt?: string } }[];
  }
  const json = JSON.parse(
    readFileSync(
      new URL('../../public/data/atlas/corpos.json', import.meta.url),
      'utf8'
    )
  ) as CorposJson;
  const ptPorId = new Map(json.corpos.map((c) => [c.id, c.name.pt]));

  it('o título-caso trata o pt-BR de verdade — LUA→Lua, TITÃ→Titã, MERCÚRIO→Mercúrio', () => {
    expect(tituloDeCorpo('LUA')).toBe('Lua');
    expect(tituloDeCorpo('TITÃ')).toBe('Titã');
    expect(tituloDeCorpo('MERCÚRIO')).toBe('Mercúrio');
    expect(tituloDeCorpo('JÚPITER')).toBe('Júpiter');
  });

  it('TODA entrada da tabela converge com o corpos.json (case tratado)', () => {
    for (const [id, entrada] of Object.entries(NOMES_DOS_CORPOS)) {
      const pt = ptPorId.get(id);
      expect(pt, `corpos.json sem i18n.pt para '${id}'`).toBeTruthy();
      expect(entrada.nome, `nome divergente para '${id}'`).toBe(tituloDeCorpo(pt!));
    }
  });

  it('completude: todo corpo BUSCÁVEL (os dez + as luas) tem nome e classe', () => {
    for (const c of [
      ...CORPOS_DO_SISTEMA,
      ...LUAS_DO_SISTEMA,
      ...ANOES_DO_SISTEMA,
      ...ASTEROIDES_DO_SISTEMA,
    ]) {
      expect(c.nome, `'${c.id}' sem nome`).toBeTruthy();
      expect(c.classe, `'${c.id}' sem classe`).toBeTruthy();
      expect(NOMES_DOS_CORPOS[c.id], `'${c.id}' fora da fonte única`).toBeTruthy();
    }
  });

  it('toda lua declara o pai — é dele que a nota mede e que o degrau enquadra', () => {
    // F5: as 17 texturadas entram pelo mesmo contrato das marcianas
    expect(LUAS_DO_SISTEMA).toHaveLength(21);
    expect(LUAS_DO_SISTEMA[0]).toMatchObject({ id: 'moon', nome: 'Lua', classe: 'lua', pai: 'earth' });
    expect(LUAS_DO_SISTEMA[1]).toMatchObject({ id: 'phobos', nome: 'Fobos', classe: 'lua', pai: 'mars' });
    expect(LUAS_DO_SISTEMA[2]).toMatchObject({ id: 'deimos', nome: 'Deimos', classe: 'lua', pai: 'mars' });
    expect(LUAS_DO_SISTEMA.find((l) => l.id === 'titan')).toMatchObject({
      nome: 'Titã',
      classe: 'lua',
      pai: 'saturn',
    });
    expect(LUAS_DO_SISTEMA.find((l) => l.id === 'europa')).toMatchObject({
      nome: 'Europa',
      classe: 'lua',
      pai: 'jupiter',
    });
    expect(LUAS_DO_SISTEMA.some((l) => l.id === 'vanth')).toBe(false);
    expect(LUAS_DO_SISTEMA.some((l) => l.id === 'weywot')).toBe(false);
    // e lua NÃO entra na lista indexada ao vértice da camada de pontos
    expect(CORPOS_DO_SISTEMA.some((c) => c.id === 'moon')).toBe(false);
    expect(CORPOS_DO_SISTEMA.some((c) => c.id === 'phobos')).toBe(false);
    expect(CORPOS_DO_SISTEMA.some((c) => c.id === 'titan')).toBe(false);
    expect(LUAS_DO_SISTEMA.find((l) => l.id === 'charon')).toMatchObject({
      nome: 'Caronte',
      pai: 'pluto',
    });
  });

  it('os anões da F6 são buscáveis e não são lua nem vértice', () => {
    expect(ANOES_DO_SISTEMA.map((a) => a.id)).toEqual([
      'ceres',
      'haumea',
      'makemake',
      'eris',
      'quaoar',
    ]);
    for (const a of ANOES_DO_SISTEMA) {
      expect(a.classe).toBe('planeta anão');
      expect(CORPOS_DO_SISTEMA.some((c) => c.id === a.id)).toBe(false);
      expect(LUAS_DO_SISTEMA.some((l) => l.id === a.id)).toBe(false);
    }
  });

  it('os asteroides da F7 são buscáveis pelo nome pt-BR e não são lua nem vértice', () => {
    expect(ASTEROIDES_DO_SISTEMA.map((a) => a.id)).toEqual([
      'vesta',
      'pallas',
      'hygiea',
    ]);
    expect(ASTEROIDES_DO_SISTEMA.map((a) => a.nome)).toEqual([
      'Vesta',
      'Palas',
      'Hígia',
    ]);
    for (const a of ASTEROIDES_DO_SISTEMA) {
      expect(a.classe).toBe('asteroide');
      expect(CORPOS_DO_SISTEMA.some((c) => c.id === a.id)).toBe(false);
      expect(LUAS_DO_SISTEMA.some((l) => l.id === a.id)).toBe(false);
      expect(ANOES_DO_SISTEMA.some((n) => n.id === a.id)).toBe(false);
    }
  });
});
