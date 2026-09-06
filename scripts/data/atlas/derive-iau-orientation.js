#!/usr/bin/env node

// ============================================================
// VENDORIZADO do atlas-orbital (scripts/derive-iau-orientation.js).
// Ferramenta offline julgada por oráculo (doutrina de travessia, docs/NORTE.md): a saída é
// conferível contra o kernel pck00011.tpc da NAIF e contra o oráculo
// sub-ponto solar. O consumidor na casa é
// `src/lib/atlas/iauOrientation.ts` (o bloco impresso cola lá).
// UMA adaptação declarada, marcada com "// Casa:" em loadKernel: o
// fetch recusa redirect para OUTRO host — é o item 13 do checklist
// pré-fusão (o download-hyg do doador seguia redirects para qualquer
// host; a auditoria mandou allowlist e a falha existia aqui também,
// achado da revisão de olhos frescos). Todo o resto é verbatim.
// ============================================================

/**
 * Derive `iauOrientation` records from NAIF's generic planetary constants
 * kernel.
 *
 * This is the reproducible companion to the rotational elements tabulated in
 * `src/data/celestialBodies.ts`, in the same spirit as
 * `scripts/derive-elements-from-fixtures.js` is for the orbital elements: the
 * script reads the published source and prints the exact block to paste, so
 * the numbers in the catalog are a *transcription of a machine-readable file*
 * rather than a human copying a table out of a PDF.
 *
 * That distinction is the whole point. W6's named risk is mistranscription —
 * a wrong W₀ renders as a perfectly plausible planet — and the bodies stage B
 * adds carry up to 26 periodic terms each, indexed positionally into a shared
 * angle table. Reading those by eye is how the sign of one amplitude ends up
 * on the wrong argument. Reading them with 40 lines of parser does not.
 *
 * Usage:
 *   node scripts/derive-iau-orientation.js                # all known bodies
 *   node scripts/derive-iau-orientation.js moon triton    # a subset
 *   node scripts/derive-iau-orientation.js --radii        # BODY_AXES table
 *                                                         # for subSolarPoint.test.ts
 *   node scripts/derive-iau-orientation.js --gm           # GM_CORPOS table
 *                                                         # for src/lib/atlas/massas.ts
 *
 * Environment:
 *   PCK_FILE=/path/to/pck00011.tpc   use a local copy instead of fetching
 *   PCK_URL=...                      override the NAIF download URL
 *   GM_FILE=/path/to/gm_de440.tpc    ditto, for --gm (a SECOND kernel)
 *   GM_URL=...                       override the NAIF download URL for it
 *
 * ## The kernel's model, and how it maps onto `IauOrientation`
 *
 *   RA  = ra0  + ra1·T  + ra2·T²  + Σ raAmp_i ·sin(θ_i)
 *   DEC = dec0 + dec1·T + dec2·T² + Σ decAmp_i·cos(θ_i)
 *   W   = w0   + w1·d   + w2·d²   + Σ pmAmp_i ·sin(θ_i)
 *
 * with T in Julian centuries TDB past J2000 and d in days. **The pole rates
 * are per century and the spin rate is per day** — the one asymmetry in the
 * format, and mixing them up moves a body by a factor of 36525.
 *
 * The θ_i come from `BODY<system>_NUT_PREC_ANGLES`, a flat list shared by a
 * planet and all its satellites, where `system` is the leading digit of the
 * NAIF id (Phobos 401 → Mars system 4). Each body's `_NUT_PREC_RA/_DEC/_PM`
 * arrays are **positional** into that list, so amplitude *k* belongs to angle
 * *k* and a short array simply means the later angles have zero amplitude.
 * Nothing names the pairing; get the index wrong and the result is a body
 * wobbling to the wrong argument at the right amplitude.
 *
 * `BODY<system>_MAX_PHASE_DEGREE` (only Mars has it, = 2) says each angle
 * carries a quadratic coefficient too, so the angle list is read three numbers
 * at a time instead of two. Phobos genuinely needs it: its largest term
 * (−1.143° on W) rides angle M5, whose argument accelerates.
 */

