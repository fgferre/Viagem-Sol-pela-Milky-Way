// Serve: dono — os rótulos cumprem cada decisão dele: câmera só sobe com leitor, nomes e ícones desligam em camadas separadas, lente e beta 3D só onde ele mandou
// ============================================================
// A CÂMERA SÓ SOBE PARA O REACT COM QUEM A LEIA.
//
// O destino de `onCamera` é um `setState`, e a ficha do objeto é a única
// que lê a posição. Com a ficha FECHADA, publicar a 4 Hz durante um
// arrasto no Atlas re-renderizava o HUD inteiro por um painel que
// ninguém abriu. Aqui se prova o contrato dos dois lados: calado sem
// leitor, e vivo — com a posição de AGORA — no quadro seguinte ao
// pedido.
//
// `Rotulos` puxa `world/galaxy`, que lê `window.location.search` na
// avaliação do módulo; o runner da casa é `node`, então o `window` falso
// precede o import dinâmico.
// ============================================================
import * as THREE from 'three';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { JourneyMeta } from '../cinematic/journey';
import type { NamedStar } from '../config';
import { CORPOS_DO_SISTEMA, LUAS_DO_SISTEMA } from '../atlasConfig';
import { definirIdioma } from '../../lib/idioma';
import type { Planetas } from '../world/planetas/planetas';
import { raioDoAssuntoPc, raiosDoGigantePc } from '../world/corpos/gigante';
import {
  ALFA_DO_TEXTO_APONTADO,
  ALFA_DO_TEXTO_SECUNDARIO,
  PRIORIDADE_DO_ROTULO,
  projectCorpos,
} from '../world/labels';
import type { StarLabel } from '../world/labels';
import type { Rotulos as TipoRotulos, QuadroDeRotulos } from './rotulos';

let Rotulos: typeof TipoRotulos;
let GAL: typeof import('../world/galaxy').GAL;
let projetarLugares: typeof import('../world/lugaresDoCeu').projetarLugares;
let CENTRO_DA_ANA_DE_SAGITARIO: THREE.Vector3;
let posicaoDaSondaNaCena: typeof import('../world/sondas').posicaoDaSondaNaCena;
let lugares: typeof import('../world/lugaresDoCeu');
let exo: typeof import('../world/exoplanetas');

beforeAll(async () => {
  (globalThis as unknown as { window: unknown }).window = { location: { search: '' } };
  ({ Rotulos } = await import('./rotulos'));
  ({ GAL } = await import('../world/galaxy'));
  ({ projetarLugares, CENTRO_DA_ANA_DE_SAGITARIO } = await import('../world/lugaresDoCeu'));
  ({ posicaoDaSondaNaCena } = await import('../world/sondas'));
  lugares = await import('../world/lugaresDoCeu');
  exo = await import('../world/exoplanetas');
});

type Publicada = readonly [number, number, number] | null;

/** um produtor de rótulos mudo em tudo menos na câmera */
function bancada() {
  const publicadas: Publicada[] = [];
  const rotulos = new Rotulos({
    onLabels: () => {},
    onDest: () => {},
    onSol: () => {},
    onLente: () => {},
    onCamera: (posUA) => publicadas.push(posUA),
    beatDaViagem: () => ({}) as JourneyMeta,
    // sem raio não há disco: estas bancadas só têm o Sol como oclusor
    raioFisicoDe: () => null,
  });
  const cam = new THREE.PerspectiveCamera();
  // `named: null` mata o ramo dos rótulos: o que se julga aqui é o fio
  // da câmera, e ele roda em todo quadro, depois do ramo
  const quadro: QuadroDeRotulos = {
    fase: 'atlas', named: null, dHome: 0, planetas: null, foco: null,
    nomesEscondidos: false, iconesEscondidos: false, texto3d: false,
  };
  /** um quadro do Atlas com a câmera em `x` (pc de cena) */
  const passo = (x: number) => {
    cam.position.set(x, 0, 0);
    rotulos.tique(0.5); // > 0,25 s: o remédio de 4 Hz não segura nada aqui
    rotulos.projetar(cam, quadro);
  };
  return { rotulos, publicadas, passo };
}

describe('a câmera só sobe para o React com quem a leia', () => {
  it('sem leitor, a câmera anda e NADA é publicado', () => {
    const { publicadas, passo } = bancada();
    for (let i = 1; i <= 5; i++) passo(i);
    expect(publicadas).toEqual([]);
  });

  it('com leitor, cada movimento publica a posição', () => {
    const { rotulos, publicadas, passo } = bancada();
    rotulos.lerCamera(true);
    passo(1);
    passo(2);
    expect(publicadas).toHaveLength(2);
    expect(publicadas[0]).not.toEqual(publicadas[1]);
    expect(publicadas[1]?.every(Number.isFinite)).toBe(true);
  });

  it('a ficha que FECHA apaga a posição uma vez e cala', () => {
    const { rotulos, publicadas, passo } = bancada();
    rotulos.lerCamera(true);
    passo(1);
    rotulos.lerCamera(false);
    for (let i = 2; i <= 5; i++) passo(i);
    expect(publicadas).toHaveLength(2);
    expect(publicadas[1]).toBeNull();
  });

  it('a ficha que REABRE nasce com a posição de agora, com a câmera parada', () => {
    const { rotulos, publicadas, passo } = bancada();
    rotulos.lerCamera(true);
    passo(1);
    rotulos.lerCamera(false);
    passo(7); // andou às escondidas: ninguém lia
    rotulos.lerCamera(true);
    passo(7); // MESMO ponto, e mesmo assim tem de sair
    expect(publicadas).toHaveLength(3);
    expect(publicadas[2]).not.toBeNull();
    expect(publicadas[2]).not.toEqual(publicadas[0]);
  });

  it('fora do Atlas ninguém publica, nem com a ficha aberta', () => {
    const { rotulos, publicadas, passo } = bancada();
    rotulos.lerCamera(true);
    passo(1);
    expect(publicadas).toHaveLength(1);
    // a mesma bancada, agora no voo livre
    const cam = new THREE.PerspectiveCamera();
    cam.position.set(9, 0, 0);
    rotulos.tique(0.5);
    rotulos.projetar(cam, {
      fase: 'free', named: null, dHome: 0, planetas: null, foco: null,
      nomesEscondidos: false, iconesEscondidos: false, texto3d: false,
    });
    expect(publicadas).toEqual([publicadas[0], null]);
  });
});

// ============================================================
// A CAMADA "NOMES NA TELA" (item 82, N2) — o gesto que cala a tela.
//
// As órbitas tinham `noorbitas` desde o item 77; os nomes não tinham
// nada, e quem achasse a tela poluída só podia sair do Atlas. O que se
// julga aqui é o CONTRATO da camada, não o nome da flag: desligada, não
// sobra nome nenhum e o clique fica sem alvo; e o resto do quadro — a
// posição da câmera, que a ficha do objeto lê — continua vivo, porque
// calar os nomes não é calar o Atlas.
// ============================================================
describe('a camada "Nomes na tela" (item 82, N2)', () => {
  /** uma estrela brilhante logo à frente da câmera */
  const CEU: NamedStar[] = [
    { n: 'Vizinha', x: 0.4, y: 0.2, z: 0, m: 1, s: 'A0V', d: 5, t: 0 },
  ];

  function comCeu() {
    const publicados: StarLabel[][] = [];
    const camPublicadas: Publicada[] = [];
    const rotulos = new Rotulos({
      onLabels: (l) => publicados.push(l),
      onDest: () => {},
      onSol: () => {},
      onLente: () => {},
      onCamera: (posUA) => camPublicadas.push(posUA),
      beatDaViagem: () => ({}) as JourneyMeta,
    // sem raio não há disco: estas bancadas só têm o Sol como oclusor
    raioFisicoDe: () => null,
    });
    const cam = new THREE.PerspectiveCamera();
    cam.position.set(0, 0, 5);
    cam.updateMatrixWorld();
    const quadro = (nomesEscondidos: boolean): QuadroDeRotulos => ({
      fase: 'free', named: CEU, dHome: 5, planetas: null, foco: null, nomesEscondidos, iconesEscondidos: false, texto3d: false,
    });
    return { rotulos, publicados, camPublicadas, cam, quadro };
  }

  it('LIGADA a tela tem nome; DESLIGADA não sobra nenhum', () => {
    const { rotulos, publicados, cam, quadro } = comCeu();
    rotulos.projetar(cam, quadro(false));
    expect(publicados.at(-1)!.length).toBeGreaterThan(0);
    rotulos.projetar(cam, quadro(true));
    expect(publicados.at(-1)).toEqual([]);
  });

  it('desligada, o clique fica SEM ALVO — a mesma lista única do desenho', () => {
    // pendência 30: o que se clica é o que está escrito. Se a lista de
    // alvos sobrevivesse à camada, um duplo clique no céu vazio ainda
    // viajaria para uma estrela cujo nome ninguém vê.
    const { rotulos, cam, quadro } = comCeu();
    rotulos.projetar(cam, quadro(false));
    expect(rotulos.alvos.length).toBeGreaterThan(0);
    rotulos.projetar(cam, quadro(true));
    expect(rotulos.alvos).toEqual([]);
  });

  it('a chave cala a RÉGUA, não o ROTEIRO: no filme a fala do beat sobrevive', () => {
    // O DEFEITO QUE ISTO FECHA (24/08): o gate da camada vinha ANTES do
    // ramo `journey`, então desligar os nomes calava o FILME — o nome
    // FORÇADO do beat (o assunto do plano, que a regra editorial manda
    // sempre ter nome) e a LINHA DE RUMO, que nem nome de corpo é. A
    // gaveta existe durante o filme: eram dois cliques para emudecer o
    // roteiro. O filme é o roteiro dirigindo a cena; uma chave de camada
    // não tem autoridade sobre ele.
    const publicados: StarLabel[][] = [];
    const dests: (string | null)[] = [];
    const rotulos = new Rotulos({
      onLabels: (l) => publicados.push(l),
      onDest: (d) => dests.push(d),
      onSol: () => {},
      onLente: () => {},
      onCamera: () => {},
      beatDaViagem: () => ({ target: ['Vizinha'], dest: 'Vizinha' }) as JourneyMeta,
      raioFisicoDe: () => null,
    });
    const cam = new THREE.PerspectiveCamera();
    cam.position.set(0, 0, 5);
    cam.updateMatrixWorld();
    const noFilme = (nomesEscondidos: boolean): QuadroDeRotulos => ({
      fase: 'journey', named: CEU, dHome: 5, planetas: null, foco: null,
      nomesEscondidos, iconesEscondidos: false, texto3d: false,
    });

    // COM a camada ligada, o beat fala
    rotulos.projetar(cam, noFilme(false));
    expect(publicados.at(-1)!.some((l) => l.name === 'Vizinha')).toBe(true);
    expect(publicados.at(-1)!.find((l) => l.name === 'Vizinha')?.dirigido).toBe(true);
    expect(dests.at(-1)).toBeTruthy();

    // ...e DESLIGADA ele continua falando: é o mesmo nome forçado e a
    // mesma linha de rumo
    rotulos.projetar(cam, noFilme(true));
    expect(
      publicados.at(-1)!.some((l) => l.name === 'Vizinha'),
      'a chave calou o assunto do beat'
    ).toBe(true);
    expect(dests.at(-1), 'a chave calou a linha de rumo').toBeTruthy();

    // E NO ATLAS NADA DISSO VALE — lá a chave cala tudo, que é a decisão
    // declarada e testada acima. Sem esta metade, o conserto do filme
    // teria afrouxado o Atlas em silêncio.
    rotulos.projetar(cam, { ...noFilme(true), fase: 'atlas' });
    expect(publicados.at(-1)).toEqual([]);
    expect(rotulos.alvos).toEqual([]);
    expect(dests.at(-1)).toBeFalsy();
  });

  it('calar os nomes não cala o Atlas: a ficha continua sabendo onde a câmera está', () => {
    const { rotulos, camPublicadas, cam, quadro } = comCeu();
    rotulos.lerCamera(true);
    rotulos.tique(0.5);
    rotulos.projetar(cam, { ...quadro(true), fase: 'atlas' });
    expect(camPublicadas).toHaveLength(1);
    expect(camPublicadas[0]?.every(Number.isFinite)).toBe(true);
  });

  it('religar devolve os nomes — a camada não é caminho sem volta', () => {
    const { rotulos, publicados, cam, quadro } = comCeu();
    rotulos.projetar(cam, quadro(true));
    rotulos.projetar(cam, quadro(false));
    expect(publicados.at(-1)!.length).toBeGreaterThan(0);
  });
});

