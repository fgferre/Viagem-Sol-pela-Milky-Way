// ============================================================
// ENSAIO WebGPU DA GALÁXIA DE PARTÍCULAS — página de teste, só de
// desenvolvimento (webgpu-galaxia.html na raiz; não entra no build nem é
// referenciada pelo app). Os dados são os do modo ?galaxia=particulas, sem
// reescrever o modelo: ?sorteios=N sorteios independentes do gerador (4 por
// padrão, ~16 M de partículas), cada um num trabalhador, em paralelo; a
// página desenha assim que o primeiro chega e afina com os seguintes.
// Parâmetros: ?vista= ?pos= ?look= ?fov= ?w= ?h= ?k= (filhas por partícula)
// ?borrifo=0|1 ?fatia= ?filtro=0|1 ?lod= ?sorteios= ?expo=.
// Ao vivo: arrastar gira em volta do centro galáctico, roda/pinça aproxima
// e afasta, o botão "voo" passeia pelas cinco vistas em laço. Sem ?w=&h= o
// quadro acompanha a janela (com teto de pixels).
// ============================================================
import * as THREE from 'three';
import { loadGalacticAssets } from '../../three/cartography/galacticAssets';
import { EX, EY, EZ, GAL } from '../../three/world/baseGalactica';
import type { CargaAssada } from '../../three/world/cadeiaDaCarga';
import type { PedidoDaCarga, RespostaDaCarga } from '../../three/world/cargaEmWorker';
import { MotorDaGalaxia } from './motor';

const SEMENTE = 20260730; // a do app (director/carregamento.ts)
const GANHO = 7.99; // uFade da vista de fora: 1 + 6,99 (galaxy.ts)
const VISTAS: Record<string, [number, number, number]> = {
  'de-cima': [-35149, -15040, 14294],
  inclinada: [-14414, 15521, 18777],
  media: [-10412, -2377, 5472],
  saindo: [-2603, -594, 1368],
  'de-lado': [2853, 36554, 18244],
};
interface Pedido {
  vista?: string;
  pos?: number[];
  look?: number[];
  w?: number;
  h?: number;
  k?: number;
  /** 1 = cada partícula deposita num só pixel sorteado */
  borrifo?: number;
  /** a extinção de cada partícula é renovada a cada `fatia` quadros */
  fatia?: number;
  /** 1 = a soma passa por um filtro [1 2 1]² antes do tom */
  filtro?: number;
  /** partículas por pixel do disco que bastam (0 = sempre todas) */
  lod?: number;
  /** foto em JPEG (quadros de vídeo) em vez de PNG */
  jpeg?: boolean;
}

const q = new URLSearchParams(window.location.search);
const numeros = (s: string | null) => {
  const v = (s ?? '').split(',').map(Number);
  return v.length === 3 && v.every(Number.isFinite) ? v : undefined;
};
const numero = (nome: string, padrao: number) => (q.has(nome) ? Number(q.get(nome)) : padrao);
const estado = {
  vista: q.get('vista') ?? 'media',
  pos: numeros(q.get('pos')),
  look: numeros(q.get('look')),
  fov: numero('fov', 58),
  w: numero('w', 1280),
  h: numero('h', 800),
  k: numero('k', 1),
  borrifo: numero('borrifo', 0),
  fatia: numero('fatia', 4),
  filtro: numero('filtro', 1),
  lod: numero('lod', 12),
  expo: numero('expo', 1.436), // exposição 1,02 do app na régua do neutro
};
const SORTEIOS = Math.max(1, numero('sorteios', 4));

const painel = document.getElementById('painel') as HTMLElement;
const diz = (t: string) => {
  painel.textContent = t;
};

/** um sorteio do gerador, no trabalhador de carga do próprio app */
function sortear(s: number, catalogos: PedidoDaCarga['catalogos']): Promise<CargaAssada> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('../../three/world/cargaEmWorker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<RespostaDaCarga>) => {
      if ('etapa' in e.data) return;
      w.terminate();
      resolve(e.data);
    };
    w.onerror = (e) => {
      w.terminate();
      reject(new Error(e.message));
    };
    // `search` vazio: os parâmetros desta página não são botões do gerador
    w.postMessage({
      seed: SEMENTE + s * 7919, catalogos, populationScale: 1, soParticulas: true, search: '',
    } satisfies PedidoDaCarga);
  });
}

