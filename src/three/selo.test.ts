// Serve: lei — todo controle que muda a imagem vira desvio declarado no selo, e toda porta de URL lida no código tem entrada no registro
// ============================================================
// O SELO SÓ VALE SE NÃO PUDER ENVELHECER CALADO. São dois testes-tranca
// (D1) e o resto é comportamento:
//
//  1. COMPLETUDE — varre os arquivos que governam a imagem procurando
//     porta de URL lida por literal, e cobra entrada no registro para
//     cada uma. Porta nova sem entrada quebra aqui, e é por isso que a
//     gradação por contexto da F6 não tem como nascer calada.
//     A varredura é TEXTUAL (pega até menção em comentário): ela só
//     pode exigir declaração a mais, nunca a menos.
//
//  2. NENHUM CONTROLE DESMENTE O SELO — para CADA controle que a UI
//     oferece (as camadas dos dois hospedeiros, as curvas de tom, a
//     exposição, o tier), usar o controle tem de virar desvio declarado.
//     Um controle que muda a imagem sem mover o selo é exatamente a
//     mentira que o doador cometeu.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAMADAS } from './atlasConfig';
import {
  ARQUIVOS_GOVERNADOS,
  BRILHO_ASSISTIDO,
  BRILHO_REAL,
  CARTOGRAFIA_PROCEDURAL,
  ESCALA_REAL,
  FORA_DE_ESCALA,
  PROCEDENCIA,
  REGISTRO,
  aoClicarEmBrilho,
  escalaDaVista,
  estadoDoSelo,
  legendaDaProcedencia,
  CARTOGRAFIA_DESLIGADA,
} from './selo';
import type { EstadoDaVista } from './selo';
import {
  COPY_EXPOSICAO_DO_REAL,
  COPY_LANTERNA_DE_LEITURA,
  COPY_LUZ_ASSISTIDA,
  declaracaoDaExposicao,
  lerPortaLuz,
  rotuloDaLuzAssistida,
} from './selo';
import {
  LANTERNA_DE_LEITURA,
  PASSOS_DA_EXPOSICAO_REAL,
  stopsDaVisita,
} from '../lib/atlas/luzDaVisita';
import { DRAMA_T1, doseDaDramaturgia } from './director/doseDoSol';
import { LIMIAR_SISTEMA_SOLAR_PC } from './escala';
import { TONE_MAPPINGS } from './core/engine';
import { definirIdioma, iniciarIdioma } from '../lib/idioma';
import type { ToneMapMode } from './core/engine';

/** o estado de uma vista limpa: nada tocado, nada na URL */
const LIMPA: EstadoDaVista = {
  // 144 UA — uma vista de DENTRO do sistema solar (o filme e o voo
  // livre passam por aí; a roda do Atlas para no teto de ~134 UA sob a
  // lente de 58°, item 86). O veredito ESCALA é o mesmo em toda a
  // faixa: bem abaixo de `LIMIAR_SISTEMA_SOLAR_PC`, e é isso que este
  // fixture mede. Nenhum número de enquadramento se repete aqui — eles
  // andam com o HUD e com `?ui=`.
  distanciaPc: 0.0007,
  portas: [],
  exposicaoManual: false,
  tom: 'aces',
  camadasEscondidas: [],
  tier: 'cinema',
  // gaveta Avançado intocada: quem manda no MSAA é o preset (item 145)
  amostras: null,
  // `real` na FIXTURE de propósito: é o estado DEPOIS do clique "voltar
  // ao real". O default vivo do Atlas é `assistida` — e tem os próprios
  // testes (bloco 2c), porque ele É desvio declarado.
  luz: 'real',
  stopsDoGloboEmFoco: null,
  // dose PLENA na fixture, pelo mesmo motivo do `luz: 'real'`: é o
  // estado sem assistência nenhuma. O arranque do filme tem os seus
  // testes próprios (bloco da dose).
  doseDoSol: 1,
  // (stopsDaPupila saiu da fixture no M2 — a pupila morreu inteira e o
  // estado da vista não tem mais adaptação por quadro a declarar.)
};

const com = (mudanca: Partial<EstadoDaVista>): EstadoDaVista => ({ ...LIMPA, ...mudanca });

/**
 * A varredura: toda leitura de parâmetro de URL por literal nos
 * arquivos governados. Os receptores possíveis estão listados porque
 * são os que a casa usa (`debug`, `query`, `q`, `hide`, `params`,
 * `dbg`) mais a construção direta do URLSearchParams.
 */
const PADRAO_DE_PORTA =
  /(?:URLSearchParams\([^)]*\)|\b(?:debug|query|q|hide|dbg|params)\b)\s*\.\s*(?:has|get)\(\s*'([a-zA-Z0-9_]+)'\s*\)/g;

function portasLidas(): Map<string, string[]> {
  const achado = new Map<string, string[]>();
  for (const arquivo of ARQUIVOS_GOVERNADOS) {
    const fonte = readFileSync(new URL(`./../${arquivo}`, import.meta.url), 'utf8');
    for (const m of fonte.matchAll(PADRAO_DE_PORTA)) {
      const lista = achado.get(m[1]) ?? [];
      if (!lista.includes(arquivo)) lista.push(arquivo);
      achado.set(m[1], lista);
    }
  }
  return achado;
}

const CHAVES = new Set(REGISTRO.map((c) => c.chave));

