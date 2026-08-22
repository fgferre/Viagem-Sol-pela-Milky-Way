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
  QUALIDADES,
  rotuloDaQualidade,
  tituloDeCorpo,
} from './atlasConfig';
import { TIER_DE_PRODUTO, lerPortaQualidade, tierMedido } from './core/engine';

const DIRECTOR = readFileSync(new URL('./director.ts', import.meta.url), 'utf8');
const GALAXY = readFileSync(new URL('./world/galaxy.ts', import.meta.url), 'utf8');
// o leitor por quadro do `nosun` mudou de casa no corte 8 da onda da
// arquitetura: o gate do Sol vive no módulo, não na fachada
const SOL_NO_QUADRO = readFileSync(
  new URL('./director/solNoQuadro.ts', import.meta.url),
  'utf8'
);
// quem escreve a troca de qualidade — a última opção do painel que
// recarregava a página, viva desde os Ajustes C
const ESPELHO = readFileSync(
  new URL('../hooks/useEspelhoDaUrl.ts', import.meta.url),
  'utf8'
);
// os DOIS hospedeiros do seletor de qualidade (Ajustes D) e o medidor
const APP = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const AJUSTES = readFileSync(
  new URL('../components/Ajustes.tsx', import.meta.url),
  'utf8'
);
const ENGINE = readFileSync(new URL('./core/engine.ts', import.meta.url), 'utf8');
const PREFERENCIAS = readFileSync(
  new URL('../lib/preferencias.ts', import.meta.url),
  'utf8'
);
// os quatro corpos do palco: o tier deles é lido na HORA de alocar
const CORPOS = (['terra', 'lua', 'rochoso', 'gigante'] as const).map(
  (nome) =>
    [
      nome,
      readFileSync(new URL(`./world/corpos/${nome}.ts`, import.meta.url), 'utf8'),
    ] as const
);

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
        GALAXY.includes(`'${c.flag}'`) ||
        // o gate do Sol lê pelo fio do módulo (corte 8): `fios.escondido`
        // é o `hide.has` da fachada entregue por função
        SOL_NO_QUADRO.includes(`escondido('${c.flag}')`);
      expect(lida, `${c.flag} não é lida por ninguém`).toBe(true);
    }
  });

  it('TODAS trocam ao vivo — nenhuma opção do painel recarrega a página', () => {
    // A régua do dono: nenhuma opção do painel de Ajustes recarrega. As
    // três da galáxia (nodisc/nogdust/noglow) recarregavam por um
    // comentário podre — `bakeDiscLayers` roda inteiro de qualquer
    // jeito. Quem marcar uma camada como `viva: false` quebra aqui e
    // vai ter de provar que o mundo precisa MESMO ser reconstruído.
    // 17 = as 13 de sempre + as quatro que eram só-URL até o item 33
    // (nosun/nodust/noco/noforge), todas lidas por quadro desde sempre.
    expect(CAMADAS.length).toBe(17);
    expect(CAMADAS.filter((c) => !c.viva)).toEqual([]);
  });

  it('a QUALIDADE também não recarrega — o pedido vai ao Director, não ao browser', () => {
    // A última opção do painel que recarregava. Até 2026-08-20 este
    // caminho era `window.location.assign(url)`: gravava `?q=` e trocava
    // de documento, devolvendo o espectador à tela de título. A letra C
    // dos Ajustes o trocou por um pedido ao Director + o espelho da URL.
    const inicio = ESPELHO.indexOf('const changeQuality = ');
    expect(inicio).toBeGreaterThan(0);
    const corpo = ESPELHO.slice(inicio, ESPELHO.indexOf('\n  };', inicio));
    expect(corpo).toContain('setQuality(escolha)');
    expect(corpo).toContain('window.history.replaceState');
    expect(corpo).not.toContain('location.assign');
  });
});

