// Serve: lei — a hierarquia dos rótulos e a régua de relevância decidem quem ganha a vaga na tela
// ============================================================
// OS RÓTULOS DOS DEZ CORPOS (Onda 5, conserto da revisão de olhos
// frescos). O que se julga aqui é a única coisa que o produtor promete
// e que o navegador não consegue provar barato: que o rótulo lê a
// posição VIVA do atributo — a mesma que a GPU desenha e que a máquina
// do tempo reescreve —, na ordem certa, e que a chave dele é a que o
// hit-test do Director reconhece.
//
// A prova de que o clique enquadra mora no `busca-smoke`, em navegador
// real. Esta aqui é a que impede o defeito silencioso: o nome de Marte
// sobre o ponto de Júpiter no dia em que alguém redigitar a ordem.
// ============================================================
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CHAVE_DE_CORPO, CORPOS_DO_SISTEMA } from '../atlasConfig';
import { IDS_FOTOMETRIA } from './planetas/fotometria';
import type { StarLabel } from './labels';

// O RUNNER DA CASA É `node` (vitest.config.ts) e `labels.ts` puxa
// `galaxy.ts`, que lê `window.location.search` no topo do módulo para as
// portas de afinação da galáxia. Duas linhas de `window` mínimo e um
// import dinâmico resolvem sem trocar o ambiente de TODOS os testes por
// um jsdom que nenhum outro precisa — e sem partir o módulo em dois só
// para agradar ao runner.
(globalThis as { window?: unknown }).window = { location: { search: '' } };
const {
  projectCorpos,
  prioridadeDeCorpo,
  prioridadeDeEstrela,
  pesoDoRotulo,
  PRIORIDADE_DO_ROTULO,
  BONUS_DE_HISTERESE,
  CORPO_FADE_COMECA_PC,
  CORPO_FADE_TERMINA_PC,
  aplicarReguaDeRelevancia,
  ORCAMENTO_DE_NOMES,
  OPACIDADE_MINIMA_DO_ROTULO,
  projectLabels,
  RAIO_NDC_DE_CESSAO,
  BORRAO_DA_CESSAO,
  raioAparenteNdc,
  cessaoPorTamanhoAparente,
  RampasDeRotulo,
  RAMPA_DE_ENTRADA_S,
  RAMPA_DE_SAIDA_S,
  ALFA_DO_TEXTO_SECUNDARIO,
  ALFA_DO_TEXTO_PRIMARIO,
  ALFA_DO_TEXTO_ESCONDIDO,
  ALFA_DO_TEXTO_APONTADO,
} = await import('./labels');

/** uma câmera olhando a origem de 10 unidades no eixo z */
function camera() {
  const c = new THREE.PerspectiveCamera(60, 1.6, 0.001, 1000);
  c.position.set(0, 0, 10);
  c.lookAt(0, 0, 0);
  c.updateMatrixWorld(true);
  return c;
}

/** posições de brinquedo: dez corpos em fila, todos no quadro */
function posicoes(): Float32Array {
  const p = new Float32Array(30);
  for (let i = 0; i < 10; i++) p[i * 3] = (i - 4.5) * 0.4;
  return p;
}

describe('a tabela dos dez', () => {
  it('é a ORDEM da camada, derivada e não redigitada', () => {
    expect(CORPOS_DO_SISTEMA.map((c) => c.id)).toEqual([...IDS_FOTOMETRIA]);
    expect(CORPOS_DO_SISTEMA.length).toBe(10);
  });

  it('todo corpo tem nome pt-BR, classe e chave com o prefixo do hit-test', () => {
    for (const c of CORPOS_DO_SISTEMA) {
      expect(c.nome, c.id).toMatch(/^[A-ZÁÂÃÉÊÍÓÔÕÚÜÇ]/);
      expect(c.classe, c.id).toBeTruthy();
      expect(c.chave, c.id).toBe(`${CHAVE_DE_CORPO}${c.id}`);
    }
    // e a classe conta a verdade: Plutão não é planeta desde 2006
    const pluto = CORPOS_DO_SISTEMA.find((c) => c.id === 'pluto');
    expect(pluto?.classe).toBe('planeta anão');
    expect(CORPOS_DO_SISTEMA.find((c) => c.id === 'sun')?.classe).toBe('estrela');
  });
});

