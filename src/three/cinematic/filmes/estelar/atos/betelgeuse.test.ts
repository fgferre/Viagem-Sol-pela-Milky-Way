// Serve: dono — o Ato 1 do filme estelar viaja de casa a Betelgeuse olhando para ela, a figura de Órion se desfaz no caminho, o disco passa de meia tela sem a câmera entrar na estrela, e os números das legendas são os da ficha
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

// journey.ts puxa world/galaxy.ts, que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { montarFilmeEstelar } = await import('../montar');
const { Journey } = await import('../../../journey');
const { ESTRELAS_DO_FILME } = await import('../estrelas');
const { R_BETELGEUSE } = await import('./betelgeuse');
const { R_SOL, UA } = await import('../../solar/atos/geometria');
const { estrelaVisitavelPorNome } = await import('../../../../../lib/atlas/estrelasVisitaveis');

const filme = montarFilmeEstelar();
const journey = new Journey(filme.shots, filme.starts);
const graus = THREE.MathUtils.radToDeg;
const B = ESTRELAS_DO_FILME.Betelgeuse;
const NOMES = ['figuraSeDesfaz', 'chegadaABetelgeuse', 'celulasDeBetelgeuse', 'tamanhoDeBetelgeuse', 'viraParaOrion'];
type Amostra = ReturnType<InstanceType<typeof Journey>['at']>;

const plano = (nome: string) => {
  const i = filme.shots.findIndex((s) => s.nome === nome);
  return { i, inicio: filme.starts[i], fim: filme.starts[i] + filme.shots[i].dur };
};
/** os instantes de um plano a cada 1/30 s (o último um nada antes do fim) */
const instantes = (nome: string) => {
  const { inicio, fim } = plano(nome);
  return Array.from({ length: Math.round((fim - inicio) * 30) + 1 }, (_, n) => Math.min(inicio + n / 30, fim - 1e-9));
};
/** onde um ponto cai no quadro 16:9, em fração de meio quadro (dentro: |x| e |y| até 1) */
const noQuadro = ({ pos, look, fov }: Amostra, p: THREE.Vector3) => {
  const frente = look.clone().sub(pos).normalize();
  const cima = filme.cima.clone().addScaledVector(frente, -filme.cima.dot(frente)).normalize();
  const direita = new THREE.Vector3().crossVectors(frente, cima);
  const d = p.clone().sub(pos).normalize();
  const z = d.dot(frente);
  const m = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  return { x: d.dot(direita) / z / (m * 16 / 9), y: d.dot(cima) / z / m, z };
};
const dentro = (q: { x: number; y: number; z: number }) => q.z > 0 && Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1;
const mira = (a: Amostra) => a.look.clone().sub(a.pos).normalize();