async function iniciar() {
  const t0 = performance.now();
  const tela = document.getElementById('tela') as HTMLCanvasElement;
  const catalogos = await loadGalacticAssets();
  const sorteios = Array.from({ length: SORTEIOS }, (_, s) => sortear(s, catalogos));
  const motor = await MotorDaGalaxia.criar(tela, SORTEIOS * 4_100_000);
  if (!motor) throw new Error('este navegador não tem WebGPU');
  diz('sorteando a galáxia…');

  const camera = new THREE.PerspectiveCamera(58, 1, 1, 400000);
  const vp = new THREE.Matrix4();
  /** codifica e envia um quadro; com `medir`, resolve o relógio no fim */
  const quadro = (medir = false) => {
    const pos = estado.pos ?? VISTAS[estado.vista] ?? VISTAS.media;
    const look = estado.look ?? GAL.GC_POS.toArray();
    camera.fov = estado.fov;
    camera.aspect = estado.w / estado.h;
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.up.copy(EZ);
    camera.lookAt(look[0], look[1], look[2]);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    motor.quadro(
      { viewProj: vp.elements, pos, tanMeioFov: Math.tan(THREE.MathUtils.degToRad(estado.fov) / 2) },
      estado.w, estado.h, { ...estado, ganho: GANHO }, medir
    );
  };

  let ocupado = 0; // a bancada mede ou fotografa: o laço ao vivo espera
  let auto = !q.has('w') && !q.has('h'); // o quadro acompanha a janela
  const aplicar = (pedido: Pedido) => {
    if (pedido.w || pedido.h) auto = false;
    if (pedido.vista) {
      estado.vista = pedido.vista;
      estado.pos = undefined;
      estado.look = undefined;
    }
    Object.assign(estado, pedido);
  };
  const mediana = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];

  /** ms por quadro: os passos pelo relógio da GPU e o intervalo real entre
   *  quadros seguidos sem vsync (envio → GPU terminou) */
  const medir = async (pedido: Pedido, quadros = 12) => {
    ocupado++;
    aplicar(pedido);
    for (let i = 0; i < Math.max(3, estado.fatia); i++) quadro();
    await motor.terminou();
    const passos: number[][] = [[], [], []];
    const parede: number[] = [];
    for (let i = 0; i < quadros; i++) {
      const t = performance.now();
      quadro(true);
      await motor.terminou();
      parede.push(performance.now() - t);
      (await motor.lerRelogio()).forEach((ms, j) => passos[j].push(ms));
    }
    ocupado--;
    const [extincao, deposito, tom] = passos.map(mediana);
    return {
      vista: estado.vista, borrifo: estado.borrifo, fatia: estado.fatia, filtro: estado.filtro,
      w: motor.largura, h: motor.altura,
      milhoes: (motor.usadas * estado.k) / 1e6,
      extincao, deposito, tom,
      parede: mediana(parede),
      erros: motor.erros.splice(0),
    };
  };

  /** desenha e devolve o quadro (data URL) */
  const foto = async (pedido: Pedido) => {
    ocupado++;
    aplicar(pedido);
    for (let i = 0; i < estado.fatia + 1; i++) quadro();
    const url = tela.toDataURL(pedido.jpeg ? 'image/jpeg' : 'image/png', 0.95);
    await motor.terminou();
    ocupado--;
    return url;
  };

  /** grão de uma imagem: em cada trecho [x, y, lado], a média, sobre as
   *  caixas de 9 px, de desvio ÷ média da luminância (Rec. 709 nos 8 bits) */
  const grao = async (url: string, trechos: number[][]) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const c2 = c.getContext('2d') as CanvasRenderingContext2D;
    c2.drawImage(img, 0, 0);
    return trechos.map(([x0, y0, lado]) => {
      const d = c2.getImageData(x0, y0, lado, lado).data;
      let soma = 0;
      let caixas = 0;
      for (let by = 0; by + 9 <= lado; by += 9) {
        for (let bx = 0; bx + 9 <= lado; bx += 9) {
          let s = 0;
          let s2 = 0;
          for (let y = by; y < by + 9; y++) {
            for (let x = bx; x < bx + 9; x++) {
              const o = (y * lado + x) * 4;
              const l = 0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2];
              s += l;
              s2 += l * l;
            }
          }
          const m = s / 81;
          if (m > 0) {
            soma += Math.sqrt(Math.max(s2 / 81 - m * m, 0)) / m;
            caixas++;
          }
        }
      }
      return caixas ? soma / caixas : NaN;
    });
  };

  // ---------- ao vivo: câmera em órbita, voo e mostrador ----------
  interface Orbita { az: number; el: number; r: number }
  const orbitaDe = (pos: number[]): Orbita => {
    const d = new THREE.Vector3(pos[0], pos[1], pos[2]).sub(GAL.GC_POS);
    const r = d.length();
    return { az: Math.atan2(d.dot(EY), d.dot(EX)), el: Math.asin(d.dot(EZ) / r), r };
  };
  const posDa = (o: Orbita) => {
    const c = Math.cos(o.el) * o.r;
    return GAL.GC_POS.clone()
      .addScaledVector(EX, c * Math.cos(o.az))
      .addScaledVector(EY, c * Math.sin(o.az))
      .addScaledVector(EZ, Math.sin(o.el) * o.r)
      .toArray();
  };
  let orbita = orbitaDe(estado.pos ?? VISTAS[estado.vista] ?? VISTAS.media);
  const usarOrbita = () => {
    estado.pos = posDa(orbita);
    estado.look = undefined;
  };
  // limites da mão: de 1,5 kpc acima do disco até 60 kpc do centro
  const limitar = () => {
    orbita.r = Math.min(Math.max(orbita.r, 2500), 60000);
    orbita.el = Math.min(Math.max(orbita.el, Math.asin(1500 / orbita.r)), 1.55);
  };

  // O VOO: de-cima → inclinada → media → saindo → de-lado e de volta, em
  // laço, por Catmull-Rom em (azimute, elevação, log da distância)
  const CHAVES = ['de-cima', 'inclinada', 'media', 'saindo', 'de-lado'].map((v) => orbitaDe(VISTAS[v]));
  const NC = CHAVES.length;
  const VOLTA_S = 50;
  const azs = [CHAVES[0].az];
  for (let i = 1; i <= NC; i++) {
    const d = CHAVES[i % NC].az - CHAVES[i - 1].az;
    azs.push(azs[i - 1] + Math.atan2(Math.sin(d), Math.cos(d)));
  }
  const chave = (i: number) => {
    const m = ((i % NC) + NC) % NC;
    return [azs[m] + (azs[NC] - azs[0]) * Math.floor(i / NC), CHAVES[m].el, Math.log(CHAVES[m].r)];
  };
  const catmull = (a: number, b: number, c: number, d: number, t: number) =>
    0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
  let voo = false;
  let tVoo = 0;
  const voar = () => {
    const u = (tVoo / VOLTA_S) * NC;
    const i = Math.floor(u);
    const [az, el, lr] = [0, 1, 2].map((c) =>
      catmull(chave(i - 1)[c], chave(i)[c], chave(i + 1)[c], chave(i + 2)[c], u - i)
    );
    orbita = { az, el, r: Math.exp(lr) };
    usarOrbita();
  };
  const botaoVoo = document.getElementById('voo') as HTMLButtonElement;
  const ligarVoo = (ligado: boolean) => {
    voo = ligado;
    botaoVoo.textContent = ligado ? 'parar o voo' : 'voo';
  };
  botaoVoo.addEventListener('click', () => ligarVoo(!voo));

  const pegarOrbita = () => {
    if (voo) ligarVoo(false);
    else orbita = orbitaDe(estado.pos ?? VISTAS[estado.vista] ?? VISTAS.media);
  };
  const dedos = new Map<number, { x: number; y: number }>();
  tela.addEventListener('pointerdown', (e) => {
    tela.setPointerCapture(e.pointerId);
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pegarOrbita();
  });
  tela.addEventListener('pointermove', (e) => {
    const a = dedos.get(e.pointerId);
    if (!a) return;
    if (dedos.size === 1) {
      orbita.az -= (e.clientX - a.x) * 0.005;
      orbita.el += (e.clientY - a.y) * 0.005;
    } else {
      const outro = [...dedos.entries()].find(([id]) => id !== e.pointerId)?.[1];
      if (outro) {
        const antes = Math.hypot(a.x - outro.x, a.y - outro.y);
        const depois = Math.hypot(e.clientX - outro.x, e.clientY - outro.y);
        orbita.r *= antes / Math.max(depois, 1);
      }
    }
    a.x = e.clientX;
    a.y = e.clientY;
    limitar();
    usarOrbita();
  });
  for (const fim of ['pointerup', 'pointercancel'] as const) {
    tela.addEventListener(fim, (e) => dedos.delete(e.pointerId));
  }
  tela.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      pegarOrbita();
      orbita.r *= Math.exp(e.deltaY * 0.0015);
      limitar();
      usarOrbita();
    },
    { passive: false }
  );

  const seletor = (id: string, valor: string, aoMudar: (v: string) => void) => {
    const sel = document.getElementById(id) as HTMLSelectElement;
    sel.value = valor;
    sel.addEventListener('change', () => aoMudar(sel.value));
  };
  seletor('vista', estado.vista, (v) => {
    ligarVoo(false);
    aplicar({ vista: v });
  });
  seletor('k', String(estado.k), (v) => aplicar({ k: Number(v) }));
  seletor('modo', estado.borrifo ? 'borrifo' : 'tenda', (v) => aplicar({ borrifo: v === 'borrifo' ? 1 : 0 }));
  seletor('filtro', String(estado.filtro), (v) => aplicar({ filtro: Number(v) }));

  // O LAÇO. Quadros por segundo = quadros que a GPU TERMINOU, não os que a
  // página pediu; com dois na fila, o pedido seguinte espera.
  const TETO_DE_PIXELS = 2560 * 1600;
  let ultimo = performance.now();
  let desde = ultimo;
  let feitos = 0;
  let naFila = 0;
  const laco = (agora: number) => {
    requestAnimationFrame(laco);
    const dt = Math.min((agora - ultimo) / 1000, 0.1);
    ultimo = agora;
    if (ocupado || naFila >= 2 || !motor.total) return;
    if (voo) {
      tVoo += dt;
      voar();
    }
    if (auto) {
      const w = tela.clientWidth * window.devicePixelRatio;
      const h = tela.clientHeight * window.devicePixelRatio;
      const e = Math.min(1, Math.sqrt(TETO_DE_PIXELS / Math.max(w * h, 1)));
      estado.w = Math.max(2, Math.round(w * e));
      estado.h = Math.max(2, Math.round(h * e));
    }
    quadro();
    naFila++;
    void motor.terminou().then(() => {
      naFila--;
      feitos++;
    });
    if (agora - desde >= 500) {
      diz(
        `${Math.round((feitos * 1000) / (agora - desde))} quadros/s · ` +
          `${Math.round((motor.usadas * estado.k) / 1e6)} milhões de partículas · ${motor.largura}×${motor.altura}` +
          (motor.sorteios < SORTEIOS ? ` · sorteando ${motor.sorteios}/${SORTEIOS}` : '') +
          (motor.erros.length ? ` · ERRO ${motor.erros[0]}` : '')
      );
      feitos = 0;
      desde = agora;
    }
  };
  requestAnimationFrame(laco);

  // os sorteios entram na ordem (o primeiro traz os indivíduos); a página
  // já desenha com o que chegou
  let primeiraImagem = 0;
  for (const sorteio of sorteios) {
    const carga = await sorteio;
    motor.acrescentar(carga.bright, carga.brightCount);
    primeiraImagem ||= performance.now() - t0;
  }
  const info = {
    particulas: motor.total,
    sorteios: SORTEIOS,
    relogio: motor.temRelogio,
    catalogos: Boolean(catalogos),
    msAtePrimeiraImagem: Math.round(primeiraImagem),
    msAteCompleta: Math.round(performance.now() - t0),
    megabytesNaGpu: Math.round((motor.total * 28) / 1e6),
  };
  /** o quadro do voo no instante t (s), parado: para julgar o movimento
   *  quadro a quadro sem depender do relógio */
  const fotoDoVoo = (t: number, pedido: Pedido) => {
    ligarVoo(false);
    tVoo = t;
    voar();
    return foto(pedido);
  };
  /** o mesmo instante, mas chegando EM VOO: 8 quadros seguidos a 1/60 s,
   *  um por instante, sem esperar a extinção assentar (prova da fatia) */
  const fotoEmVoo = async (t: number, pedido: Pedido) => {
    ocupado++;
    ligarVoo(false);
    aplicar(pedido);
    for (let j = 8; j >= 0; j--) {
      tVoo = t - j / 60;
      voar();
      quadro();
    }
    const url = tela.toDataURL('image/png');
    await motor.terminou();
    ocupado--;
    return url;
  };
  Object.assign(window, { __gw: { info, medir, foto, fotoDoVoo, fotoEmVoo, grao, voo: ligarVoo } });
}

iniciar().catch((e: unknown) => {
  diz(`falhou: ${e instanceof Error ? e.message : String(e)}`);
  Object.assign(window, { __gwErro: String(e) });
  console.error(e);
});