describe('o céu limpo continua navegável (item 89): ícone é camada separada', () => {
  function noAtlasComTerra(nomesEscondidos: boolean, iconesEscondidos: boolean) {
    const publicados: StarLabel[][] = [];
    const rotulos = new Rotulos({
      onLabels: (l) => publicados.push(l),
      onDest: () => {},
      onSol: () => {},
      onLente: () => {},
      onCamera: () => {},
      beatDaViagem: () => ({}) as JourneyMeta,
    // sem raio não há disco: estas bancadas só têm o Sol como oclusor
    raioFisicoDe: () => null,
    });
    const cam = new THREE.PerspectiveCamera(58, 1.6, 0.001, 100);
    cam.position.set(0, 0, 5);
    cam.updateMatrixWorld();
    // um "planetas" estrutural: só o que o produtor lê — a visibilidade
    // da camada e o buffer de posições, com a Terra à frente da câmera
    // e o resto sem efeméride (NaN, que o projectCorpos ignora)
    const posicoes = new Float32Array(CORPOS_DO_SISTEMA.length * 3).fill(Number.NaN);
    const iTerra = CORPOS_DO_SISTEMA.findIndex((c) => c.id === 'earth');
    posicoes[iTerra * 3] = 0;
    posicoes[iTerra * 3 + 1] = 0;
    posicoes[iTerra * 3 + 2] = 0;
    const planetas = { points: { visible: true }, posicoes } as unknown as Planetas;
    const quadro: QuadroDeRotulos = {
      fase: 'atlas', named: [], dHome: 5, planetas, foco: null,
      nomesEscondidos, iconesEscondidos, texto3d: false,
    };
    rotulos.projetar(cam, quadro);
    return { alvos: rotulos.alvos };
  }

  it('nomes DESLIGADOS + ícones LIGADOS: o corpo continua alvo, como só-ícone', () => {
    const { alvos } = noAtlasComTerra(true, false);
    const terra = alvos.find((l) => l.key === 'corpo:earth');
    expect(terra, 'a Terra devia sobreviver como ícone').toBeTruthy();
    expect(terra!.icone).toBe(true);
  });

  it('as DUAS desligadas: o silêncio de sempre — nenhum alvo', () => {
    const { alvos } = noAtlasComTerra(true, true);
    expect(alvos).toEqual([]);
  });

  it('a BETA 3D marca o texto do corpo como invisível — e não toca as estrelas (109)', () => {
    // O desenho que preserva as três leis: o 2D decide QUEM aparece e
    // ocupa a vaga; com texto3d o corpo leva textoInvisivel (o glifo sai
    // na cena, pelo Rotulos3d) e a estrela continua pintada no canvas.
    const publicados: StarLabel[][] = [];
    const rotulos = new Rotulos({
      onLabels: (l) => publicados.push(l),
      onDest: () => {},
      onSol: () => {},
      onLente: () => {},
      onCamera: () => {},
      beatDaViagem: () => ({}) as JourneyMeta,
    // sem raio não há disco: estas bancadas só têm o Sol como oclusor
    raioFisicoDe: () => null,
    });
    const cam = new THREE.PerspectiveCamera(58, 1.6, 0.001, 100);
    cam.position.set(0, 0, 5);
    cam.updateMatrixWorld();
    const posicoes = new Float32Array(CORPOS_DO_SISTEMA.length * 3).fill(Number.NaN);
    const iTerra = CORPOS_DO_SISTEMA.findIndex((c) => c.id === 'earth');
    posicoes[iTerra * 3] = 0; posicoes[iTerra * 3 + 1] = 0; posicoes[iTerra * 3 + 2] = 0;
    const planetas = { points: { visible: true }, posicoes } as unknown as Planetas;
    rotulos.projetar(cam, {
      fase: 'atlas', named: [{ n: 'Vizinha', x: 0.4, y: 0.2, z: 0, m: 1, s: 'A0V', d: 5, t: 0 }],
      dHome: 5, planetas, foco: null,
      nomesEscondidos: false, iconesEscondidos: false, texto3d: true,
    });
    const alvos = rotulos.alvos;
    const terra = alvos.find((l) => l.key === 'corpo:earth')!;
    expect(terra.textoInvisivel).toBe(true);
    expect(terra.comAnel).toBe(true); // o anel-âncora fica
    const estrela = alvos.find((l) => l.name === 'Vizinha')!;
    expect(estrela.textoInvisivel).toBeUndefined();
    // e a posição de MUNDO sai pela chave, para o 3D pintar no lugar
    expect(rotulos.posicaoDoCorpo('corpo:earth', posicoes, CORPOS_DO_SISTEMA)).toEqual([0, 0, 0]);
    expect(rotulos.posicaoDoCorpo('corpo:mars', posicoes, CORPOS_DO_SISTEMA)).toBeNull();
  });

  it('nomes LIGADOS: o quadro de sempre, sem entrada só-ícone nenhuma', () => {
    const { alvos } = noAtlasComTerra(false, false);
    expect(alvos.some((l) => l.icone)).toBe(false);
  });
});

describe('o indicador de fotografia (item 100): "LENTE · SOL" só no filme', () => {
  const CEU: NamedStar[] = [
    { n: 'Vizinha', x: 0.4, y: 0.2, z: 0, m: 1, s: 'A0V', d: 5, t: 0 },
  ];

  function montar() {
    const lentes: string[] = [];
    const rotulos = new Rotulos({
      onLabels: () => {},
      onDest: () => {},
      onSol: () => {},
      onLente: (texto) => lentes.push(texto),
      onCamera: () => {},
      beatDaViagem: () => ({ target: ['Vizinha'], dest: 'Vizinha' }) as JourneyMeta,
      raioFisicoDe: () => null,
    });
    const cam = new THREE.PerspectiveCamera(34.6, 1.6, 0.001, 100);
    cam.position.set(0, 0, 5);
    cam.updateMatrixWorld();
    const quadro = (fase: QuadroDeRotulos['fase']): QuadroDeRotulos => ({
      fase, named: CEU, dHome: 5, planetas: null, foco: null, nomesEscondidos: false, iconesEscondidos: false, texto3d: false,
    });
    return { rotulos, lentes, cam, quadro };
  }

  it('no FILME publica lente arredondada e distância na régua canônica', () => {
    const { rotulos, lentes, cam, quadro } = montar();
    rotulos.projetar(cam, quadro('journey'));
    // 34,6° arredonda para 35; 5 pc viram anos-luz pela MESMA escada de
    // unidades de todo mostrador — o texto tem as duas metades da dúvida
    // das Três Marias: a lente (zoom) e a posição (dolly)
    expect(lentes.at(-1)).toMatch(/^LENTE 35° · SOL /);
    expect(lentes.at(-1)).toContain('anos-luz');
  });

  it('fora do filme se apaga, e o pulso do zoom republica pelo relógio de 4 Hz', () => {
    const { rotulos, lentes, cam, quadro } = montar();
    rotulos.projetar(cam, quadro('journey'));
    expect(lentes.at(-1)).toMatch(/^LENTE /);
    // sair do filme apaga IMEDIATO (mudança de espécie, sem esperar 4 Hz)
    rotulos.projetar(cam, quadro('free'));
    expect(lentes.at(-1)).toBe('');
    // de volta ao filme com o ZOOM fechando: o número acompanha depois do
    // tique — apagar a fiação do fov congelaria este valor e reprovaria
    rotulos.projetar(cam, quadro('journey'));
    cam.fov = 18.2;
    rotulos.tique(0.5);
    rotulos.projetar(cam, quadro('journey'));
    expect(lentes.at(-1)).toMatch(/^LENTE 18° · SOL /);
  });
});

// ============================================================
// A RAMPA DOS NOMES — 250 ms para entrar, 750 ms para sair (item 115,
// bloco B; mergulho 08 §1.6a).
//
// Antes desta obra a opacidade de um rótulo era calculada do zero no
// quadro em que ele aparecia: quem entrava nascia CHEIO e quem perdia a
// vaga da régua ia a ZERO em um quadro. Nenhum quadro com alfa
// intermediário — a contagem abaixo mede exatamente isso, e é ela que
// reprova se a rampa sumir ou se as duas durações virarem uma só.
//
// A bancada é o VOO LIVRE com um céu de estrelas de mentira, todas a
// mais de 2,2 pc (onde o fade de perto já está cheio) e com a MESMA
// magnitude: a opacidade de repouso de cada uma é 0,92 exata, então
// "alfa intermediário" é literalmente "diferente de 0 e de 0,92".
// ============================================================
describe('a rampa dos nomes: 250 ms para entrar, 750 ms para sair', () => {
  const QUADRO = 1 / 60;

  /** uma estrela de mentira a `d` pc na frente da câmera, com nome dado */
  function estrela(nome: string, d: number, i: number): NamedStar {
    // afastada do eixo o bastante para cair dentro da caixa segura de
    // `projectPoint`, e diferente por índice para não empilhar
    return { n: nome, x: 0.02 * i * d, y: 0.02 * i * d, z: -d, m: 1, s: 'G2V', d, t: 0 };
  }

  /** o céu de `n` estrelas, a 3, 4, … pc — a mais distante é a última */
  function ceu(n: number): NamedStar[] {
    return Array.from({ length: n }, (_, i) => estrela(`E${i + 1}`, 3 + i, i + 1));
  }

  function bancadaDoCeu() {
    const publicadas: StarLabel[][] = [];
    const rotulos = new Rotulos({
      onLabels: (labels) => publicadas.push(labels),
      onDest: () => {},
      onSol: () => {},
      onLente: () => {},
      onCamera: () => {},
      beatDaViagem: () => ({}) as JourneyMeta,
    // sem raio não há disco: estas bancadas só têm o Sol como oclusor
    raioFisicoDe: () => null,
    });
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
    cam.updateMatrixWorld();
    /** um quadro de 1/60 s com o céu dado */
    const passo = (named: NamedStar[]) => {
      rotulos.tique(QUADRO);
      rotulos.projetar(cam, {
        fase: 'free', named, dHome: 0, planetas: null, foco: null,
        nomesEscondidos: false, iconesEscondidos: false, texto3d: false,
      });
    };
    /** a opacidade de um nome no último quadro publicado (0 se ausente) */
    const alfaDe = (nome: string) =>
      publicadas.at(-1)?.find((l) => l.key === nome)?.opacity ?? 0;
    return { rotulos, publicadas, passo, alfaDe };
  }

  const CHEIO = 0.92;
  const intermediario = (a: number) => a > 0 && a < CHEIO;

  it('quem ENTRA sobe em 15 quadros (250 ms a 60 fps) e ENCOSTA em 0,92', () => {
    const { passo, alfaDe } = bancadaDoCeu();
    const céu = ceu(3);
    let meios = 0;
    for (let i = 0; i < 60; i++) {
      passo(céu);
      if (intermediario(alfaDe('E1'))) meios++;
    }
    // 14 quadros no meio do caminho e o 15º já cheio: 250 ms exatos
    expect(meios).toBe(14);
    // ENCOSTAR é obrigação: 0,92 EXATO, senão a assinatura do desenho
    // muda em todo quadro e a tela repinta para sempre
    expect(alfaDe('E1')).toBe(CHEIO);
  });

  it('quem PERDE a vaga desce em 45 quadros (750 ms) — três vezes a subida', () => {
    // DESDE A F3 (item 125) quem tira a vaga de um nome é a COLISÃO, e o
    // veredito dela chega ao produtor pela marca `perdeuAVaga` que o
    // `LabelCanvas` escreve nos objetos do quadro. Aqui ela é encenada:
    // E10 perde a vaga a partir do 41º quadro. A rampa é a mesma peça da
    // F2 e as durações são as mesmas — o que mudou é a fonte do veredito.
    const { rotulos, passo, alfaDe, publicadas } = bancadaDoCeu();
    const onze = ceu(11);
    for (let i = 0; i < 40; i++) passo(onze);
    expect(alfaDe('E10')).toBe(CHEIO);
    // chega uma estrela MAIS PERTO que todas: ela ocupa o lugar de E10
    const doze = [estrela('NOVA', 2.5, 12), ...onze];
    let saindo = 0;
    let entrando = 0;
    for (let i = 0; i < 60; i++) {
      for (const l of rotulos.alvos) l.perdeuAVaga = l.key === 'E10';
      passo(doze);
      if (intermediario(alfaDe('E10'))) saindo++;
      if (intermediario(alfaDe('NOVA'))) entrando++;
    }
    expect(saindo).toBe(44);
    expect(entrando).toBe(14);
    // a assimetria é o produto: sair custa três vezes o entrar
    expect((saindo + 1) / (entrando + 1)).toBe(3);
    // e no fim a perdedora está APAGADA e segue marcada pela disputa
    const E10 = publicadas.at(-1)?.find((l) => l.key === 'E10');
    expect(E10?.opacity).toBe(0);
    expect(E10?.cortadoPelaRegua).toBe(true);
    expect(E10?.causaDoSumico).toBe('disputa');
  });

  it('enquanto desce, o nome cortado volta à lista como `saindo` — imagem, não vaga', () => {
    const { rotulos, passo, publicadas } = bancadaDoCeu();
    const onze = ceu(11);
    for (let i = 0; i < 40; i++) passo(onze);
    for (const l of rotulos.alvos) l.perdeuAVaga = l.key === 'E10';
    passo([estrela('NOVA', 2.5, 12), ...onze]);
    const E10 = publicadas.at(-1)?.find((l) => l.key === 'E10');
    // a colisão CORTOU (e é ela quem manda em quem ocupa); a rampa
    // devolve o rótulo à pintura sem devolver a vaga
    expect(E10?.saindo).toBe(true);
    expect(E10?.cortadoPelaRegua).toBeFalsy();
  });

  it('a memória atravessa a ausência: sumir e voltar não reinicia do zero', () => {
    const { passo, alfaDe } = bancadaDoCeu();
    const tres = ceu(3);
    for (let i = 0; i < 30; i++) passo(tres);
    expect(alfaDe('E3')).toBe(CHEIO);
    // E3 sai do catálogo por seis quadros (100 ms de descida) e volta
    const dois = tres.slice(0, 2);
    for (let i = 0; i < 6; i++) passo(dois);
    passo(tres);
    // sem memória ela renasceria em 1/15 do caminho; com memória volta
    // de onde parou, bem acima disso — é o que impede o pisca-pisca
    expect(alfaDe('E3')).toBeGreaterThan(0.8 * CHEIO);
  });

  it('com a rampa cheia o quadro parado é BIT A BIT o mesmo — nada a repintar', () => {
    const { passo, publicadas } = bancadaDoCeu();
    const tres = ceu(3);
    for (let i = 0; i < 30; i++) passo(tres);
    const antes = publicadas.at(-1)!.map((l) => l.opacity);
    passo(tres);
    expect(publicadas.at(-1)!.map((l) => l.opacity)).toEqual(antes);
  });
});