describe('a troca de tier ao vivo (Ajustes C)', () => {
  it('o pedido de qualidade manda assar um mundo NOVO, não muda só o instrumento', () => {
    const inicio = DIRECTOR.indexOf('  setQuality(escolha: EscolhaDeQualidade) {');
    expect(inicio).toBeGreaterThan(0);
    const corpo = DIRECTOR.slice(inicio, DIRECTOR.indexOf('\n  }', inicio));
    // o instrumento na hora…
    expect(corpo).toContain('this.engine.applyQuality(q)');
    // …e a alocação em segundo plano
    expect(corpo).toContain('this.reassarMundo(q)');
  });

  it('o SWAP é atômico: nenhum `await` entre a troca dos ponteiros e o fim', () => {
    // O contrato inteiro do double-buffer mora nesta ausência. Um único
    // `await` aqui dentro cede a thread ao rAF, e o quadro que ele
    // deixasse passar desenharia meio mundo velho e meio mundo novo —
    // a galáxia nova com o Sol velho, ou o palco novo com o mapa velho.
    const inicio = DIRECTOR.indexOf('// ---- SWAP ATÔMICO');
    const fim = DIRECTOR.indexOf('// ---- fim do swap');
    expect(inicio).toBeGreaterThan(0);
    expect(fim).toBeGreaterThan(inicio);
    expect(DIRECTOR.slice(inicio, fim)).not.toContain('await');
  });

  it('o mundo velho é DESMONTADO inteiro — galáxia, os dois mapas e o Sol', () => {
    const inicio = DIRECTOR.indexOf('// ---- fim do swap');
    const corpo = DIRECTOR.slice(inicio, DIRECTOR.indexOf('\n  }', inicio));
    // as QUATRO peças que a troca realoca. O palco NÃO entra de
    // propósito: os corpos leem o tier na hora de pedir textura, e
    // refazê-los tirava o globo da tela por ~2 s (ver o bloco do swap).
    for (const peca of ['galaxy', 'dustMap', 'structureMap', 'sun']) {
      expect(corpo, `${peca} sobreviveu à troca`).toContain(`passo('${peca}'`);
    }
  });

  it('o corpo do palco lê o tier na HORA de alocar, não no construtor', () => {
    // A regra do NORTE ao pé da letra ("knob que decide alocação lê-se
    // ANTES de quem aloca"): a textura é preguiçosa, então o número que
    // decide o alvo de pixels só faz sentido no instante do pedido.
    for (const [nome, fonte] of CORPOS) {
      expect(fonte, `${nome}: o tier congelou de novo no construtor`).toContain(
        'tier: () => QualityLevel;'
      );
      expect(fonte, `${nome}: o alvo de pixels não lê o tier de agora`).toContain(
        'const tierAgora = tier();'
      );
    }
  });

  it('mundo que não vira tela é DESCARTADO — os três pontos de cancelamento', () => {
    const inicio = DIRECTOR.indexOf('private async reassarMundo(');
    const corpo = DIRECTOR.slice(inicio, DIRECTOR.indexOf('// ---- SWAP ATÔMICO', inicio));
    // um clique num terceiro tier no meio do forno não pode deixar
    // 122,7 MiB de partículas sem dono
    expect(corpo.match(/descartarCarga\(carga\)/g)?.length).toBe(2);
    expect(corpo).toContain('this.mundoAindaVale(geracao)');
  });

  it('Alta → Performance → Alta: o pedido de VOLTA cancela o forno em voo', () => {
    // A CORRIDA MEDIDA EM 21/08, 3 de 3 vezes (100, 250 e 500 ms entre
    // cliques): seletor, URL e `engine.quality` diziam Alta e o mundo era
    // Performance — 1.211.500 pontos de galáxia contra 3.933.500,
    // `nebulaSteps` 44 contra 56, console mudo. E clicar Alta de novo não
    // consertava: para o `setQuality` o tier pedido JÁ era o vivo.
    //
    // A causa era a ORDEM: a guarda `q === this.tierDoMundo` saía antes de
    // qualquer escrita, então o terceiro clique não cancelava nada e o
    // forno de Performance continuava se dando por válido. O que se cobra
    // aqui é essa ordem, porque é ela que quebrou — e três invariantes,
    // cada uma sozinha suficiente para o defeito voltar:
    const inicio = DIRECTOR.indexOf('private async reassarMundo(');
    const corpo = DIRECTOR.slice(inicio, DIRECTOR.indexOf('const carga = await', inicio));

    // 1. o mesmo pedido duas vezes NÃO toma geração nova (o forno em
    //    curso se cancelaria a si mesmo e nada pousaria nunca)
    const mesmoPedido = corpo.indexOf('if (this.trocaPedida === q) return;');
    // 2. a geração nasce ANTES da guarda do tier vivo
    const geracao = corpo.indexOf('const geracao = ++this.geracaoDaTroca;');
    // 3. e a guarda do tier vivo CANCELA em vez de só voltar
    const voltaAoVivo = corpo.indexOf('if (q === this.tierDoMundo) {');
    expect(mesmoPedido).toBeGreaterThan(0);
    expect(geracao).toBeGreaterThan(mesmoPedido);
    expect(voltaAoVivo).toBeGreaterThan(geracao);
    expect(corpo.slice(voltaAoVivo)).toContain('this.trocaPedida = null;');

    // e a régua de validade é a GERAÇÃO, não o tier pedido — era o tier
    // que deixava o mundo do meio do caminho pousar
    const vale = DIRECTOR.slice(DIRECTOR.indexOf('private mundoAindaVale('));
    expect(vale.slice(0, 200)).toContain('geracao === this.geracaoDaTroca');
    expect(vale.slice(0, 200)).not.toContain('this.trocaPedida ===');
  });
});