describe('projectCorpos', () => {
  it('lê a posição VIVA do atributo, na ordem da tabela', () => {
    const cam = camera();
    const p = posicoes();
    const rotulos = projectCorpos(cam, CORPOS_DO_SISTEMA, p);
    expect(rotulos.length).toBe(10);
    expect(rotulos.map((l) => l.key)).toEqual(CORPOS_DO_SISTEMA.map((c) => c.chave));
    // o x na tela cresce com o x da cena: o rótulo segue o ponto
    for (let i = 1; i < rotulos.length; i++) {
      expect(rotulos[i].x).toBeGreaterThan(rotulos[i - 1].x);
    }
    // e MOVER o atributo move o rótulo — é a promessa da máquina do
    // tempo: ler o retrato congelado aqui deixaria o nome para trás
    p[3 * 3] += 1.5;
    const depois = projectCorpos(cam, CORPOS_DO_SISTEMA, p);
    expect(depois[3].x).toBeGreaterThan(rotulos[3].x);
    expect(depois[0].x).toBe(rotulos[0].x);
  });

  it('a distância é a do OBSERVADOR, e a classe entra no lugar do tipo espectral', () => {
    const cam = camera();
    const rotulos = projectCorpos(cam, CORPOS_DO_SISTEMA, posicoes());
    for (const l of rotulos) {
      expect(l.distPc).toBeGreaterThan(9);
      expect(l.distPc).toBeLessThan(12);
      // corpo do sistema não tem tipo espectral: o detalhe é a classe
      expect(l.spect).toBe('');
      expect(l.detalhe).toBeTruthy();
    }
    expect(rotulos[0].detalhe).toBe('estrela');
    expect(rotulos.at(-1)?.detalhe).toBe('planeta anão');
  });

  it('quem está fora do quadro não vira rótulo', () => {
    const cam = camera();
    const p = posicoes();
    // atrás da câmera
    p[0] = 0;
    p[2] = 100;
    const rotulos = projectCorpos(cam, CORPOS_DO_SISTEMA, p);
    expect(rotulos.length).toBe(9);
    expect(rotulos.some((l) => l.key === `${CHAVE_DE_CORPO}sun`)).toBe(false);
  });

  it('array curta não estoura: lê só o que existe', () => {
    const rotulos = projectCorpos(camera(), CORPOS_DO_SISTEMA, new Float32Array(9));
    expect(rotulos.length).toBeLessThanOrEqual(3);
    for (const l of rotulos) expect(Number.isFinite(l.x)).toBe(true);
  });

  it('posição NaN não vira rótulo — o slot vazio das luas sem efeméride', () => {
    const p = posicoes();
    p[0] = Number.NaN;
    p[1] = Number.NaN;
    p[2] = Number.NaN;
    const rotulos = projectCorpos(camera(), CORPOS_DO_SISTEMA, p);
    expect(rotulos.some((l) => l.key === `${CHAVE_DE_CORPO}sun`)).toBe(false);
    expect(rotulos.length).toBe(9);
    for (const l of rotulos) expect(Number.isFinite(l.x)).toBe(true);
  });
});