// ============================================================
// A LISTA DE OCLUSORES É A DOS CORPOS DO QUADRO (item 115, bloco B,
// peça 2) — e não a do Sol sozinho.
//
// A lei está provada em `world/labels.test.ts` (a conta do cone). O que
// se julga aqui é a FIAÇÃO: que `montarOclusores` lê as posições vivas
// da camada e o raio da escada, e entrega esses discos às duas
// projeções. Apagar a montagem — ou o fio do raio — devolve o defeito
// fotografado no mergulho 08 e reprova.
// ============================================================
describe('os oclusores de rótulo são os corpos do quadro (item 115)', () => {
  /** o Atlas com a Terra na origem e uma estrela alinhada atrás dela */
  function noAtlasComGlobo(raioDaTerra: number | null) {
    const rotulos = new Rotulos({
      onLabels: () => {},
      onDest: () => {},
      onSol: () => {},
      onLente: () => {},
      onCamera: () => {},
      beatDaViagem: () => ({}) as JourneyMeta,
      raioFisicoDe: (id) => (id === 'earth' ? raioDaTerra : null),
    });
    const cam = new THREE.PerspectiveCamera(58, 1.6, 0.001, 1000);
    cam.position.set(0, 0, 5);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    const posicoes = new Float32Array(CORPOS_DO_SISTEMA.length * 3).fill(Number.NaN);
    const iTerra = CORPOS_DO_SISTEMA.findIndex((c) => c.id === 'earth');
    posicoes[iTerra * 3] = 0;
    posicoes[iTerra * 3 + 1] = 0;
    posicoes[iTerra * 3 + 2] = 0;
    const planetas = { points: { visible: true }, posicoes } as unknown as Planetas;
    // duas nomeadas a 200 pc: uma exatamente atrás da Terra, outra ao lado
    const named: NamedStar[] = [
      { n: 'Atrás', x: 0, y: 0, z: -200, m: 1, s: 'A0V', d: 200, t: 0 },
      { n: 'AoLado', x: 60, y: 0, z: -200, m: 1, s: 'A0V', d: 200, t: 0 },
    ];
    rotulos.tique(1 / 60);
    rotulos.projetar(cam, {
      fase: 'atlas', named, dHome: 5, planetas, foco: null,
      nomesEscondidos: false, iconesEscondidos: false, texto3d: false,
    });
    return rotulos.alvos.map((l) => l.key);
  }

  it('sem raio (nenhum globo) as duas estrelas nascem — é o estado de antes', () => {
    const chaves = noAtlasComGlobo(null);
    expect(chaves).toContain('Atrás');
    expect(chaves).toContain('AoLado');
  });

  it('com o globo da Terra no caminho, a estrela ATRÁS dela não nasce', () => {
    // A ESTRELA NUNCA VISTA NÃO NASCE NEM PARA APAGAR (item 125, F4): ela
    // entra na lista marcada de saída, a rampa a encontra com alfa ZERO
    // (nunca esteve na tela, então não há tinta a esvair) e o produtor a
    // tira no mesmo quadro. O que fadeia é só o nome que ESTAVA aceso —
    // provado logo abaixo, no bloco da F4.
    const chaves = noAtlasComGlobo(0.3);
    expect(chaves).not.toContain('Atrás');
    // e a vizinha, fora do cone, continua na tela — o disco esconde o
    // que está atrás DELE, não a metade do céu
    expect(chaves).toContain('AoLado');
    // a própria Terra segue com nome: nenhum corpo é oclusor de si
    expect(chaves).toContain('corpo:earth');
  });
});

// ============================================================
// §4 ENCOBRIMENTO — as regras do NASA Eyes (item 125, ONDA DA PARIDADE,
// F4). O que se julga aqui é o que só o PRODUTOR sabe: a lista de
// oclusores do quadro (O4/O5), a rampa da oclusão (a integração com a
// F2), a isenção do alvo seguido (O11) e o que acontece às costas (O8).
// A conta em si mora em `world/labels.test.ts`.
// ============================================================
describe('F4 — os oclusores são os corpos VIVOS do quadro (O4/O5)', () => {
  const QUADRO = 1 / 60;

  /**
   * A bancada do encobrimento: a Terra na origem, a Lua onde se quiser,
   * e duas estrelas a 200 pc — uma na mira da Terra, outra ao lado.
   * `raio` é o raio físico que a escada devolve para cada corpo.
   */
  function bancada(raios: Record<string, number | null>) {
    const publicadas: StarLabel[][] = [];
    const rotulos = new Rotulos({
      onLabels: (l) => publicadas.push(l),
      onDest: () => {},
      onSol: () => {},
      onLente: () => {},
      onCamera: () => {},
      beatDaViagem: () => ({}) as JourneyMeta,
      raioFisicoDe: (id) => raios[id] ?? null,
    });
    const cam = new THREE.PerspectiveCamera(58, 1.6, 0.001, 1000);
    cam.position.set(0, 0, 5);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    const posicoes = new Float32Array(CORPOS_DO_SISTEMA.length * 3).fill(Number.NaN);
    const iTerra = CORPOS_DO_SISTEMA.findIndex((c) => c.id === 'earth');
    posicoes[iTerra * 3] = 0;
    posicoes[iTerra * 3 + 1] = 0;
    posicoes[iTerra * 3 + 2] = 0;
    const planetas = { points: { visible: true }, posicoes } as unknown as Planetas;
    const passo = (named: NamedStar[], foco: string | null = null) => {
      rotulos.tique(QUADRO);
      rotulos.projetar(cam, {
        fase: 'atlas', named, dHome: 5, planetas, foco,
        nomesEscondidos: false, iconesEscondidos: false, texto3d: false,
      });
      return publicadas.at(-1)!;
    };
    return { rotulos, cam, posicoes, passo, publicadas };
  }

  /** uma estrela a 200 pc, a `graus` do eixo da câmera */
  const estrela = (nome: string, graus: number): NamedStar => ({
    n: nome,
    x: 200 * Math.sin((graus * Math.PI) / 180),
    y: 0,
    z: -200 * Math.cos((graus * Math.PI) / 180),
    m: 1,
    s: 'A0V',
    d: 200,
    t: 0,
  });

  /** o raio APARENTE em px de um corpo de raio `r` a `d`, em 900 px de altura */
  const px = (r: number, d: number, fovDeg = 58, alturaPx = 900) => {
    const s = r / d;
    return ((s / Math.sqrt(1 - s * s) / Math.tan((fovDeg * Math.PI) / 360)) * alturaPx) / 2;
  };

  it('(a) o corpo GRANDE oclui — a Terra a 5 pc com 0,3 de raio cobre 49 px', () => {
    // 48,8 px de raio numa tela de 900: um globo bem visível, e o nome
    // que cai dentro do cone dele morre
    expect(px(0.3, 5)).toBeCloseTo(48.8, 1);
    const lista = bancada({ earth: 0.3 }).passo([estrela('Mira', 0), estrela('Lado', 30)]);
    expect(lista.map((l) => l.key)).not.toContain('Mira');
    expect(lista.map((l) => l.key)).toContain('Lado');
  });

  it('(b) o corpo de MENOS DE UM PIXEL só alcança o que está sob ele', () => {
    // O CORTE DE 1 px DO EYES (O5) NÃO EXISTE NA CASA, e a medida diz
    // por quê ele não faz falta: o cone É a régua. Com raio 0,0015 a
    // 5 pc a Terra tem 0,95 px de raio aparente — abaixo do corte deles,
    // portanto um oclusor que lá seria PODADO. Aqui ele oclui, mas só
    // dentro do próprio cone: 0,0344° de meio-ângulo.
    const raio = 0.0015;
    expect(px(raio, 5)).toBeLessThan(1);
    const meioAngulo = (Math.asin(raio / 5) * 180) / Math.PI;
    expect(meioAngulo).toBeCloseTo(0.0172, 4);
    // a estrela EXATAMENTE atrás (0°) perde o nome...
    expect(bancada({ earth: raio }).passo([estrela('Mira', 0)]).map((l) => l.key)).not.toContain(
      'Mira'
    );
    // ...e a 0,05° — meio pixel e meio de distância na tela — não perde.
    // O erro contra o Eyes é, no MÁXIMO, um nome cujo ponto esteja a
    // menos de um pixel do centro de um corpo invisível: onde o nome
    // já estaria escrito em cima do próprio objeto.
    expect(
      bancada({ earth: raio }).passo([estrela('Quase', 0.05)]).map((l) => l.key)
    ).toContain('Quase');
  });

  it('(c) a lista é REMONTADA por quadro — o corpo que sai dela para de ocluir', () => {
    // O4/O5 medidos pelo efeito, na MESMA instância e em dois quadros:
    // a Lua com posição viva entre a câmera e a estrela oclui...
    const b = bancada({ moon: 0.3 });
    b.rotulos.escreverPosicaoDeLua('moon', new THREE.Vector3(0, 0, 2));
    expect(b.passo([estrela('Mira', 0)]).map((l) => l.key)).not.toContain('Mira');
    // ...e no quadro seguinte, sem efeméride (NaN, que é como a projeção
    // diz "não sei onde ela está"), o nome VOLTA. Se a lista fosse
    // acumulada em vez de remontada, o disco de ontem esconderia hoje.
    b.rotulos.escreverPosicaoDeLua('moon', new THREE.Vector3(NaN, NaN, NaN));
    expect(b.passo([estrela('Mira', 0)]).map((l) => l.key)).toContain('Mira');
    // e o corpo SEM RAIO (a escada não conhece o mesh dele) também não
    // oclui — é o `occlusionRadius = 0` do construtor deles (O6)
    const semRaio = bancada({ moon: null });
    semRaio.rotulos.escreverPosicaoDeLua('moon', new THREE.Vector3(0, 0, 2));
    expect(semRaio.passo([estrela('Mira', 0)]).map((l) => l.key)).toContain('Mira');
  });
});

