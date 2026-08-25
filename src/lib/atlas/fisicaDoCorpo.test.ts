import { describe, expect, it } from 'vitest';
import {
  AU_KM,
  MU_PARENT,
  MU_SUN_AU3_PER_DAY2,
} from './elementosOrbitais';
import { formatarRazaoTerra } from '../unidades';
import {
  gravidadeSuperficie,
  massaDeGm,
  raioEquatorialKm,
  razaoTerra,
  velocidadeDeEscape,
} from './fisicaDoCorpo';
import { GM_CORPOS, SEM_GM_NO_KERNEL } from './massas';
import {
  ANOES_DO_SISTEMA,
  ASTEROIDES_DO_SISTEMA,
  CORPOS_DO_SISTEMA,
  LUAS_DO_SISTEMA,
} from '../../three/atlasConfig';

const SEGUNDOS_POR_DIA = 86_400;

/** km³/s² → UA³/dia², a unidade em que `MU_PARENT` vive. */
function paraUa3PorDia2(gmKm3PorS2: number): number {
  return (gmKm3PorS2 * SEGUNDOS_POR_DIA * SEGUNDOS_POR_DIA) / AU_KM ** 3;
}

describe('gravidadeSuperficie', () => {
  // A tabela de referência da NASA imprime 9,80 m/s² para a Terra e 24,79
  // para Júpiter, as duas no EQUADOR — que é o raio com que este módulo
  // conta. Os dois batem na casa decimal, e é isso que prende a escolha do
  // raio: com o raio médio a Terra daria 9,82.
  it('reproduz a gravidade equatorial publicada da Terra e de Júpiter', () => {
    expect(gravidadeSuperficie('earth')!).toBeCloseTo(9.8, 2);
    expect(gravidadeSuperficie('jupiter')!).toBeCloseTo(24.79, 2);
  });

  it('responde pelo Sol, cuja figura NÃO mora em BODY_AXES', () => {
    // 274 m/s² é o número publicado; o raio vem de `RAIO_SOL_KM`
    // (`three/escala`), a mesma aresta declarada que o eclipse já usa.
    expect(raioEquatorialKm('sun')).toBe(696_340);
    expect(gravidadeSuperficie('sun')!).toBeCloseTo(273.7, 1);
  });

  it('devolve null onde falta GM ou figura — nunca um número inventado', () => {
    // Makemake tem figura (esfera de 715 km) e NÃO tem GM: o kernel não o
    // lista, porque não há satélite que fixe a massa dele.
    expect(SEM_GM_NO_KERNEL).toEqual(['makemake']);
    expect(raioEquatorialKm('makemake')).not.toBeNull();
    expect(gravidadeSuperficie('makemake')).toBeNull();
    expect(velocidadeDeEscape('makemake')).toBeNull();
    expect(massaDeGm('makemake')).toBeNull();
    // e um id que não existe não vira zero em lugar nenhum
    expect(gravidadeSuperficie('nibiru')).toBeNull();
    expect(raioEquatorialKm('nibiru')).toBeNull();
  });
});

describe('velocidadeDeEscape', () => {
  /**
   * 11,18 E NÃO 11,186, E A DIFERENÇA É DECLARADA. A tabela da NASA publica
   * 11,186 km/s para a Terra usando o raio MÉDIO VOLUMÉTRICO (6.371 km);
   * aqui a conta usa o raio EQUATORIAL (6.378,1366 km), que é o mesmo que a
   * ficha imprime na linha do raio e o mesmo que entra na gravidade. Duas
   * réguas de raio na mesma seção seria a casa discordando de si mesma —
   * 0,05% é o preço, e ele está escrito.
   */
  it('dá 11,18 km/s na Terra — com o raio equatorial, o mesmo da ficha', () => {
    expect(velocidadeDeEscape('earth')!).toBeCloseTo(11.18, 2);
  });

  it('dá 59,5 km/s em Júpiter e 617 km/s no Sol', () => {
    expect(velocidadeDeEscape('jupiter')!).toBeCloseTo(59.53, 2);
    expect(velocidadeDeEscape('sun')!).toBeCloseTo(617.4, 1);
  });
});

