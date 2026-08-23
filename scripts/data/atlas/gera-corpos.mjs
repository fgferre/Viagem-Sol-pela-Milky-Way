// ============================================================
// corpos.json — o editorial dos 45 corpos do atlas, mais a ÓRBITA dos 39
// que esta casa desenha.
//
// O DOADOR SAIU DO CAMINHO (2026-08-22, item 74). Até aqui este script
// EXECUTAVA `src/data/celestialBodies.ts` de `~/Github/atlas-orbital` — ele
// reescrevia o arquivo do doador em memória, gravava um .ts temporário e o
// importava. Funcionava, e tinha um defeito de fundo: `npm run data:corpos`
// só rodava numa máquina que tivesse o doador clonado no caminho certo, e o
// dado da casa dependia de um repositório que a casa não versiona. O
// editorial virou fonte AQUI — `fonte/corpos-fonte.json`, com a proveniência
// do doador dentro dela —, e o doador voltou a ser o que o NORTE manda que
// ele seja: especificação, nunca fornecedor em runtime.
//
// O QUE O GERADOR FAZ, e é a metade nova: casa o editorial com o que a casa
// já sabe. Cada um dos 38 alvos que orbitam alguma coisa ganha
// `orbita{periodoDias,minUa,maxUa}` — e o Sol, que é a origem, não ganha.
// Nenhum `a`, `e` ou período novo entra à mão: tudo sai das tabelas desta
// casa (elementos, efeméride embarcada e `GM_CORPOS`).
//
// E DESDE 22/08 ELE FUNDE A LÍNGUA. O pt-BR mora em `fonte/editorial-pt.json`,
// arquivo IRMÃO do inglês e não substituto dele: um texto por campo, os 39
// alvos, e nada para os seis sem alvo (ficha que ninguém abre não paga
// tradução). O casamento é COBRADO campo a campo — o pt tem de ter
// exatamente os campos que o en tem, com o mesmo número de fatos e de
// recordes e o mesmo `year` de exploração. Campo a mais, campo a menos ou
// lista mais curta derrubam a geração: meia tradução na tela seria pior que
// nenhuma, porque a linha some sem dizer por quê.
//
// TRÊS CAMINHOS, E A RAZÃO DE NÃO SER UM SÓ. Cada corpo vem por onde o
// número é melhor, e a fronteira entre eles é medida (ver `orbitaDoCorpo`):
// o osculante do estado, sozinho, erraria Mimas em 2% e o ano da Terra em
// 0,12% ("366 dias"); a taxa varrida na tabela, sozinha, erraria Plutão em
// 28%, porque em 100 anos ele só anda 0,4 volta. O pior erro de período que
// sobra, com os três, é 0,32% (Plutão) — e o das cinco famílias medidas fica
// abaixo de 0,05%.
//
// DETERMINÍSTICO de propósito: sem timestamp, época fixa. Rodar de novo com
// a fonte parada produz arquivo bit-idêntico — mesma disciplina do stars.bin
// da Onda 1a, para o diff do git mostrar só mudança de conteúdo real.
//
//   node scripts/data/atlas/gera-corpos.mjs
// ============================================================
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * O `.ts` QUE O VITE PÕE E O NODE NÃO. Os módulos da casa importam-se uns
 * aos outros sem extensão (`from './kepler'`) — é o que o bundler espera e o
 * que o `tsc` resolve. O Node executa TypeScript por type stripping desde a
 * 22, mas resolve especificador como ESM puro, e ESM puro exige extensão.
 * Este gancho tenta a resolução normal e, só quando ela falha por módulo não
 * encontrado, tenta de novo com `.ts` — nunca inventa arquivo, nunca engole
 * outro erro.
 */
registerHooks({
  resolve(especificador, contexto, proximo) {
    try {
      return proximo(especificador, contexto);
    } catch (erro) {
      if (erro?.code !== 'ERR_MODULE_NOT_FOUND' || especificador.endsWith('.ts')) {
        throw erro;
      }
      return proximo(`${especificador}.ts`, contexto);
    }
  },
});

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
);
const fonteDir = path.join(rootDirectory, 'scripts', 'data', 'atlas', 'fonte');
const fontePath = path.join(fonteDir, 'corpos-fonte.json');
const fontePtPath = path.join(fonteDir, 'editorial-pt.json');
const dadosDir = path.join(rootDirectory, 'public', 'data', 'atlas');
const outputPath = path.join(dadosDir, 'corpos.json');

