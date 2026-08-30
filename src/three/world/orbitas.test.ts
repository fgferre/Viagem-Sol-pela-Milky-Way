// ============================================================
// AS LINHAS DE ÓRBITA (item 77) — julgadas contra a efeméride REAL da
// casa, nunca contra um dublê. É o que o teste da ficha já faz
// (`lib/atlas/ficha.test.ts`): o motor de verdade, a tabela de verdade,
// o mesmo `jd` que a tela usa.
//
// O QUE ESTE ARQUIVO COBRA, e cada item existe por um defeito possível:
//  1. O LAÇO PASSA PELO PONTO. É a promessa inteira do item 77 — "a
//     efeméride VIVA, nunca o retrato congelado — senão a linha e o
//     ponto divergem no primeiro salto de data". Aqui ela é cobrada
//     como identidade, e em DUAS datas separadas por nove anos.
//  2. O μ derivado do kernel bate com as duas constantes independentes
//     da casa (k² e `MU_PARENT`) — a checagem que impede a conversão de
//     unidade de errar em silêncio (§3 de `orbitas.ts`).
//  3. As luas giram no PAI. O laço de uma lua tem o raio da órbita
//     dela, não o da órbita do pai em volta do Sol — que é o que sairia
//     se alguém trocasse `posicao` por `posicaoHeliocentrica`.
//  4. O centro derivado do config único bate com o `REGISTRO_ORBITAL`
//     do motor, corpo a corpo. Se um dia uma lista mudar de pai, quebra
//     aqui e não na tela.
//  5. A JANELA DA TABELA, que é a razão de a cônica osculadora existir:
//     o caminho do contrato (`jd + k·T/N` ao longo de um período)
//     LANÇA para Saturno em diante a partir da época. O teste prova a
//     acusação em vez de acreditar nela.
// ============================================================
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MetaEfemerides } from '../../lib/atlas/efemerides';
import { MotorEfemerides, decodeEfemerides } from '../../lib/atlas/efemerides';
import { REGISTRO_ORBITAL } from '../../lib/atlas/registroOrbital';
import {
  MU_PARENT,
  MU_SUN_AU3_PER_DAY2,
} from '../../lib/atlas/elementosOrbitais';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../lib/atlas/frameGalactico';
import { EPOCA_JD_TDB } from './planetas/retrato2026';
import { Planetas, UA_POR_PC } from './planetas/planetas';
import { FOTOMETRIA, IDS_FOTOMETRIA } from './planetas/fotometria';
import { CORPOS_DO_SISTEMA, HELIO_SEM_PONTO, LUAS_DO_SISTEMA } from '../atlasConfig';
// só o TIPO: quem consome o MAPA de fases é a camada, e é `fases.test.ts`
// que varre a árvore para garantir que continue sendo só ela (§7)
import type { Phase } from '../fases';
import {
  ATLAS_FOV_GRAUS,
  enquadrar,
  orbitaMaisExterna,
  retanguloUtilDoAtlas,
} from '../cinematic/atlasRig';
import {
  CORPOS_COM_ORBITA,
  Orbitas,
  LARGURA_DA_FITA_PX,
  SAIA_DO_AA_PX,
  LIMITE_DA_BISSETRIZ,
  PASSO_DA_FITA,
  escalaDaBissetriz,
  larguraVisivelDaFitaPx,
  perfilDaSaia,
  pixelDaSaia,
  PONTOS_POR_ORBITA,
  conicaOsculadora,
  escreverLaco,
  muDoPar,
  muEmUaDia,
  realceDoFoco,
  RAIO_DA_CESSAO_PX,
  BORDA_DA_CESSAO_PX,
  type QuadroEmPx,
} from './orbitas';

// A MESMA carga do `efemerides.test.ts` — o motor de verdade, sobre o
// mesmo artefato que o navegador baixa.
const DATA_DIR = fileURLToPath(new URL('../../../public/data/atlas/', import.meta.url));
const meta = JSON.parse(
  readFileSync(join(DATA_DIR, 'efemerides_meta.json'), 'utf8')
) as MetaEfemerides;
const binNode = readFileSync(join(DATA_DIR, 'efemerides.bin'));
const motor = new MotorEfemerides(
  decodeEfemerides(
    binNode.buffer.slice(binNode.byteOffset, binNode.byteOffset + binNode.byteLength),
    meta
  )
);

/**
 * O QUADRO dos testes que só querem a ALTURA — quadrado, sem Retina. É o
 * que a camada recebia antes de as três medidas andarem juntas; os testes
 * da cessão montam o `QuadroEmPx` à mão, porque para eles a largura e o
 * `pixelRatio` são o assunto.
 */
function quadroDe(alturaPx: number): QuadroEmPx {
  return { larguraPx: alturaPx, alturaPx, pixelRatio: 1 };
}

describe('a cônica osculadora — o laço passa pelo ponto', () => {
  // nove anos depois da época: mais de um período de Júpiter, um terço
  // do de Saturno, e bem dentro da janela da tabela (1950–2050)
  const DATAS = [EPOCA_JD_TDB, EPOCA_JD_TDB + 3287];

  it('o vértice 0 É a posição viva do corpo, nas duas datas', () => {
    const buffer = new Float64Array(PONTOS_POR_ORBITA * 3);
    for (const jd of DATAS) {
      for (const corpo of CORPOS_COM_ORBITA) {
        const mu = muDoPar(corpo.centro, corpo.id);
        expect(mu, corpo.id).not.toBeNull();
        const r = motor.posicao(corpo.id, jd);
        const conica = conicaOsculadora(r, motor.velocidade(corpo.id, jd), mu!);
        expect(conica, `${corpo.id} sem elipse`).not.toBeNull();
        // a BASE CRUA e escala 1: o laço sai em UA no frame eclíptico, o
        // mesmo em que o motor respondeu — a álgebra julgada sem a ponte
        // de frame no meio
        escreverLaco(
          conica!, conica!.periastro, conica!.lateral, 1, buffer, PONTOS_POR_ORBITA
        );
        // IDENTIDADE, não tolerância de desenho: sobre um destino de
        // float64 a folga é só a do arredondamento em cima de |r|. O
        // pior caso da tabela é DEIMOS (e = 2,6e-4, medido 2,6e-14): a
        // órbita quase circular cancela quatro dígitos no vetor de
        // Laplace-Runge-Lenz (`(v×h)/μ − r̂` é 1,0003 − 1,0000), e é por
        // isso que a folga é 1e-12 e não 1e-15. (No buffer de float32
        // da camada o que resta é a quantização dele, ~1e-7 — julgada
        // no último bloco.)
        const escala = Math.hypot(r.x, r.y, r.z);
        expect(Math.abs(buffer[0] - r.x) / escala, corpo.id).toBeLessThan(1e-12);
        expect(Math.abs(buffer[1] - r.y) / escala, corpo.id).toBeLessThan(1e-12);
        expect(Math.abs(buffer[2] - r.z) / escala, corpo.id).toBeLessThan(1e-12);
      }
    }
  });

  it('o laço FECHA — o último vértice encosta no primeiro', () => {
    const buffer = new Float64Array(PONTOS_POR_ORBITA * 3);
    for (const corpo of CORPOS_COM_ORBITA) {
      const conica = conicaOsculadora(
        motor.posicao(corpo.id, EPOCA_JD_TDB),
        motor.velocidade(corpo.id, EPOCA_JD_TDB),
        muDoPar(corpo.centro, corpo.id)!
      )!;
      escreverLaco(conica, conica.periastro, conica.lateral, 1, buffer, PONTOS_POR_ORBITA);
      const u = PONTOS_POR_ORBITA - 1;
      const passo = Math.hypot(
        buffer[u * 3] - buffer[0],
        buffer[u * 3 + 1] - buffer[1],
        buffer[u * 3 + 2] - buffer[2]
      );
      // o segmento de fechamento é UM passo de amostragem, não um salto:
      // menos de 3% do semieixo com 256 pontos, mesmo em órbita excêntrica
      expect(passo / conica.semieixoUa, corpo.id).toBeLessThan(0.03);
    }
  });

  it('o semieixo bate com a distância média do corpo ao centro', () => {
    // uma cônica com `a` errado passaria pelo ponto e mentiria no resto
    // — este é o oráculo do TAMANHO, e ele é grosseiro de propósito
    // (osculante contra publicado, sem tabela nova no repositório)
    const publicado: Record<string, number> = {
      mercury: 0.3871, venus: 0.7233, earth: 1.0, mars: 1.5237,
      jupiter: 5.2029, saturn: 9.5367, uranus: 19.189, neptune: 30.07,
      pluto: 39.48,
      moon: 0.00257, titan: 0.00817, io: 0.00282, charon: 0.0001310,
    };
    for (const [id, aUa] of Object.entries(publicado)) {
      const corpo = CORPOS_COM_ORBITA.find((c) => c.id === id)!;
      const conica = conicaOsculadora(
        motor.posicao(id, EPOCA_JD_TDB),
        motor.velocidade(id, EPOCA_JD_TDB),
        muDoPar(corpo.centro, id)!
      );
      // 1% cobre a oscilação do osculante sob perturbação de terceiro
      // corpo e o arredondamento do valor publicado
      expect(Math.abs(conica!.semieixoUa - aUa) / aUa, id).toBeLessThan(0.01);
    }
  });
});

describe('o μ, e as duas conferências independentes (§3)', () => {
  it('o μ do Sol pelo kernel gm_de440 bate com k², a constante gaussiana', () => {
    const nosso = muDoPar('sun', 'earth')!;
    // a massa da Terra entra no par e vale 3e-6 de μ☉; a conta abaixo
    // desconta exatamente ela para comparar como igual com igual
    const soDoSol = muEmUaDia(132712440041.27942);
    expect(Math.abs(soDoSol - MU_SUN_AU3_PER_DAY2) / MU_SUN_AU3_PER_DAY2)
      .toBeLessThan(1e-6);
    expect(nosso).toBeGreaterThan(soDoSol);
  });

  it('os μ dos seis pais batem com `MU_PARENT` dentro de 1e-3', () => {
    // `MU_PARENT` é valor de SISTEMA (pai + luas) e o `BODY<n>_GM` do
    // kernel é o do planeta só — então a comparação honesta é contra o
    // μ DO PAR que a camada realmente usa, com uma lua de cada pai. Em
    // Plutão isso não é sutileza: Caronte vale 12% da massa, e comparar
    // só o planeta erraria por 11%.
    const parDeCada: Record<string, string> = {
      mars: 'phobos', jupiter: 'io', saturn: 'titan',
      uranus: 'ariel', neptune: 'triton', pluto: 'charon',
    };
    for (const [pai, lua] of Object.entries(parDeCada)) {
      const doPar = muDoPar(pai, lua)!;
      const referencia = MU_PARENT[pai];
      expect(Math.abs(doPar - referencia) / referencia, pai).toBeLessThan(1e-3);
    }
  });
});

