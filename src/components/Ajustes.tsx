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
// A URL continua sendo a fonte de verdade: o painel escreve nela em vez de
// guardar estado próprio. Assim qualquer configuração vira link, e a captura
// headless (?t=&shot=2) enxerga exatamente o que a tela mostra — que é o que
// mantém scripts/visual/rodada.mjs honesto.
// ============================================================
import { useEffect, useState } from 'react';
import type { QualityLevel, ToneMapMode } from '../three/core/engine';

const TONS: { id: ToneMapMode; nome: string; nota: string }[] = [
  { id: 'aces', nome: 'ACES', nota: 'comprime e dessatura os altos' },
  { id: 'agx', nome: 'AgX', nota: 'preserva croma, escurece' },
  { id: 'neutral', nome: 'Neutral', nota: 'meio-termo' },
  { id: 'linear', nome: 'Linear', nota: 'sem curva — estoura, mostra o cru' },
];

const QUALIDADES: QualityLevel[] = ['cinema', 'alta', 'performance'];

// Cada flag desliga uma família. Os nomes são os que o Director já lê.
// `viva`: o tick lê a flag a cada quadro — troca AO VIVO, sem recarregar.
// As três restantes são lidas no BAKE do mundo e exigem reload de verdade.
const CAMADAS: { flag: string; nome: string; viva: boolean }[] = [
  { flag: 'nogal', nome: 'Galáxia (tudo)', viva: true },
  { flag: 'nodisc', nome: 'Lâminas do disco', viva: false },
  { flag: 'nogdust', nome: 'Extinção por partícula', viva: false },
  { flag: 'noglow', nome: 'Brilho do bojo', viva: false },
  { flag: 'nocart', nome: 'Cartografia observada', viva: true },
  { flag: 'nonebula', nome: 'Nebulosa volumétrica', viva: true },
  { flag: 'nowrap', nome: 'Campo envolvente', viva: true },
  { flag: 'nocat', nome: 'Catálogo HYG', viva: true },
  { flag: 'nohero', nome: 'Estrelas nomeadas', viva: true },
  { flag: 'nomarker', nome: 'Marcador do Sol', viva: true },
  { flag: 'nobh', nome: 'Buraco negro (Sgr A✱)', viva: true },
];

/** Reescreve a query preservando tudo que não é o parâmetro tocado. */
function comParam(chave: string, valor: string | null) {
  const q = new URLSearchParams(window.location.search);
  if (valor === null) q.delete(chave);
  else q.set(chave, valor);
  const s = q.toString();
  return `${window.location.pathname}${s ? `?${s}` : ''}`;
}

export function Ajustes({
  aberto,
  onFechar,
  qualidade,
  onQualidade,
  onTom,
  onExposicao,
  onCamada,
}: {
  aberto: boolean;
  onFechar: () => void;
  qualidade: QualityLevel;
  onQualidade: (q: QualityLevel) => void;
  onTom: (t: ToneMapMode) => void;
  onExposicao: (v: number) => void;
  onCamada: (flag: string, escondida: boolean) => void;
}) {
  const query = new URLSearchParams(window.location.search);
  const [tom, setTom] = useState<ToneMapMode>(
    (query.get('tone') as ToneMapMode) || 'aces'
  );
  const [exp, setExp] = useState(Number(query.get('exp') ?? 1.02));
  const [copiado, setCopiado] = useState(false);
  // estado local das camadas: a URL segue sendo a fonte de verdade, mas
  // as flags vivas mudam sem reload — o estado dá o re-render do painel
  const [escondidas, setEscondidas] = useState<Set<string>>(
    () => new Set(CAMADAS.filter((c) => query.has(c.flag)).map((c) => c.flag))
  );

  // O painel NÃO aplica ?tone=/?exp= na montagem: efeito de filho roda antes
  // do efeito do pai, então o Director ainda não existe aqui. Quem aplica é o
  // App, junto de ?q= e ?pos=, depois do init. O painel só reflete e edita.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && aberto) onFechar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  const trocarTom = (t: ToneMapMode) => {
    setTom(t);
    onTom(t);
    window.history.replaceState(null, '', comParam('tone', t === 'aces' ? null : t));
  };

  const trocarExp = (v: number) => {
    setExp(v);
    onExposicao(v);
    window.history.replaceState(null, '', comParam('exp', v === 1.02 ? null : String(v)));
  };

  const alternarCamada = (c: (typeof CAMADAS)[number], ligar: boolean) => {
    if (!c.viva) {
      // lidas no bake do mundo — reload de verdade
      window.location.assign(comParam(c.flag, ligar ? null : '1'));
      return;
    }
    onCamada(c.flag, !ligar);
    setEscondidas((prev) => {
      const s = new Set(prev);
      if (ligar) s.delete(c.flag);
      else s.add(c.flag);
      return s;
    });
    window.history.replaceState(null, '', comParam(c.flag, ligar ? null : '1'));
  };

  return (
    <div className="ajustes" role="dialog" aria-label="Ajustes de renderização">
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
              onChange={() => trocarTom(t.id)}
            />
            <span>{t.nome}</span>
            <em>{t.nota}</em>
          </label>
        ))}
      </div>

      <div className="ajustes-secao">
        <h3>Exposição · {exp.toFixed(2)}</h3>
        <input
          type="range"
          min="0.4"
          max="2.2"
          step="0.02"
          value={exp}
          onChange={(e) => trocarExp(Number(e.target.value))}
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
                onChange={() => alternarCamada(c, !ligado)}
              />
              <span>{c.viva ? c.nome : `${c.nome} ↻`}</span>
            </label>
          );
        })}
      </div>

      <div className="ajustes-secao">
        <button
          type="button"
          className="ajustes-copiar"
          onClick={() => {
            void navigator.clipboard.writeText(window.location.href).then(() => {
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1500);
            });
          }}
        >
          {copiado ? 'copiado' : 'copiar link desta configuração'}
        </button>
      </div>
    </div>
  );
}