// Os módulos da casa entram por type stripping do Node — os mesmos arquivos
// que o app importa, e não uma segunda cópia da tabela aqui dentro.
const { decodeEfemerides, MotorEfemerides } = await import(
  path.join(rootDirectory, 'src/lib/atlas/efemerides.ts')
);
const { AU_KM } = await import(
  path.join(rootDirectory, 'src/lib/atlas/elementosOrbitais.ts')
);
const { elementosDe } = await import(
  path.join(rootDirectory, 'src/lib/atlas/kepler.ts')
);
const { GM_CORPOS } = await import(
  path.join(rootDirectory, 'src/lib/atlas/massas.ts')
);
const { REGISTRO_ORBITAL } = await import(
  path.join(rootDirectory, 'src/lib/atlas/registroOrbital.ts')
);
const {
  ANOES_DO_SISTEMA,
  ASTEROIDES_DO_SISTEMA,
  CORPOS_DO_SISTEMA,
  LUAS_DO_SISTEMA,
} = await import(path.join(rootDirectory, 'src/three/atlasConfig.ts'));

// ---- contagens esperadas: o mesmo contrato vive em verify-assets.mjs
const TOTAL_ESPERADO = 45;
const CONTAGENS_ESPERADAS = { star: 1, planet: 8, moon: 23, dwarf: 5, tno: 5, asteroid: 3 };

// ---- os 6 campos editoriais, na ordem canônica do JSON
const CAMPOS_EDITORIAIS = [
  'description',
  'curiosity',
  'facts',
  'records',
  'explorationMilestone',
  'info',
];

/**
 * A ÉPOCA DOS ELEMENTOS — 2025-01-01T00:00:00 TDB, a mesma de
 * `EPOCH_2025_JD` em `elementosOrbitais.ts`. Escrita como literal e não como
 * `Date.now()` porque este arquivo tem de sair bit-idêntico a cada corrida.
 */
const EPOCA_JD = 2460676.5;

const SEGUNDOS_POR_DIA = 86_400;

/** km³/s² → UA³/dia². */
function paraUa3PorDia2(gmKm3PorS2) {
  return (gmKm3PorS2 * SEGUNDOS_POR_DIA * SEGUNDOS_POR_DIA) / AU_KM ** 3;
}

const modulo = (v) => Math.hypot(v.x, v.y, v.z);
const escalar = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const vetorial = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

/**
 * Elementos osculantes a partir do ESTADO, pelo caminho clássico: energia
 * específica dá o semieixo, e o vetor de Laplace–Runge–Lenz dá a
 * excentricidade.
 *
 * `mu` é o μ RELATIVO — G(M + m), a soma do pai com o corpo —, que é o que
 * governa a órbita relativa de dois corpos. Para a Lua isso importa (ela é
 * 1,2% da Terra); para Fobos não muda um dígito. Corpo sem GM no kernel
 * (Makemake) entra só com o μ do pai, e o erro que isso comete é da ordem de
 * 1e-11.
 */
function osculantes(id, jd) {
  const registro = REGISTRO_ORBITAL[id];
  const mu = paraUa3PorDia2(GM_CORPOS[registro.centro] + (GM_CORPOS[id] ?? 0));
  const r = motor.posicao(id, jd);
  const v = motor.velocidade(id, jd);
  const rMod = modulo(r);
  const v2 = escalar(v, v);
  const a = 1 / (2 / rMod - v2 / mu);
  const rv = escalar(r, v);
  // vetor de excentricidade: ((v² − μ/r)·r − (r·v)·v) / μ
  const k = v2 - mu / rMod;
  const e = modulo({
    x: (k * r.x - rv * v.x) / mu,
    y: (k * r.y - rv * v.y) / mu,
    z: (k * r.z - rv * v.z) / mu,
  });
  if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(e) || e >= 1) {
    throw new Error(
      `orbita de "${id}": elementos não elípticos (a=${a}, e=${e}) — ` +
        `estado ou μ errados, não arredonde isto`
    );
  }
  return { a, e, mu };
}

