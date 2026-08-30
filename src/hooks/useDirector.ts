// ============================================================
// O BOOT do Director — sonda de GL, LabelCanvas, os 13 fios de evento
// e a leitura das portas de URL do init (?q, ?tone, ?exp, ?pos, ?look,
// ?fov, ?atlas, ?foco, ?ver, ?d, ?t, ?play, ?freeze). Morava no App.tsx
// (onda da arquitetura, corte 6) — a semântica é a mesma, linha a
// linha, e este arquivo é GOVERNADO pelo selo (lê portas de URL).
// ============================================================
import { useEffect } from 'react';
import { Director } from '../three/director';
import type { EstadoDaEscada, EstadoDaQualidade, LoadStage, Phase } from '../three/director';
import type { NamedStar } from '../three/config';
import { lerPortaRotulos3d } from '../lib/beta';
import {
  lerPortaExposicao,
  lerPortaQualidade,
  lerPortaTom,
} from '../three/core/engine';
import { LabelCanvas } from '../components/LabelCanvas';
import { sondarGl } from '../lib/glProbe';
import type { EstadoDoTempo } from '../three/tempoDoAtlas';
import { construirIndice, resolverFoco } from '../lib/buscaEstrelas';
import type { EntradaDaBusca } from '../lib/buscaEstrelas';
import { lerPortaVer } from '../three/selo';
import type { VerDaEscada } from '../three/selo';

export function escolherAlvo(
  entrada: EntradaDaBusca,
  alvo: Director | null,
  ver: VerDaEscada = 'orbita'
) {
  if (!alvo) return;
  if (entrada.tipo === 'corpo') alvo.focarNoCorpo(entrada.corpo.id, ver);
  else alvo.visitarEstrela(entrada.estrela);
}

/** Tudo que o boot escreve — os fios do App, por nome. */
export interface FiosDoDirector {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  labelCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  rootRef: React.RefObject<HTMLDivElement | null>;
  progressRef: React.RefObject<HTMLDivElement | null>;
  directorRef: React.MutableRefObject<Director | null>;
  labelsRef: React.MutableRefObject<LabelCanvas | null>;
  setPhase: (v: Phase) => void;
  setCaption: (v: { idx: number; text: string; sub?: string }) => void;
  setTicks: (v: { t: number; text: string }[]) => void;
  setRuntime: (v: number) => void;
  setDest: (v: string) => void;
  setSol: (v: string) => void;
  setLente: (v: string) => void;
  setCamera: (v: readonly [number, number, number] | null) => void;
  setQuality: (v: EstadoDaQualidade) => void;
  setLoadStage: (v: LoadStage) => void;
  setLoadError: (v: string) => void;
  setNomeadas: (v: readonly NamedStar[]) => void;
  setFoco: (v: string | null) => void;
  setTempo: (v: EstadoDoTempo | null) => void;
  setEscada: (v: EstadoDaEscada) => void;
  /** o primeiro arrasto dentro do Atlas — apaga a dica dos gestos */
  girou: () => void;
  /** a bússola do Atlas acendeu ou apagou (item 102) — só na virada */
  orientacao: (torta: boolean) => void;
  /** o toque no céu com uma folha aberta — a terceira saída (item 62) */
  fecharGavetas: () => void;
}

