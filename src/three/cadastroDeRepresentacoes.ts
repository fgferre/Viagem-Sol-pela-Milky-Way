// ============================================================
// O CADASTRO DE REPRESENTAÇÕES — o censo da luz, em código.
//
// Em prosa o censo apodreceu em menos de 24 h (LEI-DA-ESTRELA §2); aqui ele
// é uma tabela no molde de `CADASTRO_DE_ESCALA`, com teste que cobra a
// coerência contra o fonte (`cadastroDeRepresentacoes.test.ts`): quem
// declara consumir a lei tem de importá-la; quem declara que não, não pode;
// e as varreduras de emissores são REPRODUZÍVEIS — o comando é o próprio
// teste, não uma lembrança.
//
// SÃO DUAS VARREDURAS, e a segunda nasceu de um escape por construção: a
// primeira só enxerga `gl_PointSize`, e quem desenha luz em QUAD aditivo
// (as 16 heroes de autor) passava por ela sem ser vista — o cadastro
// ficou quatro dias afirmando que "as 16" tinham morrido com uma peça
// VIVA em cena. `PADRAO_DE_QUAD_ADITIVO` fecha esse buraco.
//
// `destino` é uma de quatro palavras (§2):
//   migra        — passa a consumir `estrela.ts` na migração indicada
//   morre        — some, e a varredura invertida o vigia
//   instrumento  — consome a LEI (parâmetros), não a implementa
//   fora-da-lei  — não é cena / não é fonte estelar, com razão escrita
// ============================================================

export type DestinoDaRepresentacao = 'migra' | 'morre' | 'instrumento' | 'fora-da-lei';
export type MigracaoDaLei = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | null;

export interface RepresentacaoDeclarada {
  /** id estável, o mesmo espírito do cadastro de escala */
  id: string;
  /** o que o leitor humano entende */
  nome: string;
  /** arquivos que DESENHAM esta representação (prefixo vale para pastas)
   *  — e, quando a lei é consumida por um maestro de fora (o director
   *  calcula `repartir` e escreve atributo/uniform na camada), o arquivo
   *  que a FIA entra na lista: é ele que carrega o import cobrado. */
  arquivos: readonly string[];
  /** já consome `estrela.ts`? O teste cobra o import de verdade: entrada
   *  que consome tem PELO MENOS UM arquivo importando a lei; entrada que
   *  não consome não pode ter NENHUM (arquivo partilhado com uma entrada
   *  consumidora é cobrado pela regra dela). */
  consomeL1: boolean;
  /** a lei velha desta representação já foi APAGADA? (regra i do §4) */
  leiVelhaApagada: boolean;
  /**
   * quantas vezes o que ela EMITE excede a lei da casa — `1` é honesto,
   * `null` é "ainda não medido nesta unidade", e null NÃO é desculpa: é a
   * declaração de que a medição está devida (mesma doutrina da coluna irmã
   * em `escala.ts`).
   */
  fatorDeBrilho: number | null;
  destino: DestinoDaRepresentacao;
  migracao: MigracaoDaLei;
  /** emite `gl_PointSize`? — a varredura reproduzível confere esta coluna */
  emiteGlPointSize: boolean;
  razao: string;
}

