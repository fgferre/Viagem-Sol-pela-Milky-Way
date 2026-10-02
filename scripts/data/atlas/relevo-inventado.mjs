// ============================================================
// O RELEVO INVENTADO DE PLUTÃO E CARONTE — as MEDIDAS do lado medido
// (PLAN-RELEVO.md, etapa E2b, 01/10/2026) e, no fim do arquivo, a COSTURA
// (E3, item 1). O resto da síntese (E3) entra depois neste mesmo módulo: o
// que se mede aqui é a régua dela.
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

// ============================================================
// A COSTURA (E3, item 1): a simulação condicional, oitava por oitava
// ============================================================

/** Pepita da krigagem, em fração de C(0): a diagonal é C(0)·(1 + pepita). */
const PEPITA = 1e-4;

/** O alcance da covariância nunca passa de tantos σ da oitava. */
const ALCANCE_MAXIMO_EM_SIGMAS = 4;

/** Lado (células do nível da oitava) do bloco cujos alvos dividem uma fatoração. */
const LADO_DO_BLOCO = 8;

/** Na cascata, a sobra estendida ao vazio pesa min(1, peso do filtro / isto). */
const PESO_CHEIO_DA_EXTENSAO = 0.3;

/** A oitava de σ acima desta fração do raio não é simulada nem krigada: o vazio dela é a membrana. */
const FRACAO_DO_RAIO_DA_MEMBRANA = 1 / 5;

/** Passadas de Gauss–Seidel simétrico da membrana em cada nível abaixo do resolvido exato. */
const PASSADAS_DA_MEMBRANA = 8;

/** Os pesos (−1, 9, 9, −1)/16 da cúbica que lê o resíduo no centro de uma célula. */
const PESOS_DO_CENTRO = [-1 / 16, 9 / 16, 9 / 16, -1 / 16];

/** O polo da spline B cúbica (o filtro recursivo que tira os coeficientes). */
const POLO_DA_SPLINE = Math.sqrt(3) - 2;

// ------------------------------------------------------------
// O ruído de cada oitava
// ------------------------------------------------------------

