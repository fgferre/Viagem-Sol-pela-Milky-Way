// Serve: dono — o Ato 2 do filme estelar chega à Nebulosa de Órion olhando para ela, mostra a tigela do lado em que ela abre, entra até a boca com o Trapézio no centro, vira para casa e entrega a câmera parada na junta, mirando as Plêiades
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

// journey.ts puxa world/galaxy.ts, que lê window.location.search no topo do módulo
(globalThis as unknown as { window: { location: { search: string } } }).window = {
  location: { search: '' },
};
const { montarFilmeEstelar } = await import('../montar');
const { Journey } = await import('../../../journey');
const { ESTRELAS_DO_FILME } = await import('../estrelas');
const { PONTOS_DAS_JUNTAS } = await import('./juntas');
const { R_BETELGEUSE } = await import('./betelgeuse');
const { UA } = await import('../../solar/atos/geometria');
const { LUGARES_DA_BUSCA } = await import('../../../../world/lugaresDoCeu');
const { LUGARES_DO_FILME } = await import('../../../../../lib/lugaresDoFilme');

const filme = montarFilmeEstelar();
const journey = new Journey(filme.shots, filme.starts);
const graus = THREE.MathUtils.radToDeg;
const lugar = (id: string) => {
  const l = LUGARES_DA_BUSCA.find((x) => x.id === id)!;
  return new THREE.Vector3(l.x, l.y, l.z);
};
const O = lugar('nebulosa-de-orion');
const PLEIADES = lugar('pleiades');
const NOMES = ['travessiaAOrion', 'bercario', 'entraEmOrion', 'trapezio', 'voltaParaCasa'];
type Amostra = ReturnType<InstanceType<typeof Journey>['at']>;

const plano = (nome: string) => {
  const i = filme.shots.findIndex((s) => s.nome === nome);
  return { i, inicio: filme.starts[i], fim: filme.starts[i] + filme.shots[i].dur };
};
const instantes = (nome: string) => {
  const { inicio, fim } = plano(nome);
  return Array.from({ length: Math.round((fim - inicio) * 30) + 1 }, (_, n) => Math.min(inicio + n / 30, fim - 1e-9));
};
const noQuadro = ({ pos, look, fov }: Amostra, p: THREE.Vector3) => {
  const frente = look.clone().sub(pos).normalize();
  const cima = filme.cima.clone().addScaledVector(frente, -filme.cima.dot(frente)).normalize();
  const direita = new THREE.Vector3().crossVectors(frente, cima);
  const d = p.clone().sub(pos).normalize();
  const z = d.dot(frente);
  const m = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  return { x: d.dot(direita) / z / (m * 16 / 9), y: d.dot(cima) / z / m, z };
};
const mira = (a: Amostra) => a.look.clone().sub(a.pos).normalize();