describe('1. completude do registro', () => {
  it('a varredura acha portas de verdade — um padrão quebrado passaria calado', () => {
    const portas = portasLidas();
    // se este número despencar, é o REGEX que quebrou, não o código
    expect(portas.size).toBeGreaterThan(30);
    for (const obrigatoria of ['exp', 'tone', 'knee', 'nobloom', 'q', 'shot']) {
      expect(portas.has(obrigatoria), `a varredura perdeu ?${obrigatoria}=`).toBe(true);
    }
  });

  it('toda porta lida nos arquivos governados tem entrada no registro', () => {
    const semEntrada = [...portasLidas()]
      .filter(([chave]) => !CHAVES.has(chave))
      .map(([chave, onde]) => `?${chave}= (${onde.join(', ')})`);
    expect(semEntrada, 'porta sem entrada em selo.ts').toEqual([]);
  });

  it('toda camada oferecida na UI tem entrada no registro', () => {
    // UMA lista desde o item 61 (22/08): a gaveta desenha a tabela
    // inteira, e o painel de Ajustes deixou de desenhá-la. O
    // `CAMADAS_DO_ATLAS` que este laço juntava aqui era um RECORTE de
    // `CAMADAS` — varrer os dois sempre foi varrer o mesmo conjunto duas
    // vezes; agora nem a lista do recorte existe.
    for (const c of CAMADAS) {
      expect(CHAVES.has(c.flag), `camada ${c.flag} fora do registro`).toBe(true);
    }
  });

  it('a recíproca: as camadas do registro SÃO a tabela única, na ordem (item 33)', () => {
    // era a direção que faltava — quatro flags só-URL viveram no
    // registro sem linha em CAMADAS, com o selo escrevendo a flag crua
    // no rótulo e nenhuma caixa para religar. A derivação torna isto
    // estrutural; este pino impede a segunda lista de renascer.
    const doRegistro = REGISTRO.filter((c) =>
      c.rotulo.startsWith('camada desligada')
    );
    expect(doRegistro.map((c) => c.chave)).toEqual(CAMADAS.map((c) => c.flag));
    // e nenhuma delas ficou sem nome pt-BR: rótulo com a flag crua é o
    // sintoma exato do buraco fechado
    for (const c of doRegistro) {
      expect(c.rotulo, `rótulo cru em ${c.chave}`).not.toBe(
        `camada desligada: ${c.chave}`
      );
    }
  });

  it('não há entrada MORTA: toda chave do registro é citada em arquivo governado', () => {
    const fontes = ARQUIVOS_GOVERNADOS.map((a) =>
      readFileSync(new URL(`./../${a}`, import.meta.url), 'utf8')
    ).join('\n');
    for (const c of REGISTRO) {
      expect(fontes.includes(`'${c.chave}'`), `${c.chave} não é citada em lugar nenhum`).toBe(
        true
      );
    }
  });

  it('não há chave repetida — duas entradas para a mesma porta são dois vereditos', () => {
    expect(CHAVES.size).toBe(REGISTRO.length);
  });

  it('todo caminho de brilho tem rótulo em pt-BR e uma volta declarada', () => {
    for (const c of REGISTRO) {
      expect(c.rotulo.length).toBeGreaterThan(3);
      expect(['vivo', 'recarregar', 'nenhuma']).toContain(c.volta);
      // rótulo é copy de UI: nada de inglês
      expect(/\b(the|layer|off|on|hidden|brightness)\b/i.test(c.rotulo)).toBe(false);
    }
  });
});