import fs from "node:fs";

const PCK_URL =
  process.env.PCK_URL ??
  "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc";

/**
 * Casa (obra 74b): o SEGUNDO kernel, o das massas. `pck00011.tpc` não tem
 * `BODY<n>_GM` nenhum — orientação e massa são arquivos diferentes na NAIF —,
 * e `MU_PARENT` (`src/lib/atlas/elementosOrbitais.ts`) já cita este aqui para
 * os sete pais que ele usa. `--gm` emite a tabela inteira pela MESMA
 * disciplina do `--radii`: transcrição de arquivo legível por máquina.
 */
const GM_URL =
  process.env.GM_URL ??
  "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc";

/**
 * NAIF id → catalog id, for every body the app draws that has a kernel entry.
 * The Sun and the eight planets are here too: they shipped in W6 stage A and
 * re-emitting them is how a later run proves the parser reproduces what is
 * already on disk, rather than only being checkable on the new bodies.
 */
const BODIES = {
  10: "sun",
  199: "mercury",
  299: "venus",
  399: "earth",
  499: "mars",
  599: "jupiter",
  699: "saturn",
  799: "uranus",
  899: "neptune",
  301: "moon",
  401: "phobos",
  402: "deimos",
  501: "io",
  502: "europa",
  503: "ganymede",
  504: "callisto",
  601: "mimas",
  602: "enceladus",
  603: "tethys",
  604: "dione",
  605: "rhea",
  606: "titan",
  608: "iapetus",
  701: "ariel",
  702: "umbriel",
  703: "titania",
  704: "oberon",
  705: "miranda",
  801: "triton",
  901: "charon",
  999: "pluto",
};

/**
 * Casa (obra 74b): NAIF id → id do catálogo para `BODY<n>_GM` de
 * `gm_de440.tpc`. É uma tabela SEPARADA de `BODIES` por três razões de dado,
 * não de arrumação:
 *
 *  1. Os sete corpos daqui que `BODIES` não tem — Ceres, Palas, Vesta, Hígia,
 *     Quaoar, Haumea e Éris — só existem no kernel das massas (os quatro
 *     primeiros com id de asteroide `2000nnn`, os três últimos com id de
 *     sistema `20nnnnnn`), e são alvo no Atlas.
 *  2. Os TNOs com satélite trazem TRÊS entradas: o sistema (`20nnnnnn`), o
 *     primário (`920nnnnnn`) e a lua (`120nnnnnn`). Quem responde por
 *     gravidade de superfície é o PRIMÁRIO — usar a massa do sistema daria a
 *     Haumea a gravidade dela mais a das duas luas. Pelo mesmo motivo Plutão
 *     é `BODY999` (o corpo) e não `BODY9` (o sistema, que carrega Caronte).
 *  3. MAKEMAKE NÃO ESTÁ NO KERNEL, e fica de fora: o `BODY000_GMLIST` não o
 *     lista, porque a massa dele não é medida — não há satélite que a fixe. O
 *     doador imprimia "~3,1 × 10²¹ kg" com til; aqui a ausência fica ausente
 *     (a ficha simplesmente não escreve a linha da massa dele).
 */
const GM_BODIES = {
  10: "sun",
  199: "mercury",
  299: "venus",
  399: "earth",
  499: "mars",
  599: "jupiter",
  699: "saturn",
  799: "uranus",
  899: "neptune",
  999: "pluto",
  301: "moon",
  401: "phobos",
  402: "deimos",
  501: "io",
  502: "europa",
  503: "ganymede",
  504: "callisto",
  601: "mimas",
  602: "enceladus",
  603: "tethys",
  604: "dione",
  605: "rhea",
  606: "titan",
  608: "iapetus",
  701: "ariel",
  702: "umbriel",
  703: "titania",
  704: "oberon",
  705: "miranda",
  801: "triton",
  901: "charon",
  2000001: "ceres",
  2000002: "pallas",
  2000004: "vesta",
  2000010: "hygiea",
  920050000: "quaoar",
  920136108: "haumea",
  920136199: "eris",
};

