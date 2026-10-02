// ============================================================
// O RELEVO INVENTADO DE PLUTÃO E CARONTE — por enquanto, as MEDIDAS do
// lado medido (PLAN-RELEVO.md, etapa E2b, 01/10/2026). A síntese (E3)
// entra depois neste mesmo módulo: o que se mede aqui é a régua dela.
//
// POR QUE MEDIR ANTES. A metade sem DEM dos dois corpos vai ganhar relevo
// sorteado com a ESTATÍSTICA da metade medida: a aspereza em cada escala,
// a altura média e a dispersão de cada unidade geológica, as crateras
// (quantas, de que tamanhos, de que forma). Tudo sai do cache das alturas
// (`lerCacheDeAlturas`, `gera-normal-de-dem.mjs`), medido na REGIÃO-EXEMPLO
// de cada unidade (`fonte/<corpo>-lado-de-tras.json`, caixa `exemplo`). E o
// mapa de QUALIDADE diz onde o DEM medido está borrado — onde ele não
// resolve as escalas finas e a costura da E3 terá de simulá-las sobre o
// dado (item 5b do plano).
//
// A GRADE É A DA CASA, a do cache: coluna 0 = 180°E, longitude leste
// crescendo para a direita (coluna largura/2 = 0°E), linha 0 = +90°, centro
// do texel em (i + 0,5, j + 0,5). `metros` é a altura sobre a esfera de
// referência; `vazio` = 1 é o texel sem dado (inclusive o parcial).
//
// AS REGRAS DE TODA CONTA (PLAN-RELEVO, "Requisitos que valem para tudo"):
//   - dá a volta em longitude;
//   - mede em km VERDADEIROS: a distância é a CORDA 3D entre os centros, e
//     o passo leste–oeste encolhe com cos(lat);
//   - média é pesada por cos(lat), a área do texel;
//   - filtro ignora o vazio: convolução NORMALIZADA pela máscara (o mesmo
//     operador filtra h·m e m, e o resultado é a divisão).
//
// AS OITAVAS. A altura é partida em bandas por DIFERENÇA DE GAUSSIANAS com
// σ em km, dobrando de 2 texels até ~500 km; a soma das bandas devolve a
// altura (é telescópica). A gaussiana é separável na esfera: leste–oeste ao
// longo de cada paralelo (σ em colunas cresce com 1/cos lat) e norte–sul ao
// longo do círculo máximo que o meridiano i fecha com o i + largura/2 —
// atravessa os dois polos sem borda. Cada passada é a média em caixa de
// largura FRACIONÁRIA repetida três vezes (variância exata, custo que não
// depende de σ).
//
// AS CRATERAS. Os catálogos de Robbins v2 trazem longitudes em convenções
// DIFERENTES: Caronte em leste 0–360; Plutão em −180..180 deslocado de MEIA
// VOLTA — a longitude leste é o valor do catálogo + 180° (Sputnik Planitia
// aparece a −5,7°, Burney a −45,6°, Simonelli a 134,7°; as três caem no lugar
// com +180°). `SOMA_DE_LONGITUDE_DO_CATALOGO` guarda a correção, e o executor
// a confere no DEM (Caronte: d/D mediana 0,053 no centro do catálogo contra
// 0,004 com meia volta).
// ============================================================

const GRAUS = 180 / Math.PI;
const RADIANOS = Math.PI / 180;

/** A latitude do clamp de `assaNormais`: acima dela o passo leste para de encolher. */
const LATITUDE_DO_CLAMP_RAD = 80 * RADIANOS;

/** Passadas de caixa que fazem a gaussiana (três já dão o sino; ver o cabeçalho). */
const PASSADAS = 3;

/** Peso normalizado abaixo do qual o filtro não viu dado nenhum (é só arredondamento). */
const PESO_MINIMO = 1e-9;

const normaliza360 = (graus) => ((graus % 360) + 360) % 360;

// ------------------------------------------------------------
// A GRADE
// ------------------------------------------------------------

/** Latitude (rad) do centro da linha `j` — a linha 0 é o norte. */
export function latitudeDaLinha(j, altura) {
  return Math.PI / 2 - ((j + 0.5) / altura) * Math.PI;
}

/** Longitude leste (graus, 0–360) do centro da coluna `i` — a coluna 0 é 180°E. */
export function longitudeDaColuna(i, largura) {
  return normaliza360(180 + ((i + 0.5) * 360) / largura);
}

/** Coluna fracionária (inteiro = centro do texel) de uma longitude leste em graus. */
export function colunaDaLongitude(lonGraus, largura) {
  return (normaliza360(lonGraus - 180) / 360) * largura - 0.5;
}

/** Linha fracionária (inteiro = centro do texel) de uma latitude em graus. */
export function linhaDaLatitude(latGraus, altura) {
  return ((90 - latGraus) / 180) * altura - 0.5;
}

function naCaixa(latGraus, lonGraus, caixa) {
  const lon = normaliza360(lonGraus);
  return (
    latGraus >= caixa.lat[0] && latGraus <= caixa.lat[1] && lon >= caixa.lon[0] && lon <= caixa.lon[1]
  );
}

/**
 * A máscara (1 = dentro) dos texels cujo CENTRO cai na caixa `{ lon: [a, b],
 * lat: [c, d] }` — graus, leste 0–360, sem atravessar 0° (a convenção de
 * `exemplo` no mapa de unidades).
 */
export function mascaraDaCaixa(caixa, largura, altura) {
  const mascara = new Uint8Array(largura * altura);
  for (let j = 0; j < altura; j += 1) {
    const lat = latitudeDaLinha(j, altura) * GRAUS;
    if (lat < caixa.lat[0] || lat > caixa.lat[1]) continue;
    for (let i = 0; i < largura; i += 1) {
      if (naCaixa(lat, longitudeDaColuna(i, largura), caixa)) mascara[j * largura + i] = 1;
    }
  }
  return mascara;
}

/** Área da caixa lat/lon na esfera de raio `raioKm`, em km². */
export function areaDaCaixaKm2(caixa, raioKm) {
  const dLon = (caixa.lon[1] - caixa.lon[0]) * RADIANOS;
  return (
    raioKm * raioKm * dLon * (Math.sin(caixa.lat[1] * RADIANOS) - Math.sin(caixa.lat[0] * RADIANOS))
  );
}

// ------------------------------------------------------------
// A FUNÇÃO DE ESTRUTURA S(d)
// ------------------------------------------------------------

/**
 * Os lags do S(d), em texels de norte–sul: ~`quantos` distâncias em
 * progressão geométrica de 1 texel a `maxKm`, arredondadas para inteiro e sem
 * repetição (1, 2, 3, 4, 5, 7, 10, 14, ...).
 */
export function lagsDoS(texelKm, maxKm = 500, quantos = 20) {
  const razao = Math.pow(maxKm / texelKm, 1 / (quantos - 1));
  const lags = [];
  for (let q = 0; q < quantos; q += 1) {
    const n = Math.max(1, Math.round(Math.pow(razao, q)));
    if (n !== lags[lags.length - 1]) lags.push(n);
  }
  return lags;
}

/**
 * S(d) = média, sobre os pares válidos, de (h(x+d) − h(x))², por EIXO.
 * `valido` (1 = entra) já é a região de interesse com o vazio fora: o par só
 * conta com as DUAS pontas válidas — numa caixa-exemplo, S fala só da caixa.
 *
 * Norte–sul: o par desce `n` linhas pelo mesmo meridiano (`n` = os `lags`).
 * Leste–oeste: em CADA linha o passo em colunas é o que faz a corda bater com
 * o lag em km (corda = 2·R·cos(lat)·sen(m·Δλ/2)); dá a volta na longitude.
 * Cada par pesa cos(lat) (no norte–sul, o da latitude média do par), e a
 * distância devolvida é a média pesada das cordas de fato usadas.
 *
 * Subamostragem: só as âncoras a cada `passoLinhas` linhas e `passoColunas`
 * colunas (1 = todas). Devolve `{ ns, ew }`, listas de [km, m², pares], sem
 * os lags com menos de `minimoDePares` pares.
 */
