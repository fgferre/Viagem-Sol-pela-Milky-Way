// ============================================================
// O SOL NO QUADRO — a lei do palco aplicada ao Sol, por tick: o GATE em
// pixels (arma/desarma o corpo com a régua da Terra e da Lua), a
// REPARTIÇÃO da lei (M1 da LEI-DA-ESTRELA: uma função pura decide
// cessão, filtro e peso da malha) com o clarão de asas consumindo a
// soltura no mesmo quadro, e a CESSÃO do Sol-ponto na camada de
// planetas. Morava no director.ts em três trechos a ~400 linhas de
// distância (onda da arquitetura, Parte 1, corte 8); a semântica é a
// mesma, linha a linha, e os métodos são chamados nos MESMOS pontos do
// tick. Os punhos tardios (sun, palco, clarão, planetas, stars) entram
// por fio; o raio único do Sol entra UMA vez, pelo construtor — a
// fonte continua sendo o campo `solRaioPc` do director. Extraí-lo
// prepara o M3+ (estender a escada às nomeadas), que vai mexer
// exatamente aqui.
// ============================================================
import * as THREE from 'three';
import {
  CorposResolvidos,
  LIMIAR_DO_GATE_PX,
  diametroAparentePx,
  gateBinario,
} from '../world/corpos/corpos';
import { repartir } from '../estrela';
import type { JanelaDoQuadro, Reparticao } from '../estrela';
import { ClaraoDeAsas } from '../world/clarao';
import type { StellarBody } from '../world/stellarBody';
import type { Planetas } from '../world/planetas/planetas';
import type { StarField } from '../world/stars';
import { EXPO_M0, SIGMA_PX } from '../luzDaCasa';
import { BETA_DA_EMISSAO } from '../shaders/starShaders';
import { ORIGEM } from '../cinematic/enquadramento';
import { transmitanciaDoSolVisto } from '../../lib/atlas/arMedido';
import { AU_KM } from '../../lib/atlas/elementosOrbitais';
import { AU_PARA_PC } from '../../lib/atlas/frameGalactico';
import { IAU_ORIENTATIONS } from '../../lib/atlas/iauOrientation';
import { baseCorpoEquatorial } from '../../lib/atlas/orientacao';

const KM_POR_PC = AU_KM / AU_PARA_PC;

/**
 * A CESSÃO DO SOL-PONTO na camada de planetas (`aCede`; a luz do ponto é
 * `1 − aCede`): o PESO do ponto na repartição (wPonto) vezes a MESMA
 * transmitância do filtro solar que o disco recebe naquele tamanho
 * (`1/overrideFator`). F4 do filme solar: até aqui o ponto entrava com a
 * luz PLENA enquanto o disco ainda estava filtrado — 26 magnitudes de
 * diferença —, e 0,2 % de peso do ponto a 7,99 px já valia 10⁵ vezes o
 * disco: o Sol "virava ponto branco de repente" no fim da rampa (8 px),
 * em qualquer recuo. Com o filtro dos dois lados, disco e ponto têm o
 * mesmo brilho em todo tamanho, a luz total segue o filtro (contínua) e a
 * troca vira só troca de forma. Fora da rampa nada muda, bit a bit:
 * abaixo de 4 px o filtro é 1 exato (`overrideFator` = 1) e acima de
 * 8 px o peso do ponto é 0 exato. Fator inválido: o ponto sem filtro, a
 * direção de sempre.
 */
export function cessaoDoSol(lei: Pick<Reparticao, 'wPonto' | 'overrideFator'>): number {
  const transmitancia = lei.overrideFator > 1 ? 1 / lei.overrideFator : 1;
  return 1 - lei.wPonto * transmitancia;
}