describe('2. nenhum controle desmente o selo', () => {
  it('a vista limpa é REAL nos dois eixos — um selo que nunca diz real não serve', () => {
    const v = estadoDoSelo(LIMPA);
    expect(v.brilho).toBe('real');
    expect(v.escala).toBe('real');
    expect(v.desvios).toEqual([]);
  });

  it('desligar QUALQUER camada da gaveta vira desvio declarado', () => {
    for (const c of CAMADAS) {
      const v = estadoDoSelo(com({ camadasEscondidas: [c.flag] }));
      expect(v.brilho, `${c.flag} não moveu o selo`).toBe('assistido');
      expect(v.desvios.map((d) => d.chave)).toContain(c.flag);
      // e o rótulo NOMEIA a camada — "algo está desligado" não serve
      expect(v.desvios[0].rotulo).toContain(c.nome);
    }
  });

  it('QUALQUER curva de tom fora do padrão vira desvio', () => {
    for (const tom of Object.keys(TONE_MAPPINGS) as ToneMapMode[]) {
      const v = estadoDoSelo(com({ tom }));
      expect(v.brilho, `tom ${tom}`).toBe(tom === 'aces' ? 'real' : 'assistido');
    }
  });

  it('exposição à mão e tier abaixo de cinema viram desvio', () => {
    expect(estadoDoSelo(com({ exposicaoManual: true })).brilho).toBe('assistido');
    expect(estadoDoSelo(com({ tier: 'alta' })).brilho).toBe('assistido');
    expect(estadoDoSelo(com({ tier: 'performance' })).brilho).toBe('assistido');
  });

  it('porta NÃO declarada na URL também vira desvio — o selo não promete o que não conhece', () => {
    const v = estadoDoSelo(com({ portas: ['chromsat'] }));
    expect(v.brilho).toBe('assistido');
    expect(v.desvios[0].rotulo).toContain('chromsat');
  });

  it('as portas declaradas como neutras NÃO movem o selo', () => {
    const neutras = [
      't', 'play', 'freeze', 'atlas', 'pos', 'look', 'shot', 'ajustes', 'loader', 'jd',
      'foco',
    ];
    expect(estadoDoSelo(com({ portas: neutras })).brilho).toBe('real');
  });

  it('o TEMPO não é desvio de brilho — e a decisão está escrita no registro', () => {
    // A máquina do tempo MUDA a imagem e mesmo assim não move o eixo
    // BRILHO: efeméride é dado medido, do mesmo tier do catálogo. Quem
    // quiser inverter esta decisão quebra aqui e vai ler o porquê em
    // `selo.ts` antes de inverter — que é o ponto de escrevê-la.
    const jd = REGISTRO.find((c) => c.chave === 'jd');
    expect(jd, '?jd= sem entrada no registro').toBeDefined();
    expect(jd!.eixo).toBe('nenhum');
    expect(jd!.desvia(com({ portas: ['jd'] }))).toBe(false);
    expect(estadoDoSelo(com({ portas: ['jd'] })).brilho).toBe('real');
    // e o vocabulário: o tier "medido" já promete catálogo E efeméride
    expect(PROCEDENCIA.medido.oQue).toContain('efeméride');
  });

  it('as portas de luz movem o selo só por estarem na URL', () => {
    for (const chave of ['nobloom', 'knee', 'kneeamt', 'kneemode', 'fov', 'dom', 'forgetau']) {
      expect(estadoDoSelo(com({ portas: [chave] })).brilho, chave).toBe('assistido');
    }
  });

  // ============================================================
  // A PORTA DA LÍNGUA (item 130, lista do §19).
  //
  // `?lang=` é INSTRUMENTO DE CAPTURA: os juízes de imagem precisam
  // pedir uma língua sem tocar no storage do perfil. Ela não muda um
  // pixel de física, então NÃO pode derrubar o eixo BRILHO — mas
  // também não pode ficar de fora do registro, porque porta não
  // declarada vira acusação e o juiz de inglês fotografaria um selo
  // dizendo "assistido" por causa da própria régua.
  //
  // As DUAS pontas amarradas de propósito: o nome que `iniciarIdioma`
  // lê e a chave que o registro declara. Renomear um sem o outro
  // quebra aqui.
  // ============================================================
  it('`?lang=` é porta DECLARADA e NEUTRA — o juiz em inglês não vira desvio', () => {
    expect(iniciarIdioma('?lang=en')).toBe('en');
    definirIdioma('pt-BR');

    const entrada = REGISTRO.find((c) => c.chave === 'lang');
    expect(entrada, '?lang= sem entrada no registro do selo').toBeDefined();
    expect(entrada!.eixo).toBe('nenhum');
    expect(entrada!.desvia(com({ portas: ['lang'] }))).toBe(false);

    const v = estadoDoSelo(com({ portas: ['lang'] }));
    expect(v.brilho).toBe('real');
    expect(v.desvios).toEqual([]);
    // e não é o caso trivial de "nenhuma porta conta": a porta ao lado,
    // não declarada, continua acusando
    expect(estadoDoSelo(com({ portas: ['lang', 'lingua'] })).desvios.map((d) => d.rotulo)).toEqual([
      'porta não declarada: ?lingua',
    ]);
  });
});

// (o bloco 2b — a gradação por contexto — morreu no M1 da Lei da
// Estrela junto com `claraoDoAtlas`: o Atlas não modera mais o clarão, e
// a linha `grad` saiu do registro. A varredura invertida vigia o nome.)