describe('a lista de quem ganha linha', () => {
  it('são 30: os nove do retrato e as 21 luas — e mais ninguém', () => {
    expect(CORPOS_COM_ORBITA).toHaveLength(30);
    // o Sol é a origem: não orbita nada
    expect(CORPOS_COM_ORBITA.some((c) => c.id === 'sun')).toBe(false);
    // OS OITO SEM PONTO FICAM FORA por decisão tomada com a foto na mão
    // (ver o cabeçalho da lista): linha sem corpo desenhado no mesmo
    // enquadramento não está lendo nada, e as oito juntas viravam um
    // novelo por cima dos planetas na abertura do Atlas.
    for (const semPonto of HELIO_SEM_PONTO) {
      expect(CORPOS_COM_ORBITA.some((c) => c.id === semPonto.id), semPonto.id).toBe(false);
    }
  });

  it('o centro derivado do config bate com o registro do motor', () => {
    for (const corpo of CORPOS_COM_ORBITA) {
      expect(REGISTRO_ORBITAL[corpo.id], corpo.id).toBeDefined();
      expect(REGISTRO_ORBITAL[corpo.id].centro, corpo.id).toBe(corpo.centro);
    }
  });

  it('a lua gira no PAI, não no Sol', () => {
    // trocar `posicao` por `posicaoHeliocentrica` daria à Lua um laço de
    // raio 1 UA em volta do Sol; o certo é 0,0026 UA em volta da Terra
    const conica = conicaOsculadora(
      motor.posicao('moon', EPOCA_JD_TDB),
      motor.velocidade('moon', EPOCA_JD_TDB),
      muDoPar('earth', 'moon')!
    );
    expect(conica!.semieixoUa).toBeLessThan(0.01);
    expect(conica!.semieixoUa).toBeGreaterThan(0.002);
  });
});

describe('a janela da tabela — por que o caminho do contrato não existe', () => {
  it('amostrar UM período pela efeméride LANÇA de Saturno em diante', () => {
    // A acusação escrita no §1 de `orbitas.ts`, provada em vez de
    // acreditada: a tabela embarcada cobre 1950–2050 e o motor lança
    // fora dela, de propósito (adaptação b de `efemerides.ts`). Da época
    // do retrato, um período inteiro sai da janela em quatro dos nove.
    const periodoDias: Record<string, number> = {
      saturn: 10777, uranus: 30749, neptune: 60339, pluto: 90560,
    };
    // PARA A FRENTE, os quatro saem da janela
    for (const [id, T] of Object.entries(periodoDias)) {
      expect(() => motor.posicao(id, EPOCA_JD_TDB + T), id).toThrow();
    }
    // e para TRÁS não salva: Saturno caberia (1996), mas Urano, Netuno
    // e Plutão saem dos dois lados — não há sentido de varredura que
    // feche o laço deles
    for (const id of ['uranus', 'neptune', 'pluto']) {
      expect(() => motor.posicao(id, EPOCA_JD_TDB - periodoDias[id]), id).toThrow();
    }
    // …e Júpiter, que CABE, é a prova de que a janela é o limite e não
    // um erro de chamada
    expect(() => motor.posicao('jupiter', EPOCA_JD_TDB + 4333)).not.toThrow();
  });
});

