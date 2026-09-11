// ============================================================
// Painel de ajustes — o que é GOSTO vira controle, não constante.
//
// O QUE ELE É DESDE 22/08 (item 61): quinze controles de RENDERIZAÇÃO e
// de sessão — curva de tom, exposição, qualidade, tamanho do texto, o
// convite e o link. As CAMADAS saíram daqui. Palavras do dono: *"atlas -
// camadas e ajustes concorrem. vc nao acha que varios elementos que hj
// estao em ajustes na verdade deveriam ser camadas?"* — e o fato que a
// queixa media: 17 dos 32 controles deste painel ERAM as camadas, que
// tinham ao mesmo tempo uma gaveta própria com seis delas. Duas portas
// para a mesma tabela. A porta agora é a gaveta (`GavetaDeCamadas`), nos
// dois modos, e este painel ficou com o que é dele.
//
// REDESENHO (05/09) — veredito do dono: *"muito complexo, muitas
// explicações em letra pequena, pouco claro o que é a opção que está
// sendo alterada"*. Três mudanças:
//  1. LINHA, não parágrafo — cada controle é `.ajustes-item`: rótulo à
//     esquerda, controle à direita. O `<h3>` de seção só sobrevive onde
//     agrupa MAIS de uma linha (a gaveta Avançado); nos demais o próprio
//     rótulo da linha já diz o que ela é, e repetir num título acima
//     seria a mesma complexidade que o dono apontou.
//  2. AS NOTAS VIRARAM DICA — o texto miúdo que explicava cada opção só
//     aparece sob um "?": no hover/foco (CSS) ou fixado por clique
//     (estado `dicaPresa`, só um por vez).
//  3. GRUPOS DE BOTÃO VIRARAM SEGMENTADO — mesma semântica
//     (`role="group"`, `aria-pressed`), moldura só. Nos cinco controles
//     da gaveta Avançado, o segmento que bate com o valor que o PRESET
//     resolve ganha `.efetivo` — visível SÓ quando "Preset" é a escolha
//     ativa, para o visitante ver o que a máquina está desenhando sem
//     abrir mão de "Preset" para descobrir.
//
// AO VIVO: tom, exposição e tamanho do texto — o tick lê a cada quadro,
// então a troca é imediata.
//
// A QUALIDADE também troca ao vivo desde 2026-08-20 (Ajustes C): a
// metade assada dela — população da galáxia, tier do Sol, alvo de
// textura dos corpos — nasce num mundo paralelo (worker + bake fatiado)
// e entra por troca de ponteiro num quadro só. NADA no painel recarrega.
//
// A URL continua sendo a fonte de verdade: quem escreve nela é o App, e o
// painel só reflete e edita. Assim qualquer configuração vira link, e a
// captura headless (?t=&shot=2) enxerga exatamente o que a tela mostra —
// que é o que mantém scripts/visual/rodada.mjs honesto.
//
// DESDE A F2 DA ONDA 5 o painel não guarda tom nem exposição: esse
// estado subiu para o App. Não foi arrumação — o selo declara desvio de
// brilho, e com o estado aqui dentro o selo dizendo "voltei ao real"
// deixava o slider mostrando o valor antigo. Um estado, um dono.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useDialogFocus } from '../lib/dialogFocus';
import { IDIOMAS, definirIdioma, t } from '../lib/idioma';
import type { ChaveDeTexto } from '../lib/idioma';
import { useIdioma } from '../hooks/useIdioma';
import { useDicaPresa } from '../hooks/useDicaPresa';
import { Ajuda } from './Ajuda';
import { CabecalhoDoPainel } from './CabecalhoDoPainel';
import { Icone } from './Icone';
import { Sanfona } from './Sanfona';
import { Segmentado } from './Segmentado';
import { DEGRAUS_DA_UI, rotuloDaEscala } from '../lib/uiScale';
import {
  QUALIDADES,
  gasVolumetricoEmTexto,
  nivelDaNebulosaEmTexto,
  particulasDaGalaxiaEmTexto,
  rotuloDaEscalaDeResolucao,
  rotuloDaQualidade,
} from '../three/atlasConfig';
import { PRESETS, ESCALAS_DE_RESOLUCAO } from '../three/core/engine';
import type {
  EscolhaDeQualidade,
  EstadoDaQualidade,
  GasVolumetrico,
  NivelDaNebulosa,
  ParticulasDaGalaxia,
  ToneMapMode,
} from '../three/core/engine';
import { AMOSTRAS_POR_TIER } from '../three/core/post';