describe('2c. a política de luz se declara (Onda 6, D2/D8; reescrita no item 91)', () => {
  it('`assistida` — o default do Atlas — é desvio declarado, vivo e desfazível', () => {
    const v = estadoDoSelo(com({ luz: 'assistida' }));
    expect(v.brilho).toBe('assistido');
    const linha = v.desvios.find((d) => d.chave === 'luz');
    expect(linha, 'a política assistida não moveu o selo').toBeDefined();
    expect(linha!.volta).toBe('vivo');
    // A COPY MUDOU NO ITEM 91, e mudou porque a antiga descrevia a lei do
    // PONTO ("faixa comprimida… a ordem de brilho é preservada") numa
    // política que só governa o GLOBO. Ali as duas metades mentiam: a
    // faixa não se comprime (cada mundo é exposto para si) e a ordem
    // ENTRE GLOBOS deixa de valer de propósito.
    expect(linha!.rotulo).toContain('exposto para a luz que ELE recebe');
    expect(linha!.rotulo).toContain('A ordem verdadeira de brilho continua no céu');
    expect(linha!.rotulo).not.toContain('faixa comprimida');
  });

  it('`real` não é desvio: a penumbra física verdadeira é a posição sem assistência', () => {
    expect(estadoDoSelo(com({ luz: 'real' })).brilho).toBe('real');
  });

  /**
   * A Q14 DO DONO, 26/08 (item 91) — *"R1 — +3 passos fixos, sempre os
   * mesmos, declarados no selo"*. A obra abriu a chapa do modo real, e o
   * selo tinha uma frase que passou a mentir: em `?luz=real` ele dizia
   * *"nada foi ajustado nesta vista"* enquanto o quadro saía 8× mais
   * claro que a rampa. A lista curta é o defeito que o cabeçalho do
   * `selo.ts` promete não repetir.
   *
   * AS DUAS METADES, e as duas são cobradas aqui: o eixo BRILHO CONTINUA
   * REAL (a fotometria não foi tocada — tempo de exposição não é
   * fotometria ajustada, e derrubar o eixo apagaria o único estado em que
   * este selo pode dizer a verdade sobre si), e a linha DIZ o que a chapa
   * fez, com o número saindo da lei e não de um literal.
   */
  it('a Q14: em `real` a linha BRILHO declara o tempo de exposição', () => {
    const v = estadoDoSelo(com({ luz: 'real' }));
    expect(v.brilho, 'o eixo continua REAL — a fotometria não foi tocada').toBe('real');
    expect(v.exposicao).toContain(`+${PASSOS_DA_EXPOSICAO_REAL} passos`);
    expect(v.exposicao).toContain('tempo de exposição');
    // o preço que ele aceitou com a foto na mão, dito na frase — "acende",
    // não "satura": o instrumento mediu zero pixels saturados (achado do
    // auditor da Q14; dizer "satura" desmentia o JSON da prova)
    expect(v.exposicao).toContain('o céu ao fundo acende mais');
    // o número acompanha a lei: mudar o desenho muda a frase junto
    expect(COPY_EXPOSICAO_DO_REAL).toContain(`+${PASSOS_DA_EXPOSICAO_REAL}`);
  });

  it('em `assistida` não há chapa a declarar — quem fala ali é a linha `luz`', () => {
    expect(estadoDoSelo(com({ luz: 'assistida' })).exposicao).toBeNull();
    expect(declaracaoDaExposicao(com({ luz: 'assistida' }))).toBeNull();
  });

  /**
   * A COMPOSIÇÃO, lida do lado do selo: os +3 passos entram pelo caminho
   * AUTOMÁTICO da exposição, e `?exp=` (ou o slider) desliga esse caminho
   * inteiro. Declarar "+3 passos" com o latch ligado seria o selo
   * prometendo uma chapa que a tela não tem — e é exatamente o estado em
   * que a coluna R1 da folha foi capturada (`?luz=real&exp=8.16`).
   */
  it('com a exposição na MÃO o selo cala a chapa — e declara a mão', () => {
    const naMao = com({ luz: 'real', exposicaoManual: true });
    expect(estadoDoSelo(naMao).exposicao).toBeNull();
    // e quem fala ali é a linha do registro, que já é desvio
    expect(estadoDoSelo(naMao).desvios.some((d) => d.chave === 'exp')).toBe(true);
    expect(estadoDoSelo(naMao).brilho).toBe('assistido');
  });

  /**
   * ITEM 93, PROVA 8 — a assistência NOVA também se declara. A lanterna
   * de leitura é uma segunda luz que a física não tem; ela acende só em
   * `assistida`, e é ali, e só ali, que o selo a nomeia.
   *
   * O NÚMERO NÃO É REDIGITADO: sai de `LANTERNA_DE_LEITURA`. Trocar o
   * desenho para 0,20 muda a frase junto — nunca deixa o selo com um
   * número velho na tela.
   */
  it('a lanterna de leitura é declarada em `assistida`, e só lá', () => {
    const ligada = estadoDoSelo(com({ luz: 'assistida' })).desvios.find(
      (d) => d.chave === 'luz'
    );
    expect(ligada!.rotulo).toContain(
      `Lanterna de leitura ${Math.round(LANTERNA_DE_LEITURA * 100)} %`
    );
    expect(ligada!.rotulo).toContain('lado noturno legível');
    // em `real` a linha inteira não existe: não há nada a declarar
    expect(
      estadoDoSelo(com({ luz: 'real' })).desvios.some((d) => d.chave === 'luz')
    ).toBe(false);
    // e a copy da lanterna acompanha o número da lei, não uma cópia dele
    expect(COPY_LANTERNA_DE_LEITURA).toContain(
      `${Math.round(LANTERNA_DE_LEITURA * 100)} %`
    );
  });

  it('com corpo em foco o rótulo diz o gasto EXATO do globo, não um "+N" genérico', () => {
    // O NÚMERO MUDOU DE SUJEITO NO ITEM 91. Era o ΔEV da `assistida`
    // sobre a `real` — que descrevia o ponto, e o ponto nunca passou por
    // esta política. Agora é `stopsDaVisita`: quanto o GLOBO está exposto
    // acima da luz física que o corpo recebe. Netuno sai de +6,4 (o
    // número velho, de outra coisa) para +9,8 (o que a malha gasta).
    // NO ITEM 93 o número ficou EXATO — 2·log2(d), sem o resíduo do
    // 1/d² que o torcia —, e por isso Mercúrio foi de −2,4 para −2,2.
    const stops = stopsDaVisita(29.884744842988464, 'assistida')!;
    const v = estadoDoSelo(com({ luz: 'assistida', stopsDoGloboEmFoco: stops }));
    const linha = v.desvios.find((d) => d.chave === 'luz')!;
    expect(linha.rotulo).toContain('Este globo: +9,8 passos de luz sobre a luz física.');
    // e o formatador puro é o mesmo caminho
    expect(rotuloDaLuzAssistida(stops)).toBe(linha.rotulo);
    // Saturno — o corpo da queixa do dono — declara os seus +6,5
    expect(
      rotuloDaLuzAssistida(stopsDaVisita(9.5185438390236552, 'assistida'))
    ).toContain('+6,5 passos de luz');
    // Mercúrio é NEGATIVO, com o sinal dele: a visita gasta para BAIXO
    expect(
      rotuloDaLuzAssistida(stopsDaVisita(0.4625482713261739, 'assistida'))
    ).toContain('-2,2 passos de luz');
    // sem corpo em foco (ou número envenenado): só a copy + a lanterna —
    // sem inventar número nenhum
    expect(rotuloDaLuzAssistida(null)).toContain(COPY_LUZ_ASSISTIDA);
    expect(rotuloDaLuzAssistida(null)).not.toContain('passos de luz');
    expect(rotuloDaLuzAssistida(Number.NaN)).toBe(rotuloDaLuzAssistida(null));
  });

  it('os passos do selo também leem anões/asteroides (não só os dez + luas)', () => {
    const fonte = readFileSync(new URL('./director.ts', import.meta.url), 'utf8');
    const fn = fonte.slice(
      fonte.indexOf('private stopsDoGloboEmFoco()'),
      fonte.indexOf('definirLuz(')
    );
    expect(fn).toContain('HELIO_SEM_PONTO');
    expect(fn).toContain('stopsDaVisita');
    // e o número é do GLOBO, não mais o ΔEV da lei do ponto
    expect(fn).not.toContain('deslocamentoEVAssistida');
  });

  it('a dose do arranque é desvio DECLARADO, e some sozinha no fim da hélice', () => {
    // o filme mostra menos atividade do que a data pede: é assistência,
    // e o selo a nomeia em vez de calar
    const v = estadoDoSelo(com({ doseDoSol: doseDaDramaturgia(0) }));
    expect(v.brilho).toBe('assistido');
    const linha = v.desvios.find((d) => d.chave === 'dose-do-sol')!;
    expect(linha.rotulo).toContain('mais limpo do que a data pede');
    // e não é desfazível por clique: é o roteiro, não o visitante
    expect(linha.volta).toBe('nenhuma');
    // no fim da janela a dose é 1 EXATO e o desvio some — sem resíduo
    expect(doseDaDramaturgia(DRAMA_T1)).toBe(1);
    expect(doseDaDramaturgia(200)).toBe(1);
    expect(doseDaDramaturgia(undefined)).toBe(1);
    expect(estadoDoSelo(com({ doseDoSol: 1 })).brilho).toBe('real');
    // e o clique "voltar ao real" NÃO a apaga (nada a apaga)
    expect(
      estadoDoSelo(aoClicarEmBrilho(com({ doseDoSol: 0.2 }))).desvios.some(
        (d) => d.chave === 'dose-do-sol'
      )
    ).toBe(true);
  });

  it('clicar volta ao real: aoClicarEmBrilho escreve `real` e o selo limpa', () => {
    const limpo = aoClicarEmBrilho(com({ luz: 'assistida' }));
    expect(limpo.luz).toBe('real');
    expect(estadoDoSelo(limpo).brilho).toBe('real');
  });

  it('a lei da porta: só os dois literais passam (a lição do ?tone=constructor)', () => {
    expect(lerPortaLuz('real')).toBe('real');
    expect(lerPortaLuz('assistida')).toBe('assistida');
    expect(lerPortaLuz('constructor')).toBeNull();
    expect(lerPortaLuz('')).toBeNull();
    expect(lerPortaLuz(null)).toBeNull();
    expect(lerPortaLuz(undefined)).toBeNull();
    expect(lerPortaLuz('REAL')).toBeNull();
  });

  it('a suavização de bordas se declara pelo ESTADO VIVO, não por `?msaa=` (item 145)', () => {
    // A SABOTAGEM EXATA: devolver o `porta('msaa', …)` que estava aqui
    // até o item 145. O controle da gaveta Avançado troca o MSAA sem
    // recarregar, e um selo que só olhasse a URL calaria a escolha feita
    // no painel de quem abriu o app sem porta nenhuma.
    expect(estadoDoSelo(com({ amostras: 0 })).brilho).toBe('assistido');
    expect(estadoDoSelo(com({ amostras: 4 })).desvios.some((c) => c.chave === 'msaa')).toBe(
      true
    );
    // e o recíproco: a porta na URL com o estado JÁ de volta ao preset
    // não acusa nada (o mesmo contrato de `?luz=`)
    expect(estadoDoSelo(com({ portas: ['msaa'], amostras: null })).brilho).toBe('real');
  });

  it('a porta `?luz=` na URL não é desvio por presença — o estado VIVO manda', () => {
    // `?luz=real` presente com o estado real: nada a declarar (é assim
    // que a volta pode ESCREVER a porta sem sujar o selo)
    expect(estadoDoSelo(com({ portas: ['luz'], luz: 'real' })).brilho).toBe('real');
  });
});

