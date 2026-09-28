// Serve: chão — o portão dos dados reprova ativo ou tijolo corrompido, sem referência, fora do teto ou fora do manifesto
// ============================================================
// O GATE DOS DADOS, JULGADO COMO GATE (item 130, lista do §19).
//
// `verify-assets.mjs` é o cadeado que a F2 e a F4 do 130 inverteram: o
// inglês das fichas e o do manifesto de texturas DEIXARAM de ser
// proibidos no artefato e passaram a ser conferidos byte a byte contra
// a fonte. Um cadeado assim envelhece calado — ele passa verde tanto
// quando confere quanto quando não confere nada —, e por isso a única
// prova que vale é ADULTERAR o artefato e exigir que ele reprove.
//
// COMO, sem tocar no repositório: monta-se uma RAIZ ESPELHO em /tmp com
// `scripts/` copiado e todo o resto (public, src, docs) por atalho de
// arquivo, e só o arquivo sob julgamento é uma cópia adulterada. O
// script calcula a raiz dele a partir do próprio caminho, então roda
// contra o espelho sem saber. O repositório fica intocado, e uma queda
// no meio do teste não deixa artefato sujo para trás.
//
// Cada caso roda o gate INTEIRO (242 texturas, 328 mil estrelas) e
// custa ~0,3 s, porque as texturas entram por atalho e o sha delas sai
// dos mesmos bytes. Quatro casos: o gate verde no artefato de verdade
// (sem ele o espelho podia estar reprovando por outro motivo), o inglês
// da FICHA reescrito, o inglês da ficha APAGADO e o inglês do
// MANIFESTO apagado.
// ============================================================
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import { montarArtefatosDaPiramide } from './build-dust-volumes.mjs';
import { sha256 } from './lib/binary.mjs';
import { PIRAMIDE_POEIRA, gradeDoNivel, paraFloat16 } from './lib/volume.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Espelha `origem` em `destino`: PASTA vira pasta de verdade, ARQUIVO
 * vira atalho. As pastas precisam ser reais porque o gate desce nelas
 * com `readdir({ withFileTypes: true })` e um atalho não se declara
 * pasta — com atalho de pasta o gate varria três pares .bin/.gz em vez
 * dos onze, e passava verde varrendo menos.
 *
 * `mutaveis` são os arquivos que o teste reescreve: ficam de fora, e
 * cada caso os grava como cópia.
 */
function espelhar(origem, destino, mutaveis = [], pular = []) {
  mkdirSync(destino, { recursive: true });
  for (const entrada of readdirSync(origem, { withFileTypes: true })) {
    const de = join(origem, entrada.name);
    const para = join(destino, entrada.name);
    if (pular.includes(de) || mutaveis.includes(de)) continue;
    if (entrada.isDirectory()) espelhar(de, para, mutaveis, pular);
    else symlinkSync(de, para);
  }
}

let espelho;

beforeAll(() => {
  espelho = mkdtempSync(join(tmpdir(), 'verify-assets-'));
  espelhar(
    join(RAIZ, 'public'),
    join(espelho, 'public'),
    [join(RAIZ, 'public/data/atlas/corpos.json'), join(RAIZ, 'public/data/atlas/texturas.json')]
  );
  // o script real, COPIADO: é o caminho dele que dá a raiz do gate
  cpSync(join(RAIZ, 'scripts'), join(espelho, 'scripts'), { recursive: true });
  // o resto da raiz por atalho — inclusive `node_modules`, sem o qual o
  // `sharp` some e o bloco de texturas morre antes de julgar nada
  for (const nome of ['src', 'docs', 'package.json', 'node_modules']) {
    symlinkSync(join(RAIZ, nome), join(espelho, nome));
  }
}, 120_000);

afterAll(() => {
  if (espelho) rmSync(espelho, { recursive: true, force: true });
});