export const CADASTRO_DE_REPRESENTACOES: readonly RepresentacaoDeclarada[] = [
  {
    id: 'catalogo-hyg',
    nome: 'catálogo HYG (328.749 pontos)',
    arquivos: ['src/three/world/stars.ts', 'src/three/shaders/starShaders.ts'],
    // consumo PARCIAL desde o M2: espinhos e branqueamento do STAR_FRAG
    // derivam das constantes da lei (FRACAO_DOS_ESPINHOS,
    // BRANQUEAMENTO_MEIA_ALTURA — o clamp `sat` morreu); a migração
    // plena da PSF pela repartição continua sendo o M3.
    consomeL1: true,
    leiVelhaApagada: false,
    fatorDeBrilho: 1,
    destino: 'migra',
    migracao: 'M3',
    emiteGlPointSize: true,
    razao: 'a lei do ponto (PSF + β na emissão) é a referência da unidade de tela',
  },
  {
    id: 'cascas',
    nome: 'cascas procedurais',
    arquivos: ['src/three/world/wrappedStars.ts'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: null,
    destino: 'migra',
    migracao: 'M3',
    emiteGlPointSize: true,
    razao:
      'lei própria de magnitude (m = MV + 5log₁₀d − 5 + ext·d) e cessão por ' +
      'tamanho zerado no vertex — a terceira convenção de cessão da casa; M3 ' +
      'unifica ou prova por teste que deposita o mesmo fluxo do catálogo',
  },
  {
    id: 'sol-ponto',
    nome: 'Sol-ponto (vértice 0 da camada dos dez)',
    arquivos: [
      'src/three/world/planetas/planetas.ts',
      'src/three/director/solNoQuadro.ts',
    ],
    consomeL1: true,
    leiVelhaApagada: true,
    fatorDeBrilho: 1,
    destino: 'migra',
    migracao: 'M1',
    emiteGlPointSize: true,
    razao:
      'FECHADO no M1: aCede = wResolvido da repartição (o módulo do Sol fia — ' +
      'corte 8 da arquitetura; a camada desenha), a entrega ao SunStar e o ' +
      'corte de 0,05 pc morreram, ?bcede morreu',
  },
  {
    id: 'planetas',
    nome: 'os 9 planetas-ponto',
    arquivos: ['src/three/world/planetas/planetas.ts'],
    consomeL1: true,
    leiVelhaApagada: true,
    fatorDeBrilho: 1,
    destino: 'instrumento',
    migracao: 'M4',
    emiteGlPointSize: true,
    razao:
      'FECHADO no M4: não são estrelas — consomem o INSTRUMENTO (a ' +
      '`CalibracaoDaCasa` de estrela.ts: expoM0, sigmaPx e o β da emissão, ' +
      'escritos UMA vez no construtor) e NÃO a repartição, nem a radiância ' +
      'de corpo negro, nem o clarão de asas: o brilho é luz do Sol ' +
      'refletida (H por corpo), a cor é albedo por banda e a fase é MH18. ' +
      'Morreram `PsfDoCampo` — a interface por onde o MATERIAL do campo de ' +
      'catálogo entregava a PSF, amarrando a calibração dos dez ao ' +
      'ponto-zero que o M3 ainda vai mover — e a chave ' +
      '`PLANETAS_DEFAULT_ON` com a porta `?plan` (regra iv). ' +
      'fatorDeBrilho 1 é MEDIDO, não herdado: o pico que o ?dbgplan ' +
      'publica é `picoDaPsf` da lei, bit a bit (planetas.test.ts), e o ' +
      'delta em pixel do M4 foi ZERO nas 52 vistas — o director sempre ' +
      'entregou ao campo os mesmos EXPO_M0/SIGMA_PX, então o que mudou foi ' +
      'a DIREÇÃO da dependência, não o número',
  },
  {
    id: 'ponto-na-borda',
    nome: 'prender o ponto 1 px dentro do clip (item 70, causa 2)',
    arquivos: ['src/three/shaders/pontoNaBorda.ts'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: 1,
    destino: 'instrumento',
    migracao: 'M3',
    emiteGlPointSize: true,
    razao:
      'não é fonte nova: o GLSL é injetado no vertex do catálogo, das cascas ' +
      'e dos planetas. Escreve gl_PointSize para o sprite crescer quando o ' +
      'vértice é preso, e a PSF é avaliada na posição verdadeira. Sem esta ' +
      'linha o cadastro fica cego ao arquivo que o item 70 nasceu — foi o ' +
      'buraco que a primeira fatia do item 99 fechou',
  },
  {
    id: 'heroes',
    nome: 'o clarão de asas (orçamento de fontes fortes) — hoje SÓ o Sol',
    arquivos: ['src/three/world/clarao.ts', 'src/three/director/solNoQuadro.ts'],
    consomeL1: true,
    leiVelhaApagada: true,
    fatorDeBrilho: 1,
    destino: 'migra',
    migracao: 'M2',
    emiteGlPointSize: false,
    razao:
      'FECHADO no M2: a asa Moffat da lei, por orçamento de fluxo com ' +
      'histerese (§5.21), profundidade pela §5.15. A frase do M2 sobre a ' +
      'morte da identidade "as 16" CAIU no resgate de 16/08 (ordem do dono, ' +
      'commit 4ca23b7): a camada desenha só o candidato 0 (`n = 1` em ' +
      '`atualizar`) e as nomeadas voltaram à arte de autor — linha ' +
      '`heroes-de-autor` aqui embaixo. CAPACIDADE MAIOR QUE O USO, ' +
      'declarada: 16 slots (ORCAMENTO_DO_CLARAO) e arrays de 1.727 ' +
      'entradas (Sol + 1.726 nomeadas) para UM candidato. É RESERVA do ' +
      'M3 e não encolhe — mexer na contagem de objetos da cena é ' +
      'mudança de pixel, que se prova em A/B no navegador',
  },
  {
    id: 'heroes-de-autor',
    nome: 'as 16 heroes de autor (billboards da arte de 30/07)',
    arquivos: ['src/three/world/heroStars.ts'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: null,
    destino: 'migra',
    migracao: 'M3',
    // não emite ponto: são QUADS aditivos, achados pela SEGUNDA varredura
    emiteGlPointSize: false,
    razao:
      'VIVA e em cena — o director instancia `HeroStars(meta.named)`. O M2 ' +
      'apagou a peça e o dono mandou exumá-la do git em 16/08 (4ca23b7); o ' +
      'cadastro seguiu dizendo que "as 16" tinham morrido, e é essa mentira ' +
      'que esta linha desfaz. NÃO consome a lei: tamanho, brilho e cor saem ' +
      'da arte do filme (0,08·10^(−0,3m) em pc, braço 16/2,4, cintilação) — ' +
      'declarado, não esquecido. A DUPLA-LUZ é o preço aberto: o ponto do ' +
      'catálogo e o hero desenham a MESMA estrela juntos, sem cessão nenhuma ' +
      'entre eles (medido em Sirius: ~69% da luz de um disco de 120 px vem ' +
      'do hero, e nada esmaece o ponto quando ele entra). Quem fecha a ' +
      'cessão é o M3, com o gate de foto do dono na estética — e o ' +
      'fatorDeBrilho fica null até a medição na unidade da casa',
  },
  // (a entrada `sunstar` saiu do censo no M1: a classe morreu — o Sol de
  // longe é o próprio `sol-ponto`, e a varredura invertida vigia o nome.)
  {
    id: 'corpo-do-sol',
    nome: 'o corpo do Sol (malha + S/C/E vendorizado)',
    arquivos: ['src/three/world/stellarBody.ts', 'src/three/world/sol'],
    consomeL1: true,
    leiVelhaApagada: true,
    fatorDeBrilho: null,
    destino: 'migra',
    migracao: 'M1',
    emiteGlPointSize: true,
    razao:
      'FECHADO no M1: uFiltroSolar = overrideExpoente e uWorldFade = peso da lei ' +
      '(fator de brilho VIVO 2,7e10^(1−g) pela rampa, §5.8 — por rampa, não por ' +
      'número único); S/C/E nomeados em estadoDaLei. Item 5 (21/08): a fase do ' +
      'ciclo vem da DATA SIMULADA (faseDoCiclo, estrela.ts) e o estado das ' +
      'regiões/manchas é função pura dela — o pino do Atlas e a torção de fase ' +
      'morreram. A DOSE de ocupação do arranque (director/doseDoSol.ts) é a ' +
      'assistência que sobrou, declarada no selo: atenua QUANTO, nunca QUANDO. ' +
      'Dívida nomeada: a esfera analítica (§1) nasce no M3/E3 — até lá wEsfera ' +
      'é degenerado (só malha)',
  },
  {
    id: 'particulas-da-galaxia',
    nome: 'partículas da galáxia (4,02 M)',
    arquivos: ['src/three/world/galaxy.ts', 'src/three/shaders/galaxyShaders.ts'],
    // consumo PARCIAL desde o M5, no molde do catálogo HYG: a LEI DE TELA
    // (piso 0,7 / platô 3 / teto 20) saiu daqui e virou `leiDeTela` em
    // `estrela.ts` — os números eram os DA CASA, então esta camada não moveu
    // um pixel; o que mudou foi a direção da dependência. `uMaxPx` morreu
    // com ela. A migração de REPRESENTAÇÃO continua sendo o M6.
    consomeL1: true,
    leiVelhaApagada: false,
    fatorDeBrilho: null,
    destino: 'migra',
    migracao: 'M6',
    emiteGlPointSize: true,
    razao:
      'aAlpha artístico vira fluxo na unidade; o platô 3–20 px e o ramo 1/px² ' +
      '(a estrela que ESCURECE ao aproximar) morrem; maior risco visual — por ' +
      'último. Desde o M5 a lei de TELA já é a única (estrela.ts): o que falta ' +
      'aqui é a lei de FLUXO',
  },
  {
    id: 'laminas',
    nome: 'as 7 lâminas emissivas',
    arquivos: ['src/three/shaders/galaxyShaders.ts'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: null,
    destino: 'migra',
    migracao: 'M6',
    emiteGlPointSize: false,
    razao:
      'a cessão partículas↔lâminas é dupla-luz sem mecanismo nenhum — e desde ' +
      'o resgate de 16/08 não é a ÚNICA: catálogo↔heroes-de-autor é a outra, ' +
      'declarada na linha dela e agendada para o M3',
  },
  {
    id: 'glows-do-nucleo',
    nome: 'glow do bojo, halo térmico, anã de Sagitário, marcador do Sol',
    // o arquivo que os DESENHA é o dos shaders (GLOW_VERT/GLOW_FRAG), e ele
    // faltava aqui: a entrada citava só quem instancia os quatro materiais
    arquivos: ['src/three/world/galaxy.ts', 'src/three/shaders/galaxyShaders.ts'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: null,
    destino: 'migra',
    // DIVERGÊNCIA DECLARADA NO M5, no molde da do CME no M2: o M5 é a LEI
    // DE TELA — como um tamanho em pc vira pixel — e estes quatro NÃO têm
    // lei de tela nenhuma para apagar. São billboards de tamanho FÍSICO em
    // pc (uSize), sem px, sem clamp, sem piso: quem cuida do estouro de
    // perto é uma rampa de mão (`glowGate`, 5–13 kpc) e quem cuida do
    // tamanho é a projeção. O que sobra neles é FONTE fora-da-unidade — o
    // ganho artístico das rodadas 17–24, calibrado a olho pelo dono — e
    // esse é o assunto do M7, com o raymarch e os splats.
    migracao: 'M7',
    emiteGlPointSize: false,
    razao:
      'um GLOW_FRAG só, e ele não emite ponto: são QUADS de tamanho físico ' +
      'em pc, sem lei de tela para migrar (a do M5 é dos EMISSORES DE ' +
      'PONTO). O que falta é a EMISSÃO na unidade da casa — uColor carrega ' +
      'ganho de autor (glowgain, halo 0,3, as doses 0,32/0,11 do update) — e ' +
      'isso entra no M7 com o resto emissivo. O 1310 pc cravado na fenda ' +
      '(item 65) era outra dívida desta peça e foi paga à parte: a fenda ' +
      'segue a MESMA âncora gerada dos outros nove shaders',
  },
  {
    id: 'forjas',
    nome: 'forjas estelares (5 populações)',
    arquivos: ['src/three/world/starForges.ts'],
    consomeL1: true,
    leiVelhaApagada: true,
    fatorDeBrilho: null,
    destino: 'migra',
    migracao: 'M5',
    emiteGlPointSize: true,
    razao:
      'FECHADO no M5: carregava a SEGUNDA cópia da lei de tela de três ' +
      'regimes (piso 0,85 / teto 26 / px²÷0,7225) e ela MORREU — a camada ' +
      'chama `leiDeTela` de estrela.ts, nos números da casa (0,7 / 3 / 20). ' +
      'Muda pixel, e o delta é o assunto do commit: o depósito total é o ' +
      'mesmo nos dois pisos (px² dos dois lados), então o que se move é a ' +
      'REPARTIÇÃO — a forja de sub-pixel deixa de ser dividida por 0,7225 e ' +
      'clareia até 1,47×, e a forja gigante de perto perde 0,59× (teto 20 ' +
      'em vez de 26, com o mesmo shrink). fatorDeBrilho fica null e a ' +
      'dívida tem nome: aIntensity é artístico (0,16 por confiança nas H II, ' +
      '0,34 nos masers…), unidade que só entra na casa com o resto emissivo',
  },
  {
    id: 'raymarch-stellar',
    nome: 'termo stellar do raymarch da nebulosa',
    arquivos: ['src/three/shaders/nebulaShaders.ts'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: null,
    destino: 'migra',
    migracao: 'M7',
    emiteGlPointSize: false,
    razao: 'o resto emissivo, depois das fontes',
  },
  {
    id: 'splats-do-bake',
    nome: 'splats do bake de estrutura',
    arquivos: ['src/three/cartography/structureMap.ts'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: null,
    destino: 'migra',
    migracao: 'M7',
    emiteGlPointSize: false,
    razao: 'bake é cena congelada; entra por último com o raymarch',
  },
  {
    id: 'campo-2d-do-carregamento',
    nome: 'campo 2D do carregamento',
    arquivos: ['src/components/CartografiaCanvas.ts'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: null,
    destino: 'fora-da-lei',
    migracao: null,
    emiteGlPointSize: false,
    razao: '2D, não é cena — declarado fora, não esquecido fora',
  },
  {
    id: 'bloom-e-gradacao',
    nome: 'bloom + gradação',
    arquivos: ['src/three/core/post.ts', 'src/three/atlasConfig.ts'],
    consomeL1: true,
    leiVelhaApagada: true,
    fatorDeBrilho: null,
    destino: 'instrumento',
    migracao: 'M2',
    emiteGlPointSize: false,
    razao:
      'FECHADO no M2: pesos da pirâmide derivados da asa (PESO_POR_MIP = ' +
      '2^(2−2β)), raio pinado em 0, ombro 0,45/40 como lei sem porta — o ' +
      'kernel geométrico de ~190 px que era metade do halo constante morreu',
  },
  {
    id: 'poeira',
    nome: 'poeira (sprites de extinção)',
    arquivos: ['src/three/shaders/dustShaders.ts'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: null,
    destino: 'fora-da-lei',
    migracao: null,
    emiteGlPointSize: true,
    razao:
      'não é fonte estelar (absorve, não emite) — mas o censo a achou fora da lista ' +
      'com clamp(px, 1.0, 5.0), teto de 5 px NÃO declarado: dívida escrita aqui até ' +
      'a régua de tamanho dela ter dono',
  },
  {
    id: 'cme',
    nome: 'ejeções do Sol (CME, vendorizado)',
    arquivos: ['src/three/world/sol'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: null,
    destino: 'migra',
    // DIVERGÊNCIA DECLARADA NO M2 (mesmo molde das três do M1): o L1
    // havia agendado a emissão do CME "para o M2, com o resto do
    // exterior" — mas o M2 é a ÓPTICA (asa + bloom + espinhos), e o CME
    // é FONTE (campo E do §5.18): dose nunca calibrada (item 24 das
    // pendências), unidade própria do vendorizado. Entra com o resto
    // emissivo no M7, onde fonte fora-da-unidade é o assunto do commit.
    migracao: 'M7',
    emiteGlPointSize: true,
    razao:
      'campo E(x,t) do §5.18, NOMEADO no M1 (estadoDaLei, stellarBody) com ' +
      'critério de visibilidade PRÓPRIO (cone < texel, limboFade) — nunca o LOD ' +
      'do renderer; a EMISSÃO dele ainda não consome a lei: entra na unidade da ' +
      'casa no M7, com o resto emissivo (divergência do L1 declarada no M2)',
  },
];

/**
 * A varredura REPRODUZÍVEL do censo: os arquivos de `src/` que emitem
 * `gl_PointSize`. O teste roda esta varredura de verdade (fs) e compara com
 * a coluna `emiteGlPointSize` — o censo de memória foi o que deixou dois
 * emissores fora da lista da v1 da Lei.
 */
export const PADRAO_DE_EMISSOR = /gl_PointSize\s*=/;

/**
 * A SEGUNDA varredura: quem desenha luz em QUAD ADITIVO. As heroes de
 * autor escapavam da primeira POR CONSTRUÇÃO — billboard não emite
 * `gl_PointSize` —, e foi assim que uma peça viva ficou fora do censo.
 * Um arquivo é emissor quando casa com TODOS os padrões da lista.
 *
 * Aqui não há coluna irmã (nada como `emiteGlPointSize`): a coluna
 * existe para a direção ANTI-INFLAÇÃO, que cobra uma declaração; esta
 * varredura não pede declaração nenhuma — pede só que nada escape. A
 * obrigação é de mão única: todo emissor achado tem de estar coberto
 * por alguma linha do cadastro.
 */
export const PADRAO_DE_QUAD_ADITIVO: readonly RegExp[] = [
  /new THREE\.PlaneGeometry\(/,
  /AdditiveBlending/,
];