describe('a camada no quadro', () => {
  /** A câmera do TETO do zoom do Atlas, 224 UA — a que ACENDE as linhas
   *  de fora. Era a ABERTURA até 23/08; desde o item 61 o Atlas nasce na
   *  borda do sistema interno, e quem mede LÁ é o teste do fim deste
   *  bloco. Aqui o teto continua sendo o banco de prova certo: é a vista
   *  em que MAIS linhas acendem, e um teste de "acende/não acende" quer
   *  justamente o caso mais cheio. */
  function cameraDoTeto(): THREE.PerspectiveCamera {
    const c = new THREE.PerspectiveCamera(35, 1, 1e-9, 1e6);
    c.position.set(0, 0, 224 / UA_POR_PC);
    c.lookAt(0, 0, 0);
    c.updateMatrixWorld(true);
    return c;
  }
  const TAN_35 = Math.tan((35 * Math.PI) / 360);

  /**
   * Um motor ESPIÃO: conta as perguntas e é a única forma de o teste
   * abaixo cobrar "não pergunta nada". Delega ao motor de verdade, para
   * não trocar o oráculo por um dublê que responde o que se quer ouvir.
   */
  function espiao() {
    let perguntas = 0;
    return {
      contagem: () => perguntas,
      posicao: (id: string, jd: number) => { perguntas++; return motor.posicao(id, jd); },
      velocidade: (id: string, jd: number) => { perguntas++; return motor.velocidade(id, jd); },
      posicaoHeliocentrica: (id: string, jd: number) => {
        perguntas++;
        return motor.posicaoHeliocentrica(id, jd);
      },
    };
  }

  it('desligada não deixa nada visível — e o quadro NÃO pergunta ao motor', () => {
    const orbitas = new Orbitas();
    const fonte = espiao();
    // um quadro inteiro com a porta fechada, na câmera que ACENDERIA as
    // linhas se ela estivesse aberta — senão o teste passaria por falta
    // de assunto em vez de por causa da porta
    orbitas.ligado = false;
    orbitas.update(cameraDoTeto(), quadroDe(1800), TAN_35, 0, null, 'atlas');
    expect(orbitas.group.visible).toBe(false);
    expect(orbitas.acesas).toBe(0);
    // o QUADRO é caminho puro: quem fala com o motor é `escreverInstante`,
    // e o director só o chama com a camada ligada
    expect(fonte.contagem(), 'o update falou com o motor').toBe(0);

    // e com a porta ABERTA a mesma câmera acende — a prova de que o
    // veredito acima mede a porta, e não um enquadramento vazio
    orbitas.ligado = true;
    orbitas.escreverInstante(EPOCA_JD_TDB, fonte);
    orbitas.update(cameraDoTeto(), quadroDe(1800), TAN_35, 0, null, 'atlas');
    expect(orbitas.acesas).toBeGreaterThan(0);
    expect(fonte.contagem()).toBeGreaterThan(0);
    orbitas.dispose();
  });

  it('sem efeméride não há linha — o retrato congelado não entra (§6)', () => {
    const orbitas = new Orbitas();
    orbitas.ligado = true;
    // NENHUM `escreverInstante` — é o estado do filme antes da coda, e o
    // quadro roda assim mesmo: o director chama `update` todo quadro,
    // com ou sem motor. Sem ESTE update o teste passaria mesmo que o
    // quadro acendesse linha a partir do retrato congelado, que é
    // exatamente o defeito que o §6 proíbe.
    orbitas.update(cameraDoTeto(), quadroDe(1800), TAN_35, 0, null, 'atlas');
    expect(orbitas.acesas).toBe(0);
    expect(orbitas.dbg()).toContain('0 acesas');
    // e a geometria continua VAZIA: nada foi escrito de lugar nenhum
    for (const filho of orbitas.group.children) {
      const g = (filho as unknown as {
        geometry: { getAttribute(n: string): { array: Float32Array } };
      }).geometry.getAttribute('instanceStart').array;
      expect(g.every((v) => v === 0)).toBe(true);
    }
    orbitas.dispose();
  });

  it('A PROMESSA DO ITEM 77: a linha não larga o ponto em salto de data', () => {
    // O ORÁCULO DAS DUAS CAMADAS DE VERDADE, e é o teste que o contrato
    // do item 77 pede pelo nome: "a efeméride VIVA, nunca o retrato
    // congelado — senão a linha e o ponto divergem no primeiro salto de
    // data". Aqui os dois consumidores REAIS são construídos lado a
    // lado — a camada dos dez pontos e a das linhas — e mandados ao
    // mesmo instante duas vezes, com dez anos entre elas. O vértice 0
    // do laço, posto no centro vivo, tem de cair EM CIMA do ponto.
    const pontos = new Planetas({ expoM0: 3.5, sigmaPx: 0.85, beta: 300 });
    const orbitas = new Orbitas();
    orbitas.ligado = true;
    // A CÂMERA DO TETO DO ATLAS — 224 UA, lente de 35°: é dela que
    // sai o fade, e o fade é quem decide QUEM se reamostra. Sem um
    // quadro de verdade aqui o teste mediria um estado que a tela nunca
    // tem (todas as linhas apagadas, nenhuma se renovando). Aqui é o
    // teto, e não a abertura, porque é a vista em que MAIS linhas
    // acendem — e o que se cobra é a reamostragem de todas elas.
    const camera = new THREE.PerspectiveCamera(35, 1, 1e-9, 1e6);
    camera.position.set(0, 0, 224 / UA_POR_PC);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const tanHalfFov = Math.tan((35 * Math.PI) / 360);
    const quadro = (jd: number) => {
      // a ORDEM DO TICK, e ela importa: o instante antes do quadro, nas
      // duas camadas (`director.ts`)
      pontos.escreverInstante(jd, motor);
      orbitas.escreverInstante(jd, motor);
      orbitas.update(camera, quadroDe(1800), tanHalfFov, 0, null, 'atlas');
    };
    for (const jd of [EPOCA_JD_TDB, EPOCA_JD_TDB + 3653]) {
      // DOIS quadros, e o segundo é o contrato: uma linha que estava
      // APAGADA no quadro anterior se renova no quadro seguinte ao de
      // acender — nunca mais tarde que isso, e no instante em que isso
      // acontece ela está saindo do zero do fade.
      quadro(jd);
      quadro(jd);
      const pos = pontos.posicoes;
      for (let i = 0; i < CORPOS_COM_ORBITA.length; i++) {
        const corpo = CORPOS_COM_ORBITA[i];
        const j = (IDS_FOTOMETRIA as readonly string[]).indexOf(corpo.id);
        if (j < 0) continue; // as luas não têm ponto fotométrico
        const fita = orbitas.group.children[i] as unknown as {
          geometry: { getAttribute(n: string): { array: Float32Array } };
          position: { x: number; y: number; z: number };
        };
        const g = fita.geometry.getAttribute('instanceStart').array;
        const c = fita.position;
        const d = Math.hypot(
          g[0] + c.x - pos[j * 3],
          g[1] + c.y - pos[j * 3 + 1],
          g[2] + c.z - pos[j * 3 + 2]
        );
        const r = Math.hypot(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
        // os dois buffers são float32 e vieram por contas diferentes: a
        // folga é a quantização deles, não uma tolerância de desenho
        expect(d / r, `${corpo.id} @ ${jd}`).toBeLessThan(1e-6);
      }
    }
    pontos.dispose();
    orbitas.dispose();
  });

  it('na vista do sistema INTERNO acendem as quatro de dentro, e só elas', () => {
    // A LEI DO FADE na vista interna (o item 77 quem a desenha), cobrada
    // como número. Esta vista foi a ABERTURA entre 23/08 e 29/08; desde
    // 29/08 a abertura é o sistema INTEIRO (a escolha dele pela folha do
    // item 61), e esta vista virou o lugar aonde a roda chega descendo —
    // o comportamento das linhas nela continua sendo lei, porque a
    // camada não sabe de onde o visitante veio.
    //
    // A DISTÂNCIA NÃO É LITERAL: sai de `enquadrar()` sobre a esfera da
    // órbita de Marte (a borda do sistema interno, no dado vivo da
    // época), então ela acompanha a lente e o retângulo útil em vez de
    // envelhecer aqui.
    const marte = motor.posicaoHeliocentrica('mars', EPOCA_JD_TDB);
    const distancia = enquadrar({
      rAlvo: Math.hypot(marte.x, marte.y, marte.z) * AU_PARA_PC,
      fovDeg: ATLAS_FOV_GRAUS,
      aspect: 4 / 3,
      retanguloUtil: retanguloUtilDoAtlas(),
    }).distancia;
    // ~5,3 UA sob a lente de 58°: a faixa é larga porque quem a move é o
    // HUD, e estreita o bastante para pegar uma troca de esfera (o
    // sistema inteiro enquadra a ~130 UA)
    expect(distancia * UA_POR_PC).toBeGreaterThan(4.5);
    expect(distancia * UA_POR_PC).toBeLessThan(6.5);

    const orbitas = new Orbitas();
    orbitas.ligado = true;
    orbitas.escreverInstante(EPOCA_JD_TDB, motor);
    const camera = new THREE.PerspectiveCamera(ATLAS_FOV_GRAUS, 4 / 3, 1e-9, 1e6);
    camera.position.set(0, 0, distancia);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const tanAtlas = Math.tan((ATLAS_FOV_GRAUS * Math.PI) / 360);
    orbitas.update(camera, quadroDe(900), tanAtlas, 0, null, 'atlas');

    const alfaDe = (id: string) => {
      const i = CORPOS_COM_ORBITA.findIndex((c) => c.id === id);
      const fita = orbitas.group.children[i] as unknown as {
        material: { opacity: number };
      };
      return fita.material.opacity;
    };
    // AS QUATRO DE DENTRO, no brilho CHEIO — nenhuma no meio do fade: a
    // vista não é "quase dá para ver as linhas"
    for (const id of ['mercury', 'venus', 'earth', 'mars']) {
      expect(alfaDe(id), `${id} devia acender na vista interna`).toBeGreaterThan(0.3);
    }
    // ...e NENHUMA heliocêntrica de fora, que é a outra metade da
    // vista: de Júpiter para fora a órbita não cabe no quadro, e uma
    // linha que não cabe é um risco atravessando o céu (§5)
    for (const id of ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto']) {
      expect(alfaDe(id), `${id} não devia acender na vista interna`).toBe(0);
    }
    orbitas.dispose();
  });

  it('o fade da linha é INVARIANTE de resolução — Retina vê o mesmo céu (97)', () => {
    // A DOENÇA (achada em 25/08, consertada em 29/08): o raio aparente
    // da elipse era medido em px de BUFFER, então no dpr 2 cada órbita
    // nascia e enchia ao DOBRO da distância. A régua certa é a de CSS —
    // a mesma da fita e do clarão. A prova é a invariância: o MESMO céu
    // em dpr 1 (900 px) e dpr 2 (1800 px de buffer, mesma janela) tem de
    // dar alfas IDÊNTICOS, órbita por órbita. Reverter a divisão pelo
    // pixelRatio reprova aqui — no dpr 2, Mercúrio sairia CHEIO onde o
    // dpr 1 o desenha a meio caminho.
    const distancia = 39.3 / UA_POR_PC; // Mercúrio a meio-fade (raio ~8 px CSS)
    const alfasEm = (quadro: QuadroEmPx) => {
      const orbitas = new Orbitas();
      orbitas.ligado = true;
      orbitas.escreverInstante(EPOCA_JD_TDB, motor);
      const camera = new THREE.PerspectiveCamera(ATLAS_FOV_GRAUS, 4 / 3, 1e-9, 1e6);
      camera.position.set(0, 0, distancia);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld(true);
      const tanAtlas = Math.tan((ATLAS_FOV_GRAUS * Math.PI) / 360);
      orbitas.update(camera, quadro, tanAtlas, 0, null, 'atlas');
      const resultado = CORPOS_COM_ORBITA.map((c, i) => ({
        id: c.id,
        alfa: (orbitas.group.children[i] as unknown as { material: { opacity: number } })
          .material.opacity,
      }));
      orbitas.dispose();
      return resultado;
    };
    const dpr1 = alfasEm({ larguraPx: 900, alturaPx: 900, pixelRatio: 1 });
    const dpr2 = alfasEm({ larguraPx: 1800, alturaPx: 1800, pixelRatio: 2 });
    // Mercúrio está no MEIO do fade — o teste morde de verdade: antes do
    // conserto o dpr 2 o dava cheio (0,32) e o dpr 1 a meio caminho
    const mercurio1 = dpr1.find((c) => c.id === 'mercury')!.alfa;
    expect(mercurio1).toBeGreaterThan(0.05);
    expect(mercurio1).toBeLessThan(0.3);
    for (let i = 0; i < dpr1.length; i++) {
      expect(dpr2[i].alfa, `${dpr1[i].id}: dpr2 difere do dpr1`).toBeCloseTo(dpr1[i].alfa, 12);
    }
  });

  it('na ABERTURA (o sistema inteiro, 29/08) os nove laços têm dono declarado', () => {
    // A VISTA COM QUE O ATLAS ABRE desde 29/08 — a escolha dele pela
    // folha do item 61 sob a lente de 58° (item 86): o sistema INTEIRO,
    // estilo NASA Eyes. Quem faz a vista é a Escada e quem faz as
    // linhas é esta camada; sem este teste nada guarda o encontro.
    // A distância sai de `enquadrar()` sobre a esfera do sistema — a
    // MESMA conta do teto do zoom — e acompanha lente e HUD.
    const distancia = enquadrar({
      rAlvo: orbitaMaisExterna().raio,
      fovDeg: ATLAS_FOV_GRAUS,
      aspect: 4 / 3,
      retanguloUtil: retanguloUtilDoAtlas(),
    }).distancia;
    const orbitas = new Orbitas();
    orbitas.ligado = true;
    orbitas.escreverInstante(EPOCA_JD_TDB, motor);
    const camera = new THREE.PerspectiveCamera(ATLAS_FOV_GRAUS, 4 / 3, 1e-9, 1e6);
    camera.position.set(0, 0, distancia);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const tanAtlas = Math.tan((ATLAS_FOV_GRAUS * Math.PI) / 360);
    orbitas.update(camera, quadroDe(900), tanAtlas, 0, null, 'atlas');
    const alfaDe = (id: string) => {
      const i = CORPOS_COM_ORBITA.findIndex((c) => c.id === id);
      const fita = orbitas.group.children[i] as unknown as {
        material: { opacity: number };
      };
      return fita.material.opacity;
    };
    // OS CINCO DE FORA no brilho CHEIO — é o contexto que ele pediu
    // (medido em 29/08: os cinco em 0,320, o alfa pleno da fita)
    for (const id of ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto']) {
      expect(alfaDe(id), `${id} devia acender na abertura`).toBeGreaterThan(0.3);
    }
    // Mercúrio não acende (órbita de ~3 px a esta distância) e o fade é
    // MONOTÔNICO de dentro para fora — os números do meio (medidos em
    // 29/08: Vênus 0,010, Terra 0,045, Marte 0,151) andam com o HUD e
    // com a lente, então o que se pina é a ORDEM, não o valor
    expect(alfaDe('mercury')).toBeLessThan(0.02);
    const dentroParaFora = ['mercury', 'venus', 'earth', 'mars', 'jupiter'];
    for (let i = 1; i < dentroParaFora.length; i++) {
      expect(
        alfaDe(dentroParaFora[i]),
        `${dentroParaFora[i]} devia brilhar ≥ ${dentroParaFora[i - 1]}`
      ).toBeGreaterThanOrEqual(alfaDe(dentroParaFora[i - 1]));
    }
    orbitas.dispose();
  });

  it('a COR da linha vem da TEXTURA do globo — e Mercúrio fica na fotometria (83·B3)', () => {
    // A escolha dele na prancha v3 (29/08): a Terra sai o AZUL DO
    // OCEANO da própria textura — apagar a fiação de COR_DA_TEXTURA
    // devolveria o creme da fotometria e reprova aqui.
    const corDe = (id: string) =>
      CORPOS_COM_ORBITA.find((c) => c.id === id)!.cor;
    const terra = corDe('earth');
    expect(terra[2]).toBe(1); // azul é o canal pleno
    expect(terra[0]).toBeLessThan(0.1); // e o vermelho quase nada
    // Marte é a ferrugem da textura: vermelho pleno, azul baixo
    const marte = corDe('mars');
    expect(marte[0]).toBe(1);
    expect(marte[2]).toBeLessThan(0.15);
    // Mercúrio não tem pixel que vote (textura neutra) e cai na
    // fotometria — o fallback é LEI, não esquecimento
    const mercurio = corDe('mercury');
    const linha = FOTOMETRIA.mercury.corLinear;
    const pico = Math.max(linha[0], linha[1], linha[2]);
    expect(mercurio[0]).toBeCloseTo(linha[0] / pico, 12);
    expect(mercurio[2]).toBeCloseTo(linha[2] / pico, 12);
    // e a LUA herda a cor do pai — o azul da Terra
    const lua = CORPOS_COM_ORBITA.find((c) => c.id === 'moon')!.cor;
    expect(lua).toEqual(terra);
  });

  it('com efeméride, o laço da Terra nasce no lugar da Terra', () => {
    const orbitas = new Orbitas();
    orbitas.ligado = true;
    expect(orbitas.escreverInstante(EPOCA_JD_TDB, motor)).toBe(true);
    // a ordem do grupo é a de `CORPOS_COM_ORBITA`, que é a do config
    const iTerra = CORPOS_COM_ORBITA.findIndex((c) => c.id === 'earth');
    expect(iTerra).toBeGreaterThanOrEqual(0);
    const fita = orbitas.group.children[iTerra] as unknown as {
      geometry: { getAttribute(n: string): { array: Float32Array } };
    };
    const p = motor.posicaoHeliocentrica('earth', EPOCA_JD_TDB);
    const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
    const arr = fita.geometry.getAttribute('instanceStart').array;
    // float32 do atributo contra float64 da efeméride: a folga é a da
    // quantização do buffer, e é relativa ao raio da órbita
    const escala = Math.hypot(eq[0], eq[1], eq[2]) * AU_PARA_PC;
    expect(Math.abs(arr[0] - eq[0] * AU_PARA_PC) / escala).toBeLessThan(1e-6);
    expect(Math.abs(arr[1] - eq[1] * AU_PARA_PC) / escala).toBeLessThan(1e-6);
    expect(Math.abs(arr[2] - eq[2] * AU_PARA_PC) / escala).toBeLessThan(1e-6);
    orbitas.dispose();
  });
});

describe('A ÓRBITA VIRA FITA (item 83 · L2)', () => {
  /** o buffer interleaved de uma linha, pelo objeto do three */
  function segmentosDe(orbitas: Orbitas, id: string) {
    const i = CORPOS_COM_ORBITA.findIndex((c) => c.id === id);
    const g = (orbitas.group.children[i] as unknown as {
      geometry: {
        getAttribute(n: string): { data: { array: Float32Array }; array: Float32Array };
        instanceCount: number;
      };
    }).geometry;
    return {
      atributo: g.getAttribute('instanceStart'),
      dados: g.getAttribute('instanceStart').data,
      instancias: g.instanceCount,
    };
  }

  it('a fita é CONTÍNUA e FECHADA — o fim de cada segmento é o começo do próximo', () => {
    // O DEFEITO QUE ISTO PEGA: escrever só os inícios (ou esquecer o
    // segmento de fechamento) desenha uma fita tracejada, ou um laço
    // aberto com uma fatia faltando — e as duas passariam por qualquer
    // teste que só olhasse o vértice 0.
    const orbitas = new Orbitas();
    orbitas.ligado = true;
    orbitas.escreverInstante(EPOCA_JD_TDB, motor);
    for (const id of ['earth', 'io', 'pluto']) {
      const { dados, instancias } = segmentosDe(orbitas, id);
      expect(instancias, id).toBe(PONTOS_POR_ORBITA);
      const a = dados.array;
      for (let k = 0; k < PONTOS_POR_ORBITA; k++) {
        const proximo = (k + 1) % PONTOS_POR_ORBITA;
        for (let eixo = 0; eixo < 3; eixo++) {
          // fim do segmento k === início do segmento k+1, BIT A BIT: os
          // dois saíram da mesma cópia do mesmo ponto
          expect(a[k * PASSO_DA_FITA + 3 + eixo], `${id} seg ${k} eixo ${eixo}`)
            .toBe(a[proximo * PASSO_DA_FITA + eixo]);
        }
      }
      // ...e o laço FECHA: o último segmento volta ao ponto 0
      const u = PONTOS_POR_ORBITA - 1;
      expect(a[u * PASSO_DA_FITA + 3], id).toBe(a[0]);
    }
    orbitas.dispose();
  });

  it('cada segmento conhece os DOIS vizinhos, e o laço fecha neles (§5e · B2)', () => {
    // A BISSETRIZ SÓ É CERTA SE OS VIZINHOS FOREM OS CERTOS, e este é o
    // dente que a sabotagem pega: trocar `k+1` por `k`, esquecer o módulo
    // do fechamento ou apontar o "seguinte" para o fim do próprio segmento
    // desenha uma junta torta que nenhum teste de posição notaria — o
    // início e o fim continuariam no lugar.
    //
    // A LEI, escrita como identidade e não como tolerância: o ANTERIOR do
    // segmento k é o INÍCIO do segmento k−1, e o SEGUINTE do segmento k é
    // o FIM do segmento k+1. Bit a bit, porque as quatro cópias saem da
    // mesma leitura do mesmo ponto.
    const orbitas = new Orbitas();
    orbitas.ligado = true;
    orbitas.escreverInstante(EPOCA_JD_TDB, motor);
    for (const id of ['earth', 'io', 'pluto']) {
      const a = segmentosDe(orbitas, id).dados.array;
      const n = PONTOS_POR_ORBITA;
      for (let k = 0; k < n; k++) {
        const anteriorDe = ((k + n - 1) % n) * PASSO_DA_FITA; // início de k−1
        const seguinteDe = ((k + 1) % n) * PASSO_DA_FITA + 3; // fim de k+1
        for (let eixo = 0; eixo < 3; eixo++) {
          expect(a[k * PASSO_DA_FITA + 6 + eixo], `${id} anterior seg ${k} eixo ${eixo}`)
            .toBe(a[anteriorDe + eixo]);
          expect(a[k * PASSO_DA_FITA + 9 + eixo], `${id} seguinte seg ${k} eixo ${eixo}`)
            .toBe(a[seguinteDe + eixo]);
        }
      }
      // e nenhum vizinho ficou no zero de fábrica: um índice fora do laço
      // deixaria o buffer intocado ali, e o shader dobraria contra a origem
      let zerados = 0;
      for (let k = 0; k < n; k++) {
        if (a[k * PASSO_DA_FITA + 6] === 0 && a[k * PASSO_DA_FITA + 9] === 0) zerados++;
      }
      expect(zerados, `${id}: vizinhos nunca escritos`).toBe(0);
    }
    orbitas.dispose();
  });

  it('a bissetriz estica o canto e tem TETO — a conta, e a mesma no shader (§5e)', () => {
    // A METADE NUMÉRICA. `escalaDaBissetriz` é `1/cos(θ/2)`, e o teste
    // cobra os três regimes com valores que não saem da própria fórmula:
    //
    //   · RETA (θ = 0): a bissetriz É a perpendicular, e não estica nada.
    expect(escalaDaBissetriz(1)).toBeCloseTo(1, 12);
    //   · CANTO RETO (θ = 90°): o canto externo fica a √2 meias larguras
    //     do vértice — geometria de quadrado, conferível sem a fórmula.
    expect(escalaDaBissetriz(0)).toBeCloseTo(Math.SQRT2, 12);
    //   · DOBRA DE 60°: 1/cos(30°) = 2/√3.
    expect(escalaDaBissetriz(Math.cos(Math.PI / 3))).toBeCloseTo(2 / Math.sqrt(3), 12);
    //   · A VOLTA DE 180°: sem teto o esporão iria ao infinito e viraria
    //     uma agulha atravessando o quadro. O teto corta em 4×, e o 4 é
    //     COBRADO em número: escrever o teto em função da própria
    //     constante deixaria um `LIMITE` de 1e-6 passar — foi o que uma
    //     sabotagem provou, e é por isso que a linha abaixo existe.
    expect(LIMITE_DA_BISSETRIZ, 'o teto do esporão foi afrouxado').toBe(0.25);
    expect(escalaDaBissetriz(-1), 'sem teto o esporão vira agulha').toBeLessThanOrEqual(4);
    expect(escalaDaBissetriz(-1)).toBeCloseTo(1 / LIMITE_DA_BISSETRIZ, 12);
    expect(escalaDaBissetriz(-0.999)).toBeLessThanOrEqual(4);
    // NUMA ELIPSE DE 256 PONTOS o teto nunca entra, e a correção é
    // pequena — mas não é zero, e é ela que fecha a cunha.
    const dobra = (2 * Math.PI) / PONTOS_POR_ORBITA;
    expect(escalaDaBissetriz(Math.cos(dobra))).toBeGreaterThan(1);
    expect(escalaDaBissetriz(Math.cos(dobra))).toBeLessThan(1.001);

    // A METADE DE TEXTO: o GLSL carrega a MESMA expressão e os MESMOS
    // atributos. Sem este pino, apagar a cirurgia do vertex devolveria a
    // perpendicular de sempre com a suíte inteira verde — o buffer
    // continuaria com os vizinhos certos, e ninguém os leria.
    const orbitas = new Orbitas();
    const shader = compilarDeVerdade(materialDe(orbitas));
    const v = shader.vertexShader;
    expect(v, 'os atributos de vizinho sumiram').toContain('attribute vec3 instanceAnterior;');
    expect(v).toContain('attribute vec3 instanceSeguinte;');
    expect(v, 'a bissetriz sumiu do vertex').toContain('normalize( bissetriz )');
    expect(v, 'o esticão 1/cos(θ/2) sumiu').toContain('sqrt( ( 1.0 + dot( l0, l1 ) ) / 2.0 )');
    expect(v, 'o teto do esporão sumiu').toContain(`max( ${LIMITE_DA_BISSETRIZ.toFixed(2)},`);
    // ...e a PERPENDICULAR continua lá como ramo de fuga: quem está atrás
    // do olho ou tem vizinho degenerado não dobra
    expect(v).toContain('vec2 offset = vec2( dir.y, - dir.x );');
    expect(v, 'o ramo de fuga sumiu: NaN em gl_Position apaga o segmento').toContain('if ( ! atras )');
    // O CORTE NO NEAR PLANE É DO THREE e tem de sair intacto — a cirurgia
    // insere DEPOIS dele, nunca por cima
    expect(v, 'o corte no near plane foi comido').toContain('trimSegmentAlpha( start, end )');
    orbitas.dispose();
  });

  it('NUNCA realoca o buffer: o salto de data muta o array que já existe', () => {
    // O CUIDADO (c) DO ITEM 83, cobrado como comportamento e não como
    // promessa: `setPositions()` aloca um `InstancedInterleavedBuffer`
    // NOVO e recomputa as duas bounding volumes. Se alguém trocar a
    // mutação por ele, a IDENTIDADE do buffer e a do array mudam — e é
    // exatamente isso que este teste segura, em três datas.
    const orbitas = new Orbitas();
    orbitas.ligado = true;
    // A CÂMERA É PARTE DO TESTE, e não cenário: uma linha APAGADA não se
    // reamostra (é a guarda de `escreverInstante`), então sem um quadro
    // de verdade este teste passaria sem nunca reescrever nada — que é
    // exatamente o falso positivo que ele existe para não ser. A 10 UA a
    // órbita da Terra acende cheia.
    const cam = new THREE.PerspectiveCamera(35, 1, 1e-9, 1e6);
    cam.position.set(0, 0, 10 / UA_POR_PC);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld(true);
    const tan = Math.tan((35 * Math.PI) / 360);
    const quadro = (jd: number) => {
      orbitas.escreverInstante(jd, motor);
      orbitas.update(cam, quadroDe(1800), tan, 0, null, 'atlas');
    };

    quadro(EPOCA_JD_TDB);
    quadro(EPOCA_JD_TDB);
    const { dados } = segmentosDe(orbitas, 'earth');
    const bufferOriginal = dados;
    const arrayOriginal = dados.array;
    const primeiroX = arrayOriginal[0];

    for (const jd of [EPOCA_JD_TDB + 200, EPOCA_JD_TDB + 1500, EPOCA_JD_TDB - 900]) {
      quadro(jd);
      const agora = segmentosDe(orbitas, 'earth');
      expect(agora.dados, 'o buffer foi realocado').toBe(bufferOriginal);
      expect(agora.dados.array, 'o array foi realocado').toBe(arrayOriginal);
    }
    // e a reescrita ACONTECEU de verdade — senão o teste acima passaria
    // com uma camada que não desenha nada
    expect(arrayOriginal[0]).not.toBe(primeiroX);
    orbitas.dispose();
  });

  it('a largura é a do estudo, em px CSS, e a camada não escreve `resolution`', () => {
    // A LARGURA em px CSS depende de o `resolution` vir do renderer
    // (`LineSegments2.onBeforeRender`, r165+). Escrevê-lo à mão no
    // resize — o reflexo antigo — reintroduz o bug que o upstream
    // fechou, e a fita passa a depender do pixelRatio. Aqui a camada
    // roda um instante inteiro SEM renderer: se ela mexesse no
    // `resolution`, ele não estaria mais no zero de fábrica.
    const orbitas = new Orbitas();
    orbitas.ligado = true;
    orbitas.escreverInstante(EPOCA_JD_TDB, motor);
    const material = (orbitas.group.children[0] as unknown as {
      material: {
        linewidth: number;
        worldUnits: boolean;
        alphaToCoverage: boolean;
        resolution: { x: number; y: number };
      };
    }).material;
    // OS DOIS NÚMEROS (§5d): o material leva a largura INCHADA — o traço
    // visível MAIS a saia do AA —, e a saia é o que a beira em rampa
    // gasta. Cobrar só `1,25` deixaria passar uma fita sem saia (beira em
    // escada de novo) e cobrar só `2,25` deixaria passar quem engordasse
    // o traço visível fingindo que era AA.
    expect(material.linewidth).toBe(LARGURA_DA_FITA_PX + SAIA_DO_AA_PX);
    expect(LARGURA_DA_FITA_PX).toBe(1.25);
    expect(SAIA_DO_AA_PX).toBe(1);
    // em unidades de MUNDO a largura deixaria de ser um pixel e passaria
    // a encolher com a distância — o oposto do que a fita é
    expect(material.worldUnits).toBe(false);
    // sem MSAA nesta casa (o renderer nasce com `antialias: false`), a
    // cobertura não teria quem a amostrasse
    expect(material.alphaToCoverage).toBe(false);
    expect(material.resolution.x, 'a camada escreveu `resolution`').toBe(0);
    expect(material.resolution.y, 'a camada escreveu `resolution`').toBe(0);
    orbitas.dispose();
  });

  /** O material de uma linha, com as duas cirurgias já instaladas. */
  type MaterialDaFita = {
    linewidth: number;
    vertexShader: string;
    fragmentShader: string;
    onBeforeCompile(s: {
      uniforms: Record<string, { value: unknown }>;
      fragmentShader: string;
      vertexShader: string;
    }): void;
  };
  function materialDe(orbitas: Orbitas): MaterialDaFita {
    return (orbitas.group.children[0] as unknown as { material: MaterialDaFita }).material;
  }

  /**
   * O `onBeforeCompile` RODADO SOBRE O SHADER DE VERDADE do three, e não
   * sobre um fac-símile escrito à mão.
   *
   * Em Node não há GPU, então o que se afere é o TEXTO que a camada
   * entrega ao compilador. Fazê-lo sobre o shader real é o que dá valor ao
   * pino: no dia em que uma versão nova do three mudar a forma que as duas
   * cirurgias procuram, ELAS LANÇAM — e o teste vira vermelho aqui, em vez
   * de a fita sair torta no navegador de alguém.
   */
  function compilarDeVerdade(material: MaterialDaFita) {
    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      fragmentShader: material.fragmentShader,
      vertexShader: material.vertexShader,
    };
    material.onBeforeCompile(shader);
    return shader;
  }

  /**
   * A LARGURA QUE O MATERIAL RECEBEU depois de um quadro naquela janela —
   * é o número que a GPU lê, não uma cópia da conta.
   */
  function larguraNoQuadro(quadro: QuadroEmPx): number {
    const orbitas = new Orbitas();
    orbitas.ligado = true;
    const cam = new THREE.PerspectiveCamera(35, 4 / 3, 1e-9, 1e6);
    cam.updateMatrixWorld(true);
    orbitas.escreverInstante(EPOCA_JD_TDB, motor);
    orbitas.update(cam, quadro, Math.tan((35 * Math.PI) / 360), 0, null, 'atlas');
    const largura = (orbitas.group.children[0] as unknown as {
      material: { linewidth: number };
    }).material.linewidth;
    orbitas.dispose();
    return largura;
  }

  it('a fita ENGROSSA com a janela, e a régua é o pixel CSS (§5d · A3)', () => {
    // A LEI: `1,25 · max(1, min(lado CSS)/800)`, e a saia SOMA DEPOIS.
    //
    // NA JANELA DE REFERÊNCIA o fator é 1 e a fita é a de sempre.
    expect(larguraVisivelDaFitaPx({ larguraPx: 1200, alturaPx: 800, pixelRatio: 1 }))
      .toBeCloseTo(1.25, 12);
    // ABAIXO DELA a fita NÃO encolhe — o `max` é piso, não escala
    expect(larguraVisivelDaFitaPx({ larguraPx: 400, alturaPx: 300, pixelRatio: 1 }))
      .toBeCloseTo(1.25, 12);
    // ACIMA DELA cresce na proporção do LADO MENOR: 900/800 = 1,125
    expect(larguraVisivelDaFitaPx({ larguraPx: 1600, alturaPx: 900, pixelRatio: 1 }))
      .toBeCloseTo(1.25 * 1.125, 12);

    // A ARMADILHA (i) DO ITEM 83, e é ela que este bloco existe para
    // pegar: o `QuadroEmPx` fala em px de DISPOSITIVO. Uma janela de
    // 1200×900 CSS num Retina chega aqui como 2400×1800 — quem esquecer
    // de dividir pelo `pixelRatio` mede 1800 em vez de 900 e devolve
    // fator 2,25 no lugar de 1,125, uma fita com o DOBRO da grossura.
    const retina = { larguraPx: 2400, alturaPx: 1800, pixelRatio: 2 };
    expect(larguraVisivelDaFitaPx(retina), 'a fita mediu px de dispositivo')
      .toBeCloseTo(1.25 * 1.125, 12);
    // e a invariância que a casa exige de tudo que tem tamanho de tela: a
    // MESMA janela em CSS dá a MESMA fita em 1×, 1,5× e 2×
    for (const dpr of [1, 1.5, 2, 3]) {
      expect(
        larguraVisivelDaFitaPx({ larguraPx: 1200 * dpr, alturaPx: 900 * dpr, pixelRatio: dpr }),
        `dpr ${dpr}`
      ).toBeCloseTo(1.25 * 1.125, 12);
    }

    // E O QUADRO ESCREVE ISSO NO MATERIAL, com a saia por cima — os DOIS
    // números, da mesma conta. Sem esta metade a lei viveria numa função
    // pura que ninguém chama.
    expect(larguraNoQuadro(retina)).toBeCloseTo(1.25 * 1.125 + SAIA_DO_AA_PX, 12);
    expect(larguraNoQuadro({ larguraPx: 800, alturaPx: 800, pixelRatio: 1 }))
      .toBeCloseTo(LARGURA_DA_FITA_PX + SAIA_DO_AA_PX, 12);
    // A ARMADILHA (ii): a saia é 1 px CSS de rampa em QUALQUER janela, e
    // não uma fração da largura. Multiplicá-la pelo fator daria 2,53125.
    expect(larguraNoQuadro(retina) - larguraVisivelDaFitaPx(retina))
      .toBeCloseTo(SAIA_DO_AA_PX, 12);
  });

  it('a SAIA suaviza a beira, e o miolo acompanha a largura viva (§5d · A2)', () => {
    // O FRAGMENTO É TEXTO, e em Node não há GPU: o que se afere é a
    // cirurgia que a camada instala, rodando o `onBeforeCompile` à mão
    // sobre um fragment com a forma do `LineMaterial`. É o mesmo shader
    // que o navegador compilaria.
    const orbitas = new Orbitas();
    orbitas.ligado = true;
    const material = materialDe(orbitas);
    const ALVO = 'gl_FragColor = vec4( diffuseColor.rgb, alpha );';
    const shader = compilarDeVerdade(material);
    const fonte = shader.fragmentShader;
    // A SAIA EXISTE, e o nome é `uMiolo` — `nucleo` é o disco da cessão,
    // e trocar os dois seria trocar a largura pelo buraco
    expect(fonte, 'a saia do AA sumiu do fragmento').toContain('uMiolo');
    expect(fonte).toContain('float u = abs(vUv.x);');
    expect(fonte).toContain('fwidth(u)');
    // NÃO É TUBO: o miolo fica chapado. O `sqrt(1−u²)` foi a leitura
    // errada de 24/08 e está PROIBIDO pelo item 83 — se voltar, volta
    // aqui em vermelho.
    expect(fonte, 'o perfil de tubo voltou: a fita é CHAPADA').not.toContain('sqrt');
    // A ORDEM DO §5d: a saia resolve a largura ANTES de a cessão abrir o
    // buraco, e as duas ANTES do `gl_FragColor`.
    expect(fonte.indexOf('uMiolo - pixel')).toBeLessThan(fonte.indexOf('uNucleo.w > 0.0'));
    expect(fonte.indexOf('uNucleo.w > 0.0')).toBeLessThan(fonte.indexOf(ALVO));

    // O MIOLO É A FRAÇÃO CHAPADA da largura inchada, e ele ANDA COM A
    // JANELA (§5d): com a saia fixa e a largura crescendo, uma fração
    // literal no GLSL mentiria em toda janela grande.
    const miolo = () => shader.uniforms.uMiolo.value as number;
    const cam = new THREE.PerspectiveCamera(35, 4 / 3, 1e-9, 1e6);
    cam.updateMatrixWorld(true);
    const tan = Math.tan((35 * Math.PI) / 360);
    orbitas.escreverInstante(EPOCA_JD_TDB, motor);

    orbitas.update(cam, { larguraPx: 800, alturaPx: 800, pixelRatio: 1 }, tan, 0, null, 'atlas');
    expect(miolo(), 'a janela de referência: 1,25 de 2,25')
      .toBeCloseTo(LARGURA_DA_FITA_PX / (LARGURA_DA_FITA_PX + SAIA_DO_AA_PX), 12);

    const grande = { larguraPx: 2400, alturaPx: 1800, pixelRatio: 2 };
    orbitas.update(cam, grande, tan, 0, null, 'atlas');
    const visivel = larguraVisivelDaFitaPx(grande);
    expect(miolo(), 'o miolo ficou preso na janela de referência')
      .toBeCloseTo(visivel / (visivel + SAIA_DO_AA_PX), 12);
    // e é o MESMO par de números que o material recebeu: a beira que o
    // shader suaviza é a beira que a geometria desenhou
    expect(material.linewidth).toBeCloseTo(visivel + SAIA_DO_AA_PX, 12);
    expect(miolo() * material.linewidth).toBeCloseTo(visivel, 12);
    orbitas.dispose();
  });

  it('o CENTRO da fita nunca perde brilho, nem em pixelRatio 1 (§5d)', () => {
    // O DEFEITO QUE ISTO PEGA, e ele foi MEDIDO por auditoria em 26/08:
    // `fwidth(u)` cresce quando a fita tem poucos pixels de DISPOSITIVO.
    // Em `pixelRatio` 1 a fita inchada vale 2,25 px, `fwidth` dá 0,889
    // contra um miolo de 0,556, e sem o grampo o começo da rampa cai em
    // −0,333: o `smoothstep` morde o EIXO e o centro perde 15,6% de
    // brilho. Isso é PERFIL ATRAVÉS DA LARGURA, que o item 83 proíbe.
    //
    // E O REGIME É ALCANÇÁVEL: o preset `performance` do `engine.ts` tem
    // `pixelRatio` 1,0 — por `?q=performance`, por auto-degradação
    // abaixo de 34 fps, e em qualquer monitor não-Retina.
    const miolo = LARGURA_DA_FITA_PX / (LARGURA_DA_FITA_PX + SAIA_DO_AA_PX);

    // A LARGURA INCHADA EM PX DE DISPOSITIVO, nos dois regimes. Em dpr 1
    // a janela de referência dá 2,25; em dpr 2, 4,5.
    const dpr1 = (LARGURA_DA_FITA_PX + SAIA_DO_AA_PX) * 1;
    const dpr2 = (LARGURA_DA_FITA_PX + SAIA_DO_AA_PX) * 2;

    // O EIXO É PLENO NOS DOIS, e nas duas inclinações. O pior caso é a
    // fita a 45°, que TODA elipse tem em algum arco.
    for (const [nome, largura] of [['dpr 1', dpr1], ['dpr 2', dpr2]] as const) {
      for (const diagonal of [false, true]) {
        const pixel = pixelDaSaia(largura, diagonal);
        expect(
          perfilDaSaia(0, miolo, pixel),
          `${nome}${diagonal ? ' a 45°' : ''}: o centro da fita perdeu brilho`
        ).toBeCloseTo(1, 12);
      }
    }

    // ...e a BEIRA continua morrendo, senão o grampo teria matado a saia
    for (const largura of [dpr1, dpr2]) {
      expect(perfilDaSaia(1, miolo, pixelDaSaia(largura))).toBeCloseTo(0, 12);
    }

    // O PLATÔ EXISTE EM dpr 2 e NÃO em dpr 1, e o teste diz as duas
    // coisas — é essa a honestidade que o item passou a carregar: o
    // miolo é chapado QUANDO HÁ LARGURA para ele, e com 2,25 px de
    // dispositivo não há. Em dpr 2 alinhada o começo da rampa é 0,111,
    // então metade do caminho até ele ainda está cheio.
    expect(
      perfilDaSaia(0.05, miolo, pixelDaSaia(dpr2)),
      'dpr 2: o platô do miolo sumiu'
    ).toBeCloseTo(1, 12);
    expect(
      perfilDaSaia(0.05, miolo, pixelDaSaia(dpr1)),
      'dpr 1: não HÁ platô com 2,25 px de dispositivo, e o item não promete um'
    ).toBeLessThan(1);
    // ...e NEM MESMO em dpr 2 o platô existe no arco a 45°, porque
    // `fwidth` é `|dFdx| + |dFdy|` e cresce √2 vezes ali. Toda elipse
    // tem os dois arcos, então o item não pode prometer platô em termos
    // absolutos nem na tela dele. É esta linha que faz o fator diagonal
    // de `pixelDaSaia` carregar peso: sem ela, apagá-lo passava verde.
    expect(
      perfilDaSaia(0.05, miolo, pixelDaSaia(dpr2, true)),
      'dpr 2 a 45°: o platô não existe aqui, e o teste tem de saber disso'
    ).toBeLessThan(1);
    // e os DOIS limiares, em px de dispositivo, escritos como número: o
    // platô nasce acima de 3,60 px alinhada e de 5,09 px a 45°
    expect(2 / miolo).toBeCloseTo(3.6, 2);
    expect((2 * Math.SQRT2) / miolo).toBeCloseTo(5.09, 2);

    // O GRAMPO SÓ SOBE ALFA, nunca desce: onde o começo já era positivo
    // ele não muda um bit, e é isso que faz o conserto ser seguro.
    const semGrampo = (u: number, pixel: number) => {
      const inicio = miolo - pixel;
      const t = Math.min(1, Math.max(0, (u - inicio) / (1 - inicio)));
      return 1 - t * t * (3 - 2 * t);
    };
    for (const u of [0, 0.1, 0.3, 0.6, 0.9]) {
      const p2 = pixelDaSaia(dpr2);
      expect(perfilDaSaia(u, miolo, p2), `dpr 2 alinhada em u=${u}`)
        .toBeCloseTo(semGrampo(u, p2), 12);
      const p1 = pixelDaSaia(dpr1);
      expect(perfilDaSaia(u, miolo, p1), `dpr 1 em u=${u}: o grampo baixou o alfa`)
        .toBeGreaterThanOrEqual(semGrampo(u, p1) - 1e-12);
    }

    // ...e o shader carrega o MESMO grampo. Sem este pino, a conta de
    // cima viveria numa função pura que a GPU não lê.
    const orbitas = new Orbitas();
    const fonte = compilarDeVerdade(materialDe(orbitas)).fragmentShader;
    expect(fonte, 'o grampo do eixo sumiu do fragmento')
      .toContain('smoothstep(max(uMiolo - pixel, 0.0), 1.0, u)');
    orbitas.dispose();
  });

  it('a junta não tem calota, e a fita não fica tracejada (§5c)', () => {
    // PINO DE CONFIGURAÇÃO, e o teste não finge ser mais que isso: em Node
    // não há GPU, então ele cobra que as TRÊS CHAVES estejam ligadas — não
    // que a calota tenha sumido do pixel. QUEM MEDE O COMPORTAMENTO é
    // `scripts/visual/colar-da-fita.mjs`, no quadro vivo e fora da suíte:
    // ele conta as contas periódicas e reprova quando o colar volta.
    //
    // AS TRÊS CHAVES ANDAM JUNTAS, e é por isso que o pino as cobra
    // juntas: `dashed` sozinho tracejaria a fita, `gapSize` sozinho não
    // mata calota nenhuma, e `dashSize: 0` faria `mod(x, 0)` — indefinido
    // em GLSL. Cada uma apagada, sozinha, quebra este teste.
    const orbitas = new Orbitas();
    const material = (orbitas.group.children[0] as unknown as {
      material: { dashed: boolean; dashSize: number; gapSize: number };
    }).material;
    // liga o `USE_DASH`, e com ele o `discard` da calota
    expect(material.dashed, 'a calota voltou: sem USE_DASH não há discard').toBe(true);
    // `mod(d, dashSize + gapSize) > dashSize` nunca é verdadeiro com vão
    // zero — o resto vive em [0, dashSize)
    expect(material.gapSize, 'vão diferente de zero TRACEJA a órbita').toBe(0);
    expect(material.dashSize, 'dashSize zero é mod(x, 0), indefinido').toBeGreaterThan(0);
    orbitas.dispose();
  });

  it('a distância de traço é calculada UMA vez, no construtor (§5c)', () => {
    // O `USE_DASH` EXIGE o atributo; sem ele o material quebra. E ele não
    // pode nascer no `reamostrar`: `computeLineDistances` aloca um
    // `InstancedInterleavedBuffer` NOVO por chamada, e aquela função roda
    // a cada salto de data. Este teste cobra as duas metades: existe
    // desde o construtor, e NÃO é reposto por instante nenhum.
    const orbitas = new Orbitas();
    const geo = (orbitas.group.children[0] as unknown as {
      geometry: { attributes: Record<string, { data?: unknown } | undefined> };
    }).geometry;
    const inicio = geo.attributes.instanceDistanceStart;
    expect(inicio, 'sem `instanceDistanceStart` o USE_DASH não compila').toBeTruthy();
    expect(geo.attributes.instanceDistanceEnd).toBeTruthy();
    const bufferOriginal = inicio!.data;
    for (const jd of [EPOCA_JD_TDB, EPOCA_JD_TDB + 400, EPOCA_JD_TDB - 700]) {
      orbitas.escreverInstante(jd, motor);
      expect(
        geo.attributes.instanceDistanceStart!.data,
        'o `reamostrar` recalculou a distância de traço'
      ).toBe(bufferOriginal);
    }
    orbitas.dispose();
  });
});

