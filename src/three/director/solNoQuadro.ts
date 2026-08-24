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
import { ClaraoDeAsas } from '../world/clarao';
import type { StellarBody } from '../world/stellarBody';
import type { Planetas } from '../world/planetas/planetas';
import type { StarField } from '../world/stars';
import { EXPO_M0, SIGMA_PX } from '../luzDaCasa';
import { BETA_DA_EMISSAO } from '../shaders/starShaders';
import { ORIGEM } from '../cinematic/enquadramento';

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

  private readonly fios: {
    /** o raio com que o Sol foi construído, em pc — a fonte única é o
     *  campo `solRaioPc` do director, entregue uma vez */
    solRaioPc: number;
    sun: () => StellarBody;
    palco: () => CorposResolvidos;
    clarao: () => ClaraoDeAsas | undefined;
    planetas: () => Planetas | null;
    stars: () => StarField | undefined;
    /** `?nosun`/`?noclarao`/`?noplan` — os toggles de debug do director */
    escondido: (flag: string) => boolean;
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
      }
    );
    this.leiDoSol = leiDoSol;
    // o corpo troca a radiância verdadeira pela paleta autorada com a
    // régua da lei (mesma `discoPx`, largura própria — §5.7)...
    sun.escreverFiltroSolar(leiDoSol.overrideExpoente);
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
      });
    }
  }

  /**
   * A CESSÃO DO SOL-PONTO É A REPARTIÇÃO (M1): aCede = wResolvido — o
   * ponto cede na exata medida em que a fonte está RESOLVIDA na tela
   * (rampa C¹ de 4 a 8 px de disco), e o corpo entra do zero com o
   * mesmo peso pelo outro lado (`escreverPesoDaLei`, acima). A soma dos
   * pesos é 1 por construção — nenhuma dupla-luz, nenhum passo para
   * trás, nenhuma quina de `max`. Com o corpo ESCONDIDO (`?nosun`) o
   * ponto fica inteiro: ceder a uma malha invisível cegaria o quadro, e
   * a direção segura da lei é o ponto (§8.5).
   */
  cederPonto(planetas: Planetas) {
    if (!this.leiDoSol) return;
    planetas.escreverCessao(
      'sun',
      this.fios.sun().group.visible ? this.leiDoSol.wResolvido : 0
    );
  }
}