describe('3. clicar volta ao real', () => {
  it('desfazendo o que é desfazível, o selo volta a REAL', () => {
    const sujo = com({
      exposicaoManual: true,
      tom: 'agx',
      camadasEscondidas: ['noplan', 'nocat'],
      portas: ['exp', 'tone', 'noplan', 'nobloom', 'chromsat', 't', 'atlas'],
    });
    expect(estadoDoSelo(sujo).brilho).toBe('assistido');
    const limpo = aoClicarEmBrilho(sujo);
    expect(estadoDoSelo(limpo).brilho).toBe('real');
    // o que NÃO era desvio fica na URL: voltar ao brilho real não pode
    // custar ao visitante o instante da viagem nem o modo
    expect(limpo.portas).toContain('t');
    expect(limpo.portas).toContain('atlas');
    expect(limpo.portas).not.toContain('chromsat');
  });

  it('o que não é desfazível fica declarado — sem fingir que o clique resolveu', () => {
    // PARTE DA LUZ ASSISTIDA para o clique ter uma IDA a fazer, e é a ida
    // que este pino mede: desfaz o que é desfazível e o tier CONTINUA na
    // lista. Ele partia do `luz: 'real'` da fixture — e naquele estado não
    // sobra nada a desfazer, então o que ele media era o clique MORTO
    // (o defeito do item 103), não o tier sobrevivendo ao clique vivo.
    const so = com({ tier: 'performance', luz: 'assistida' });
    const depois = aoClicarEmBrilho(so);
    expect(depois.luz).toBe('real');
    expect(estadoDoSelo(depois).brilho).toBe('assistido');
    expect(estadoDoSelo(depois).desvios.map((d) => d.chave)).toEqual(['q']);
  });
});