describe('F4 — o nome que o globo pega APAGA em 750 ms (a integração com a F2)', () => {
  const QUADRO = 1 / 60;

  /** a Terra na origem e uma estrela que ENTRA no cone quando se quer */
  function bancada() {
    const publicadas: StarLabel[][] = [];
    const rotulos = new Rotulos({
      onLabels: (l) => publicadas.push(l),
      onDest: () => {},
      onSol: () => {},
      onLente: () => {},
      onCamera: () => {},
      beatDaViagem: () => ({}) as JourneyMeta,
      raioFisicoDe: (id) => (id === 'moon' ? 0.3 : null),
    });
    const cam = new THREE.PerspectiveCamera(58, 1.6, 0.001, 1000);
    cam.position.set(0, 0, 5);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    const posicoes = new Float32Array(CORPOS_DO_SISTEMA.length * 3).fill(Number.NaN);
    const planetas = { points: { visible: true }, posicoes } as unknown as Planetas;
    const alvo: NamedStar = { n: 'Alvo', x: 0, y: 0, z: -200, m: 1, s: 'A0V', d: 200, t: 0 };
    /** um quadro; `comLua` põe a Lua no caminho da estrela */
    const passo = (comLua: boolean) => {
      rotulos.escreverPosicaoDeLua(
        'moon',
        comLua ? new THREE.Vector3(0, 0, 2) : new THREE.Vector3(NaN, NaN, NaN)
      );
      rotulos.tique(QUADRO);
      rotulos.projetar(cam, {
        fase: 'atlas', named: [alvo], dHome: 5, planetas, foco: null,
        nomesEscondidos: false, iconesEscondidos: false, texto3d: false,
      });
      return publicadas.at(-1)!.find((l) => l.key === 'Alvo') ?? null;
    };
    return { passo, rotulos };
  }

  it('a tinta desce em 45 quadros — a MESMA rampa de saída da disputa', () => {
    const { passo } = bancada();
    // 20 quadros de céu limpo: a estrela sobe e ENCOSTA (a rampa chega
    // ao alvo em tempo exato, e o alfa base é o do fade de distância)
    let vivo = null;
    for (let i = 0; i < 20; i++) vivo = passo(false);
    const cheio = vivo!.opacity;
    expect(cheio).toBe(passo(false)!.opacity);
    expect(vivo!.causaDoSumico).toBeUndefined();
    // a Lua entra no caminho: a partir daqui o nome está de SAÍDA
    const primeiro = passo(true)!;
    expect(primeiro.causaDoSumico).toBe('oclusao');
    expect(primeiro.saindo).toBe(true);
    // e ele NÃO é alvo de clique: quem está atrás do globo não se clica
    expect(primeiro.desenhado).not.toBe(true);
    // 750 ms a 60 fps são 45 quadros; o primeiro já andou um
    const alfas = [primeiro.opacity];
    let quadros = 1;
    for (; quadros < 200; quadros++) {
      const l = passo(true);
      if (l === null) break;
      alfas.push(l.opacity);
    }
    // o quadro do `primeiro` já contou: 1 + 44 = 45 = 750 ms a 60 fps
    expect(1 + quadros).toBe(45);
    // e o passo é CONSTANTE: rampa linear, não encosto exponencial
    const passos = alfas.slice(1).map((a, i) => alfas[i] - a);
    for (const d of passos) expect(d).toBeCloseTo(cheio / 45, 6);
    // SABOTAGEM QUE ISTO MORDE: devolver o `continue` da oclusão (o nome
    // sai da lista no quadro em que o globo o pega) zera `quadros`.
  });

  it('a tinta VOLTA se o globo sair antes do fim — 3× mais rápido, como a F2 manda', () => {
    const { passo } = bancada();
    for (let i = 0; i < 20; i++) passo(false);
    const descendo = [passo(true)!.opacity, passo(true)!.opacity, passo(true)!.opacity];
    expect(descendo[2]).toBeLessThan(descendo[0]);
    // o globo sai: a mesma memória sobe pela rampa de ENTRADA (250 ms)
    const voltando = passo(false)!;
    expect(voltando.causaDoSumico).toBeUndefined();
    const subida = voltando.opacity - descendo[2];
    const descida = descendo[0] - descendo[1];
    expect(subida / descida).toBeCloseTo(3, 6); // 750 / 250
  });

  it('o ocluído fica com a CAUSA dele — a derrota na disputa não a reescreve', () => {
    const { passo, rotulos } = bancada();
    for (let i = 0; i < 20; i++) passo(false);
    const l = passo(true)!;
    expect(l.causaDoSumico).toBe('oclusao');
    // e AGORA a parte que morde: o `LabelCanvas` deste quadro diz que o
    // nome também PERDEU A VAGA (é o que ele escreve quando julga), e a
    // realimentação do quadro seguinte não pode trocar a causa dele. A
    // marca vai no objeto vivo, que é onde o `LabelCanvas` a escreveria.
    for (const x of rotulos.alvos) if (x.key === 'Alvo') x.perdeuAVaga = true;
    const depois = passo(true)!;
    // SABOTAGEM QUE ISTO MORDE: a realimentação do F3 (`perdedoresDaVaga`)
    // sobrescrever a causa com 'disputa' mandaria o nome de volta à
    // disputa por espaço, que ele não travou.
    expect(depois.causaDoSumico).toBe('oclusao');
  });
});

describe('F4 · O11 — a isenção do alvo seguido, pelo produtor', () => {
  const QUADRO = 1 / 60;

  /** a Lua na frente da TERRA, vista da câmera: quem é o foco decide */
  function passoCom(foco: string | null) {
    const publicadas: StarLabel[][] = [];
    const rotulos = new Rotulos({
      onLabels: (l) => publicadas.push(l),
      onDest: () => {},
      onSol: () => {},
      onLente: () => {},
      onCamera: () => {},
      beatDaViagem: () => ({}) as JourneyMeta,
      // A ESCALA AQUI É A DO SISTEMA, não a do céu: o fade de distância
      // dos corpos fecha em 0,05 pc (`CORPO_FADE_TERMINA_PC`), e a
      // cessão por tamanho (F2 · A5) fecha em 0,03 de raio NDC. A câmera
      // a 0,005 pc com a Terra de raio 2e-5 fica dentro das duas — é a
      // única faixa em que um corpo tem nome VIVO para a isenção salvar.
      raioFisicoDe: (id) => (id === 'moon' ? 1e-4 : id === 'earth' ? 2e-5 : null),
    });
    const cam = new THREE.PerspectiveCamera(58, 1.6, 1e-6, 1000);
    cam.position.set(0, 0, 0.005);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    const posicoes = new Float32Array(CORPOS_DO_SISTEMA.length * 3).fill(Number.NaN);
    const iTerra = CORPOS_DO_SISTEMA.findIndex((c) => c.id === 'earth');
    posicoes[iTerra * 3] = 0;
    posicoes[iTerra * 3 + 1] = 0;
    posicoes[iTerra * 3 + 2] = 0;
    const planetas = { points: { visible: true }, posicoes } as unknown as Planetas;
    rotulos.escreverPosicaoDeLua('moon', new THREE.Vector3(0, 0, 0.002));
    let ultimo: StarLabel[] = [];
    for (let i = 0; i < 30; i++) {
      rotulos.tique(QUADRO);
      rotulos.projetar(cam, {
        fase: 'atlas', named: [], dHome: 0.005, planetas, foco,
        nomesEscondidos: false, iconesEscondidos: false, texto3d: false,
      });
      ultimo = publicadas.at(-1)!;
    }
    return ultimo;
  }

  it('SEM foco a Terra atrás da Lua perde o nome; COM foco nela, não', () => {
    // a Lua (0,3 de raio a 3 pc da câmera) cobre a Terra, que está na
    // origem, 5 pc adiante
    expect(passoCom(null).map((l) => l.key)).not.toContain('corpo:earth');
    expect(passoCom('earth').map((l) => l.key)).toContain('corpo:earth');
    // e o nome do alvo seguido está VIVO, não apagando: sem causa
    const alvo = passoCom('earth').find((l) => l.key === 'corpo:earth')!;
    expect(alvo.causaDoSumico).toBeUndefined();
    expect(alvo.opacity).toBeGreaterThan(0.5);
  });

  it('a isenção é DO ALVO, não de todo mundo — e LARGAR desfaz', () => {
    // com o foco em OUTRO corpo, a Terra volta a ser escondida
    expect(passoCom('mars').map((l) => l.key)).not.toContain('corpo:earth');
    // é o `unfollow` deles: a chave sai do foco vivo a cada quadro, e
    // não há estado guardado para restaurar
    expect(passoCom(null).map((l) => l.key)).not.toContain('corpo:earth');
  });
});

describe('o veredito da colisão volta como rampa (item 125, F3 · P4)', () => {
  /**
   * UM CÉU CHEIO. Catorze estrelas do mesmo tier espalhadas pelo quadro:
   * elas não colidem entre si, e desde a revogação do orçamento (F3)
   * nenhuma é cortada por população. Quem corta agora é o desenho, e o
   * que se prova aqui é o FIO — que o veredito escrito por ele no quadro
   * N vira `cortadoPelaRegua` + `causaDoSumico: 'disputa'` no quadro
   * N+1, que é o que faz a rampa de 750 ms correr.
   */
  const CEU_CHEIO: NamedStar[] = Array.from({ length: 14 }, (_, i) => ({
    n: `E${i}`,
    // espalhadas pela largura do quadro, longe umas das outras: o que se
    // quer medir é o corte por ORÇAMENTO, não a colisão de caixas
    x: -1.3 + i * 0.2,
    y: (i % 2 === 0 ? 1 : -1) * 0.35,
    z: 0,
    m: 1,
    s: 'A0V',
    d: 5 + i,
    t: 0,
  }));

  function bancadaCheia() {
    const rotulos = new Rotulos({
      onLabels: () => {},
      onDest: () => {},
      onSol: () => {},
      onLente: () => {},
      onCamera: () => {},
      beatDaViagem: () => ({}) as JourneyMeta,
      raioFisicoDe: () => null,
    });
    const cam = new THREE.PerspectiveCamera(58, 1.6, 0.001, 100);
    cam.position.set(0, 0, 5);
    cam.updateMatrixWorld();
    const quadro: QuadroDeRotulos = {
      fase: 'free', named: CEU_CHEIO, dHome: 5, planetas: null, foco: null,
      nomesEscondidos: false, iconesEscondidos: false, texto3d: false,
    };
    /** um quadro inteiro: a rampa completa (250 ms) e a projeção */
    const passo = () => {
      rotulos.tique(1);
      rotulos.projetar(cam, quadro);
    };
    return { rotulos, passo };
  }

  it('a POPULAÇÃO não corta mais ninguém — o orçamento foi revogado', () => {
    const { rotulos, passo } = bancadaCheia();
    passo();
    // catorze estrelas projetadas, catorze nomes na lista, zero cortes
    expect(rotulos.alvos.length).toBeGreaterThan(10);
    expect(rotulos.alvos.filter((l) => l.cortadoPelaRegua).length).toBe(0);
  });

  it('quem o DESENHO reprovou chega ao quadro seguinte marcado — e com a causa', () => {
    const { rotulos, passo } = bancadaCheia();
    passo();
    const perdedor = rotulos.alvos.at(-1)!.key;
    // O QUE O `LabelCanvas` FAZ, encenado: ele escreve `perdeuAVaga` nos
    // objetos que o Director guarda em `lastLabels`, DEPOIS deste tique.
    for (const l of rotulos.alvos) l.perdeuAVaga = l.key === perdedor;

    passo();
    const depois = rotulos.alvos.find((l) => l.key === perdedor)!;
    expect(depois.cortadoPelaRegua).toBe(true);
    expect(depois.causaDoSumico).toBe('disputa');
    // e a rampa já mordeu: a camada de fora começou a descer
    expect(depois.opacity).toBeLessThan(0.5);
  });

  it('...e quem VENCEU não é marcado — a diferença é o veredito, não a bancada', () => {
    const { rotulos, passo } = bancadaCheia();
    passo();
    const chave = rotulos.alvos.at(-1)!.key;
    for (const l of rotulos.alvos) l.perdeuAVaga = false;
    passo();
    const depois = rotulos.alvos.find((l) => l.key === chave)!;
    expect(depois.cortadoPelaRegua).toBeFalsy();
    expect(depois.causaDoSumico).toBeUndefined();
  });

  it('a derrota é REVERSÍVEL: o vencedor saiu de perto, o nome volta', () => {
    const { rotulos, passo } = bancadaCheia();
    passo();
    const chave = rotulos.alvos.at(-1)!.key;
    for (const l of rotulos.alvos) l.perdeuAVaga = l.key === chave;
    passo();
    expect(rotulos.alvos.find((l) => l.key === chave)!.cortadoPelaRegua).toBe(true);
    // o desenho o aprova de novo (o oponente saiu de quadro)
    for (const l of rotulos.alvos) l.perdeuAVaga = false;
    passo();
    const voltou = rotulos.alvos.find((l) => l.key === chave)!;
    expect(voltou.cortadoPelaRegua).toBeFalsy();
    expect(voltou.opacity).toBeGreaterThan(0.5);
  });
});