/**
 * OS OSCULANTES MÉDIOS, e não os de um instante. O elemento osculante de um
 * corpo real balança: a Terra tem o termo mensal da Lua (o par gira em torno
 * do baricentro, e a tabela guarda a TERRA, não o baricentro), e ele sozinho
 * põe 0,12% no período — "366 dias" para um ano que todo mundo sabe que tem
 * 365. Média de 64 amostras sobre uma volta (com piso de um ano e teto na
 * metade da janela da tabela, que é o que cabe simétrico em torno da época)
 * derruba isso para 0,002%.
 */
function osculantesMedios(id, periodoInicial) {
  const AMOSTRAS = 64;
  const METADE_DA_JANELA = 18_262; // 50 anos, o que sobra de cada lado da época
  const janela = Math.min(Math.max(periodoInicial, 365.25), METADE_DA_JANELA);
  let somaA = 0;
  let somaE = 0;
  for (let i = 0; i < AMOSTRAS; i += 1) {
    const { a, e } = osculantes(id, EPOCA_JD - janela / 2 + (janela * i) / AMOSTRAS);
    somaA += a;
    somaE += e;
  }
  return { a: somaA / AMOSTRAS, e: somaE / AMOSTRAS };
}

/**
 * A TAXA MÉDIA MEDIDA NA TABELA — o ângulo que o corpo varre de ponta a
 * ponta da janela embarcada, dividido pelo tempo. É a definição de período
 * sideral, sem passar por elemento nenhum.
 *
 * POR QUE ELA EXISTE, e a Lua é o caso: para um corpo muito perturbado o
 * período NÃO obedece Kepler III com o semieixo médio. A Lua osculante dá
 * 27,1 dias contra os 27,32 sideral — 0,7% de erro no número mais conhecido
 * do céu. Varrendo a tabela, 27,3207 dias: 0,004%.
 *
 * O passo tem de ser bem menor que meia volta (senão o `atan2` do ângulo
 * entre duas amostras "encurta o caminho" e conta menos do que o corpo
 * andou), e por isso ele é uma fração do período, não um número fixo.
 */
function taxaMedidaNaTabela(id, periodoInicial) {
  const { jdInicio, jdFim } = meta.janela;
  const passo = periodoInicial / 16;
  const passos = Math.floor((jdFim - jdInicio) / passo);
  let anguloTotal = 0;
  let anterior = motor.posicao(id, jdInicio);
  for (let i = 1; i <= passos; i += 1) {
    const atual = motor.posicao(id, jdInicio + i * passo);
    anguloTotal += Math.atan2(
      modulo(vetorial(anterior, atual)),
      escalar(anterior, atual)
    );
    anterior = atual;
  }
  return (2 * Math.PI * (passos * passo)) / anguloTotal;
}

/**
 * QUANTAS VOLTAS PRECISAM CABER na janela para a medição valer. Abaixo
 * disso a varredura mede um PEDAÇO de órbita, e num corpo excêntrico pedaço
 * de órbita tem taxa própria: Plutão, com 0,4 volta em 100 anos, "mede"
 * 65.520 dias contra os 90.560 verdadeiros. Vinte voltas põem o pior resto
 * parcial abaixo de 0,05%, e é onde a fronteira fica.
 */
const VOLTAS_MINIMAS_PARA_MEDIR = 20;

/**
 * A ÓRBITA DE UM CORPO — período em dias e a distância ao pai no periastro e
 * no apoastro. TRÊS CAMINHOS, e a escolha é sempre "o melhor número que esta
 * casa tem para este corpo":
 *
 *  1. CORPO DE KEPLER (29 dos 39): o registro já carrega a taxa calibrada
 *     (`nDegPerDay`, com procedência `pub`/`fix` anotada entrada a entrada)
 *     e o `a`/`e` publicados. Aqui é TRANSCRIÇÃO, não conta — e é o único
 *     caminho que acerta Mimas, cujo período de 0,94 dia o osculante do
 *     estado erra em 2%.
 *  2. CORPO DE TABELA COM VOLTAS SUFICIENTES (Mercúrio, Vênus, Terra,
 *     Marte, Lua): taxa MEDIDA varrendo a efeméride embarcada, e o `a`/`e`
 *     do osculante médio para as distâncias. Erro medido no período: 0,05%
 *     no pior (Marte).
 *  3. CORPO DE TABELA SEM VOLTAS SUFICIENTES (Júpiter a Plutão): Kepler III
 *     do osculante médio. Erro medido: 0,003% (Júpiter) a 0,32% (Plutão).
 *
 * O Sol é a origem e não tem órbita — `undefined`, e o verificador cobra que
 * ele seja o ÚNICO alvo assim.
 */
