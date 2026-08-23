// ============================================================
// O CANAL VIVO — a velocidade que estava no `.bin` sem consumidor e a
// geometria no céu vista da TERRA.
//
// Os dois julgamentos rodam contra a efeméride REAL de `public/data/atlas`,
// como `efemerides.test.ts` já faz: o que se mede aqui só tem sentido contra
// o céu, não contra um vetor inventado.
// ============================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MetaEfemerides } from './efemerides';
import { decodeEfemerides, MotorEfemerides } from './efemerides';
import { AU_KM } from './elementosOrbitais';
import { geometriaNoCeu, quemTemGeometriaNoCeu } from './geometriaNoCeu';
import { dateToTDB } from './time';

const DATA_DIR = fileURLToPath(
  new URL('../../../public/data/atlas/', import.meta.url)
);
const meta = JSON.parse(
  readFileSync(join(DATA_DIR, 'efemerides_meta.json'), 'utf8')
) as MetaEfemerides;
const binNode = readFileSync(join(DATA_DIR, 'efemerides.bin'));
const bufferBin = binNode.buffer.slice(
  binNode.byteOffset,
  binNode.byteOffset + binNode.byteLength
);
const motor = new MotorEfemerides(decodeEfemerides(bufferBin, meta));

const KM_POR_S = AU_KM / 86_400;
const JD_2025 = dateToTDB(new Date('2025-01-01T00:00:00Z'));

function modulo(v: { x: number; y: number; z: number }): number {
  return Math.hypot(v.x, v.y, v.z);
}

