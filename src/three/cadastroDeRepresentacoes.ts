// ============================================================
// O CADASTRO DE REPRESENTAÇÕES — o censo da luz, em código.
//
// Em prosa o censo apodreceu em menos de 24 h (LEI-DA-ESTRELA §2); aqui ele
// é uma tabela no molde de `CADASTRO_DE_ESCALA`, com teste que cobra a
// coerência contra o fonte (`cadastroDeRepresentacoes.test.ts`): quem
// declara consumir a lei tem de importá-la; quem declara que não, não pode;
// e a varredura de emissores (`gl_PointSize`) é REPRODUZÍVEL — o comando é o
// próprio teste, não uma lembrança.
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
  /** arquivos que DESENHAM esta representação (prefixo vale para pastas) */
  arquivos: readonly string[];
  /** já consome `estrela.ts`? O teste cobra o import (ou a ausência dele). */
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
    consomeL1: false,
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
    arquivos: ['src/three/world/planetas/planetas.ts'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: 1,
    destino: 'migra',
    migracao: 'M1',
    emiteGlPointSize: true,
    razao: 'a cessão pelo gate vira wResolvido da lei; a porta ?bcede morre junto',
  },
  {
    id: 'planetas',
    nome: 'os 9 planetas-ponto',
    arquivos: ['src/three/world/planetas/planetas.ts'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: 1,
    destino: 'migra',
    migracao: 'M4',
    emiteGlPointSize: true,
    razao: 'não são estrelas: consomem o INSTRUMENTO da lei e mantêm a fase MH18',
  },
  {
    id: 'heroes',
    nome: 'os 16 clarões hero',
    arquivos: ['src/three/world/heroStars.ts'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: null,
    destino: 'migra',
    migracao: 'M2',
    emiteGlPointSize: false,
    razao:
      'clarão de autor (0,08·10^(−0,3m)) vira o clarão de asas da lei, por ' +
      'orçamento das N mais brilhantes — a identidade "as 16" morre',
  },
  {
    id: 'sunstar',
    nome: 'SunStar (o clarão do Sol)',
    arquivos: ['src/three/world/heroStars.ts'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: null,
    destino: 'morre',
    migracao: 'M1',
    emiteGlPointSize: false,
    razao: 'a classe some; o clarão do Sol passa a sair da mesma lei de asas de todos',
  },
  {
    id: 'corpo-do-sol',
    nome: 'o corpo do Sol (malha + S/C/E vendorizado)',
    arquivos: ['src/three/world/stellarBody.ts', 'src/three/world/sol'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: null,
    destino: 'migra',
    migracao: 'M1',
    emiteGlPointSize: true,
    razao:
      'fotosfera na unidade com filtro declarado (fator VIVO 1..2,7e10 pela rampa — ' +
      'a entrada do cadastro de escala declara); M1 o liga a overrideExpoente e ' +
      'formaliza os três campos S/C/E do §5.18',
  },
  {
    id: 'particulas-da-galaxia',
    nome: 'partículas da galáxia (4,02 M)',
    arquivos: ['src/three/world/galaxy.ts', 'src/three/shaders/galaxyShaders.ts'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: null,
    destino: 'migra',
    migracao: 'M6',
    emiteGlPointSize: true,
    razao:
      'aAlpha artístico vira fluxo na unidade; o platô 3–20 px e o ramo 1/px² ' +
      '(a estrela que ESCURECE ao aproximar) morrem; maior risco visual — por último',
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
    razao: 'a cessão partículas↔lâminas é a única dupla-luz sem mecanismo nenhum',
  },
  {
    id: 'glows-do-nucleo',
    nome: 'glow do bojo, halo térmico, anã de Sagitário, marcador do Sol',
    arquivos: ['src/three/world/galaxy.ts'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: null,
    destino: 'migra',
    migracao: 'M5',
    emiteGlPointSize: false,
    razao: 'um GLOW_FRAG só; barato, um shader',
  },
  {
    id: 'forjas',
    nome: 'forjas estelares (5 populações)',
    arquivos: ['src/three/world/starForges.ts'],
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: null,
    destino: 'migra',
    migracao: 'M5',
    emiteGlPointSize: true,
    razao:
      'carrega a SEGUNDA cópia da lei de tela de três regimes (piso 0,85 / teto 26 / ' +
      'px²/0,7225) — a cópia morre junto',
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
    consomeL1: false,
    leiVelhaApagada: false,
    fatorDeBrilho: null,
    destino: 'instrumento',
    migracao: 'M2',
    emiteGlPointSize: false,
    razao:
      'consome a lei, não a implementa: número de mips e pesos da pirâmide passam a ' +
      'derivar da asa escolhida (§1) — metade do halo constante mora aqui',
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
    migracao: 'M1',
    emiteGlPointSize: true,
    razao:
      'é o campo E(x,t) do §5.18 — critério de visibilidade PRÓPRIO, nunca amarrado ' +
      'ao LOD do renderer',
  },
];

/**
 * A varredura REPRODUZÍVEL do censo: os arquivos de `src/` que emitem
 * `gl_PointSize`. O teste roda esta varredura de verdade (fs) e compara com
 * a coluna `emiteGlPointSize` — o censo de memória foi o que deixou dois
 * emissores fora da lista da v1 da Lei.
 */
export const PADRAO_DE_EMISSOR = /gl_PointSize\s*=/;