/**
 * As quatro curvas. O NOME é marca (ACES, AgX) e não se traduz; a NOTA
 * é frase, e sai do dicionário na língua de agora (item 130).
 */
const TONS: { id: ToneMapMode; nome: string; nota: ChaveDeTexto }[] = [
  { id: 'aces', nome: 'ACES', nota: 'ajustes.tom.aces' },
  { id: 'agx', nome: 'AgX', nota: 'ajustes.tom.agx' },
  { id: 'neutral', nome: 'Neutral', nota: 'ajustes.tom.neutral' },
  { id: 'linear', nome: 'Linear', nota: 'ajustes.tom.linear' },
];

/**
 * OS QUATRO ESTADOS DA SUAVIZAÇÃO DE BORDAS (item 145) — o primeiro
 * controle da gaveta AVANÇADO. `null` é "do preset": a ausência de
 * escolha, e o padrão. Os números são as amostras do alvo, e o rótulo
 * deles é o próprio número (2×, 4×) — marca de hardware, não frase, e
 * por isso não passa pelo dicionário.
 *
 * O nome sai por FUNÇÃO e não por texto assado: `t` lê a língua viva, e
 * uma tabela de constantes nasceria na língua do primeiro import.
 */
const AMOSTRAS: { valor: number | null; nome: () => string }[] = [
  { valor: null, nome: () => t('ajustes.preset') },
  { valor: 0, nome: () => t('ajustes.msaaDesligada') },
  { valor: 2, nome: () => '2×' },
  { valor: 4, nome: () => '4×' },
];

/**
 * OS QUATRO ESTADOS DA NEBULOSA e os quatro da ESCALA DE RESOLUÇÃO
 * (item 145) — o segundo e o terceiro controles da gaveta. Mesmo molde
 * do MSAA: `null` é "do preset", e os valores são as CHAVES que vão à
 * URL e ao selo. Os níveis da nebulosa não têm números aqui de
 * propósito: quem guarda passos e escala é a tabela única do engine
 * (`NEBULOSA_POR_NIVEL`), a mesma que os presets consultam.
 */
const NEBULOSAS: { valor: NivelDaNebulosa | null; nome: () => string }[] = [
  { valor: null, nome: () => t('ajustes.preset') },
  ...(['baixa', 'media', 'alta'] as const).map((n) => ({
    valor: n,
    nome: () => nivelDaNebulosaEmTexto(n),
  })),
];

const ESCALAS: { valor: number | null; nome: () => string }[] = [
  { valor: null, nome: () => t('ajustes.preset') },
  ...ESCALAS_DE_RESOLUCAO.map((f) => ({
    valor: f as number,
    nome: () => rotuloDaEscalaDeResolucao(f),
  })),
];

/**
 * OS QUATRO ESTADOS DO GÁS VOLUMÉTRICO (item 145b) — o quarto controle
 * da gaveta, no mesmo molde da nebulosa: `null` é "do preset", e os
 * valores são as chaves que vão à URL (`?gas=`) e ao selo.
 */
const GASES: { valor: GasVolumetrico | null; nome: () => string }[] = [
  { valor: null, nome: () => t('ajustes.preset') },
  ...(['antigo', 'fino', 'macio'] as const).map((g) => ({
    valor: g,
    nome: () => gasVolumetricoEmTexto(g),
  })),
];

/**
 * OS QUATRO ESTADOS DAS PARTÍCULAS DA GALÁXIA (item 149) — o quinto
 * controle da gaveta, no mesmo molde do gás: `null` é "do preset", e os
 * valores são as chaves que vão à URL (`?particulas=`) e ao selo.
 */
