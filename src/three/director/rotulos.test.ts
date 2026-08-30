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
import { beforeAll, describe, expect, it } from 'vitest';
import type { JourneyMeta } from '../cinematic/journey';
import type { NamedStar } from '../config';
import { CORPOS_DO_SISTEMA } from '../atlasConfig';
import type { Planetas } from '../world/planetas/planetas';
import type { StarLabel } from '../world/labels';
import type { Rotulos as TipoRotulos, QuadroDeRotulos } from './rotulos';

let Rotulos: typeof TipoRotulos;

beforeAll(async () => {
  (globalThis as unknown as { window: unknown }).window = { location: { search: '' } };
  ({ Rotulos } = await import('./rotulos'));
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