export class SolNoQuadro {
  /**
   * O GATE DO SOL COMO CORPO (F2), estado da histerese entre quadros.
   * Nasce `false` porque o gate da casa entra por `>=` estrito e sai por
   * `<`: começar armado inverteria a decisão na primeira fronteira. É a
   * mesma partida de `TerraResolvida.armado`.
   */
  private solArmado = false;
  /** a repartição DESTE quadro — `atualizarCorpoEClarao` escreve, a
   *  cessão do ponto lê no mesmo tick */
  private leiDoSol: ReturnType<typeof repartir> | null = null;
  /**
   * O SOL ATRAVÉS DO AR DA TERRA, deste quadro: a transmitância medida da
   * luz do disco que passa por cima da Terra (`transmitanciaDoSolVisto`,
   * lib/atlas/arMedido.ts), multiplicada na radiância do disco, na cor do Sol-ponto e na emissão do
   * clarão — a luz do bloom sai delas. (1, 1, 1) EXATO longe da Terra.
   */
  readonly transmitanciaDoSolVisto: [number, number, number] = [1, 1, 1];
  /** a soltura do clarão do Sol DESTE quadro (a da repartição, a mesma que
   *  o clarão consome); os raios da lente seguem ela. 1 antes do 1º quadro. */
  get solturaDoSol(): number {
    return this.leiDoSol?.solturaDoClarao ?? 1;
  }
  private readonly vKm: [number, number, number] = [0, 0, 0];
  private readonly sSol: [number, number, number] = [0, 0, 0];

  private readonly fios: {
    /** o raio com que o Sol foi construído, em pc — a fonte única é o
     *  campo `solRaioPc` do director, entregue uma vez */
    solRaioPc: number;
    sun: () => StellarBody;
    palco: () => CorposResolvidos;
    clarao: () => ClaraoDeAsas | undefined;
    planetas: () => Planetas | null;
    stars: () => StarField | undefined;
    /** o estado vivo da Terra (centro e raio equatorial em pc), ou null */
    terra: () => Readonly<{ centroPc: THREE.Vector3; raioPc: number }> | null;
    /** o instante do quadro — o polo da Terra sai dele */
    jdTdb: () => number;
    /** `?nosun`/`?noclarao`/`?noplan` — os toggles de debug do director */
    escondido: (flag: string) => boolean;
    /** `?solquadro=a,b` (protótipo), lida uma vez pelo director; null = a lei de sempre */
    janelaDoQuadro: JanelaDoQuadro | null;
  };

  constructor(fios: SolNoQuadro['fios']) {
    this.fios = fios;
  }

