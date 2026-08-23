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

// ---- A CONFISSÃO, LIDA DO DOCUMENTO --------------------------------
// As frases que a ficha do objeto imprime na seção "a imagem" — Ceres
// inventado pela fonte, as emendas de Titã, as 68 linhas de Europa,
// Vênus sem foto em luz visível — e a forma dos corpos que são
// elipsoide tendo malha publicada nascem em `docs/reference/ASSETS.md`,
// onde os vereditos da bancada moram inteiros. Uma segunda cópia num
// `.mjs` é a que envelhece calada, porque quem edita o veredito edita o
// documento. Por isso o gerador LÊ o documento — e por isso o verify o
// lê pela MESMA função, e não por uma segunda leitura que discorde.
//
// AS REGRAS DO FORMATO estão declaradas no próprio ASSETS.md, na
// abertura da seção, e são estas três: os subtítulos começam com
// "a imagem"/"a forma"; a seção é a ÚLTIMA do arquivo; e quem republica
// é `npm run data:texturas`.

/** O título que abre a seção legível por máquina. */
export const TITULO_DA_CONFISSAO = '## A CONFISSÃO NA TELA';

/**
 * As duas tabelas da seção de confissão, lidas com rigor: o título tem de
 * existir, a seção tem de ir até o fim do arquivo, cada linha tem de ser
 * `| chave | frase |`, e o resultado é um par de Maps. Sem tolerância a
 * "quase" — nota que sumir por causa de um pipe a menos some da TELA, e
 * ninguém repara na falta de uma frase.
 *
 * `onde` entra só para a mensagem de erro apontar o arquivo certo.
 */
export function lerTabelasDaConfissao(markdown, onde = 'docs/reference/ASSETS.md') {
  const inicio = markdown.indexOf(TITULO_DA_CONFISSAO);
  if (inicio < 0) {
    throw new Error(
      `${onde} perdeu a seção "${TITULO_DA_CONFISSAO}" — ela é lida por ` +
        'máquina e é a fonte única das notas que a ficha imprime.'
    );
  }
  const secao = markdown.slice(inicio);
  const tabelas = new Map();
  let atual = null;
  for (const linha of secao.split('\n')) {
    // A SEÇÃO É A ÚLTIMA DO ARQUIVO, e isto é o que torna a regra
    // verdadeira em vez de esperançosa: a leitura vai daqui até o fim,
    // então um `##` depois deste título engoliria as tabelas dele.
    if (linha.startsWith('## ') && !linha.startsWith(TITULO_DA_CONFISSAO)) {
      throw new Error(
        `${onde}: "${linha.trim()}" vem DEPOIS da confissão — ela tem de ser a ` +
          'última seção do arquivo (a leitura por máquina vai até o fim).'
      );
    }
    const sub = /^###\s+(.+?)\s*$/.exec(linha);
    if (sub) {
      atual = new Map();
      tabelas.set(sub[1], atual);
      continue;
    }
    if (!atual || !linha.startsWith('|')) continue;
    const celulas = linha.split('|').slice(1, -1).map((c) => c.trim());
    if (celulas.length !== 2) {
      throw new Error(`${onde}: linha de tabela malformada — "${linha}".`);
    }
    const [chave, nota] = celulas;
    if (/^-+$/.test(chave) || chave === 'corpo/canal' || chave === 'corpo') continue;
    if (!nota) throw new Error(`${onde}: "${chave}" sem nota.`);
    if (atual.has(chave)) {
      throw new Error(`${onde}: "${chave}" aparece duas vezes na mesma tabela.`);
    }
    atual.set(chave, nota);
  }
  const imagem = [...tabelas].find(([t]) => t.startsWith('a imagem'))?.[1];
  const forma = [...tabelas].find(([t]) => t.startsWith('a forma'))?.[1];
  if (!imagem || !forma) {
    throw new Error(
      `${onde}: a seção da confissão precisa das DUAS tabelas ` +
        '("### a imagem …" e "### a forma …").'
    );
  }
  return { imagem, forma };
}
