// ============================================================
// OS SÍMBOLOS PROIBIDOS — a varredura INVERTIDA da Lei da Estrela.
//
// Regra (ii) de toda migração (`docs/LEI-DA-ESTRELA.md` §4): o commit que
// apaga um símbolo da lei velha inverte a varredura no MESMO diff — "tem de
// conter X" vira "NÃO PODE conter X". Este é o arquivo único dessas
// inversões: cada linha diz o que morreu, onde não pode renascer e em que
// migração morreu (o commit se acha por `git log --grep <migração>`).
//
// Por que existe: varredura textual POSITIVA é o motor do frankenstein —
// torna somar camada mais barato que demolir (§8.6). A negativa faz o
// contrário: torna RESSUSCITAR a cópia mais caro que usar a lei única.
// ============================================================
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

// Arquivo APAGADO é a forma mais FORTE de o símbolo estar morto: o M2
// enterrou `core/pupila.ts`, `pupila.test.ts` e `heroStars.ts` inteiros,
// e as entradas antigas destes arquivos continuam na lista de propósito —
// se alguém os recriar, a varredura volta a lê-los e cobra os padrões.
const ler = (rel: string) => {
  const url = new URL(`../../${rel}`, import.meta.url);
  return existsSync(url) ? readFileSync(url, 'utf8') : '';
};

interface SimboloProibido {
  /** onde o símbolo NÃO pode existir (caminho a partir da raiz) */
  arquivo: string;
  /** o que não pode voltar */
  padrao: RegExp;
  /** a migração cujo commit o matou */
  migracao: string;
  /** a razão, na língua da casa */
  razao: string;
}