/**
 * A PORTA DE DUAS VIAS (decisão 3 do dono, item 91, 25/08). Até então a
 * linha BRILHO só tinha IDA: chegando em BRILHO REAL ela ficava
 * desabilitada, e a única volta à luz assistida era editar `?luz=` na URL
 * e recarregar. Este bloco cobra o interruptor inteiro — e cobra também
 * onde ele NÃO arma, que é a metade fácil de errar.
 */
describe('3b. e clicar de novo devolve a assistência — a porta é de duas vias', () => {
  it('o ciclo fecha: assistida → real → assistida, sem passar por recarga', () => {
    const inicio = com({ luz: 'assistida' });
    expect(estadoDoSelo(inicio).brilho).toBe('assistido');

    const real = aoClicarEmBrilho(inicio);
    expect(real.luz).toBe('real');
    expect(estadoDoSelo(real).brilho).toBe('real');

    const devolta = aoClicarEmBrilho(real);
    expect(devolta.luz).toBe('assistida');
    expect(estadoDoSelo(devolta).brilho).toBe('assistido');
    // e o estado é o MESMO do início: o interruptor não deixa resíduo
    expect(devolta).toEqual(inicio);
  });

  it('o indesfazível NÃO tranca a porta: com o tier baixo a volta arma igual', () => {
    // ESTE PINO CONGELAVA O DEFEITO, e é a razão de o item 103 existir.
    // Ele cobrava `aoClicarEmBrilho(...).luz === 'real'` — quer dizer, o
    // clique NÃO fazendo nada — com o argumento de que oferecer mais
    // assistência numa linha que ainda diz ASSISTIDO contradiria a
    // palavra nela. O argumento tinha um preço que ninguém somou: um
    // desvio de `volta: 'nenhuma'` (o tier abaixo de cinema, a dose do
    // arranque) NUNCA sai da lista. Com ele de pé o veredito jamais
    // esvazia, a segunda via jamais arma, e a luz fica presa em `real`
    // para sempre — a porta de mão única que a decisão 3 do dono existiu
    // para acabar. Palavras dele em 26/08: *"nao consigo voltar ao modo
    // anterior nem vice versa"*.
    //
    // A LEI CERTA é a frase dela, literal: o que arma a volta é não
    // haver mais NADA A DESFAZER — e o indesfazível fica fora da conta,
    // porque clique nenhum o alcança. A honestidade da linha continua
    // inteira: ela segue dizendo ASSISTIDO e a copy nomeia o que restou.
    const comTier = com({ tier: 'performance', luz: 'real' });
    expect(estadoDoSelo(comTier).brilho).toBe('assistido');
    expect(aoClicarEmBrilho(comTier).luz).toBe('assistida');
    // e o ciclo FECHA nos dois sentidos com o indesfazível de pé — o que
    // o dono não conseguia fazer: assistida → real → assistida
    const real = aoClicarEmBrilho(com({ tier: 'performance', luz: 'assistida' }));
    expect(real.luz).toBe('real');
    expect(aoClicarEmBrilho(real).luz).toBe('assistida');
    // o tier segue declarado o tempo todo: o clique não finge tê-lo curado
    for (const e of [comTier, real, aoClicarEmBrilho(real)]) {
      expect(estadoDoSelo(e).desvios.some((d) => d.chave === 'q')).toBe(true);
    }
  });

  it('desfazer PRIMEIRO, devolver DEPOIS: dois cliques, na ordem certa', () => {
    // uma vista com exposição na mão E luz assistida: o primeiro clique
    // desfaz as duas coisas (é a ida), e só o SEGUNDO — já em BRILHO
    // REAL — devolve a foto.
    const sujo = com({ luz: 'assistida', exposicaoManual: true, portas: ['exp'] });
    const um = aoClicarEmBrilho(sujo);
    expect(um.luz).toBe('real');
    expect(um.exposicaoManual).toBe(false);
    expect(estadoDoSelo(um).brilho).toBe('real');
    const dois = aoClicarEmBrilho(um);
    expect(dois.luz).toBe('assistida');
    // e a exposição NÃO volta para a mão: o clique devolve a luz da casa,
    // não os ajustes que o visitante tinha feito
    expect(dois.exposicaoManual).toBe(false);
  });

  /*
   * LÁPIDE DO PINO DE GREP, e ela fica escrita porque a lição é cara.
   *
   * Havia aqui um "o HUD e o espelho da URL usam a MESMA guarda do
   * oráculo" que lia os DOIS arquivos como TEXTO e cobrava
   * `toContain('const podeReassistir = desvios.length === 0;')` e
   * `toContain('if (veredito.desvios.length === 0) {')`. Quer dizer: ele
   * pinava os CARACTERES da guarda errada. Enquanto o dono não conseguia
   * trocar de modo no app dele, este pino passava verde — e teria
   * REPROVADO o conserto, porque o conserto muda justamente essas
   * letras. Um juiz assim não protege a lei: protege a redação de quem
   * escreveu por último.
   *
   * QUEM GUARDA ISTO AGORA mede COMPORTAMENTO, e mede no lugar certo: a
   * prova 20 de `scripts/visual/atlas-smoke.mjs` abre o Atlas sem
   * `?shot=2` (com HUD, portanto) e com `?q=alta` (o tier abaixo de
   * cinema, o desvio indesfazível que trancava a porta), clica na linha
   * BRILHO com mouse de verdade duas vezes e cobra a luz trocando nos
   * dois sentidos com a URL acompanhando. Texto-fonte não entra na
   * conta. O pino puro da guarda é o `it` logo acima, sobre o oráculo.
   */
});