describe('massaDeGm', () => {
  it('devolve a massa publicada da Terra e de Júpiter', () => {
    // 5,972e24 kg e 1,898e27 kg — os mesmos que o doador imprimia como
    // string, agora derivados de GM em vez de reparseados de sobrescrito.
    expect(massaDeGm('earth')! / 1e24).toBeCloseTo(5.972, 3);
    expect(massaDeGm('jupiter')! / 1e27).toBeCloseTo(1.898, 3);
  });
});

describe('razaoTerra', () => {
  const raioTerra = raioEquatorialKm('earth');
  const massaTerra = massaDeGm('earth');

  it('põe Júpiter em 11,21 raios e 317,8 massas da Terra', () => {
    const raio = razaoTerra(raioEquatorialKm('jupiter'), raioTerra)!;
    expect(raio).toBeCloseTo(11.209, 3);
    expect(formatarRazaoTerra(raio)).toBe('11,21× Terra');

    const massa = razaoTerra(massaDeGm('jupiter'), massaTerra)!;
    expect(massa).toBeCloseTo(317.8, 1);
    expect(formatarRazaoTerra(massa)).toBe('317,83× Terra');
  });

  it('não dá selo a Mimas: 6,3e-6 da massa da Terra é abaixo do piso', () => {
    // A regra herdada do doador, com o motivo dele: duas casas decimais
    // escreveriam "0,00× Terra" para um corpo que evidentemente tem massa.
    expect(massaDeGm('mimas')! / massaTerra!).toBeCloseTo(6.28e-6, 8);
    expect(razaoTerra(massaDeGm('mimas'), massaTerra)).toBeNull();
  });

  it('guarda algarismos significativos abaixo de 1 (Io não vira 0,01)', () => {
    const io = razaoTerra(massaDeGm('io'), massaTerra)!;
    expect(io).toBeCloseTo(0.015, 3);
    expect(formatarRazaoTerra(io)).toBe('0,015× Terra');
  });

  it('escreve a Terra contra ela mesma como 1,00×, sem ruído de arredondamento', () => {
    expect(formatarRazaoTerra(razaoTerra(raioTerra, raioTerra)!)).toBe('1,00× Terra');
    // e a faixa de 1% em volta cai no mesmo lugar (a regra do doador)
    expect(razaoTerra(1.005, 1)).toBe(1);
    expect(razaoTerra(0.995, 1)).toBe(1);
  });

  it('recusa entrada sem medida em vez de devolver NaN', () => {
    expect(razaoTerra(null, 1)).toBeNull();
    expect(razaoTerra(1, null)).toBeNull();
    expect(razaoTerra(1, 0)).toBeNull();
    expect(razaoTerra(Number.NaN, 1)).toBeNull();
  });
});