  /**
   * O SOL SOB A LEI DO PALCO (F2 da onda do Sol real).
   *
   * Até a F3 o disco do Sol era decidido por JANELA EM PARSEC
   * (`LOD_SOL`, calibrada para UM raio: o inflado). Agora ele passa
   * pela MESMA lei da Terra e da Lua — `diametroAparentePx` contra
   * `LIMIAR_DO_GATE_PX` (4 px de diâmetro), com o cushion 2× da
   * histerese. Não é troca de gosto: uma janela em pc só vale para um
   * raio, e é a régua de TAMANHO NA TELA que a Onda 7 (corpo por
   * estrela) pode herdar sem número novo.
   *
   * A ARITMÉTICA — desde a F3 ela é a lei ÚNICA do grupo do Sol, e não
   * mais uma segunda opinião por cima da janela em parsec (lente de
   * 58°, buffer efetivo do harness de 1.713 px de altura ⇒
   * 1.545,1 px/rad):
   *  · raio FÍSICO (2,2567e-8 pc): arma abaixo de 3,60 UA (4 px) e
   *    desarma acima de 7,19 UA (2 px).
   * Na F2 este gate era INERTE por aritmética (o disco artístico só
   * desenhava acima de 4.125 UA, 1.147× além de onde o corpo real
   * arma, e as duas faixas nunca coexistiam) — foi assim que ele
   * entrou sem custar um pixel. A F3 apagou a outra faixa, e o que era
   * inerte virou o único juiz: é ele que faz o Sol da abertura
   * refilmada existir a 5,74 raios solares e virar ponto por volta de
   * t≈8,5 s da hélice, sem uma janela em parsec no caminho.
   *
   * O SOL NO PALCO. Até a F3 havia aqui uma guarda a mais —
   * `solRaioPc !== WORLD.sunRadius` —, e ela NÃO era gate de fase: era
   * doutrina do palco. Ali moram SUPERFÍCIES REAIS (é delas que o near
   * deriva onde a câmera tem de parar), e um corpo inflado não é
   * superfície, é cenário. Medido na época: registrar o Sol artístico
   * poria uma superfície a 0,011 pc da origem no `min()` do near, e
   * para a câmera além de ~1,375 pc o ramo do corpo passaria a ganhar
   * do `distFromSun × 0,004` — mudando o plano de corte em `interno`,
   * `travessia`, `mergulho`, `edgeon`, `faceon` e nas quatro de hero.
   * A guarda saiu porque o corpo inflado saiu: não existe mais o caso
   * que ela recusava, e a doutrina continua valendo por construção —
   * o palco só recebe o raio físico porque é o único que existe.
   */
  armarGate(q: { dHome: number; hPx: number; fovDeg: number }) {
    this.solArmado = gateBinario(
      this.solArmado,
      diametroAparentePx(this.fios.solRaioPc, q.dHome, q.hPx, q.fovDeg)
    );
    if (this.solArmado && !this.fios.escondido('nosun')) {
      this.fios.palco().registrar('sun', this.fios.solRaioPc, ORIGEM);
    } else {
      this.fios.palco().remover('sun');
    }
  }

