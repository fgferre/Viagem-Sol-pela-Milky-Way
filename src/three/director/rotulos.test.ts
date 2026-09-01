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
import { ORCAMENTO_DE_NOMES, PRIORIDADE_DO_ROTULO } from '../world/labels';
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
    const { passo, alfaDe, publicadas } = bancadaDoCeu();
    // onze estrelas: o orçamento de nomes é dez, então E11 já nasce
    // cortada e as dez primeiras assentam cheias
    const onze = ceu(11);
    for (let i = 0; i < 40; i++) passo(onze);
    expect(alfaDe('E10')).toBe(CHEIO);
    // chega uma estrela MAIS PERTO que todas: ela toma a última vaga e
    // E10 passa a ser a cortada
    const doze = [estrela('NOVA', 2.5, 12), ...onze];
    let saindo = 0;
    let entrando = 0;
    for (let i = 0; i < 60; i++) {
      passo(doze);
      if (intermediario(alfaDe('E10'))) saindo++;
      if (intermediario(alfaDe('NOVA'))) entrando++;
    }
    expect(saindo).toBe(44);
    expect(entrando).toBe(14);
    // a assimetria é o produto: sair custa três vezes o entrar
    expect((saindo + 1) / (entrando + 1)).toBe(3);
    // e no fim a cortada está APAGADA e volta a ser corte da régua
    const E10 = publicadas.at(-1)?.find((l) => l.key === 'E10');
    expect(E10?.opacity).toBe(0);
    expect(E10?.cortadoPelaRegua).toBe(true);
  });

  it('enquanto desce, o nome cortado volta à lista como `saindo` — imagem, não vaga', () => {
    const { passo, publicadas } = bancadaDoCeu();
    const onze = ceu(11);
    for (let i = 0; i < 40; i++) passo(onze);
    const doze = [estrela('NOVA', 2.5, 12), ...onze];
    passo(doze);
    const E10 = publicadas.at(-1)?.find((l) => l.key === 'E10');
    // a régua CORTOU (e é ela quem manda em quem ocupa); a rampa devolve
    // o rótulo à pintura sem devolver a vaga
    expect(E10?.saindo).toBe(true);
    expect(E10?.cortadoPelaRegua).toBeFalsy();
    // quem já estava fora e apagado continua fora: E11 nunca acendeu
    expect(publicadas.at(-1)?.find((l) => l.key === 'E11')?.opacity).toBe(0);
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
    const chaves = noAtlasComGlobo(0.3);
    expect(chaves).not.toContain('Atrás');
    // e a vizinha, fora do cone, continua na tela — o disco esconde o
    // que está atrás DELE, não a metade do céu
    expect(chaves).toContain('AoLado');
    // a própria Terra segue com nome: nenhum corpo é oclusor de si
    expect(chaves).toContain('corpo:earth');
  });
});

describe('a histerese da régua enxerga o quadro ANTERIOR (item 120)', () => {
  /**
   * UM CÉU CHEIO O BASTANTE PARA A RÉGUA CORTAR. `ORCAMENTO_DE_NOMES` é
   * 10; catorze estrelas do mesmo tier (mesma prioridade) põem quatro
   * nomes do lado de fora, e o desempate entre pesos iguais é a
   * DISTÂNCIA — então quem é cortado é o mais longe. É exatamente a
   * disputa em que o bônus de 20% de `pesoDoRotulo` decide.
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

  it('a bancada CORTA de verdade — sem corte não há o que a histerese decida', () => {
    const { rotulos, passo } = bancadaCheia();
    passo();
    const cortados = rotulos.alvos.filter((l) => l.cortadoPelaRegua);
    expect(cortados.length).toBeGreaterThan(0);
    expect(rotulos.alvos.length - cortados.length).toBe(ORCAMENTO_DE_NOMES);
  });

  it('quem o DESENHO marcou no quadro anterior sobrevive ao corte no seguinte', () => {
    const { rotulos, passo } = bancadaCheia();
    passo();
    // o pior colocado do primeiro quadro: cortado pela régua
    const perdedor = rotulos.alvos.filter((l) => l.cortadoPelaRegua).at(-1)!.key;

    // O QUE O `LabelCanvas` FAZ, encenado: ele escreve `desenhado` nos
    // objetos que o Director guarda em `lastLabels`, DEPOIS deste tique.
    for (const l of rotulos.alvos) l.desenhado = l.key === perdedor;

    passo();
    const depois = rotulos.alvos.find((l) => l.key === perdedor)!;
    expect(depois.cortadoPelaRegua).toBeFalsy();
  });

  it('...e sem a marca ele continua cortado — a diferença é a marca, não a bancada', () => {
    const { rotulos, passo } = bancadaCheia();
    passo();
    const perdedor = rotulos.alvos.filter((l) => l.cortadoPelaRegua).at(-1)!.key;
    // ninguém marcado: é o mesmo segundo quadro, sem a única diferença
    for (const l of rotulos.alvos) l.desenhado = false;
    passo();
    expect(rotulos.alvos.find((l) => l.key === perdedor)!.cortadoPelaRegua).toBe(true);
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
