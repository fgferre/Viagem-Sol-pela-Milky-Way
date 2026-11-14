// A MONTAGEM DO FILME ESTELAR (E0, 14/11/2026) — "a vida de uma estrela"
// contada com lugares reais (`PLAN-FILME-ESTELAR.md`). No molde do solar:
// um roteiro JSON por ato em `roteiros/estelar/`, os pontos e números
// nomeados de cada ato em `atos/`, e aqui eles se reúnem.
//
// COMO UM ATO ENTRA: o JSON em `roteiros/estelar/<ato>.json`, os pontos e
// números em `atos/<ato>.ts`, e uma linha em cada lista abaixo (ROTEIROS,
// PONTOS, NUMEROS) — na ordem do filme.
//
// O QUE O ROTEIRO JÁ ENCONTRA PRONTO, sem escrever conta:
//   - pontos: 'Sol' (a origem), cada estrela de `estrelas.ts` pelo nome do
//     catálogo, e cada lugar do céu pelo id da Busca ('pleiades', 'hyades',
//     'nebulosa-de-orion'), no centro que a cena desenha;
//   - assuntos: tudo o que `cinematic/assuntos.ts` conhece mais as estrelas
//     de `estrelas.ts`. Nome fora disso é ERRO na montagem, com o nome.
//
// O CÉU: uma data só (`JD_DO_FILME_ESTELAR_TDB`), parada, que ANDA nos planos
// que declaram `"relogio": {"diasPorSegundo": …}` — os planetas de
// TRAPPIST-1 e Sirius B seguem essa data (o director a entrega ao mundo
// pelo `jdDoFilme`).
import * as THREE from 'three';
import type { Shot } from '../../lerSequencia';
import { montarApoiosDoRoteiro } from '../../apoiosDoRoteiro';
import { assuntoDasTabelas } from '../../assuntos';
import { JD_DO_FILME_TDB } from '../../journey';
import { montarAtos, relogioDosPlanos } from '../montagem';
import { CIMA_DA_ECLIPTICA } from '../solar/atos/geometria';
import { LUGARES_DA_BUSCA } from '../../../world/lugaresDoCeu';
import { ESTRELAS_DO_FILME } from './estrelas';
import { PONTOS_DAS_JUNTAS } from './atos/juntas';
import { NUMEROS_PROLOGO, PONTOS_PROLOGO } from './atos/prologo';
import { NUMEROS_CRESCER, PONTOS_CRESCER } from './atos/crescer';
import { NUMEROS_ENVELHECER, PONTOS_ENVELHECER } from './atos/envelhecer';
import prologo from '../../roteiros/estelar/prologo.json';
import crescer from '../../roteiros/estelar/crescer.json';
import envelhecer from '../../roteiros/estelar/envelhecer.json';

/** o céu do filme: o instante do galáctico, 2026-01-01 16:00 UTC — escolha
 *  nossa; nada nos atos depende da hora (o Sol gira por ela, e o relógio
 *  que anda parte dela) */
export const JD_DO_FILME_ESTELAR_TDB = JD_DO_FILME_TDB;

/** os roteiros, na ordem do filme */
const ROTEIROS: readonly unknown[] = [prologo, crescer, envelhecer];

/** os lugares do céu como pontos, pelo id da Busca */
const PONTOS_DOS_LUGARES = Object.fromEntries(
  LUGARES_DA_BUSCA.map((l) => [l.id, new THREE.Vector3(l.x, l.y, l.z)])
);

/** os pontos nomeados de todos os atos, em pc */
const PONTOS: Readonly<Record<string, THREE.Vector3>> = {
  Sol: new THREE.Vector3(0, 0, 0),
  ...PONTOS_DOS_LUGARES,
  ...ESTRELAS_DO_FILME,
  ...PONTOS_DAS_JUNTAS,
  ...PONTOS_PROLOGO,
  ...PONTOS_CRESCER,
  ...PONTOS_ENVELHECER,
};

/** os números nomeados de todos os atos */
const NUMEROS: Readonly<Record<string, number>> = {
  ...NUMEROS_PROLOGO,
  ...NUMEROS_CRESCER,
  ...NUMEROS_ENVELHECER,
};

/** o que um plano do filme estelar pode nomear */
export function conheceAssunto(nome: string): boolean {
  return assuntoDasTabelas(nome) !== null || Object.hasOwn(ESTRELAS_DO_FILME, nome);
}

export interface FilmeEstelarMontado {
  shots: Shot[];
  starts: number[];
  duracao: number;
  apoios: ReturnType<typeof montarApoiosDoRoteiro>;
  /** a data do céu (JD TDB) em cada segundo do corte */
  jdDoFilme(t: number): number;
  /** o "cima" da câmera: o polo da eclíptica, o mesmo do solar — o voo do
   *  prólogo sobe um meridiano dela com o horizonte nivelado, e Órion, perto
   *  da eclíptica, fica de pé como na carta do céu */
  cima: THREE.Vector3;
  planosPorAto: number[];
}

export function montarFilmeEstelar(roteiros: readonly unknown[] = ROTEIROS): FilmeEstelarMontado {
  const m = montarAtos(roteiros, PONTOS, NUMEROS, conheceAssunto);
  return {
    shots: m.shots,
    starts: m.starts,
    duracao: m.duracao,
    apoios: montarApoiosDoRoteiro(m.shots, m.starts),
    jdDoFilme: relogioDosPlanos(m.shots, m.starts, JD_DO_FILME_ESTELAR_TDB),
    cima: CIMA_DA_ECLIPTICA.clone(),
    planosPorAto: m.planosPorAto,
  };
}
