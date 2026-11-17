// ============================================================
// A DESCRIÇÃO DO ANEL — o que o anel É, num lugar só (17/11/2026, J1 do
// `PLAN-ANEIS.md`). Ela nasceu por MUDANÇA, não por invenção: cada número
// abaixo morava antes no disco (`gigante.ts`), nos pedaços
// (`pedrasDoAnel.ts`) ou nos véus (`aneisTenues.ts`), com a fonte que já
// tinha; agora as três máquinas leem daqui.
//
// O que NÃO entra: o nível de detalhe e o custo (ladrilhos, oitavas,
// limiares de pixel, contagens por nível do menu, fatias do assado). Isso é
// a máquina que decide, pela distância e pelo menu.
//
// Este arquivo não desenha nada e não importa nenhuma das máquinas (o disco
// importa os pedaços; a descrição tem de ficar fora desse fio).
// ============================================================
import { BODY_AXES } from '../../../lib/atlas/iauOrientation';

/** Uma região do anel: a fronteira e tudo o que muda nela. */
export interface RegiaoDoAnel {
  readonly nome: string;
  /** a fronteira de dentro da região, km do centro do planeta */
  readonly km: number;
  /** a meia largura da rampa na fronteira, km */
  readonly meia: number;
  /** ϖ₀ RELATIVO ao do B */
  readonly albedo: number;
  /** a fração do lobo para a frente */
  readonly poeira: number;
  /** o fator sobre o τ do perfil medido */
  readonly fatorTau: number;
  /** a espessura TOTAL da camada, km */
  readonly espessura: number;
  /** a força das esteiras de autogravidade */
  readonly esteira: number;
}

/** Uma das fitas do anel F: deslocamento e largura em km, brilho relativo. */
export interface FitaDoVeu {
  readonly desvioKm: number;
  readonly larguraKm: number;
  readonly brilho: number;
}

/** A descrição física de um anel: o que ele é, sem dizer como se desenha. */
export interface DescricaoDeAnel {
  /** o raio equatorial do planeta, km — a régua (`KM_POR_RAIO`) de todas as máquinas do anel */
  readonly raioEquatorialKm: number;
  /** GM do planeta, km³/s² — Ω(ρ) = √(GM/ρ³) */
  readonly gmKm3s2: number;
  /** os raios de dentro e de fora do desenho do disco, em raios equatoriais */
  readonly desenho: { readonly rInt: number; readonly rExt: number };
  /** o perfil radial medido: arquivo e grade (caixas sobre kmInterno–kmExterno) */
  readonly perfil: {
    readonly arquivo: string;
    readonly caixas: number;
    readonly kmInterno: number;
    readonly kmExterno: number;
  };
  /** os perfis de brilho medidos, na grade do `perfil` */
  readonly brilho: { readonly arquivo: string; readonly faseDaFrenteRad: number };
  /** as regiões, de dentro para fora; o valor num raio é {@link regiaoDoAnelCpu} */
  readonly regioes: readonly RegiaoDoAnel[];
  /** os pedaços: raios mínimo e máximo (km), a faixa de ρ em que existem (km), a agitação (km/s) */
  readonly pedacos: {
    readonly raioMinKm: number;
    readonly raioMaxKm: number;
    readonly rhoMinKm: number;
    readonly rhoMaxKm: number;
    readonly agitacaoKmS: number;
  };
  /** o período de corotação da magnetosfera, h — o relógio dos raios do B */
  readonly horasDaCorotacao: number;
  /** os véus tênues: o anel F (fitas excêntricas) e o anel E (toro) */
  readonly veus: {
    readonly f: {
      readonly raioKm: number;
      readonly fitas: readonly FitaDoVeu[];
      readonly dobraKm: number;
      readonly excentricidadeKm: number;
    };
    readonly e: {
      readonly internoKm: number;
      readonly externoKm: number;
      readonly picoKm: number;
      readonly sigmaKm: number;
    };
  };
}