  /**
   * (O CLARÃO DE ASAS desceu para DEPOIS da repartição — ele consome o
   * `overrideFator` do quadro, a transmitância do filtro solar. Ver o
   * bloco logo após `leiDoSol`.)
   *
   * `solArmado` entra AQUI, junto do `?nosun`, e não dentro do
   * `StellarBody`: o corpo não conhece a tela (não tem altura de buffer
   * nem lente), e o gate do palco é medido em PIXELS. O `sun.update`
   * continua fazendo o seu próprio corte de custo por cima
   * (`isDiscGroupVisible`) — os dois se somam com `&&`, e no raio
   * artístico o de lá sempre fecha primeiro (ver a conta no gate).
   */
  atualizarCorpoEClarao(q: {
    dHome: number;
    hPx: number;
    prAtual: number;
    tanHalfFov: number;
    camPos: THREE.Vector3;
    dtS: number;
  }) {
    const sun = this.fios.sun();
    const stars = this.fios.stars();
    sun.group.visible = !this.fios.escondido('nosun') && this.solArmado;
    this.medirOArDaTerra(q.camPos, q.dHome);
    sun.escreverTransmitancia(this.transmitanciaDoSolVisto);
    // ── A REPARTIÇÃO DA LEI (M1 da LEI-DA-ESTRELA) ─────────────────────
    // UMA função pura decide, por quadro, como o Sol é desenhado — no
    // lugar das quatro rampas de antes (`cessaoAlvo` sobre disco/halo,
    // `cessaoPeloGate` sobre disco/4px, `filtroSolarAlvo` em log
    // simétrico e o `Math.max` das duas primeiras, que tinha QUINA). Os
    // três contratos: o ESTADO vem do próprio corpo (`estadoDaLei`), a
    // OBSERVAÇÃO é a câmera deste tick, o INSTRUMENTO é a casa — o
    // `expoM0` do campo (constante desde que a pupila morreu no M2), e
    // `trocaPx` = o gate de corpo texturizado do palco (4 px), que
    // deixou de ser uma segunda lei e virou parâmetro (§3 da Lei).
    const leiDoSol = repartir(
      sun.estadoDaLei(),
      {
        distPc: q.dHome,
        direcao:
          q.dHome > 0
            ? [q.camPos.x / q.dHome, q.camPos.y / q.dHome, q.camPos.z / q.dHome]
            : [0, 0, 1],
      },
      {
        // A RÉGUA DE REFERÊNCIA (px de CSS), não o buffer: com `hPx`
        // cru, TODAS as janelas em px da repartição (troca, filtro,
        // soltura) abriam uma oitava adiante em retina — foi a perna
        // DPR 2 da escada que pegou (borrão crescendo 109→244 px entre
        // 3,6 e 7,2 UA, 17/08). Em DPR 1 a divisão é ×1 exata. A camada
        // do clarão já decidia em CSS desde a parte 1 da invariância;
        // agora a lei que a alimenta mede na mesma régua.
        alturaPx: q.hPx / q.prAtual,
        tanHalfFov: q.tanHalfFov,
        expoM0: stars?.expoM0 ?? EXPO_M0,
        sigmaPx: stars?.sigmaPx ?? SIGMA_PX,
        beta: BETA_DA_EMISSAO,
        trocaPx: LIMIAR_DO_GATE_PX,
        // a única representação resolvida do Sol hoje é a MALHA — a
        // esfera analítica (§1) nasce no M3/E3, onde é obrigatória;
        // a dívida está nomeada no cadastro de representações.
        requisitoGeometrico: 1,
        janelaDoQuadro: this.fios.janelaDoQuadro,
      }
    );
    this.leiDoSol = leiDoSol;
    // o corpo troca a radiância verdadeira pela paleta autorada com a
    // régua da lei (mesma `discoPx`, largura própria — §5.7)...
    // (sob `?solquadro=` o disco recebe a altura viva, a mesma régua do ponto)
    if (this.fios.janelaDoQuadro) sun.escreverFiltroSolar(leiDoSol.overrideExpoente, q.hPx / q.prAtual);
    else sun.escreverFiltroSolar(leiDoSol.overrideExpoente);
    // ...e ENTRA DO ZERO com o peso da representação resolvida: no armar
    // binário do gate do palco o peso ainda é 0, então o liga/desliga de
    // custo fica invisível em pixel, nos dois sentidos da histerese.
    sun.escreverPesoDaLei(leiDoSol.wResolvido * leiDoSol.wMalha);
    // O CLARÃO DE ASAS (M2): sem janela de distância — a elegibilidade é
    // do FLUXO (uma nomeada só ganha asa a poucos pc dela; o Sol, na
    // escada do item 3), e é a magnitude que apaga, nunca um corte em pc.
    // O Sol só é candidato enquanto a camada dos dez desenha o ponto dele
    // (fonte oculta não tem óptica; leitura do quadro anterior — a rampa
    // de 300 ms engole o único quadro de atraso). E a entrega da óptica é
    // a SOLTURA da própria repartição (R2 do item 44): uma rampa C¹ no
    // domínio do TAMANHO, zero onde o filtro completa (a fotosfera limpa
    // que o dono cobrou em 16/08 continua paga por construção) e plena no
    // ponto — as duas travas exponenciais que explodiam o clarão no recuo
    // (wPonto × 1/filtro) morreram na sonda densa de 17/08.
    const clarao = this.fios.clarao();
    if (clarao) {
      clarao.group.visible = !this.fios.escondido('noclarao');
      clarao.atualizar({
        camPos: q.camPos,
        screenH: q.hPx,
        dtS: q.dtS,
        solVisivel:
          !this.fios.escondido('noplan') &&
          (this.fios.planetas()?.points.visible ?? false),
        solturaDoSol: leiDoSol.solturaDoClarao,
        // a dose NÃO entra por aqui: o teto é um só e mora onde é
        // calculado (`OCUPACAO_MAXIMA_DA_TELA`, com a lei na docstring)
        expoM0: stars?.expoM0 ?? EXPO_M0,
        sigmaPx: stars?.sigmaPx ?? SIGMA_PX,
        pr: q.prAtual,
        transmitanciaDoSol: this.transmitanciaDoSolVisto,
      });
    }
  }