/** mulberry32 — o mesmo gerador de `geradorDeSemente` (esculpido.ts). */
function geradorDeSemente(semente) {
  let a = semente >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A semente da oitava `k`: a do corpo misturada com k (um ruído independente por oitava). */
function sementeDaOitava(semente, k) {
  let h = (semente ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

function hashDoCanto(a, b, c, s) {
  let h = Math.imul(a, 0x8da6b343) ^ Math.imul(b, 0xd8163841) ^ Math.imul(c, 0xcb1ab31f) ^ s;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

const suavizaQuintica = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * O RUÍDO DE GRADIENTE 3D (Perlin, suavização quíntica) da `semente` no centro
 * de cada texel da grade: 256 gradientes unitários sorteados (cada canto da
 * rede escolhe o seu por hash), a rede girada ao acaso (quatérnio uniforme de
 * Shoemake) e deslocada, com passo `passoKm` na esfera de raio `raioM`. Vive
 * no espaço 3D: não tem costura na longitude nem singularidade no polo.
 */
function ruidoNaGrade(semente, largura, altura, raioM, passoKm) {
  const sorteia = geradorDeSemente(semente);
  const gx = new Float64Array(256);
  const gy = new Float64Array(256);
  const gz = new Float64Array(256);
  for (let q = 0; q < 256; q += 1) {
    const z = 2 * sorteia() - 1;
    const f = 2 * Math.PI * sorteia();
    const r = Math.sqrt(1 - z * z);
    gx[q] = r * Math.cos(f);
    gy[q] = r * Math.sin(f);
    gz[q] = z;
  }
  const s = Math.floor(sorteia() * 4294967296) >>> 0;
  const u1 = sorteia();
  const u2 = sorteia();
  const u3 = sorteia();
  const qa = Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2);
  const qb = Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2);
  const qc = Math.sqrt(u1) * Math.sin(2 * Math.PI * u3);
  const qd = Math.sqrt(u1) * Math.cos(2 * Math.PI * u3);
  const giro = [
    1 - 2 * (qb * qb + qc * qc), 2 * (qa * qb - qc * qd), 2 * (qa * qc + qb * qd),
    2 * (qa * qb + qc * qd), 1 - 2 * (qa * qa + qc * qc), 2 * (qb * qc - qa * qd),
    2 * (qa * qc - qb * qd), 2 * (qb * qc + qa * qd), 1 - 2 * (qa * qa + qb * qb),
  ];
  const dx0 = sorteia() * 1000;
  const dy0 = sorteia() * 1000;
  const dz0 = sorteia() * 1000;
  const escala = raioM / 1000 / passoKm;
  const canto = (ix, iy, iz, dx, dy, dz) => {
    const q = hashDoCanto(ix, iy, iz, s) & 255;
    return gx[q] * dx + gy[q] * dy + gz[q] * dz;
  };
  const cosLon = new Float64Array(largura);
  const sinLon = new Float64Array(largura);
  for (let i = 0; i < largura; i += 1) {
    const lon = longitudeDaColuna(i, largura) * RADIANOS;
    cosLon[i] = Math.cos(lon);
    sinLon[i] = Math.sin(lon);
  }
  const saida = new Float32Array(largura * altura);
  for (let j = 0; j < altura; j += 1) {
    const lat = latitudeDaLinha(j, altura);
    const c = Math.cos(lat);
    const pz = Math.sin(lat);
    for (let i = 0; i < largura; i += 1) {
      const px = c * cosLon[i];
      const py = c * sinLon[i];
      const X = (giro[0] * px + giro[1] * py + giro[2] * pz) * escala + dx0;
      const Y = (giro[3] * px + giro[4] * py + giro[5] * pz) * escala + dy0;
      const Z = (giro[6] * px + giro[7] * py + giro[8] * pz) * escala + dz0;
      const xi = Math.floor(X);
      const yi = Math.floor(Y);
      const zi = Math.floor(Z);
      const xf = X - xi;
      const yf = Y - yi;
      const zf = Z - zi;
      const u = suavizaQuintica(xf);
      const v = suavizaQuintica(yf);
      const w = suavizaQuintica(zf);
      const a000 = canto(xi, yi, zi, xf, yf, zf);
      const a100 = canto(xi + 1, yi, zi, xf - 1, yf, zf);
      const a010 = canto(xi, yi + 1, zi, xf, yf - 1, zf);
      const a110 = canto(xi + 1, yi + 1, zi, xf - 1, yf - 1, zf);
      const a001 = canto(xi, yi, zi + 1, xf, yf, zf - 1);
      const a101 = canto(xi + 1, yi, zi + 1, xf - 1, yf, zf - 1);
      const a011 = canto(xi, yi + 1, zi + 1, xf, yf - 1, zf - 1);
      const a111 = canto(xi + 1, yi + 1, zi + 1, xf - 1, yf - 1, zf - 1);
      const x00 = a000 + u * (a100 - a000);
      const x10 = a010 + u * (a110 - a010);
      const x01 = a001 + u * (a101 - a001);
      const x11 = a011 + u * (a111 - a011);
      const y0 = x00 + v * (x10 - x00);
      const y1 = x01 + v * (x11 - x01);
      saida[j * largura + i] = y0 + w * (y1 - y0);
    }
  }
  return saida;
}

/**
 * O NÍVEL DA PIRÂMIDE de uma oitava de desvio `sigmaKm`: o fator 2^nível em
 * que σ vale ~2 células (h = σ/2), mas com pelo menos 8 linhas e a largura
 * ainda par no nível.
 */
function nivelDaOitava(sigmaKm, largura, altura, raioM) {
  const texelKm = (raioM / 1000) * (Math.PI / altura);
  let nivel = Math.max(0, Math.floor(Math.log2(sigmaKm / (2 * texelKm)) + 1e-9));
  while (nivel > 0 && ((altura >> nivel) < 8 || largura % 2 ** (nivel + 1) || altura % 2 ** nivel)) {
    nivel -= 1;
  }
  return nivel;
}

/**
 * O RUÍDO DA OITAVA `k`, média 0 e variância 1 (pesadas por cos lat): o ruído
 * de gradiente de passo 2σₖ (a `semente` misturada com k) passado pela MESMA
 * banda k de `decompoeEmOitavas` — h − G(σ₀) na primeira, G(σₖ₋₁) − G(σₖ) no
 * meio, e na última (k = `sigmasKm.length`, passo 4σ) o resíduo G(σ último).
 * A banda é tirada no nível da pirâmide em que σₖ₋₁ vale ~2 células — ali ela
 * já está inteira — e volta à resolução cheia por spline B cúbica: a oitava
 * grossa não paga duas gaussianas de 8 M texels.
 */
export function ruidoDaOitava(semente, k, sigmasKm, largura, altura, raioM) {
  const ultima = sigmasKm.length;
  const sigma = k < ultima ? sigmasKm[k] : 2 * sigmasKm[ultima - 1];
  const nivel = k === 0 ? 0 : nivelDaOitava(sigmasKm[k - 1], largura, altura, raioM);
  const L = largura >> nivel;
  const A = altura >> nivel;
  const bruto = ruidoNaGrade(sementeDaOitava(semente, k), L, A, raioM, 2 * sigma);
  const um = new Uint8Array(L * A).fill(1);
  const media = (s) => desfocaComMascara(bruto, um, L, A, raioM, s).valor;
  const banda = k === 0 ? bruto : media(sigmasKm[k - 1]);
  if (k < ultima) {
    const baixo = media(sigmasKm[k]);
    for (let q = 0; q < L * A; q += 1) banda[q] -= baixo[q];
  }
  const campo =
    nivel === 0
      ? banda
      : avaliaSpline(coeficientesDeSpline(banda, L, A), L, A, nivel, largura, altura, new Float32Array(largura * altura));
  let soma = 0;
  let soma2 = 0;
  let peso = 0;
  for (let j = 0; j < altura; j += 1) {
    const cosLat = Math.cos(latitudeDaLinha(j, altura));
    let s1 = 0;
    let s2 = 0;
    for (let i = 0; i < largura; i += 1) {
      const v = campo[j * largura + i];
      s1 += v;
      s2 += v * v;
    }
    soma += cosLat * s1;
    soma2 += cosLat * s2;
    peso += cosLat * largura;
  }
  const m = soma / peso;
  const desvio = Math.sqrt(soma2 / peso - m * m);
  for (let q = 0; q < largura * altura; q += 1) campo[q] = (campo[q] - m) / desvio;
  return campo;
}

// ------------------------------------------------------------
// A covariância de cada oitava
// ------------------------------------------------------------

/** Cholesky no lugar (triângulo de baixo de `K`, N×N em linhas); false se não é positiva. */
function cholesky(K, N) {
  for (let a = 0; a < N; a += 1) {
    const la = a * N;
    for (let b = 0; b <= a; b += 1) {
      const lb = b * N;
      let s = K[la + b];
      for (let q = 0; q < b; q += 1) s -= K[la + q] * K[lb + q];
      if (a === b) {
        if (!(s > 0)) return false;
        K[la + a] = Math.sqrt(s);
      } else K[la + b] = s / K[lb + b];
    }
  }
  return true;
}

/** Resolve L·Lᵀ·x = b no lugar de `b`, com o fator de `cholesky`. */
function resolveCholesky(L, N, b) {
  for (let a = 0; a < N; a += 1) {
    let s = b[a];
    for (let q = 0; q < a; q += 1) s -= L[a * N + q] * b[q];
    b[a] = s / L[a * N + a];
  }
  for (let a = N - 1; a >= 0; a -= 1) {
    let s = b[a];
    for (let q = a + 1; q < N; q += 1) s -= L[q * N + a] * b[q];
    b[a] = s / L[a * N + a];
  }
}

/** Mínimos quadrados NÃO NEGATIVOS (Lawson–Hanson): min ‖A·x − b‖, x ≥ 0; `A` m×p em linhas. */
function minimosQuadradosNaoNegativos(A, b, m, p) {
  const x = new Float64Array(p);
  const passivo = new Uint8Array(p);
  const w = new Float64Array(p);
  const res = new Float64Array(m);
  const tolerancia = 1e-12;
  const gradiente = () => {
    for (let i = 0; i < m; i += 1) {
      let s = b[i];
      for (let j = 0; j < p; j += 1) s -= A[i * p + j] * x[j];
      res[i] = s;
    }
    for (let j = 0; j < p; j += 1) {
      let s = 0;
      for (let i = 0; i < m; i += 1) s += A[i * p + j] * res[i];
      w[j] = s;
    }
  };
  // a solução sem restrição nas colunas passivas (equações normais)
  const resolvePassivas = () => {
    const idx = [];
    for (let j = 0; j < p; j += 1) if (passivo[j]) idx.push(j);
    const q = idx.length;
    const M = new Float64Array(q * q);
    const v = new Float64Array(q);
    for (let a = 0; a < q; a += 1) {
      for (let c = 0; c <= a; c += 1) {
        let s = 0;
        for (let i = 0; i < m; i += 1) s += A[i * p + idx[a]] * A[i * p + idx[c]];
        M[a * q + c] = s;
      }
      let s = 0;
      for (let i = 0; i < m; i += 1) s += A[i * p + idx[a]] * b[i];
      v[a] = s;
      M[a * q + a] *= 1 + 1e-12;
    }
    if (!cholesky(M, q)) return null;
    resolveCholesky(M, q, v);
    const z = new Float64Array(p);
    idx.forEach((j, a) => {
      z[j] = v[a];
    });
    return z;
  };
  for (let iter = 0; iter < 3 * p; iter += 1) {
    gradiente();
    let t = -1;
    let maior = tolerancia;
    for (let j = 0; j < p; j += 1) {
      if (!passivo[j] && w[j] > maior) {
        maior = w[j];
        t = j;
      }
    }
    if (t < 0) break;
    passivo[t] = 1;
    for (let interno = 0; interno < 3 * p; interno += 1) {
      const z = resolvePassivas();
      if (!z) {
        passivo[t] = 0;
        break;
      }
      let viavel = true;
      for (let j = 0; j < p; j += 1) if (passivo[j] && z[j] <= 0) viavel = false;
      if (viavel) {
        x.set(z);
        break;
      }
      let alfa = Infinity;
      for (let j = 0; j < p; j += 1) if (passivo[j] && z[j] <= 0) alfa = Math.min(alfa, x[j] / (x[j] - z[j]));
      for (let j = 0; j < p; j += 1) {
        x[j] += alfa * (z[j] - x[j]);
        if (passivo[j] && x[j] <= tolerancia) {
          passivo[j] = 0;
          x[j] = 0;
        }
      }
    }
  }
  return x;
}

/**
 * As BASES do ajuste da covariância em cada cos θ de `cossenos`: a constante
 * (P₀) e lombadas gaussianas em log₂ ℓ de um quarto de oitava (centros em
 * `centros`, cortadas a 4 desvios), cada uma Σ wℓ·Pℓ(cos θ) normalizada para
 * valer 1 em θ = 0. Devolve a matriz pontos × (1 + centros), em linhas.
 */
function basesDeLegendre(cossenos, lMax, centros) {
  const nc = centros.length;
  const nb = nc + 1;
  const peso = new Float64Array((lMax + 1) * nc);
  const primeira = new Int32Array(lMax + 1).fill(nc);
  const ultima = new Int32Array(lMax + 1).fill(-1);
  const norma = new Float64Array(nc);
  for (let j = 0; j < nc; j += 1) {
    for (let l = 1; l <= lMax; l += 1) {
      const u = (Math.log2(l + 0.5) - Math.log2(centros[j] + 0.5)) / 0.25;
      if (Math.abs(u) >= 4) continue;
      const w = Math.exp(-0.5 * u * u);
      peso[l * nc + j] = w;
      norma[j] += w;
      primeira[l] = Math.min(primeira[l], j);
      ultima[l] = Math.max(ultima[l], j);
    }
  }
  const saida = new Float64Array(cossenos.length * nb);
  const acc = new Float64Array(nc);
  for (let q = 0; q < cossenos.length; q += 1) {
    const x = cossenos[q];
    acc.fill(0);
    let p0 = 1;
    let p1 = x;
    for (let l = 1; l <= lMax; l += 1) {
      const pl = l === 1 ? p1 : ((2 * l - 1) * x * p1 - (l - 1) * p0) / l;
      if (l > 1) {
        p0 = p1;
        p1 = pl;
      }
      for (let j = primeira[l]; j <= ultima[l]; j += 1) acc[j] += peso[l * nc + j] * pl;
    }
    saida[q * nb] = 1;
    for (let j = 0; j < nc; j += 1) saida[q * nb + j + 1] = acc[j] / norma[j];
  }
  return saida;
}

/**
 * A COVARIÂNCIA DA OITAVA, ajustada a um campo sem máscara (a banda da
 * simulação): C(d) = c0 − S(d)/2 com S de `funcaoDeEstrutura` nos dois eixos
 * (lags de h/4, âncoras a cada h/2, h = a célula do nível da oitava). A tabela
 * empírica NÃO é positiva-definida (a krigagem quebra nela), então o modelo é
 * C(θ) = Σ bⱼ·Ψⱼ(θ) com bⱼ ≥ 0 nas bases de `basesDeLegendre` — positivo-
 * definido na esfera (Schoenberg) —, por mínimos quadrados não negativos
 * pesados por √pares. ALCANCE: o d depois do qual |C| < 2 % de c0 em todo
 * ponto, preso entre 2σ e 4σ (e o diâmetro); o ajuste vai até 2·alcance.
 * Devolve o modelo numa tabela uniforme em d² (km²) até a maior distância
 * entre dois vizinhos de um bloco de `condicionaOitava` (2·alcance + o
 * bloco): cortar o modelo antes disso tira a positividade, e o Cholesky do
 * bloco falha.
 */
export function covarianciaDaOitava(campo, largura, altura, raioM, sigmaKm) {
  const raioKm = raioM / 1000;
  const dLat = Math.PI / altura;
  const nivel = nivelDaOitava(sigmaKm, largura, altura, raioM);
  const h = 2 ** nivel;
  const alcanceMaximoKm = ALCANCE_MAXIMO_EM_SIGMAS * sigmaKm;
  const dMaximoKm = Math.min(2 * alcanceMaximoKm, 2 * raioKm * 0.999);
  const nMax = Math.min(altura - 1, Math.ceil((2 * Math.asin(dMaximoKm / (2 * raioKm))) / dLat) + 1);
  const passoDoLag = Math.max(1, h >> 2);
  const lags = [];
  for (let q = passoDoLag; q <= nMax; q += passoDoLag) lags.push(q);
  const passo = Math.max(1, h >> 1);
  const valido = new Uint8Array(largura * altura).fill(1);
  const { ns, ew } = funcaoDeEstrutura(campo, valido, largura, altura, raioM, {
    lags,
    passoLinhas: passo,
    passoColunas: passo,
    minimoDePares: 1,
  });
  let s1 = 0;
  let s2 = 0;
  let w = 0;
  for (let j = 0; j < altura; j += passo) {
    const cosLat = Math.cos(latitudeDaLinha(j, altura));
    for (let i = 0; i < largura; i += passo) {
      const v = campo[j * largura + i];
      s1 += cosLat * v;
      s2 += cosLat * v * v;
      w += cosLat;
    }
  }
  const c0 = s2 / w - (s1 / w) ** 2;
  const pontos = [[0, c0, Infinity], ...[...ns, ...ew].map(([km, S, pares]) => [km, c0 - S / 2, pares])];
  pontos.sort((a, b) => a[0] - b[0]);
  let alcanceKm = pontos[pontos.length - 1][0];
  for (let q = pontos.length - 1; q >= 0; q -= 1) {
    if (Math.abs(pontos[q][1]) > 0.02 * c0) {
      alcanceKm = pontos[Math.min(q + 1, pontos.length - 1)][0];
      break;
    }
  }
  alcanceKm = Math.min(Math.max(alcanceKm, 2 * sigmaKm), alcanceMaximoKm, 2 * raioKm);
  const dAjusteKm = Math.min(2 * alcanceKm, 2 * raioKm);
  const usados = pontos.filter(([d]) => d <= dAjusteKm * 1.02);
  const lMax = Math.min(altura / h, 4096);
  const centros = [];
  for (let e = 0; 2 ** (e / 4) <= lMax; e += 1) centros.push(2 ** (e / 4));
  const cosseno = (d) => Math.cos(2 * Math.asin(Math.min(1, d / (2 * raioKm))));
  const m = usados.length;
  const nb = centros.length + 1;
  const bases = basesDeLegendre(usados.map(([d]) => cosseno(d)), lMax, centros);
  const maxPares = Math.max(...usados.slice(1).map((u) => u[2]));
  const Ap = new Float64Array(m * nb);
  const bp = new Float64Array(m);
  for (let q = 0; q < m; q += 1) {
    const pq = q === 0 ? 3 : Math.sqrt(usados[q][2] / maxPares);
    for (let j = 0; j < nb; j += 1) Ap[q * nb + j] = pq * bases[q * nb + j];
    bp[q] = (pq * usados[q][1]) / c0;
  }
  const coef = minimosQuadradosNaoNegativos(Ap, bp, m, nb);
  const U = 16384;
  const celulaKm = h * raioKm * dLat;
  const dTabelaKm = Math.min(2 * raioKm, 2 * alcanceKm + 1.5 * LADO_DO_BLOCO * celulaKm);
  const d2Max = dTabelaKm * dTabelaKm;
  const cossenosDaTabela = [];
  for (let u = 0; u <= U + 1; u += 1) cossenosDaTabela.push(cosseno(Math.sqrt((u / U) * d2Max)));
  const basesDaTabela = basesDeLegendre(cossenosDaTabela, lMax, centros);
  const tabela = new Float64Array(U + 2);
  for (let u = 0; u <= U + 1; u += 1) {
    let v = 0;
    for (let j = 0; j < nb; j += 1) v += coef[j] * basesDaTabela[u * nb + j];
    tabela[u] = v * c0;
  }
  let erroMaximo = 0;
  for (let q = 0; q < m; q += 1) {
    let v = 0;
    for (let j = 0; j < nb; j += 1) v += coef[j] * bases[q * nb + j];
    erroMaximo = Math.max(erroMaximo, Math.abs(v - usados[q][1] / c0));
  }
  return { c0: tabela[0], alcanceKm, tabela, escala: U / d2Max, U, nivel, erroMaximo };
}

/**
 * C(d) da tabela de `covarianciaDaOitava`, com d² em km² (linear em d²).
 * PRESA na ponta, sem corte a zero: a grade tem cada texel E o antípoda dele,
 * e um zero exatamente em d = 2R (a ponta da tabela que cobre o corpo)
 * tirava a positividade do sistema global (autovalor −0,48·C(0) medido).
 */
function covDaTabela(cv, d2) {
  const x = Math.min(d2 * cv.escala, cv.U);
  const u = Math.floor(x);
  return cv.tabela[u] + (x - u) * (cv.tabela[u + 1] - cv.tabela[u]);
}

// ------------------------------------------------------------
// A spline B cúbica na grade (com a volta e os polos)
// ------------------------------------------------------------

/** Os coeficientes da spline B cúbica INTERPOLANTE num anel periódico de N amostras, no lugar. */
function prefiltraAnel(x, N, causal) {
  const z = POLO_DA_SPLINE;
  let soma = 0;
  let zk = 1;
  for (let k = 0; k < N; k += 1) {
    soma += zk * x[(N - k) % N];
    zk *= z;
  }
  const zN = zk;
  causal[0] = soma / (1 - zN);
  for (let k = 1; k < N; k += 1) causal[k] = x[k] + z * causal[k - 1];
  soma = 0;
  zk = 1;
  for (let k = 0; k < N; k += 1) {
    soma += zk * causal[(N - 1 + k) % N];
    zk *= z;
  }
  x[N - 1] = (-z * soma) / (1 - zN);
  for (let k = N - 2; k >= 0; k -= 1) x[k] = z * (x[k + 1] - causal[k]);
  for (let k = 0; k < N; k += 1) x[k] *= 6;
}

/**
 * Os coeficientes da spline B cúbica que INTERPOLA `campo` (grade L×A): cada
 * paralelo é um anel, e o meridiano I fecha com o I + L/2 num círculo máximo
 * de 2A amostras — a spline atravessa o polo sem borda.
 */
function coeficientesDeSpline(campo, L, A) {
  const c = Float64Array.from(campo);
  const anel = new Float64Array(Math.max(L, 2 * A));
  const causal = new Float64Array(Math.max(L, 2 * A));
  for (let J = 0; J < A; J += 1) {
    for (let I = 0; I < L; I += 1) anel[I] = c[J * L + I];
    prefiltraAnel(anel, L, causal);
    for (let I = 0; I < L; I += 1) c[J * L + I] = anel[I];
  }
  const meia = L / 2;
  for (let I = 0; I < meia; I += 1) {
    for (let t = 0; t < A; t += 1) {
      anel[t] = c[t * L + I];
      anel[2 * A - 1 - t] = c[t * L + I + meia];
    }
    prefiltraAnel(anel, 2 * A, causal);
    for (let t = 0; t < A; t += 1) {
      c[t * L + I] = anel[t];
      c[t * L + I + meia] = anel[2 * A - 1 - t];
    }
  }
  return c;
}

/** Os 4 pesos da spline B cúbica no deslocamento `t` ∈ [0, 1), a partir de `w[o]`. */
function pesosDaSpline(t, w, o) {
  const u = 1 - t;
  w[o] = (u * u * u) / 6;
  w[o + 1] = (3 * t * t * t - 6 * t * t + 4) / 6;
  w[o + 2] = (-3 * t * t * t + 3 * t * t + 3 * t + 1) / 6;
  w[o + 3] = (t * t * t) / 6;
}

/**
 * A CALOTA DO POLO, linha `j` a ângulo `r` do polo, raio `r0` (a 1ª linha da
 * grade grossa): a spline por índice leva até o polo, sem mudar, as ondas
 * PARES em longitude (m = 2, 4, …: a reflexão com meia volta é simétrica para
 * elas) — um "cata-vento" com inclinação infinita no ponto do polo. Aqui as
 * ondas m ≥ 2 da linha somem como (r/r0)² (smoothstep); m = 0 e m = 1, que a
 * reflexão já leva certo (constante e linear através do polo), ficam.
 */
function regularizaNoPolo(saida, linha, largura, r, r0, cosI, sinI) {
  let m0 = 0;
  let a1 = 0;
  let b1 = 0;
  for (let i = 0; i < largura; i += 1) {
    const v = saida[linha + i];
    m0 += v;
    a1 += v * cosI[i];
    b1 += v * sinI[i];
  }
  m0 /= largura;
  a1 *= 2 / largura;
  b1 *= 2 / largura;
  const t = r / r0;
  const peso = t * t * (3 - 2 * t);
  for (let i = 0; i < largura; i += 1) {
    const baixas = m0 + a1 * cosI[i] + b1 * sinI[i];
    saida[linha + i] = baixas + peso * (saida[linha + i] - baixas);
  }
}

/**
 * A spline de coeficientes `c` (grade Lc×Ac do nível `nivel`) avaliada no
 * centro de cada texel da grade `largura`×`altura` (o nível abaixo dela por
 * 2^nível), em `saida`. Linha além do polo = a refletida, meia volta adiante;
 * nas linhas mais perto do polo que a 1ª linha grossa, `regularizaNoPolo`.
 */
function avaliaSpline(c, Lc, Ac, nivel, largura, altura, saida) {
  const s = 2 ** nivel;
  const meia = Lc / 2;
  const w = new Float64Array(4 * s);
  for (let r = 0; r < s; r += 1) {
    const x = (r + 0.5) / s - 0.5;
    pesosDaSpline(x - Math.floor(x), w, 4 * r);
  }
  const colunas = new Int32Array(4 * largura);
  const colunasDaMeiaVolta = new Int32Array(4 * largura);
  for (let i = 0; i < largura; i += 1) {
    const I0 = Math.floor((i + 0.5) / s - 0.5);
    for (let b = 0; b < 4; b += 1) {
      const I = I0 - 1 + b;
      colunas[4 * i + b] = ((I % Lc) + Lc) % Lc;
      colunasDaMeiaVolta[4 * i + b] = (((I + meia) % Lc) + Lc) % Lc;
    }
  }
  const base = new Int32Array(4);
  const viraMeia = new Uint8Array(4);
  for (let j = 0; j < altura; j += 1) {
    const J0 = Math.floor((j + 0.5) / s - 0.5);
    const oy = 4 * (j % s);
    for (let a = 0; a < 4; a += 1) {
      let J = J0 - 1 + a;
      viraMeia[a] = 0;
      if (J < 0) {
        J = -1 - J;
        viraMeia[a] = 1;
      } else if (J >= Ac) {
        J = 2 * Ac - 1 - J;
        viraMeia[a] = 1;
      }
      base[a] = J * Lc;
    }
    const linha = j * largura;
    for (let i = 0; i < largura; i += 1) {
      const ox = 4 * (i % s);
      const o = 4 * i;
      let v = 0;
      for (let a = 0; a < 4; a += 1) {
        const cols = viraMeia[a] ? colunasDaMeiaVolta : colunas;
        const b0 = base[a];
        v +=
          w[oy + a] *
          (w[ox] * c[b0 + cols[o]] +
            w[ox + 1] * c[b0 + cols[o + 1]] +
            w[ox + 2] * c[b0 + cols[o + 2]] +
            w[ox + 3] * c[b0 + cols[o + 3]]);
      }
      saida[linha + i] = v;
    }
  }
  if (s > 1) {
    const cosI = new Float64Array(largura);
    const sinI = new Float64Array(largura);
    for (let i = 0; i < largura; i += 1) {
      cosI[i] = Math.cos((2 * Math.PI * (i + 0.5)) / largura);
      sinI[i] = Math.sin((2 * Math.PI * (i + 0.5)) / largura);
    }
    const r0 = (0.5 * Math.PI) / Ac;
    for (let j = 0; j < s / 2; j += 1) {
      const r = ((j + 0.5) * Math.PI) / altura;
      regularizaNoPolo(saida, j * largura, largura, r, r0, cosI, sinI);
      regularizaNoPolo(saida, (altura - 1 - j) * largura, largura, r, r0, cosI, sinI);
    }
  }
  return saida;
}

// ------------------------------------------------------------
// A krigagem do resíduo no nível da oitava
// ------------------------------------------------------------

/**
 * Os NÓS DE DADO do nível `nivel` (grade largura/2^nível × altura/2^nível) e o
 * resíduo neles: nó D é a célula cujo estêncil 4×4 de texels em volta do
 * centro é TODO dado, e o valor é a cúbica (−1, 9, 9, −1)/16 do `residuo` ali
 * (o resíduo no centro da célula). No nível 0, D = o dado e o valor = o resíduo.
 */
function residuoNoNivel(residuo, dado, largura, altura, nivel) {
  if (nivel === 0) return { ehD: dado, valor: residuo };
  const s = 2 ** nivel;
  const L = largura >> nivel;
  const A = altura >> nivel;
  const ehD = new Uint8Array(L * A);
  const valor = new Float64Array(L * A);
  const linhas = new Int32Array(4);
  const meiaVolta = new Int32Array(4);
  for (let J = 0; J < A; J += 1) {
    const j0 = J * s + s / 2 - 1;
    for (let a = 0; a < 4; a += 1) {
      let j = j0 - 1 + a;
      meiaVolta[a] = 0;
      if (j < 0) {
        j = -1 - j;
        meiaVolta[a] = largura / 2;
      } else if (j >= altura) {
        j = 2 * altura - 1 - j;
        meiaVolta[a] = largura / 2;
      }
      linhas[a] = j * largura;
    }
    for (let I = 0; I < L; I += 1) {
      const i0 = I * s + s / 2 - 1;
      let todo = true;
      let v = 0;
      for (let a = 0; a < 4 && todo; a += 1) {
        for (let b = 0; b < 4; b += 1) {
          const k = linhas[a] + ((i0 - 1 + b + meiaVolta[a] + largura) % largura);
          if (!dado[k]) {
            todo = false;
            break;
          }
          v += PESOS_DO_CENTRO[a] * PESOS_DO_CENTRO[b] * residuo[k];
        }
      }
      if (todo) {
        ehD[J * L + I] = 1;
        valor[J * L + I] = v;
      }
    }
  }
  return { ehD, valor };
}

/**
 * CONDICIONA A OITAVA no nível dela: a krigagem SIMPLES do resíduo T − S
 * (`medida` − `simulada`, só onde `dadoK`) na grade do nível da oitava
 * (`nivelDaOitava`). Nó D (estêncil todo dado) = o resíduo no centro da
 * célula; nó sem dado a até um alcance de algum dado = a estimativa; o resto
 * = 0. A cascata de `costura` leva isto à resolução cheia.
 *
 * O dado entra como UM texel por célula (o texel de dado mais perto do centro;
 * perto do polo, a célula junta colunas até ter ~a largura de uma linha). Os
 * alvos vão em BLOCOS de `LADO_DO_BLOCO`² células: a vizinhança do bloco é a
 * união das dos alvos (todo dado a até um alcance de algum deles), fatorada
 * UMA vez, e a krigagem é a dual — α = (K + pepita)⁻¹·r, estimativa = Σ α·C.
 * Quando o alcance cobre o corpo, um sistema só com todo o dado.
 * `covariancia` (de `covarianciaDaOitava`) é ajustada à `simulada` se faltar.
 */
export function condicionaOitava({ simulada, medida, dadoK, largura, altura, raioM, sigmaKm, covariancia }) {
  const n = largura * altura;
  const cv = covariancia ?? covarianciaDaOitava(simulada, largura, altura, raioM, sigmaKm);
  const nivel = nivelDaOitava(sigmaKm, largura, altura, raioM);
  const Lc = largura >> nivel;
  const Ac = altura >> nivel;
  const raioKm = raioM / 1000;
  const r2 = raioKm * raioKm;

  const residuo = new Float32Array(n);
  for (let k = 0; k < n; k += 1) if (dadoK[k]) residuo[k] = medida[k] - simulada[k];
  const { ehD, valor } = residuoNoNivel(residuo, dadoK, largura, altura, nivel);
  const grosso = new Float64Array(Lc * Ac);
  for (let c = 0; c < Lc * Ac; c += 1) if (ehD[c]) grosso[c] = valor[c];

  // a geometria: vetores unitários por linha e coluna, fina e do nível
  const cosLatF = new Float64Array(altura);
  const sinLatF = new Float64Array(altura);
  for (let j = 0; j < altura; j += 1) {
    const f = latitudeDaLinha(j, altura);
    cosLatF[j] = Math.cos(f);
    sinLatF[j] = Math.sin(f);
  }
  const cosLonF = new Float64Array(largura);
  const sinLonF = new Float64Array(largura);
  for (let i = 0; i < largura; i += 1) {
    const l = longitudeDaColuna(i, largura) * RADIANOS;
    cosLonF[i] = Math.cos(l);
    sinLonF[i] = Math.sin(l);
  }
  const cosLatC = new Float64Array(Ac);
  const sinLatC = new Float64Array(Ac);
  for (let J = 0; J < Ac; J += 1) {
    const f = latitudeDaLinha(J, Ac);
    cosLatC[J] = Math.cos(f);
    sinLatC[J] = Math.sin(f);
  }
  const cosLonC = new Float64Array(Lc);
  const sinLonC = new Float64Array(Lc);
  for (let I = 0; I < Lc; I += 1) {
    const l = longitudeDaColuna(I, Lc) * RADIANOS;
    cosLonC[I] = Math.cos(l);
    sinLonC[I] = Math.sin(l);
  }

  // as SUPER-CÉLULAS: 2^e colunas juntas onde o paralelo encolhe
  let maiorPotencia = 1;
  while (Lc % (maiorPotencia * 2) === 0 && maiorPotencia * 2 <= Lc) maiorPotencia *= 2;
  const expoente = new Int32Array(Ac);
  const inicioDaLinha = new Int32Array(Ac + 1);
  for (let J = 0; J < Ac; J += 1) {
    let e = 0;
    while (2 ** (e + 1) <= maiorPotencia && 2 ** (e + 1) * cosLatC[J] <= 1) e += 1;
    expoente[J] = e;
    inicioDaLinha[J + 1] = inicioDaLinha[J] + (Lc >> e);
  }
  const nSuper = inicioDaLinha[Ac];
  const lonDoCentro = [];
  for (let e = 0; 2 ** e <= maiorPotencia; e += 1) {
    const m = 2 ** e;
    const cos = new Float64Array(Lc / m);
    const sin = new Float64Array(Lc / m);
    for (let q = 0; q < Lc / m; q += 1) {
      const l = longitudeDaColuna(q * m + (m - 1) / 2, Lc) * RADIANOS;
      cos[q] = Math.cos(l);
      sin[q] = Math.sin(l);
    }
    lonDoCentro.push({ cos, sin });
  }

  // o REPRESENTANTE de cada super-célula: o texel de dado mais perto do centro
  const melhorTexel = new Int32Array(nSuper).fill(-1);
  const melhorCosseno = new Float64Array(nSuper).fill(-Infinity);
  for (let j = 0; j < altura; j += 1) {
    const J = j >> nivel;
    const e = expoente[J];
    const { cos, sin } = lonDoCentro[e];
    const cc = cosLatF[j] * cosLatC[J];
    const ss = sinLatF[j] * sinLatC[J];
    const base = j * largura;
    for (let i = 0; i < largura; i += 1) {
      if (!dadoK[base + i]) continue;
      const q = (i >> nivel) >> e;
      const id = inicioDaLinha[J] + q;
      const cosseno = cc * (cosLonF[i] * cos[q] + sinLonF[i] * sin[q]) + ss;
      if (cosseno > melhorCosseno[id]) {
        melhorCosseno[id] = cosseno;
        melhorTexel[id] = base + i;
      }
    }
  }
  const repDaSuper = new Int32Array(nSuper).fill(-1);
  let nRep = 0;
  for (let id = 0; id < nSuper; id += 1) if (melhorTexel[id] >= 0) repDaSuper[id] = nRep++;
  const rx = new Float64Array(nRep);
  const ry = new Float64Array(nRep);
  const rz = new Float64Array(nRep);
  const rv = new Float64Array(nRep);
  for (let id = 0; id < nSuper; id += 1) {
    const p = repDaSuper[id];
    if (p < 0) continue;
    const k = melhorTexel[id];
    const j = Math.floor(k / largura);
    const i = k - j * largura;
    rx[p] = cosLatF[j] * cosLonF[i];
    ry[p] = cosLatF[j] * sinLonF[i];
    rz[p] = sinLatF[j];
    rv[p] = residuo[k];
  }

  // a krigagem de um bloco: os alvos dividem a vizinhança e a fatoração
  const alcanceKm = cv.alcanceKm;
  const alcanceAng = 2 * Math.asin(Math.min(1, alcanceKm / (2 * raioKm)));
  const cosAlcance = Math.cos(alcanceAng);
  let K = new Float64Array(0);
  let alfa = new Float64Array(0);
  let vizinhos = new Int32Array(1024);
  const info = { nivel, Lc, Ac, alcanceKm, alvos: 0, blocos: 0, vizMedia: 0, vizMax: 0, falhas: 0, pepitaMax: PEPITA };
  const krigaBloco = (alvos, nAlvos, N) => {
    if (K.length < N * N) {
      K = new Float64Array(N * N);
      alfa = new Float64Array(N);
    }
    let pepita = PEPITA;
    let ok = false;
    while (!ok && pepita < 1) {
      for (let a = 0; a < N; a += 1) {
        const ia = vizinhos[a];
        for (let b = 0; b < a; b += 1) {
          const ib = vizinhos[b];
          const dx = rx[ia] - rx[ib];
          const dy = ry[ia] - ry[ib];
          const dz = rz[ia] - rz[ib];
          K[a * N + b] = covDaTabela(cv, (dx * dx + dy * dy + dz * dz) * r2);
        }
        K[a * N + a] = cv.c0 * (1 + pepita);
      }
      ok = cholesky(K, N);
      if (!ok) {
        pepita *= 10;
        info.falhas += 1;
      }
    }
    info.pepitaMax = Math.max(info.pepitaMax, pepita);
    if (!ok) return;
    for (let a = 0; a < N; a += 1) alfa[a] = rv[vizinhos[a]];
    resolveCholesky(K, N, alfa);
    for (let t = 0; t < nAlvos; t += 1) {
      const c = alvos[t];
      const J = Math.floor(c / Lc);
      const I = c - J * Lc;
      const px = cosLatC[J] * cosLonC[I];
      const py = cosLatC[J] * sinLonC[I];
      const pz = sinLatC[J];
      let estimativa = 0;
      for (let a = 0; a < N; a += 1) {
        const ia = vizinhos[a];
        const dx = px - rx[ia];
        const dy = py - ry[ia];
        const dz = pz - rz[ia];
        estimativa += alfa[a] * covDaTabela(cv, (dx * dx + dy * dy + dz * dz) * r2);
      }
      grosso[c] = estimativa;
    }
    info.alvos += nAlvos;
    info.blocos += 1;
    info.vizMedia += N;
    info.vizMax = Math.max(info.vizMax, N);
  };

  if (nRep && alcanceKm >= 2 * raioKm * 0.999) {
    // o alcance cobre o corpo: um sistema só
    const alvos = [];
    for (let c = 0; c < Lc * Ac; c += 1) if (!ehD[c]) alvos.push(c);
    vizinhos = new Int32Array(nRep);
    for (let p = 0; p < nRep; p += 1) vizinhos[p] = p;
    if (alvos.length) krigaBloco(alvos, alvos.length, nRep);
  } else if (nRep) {
    const dLatC = Math.PI / Ac;
    const dLonC = (2 * Math.PI) / Lc;
    const linhasDoAlcance = Math.ceil(alcanceAng / dLatC) + 2;
    const B = LADO_DO_BLOCO;
    const alvos = new Int32Array(B * B);
    const ax = new Float64Array(B * B);
    const ay = new Float64Array(B * B);
    const az = new Float64Array(B * B);
    for (let J0 = 0; J0 < Ac; J0 += B) {
      const J1 = Math.min(Ac, J0 + B);
      for (let I0 = 0; I0 < Lc; I0 += B) {
        const I1 = Math.min(Lc, I0 + B);
        let nAlvos = 0;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        for (let J = J0; J < J1; J += 1) {
          for (let I = I0; I < I1; I += 1) {
            const c = J * Lc + I;
            if (ehD[c]) continue;
            alvos[nAlvos] = c;
            ax[nAlvos] = cosLatC[J] * cosLonC[I];
            ay[nAlvos] = cosLatC[J] * sinLonC[I];
            az[nAlvos] = sinLatC[J];
            sx += ax[nAlvos];
            sy += ay[nAlvos];
            sz += az[nAlvos];
            nAlvos += 1;
          }
        }
        if (!nAlvos) continue;
        // o centro do bloco e o raio que cobre os alvos; a busca vai ao alcance
        // além dele, mais uma célula (o representante não fica no centro)
        const norma = Math.hypot(sx, sy, sz);
        const ox = sx / norma;
        const oy = sy / norma;
        const oz = sz / norma;
        let cosRaio = 1;
        for (let t = 0; t < nAlvos; t += 1) cosRaio = Math.min(cosRaio, ax[t] * ox + ay[t] * oy + az[t] * oz);
        const busca = alcanceAng + Math.acos(Math.max(-1, cosRaio)) + dLatC;
        const cosBusca = busca >= Math.PI ? -1 : Math.cos(busca);
        const latO = Math.asin(Math.max(-1, Math.min(1, oz)));
        const colunaO = (Math.floor(colunaDaLongitude(Math.atan2(oy, ox) * GRAUS, Lc) + 0.5) + Lc) % Lc;
        let N = 0;
        const Jlo = Math.max(0, J0 - linhasDoAlcance);
        const Jhi = Math.min(Ac - 1, J1 - 1 + linhasDoAlcance);
        for (let Jq = Jlo; Jq <= Jhi; Jq += 1) {
          const e = expoente[Jq];
          const nq = Lc >> e;
          const den = Math.cos(latO) * cosLatC[Jq];
          let meiaJanela = nq;
          if (den > 1e-12 && busca < Math.PI) {
            const cosMin = (Math.cos(busca) - Math.sin(latO) * sinLatC[Jq]) / den;
            if (cosMin > 1) continue;
            if (cosMin > -1) meiaJanela = Math.ceil(Math.acos(cosMin) / (dLonC * 2 ** e)) + 1;
          }
          const total = Math.min(nq, 2 * meiaJanela + 1);
          const q0 = total === nq ? 0 : (colunaO >> e) - meiaJanela;
          for (let t = 0; t < total; t += 1) {
            const p = repDaSuper[inicioDaLinha[Jq] + ((((q0 + t) % nq) + nq) % nq)];
            if (p < 0) continue;
            const x = rx[p];
            const y = ry[p];
            const z = rz[p];
            if (x * ox + y * oy + z * oz < cosBusca) continue;
            let perto = false;
            for (let a = 0; a < nAlvos && !perto; a += 1) perto = x * ax[a] + y * ay[a] + z * az[a] >= cosAlcance;
            if (!perto) continue;
            if (N === vizinhos.length) {
              const maior = new Int32Array(2 * N);
              maior.set(vizinhos);
              vizinhos = maior;
            }
            vizinhos[N] = p;
            N += 1;
          }
        }
        if (N) krigaBloco(alvos, nAlvos, N);
      }
    }
  }
  info.vizMedia = info.blocos ? info.vizMedia / info.blocos : 0;
  return { nivel, grosso, info };
}

// ------------------------------------------------------------
// A cascata e a costura
// ------------------------------------------------------------

/**
 * UM DEGRAU DA CASCATA: o campo do nível `nivel` + 1 vai ao `nivel` pela
 * spline B cúbica; nos nós D o resíduo medido é REIMPOSTO, e a sobra (resíduo
 * − spline) é estendida ao vazio pelo desfoque com máscara de UMA célula,
 * pesada por min(1, peso/0,3) — some a poucas células da emenda.
 */
function desceUmNivel(acima, residuo, dado, nivel, largura, altura, raioM) {
  const La = largura >> (nivel + 1);
  const Aa = altura >> (nivel + 1);
  const L = largura >> nivel;
  const A = altura >> nivel;
  const campo = nivel === 0 ? new Float32Array(L * A) : new Float64Array(L * A);
  avaliaSpline(coeficientesDeSpline(acima, La, Aa), La, Aa, 1, L, A, campo);
  const { ehD, valor } = residuoNoNivel(residuo, dado, largura, altura, nivel);
  const sobra = new Float32Array(L * A);
  for (let c = 0; c < L * A; c += 1) if (ehD[c]) sobra[c] = valor[c] - campo[c];
  const celulaKm = (raioM / 1000) * (Math.PI / A);
  const { valor: estendida, peso } = desfocaComMascara(sobra, ehD, L, A, raioM, celulaKm);
  for (let c = 0; c < L * A; c += 1) {
    if (ehD[c]) campo[c] = valor[c];
    else if (Number.isFinite(estendida[c])) {
      campo[c] += estendida[c] * Math.min(1, peso[c] / PESO_CHEIO_DA_EXTENSAO);
    }
  }
  return campo;
}

/**
 * A CASCATA das oitavas que dividem a máscara `dado`: `entradas` = [{ nivel,
 * grosso, medida, simulada }]. Desce do nível mais grosso ao 0; cada oitava
 * entra no nível dela (o campo de `condicionaOitava` é somado, e o resíduo dela
 * passa a ser reimposto dali para baixo). O degrau é LINEAR e só depende da
 * máscara, então descer a soma é o mesmo que somar as descidas. Devolve a
 * correção somada na resolução cheia (igual ao resíduo no dado).
 */
function desceACascata(entradas, dado, largura, altura, raioM) {
  const ordem = [...entradas].sort((a, b) => b.nivel - a.nivel);
  const n = largura * altura;
  const residuo = new Float32Array(n);
  let campo = null;
  let p = 0;
  for (let nivel = ordem[0].nivel; nivel >= 0; nivel -= 1) {
    if (campo) campo = desceUmNivel(campo, residuo, dado, nivel, largura, altura, raioM);
    for (; p < ordem.length && ordem[p].nivel === nivel; p += 1) {
      const { grosso, medida, simulada } = ordem[p];
      if (campo) for (let c = 0; c < grosso.length; c += 1) campo[c] += grosso[c];
      else campo = Float64Array.from(grosso);
      for (let k = 0; k < n; k += 1) if (dado[k]) residuo[k] += medida[k] - simulada[k];
    }
  }
  return campo;
}

function mesmaMascara(a, b) {
  if (a === b) return true;
  for (let k = 0; k < a.length; k += 1) if (a[k] !== b[k]) return false;
  return true;
}

// ------------------------------------------------------------
// A membrana das oitavas grossas
// ------------------------------------------------------------

/**
 * As CONDUTÂNCIAS da membrana na grade L×A (volumes finitos na esfera), por
 * linha J: a leste–oeste Δφ/(cos φ·Δλ) e as das faces norte e sul,
 * cos φ_face·Δλ/Δφ. A face do polo tem cos 0: nada atravessa o ponto do polo,
 * e a calota fica presa pela volta (forte, as ondas m ≥ 2 somem ali) e pela
 * linha de baixo.
 */
function condutanciasDaMembrana(L, A) {
  const dPhi = Math.PI / A;
  const dLam = (2 * Math.PI) / L;
  const leste = new Float64Array(A);
  const norte = new Float64Array(A);
  const sul = new Float64Array(A);
  for (let J = 0; J < A; J += 1) {
    leste[J] = dPhi / (Math.cos(latitudeDaLinha(J, A)) * dLam);
    norte[J] = J === 0 ? 0 : (Math.sin(J * dPhi) * dLam) / dPhi;
    sul[J] = J === A - 1 ? 0 : (Math.sin((J + 1) * dPhi) * dLam) / dPhi;
  }
  return { leste, norte, sul };
}

/**
 * A MEMBRANA EXATA no nível grosso: Laplace nas células sem dado de `u`
 * (grade L×A), preso nas de `ehD`, por Cholesky em banda — a meia-largura L
 * cobre a linha vizinha e a volta da longitude. No lugar, em `u`.
 */
function resolveMembrana(u, ehD, L, A) {
  const { leste, norte, sul } = condutanciasDaMembrana(L, A);
  const n = L * A;
  const w = L + 1;
  const M = new Float64Array(n * w); // M[i·w + (i − j)] = a matriz em (i, j), j ≤ i
  const x = new Float64Array(n);
  for (let J = 0; J < A; J += 1) {
    for (let I = 0; I < L; I += 1) {
      const i = J * L + I;
      if (ehD[i]) {
        M[i * w] = 1;
        x[i] = u[i];
        continue;
      }
      M[i * w] = 2 * leste[J] + norte[J] + sul[J];
      const vizinhos = [
        [J * L + ((I + L - 1) % L), leste[J]],
        [J * L + ((I + 1) % L), leste[J]],
        [i - L, norte[J]],
        [i + L, sul[J]],
      ];
      for (const [k, g] of vizinhos) {
        if (!g) continue;
        if (ehD[k]) x[i] += g * u[k];
        else if (k < i) M[i * w + i - k] = -g;
      }
    }
  }
  for (let i = 0; i < n; i += 1) {
    const j0 = Math.max(0, i - L);
    for (let j = j0; j <= i; j += 1) {
      let s = M[i * w + i - j];
      for (let k = j0; k < j; k += 1) s -= M[i * w + i - k] * M[j * w + j - k];
      if (j < i) M[i * w + i - j] = s / M[j * w];
      else if (s > 0) M[i * w] = Math.sqrt(s);
      else throw new Error('costura: a membrana não tem célula de dado que a prenda.');
    }
  }
  for (let i = 0; i < n; i += 1) {
    let s = x[i];
    for (let k = Math.max(0, i - L); k < i; k += 1) s -= M[i * w + i - k] * x[k];
    x[i] = s / M[i * w];
  }
  for (let i = n - 1; i >= 0; i -= 1) {
    let s = x[i];
    for (let k = i + 1; k <= Math.min(n - 1, i + L); k += 1) s -= M[k * w + k - i] * x[k];
    x[i] = s / M[i * w];
  }
  for (let i = 0; i < n; i += 1) if (!ehD[i]) u[i] = x[i];
}

/** `passadas` de Gauss–Seidel simétrico da membrana nas células sem dado de `u`, no lugar. */
function relaxaMembrana(u, ehD, L, A, passadas) {
  const { leste, norte, sul } = condutanciasDaMembrana(L, A);
  const atualiza = (J, I) => {
    const i = J * L + I;
    if (ehD[i]) return;
    const base = J * L;
    let s = leste[J] * (u[base + (I === 0 ? L - 1 : I - 1)] + u[base + (I === L - 1 ? 0 : I + 1)]);
    if (norte[J]) s += norte[J] * u[i - L];
    if (sul[J]) s += sul[J] * u[i + L];
    u[i] = s / (2 * leste[J] + norte[J] + sul[J]);
  };
  for (let p = 0; p < passadas; p += 1) {
    for (let J = 0; J < A; J += 1) for (let I = 0; I < L; I += 1) atualiza(J, I);
    for (let J = A - 1; J >= 0; J -= 1) for (let I = L - 1; I >= 0; I -= 1) atualiza(J, I);
  }
}

/**
 * A MEMBRANA HARMÔNICA de `campo` (lido só onde `dado`): Laplace no vazio, o
 * campo preso no dado — limitada pelo dado (princípio do máximo: nada de
 * pico). Resolvida exata no nível em que a célula é ~`sigmaKm`/8
 * (`resolveMembrana`, com a volta e os polos), e trazida à resolução cheia
 * nível a nível: a spline B cúbica sobe o campo, o dado do nível (o centro de
 * cada célula de estêncil todo dado, como na cascata) é reimposto, e
 * `PASSADAS_DA_MEMBRANA` de Gauss–Seidel refazem a membrana junto da borda
 * que o nível acabou de ver — no nível 0 a borda é a emenda verdadeira, sem
 * degrau.
 */
function membranaHarmonica(campo, dado, largura, altura, raioM, sigmaKm) {
  const topo = nivelDaOitava(sigmaKm / 4, largura, altura, raioM);
  let u = null;
  for (let nivel = topo; nivel >= 0; nivel -= 1) {
    const L = largura >> nivel;
    const A = altura >> nivel;
    const { ehD, valor } = residuoNoNivel(campo, dado, largura, altura, nivel);
    const v = new Float64Array(L * A);
    if (u) avaliaSpline(coeficientesDeSpline(u, L / 2, A / 2), L / 2, A / 2, 1, L, A, v);
    for (let c = 0; c < L * A; c += 1) if (ehD[c]) v[c] = valor[c];
    if (u) relaxaMembrana(v, ehD, L, A, PASSADAS_DA_MEMBRANA);
    else if (ehD.includes(1)) resolveMembrana(v, ehD, L, A);
    u = v;
  }
  return u;
}

/**
 * A COSTURA — SIMULAÇÃO CONDICIONAL POR KRIGAGEM DE RESÍDUOS, banda a banda
 * (PLAN-RELEVO.md, E3 item 1; Springer, cap. 1 §1.3, eq. 1.26): F = S + K(T − S),
 * com S uma simulação sem condição, T o medido e K a krigagem simples do resíduo
 * nos pontos medidos (`condicionaOitava`, levada à resolução cheia por
 * `desceACascata`). Devolve o campo CONTÍNUO de alturas (Float32): nos texels que
 * são dado em TODA banda é `medida`, byte a byte; onde só as bandas grossas são
 * dado (o DEM borrado, item 5b do plano) as grossas são o medido e as finas,
 * simuladas e condicionadas; no vazio, S + as correções. `dadoPorOitava` é uma
 * máscara por banda (1 = a banda é dado ali; podem ser o mesmo array) e `ganhos`
 * a amplitude de cada banda (S = Σ gₖ·`ruidoDaOitava`).
 *
 * HIPÓTESES: cada banda é estacionária, com a covariância ajustada à própria
 * simulação por lóbulos de Legendre não negativos (positiva-definida na esfera,
 * `covarianciaDaOitava`); e, perto da emenda, o medido é realização do mesmo
 * modelo calibrado. Condiciona-se a banda k da simulação SOMADA, não gₖ·ruídoₖ:
 * o ruído de uma oitava vaza nas vizinhas.
 *
 * O MEDIDO ENTRA PELA MEMBRANA: o vazio é preenchido pela membrana harmônica do
 * dado (`membranaHarmonica`) e só então o campo é partido em bandas pelo filtro
 * simples — sem o viés do desfoque com máscara na emenda. As bandas acima de R/5
 * NÃO são simuladas: no vazio são a continuação lisa da membrana (não há dado
 * ali; em Caronte real carregam < 0,5 % da inclinação).
 *
 * LIMITAÇÃO CONHECIDA, ACEITA POR ORA (decisão de 01/10): junto da emenda as
 * bandas médias perdem parte da energia por vazamento das oitavas grossas
 * (medido); quase não afeta a inclinação. As fotos do recorte escondido no dado
 * real (E4) dizem se uma compensação de variância é necessária.
 */
export function costura({ medida, dadoPorOitava, semente, sigmasKm, ganhos, largura, altura, raioM, registra }) {
  const anota = registra ?? (() => {});
  const n = largura * altura;
  const nb = sigmasKm.length + 1;
  if (dadoPorOitava.length !== nb || ganhos.length !== nb) {
    throw new Error(`costura: ${nb} bandas pedem ${nb} máscaras e ${nb} ganhos.`);
  }
  const medido = new Uint8Array(n);
  const emTodas = new Uint8Array(n).fill(1);
  for (const dado of dadoPorOitava) {
    for (let k = 0; k < n; k += 1) {
      if (dado[k]) medido[k] = 1;
      else emTodas[k] = 0;
    }
  }
  const sigmaDa = (k) => (k < nb - 1 ? sigmasKm[k] : 2 * sigmasKm[nb - 2]);
  const naMembrana = (k) => sigmaDa(k) > (FRACAO_DO_RAIO_DA_MEMBRANA * raioM) / 1000;
  const um = new Uint8Array(n).fill(1);
  const primeiraGrossa = Array.from({ length: nb }, (_, k) => k).find(naMembrana) ?? nb - 1;
  const cheio = membranaHarmonica(medida, medido, largura, altura, raioM, sigmaDa(primeiraGrossa));
  anota('a membrana do medido');
  const bandasT = decompoeEmOitavas(cheio, um, largura, altura, raioM, sigmasKm);
  anota('as bandas do medido');
  const simulada = new Float32Array(n);
  for (let k = 0; k < nb; k += 1) {
    const ruido = ruidoDaOitava(semente, k, sigmasKm, largura, altura, raioM);
    for (let q = 0; q < n; q += 1) simulada[q] += ganhos[k] * ruido[q];
  }
  anota('a simulação');
  const bandasS = decompoeEmOitavas(simulada, um, largura, altura, raioM, sigmasKm);
  anota('as bandas da simulação');

  const soma = new Float64Array(n);
  const grupos = [];
  for (let k = 0; k < nb; k += 1) {
    if (naMembrana(k)) {
      const T = bandasT[k];
      for (let q = 0; q < n; q += 1) soma[q] += T[q];
      continue;
    }
    const mascara = dadoPorOitava[k];
    const sigmaKm = sigmaDa(k);
    const { nivel, grosso, info } = condicionaOitava({
      simulada: bandasS[k],
      medida: bandasT[k],
      dadoK: mascara,
      largura,
      altura,
      raioM,
      sigmaKm,
    });
    anota(
      `oitava ${k}: nível ${nivel}, alcance ${info.alcanceKm.toFixed(1)} km, ${info.alvos} alvos em ` +
        `${info.blocos} blocos, vizinhos ${info.vizMedia.toFixed(0)} (máx. ${info.vizMax})` +
        (info.falhas ? `, pepita subiu a ${info.pepitaMax}` : '')
    );
    let grupo = grupos.find((g) => mesmaMascara(g.mascara, mascara));
    if (!grupo) {
      grupo = { mascara, entradas: [], oitavas: [] };
      grupos.push(grupo);
    }
    grupo.entradas.push({ nivel, grosso, medida: bandasT[k], simulada: bandasS[k] });
    grupo.oitavas.push(k);
  }

  for (const { mascara, entradas, oitavas } of grupos) {
    const correcao = desceACascata(entradas, mascara, largura, altura, raioM);
    for (const k of oitavas) {
      const T = bandasT[k];
      const S = bandasS[k];
      for (let q = 0; q < n; q += 1) soma[q] += mascara[q] ? T[q] : S[q];
    }
    for (let q = 0; q < n; q += 1) if (!mascara[q]) soma[q] += correcao[q];
    anota(`a cascata das oitavas ${oitavas.join(', ')}`);
  }
  const campo = new Float32Array(n);
  for (let q = 0; q < n; q += 1) campo[q] = emTodas[q] ? medida[q] : soma[q];
  return campo;
}
