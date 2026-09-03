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
import { QUALIDADES, rotuloDaQualidade } from '../three/atlasConfig';
import type {
  EscolhaDeQualidade,
  EstadoDaQualidade,
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

export function Ajustes({
  aberto,
  onFechar,
  qualidade,
  onQualidade,
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
