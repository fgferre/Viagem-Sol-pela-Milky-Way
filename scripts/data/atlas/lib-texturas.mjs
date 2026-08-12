// ============================================================
// Decisões PURAS do pipeline de texturas do atlas — extraídas
// para módulo próprio porque são exatamente os pontos onde o
// doador se machucou (checklist pré-fusão itens 15–17) e porque
// os três scripts (baixa/otimiza/gera-manifest) e o verify têm
// de aplicar A MESMA regra, nunca três cópias divergentes.
//
// Nada aqui toca disco nem rede: tudo é função de entrada →
// saída, coberta por lib-texturas.test.mjs no runner da casa.
// ============================================================

// Os seis canais que o manifest reconhece. Nome de arquivo fora
// deste vocabulário é ERRO na hora, não entrada "criativa" no
// manifest — a padronização é o que permite inferir corpo/canal
// da árvore de diretórios sem tabela paralela.
export const CANAIS = ['map', 'clouds', 'night', 'normal', 'roughness', 'ring'];

// Degraus da escada de reamostragem (D4 + emenda T-E7): o tier
// performance consome ≤1k, alta ≤2k, cinema ≤4k; o 8k fica como
// fonte para bancada/orçamento do dono. A escada NUNCA sobe:
// upscale inventa pixel e mente resolução no manifest.
export const DEGRAUS_DA_ESCADA = [4096, 2048, 1024];

/**
 * Larguras a gerar a partir de uma fonte de largura MEDIDA (nunca
 * lida do nome — a armadilha que cegou Júpiter/Urano no doador por
 * três meses: `8k_jupiter.jpg` tem 4096 px de largura).
 * 8192 → [4096, 2048, 1024]; 4096 → [2048, 1024]; 2048 → [1024];
 * ≤1024 → [] (nada a fazer, nunca upscale).
 */
export function degrausDaEscada(larguraFonte) {
  if (!Number.isInteger(larguraFonte) || larguraFonte <= 0) {
    throw new Error(`Largura de fonte inválida: ${larguraFonte}.`);
  }
  return DEGRAUS_DA_ESCADA.filter((degrau) => degrau < larguraFonte);
}

/**
 * Altura proporcional de uma variante, arredondada — explícita para
 * placas não-2:1 (o anel de Saturno é 8192×500; deixar o sharp
 * "adivinhar" esconderia a conta que o manifest depois confere).
 */
export function alturaProporcional(larguraFonte, alturaFonte, larguraAlvo) {
  return Math.max(1, Math.round((alturaFonte * larguraAlvo) / larguraFonte));
}

/**
 * Decompõe um nome de arquivo da árvore public/textures/atlas/ em
 * { canal, largura }. Vocabulário: `<canal>.<ext>` é FONTE
 * (largura null — a real só existe medida pelo sharp) e
 * `<canal>_<n>.<ext>` é variante reamostrada (o `n` do nome é
 * conveniência humana; o manifest e o verify medem de novo).
 * Nome fora do vocabulário LANÇA: arquivo sem canal reconhecível
 * não tem lugar no manifest nem no runtime.
 */
export function analisarNomeDeTextura(nomeArquivo) {
  const casamento = /^([a-z]+)(?:_(\d+))?\.(jpg|jpeg|png|webp)$/.exec(nomeArquivo);
  if (!casamento) {
    throw new Error(
      `Nome de textura fora do vocabulário: "${nomeArquivo}" ` +
        '(esperado <canal>.<ext> ou <canal>_<largura>.<ext>).'
    );
  }
  const [, canal, larguraTexto, extensao] = casamento;
  if (!CANAIS.includes(canal)) {
    throw new Error(
      `Canal desconhecido "${canal}" em "${nomeArquivo}" ` +
        `(canais válidos: ${CANAIS.join(', ')}).`
    );
  }
  return {
    canal,
    largura: larguraTexto === undefined ? null : Number(larguraTexto),
    extensao,
    ehFonte: larguraTexto === undefined && extensao !== 'webp',
  };
}

// Hosts de onde o procedimento de download aceita servir bytes —
// inclusive depois de um redirect. O doador seguia redirects para
// QUALQUER host (checklist item 13, falha apontada em auditoria e
// nunca consertada lá); aqui a allowlist fecha a porta.
export const HOSTS_PERMITIDOS = [
  'solarsystemscope.com',
  'web.archive.org',
  'science.nasa.gov',
  'nasa3d.arc.nasa.gov',
  'astrogeology.usgs.gov',
  'upload.wikimedia.org',
];

/** true se a URL aponta para um host da allowlist (ou subdomínio dele). */
export function hostPermitido(url) {
  const { hostname, protocol } = new URL(url);
  if (protocol !== 'https:') return false;
  return HOSTS_PERMITIDOS.some(
    (dominio) => hostname === dominio || hostname.endsWith(`.${dominio}`)
  );
}

/**
 * Guarda de pessimização do WebP (checklist item 17): um .webp que
 * não ficou MENOR que a fonte é artefato morto — mantê-lo faria o
 * visitante baixar mais bytes pela mesma imagem.
 */
export function webpCompensa(bytesFonte, bytesWebp) {
  return bytesWebp < bytesFonte;
}
