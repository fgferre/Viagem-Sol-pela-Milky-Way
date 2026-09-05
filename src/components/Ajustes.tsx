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
import { useState } from 'react';
import { useDialogFocus } from '../lib/dialogFocus';
import { IDIOMAS, definirIdioma, t } from '../lib/idioma';
import type { ChaveDeTexto } from '../lib/idioma';
import { useIdioma } from '../hooks/useIdioma';
import { DEGRAUS_DA_UI, rotuloDaEscala } from '../lib/uiScale';
import {
  QUALIDADES,
  gasVolumetricoEmTexto,
  nivelDaNebulosaEmTexto,
  particulasDaGalaxiaEmTexto,
  rotuloDaEscalaDeResolucao,
  rotuloDaQualidade,
} from '../three/atlasConfig';
import { ESCALAS_DE_RESOLUCAO } from '../three/core/engine';
import type {
  EscolhaDeQualidade,
  EstadoDaQualidade,
  GasVolumetrico,
  NivelDaNebulosa,
  ParticulasDaGalaxia,
  ToneMapMode,
} from '../three/core/engine';

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
  { valor: null, nome: () => t('ajustes.doPreset') },
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
  { valor: null, nome: () => t('ajustes.doPreset') },
  ...(['baixa', 'media', 'alta'] as const).map((n) => ({
    valor: n,
    nome: () => nivelDaNebulosaEmTexto(n),
  })),
];

const ESCALAS: { valor: number | null; nome: () => string }[] = [
  { valor: null, nome: () => t('ajustes.doPreset') },
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
  { valor: null, nome: () => t('ajustes.doPreset') },
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
  { valor: null, nome: () => t('ajustes.doPreset') },
  ...(['todas', 'metade', 'quarto'] as const).map((p) => ({
    valor: p,
    nome: () => particulasDaGalaxiaEmTexto(p),
  })),
];