export function funcaoDeEstrutura(campo, valido, largura, altura, raioM, opcoes = {}) {
  const raioKm = raioM / 1000;
  const dLat = Math.PI / altura;
  const dLon = (2 * Math.PI) / largura;
  const texelKm = raioKm * dLat;
  const lags = opcoes.lags ?? lagsDoS(texelKm);
  const passoLinhas = opcoes.passoLinhas ?? 1;
  const passoColunas = opcoes.passoColunas ?? 1;
  const minimoDePares = opcoes.minimoDePares ?? 100;

  const temLinha = new Uint8Array(altura);
  for (let j = 0; j < altura; j += 1) {
    const base = j * largura;
    for (let i = 0; i < largura; i += 1) {
      if (valido[base + i]) {
        temLinha[j] = 1;
        break;
      }
    }
  }
  const novo = () => lags.map(() => ({ soma: 0, peso: 0, distancia: 0, pares: 0 }));
  const ns = novo();
  const ew = novo();

  for (let j = 0; j < altura; j += passoLinhas) {
    if (!temLinha[j]) continue;
    const lat = latitudeDaLinha(j, altura);
    const base = j * largura;
    for (let q = 0; q < lags.length; q += 1) {
      const n = lags[q];
      const j2 = j + n;
      if (j2 >= altura || !temLinha[j2]) continue;
      const base2 = j2 * largura;
      let soma = 0;
      let pares = 0;
      for (let i = 0; i < largura; i += passoColunas) {
        if (!valido[base + i] || !valido[base2 + i]) continue;
        const dh = campo[base2 + i] - campo[base + i];
        soma += dh * dh;
        pares += 1;
      }
      if (!pares) continue;
      const peso = Math.cos(lat - (n * dLat) / 2);
      const acc = ns[q];
      acc.soma += peso * soma;
      acc.peso += peso * pares;
      acc.distancia += peso * pares * 2 * raioKm * Math.sin((n * dLat) / 2);
      acc.pares += pares;
    }
    const raioDoParalelo = raioKm * Math.cos(lat);
    for (let q = 0; q < lags.length; q += 1) {
      const alvo = lags[q] * texelKm;
      if (alvo >= 2 * raioDoParalelo) continue;
      const m = Math.max(1, Math.round((2 * Math.asin(alvo / (2 * raioDoParalelo))) / dLon));
      if (m > largura / 2) continue;
      let soma = 0;
      let pares = 0;
      for (let i = 0; i < largura; i += passoColunas) {
        const i2 = (i + m) % largura;
        if (!valido[base + i] || !valido[base + i2]) continue;
        const dh = campo[base + i2] - campo[base + i];
        soma += dh * dh;
        pares += 1;
      }
      if (!pares) continue;
      const peso = Math.cos(lat);
      const acc = ew[q];
      acc.soma += peso * soma;
      acc.peso += peso * pares;
      acc.distancia += peso * pares * 2 * raioDoParalelo * Math.sin((m * dLon) / 2);
      acc.pares += pares;
    }
  }
  const fecha = (lista) =>
    lista
      .filter((a) => a.pares >= minimoDePares)
      .map((a) => [a.distancia / a.peso, a.soma / a.peso, a.pares]);
  return { ns: fecha(ns), ew: fecha(ew) };
}

// ------------------------------------------------------------
// INCLINAÇÃO E ALTURA
// ------------------------------------------------------------

/**
 * O RMS da inclinação com a MESMA conta de `assaNormais`: diferença central,
 * passo leste preso no valor de 80° de latitude, polo com a diferença de uma
 * linha só, e fora todo texel cujo estêncil de 5 pontos toca o vazio. Com
 * `regiao` (1 = entra) mede só ali. `rmsGrausPorTexel` é a média simples — o
 * número que o assamento imprime —, `rmsGraus` a pesada por cos(lat).
 */
export function inclinacaoRms(metros, vazio, largura, altura, raioM, regiao) {
  const dLon = (2 * Math.PI) / largura;
  const passoNorte = raioM * (Math.PI / altura);
  const passoLesteMinimo = raioM * Math.cos(LATITUDE_DO_CLAMP_RAD) * dLon;
  let soma = 0;
  let texels = 0;
  let somaPesada = 0;
  let peso = 0;
  for (let j = 0; j < altura; j += 1) {
    const lat = latitudeDaLinha(j, altura);
    const cosLat = Math.cos(lat);
    const passoLeste = Math.max(raioM * cosLat * dLon, passoLesteMinimo);
    const jNorte = Math.max(0, j - 1);
    const jSul = Math.min(altura - 1, j + 1);
    const vaoNorte = (jSul - jNorte) * passoNorte;
    for (let i = 0; i < largura; i += 1) {
      const k = j * largura + i;
      if (regiao && !regiao[k]) continue;
      const iLeste = (i + 1) % largura;
      const iOeste = (i - 1 + largura) % largura;
      if (
        vazio[k] ||
        vazio[j * largura + iLeste] ||
        vazio[j * largura + iOeste] ||
        vazio[jNorte * largura + i] ||
        vazio[jSul * largura + i]
      ) {
        continue;
      }
      const dhLeste = (metros[j * largura + iLeste] - metros[j * largura + iOeste]) / (2 * passoLeste);
      const dhNorte = (metros[jNorte * largura + i] - metros[jSul * largura + i]) / vaoNorte;
      const declive2 = dhLeste * dhLeste + dhNorte * dhNorte;
      soma += declive2;
      texels += 1;
      somaPesada += cosLat * declive2;
      peso += cosLat;
    }
  }
  return {
    rmsGraus: texels ? Math.atan(Math.sqrt(somaPesada / peso)) * GRAUS : null,
    rmsGrausPorTexel: texels ? Math.atan(Math.sqrt(soma / texels)) * GRAUS : null,
    texels,
  };
}

/** Média e desvio-padrão da altura (pesados por cos lat) onde `valido` = 1. */
export function estatisticaDeAltura(metros, valido, largura, altura) {
  let soma = 0;
  let peso = 0;
  let texels = 0;
  for (let j = 0; j < altura; j += 1) {
    const cosLat = Math.cos(latitudeDaLinha(j, altura));
    for (let i = 0; i < largura; i += 1) {
      const k = j * largura + i;
      if (!valido[k]) continue;
      soma += cosLat * metros[k];
      peso += cosLat;
      texels += 1;
    }
  }
  if (!texels) return { media: null, sigma: null, texels };
  const media = soma / peso;
  let soma2 = 0;
  for (let j = 0; j < altura; j += 1) {
    const cosLat = Math.cos(latitudeDaLinha(j, altura));
    for (let i = 0; i < largura; i += 1) {
      const k = j * largura + i;
      if (valido[k]) soma2 += cosLat * (metros[k] - media) ** 2;
    }
  }
  return { media, sigma: Math.sqrt(soma2 / peso), texels };
}

// ------------------------------------------------------------
// O FILTRO GAUSSIANO NA ESFERA, COM MÁSCARA
// ------------------------------------------------------------

/**
 * A largura (em amostras, fracionária) da caixa de `caixaNoAnel` cuja
 * variância discreta é `v` (amostras²). Entre as larguras ímpares 2p−1 e 2p+1
 * a variância da caixa vale p² − p(4p²−1)/(3w); isto é a inversa.
 */
function larguraDaCaixa(v) {
  if (!(v > 0)) return 1;
  const p = Math.floor((Math.sqrt(1 + 12 * v) - 1) / 2) + 1;
  return (p * (4 * p * p - 1)) / (3 * (p * p - v));
}

/**
 * UMA passada de média em caixa de largura FRACIONÁRIA `w` num anel
 * periódico de `n` amostras (`x` → `saida`). A caixa é a integral do sinal em
 * degraus (a amostra s cobre [s, s+1)) entre o centro ± w/2, dividida por w:
 * peso cheio no miolo e a fração que sobra nas pontas, então a variância é
 * contínua em w. Caixa maior que o anel dá as voltas que precisar (no limite,
 * a média do anel — o que acontece perto do polo).
 */
function caixaNoAnel(x, n, w, prefixo, saida) {
  prefixo[0] = 0;
  for (let s = 0; s < n; s += 1) prefixo[s + 1] = prefixo[s] + x[s];
  const total = prefixo[n];
  const meia = w / 2;
  for (let t = 0; t < n; t += 1) {
    let u = t + 0.5 + meia;
    let k = Math.floor(u);
    let voltas = Math.floor(k / n);
    let kk = k - voltas * n;
    const alto = voltas * total + prefixo[kk] + (u - k) * x[kk];
    u = t + 0.5 - meia;
    k = Math.floor(u);
    voltas = Math.floor(k / n);
    kk = k - voltas * n;
    const baixo = voltas * total + prefixo[kk] + (u - k) * x[kk];
    saida[t] = (alto - baixo) / w;
  }
}

/** A gaussiana de desvio `sigma` (amostras) num anel: `PASSADAS` caixas iguais, no lugar. */
function gaussianaNoAnel(x, n, sigma, prefixo, tmp) {
  const w = larguraDaCaixa((sigma * sigma) / PASSADAS);
  if (w <= 1) return;
  let de = x;
  let para = tmp;
  for (let p = 0; p < PASSADAS; p += 1) {
    caixaNoAnel(de, n, w, prefixo, para);
    [de, para] = [para, de];
  }
  if (de !== x) x.set(de.subarray(0, n));
}

/**
 * A MÉDIA GAUSSIANA de `campo` com desvio `sigmaKm` (km verdadeiros), que
 * ignora o vazio: filtra campo·peso e peso com o mesmo operador e divide.
 * `peso` pode ser fracionário (a fração medida de um bloco); onde é 0 o
 * valor de `campo` nem é lido. Devolve `{ valor, peso }`: o valor é NaN onde
 * o filtro não alcançou dado nenhum, e `peso` é a fração do núcleo que caiu
 * em dado. Ver o cabeçalho (separável, o norte–sul atravessa os polos).
 */