/** Fortran-style exponents (`-1.4D-12`) are legal in a text kernel. */
function toNumber(token) {
  return Number(token.replace(/[Dd]/, "e"));
}

/**
 * Every `NAME = value` / `NAME = ( … )` assignment inside the kernel's
 * `\begindata` regions. Text outside them is prose — including worked
 * examples with numbers in them, which is why the regions are honoured
 * instead of grepping the whole file.
 */
function parseKernel(text) {
  const assignments = new Map();

  for (const region of text.split(/\\begindata/).slice(1)) {
    const data = region.split(/\\begintext/)[0];
    const re = /([A-Z0-9_]+)\s*=\s*(\(([^)]*)\)|[^\s(][^\n]*)/g;
    let match;
    while ((match = re.exec(data)) !== null) {
      const body = match[3] ?? match[2];
      const values = body
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(toNumber);
      if (values.every(Number.isFinite)) assignments.set(match[1], values);
    }
  }

  return assignments;
}

function coefficients(assignments, key) {
  return assignments.get(key) ?? [];
}

/**
 * The shared angle table for a NAIF system, as `{ phase, rate, accel }`
 * triples. `accel` is 0 for every system except Mars.
 */
function nutPrecAngles(assignments, system) {
  const flat = coefficients(assignments, `BODY${system}_NUT_PREC_ANGLES`);
  const degree =
    coefficients(assignments, `BODY${system}_MAX_PHASE_DEGREE`)[0] ?? 1;
  const stride = degree + 1;

  const angles = [];
  for (let i = 0; i + stride <= flat.length; i += stride) {
    angles.push({
      phase: flat[i],
      rate: flat[i + 1],
      accel: stride > 2 ? flat[i + 2] : 0,
    });
  }
  return angles;
}

function deriveOrientation(assignments, naifId) {
  const ra = coefficients(assignments, `BODY${naifId}_POLE_RA`);
  const dec = coefficients(assignments, `BODY${naifId}_POLE_DEC`);
  const pm = coefficients(assignments, `BODY${naifId}_PM`);
  if (!ra.length || !dec.length || !pm.length) return null;

  const system = naifId < 100 ? naifId : Math.floor(naifId / 100);
  const angles = nutPrecAngles(assignments, system);
  const raAmp = coefficients(assignments, `BODY${naifId}_NUT_PREC_RA`);
  const decAmp = coefficients(assignments, `BODY${naifId}_NUT_PREC_DEC`);
  const pmAmp = coefficients(assignments, `BODY${naifId}_NUT_PREC_PM`);

  const used = Math.max(raAmp.length, decAmp.length, pmAmp.length);
  if (used > angles.length) {
    throw new Error(
      `body ${naifId}: ${used} amplitudes but only ${angles.length} angles in BODY${system}_NUT_PREC_ANGLES`
    );
  }

  const terms = [];
  for (let i = 0; i < used; i++) {
    const term = {
      phaseDeg: angles[i].phase,
      rateDegPerCentury: angles[i].rate,
      raAmpDeg: raAmp[i] ?? 0,
      decAmpDeg: decAmp[i] ?? 0,
      pmAmpDeg: pmAmp[i] ?? 0,
    };
    if (angles[i].accel) term.rateDegPerCentury2 = angles[i].accel;
    if (term.raAmpDeg || term.decAmpDeg || term.pmAmpDeg) terms.push(term);
  }

  return {
    poleRaDeg: ra[0],
    poleRaRateDegPerCentury: ra[1] || 0,
    poleDecDeg: dec[0],
    poleDecRateDegPerCentury: dec[1] || 0,
    primeMeridianDeg: pm[0],
    spinRateDegPerDay: pm[1],
    spinAccelDegPerDay2: pm[2] || 0,
    terms,
    // Quadratic pole rates are not modelled; report so a nonzero one is loud
    // rather than silently dropped.
    unmodelled: {
      poleRaAccel: ra[2] || 0,
      poleDecAccel: dec[2] || 0,
    },
  };
}