// ============================================================
// §2 APARIÇÃO no PRODUTOR (item 125, ONDA DA PARIDADE, F2).
//
// A conta mora em `world/labels.ts` e é julgada lá. O que se prova aqui
// é o FIO: que o produtor entrega o raio de cena à régua, que o alvo em
// FOCO passa por ela como todo mundo (A6) e que o ponteiro chega ao alfa
// do texto no mesmo quadro (A12).
// ============================================================
describe('A6 — o alvo SEGUIDO não é exceção à cessão por tamanho', () => {
  /** a Terra sozinha em quadro, a `dist` pc da câmera, com raio `raio` */
  function comATerra(raio: number, foco: string | null) {
    const publicados: StarLabel[][] = [];
    const rotulos = new Rotulos({
      onLabels: (l) => publicados.push(l),
      onDest: () => {},
      onSol: () => {},
      onLente: () => {},
      onCamera: () => {},
      beatDaViagem: () => ({}) as JourneyMeta,
      // a régua de aparição bebe DESTA fonte, a mesma do disco oclusor
      raioFisicoDe: (id) => (id === 'earth' ? raio : null),
    });
    const cam = new THREE.PerspectiveCamera(60, 1.6, 1e-9, 100);
    cam.position.set(0, 0, 0.005);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld(true);
    const posicoes = new Float32Array(CORPOS_DO_SISTEMA.length * 3).fill(Number.NaN);
    const iTerra = CORPOS_DO_SISTEMA.findIndex((c) => c.id === 'earth');
    posicoes[iTerra * 3] = 0;
    posicoes[iTerra * 3 + 1] = 0;
    posicoes[iTerra * 3 + 2] = 0;
    const planetas = { points: { visible: true }, posicoes } as unknown as Planetas;
    const quadro: QuadroDeRotulos = {
      fase: 'atlas', named: [], dHome: 0.005, planetas, foco,
      nomesEscondidos: false, iconesEscondidos: false, texto3d: false,
    };
    // dois quadros: o primeiro faz a camada de fora subir ao topo
    rotulos.tique(1);
    rotulos.projetar(cam, quadro);
    rotulos.tique(1);
    rotulos.projetar(cam, quadro);
    return rotulos.alvos.find((l) => l.key === 'corpo:earth')!;
  }

  /** o raio que põe o corpo em `alvoNdc` de raio aparente, a 0,005 pc */
  function raioPara(alvoNdc: number) {
    const tan = alvoNdc * Math.tan((60 / 2) * (Math.PI / 180));
    return (tan / Math.sqrt(1 + tan * tan)) * 0.005;
  }

  it('PEQUENA e em foco: o nome vive, com o peso do foco', () => {
    const terra = comATerra(raioPara(0.005), 'earth');
    expect(terra.prioridade).toBe(PRIORIDADE_DO_ROTULO.foco);
    expect(terra.opacity).toBeGreaterThan(0.3);
    expect(terra.causaDoSumico).toBeUndefined();
  });

  it('ENCHENDO A TELA e em foco: o nome CEDE — peso não é imunidade', () => {
    const terra = comATerra(raioPara(0.05), 'earth');
    // o peso do foco continua lá, e mesmo assim…
    expect(terra.prioridade).toBe(PRIORIDADE_DO_ROTULO.foco);
    expect(terra.opacity).toBe(0);
    expect(terra.causaDoSumico).toBe('tamanho');
    // …e o texto de dentro já está no alfa de escondido
    expect(terra.alfaDoTexto).toBeLessThan(0.35);
    // SABOTAGEM QUE ISTO MORDE: isentar o foco da régua (a leitura
    // intuitiva, e a que a casa tinha até 01/09) devolve opacidade viva.
  });

  it('sem foco o resultado é o MESMO: a régua não olha quem é o alvo', () => {
    const emFoco = comATerra(raioPara(0.05), 'earth');
    const solto = comATerra(raioPara(0.05), null);
    expect(solto.opacity).toBe(emFoco.opacity);
    expect(solto.causaDoSumico).toBe(emFoco.causaDoSumico);
  });
});

describe('A12 — o ponteiro no nome acende o alfa do texto, no mesmo quadro', () => {
  function bancadaDeHover() {
    const rotulos = new Rotulos({
      onLabels: () => {},
      onDest: () => {},
      onSol: () => {},
      onLente: () => {},
      onCamera: () => {},
      beatDaViagem: () => ({}) as JourneyMeta,
      raioFisicoDe: () => null,
    });
    const cam = new THREE.PerspectiveCamera(60, 1.6, 1e-9, 100);
    cam.position.set(0, 0, 0.005);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld(true);
    const posicoes = new Float32Array(CORPOS_DO_SISTEMA.length * 3).fill(Number.NaN);
    const iTerra = CORPOS_DO_SISTEMA.findIndex((c) => c.id === 'earth');
    posicoes[iTerra * 3] = 0;
    posicoes[iTerra * 3 + 1] = 0;
    posicoes[iTerra * 3 + 2] = 0;
    const planetas = { points: { visible: true }, posicoes } as unknown as Planetas;
    const quadro: QuadroDeRotulos = {
      fase: 'atlas', named: [], dHome: 0.005, planetas, foco: null,
      nomesEscondidos: false, iconesEscondidos: false, texto3d: false,
    };
    const passo = (dt: number) => {
      rotulos.tique(dt);
      rotulos.projetar(cam, quadro);
      return rotulos.alvos.find((l) => l.key === 'corpo:earth')!;
    };
    return { rotulos, passo };
  }

  it('0,35 em repouso → 1 em 250 ms, e volta ao soltar', () => {
    const { rotulos, passo } = bancadaDeHover();
    // a Terra é PLANETA: o canal dela é o primário (0,75)
    expect(passo(1).alfaDoTexto).toBe(0.75);
    rotulos.apontado = 'corpo:earth';
    expect(passo(0.125).alfaDoTexto).toBeCloseTo(0.75 + (1 - 0.75) / 2, 12);
    expect(passo(0.125).alfaDoTexto).toBe(1);
    // soltou: desce pela rampa LONGA (750 ms), como no `.text` deles
    rotulos.apontado = null;
    expect(passo(0.25).alfaDoTexto).toBeCloseTo(1 - (1 - 0.75) / 3, 12);
    // SABOTAGEM QUE ISTO MORDE: apagar a marca do apontado no produtor
    // (ou pendurá-la em outro evento) trava o alfa em 0,75.
  });

  it('apontar OUTRO nome não acende este', () => {
    const { rotulos, passo } = bancadaDeHover();
    passo(1);
    rotulos.apontado = 'corpo:mars';
    expect(passo(0.25).alfaDoTexto).toBe(0.75);
  });
});

