// Serve: chão — a galáxia de partículas devolve à placa o que criou quando o mundo é refeito, e a captura só espera a camada WebGPU onde ela desenha
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import type { CamadaPedida, CamadaWebgpu } from './galaxiaWebgpu/camadaWebgpu';

async function galaxiaDeTeste(pedirWebgpu?: () => CamadaPedida | null) {
  vi.stubGlobal('window', { location: { search: '' } });
  const { Galaxy } = await import('./galaxy');
  // duas partículas de disco (tipo 0) bastam para haver células
  const bright = new Float32Array(16);
  bright.set([0, 0, 0, 1, 1, 1, 2, 1], 0);
  bright.set([100, 0, 0, 1, 1, 1, 2, 1], 8);
  const mapa = new THREE.DataTexture(new Uint8Array(4), 1, 1);
  return new Galaxy({ bright, brightCount: 2 }, mapa, mapa, { soParticulas: true, tetoLodMilhoes: 1, pedirWebgpu });
}

describe('Galaxy.dispose (13/11/2026)', () => {
  it('solta a textura das células do nível de detalhe — sem ela cada troca de qualidade deixava uma textura na placa', async () => {
    const galaxia = await galaxiaDeTeste();
    const celulas = (galaxia as unknown as { lod: { textura: THREE.Texture } }).lod.textura;
    const soltou = vi.fn();
    celulas.addEventListener('dispose', soltou);
    galaxia.dispose();
    expect(soltou).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});

describe('a galáxia nova nasce com as camadas de AGORA (19/11/2026)', () => {
  it('a camada religada no painel continua ligada, e a desligada continua desligada', async () => {
    const galaxia = await galaxiaDeTeste();
    const vista = galaxia as unknown as { showGlow: boolean; showDisc: boolean };
    // o que a URL do boot semearia: o brilho desligado
    galaxia.setLayerHidden('noglow', true);
    galaxia.vestirCamadas(new Set(['nodisc', 'nocat']));
    expect(vista.showGlow).toBe(true);
    expect(vista.showDisc).toBe(false);
    galaxia.dispose();
    vi.unstubAllGlobals();
  });
});

describe('a captura espera a camada WebGPU só onde ela desenha (13/11/2026)', () => {
  it('de dentro do disco a camada a caminho não segura a captura; de fora, segura', async () => {
    const galaxia = await galaxiaDeTeste();
    galaxia.ligarWebgpu({ pronta: new Promise(() => {}), atrasou: new Promise(() => {}) }); // a camada nunca chega
    const cam = new THREE.Vector3(0, 0, 0);
    // dentro do disco: só a faixa local (externalFade 0) — a camada não entra
    galaxia.update(cam, 720, 0.55, 0, 0, 0, 0.76);
    expect(galaxia.desenhoEmVoo).toBe(false);
    // na subida (externalFade 0,6, o filme em t=148) a lei de longe já é dela: espera
    galaxia.update(cam, 720, 0.55, 0, 0.6, 0, 0.3);
    expect(galaxia.desenhoEmVoo).toBe(true);
    // de fora (externalFade 1) ela é toda a luz das partículas: espera
    galaxia.update(cam, 720, 0.55, 0, 1, 0, 0);
    expect(galaxia.desenhoEmVoo).toBe(true);
    galaxia.dispose();
    vi.unstubAllGlobals();
  });
});

describe('o WebGPU que atrasa ou cai avisa e tenta de novo (18/11/2026)', () => {
  it('atrasado: avisa, solta a captura e entra quando chega; caiu: a luz volta ao WebGL e avisa', async () => {
    const galaxia = await galaxiaDeTeste();
    const avisos: string[] = [];
    galaxia.aoMudarCaminho = () => avisos.push(`${galaxia.caminho}/${galaxia.webgpuACaminho}`);
    let chegar!: (c: CamadaWebgpu) => void;
    let estourar!: () => void;
    galaxia.ligarWebgpu({
      pronta: new Promise((r) => (chegar = r)),
      atrasou: new Promise((r) => (estourar = r)),
    });
    const fora = new THREE.Vector3(0, 0, 0);
    galaxia.update(fora, 720, 0.55, 0, 1, 0, 0);
    expect(galaxia.webgpuACaminho).toBe('subindo');
    expect(galaxia.desenhoEmVoo).toBe(true);
    estourar();
    await Promise.resolve();
    // passou do prazo: o painel é avisado e a captura para de esperar
    expect(galaxia.webgpuACaminho).toBe('atrasado');
    expect(galaxia.desenhoEmVoo).toBe(false);
    expect(avisos).toEqual(['particulas/atrasado']);
    const camada = { mesh: new THREE.Object3D(), falhou: false, pendentes: 0, update: vi.fn(), dispose: vi.fn() };
    chegar(camada as unknown as CamadaWebgpu);
    await Promise.resolve();
    // o atrasado entra em vez de ser descartado
    expect(galaxia.caminho).toBe('webgpu');
    expect(camada.dispose).not.toHaveBeenCalled();
    // cai em uso: no quadro seguinte a luz volta ao WebGL, e o painel sabe
    camada.falhou = true;
    galaxia.update(fora, 720, 0.55, 0, 1, 0, 0);
    expect(galaxia.caminho).toBe('particulas');
    expect(camada.dispose).toHaveBeenCalledOnce();
    expect(avisos.at(-1)).toBe('particulas/null');
    galaxia.dispose();
    vi.unstubAllGlobals();
  });

  it('a queda vale pela página até o visitante pedir de novo', async () => {
    vi.stubGlobal('window', { location: { search: '' }, setTimeout: () => 0 });
    vi.stubGlobal('OffscreenCanvas', class {});
    vi.stubGlobal('navigator', {}); // sem WebGPU
    const webgpu = await import('./galaxiaWebgpu/camadaWebgpu');
    const pedir = () => webgpu.CamadaWebgpu.criar(new Promise(() => {}), 1, () => new Promise(() => {})).pronta;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await pedir()).toBeNull();
    expect(webgpu.webgpuFalhouNestaPagina()).toBe(true);
    expect(webgpu.motivoDaQuedaDoWebgpu()).toBe('semWebgpu');
    webgpu.esquecerQuedaDoWebgpu();
    expect(webgpu.webgpuFalhouNestaPagina()).toBe(false);
    // tentar de novo tenta de verdade (e aqui cai de novo, pelo mesmo motivo)
    expect(await pedir()).toBeNull();
    expect(webgpu.motivoDaQuedaDoWebgpu()).toBe('semWebgpu');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});

describe('a camada WebGPU só onde a câmera pode vir a vê-la (19/11/2026)', () => {
  it('a regra: filme com a galáxia pede; filme sem ela, nunca; sem filme, pela distância; solta após 5 s', async () => {
    vi.stubGlobal('window', { location: { search: '' } });
    const { destinoDaCamadaWebgpu, SEGUNDOS_SEM_QUERER_PARA_SOLTAR } = await import('./galaxy');
    const { LIMIAR_SISTEMA_SOLAR_PC } = await import('../escala');
    const longe = LIMIAR_SISTEMA_SOLAR_PC * 1.01;
    expect(SEGUNDOS_SEM_QUERER_PARA_SOLTAR).toBe(5);
    // o galáctico em cena, ainda em casa: pedida (o nascimento fica na carga)
    expect(destinoDaCamadaWebgpu({ fase: 'intro', revealT: 146, dHomePc: 1e-8 }, 999)).toBe('pedir');
    // um filme sem galáxia longe de casa (o estelar): não pedida, solta após 5 s
    expect(destinoDaCamadaWebgpu({ fase: 'journey', revealT: null, dHomePc: 400 }, 4.9)).toBe('manter');
    expect(destinoDaCamadaWebgpu({ fase: 'journey', revealT: null, dHomePc: 400 }, 5)).toBe('soltar');
    // voo livre longe: pedida, qualquer que seja o filme em cartaz
    expect(destinoDaCamadaWebgpu({ fase: 'free', revealT: null, dHomePc: longe }, 999)).toBe('pedir');
    // Atlas em casa, mesmo com o galáctico em cartaz: solta após 5 s
    expect(destinoDaCamadaWebgpu({ fase: 'atlas', revealT: 146, dHomePc: 1e-8 }, 4.9)).toBe('manter');
    expect(destinoDaCamadaWebgpu({ fase: 'atlas', revealT: 146, dHomePc: 1e-8 }, 5)).toBe('soltar');
    vi.unstubAllGlobals();
  });

  it('o revealT diz a verdade: tem galáxia a revelar o filme cujo caminho sai do disco, e só ele', async () => {
    vi.stubGlobal('window', { location: { search: '' } });
    const { FILMES_EM_CARTAZ, filmeDe } = await import('../cinematic/filme');
    const { dentroDoDisco } = await import('./galaxy');
    for (const id of FILMES_EM_CARTAZ) {
      const { journey, revealT } = filmeDe(id);
      // o caminho da câmera a cada 0,1 s
      let saiDoDisco = false;
      for (let i = 0; i <= Math.round(journey.duration * 10) && !saiDoDisco; i++) {
        saiDoDisco = dentroDoDisco(journey.at(i / 10).pos) < 1;
      }
      expect(revealT !== null, id).toBe(saiDoDisco);
    }
    vi.unstubAllGlobals();
  });

  it('pede uma vez só; solta a que voa e a retoma se voltar a ser querida; solta a que chegou', async () => {
    let chegar!: (c: CamadaWebgpu | null) => void;
    const pedir = vi.fn(
      (): CamadaPedida => ({ pronta: new Promise((r) => (chegar = r)), atrasou: new Promise(() => {}) })
    );
    const galaxia = await galaxiaDeTeste(pedir);
    const camada = () => ({ mesh: new THREE.Object3D(), falhou: false, pendentes: 0, update: vi.fn(), dispose: vi.fn() });
    // não querida, carga fria: nada pedido
    galaxia.seguirCamadaWebgpu('manter');
    expect(pedir).not.toHaveBeenCalled();
    // querida: um pedido, e nunca dois
    galaxia.seguirCamadaWebgpu('pedir');
    galaxia.seguirCamadaWebgpu('pedir');
    expect(pedir).toHaveBeenCalledOnce();
    expect(galaxia.webgpuACaminho).toBe('subindo');
    // soltar com ela em voo: deixa de ser esperada; querida de novo, é retomada
    galaxia.seguirCamadaWebgpu('soltar');
    expect(galaxia.webgpuACaminho).toBeNull();
    galaxia.seguirCamadaWebgpu('pedir');
    expect(pedir).toHaveBeenCalledOnce();
    const primeira = camada();
    chegar(primeira as unknown as CamadaWebgpu);
    await Promise.resolve();
    expect(galaxia.caminho).toBe('webgpu');
    // deixou de ser querida: solta, e o WebGL volta a desenhar
    galaxia.seguirCamadaWebgpu('manter');
    expect(primeira.dispose).not.toHaveBeenCalled();
    galaxia.seguirCamadaWebgpu('soltar');
    expect(primeira.dispose).toHaveBeenCalledOnce();
    expect(galaxia.caminho).toBe('particulas');
    // pedida de novo e solta antes de chegar: descartada ao chegar
    galaxia.seguirCamadaWebgpu('pedir');
    galaxia.seguirCamadaWebgpu('soltar');
    const segunda = camada();
    chegar(segunda as unknown as CamadaWebgpu);
    await Promise.resolve();
    expect(pedir).toHaveBeenCalledTimes(2);
    expect(segunda.dispose).toHaveBeenCalledOnce();
    expect(galaxia.caminho).toBe('particulas');
    // mundo descartado com uma em voo: descartada ao chegar
    galaxia.seguirCamadaWebgpu('pedir');
    galaxia.dispose();
    const terceira = camada();
    chegar(terceira as unknown as CamadaWebgpu);
    await Promise.resolve();
    expect(terceira.dispose).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('com a camada solta pela regra, o painel recebe webgpu sem queda; o console, partículas', async () => {
    const galaxia = await galaxiaDeTeste(() => null);
    const webgpu = await import('./galaxiaWebgpu/camadaWebgpu');
    webgpu.esquecerQuedaDoWebgpu(); // o teste da queda acima a deixa marcada
    const avisos = vi.spyOn(console, 'info').mockImplementation(() => {});
    galaxia.anunciarCaminho();
    expect(avisos).toHaveBeenLastCalledWith('[galáxia] desenhando: particulas');
    expect(galaxia.caminhoNoPainel).toBe('webgpu');
    // a queda que o Director publica, pelo texto dele
    const fonte = readFileSync(new URL('../director.ts', import.meta.url), 'utf8');
    const cabeca = '  private quedaDaGalaxia(): QuedaDaGalaxia | null {\n';
    const i = fonte.indexOf(cabeca);
    const corpo = fonte.slice(i + cabeca.length, fonte.indexOf('\n  }\n', i));
    const queda = () =>
      new Function('motivoDaQuedaDoWebgpu', `return function () {\n${corpo}\n};`)(webgpu.motivoDaQuedaDoWebgpu).call({
        galaxy: galaxia,
        trocaPedida: null,
        galaxiaForcada: null,
        engine: { preset: { galaxia: 'webgpu' } },
      });
    expect(fonte).toContain('galaxiaViva: this.galaxy?.caminhoNoPainel');
    expect(queda()).toBeNull();
    galaxia.dispose();
    avisos.mockRestore();
    vi.unstubAllGlobals();
  });
});

describe('a cópia JS das partículas sai do heap mesmo de fora do disco (13/11/2026)', () => {
  it('o modo só-partículas sobe o buffer na carga, sem esperar o WebGL desenhar', () => {
    // De fora quem desenha é a camada WebGPU; sem a subida na carga o
    // `onUpload` nunca rodava e os 122,7 MiB do cinema ficavam no heap
    // (medido: 462 MB contra 141). Precisa de GPU: o contrato é o texto.
    const fonte = readFileSync(new URL('./galaxy.ts', import.meta.url), 'utf8');
    const bake = fonte.slice(fonte.indexOf('  async bakeDiscLayers('));
    const ramo = bake.slice(bake.indexOf('if (this.soParticulas) {'), bake.indexOf('const bakeScene'));
    expect(ramo).toMatch(/this\.subirPontos\(renderer\)/);
    expect(fonte).toMatch(/brightBuffer\.onUpload\(/);
  });
});