// ============================================================
// AJUSTES D — O AUTO É O 4º ESTADO, E A FRONTEIRA É POLÍTICA.
//
// A régua do dono, ao pé da letra: *detecção nunca decide; medição
// sugere; o visitante escolhe*. O que se cobra aqui é a fronteira, não
// a estética: nada troca de tier sem escolha, o boot sem `?q=` é uma
// CONSTANTE (nem storage, nem palpite sobre o aparelho), e a sugestão
// da medição é só uma frase enquanto o Auto não for escolhido.
// ============================================================
describe('os quatro estados do seletor (Ajustes D)', () => {
  it('a tabela é a única lista — os dois hospedeiros a leem, ninguém a redigita', () => {
    expect(QUALIDADES.map((q) => q.id)).toEqual([
      'cinema',
      'alta',
      'performance',
      'auto',
    ]);
    // o painel e a barra desenham a MESMA tabela; `<option>` digitado à
    // mão é a segunda lista nascendo (foi assim que ela viveu até aqui)
    expect(AJUSTES).toContain('QUALIDADES.map(');
    expect(APP).toContain('QUALIDADES.map(');
    expect(APP).not.toContain('<option value="cinema">');
    // e cada estado tem nome pt-BR e glifo — o seletor da barra é glifo
    for (const q of QUALIDADES) {
      expect(q.nome.length, `${q.id} sem nome`).toBeGreaterThan(3);
      expect(q.simbolo.length, `${q.id} sem símbolo`).toBe(1);
    }
  });

  it('sem `?q=` o tier é uma CONSTANTE — nem storage, nem detecção', () => {
    // A LÁPIDE, cobrada por ausência (a varredura invertida da casa): as
    // três decisões que o boot tomava pelo visitante morreram na letra D.
    expect(TIER_DE_PRODUTO).toBe('cinema');
    expect(ENGINE).not.toContain('defaultQualityForDevice(');
    expect(ENGINE).not.toContain('lerPreferencias(');
    expect(ENGINE).not.toContain('rendererSoftware');
    // e o storage não guarda mais o veredito medido em lugar nenhum
    expect(PREFERENCIAS).not.toContain('tierQueRodou?');
  });

  it('o storage não guarda campo que ninguém lê (a lápide da Wikipedia)', () => {
    // `wikipediaLigada` viveu no envelope sem UM chamador — o painel que
    // o PLANO-ATLAS promete nunca nasceu. Campo assim promete uma opção
    // que não existe e faz o saneamento fingir que protege algo. Quando
    // o painel nascer, o campo nasce com ele; até lá, ausência cobrada.
    // O `?` é do CAMPO opcional, como na lápide do tierQueRodou acima:
    // é o que separa o campo vivo da lápide que o nomeia.
    expect(PREFERENCIAS).not.toContain('wikipediaLigada?');
    expect(PREFERENCIAS).not.toContain('p.wikipediaLigada');
  });

  it('a porta `?q=` aceita os quatro literais e nada mais (a lição do ?tone=constructor)', () => {
    for (const q of QUALIDADES) expect(lerPortaQualidade(q.id)).toBe(q.id);
    expect(lerPortaQualidade('constructor')).toBeNull();
    expect(lerPortaQualidade('AUTO')).toBeNull();
    expect(lerPortaQualidade('')).toBeNull();
    expect(lerPortaQualidade(null)).toBeNull();
    expect(lerPortaQualidade(undefined)).toBeNull();
  });

  it('o engine MEDE e avisa; ele não troca de tier sozinho', () => {
    // A fronteira inteira mora nesta ausência. O auto-quality chamava
    // `applyQuality` de dentro do laço — e chamava só a metade viva,
    // deixando a alocação no tier de antes. Quem aplica agora é o
    // Director, que sabe assar um mundo, e só sob a política `auto`.
    const laco = ENGINE.slice(ENGINE.indexOf('  start() {'), ENGINE.indexOf('  dispose() {'));
    expect(laco).not.toContain('this.applyQuality(');
    expect(laco).toContain('this.medicaoFns.forEach(');
    const aoMedir = DIRECTOR.slice(
      DIRECTOR.indexOf('private aoMedirOQuadro('),
      DIRECTOR.indexOf('private publicarQualidade(')
    );
    expect(aoMedir).toContain("this.politicaDeQualidade === 'auto'");
  });

  it('a MEDIDA recomeça a cada troca de tier — média do tier que saiu não vale', () => {
    const aplicar = ENGINE.slice(
      ENGINE.indexOf('applyQuality(q: QualityLevel'),
      ENGINE.indexOf('get medicao()')
    );
    expect(aplicar).toContain('this.medicaoAtual = null;');
    expect(aplicar).toContain('this.fpsN = 0;');
  });

  it('o que a medição INDICA: os limiares de sempre, agora como sugestão', () => {
    // cinema engasgado pede alta; alta engasgada pede performance; o
    // degrau de baixo não tem para onde cair
    expect(tierMedido('cinema', 30, false)).toBe('alta');
    expect(tierMedido('alta', 30, false)).toBe('performance');
    expect(tierMedido('performance', 5, false)).toBe('performance');
    // acima do limiar e longe do teto: nada a sugerir (= o de agora)
    expect(tierMedido('cinema', 60, false)).toBe('cinema');
    expect(tierMedido('alta', 40, false)).toBe('alta');
    // no teto do monitor a medida pede o degrau de cima, um por vez
    expect(tierMedido('performance', 60, true)).toBe('alta');
    expect(tierMedido('alta', 60, true)).toBe('cinema');
    expect(tierMedido('cinema', 60, true)).toBe('cinema');
    // e o teto NÃO resgata quem está abaixo do limiar (a queda manda)
    expect(tierMedido('cinema', 20, true)).toBe('alta');
  });

  it('a URL espelha a ESCOLHA, não o tier vivo — senão o Auto não caberia num link', () => {
    const inicio = ESPELHO.indexOf('const changeQuality = ');
    const corpo = ESPELHO.slice(inicio, ESPELHO.indexOf('\n  };', inicio));
    expect(corpo).toContain("url.searchParams.set('q', escolha)");
    expect(corpo).not.toContain("set('q', quality.tier)");
  });

  it('a frase da medição é UMA — o painel e o título do seletor contam igual', () => {
    expect(AJUSTES).toContain('rotuloDaQualidade(qualidade)');
    expect(APP).toContain('title={rotuloDaQualidade(quality)}');
    // …e o NOME ACESSÍVEL do seletor fica parado: nome que muda a cada
    // janela de medida desorienta quem ouve a tela. O que anda é estado,
    // e estado se anuncia pela região `aria-live` do painel.
    expect(APP).toContain('aria-label="Qualidade gráfica"');
    const estado = (m: Parameters<typeof rotuloDaQualidade>[0]) => rotuloDaQualidade(m);
    // manual, medida boa: nada a sugerir — o painel não inventa alarme
    expect(
      estado({ escolha: 'cinema', tier: 'cinema', medicao: { fps: 59.6, sugestao: 'cinema' } })
    ).toBe('Qualidade Cinema, e o quadro anda a 60 quadros/s.');
    // manual, medida ruim: SUGERE e nada mais — o tier não se mexeu
    expect(
      estado({ escolha: 'cinema', tier: 'cinema', medicao: { fps: 28.2, sugestao: 'alta' } })
    ).toBe('Qualidade Cinema, a 28 quadros/s — Alta deve andar melhor.');
    // auto: diz onde a medição pousou, que é a pergunta que sobra
    expect(
      estado({ escolha: 'auto', tier: 'alta', medicao: { fps: 51, sugestao: 'alta' } })
    ).toBe('Auto: a medição pôs a qualidade em Alta, a 51 quadros/s.');
    // sem medida ainda: diz "medindo" em vez de fingir um número
    expect(estado({ escolha: 'auto', tier: 'cinema', medicao: null })).toContain('medindo');
    expect(estado({ escolha: 'alta', tier: 'alta', medicao: null })).toContain('medindo');
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
