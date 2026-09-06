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

// Os canais que o manifest reconhece. Nome de arquivo fora deste
// vocabulário é ERRO na hora, não entrada "criativa" no manifest — a
// padronização é o que permite inferir corpo/canal da árvore de
// diretórios sem tabela paralela.
// `height` entrou na S2 do item 134: o mapa de altura que desloca o
// vértice da lua (`rochoso.ts`). É DADO, não cor — ver a exceção de
// encode em `otimiza-texturas.mjs`.
export const CANAIS = ['map', 'clouds', 'night', 'normal', 'roughness', 'height'];

// Os canais que se LEEM em vez de se olhar: `height` desloca o vértice e
// `normal` gira a luz, então um erro de 8/255 neles é relevo falso, não
// tom. Quem adquire (`baixa-texturas.mjs`) e quem reamostra
// (`otimiza-texturas.mjs`) têm de concordar sobre QUAIS são — por isso a
// lista mora aqui, e não em cópia nos dois.
export const CANAIS_DE_DADO = new Set(['height', 'normal']);

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
  // o host de BYTES do USGS Astrogeology: `astrogeology.usgs.gov` serve a
  // página do produto e os arquivos saem daqui (item 141, 3ª fase — é de
  // onde `gera-normal-de-dem.mjs` já lê os DEMs da Dawn e da MESSENGER)
  'asc-pds-services.s3.us-west-2.amazonaws.com',
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

/**
 * GIRO DE LONGITUDE de uma grade equiretangular, em COLUNAS inteiras
 * (item 141, 3ª fase). A coluna `i` da saída vem da coluna `i + passos`
 * da entrada, de modo que a borda esquerda passa da longitude `L` para
 * `L + giroGraus`. Um mapa cuja borda esquerda está em `L` vai para a
 * convenção da casa (borda em 180°) com `giroGraus = 180 − L`.
 *
 * SERVE OS DOIS LADOS DO PIPELINE, e é por isso que mora aqui: a
 * aquisição gira IMAGEM (Buffer de 1 ou 3 canais por texel) e
 * `gera-normal-de-dem.mjs` gira o DEM (Float32Array de metros, um canal).
 * Era a mesma conta escrita duas vezes; `canais` é a única diferença, e a
 * saída sai do mesmo tipo da entrada.
 *
 * O arredondamento em colunas é declarado: 150° de 2048 px dão 853,33
 * colunas, e a saída fica 0,06° fora — 0,3 px, abaixo do que o olho e o
 * juiz de energia de borda enxergam.
 */
export function giraColunasDeImagem(pixels, largura, altura, canais, giroGraus) {
  const passos = ((Math.round((giroGraus / 360) * largura) % largura) + largura) % largura;
  if (passos === 0) return pixels;
  const saida = Buffer.isBuffer(pixels)
    ? Buffer.allocUnsafe(pixels.length)
    : new pixels.constructor(pixels.length);
  for (let j = 0; j < altura; j += 1) {
    for (let i = 0; i < largura; i += 1) {
      const de = (j * largura + ((i + passos) % largura)) * canais;
      const para = (j * largura + i) * canais;
      for (let c = 0; c < canais; c += 1) saida[para + c] = pixels[de + c];
    }
  }
  return saida;
}

/**
 * O VAZIO SEM DADO DE UM MAPA (item 147) — o hemisfério que a sonda não
 * viu. A Voyager 2 passou por Urano em 1986 com o polo sul virado para o
 * Sol e fotografou SÓ o sul de Miranda, Ariel, Umbriel, Titânia e Oberon;
 * em Tritão (1989) viu ~40 %. Os mapas da NASA 3D deixam o resto em PRETO
 * PURO — 57 a 62 % de cada mapa das cinco, 80 % do de Tritão —, e em 2026
 * o Sol ilumina justamente o norte de Urano: a lua desenhada com o mapa
 * cru é um disco preto no lado do dia.
 *
 * A receita é a do polo sul de Ceres (`preencherPolosSemDado`, na
 * aquisição), estendida ao vazio de qualquer forma: texel sem dado é o
 * que fica abaixo de `vazioAte` em todo canal, e é PREENCHIDO só quando
 * pertence a um vazio GRANDE — a fração de texels sem dado na janela de
 * `(2·raio+1)²` à volta dele passa de `fracaoMinima` — ou quando encosta
 * num texel assim (o núcleo do vazio cresce meio raio, para os cantos
 * côncavos da borda, onde a janela vê mais dado que vazio, não sobrarem
 * como pontos pretos). Sombra de cratera é preta também, mas é pequena,
 * cercada de dado e longe do núcleo: fica. A borda do vazio
 * não é uma linha de latitude (é o terminador do dia da passagem, uma
 * curva dentada que invade as linhas com dado — 6 a 21 % de preto dentro
 * delas, medido), e é por isso que a régua é a vizinhança, não a linha.
 *
 * O TOM é a MÉDIA por canal do que tem dado, sem esticar nem escurecer:
 * o nível do mapa não é mexido (a mesma disciplina do mosaico de Ceres).
 * Não se inventa cratera nem se espelha o hemisfério visto — o que não
 * foi fotografado entra liso e é confessado na ficha.
 *
 * Muta `pixels` no lugar e devolve a conta, para o log da aquisição e
 * para o teste: `{ semDado, preenchidos, tom }`.
 */