export function desfocaComMascara(campo, peso, largura, altura, raioM, sigmaKm) {
  if (largura % 2) throw new Error('desfocaComMascara: a largura tem de ser par.');
  const n = largura * altura;
  const num = new Float32Array(n);
  const den = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    const p = peso[k];
    if (p > 0) {
      num[k] = campo[k] * p;
      den[k] = p;
    }
  }
  const raioKm = raioM / 1000;
  const dLon = (2 * Math.PI) / largura;
  const dLat = Math.PI / altura;

  // LESTE–OESTE: cada paralelo é um anel; o σ em colunas cresce com 1/cos(lat)
  {
    const prefixo = new Float64Array(largura + 1);
    const a = new Float64Array(largura);
    const b = new Float64Array(largura);
    const tmp = new Float64Array(largura);
    for (let j = 0; j < altura; j += 1) {
      const base = j * largura;
      let temPeso = false;
      for (let i = 0; i < largura; i += 1) {
        a[i] = num[base + i];
        b[i] = den[base + i];
        if (b[i] > 0) temPeso = true;
      }
      if (!temPeso) continue;
      const sigma = sigmaKm / (raioKm * Math.cos(latitudeDaLinha(j, altura)) * dLon);
      gaussianaNoAnel(a, largura, sigma, prefixo, tmp);
      gaussianaNoAnel(b, largura, sigma, prefixo, tmp);
      for (let i = 0; i < largura; i += 1) {
        num[base + i] = a[i];
        den[base + i] = b[i];
      }
    }
  }

  // NORTE–SUL: o meridiano i desce do polo norte ao sul e o i + largura/2 volta
  // do sul ao norte — um círculo máximo de 2·altura amostras, periódico
  {
    const L = 2 * altura;
    const prefixo = new Float64Array(L + 1);
    const a = new Float64Array(L);
    const b = new Float64Array(L);
    const tmp = new Float64Array(L);
    const sigma = sigmaKm / (raioKm * dLat);
    const meia = largura / 2;
    for (let i = 0; i < meia; i += 1) {
      const oposta = i + meia;
      let temPeso = false;
      for (let t = 0; t < altura; t += 1) {
        a[t] = num[t * largura + i];
        b[t] = den[t * largura + i];
        a[L - 1 - t] = num[t * largura + oposta];
        b[L - 1 - t] = den[t * largura + oposta];
        if (b[t] > 0 || b[L - 1 - t] > 0) temPeso = true;
      }
      if (!temPeso) continue;
      gaussianaNoAnel(a, L, sigma, prefixo, tmp);
      gaussianaNoAnel(b, L, sigma, prefixo, tmp);
      for (let t = 0; t < altura; t += 1) {
        num[t * largura + i] = a[t];
        den[t * largura + i] = b[t];
        num[t * largura + oposta] = a[L - 1 - t];
        den[t * largura + oposta] = b[L - 1 - t];
      }
    }
  }

  const valor = new Float32Array(n);
  for (let k = 0; k < n; k += 1) valor[k] = den[k] > PESO_MINIMO ? num[k] / den[k] : NaN;
  return { valor, peso: den };
}

// ------------------------------------------------------------
// AS OITAVAS E A QUALIDADE DO DEM
// ------------------------------------------------------------

/**
 * Os σ (km) das gaussianas que cortam as oitavas: de 2 texels de norte–sul,
 * dobrando, até `maxKm`. Plutão (1,82 km/texel): 3,6 … 467 km; Caronte
 * (0,93): 1,9 … 476 km.
 */
export function sigmasDasOitavas(raioM, altura, maxKm = 500) {
  const texelKm = (raioM / 1000) * (Math.PI / altura);
  const sigmas = [];
  for (let s = 2 * texelKm; s <= maxKm; s *= 2) sigmas.push(s);
  return sigmas;
}

/**
 * Parte a altura em BANDAS por diferença de gaussianas (com máscara): banda 0
 * = h − G(σ₀), banda k = G(σₖ₋₁) − G(σₖ), e a última entrada é o resíduo
 * G(σ último). A soma de todas devolve h onde há dado (é telescópica); no
 * vazio toda banda vale 0.
 */
export function decompoeEmOitavas(campo, valido, largura, altura, raioM, sigmasKm) {
  const n = largura * altura;
  const peso = new Float32Array(n);
  const h = new Float32Array(n);
  for (let k = 0; k < n; k += 1) {
    if (valido[k]) {
      peso[k] = 1;
      h[k] = campo[k];
    }
  }
  const bandas = [];
  // toda gaussiana filtra a ALTURA (não a anterior): G(σₖ) é a média de h
  let anterior = h;
  for (const sigma of sigmasKm) {
    const { valor } = desfocaComMascara(h, peso, largura, altura, raioM, sigma);
    const banda = new Float32Array(n);
    for (let k = 0; k < n; k += 1) {
      if (valido[k]) banda[k] = anterior[k] - valor[k];
      else valor[k] = 0;
    }
    bandas.push(banda);
    anterior = valor;
  }
  bandas.push(anterior);
  return bandas;
}

/**
 * Reduz a grade por blocos de `fator`×`fator`: `valor` é a média dos texels
 * válidos do bloco (NaN se nenhum) e `fracao` a parte medida do bloco.
 */
export function reduzEmBlocos(campo, valido, largura, altura, fator) {
  const L = largura / fator;
  const A = altura / fator;
  const soma = new Float64Array(L * A);
  const conta = new Float64Array(L * A);
  for (let j = 0; j < altura; j += 1) {
    const linha = Math.floor(j / fator) * L;
    for (let i = 0; i < largura; i += 1) {
      const k = j * largura + i;
      if (!valido[k]) continue;
      const c = linha + Math.floor(i / fator);
      soma[c] += campo[k];
      conta[c] += 1;
    }
  }
  const valor = new Float32Array(L * A);
  const fracao = new Float32Array(L * A);
  for (let c = 0; c < L * A; c += 1) {
    valor[c] = conta[c] ? soma[c] / conta[c] : NaN;
    fracao[c] = conta[c] / (fator * fator);
  }
  return { valor, fracao, largura: L, altura: A };
}

/**
 * A distância (km, corda 3D) de cada texel ao texel de vazio mais próximo:
 * cada texel herda dos vizinhos o candidato a "vazio mais perto" e guarda o
 * de menor corda (varreduras de ida e volta, com a volta da longitude). Zero
 * no vazio; Infinity se não há vazio.
 */
export function distanciaAoVazioKm(vazio, largura, altura, raioM) {
  const n = largura * altura;
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const z = new Float64Array(n);
  for (let j = 0; j < altura; j += 1) {
    const lat = latitudeDaLinha(j, altura);
    for (let i = 0; i < largura; i += 1) {
      const lon = longitudeDaColuna(i, largura) * RADIANOS;
      const k = j * largura + i;
      x[k] = Math.cos(lat) * Math.cos(lon);
      y[k] = Math.cos(lat) * Math.sin(lon);
      z[k] = Math.sin(lat);
    }
  }
  const perto = new Int32Array(n).fill(-1);
  const d2 = new Float64Array(n).fill(Infinity);
  for (let k = 0; k < n; k += 1) {
    if (vazio[k]) {
      perto[k] = k;
      d2[k] = 0;
    }
  }
  const tenta = (k, vizinho) => {
    const p = perto[vizinho];
    if (p < 0) return;
    const dx = x[k] - x[p];
    const dy = y[k] - y[p];
    const dz = z[k] - z[p];
    const dd = dx * dx + dy * dy + dz * dz;
    if (dd < d2[k]) {
      d2[k] = dd;
      perto[k] = p;
    }
  };
  for (let volta = 0; volta < 2; volta += 1) {
    for (let j = 0; j < altura; j += 1) {
      const base = j * largura;
      for (let s = 0; s < 2 * largura; s += 1) {
        const i = s % largura;
        const iO = (i - 1 + largura) % largura;
        const k = base + i;
        tenta(k, base + iO);
        if (j > 0) {
          tenta(k, base - largura + iO);
          tenta(k, base - largura + i);
          tenta(k, base - largura + ((i + 1) % largura));
        }
      }
      for (let s = 2 * largura - 1; s >= 0; s -= 1) {
        const i = s % largura;
        tenta(base + i, base + ((i + 1) % largura));
      }
    }
    for (let j = altura - 1; j >= 0; j -= 1) {
      const base = j * largura;
      for (let s = 2 * largura - 1; s >= 0; s -= 1) {
        const i = s % largura;
        const iL = (i + 1) % largura;
        const k = base + i;
        tenta(k, base + iL);
        if (j < altura - 1) {
          tenta(k, base + largura + iL);
          tenta(k, base + largura + i);
          tenta(k, base + largura + ((i - 1 + largura) % largura));
        }
      }
      for (let s = 0; s < 2 * largura; s += 1) {
        const i = s % largura;
        tenta(base + i, base + ((i - 1 + largura) % largura));
      }
    }
  }
  const raioKm = raioM / 1000;
  const saida = new Float32Array(n);
  for (let k = 0; k < n; k += 1) saida[k] = perto[k] < 0 ? Infinity : raioKm * Math.sqrt(d2[k]);
  return saida;
}

