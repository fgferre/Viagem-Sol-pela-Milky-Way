import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Icone } from '../../src/components/Icone';
import { tdbToDate } from '../../src/lib/atlas/time';
import { DEGRAUS_DE_TEMPO, mesmoMostrador, taxaDoDegrau, AVISO_SEM_EFEMERIDE, AVISO_BUSCANDO } from '../../src/three/tempoDoAtlas';
import type { Director } from '../../src/three/director';
import './relogio-atlas.css';

const dia = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const digitos = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const ultimo = DEGRAUS_DE_TEMPO - 1;
const etapa = (i: number, porExtenso = false) => {
  const taxa = taxaDoDegrau(i);
  const [divisor, unidade, nome]: [number, string, string] = taxa >= 86400 ? [86400, 'd', 'day']
    : taxa >= 3600 ? [3600, 'h', 'hour'] : taxa >= 60 ? [60, 'min', 'minute'] : [1, 's', 'second'];
  if (porExtenso) {
    return (taxa / divisor).toLocaleString('pt-BR', { style: 'unit', unit: nome, unitDisplay: 'long', maximumFractionDigits: 1 });
  }
  return digitos.format(taxa / divisor) + ' ' + unidade;
};

export function Relogio({ motor, celular }: { motor: Director; celular: boolean }) {
  const [tempo, ler] = useState(() => motor.tempo);
  const [aberto, abrir] = useState(false);
  const sentidoAnterior = useRef<-1 | 1>(1);
  const detalhe = useRef<HTMLButtonElement>(null);
  const tocar = useRef<HTMLButtonElement>(null);
  const caixa = useRef<HTMLElement>(null);
  const { aoVivo, sentido, degrau, aviso } = tempo;
  const marcha = aoVivo || sentido !== 0;
  const nivel = aoVivo ? 0 : degrau;
  const veloz = marcha && nivel >= 3;
  const dias = marcha && taxaDoDegrau(nivel) >= 86400;
  const data = tdbToDate(tempo.jd);
  const civil = new Date(Math.round(data.getTime() / 1000) * 1000);
  const iso = civil.toISOString();
  const dataCurta = dia.format(civil).replaceAll(' de ', ' ').replace('.', '');
  const hora = iso.slice(11, 16);
  const horaNaAlca = dias ? dataCurta.split(' ').slice(0, 2).join(' ') : iso.slice(11, veloz ? 16 : 19);
  const angulo = civil.getUTCSeconds() * Math.PI / 30;
  const estado = aviso === AVISO_SEM_EFEMERIDE ? 'Retrato' : aviso === AVISO_BUSCANDO ? 'Carregando'
    : aviso ? 'Limite' : aoVivo ? 'Ao vivo' : sentido === 0 ? 'Pausado' : sentido < 0 ? 'Recuando' : 'Avançando';
  const tipo = aviso ? 'aviso' : aoVivo ? 'vivo' : sentido === 0 ? 'pausa' : 'viagem';

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden || !caixa.current?.isConnected) return;
      const novo = motor.tempo;
      ler(anterior => anterior.jd === novo.jd && mesmoMostrador(anterior, novo) ? anterior : novo);
    }, 250);
    return () => clearInterval(id);
  }, [motor]);

  useEffect(() => {
    const alca = document.querySelector<HTMLElement>('[data-abre-dialogo="tempo"]');
    if (alca) {
      alca.dataset.estado = estado;
      alca.dataset.tipo = tipo;
      alca.dataset.instante = horaNaAlca;
      const rotulo = alca.querySelector('span');
      if (rotulo) rotulo.dataset.estado = estado;
      alca.title = 'Tempo · ' + estado + ' · ' + horaNaAlca + ' UTC';
      alca.setAttribute('aria-label', 'Tempo · ' + estado);
    }
  }, [estado, tipo, celular, horaNaAlca]);

  useEffect(() => {
    if (!aberto || celular) return;
    const fora = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) abrir(false);
    };
    const escapar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[data-dialogo]')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        abrir(false);
        detalhe.current?.focus();
      }
    };
    document.addEventListener('pointerdown', fora);
    window.addEventListener('keydown', escapar, true);
    return () => {
      document.removeEventListener('pointerdown', fora);
      window.removeEventListener('keydown', escapar, true);
    };
  }, [aberto, celular]);

  function selecionarNivel(destino: number) {
    // O protótipo só tem acesso às ações já expostas pelo Atlas.
    const passos = (destino - motor.tempo.degrau + DEGRAUS_DE_TEMPO) % DEGRAUS_DE_TEMPO;
    for (let i = 0; i < passos; i++) motor.ciclarDegrau();
    if (motor.tempo.aoVivo && destino !== 0) {
      sentidoAnterior.current = 1;
      motor.andarNoTempo(1);
    }
    ler(motor.tempo);
  }
  function transporte() {
    const atual = motor.tempo;
    if (atual.aoVivo || atual.sentido) {
      sentidoAnterior.current = atual.sentido === -1 ? -1 : 1;
      if (atual.aoVivo) selecionarNivel(0);
      motor.andarNoTempo(0);
    } else {
      motor.andarNoTempo(sentidoAnterior.current);
    }
    ler(motor.tempo);
  }
  function direcao(s: -1 | 1) {
    if (motor.tempo.aoVivo) selecionarNivel(0);
    sentidoAnterior.current = s;
    motor.andarNoTempo(s);
    ler(motor.tempo);
  }
  function agora() {
    tocar.current?.focus({ preventScroll: true });
    if (!motor.tempo.aoVivo) motor.alternarAoVivo();
    sentidoAnterior.current = 1;
    ler(motor.tempo);
  }
  function retrato() {
    motor.voltarAEpoca();
    sentidoAnterior.current = 1;
    ler(motor.tempo);
  }
  const rotuloPlay = marcha ? 'Pausar o tempo' : 'Retomar do instante pausado';
  const voltarAoPresente = <button className="rp-agora" onClick={agora}><Icone nome="retomar" tamanho={14} />Voltar ao presente</button>;
  return (
    <section ref={caixa} className="relogio-proposto" data-tipo={tipo} data-detalhes={aberto || !aoVivo} aria-label="Relógio do Atlas">
      <div className="rp-leitura">
        <button className="rp-play" ref={tocar} title={rotuloPlay} aria-label={rotuloPlay} onClick={transporte}>
          <svg className="rp-coroa" viewBox="0 0 48 48" aria-hidden="true">
            <circle className="rp-trilho" cx="24" cy="24" r="20" />
            {Array.from({ length: 12 }, (_, i) => <path key={i} d={i % 3 === 0 ? 'M24 2v4' : 'M24 3v2'}
              transform={'rotate(' + i * 30 + ' 24 24)'} />)}
            {nivel === 0 && <circle className="rp-segundeiro" cx={24 + 20 * Math.sin(angulo)} cy={24 - 20 * Math.cos(angulo)} r="2.4" />}
          </svg>
          <Icone nome={marcha ? 'pausa' : 'play'} tamanho={16} />
        </button>
        <div className="rp-mostrador">
          <div className="rp-meta">
            <strong role="status" className="rp-estado"><i aria-hidden="true" />{estado}</strong>
            <span className="rp-data">{dias ? hora + ' UTC' : dataCurta}</span>
          </div>
          <div className="rp-hora">
            <time dateTime={iso} className={dias ? 'rp-dia' : undefined}>{dias ? dataCurta : hora}{!veloz && <small>{iso.slice(16, 19)}</small>}</time>
            {!dias && <abbr title="Tempo Universal Coordenado">UTC</abbr>}
            {sentido !== 0 && <span className="rp-taxa-curta">{nivel === 0 ? '1×' : etapa(nivel) + '/s'}</span>}
          </div>
        </div>
        <div className="rp-acoes">
          {!celular && <button className="rp-abrir" ref={detalhe} onClick={() => abrir(!aberto)}
            aria-expanded={aberto} title="Ajustar o tempo" aria-label="Ajustar o tempo">
            <Icone nome="chevronCima" tamanho={16} />
          </button>}
        </div>
      </div>
      {aviso && <p className="rp-aviso" role="status">{aviso}</p>}
      <div className="rp-extras">
      <div className="rp-dobra" data-aberta={aberto || celular} inert={!aberto && !celular} aria-hidden={!aberto && !celular}>
      <div className="rp-recorte"><div className="rp-painel">
        <div className="rp-titulo"><label htmlFor="rp-regua">Velocidade</label><span>{digitos.format(taxaDoDegrau(nivel))}×</span></div>
        <p className="rp-equivalencia"><b>{etapa(nivel, true)}</b> no céu por segundo real</p>
        <div className="rp-escala" style={{ '--posicao': (100 * nivel / ultimo) + '%' } as CSSProperties}>
          <div className="rp-marcas" aria-hidden="true">{Array.from({ length: DEGRAUS_DE_TEMPO }, (_, i) => <i key={i} data-ativa={i <= nivel} />)}</div>
          <div className="rp-curso" aria-hidden="true"><i /></div>
          <input id="rp-regua" type="range" min="0" max={ultimo} step="1" value={nivel}
            aria-valuetext={etapa(nivel, true) + ' de céu por segundo real'}
            onChange={e => selecionarNivel(Number(e.target.value))} />
        </div>
        <div className="rp-extremos" aria-hidden="true"><span>1 s</span><span>{etapa(ultimo)}</span></div>
        <div className="rp-sentido">
          <button aria-pressed={!aoVivo && sentido === -1} onClick={() => direcao(-1)}><Icone nome="setaEsquerda" tamanho={16} /> Recuar</button>
          <button aria-pressed={!aoVivo && sentido === 1} onClick={() => direcao(1)}>Avançar <Icone nome="setaEsquerda" tamanho={16} /></button>
        </div>
        <div className="rp-referencias">
          {(celular || aberto) && !aoVivo && voltarAoPresente}
          <button className="rp-epoca" onClick={retrato}><Icone nome="relogio" tamanho={15} />Retrato de 2026</button>
        </div>
      </div></div></div>
      {!aoVivo && !celular && !aberto && voltarAoPresente}
      </div>
    </section>
  );
}