export function preencherVazioSemDado(
  pixels, largura, altura, canais,
  { vazioAte = 12, raio = 7, fracaoMinima = 0.35 } = {}
) {
  const n = largura * altura;
  const semDado = new Uint8Array(n);
  const soma = new Array(canais).fill(0);
  let comDado = 0;
  let totalSemDado = 0;
  for (let k = 0; k < n; k += 1) {
    let maximo = 0;
    for (let c = 0; c < canais; c += 1) {
      const v = pixels[k * canais + c];
      if (v > maximo) maximo = v;
    }
    if (maximo < vazioAte) {
      semDado[k] = 1;
      totalSemDado += 1;
    } else {
      comDado += 1;
      for (let c = 0; c < canais; c += 1) soma[c] += pixels[k * canais + c];
    }
  }
  const tom = soma.map((s) => (comDado > 0 ? Math.round(s / comDado) : 0));
  if (totalSemDado === 0 || comDado === 0) return { semDado: totalSemDado, preenchidos: 0, tom };

  // imagem integral de uma máscara: a soma de qualquer janela sai em
  // O(1) por texel, e a mesma conta serve ao núcleo e ao crescimento
  const L = largura + 1;
  const integralDe = (mascara) => {
    const integral = new Uint32Array(L * (altura + 1));
    for (let j = 1; j <= altura; j += 1) {
      let linha = 0;
      for (let i = 1; i <= largura; i += 1) {
        linha += mascara[(j - 1) * largura + (i - 1)];
        integral[j * L + i] = integral[(j - 1) * L + i] + linha;
      }
    }
    return integral;
  };
  const somaDaJanela = (integral, i, j, r) => {
    const j0 = Math.max(0, j - r);
    const j1 = Math.min(altura - 1, j + r);
    const i0 = Math.max(0, i - r);
    const i1 = Math.min(largura - 1, i + r);
    const dentro =
      integral[(j1 + 1) * L + (i1 + 1)] - integral[j0 * L + (i1 + 1)]
      - integral[(j1 + 1) * L + i0] + integral[j0 * L + i0];
    return { dentro, area: (j1 - j0 + 1) * (i1 - i0 + 1) };
  };

  // 1. o núcleo: sem dado e cercado de vazio
  const integralSemDado = integralDe(semDado);
  const nucleo = new Uint8Array(n);
  for (let j = 0; j < altura; j += 1) {
    for (let i = 0; i < largura; i += 1) {
      const k = j * largura + i;
      if (!semDado[k]) continue;
      const { dentro, area } = somaDaJanela(integralSemDado, i, j, raio);
      if (dentro / area >= fracaoMinima) nucleo[k] = 1;
    }
  }
  // 2. o preenchimento: o núcleo e o vazio que encosta nele
  const integralDoNucleo = integralDe(nucleo);
  const crescimento = Math.ceil(raio / 2);
  let preenchidos = 0;
  for (let j = 0; j < altura; j += 1) {
    for (let i = 0; i < largura; i += 1) {
      const k = j * largura + i;
      if (!semDado[k]) continue;
      if (!nucleo[k] && somaDaJanela(integralDoNucleo, i, j, crescimento).dentro === 0) continue;
      for (let c = 0; c < canais; c += 1) pixels[k * canais + c] = tom[c];
      preenchidos += 1;
    }
  }
  return { semDado: totalSemDado, preenchidos, tom };
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