describe('4. o eixo ESCALA sai da geometria, não de porta', () => {
  it('uma vista de dentro do sistema, como a de abertura, é ESCALA REAL', () => {
    expect(escalaDaVista(0.0007)).toBe('real');
  });

  it('acima do limiar o eixo declara desvio porque não SABE garantir 1:1', () => {
    // e não porque o Sol-ator esteja em quadro: a 8 kpc (Sagittarius A✱,
    // alcançável pelo clique no rótulo dentro do Atlas) quem domina o
    // quadro não é o disco artístico do Sol. O eixo lê a distância a
    // CASA, e acima do limiar ele é conservador — ver `escalaDaVista`.
    expect(escalaDaVista(LIMIAR_SISTEMA_SOLAR_PC)).toBe('fora');
    expect(escalaDaVista(1)).toBe('fora');
    expect(escalaDaVista(8000)).toBe('fora');
  });

  it('a troca acontece NA fronteira do sistema solar, e uma vez só', () => {
    // desde o M1 o eixo lê a constante CONGELADA de escala.ts (a entrega
    // ponto→clarão que ele lia morreu com o SunStar): "real" é o domínio
    // em que tudo desenhado é 1:1, e a fronteira é a do sistema solar.
    let trocas = 0;
    let anterior = escalaDaVista(1e-6);
    expect(anterior).toBe('real');
    for (let i = 1; i <= 2000; i++) {
      const d = (i / 2000) * 0.1;
      const agora = escalaDaVista(d);
      if (agora !== anterior) {
        trocas++;
        expect(d).toBeGreaterThanOrEqual(LIMIAR_SISTEMA_SOLAR_PC);
        expect(d).toBeLessThan(LIMIAR_SISTEMA_SOLAR_PC + 0.1 / 2000 + 1e-12);
      }
      anterior = agora;
    }
    expect(trocas).toBe(1);
  });

  it('distância envenenada declara o desvio em vez de prometer', () => {
    expect(escalaDaVista(Number.NaN)).toBe('fora');
  });
});

describe('5. a copy do selo', () => {
  it('é a de D1, verbatim', () => {
    expect(ESCALA_REAL).toBe('ESCALA REAL');
    expect(FORA_DE_ESCALA).toBe('FORA DE ESCALA');
    expect(BRILHO_REAL).toBe('BRILHO REAL');
    expect(BRILHO_ASSISTIDO).toBe('BRILHO ASSISTIDO');
  });

  it('os três tiers de procedência estão nomeados no vocabulário da legenda', () => {
    expect(Object.keys(PROCEDENCIA)).toEqual(['medido', 'derivado', 'artistico']);
    for (const t of Object.values(PROCEDENCIA)) {
      expect(t.rotulo.length).toBeGreaterThan(2);
      expect(t.oQue.length).toBeGreaterThan(10);
    }
  });

  it('o tier ARTÍSTICO declara os TRÊS artifícios que a cena desenha', () => {
    // ACHADO em 2026-08-13: a entrada dizia "o disco do Sol e o clarão"
    // — DOIS — e a cena desenhava TRÊS. O que faltava eram os spikes de
    // difração em cruz das estrelas, vivos em DOIS shaders
    // independentes: `shaders/starShaders.ts` (o bloco guardado por
    // `vSat > 0.001`) e `world/heroStars.ts` (o `spikes` entra em `col`
    // e no alfa). São artifício pelo critério mais duro que existe — a
    // cruz é o padrão que as hastes do secundário de um TELESCÓPIO
    // imprimem na luz, e não há telescópio nesta cena.
    //
    // A FRASE CRESCEU por isso, e este teste existe para ela não voltar
    // a encolher calada: artifício que entre na cena (ou saia dela) tem
    // de passar por aqui. O teste velho acima só cobrava `length > 10`,
    // que uma lista incompleta satisfaz sem esforço — foi por isso que
    // o buraco durou.
    const oQue = PROCEDENCIA.artistico.oQue;
    expect(oQue).toContain('disco do Sol');
    expect(oQue).toContain('clarão');
    expect(oQue).toContain('cruz de luz');

    // E CURTA, com o teto MEDIDO em vez de arbitrado. Esta linha é a
    // `.atlas-selo-legenda`, dentro da caixa `.atlas-selo` cuja ALTURA o
    // juiz de a11y mede (`scripts/visual/a11y.mjs`, `medirCobertura`)
    // contra o retângulo útil do enquadramento. Medido no navegador em
    // 2026-08-13, na janela 1200x900 do juiz (caixa de 21rem = 336 px,
    // fonte 0,46rem = 7,36 px, entrelinha 11,04 px): a legenda só passa
    // a ocupar TRÊS linhas quando ESTA frase chega a 86 caracteres. Com
    // os 53 de hoje ela continua em DUAS, e a base do selo fica em
    // 0,1769 — o MESMO número de antes da frase crescer, contra 0,24
    // declarados (e quem domina a base é a `.atlas-tempo`, com 0,1809).
    // Ou seja: esta redação não move um fio do juízo de a11y.
    expect(oQue.length).toBeLessThanOrEqual(85);
  });

  /**
   * A LEGENDA NÃO PODE JURAR MEDIDA QUANDO A MEDIDA NÃO CHEGOU.
   * ACHADO em 2026-08-21: bloqueando o `manifest.json` e os `.bin` da
   * cartografia, `loadGalacticAssets` engolia a falha num
   * `console.warn`, a cena virava 100% procedural (`__director.catalogos
   * = false`) e o rodapé do selo seguia imprimindo "medido: catálogo e
   * efeméride" — porque o componente enumerava `PROCEDENCIA` à mão, sem
   * olhar dado nenhum. Era o defeito do doador de volta, no único lugar
   * do selo que ainda não lia estado.
   */
  it('a legenda diz a verdade nos DOIS estados da cartografia', () => {
    const medida = legendaDaProcedencia(true);
    const caida = legendaDaProcedencia(false);

    // com os mapas na mão os três tiers são a legenda inteira
    for (const t of Object.values(PROCEDENCIA)) {
      expect(medida).toContain(`${t.rotulo}: ${t.oQue}`);
      expect(caida).toContain(`${t.rotulo}: ${t.oQue}`);
    }
    expect(medida).not.toContain('procedural');

    // sem eles, a frase extra — e só ela muda
    expect(caida).toBe(`${medida} · ${CARTOGRAFIA_PROCEDURAL}`);

    // E A FALHA NÃO SE CONFUNDE COM O PEDIDO (conferido no navegador em
    // 22/08): com `?cart=off` os mapas nem são baixados, e a cena é
    // procedural porque o visitante escolheu. As duas situações
    // imprimiam a MESMA linha — "os mapas não chegaram" acusava a rede
    // de uma decisão dele.
    const desligada = legendaDaProcedencia(false, true);
    expect(desligada).toBe(`${medida} · ${CARTOGRAFIA_DESLIGADA}`);
    expect(desligada).not.toBe(caida);
    expect(CARTOGRAFIA_DESLIGADA).toContain('?cart=off');
    expect(CARTOGRAFIA_DESLIGADA).not.toContain('não chegaram');
    // com os mapas na mão a escolha não inventa linha nenhuma
    expect(legendaDaProcedencia(true, true)).toBe(medida);
    expect(CARTOGRAFIA_PROCEDURAL).toContain('cartografia');
    expect(CARTOGRAFIA_PROCEDURAL).toContain('procedural');

    // O QUE CAI É A CARTOGRAFIA, e a redação não pode escorregar disso:
    // o catálogo HYG e as efemérides continuam chegando, e continuam
    // medidos. A legenda que dissesse "medido: nada" seria a mentira
    // contrária à que este teste existe para impedir.
    expect(caida).toContain(`${PROCEDENCIA.medido.rotulo}: ${PROCEDENCIA.medido.oQue}`);
  });
});