// ------------------------------------------------------------
// AS CRATERAS: catálogos
// ------------------------------------------------------------

/**
 * O que somar à longitude de cada catálogo de Robbins v2 para chegar à
 * longitude leste 0–360 (ver o cabeçalho: Plutão vem com 180° a menos).
 */
export const SOMA_DE_LONGITUDE_DO_CATALOGO = { pluto: 180, charon: 0 };

function camposCsv(linha) {
  const campos = [];
  let atual = '';
  let aspas = false;
  for (const ch of linha) {
    if (ch === '"') aspas = !aspas;
    else if (ch === ',' && !aspas) {
      campos.push(atual.trim());
      atual = '';
    } else atual += ch;
  }
  campos.push(atual.trim());
  return campos;
}

function tabelaCsv(texto) {
  const linhas = texto
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '');
  const cabecalho = camposCsv(linhas[0]);
  return linhas.slice(1).map((l) => {
    const c = camposCsv(l);
    return Object.fromEntries(cabecalho.map((h, k) => [h, c[k] ?? '']));
  });
}

const numeroOuNulo = (texto) => (texto === '' || !Number.isFinite(Number(texto)) ? null : Number(texto));

/** O banco de crateras de Robbins v2 (CSV): `{ id, lat, lon (leste 0–360), dKm, confianca, regiao }`. */
export function lerCatalogoDeCrateras(texto, somaDeLongitudeGraus) {
  return tabelaCsv(texto).map((r) => ({
    id: r.ID,
    lat: Number(r.LATITUDE),
    lon: normaliza360(Number(r.LONGITUDE) + somaDeLongitudeGraus),
    dKm: Number(r.DIAMETER),
    confianca: Number(r.CONFIDENCE),
    regiao: Number(r.REGION),
  }));
}

/** O guia de regiões de Robbins v2: por número, `{ nome, areaKm2, completudeKm }` (null = "N/A"). */
export function lerGuiaDeRegioes(texto) {
  const guia = {};
  for (const r of tabelaCsv(texto)) {
    guia[Number(r['Region Number'])] = {
      nome: r['Region Name'],
      areaKm2: Number(r['Surface Area (sq-km)']),
      completudeKm: numeroOuNulo(r['Estimated Completeness (km)']),
    };
  }
  return guia;
}

/** A tabela de forma de Robbins+ 2021 (Ro21): profundidade e borda em km, morfologia em texto. */
export function lerTabelaRo21(texto) {
  return tabelaCsv(texto).map((r) => ({
    lat: Number(r.Latitude),
    lon: normaliza360(Number(r.Longitude)),
    dKm: Number(r.Diameter),
    profundidadeKm: numeroOuNulo(r['Rim-Floor Depth']),
    bordaKm: numeroOuNulo(r['Rim Height']),
    pico: r['Central Peak'],
    fundoPlano: r['Flat Floors'],
  }));
}

/** A completude (km) da região da cratera, ou null onde o guia não a declara. */
const completudeDe = (cratera, guia) => guia[cratera.regiao]?.completudeKm ?? null;

/** Cratera que CONTA: confiança ≥ 3 e diâmetro acima da completude da região dela. */
export function crateraConta(cratera, guia) {
  const completude = completudeDe(cratera, guia);
  return cratera.confianca >= 3 && completude !== null && cratera.dKm >= completude;
}

// ------------------------------------------------------------
// AS CRATERAS: quantas e de que tamanhos
// ------------------------------------------------------------

/**
 * A inclinação DIFERENCIAL da lei de tamanhos (dN/dD ∝ D^−α → devolve −α)
 * pela máxima verossimilhança da potência truncada em [a, b): sem topo, a
 * fórmula fechada α = 1 + n / Σ ln(D/a); com topo, busca de seção áurea, e
 * o erro sai da curvatura da verossimilhança. Menos de 3 crateras: null.
 */
export function inclinacaoDiferencial(diametros, a, b = Infinity) {
  const ds = diametros.filter((d) => d >= a && d < b);
  const n = ds.length;
  if (n < 3) return { valor: null, erro: null, n };
  const somaLog = ds.reduce((s, d) => s + Math.log(d / a), 0);
  if (!Number.isFinite(b)) {
    const alfa = 1 + n / somaLog;
    return { valor: -alfa, erro: (alfa - 1) / Math.sqrt(n), n };
  }
  const topo = Math.log(b / a);
  const logZ = (alfa) =>
    Math.abs(alfa - 1) < 1e-9
      ? Math.log(topo)
      : Math.log((1 - Math.exp((1 - alfa) * topo)) / (alfa - 1));
  const ll = (alfa) => -alfa * somaLog - n * logZ(alfa);
  let lo = -4;
  let hi = 8;
  const phi = (Math.sqrt(5) - 1) / 2;
  for (let it = 0; it < 120; it += 1) {
    const m1 = hi - phi * (hi - lo);
    const m2 = lo + phi * (hi - lo);
    if (ll(m1) < ll(m2)) lo = m1;
    else hi = m2;
  }
  const alfa = (lo + hi) / 2;
  const h = 1e-3;
  const curvatura = (ll(alfa + h) - 2 * ll(alfa) + ll(alfa - h)) / (h * h);
  return { valor: -alfa, erro: curvatura < 0 ? 1 / Math.sqrt(-curvatura) : null, n };
}

/**
 * As crateras numa caixa-exemplo: N(≥D) por 10⁶ km² em D = 8, 11,3, 16 e 32 km
 * (os de Si21) e as inclinações diferenciais acima e abaixo de `dobraKm`. Contam só as de
 * `crateraConta`. A COMPLETUDE DA CAIXA é a pior das regiões presentes nela
 * (qualquer confiança): N(≥D) abaixo dela sai null, porque ali a contagem
 * perde crateras que existem.
 */
export function densidadeDeCrateras(crateras, caixa, raioKm, guia, dobraKm = 13) {
  const dentro = crateras.filter((c) => naCaixa(c.lat, c.lon, caixa));
  let completude = 0;
  let semCompletude = false;
  for (const r of new Set(dentro.map((c) => c.regiao))) {
    const c = guia[r]?.completudeKm ?? null;
    if (c === null) semCompletude = true;
    else completude = Math.max(completude, c);
  }
  const areaKm2 = areaDaCaixaKm2(caixa, raioKm);
  const contadas = dentro.filter((c) => crateraConta(c, guia)).map((c) => c.dKm);
  const N = (D) =>
    semCompletude || D < completude ? null : (contadas.filter((d) => d >= D).length / areaKm2) * 1e6;
  return {
    areaKm2,
    completudeKm: semCompletude ? null : completude,
    regioes: [...new Set(dentro.map((c) => c.regiao))].sort(),
    contadas: contadas.length,
    N8: N(8),
    N11: N(11.3),
    N16: N(16),
    N32: N(32),
    inclinacaoAcima: inclinacaoDiferencial(contadas, Math.max(dobraKm, completude)),
    inclinacaoAbaixo:
      completude < dobraKm ? inclinacaoDiferencial(contadas, completude, dobraKm) : null,
  };
}

// ------------------------------------------------------------
// AS CRATERAS: a forma, medida no DEM
// ------------------------------------------------------------

/**
 * A altura no ponto (lat em rad, lon leste em graus) por interpolação
 * bilinear entre os quatro centros vizinhos, com a volta da longitude; NaN se
 * algum dos quatro é vazio.
 */
export function amostraBilinear(grade, latRad, lonGraus) {
  const { metros, vazio, largura, altura } = grade;
  const x = colunaDaLongitude(lonGraus, largura);
  const y = ((Math.PI / 2 - latRad) / Math.PI) * altura - 0.5;
  const i0 = Math.floor(x);
  const fx = x - i0;
  let j0 = Math.floor(y);
  let fy = y - j0;
  if (j0 < 0) {
    j0 = 0;
    fy = 0;
  } else if (j0 > altura - 2) {
    j0 = altura - 2;
    fy = 1;
  }
  const ia = ((i0 % largura) + largura) % largura;
  const ib = (ia + 1) % largura;
  const k00 = j0 * largura + ia;
  const k01 = j0 * largura + ib;
  const k10 = k00 + largura;
  const k11 = k01 + largura;
  if (vazio[k00] || vazio[k01] || vazio[k10] || vazio[k11]) return NaN;
  return (
    (1 - fy) * ((1 - fx) * metros[k00] + fx * metros[k01]) +
    fy * ((1 - fx) * metros[k10] + fx * metros[k11])
  );
}

/** A base local (centro, norte, leste) de um ponto da esfera unitária. */
function baseLocal(latGraus, lonGraus) {
  const f = latGraus * RADIANOS;
  const l = lonGraus * RADIANOS;
  const cf = Math.cos(f);
  const sf = Math.sin(f);
  const cl = Math.cos(l);
  const sl = Math.sin(l);
  return { c: [cf * cl, cf * sl, sf], n: [-sf * cl, -sf * sl, cf], e: [-sl, cl, 0] };
}