// ============================================================
// A HIERARQUIA DOS NOMES (item 73, plano §3) — a tabela do doador
// (`OverlayPositionTracker`), reimplementada. Antes dela quem chegava
// primeiro na lista ocupava a vaga, e o resultado medido era Saturno
// nascendo `desenhado: false` por colidir com "SOL".
// ============================================================
describe('prioridade — quem ganha a vaga', () => {
  it('a hierarquia é a que o plano declara, e ela DERIVA da classe', () => {
    expect(prioridadeDeCorpo('estrela')).toBe(PRIORIDADE_DO_ROTULO.sol);
    expect(prioridadeDeCorpo('planeta')).toBe(PRIORIDADE_DO_ROTULO.planeta);
    expect(prioridadeDeCorpo('planeta anão')).toBe(PRIORIDADE_DO_ROTULO.anao);
    expect(prioridadeDeCorpo('asteroide')).toBe(PRIORIDADE_DO_ROTULO.anao);
    expect(prioridadeDeCorpo('lua')).toBe(PRIORIDADE_DO_ROTULO.lua);
    // classe que ninguém previu não vira exceção: cai no piso
    expect(prioridadeDeCorpo('cometa')).toBe(PRIORIDADE_DO_ROTULO.outros);
    // e a ordem é a que a queixa do dono pede: planeta acima de lua
    expect(PRIORIDADE_DO_ROTULO.foco).toBeGreaterThan(PRIORIDADE_DO_ROTULO.sol);
    expect(PRIORIDADE_DO_ROTULO.sol).toBeGreaterThan(PRIORIDADE_DO_ROTULO.planeta);
    expect(PRIORIDADE_DO_ROTULO.planeta).toBeGreaterThan(PRIORIDADE_DO_ROTULO.anao);
    expect(PRIORIDADE_DO_ROTULO.anao).toBeGreaterThan(PRIORIDADE_DO_ROTULO.lua);
    expect(PRIORIDADE_DO_ROTULO.lua).toBeGreaterThan(PRIORIDADE_DO_ROTULO.estrelaPropria);
  });

  it('a estrela entra pelo TIER: nome próprio acima de designação', () => {
    expect(prioridadeDeEstrela(0)).toBe(PRIORIDADE_DO_ROTULO.estrelaPropria);
    expect(prioridadeDeEstrela(1)).toBe(PRIORIDADE_DO_ROTULO.estrelaBayer);
    expect(prioridadeDeEstrela(undefined)).toBe(PRIORIDADE_DO_ROTULO.estrelaPropria);
  });

  it('a projeção dos corpos PUBLICA a prioridade — o desenho não a recalcula', () => {
    const rotulos = projectCorpos(camera(), CORPOS_DO_SISTEMA, posicoes());
    const porChave = new Map(rotulos.map((l) => [l.key, l]));
    expect(porChave.get(`${CHAVE_DE_CORPO}sun`)?.prioridade).toBe(PRIORIDADE_DO_ROTULO.sol);
    expect(porChave.get(`${CHAVE_DE_CORPO}earth`)?.prioridade).toBe(
      PRIORIDADE_DO_ROTULO.planeta
    );
    expect(porChave.get(`${CHAVE_DE_CORPO}pluto`)?.prioridade).toBe(
      PRIORIDADE_DO_ROTULO.anao
    );
  });

  it('a HISTERESE vale 20% e é multiplicação, não caso novo', () => {
    const rotulos = projectCorpos(camera(), CORPOS_DO_SISTEMA, posicoes());
    const terra = rotulos.find((l) => l.key === `${CHAVE_DE_CORPO}earth`)!;
    expect(pesoDoRotulo(terra)).toBe(PRIORIDADE_DO_ROTULO.planeta);
    expect(pesoDoRotulo(terra, new Set([terra.key]))).toBe(
      PRIORIDADE_DO_ROTULO.planeta * BONUS_DE_HISTERESE
    );
    expect(BONUS_DE_HISTERESE).toBe(1.2);
    // ...e ela NÃO inverte a hierarquia: uma lua que estava na tela
    // continua abaixo de um planeta que não estava
    const lua = { ...terra, prioridade: PRIORIDADE_DO_ROTULO.lua };
    expect(pesoDoRotulo(lua, new Set([lua.key]))).toBeLessThan(pesoDoRotulo(terra));
  });

  it('O BÔNUS NÃO INVERTE NENHUM PAR DA TABELA — a trava, degrau a degrau', () => {
    // A SEGURANÇA "estrela nunca rouba a vaga de lua" tem margem
    // EXATAMENTE ZERO: `lua` 6 contra `estrelaPropria` 5 × 1,2 = 6,0.
    //
    // O QUE ESTE TESTE ACRESCENTA, dito sem inflar (medido em 24/08, e a
    // primeira redação desta nota exagerava): as sabotagens ÓBVIAS desse
    // par — bônus 1,25, ou `estrelaPropria` 6 — JÁ REPROVAVAM em pinos
    // que existiam antes dele. O buraco real era OUTRO, e este teste é
    // que o achou: `sol` 90 × 1,2 = 108 passava `foco` 100, e NENHUM
    // juiz guardava esse par. É por isso que a trava é sobre a TABELA
    // INTEIRA, e não sobre o par que alguém lembrou de escrever: o par
    // esquecido nunca é o que se está olhando.
    //
    // A LEI: para dois degraus vizinhos, o de BAIXO com bônus não pode
    // PASSAR o de cima sem bônus. Empatar é permitido — o desempate por
    // distância resolve, e é onde `lua`/`estrelaPropria` vive hoje.
    // um rótulo qualquer, só para carregar a prioridade: o que se mede
    // aqui é o PESO, e ele não olha mais nada do objeto
    const base = projectCorpos(camera(), CORPOS_DO_SISTEMA, posicoes()).find(
      (l) => l.key === `${CHAVE_DE_CORPO}earth`
    )!;
    const degraus = [...new Set(Object.values(PRIORIDADE_DO_ROTULO))].sort(
      (a, b) => b - a
    );
    for (let i = 0; i + 1 < degraus.length; i++) {
      const cima = degraus[i];
      const baixo = degraus[i + 1];
      expect(
        baixo * BONUS_DE_HISTERESE,
        `o bônus faz ${baixo} passar ${cima}`
      ).toBeLessThanOrEqual(cima);
    }

    // E A MESMA LEI PELO PESO, que é quem manda de verdade — a conta
    // acima é da tabela, esta é da função que a lê.
    const nomes = Object.keys(PRIORIDADE_DO_ROTULO) as (keyof typeof PRIORIDADE_DO_ROTULO)[];
    for (const alto of nomes) {
      for (const baixo of nomes) {
        if (PRIORIDADE_DO_ROTULO[baixo] >= PRIORIDADE_DO_ROTULO[alto]) continue;
        const a = { ...base, key: 'a', prioridade: PRIORIDADE_DO_ROTULO[alto] };
        const b = { ...base, key: 'b', prioridade: PRIORIDADE_DO_ROTULO[baixo] };
        expect(
          pesoDoRotulo(b, new Set(['b'])),
          `${baixo} com bônus passou ${alto} sem bônus`
        ).toBeLessThanOrEqual(pesoDoRotulo(a));
      }
    }

    // O PAR QUE ESTAVA QUEBRADO até 24/08, pinado pelo nome para nunca
    // mais voltar em silêncio: o `foco` é o topo, e um SOL já desenhado
    // não pode passar à frente de um alvo recém-escolhido.
    const sol = { ...base, key: 'sol', prioridade: PRIORIDADE_DO_ROTULO.sol };
    const foco = { ...base, key: 'foco', prioridade: PRIORIDADE_DO_ROTULO.foco };
    expect(pesoDoRotulo(sol, new Set(['sol']))).toBeLessThanOrEqual(
      pesoDoRotulo(foco)
    );
  });

  it('sem prioridade vale o piso — é o rótulo do FILME, que não é tocado', () => {
    expect(pesoDoRotulo({ ...projectCorpos(camera(), CORPOS_DO_SISTEMA, posicoes())[0], prioridade: undefined }))
      .toBe(PRIORIDADE_DO_ROTULO.outros);
  });
});