/** O anel de Saturno. */
export const ANEL_DE_SATURNO: DescricaoDeAnel = {
  raioEquatorialKm: BODY_AXES.saturn[0]!,

  /** GM de Saturno, km³/s² (JPL: BODY699_GM = 37 931 206,23 do gm_de440.tpc, arredondado; o mesmo de `GM_CORPOS.saturn` em `src/lib/atlas/massas.ts`). */
  gmKm3s2: 37_931_207,

  /**
   * Raios do anel de Saturno em unidades do raio EQUATORIAL
   * (BODY_AXES.saturn[0] = 60 268 km). D-ring interno 66 900 / 60 268
   * = 1,110; F-ring externo 140 180 / 60 268 = 2,326. Cicatriz W5-B.
   */
  desenho: { rInt: 1.11, rExt: 2.326 },

  /**
   * O PERFIL RADIAL MEDIDO DO ANEL — o dado que aposentou a placa.
   *
   * 13.177 amostras a 5 km do modelo de anéis de Björn Jónsson (Voyager
   * PPS + Cassini, via o PDS Ring-Moon Systems Node), reamostradas em
   * 2.048 caixas de 36 km sobre 66 900–140 500 km. Dois arquivos, 14 KB:
   *
   *  - `anel-saturno-perfil.bin` — 2048 × RGBA8: **RGB** = cor da
   *    partícula (relativa, cada canal normalizado ao próprio máximo pela
   *    fonte), **A** = opacidade `1 − transparência`, que é `1 − e^{−τ}`
   *    visto de cima. É ele que entra em `uMapaAnel`.
   *
   * O QUE A PLACA NÃO SABIA e este dado sabe: a divisão de ENCKE (α 0,008
   * contra 0,401 do anel A ao lado), o C translúcido de verdade, e o
   * LADO ESCURO medido — o número que o item 133 teve de adivinhar.
   *
   * O LIMITE DECLARADO É O BYTE: com α em 8 bits, os 22 texels em 255
   * saem de `tauDaOpacidade` com τ ≈ 6,9 em vez do τ ≈ 2 real do anel B.
   * Em reflexão os dois saturam igual; em transmissão os dois dão zero. É
   * por isso que o cinza do lado escuro do B vem do PLANETSHINE, não daqui.
   *
   * Crédito e licença: `docs/reference/ASSETS.md`.
   */
  perfil: {
    arquivo: 'data/atlas/anel-saturno-perfil.bin',
    caixas: 2048,
    kmInterno: 66900,
    kmExterno: 140500,
  },

  /**
   * Os três perfis de BRILHO do mesmo modelo do Björn Jónsson
   * (`anel-saturno-brilho.bin`, `scripts/data/atlas/anel-brilho.mjs`) — retro
   * (lado iluminado, fase baixa, Voyager 2), frente (fase 139°, Voyager 1) e
   * lado sem luz —, na grade do `perfil`. Quem os lê é `BRILHO_MEDIDO_DO_ANEL`
   * (gigante.ts).
   */
  brilho: {
    arquivo: 'data/atlas/anel-saturno-brilho.bin',
    /** a fase do perfil de frente (Voyager 1), em radianos */
    faseDaFrenteRad: (139 * Math.PI) / 180,
  },

  /**
   * AS REGIÕES DO ANEL — o que o perfil medido não sabe, por região
   * (12/11/2026, pilar 4), e a camada dos pedaços na mesma fronteira.
   *
   * MEDIDO NO APP, antes desta tabela: com o τ certo do dado mas a MESMA
   * partícula em todo raio, a face iluminada saía B : divisão : A ≈
   * 1 : 0,62 : 0,8 (vista de alta abertura, fase baixa, luz linear) — a
   * divisão de Cassini e o C quase tão claros quanto o B. As fotos dizem
   * ~1 : 0,2 : 0,7. A causa é a CROMA do dado: cada canal foi normalizado ao
   * próprio máximo na fonte, então o nível do brilho se perdeu e só a cor
   * relativa ficou (`COR_B_DO_PERFIL`, gigante.ts). O albedo da partícula
   * tinha de voltar de algum lugar, e volta daqui.
   *
   * TRÊS COLUNAS DA LUZ, todas DERIVADAS da literatura (de memória do
   * assistente, não de arquivo do repositório — o selo diz "derivado"), por
   * região, com fronteiras nos raios clássicos (km):
   *  - `albedo`: ϖ₀ RELATIVO ao do B. A e B ≈ 0,5–0,6; C e divisão ≈ 0,2–0,3
   *    (Cuzzi et al. 2009, "Ring particle composition and size
   *    distribution", em Saturn from Cassini-Huygens; Porco et al. 2005,
   *    Science 307, 1226): partículas sujas pela poeira de meteoróides.
   *  - `poeira`: a fração do LOBO PARA A FRENTE (`K_DIFRACAO`, gigante.ts).
   *    Grão de mícron espalha para a frente; pedra de cm–m não (o lobo dela
   *    tem segundos de arco). O D, a borda de fora do A e os vãos são
   *    poeirentos — é o que acende na contraluz; o miolo do B e do A, não.
   *    Antes desta tabela o lobo valia o mesmo no anel inteiro, e o B ACENDIA
   *    contra o Sol, o oposto da foto da Cassini (PIA08329, "In Saturn's
   *    Shadow").
   *  - `fatorTau`: o τ do B no dado sai de opacidade em 8 bits de um
   *    fotômetro da Voyager (média ≈ 1,9, e 0,7–0,9 no B1); as ocultações da
   *    Cassini dão B1 ≈ 1–2, B2 ≈ 2–3, B3 > 5 (Colwell et al. 2009, no mesmo
   *    livro). Dobrar o τ do B preserva a estrutura medida e põe a média na
   *    ordem certa — é o que deixa o B ESCURO visto por trás.
   *
   * DUAS COLUNAS DOS PEDAÇOS: a ESPESSURA TOTAL da camada, km — A ~6–10 m
   * (Colwell et al. 2006; Hedman et al. 2007): 8 m; C 1,9–5,6 m (Baillié et
   * al. 2011): 4 m; divisão de Cassini 2–20 m (Tiscareno et al. 2007): 10 m;
   * o B não foi medido: 8 m, o do A, adotado — e a FORÇA DAS ESTEIRAS, só
   * no A e no B (ausentes no C e na divisão: Colwell 2006, Hedman 2007): 1 no
   * A e 1,05 no B, o que dá ao campo do ladrilho as razões pico:vale do campo
   * de antes (o B era mais contrastado).
   *
   * O VALOR NUM RAIO é a linha 0 mais os degraus suaves de cada fronteira:
   * `v = v₀ + Σ (vᵢ − vᵢ₋₁)·smoothstep(kmᵢ − meiaᵢ, kmᵢ + meiaᵢ, km)` — na
   * CPU, {@link regiaoDoAnelCpu}; no GLSL, `GLSL_REGIAO_DO_ANEL` (gigante.ts,
   * as três colunas da luz) e `regiaoDasPedras` (pedrasDoAnel.ts, as duas dos
   * pedaços), os dois gerados desta tabela.
   */
  regioes: [
    { nome: 'D', km: 0, meia: 0, albedo: 0.4, poeira: 1, fatorTau: 1, espessura: 0.004, esteira: 0 },
    { nome: 'C', km: 74490, meia: 150, albedo: 0.42, poeira: 0.25, fatorTau: 1, espessura: 0.004, esteira: 0 },
    // a borda de dentro do B é uma rampa de ~600 km, a de fora é afiada
    { nome: 'B', km: 91980, meia: 300, albedo: 1, poeira: 0, fatorTau: 2, espessura: 0.008, esteira: 1.05 },
    { nome: 'divisão de Cassini', km: 117580, meia: 60, albedo: 0.48, poeira: 0.4, fatorTau: 1, espessura: 0.01, esteira: 0 },
    // a RAMPA de fora da divisão (~120 800–122 100 km) já é o A subindo
    { nome: 'A', km: 121450, meia: 650, albedo: 0.85, poeira: 0.1, fatorTau: 1, espessura: 0.008, esteira: 1 },
    { nome: 'além do A', km: 136775, meia: 60, albedo: 0.6, poeira: 1, fatorTau: 1, espessura: 0.008, esteira: 0 },
  ],

  pedacos: {
    /**
     * OS TAMANHOS: o raio vai de 0,5 cm a 10 m, com n(a) ∝ a⁻³ (Zebker,
     * Marouf & Tyler 1985; Cuzzi et al. 2009; Harbison, Thomas & Nicholson
     * 2013). Nada maior existe no anel fora as luazinhas das hélices, que
     * não entram aqui.
     */
    raioMinKm: 0.5e-5,
    raioMaxKm: 0.01,
    /** a faixa de raio em que os pedaços podem existir (a da lajota) */
    rhoMinKm: 55_000,
    rhoMaxKm: 160_000,
    /**
     * A AGITAÇÃO: a velocidade aleatória entre vizinhos, ~1 mm/s. Não medida:
     * é a que dá a camada de ~8 m (H ~ v/Ω). O giro próprio dos pedaços
     * supõe equipartição com ela.
     */
    agitacaoKmS: 1e-6,
  },

  /**
   * O PERÍODO DE COROTAÇÃO DA MAGNETOSFERA, em horas — o relógio dos raios
   * do anel B (a poeira erguida corotaciona com o campo, não com Kepler).
   * É o 10,66 h dele (`SaturnSystem.ts`).
   */
  horasDaCorotacao: 10.66,

  veus: {
    /**
     * O ANEL F, os números dele (`fRing.ts`): raio 140 180 km e três fitas com
     * deslocamento, largura e brilho próprios. A largura desenhada é 8× a
     * declarada porque o perfil transversal dele é uma gaussiana que já apaga
     * as bordas (`across`), e não uma faixa chapada. A dobra e a
     * excentricidade das fitas, em km (0,10 e 0,04 na régua dele, que é de
     * 1 000 km por unidade de cena).
     */
    f: {
      raioKm: 140180,
      fitas: [
        { desvioKm: 0, larguraKm: 45, brilho: 1.0 },
        { desvioKm: -180, larguraKm: 25, brilho: 0.45 },
        { desvioKm: 210, larguraKm: 20, brilho: 0.35 },
      ],
      dobraKm: 100,
      excentricidadeKm: 40,
    },
    /**
     * O ANEL E, os números dele (`eRing.ts`): toro de 170 000 a 330 000 km com
     * densidade gaussiana em torno da órbita de Encélado (238 000 km, meia
     * largura 38 000 km). Grão de mícron espalha quase só PARA A FRENTE — o
     * anel some visto de frente e acende em contraluz, que é a razão de as
     * fotos dele existirem só contra o Sol.
     */
    e: {
      internoKm: 170000,
      externoKm: 330000,
      picoKm: 238000,
      sigmaKm: 38000,
    },
  },
};

const suave = (a: number, b: number, x: number): number => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/** As {@link RegiaoDoAnel} de Saturno num raio `km`, na CPU (a espessura em km). */
export function regiaoDoAnelCpu(km: number): {
  albedo: number;
  poeira: number;
  fatorTau: number;
  espessura: number;
  esteira: number;
} {
  const regioes = ANEL_DE_SATURNO.regioes;
  const r0 = regioes[0]!;
  let albedo = r0.albedo;
  let poeira = r0.poeira;
  let fatorTau = r0.fatorTau;
  let espessura = r0.espessura;
  let esteira = r0.esteira;
  for (let k = 1; k < regioes.length; k++) {
    const r = regioes[k]!;
    const a = regioes[k - 1]!;
    const s = suave(r.km - r.meia, r.km + r.meia, km);
    albedo += (r.albedo - a.albedo) * s;
    poeira += (r.poeira - a.poeira) * s;
    fatorTau += (r.fatorTau - a.fatorTau) * s;
    espessura += (r.espessura - a.espessura) * s;
    esteira += (r.esteira - a.esteira) * s;
  }
  return { albedo, poeira, fatorTau, espessura, esteira };
}