/** O ponto a `angulo` rad de distância (círculo máximo) no rumo `azimute` (rad, do norte para leste). */
function destino(base, angulo, azimute) {
  const ca = Math.cos(angulo);
  const sa = Math.sin(angulo);
  const cz = Math.cos(azimute);
  const sz = Math.sin(azimute);
  const px = ca * base.c[0] + sa * (cz * base.n[0] + sz * base.e[0]);
  const py = ca * base.c[1] + sa * (cz * base.n[1] + sz * base.e[1]);
  const pz = ca * base.c[2] + sa * (cz * base.n[2] + sz * base.e[2]);
  return [Math.asin(Math.max(-1, Math.min(1, pz))), Math.atan2(py, px) * GRAUS];
}

/** Os anéis do perfil radial: r/R de 0 a 2,5 em passos de 0,05. */
const PASSO_DO_PERFIL_RR = 0.05;
const MAXIMO_DO_PERFIL_RR = 2.5;

/** A variância azimutal das alturas num anel de raio `rKm` em volta da base (NaN se < 90 % válidos). */
function varianciaNoAnel(grade, base, rKm, nAz) {
  const raioKm = grade.raioM / 1000;
  let soma = 0;
  let soma2 = 0;
  let validos = 0;
  for (let a = 0; a < nAz; a += 1) {
    const [lat, lon] = destino(base, rKm / raioKm, (2 * Math.PI * a) / nAz);
    const v = amostraBilinear(grade, lat, lon);
    if (!Number.isNaN(v)) {
      soma += v;
      soma2 += v * v;
      validos += 1;
    }
  }
  if (validos < 0.9 * nAz) return NaN;
  const media = soma / validos;
  return Math.max(0, soma2 / validos - media * media);
}

/**
 * O PERFIL RADIAL da cratera em volta de (lat, lon), média azimutal em anéis
 * de r/R = (q + ½)·`passoRR` até `maxRR`, com amostras a cada ~0,7 texel do
 * anel (16 a 720). `{ rR, h (m, NaN sem dado), fracao (válida do anel) }`.
 */
export function perfilRadial(grade, latGraus, lonGraus, raioKm, opcoes = {}) {
  const passo = opcoes.passoRR ?? PASSO_DO_PERFIL_RR;
  const maximo = opcoes.maxRR ?? MAXIMO_DO_PERFIL_RR;
  const texelKm = (grade.raioM / 1000) * (Math.PI / grade.altura);
  const raioDoCorpoKm = grade.raioM / 1000;
  const base = baseLocal(latGraus, lonGraus);
  const nAneis = Math.round(maximo / passo);
  const rR = new Float64Array(nAneis);
  const h = new Float64Array(nAneis);
  const fracao = new Float64Array(nAneis);
  for (let q = 0; q < nAneis; q += 1) {
    rR[q] = (q + 0.5) * passo;
    const r = rR[q] * raioKm;
    const nAz = Math.min(720, Math.max(16, Math.ceil((2 * Math.PI * r) / (0.7 * texelKm))));
    let soma = 0;
    let validos = 0;
    for (let a = 0; a < nAz; a += 1) {
      const [lat, lon] = destino(base, r / raioDoCorpoKm, (2 * Math.PI * a) / nAz);
      const v = amostraBilinear(grade, lat, lon);
      if (!Number.isNaN(v)) {
        soma += v;
        validos += 1;
      }
    }
    h[q] = validos ? soma / validos : NaN;
    fracao[q] = validos / nAz;
  }
  return { rR, h, fracao };
}

/**
 * RECENTRA a cratera no DEM pelo centro de SIMETRIA: até 0,25·D do centro do
 * catálogo, o centro que minimiza a soma das variâncias azimutais dos anéis
 * de 0,2 a 1,2 R — numa grade de 0,05 R e depois de 0,01 R em volta do
 * melhor. Numa cratera circular a variância do anel é mínima no centro e
 * cresce com o desvio; o declive regional entra igual em todo candidato.
 * POR QUE NÃO O CONTRASTE borda − fundo (o primeiro critério): medido nas
 * crateras de Ro21, cujos centros são bons, ele as movia 0,33 R e inflava d/D
 * em 15–30 % — onde o anel da "borda" cai na parede côncava, afastar o centro
 * AUMENTA o contraste. `{ lat, lon, desvioKm }`, ou null se nenhum centro tem
 * os anéis medidos.
 */
export function recentraCratera(grade, latGraus, lonGraus, raioKm) {
  const raioDoCorpoKm = grade.raioM / 1000;
  const texelKm = raioDoCorpoKm * (Math.PI / grade.altura);
  const origem = baseLocal(latGraus, lonGraus);
  const aneis = [0.2, 0.4, 0.6, 0.8, 1.0, 1.2].map((f) => ({
    rKm: f * raioKm,
    nAz: Math.min(180, Math.max(16, Math.ceil((2 * Math.PI * f * raioKm) / texelKm))),
  }));
  const assimetria = (base) => {
    let soma = 0;
    for (const { rKm, nAz } of aneis) soma += varianciaNoAnel(grade, base, rKm, nAz);
    return soma;
  };
  const candidato = (dLeste, dNorte) => {
    const distancia = Math.hypot(dLeste, dNorte);
    const [lat, lon] = destino(origem, distancia / raioDoCorpoKm, Math.atan2(dLeste, dNorte));
    const latGrausC = lat * GRAUS;
    return { lat: latGrausC, lon: normaliza360(lon), desvioKm: distancia, base: baseLocal(latGrausC, lon) };
  };
  let melhor = null;
  const experimenta = (dLeste, dNorte) => {
    if (Math.hypot(dLeste, dNorte) > 0.5 * raioKm + 1e-9) return;
    const c = candidato(dLeste, dNorte);
    const v = assimetria(c.base);
    if (Number.isNaN(v)) return;
    if (!melhor || v < melhor.assimetria) melhor = { ...c, assimetria: v, dLeste, dNorte };
  };
  for (let a = -10; a <= 10; a += 1) {
    for (let b = -10; b <= 10; b += 1) experimenta(a * 0.05 * raioKm, b * 0.05 * raioKm);
  }
  if (!melhor) return null;
  const { dLeste: e0, dNorte: n0 } = melhor;
  for (let a = -5; a <= 5; a += 1) {
    for (let b = -5; b <= 5; b += 1) experimenta(e0 + a * 0.01 * raioKm, n0 + b * 0.01 * raioKm);
  }
  return { lat: melhor.lat, lon: melhor.lon, desvioKm: melhor.desvioKm };
}

/**
 * A FORMA a partir do perfil radial (alturas em m, D em km):
 *   - crista da borda: o máximo do perfil em r/R 0,75–1,35 (`rBorda` = onde);
 *   - entorno: a média do perfil em r/R 1,5–2,0;
 *   - fundo: o mínimo em r/R < 0,7; profundidade = crista − fundo;
 *   - fundo plano: até que r/R, do ponto mais fundo para fora, o perfil fica
 *     a menos de 10 % da profundidade acima do fundo (tigela ~0,3; plano ≥ 0,5);
 *   - pico central: o centro (r/R < 0,15) acima do fundo do anel 0,15–0,7;
 *     `temPico` se passa de 10 % da profundidade.
 * `perfilD` = (h − entorno)/D em cada anel (o que se empilha).
 */
export function formaDoPerfil(perfil, dKm) {
  const { rR, h } = perfil;
  const D = dKm * 1000;
  const passo = rR.length > 1 ? rR[1] - rR[0] : 0.05;
  let iBorda = -1;
  let iFundo = -1;
  let iFundoDoAnel = -1;
  let somaEntorno = 0;
  let nEntorno = 0;
  let somaCentro = 0;
  let nCentro = 0;
  for (let q = 0; q < rR.length; q += 1) {
    const r = rR[q];
    if (r >= 0.75 && r <= 1.35 && (iBorda < 0 || h[q] > h[iBorda])) iBorda = q;
    if (r < 0.7 && (iFundo < 0 || h[q] < h[iFundo])) iFundo = q;
    if (r >= 0.15 && r < 0.7 && (iFundoDoAnel < 0 || h[q] < h[iFundoDoAnel])) iFundoDoAnel = q;
    if (r >= 1.5 && r <= 2.0) {
      somaEntorno += h[q];
      nEntorno += 1;
    }
    if (r < 0.15) {
      somaCentro += h[q];
      nCentro += 1;
    }
  }
  const entorno = somaEntorno / nEntorno;
  const profundidade = h[iBorda] - h[iFundo];
  let rPlano = rR[iFundo] + passo / 2;
  for (let q = iFundo + 1; q < rR.length && rR[q] <= rR[iBorda]; q += 1) {
    if (h[q] > h[iFundo] + 0.1 * profundidade) break;
    rPlano = rR[q] + passo / 2;
  }
  const pico = Math.max(0, somaCentro / nCentro - h[iFundoDoAnel]);
  return {
    profundidadeD: profundidade / D,
    bordaD: (h[iBorda] - entorno) / D,
    rBorda: rR[iBorda],
    fundoPlanoR: rPlano,
    picoD: pico / D,
    temPico: pico >= 0.1 * profundidade,
    perfilD: Array.from(h, (v) => (v - entorno) / D),
  };
}