function emitTerm(term) {
  const lines = [`        {`, `          phaseDeg: ${term.phaseDeg},`];
  lines.push(`          rateDegPerCentury: ${term.rateDegPerCentury},`);
  if (term.rateDegPerCentury2 !== undefined) {
    lines.push(`          rateDegPerCentury2: ${term.rateDegPerCentury2},`);
  }
  if (term.raAmpDeg) lines.push(`          raAmpDeg: ${term.raAmpDeg},`);
  if (term.decAmpDeg) lines.push(`          decAmpDeg: ${term.decAmpDeg},`);
  if (term.pmAmpDeg) lines.push(`          pmAmpDeg: ${term.pmAmpDeg},`);
  lines.push(`        },`);
  return lines.join("\n");
}

function emitBlock(catalogId, naifId, o) {
  const lines = [
    `    // ${catalogId} — NAIF ${naifId}`,
    `    iauOrientation: {`,
    `      poleRaDeg: ${o.poleRaDeg},`,
  ];
  if (o.poleRaRateDegPerCentury) {
    lines.push(`      poleRaRateDegPerCentury: ${o.poleRaRateDegPerCentury},`);
  }
  lines.push(`      poleDecDeg: ${o.poleDecDeg},`);
  if (o.poleDecRateDegPerCentury) {
    lines.push(
      `      poleDecRateDegPerCentury: ${o.poleDecRateDegPerCentury},`
    );
  }
  lines.push(`      primeMeridianDeg: ${o.primeMeridianDeg},`);
  lines.push(`      spinRateDegPerDay: ${o.spinRateDegPerDay},`);
  if (o.spinAccelDegPerDay2) {
    lines.push(`      spinAccelDegPerDay2: ${o.spinAccelDegPerDay2},`);
  }
  if (o.terms.length) {
    lines.push(`      nutPrec: [`);
    for (const term of o.terms) lines.push(emitTerm(term));
    lines.push(`      ],`);
  }
  lines.push(`    },`);
  return lines.join("\n");
}

const peak = (terms, key) =>
  terms.reduce((max, t) => Math.max(max, Math.abs(t[key] ?? 0)), 0);