describe('O FOCO MANDA NA CENA (item 83 · L1)', () => {
  /**
   * A CÂMERA DO SISTEMA DE JÚPITER — 0,05 UA do pai, olhando para ele.
   * É o único enquadramento em que as DUAS metades da lei podem ser
   * cobradas no mesmo quadro: as quatro galileanas (a família do alvo)
   * e as quatro heliocêntricas de dentro (que não são dele) estão
   * acesas ao mesmo tempo. Medida na tela antes de virar teste — é a
   * vista `foco-luas` do `ab-identidade`, com oito linhas.
   */
  function cameraNoSistemaDeJupiter(): THREE.PerspectiveCamera {
    const p = motor.posicaoHeliocentrica('jupiter', EPOCA_JD_TDB);
    const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
    const centro = new THREE.Vector3(
      eq[0] * AU_PARA_PC,
      eq[1] * AU_PARA_PC,
      eq[2] * AU_PARA_PC
    );
    const c = new THREE.PerspectiveCamera(ATLAS_FOV_GRAUS, 4 / 3, 1e-12, 1e6);
    c.position.copy(centro).add(new THREE.Vector3(0, 0.05 * AU_PARA_PC, 0));
    c.lookAt(centro);
    c.updateMatrixWorld(true);
    return c;
  }
  const TAN_ATLAS = Math.tan((ATLAS_FOV_GRAUS * Math.PI) / 360);
  const GALILEANAS = ['io', 'europa', 'ganymede', 'callisto'];
  const DE_DENTRO = ['mercury', 'venus', 'earth', 'mars'];

  /** o alfa de cada linha ACESA, pelo objeto do three — não pelo campo */
  function alfas(orbitas: Orbitas): Record<string, number> {
    const fora: Record<string, number> = {};
    CORPOS_COM_ORBITA.forEach((corpo, i) => {
      const o = orbitas.group.children[i] as unknown as {
        material: { opacity: number };
        visible: boolean;
      };
      if (o.visible) fora[corpo.id] = o.material.opacity;
    });
    return fora;
  }

  function armar() {
    const orbitas = new Orbitas();
    orbitas.ligado = true;
    const cam = cameraNoSistemaDeJupiter();
    // `dtS = 0` é o REGIME PERMANENTE: o realce encosta no alvo no
    // mesmo quadro, e o que sobra para medir é a LEI, sem a rampa no
    // meio. A rampa tem teste próprio, abaixo.
    const quadro = () => {
      orbitas.escreverInstante(EPOCA_JD_TDB, motor);
      orbitas.update(cam, quadroDe(900), TAN_ATLAS, 0, null, 'atlas');
    };
    return { orbitas, quadro };
  }

  it('sem foco o alfa é o de sempre; com foco a família sobe e o resto recua', () => {
    const { orbitas, quadro } = armar();
    quadro();
    const neutro = alfas(orbitas);
    // A VISTA TEM DE TER AS DUAS METADES, senão o resto do teste mede o
    // vazio e passa por falta de assunto — o defeito que o item 83
    // encontrou no gate inteiro.
    for (const id of [...GALILEANAS, ...DE_DENTRO]) {
      expect(neutro[id], `${id} devia estar acesa nesta vista`).toBeGreaterThan(0);
    }

    orbitas.foco = 'jupiter';
    quadro();
    const comFoco = alfas(orbitas);
    // AS LUAS DELE SOBEM — a segunda metade da lei, e a que só esta
    // vista alcança. A razão é medida contra o PRÓPRIO neutro de cada
    // linha, e não contra um número copiado da implementação: se o fade
    // mudar, o teste continua cobrando a MESMA lei.
    for (const id of GALILEANAS) {
      expect(comFoco[id] / neutro[id], id).toBeCloseTo(1.75, 6);
    }
    // ...e quem não é da família recua
    for (const id of DE_DENTRO) {
      expect(comFoco[id] / neutro[id], id).toBeCloseTo(0.35, 6);
    }
    // A HIERARQUIA QUE O OLHO LÊ são 5× entre uma metade e a outra
    expect(comFoco.io / comFoco.earth).toBeCloseTo(5 * (neutro.io / neutro.earth), 6);
    // RECUAR NÃO É APAGAR: a leitura que o item 77 existe para dar morre
    // se o vizinho some do quadro
    for (const id of DE_DENTRO) expect(comFoco[id], id).toBeGreaterThan(0.08);

    // E O FOCO SE DESFAZ SEM DEIXAR RASTRO: tirar o alvo devolve o
    // quadro neutro EXATO, e não um estado parecido
    orbitas.foco = null;
    quadro();
    expect(alfas(orbitas)).toEqual(neutro);
    orbitas.dispose();
  });

  it('A FAMÍLIA, cobrada sobre os TRINTA — e não só sobre as que acendem', () => {
    // POR QUE ESTE TESTE EXISTE, dito por extenso: o teste de imagem
    // abaixo mede as OITO linhas acesas na vista de Júpiter, e uma
    // sabotagem que metesse as luas de SATURNO na família de Júpiter
    // passaria por ele — as linhas de Saturno não acendem naquele
    // enquadramento, e o que não acende não é medido. Aqui a lei é
    // cobrada na função pura, corpo a corpo, nos trinta.
    //
    // O ORÁCULO É O CONFIG, não a implementação: a família esperada sai
    // de `LUAS_DO_SISTEMA.pai`, que é outra fonte. Repetir
    // `centro === foco` aqui seria o teste conferindo a si mesmo.
    // O SOL ENTRA NA LISTA, e o caso dele é DESENHO e não acidente:
    // enquadrar o Sol acende as NOVE heliocêntricas (o `centro` delas é
    // ele) e recolhe as 21 luas — "mostre-me o sistema". A família do
    // Sol são os planetas, pela mesma regra que dá a Júpiter as
    // galileanas; não há ramo especial para ele.
    const focos = ['jupiter', 'saturn', 'earth', 'io', 'titan', 'pluto', 'sun'];
    for (const foco of focos) {
      const esperados = new Set<string>([
        foco,
        ...(foco === 'sun'
          ? CORPOS_DO_SISTEMA.filter((c) => c.id !== 'sun').map((c) => c.id)
          : LUAS_DO_SISTEMA.filter((l) => l.pai === foco).map((l) => l.id)),
      ]);
      let subiram = 0;
      for (const corpo of CORPOS_COM_ORBITA) {
        const r = realceDoFoco(corpo, foco);
        if (esperados.has(corpo.id)) {
          expect(r, `${corpo.id} devia SUBIR com foco=${foco}`).toBeCloseTo(1.75, 9);
          subiram++;
        } else {
          expect(r, `${corpo.id} devia RECUAR com foco=${foco}`).toBeCloseTo(0.35, 9);
        }
      }
      // e a família não é vazia nem é o mundo inteiro — senão o laço
      // acima passaria por não ter o que comparar
      expect(subiram, foco).toBeGreaterThan(0);
      expect(subiram, foco).toBeLessThan(CORPOS_COM_ORBITA.length);
    }

    // SEM FOCO, os trinta valem 1 — é o que mantém a abertura, o filme e
    // toda vista de bancada no pixel de sempre
    for (const corpo of CORPOS_COM_ORBITA) {
      expect(realceDoFoco(corpo, null), corpo.id).toBe(1);
    }

    // E UM FORASTEIRO — quem não tem linha NEM é centro de ninguém — não
    // promove ninguém por engano: todos recuam, e nenhum sobe. Ceres é o
    // caso fino: ele É corpo do sistema, mas está em `HELIO_SEM_PONTO` e
    // não é pai de nada.
    for (const forasteiro of ['Sirius', 'ceres']) {
      const subiu = CORPOS_COM_ORBITA.filter(
        (c) => realceDoFoco(c, forasteiro) > 1
      );
      expect(subiu.map((c) => c.id), forasteiro).toEqual([]);
    }
  });

  it('a LUA em foco separa-se das IRMÃS — o alvo sobe e as três recuam', () => {
    const { orbitas, quadro } = armar();
    quadro();
    const neutro = alfas(orbitas);
    orbitas.foco = 'io';
    quadro();
    const comFoco = alfas(orbitas);
    expect(comFoco.io / neutro.io).toBeCloseTo(1.75, 6);
    for (const id of ['europa', 'ganymede', 'callisto']) {
      expect(comFoco[id] / neutro[id], id).toBeCloseTo(0.35, 6);
    }
    orbitas.dispose();
  });

  it('o foco NÃO abre porta: quem o fade cortou continua cortado', () => {
    // A câmera está DENTRO da órbita heliocêntrica de Júpiter (o corte
    // do §5 que não é gosto), e Júpiter está EM FOCO. Se o realce
    // entrasse antes dos cortes, a linha voltaria — e voltaria como um
    // risco dando a volta no céu, que é o defeito que o corte existe
    // para impedir.
    const { orbitas, quadro } = armar();
    orbitas.foco = 'jupiter';
    quadro();
    const i = CORPOS_COM_ORBITA.findIndex((c) => c.id === 'jupiter');
    const alvo = orbitas.group.children[i] as unknown as { visible: boolean };
    expect(alvo.visible, 'a órbita do alvo não pode furar o corte').toBe(false);
    expect(alfas(orbitas).jupiter).toBeUndefined();
    orbitas.dispose();
  });

  it('a transição ATRAVESSA sem piscar, assenta, e sem foco nunca segura a captura', () => {
    const orbitas = new Orbitas();
    orbitas.ligado = true;
    const cam = cameraNoSistemaDeJupiter();
    orbitas.escreverInstante(EPOCA_JD_TDB, motor);
    const passo = 1 / 60;

    // SEM FOCO A CAMADA NUNCA SEGURA O OBTURADOR — é o que mantém as 52
    // vistas antigas capturando no tempo de antes. Um `animando` que
    // ficasse verdadeiro aqui somaria segundos a TODA a leva.
    orbitas.update(cam, quadroDe(900), TAN_ATLAS, passo, null, 'atlas');
    expect(orbitas.animando).toBe(false);

    orbitas.foco = 'jupiter';
    orbitas.update(cam, quadroDe(900), TAN_ATLAS, passo, null, 'atlas');
    expect(orbitas.animando, 'a troca de alvo tem de ATRAVESSAR').toBe(true);

    // E ATRAVESSA MONOTONICAMENTE: subir e descer no caminho é o pisca
    // que o §5b proíbe pelo nome.
    const io = CORPOS_COM_ORBITA.findIndex((c) => c.id === 'io');
    const linha = orbitas.group.children[io] as unknown as {
      material: { opacity: number };
    };
    let anterior = 0;
    let assentouEm = -1;
    for (let k = 0; k < 90; k++) {
      orbitas.update(cam, quadroDe(900), TAN_ATLAS, passo, null, 'atlas');
      expect(linha.material.opacity, `quadro ${k}`).toBeGreaterThanOrEqual(anterior);
      anterior = linha.material.opacity;
      if (assentouEm < 0 && !orbitas.animando) assentouEm = k;
    }
    // ...e ENCOSTA: sem o encosto o exponencial nunca fecha e a captura
    // esperaria até o teto. ~0,75 s é o número declarado na constante.
    expect(assentouEm, 'o realce tem de encostar').toBeGreaterThan(0);
    expect(assentouEm * passo).toBeLessThan(1.0);
    expect(orbitas.animando).toBe(false);
    orbitas.dispose();
  });
});