/** Os percentis 25, 50 e 75 (interpolação linear) de uma lista de números. */
export function quartis(valores) {
  const v = valores.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return { p25: null, mediana: null, p75: null, n: 0 };
  const p = (f) => {
    const x = f * (v.length - 1);
    const k = Math.floor(x);
    return k + 1 < v.length ? v[k] + (x - k) * (v[k + 1] - v[k]) : v[k];
  };
  return { p25: p(0.25), mediana: p(0.5), p75: p(0.75), n: v.length };
}

// ------------------------------------------------------------
// TUDO JUNTO: as medidas do lado medido de um corpo
// ------------------------------------------------------------

/** As faixas de diâmetro (km) em que a forma é empilhada (as de Ro21). */
export const FAIXAS_DA_FORMA = [
  [9, 14],
  [14, 20],
  [20, 40],
  [40, Infinity],
];

/** Abaixo disto (q da banda) o DEM é declarado BORRADO naquela banda, no resumo. */
const LIMIAR_DE_BORRADO = 0.25;

/** As faixas de distância ao vazio (km) do resumo da qualidade. */
const FAIXAS_DE_DISTANCIA = [0, 50, 100, 200, 400, Infinity];

const nomeDaFaixa = ([a, b]) => (Number.isFinite(b) ? `${a}-${b}` : `≥${a}`);

/** O lado (graus) dos setores lat × lon do resumo de onde o DEM é borrado. */
const LADO_DO_SETOR_GRAUS = 30;

/**
 * ONDE o DEM é borrado, por setor de 30° × 30°: a área medida (km²) e, para
 * cada uma das `nBandas` mais finas, a fração dela borrada (`bandasBorradas`
 * da célula maior que a banda). Só setores com pelo menos `areaMinimaKm2`
 * medidos. (Manchas conexas não servem: o borrado contorna a borda do dado
 * inteira e vira uma mancha só.)
 */
function setoresBorrados(bandasBorradas, fracao, largura, altura, raioKm, nBandas, areaMinimaKm2) {
  const nLat = 180 / LADO_DO_SETOR_GRAUS;
  const nLon = 360 / LADO_DO_SETOR_GRAUS;
  const area = new Float64Array(nLat * nLon);
  const bandasDoResumo = Array.from({ length: nBandas }, (_, b) => b);
  const borrada = bandasDoResumo.map(() => new Float64Array(nLat * nLon));
  const areaDaLinha = (j) =>
    raioKm * raioKm * ((2 * Math.PI) / largura) * (Math.PI / altura) * Math.cos(latitudeDaLinha(j, altura));
  for (let j = 0; j < altura; j += 1) {
    const s0 = Math.min(nLat - 1, Math.floor((90 - latitudeDaLinha(j, altura) * GRAUS) / LADO_DO_SETOR_GRAUS));
    const a = areaDaLinha(j);
    for (let i = 0; i < largura; i += 1) {
      const c = j * largura + i;
      if (!(fracao[c] > 0)) continue;
      const s = s0 * nLon + Math.floor(longitudeDaColuna(i, largura) / LADO_DO_SETOR_GRAUS);
      const w = a * fracao[c];
      area[s] += w;
      bandasDoResumo.forEach((b, k) => {
        if (bandasBorradas[c] > b) borrada[k][s] += w;
      });
    }
  }
  const saida = [];
  for (let s = 0; s < nLat * nLon; s += 1) {
    if (area[s] < areaMinimaKm2) continue;
    const lat1 = 90 - Math.floor(s / nLon) * LADO_DO_SETOR_GRAUS;
    const lon0 = (s % nLon) * LADO_DO_SETOR_GRAUS;
    saida.push({
      latGraus: [lat1 - LADO_DO_SETOR_GRAUS, lat1],
      lonGraus: [lon0, lon0 + LADO_DO_SETOR_GRAUS],
      areaMedidaKm2: Math.round(area[s]),
      fracaoBorradaPorBanda: Object.fromEntries(
        bandasDoResumo.map((b, k) => [b, Math.round((1000 * borrada[k][s]) / area[s]) / 1000])
      ),
    });
  }
  return saida;
}

/**
 * AS MEDIDAS DO LADO MEDIDO de um corpo (E2b). `grade` = `{ metros, vazio,
 * largura, altura, raioM }` (o cache, na grade da casa); `unidades` = o
 * `unidades` do mapa do lado de trás; `crateras` (já em leste 0–360), `guia`
 * e `ro21` = os catálogos lidos. `registra` (opcional) recebe o progresso.
 *
 * Devolve `{ medidas, qualidade }`: `medidas` é o JSON de
 * `.cache/relevo/<corpo>-medidas.json` (sem os nomes de arquivo, que são de
 * quem grava), e `qualidade` traz os planos Float32 da grade reduzida e a
 * descrição deles.
 *
 * ESCOLHAS DECLARADAS:
 *   - S(d) da caixa conta só pares com as duas pontas na caixa; o global usa
 *     âncoras a cada 2 linhas e 2 colunas.
 *   - A energia local da banda k é a média gaussiana de banda² (com máscara)
 *     com σ = 4·σₖ (até 300 km), calculada já na grade reduzida (blocos de
 *     `fatorDaQualidade`) — o bloco é bem menor que esse σ.
 *   - q = energia local / MEDIANA, entre as caixas-exemplo, da energia da
 *     mesma banda. Primeiro foi a caixa MAIS PRÓXIMA, e o mapa saiu cortado
 *     em linhas retas (as fronteiras de Voronoi das caixas): em Caronte a
 *     caixa do cinturão tem ~8× a energia das outras nas bandas de 7–30 km, e
 *     q pulava 8× numa reta — que viraria costura reta na máscara por oitava
 *     da E3. A mediana é contínua; o preço é que q < 1 também marca terreno
 *     LISO de verdade, não só DEM borrado — por isso o veredito
 *     (`bandasBorradas`, o resumo e os setores) usa a regra MONÓTONA: banda k
 *     borrada só se as mais finas também estão. A caixa só mede bem as bandas
 *     de comprimento de onda (~3,3·σₖ) menor que ela: as outras saem
 *     `referenciaConfiavel: false` e ficam fora do veredito.
 *   - Forma: só crateras com D ≥ 10 texels, inteiras no dado (todo anel até
 *     2,5 R com ≥ 80 % de amostras válidas), recentradas pela simetria
 *     (`recentraCratera`) antes do perfil. As crateras de Ro21 passam pela
 *     mesma conta (`ro21.<faixa>.noCache`): a razão medido/Ro21 é a régua
 *     entre a média azimutal no cache de 4096 e as medidas deles no DEM de
 *     300 m. `nitidas` = o subconjunto onde o DEM resolve a escala da cratera.
 */