// ============================================================
// F3 — a porta de escala `?solreal=1` MORREU, e a acusação sobrou com
// um culpado só.
// ============================================================
describe('F3 — o Sol saiu da acusação de escala, sem porta nenhuma', () => {
  // o `com` da casa, e não um fixture novo: assim este bloco continua
  // correto quando `EstadoDaVista` ganhar campo. Foi como ele nasceu
  // ERRADO — faltavam `tier` e `stopsDoGloboEmFoco` —, e quem pegou foi o tsc.
  // 0,1 pc (a vista `soldisco`): é onde o eixo ESCALA declara desvio e a
  // acusação sai. ACHADO ao escrever isto na F1: a 1 UA o selo já diz
  // ESCALA REAL sozinho — `escalaDaVista` compara as duas rampas da
  // entrega, e lá dentro quem desenha o Sol é o ponto fotométrico. Ou
  // seja, o conservadorismo do eixo não alcança o interior do sistema.
  const vista = (portas: string[]) => com({ distanciaPc: 0.1, portas });

  it('a acusação sobrou com Sgr A✱ — o Sol pagou a dívida dele na F3', () => {
    const v = estadoDoSelo(vista([]));
    expect(v.escala).toBe('fora');
    expect(v.culpados).toEqual(['Sagittarius A✱ está 125.884× maior']);
    expect(v.culpados.join(' ')).not.toContain('Sol');
  });

  it('`?solreal=1` virou porta DESCONHECIDA: quem a digitar hoje é avisado', () => {
    // ela foi porta declarada da F1 à F3. Agora não existe caminho no
    // código que a leia, e o selo tem de dizer isso em vez de fingir que
    // ela ainda faz alguma coisa — é o mesmo tratamento de qualquer
    // parâmetro inventado na barra de endereço.
    const v = estadoDoSelo(vista(['solreal']));
    expect(v.desvios.some((c) => c.chave === 'solreal')).toBe(true);
    expect(v.desvios.some((c) => c.rotulo.includes('não declarada'))).toBe(true);
    // e o REGISTRO não a conhece mais
    expect(REGISTRO.some((c) => c.chave === 'solreal')).toBe(false);
  });

  it('e o eixo ESCALA continua saindo da GEOMETRIA, não de porta nenhuma', () => {
    // dentro do sistema solar o selo diz REAL; longe de casa, FORA —
    // e nenhuma URL move isso.
    expect(estadoDoSelo(com({ distanciaPc: 4.8481e-6, portas: [] })).escala).toBe('real');
    expect(estadoDoSelo(com({ distanciaPc: 0.5, portas: [] })).escala).toBe('fora');
  });
});