function orbitaDoCorpo(id) {
  if (id === 'sun') return undefined;

  // Seis casas em UA são ~150 km e cinco em dias são ~1 s: o arredondamento
  // impede que ruído de última casa apareça como diff no git a cada
  // regeneração. É EXIBIÇÃO — quem precisa da órbita para MOVER coisa
  // continua indo aos elementos, nunca a este JSON.
  const arredondar = (x, casas) => Number(x.toFixed(casas));
  const escrever = (periodoDias, a, e) => ({
    periodoDias: arredondar(periodoDias, 5),
    minUa: arredondar(a * (1 - e), 8),
    maxUa: arredondar(a * (1 + e), 8),
  });

  const kepler = elementosDe(id);
  if (kepler) {
    return escrever(360 / kepler.nDegPerDay, kepler.elements.aAU, kepler.elements.e);
  }

  const inicial = osculantes(id, EPOCA_JD);
  const periodoInicial = 2 * Math.PI * Math.sqrt(inicial.a ** 3 / inicial.mu);
  const { a, e } = osculantesMedios(id, periodoInicial);
  const voltas = (meta.janela.jdFim - meta.janela.jdInicio) / periodoInicial;
  const periodo =
    voltas >= VOLTAS_MINIMAS_PARA_MEDIR
      ? taxaMedidaNaTabela(id, periodoInicial)
      : 2 * Math.PI * Math.sqrt(a ** 3 / inicial.mu);
  return escrever(periodo, a, e);
}

// ---- a efeméride embarcada, lida do disco como o app a lê
const meta = JSON.parse(
  await readFile(path.join(dadosDir, 'efemerides_meta.json'), 'utf8')
);
const bin = await readFile(path.join(dadosDir, 'efemerides.bin'));
const motor = new MotorEfemerides(
  decodeEfemerides(
    bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength),
    meta
  )
);

// ---- os alvos desta casa: quem ganha ficha, derivado das tabelas do Atlas
const ALVOS = new Set(
  [
    ...CORPOS_DO_SISTEMA,
    ...LUAS_DO_SISTEMA,
    ...ANOES_DO_SISTEMA,
    ...ASTEROIDES_DO_SISTEMA,
  ].map((c) => c.id)
);

// ---- a fonte versionada
const fonte = JSON.parse(await readFile(fontePath, 'utf8'));
if (!Array.isArray(fonte.corpos)) {
  throw new Error(`${fontePath} não tem um array "corpos" — a fonte mudou de forma.`);
}

// ---- a tradução, arquivo irmão (item 74, parte B)
const fontePt = JSON.parse(await readFile(fontePtPath, 'utf8'));
if (!fontePt.corpos || typeof fontePt.corpos !== 'object') {
  throw new Error(`${fontePtPath} não tem um objeto "corpos" — a tradução mudou de forma.`);
}

/**
 * O CASAMENTO DE UMA LÍNGUA COM A OUTRA, campo a campo. A ficha mostra só o
 * `pt`, e linha sem `pt` SOME — então uma tradução pela metade não aparece
 * como erro na tela, aparece como assunto que sumiu. Aqui ela derruba a
 * geração, que é o único lugar onde alguém está olhando.
 *
 * O QUE SE COBRA: os mesmos campos (nem a mais nem a menos), o mesmo número
 * de fatos e de recordes, e o mesmo `year` de exploração — o texto pode (e
 * deve) mudar de forma ao mudar de língua, mas a DATA é medida, não redação.
 */