  /**
   * O AR DA TERRA NO RAIO ATÉ O SOL, uma vez por quadro, em float64 na CPU:
   * câmera e centro da Terra em pc → km, o Sol na origem da cena. Só vale
   * quando a Terra pode COBRIR o Sol (raio angular maior que o dele): uma
   * Terra menor que o disco solar na frente dele é trânsito — tapa uma
   * fatia, não apaga nem avermelha o Sol inteiro —, e aí fica (1, 1, 1),
   * deixando a profundidade do globo esconder o que ele cobre. Toda vista
   * em que o raio se afasta da Terra também sai (1, 1, 1) exato.
   */
  private medirOArDaTerra(camPos: THREE.Vector3, dHome: number) {
    const t = this.transmitanciaDoSolVisto;
    t[0] = 1;
    t[1] = 1;
    t[2] = 1;
    const terra = this.fios.terra();
    if (!terra || !(dHome > 0)) return;
    const v = this.vKm;
    v[0] = (camPos.x - terra.centroPc.x) * KM_POR_PC;
    v[1] = (camPos.y - terra.centroPc.y) * KM_POR_PC;
    v[2] = (camPos.z - terra.centroPc.z) * KM_POR_PC;
    const s = this.sSol;
    s[0] = -camPos.x / dHome;
    s[1] = -camPos.y / dHome;
    s[2] = -camPos.z / dHome;
    // o raio se afasta da Terra: nada a medir (o caso de quase todo quadro)
    if (!(v[0] * s[0] + v[1] * s[1] + v[2] * s[2] < 0)) return;
    const dTerraKm = Math.hypot(v[0], v[1], v[2]);
    const raioDaTerraKm = terra.raioPc * KM_POR_PC;
    const raioAngularDoSol = this.fios.solRaioPc / dHome;
    if (!(raioDaTerraKm / dTerraKm > raioAngularDoSol)) return;
    // sem instante válido, o polo de J2000 — a diferença é de 0,2°
    const jdTdb = this.fios.jdTdb();
    const jd = Number.isFinite(jdTdb) ? jdTdb : 2451545;
    const { polo } = baseCorpoEquatorial(IAU_ORIENTATIONS.earth, jd);
    const novo = transmitanciaDoSolVisto(v, s, polo, raioAngularDoSol);
    // um NaN aqui pintaria o Sol de NaN, e com o bloom a tela inteira de branco
    if (!(novo[0] >= 0 && novo[1] >= 0 && novo[2] >= 0)) return;
    t[0] = novo[0];
    t[1] = novo[1];
    t[2] = novo[2];
  }

  /**
   * A CESSÃO DO SOL-PONTO É A REPARTIÇÃO (M1): o ponto cede na exata
   * medida em que a fonte está RESOLVIDA na tela (rampa C¹ de 4 a 8 px de
   * disco), e o corpo entra do zero com o mesmo peso pelo outro lado
   * (`escreverPesoDaLei`, acima). A soma dos pesos é 1 por construção —
   * nenhuma dupla-luz, nenhum passo para trás, nenhuma quina de `max` —,
   * e desde a F4 o ponto passa pelo mesmo filtro do disco (`cessaoDoSol`,
   * acima da classe). Com o corpo ESCONDIDO (`?nosun`) o
   * ponto fica inteiro: ceder a uma malha invisível cegaria o quadro, e
   * a direção segura da lei é o ponto (§8.5).
   */
  cederPonto(planetas: Planetas) {
    planetas.escreverTransmitanciaDoSol(this.transmitanciaDoSolVisto);
    if (!this.leiDoSol) return;
    planetas.escreverCessao(
      'sun',
      this.fios.sun().group.visible ? cessaoDoSol(this.leiDoSol) : 0
    );
  }
}