const PARTICULAS: { valor: ParticulasDaGalaxia | null; nome: () => string }[] = [
  { valor: null, nome: () => t('ajustes.preset') },
  ...(['todas', 'metade', 'quarto'] as const).map((p) => ({
    valor: p,
    nome: () => particulasDaGalaxiaEmTexto(p),
  })),
];

/**
 * UMA LINHA DO PAINEL — rótulo à esquerda (com o "?" de ajuda quando há
 * dica), controle à direita. É o átomo do redesenho: o que era um
 * `<h3>` mais um `<p className="ajustes-nota">` mais a fileira de
 * botões vira UM elemento, e a explicação só aparece quando pedida.
 *
 * A DICA mostra no hover/foco do "?" (CSS, `@media (hover: hover)` +
 * `:focus-visible` em `.hud-ajuda`, 08-ajustes.css) e FIXA no clique —
 * só uma por vez, e é por isso
 * que o estado mora no painel, não na linha: fixar a de baixo tem de
 * apagar a de cima. O botão em si é `components/Ajuda.tsx` (06/09) —
 * a gaveta de Camadas usa o mesmo átomo.
 */
function LinhaDeAjuste({
  id,
  rotulo,
  dica,
  dicaPresa,
  onAlternarDica,
  children,
}: {
  id: string;
  rotulo: string;
  dica?: ReactNode;
  dicaPresa: string | null;
  onAlternarDica: (id: string) => void;
  children: ReactNode;
}) {
  const presa = dicaPresa === id;
  return (
    <div className="ajustes-item">
      <span className="ajustes-rotulo-caixa">
        <span className="ajustes-rotulo">{rotulo}</span>
        {dica != null && (
          <Ajuda
            id={id}
            rotulo={rotulo}
            texto={dica}
            presa={presa}
            onAlternar={() => onAlternarDica(id)}
          />
        )}
      </span>
      <div className="ajustes-controle">{children}</div>
    </div>
  );
}