function traduzir(id, en) {
  const pt = fontePt.corpos[id];
  if (!pt) return undefined;
  const camposEn = CAMPOS_EDITORIAIS.filter((c) => en[c] !== undefined);
  const camposPt = Object.keys(pt);
  const sobrando = camposPt.filter((c) => !camposEn.includes(c));
  if (sobrando.length > 0) {
    throw new Error(`Tradução de "${id}" tem campo que o inglês não tem: ${sobrando.join(', ')}.`);
  }
  const saida = {};
  for (const campo of camposEn) {
    const valor = pt[campo];
    if (valor === undefined) {
      throw new Error(`Tradução de "${id}" sem o campo "${campo}", que o inglês tem.`);
    }
    if (Array.isArray(en[campo])) {
      if (!Array.isArray(valor) || valor.length !== en[campo].length) {
        throw new Error(
          `Tradução de "${id}", campo "${campo}": ${Array.isArray(valor) ? valor.length : 'não é lista'} ` +
            `contra ${en[campo].length} no inglês.`
        );
      }
      if (valor.some((v) => typeof v !== 'string' || v.trim() === '')) {
        throw new Error(`Tradução de "${id}", campo "${campo}": item vazio na lista.`);
      }
    } else if (campo === 'explorationMilestone') {
      if (valor?.year !== en[campo].year) {
        throw new Error(
          `Tradução de "${id}": ano da exploração ${valor?.year} contra ${en[campo].year} no inglês — ` +
            'a data é medida, não redação.'
        );
      }
      if (typeof valor.description !== 'string' || valor.description.trim() === '') {
        throw new Error(`Tradução de "${id}": exploração sem descrição.`);
      }
    } else if (typeof valor !== 'string' || valor.trim() === '') {
      throw new Error(`Tradução de "${id}", campo "${campo}": vazio.`);
    }
    saida[campo] = valor;
  }
  return saida;
}

const corpos = fonte.corpos.map((body) => {
  if (typeof body.id !== 'string' || typeof body.type !== 'string') {
    throw new Error(`Corpo sem id/type na fonte: ${JSON.stringify(body?.id)}.`);
  }
  if (typeof body.name?.en !== 'string' || typeof body.name?.pt !== 'string') {
    throw new Error(`Corpo "${body.id}" sem name.en/name.pt na fonte.`);
  }
  const en = {};
  for (const campo of CAMPOS_EDITORIAIS) {
    const valor = body.editorial?.en?.[campo];
    if (valor !== undefined) en[campo] = valor;
  }
  const editorial = { en };
  // A LÍNGUA VEM DE UM LUGAR SÓ: o arquivo irmão. Se um dia alguém escrever
  // `pt` também dentro de `corpos-fonte.json`, são duas fontes para o mesmo
  // texto — e a que perder a briga envelhece calada.
  if (body.editorial?.pt !== undefined) {
    throw new Error(
      `Corpo "${body.id}" tem "pt" em corpos-fonte.json — a tradução mora só em editorial-pt.json.`
    );
  }
  const pt = traduzir(body.id, en);
  if (pt) editorial.pt = pt;

  const saida = {
    id: body.id,
    type: body.type,
    name: { en: body.name.en, pt: body.name.pt },
    editorial,
  };
  if (ALVOS.has(body.id)) {
    const orbita = orbitaDoCorpo(body.id);
    if (orbita) saida.orbita = orbita;
  } else {
    // SEM ALVO NESTA CASA, dito no dado e não só na prosa: sem textura e sem
    // BODY_AXES não há corpo na cena, e ficha sem corpo é promessa.
    saida.semAlvo = true;
  }
  return saida;
});

// ---- validação: as contagens do contrato (45 corpos, nenhum fica para trás)
if (corpos.length !== TOTAL_ESPERADO) {
  throw new Error(`Esperados ${TOTAL_ESPERADO} corpos; a fonte entregou ${corpos.length}.`);
}
const contagens = {};
for (const corpo of corpos) {
  contagens[corpo.type] = (contagens[corpo.type] ?? 0) + 1;
}
for (const [tipo, esperado] of Object.entries(CONTAGENS_ESPERADAS)) {
  if (contagens[tipo] !== esperado) {
    throw new Error(`Tipo "${tipo}": esperados ${esperado} corpos, obtidos ${contagens[tipo] ?? 0}.`);
  }
}
const tiposInesperados = Object.keys(contagens).filter((t) => !(t in CONTAGENS_ESPERADAS));
if (tiposInesperados.length > 0) {
  throw new Error(`Tipos fora do contrato: ${tiposInesperados.join(', ')}.`);
}
if (new Set(corpos.map((c) => c.id)).size !== corpos.length) {
  throw new Error('Há ids duplicados entre os corpos.');
}