describe('o fade dos corpos — dentro do sistema nada muda', () => {
  it('na vista de abertura a opacidade é a de sempre, 0,95', () => {
    // a câmera de brinquedo está a 10 unidades, mas a régua do fade é a
    // distância em pc, e ela só começa a morder a 0,01 pc: aqui a
    // distância É 10 pc, então o teste usa a escala real
    const cam = camera();
    cam.position.set(0, 0, 0.001); // 0,001 pc — 9× mais perto que o começo
    cam.updateMatrixWorld(true);
    const p = new Float32Array(30);
    const rotulos = projectCorpos(cam, CORPOS_DO_SISTEMA, p);
    for (const l of rotulos) expect(l.opacity).toBeCloseTo(0.95, 12);
  });

  it('e some quando a casa vira um ponto — visitar uma estrela apaga os dez', () => {
    const cam = camera();
    cam.position.set(0, 0, CORPO_FADE_TERMINA_PC * 2);
    cam.updateMatrixWorld(true);
    const rotulos = projectCorpos(cam, CORPOS_DO_SISTEMA, new Float32Array(30));
    for (const l of rotulos) expect(l.opacity).toBe(0);
    // e a faixa é declarada, com o começo bem além da vista de abertura
    // (0,0011 pc): o fade nunca morde dentro do sistema
    expect(CORPO_FADE_COMECA_PC).toBeGreaterThan(0.005);
    expect(CORPO_FADE_TERMINA_PC).toBeGreaterThan(CORPO_FADE_COMECA_PC);
  });
});

// ============================================================
// A RÉGUA DE RELEVÂNCIA (item 82, N1) — a metade que o NASA Eyes não
// tem. A quadtree deles resolve SOBREPOSIÇÃO e resolve bem; e ainda
// assim mede-se quarenta nomes acesos numa vista da Terra, que é
// confusão. O Eyes nunca decide que um objeto não INTERESSA; só decide
// que ele não CABE. Estes vereditos guardam a decisão que falta.
//
// São de comportamento: nenhum pergunta o valor do orçamento nem o nome
// de uma constante. O que se cobra é a ORDEM (importância primeiro) e o
// TETO (a tela não carrega nomes sem fim), que é o que o dono vê.
// ============================================================
describe('a régua de relevância — importância antes de geometria', () => {
  const nome = (key: string, prioridade: number, distPc = 1): StarLabel => ({
    name: key, spect: '', distPc, x: 0.5, y: 0.5, opacity: 0.9, key, prioridade,
  });

  /** um céu com mais nomes do que a tela carrega */
  const ceuLotado = () => [
    ...Array.from({ length: 30 }, (_, i) =>
      nome(`bayer${i}`, PRIORIDADE_DO_ROTULO.estrelaBayer, 10 + i)
    ),
    ...Array.from({ length: 6 }, (_, i) =>
      nome(`propria${i}`, PRIORIDADE_DO_ROTULO.estrelaPropria, 5 + i)
    ),
    nome('planeta', PRIORIDADE_DO_ROTULO.planeta, 0.001),
    nome('sol', PRIORIDADE_DO_ROTULO.sol, 0.0001),
  ];

  it('a tela tem TETO: sobra nome de fora, por mais que projete', () => {
    const lista = aplicarReguaDeRelevancia(ceuLotado());
    const passaram = lista.filter((l) => !l.cortadoPelaRegua);
    expect(passaram.length).toBeLessThan(lista.length);
    expect(passaram.length).toBe(ORCAMENTO_DE_NOMES);
  });

  it('quem passa vale MAIS que quem some — sempre, sem exceção', () => {
    // é isto que separa uma régua de relevância de um corte arbitrário:
    // o menor prioritário que ficou ainda é ≥ o maior que saiu
    const lista = aplicarReguaDeRelevancia(ceuLotado());
    const passaram = lista.filter((l) => !l.cortadoPelaRegua);
    const cortados = lista.filter((l) => l.cortadoPelaRegua);
    const menorQueFicou = Math.min(...passaram.map((l) => l.prioridade!));
    const maiorQueSaiu = Math.max(...cortados.map((l) => l.prioridade!));
    expect(menorQueFicou).toBeGreaterThanOrEqual(maiorQueSaiu);
  });

  it('o Sol e o planeta NUNCA cedem a estrela de fundo', () => {
    const lista = aplicarReguaDeRelevancia(ceuLotado());
    for (const chave of ['sol', 'planeta']) {
      expect(lista.find((l) => l.key === chave)!.cortadoPelaRegua, chave).toBeFalsy();
    }
  });

  it('a designação de Bayer é o primeiro degrau a cair', () => {
    // as dezessete estrelas que faziam o nó na abertura eram quase todas
    // designações (ε Ind, ι Pav, τ PsA…): o último degrau da tabela some
    // sozinho, sem uma regra nova que o nomeie
    const lista = aplicarReguaDeRelevancia(ceuLotado());
    const bayerVivas = lista.filter(
      (l) => l.prioridade === PRIORIDADE_DO_ROTULO.estrelaBayer && !l.cortadoPelaRegua
    );
    const propriasVivas = lista.filter(
      (l) => l.prioridade === PRIORIDADE_DO_ROTULO.estrelaPropria && !l.cortadoPelaRegua
    );
    expect(propriasVivas.length).toBe(6);
    expect(bayerVivas.length).toBeLessThan(propriasVivas.length);
  });

  it('a ORDEM da lista é a disputa: quem vale mais chega antes', () => {
    // o `LabelCanvas` ocupa na ordem em que recebe, então ordenar aqui É
    // decidir quem sobrevive à colisão
    const lista = aplicarReguaDeRelevancia(ceuLotado());
    for (let i = 1; i < lista.length; i++) {
      expect(lista[i - 1].prioridade!).toBeGreaterThanOrEqual(lista[i].prioridade!);
    }
  });

  it('a histerese segura quem já estava na tela — o corte não PISCA', () => {
    // dois de mesmo peso disputando a última vaga trocariam de lugar a
    // cada quadro em que a projeção andasse um pixel
    const lista = () => [
      nome('sol', PRIORIDADE_DO_ROTULO.sol, 0.0001),
      nome('longe', PRIORIDADE_DO_ROTULO.estrelaPropria, 9),
      nome('perto', PRIORIDADE_DO_ROTULO.estrelaPropria, 8),
    ];
    // sem memória, o mais PERTO vem antes
    expect(aplicarReguaDeRelevancia(lista(), undefined, 2).map((l) => l.key))
      .toEqual(['sol', 'perto', 'longe']);
    // com o bônus de quem estava desenhado, o que já se lia continua lido
    const comMemoria = aplicarReguaDeRelevancia(lista(), new Set(['longe']), 2);
    expect(comMemoria.map((l) => l.key)).toEqual(['sol', 'longe', 'perto']);
    expect(comMemoria.find((l) => l.key === 'perto')!.cortadoPelaRegua).toBe(true);
  });

  it('nome invisível não gasta vaga — a lua colada no pai não expulsa ninguém', () => {
    // `esmaecerLuasColadasNoPai` derruba a opacidade das 21 luas quase a
    // zero; se elas consumissem orçamento, empurrariam para fora nomes
    // que o visitante VÊ
    const fantasmas = Array.from({ length: 20 }, (_, i) => {
      const l = nome(`lua${i}`, PRIORIDADE_DO_ROTULO.lua, 0.01);
      l.opacity = OPACIDADE_MINIMA_DO_ROTULO / 2;
      return l;
    });
    const visiveis = Array.from({ length: 4 }, (_, i) =>
      nome(`propria${i}`, PRIORIDADE_DO_ROTULO.estrelaPropria, 5 + i)
    );
    const lista = aplicarReguaDeRelevancia([...fantasmas, ...visiveis]);
    for (const v of visiveis) {
      expect(lista.find((l) => l.key === v.key)!.cortadoPelaRegua, v.key).toBeFalsy();
    }
  });
});

