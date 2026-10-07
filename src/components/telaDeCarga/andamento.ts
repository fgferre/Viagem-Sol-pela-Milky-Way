/**
 * O ANDAMENTO DA TELA DE CARGA: das etapas do Director ao `EstadoDaCena`
 * de cada quadro. Um módulo só, com as mesmas contas para os três que
 * precisam delas: o worker que desenha a cena, a thread principal quando
 * o aparelho não tem worker com OffscreenCanvas, e o texto por cima
 * (porcentagem e desfecho). Puro: o relógio entra por parâmetro.
 */
import type { EstadoDaCena } from './cena';

/**
 * Onde a carga está: a fatia da etapa corrente (0..1 da carga inteira)
 * e quanto ela costuma levar, em segundos.
 */
export interface FatiaDaCarga {
  piso: number;
  teto: number;
  segundos: number;
}

/** a mola do `suave`: segue o progresso cru sem degrau (a de moldura.html) */
const MOLA_S = 0.35;
/**
 * O ÁPICE ANTES DO DESFECHO: numa carga rápida o `suave` ainda está em
 * ~0,83 quando a carga acaba, e o desfecho começava ali — o Sol rompendo o
 * limbo (95 %) e o "você está aqui" da galáxia (90–97,5 %) não chegavam a
 * aparecer. Acabada a carga, o `suave` sobe de onde estava até 1 neste
 * tempo, e só então o desfecho começa. Conta de RELÓGIO, não de quadros:
 * o worker e a thread principal (que pode estar engasgada ou desacelerada)
 * chegam ao mesmo início do desfecho, e a passagem para a abertura não
 * espera por um `suave` que a thread principal ainda não integrou.
 */
const APICE_S = 0.5;
/**
 * DENTRO DE UMA ETAPA o Director não diz quanto falta; o progresso anda
 * sozinho até 90 % da fatia, cada vez mais devagar, e nunca a fatia
 * inteira: quem fecha a etapa é a próxima, ou o fim da carga. Sem isso
 * o Sol pararia ~3 s na etapa da galáxia, a mais longa.
 */
const ALCANCE_NA_ETAPA = 0.9;
/** o `t` da foto (`?shot=`): o mesmo do modo foto do protótipo, progresso × 14 s */
const T_DA_FOTO_POR_PROGRESSO = 14;

export interface Andamento {
  etapa(fatia: FatiaDaCarga, agora: number): void;
  /** a carga acabou: o progresso vai a 100 %, e o desfecho começa `APICE_S` depois */
  terminou(agora: number): void;
  reduzir(sim: boolean): void;
  /** o estado do quadro em `agora` (ms); `duracaoFinal` é a da cena, em s */
  quadro(agora: number, duracaoFinal: number): EstadoDaCena;
}

/**
 * `foto` (`?shot=1`): um quadro que só depende da etapa, para os juízes
 * terem imagem estável — progresso no meio da fatia, `suave` igual a ele,
 * `t` fixo e nenhum desfecho.
 */
export function criarAndamento(inicio: number, foto: boolean): Andamento {
  let fatia: FatiaDaCarga = { piso: 0, teto: 0, segundos: 1 };
  let desde = inicio;
  let terminouEm: number | null = null;
  let reduzido = false;
  let suave = 0;
  let suaveNoFimDaCarga = 0;
  let anterior = inicio;

  return {
    etapa(nova, agora) {
      if (nova.piso === fatia.piso && nova.teto === fatia.teto) return;
      fatia = nova;
      desde = agora;
    },
    terminou(agora) {
      if (terminouEm !== null) return;
      terminouEm = agora;
      suaveNoFimDaCarga = suave;
    },
    reduzir(sim) {
      reduzido = sim;
    },
    quadro(agora, duracaoFinal) {
      if (foto) {
        const p = (fatia.piso + fatia.teto) / 2;
        return { t: p * T_DA_FOTO_POR_PROGRESSO, dt: 1 / 60, progresso: p, suave: p, fim: 0, reduzido };
      }
      const dt = Math.min(0.1, Math.max(0, (agora - anterior) / 1000));
      anterior = agora;
      const naEtapa = Math.max(0, agora - desde) / 1000;
      const progresso =
        terminouEm !== null
          ? 1
          : fatia.piso +
            (fatia.teto - fatia.piso) *
              ALCANCE_NA_ETAPA *
              (1 - Math.exp(-naEtapa / Math.max(0.05, fatia.segundos / 2)));
      let fim = 0;
      if (terminouEm === null) {
        suave += (progresso - suave) * (1 - Math.exp(-dt / MOLA_S));
      } else {
        const desdeOFim = Math.max(0, agora - terminouEm) / 1000;
        const k = Math.min(1, desdeOFim / APICE_S);
        suave = suaveNoFimDaCarga + (1 - suaveNoFimDaCarga) * k * k * (3 - 2 * k);
        fim = Math.min(1, Math.max(0, (desdeOFim - APICE_S) / duracaoFinal));
      }
      return { t: (agora - inicio) / 1000, dt, progresso, suave, fim, reduzido };
    },
  };
}