async function loadKernel(url = PCK_URL, localFile = process.env.PCK_FILE) {
  if (localFile) {
    return fs.readFileSync(localFile, "utf8");
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} → HTTP ${response.status}`);
  }
  // Casa: um redirect que troque de host entregaria um "kernel" de outra
  // origem sob a URL da NAIF (checklist pré-fusão, item 13).
  const hostPedido = new URL(url).host;
  const hostFinal = new URL(response.url).host;
  if (hostFinal !== hostPedido) {
    throw new Error(
      `${url} redirecionou para ${response.url} — host diferente do pedido, recusado`
    );
  }
  const text = await response.text();
  // A proxy error page would parse to zero assignments and emit an empty
  // catalog, which reads as "these bodies have no solution" rather than as a
  // failed download.
  if (!text.startsWith("KPL/PCK")) {
    throw new Error(`${url} did not return a text PCK kernel`);
  }
  return text;
}

/**
 * `BODY<n>_RADII` for every known body, as the `[a, b, c]` triples
 * `subSolarPoint.test.ts` needs to convert a planetocentric latitude into the
 * planetodetic one Horizons reports. Same kernel, same run, so the figure a
 * comparison uses cannot drift from the pole it is comparing.
 */
function emitRadii(assignments, wanted) {
  console.log("// Triaxial radii (km), `BODY<n>_RADII`:");
  for (const [naifId, catalogId] of Object.entries(BODIES)) {
    if (wanted.size && !wanted.has(catalogId)) continue;
    const radii = coefficients(assignments, `BODY${naifId}_RADII`);
    if (radii.length < 3) continue;
    const [a, b, c] = radii;
    // A sphere contributes nothing to the conversion, so it is left out
    // rather than listed as an identity entry.
    if (Math.abs(c / a - 1) < 1e-4 && Math.abs(b / a - 1) < 1e-4) continue;
    console.log(`  ${catalogId}: [${a}, ${b}, ${c}],`);
  }
}

/**
 * Casa (obra 74b): `BODY<n>_GM` em km³/s², o bloco que cola em
 * `src/lib/atlas/massas.ts`.
 *
 * GM É O DADO, e massa/gravidade/escape são derivados dele — `g = GM/R²`,
 * `v_esc = √(2GM/R)`. Sem `G` no caminho o número vale o que o kernel vale;
 * com `G` (incerto na 5ª casa) a massa em quilos entraria como intermediária
 * de precisão pior do que a das duas contas que a usariam.
 *
 * Falta no kernel é FALTA e sai na cara — a linha vira comentário, e não uma
 * entrada com número de outra origem.
 */
function emitGm(assignments, wanted) {
  console.log("// `BODY<n>_GM` (km³/s²), gm_de440.tpc:");
  for (const [naifId, catalogId] of Object.entries(GM_BODIES)) {
    if (wanted.size && !wanted.has(catalogId)) continue;
    const gm = coefficients(assignments, `BODY${naifId}_GM`);
    if (gm.length < 1) {
      console.log(`  // ${catalogId}: SEM BODY${naifId}_GM no kernel`);
      continue;
    }
    console.log(`  ${catalogId}: ${gm[0]}, // BODY${naifId}_GM`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const radiiOnly = args.includes("--radii");
  const gmOnly = args.includes("--gm");
  const wanted = new Set(args.filter((a) => !a.startsWith("--")));

  if (gmOnly) {
    const kernelGm = await loadKernel(GM_URL, process.env.GM_FILE);
    const gmAssignments = parseKernel(kernelGm);
    console.log(`// Source: ${process.env.GM_FILE ?? GM_URL}`);
    console.log(`// ${gmAssignments.size} kernel assignments parsed\n`);
    emitGm(gmAssignments, wanted);
    return;
  }

  const kernel = await loadKernel();
  const assignments = parseKernel(kernel);

  console.log(`// Source: ${process.env.PCK_FILE ?? PCK_URL}`);
  console.log(`// ${assignments.size} kernel assignments parsed\n`);

  if (radiiOnly) {
    emitRadii(assignments, wanted);
    return;
  }

  const summary = [];

  for (const [naifId, catalogId] of Object.entries(BODIES)) {
    if (wanted.size && !wanted.has(catalogId)) continue;

    const o = deriveOrientation(assignments, Number(naifId));
    if (!o) {
      summary.push({ catalogId, naifId, missing: true });
      continue;
    }

    console.log(emitBlock(catalogId, naifId, o));
    console.log("");

    summary.push({
      catalogId,
      naifId,
      terms: o.terms.length,
      peakRa: peak(o.terms, "raAmpDeg"),
      peakDec: peak(o.terms, "decAmpDeg"),
      peakPm: peak(o.terms, "pmAmpDeg"),
      spinAccel: o.spinAccelDegPerDay2,
      unmodelled: o.unmodelled,
    });
  }

  console.log("// ====== summary (peak periodic amplitudes, degrees) ======");
  for (const s of summary) {
    if (s.missing) {
      console.log(`// ${s.catalogId} (${s.naifId}): NOT IN KERNEL`);
      continue;
    }
    const dropped =
      s.unmodelled.poleRaAccel || s.unmodelled.poleDecAccel
        ? `  !! UNMODELLED pole T² ra=${s.unmodelled.poleRaAccel} dec=${s.unmodelled.poleDecAccel}`
        : "";
    console.log(
      `// ${s.catalogId.padEnd(10)} ${String(s.naifId).padStart(3)}  terms=${String(s.terms).padStart(2)}` +
        `  peak ra=${s.peakRa.toFixed(4)} dec=${s.peakDec.toFixed(4)} pm=${s.peakPm.toFixed(4)}` +
        `  W''=${s.spinAccel}${dropped}`
    );
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