// ============================================================
// O DISCO DE QUALQUER CORPO ESCONDE NOME (item 115, bloco B, peça 2).
//
// Até 31/08 a lista de oclusores tinha UM item — o Sol —, e o mergulho
// 08 fotografou a consequência (`nossa-03-terra-corpo.png`): FOMALHAUT e
// ALNAIR impressos em branco sobre o disco iluminado da Terra,
// descrevendo estrelas que estão ATRÁS do planeta. O Eyes oclui por
// qualquer corpo, por rótulo, todo quadro.
//
// A conta de `escondidaPorDisco` não mudou uma linha: o que mudou é
// quem entra nela. Aqui se julgam as três metades da lei nova — a
// estrela atrás do globo não nasce, o corpo atrás de outro corpo não
// nasce, e nenhum corpo esconde a si mesmo.
// ============================================================
describe('o disco de qualquer corpo esconde nome (item 115)', () => {
  /** um oclusor de raio `r` a `z` na frente da câmera (que está em z=10) */
  const disco = (z: number, r: number, chave?: string) => ({ x: 0, y: 0, z, raio: r, chave });

  it('a estrela ATRÁS de um planeta perde o nome; a do lado, não', () => {
    const cam = camera();
    // uma estrela na mira, a 200 pc, e outra deslocada — as duas visíveis
    const naMira = { n: 'Atrás', x: 0, y: 0, z: -200, m: 1, s: 'A0V', d: 200, t: 0 };
    const aoLado = { n: 'AoLado', x: 60, y: 0, z: -200, m: 1, s: 'A0V', d: 200, t: 0 };
    // a câmera está a 10 pc da origem, então o `sol-home` também nasce;
    // o que se julga aqui são as duas nomeadas
    const soAsDuas = (l: StarLabel[]) => l.map((x) => x.key).filter((k) => k !== 'sol-home');
    expect(soAsDuas(projectLabels(cam, [naMira, aoLado], 7, undefined, [])).sort()).toEqual([
      'AoLado', 'Atrás',
    ]);
    // o globo entra entre a câmera e a estrela da mira: 0,3 de raio a 3
    // de distância cobre bem mais do que o ponto dela
    const comDisco = projectLabels(cam, [naMira, aoLado], 7, undefined, [disco(7, 0.3)]);
    expect(soAsDuas(comDisco)).toEqual(['AoLado']);
  });

  it('o corpo ATRÁS de outro corpo perde o nome — a mesma lei, o mesmo cone', () => {
    const cam = camera();
    const p = new Float32Array(6);
    // dois corpos alinhados com a câmera: o primeiro em z=8, o segundo
    // em z=0, atrás dele
    p[2] = 8;
    p[5] = 0;
    const dois = [
      { chave: 'corpo:frente', nome: 'Frente', classe: 'planeta' },
      { chave: 'corpo:atras', nome: 'Atrás', classe: 'planeta' },
    ];
    expect(projectCorpos(cam, dois, p).map((l) => l.key)).toEqual([
      'corpo:frente', 'corpo:atras',
    ]);
    const oclusores = [disco(8, 0.5, 'corpo:frente')];
    expect(projectCorpos(cam, dois, p, oclusores).map((l) => l.key)).toEqual(['corpo:frente']);
  });

  it('nenhum corpo esconde a SI MESMO, nem um bilionésimo à frente', () => {
    const cam = camera();
    const p = new Float32Array(3);
    p[2] = 8;
    const um = [{ chave: 'corpo:frente', nome: 'Frente', classe: 'planeta' }];
    // NO MESMO PONTO o empate de distância já salvaria o nome. O que a
    // chave protege é o caso em que as duas fontes NÃO coincidem bit a
    // bit — e elas são duas de verdade: o disco do Sol é a ORIGEM
    // constante (`oclusoresDeRotulo[0]`) e o rótulo dele sai do buffer da
    // camada. Um bilionésimo de parsec à frente e, sem a chave, o corpo
    // cai dentro do próprio cone com cosseno 1 e some da tela.
    expect(projectCorpos(cam, um, p, [disco(8, 0.5, 'corpo:frente')])).toHaveLength(1);
    expect(projectCorpos(cam, um, p, [disco(8 + 1e-9, 0.5, 'corpo:frente')])).toHaveLength(1);
    // e o MESMO disco com outra chave (um vizinho no caminho) esconde
    expect(projectCorpos(cam, um, p, [disco(8 + 1e-9, 0.5, 'corpo:outro')])).toHaveLength(0);
  });
});