describe('MotorEfemerides.velocidade', () => {
  /**
   * NÃO É "29,8 km/s", É A ÓRBITA INTEIRA. O número de tabela é a média, e
   * uma prova que o cobrasse num instante qualquer estaria errada por
   * construção: a Terra passa pelo periélio no começo de janeiro. O que se
   * cobra são os DOIS extremos publicados — 30,29 km/s no periélio e 29,29
   * no afélio —, que é uma prova bem mais dura: ela só fecha se a velocidade
   * variar ao longo do ano do jeito certo.
   */
  it('percorre a órbita da Terra entre 29,29 e 30,29 km/s', () => {
    let minima = Infinity;
    let maxima = 0;
    for (let dia = 0; dia < 366; dia += 1) {
      const v = modulo(motor.velocidade('earth', JD_2025 + dia)) * KM_POR_S;
      minima = Math.min(minima, v);
      maxima = Math.max(maxima, v);
    }
    expect(maxima).toBeCloseTo(30.29, 1);
    expect(minima).toBeCloseTo(29.29, 1);
  });

  it('põe a Lua a ~1,0 km/s em torno da Terra', () => {
    const v = modulo(motor.velocidade('moon', JD_2025)) * KM_POR_S;
    expect(v).toBeGreaterThan(0.95);
    expect(v).toBeLessThan(1.1);
  });

  /**
   * A PROVA DE QUE ELA É A DERIVADA DA CURVA QUE A CASA DESENHA, e não um
   * segundo número parecido: a diferença central da PRÓPRIA `posicao()`
   * reproduz a `velocidade()`. Se um dia alguém interpolar os `v` gravados
   * por conta própria em vez de derivar o polinômio, esta prova cai — que é
   * exatamente o dia em que a velocidade mostrada deixaria de ser a da
   * trajetória mostrada.
   */
  it('é a derivada da posição interpolada, e não um número ao lado dela', () => {
    const dt = 1 / 1440; // um minuto
    for (const id of ['earth', 'mars', 'moon', 'jupiter']) {
      const antes = motor.posicao(id, JD_2025 - dt);
      const depois = motor.posicao(id, JD_2025 + dt);
      const numerica = {
        x: (depois.x - antes.x) / (2 * dt),
        y: (depois.y - antes.y) / (2 * dt),
        z: (depois.z - antes.z) / (2 * dt),
      };
      const analitica = motor.velocidade(id, JD_2025);
      const erro = modulo({
        x: numerica.x - analitica.x,
        y: numerica.y - analitica.y,
        z: numerica.z - analitica.z,
      });
      expect(erro / modulo(analitica), id).toBeLessThan(1e-4);
    }
  });

  it('responde pelos corpos de Kepler, que não têm tabela nenhuma', () => {
    // Titã (média publicada 5,57 km/s, e = 0,029 → 5,4 a 5,8) e Io (17,33
    // km/s, e = 0,004 → praticamente circular) vêm da diferença central da
    // solução analítica. A faixa é a da EXCENTRICIDADE: cobrar a média num
    // instante qualquer seria cobrar um número que a órbita não tem.
    const titan = modulo(motor.velocidade('titan', JD_2025)) * KM_POR_S;
    expect(titan).toBeGreaterThan(5.4);
    expect(titan).toBeLessThan(5.8);
    const io = modulo(motor.velocidade('io', JD_2025)) * KM_POR_S;
    expect(io).toBeGreaterThan(17.2);
    expect(io).toBeLessThan(17.5);
  });

  it('a derivada dos corpos de Kepler também é a da posição deles', () => {
    const dt = 1 / 1440;
    for (const id of ['titan', 'io', 'ceres', 'charon']) {
      const antes = motor.posicao(id, JD_2025 - dt);
      const depois = motor.posicao(id, JD_2025 + dt);
      const analitica = motor.velocidade(id, JD_2025);
      const erro = modulo({
        x: (depois.x - antes.x) / (2 * dt) - analitica.x,
        y: (depois.y - antes.y) / (2 * dt) - analitica.y,
        z: (depois.z - antes.z) / (2 * dt) - analitica.z,
      });
      expect(erro / modulo(analitica), id).toBeLessThan(1e-4);
    }
  });

  it('o Sol é a origem e não anda', () => {
    expect(motor.velocidade('sun', JD_2025)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('não extrapola em silêncio fora da janela da tabela, nem engole NaN', () => {
    const foraDaJanela = dateToTDB(new Date('2100-01-01T00:00:00Z'));
    expect(() => motor.velocidade('mars', foraDaJanela)).toThrow(/fora da janela/);
    expect(() => motor.velocidade('mars', Number.NaN)).toThrow(/não-finito/);
    expect(() => motor.velocidade('nibiru', JD_2025)).toThrow(/desconhecido/);
  });

  /**
   * O CONTRATO DO CACHE É SOBRE POSIÇÃO, e a velocidade não entra nele: um
   * segundo tipo de valor no mesmo Map envenenaria os contadores que o
   * `memoria.mjs` e o painel de estatísticas leem.
   */
  it('não mexe nos contadores do cache de posição', () => {
    const limpo = new MotorEfemerides(decodeEfemerides(bufferBin, meta));
    limpo.velocidade('mars', JD_2025);
    limpo.velocidade('titan', JD_2025);
    limpo.velocidade('sun', JD_2025);
    const stats = limpo.getCacheStats();
    expect(stats).toMatchObject({ size: 0, hits: 0, misses: 0, bypassed: 0 });
  });
});

describe('geometriaNoCeu — a pergunta do visitante com telescópio', () => {
  const naData = (id: string, jd: number) =>
    geometriaNoCeu(
      motor.posicaoHeliocentrica(id, jd),
      motor.posicaoHeliocentrica('earth', jd)
    );

  /**
   * A LUA NOVA é a ponta de baixo: a Lua na direção do Sol, disco apagado.
   * A prova varre um mês sinódico e cobra o MÍNIMO — assim ela não depende
   * de eu acertar a data exata de uma lunação, que é o tipo de constante que
   * envelhece calada.
   */
  it('acha a Lua nova numa lunação: elongação ~0° e disco ~0', () => {
    let pior = { elongacao: 999, iluminada: 1 };
    for (let dia = 0; dia < 30; dia += 1 / 48) {
      const g = naData('moon', JD_2025 + dia)!;
      if (g.elongacaoDeg < pior.elongacao) {
        pior = { elongacao: g.elongacaoDeg, iluminada: g.fracaoIluminada };
      }
    }
    expect(pior.elongacao).toBeLessThan(6);
    expect(pior.iluminada).toBeLessThan(0.005);
  });

  it('acha a Lua cheia na mesma lunação: elongação ~180° e disco ~1', () => {
    let melhor = { elongacao: 0, iluminada: 0 };
    for (let dia = 0; dia < 30; dia += 1 / 48) {
      const g = naData('moon', JD_2025 + dia)!;
      if (g.elongacaoDeg > melhor.elongacao) {
        melhor = { elongacao: g.elongacaoDeg, iluminada: g.fracaoIluminada };
      }
    }
    expect(melhor.elongacao).toBeGreaterThan(174);
    expect(melhor.iluminada).toBeGreaterThan(0.995);
  });

  /**
   * A OPOSIÇÃO DE MARTE é a ponta de cima: Marte oposto ao Sol, disco cheio.
   * A janela é de dois anos e dois meses porque é esse o período sinódico
   * dele — varrer menos poderia não conter oposição nenhuma.
   *
   * E ELA NÃO CHEGA A 180°, medido: 175,7°. Não é erro — é a inclinação
   * orbital. Marte anda até 1,85° fora da eclíptica em heliocêntrico, e a
   * 0,6 UA da Terra isso vira ~4° de latitude vista daqui. Uma prova que
   * exigisse 179° estaria exigindo uma órbita coplanar que Marte não tem.
   */
  it('acha a oposição de Marte: elongação ~180° e disco ~1', () => {
    let melhor = { elongacao: 0, iluminada: 0 };
    for (let dia = 0; dia < 800; dia += 1) {
      const g = naData('mars', JD_2025 + dia)!;
      if (g.elongacaoDeg > melhor.elongacao) {
        melhor = { elongacao: g.elongacaoDeg, iluminada: g.fracaoIluminada };
      }
    }
    expect(melhor.elongacao).toBeGreaterThan(174);
    expect(melhor.iluminada).toBeGreaterThan(0.999);
  });

  /**
   * MERCÚRIO É A FALSIFICAÇÃO MAIS AFIADA que existe aqui (o julgamento vem
   * do doador): a elongação dele é limitada pela geometria da própria órbita
   * — 18° a 28° conforme onde o alinhamento cai. Erro de frame, vetor
   * centrado no pai errado ou subtração invertida quebram este número.
   */
  it('mantém Mercúrio dentro do limite real de elongação num ano', () => {
    let maxima = 0;
    for (let dia = 0; dia < 366; dia += 1) {
      maxima = Math.max(maxima, naData('mercury', JD_2025 + dia)!.elongacaoDeg);
    }
    expect(maxima).toBeGreaterThan(17);
    expect(maxima).toBeLessThan(30);
  });

  /**
   * A DICOTOMIA DE VÊNUS prende o ângulo de fase no VÉRTICE certo: um
   * planeta interior mostra 50% do disco exatamente quando o ângulo
   * Sol–Vênus–Terra é 90°, que é a máxima elongação. Medir a fase na Terra
   * em vez de no corpo dá outro número, plausível e errado.
   */
  it('mostra Vênus meio iluminado na máxima elongação', () => {
    let melhor = { elongacao: 0, iluminada: 0 };
    for (let dia = 0; dia < 584; dia += 1) {
      const g = naData('venus', JD_2025 + dia)!;
      if (g.elongacaoDeg > melhor.elongacao) {
        melhor = { elongacao: g.elongacaoDeg, iluminada: g.fracaoIluminada };
      }
    }
    expect(melhor.elongacao).toBeGreaterThan(44);
    expect(melhor.elongacao).toBeLessThan(48);
    expect(melhor.iluminada).toBeGreaterThan(0.45);
    expect(melhor.iluminada).toBeLessThan(0.55);
  });

  it('devolve null onde a pergunta não faz sentido', () => {
    const terra = motor.posicaoHeliocentrica('earth', JD_2025);
    expect(geometriaNoCeu(terra, terra)).toBeNull();
    expect(geometriaNoCeu({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 })).toBeNull();
  });
});

describe('quemTemGeometriaNoCeu — a regra de escopo do doador', () => {
  it('inclui os heliocêntricos e a Lua, e mais satélite nenhum', () => {
    for (const id of ['mercury', 'venus', 'mars', 'jupiter', 'pluto', 'ceres', 'vesta']) {
      expect(quemTemGeometriaNoCeu(id), id).toBe(true);
    }
    expect(quemTemGeometriaNoCeu('moon')).toBe(true);
  });

  it('exclui o Sol, a Terra e os satélites que não são a Lua', () => {
    for (const id of ['sun', 'earth', 'titan', 'io', 'phobos', 'charon', 'triton']) {
      expect(quemTemGeometriaNoCeu(id), id).toBe(false);
    }
  });
});