// TODO ALVO TEM ÓRBITA, e a falta grita: o Sol é a origem e não tem órbita
// nenhuma — é a ÚNICA exceção, e ela é escrita, não tolerada.
const semOrbita = corpos
  .filter((c) => ALVOS.has(c.id) && c.orbita === undefined)
  .map((c) => c.id);
if (semOrbita.length !== 1 || semOrbita[0] !== 'sun') {
  throw new Error(
    `Alvos sem órbita além do Sol: ${semOrbita.join(', ') || '(nenhum, e o Sol sumiu)'}.`
  );
}
const semAlvo = corpos.filter((c) => c.semAlvo).map((c) => c.id);
if (semAlvo.length !== TOTAL_ESPERADO - ALVOS.size) {
  throw new Error(
    `${semAlvo.length} corpos sem alvo, esperados ${TOTAL_ESPERADO - ALVOS.size}: ${semAlvo.join(', ')}.`
  );
}

// TODO ALVO FALA PORTUGUÊS, e só os alvos: a tradução cobre exatamente os
// 39 que ganham ficha. Um id na tradução sem corpo na fonte seria texto que
// nunca chega à tela; um alvo sem tradução seria ficha muda.
const traduzidos = corpos.filter((c) => c.editorial.pt).map((c) => c.id);
const alvosSemPt = corpos.filter((c) => ALVOS.has(c.id) && !c.editorial.pt).map((c) => c.id);
if (alvosSemPt.length > 0) {
  throw new Error(`Alvos sem tradução pt-BR: ${alvosSemPt.join(', ')}.`);
}
const ptSemAlvo = traduzidos.filter((id) => !ALVOS.has(id));
if (ptSemAlvo.length > 0) {
  throw new Error(`Tradução de corpo sem alvo nesta casa: ${ptSemAlvo.join(', ')}.`);
}
const ptOrfaos = Object.keys(fontePt.corpos).filter(
  (id) => !corpos.some((c) => c.id === id)
);
if (ptOrfaos.length > 0) {
  throw new Error(`editorial-pt.json traduz id que não existe na fonte: ${ptOrfaos.join(', ')}.`);
}

const saida = {
  _fonte: fonte._fonte,
  _proveniencia: {
    gerador: 'scripts/data/atlas/gera-corpos.mjs',
    editorial: 'scripts/data/atlas/fonte/corpos-fonte.json',
    editorialPt: 'scripts/data/atlas/fonte/editorial-pt.json',
    traducao: fontePt._proveniencia,
    doadorCommit: fonte._proveniencia?.doadorCommit,
    orbita:
      'derivada por três caminhos, cada um o melhor número desta casa para ' +
      'aquele corpo: (1) corpo de Kepler — 360/nDegPerDay e a(1∓e) dos ' +
      'elementos publicados do registro; (2) corpo de tabela com 20+ voltas ' +
      'na janela 1950–2050 — taxa MEDIDA varrendo efemerides.bin, com a e e ' +
      'do osculante médio; (3) corpo de tabela sem voltas suficientes — ' +
      `Kepler III do osculante médio em torno de JD ${EPOCA_JD} TDB, com μ ` +
      'de GM_CORPOS (gm_de440.tpc). Derivado, nunca medido diretamente.',
  },
  _pendencias: fonte._pendencias,
  _semAlvo: semAlvo,
  corpos,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(saida, null, 2) + '\n');
console.log(
  `corpos.json: ${corpos.length} corpos (` +
    Object.entries(CONTAGENS_ESPERADAS)
      .map(([tipo, n]) => `${tipo} ${n}`)
      .join(', ') +
    `) — ${ALVOS.size} alvos, ${ALVOS.size - 1} com órbita, ` +
    `${traduzidos.length} com pt-BR, ${semAlvo.length} sem alvo (${semAlvo.join(', ')}).`
);
