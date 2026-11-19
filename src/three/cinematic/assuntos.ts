// ============================================================
// O QUE O CAMPO `assuntos` DE UM PLANO PODE NOMEAR — num lugar só (E0 do
// filme estelar, 14/11/2026). Até aqui o rótulo do filme só resolvia o Sol,
// Sagittarius A✱, os corpos da casa e as estrelas do `named`; os lugares
// do céu, Sirius B e os exoplanetas tinham nome no Atlas e sumiam calados
// no filme. Agora o assunto sai das MESMAS tabelas de que a Busca e o Atlas
// montam o índice e os rótulos — nada de segunda tabela de nomes:
//   - os corpos da casa: `CORPOS_DO_SISTEMA`, `LUAS_DO_SISTEMA` e, desde
//     19/11, os anões e asteroides de `HELIO_SEM_PONTO` (pelo id) — o
//     solar dizia "ceres" e o nome sumia calado;
//   - os lugares do céu: `LUGARES_DA_BUSCA` (o id, o nome pt ou o en);
//   - as companheiras: `ESTRELAS_VISITAVEIS[].companheira` (o nome);
//   - os exoplanetas: `SISTEMAS_PLANETARIOS` (o id, o nome ou um apelido);
//   - as estrelas com corpo (as visitáveis e as anfitriãs que o catálogo
//     não nomeia, como TRAPPIST-1): vivem nas nomeadas do boot
//     (`comAnfitrias`), então o rótulo as acha como qualquer estrela.
// Texto de tabela casa pela normalização da Busca (`normalizarConsulta`:
// sem acento nem caixa) — "Próxima b" acha Proxima b pelo apelido. 'SOL',
// 'SGR' e os ids dos corpos casam exatos, como sempre ('atlas' é a lua,
// 'Atlas' a estrela).
//
// O QUE FICA DE FORA DAQUI é a estrela comum do catálogo (Rigel, Alnilam):
// o catálogo chega pela rede depois de o filme ser montado. Quem quiser
// recusar nome desconhecido na montagem (`lerSequencia`, 4º argumento)
// junta a isto as estrelas que o filme fixou — ver `filmes/estelar/estrelas.ts`.
// ============================================================
import { normalizarConsulta, type LugarBuscavel } from '../../lib/buscaEstrelas';
import { ESTRELAS_VISITAVEIS, type EstrelaVisitavel } from '../../lib/atlas/estrelasVisitaveis';
import { SISTEMAS_PLANETARIOS, type Exoplaneta, type SistemaPlanetario } from '../../lib/exoplanetas';
import { CORPOS_DO_SISTEMA, HELIO_SEM_PONTO, LUAS_DO_SISTEMA } from '../atlasConfig';
import { LUGARES_DA_BUSCA } from '../world/lugaresDoCeu';

export type AssuntoDasTabelas =
  | { tipo: 'sol' }
  | { tipo: 'sgr' }
  /** um corpo da casa, pelo id da camada ('earth', 'io') */
  | { tipo: 'corpo'; id: string }
  /** a companheira de uma estrela com corpo (Sirius B), que anda na órbita dela */
  | { tipo: 'companheira'; principal: EstrelaVisitavel }
  | { tipo: 'lugar'; lugar: LugarBuscavel }
  | { tipo: 'exoplaneta'; planeta: Exoplaneta; sistema: SistemaPlanetario }
  /** uma estrela com corpo — o rótulo a acha nas nomeadas, pelo nome do catálogo */
  | { tipo: 'estrela'; nome: string };

const IDS_DA_CASA = new Set(
  [...CORPOS_DO_SISTEMA, ...LUAS_DO_SISTEMA, ...HELIO_SEM_PONTO].map((c) => c.id)
);

/** chave normalizada → assunto, das tabelas de texto (a lei da Busca) */
const POR_TEXTO = (() => {
  const mapa = new Map<string, AssuntoDasTabelas>();
  const anotar = (texto: string, assunto: AssuntoDasTabelas) => {
    const chave = normalizarConsulta(texto);
    // a primeira tabela que reclama uma chave fica com ela (a ordem abaixo)
    if (chave && !mapa.has(chave)) mapa.set(chave, assunto);
  };
  for (const e of ESTRELAS_VISITAVEIS) {
    if (e.companheira) anotar(e.companheira.nome, { tipo: 'companheira', principal: e });
  }
  for (const e of ESTRELAS_VISITAVEIS) anotar(e.nomeNoCatalogo, { tipo: 'estrela', nome: e.nomeNoCatalogo });
  for (const lugar of LUGARES_DA_BUSCA) {
    for (const texto of [lugar.id, lugar.nome, lugar.nomeEn ?? '']) anotar(texto, { tipo: 'lugar', lugar });
  }
  for (const sistema of SISTEMAS_PLANETARIOS) {
    for (const planeta of sistema.planetas) {
      for (const texto of [planeta.id, planeta.nome, ...planeta.apelidos]) {
        anotar(texto, { tipo: 'exoplaneta', planeta, sistema });
      }
    }
  }
  return mapa;
})();

/**
 * O assunto que as tabelas conhecem por este nome, ou `null` — e `null` quer
 * dizer "talvez uma estrela do catálogo", que só as nomeadas do boot decidem.
 */
export function assuntoDasTabelas(nome: string): AssuntoDasTabelas | null {
  if (nome === 'SOL') return { tipo: 'sol' };
  if (nome === 'SGR') return { tipo: 'sgr' };
  if (IDS_DA_CASA.has(nome)) return { tipo: 'corpo', id: nome };
  return POR_TEXTO.get(normalizarConsulta(nome)) ?? null;
}