// ============================================================
// O CORPO DA CASA COMO ASSUNTO DO BEAT (viagem solar). O filme solar
// passa pela Lua, por Io e por Encélado e termina com a Terra como um
// ponto perto do Sol — sem nome, ninguém sabe qual ponto é ela. Os
// `assuntos` do plano aceitam o id do corpo, e a etiqueta dirigida sai
// onde ele está: a Lua pelo array que o passo do palco escreve, a Terra
// pelo buffer da camada — as duas fontes dos oclusores e do Atlas.
// ============================================================
describe('o corpo da casa como assunto do beat (viagem solar)', () => {
  afterEach(() => definirIdioma('pt-BR'));

  const LUA = new THREE.Vector3(1, 0.5, 1);
  const CERES = new THREE.Vector3(-0.5, 0.75, 0);

  /**
   * Um quadro do filme com a câmera a 5 pc olhando a origem. A Terra
   * (0,3 de raio: o globo que esconde) e Marte no buffer da camada; a Lua
   * e Io no array do palco. Todos em quadro e com posição — quem ganha
   * nome é só quem o beat pede.
   */
  function noFilme({
    target,
    quiet = true,
    lua = LUA,
    ceres = CERES,
    named = [] as NamedStar[],
    nomesEscondidos = false,
  }: {
    target?: string[];
    quiet?: boolean;
    lua?: THREE.Vector3;
    ceres?: THREE.Vector3;
    named?: NamedStar[];
    nomesEscondidos?: boolean;
  }) {
    const publicadas: StarLabel[][] = [];
    const rotulos = new Rotulos({
      onLabels: (l) => publicadas.push(l),
      onDest: () => {},
      onSol: () => {},
      onLente: () => {},
      onCamera: () => {},
      beatDaViagem: () => ({ target, quiet }) as JourneyMeta,
      raioFisicoDe: (id) => (id === 'earth' ? 0.3 : null),
    });
    const cam = new THREE.PerspectiveCamera(58, 1.6, 0.001, 1000);
    cam.position.set(0, 0, 5);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    const posicoes = new Float32Array(CORPOS_DO_SISTEMA.length * 3).fill(Number.NaN);
    const indice = (id: string) => CORPOS_DO_SISTEMA.findIndex((c) => c.id === id) * 3;
    posicoes.set([0, 0, 2], indice('earth'));
    posicoes.set([-1, -0.5, 1], indice('mars'));
    const planetas = { points: { visible: true }, posicoes } as unknown as Planetas;
    rotulos.escreverPosicaoDeLua('moon', lua);
    rotulos.escreverPosicaoDeLua('io', new THREE.Vector3(0.5, -0.8, 0));
    rotulos.escreverPosicaoDeLua('atlas', new THREE.Vector3(-1, 0.6, 0));
    // o anão sem ponto na camada: o passo do palco escreve o centro dele
    // pela mesma porta das luas (todo rochoso sem retrato é `rotuloDeLua`)
    rotulos.escreverPosicaoDeLua('ceres', ceres);
    rotulos.projetar(cam, {
      fase: 'journey', named, dHome: 5, planetas, foco: null,
      nomesEscondidos, iconesEscondidos: false, texto3d: false,
    });
    return { lista: publicadas.at(-1)!, cam };
  }

  it('target ["moon", "earth"]: cada corpo pedido tem a etiqueta dirigida onde está, e só ele', () => {
    const { lista, cam } = noFilme({ target: ['moon', 'earth'] });
    // Marte e Io estão em quadro e com posição, e não ganham nome
    expect(lista.map((l) => l.key)).toEqual(['corpo:moon', 'corpo:earth']);
    const [lua, terra] = lista;
    const p = LUA.clone().project(cam);
    expect([lua.x, lua.y]).toEqual([(p.x + 1) / 2, (1 - p.y) / 2]);
    expect([terra.x, terra.y]).toEqual([0.5, 0.5]);
    expect([lua.name, terra.name]).toEqual(['Lua', 'Terra']);
    expect([lua.detalhe, terra.detalhe]).toEqual(['lua', 'planeta']);
    // e a camada de nomes desligada não cala o roteiro, como nas estrelas
    expect(noFilme({ target: ['moon', 'earth'], nomesEscondidos: true }).lista.map((l) => l.key))
      .toEqual(['corpo:moon', 'corpo:earth']);
  });

  it('E4c: o assunto passa INTEIRO pela projeção do Atlas e acende no holofote', () => {
    // a Lua a ~0,005 pc da câmera: dentro do sistema, onde o fade de
    // distância do Atlas não morde (a bancada mede em pc de brinquedo)
    const perto = new THREE.Vector3(0.001, 0.0005, 4.995);
    const { lista, cam } = noFilme({ target: ['moon', 'earth'], lua: perto });
    const [lua, terra] = lista;
    const [doAtlas] = projectCorpos(
      cam, LUAS_DO_SISTEMA.filter((l) => l.id === 'moon'), Float32Array.of(perto.x, perto.y, perto.z)
    );
    // nada copiado à mão: o que o Atlas projeta, mais o que faz dele assunto
    // (e os discos do quadro, que a publicação dá a todo nome, e o raio do
    // assunto, que recua o texto dele, A5)
    expect(lua).toEqual({
      ...doAtlas,
      dirigido: true,
      alfaDoTexto: ALFA_DO_TEXTO_APONTADO,
      alfaDoIcone: ALFA_DO_TEXTO_APONTADO,
      discos: lua.discos,
      raioDoAssunto: lua.raioDoAssunto,
    });
    expect(lua.raioDoAssunto).toBeGreaterThan(0);
    expect(lua.opacity).toBe(0.95);
    // classe, prioridade e canal ficam — lua no secundário, planeta no primário
    expect([lua.prioridade, terra.prioridade]).toEqual([
      PRIORIDADE_DO_ROTULO.lua, PRIORIDADE_DO_ROTULO.planeta,
    ]);
    expect([lua.canalPrimario, terra.canalPrimario]).toEqual([false, true]);
    // e os dois no holofote: o alfa do ponteiro do Atlas, para lua e planeta
    expect([lua.alfaDoTexto, terra.alfaDoTexto]).toEqual([1, 1]);
  });

  it('E4c: o nome AMBIENTE do filme segue a tabela do Atlas — a estrela apagada', () => {
    const estrela: NamedStar = { n: 'Fundo', x: 2, y: 1, z: -5, m: 1, s: 'A0V', d: 10, t: 0 };
    const { lista } = noFilme({
      target: ['moon'], quiet: false, named: [estrela], lua: new THREE.Vector3(0.001, 0.0005, 4.995),
    });
    const fundo = lista.find((l) => l.key === 'Fundo')!;
    // QUEM entra é o de sempre (o fundo não é dirigido); o COMO é o do Atlas
    expect(fundo.dirigido).toBeUndefined();
    expect(fundo.alfaDoTexto).toBe(ALFA_DO_TEXTO_SECUNDARIO);
    expect(lista.find((l) => l.key === 'corpo:moon')!.alfaDoTexto).toBe(ALFA_DO_TEXTO_APONTADO);
  });

  /**
   * A5 (regra do dono, 21/11): a Lua DE VERDADE (`raioDoAssuntoPc`) no meio
   * do quadro, com a câmera na distância em que o disco mede `r` de raio
   * NDC (meia-altura, lente de 58°, tela 1,6). O centro fica longe do Sol
   * (a origem) e num valor que o Float32 guarda exato.
   */
  const RAIO_DA_LUA = raioDoAssuntoPc('moon')!;
  const LUA_NA_CHEGADA = new THREE.Vector3(Math.fround(1e-5), 0, 0);
  /** a câmera onde a Lua real mede `r` de raio NDC — a inversa exata de `raioAparenteNdc` */
  function cameraNaChegada(r: number) {
    const t = r * Math.tan(THREE.MathUtils.degToRad(58) / 2);
    const d = (RAIO_DA_LUA * Math.sqrt(1 + t * t)) / t;
    const cam = new THREE.PerspectiveCamera(58, 1.6, d * 1e-3, d * 1e3);
    cam.position.set(LUA_NA_CHEGADA.x, 0, d);
    cam.lookAt(LUA_NA_CHEGADA);
    cam.updateMatrixWorld();
    return cam;
  }
  /** o nome dirigido da Lua no filme com o disco a `r` de raio NDC */
  function luaDirigida(r: number): StarLabel | undefined {
    const publicadas: StarLabel[][] = [];
    const rotulos = new Rotulos({
      onLabels: (l) => publicadas.push(l),
      onDest: () => {},
      onSol: () => {},
      onLente: () => {},
      onCamera: () => {},
      beatDaViagem: () => ({ target: ['moon'], quiet: true }) as JourneyMeta,
      raioFisicoDe: (id) => (id === 'moon' ? RAIO_DA_LUA : null),
    });
    const posicoes = new Float32Array(CORPOS_DO_SISTEMA.length * 3).fill(Number.NaN);
    const planetas = { points: { visible: true }, posicoes } as unknown as Planetas;
    rotulos.escreverPosicaoDeLua('moon', LUA_NA_CHEGADA);
    rotulos.projetar(cameraNaChegada(r), {
      fase: 'journey', named: [], dHome: 5, planetas, foco: null,
      nomesEscondidos: false, iconesEscondidos: false, texto3d: false,
    });
    return publicadas.at(-1)!.find((l) => l.key === 'corpo:moon');
  }

  it('A5: o nome dirigido fica INTEIRO com o disco de 0,02 a 0,10 de raio — onde o Atlas já o calou', () => {
    for (const r of [0.02, 0.025, 0.03, 0.035, 0.05, 0.07, 0.1]) {
      expect(luaDirigida(r)?.opacity, `r = ${r}`).toBe(0.95);
    }
    // e o nome leva o disco do próprio corpo, de onde o `LabelCanvas` conta
    // o recuo do limbo (raio na fração da altura: metade do raio NDC)
    const proprio = luaDirigida(0.05)?.discos?.find((d) => d.chave === 'corpo:moon');
    expect(proprio?.raio).toBeCloseTo(0.025, 6);
  });

  it('A5: a partir de 0,35 de raio (o retrato do quadro) o nome dirigido sai da lista', () => {
    for (const r of [0.35, 0.4, 0.6, 1]) expect(luaDirigida(r), `r = ${r}`).toBeUndefined();
  });

  it('A5: entre os dois o nome cai sem degrau — pela geometria, não pelo relógio', () => {
    // um passo de 0,01 de raio: a rampa (`smoothstep` de 0,12 a 0,35) tem
    // inclinação máxima 1,5/0,23, então nenhum passo tira mais que ~0,062
    const serie: number[] = [];
    for (let r = 0.1; r < 0.35; r += 0.01) serie.push(luaDirigida(r)?.opacity ?? 0);
    expect(serie[0]).toBe(0.95);
    expect(serie.at(-1)!).toBeGreaterThan(0);
    for (let i = 1; i < serie.length; i++) {
      expect(serie[i], `passo ${i}`).toBeLessThanOrEqual(serie[i - 1]);
      expect(serie[i - 1] - serie[i], `passo ${i}`).toBeLessThan(0.065);
    }
    // o mesmo quadro dá o mesmo nome, sem memória do anterior
    expect(luaDirigida(0.2)?.opacity).toBe(luaDirigida(0.2)?.opacity);
  });

  it('A5: o Atlas não muda — a mesma Lua cede de 0,02 a 0,03, como antes', () => {
    const lua = LUAS_DO_SISTEMA.filter((l) => l.id === 'moon');
    const pos = Float32Array.of(LUA_NA_CHEGADA.x, LUA_NA_CHEGADA.y, LUA_NA_CHEGADA.z);
    const noAtlas = (r: number) => projectCorpos(cameraNaChegada(r), lua, pos, undefined, () => RAIO_DA_LUA)[0];
    expect(noAtlas(0.015).opacity).toBe(0.95);
    expect(noAtlas(0.025).opacity).toBeCloseTo(0.95 * 0.5, 2);
    expect(noAtlas(0.035).causaDoSumico).toBe('tamanho');
  });

  it('B.0: o veredito do detalhe de um quadro vira, no seguinte, a rampa de 300 ms', () => {
    const publicadas: StarLabel[][] = [];
    const rotulos = new Rotulos({
      onLabels: (l) => publicadas.push(l),
      onDest: () => {},
      onSol: () => {},
      onLente: () => {},
      onCamera: () => {},
      beatDaViagem: () => ({ target: ['moon'], quiet: true }) as JourneyMeta,
      raioFisicoDe: (id) => (id === 'moon' ? RAIO_DA_LUA : null),
    });
    const posicoes = new Float32Array(CORPOS_DO_SISTEMA.length * 3).fill(Number.NaN);
    const planetas = { points: { visible: true }, posicoes } as unknown as Planetas;
    rotulos.escreverPosicaoDeLua('moon', LUA_NA_CHEGADA);
    const cam = cameraNaChegada(0.05);
    const quadro = () => {
      rotulos.tique(1 / 60);
      rotulos.projetar(cam, {
        fase: 'journey', named: [], dHome: 5, planetas, foco: null,
        nomesEscondidos: false, iconesEscondidos: false, texto3d: false,
      });
      return publicadas.at(-1)!.find((l) => l.key === 'corpo:moon')!;
    };
    // sem veredito, a lei de antes; o primeiro veredito faz nascer no alvo
    let lua = quadro();
    expect(lua.alfaDoDetalhe).toBeUndefined();
    // O QUE O `LabelCanvas` FAZ, encenado: ele escreve `detalheCabe` no nome
    lua.detalheCabe = true;
    lua = quadro();
    expect(lua.alfaDoDetalhe).toBe(1);
    const andar = (cabe: boolean) => {
      const serie: number[] = [];
      for (let i = 0; i < 24; i++) {
        lua.detalheCabe = cabe;
        lua = quadro();
        serie.push(lua.alfaDoDetalhe!);
      }
      for (let i = 1; i < serie.length; i++) {
        expect(Math.abs(serie[i] - serie[i - 1]), `quadro ${i}`).toBeLessThanOrEqual(1 / 60 / 0.3 + 1e-9);
      }
      return serie;
    };
    // 18 quadros de 1/60 s para descer, e outros 18 para subir
    expect(andar(false).indexOf(0)).toBe(17);
    expect(andar(true).indexOf(1)).toBe(17);
    // o nome que fica sem veredito perde a memória
    lua = quadro();
    expect(lua.alfaDoDetalhe).toBeUndefined();
  });

  it('B.0: a rampa do detalhe não atravessa o corte — a mesma chave nasce no alvo do plano novo', () => {
    const publicadas: StarLabel[][] = [];
    const rotulos = new Rotulos({
      onLabels: (l) => publicadas.push(l),
      onDest: () => {},
      onSol: () => {},
      onLente: () => {},
      onCamera: () => {},
      beatDaViagem: () => ({ target: ['moon'], quiet: true }) as JourneyMeta,
      raioFisicoDe: (id) => (id === 'moon' ? RAIO_DA_LUA : null),
    });
    const posicoes = new Float32Array(CORPOS_DO_SISTEMA.length * 3).fill(Number.NaN);
    const planetas = { points: { visible: true }, posicoes } as unknown as Planetas;
    rotulos.escreverPosicaoDeLua('moon', LUA_NA_CHEGADA);
    const cam = cameraNaChegada(0.05);
    let lua: StarLabel | undefined;
    // `cabe` é o veredito que o `LabelCanvas` escreveu no quadro anterior
    const quadro = (cabe: boolean, novoPlano = false) => {
      if (lua) lua.detalheCabe = cabe;
      rotulos.tique(1 / 60);
      rotulos.projetar(cam, {
        fase: 'journey', named: [], dHome: 5, planetas, foco: null, novoPlano,
        nomesEscondidos: false, iconesEscondidos: false, texto3d: false,
      });
      lua = publicadas.at(-1)!.find((l) => l.key === 'corpo:moon')!;
      return lua.alfaDoDetalhe;
    };
    quadro(true);
    expect(quadro(true)).toBe(1);
    // cabia → não cabe: no corte o veredito é do plano velho e não conta
    // (a lei de antes decide na câmera nova); no quadro seguinte, 0 seco
    expect(quadro(true, true)).toBeUndefined();
    expect(quadro(false)).toBe(0);
    // não cabia → cabe: o mesmo, no outro sentido
    expect(quadro(false, true)).toBeUndefined();
    expect(quadro(true)).toBe(1);
    // sem corte a rampa continua a andar: 18 quadros de 1/60 s até o 0
    const serie = Array.from({ length: 24 }, () => quadro(false)!);
    expect(serie[0]).toBeCloseTo(1 - 1 / 60 / 0.3, 9);
    expect(serie.indexOf(0)).toBe(17);
  });

  it('sem target, o filme não escreve corpo nenhum — só a régua de sempre', () => {
    const { lista } = noFilme({ quiet: false });
    expect(lista.map((l) => l.key)).toEqual(['sol-home']);
  });

  it('fora do quadro, atrás de outro globo ou sem posição, a etiqueta some', () => {
    expect(noFilme({ target: ['moon'], lua: new THREE.Vector3(0, 0, 9) }).lista).toEqual([]);
    // atrás da Terra, dentro do cone dela (e fora do cone do Sol)
    expect(noFilme({ target: ['moon'], lua: new THREE.Vector3(0.05, 0, -1) }).lista).toEqual([]);
    expect(noFilme({ target: ['moon'], lua: new THREE.Vector3(NaN, NaN, NaN) }).lista).toEqual([]);
  });

  it('Ceres, anão sem ponto na camada, tem nome onde o palco o desenha e cede ao globo como a lua (19/11)', () => {
    const { lista, cam } = noFilme({ target: ['ceres'] });
    expect(lista.map((l) => [l.key, l.name, l.detalhe, l.dirigido])).toEqual([
      ['corpo:ceres', 'Ceres', 'planeta anão', true],
    ]);
    const p = CERES.clone().project(cam);
    expect([lista[0].x, lista[0].y]).toEqual([(p.x + 1) / 2, (1 - p.y) / 2]);
    // atrás da Terra a mesma régua das luas o cala; sem efeméride, também
    expect(noFilme({ target: ['ceres'], ceres: new THREE.Vector3(0.05, 0, -1) }).lista).toEqual([]);
    expect(noFilme({ target: ['ceres'], ceres: new THREE.Vector3(NaN, NaN, NaN) }).lista).toEqual([]);
  });

  it('o nome é o da língua de agora', () => {
    definirIdioma('en');
    const [lua] = noFilme({ target: ['moon'] }).lista;
    expect([lua.name, lua.detalhe]).toEqual(['Moon', 'moon']);
  });

  it('o id não vira estrela: "atlas" é a lua de Saturno, "Atlas" a estrela das Plêiades', () => {
    const atlas: NamedStar = { n: 'Atlas', x: -50, y: 20, z: -200, m: 3.6, s: 'B8III', d: 136, t: 0 };
    const lista = noFilme({ target: ['atlas', 'Atlas'], named: [atlas] }).lista;
    expect(lista.map((l) => [l.key, l.name, l.detalhe ?? l.spect])).toEqual([
      ['corpo:atlas', 'Atlas', 'lua'],
      ['Atlas', 'Atlas', 'B8III'],
    ]);
  });

  it('filme estelar: um lugar, uma companheira e um exoplaneta ganham nome, os dois últimos na data do filme', async () => {
    const { posicaoDaCompanheira, estrelaVisitavelPorNome } = await import('../../lib/atlas/estrelasVisitaveis');
    const sirius = new THREE.Vector3(-0.4944, 2.4768, -0.7584);
    // a linha do catálogo, arredondada: ~40 UA de onde o corpo é desenhado
    const siriusDoNome: NamedStar = { n: 'Sirius', x: -0.4945, y: 2.4769, z: -0.7585, m: -1.44, s: 'A0m...', d: 2.64, t: 0 };
    const trappist = new THREE.Vector3(5, 10, -2);
    const anfitria = (nome: string) => (nome === 'Sirius' ? sirius : nome === 'TRAPPIST-1' ? trappist : null);
    /** o nome do assunto, com a câmera a `d` pc de `alvo` olhando para ele, no instante `jd` */
    const nomeDe = (assunto: string, alvo: THREE.Vector3, d: number, jd: number) => {
      const publicadas: StarLabel[][] = [];
      const rotulos = new Rotulos({
        onLabels: (l) => publicadas.push(l),
        onDest: () => {},
        onSol: () => {},
        onLente: () => {},
        onCamera: () => {},
        beatDaViagem: () => ({ target: [assunto], quiet: true }) as JourneyMeta,
        raioFisicoDe: () => null,
      });
      const cam = new THREE.PerspectiveCamera(40, 1.6, 1e-9, 1e5);
      cam.position.copy(alvo).add(new THREE.Vector3(0, 0, d));
      cam.lookAt(alvo);
      cam.updateMatrixWorld();
      rotulos.projetar(cam, {
        fase: 'journey', named: [siriusDoNome], dHome: cam.position.length(), planetas: null, foco: null,
        nomesEscondidos: false, iconesEscondidos: false, texto3d: false, jd,
        posicaoDaEstrelaComLugar: anfitria,
      });
      return { l: publicadas.at(-1)![0], cam };
    };
    // o lugar: o centro da tabela da Busca, a classe na língua da tela
    const orion = lugares.LUGARES_DA_BUSCA.find((l) => l.id === 'nebulosa-de-orion')!;
    const centro = new THREE.Vector3(orion.x, orion.y, orion.z);
    const neb = nomeDe('Nebulosa de Órion', centro, 30, 2461042).l;
    expect([neb.key, neb.name, neb.detalhe, neb.dirigido]).toEqual([
      'lugar:nebulosa-de-orion', 'Nebulosa de Órion', 'nebulosa de emissão', true,
    ]);
    expect([neb.x, neb.y]).toEqual([0.5, 0.5]);
    // a companheira: na órbita de Bond 2017, no instante pedido — e em
    // outro instante, noutro lugar
    const sir = estrelaVisitavelPorNome('Sirius')!;
    const ondeB = (jd: number) => {
      const d = sirius.length();
      const r = posicaoDaCompanheira(jd, sir.companheira!.orbita, [sirius.x / d, sirius.y / d, sirius.z / d], d);
      return sirius.clone().add(new THREE.Vector3(...r));
    };
    for (const jd of [2461042, 2461042 + 3650]) {
      const { l, cam } = nomeDe('Sirius B', sirius, 1e-3, jd);
      const p = ondeB(jd).project(cam);
      expect([l.key, l.name, l.spect]).toEqual(['Sirius B', 'Sirius B', 'DA2']);
      expect(l.x).toBeCloseTo((p.x + 1) / 2, 12);
      expect(l.y).toBeCloseTo((1 - p.y) / 2, 12);
    }
    expect(ondeB(2461042).distanceTo(ondeB(2461042 + 3650))).toBeGreaterThan(1e-5);
    // a estrela com corpo tem o nome no corpo, não na linha do catálogo
    const a = nomeDe('Sirius', sirius, 1e-3, 2461042).l;
    expect([a.key, a.x, a.y]).toEqual(['Sirius', 0.5, 0.5]);
    // o exoplaneta: pelo apelido da Busca, onde o Atlas o põe naquele dia
    const e = exo.posicaoDoExoplanetaNaCena('trappist-1e', 2461042, trappist)!;
    const { l: planeta, cam } = nomeDe('TRAPPIST-1e', trappist, 1e-6, 2461042);
    const p = e.clone().project(cam);
    expect([planeta.key, planeta.name, planeta.detalhe]).toEqual([
      'exoplaneta:trappist-1e', 'TRAPPIST-1 e', 'exoplaneta',
    ]);
    expect(planeta.x).toBeCloseTo((p.x + 1) / 2, 12);
  });
});