const PROIBIDOS: SimboloProibido[] = [
  // ─── F0 (2026-08-16): PSF e Ballesteros num endereço só ────────────────
  {
    arquivo: 'src/three/core/pupila.ts',
    padrao: /function picoDaPsf/,
    migracao: 'F0',
    razao: 'a lei viva saiu da lápide — o pico da PSF mora em luzDaCasa.ts',
  },
  {
    arquivo: 'src/three/world/planetas/planetas.ts',
    padrao: /function picoDaPsf/,
    migracao: 'F0',
    razao: 'a cópia do ?dbgplan morreu — o readout importa de luzDaCasa.ts',
  },
  {
    arquivo: 'src/three/world/lodStellar.ts',
    padrao: /function psfPointSizePx/,
    migracao: 'F0',
    razao: 'o espelho de runtime morreu — o tamanho da PSF mora em luzDaCasa.ts',
  },
  {
    arquivo: 'src/three/core/pupila.ts',
    padrao: /6\.2831853/,
    migracao: 'F0',
    razao: 'o 2π do shader só existe em luzDaCasa.ts (DOIS_PI_DO_SHADER)',
  },
  {
    arquivo: 'src/three/world/planetas/planetas.ts',
    padrao: /6\.2831853/,
    migracao: 'F0',
    razao: 'o 2π do shader só existe em luzDaCasa.ts (DOIS_PI_DO_SHADER)',
  },
  {
    arquivo: 'src/three/world/lodStellar.ts',
    padrao: /6\.2831853/,
    migracao: 'F0',
    razao: 'o 2π do shader só existe em luzDaCasa.ts (DOIS_PI_DO_SHADER)',
  },
  {
    arquivo: 'src/three/shaders/common.ts',
    padrao: /6\.2831853|1080\.0|4600/,
    migracao: 'F0',
    razao:
      'o GLSL é GERADO das constantes (luzDaCasa.ts, stellarPhysics.ts) — ' +
      'redigitar o número aqui recria a cópia que o F0 matou',
  },
  {
    arquivo: 'src/three/core/pupila.test.ts',
    padrao: /toContain\(\s*['"`]float /,
    migracao: 'F0',
    razao:
      'o literal GLSL solto morreu — conformidade de PSF é numérica ' +
      '(luzDaCasa.test.ts), nunca toContain sobre o fonte do shader',
  },
  // ─── L1 (2026-08-16): a peça única nasce; o corpo negro muda de casa ───
  {
    arquivo: 'src/three/shaders/common.ts',
    padrao: /export function blackbodyLinear/,
    migracao: 'L1',
    razao: 'a face CPU do corpo negro mora em luzDaCasa.ts — common.ts só gera o GLSL',
  },
  {
    arquivo: 'src/three/shaders/common.ts',
    padrao: /0\.640|1\.980/,
    migracao: 'L1',
    razao:
      'os coeficientes do corpo negro são interpolados de luzDaCasa.ts — ' +
      'redigitar um aqui recria a divergência que o L1 matou',
  },
  // ─── M1 (2026-08-16): o Sol inteiro na repartição única ────────────────
  // (os padrões proíbem a DECLARAÇÃO, não a menção: as lápides citam os
  // nomes de propósito — é ressuscitar o corpo que é proibido)
  {
    arquivo: 'src/three/world/lodStellar.ts',
    padrao:
      /function (sunStarGain|deepPointGain|filtroSolarAlvo|shouldDiscBeActive|computeSolidAngle|distanceForSolidAngle|spriteAttenuationWithFocus|heroSizePcDePx|projectedRadiusPx|maxSpriteSolidAngleRad)/,
    migracao: 'M1',
    razao:
      'a entrega ponto→clarão, o filtro por razão disco/halo e o gate dormente ' +
      'morreram — quem reparte o Sol é repartir() de estrela.ts',
  },
  {
    arquivo: 'src/three/world/lodStellar.ts',
    padrao: /const (LOD_SOL|LIMIAR_DA_ENTREGA_PC|MEIA_LARGURA_LOG_DO_FILTRO|DISC_ENTER_RAD|DISC_EXIT_RAD|POINT_SIZE_CEILING_PX|DISC_FADE0_ARTISTICO_PC)/,
    migracao: 'M1',
    razao: 'as janelas em parsec do Sol e as âncoras do gate morto não renascem',
  },
  {
    arquivo: 'src/three/world/heroStars.ts',
    padrao: /class SunStar/,
    migracao: 'M1',
    razao:
      'o clarão de autor do Sol morreu — o Sol de longe é o ponto fotométrico ' +
      'da camada dos dez, e o clarão de asas de todos é o M2',
  },
  {
    arquivo: 'src/three/world/corpos/terra.ts',
    padrao: /function cessaoPeloGate|CESSAO_PELO_GATE_MULT\s*=/,
    migracao: 'M1',
    razao: 'a cessão do Sol-ponto é wResolvido da repartição — uma régua, não duas',
  },
  {
    arquivo: 'src/three/director.ts',
    padrao: /Math\.max\(\s*alvoPorDominancia|cessaoPeloGate\(|filtroSolarAlvo\(/,
    migracao: 'M1',
    razao: 'o max de duas rampas tinha QUINA (§8.3) — a repartição é uma só',
  },
  {
    arquivo: 'src/three/director.ts',
    padrao: /get\('bcede'\)|new SunStar/,
    migracao: 'M1',
    razao: 'a porta ?bcede e a instância do clarão de autor morreram com a migração',
  },
  {
    arquivo: 'src/three/luzDaCasa.ts',
    padrao: /function lerPortaFotosfera|FOTOSFERA_VERDADEIRA\s*=|get\('bfoto'\)/,
    migracao: 'M1',
    razao:
      'a fotosfera na unidade é lei sem porta — o lado A vive nas capturas, ' +
      'nunca num ramo de runtime (regra iv do §4)',
  },
  {
    arquivo: 'src/three/atlasConfig.ts',
    padrao: /function claraoDoAtlas|PISO_DO_CLARAO\s*=|REFERENCIA_UA\s*=/,
    migracao: 'M1',
    razao:
      'o Atlas não apaga mais o clarão 100× (item 4): um universo só, o mesmo ' +
      'desenho nos dois modos — decisão do dono',
  },
  {
    arquivo: 'src/three/core/post.ts',
    padrao: /setGradacao\(fator|this\.gradacao/,
    migracao: 'M1',
    razao: 'o bloom não tem apagador por modo — a força dele é a mesma nos dois',
  },
  {
    arquivo: 'src/three/world/planetas/planetas.ts',
    padrao: /uniform float uGain|deepPointGain\(|import \{[^}]*LIMIAR_SISTEMA_SOLAR_PC/,
    migracao: 'M1',
    razao:
      'o Sol-ponto não entrega o bastão nem é cortado a 0,05 pc — a magnitude ' +
      'apaga, a repartição cede',
  },
  {
    arquivo: 'src/three/selo.ts',
    padrao: /porta\('bcede'|porta\('bfoto'|porta\('grad'|gradacao:|from '\.\/world\/lodStellar'/,
    migracao: 'M1',
    razao:
      'as portas mortas saem do registro e o eixo ESCALA lê a constante de ' +
      'escala.ts, não a entrega morta',
  },
  // ─── M2 (2026-08-16): o clarão de asas + o bloom pela lei ──────────────
  // A LÁPIDE DAS HEROES CAIU (item 44, 2026-08-16): o dono mandou o
  // resgate — *"Porque você não resgata no git a versão certa antes de
  // entrar o atlas? ... Veja as imagens de spikes geradas anteriormente
  // pelo histórico do git."* A peça voltou byte a byte (world/
  // heroStars.ts); a lei única segue regendo catálogo, planetas e o
  // clarão do Sol. O que NÃO renasce junto está abaixo:
  {
    arquivo: 'src/three/world/heroStars.ts',
    padrao: /uExposicao|escreverExposicao|from '\.\/lodStellar'|class SunStar/,
    migracao: 'item 44',
    razao:
      'a espinha da pupila e o SunStar não renascem com a peça resgatada, ' +
      'e a referência de lente é local (a de lodStellar morreu no M2)',
  },
  {
    arquivo: 'src/three/world/clarao.ts',
    padrao: /0\.08 \* lum|uZoom|nearFade|farFade/,
    migracao: 'M2',
    razao:
      'o coeficiente de autor e as janelas de presença das heroes não renascem ' +
      'dentro da camada que as substituiu — o tamanho é claraoPx da lei',
  },
  {
    arquivo: 'src/three/world/lodStellar.ts',
    padrao:
      /function (heroNearFade|heroFarFade|heroPresence|heroSizePx|heroDominanceFade|heroDominanceRatio|heroCatalogFade|fadesDoQuadro|matchHeroesToCatalog)|const (LOD_HERO|HERO_DOMINANCE|HERO_ZOOM_TAN_REF|HERO_MATCH_REL_TOL|DOMINANCE_DEFAULT_ON|FADE_NEUTRAL)/,
    migracao: 'M2',
    razao:
      'a política de dominância morreu com a dupla-luz que a justificava: o ' +
      'clarão da lei soma óptica POR CIMA do ponto e ninguém cede a ninguém',
  },
  {
    arquivo: 'src/three/core/pupila.ts',
    padrao: /class Pupila|ganhoDaPupila|deslocamentoDeExpoM0|lerPortaDaPupila/,
    migracao: 'M2',
    razao:
      'a lápide foi ENTERRADA na data marcada (LEI §7.3): adaptação por foco ' +
      'está reprovada pelo dono — o que doma o alto é a compressão fixa',
  },
  {
    arquivo: 'src/three/director.ts',
    padrao: /aplicarPupila|writeHeroFades|escreverExposicao|get\('pupila'\)|'nodom'|'nohero'/,
    migracao: 'M2',
    razao:
      'a espinha de exposição por quadro morreu inteira — expoM0 é constante, ' +
      'e as portas ?pupila/?dom/?nodom/?nohero morreram com os donos',
  },
  {
    arquivo: 'src/three/world/stars.ts',
    padrao: /setPupila\(|deslocamentoDaPupila|expoM0Base|fadeArray|writeFade\(/,
    migracao: 'M2',
    razao:
      'o atuador da pupila e o canal aFade morreram — o expoM0 publicado é ' +
      'constante e o único canal por estrela é o aFocus dormente (item 38)',
  },
  {
    arquivo: 'src/three/shaders/common.ts',
    padrao: /out float sat|clamp\(0\.5 \* log2/,
    migracao: 'M2',
    razao:
      'o clamp `sat` era teto de brilho vivo (§5.4, item 43): espinho e ' +
      'branqueamento derivam do FLUXO (FRACAO_DOS_ESPINHOS, estrela.ts)',
  },
  {
    arquivo: 'src/three/shaders/starShaders.ts',
    // (a amplitude 0,85 da cruz do filme RENASCEU em 16/08 por ordem do
    // dono — "o ceu ficou vazio e escuro" — atrás de uArteDaCruz, campo
    // e cascas apenas; o que segue morto é a espinha da dominância)
    padrao: /attribute float aFade|varying float vSat|vSat =/,
    migracao: 'M2',
    razao:
      'aFade e vSat morreram: a cessão por dominância acabou e a amplitude ' +
      'dos espinhos é fração do pico, comprimida junto — nunca mais um clamp',
  },
  {
    arquivo: 'src/three/core/post.ts',
    padrao: /get\('bbloom'\)|get\('bombro'\)|get\('knee2'\)|bloom\.radius\s*=|this\.bloom\.radius\s*=/,
    migracao: 'M2',
    razao:
      'o bloom é governado pela lei: pesos por mip derivados da asa, raio ' +
      'pinado em 0 na construção (o lerp do radius reflatten os pesos) e as ' +
      'portas ?bbloom/?bombro/?knee2 viraram capturas versionadas (regra iv)',
  },
  {
    arquivo: 'src/three/escala.ts',
    padrao: /ESPELHO_COEF_CLARAO_PC|SIRIUS_M\b|SIRIUS_RAIO_RSOL/,
    migracao: 'M2',
    razao:
      'o espelho do coeficiente de autor e o exemplar Sirius morreram: o ' +
      'clarão não tem tamanho em parsec — tem lei em px, declarada no cadastro',
  },
  {
    arquivo: 'src/three/selo.ts',
    padrao:
      /porta\('bbloom'|porta\('bombro'|porta\('dom'|porta\('nodom'|function rotuloDaPupila|COPY_PUPILA =|stopsDaPupila:/,
    migracao: 'M2',
    razao: 'as portas mortas e a linha da pupila saem do registro do selo',
  },
  // ─── R2 (2026-08-17): o bloom seletivo — cada camada com seu cobertor ──
  {
    arquivo: 'src/three/core/post.ts',
    padrao: /respirarPiramide|FRACAO_DO_RESPIRO/,
    migracao: 'R2',
    razao:
      'o meio-termo do cobertor único (forma do filme a 30%) morreu: o ' +
      'respiro do campo é o ClaraoDoCampo, e a lei governa o principal',
  },
  // ─── item 5 (2026-08-21): o Sol do Atlas obedece ao calendário ────────
  //
  // Aqui não morreu uma lei de LUZ: morreu um relógio. A fase do ciclo
  // era um acumulador que a dramaturgia do filme torcia, e o Atlas vivia
  // de um pino. Cada padrão abaixo é uma peça daquele mecanismo — e a
  // varredura vale para os `sol/*.js` vendorizados também, porque a
  // exceção ao "os 14 não se tocam" foi declarada no cabeçalho deles.
  {
    arquivo: 'src/three/director.ts',
    padrao: /ATLAS_JOURNEY_T/,
    migracao: 'item 5',
    razao:
      'o pino do Sol dentro do Atlas morreu: a reprodutibilidade não vem ' +
      'de congelar o instante, vem de o Sol ser função pura da data',
  },
  {
    arquivo: 'src/three/world/stellarBody.ts',
    padrao: /cyclePhaseMin|cyclePhaseMax|cycleWarp|cycleTime|bakeNow\(120\)/,
    migracao: 'item 5',
    razao:
      'o acumulador de fase, o tempo warpado e o catch-up do salto de ' +
      'dramaturgia morreram — a fase chega escrita (escreverCiclo) e o ' +
      'catch-up é o re-bake fatiado, com semente e contagem fixas',
  },
  {
    arquivo: 'src/three/world/stellarBody.ts',
    padrao: /journeyT/,
    migracao: 'item 5',
    razao:
      'o corpo estelar não conhece o roteiro: o filme escreve DOSE de ' +
      'ocupação (escreverDose), nunca o segundo em que a viagem está',
  },
  {
    arquivo: 'src/three/world/sol/activity.js',
    padrao: /ctx\.cycleTime|ctx\.cycleWarp|lastRegionT|CYCLE_PHASE0|startCycleEvent|\.reborn/,
    migracao: 'item 5',
    razao:
      'o acumulador, o cap de deriva, o latch de renascimento e o evento ' +
      'de máximo/mínimo morreram: o estado das regiões é função pura de ' +
      'ctx.tempoDoCiclo, com semente POR VIDA',
  },
  {
    arquivo: 'src/three/world/sol/sun.js',
    padrao: /spotLastT|spotsReseed|pushDl|\.reborn/,
    migracao: 'item 5',
    razao:
      'os grupos de manchas perderam o acumulador, o re-seed de QA e o ' +
      'empurrão anti-fusão rate-limitado — o keep-out vive no NASCIMENTO, ' +
      'que agora é função do instante',
  },
];

/**
 * AS ÂNCORAS DA GALÁXIA (2026-08-21) — a mesma regra, aplicada a NÚMERO em
 * vez de a nome. As três medidas de ancoragem e a amplitude do warp viviam
 * declaradas em `medidasDaGalaxia.ts`/`GALACTIC_MODEL` E redigitadas dentro
 * do GLSL, e as cópias só se encontrariam a olho. O caso pior era a
 * amplitude: GERADA de um lado (com `?warpamp=` vivo) e CRAVADA do outro
 * (`shaders/common.ts`, `world/wrappedStars.ts`) — bastava varrer o knob
 * para o gás e as estrelas seguirem warps diferentes na mesma cena.
 *
 * Agora as quatro saem de `glslNumber(...)`, e esta varredura é o que
 * impede a cópia de voltar. O padrão pega o literal FLOAT (com ponto
 * decimal), que é a forma que só existe dentro de GLSL: `8150` cru em
 * comentário ou em conta TypeScript passa, e é assim que se quer — a
 * varredura textual só pode exigir a mais, nunca a menos.
 */
const ANCORAS_CRAVADAS = /\b(?:8150|16800|8400|820)\.0/;
const ARQUIVOS_COM_GLSL_DA_GALAXIA = [
  'src/three/cartography/galacticModel.ts',
  'src/three/cartography/dustMap.ts',
  'src/three/shaders/common.ts',
  'src/three/shaders/galaxyShaders.ts',
  'src/three/shaders/nebulaShaders.ts',
  'src/three/shaders/dustShaders.ts',
  'src/three/shaders/starShaders.ts',
  'src/three/world/wrappedStars.ts',
  'src/three/world/galaxy.ts',
  'src/three/world/nebula.ts',
];

describe('os símbolos proibidos não renasceram', () => {
  for (const { arquivo, padrao, migracao, razao } of PROIBIDOS) {
    it(`${arquivo} não contém ${padrao} (${migracao})`, () => {
      expect(ler(arquivo), `${razao}`).not.toMatch(padrao);
    });
  }
});

describe('as âncoras da galáxia são GERADAS, nunca cravadas', () => {
  it('a varredura acha o que procura — um padrão quebrado passaria calado', () => {
    // o mesmo cinto do selo: se o regex morrer, este caso reprova primeiro
    expect('const float GAL_SUN_RADIUS = 8150.0;').toMatch(ANCORAS_CRAVADAS);
    expect('float zw = z - (cart.a * 2.0 - 1.0) * 820.0;').toMatch(ANCORAS_CRAVADAS);
    // e não confunde vizinhos: só o número inteiro, e só com ponto decimal
    expect('radiusPc < 8150 ? a : b').not.toMatch(ANCORAS_CRAVADAS);
    expect('smoothstep(15500.0, 19300.0, r)').not.toMatch(ANCORAS_CRAVADAS);
  });

  for (const arquivo of ARQUIVOS_COM_GLSL_DA_GALAXIA) {
    it(`${arquivo} não crava o raio do Sol, o raio do disco, o começo do warp nem a amplitude`, () => {
      expect(
        ler(arquivo),
        'as quatro âncoras saem de glslNumber(GALACTIC_MODEL.…) — ' +
          'redigitar uma aqui recria a divergência que ?warpamp= revelava'
      ).not.toMatch(ANCORAS_CRAVADAS);
    });
  }
});