/** Escreve os dois artefatos mutáveis do espelho e roda o gate. */
function rodar(mudar = (corpos, texturas) => ({ corpos, texturas })) {
  const corposCru = JSON.parse(readFileSync(join(RAIZ, 'public/data/atlas/corpos.json'), 'utf8'));
  const texturasCru = JSON.parse(
    readFileSync(join(RAIZ, 'public/data/atlas/texturas.json'), 'utf8')
  );
  const { corpos, texturas } = mudar(corposCru, texturasCru);
  writeFileSync(join(espelho, 'public/data/atlas/corpos.json'), JSON.stringify(corpos));
  writeFileSync(join(espelho, 'public/data/atlas/texturas.json'), JSON.stringify(texturas));
  try {
    const saida = execFileSync(
      process.execPath,
      [join(espelho, 'scripts/data/verify-assets.mjs')],
      // 22/09/2026: no GitHub este arquivo ficou 6 h parado até o limite do
      // job, sem uma linha de saída. A chamada é SÍNCRONA — o tempo-limite do
      // vitest não dispara com o laço de eventos preso —, então o limite mora
      // aqui: um gate que leva 2 s e não volta em 60 s reprova com o que já
      // tinha escrito.
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000, killSignal: 'SIGKILL' }
    );
    return { ok: true, saida };
  } catch (erro) {
    return { ok: false, saida: `${erro.stdout ?? ''}${erro.stderr ?? ''}` };
  }
}

describe('verify-assets — o cadeado do inglês', () => {
  it('o gate passa VERDE no artefato de verdade (o espelho é fiel)', () => {
    const r = rodar();
    expect(r.saida).toContain('pt-BR e inglês');
    expect(r.ok, r.saida.slice(-800)).toBe(true);
  }, 180_000);

  it('reprova o INGLÊS DA FICHA reescrito no artefato', () => {
    const r = rodar((corpos, texturas) => {
      const saturno = corpos.corpos.find((c) => c.id === 'saturn');
      saturno.editorial.en.description = 'Reescrito à mão, longe da fonte.';
      return { corpos, texturas };
    });
    expect(r.ok).toBe(false);
    expect(r.saida).toContain('saturn');
    expect(r.saida).toContain('o texto inglês em corpos.json não é');
  }, 180_000);

  it('reprova o INGLÊS DA FICHA APAGADO — a ficha em inglês ficaria em português', () => {
    const r = rodar((corpos, texturas) => {
      const saturno = corpos.corpos.find((c) => c.id === 'saturn');
      delete saturno.editorial.en;
      return { corpos, texturas };
    });
    expect(r.ok).toBe(false);
    expect(r.saida).toContain('sem editorial.en');
  }, 180_000);

  it('reprova o INGLÊS DO MANIFESTO de texturas apagado', () => {
    const r = rodar((corpos, texturas) => {
      const comOrigem = texturas.entradas.find((e) => e.origem?.licenca?.en);
      delete comOrigem.origem.licenca.en;
      return { corpos, texturas };
    });
    expect(r.ok).toBe(false);
    expect(r.saida).toContain('sem o inglês (item 130/F4)');
  }, 180_000);
});