describe('os nomes na escala da galáxia (crítica de 12/11)', () => {
  /** 12/11/2026, dentro da janela das cinco sondas */
  const JD = 2461357;

  function noAtlas(cam: THREE.PerspectiveCamera, extra: Partial<QuadroDeRotulos> = {}) {
    const rotulos = new Rotulos({
      onLabels: () => {},
      onDest: () => {},
      onSol: () => {},
      onLente: () => {},
      onCamera: () => {},
      beatDaViagem: () => ({}) as JourneyMeta,
      raioFisicoDe: () => null,
    });
    cam.updateMatrixWorld(true);
    const quadro: QuadroDeRotulos = {
      fase: 'atlas', named: [], dHome: cam.position.length(), planetas: null, foco: null,
      nomesEscondidos: false, iconesEscondidos: false, texto3d: false, jd: JD, ...extra,
    };
    rotulos.tique(1);
    rotulos.projetar(cam, quadro);
    return rotulos.alvos;
  }

  /** a câmera a `d` pc do Sol, olhando para ele */
  function olhandoOSol(d: number) {
    const cam = new THREE.PerspectiveCamera(50, 1.6, 1e-9, 1e7);
    cam.position.set(0, d * 0.6, d * 0.8);
    cam.lookAt(0, 0, 0);
    return cam;
  }

  it('de onde o sistema solar é um pixel, o nome ali é o do Sol — a sonda em foco colada nele cala', () => {
    const lista = noAtlas(olhandoOSol(8000), { focoSonda: 'voyager-1' });
    const sol = lista.find((l) => l.key === 'sol-home')!;
    expect(sol.prioridade).toBe(PRIORIDADE_DO_ROTULO.sol);
    const sondas = lista.filter((l) => l.key.startsWith('sonda:'));
    expect(sondas.map((s) => [s.key, s.opacity])).toEqual([['sonda:voyager-1', 0]]);
  });

  it('no sistema solar, a sonda fora de foco não deixa marcador sem nome; em foco, tem nome e losango', () => {
    const cam = olhandoOSol(0.004);
    expect(noAtlas(cam).some((l) => l.key.startsWith('sonda:'))).toBe(false);
    const emFoco = noAtlas(cam, { focoSonda: 'voyager-1' }).find((l) => l.key === 'sonda:voyager-1');
    expect([emFoco?.icone, emFoco?.formaDoIcone, emFoco?.prioridade]).toEqual([
      undefined,
      'losango',
      PRIORIDADE_DO_ROTULO.foco,
    ]);
  });

  it('a sonda só tem nome com a câmera perto DELA, não só do lado dela (13/11, Urano e a Pioneer 10)', () => {
    const p = posicaoDaSondaNaCena('pioneer-10', JD)!;
    // a câmera a 19 UA do Sol, na direção da sonda (que está a 130+ UA):
    // mais perto dela do que ela do Sol, mas muito mais perto do Sol
    const cam = new THREE.PerspectiveCamera(50, 1.6, 1e-12, 1e7);
    cam.position.copy(p).setLength(19 / 206_265);
    cam.lookAt(p);
    expect(noAtlas(cam).some((l) => l.key === 'sonda:pioneer-10')).toBe(false);
    // a meio caminho entre ela e o Sol, sim: ali ela é o objeto do quadro
    cam.position.copy(p).multiplyScalar(0.7);
    cam.lookAt(p);
    const pioneer = noAtlas(cam).find((l) => l.key === 'sonda:pioneer-10');
    expect(pioneer && !pioneer.icone).toBe(true);
  });

  it('Sagittarius A✱ em foco tem nome a qualquer distância; fora de foco, só na vizinhança dele', () => {
    const cam = new THREE.PerspectiveCamera(50, 1.6, 1e-9, 1e7);
    cam.position.copy(GAL.GC_POS).add(new THREE.Vector3(0, 0, 5000));
    cam.lookAt(GAL.GC_POS);
    expect(noAtlas(cam).some((l) => l.key === 'sgr-a')).toBe(false);
    const centro = noAtlas(cam, { focoEstrela: 'Sagittarius A✱' }).find((l) => l.key === 'sgr-a')!;
    expect(centro.prioridade).toBe(PRIORIDADE_DO_ROTULO.foco);
    expect(centro.opacity).toBeGreaterThan(0.5);
    // o que ele é, na língua do visitante — não a sigla inglesa (13/11)
    expect([centro.spect, centro.detalhe]).toEqual(['', 'buraco negro']);
    definirIdioma('en');
    expect(noAtlas(cam, { focoEstrela: 'Sagittarius A✱' }).find((l) => l.key === 'sgr-a')!.detalhe).toBe('black hole');
    definirIdioma('pt-BR');
  });

  it('o cometa de perto é retrato: o nome dele cede, e estrela nenhuma é escrita sobre a cabeça (13/11)', async () => {
    const { posicaoDoCometaNaCena, poseDoCometaDePerto } = await import('../world/cometas');
    const jd = 2446471.0;
    const nucleo = posicaoDoCometaNaCena('halley', jd)!;
    const pose = poseDoCometaDePerto('halley', jd, 5.5)!;
    // a câmera a 2,5 cabeças do núcleo, olhando para ele; uma estrela atrás
    // da coma, a meio raio aparente do centro
    const cam = new THREE.PerspectiveCamera(58, 1.6, 1e-14, 1e7);
    const eixo = nucleo.clone().normalize();
    cam.position.copy(nucleo).addScaledVector(eixo, -2.5 * pose.raio);
    cam.lookAt(nucleo);
    cam.updateMatrixWorld(true);
    const lado = new THREE.Vector3(0, 1, 0).cross(eixo).normalize();
    const atras = nucleo.clone().addScaledVector(eixo, 10).addScaledVector(lado, 0.4 * (10 / 2.5));
    const estrela: NamedStar = { n: 'Atrás', x: atras.x, y: atras.y, z: atras.z, m: -1, s: 'A0V', d: 1, t: 0 };
    const alvos = noAtlas(cam, { named: [estrela], focoCometa: 'halley', jd });
    expect(alvos.find((l) => l.key === 'cometa:halley')!.causaDoSumico).toBe('tamanho');
    expect(alvos.find((l) => l.key === 'Atrás')?.opacity ?? 0).toBe(0);
  });

  it('o nome do lugar fica NO objeto, e a anã de Sagitário cala dentro do bojo', () => {
    const anaNoCentro = (dGC: number) => {
      const cam = new THREE.PerspectiveCamera(50, 1.6, 1e-9, 1e7);
      cam.position.copy(GAL.GC_POS).add(new THREE.Vector3(0, 0, dGC));
      cam.lookAt(CENTRO_DA_ANA_DE_SAGITARIO);
      cam.updateMatrixWorld(true);
      return projetarLugares(cam).find((l) => l.key === 'lugar:ana-de-sagitario');
    };
    expect(anaNoCentro(1e-5)).toBeUndefined();
    const longe = anaNoCentro(3000)!;
    // a câmera olha o centro da anã: o nome está no meio da tela
    expect([longe.x, longe.y].map((v) => Math.round(v * 100) / 100)).toEqual([0.5, 0.5]);
  });
});