// ============================================================
// §2 APARIÇÃO — as regras do NASA Eyes (item 125, ONDA DA PARIDADE, F2)
//
// O que se julga aqui é a CONTA, com os literais do bundle deles ao
// lado. Cada bloco tem a sabotagem que ele morde escrita por extenso: se
// a conta mudar de sinal, de limiar ou de duração, uma destas linhas cai.
// ============================================================

/** a câmera bem dentro do sistema, onde o fade de distância ainda não morde */
const PERTO = 0.005;

describe('A5 — o rótulo CEDE quando o corpo ENCHE a tela', () => {
  it('a régua é o literal DefaultVisibleFar: pleno em 0,02, zero em 0,03', () => {
    // `new VisibleInterval(0, .02, "normal-radius")`, fadeBlur .5
    expect(RAIO_NDC_DE_CESSAO).toBe(0.02);
    expect(BORRAO_DA_CESSAO).toBe(0.5);
    // `sai = clamp01((1 − r/max)/fadeBlur + 1)`
    expect(cessaoPorTamanhoAparente(0)).toBe(1);
    expect(cessaoPorTamanhoAparente(0.019)).toBe(1);
    expect(cessaoPorTamanhoAparente(0.02)).toBeCloseTo(1, 12);
    expect(cessaoPorTamanhoAparente(0.025)).toBeCloseTo(0.5, 12);
    expect(cessaoPorTamanhoAparente(0.03)).toBeCloseTo(0, 12);
    expect(cessaoPorTamanhoAparente(0.06)).toBe(0);
    // SABOTAGEM QUE ISTO MORDE: inverter o sinal do fade
    // (`(r/max − 1)/blur + 1`) faz o nome sumir quando o corpo é PEQUENO
    // e aparecer quando enche a tela — em 0,019 o valor cairia a 0 e em
    // 0,06 subiria a 1, e as duas pontas acima acusam.
  });

  it('min = 0: NUNCA some por ser pequeno — a outra ponta é lei', () => {
    // No Eyes `min = 0` faz a metade `entra` valer 1 sempre; aqui ela
    // nem existe, e é isto que prova que não nasceu por engano.
    for (const r of [0, 1e-12, 1e-6, 1e-3, 0.01]) {
      expect(cessaoPorTamanhoAparente(r), `r=${r}`).toBe(1);
    }
  });

  it('o raio aparente é EXATO em NDC, não a aproximação de ângulo pequeno', () => {
    const tanHalfFov = Math.tan(Math.PI / 6); // lente de 60°
    // s = 0,6 ⇒ tan(asin 0,6) = 0,6/0,8 = 0,75, e não 0,6
    expect(raioAparenteNdc(6, 10, tanHalfFov)).toBeCloseTo(0.75 / tanHalfFov, 12);
    // longe, as duas formas coincidem — é lá que a aproximação valia
    expect(raioAparenteNdc(1, 1e6, tanHalfFov)).toBeCloseTo(1e-6 / tanHalfFov, 15);
    // CÂMERA DENTRO DO CORPO: cedeu de vez, sem NaN
    expect(raioAparenteNdc(10, 10, tanHalfFov)).toBe(Number.POSITIVE_INFINITY);
    expect(cessaoPorTamanhoAparente(raioAparenteNdc(10, 5, tanHalfFov))).toBe(0);
    // entrada degenerada não vira NaN nem infinito
    expect(raioAparenteNdc(0, 10, tanHalfFov)).toBe(0);
    expect(raioAparenteNdc(1, 0, tanHalfFov)).toBe(0);
  });

  it('em projectCorpos o nome apaga ENTRE os dois raios, e some no de cima', () => {
    // A câmera DENTRO do sistema (0,005 pc), senão o fade de distância
    // dos corpos (`CORPO_FADE_*`, 0,01→0,05 pc) já zera tudo e a régua
    // nova mediria zero contra zero.
    const cam = new THREE.PerspectiveCamera(60, 1.6, 1e-9, 1000);
    cam.position.set(0, 0, PERTO);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld(true);
    const tanHalfFov = Math.tan((60 / 2) * (Math.PI / 180));
    const um = [CORPOS_DO_SISTEMA[3]];
    const p = new Float32Array(3);
    /** o raio que põe o corpo exatamente em `alvoNdc` de raio aparente */
    const raioPara = (alvoNdc: number) => {
      const tan = alvoNdc * tanHalfFov;
      const s = tan / Math.sqrt(1 + tan * tan);
      return s * PERTO;
    };
    const alfaCom = (alvoNdc: number) => {
      const r = raioPara(alvoNdc);
      const l = projectCorpos(cam, um, p, undefined, () => r)[0];
      return l ? { op: l.opacity, causa: l.causaDoSumico } : null;
    };
    const pequeno = alfaCom(0.001)!;
    const noJoelho = alfaCom(0.02)!;
    const meio = alfaCom(0.025)!;
    const cheio = alfaCom(0.03)!;
    const passou = alfaCom(0.035)!;
    expect(pequeno.op).toBeGreaterThan(0.9);
    expect(noJoelho.op).toBeCloseTo(pequeno.op, 10); // até 0,02 nada muda
    expect(meio.op).toBeCloseTo(pequeno.op * 0.5, 10);
    expect(cheio.op).toBeCloseTo(0, 12);
    // A CAUSA fica legível no estado (A10) — e SÓ na ponta de cima
    expect(pequeno.causa).toBeUndefined();
    expect(meio.causa).toBeUndefined();
    // NO JOELHO EXATO a cessão é um epsilon de ponto flutuante, não um
    // zero — a marca só se acende quando o multiplicador CHEGA a zero,
    // e a opacidade nessa fresta já está muito abaixo da soleira do
    // desenho (`OPACIDADE_MINIMA_DO_ROTULO`).
    expect(cheio.causa).toBeUndefined();
    expect(cheio.op).toBeLessThan(OPACIDADE_MINIMA_DO_ROTULO);
    expect(passou.op).toBe(0);
    expect(passou.causa).toBe('tamanho');
  });

  it('sem o fio do raio a régua não roda — o ramo velho fica intacto', () => {
    const cam = new THREE.PerspectiveCamera(60, 1.6, 1e-9, 1000);
    cam.position.set(0, 0, PERTO);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld(true);
    const um = [CORPOS_DO_SISTEMA[3]];
    const p = new Float32Array(3);
    const semFio = projectCorpos(cam, um, p)[0];
    const comFioNulo = projectCorpos(cam, um, p, undefined, () => null)[0];
    expect(semFio.opacity).toBe(comFioNulo.opacity);
    expect(semFio.opacity).toBeGreaterThan(0.9);
  });

  it('o CANAL PRIMÁRIO sai da classe: planeta e estrela leem mais forte', () => {
    const rotulos = projectCorpos(camera(), CORPOS_DO_SISTEMA, posicoes());
    const porChave = new Map(rotulos.map((l) => [l.key, l]));
    expect(porChave.get(`${CHAVE_DE_CORPO}sun`)!.canalPrimario).toBe(true);
    expect(porChave.get(`${CHAVE_DE_CORPO}earth`)!.canalPrimario).toBe(true);
    expect(porChave.get(`${CHAVE_DE_CORPO}pluto`)!.canalPrimario).toBe(false);
  });
});

