// ============================================================
// Painel de ajustes — o que é GOSTO vira controle, não constante.
//
// Duas classes de ajuste, tratadas diferente de propósito:
//
//   ao vivo   tom, exposição, qualidade e as camadas com viva:true —
//             o tick do Director lê essas flags a cada quadro
//             (setLayerHidden), então a troca é imediata, sem reload.
//   recarrega só nodisc/nogdust/noglow: lidas no BAKE do mundo, na
//             construção — religá-las exige reconstruir.
//
// A URL continua sendo a fonte de verdade: quem escreve nela é o App, e o
// painel só reflete e edita. Assim qualquer configuração vira link, e a
// captura headless (?t=&shot=2) enxerga exatamente o que a tela mostra —
// que é o que mantém scripts/visual/rodada.mjs honesto.
//
// DESDE A F2 DA ONDA 5 o painel não guarda mais tom, exposição nem
// camadas: esse estado subiu para o App. Não foi arrumação — o Atlas
// ganhou uma SEGUNDA porta para as mesmas camadas (a gaveta) e um selo
// que declara desvio de brilho; com o estado aqui dentro, desligar uma
// camada na gaveta deixava a caixa do painel marcada, e o selo dizendo
// "voltei ao real" deixava o slider mostrando o valor antigo. Um estado,
// um dono.
// ============================================================
import { useState } from 'react';
import { useDialogFocus } from '../lib/dialogFocus';
import { DEGRAUS_DA_UI, rotuloDaEscala } from '../lib/uiScale';
import { CAMADAS } from '../three/atlasConfig';
import type { QualityLevel, ToneMapMode } from '../three/core/engine';

const TONS: { id: ToneMapMode; nome: string; nota: string }[] = [
  { id: 'aces', nome: 'ACES', nota: 'comprime e dessatura os altos' },
  { id: 'agx', nome: 'AgX', nota: 'preserva croma, escurece' },
  { id: 'neutral', nome: 'Neutral', nota: 'meio-termo' },
  { id: 'linear', nome: 'Linear', nota: 'sem curva — estoura, mostra o cru' },
];

const QUALIDADES: QualityLevel[] = ['cinema', 'alta', 'performance'];

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
  escondidas,
  onCamada,
  urlParaCopiar,
  onReverConvite,
}: {
  aberto: boolean;
  onFechar: () => void;
  qualidade: QualityLevel;
  onQualidade: (q: QualityLevel) => void;
  tom: ToneMapMode;
  onTom: (t: ToneMapMode) => void;
  exposicao: number;
  onExposicao: (v: number) => void;
  /** fator do tamanho do texto do HUD (`?ui=`) — 1 é o de sempre */
  escalaUi: number;
  onEscalaUi: (v: number) => void;
  /** flags das camadas ESCONDIDAS agora — o dono do estado é o App */
  escondidas: ReadonlySet<string>;
  onCamada: (flag: string, ligar: boolean) => void;
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
    <div className="ajustes" aria-label="Ajustes de renderização" {...dialogo}>
      <div className="ajustes-topo">
        <span>Ajustes</span>
        <button type="button" onClick={onFechar} aria-label="Fechar ajustes">
          ✕
        </button>
      </div>

      <div className="ajustes-secao">
        <h3>Curva de tom</h3>
        <p className="ajustes-nota">
          Decide o que acontece com o que passa de 1. Muda croma e faixa
          dinâmica — é escolha, não medida.
        </p>
        {TONS.map((t) => (
          <label key={t.id} className="ajustes-radio">
            <input
              type="radio"
              name="tom"
              checked={tom === t.id}
              onChange={() => onTom(t.id)}
            />
            <span>{t.nome}</span>
            <em>{t.nota}</em>
          </label>
        ))}
      </div>

      <div className="ajustes-secao">
        <h3>Exposição · {exposicao.toFixed(2)}</h3>
        <input
          type="range"
          min="0.4"
          max="2.2"
          step="0.02"
          value={exposicao}
          aria-label="Exposição"
          onChange={(e) => onExposicao(Number(e.target.value))}
        />
      </div>

      <div className="ajustes-secao">
        <h3>Qualidade</h3>
        <div className="ajustes-linha">
          {QUALIDADES.map((q) => (
            <button
              type="button"
              key={q}
              className={qualidade === q ? 'on' : ''}
              onClick={() => onQualidade(q)}
              title="Recarrega: o tier do Sol e a população da galáxia são decididos na construção"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="ajustes-secao">
        <h3>Tamanho do texto · {rotuloDaEscala(escalaUi)}</h3>
        <p className="ajustes-nota">
          Vale para o HUD inteiro — legenda, controles, selo e os nomes das
          estrelas. Não mexe na cena: dentro do Atlas o enquadramento recua
          um pouco para o texto maior não cobrir o alvo.
        </p>
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

      <div className="ajustes-secao">
        <h3>Camadas</h3>
        <p className="ajustes-nota">
          Trocam ao vivo; as marcadas com ↻ recarregam a página (são
          decididas na construção do mundo).
        </p>
        {CAMADAS.map((c) => {
          const ligado = !escondidas.has(c.flag);
          return (
            <label key={c.flag} className="ajustes-check">
              <input
                type="checkbox"
                checked={ligado}
                onChange={() => onCamada(c.flag, !ligado)}
              />
              <span>{c.viva ? c.nome : `${c.nome} ↻`}</span>
            </label>
          );
        })}
      </div>

      {onReverConvite && (
        <div className="ajustes-secao">
          <h3>Convite</h3>
          <p className="ajustes-nota">
            Os três gestos do voo livre, apontados na própria tela.
          </p>
          <button type="button" className="ajustes-copiar" onClick={onReverConvite}>
            rever o convite
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
          {copiado ? 'copiado' : 'copiar link deste instante'}
        </button>
      </div>
    </div>
  );
}
