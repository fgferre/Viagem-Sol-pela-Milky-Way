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
import { DEGRAUS_DA_UI, rotuloDaEscala } from '../lib/uiScale';
import { QUALIDADES, rotuloDaQualidade } from '../three/atlasConfig';
import type {
  EscolhaDeQualidade,
  EstadoDaQualidade,
  ToneMapMode,
} from '../three/core/engine';

const TONS: { id: ToneMapMode; nome: string; nota: string }[] = [
  { id: 'aces', nome: 'ACES', nota: 'comprime e dessatura os altos' },
  { id: 'agx', nome: 'AgX', nota: 'preserva croma, escurece' },
  { id: 'neutral', nome: 'Neutral', nota: 'meio-termo' },
  { id: 'linear', nome: 'Linear', nota: 'sem curva — estoura, mostra o cru' },
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
    <div className="hud-cartao hud-dialogo ajustes" aria-label="Ajustes de renderização" {...dialogo}>
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
        <p className="ajustes-nota">
          Troca ao vivo, sem recarregar. A parte pesada — a população da
          galáxia e o Sol — é refeita em segundo plano e entra de uma vez;
          até lá a cena continua como está. O <em>auto</em> deixa a medição
          escolher — e ninguém escolhe por você sem esse clique.
        </p>
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