export function medeLadoMedido({ grade, unidades, crateras, guia, ro21, opcoes = {} }) {
  const registra = opcoes.registra ?? (() => {});
  const fator = opcoes.fatorDaQualidade ?? 4;
  const { metros, vazio, largura, altura, raioM } = grade;
  const raioKm = raioM / 1000;
  const texelKm = raioKm * (Math.PI / altura);
  const n = largura * altura;
  const valido = new Uint8Array(n);
  for (let k = 0; k < n; k += 1) valido[k] = vazio[k] ? 0 : 1;

  // ---- as caixas-exemplo
  const ids = Object.keys(unidades);
  const caixas = ids.map((id) => unidades[id].exemplo);
  const mascaras = caixas.map((c) => {
    const m = mascaraDaCaixa(c, largura, altura);
    for (let k = 0; k < n; k += 1) if (vazio[k]) m[k] = 0;
    return m;
  });

  // ---- as oitavas e a energia de cada banda na caixa
  const sigmas = sigmasDasOitavas(raioM, altura);
  registra(`oitavas: σ = ${sigmas.map((s) => s.toFixed(1)).join(', ')} km`);
  const bandas = decompoeEmOitavas(metros, valido, largura, altura, raioM, sigmas);
  const nBandas = sigmas.length;
  // os texels de uma máscara, com o cos(lat) de cada um (a média de energia
  // roda 10 vezes por caixa e não precisa varrer a grade inteira)
  const listaDaMascara = (mascara) => {
    const idx = [];
    const cosLat = [];
    for (let j = 0; j < altura; j += 1) {
      const c = Math.cos(latitudeDaLinha(j, altura));
      for (let i = 0; i < largura; i += 1) {
        if (!mascara[j * largura + i]) continue;
        idx.push(j * largura + i);
        cosLat.push(c);
      }
    }
    return { idx: Int32Array.from(idx), cosLat: Float64Array.from(cosLat) };
  };
  const energiaNaLista = (banda, { idx, cosLat }) => {
    let soma = 0;
    let peso = 0;
    for (let p = 0; p < idx.length; p += 1) {
      const v = banda[idx[p]];
      soma += cosLat[p] * v * v;
      peso += cosLat[p];
    }
    return peso ? soma / peso : null;
  };
  const energiaDasCaixas = mascaras.map((m) => {
    const lista = listaDaMascara(m);
    return bandas.slice(0, nBandas).map((banda) => energiaNaLista(banda, lista));
  });
  const listaGlobal = listaDaMascara(valido);
  const energiaGlobal = bandas.slice(0, nBandas).map((banda) => energiaNaLista(banda, listaGlobal));

  // ---- as medidas de cada unidade
  const medidasDasUnidades = {};
  for (let u = 0; u < ids.length; u += 1) {
    const m = mascaras[u];
    const inclinacao = inclinacaoRms(metros, vazio, largura, altura, raioM, m);
    const alt = estatisticaDeAltura(metros, m, largura, altura);
    medidasDasUnidades[ids[u]] = {
      exemplo: caixas[u],
      papel: unidades[ids[u]].papel,
      texels: alt.texels,
      rmsGraus: inclinacao.rmsGraus,
      rmsGrausPorTexel: inclinacao.rmsGrausPorTexel,
      alturaMedia: alt.media,
      alturaSigma: alt.sigma,
      S: funcaoDeEstrutura(metros, m, largura, altura, raioM),
      energiaPorBanda: energiaDasCaixas[u],
      crateras: densidadeDeCrateras(crateras, caixas[u], raioKm, guia),
    };
    registra(`unidade ${ids[u]}: ${alt.texels} texels, RMS ${inclinacao.rmsGraus?.toFixed(2)}°`);
  }

  // ---- o global (todo o dado medido)
  const inclinacaoGlobal = inclinacaoRms(metros, vazio, largura, altura, raioM);
  const alturaGlobal = estatisticaDeAltura(metros, valido, largura, altura);
  const global = {
    texels: alturaGlobal.texels,
    rmsGraus: inclinacaoGlobal.rmsGraus,
    rmsGrausPorTexel: inclinacaoGlobal.rmsGrausPorTexel,
    alturaMedia: alturaGlobal.media,
    alturaSigma: alturaGlobal.sigma,
    S: funcaoDeEstrutura(metros, valido, largura, altura, raioM, { passoLinhas: 2, passoColunas: 2 }),
    sSubamostragem: 'âncoras a cada 2 linhas e 2 colunas',
    energiaPorBanda: energiaGlobal,
  };
  registra('global medido');

  // ---- a qualidade, na grade reduzida
  const L = largura / fator;
  const A = altura / fator;
  const reduzidoDoVazio = reduzEmBlocos(metros, valido, largura, altura, fator);
  const fracao = reduzidoDoVazio.fracao;
  const vazioReduzido = new Uint8Array(L * A);
  for (let c = 0; c < L * A; c += 1) vazioReduzido[c] = fracao[c] > 0 ? 0 : 1;
  const distancia = distanciaAoVazioKm(vazioReduzido, L, A, raioM);
  const referenciaPorBanda = sigmas.map((_, b) => quartis(energiaDasCaixas.map((e) => e[b])).mediana);
  const ladoMinimoKm = caixas.map((c) => {
    const latMedia = ((c.lat[0] + c.lat[1]) / 2) * RADIANOS;
    return Math.min(
      (c.lat[1] - c.lat[0]) * RADIANOS * raioKm,
      (c.lon[1] - c.lon[0]) * RADIANOS * raioKm * Math.cos(latMedia)
    );
  });
  const ladoTipicoKm = quartis(ladoMinimoKm).mediana;
  const planos = [];
  const descricaoDasBandas = [];
  const q = [];
  for (let b = 0; b < nBandas; b += 1) {
    const quadrado = bandas[b].map((v) => v * v);
    const red = reduzEmBlocos(quadrado, valido, largura, altura, fator);
    const sigmaEnergia = Math.min(4 * sigmas[b], 300);
    const { valor: energia } = desfocaComMascara(red.valor, red.fracao, L, A, raioM, sigmaEnergia);
    const plano = new Float32Array(L * A);
    for (let c = 0; c < L * A; c += 1) {
      plano[c] = fracao[c] > 0 ? energia[c] / referenciaPorBanda[b] : NaN;
    }
    planos.push(plano);
    q.push(plano);
    const lambdaPicoKm = 3.27 * sigmas[b];
    descricaoDasBandas.push({
      banda: b,
      sigmaKm: [b === 0 ? 0 : sigmas[b - 1], sigmas[b]],
      lambdaPicoKm,
      sigmaDaEnergiaKm: sigmaEnergia,
      energiaDeReferenciaM2: referenciaPorBanda[b],
      referenciaConfiavel: lambdaPicoKm <= ladoTipicoKm,
    });
    registra(`qualidade da banda ${b} (σ ${sigmas[b].toFixed(1)} km)`);
  }
  // O BORRADO É MONÓTONO: o DEM que resolve uma escala resolve as maiores. A
  // banda k só conta como borrada se todas as mais finas também são — senão
  // a planície lisa de verdade (Vulcan: fina nítida, 7–30 km fraca) passaria
  // por DEM borrado. `bandasBorradas` = quantas oitavas finas seguidas, desde
  // a banda 0, têm q < `LIMIAR_DE_BORRADO` (só entre as de referência confiável).
  const nConfiaveis = descricaoDasBandas.filter((d) => d.referenciaConfiavel).length;
  const bandasBorradas = new Float32Array(L * A);
  for (let c = 0; c < L * A; c += 1) {
    if (!(fracao[c] > 0)) {
      bandasBorradas[c] = NaN;
      continue;
    }
    let k = 0;
    while (k < nConfiaveis && q[k][c] < LIMIAR_DE_BORRADO) k += 1;
    bandasBorradas[c] = k;
  }
  planos.push(bandasBorradas, fracao, distancia);

  // ---- o resumo: onde o DEM é borrado (pela regra monótona)
  const pesoDaCelula = (c) => fracao[c] * Math.cos(latitudeDaLinha(Math.floor(c / L), A));
  const resumoDasBandas = [];
  for (let b = 0; b < nConfiaveis; b += 1) {
    const porDistancia = {};
    let pesoBaixo = 0;
    let pesoTotal = 0;
    for (let f = 0; f + 1 < FAIXAS_DE_DISTANCIA.length; f += 1) {
      const [d0, d1] = [FAIXAS_DE_DISTANCIA[f], FAIXAS_DE_DISTANCIA[f + 1]];
      let baixo = 0;
      let total = 0;
      for (let c = 0; c < L * A; c += 1) {
        if (!(fracao[c] > 0) || distancia[c] < d0 || distancia[c] >= d1) continue;
        const w = pesoDaCelula(c);
        total += w;
        if (bandasBorradas[c] > b) baixo += w;
      }
      porDistancia[nomeDaFaixa([d0, d1])] = total ? Math.round((1000 * baixo) / total) / 1000 : null;
      pesoBaixo += baixo;
      pesoTotal += total;
    }
    resumoDasBandas.push({
      banda: b,
      sigmaKm: descricaoDasBandas[b].sigmaKm.map((s) => Math.round(s * 10) / 10),
      fracaoBorrada: Math.round((1000 * pesoBaixo) / pesoTotal) / 1000,
      fracaoBorradaPorDistanciaAoVazioKm: porDistancia,
    });
  }
  const setores = setoresBorrados(
    bandasBorradas, fracao, L, A, raioKm, nConfiaveis, opcoes.areaMinimaDoSetorKm2 ?? 5000
  );
  registra('resumo da qualidade');

  // ---- as crateras: a forma no DEM. NÍTIDA = cratera onde o DEM resolve as
  // bandas da escala dela: q ≥ 0,5 em toda banda de λ ≤ D, na célula do centro
  const dMinForma = 10 * texelKm;
  const nitidaEm = (lat, lon, dKm) => {
    const j = Math.min(A - 1, Math.max(0, Math.floor((linhaDaLatitude(lat, altura) + 0.5) / fator)));
    const i = ((Math.floor((colunaDaLongitude(lon, largura) + 0.5) / fator) % L) + L) % L;
    return descricaoDasBandas.every((d, b) => d.lambdaPicoKm > dKm || q[b][j * L + i] >= 0.5);
  };
  const formasNoDem = (lista) => {
    const saida = [];
    for (const c of lista) {
      if (c.dKm < dMinForma) continue;
      const jc = Math.round(linhaDaLatitude(c.lat, altura));
      const ic = ((Math.round(colunaDaLongitude(c.lon, largura)) % largura) + largura) % largura;
      if (jc < 0 || jc >= altura || vazio[jc * largura + ic]) continue;
      const rec = recentraCratera(grade, c.lat, c.lon, c.dKm / 2);
      if (!rec) continue;
      const perfil = perfilRadial(grade, rec.lat, rec.lon, c.dKm / 2);
      if (perfil.fracao.some((f) => f < 0.8)) continue;
      saida.push({
        ...formaDoPerfil(perfil, c.dKm),
        dKm: c.dKm,
        desvioR: rec.desvioKm / (c.dKm / 2),
        nitida: nitidaEm(rec.lat, rec.lon, c.dKm),
        fonte: c,
      });
    }
    return saida;
  };
  const formas = formasNoDem(crateras.filter((c) => c.confianca >= 3));
  // as MESMAS crateras de Ro21, medidas aqui: a régua do método contra a deles
  const formasDeRo21 = formasNoDem(ro21.filter((r) => r.profundidadeKm !== null));
  const rRDoPerfil = Array.from(
    { length: Math.round(MAXIMO_DO_PERFIL_RR / PASSO_DO_PERFIL_RR) },
    (_, k) => (k + 0.5) * PASSO_DO_PERFIL_RR
  );
  const bins = [];
  const perfis = {};
  const ro21PorFaixa = {};
  const arred = (x, casas = 4) => (x === null ? null : Math.round(x * 10 ** casas) / 10 ** casas);
  const quartisArred = (lista) => {
    const qq = quartis(lista);
    return { mediana: arred(qq.mediana), p25: arred(qq.p25), p75: arred(qq.p75), n: qq.n };
  };
  for (const faixa of FAIXAS_DA_FORMA) {
    const nome = nomeDaFaixa(faixa);
    const daFaixa = formas.filter((f) => f.dKm >= faixa[0] && f.dKm < faixa[1]);
    bins.push({
      faixaKm: nome,
      n: daFaixa.length,
      profundidadeD: quartisArred(daFaixa.map((f) => f.profundidadeD)),
      bordaD: quartisArred(daFaixa.map((f) => f.bordaD)),
      fundoPlanoR: quartisArred(daFaixa.map((f) => f.fundoPlanoR)),
      picoD: quartisArred(daFaixa.map((f) => f.picoD)),
      fracaoComPico: daFaixa.length
        ? arred(daFaixa.filter((f) => f.temPico).length / daFaixa.length, 3)
        : null,
      rBorda: quartisArred(daFaixa.map((f) => f.rBorda)),
      desvioDoCatalogoR: quartisArred(daFaixa.map((f) => f.desvioR)),
      nitidas: {
        n: daFaixa.filter((f) => f.nitida).length,
        profundidadeD: quartisArred(daFaixa.filter((f) => f.nitida).map((f) => f.profundidadeD)),
        bordaD: quartisArred(daFaixa.filter((f) => f.nitida).map((f) => f.bordaD)),
        rBorda: quartisArred(daFaixa.filter((f) => f.nitida).map((f) => f.rBorda)),
      },
    });
    perfis[nome] = {
      n: daFaixa.length,
      rR: rRDoPerfil.map((r) => arred(r, 3)),
      mediana: rRDoPerfil.map((_, k) => arred(quartis(daFaixa.map((f) => f.perfilD[k])).mediana, 5)),
      p25: rRDoPerfil.map((_, k) => arred(quartis(daFaixa.map((f) => f.perfilD[k])).p25, 5)),
      p75: rRDoPerfil.map((_, k) => arred(quartis(daFaixa.map((f) => f.perfilD[k])).p75, 5)),
    };
    const tabela = ro21.filter((r) => r.dKm >= faixa[0] && r.dKm < faixa[1]);
    const fracaoPresente = (campo) => {
      const decididos = tabela.filter((r) => r[campo] === 'Present' || r[campo] === 'Absent');
      return decididos.length
        ? arred(decididos.filter((r) => r[campo] === 'Present').length / decididos.length, 3)
        : null;
    };
    const medidasAqui = formasDeRo21.filter((f) => f.dKm >= faixa[0] && f.dKm < faixa[1]);
    ro21PorFaixa[nome] = {
      n: tabela.length,
      profundidadeD: quartisArred(
        tabela.filter((r) => r.profundidadeKm !== null).map((r) => r.profundidadeKm / r.dKm)
      ),
      bordaD: quartisArred(tabela.filter((r) => r.bordaKm !== null).map((r) => r.bordaKm / r.dKm)),
      fracaoComPico: fracaoPresente('pico'),
      fracaoFundoPlano: fracaoPresente('fundoPlano'),
      // as crateras de Ro21 desta faixa medidas no cache com o método daqui;
      // `razao...` = mediana, cratera a cratera, de (medido aqui) / (Ro21)
      noCache: {
        n: medidasAqui.length,
        profundidadeD: quartisArred(medidasAqui.map((f) => f.profundidadeD)),
        bordaD: quartisArred(medidasAqui.map((f) => f.bordaD)),
        razaoProfundidade: quartisArred(
          medidasAqui.map((f) => f.profundidadeD / (f.fonte.profundidadeKm / f.dKm))
        ),
        razaoBorda: quartisArred(
          medidasAqui
            .filter((f) => f.fonte.bordaKm > 0)
            .map((f) => f.bordaD / (f.fonte.bordaKm / f.dKm))
        ),
      },
    };
  }
  registra(`forma: ${formas.length} crateras empilhadas, ${formasDeRo21.length} de Ro21 medidas`);

  // ---- as crateras reais que caem no vazio
  const noVazio = [];
  const regiaoSemCompletude = [];
  let cortadas = 0;
  let abaixoDaCompletude = 0;
  for (const c of crateras) {
    if (c.confianca < 3) continue;
    const jc = Math.round(linhaDaLatitude(c.lat, altura));
    const ic = ((Math.round(colunaDaLongitude(c.lon, largura)) % largura) + largura) % largura;
    const centroNoVazio = jc < 0 || jc >= altura || vazio[jc * largura + ic] === 1;
    const completude = completudeDe(c, guia);
    const registro = {
      id: c.id,
      lat: arred(c.lat, 3),
      lon: arred(c.lon, 3),
      dKm: arred(c.dKm, 2),
      confianca: c.confianca,
      regiao: c.regiao,
    };
    if (centroNoVazio) {
      if (completude === null) regiaoSemCompletude.push(registro);
      else if (c.dKm >= completude) noVazio.push(registro);
      else abaixoDaCompletude += 1;
    } else if (completude !== null && c.dKm >= completude) {
      const base = baseLocal(c.lat, c.lon);
      for (let a = 0; a < 36; a += 1) {
        const [lat, lon] = destino(base, c.dKm / 2 / raioKm, (2 * Math.PI * a) / 36);
        const j = Math.min(altura - 1, Math.max(0, Math.round(linhaDaLatitude(lat * GRAUS, altura))));
        const i = ((Math.round(colunaDaLongitude(lon, largura)) % largura) + largura) % largura;
        if (vazio[j * largura + i]) {
          cortadas += 1;
          break;
        }
      }
    }
  }
  const resumoDaLista = (lista) => {
    const porRegiao = {};
    for (const c of lista) porRegiao[c.regiao] = (porRegiao[c.regiao] ?? 0) + 1;
    const ds = lista.map((c) => c.dKm);
    return {
      n: lista.length,
      dKm: lista.length ? [Math.min(...ds), Math.max(...ds)] : null,
      porRegiao,
    };
  };

  const medidas = {
    corpo: opcoes.corpo ?? null,
    criadoEm: opcoes.criadoEm ?? new Date().toISOString(),
    grade: { largura, altura, raioKm, texelKm },
    convencoes:
      'grade da casa (coluna 0 = 180°E, leste para a direita, linha 0 = +90°); km = corda 3D; ' +
      'médias pesadas por cos(lat); filtros com máscara; S em [km, m², pares]',
    unidades: medidasDasUnidades,
    global,
    morfometria: {
      dMinKm: arred(dMinForma, 2),
      criterio:
        'confiança ≥ 3, D ≥ 10 texels, centro recentrado no DEM pela simetria (até 0,25·D), ' +
        'todo anel até 2,5 R com ≥ 80 % de amostras válidas; perfil = média azimutal; ' +
        'nítida = q ≥ 0,5 em toda banda de λ ≤ D no centro',
      empilhadas: formas.length,
      bins,
      perfis,
      ro21: ro21PorFaixa,
    },
    crateraReaisNoVazio: {
      criterio:
        'centro no vazio; confiança ≥ 3; D ≥ a completude da região (guia v2) — a região sem ' +
        'completude declarada ("Remaining Surface") vai à parte',
      ...resumoDaLista(noVazio),
      abaixoDaCompletude,
      cortadasPelaBorda: cortadas,
      regiaoSemCompletude: { ...resumoDaLista(regiaoSemCompletude), lista: regiaoSemCompletude },
      lista: noVazio,
    },
    qualidade: {
      oitavas: sigmas.map((s) => arred(s, 3)),
      bandas: descricaoDasBandas,
      referencia: 'mediana, entre as caixas-exemplo, da energia da mesma banda',
      limiarDeBorrado: LIMIAR_DE_BORRADO,
      resumo: resumoDasBandas,
      setores,
    },
  };
  return {
    medidas,
    qualidade: {
      largura: L,
      altura: A,
      fator,
      planos,
      nomesDosPlanos: [
        ...descricaoDasBandas.map((d) => `q${d.banda}`),
        'bandasBorradas',
        'fracaoMedida',
        'distanciaAoVazioKm',
      ],
      // a altura média de cada bloco (NaN sem dado): só para a prancha de conferência
      alturaReduzida: reduzidoDoVazio.valor,
    },
  };
}