describe('o Ato 2 do filme estelar: a Nebulosa de Órion', () => {
  it('cinco planos, ~47 s, logo depois do Ato 1, e é o último ato montado', () => {
    const atos = filme.shots.map((s) => s.nome);
    const i0 = atos.indexOf(NOMES[0]);
    expect(atos[i0 - 1]).toBe('viraParaOrion');
    expect(atos.slice(i0, i0 + 5)).toEqual(NOMES);
    const total = NOMES.reduce((t, n) => t + filme.shots[plano(n).i].dur, 0);
    expect(Math.abs(total - 47)).toBeLessThanOrEqual(2);
  });

  it('em cada junta entre os planos a posição, a mira e a lente continuam', () => {
    for (const nome of NOMES.slice(1)) {
      const t = plano(nome).inicio;
      const a = journey.at(t - 1e-9);
      const b = journey.at(t);
      expect(a.pos.distanceTo(b.pos), nome).toBeLessThan(1e-6);
      expect(graus(mira(a).angleTo(mira(b))), nome).toBeLessThan(1e-4);
      expect(Math.abs(a.fov - b.fov), nome).toBeLessThan(1e-6);
    }
  });

  it('a LEI DA JUNTA: o ato acaba parado no ponto da saída de Órion, mirando as Plêiades, com a lente em 40°', () => {
    const { i } = plano('voltaParaCasa');
    const s = filme.shots[i];
    const fim = s.pos(1, new THREE.Vector3());
    expect(fim.distanceTo(PONTOS_DAS_JUNTAS.saidaDeOrion)).toBeLessThan(1e-9);
    const olhar = s.look(1, new THREE.Vector3()).sub(fim).normalize();
    expect(graus(olhar.angleTo(PLEIADES.clone().sub(fim).normalize()))).toBeLessThan(1e-6);
    expect(s.fov1).toBe(40);
    // parado: o último 1/30 s anda menos de 0,1% do que o plano andou
    const quase = journey.at(plano('voltaParaCasa').fim - 1 / 30).pos;
    expect(quase.distanceTo(fim) / fim.distanceTo(s.pos(0, new THREE.Vector3()))).toBeLessThan(1e-3);
  });

  it('a travessia olha para onde vai: a nebulosa no centro do quadro, e a distância só cai', () => {
    let antes = Infinity;
    for (const t of instantes('travessiaAOrion')) {
      const a = journey.at(t);
      const q = noQuadro(a, O);
      expect(Math.hypot(q.x, q.y), String(t)).toBeLessThan(1e-6);
      const d = a.pos.distanceTo(O);
      expect(d).toBeLessThanOrEqual(antes + 1e-9);
      antes = d;
    }
  });

  it('o berçário é visto do lado em que a tigela abre — a reta do Sol —, quase parado', () => {
    const { inicio, fim } = plano('bercario');
    const a = journey.at(inicio);
    const b = journey.at(fim - 1e-9);
    for (const p of [a.pos, b.pos]) {
      expect(graus(p.clone().sub(O).angleTo(O.clone().negate()))).toBeLessThan(0.5);
    }
    expect(a.pos.distanceTo(b.pos) / a.pos.distanceTo(O)).toBeLessThan(0.1);
  });

  it('dentro da tigela o Trapézio fica no centro e a câmera fica na boca, fora da névoa, e nunca entra numa estrela', () => {
    for (const nome of ['entraEmOrion', 'trapezio']) {
      for (const t of instantes(nome)) {
        const a = journey.at(t);
        const q = noQuadro(a, O);
        expect(Math.hypot(q.x, q.y), `${nome} ${t}`).toBeLessThan(1e-6);
        expect(a.pos.distanceTo(O), `${nome} ${t}`).toBeGreaterThan(2.5);
      }
    }
    for (const nome of NOMES) {
      for (const t of instantes(nome)) {
        const { pos } = journey.at(t);
        // a travessia parte de perto de Betelgeuse (a junta do Ato 1), fora de 2 raios dela
        expect(pos.distanceTo(ESTRELAS_DO_FILME.Betelgeuse) / R_BETELGEUSE, nome).toBeGreaterThan(2);
        for (const [estrela, p] of Object.entries(ESTRELAS_DO_FILME)) {
          if (estrela !== 'Betelgeuse') expect(pos.distanceTo(p) / UA, `${nome} ${estrela}`).toBeGreaterThan(1000);
        }
      }
    }
  });

  it('a volta para casa: o Sol entra no quadro com a legenda, que diz o que a ficha da nebulosa diz', () => {
    const { i, inicio, fim } = plano('voltaParaCasa');
    const fala = filme.shots[i].captions![0];
    expect(fala.text).toBe('O Sol nasceu num lugar assim');
    expect(filme.shots[i].target).toEqual(['SOL']);
    const t = inicio + fala.at * (fim - inicio);
    for (const tt of [t + 1, fim - 1e-9]) {
      const q = noQuadro(journey.at(tt), new THREE.Vector3());
      expect(q.z > 0 && Math.abs(q.x) < 1 && Math.abs(q.y) < 1, String(tt)).toBe(true);
    }
  });

  it('os números das legendas do ato são os da ficha da nebulosa', () => {
    const ficha = LUGARES_DO_FILME.find((l) => l.id === 'nebulosa-de-orion')!;
    const idade = ficha.fatos!.find((f) => f.campo === 'idade')!;
    const falas = NOMES.flatMap((n) => filme.shots[plano(n).i].captions ?? []);
    const comNumero = falas.filter((c) => /\d/.test(`${c.text} ${c.sub ?? ''}`));
    expect(comNumero.map((c) => c.text)).toEqual(['O Trapézio']);
    const trapezio = comNumero[0];
    expect(trapezio.sub).toContain('1 a 3 milhões de anos');
    expect(idade.pt).toContain('1 a 3 milhões de anos');
    expect(trapezio.en!.sub).toContain('1 to 3 million years');
    expect(idade.en).toContain('1 to 3 million years');
    for (const c of falas) expect((c.sub ?? '').split(/\s+/).filter(Boolean).length, c.text).toBeLessThanOrEqual(12);
  });
});