export function useDirector(fios: FiosDoDirector) {
  const {
    canvasRef,
    labelCanvasRef,
    rootRef,
    progressRef,
    directorRef,
    labelsRef,
    setPhase,
    setCaption,
    setTicks,
    setRuntime,
    setDest,
    setSol,
    setLente,
    setCamera,
    setQuality,
    setLoadStage,
    setLoadError,
    setNomeadas,
    setFoco,
    setTempo,
    setEscada,
    girou,
    orientacao,
    fecharGavetas,
  } = fios;
  useEffect(() => {
    if (!canvasRef.current || !labelCanvasRef.current) return;
    // sem WebGL2 (veredito da sonda, já no estado inicial): não há
    // Director a construir — o véu de erro com retry já está na tela
    if (!sondarGl().webgl2) return;
    let cancelled = false;
    const labels = new LabelCanvas(labelCanvasRef.current);
    labelsRef.current = labels;
    let d: Director;
    try {
      d = new Director(canvasRef.current, {
      onPhase: setPhase,
      onCaption: (idx, text, sub) => setCaption({ idx, text, sub }),
      onProgress: (progress) => {
        progressRef.current?.style.setProperty('--journey-progress', `${progress}`);
      },
      onLabels: (nextLabels) => labels.draw(nextLabels),
      onWarp: (warp) => {
        rootRef.current?.style.setProperty('--warp', `${warp}`);
      },
      onQuality: setQuality,
      onDest: setDest,
      onSol: setSol,
      onLente: setLente,
      onCamera: setCamera,
      onStage: setLoadStage,
      // custom property, como o warp: o véu do Atlas anda a 60 Hz e um
      // setState por quadro re-renderizaria o HUD inteiro à toa
      onVeu: (k) => {
        rootRef.current?.style.setProperty('--veu-atlas', `${k}`);
      },
      onFoco: setFoco,
      onTempo: setTempo,
      onEscada: setEscada,
      onGirou: girou,
      onOrientacao: orientacao,
      onFecharGavetas: fecharGavetas,
      // a falha DEPOIS do boot (contexto perdido, exceção em quadro) cai
      // no MESMO véu das três falhas de carga — o App decide a copy pela
      // fase, que é o que separa "não pôde começar" de "parou no meio"
      onErro: setLoadError,
      });
    } catch (error) {
      // a sonda passou mas a criação real falhou (contexto despejado,
      // driver caindo): mesmo véu de erro, mesmo retry. O microtask tira
      // o setState do corpo síncrono do effect (regra do lint).
      console.error(error);
      queueMicrotask(() =>
        setLoadError(
          error instanceof Error ? error.message : 'Não foi possível criar o renderizador.'
        )
      );
      return () => labels.clear();
    }
    directorRef.current = d;
    // gancho de inspeção (só dev): estado da câmera/fase no console
    if (import.meta.env.DEV) {
      (window as unknown as { __director?: Director }).__director = d;
    }
    void d
      .init()
      .then(() => {
        if (cancelled) return;
        setTicks(d.progressTicks);
        setRuntime(d.journeyDuration);
        setNomeadas(d.nomeadas);
        const query = new URLSearchParams(window.location.search);
        // `?q=` — a lei da porta mora no engine (`lerPortaQualidade`), que
        // é quem a lê primeiro, no construtor. Aqui ela volta a passar
        // porque o `auto` é POLÍTICA e o engine não a conhece: o boot com
        // `?q=auto` nasce no tier de produto e é esta linha que entrega a
        // escolha ao Director. Para um tier explícito a chamada é a
        // reconciliação de sempre — o engine já o aplicou, e o
        // `setQuality` reconhece o no-op.
        const escolha = lerPortaQualidade(query.get('q'));
        if (escolha) d.setQuality(escolha);

        // ?tone= e ?exp= — os ajustes de gosto também são URL, para que uma
        // configuração vire link e a captura headless veja o mesmo que a tela.
        const tone = lerPortaTom(query.get('tone'));
        if (tone) d.engine.setToneMapping(tone);
        const exposure = lerPortaExposicao(query.get('exp'));
        if (exposure !== null) d.setExposure(exposure);

        // ?r3d=1 — a beta dos rótulos 3D (item 109; porta catalogada em
        // lib/beta.ts, fora do selo por doutrina dele)
        if (lerPortaRotulos3d(query)) d.setRotulos3d(true);

        // ?pos=x,y,z[&look=x,y,z][&fov=graus] — câmera livre determinística
        // em qualquer ponto da galáxia (screenshots/inspeção; o fov só faz
        // sentido aqui — na viagem o roteiro comanda a lente).
        const parse = (s: string | null) => {
          const v = (s ?? '').split(',').map(Number);
          return v.length === 3 && v.every(Number.isFinite)
            ? (v as [number, number, number])
            : null;
        };
        const pos = parse(query.get('pos'));
        if (pos) {
          d.placeCamera(pos, parse(query.get('look')) ?? undefined);
          const fov = Number(query.get('fov'));
          if (Number.isFinite(fov) && fov >= 15 && fov <= 140) {
            d.engine.camera.fov = fov;
            d.engine.camera.updateProjectionMatrix();
          }
        } else if (query.get('pos')) console.warn('?pos= inválido:', query.get('pos'));

        // PRECEDÊNCIA DECLARADA: `?pos=` > `?atlas=1`/`?foco=` > `?t=`/`?play=`.
        // `?pos=` é a régua das capturas e não cede a ninguém; `?atlas=1`
        // ganha do instante porque o Atlas é MODO, e o instante que
        // vier junto vira só o momento de volta do "Partir" (é assim que
        // o link copiado de dentro do Atlas fecha o círculo).
        //
        // `?foco=` ENTRA NO ATLAS SOZINHA (F3), e é decisão: focar é
        // coisa que só existe no Atlas — um link de foco que caísse no
        // meio do filme não teria onde pousar. Ela vem depois da entrada
        // porque enquadra a partir da vista de abertura, pelo mesmo
        // caminho do clique num nome.
        const hasTime = query.has('t');
        const time = Number.parseFloat(query.get('t') ?? '0');
        const momento = Number.isFinite(time) && time > 0 ? time : undefined;
        const foco = query.get('foco');
        if (!pos && (query.has('atlas') || foco)) {
          d.entrarNoAtlas({ instantaneo: true, momento });
          if (foco) {
            // o índice local não duplica o da paleta: aquele nasce num
            // `useMemo` que ainda não rodou (o estado das nomeadas está
            // sendo publicado neste mesmo tick), e este morre na linha
            // seguinte. A conta é uma passada nas 1.726.
            const achado = resolverFoco(foco, construirIndice(d.nomeadas, d.corpos));
            // `?ver=corpo` (F2b/D7) desce ao degrau do corpo — a lei
            // única da porta (`lerPortaVer`); inválido cai no default
            // `orbita`, a semântica de sempre do `?foco=`
            if (achado) {
              escolherAlvo(achado.entrada, d, lerPortaVer(query.get('ver')) ?? 'orbita');
            }
            // sem palpite: a linha de contexto vai mostrar o sistema, que
            // é o que ficou de fato em quadro (precedente do `?pos=`)
            else console.warn('?foco= não encontrou alvo:', foco);
          }
          // `?d=` — A DISTÂNCIA AO ALVO, em raios dele (item 73). Vem
          // DEPOIS do `?foco=`/`?ver=` porque é sobre o alvo deles que
          // ela se mede: a régua é o raio de enquadramento do alvo vivo,
          // e trocar o alvo depois de pinar apagaria o pino por lei
          // (alvo novo nasce no enquadramento). Ausente = a conta de
          // sempre, bit a bit — é o que faz todo link já copiado
          // reproduzir a vista sem mudar um pixel.
          const raios = Number(query.get('d'));
          if (query.has('d') && Number.isFinite(raios) && raios > 0) {
            d.pinarEmRaios(raios);
          } else if (query.get('d')) console.warn('?d= inválido:', query.get('d'));
        } else if (!pos && (hasTime || query.get('play'))) {
          d.play();
          if (momento !== undefined) d.seek(momento);
          // ?t= sozinho continua CONGELANDO (contrato das capturas: o
          // harness usa ?t=…&shot=2, sem play). Com &play=1 o mesmo ?t= vira
          // retomada viva — é assim que a troca de qualidade e o link
          // compartilhado devolvem o espectador ao momento em que estava.
          d.freezeJourney = (hasTime && !query.has('play')) || query.has('freeze');
        }
      })
      .catch((error: unknown) => {
        if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) return;
        console.error(error);
        // a tela de erro fica; o contexto WebGL e os render targets já
        // criados no construtor, não — a sessão morta não renderiza mais
        d.dispose();
        setLoadError(error instanceof Error ? error.message : 'Não foi possível iniciar a simulação.');
      });
    return () => {
      cancelled = true;
      labels.clear();
      labelsRef.current = null;
      d.dispose();
    };
    // refs e setters de useState são estáveis; o boot roda UMA vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