// A maquete usa o Director do servidor de desenvolvimento. A folha móvel
// conserva os gestos, o fechamento e o foco do próprio aplicativo.
const suporte = document.createElement('div');
suporte.className = 'suporte-relogio';
const raiz = createRoot(suporte);
let destinoAnterior: Element | null = null;
let eraMovel = false;
let fechouFichaInicial = false;
function posicionar() {
  const motor = (window as Window & { __director?: Director }).__director;
  const rodape = document.querySelector('.atlas-rodape');
  if (!rodape || !motor) return;
  if (!fechouFichaInicial) {
    const fechar = document.querySelector<HTMLButtonElement>('[aria-label="Fechar a ficha"]');
    if (fechar) { fechouFichaInicial = true; fechar.click(); }
  }
  const movel = !!document.querySelector('.atlas-alcas');
  const folha = document.querySelector('[data-dialogo="tempo"]');
  const destino = movel && folha ? folha : rodape;
  if (destino === destinoAnterior && suporte.isConnected && eraMovel === movel) return;
  destinoAnterior = destino;
  eraMovel = movel;
  destino.append(suporte);
  document.documentElement.classList.add('previa-relogio');
  raiz.render(<Relogio motor={motor} celular={movel} />);
}
const eventos = new MutationObserver(posicionar);
eventos.observe(document.getElementById('root')!, { childList: true, subtree: true });
posicionar();
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    eventos.disconnect();
    raiz.unmount();
    suporte.remove();
    document.documentElement.classList.remove('previa-relogio');
  });
}