describe('GM_CORPOS × MU_PARENT — a checagem independente, sem risco de pixel', () => {
  /**
   * `MU_PARENT` (`elementosOrbitais.ts`) É O PROPAGADOR e não se toca nesta
   * obra: trocar os sete valores de lá moveria satélites e mudaria as 54
   * vistas oficiais. `GM_CORPOS` nasce ao lado, para consumidor de TEXTO, e
   * esta prova é o que impede as duas tabelas de divergirem em silêncio.
   *
   * ELAS NÃO SÃO A MESMA GRANDEZA, e a prova respeita a diferença em vez de
   * fingir que não existe: `MU_PARENT` guarda o μ do SISTEMA (planeta mais
   * as luas dele — é o que um propagador de dois corpos precisa), enquanto
   * `GM_CORPOS` guarda o do CORPO (é o que a gravidade de superfície
   * precisa). Comparar um com o outro direto acusaria Júpiter de 2e-4 de
   * erro que é, na verdade, a massa dos galileanos.
   *
   * Então a conta é a soma: corpo + as luas que ESTA CASA desenha. O
   * resíduo medido, por pai, e o que ele é:
   *
   *   sun      5e-12  — contra k² da IAU 1976, fonte inteiramente outra
   *   jupiter  2,5e-8 — Amalteia, Tebe, Himalia… (não desenhadas)
   *   saturn   5,2e-8 — Hiperião, Febe, Jano…
   *   neptune  6,6e-7 — Nereida e as internas
   *   uranus   1,3e-6 ⎫ o valor de `MU_PARENT` veio de OUTRA fonte que não
   *   mars     1,4e-6 ⎭ o kernel (é o que o cabeçalho de lá já declara)
   *   pluto    6,3e-6 — Estige, Nix, Cérbero e Hidra, que a casa não desenha
   *
   * O teto de 1e-5 cobre o pior deles com folga e ainda assim é apertado o
   * bastante para pegar qualquer dígito trocado: mover uma casa decimal em
   * qualquer entrada desloca o resultado em ordens de grandeza.
   */
  const LUAS_POR_PAI = new Map<string, string[]>();
  for (const lua of LUAS_DO_SISTEMA) {
    LUAS_POR_PAI.set(lua.pai, [...(LUAS_POR_PAI.get(lua.pai) ?? []), lua.id]);
  }

  it.each(Object.keys(MU_PARENT))('%s: corpo + luas reproduz o μ do sistema', (pai) => {
    const soma = [pai, ...(LUAS_POR_PAI.get(pai) ?? [])].reduce(
      (total, id) => total + GM_CORPOS[id]!,
      0
    );
    const relativo =
      Math.abs(paraUa3PorDia2(soma) - MU_PARENT[pai]!) / MU_PARENT[pai]!;
    expect(relativo).toBeLessThan(1e-5);
  });

  it('o Sol bate com a constante gaussiana da IAU 1976 a 1e-9', () => {
    // k² não passa por kernel nenhum: é a definição de 1976, e o GM do
    // DE440 é medição moderna. As duas concordarem a 5e-12 é a prova mais
    // independente que esta tabela tem.
    const relativo =
      Math.abs(paraUa3PorDia2(GM_CORPOS.sun!) - MU_SUN_AU3_PER_DAY2) /
      MU_SUN_AU3_PER_DAY2;
    expect(relativo).toBeLessThan(1e-9);
  });
});

describe('completude — todo alvo do Atlas tem física, ou a falta é nomeada', () => {
  const ALVOS = [
    ...CORPOS_DO_SISTEMA,
    ...LUAS_DO_SISTEMA,
    ...ANOES_DO_SISTEMA,
    ...ASTEROIDES_DO_SISTEMA,
  ].map((c) => c.id);

  it('cobre os 39 alvos menos os nomeados em SEM_GM_NO_KERNEL', () => {
    expect(ALVOS).toHaveLength(39);
    const semGm = ALVOS.filter((id) => GM_CORPOS[id] === undefined);
    expect(semGm).toEqual([...SEM_GM_NO_KERNEL]);
    expect(Object.keys(GM_CORPOS)).toHaveLength(38);
  });

  it('não sobra GM sem alvo — a tabela não guarda corpo que a casa não desenha', () => {
    const semAlvo = Object.keys(GM_CORPOS).filter((id) => !ALVOS.includes(id));
    expect(semAlvo).toEqual([]);
  });

  it('todo alvo com GM tem figura, logo gravidade e escape', () => {
    for (const id of ALVOS) {
      if (GM_CORPOS[id] === undefined) continue;
      expect(raioEquatorialKm(id), id).not.toBeNull();
      expect(gravidadeSuperficie(id), id).toBeGreaterThan(0);
      expect(velocidadeDeEscape(id), id).toBeGreaterThan(0);
    }
  });
});