describe('A8/A9 — os fades do rótulo em DUAS camadas, e a final é o produto', () => {
  /** um rótulo cru, sem passar por projeção */
  function rot(over: Partial<StarLabel> = {}): StarLabel {
    return { name: 'X', spect: '', distPc: 1, x: 0.5, y: 0.5, opacity: 1, key: 'x', ...over };
  }

  it('os alfas de dentro são os literais da folha deles', () => {
    expect(ALFA_DO_TEXTO_SECUNDARIO).toBe(0.35); // --secondaryFadeIn
    expect(ALFA_DO_TEXTO_PRIMARIO).toBe(0.75); // --primaryFadeIn
    expect(ALFA_DO_TEXTO_ESCONDIDO).toBe(0.05); // --*FadeOut
    expect(ALFA_DO_TEXTO_APONTADO).toBe(1); // --hoverOpacity
  });

  it('o rótulo NASCE no alfa de repouso do canal, e a variante planeta é outra', () => {
    const rampas = new RampasDeRotulo();
    const comum = rot();
    const planeta = rot({ key: 'p', canalPrimario: true });
    rampas.aplicar([comum, planeta], 0);
    expect(comum.alfaDoTexto).toBe(ALFA_DO_TEXTO_SECUNDARIO);
    expect(planeta.alfaDoTexto).toBe(ALFA_DO_TEXTO_PRIMARIO);
    // o canal do ÍCONE viaja calculado, para a F5 plugar
    expect(comum.alfaDoIcone).toBe(ALFA_DO_TEXTO_SECUNDARIO);
    // e a camada de FORA ainda está subindo: a final é o PRODUTO
    expect(comum.opacity).toBe(0);
  });

  it('a opacidade final é o produto das DUAS camadas', () => {
    const rampas = new RampasDeRotulo();
    // meio caminho da camada de fora: 0,125 s de 0,25
    const l = rot();
    rampas.aplicar([l], RAMPA_DE_ENTRADA_S / 2);
    expect(l.opacity).toBeCloseTo(0.5, 12);
    expect(l.alfaDoTexto).toBe(ALFA_DO_TEXTO_SECUNDARIO);
    // o desenho pinta `opacity × alfaDoTexto` — 0,5 × 0,35
    expect(l.opacity * l.alfaDoTexto!).toBeCloseTo(0.175, 12);
    // SABOTAGEM QUE ISTO MORDE: pintar só uma das camadas (0,5 ou 0,35)
    // deixa a curva linear e este produto desmente.
  });

  it('a camada de dentro gasta 250 ms para ENTRAR e 750 ms para SAIR', () => {
    const rampas = new RampasDeRotulo();
    const l = rot();
    rampas.aplicar([l], 0); // nasce em 0,35
    // ESCONDIDO: 0,35 → 0,05, em 750 ms (a duração é do CSS, não uma
    // taxa: o percurso inteiro cabe na duração, qualquer que seja)
    l.causaDoSumico = 'tamanho';
    rampas.aplicar([l], RAMPA_DE_SAIDA_S / 3);
    expect(l.alfaDoTexto).toBeCloseTo(0.35 - (0.35 - 0.05) / 3, 12);
    rampas.aplicar([l], (RAMPA_DE_SAIDA_S * 2) / 3);
    expect(l.alfaDoTexto).toBe(ALFA_DO_TEXTO_ESCONDIDO);
    // VOLTOU: 0,05 → 0,35 em 250 ms
    l.causaDoSumico = undefined;
    rampas.aplicar([l], RAMPA_DE_ENTRADA_S / 2);
    expect(l.alfaDoTexto).toBeCloseTo(0.05 + (0.35 - 0.05) / 2, 12);
    rampas.aplicar([l], RAMPA_DE_ENTRADA_S / 2);
    expect(l.alfaDoTexto).toBe(ALFA_DO_TEXTO_SECUNDARIO);
    // SABOTAGEM QUE ISTO MORDE: trocar as duas durações de lugar (750
    // para entrar, 250 para sair) muda os dois números do meio.
  });

  it('A12 — o hover leva o texto a 1 em 250 ms, e escondido não recebe ponteiro', () => {
    const rampas = new RampasDeRotulo();
    const l = rot();
    rampas.aplicar([l], 0);
    expect(l.alfaDoTexto).toBe(ALFA_DO_TEXTO_SECUNDARIO);
    l.apontado = true;
    rampas.aplicar([l], RAMPA_DE_ENTRADA_S / 2);
    expect(l.alfaDoTexto).toBeCloseTo(0.35 + (1 - 0.35) / 2, 12);
    rampas.aplicar([l], RAMPA_DE_ENTRADA_S / 2);
    expect(l.alfaDoTexto).toBe(ALFA_DO_TEXTO_APONTADO);
    // `.hidden { pointer-events: none }` — o ponteiro não alcança quem saiu
    const morto = rot({ key: 'm', apontado: true, causaDoSumico: 'tamanho' });
    rampas.aplicar([morto], 0);
    expect(morto.alfaDoTexto).toBe(ALFA_DO_TEXTO_ESCONDIDO);
  });
});