// ============================================================
// A CESSÃO AO NÚCLEO (decisão do dono, 25/08) — a régua E o fio.
//
// O QUE ESTAS PEGAM, e cada uma nasceu de uma sabotagem que passava:
//  1. O DISCO NO LUGAR ERRADO em Retina — a mistura de espaços de pixel
//     (centro em px de CSS contra um `gl_FragCoord` que é de buffer). Em
//     1× os dois erros se cancelam, então o MB1 nunca ia ver.
//  2. O FIO CORTADO. Enquanto o disco era escrito por uma chamada do
//     director, apagá-la matava a cessão com a suíte inteira verde:
//     nenhum teste de Node abre o `director.ts`. Hoje o quadro da camada
//     escreve o disco, e é por ele que estes testes entram.
//  3. O RAIO REPROVADO. `RAIO_DA_CESSAO_PX = 0,5` foi medido e reprovou
//     (Vênus seguia saltando 1,75 px), e passava por aqui sem ninguém
//     notar, porque a guarda só cobrava "maior que zero".
// ============================================================
describe('a linha cede ao núcleo do corpo que ela desenha', () => {
  // A POSE É DE LABORATÓRIO, para o NDC ser conta e não sorteio: câmera em
  // (0,0,D) olhando a origem, então um ponto do plano z=0 tem coordenada de
  // vista (x, y, −D) e NDC (x / (D·t·aspecto), y / (D·t)), com
  // t = tan(fov/2). Postos os alvos, o pixel esperado sai da régua de
  // sempre — (ndc·0,5 + 0,5) · tamanho do BUFFER —, escrita aqui à mão.
  const FOV = 35;
  const D = 1;
  const T = Math.tan((FOV * Math.PI) / 360);
  const I_VENUS = IDS_FOTOMETRIA.indexOf('venus');

  /** um palco com Vênus no NDC pedido, e mais nada aceso */
  function palco(ndcX: number, ndcY: number, quadro: QuadroEmPx) {
    const aspecto = quadro.larguraPx / quadro.alturaPx;
    const camera = new THREE.PerspectiveCamera(FOV, aspecto, 1e-9, 1e6);
    camera.position.set(0, 0, D);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const posicoes = new Float32Array(IDS_FOTOMETRIA.length * 3);
    posicoes[I_VENUS * 3] = ndcX * D * T * aspecto;
    posicoes[I_VENUS * 3 + 1] = ndcY * D * T;
    const orbitas = new Orbitas();
    orbitas.ligado = true;
    orbitas.escreverInstante(EPOCA_JD_TDB, motor);
    orbitas.update(camera, quadro, T, 0, posicoes, 'atlas');
    return { orbitas, camera, posicoes };
  }

  /**
   * QUANTO DO BRILHO DA LINHA SOBREVIVE dentro do núcleo do planeta — a
   * média do `smoothstep` do shader sobre o disco do núcleo, ponderada por
   * área (o peso é `2πd·dd`). É a grandeza que o defeito mede: a luz que a
   * linha ainda deposita em cima do corpo é a que funde as duas fontes numa
   * componente só e faz o centroide passear.
   *
   * O `smoothstep` daqui não é uma CÓPIA do shader: é a mesma cúbica do
   * GLSL, aplicada aos MESMOS dois números que o uniform carrega. O que a
   * casa controla são o raio e a borda; a curva entre eles é do GLSL.
   */
  function sobrevivenciaNoNucleo(raioPx: number, bordaPx: number, raioNucleoPx: number) {
    const N = 4000;
    let luz = 0;
    let area = 0;
    for (let k = 0; k < N; k++) {
      const d = ((k + 0.5) / N) * raioNucleoPx;
      luz += THREE.MathUtils.smoothstep(d, raioPx, bordaPx) * d;
      area += d;
    }
    return luz / area;
  }

  // O NÚCLEO MEDIDO de Vênus no MB1: `nMeia = 22` px acima da meia altura,
  // que é um disco de raio √(22/π) — os "~2,6 px" do cabeçalho da constante.
  const RAIO_DO_NUCLEO_PX = Math.sqrt(22 / Math.PI);
  // A SOLEIRA, e ela é DECLARADA: a cessão tem de deixar no núcleo menos de
  // um vigésimo do brilho da linha. Não é o corte exato do defeito — esse
  // ninguém mediu; o que se mediu foram DOIS pontos, e a soleira mora entre
  // eles: 0,5 px (reprovado no MB1) deixa 22,1%, e 2 px (aprovado) deixa
  // 1,9%. Sobra 4,4× de folga do lado que reprova e 2,6× do lado que passa.
  // Se um dia a margem apodrecer, apodrece no número, à vista.
  const SOBRA_MAXIMA = 0.05;

  it('o raio medido apaga a linha no núcleo; o que a medição REPROVOU não apaga', () => {
    // 0,5 px foi medido e reprovou — a âncora de Vênus seguia saltando
    // 1,75 px contra um teto de 1,02. 2 px foi medido e passou.
    expect(
      sobrevivenciaNoNucleo(0.5, BORDA_DA_CESSAO_PX, RAIO_DO_NUCLEO_PX),
      'o raio reprovado tem de continuar reprovando'
    ).toBeGreaterThan(SOBRA_MAXIMA);
    expect(
      sobrevivenciaNoNucleo(RAIO_DA_CESSAO_PX, BORDA_DA_CESSAO_PX, RAIO_DO_NUCLEO_PX),
      'o raio de hoje tem de apagar a linha no núcleo'
    ).toBeLessThan(SOBRA_MAXIMA);
    // e o disco tem de ter borda: sem ela o corte é degrau, e degrau o MB1
    // lê como fervura
    expect(BORDA_DA_CESSAO_PX).toBeGreaterThan(RAIO_DA_CESSAO_PX);
  });

  it('o quadro ESCREVE o disco, e ele chega ao uniform com a conta certa', () => {
    // A SABOTAGEM QUE ISTO PEGA: apagar a escrita do disco. Antes ela morava
    // fora da camada e podia sumir com a suíte inteira verde.
    const quadro = { larguraPx: 1600, alturaPx: 900, pixelRatio: 1 };
    const { orbitas } = palco(0.25, 0.5, quadro);
    const disco = orbitas.nucleoDe('venus');
    expect(disco, 'Vênus tem linha, e linha tem disco').not.toBeNull();
    expect(disco!.x).toBeCloseTo(0.625 * 1600, 3);
    expect(disco!.y).toBeCloseTo(0.75 * 900, 3);
    expect(disco!.z).toBeCloseTo(RAIO_DA_CESSAO_PX, 6);
    expect(disco!.w).toBeCloseTo(BORDA_DA_CESSAO_PX, 6);
    orbitas.dispose();
  });

  it('em RETINA o disco pousa no planeta, e não a meio caminho dele', () => {
    // O DEFEITO EXATO, achado por auditoria em 25/08: o centro saía em px de
    // CSS e o `gl_FragCoord` é de BUFFER. Em 1× os dois erros se cancelavam
    // — e o MB1 captura a 1×, então não via nada. Em 2× o disco pousava na
    // METADE do caminho entre a origem do quadro e o planeta, com METADE do
    // raio: o buraco caía no vazio e a linha seguia por cima do corpo.
    const quadro = { larguraPx: 1600, alturaPx: 900, pixelRatio: 2 };
    const { orbitas } = palco(0.25, 0.5, quadro);
    const disco = orbitas.nucleoDe('venus')!;
    // o mesmo lugar da tela do teste anterior, agora em px de buffer
    expect(disco.x).toBeCloseTo(0.625 * 1600, 3);
    expect(disco.y).toBeCloseTo(0.75 * 900, 3);
    // e o buraco com o MESMO tamanho APARENTE: px de CSS vezes o pixelRatio
    expect(disco.z).toBeCloseTo(RAIO_DA_CESSAO_PX * 2, 6);
    expect(disco.w).toBeCloseTo(BORDA_DA_CESSAO_PX * 2, 6);
    // e o que importa: em px de CSS o buraco é o MESMO nas duas telas, que é
    // a invariância que a casa exige de tudo que tem tamanho de tela
    expect(
      sobrevivenciaNoNucleo(disco.z / 2, disco.w / 2, RAIO_DO_NUCLEO_PX)
    ).toBeLessThan(SOBRA_MAXIMA);
    orbitas.dispose();
  });

  it('corpo ATRÁS da câmera não deita disco — buraco fantasma não existe', () => {
    // `project` devolveria a posição espelhada, e o buraco comeria a linha
    // do lado errado do céu.
    const quadro = { larguraPx: 1600, alturaPx: 900, pixelRatio: 1 };
    const { orbitas, camera, posicoes } = palco(0.25, 0.5, quadro);
    expect(orbitas.nucleoDe('venus')!.w).toBeGreaterThan(0);
    // atrás do olho, no MESMO eixo em que a câmera está
    posicoes[I_VENUS * 3 + 2] = D * 2;
    orbitas.update(camera, quadro, T, 0, posicoes, 'atlas');
    expect(orbitas.nucleoDe('venus')!.w).toBe(0);
    orbitas.dispose();
  });

  it('sem os corpos no palco a linha volta INTEIRA', () => {
    const quadro = { larguraPx: 1600, alturaPx: 900, pixelRatio: 1 };
    const { orbitas, camera } = palco(0.25, 0.5, quadro);
    expect(orbitas.nucleoDe('venus')!.w).toBeGreaterThan(0);
    // camada dos corpos apagada: o director entrega `null`, e a linha
    // volta inteira no MESMO quadro
    orbitas.update(camera, quadro, T, 0, null, 'atlas');
    expect(orbitas.nucleoDe('venus')!.w).toBe(0);
    orbitas.dispose();
  });
});

