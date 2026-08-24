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
import { IDS_FOTOMETRIA } from './planetas/fotometria';
import { HELIO_SEM_PONTO } from '../atlasConfig';
import {
  CORPOS_COM_ORBITA,
  Orbitas,
  PONTOS_POR_ORBITA,
  conicaOsculadora,
  escreverLaco,
  muDoPar,
  muEmUaDia,
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
  /** A câmera da abertura do Atlas — a que ACENDE as linhas (224 UA). */
  function cameraDaAbertura(): THREE.PerspectiveCamera {
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
    orbitas.update(cameraDaAbertura(), 1800, TAN_35);
    expect(orbitas.group.visible).toBe(false);
    expect(orbitas.acesas).toBe(0);
    // o QUADRO é caminho puro: quem fala com o motor é `escreverInstante`,
    // e o director só o chama com a camada ligada
    expect(fonte.contagem(), 'o update falou com o motor').toBe(0);

    // e com a porta ABERTA a mesma câmera acende — a prova de que o
    // veredito acima mede a porta, e não um enquadramento vazio
    orbitas.ligado = true;
    orbitas.escreverInstante(EPOCA_JD_TDB, fonte);
    orbitas.update(cameraDaAbertura(), 1800, TAN_35);
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
    orbitas.update(cameraDaAbertura(), 1800, TAN_35);
    expect(orbitas.acesas).toBe(0);
    expect(orbitas.dbg()).toContain('0 acesas');
    // e a geometria continua VAZIA: nada foi escrito de lugar nenhum
    for (const filho of orbitas.group.children) {
      const g = (filho as unknown as {
        geometry: { getAttribute(n: string): { array: Float32Array } };
      }).geometry.getAttribute('position').array;
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
    // A CÂMERA DA ABERTURA DO ATLAS — 224 UA, lente de 35°: é dela que
    // sai o fade, e o fade é quem decide QUEM se reamostra. Sem um
    // quadro de verdade aqui o teste mediria um estado que a tela nunca
    // tem (todas as linhas apagadas, nenhuma se renovando).
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
      orbitas.update(camera, 1800, tanHalfFov);
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
        const loop = orbitas.group.children[i] as unknown as {
          geometry: { getAttribute(n: string): { array: Float32Array } };
          position: { x: number; y: number; z: number };
        };
        const g = loop.geometry.getAttribute('position').array;
        const c = loop.position;
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

  it('com efeméride, o laço da Terra nasce no lugar da Terra', () => {
    const orbitas = new Orbitas();
    orbitas.ligado = true;
    expect(orbitas.escreverInstante(EPOCA_JD_TDB, motor)).toBe(true);
    // a ordem do grupo é a de `CORPOS_COM_ORBITA`, que é a do config
    const iTerra = CORPOS_COM_ORBITA.findIndex((c) => c.id === 'earth');
    expect(iTerra).toBeGreaterThanOrEqual(0);
    const loop = orbitas.group.children[iTerra] as unknown as {
      geometry: { getAttribute(n: string): { array: Float32Array } };
    };
    const p = motor.posicaoHeliocentrica('earth', EPOCA_JD_TDB);
    const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
    const arr = loop.geometry.getAttribute('position').array;
    // float32 do atributo contra float64 da efeméride: a folga é a da
    // quantização do buffer, e é relativa ao raio da órbita
    const escala = Math.hypot(eq[0], eq[1], eq[2]) * AU_PARA_PC;
    expect(Math.abs(arr[0] - eq[0] * AU_PARA_PC) / escala).toBeLessThan(1e-6);
    expect(Math.abs(arr[1] - eq[1] * AU_PARA_PC) / escala).toBeLessThan(1e-6);
    expect(Math.abs(arr[2] - eq[2] * AU_PARA_PC) / escala).toBeLessThan(1e-6);
    orbitas.dispose();
  });
});