describe('o Ato 1 do filme estelar: Betelgeuse', () => {
  it('cinco planos, ~45 s, e começa onde o prólogo pousou: no mirante, mirando Alnilam, com a lente de 32°', () => {
    const atos = filme.shots.map((s) => s.nome);
    const i0 = atos.indexOf(NOMES[0]);
    expect(atos.slice(i0, i0 + 5)).toEqual(NOMES);
    const total = NOMES.reduce((t, n) => t + filme.shots[plano(n).i].dur, 0);
    expect(Math.abs(total - 45)).toBeLessThanOrEqual(2);
    const antes = journey.at(plano(NOMES[0]).inicio - 1e-9);
    const depois = journey.at(plano(NOMES[0]).inicio);
    expect(antes.plano).toBe(plano(NOMES[0]).i - 1);
    expect(depois.pos.distanceTo(antes.pos)).toBeLessThan(1e-12);
    expect(graus(mira(antes).angleTo(mira(depois)))).toBeLessThan(1e-6);
    expect(depois.fov).toBe(32);
  });

  it('em cada junta entre os planos a posição, a mira e a lente continuam', () => {
    for (const nome of [...NOMES.slice(1), 'travessiaAOrion']) {
      const t = plano(nome).inicio;
      const a = journey.at(t - 1e-9);
      const b = journey.at(t);
      expect(a.pos.distanceTo(b.pos), nome).toBeLessThan(1e-7 * Math.max(1, b.pos.distanceTo(B)));
      expect(graus(mira(a).angleTo(mira(b))), nome).toBeLessThan(1e-4);
      expect(Math.abs(a.fov - b.fov), nome).toBeLessThan(1e-6);
    }
  });

  it('a câmera nunca entra em Betelgeuse nem na borda difusa dela (fica fora de 2 raios), nem passa perto de outra estrela', () => {
    for (const nome of NOMES) {
      for (const t of instantes(nome)) {
        const { pos } = journey.at(t);
        expect(pos.distanceTo(B) / R_BETELGEUSE, `${nome} ${t}`).toBeGreaterThan(2);
        for (const [estrela, p] of Object.entries(ESTRELAS_DO_FILME)) {
          if (estrela !== 'Betelgeuse') expect(pos.distanceTo(p) / UA, `${nome} ${estrela}`).toBeGreaterThan(1000);
        }
      }
    }
  });

  it('a travessia olha para onde vai: Betelgeuse no centro do quadro depois da virada, e a figura se desfaz no meio do plano', () => {
    const { inicio, fim } = plano('figuraSeDesfaz');
    for (const t of instantes('figuraSeDesfaz').filter((t) => t >= inicio + 0.3 * (fim - inicio))) {
      const q = noQuadro(journey.at(t), B);
      expect(Math.hypot(q.x, q.y), String(t)).toBeLessThan(0.02);
    }
    // Bellatrix, a 77 pc, sai do quadro na metade do meio do plano; Rigel, atrás de Betelgeuse, depois dela
    const saida = (nome: string) => instantes('figuraSeDesfaz').find((t) => !dentro(noQuadro(journey.at(t), ESTRELAS_DO_FILME[nome])))!;
    expect(dentro(noQuadro(journey.at(inicio), ESTRELAS_DO_FILME.Bellatrix))).toBe(true);
    expect(dentro(noQuadro(journey.at(inicio), ESTRELAS_DO_FILME.Rigel))).toBe(true);
    expect((saida('Bellatrix') - inicio) / (fim - inicio)).toBeGreaterThan(0.25);
    expect((saida('Bellatrix') - inicio) / (fim - inicio)).toBeLessThan(0.75);
    expect(saida('Rigel')).toBeGreaterThan(inicio);
  });

  it('as células: na órbita curta o disco passa de meia tela e fica dentro dela', () => {
    for (const t of instantes('celulasDeBetelgeuse')) {
      const a = journey.at(t);
      const diametro = 2 * graus(Math.asin(R_BETELGEUSE / a.pos.distanceTo(B)));
      expect(diametro / a.fov, String(t)).toBeGreaterThan(0.5);
      expect(diametro / a.fov, String(t)).toBeLessThan(0.95);
    }
  });

  it('a virada para a nebulosa acaba nela, com Betelgeuse fora do caminho da travessia', () => {
    const fim = journey.at(plano('viraParaOrion').fim - 1e-9);
    const O = filme.shots[plano('travessiaAOrion').i].look(0, new THREE.Vector3());
    expect(graus(mira(fim).angleTo(O.clone().sub(fim.pos).normalize()))).toBeLessThan(0.01);
    // Betelgeuse fica atrás da câmera em relação ao rumo da travessia
    expect(B.clone().sub(fim.pos).dot(mira(fim))).toBeLessThan(0);
  });

  it('os números das legendas são os da ficha de Betelgeuse', () => {
    const ficha = estrelaVisitavelPorNome('Betelgeuse')!;
    const falas = NOMES.flatMap((n) => filme.shots[plano(n).i].captions ?? []);
    const texto = falas.map((c) => `${c.text} ${c.sub ?? ''}`).join(' | ');
    const textoEn = falas.map((c) => `${c.en?.text ?? ''} ${c.en?.sub ?? ''}`).join(' | ');
    expect(texto).toContain(`${ficha.massaMsol!.v} sóis de massa`);
    expect(textoEn).toContain(`${ficha.massaMsol!.v} suns of mass`);
    expect(texto).toContain(`${ficha.raioRsol.v} vezes o raio do Sol`);
    expect(textoEn).toContain(`${ficha.raioRsol.v} times the Sun’s radius`);
    // o raio da ficha em UA, com uma casa: 764 R☉ = 3,56 UA
    const ua = ((ficha.raioRsol.v * R_SOL) / UA).toFixed(1);
    expect(texto).toContain(`${ua.replace('.', ',')} UA`);
    expect(textoEn).toContain(`${ua} AU`);
    // nenhum outro número nas legendas do ato
    const numeros = texto.match(/\d+(?:,\d+)?/g) ?? [];
    expect(numeros.sort()).toEqual([String(ficha.massaMsol!.v), String(ficha.raioRsol.v), ua.replace('.', ',')].sort());
    // cada subtexto em até 12 palavras
    for (const c of falas) expect((c.sub ?? '').split(/\s+/).filter(Boolean).length, c.text).toBeLessThanOrEqual(12);
  });
});