describe('A10 — duas causas de sumiço, a MESMA duração de fade', () => {
  function rot(over: Partial<StarLabel> = {}): StarLabel {
    return { name: 'X', spect: '', distPc: 1, x: 0.5, y: 0.5, opacity: 1, key: 'x', ...over };
  }

  it('a causa fica legível no estado — e são duas palavras diferentes', () => {
    const lista = [
      rot({ key: 'a', prioridade: 10 }),
      rot({ key: 'b', prioridade: 9 }),
      rot({ key: 'c', prioridade: 8 }),
    ];
    aplicarReguaDeRelevancia(lista, undefined, 1);
    expect(lista[0].causaDoSumico).toBeUndefined();
    expect(lista[1].causaDoSumico).toBe('disputa');
    expect(lista[2].causaDoSumico).toBe('disputa');
    expect(lista[1].cortadoPelaRegua).toBe(true);
  });

  it('cedido por TAMANHO e cortado pela DISPUTA descem juntos, passo a passo', () => {
    const rampas = new RampasDeRotulo();
    const porTamanho = rot({ key: 'tamanho' });
    const porDisputa = rot({ key: 'disputa' });
    // os dois nascem na tela e sobem a camada de fora até o topo
    rampas.aplicar([porTamanho, porDisputa], RAMPA_DE_ENTRADA_S);
    expect(porTamanho.opacity).toBe(1);
    expect(porDisputa.opacity).toBe(1);
    // agora um sai por cada porta, e as trilhas têm de coincidir
    const trilhaT: number[] = [];
    const trilhaD: number[] = [];
    for (let i = 0; i < 5; i++) {
      porTamanho.opacity = 1;
      porTamanho.causaDoSumico = 'tamanho';
      porDisputa.opacity = 1;
      porDisputa.cortadoPelaRegua = true;
      porDisputa.causaDoSumico = 'disputa';
      rampas.aplicar([porTamanho, porDisputa], RAMPA_DE_SAIDA_S / 4);
      trilhaT.push(porTamanho.opacity);
      trilhaD.push(porDisputa.opacity);
    }
    expect(trilhaT).toEqual(trilhaD);
    expect(trilhaT[0]).toBeCloseTo(0.75, 12); // 750 ms, um quarto por passo
    expect(trilhaT[3]).toBe(0);
    // SABOTAGEM QUE ISTO MORDE: dar à cessão por tamanho uma duração
    // própria (ou não a mandar para a rampa) rompe a igualdade das duas
    // trilhas na primeira linha.
  });
});