export function Ajustes({
  aberto,
  ativo,
  onFechar,
  qualidade,
  onQualidade,
  onAmostras,
  onNebulosa,
  onEscala,
  onGas,
  onParticulas,
  tom,
  onTom,
  exposicao,
  onExposicao,
  escalaUi,
  onEscalaUi,
  rotulos3d,
  onRotulos3d,
  urlParaCopiar,
  onReverConvite,
  celular = false,
}: {
  aberto: boolean;
  /** o FECHAMENTO LÓGICO (`gaveta === 'ajustes'`), para o foco — distinto
   *  de `aberto` (presença): ver `GavetaDeCamadas` (E2, PLANO-MOTION-UI.md
   *  §12.5 C1.2) */
  ativo: boolean;
  onFechar: () => void;
  /** o estado inteiro (escolha, tier vivo, medição) — Ajustes D */
  qualidade: EstadoDaQualidade;
  onQualidade: (q: EscolhaDeQualidade) => void;
  /** a suavização de bordas escolhida à mão (item 145); `null` = do preset */
  onAmostras: (amostras: number | null) => void;
  /** o nível da nebulosa escolhido à mão (item 145); `null` = do preset */
  onNebulosa: (nivel: NivelDaNebulosa | null) => void;
  /** a escala de resolução escolhida à mão (item 145); `null` = do preset */
  onEscala: (fator: number | null) => void;
  /** o gás volumétrico escolhido à mão (item 145b); `null` = do preset */
  onGas: (variante: GasVolumetrico | null) => void;
  /** a fração de partículas da galáxia escolhida à mão (item 149); `null` = do preset */
  onParticulas: (nivel: ParticulasDaGalaxia | null) => void;
  tom: ToneMapMode;
  onTom: (t: ToneMapMode) => void;
  exposicao: number;
  onExposicao: (v: number) => void;
  /** fator do tamanho do texto do HUD (`?ui=`) — 1 é o de sempre */
  escalaUi: number;
  onEscalaUi: (v: number) => void;
  /** a BETA dos rótulos 3D (item 109) — só muda o desenho dos nomes */
  rotulos3d: boolean;
  onRotulos3d: (v: boolean) => void;
  /** a URL de agora COM o instante da viagem (App.urlComMomento) */
  urlParaCopiar: () => string;
  /**
   * Reabre o convite dos três gestos (F5). Ausente fora do voo livre —
   * uma seção que reabrisse, no meio do filme, um convite que ensina a
   * voar seria um botão que não faz nada.
   */
  onReverConvite?: () => void;
  /** alça de arrasto no cabeçalho (`CabecalhoDoPainel`) — só na folha do celular */
  celular?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  // O ANEL DE CONFIRMAÇÃO (reaudito C3d) — conta só sucessos REAIS do
  // clipboard; a falha (abaixo) nunca incrementa, então nunca acende — é
  // a mentira que o reaudito proíbe. `key={sucessosDeCopia}` remonta só o
  // `<span>` decorativo a cada sucesso (`.realce-anel`, 01-base.css), sem
  // tocar o botão em si.
  const [sucessosDeCopia, setSucessosDeCopia] = useState(0);
  // "AVANÇADO" RECOLHÍVEL (Lote 7) — fechado por padrão, sem persistir;
  // mesma anatomia do título de seção da ficha (`FichaDoObjeto.tsx`).
  const [avancadoAberto, setAvancadoAberto] = useState(false);
  // A FALHA DO CLIPBOARD (§9) — `null` é "sem falha"; enquanto houver uma
  // URL aqui, o campo somente-leitura fica visível logo abaixo dos botões.
  const [urlSemCopia, setUrlSemCopia] = useState<string | null>(null);
  const campoSemCopiaRef = useRef<HTMLInputElement>(null);
  const { presa: dicaPresa, alternar: alternarDica, limpar: limparDica, aoTeclarEsc } = useDicaPresa();
  const idioma = useIdioma();

  // O painel NÃO aplica ?tone=/?exp= na montagem: efeito de filho roda antes
  // do efeito do pai, então o Director ainda não existe aqui. Quem aplica é o
  // App, junto de ?q= e ?pos=, depois do init.
  //
  // O Esc que ficava num listener de `window` aqui virou parte do módulo
  // único (D7): o mesmo hook que prende o foco, devolve ao gatilho e
  // declara `aria-modal` — as três coisas que este painel não tinha.
  const dialogo = useDialogFocus('ajustes', ativo, onFechar);

  // O PRESET VIVO — o que MSAA/nebulosa/gás/partículas resolvem quando o
  // visitante não escolheu nada na gaveta. `qualidade.tier` é o tier
  // QUE ESTÁ RODANDO (em Auto ele muda sem clique), então o "efetivo" que
  // a linha mostra é sempre o do quadro de agora, nunca o de um tier que
  // só existe no seletor.
  const presetVivo = PRESETS[qualidade.tier];
  const amostrasEfetivas = AMOSTRAS_POR_TIER[qualidade.tier];

  // AO APARECER, o campo da falha recebe foco com a URL selecionada — quem
  // não conseguiu copiar automaticamente já sai com o texto pronto para
  // Ctrl+C (§9).
  useEffect(() => {
    if (urlSemCopia != null) {
      campoSemCopiaRef.current?.focus();
      campoSemCopiaRef.current?.select();
    }
  }, [urlSemCopia]);

  // COPIAR LINK (§9) — `urlParaCopiar` não muda; sucesso mostra "Copiado ✓"
  // por 1,5 s (o rótulo do botão não muda mais), falha (promessa rejeitada
  // ou sem `navigator.clipboard`) guarda a URL para o campo de leitura. Um
  // novo clique sempre limpa a falha antes de tentar de novo.
  function aoClicarCopiarLink() {
    setUrlSemCopia(null);
    const url = urlParaCopiar();
    const falha = () => setUrlSemCopia(url);
    if (!navigator.clipboard?.writeText) {
      falha();
      return;
    }
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiado(true);
        setSucessosDeCopia((n) => n + 1);
        setTimeout(() => setCopiado(false), 1500);
      })
      .catch(falha);
  }

  if (!aberto) return null;

  return (
    <div
      className="hud-cartao hud-dialogo ajustes"
      aria-label={t('ajustes.aria')}
      {...dialogo}
      onClick={() => {
        // CLIQUE EM QUALQUER LUGAR DO PAINEL desfixa a dica presa — o "?"
        // que a fixou já parou o próprio clique (`stopPropagation`), então
        // só chega aqui quem clicou fora dela.
        if (dicaPresa) limparDica();
      }}
      // ESC COM DICA PRESA desfixa e NÃO fecha o diálogo (`aoTeclarEsc`,
      // `hooks/useDicaPresa.ts` — o mesmo handler dos outros quatro
      // painéis, Lote 2a).
      onKeyDownCapture={aoTeclarEsc}
    >
      <CabecalhoDoPainel
        titulo={t('ajustes.titulo')}
        onFechar={onFechar}
        rotuloFechar={t('ajustes.fechar')}
        celular={celular}
      />

      {/* O SELETOR DE IDIOMA (item 130, F1). Mora AQUI e não na barra
          nem na URL: a barra é o lugar do que se usa a toda hora, e a
          URL desta casa é espelho da vista, não painel — knob de URL
          foi recusado pelo dono. Troca a língua AO VIVO, sem recarregar.
          O nome de cada língua vem NA PRÓPRIA LÍNGUA ("Português",
          "English"): quem não lê a língua de agora precisa reconhecer a
          dele na lista, e "Portuguese" não ajuda quem procura o
          português. */}
      <LinhaDeAjuste
        id="idioma"
        rotulo={t('ajustes.idioma')}
        dica={t('ajustes.idiomaNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.idioma')}
          valor={idioma}
          opcoes={IDIOMAS.map((lingua) => ({
            valor: lingua.id,
            nome: lingua.nome,
            lang: lingua.id,
          }))}
          onEscolher={definirIdioma}
        />
      </LinhaDeAjuste>

      <LinhaDeAjuste
        id="texto"
        rotulo={t('ajustes.texto', { degrau: rotuloDaEscala(escalaUi) })}
        dica={t('ajustes.textoNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.texto', { degrau: rotuloDaEscala(escalaUi) })}
          valor={escalaUi}
          opcoes={DEGRAUS_DA_UI.map((f) => ({ valor: f, nome: rotuloDaEscala(f) }))}
          onEscolher={onEscalaUi}
        />
      </LinhaDeAjuste>

      <LinhaDeAjuste
        id="qualidade"
        rotulo={t('ajustes.qualidade')}
        dica={t('ajustes.qualidadeNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.qualidade')}
          valor={qualidade.escolha}
          opcoes={QUALIDADES.map((q) => ({ valor: q.id, nome: q.nome }))}
          onEscolher={onQualidade}
        />
      </LinhaDeAjuste>
      {/* A MEDIÇÃO, DITA (Ajustes D). A frase é a mesma do título do
          seletor da barra — uma função só (`rotuloDaQualidade`), senão
          os dois hospedeiros contariam a mesma coisa de dois jeitos.
          Ela é `aria-live` porque muda SOZINHA: quem está com o painel
          aberto quando o quadro engasga tem de ouvir a sugestão sem
          precisar reabrir nada. */}
      {/* CLASSE MANTIDA (`ajustes-medida`): `scripts/visual/atlas-smoke.mjs`
          lê este seletor para tirar a leitura de q/s da captura — trocar o
          nome quebraria um consumidor fora deste arquivo, calado. */}
      <p className="ajustes-medida" role="status" aria-live="polite">
        {rotuloDaQualidade(qualidade)}
      </p>

      {/* EXPOSIÇÃO não tem "?": nunca teve nota própria (a frase que
          existia era só o valor, não uma explicação), e o redesenho não
          inventa texto novo — o valor mora ao lado do controle. */}
      <LinhaDeAjuste
        id="exposicao"
        rotulo={t('ajustes.exposicao')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <input
          type="range"
          min="0.4"
          max="2.2"
          step="0.02"
          value={exposicao}
          aria-label={t('ajustes.exposicao')}
          onChange={(e) => onExposicao(Number(e.target.value))}
        />
        <span className="ajustes-valor">{exposicao.toFixed(2)}</span>
      </LinhaDeAjuste>

      {/* A GAVETA AVANÇADO (item 145) — os presets na frente, os
          controles individuais atrás. Ela mora COLADA na seção da
          qualidade, e não no fim do painel, por causa da régua: o
          número de quadros/s que o visitante compara é o da linha logo
          acima, e um controle a três rolagens dela mediria memória em
          vez de desempenho. É o ÚNICO `<h3>` que sobrou no corpo do
          painel: agrupa CINCO linhas, e é aí que um título continua
          sendo economia, não repetição.

          RECOLHÍVEL, FECHADA POR PADRÃO (Lote 7) — mesma anatomia do
          título de seção da ficha (`FichaDoObjeto.tsx`): o `<h3>` só
          hospeda o botão, que carrega `aria-expanded`/`aria-controls` e
          o chevron que GIRA (C3c, reaudit: o mesmo SVG sempre, 0→90° por
          CSS — `.atlas-ficha-seta`, 04-atlas.css). Abrir/recolher não
          chama nenhum handler de valor; o `.efetivo` de cada segmento
          continua respondendo ao PRESET vivo, escondido ou não. */}
      <h3 className="ajustes-titulo-secao">
        <button
          type="button"
          aria-expanded={avancadoAberto}
          aria-controls="ajustes-avancado"
          onClick={() => setAvancadoAberto((v) => !v)}
        >
          <span>{t('ajustes.avancado')}</span>
          <span className="atlas-ficha-seta" aria-hidden="true">
            <Icone nome="chevronDireita" tamanho={16} />
          </span>
        </button>
      </h3>

      <Sanfona id="ajustes-avancado" aberta={avancadoAberto}>

      <LinhaDeAjuste
        id="tom"
        rotulo={t('ajustes.tom')}
        dica={
          <>
            <p>{t('ajustes.tomNota')}</p>
            <ul className="ajustes-dica-lista">
              {TONS.map((curva) => (
                <li key={curva.id}>
                  <strong>{curva.nome}</strong> — {t(curva.nota)}
                </li>
              ))}
            </ul>
          </>
        }
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.tom')}
          valor={tom}
          opcoes={TONS.map((curva) => ({ valor: curva.id, nome: curva.nome }))}
          onEscolher={onTom}
        />
      </LinhaDeAjuste>

      <LinhaDeAjuste
        id="msaa"
        rotulo={t('ajustes.msaa')}
        dica={t('ajustes.msaaNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.msaa')}
          valor={qualidade.amostras}
          opcoes={AMOSTRAS.map((a) => ({
            valor: a.valor,
            nome: a.nome(),
            efetivo:
              qualidade.amostras === null &&
              a.valor !== null &&
              a.valor === amostrasEfetivas,
          }))}
          onEscolher={onAmostras}
        />
      </LinhaDeAjuste>

      <LinhaDeAjuste
        id="nebulosa"
        rotulo={t('ajustes.nebulosaControle')}
        dica={t('ajustes.nebulosaNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.nebulosaControle')}
          valor={qualidade.nebulosa}
          opcoes={NEBULOSAS.map((n) => ({
            valor: n.valor,
            nome: n.nome(),
            efetivo:
              qualidade.nebulosa === null &&
              n.valor !== null &&
              n.valor === presetVivo.nebulosa,
          }))}
          onEscolher={onNebulosa}
        />
      </LinhaDeAjuste>

      <LinhaDeAjuste
        id="gas"
        rotulo={t('ajustes.gasControle')}
        dica={t('ajustes.gasNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.gasControle')}
          valor={qualidade.gas}
          opcoes={GASES.map((g) => ({
            valor: g.valor,
            nome: g.nome(),
            efetivo:
              qualidade.gas === null && g.valor !== null && g.valor === presetVivo.gas,
          }))}
          onEscolher={onGas}
        />
      </LinhaDeAjuste>

      <LinhaDeAjuste
        id="particulas"
        rotulo={t('ajustes.particulasControle')}
        dica={t('ajustes.particulasNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.particulasControle')}
          valor={qualidade.particulas}
          opcoes={PARTICULAS.map((p) => ({
            valor: p.valor,
            nome: p.nome(),
            efetivo:
              qualidade.particulas === null &&
              p.valor !== null &&
              p.valor === presetVivo.particulas,
          }))}
          onEscolher={onParticulas}
        />
      </LinhaDeAjuste>

      {/* ESCALA DE RESOLUÇÃO não ganha `.efetivo`: o teto do preset é
          `min(dpr do monitor, pixelRatio do preset)` — depende do
          MONITOR, não é uma fração fixa entre as três da lista, e
          fingir uma marcaria o segmento errado em metade das telas. */}
      <LinhaDeAjuste
        id="escala"
        rotulo={t('ajustes.escalaDeResolucao')}
        dica={t('ajustes.escalaDeResolucaoNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.escalaDeResolucao')}
          valor={qualidade.escala}
          opcoes={ESCALAS.map((e) => ({ valor: e.valor, nome: e.nome() }))}
          onEscolher={onEscala}
        />
      </LinhaDeAjuste>

      </Sanfona>

      <LinhaDeAjuste
        id="rotulos3d"
        rotulo={t('ajustes.rotulos3d')}
        dica={t('ajustes.rotulos3dNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.rotulos3d')}
          valor={rotulos3d}
          opcoes={[
            { valor: false, nome: t('ajustes.desligados') },
            { valor: true, nome: t('ajustes.ligados') },
          ]}
          onEscolher={onRotulos3d}
        />
      </LinhaDeAjuste>

      {/* OS DOIS BOTÕES DE AÇÃO (Lote 7) — largura cheia, empilhados, sem
          rótulo; "rever o convite" só existe no voo livre (`onReverConvite`
          ausente fora dele) e conserva o "?" com a nota do convite. */}
      <div className="ajustes-acoes">
        {onReverConvite && (
          <div className="ajustes-item ajustes-acao">
            <button type="button" className="ajustes-copiar" onClick={onReverConvite}>
              {/* `<span>` (C2 do plano de motion): a pressão da casa
                  afunda o filho (`> *`), e texto solto não tinha caixa
                  própria para comprimir. */}
              <span>{t('ajustes.reverConvite')}</span>
            </button>
            <Ajuda
              id="convite"
              rotulo={t('ajustes.convite')}
              texto={t('ajustes.conviteNota')}
              presa={dicaPresa === 'convite'}
              onAlternar={() => alternarDica('convite')}
            />
          </div>
        )}
        <button type="button" className="ajustes-copiar" onClick={aoClicarCopiarLink}>
          <span>{t('ajustes.copiarLink')}</span>
          {sucessosDeCopia > 0 && (
            <span className="realce-anel" aria-hidden="true" key={sucessosDeCopia} />
          )}
        </button>
      </div>
      {/* ESTADO SEMPRE PRESENTE (§9) — vazio fora do sucesso, só para o
          leitor de tela anunciar a troca quando "Copiado ✓" aparece. */}
      <p className="ajustes-copiar-estado" role="status" aria-live="polite">
        {copiado ? t('ajustes.copiado') : ''}
      </p>
      {urlSemCopia != null && (
        <>
          <div className="ajustes-aviso-falha" role="alert">
            <Icone nome="alerta" tamanho={16} />
            <span>{t('ajustes.copiaFalhou')}</span>
          </div>
          <input
            ref={campoSemCopiaRef}
            className="ajustes-campo-leitura"
            type="text"
            readOnly
            value={urlSemCopia}
            aria-label={t('ajustes.copiarLink')}
            onFocus={(e) => e.currentTarget.select()}
          />
        </>
      )}
    </div>
  );
}