describe('o retrato de perto (12/11): nada escrito sobre Saturno, a outra escala recua', () => {
  // MEDIDO no cartão "Saturno: os anéis, de perto": Pã, Jano e Pandora
  // escritos sobre os anéis, "NETUNO" no meio do quadro e nomes de
  // estrela em volta do planeta. Saturno na origem, a câmera a `d` raios.
  const R = raiosDoGigantePc('saturn').a;
  function quadro(dEmRaios: number, foco: string | null, olhaAoLado = 0) {
    const rotulos = new Rotulos({
      onLabels: () => {},
      onDest: () => {},
      onSol: () => {},
      onLente: () => {},
      onCamera: () => {},
      beatDaViagem: () => ({}) as JourneyMeta,
      raioFisicoDe: () => null,
    });
    const cam = new THREE.PerspectiveCamera(58, 1.6, R * 1e-3, 1e4);
    cam.position.set(0, R * dEmRaios * 0.45, R * dEmRaios);
    cam.lookAt(olhaAoLado * R, 0, 0);
    cam.updateMatrixWorld();
    const posicoes = new Float32Array(CORPOS_DO_SISTEMA.length * 3).fill(Number.NaN);
    const por = (id: string, x: number, y: number, z: number) => {
      const i = CORPOS_DO_SISTEMA.findIndex((c) => c.id === id);
      posicoes.set([x, y, z], i * 3);
    };
    por('saturn', 0, 0, 0);
    // Netuno no fundo, dentro do quadro
    por('neptune', -2e-5, 0, -1e-4);
    const planetas = { points: { visible: true }, posicoes } as unknown as Planetas;
    rotulos.escreverPosicaoDeLua('pan', new THREE.Vector3(2 * R, 0, 0));
    rotulos.escreverPosicaoDeLua('titan', new THREE.Vector3(20 * R, 0, 0));
    // Epimeteu a 1,08 raio do anel, na borda dele
    rotulos.escreverPosicaoDeLua('epimetheus', new THREE.Vector3(-2.51 * R, 0, 0));
    // uma estrela exatamente atrás do planeta
    const atras = new THREE.Vector3().copy(cam.position).multiplyScalar(-10 / cam.position.length());
    const fundo: NamedStar = { n: 'Fundo', x: atras.x, y: atras.y, z: atras.z, m: 1, s: 'A0V', d: 10, t: 0 };
    // um segundo de quadros: as rampas de entrada (250 ms) assentam
    for (let i = 0; i < 60; i++) {
      rotulos.tique(1 / 60);
      rotulos.projetar(cam, {
        fase: 'atlas', named: [fundo], dHome: 5, planetas, foco,
        nomesEscondidos: false, iconesEscondidos: false, texto3d: false,
      });
    }
    const op = (k: string) => rotulos.alvos.find((l) => l.key === k)?.opacity ?? 0;
    return {
      pa: op('corpo:pan'),
      epimeteu: op('corpo:epimetheus'),
      netuno: op('corpo:neptune'),
      tita: op('corpo:titan'),
      fundo: op('Fundo'),
    };
  }

  it('de perto: a lua sobre o anel, o outro planeta e a estrela atrás cedem', () => {
    const perto = quadro(8, 'saturn');
    expect(perto.pa).toBeLessThan(0.05);
    expect(perto.netuno).toBeLessThan(0.05);
    expect(perto.fundo).toBeLessThan(0.05);
    // sem foco a lua sobre o anel ainda cede; a outra escala fica
    const semFoco = quadro(8, null);
    expect(semFoco.pa).toBeLessThan(0.05);
    expect(semFoco.netuno).toBeGreaterThan(0.5);
    expect(semFoco.fundo).toBeGreaterThan(0.5);
  });

  it('a lua que está dentro do anel cede inteira, mesmo projetada fora do círculo (13/11)', () => {
    // Saturno à esquerda do quadro: a borda da lente estica a tela e
    // Epimeteu cai fora do círculo do anel medido no centro
    expect(quadro(6, 'saturn', 2.5).epimeteu).toBeLessThan(0.08);
    expect(quadro(6, null, 2.5).epimeteu).toBeLessThan(0.08);
  });

  it('na vista do sistema de Saturno nada muda: o foco não morde', () => {
    const longe = quadro(60, 'saturn');
    const semFoco = quadro(60, null);
    expect(longe).toEqual(semFoco);
    expect(longe.tita).toBeGreaterThan(0.5);
    expect(longe.netuno).toBeGreaterThan(0.5);
  });
});

describe('os nomes dentro de um lugar em foco (13/11)', () => {
  it('no próprio sistema o planeta diz a letra; o planeta em foco, o nome inteiro', async () => {
    const { SISTEMAS_PLANETARIOS } = await import('../../lib/exoplanetas');
    expect(['TRAPPIST-1 e', 'Proxima b', '55 Cancri e'].map(exo.nomeCurtoDoExoplaneta)).toEqual(['e', 'b', 'e']);
    const sistema = SISTEMAS_PLANETARIOS.find((s) => s.id === 'trappist-1') ?? SISTEMAS_PLANETARIOS[0];
    const pos = new THREE.Vector3(10, 0, 0);
    const cam = new THREE.PerspectiveCamera(50, 1.6, 1e-9, 1e3);
    cam.position.set(10, 0, 3e-6);
    cam.lookAt(pos);
    cam.updateMatrixWorld(true);
    const foco = sistema.planetas[3].id;
    const nomes = exo.projetarExoplanetas(cam, 2461357, { sistema, pos }, foco, true).map((l) => l.name);
    expect(nomes).toContain(sistema.planetas[3].nome);
    expect(nomes.filter((n) => n.length === 1).length).toBe(sistema.planetas.length - 1);
  });

  it('o lugar em foco: as companheiras têm nome e o nome do lugar sai do meio do grupo', () => {
    const andromeda = lugares.LUGARES_DA_BUSCA.find((l) => l.id === 'andromeda')!;
    const centro = new THREE.Vector3(andromeda.x, andromeda.y, andromeda.z);
    expect(lugares.lugarNoAlvo(centro)?.id).toBe('andromeda');
    expect(lugares.lugarNoAlvo(centro.clone().addScalar(1000))).toBeUndefined();
    const cam = new THREE.PerspectiveCamera(50, 1.6, 1, 1e8);
    cam.position.copy(centro).multiplyScalar(0.5);
    cam.lookAt(centro);
    cam.updateMatrixWorld(true);
    const companheiras = lugares.projetarCompanheiras(cam, 'andromeda');
    expect(companheiras.map((l) => l.name)).toEqual(['M32', 'M110']);
    const proprio = lugares.projetarLugares(cam).find((l) => l.key === 'lugar:andromeda')!;
    const yAntes = proprio.y;
    lugares.abrirVagaNoGrupo('andromeda', [proprio, ...companheiras]);
    const topo = Math.min(yAntes, ...companheiras.map((l) => l.y));
    expect(proprio.y).toBeCloseTo(topo - lugares.FOLGA_DO_NOME_DO_GRUPO, 6);
    expect(companheiras.every((l) => l.outroLado)).toBe(true);
  });

  it('o lugar em foco não perde o nome de perto, e tem o peso do foco (13/11, Grande Nuvem)', () => {
    const nuvem = lugares.LUGARES_DA_BUSCA.find((l) => l.id === 'grande-nuvem-de-magalhaes')!;
    const centro = new THREE.Vector3(nuvem.x, nuvem.y, nuvem.z);
    const cam = new THREE.PerspectiveCamera(58, 1.6, 1, 1e8);
    // a sete kpc, onde o "Aproximar" deixa a câmera: o raio da tabela passa dos 27°
    cam.position.copy(centro).add(new THREE.Vector3(0, 0, 7000));
    cam.lookAt(centro);
    cam.updateMatrixWorld(true);
    const chave = 'lugar:grande-nuvem-de-magalhaes';
    expect(lugares.projetarLugares(cam).some((l) => l.key === chave)).toBe(false);
    const emFoco = lugares.projetarLugares(cam, nuvem.id).find((l) => l.key === chave)!;
    expect(emFoco.opacity).toBeGreaterThan(0.9);
    expect(emFoco.prioridade).toBe(PRIORIDADE_DO_ROTULO.foco);
  });

  it('as estrelas-membro abrem a vaga; outro nome na linha de cima manda o do lugar para baixo', () => {
    const lugar = (x: number, y: number): StarLabel => ({
      name: 'Plêiades', spect: '', distPc: 1, x, y, opacity: 0.95, key: 'lugar:pleiades',
    });
    const estrela = (n: string, x: number, y: number): StarLabel => ({
      name: n, spect: '', distPc: 1, x, y, opacity: 0.92, key: n,
    });
    const p = lugar(0.32, 0.45);
    const membros = [estrela('Atlas', 0.28, 0.47), estrela('Electra', 0.36, 0.43)];
    lugares.abrirVagaNoGrupo('pleiades', [p, ...membros]);
    expect(p.y).toBeCloseTo(0.43 - lugares.FOLGA_DO_NOME_DO_GRUPO, 6);
    expect(membros.every((m) => m.outroLado)).toBe(true);
    const q = lugar(0.32, 0.45);
    lugares.abrirVagaNoGrupo('pleiades', [q, estrela('Atlas', 0.28, 0.47), estrela('Vizinha', 0.3, 0.385)]);
    expect(q.y).toBeCloseTo(0.47 + lugares.FOLGA_DO_NOME_DO_GRUPO, 6);
    // sem membro em quadro, o nome fica no centro
    const r = lugar(0.32, 0.45);
    lugares.abrirVagaNoGrupo('pleiades', [r]);
    expect(r.y).toBe(0.45);
  });
});

// ============================================================
// A LINHA DE RUMO RESOLVE TODO DESTINO DOS TRÊS FILMES (19/11/2026). O
// estelar dizia `destino: "Nebulosa de Órion"` e a linha nunca aparecia:
// ela só conhecia 'SGR' e as nomeadas. A prova corre sobre os roteiros de
// verdade e o catálogo de verdade (as nomeadas do boot com as anfitriãs,
// como em `filmes/estelar/montar.test.ts`), e cobra que o galáctico sai
// pelo caminho de sempre, número a número.
// ============================================================
describe('a linha de rumo resolve todo destino dos três filmes', () => {
  afterEach(() => definirIdioma('pt-BR'));

  it('cada destino tem lugar e nome; os do galáctico, o ponto do nome e o SGR de sempre', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const { comAnfitrias } = await import('../../lib/exoplanetas');
    const { destinoNaCena } = await import('./rotulos');
    const meta = JSON.parse(
      readFileSync(new URL('../../../public/data/stars_meta.json', import.meta.url), 'utf8')
    ) as { named: NamedStar[] };
    const named = comAnfitrias(meta.named);
    const raiz = new URL('../cinematic/roteiros/', import.meta.url);
    const destinos = (pasta: string) =>
      readdirSync(new URL(pasta, raiz)).filter((f) => f.endsWith('.json')).flatMap((f) => {
        const dado = JSON.parse(readFileSync(new URL(pasta + f, raiz), 'utf8')) as {
          planos?: { destino?: string }[];
        };
        return (dado.planos ?? []).flatMap((p) => (p.destino ? [p.destino] : []));
      });
    const galactico = destinos('');
    const v = new THREE.Vector3();
    for (const dest of [...galactico, ...destinos('solar/'), ...destinos('estelar/')]) {
      expect(destinoNaCena(dest, named, v), dest).not.toBeNull();
      expect([v.x, v.y, v.z].every(Number.isFinite), dest).toBe(true);
    }
    expect(new Set(galactico)).toEqual(new Set(['Alnilam', 'Betelgeuse', 'Antares', 'SGR']));
    for (const dest of galactico) {
      const rotulo = destinoNaCena(dest, named, v);
      if (dest === 'SGR') {
        expect([rotulo, v.equals(GAL.GC_POS)]).toEqual(['SAGITTARIUS A✱', true]);
      } else {
        const s = named.find((e) => e.n === dest)!;
        expect([rotulo, v.x, v.y, v.z]).toEqual([dest.toUpperCase(), s.x, s.y, s.z]);
      }
    }
    // o lugar: o centro da tabela da Busca, o nome na língua da tela
    const orion = lugares.LUGARES_DA_BUSCA.find((l) => l.id === 'nebulosa-de-orion')!;
    expect(destinoNaCena('Nebulosa de Órion', named, v)).toBe('NEBULOSA DE ÓRION');
    expect([v.x, v.y, v.z]).toEqual([orion.x, orion.y, orion.z]);
    definirIdioma('en');
    expect(destinoNaCena('Nebulosa de Órion', named, v)).toBe((orion.nomeEn ?? orion.nome).toUpperCase());
  });
});