// ============================================================
// O ramo `kind === 'volume'` (E1, item 3 do PLAN.md): volume float16
// sintético minúsculo (2×2×1) + fixture minúscula, num espelho PRÓPRIO
// (não o `espelho` compartilhado acima) porque aqui o `manifest.json`
// também precisa ser mutável.
// ============================================================
describe('verify-assets — o volume de poeira (float16)', () => {
  let espelhoVolume;

  beforeAll(() => {
    espelhoVolume = mkdtempSync(join(tmpdir(), 'verify-assets-volume-'));
    espelhar(join(RAIZ, 'public'), join(espelhoVolume, 'public'), [
      join(RAIZ, 'public/data/galaxy/manifest.json'),
    ]);
    cpSync(join(RAIZ, 'scripts'), join(espelhoVolume, 'scripts'), { recursive: true });
    for (const nome of ['src', 'docs', 'package.json', 'node_modules']) {
      symlinkSync(join(RAIZ, nome), join(espelhoVolume, nome));
    }
  }, 120_000);

  afterAll(() => {
    if (espelhoVolume) rmSync(espelhoVolume, { recursive: true, force: true });
  });

  // 1000 voxels (10×10×10), todos com a mesma densidade — grande e
  // repetitivo de propósito, para o .gz sair MENOR que o .bin (o gate
  // também cobra isso: `compress-assets.mjs` não compensa 4 voxels).
  const DIMS = [10, 10, 10];
  const ESCALA = 1000;
  const VALORES = new Array(DIMS[0] * DIMS[1] * DIMS[2]).fill(0.01);
  const GRADE_FIXTURE = { dims: DIMS, voxelPc: 10, origemPc: [0, 0, 0] };

  /** `celulas` cobrindo TODA a grade de teste (10×10×10) com uma densidade uniforme — a fixture "conhece" exatamente o volume sintético. */
  function celulasUniformes(media) {
    const celulas = [];
    for (let k = 0; k < DIMS[2]; k += 1) {
      for (let j = 0; j < DIMS[1]; j += 1) {
        for (let i = 0; i < DIMS[0]; i += 1) {
          celulas.push({ indice: [i, j, k], media });
        }
      }
    }
    return celulas;
  }

  /**
   * Escreve o ativo `kind: 'volume'` de teste (10×10×10) no manifesto do
   * espelho, sob `nomeAtivo` — remove qualquer outro volume que o
   * manifesto real copiado trouxesse. `valoresPersonalizados` troca a
   * densidade uniforme padrão (item do teto físico). Nome diferente de
   * `dustVolumeNear20pc` também recebe uma CÓPIA sob essa chave: desde a
   * revisão de 28/09/2026 o manifesto exige essa entrada, e isto isola o
   * que cada teste realmente cobre (a cópia some da iteração antes de
   * qualquer teste chegar nela, porque `nomeAtivo` é escrito primeiro).
   */
  function escreverAtivoDeTeste(nomeAtivo, valoresPersonalizados) {
    const valores = valoresPersonalizados ?? VALORES;
    const flutuante = paraFloat16(valores, ESCALA);
    const buffer = Buffer.from(flutuante.buffer, flutuante.byteOffset, flutuante.byteLength);
    const gz = gzipSync(buffer, { level: 9 });
    const manifesto = JSON.parse(readFileSync(join(RAIZ, 'public/data/galaxy/manifest.json'), 'utf8'));
    // só o volume sintético encara a fixture minúscula: os volumes REAIS do
    // manifesto (dust-near-20pc desde a E1) reprovariam contra ela por
    // construção, e não são o que este teste cobre.
    for (const [nome, asset] of Object.entries(manifesto.assets)) {
      if (asset.kind === 'volume') delete manifesto.assets[nome];
    }
    const definicaoAtivo = {
      kind: 'volume',
      file: 'data/galaxy/dust-teste.bin',
      dims: DIMS,
      count: valores.length,
      voxelPc: 10,
      originPc: [0, 0, 0],
      unit: 'E_ZGR23 per pc',
      scale: ESCALA,
      type: 'float16',
      byteLength: buffer.byteLength,
      sha256: sha256(buffer),
    };
    manifesto.assets[nomeAtivo] = definicaoAtivo;
    if (nomeAtivo !== 'dustVolumeNear20pc') {
      manifesto.assets.dustVolumeNear20pc = definicaoAtivo;
    }
    writeFileSync(join(espelhoVolume, 'public/data/galaxy/dust-teste.bin'), buffer);
    writeFileSync(join(espelhoVolume, 'public/data/galaxy/dust-teste.bin.gz'), gz);
    writeFileSync(join(espelhoVolume, 'public/data/galaxy/manifest.json'), JSON.stringify(manifesto));
  }

  function rodar() {
    try {
      const saida = execFileSync(
        process.execPath,
        [join(espelhoVolume, 'scripts/data/verify-assets.mjs')],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000, killSignal: 'SIGKILL' }
      );
      return { ok: true, saida };
    } catch (erro) {
      return { ok: false, saida: `${erro.stdout ?? ''}${erro.stderr ?? ''}` };
    }
  }

  // `nomeAtivo` default é o ativo CONHECIDO (REFERENCIAS_OBRIGATORIAS, em
  // verify-assets.mjs) — é ele que exercita a comparação de verdade.
  // `dustVolumeTeste` (desconhecido) só recebe o AVISO, nunca compara.
  function rodarComFixture(fixture, nomeAtivo = 'dustVolumeNear20pc') {
    escreverAtivoDeTeste(nomeAtivo);
    writeFileSync(
      join(espelhoVolume, 'scripts/data/fixtures/edenhofer-referencia.json'),
      JSON.stringify(fixture)
    );
    return rodar();
  }

  /** Mesmo ativo de teste, mas SEM fixture no disco — apaga a fixture real que o `cpSync` do `beforeAll` copiou. */
  function rodarSemFixture(nomeAtivo) {
    escreverAtivoDeTeste(nomeAtivo);
    rmSync(join(espelhoVolume, 'scripts/data/fixtures/edenhofer-referencia.json'), { force: true });
    return rodar();
  }

  it('passa com um volume float16 dentro da tolerância', () => {
    const r = rodarComFixture({
      cabecalho: { grade: GRADE_FIXTURE },
      voxeis: [{ indice: [0, 0, 0], media: VALORES[0], nanFracao: 0 }],
      // coluna l=0,b=0,rMin=10,rMax=90: bloco uniforme (0,01) dá
      // 0,01 × (90 − 10) = 0,8. `celulas` cobre a grade toda com a MESMA
      // densidade — a referência de mesmo operador bate exatamente —, e
      // 0,8 também cai dentro da faixa do tubo (plausibilidade).
      colunas: [
        {
          nome: 'dentro',
          l: 0,
          b: 0,
          rMin: 10,
          rMax: 90,
          celulas: celulasUniformes(0.01),
          tubo: { media: 0.8, min: 0.7, max: 0.9 },
        },
      ],
    });
    expect(r.ok, r.saida.slice(-800)).toBe(true);
    expect(r.saida).toContain('dustVolumeNear20pc: fixture Edenhofer OK');
    expect(r.saida).toContain('faixa do tubo');
  }, 60_000);

  it('reprova um volume float16 fora da tolerância (voxel), mesmo com a coluna plausível no tubo', () => {
    const r = rodarComFixture({
      cabecalho: { grade: GRADE_FIXTURE },
      voxeis: [{ indice: [0, 0, 0], media: 5, nanFracao: 0 }],
      // a coluna bate com a referência de mesmo operador (mesma
      // densidade 0,01 nas `celulas`) mas cai FORA da faixa do tubo
      // [0,1; 0,3] — plausibilidade não reprova; quem reprova é o voxel.
      colunas: [
        {
          nome: 'fora',
          l: 0,
          b: 0,
          rMin: 10,
          rMax: 90,
          celulas: celulasUniformes(0.01),
          tubo: { media: 0.2, min: 0.1, max: 0.3 },
        },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.saida).toContain('excede a tolerância');
    expect(r.saida).toContain('FORA DA FAIXA');
  }, 60_000);

  // (a)/(b) da revisão independente v2 (item 3, 27/09/2026);
  // (c)/(d)/(e) da revisão de 28/09/2026: REFERENCIAS_OBRIGATORIAS só
  // lista `dustVolumeNear20pc` — para ele, fixture ausente ou grade
  // incompatível é ERRO; ativo fora da tabela (desconhecido) TAMBÉM é
  // ERRO agora (antes só avisava); valor acima do teto físico é ERRO; e
  // o manifesto sem a entrada `dustVolumeNear20pc` é ERRO.
  it('(a) ativo conhecido (dustVolumeNear20pc) sem fixture → falha', () => {
    const r = rodarSemFixture('dustVolumeNear20pc');
    expect(r.ok).toBe(false);
    expect(r.saida).toContain('fixture de referência obrigatória ausente');
  }, 60_000);

  it('(b) ativo conhecido (dustVolumeNear20pc) com grade incompatível na fixture → falha', () => {
    const r = rodarComFixture(
      {
        cabecalho: { grade: { dims: [5, 5, 5], voxelPc: 20, origemPc: [0, 0, 0] } },
        // valores deliberadamente "errados": se a grade fosse comparada, reprovaria.
        voxeis: [{ indice: [0, 0, 0], media: 999, nanFracao: 0 }],
        colunas: [],
      },
      'dustVolumeNear20pc'
    );
    expect(r.ok).toBe(false);
    expect(r.saida).toContain('não se aplica');
  }, 60_000);

  it('(c) ativo desconhecido (fora de REFERENCIAS_OBRIGATORIAS) → ERRO, nunca só um aviso', () => {
    const r = rodarSemFixture('dustVolumeTeste');
    expect(r.ok).toBe(false);
    expect(r.saida).toContain('dustVolumeTeste');
    expect(r.saida).toContain('referência científica');
  }, 60_000);

  it('(d) valor float16 acima do teto físico (LIMITE_E_POR_PC) → falha', () => {
    const valoresComPico = [...VALORES];
    valoresComPico[0] = 1.5; // acima do teto físico (1,0 E/pc)
    escreverAtivoDeTeste('dustVolumeNear20pc', valoresComPico);
    const r = rodar();
    expect(r.ok).toBe(false);
    expect(r.saida).toContain('acima do teto físico');
  }, 60_000);

  it('(e) manifesto sem a entrada "dustVolumeNear20pc" → falha antes de olhar qualquer ativo', () => {
    const manifesto = JSON.parse(readFileSync(join(RAIZ, 'public/data/galaxy/manifest.json'), 'utf8'));
    delete manifesto.assets.dustVolumeNear20pc;
    writeFileSync(join(espelhoVolume, 'public/data/galaxy/manifest.json'), JSON.stringify(manifesto));
    const r = rodar();
    expect(r.ok).toBe(false);
    expect(r.saida).toContain('manifesto sem "dustVolumeNear20pc"');
  }, 60_000);
});

// ============================================================
// A pirâmide (E3c): cobrada inteira quando o manifesto declara
// `dustPyramid`. Pirâmide SINTÉTICA na geometria do contrato (tijolos
// 34³ de verdade, índices montados pelo MESMO `montarArtefatosDaPiramide`
// do gerador) sobre o bloco de 20 pc REAL do espelho: um tijolo por
// nível — o que contém o Sol —, cheio de um valor conhecido, e uma
// fixture de níveis com 8 células dentro dele. O caso verde prova que o
// que o gerador escreve o portão aceita; cada outro caso estraga UMA
// coisa e exige a reprovação com o motivo.
// ============================================================
describe('verify-assets — a pirâmide de poeira (dustPyramid)', () => {
  let espelhoPiramide;
  const TIJOLO_DO_SOL = { 1: [3, 3, 1], 2: [7, 7, 3], 3: [15, 15, 6] };
  const VALOR = { 1: 0.004, 2: 0.005, 3: 0.006 };
  const LADO = PIRAMIDE_POEIRA.tijolo + 2;

  beforeAll(() => {
    espelhoPiramide = mkdtempSync(join(tmpdir(), 'verify-assets-piramide-'));
    espelhar(join(RAIZ, 'public'), join(espelhoPiramide, 'public'), [
      join(RAIZ, 'public/data/galaxy/manifest.json'),
    ]);
    cpSync(join(RAIZ, 'scripts'), join(espelhoPiramide, 'scripts'), { recursive: true });
    for (const nome of ['src', 'docs', 'package.json', 'node_modules']) {
      symlinkSync(join(RAIZ, nome), join(espelhoPiramide, nome));
    }
  }, 120_000);

  afterAll(() => {
    if (espelhoPiramide) rmSync(espelhoPiramide, { recursive: true, force: true });
  });

  /** Um nível com um só tijolo gravado (`b`), cheio de `valor`; `pico` troca o primeiro voxel. */
  function nivelSintetico(nivel, { b = TIJOLO_DO_SOL[nivel.nivel], pico = null } = {}) {
    const valores = new Float64Array(LADO ** 3).fill(VALOR[nivel.nivel]);
    if (pico !== null) valores[0] = pico;
    const f16 = paraFloat16(valores, 1000);
    return {
      nivel: nivel.nivel,
      grade: gradeDoNivel(PIRAMIDE_POEIRA, nivel),
      raioPc: nivel.raioPc,
      tijolosExistentes: 1,
      gravados: [{ b, bytes: Buffer.from(f16.buffer, f16.byteOffset, f16.byteLength) }],
      naoFinitas: 0,
      maiorResiduoOmitido: 0,
    };
  }

  /** 8 células no núcleo do tijolo do Sol de cada nível, com o valor dele (ou `mudar(valor)`). */
  function fixtureDosNiveis(mudar = (v) => v) {
    return {
      niveis: PIRAMIDE_POEIRA.niveis.map((nivel) => {
        const b = TIJOLO_DO_SOL[nivel.nivel];
        const celulas = Array.from({ length: 8 }, (_, m) => ({
          indice: [32 * b[0] + 4 + m, 32 * b[1] + 4, 32 * b[2] + 4],
          media: mudar(VALOR[nivel.nivel]),
          nanFracao: 0,
        }));
        const grade = { dims: nivel.dims, voxelPc: nivel.voxelPc, origemPc: PIRAMIDE_POEIRA.origemPc };
        return { nivel: nivel.nivel, grade, raioPc: nivel.raioPc, celulas };
      }),
    };
  }

  /**
   * Monta a pirâmide no espelho e roda o portão. `niveis` troca os níveis
   * sintéticos; `mudarEntrada` mexe na entrada do manifesto; `declarar:
   * false` deixa a pasta sem entrada; `fixture: null` apaga a fixture;
   * `depois(pasta)` estraga o disco depois de tudo escrito.
   */
  function rodarComPiramide({
    niveis = PIRAMIDE_POEIRA.niveis.map((n) => nivelSintetico(n)),
    mudarEntrada = (e) => e,
    declarar = true,
    fixture = fixtureDosNiveis(),
    depois = () => {},
  } = {}) {
    const pasta = join(espelhoPiramide, 'public/data/galaxy/dust-piramide');
    rmSync(pasta, { recursive: true, force: true });
    const manifesto = JSON.parse(readFileSync(join(RAIZ, 'public/data/galaxy/manifest.json'), 'utf8'));
    const n0 = manifesto.assets.dustVolumeNear20pc;
    const { arquivos, entrada } = montarArtefatosDaPiramide(niveis, {
      piramide: PIRAMIDE_POEIRA,
      escala: n0.scale,
      n0: { file: n0.file, sha256: n0.sha256 },
      gerado: '2026-09-28',
    });
    for (const { relativo, conteudo } of arquivos) {
      const alvo = join(espelhoPiramide, 'public', relativo);
      mkdirSync(dirname(alvo), { recursive: true });
      writeFileSync(alvo, conteudo);
    }
    if (declarar) manifesto.dustPyramid = mudarEntrada(entrada);
    writeFileSync(join(espelhoPiramide, 'public/data/galaxy/manifest.json'), JSON.stringify(manifesto));
    const caminhoFixture = join(espelhoPiramide, 'scripts/data/fixtures/edenhofer-referencia-niveis.json');
    if (fixture) writeFileSync(caminhoFixture, JSON.stringify(fixture));
    else rmSync(caminhoFixture, { force: true });
    depois(pasta);
    try {
      const saida = execFileSync(
        process.execPath,
        [join(espelhoPiramide, 'scripts/data/verify-assets.mjs')],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000, killSignal: 'SIGKILL' }
      );
      return { ok: true, saida };
    } catch (erro) {
      return { ok: false, saida: `${erro.stdout ?? ''}${erro.stderr ?? ''}` };
    }
  }

  it('passa VERDE com a pirâmide que o gerador escreve (índices, tijolos, faixa e referência)', () => {
    const r = rodarComPiramide();
    expect(r.ok, r.saida.slice(-800)).toBe(true);
    expect(r.saida).toContain('dustPyramid: n1: 1 tijolos, referência OK');
    expect(r.saida).toContain('3 tijolos');
  }, 60_000);

  it('reprova o TIJOLO trocado no disco (sha256 do .bin.gz diverge do índice)', () => {
    const r = rodarComPiramide({
      depois: (pasta) => {
        const arquivo = join(pasta, 'n2', '7_7_3.bin.gz');
        writeFileSync(arquivo, gzipSync(gunzipSync(readFileSync(arquivo)), { level: 1 }));
      },
    });
    expect(r.ok).toBe(false);
    expect(r.saida).toContain('7_7_3.bin.gz: bytes/SHA-256 divergem do índice');
  }, 60_000);

  it('reprova o ÍNDICE editado depois de gravado (sha256 diverge do manifesto)', () => {
    const r = rodarComPiramide({
      depois: (pasta) => writeFileSync(join(pasta, 'n2.json'), `${readFileSync(join(pasta, 'n2.json'), 'utf8')} `),
    });
    expect(r.ok).toBe(false);
    expect(r.saida).toContain('n2.json: bytes/SHA-256 divergem do manifesto');
  }, 60_000);

  it('reprova valor acima do teto físico dentro de um tijolo', () => {
    const niveis = PIRAMIDE_POEIRA.niveis.map((n) => nivelSintetico(n, n.nivel === 1 ? { pico: 1.5 } : {}));
    const r = rodarComPiramide({ niveis });
    expect(r.ok).toBe(false);
    expect(r.saida).toContain('acima do teto físico');
  }, 60_000);

  it('reprova o nível que não bate com a referência científica (e exige a fixture dos níveis)', () => {
    const r = rodarComPiramide({ fixture: fixtureDosNiveis((v) => v * 1.5) });
    expect(r.ok).toBe(false);
    expect(r.saida).toContain('dustPyramid n1: comparação com a referência (interpolador oficial) excede a tolerância');
    const semFixture = rodarComPiramide({ fixture: null });
    expect(semFixture.ok).toBe(false);
    expect(semFixture.saida).toContain('fixture de referência dos níveis ausente');
  }, 120_000);

  it('reprova a pirâmide gerada sobre outro bloco de 20 pc', () => {
    const r = rodarComPiramide({ mudarEntrada: (e) => ({ ...e, parentSha256: 'f'.repeat(64) }) });
    expect(r.ok).toBe(false);
    expect(r.saida).toContain('gerada sobre outro bloco de 20 pc');
  }, 60_000);

  it('reprova tijolo fora da região do nível, arquivo órfão e pasta sem declaração', () => {
    const niveis = PIRAMIDE_POEIRA.niveis.map((n) => nivelSintetico(n, n.nivel === 3 ? { b: [0, 0, 0] } : {}));
    const fora = rodarComPiramide({ niveis });
    expect(fora.ok).toBe(false);
    expect(fora.saida).toContain('fora da grade ou da região do nível');

    const orfao = rodarComPiramide({
      depois: (pasta) => writeFileSync(join(pasta, 'n1', '0_0_0.bin.gz'), gzipSync(Buffer.alloc(8))),
    });
    expect(orfao.ok).toBe(false);
    expect(orfao.saida).toContain('órfão');
    expect(orfao.saida).toContain('n1/0_0_0.bin.gz');

    const semDeclaracao = rodarComPiramide({ declarar: false });
    expect(semDeclaracao.ok).toBe(false);
    expect(semDeclaracao.saida).toContain('pirâmide órfã');
  }, 180_000);
});
