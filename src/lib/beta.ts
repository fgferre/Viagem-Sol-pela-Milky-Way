// ============================================================
// AS PORTAS DE BETA (item 90 cravou o padrão; item 109 é a primeira).
// Moram FORA dos arquivos governados do selo de propósito, com a
// doutrina dele (29/08): rotulagem é ponto de vista, não assunto de
// honestidade declarada — "a realidade está nos olhos de quem vê". A
// porta existe para o link reproduzir a vista; o catálogo dela é este
// arquivo e o item no PENDENCIAS.
// ============================================================

/** `?r3d=1` — os rótulos 3D (beta, item 109). */
export function lerPortaRotulos3d(query: URLSearchParams): boolean {
  return query.get('r3d') === '1';
}