export function Ajustes({
  aberto,
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
}: {
  aberto: boolean;
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
}) {
  const [copiado, setCopiado] = useState(false);
  const idioma = useIdioma();

  // O painel NÃO aplica ?tone=/?exp= na montagem: efeito de filho roda antes
  // do efeito do pai, então o Director ainda não existe aqui. Quem aplica é o
  // App, junto de ?q= e ?pos=, depois do init.
  //
  // O Esc que ficava num listener de `window` aqui virou parte do módulo
  // único (D7): o mesmo hook que prende o foco, devolve ao gatilho e
  // declara `aria-modal` — as três coisas que este painel não tinha.
  const dialogo = useDialogFocus('ajustes', aberto, onFechar);

  if (!aberto) return null;

  return (
    <div
      className="hud-cartao hud-dialogo ajustes"
      aria-label={t('ajustes.aria')}
      {...dialogo}
    >
      <div className="ajustes-topo">
        <span>{t('ajustes.titulo')}</span>
        <button type="button" onClick={onFechar} aria-label={t('ajustes.fechar')}>
          ✕
        </button>
      </div>

      {/* O SELETOR DE IDIOMA (item 130, F1). Mora AQUI e não na barra
          nem na URL: a barra é o lugar do que se usa a toda hora, e a
          URL desta casa é espelho da vista, não painel — knob de URL
          foi recusado pelo dono. É o mesmo molde de todo controle deste
          painel (fileira de botões, o de agora com `on`) e troca a
          língua AO VIVO, sem recarregar, como tudo o mais daqui.
          O nome de cada língua vem NA PRÓPRIA LÍNGUA ("Português",
          "English"): quem não lê a língua de agora precisa reconhecer a
          dele na lista, e "Portuguese" não ajuda quem procura o
          português. */}
      <div className="ajustes-secao">
        <h3>{t('ajustes.idioma')}</h3>
        <p className="ajustes-nota">{t('ajustes.idiomaNota')}</p>
        <div className="ajustes-linha">
          {IDIOMAS.map((lingua) => (
            <button
              type="button"
              key={lingua.id}
              lang={lingua.id}
              className={idioma === lingua.id ? 'on' : ''}
              aria-pressed={idioma === lingua.id}
              onClick={() => definirIdioma(lingua.id)}
            >
              {lingua.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="ajustes-secao">
        <h3>{t('ajustes.tom')}</h3>
        <p className="ajustes-nota">{t('ajustes.tomNota')}</p>
        {TONS.map((curva) => (
          <label key={curva.id} className="ajustes-radio">
            <input
              type="radio"
              name="tom"
              checked={tom === curva.id}
              onChange={() => onTom(curva.id)}
            />
            <span>{curva.nome}</span>
            <em>{t(curva.nota)}</em>
          </label>
        ))}
      </div>

      <div className="ajustes-secao">
        <h3>{t('ajustes.exposicaoCom', { valor: exposicao.toFixed(2) })}</h3>
        <input
          type="range"
          min="0.4"
          max="2.2"
          step="0.02"
          value={exposicao}
          aria-label={t('ajustes.exposicao')}
          onChange={(e) => onExposicao(Number(e.target.value))}
        />
      </div>

      <div className="ajustes-secao">
        <h3>{t('ajustes.qualidade')}</h3>
        <p className="ajustes-nota">{t('ajustes.qualidadeNota')}</p>
        <div className="ajustes-linha">
          {QUALIDADES.map((q) => (
            <button
              type="button"
              key={q.id}
              className={qualidade.escolha === q.id ? 'on' : ''}
              onClick={() => onQualidade(q.id)}
            >
              {q.nome}
            </button>
          ))}
        </div>
        {/* A MEDIÇÃO, DITA (Ajustes D). A frase é a mesma do título do
            seletor da barra — uma função só (`rotuloDaQualidade`), senão
            os dois hospedeiros contariam a mesma coisa de dois jeitos.
            Ela é `aria-live` porque muda SOZINHA: quem está com o painel
            aberto quando o quadro engasga tem de ouvir a sugestão sem
            precisar reabrir nada — e por isso a região tem SÓ a frase que
            muda. O convite ao auto é copy fixa e mora na nota acima; aqui
            dentro ele seria relido em voz alta a cada medida nova. */}
        <p className="ajustes-nota ajustes-medida" role="status" aria-live="polite">
          {rotuloDaQualidade(qualidade)}
        </p>
      </div>

      {/* A GAVETA AVANÇADO (item 145) — os presets na frente, os
          controles individuais atrás. Ela mora COLADA na seção da
          qualidade, e não no fim do painel, por causa da régua: o
          número de quadros/s que o visitante compara é o da linha logo
          acima, e um controle a três rolagens dela mediria memória em
          vez de desempenho. Mexeu aqui, o rótulo do seletor passa a
          dizer "Personalizado" — nos dois hospedeiros, porque a frase é
          uma só (`rotuloDaQualidade`). */}
      <div className="ajustes-secao">
        <h3>{t('ajustes.avancado')}</h3>
        <p className="ajustes-nota">
          <strong>{t('ajustes.msaa')}</strong> — {t('ajustes.msaaNota')}
        </p>
        <div className="ajustes-linha" aria-label={t('ajustes.msaa')} role="group">
          {AMOSTRAS.map((a) => (
            <button
              type="button"
              key={String(a.valor)}
              className={qualidade.amostras === a.valor ? 'on' : ''}
              aria-pressed={qualidade.amostras === a.valor}
              onClick={() => onAmostras(a.valor)}
            >
              {a.nome()}
            </button>
          ))}
        </div>

        <p className="ajustes-nota">
          <strong>{t('ajustes.nebulosaControle')}</strong> — {t('ajustes.nebulosaNota')}
        </p>
        <div
          className="ajustes-linha"
          aria-label={t('ajustes.nebulosaControle')}
          role="group"
        >
          {NEBULOSAS.map((n) => (
            <button
              type="button"
              key={String(n.valor)}
              className={qualidade.nebulosa === n.valor ? 'on' : ''}
              aria-pressed={qualidade.nebulosa === n.valor}
              onClick={() => onNebulosa(n.valor)}
            >
              {n.nome()}
            </button>
          ))}
        </div>

        <p className="ajustes-nota">
          <strong>{t('ajustes.gasControle')}</strong> — {t('ajustes.gasNota')}
        </p>
        <div
          className="ajustes-linha"
          aria-label={t('ajustes.gasControle')}
          role="group"
        >
          {GASES.map((g) => (
            <button
              type="button"
              key={String(g.valor)}
              className={qualidade.gas === g.valor ? 'on' : ''}
              aria-pressed={qualidade.gas === g.valor}
              onClick={() => onGas(g.valor)}
            >
              {g.nome()}
            </button>
          ))}
        </div>

        <p className="ajustes-nota">
          <strong>{t('ajustes.particulasControle')}</strong> —{' '}
          {t('ajustes.particulasNota')}
        </p>
        <div
          className="ajustes-linha"
          aria-label={t('ajustes.particulasControle')}
          role="group"
        >
          {PARTICULAS.map((p) => (
            <button
              type="button"
              key={String(p.valor)}
              className={qualidade.particulas === p.valor ? 'on' : ''}
              aria-pressed={qualidade.particulas === p.valor}
              onClick={() => onParticulas(p.valor)}
            >
              {p.nome()}
            </button>
          ))}
        </div>

        <p className="ajustes-nota">
          <strong>{t('ajustes.escalaDeResolucao')}</strong> —{' '}
          {t('ajustes.escalaDeResolucaoNota')}
        </p>
        <div
          className="ajustes-linha"
          aria-label={t('ajustes.escalaDeResolucao')}
          role="group"
        >
          {ESCALAS.map((e) => (
            <button
              type="button"
              key={String(e.valor)}
              className={qualidade.escala === e.valor ? 'on' : ''}
              aria-pressed={qualidade.escala === e.valor}
              onClick={() => onEscala(e.valor)}
            >
              {e.nome()}
            </button>
          ))}
        </div>
      </div>

      <div className="ajustes-secao">
        <h3>{t('ajustes.texto', { degrau: rotuloDaEscala(escalaUi) })}</h3>
        <p className="ajustes-nota">{t('ajustes.textoNota')}</p>
        <div className="ajustes-linha">
          {DEGRAUS_DA_UI.map((f) => (
            <button
              type="button"
              key={f}
              className={escalaUi === f ? 'on' : ''}
              onClick={() => onEscalaUi(f)}
            >
              {rotuloDaEscala(f)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3>{t('ajustes.rotulos3d')}</h3>
        <p className="ajustes-nota">{t('ajustes.rotulos3dNota')}</p>
        <div className="ajustes-linha">
          <button
            type="button"
            className={rotulos3d ? '' : 'on'}
            onClick={() => onRotulos3d(false)}
          >
            {t('ajustes.desligados')}
          </button>
          <button
            type="button"
            className={rotulos3d ? 'on' : ''}
            onClick={() => onRotulos3d(true)}
          >
            {t('ajustes.ligados')}
          </button>
        </div>
      </div>

      {onReverConvite && (
        <div className="ajustes-secao">
          <h3>{t('ajustes.convite')}</h3>
          <p className="ajustes-nota">{t('ajustes.conviteNota')}</p>
          <button type="button" className="ajustes-copiar" onClick={onReverConvite}>
            {t('ajustes.reverConvite')}
          </button>
        </div>
      )}

      <div className="ajustes-secao">
        <button
          type="button"
          className="ajustes-copiar"
          onClick={() => {
            void navigator.clipboard.writeText(urlParaCopiar()).then(() => {
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1500);
            });
          }}
        >
          {t(copiado ? 'ajustes.copiado' : 'ajustes.copiarLink')}
        </button>
      </div>
    </div>
  );
}