// ------------------------------------------------------------
// §7 — O FILME NÃO TEM LINHA. A exceção que ELE autorizou (item 77,
// decisão 3, 25/08): *"tirar do filme (aceito recriar a separação entre
// modos só aí)"*.
//
// O DENTE MEDE VALOR EXECUTADO, não fonte: a camada de verdade, a
// efeméride de verdade, o mesmo quadro para as seis fases. É a única
// forma de a diferença ser atribuível à FASE — se o enquadramento ou a
// gaveta mudassem junto, o teste passaria por outro motivo.
//
// E O GATE NÃO SE CORTA EM SILÊNCIO: `fase` é parâmetro OBRIGATÓRIO de
// `update`, então apagá-lo não compila — aqui, no `director.ts` e nos
// quadros de teste dos blocos acima.
// ------------------------------------------------------------
describe('O FILME NÃO TEM LINHA (§7 — item 77 · decisão 3)', () => {
  /**
   * A VOLTA PARA CASA em condição de laboratório: a câmera do TETO do
   * Atlas (224 UA, a vista em que MAIS linhas acendem), a efeméride viva
   * na época e a gaveta ABERTA. Tudo idêntico entre as chamadas menos a
   * fase.
   */
  function quadroNaFase(fase: Phase) {
    const orbitas = new Orbitas();
    orbitas.ligado = true;
    orbitas.escreverInstante(EPOCA_JD_TDB, motor);
    const camera = new THREE.PerspectiveCamera(35, 1, 1e-9, 1e6);
    camera.position.set(0, 0, 224 / UA_POR_PC);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    orbitas.update(camera, quadroDe(1800), Math.tan((35 * Math.PI) / 360), 0, null, fase);
    const visto = { visivel: orbitas.group.visible, acesas: orbitas.acesas };
    orbitas.dispose();
    return visto;
  }

  it('as seis fases, com a gaveta ABERTA — o filme fora, o resto dentro', () => {
    // exaustiva de propósito, e digitada: uma fase nova sem decisão cai
    // no `satisfies` de `fases.ts` e reprova aqui junto
    const esperado: Record<Phase, boolean> = {
      // sem cena montada não há o que desenhar
      loading: false,
      // AS TRÊS DO FILME — a intro é a deriva sob a tela de título,
      // 'journey' é o filme correndo, 'end' é ele congelado. É desta
      // vista, a `volta-para-casa` de t=180, que ele mandou tirar as
      // linhas (`capturas/item77-filme-volta-para-casa.png`)
      intro: false,
      journey: false,
      end: false,
      // o voo livre é pilotagem, não filme
      free: true,
      // e o Atlas é a casa das linhas desde o item 77
      atlas: true,
    };
    for (const fase of Object.keys(esperado) as Phase[]) {
      const { visivel, acesas } = quadroNaFase(fase);
      expect(visivel, `${fase}: grupo visível`).toBe(esperado[fase]);
      if (esperado[fase]) {
        expect(acesas, `${fase} devia acender linha`).toBeGreaterThan(0);
      } else {
        expect(acesas, `${fase} não devia acender linha nenhuma`).toBe(0);
      }
    }
  });

  it('a TRANSIÇÃO apaga no MESMO quadro — sem um quadro de linha ao entrar no filme', () => {
    // A mesma instância atravessa a troca de fase, como no app de
    // verdade. Um gate aplicado "um quadro depois" (fase passada em vez
    // da viva) passaria no teste exaustivo acima — cada fase lá nasce
    // numa instância nova — e deixaria a linha piscar na transição.
    // Achado da auditoria de 25/08 (sabotagem S6).
    const orbitas = new Orbitas();
    orbitas.ligado = true;
    orbitas.escreverInstante(EPOCA_JD_TDB, motor);
    const camera = new THREE.PerspectiveCamera(35, 1, 1e-9, 1e6);
    camera.position.set(0, 0, 224 / UA_POR_PC);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const meiaTan = Math.tan((35 * Math.PI) / 360);
    orbitas.update(camera, quadroDe(1800), meiaTan, 0, null, 'atlas');
    expect(orbitas.acesas, 'no Atlas as linhas acendem').toBeGreaterThan(0);
    orbitas.update(camera, quadroDe(1800), meiaTan, 0, null, 'journey');
    // A garantia anti-piscada é a VISIBILIDADE: com o grupo fora, nada
    // chega à tela neste quadro. Os alfas (que o mostrador `acesas` lê)
    // FICAM onde estavam de propósito — é o ramo declarado da camada
    // fechada: a volta não pode nascer do neutro.
    expect(orbitas.group.visible, 'entrou no filme: grupo fora no MESMO quadro').toBe(false);
    orbitas.update(camera, quadroDe(1800), meiaTan, 0, null, 'atlas');
    expect(orbitas.group.visible, 'voltou ao Atlas: grupo dentro no MESMO quadro').toBe(true);
    expect(orbitas.acesas, 'e as linhas voltam ACESAS, sem subir do neutro').toBeGreaterThan(0);
    orbitas.dispose();
  });

  it('o gate NÃO come a gaveta: no Atlas quem manda continua sendo `noorbitas`', () => {
    // a outra metade da lei. O `&&` tem dois lados, e um gate que
    // ignorasse a gaveta passaria o teste de cima inteirinho.
    const orbitas = new Orbitas();
    orbitas.ligado = false;
    orbitas.escreverInstante(EPOCA_JD_TDB, motor);
    const camera = new THREE.PerspectiveCamera(35, 1, 1e-9, 1e6);
    camera.position.set(0, 0, 224 / UA_POR_PC);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    orbitas.update(camera, quadroDe(1800), Math.tan((35 * Math.PI) / 360), 0, null, 'atlas');
    expect(orbitas.group.visible).toBe(false);
    expect(orbitas.acesas).toBe(0);
    orbitas.dispose();
  });

  it('o readout do `?dbgorbitas` não manda ninguém caçar defeito onde há decisão', () => {
    // gaveta ABERTA e mesmo assim sem linha é o estado novo do §7 — e um
    // readout que só falasse da gaveta diria "camada ligada · 0 acesas"
    const orbitas = new Orbitas();
    orbitas.ligado = true;
    orbitas.escreverInstante(EPOCA_JD_TDB, motor);
    const camera = new THREE.PerspectiveCamera(35, 1, 1e-9, 1e6);
    camera.position.set(0, 0, 224 / UA_POR_PC);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const tan = Math.tan((35 * Math.PI) / 360);
    orbitas.update(camera, quadroDe(1800), tan, 0, null, 'journey');
    expect(orbitas.dbg()).toContain('o filme não tem linha');
    // ...e no Atlas o aviso não aparece, senão ele seria decoração fixa
    orbitas.update(camera, quadroDe(1800), tan, 0, null, 'atlas');
    expect(orbitas.dbg()).not.toContain('o filme não tem linha');
    orbitas.dispose();
  });
});
