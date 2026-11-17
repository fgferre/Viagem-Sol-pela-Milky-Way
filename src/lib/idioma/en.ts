// ============================================================
// THE en TABLE — the same keys as `pt.ts`, tipada contra ele.
//
// `Record<keyof typeof PT, string>` é a guarda: chave nova em `pt.ts`
// sem par aqui NÃO COMPILA. É o que substitui o "arquivo de tradução
// que envelhece calado" das bibliotecas de i18n.
//
// O QUE MUDA ALÉM DAS PALAVRAS, e por isso a tabela não é uma troca 1:1:
//  · a ORDEM da data por extenso (`tempo.data`: "January 1, 2026");
//  · o PLURAL das unidades — em pt-BR o plural começa em 2 ("1,5
//    ano-luz"), em inglês em qualquer coisa que não seja 1 exato
//    ("1.5 light-years"). Quem escolhe a chave é `lib/unidades.ts`;
//  · o separador DECIMAL (ponto) e o de MILHAR (vírgula), que não
//    passam por aqui: `lib/idioma.decimalDoIdioma` decide;
//  · a posição do "de/of" nos contadores ("Step 3 of 7").
//
// Os nomes próprios que a casa cita (Gaia DR3, HYG, APOGEE, ACES, AgX)
// não se traduzem: são catálogos e curvas, não palavras.
//
// A VARIANTE É AMERICANA (item 130/F4), e não é gosto: a prosa das
// fichas em `editorial.en` é o ORIGINAL do dono, escrito em americano, e
// a NASA — a fonte de quase toda atribuição desta casa — também. Duas
// variantes na mesma tela ("colour" no selo, "color" na ficha ao lado)
// leem como descuido. Então: color/center/catalog/license/disk, nunca
// colour/centre/catalogue/licence/disc. Vale aqui, nas legendas do filme
// (`three/cinematic/roteiros/*.json`) e no inglês do manifesto de
// texturas (`scripts/data/atlas/texturas-em-ingles.mjs`).
// ============================================================
import type { PT } from './pt';

export const EN: Record<keyof typeof PT, string> = {
  // ---- the app -----------------------------------------------------
  'app.titulo': 'Sea of Stars — A Journey through the Milky Way',
  'hud.nome': 'Sea of Stars',
  'app.descricao':
    'A cinematic journey through 18,543 stars of the HYG catalog and the whole Milky Way.',

  // ---- loading screen and veils ------------------------------------
  'hud.kicker': 'HYG · MILKY WAY · REAL TIME',
  'hud.etapaAnuncio': 'Stage {i} of {total} — {rotulo}',
  'hud.progressoCarregamento': 'Loading progress',
  'hud.carga.cruzeiro': 'Southern Cross',
  'hud.carga.escorpiao': 'Scorpius',
  'hud.carga.sagitario': 'Sagittarius',
  'hud.carga.voceEstaAqui': 'the Sun · you are here',
  'hud.carga.contador': '{n} of {total} stars',
  'hud.falhaEmVoo': 'FAILURE IN FLIGHT',
  'hud.falhaNoBoot': 'STARTUP FAILURE',
  'hud.falhaEmVooTitulo': 'The journey stopped',
  'hud.falhaNoBootTitulo': 'The journey could not begin',
  'hud.falhaEmVooNota': 'the scene stopped being drawn — reload to start again',
  'hud.falhaNoBootNota': 'the cartography stopped at stage {i}/{total} — {rotulo}',
  'hud.tentarNovamente': 'Try again',
  'hud.falhaDetalhes': 'Technical details',
  'hud.fatalTick': 'The Journey stopped drawing: ',
  'hud.semWebgl2':
    'This browser only has WebGL 1, and the Journey needs WebGL 2 to draw the galaxy. Update the browser (or turn hardware acceleration on) and try again.',
  'hud.semWebgl':
    'This browser has no usable WebGL — the Journey needs it to draw the galaxy. Update the browser or turn hardware acceleration on and try again.',
  'hud.fatalContexto':
    'The graphics card gave up drawing the Journey — the browser took the 3D context away from this page.',
  'hud.abertura.linha1':
    'from the Sun to the supergiants of Orion, to the heart of the galaxy — and back',
  'hud.abertura.linha2':
    '328,749 cataloged stars · volumetric Milky Way rebuilt in real time',
  'hud.porta.explorarNota': 'you fly the camera, with no script and no clock',
  'hud.porta.voo': 'Free flight',
  'hud.porta.atlas': 'Explore the Atlas',
  'hud.porta.atlasNota': "today's sky: visit the planets and run the clock",
  'hud.duracaoCom': '{min} min {seg} s',
  'hud.duracaoMin': '{min} min',
  'hud.filme.galactico.titulo': 'Galactic journey',
  'hud.filme.galactico.nota': 'from the Sun to the galactic center — and back',
  'hud.filme.solar.titulo': 'Solar journey',
  'hud.filme.solar.nota': 'from the Sun to Saturn, until Earth is a dot',
  'hud.filme.estelar.titulo': 'Stellar journey',
  'hud.filme.estelar.nota': 'the life of a star, told by the Sun’s neighbors',
  'hud.fim.deVoltaACasa': 'back home',
  // EACH FILM'S END SCREEN (`Filme.encerramento`, `cinematic/filme.ts`): the
  // galactic one keeps its quotation in the closing script and only the
  // footnote is a key (below); the solar one says its own line and credit.
  // PROVISIONAL — the film's thesis line and the data provenance, until the
  // new script is final.
  'hud.fim.rodape':
    'named stars in real positions · Milky Way rebuilt from scientific data',
  'hud.fim.solar.linha': 'One fire. Each world does something different with it.',
  'hud.fim.solar.credito':
    'real positions for January 2026 · spacecraft maps, rebuilt',
  'hud.fim.estelar.linha': 'Every star is a place.',
  'hud.fim.estelar.credito': 'stars, clusters and nebula in their real places · surfaces from each star’s measurements',
  'hud.fim.reviver': 'Watch it again',
  'hud.fim.ficarAqui': 'Stay in this sky',
  'hud.progressoDaViagem': 'Journey progress',
  'hud.capituloDeTotal': '{n} of {total} — {texto}',
  'hud.capitulos': '{total} chapters',

  // ---- loading stages ----------------------------------------------
  'etapa.catalogs': 'receiving the catalogs…',
  'etapa.stars': 'waking 328,749 stars…',
  'etapa.dust': 'baking the disk dust…',
  'etapa.structure': 'fitting arms and warp…',
  'etapa.galaxy': 'seeding the galactic disk…',
  'etapa.layers': 'revealing the disk slices…',
  'etapa.shaders': 'compiling the shaders…',

  // ---- the control bar -----------------------------------------------
  // GLYPHS ARE GONE (Lote 4, item 2): `<Icone>` (SVG) draws next to plain
  // text now, the same swap Lote 2b already made for Search/Layers/Time.
  // Only the FILM's own buttons (`barra.reviver`, `barra.retomar`,
  // `barra.pausar`) keep glyph+text — out of this lote's scope.
  'barra.ajustes': 'Settings',
  'barra.ajustesAria': 'Rendering settings',
  'barra.reviver': '↻ Replay',
  'barra.entrarNoAtlas': 'Enter the Atlas',
  // FREE FLIGHT HAS A WAY BACK (item 2): a button beside ↻ Replay in the
  // free-flight bar, calling the SAME `entrarNoAtlas` as the opening
  // door and the pause-and-look "Enter the Atlas".
  'barra.atlas': 'Atlas',
  'barra.atlasAria': 'Back to the Atlas',
  // THE FILMS TO CHOOSE FROM ("More" and Atlas): the name comes from the
  // film itself (`hud.filme.*.titulo`); only what the button tells a
  // screen reader lives here.
  'barra.filmeAria': '{nome} — watch from the beginning',
  'barra.filmeTocandoAria': '{nome} — playing now',
  'barra.explorarAtlas': 'Free flight',
  'barra.explorarAria': 'Leave for free flight',
  // "RESUME", not "Back to the film" anymore (item 2, mockup §3.2: "↩
  // Resume"). The KEY stays — it names the DESTINATION, not the label. On
  // mobile the mode buttons (the films, free flight and this one) are
  // icon-only since 10-05 — the names clipped at 320 px inside the 44 px row
  // of item 6 —: the full name goes in the `aria-label` and the `title`, so
  // there is no SHORT key.
  'barra.voltarAoFilme': 'Resume',
  'barra.retomar': 'Resume',
  'barra.pausar': 'Pause',
  'barra.retomarAria': 'Resume the journey',
  'barra.pausarAria': 'Pause the journey',
  'barra.velocidadeAria': 'Playback speed',
  'barra.velocidadeDica': '← → skip chapters',
  'barra.verAGalaxia': 'Go to the galaxy',
  'barra.explorar': 'Free flight',
  // THE FILM'S "MORE" (E1) — the films, Layers, quality and Settings
  // collapse behind a single trigger, closed on every load; the label
  // stays short because the `aria-label` below already says what it opens.
  'barra.mais': 'More',
  'barra.maisAria': 'Show the films, Layers, quality and Settings',
  'barra.qualidadeAria': 'Graphics quality',
  'barra.alcasAria': 'Atlas controls',
  'barra.reguaAria': 'Atlas tools',

  // ---- the brand and the context line (Lote 4, item 2) ----------------
  // "Sea of Stars", the same name `app.titulo` already uses in English.
  'marca.nome': 'Sea of Stars',
  'contexto.viaLactea': 'The Milky Way',
  'contexto.grupoLocal': 'Local Group',
  'contexto.sistemaSolar': 'Solar System',

  // ---- the settings panel ------------------------------------------
  'ajustes.titulo': 'Settings',
  'ajustes.aria': 'Rendering settings',
  'ajustes.fechar': 'Close settings',
  // the "?" button label on each row — the fine print left the flow and
  // became an on-demand tip (panel redesign, 05/09)
  'ajustes.ajuda': 'Help: {rotulo}',
  'ajustes.idioma': 'Language',
  'ajustes.idiomaNota': "Switches the app's language right now, with no reload.",
  'ajustes.tom': 'Tone curve',
  'ajustes.tomNota':
    'Decides what happens to everything above 1. It changes chroma and dynamic range — a choice, not a measurement.',
  'ajustes.tom.aces': 'the previous tone; fades the highlights',
  'ajustes.tom.agx': 'keeps chroma, darkens',
  'ajustes.tom.neutral': 'the default; keeps the bodies’ colour',
  'ajustes.tom.linear': 'no curve — clips, shows the raw frame',
  'ajustes.exposicao': 'Exposure',
  'ajustes.lente': 'Lens',
  'ajustes.lenteNota':
    'Cinema lens reflections when the camera looks at the Sun. Spherical: subtle round reflections. Anamorphic: the blue horizontal streak and oval reflections. Hollywood (default; in Performance quality the lens starts off): the movie flare, with golden rays, a rainbow halo and many reflections. None: the usual image. In the films, each scene uses the director\'s lens.',
  'ajustes.lente.nenhuma': 'None',
  'ajustes.lente.redonda': 'Spherical',
  'ajustes.lente.anamorfica': 'Anamorphic',
  'ajustes.lente.hollywood': 'Hollywood',
  'ajustes.forcaDaLente': 'Lens strength',
  'ajustes.qualidade': 'Quality',
  'ajustes.qualidadeNota':
    'Switches live, with no reload. The heavy part — the galaxy population and the Sun — is rebuilt in the background and swapped in at once; until then the scene stays as it is. Auto lets the measurement choose — and nobody chooses for you without that click.',
  'ajustes.avancado': 'Advanced',
  // SHORT LABEL (polish 09/06): the row is now a single line with a
  // fixed control column — "Edge smoothing" didn't fit beside the "?".
  'ajustes.msaa': 'Anti-aliasing',
  'ajustes.msaaNota':
    'Smooths the edges of bodies and lines, and it costs frames. Switch here and compare with the frames/s just above — the change is immediate, with no reload. "From preset" hands the choice back to quality.',
  'ajustes.preset': 'Preset',
  'ajustes.msaaDesligada': 'Off',
  // SHORT LABEL (polish 09/06): "(raymarch)" was engine jargon, not
  // taste — it stays in the tooltip for whoever wants it.
  'ajustes.nebulosaControle': 'Nebula',
  'ajustes.nebulosaNota':
    'The gas of the Milky Way is drawn step by step, and it is the most expensive part of the frame. Fewer steps leave the cloud flatter and grainier; more steps make it smooth and cost frames.',
  'ajustes.nebulosa.baixa': 'Low',
  'ajustes.nebulosa.media': 'Medium',
  'ajustes.nebulosa.alta': 'High',
  'ajustes.escalaDeResolucao': 'Resolution scale',
  'ajustes.escalaDeResolucaoNota':
    'How many pixels the scene draws, as a fraction of your screen. 50% draws a quarter of the pixels — the strongest lever here, and the one that blurs edges the most. Text and controls keep their size.',
  'ajustes.gasControle': 'Volumetric gas',
  'ajustes.gasNota':
    'How the gas of the Milky Way is computed: original redoes everything every step; fine bakes most of it and keeps two fine details live; soft bakes everything and is the cheapest.',
  'ajustes.gas.antigo': 'Original',
  'ajustes.gas.fino': 'Fine',
  'ajustes.gas.macio': 'Soft',
  // THE EARTH (clouds round, 10/07) — next to the gas: compare live the
  // usual globe with the one that has depth in clouds and relief.
  'ajustes.terraControle': 'Earth',
  'ajustes.terraNota':
    'How the Earth globe is drawn: classic is the usual one; with depth gives the clouds a shadow on the ground, relief from the light and, in Cinema, the cloud map at 8k.',
  'ajustes.terra.classica': 'Classic',
  'ajustes.terra.profundidade': 'With depth',
  // THE EARTH'S RELIEF (item 232, owner's decision 10/08) — right below
  // the Earth: enhanced is a DECLARED mode, and the number comes from the
  // house factor.
  'ajustes.relevoControle': 'Earth relief',
  'ajustes.relevoNota':
    'Real draws the mountains at their measured heights. Enhanced multiplies the heights by {fator} so the relief shows from afar — a declared mode: the seal and the Earth\'s card say it is on. Only applies to the Earth with depth.',
  'ajustes.relevo.real': 'Real',
  'ajustes.relevo.realcado': 'Enhanced {fator}×',
  // THE DUST NEAR HOME (owner's request, 09/27) — the sixth control,
  // next to the gas: compare live the current procedural model with
  // the Gaia-measured block, in three brightnesses.
  'ajustes.poeira': 'Dust near home',
  'ajustes.poeiraNota':
    "Soft, Medium and Strong: the Gaia-measured block (Edenhofer 2024) to 1.2 kpc, in three brightnesses; Today is the current invented gas, for comparison",
  'ajustes.poeira.hoje': 'Today',
  'ajustes.poeira.suave': 'Soft',
  'ajustes.poeira.media': 'Medium',
  'ajustes.poeira.forte': 'Strong',
  'ajustes.particulasControle': 'Galaxy particles',
  'ajustes.particulasNota':
    'How many of the loaded particles the scene draws, with total brightness compensated: fewer points, each stronger — same flux, different grain.',
  'ajustes.particulas.todas': 'All',
  'ajustes.particulas.metade': 'Half',
  'ajustes.particulas.quarto': '¼',
  'ajustes.galaxiaControle': 'Galaxy',
  'ajustes.galaxiaNota':
    'How the galaxy seen from outside is drawn. WebGPU: tens of millions of particles. WebGL: the same particles, fewer of them (the fallback without WebGPU). Classic: the old one, with painted layers. On Preset the app tries them in that order and marks the one drawing now.',
  'ajustes.galaxia.webgpu': 'WebGPU',
  'ajustes.galaxia.particulas': 'WebGL',
  'ajustes.galaxia.classica': 'Classic',
  'ajustes.lab.titulo': 'Galaxy lab',
  'ajustes.lab.grupo.webgpu': 'WebGPU engine · the galaxy seen from outside',
  'ajustes.lab.grupo.webgl': 'WebGL particles · inside the disc and on the way out',
  'ajustes.lab.bloqueio.classica': 'Off: the Classic galaxy is not made of particles.',
  'ajustes.lab.bloqueio.semWebgpu': 'Off: WebGL is drawing now. To use these, choose WebGPU under Galaxy.',
  'ajustes.lab.bloqueio.teto':
    'Most children and Children reach: off, because at this Point ceiling no children are left. Raise the ceiling to use them.',
  'ajustes.lab.aplicando': 'applying…',
  'ajustes.lab.voltar': 'Back to default',
  'ajustes.lab.todas': 'All',
  'ajustes.lab.milhoes': '{n} million',
  'ajustes.lab.filhas': 'Children per particle',
  'ajustes.lab.filhasNota':
    'Each particle becomes several fainter neighbours carrying the same total light: the galaxy looks smoother and fuller, and the frame gets heavier.',
  'ajustes.lab.borrifo': 'Point drawing',
  'ajustes.lab.borrifo.0': 'Tent',
  'ajustes.lab.borrifo.1': 'Spray',
  'ajustes.lab.borrifoNota':
    'Tent shares each point\'s light among neighbouring pixels: the picture stays calm while the camera moves. Spray drops each point on one random pixel: lighter and sharper when still, but the galaxy "boils" in motion.',
  'ajustes.lab.filtro': 'Grain filter',
  'ajustes.lab.filtro.1': 'On',
  'ajustes.lab.filtro.0': 'Off',
  'ajustes.lab.filtroNota':
    'A very light blur before the final colour: it halves the flicker in motion. Off, the galaxy is sharper and grainier.',
  'ajustes.lab.lod': 'Detail from afar',
  'ajustes.lab.lodNota':
    'How many particles per pixel are enough when the galaxy is far away. Fewer is lighter and grainier; "All" always draws every particle. With 2 draws the difference only shows from far away, mostly with "All".',
  'ajustes.lab.fatia': 'Dust refresh',
  'ajustes.lab.fatiaNota':
    'Every how many frames the dust shadow on each particle is recomputed. 1 is the most exact and the heaviest; 8 is light, but in a fast flight the shadow lags a little.',
  'ajustes.lab.sorteios': 'Galaxy draws',
  'ajustes.lab.sorteiosNota':
    'How many times the galaxy is drawn from the model, about 4 million particles each. More draws: more real particles and a finer picture, with more memory and a heavier frame. It takes a few seconds; the old galaxy stays on screen until the new one arrives.',
  'ajustes.lab.lodrho': 'Point density',
  'ajustes.lab.lodrhoNota':
    'How many points per pixel WebGL tries to put on screen. More is smoother and heavier. With each quality\'s point ceiling the ceiling decides: on Cinema the image does not change, on High and Performance it changes a little. With a higher Point ceiling it acts fully.',
  'ajustes.lab.lodk': 'Most children',
  'ajustes.lab.lodkNota':
    'Up to how many neighbours each particle can become when the camera gets close. 1 turns children off: loose points up close. It only shows with a higher Point ceiling (with each quality\'s own, children go first).',
  'ajustes.lab.lodmax': 'Point ceiling',
  'ajustes.lab.lodmaxNota':
    'The most points per frame, in millions. Above it the children go first and the grain grows. Higher is sharper and heavier.',
  'ajustes.lab.lodpiso': 'Point softness',
  'ajustes.lab.lodpisoNota':
    'How far each point spreads when the point ceiling bites. Higher makes the galaxy smoother and less sandy, and the frame heavier.',
  'ajustes.lab.lodesp': 'Children reach',
  'ajustes.lab.lodespNota':
    'How far from the parent particle the children land. Little: clumps of light; a lot: a smoother veil. It only shows when there are children, that is, with a higher Point ceiling.',
  'ajustes.texto': 'Text size · {degrau}',
  'ajustes.textoNota':
    'Applies to the whole HUD — captions, controls, seal and the star names. It does not touch the scene: inside the Atlas the framing backs off a little so the larger text does not cover the target.',
  'ajustes.rotulos3d': 'Beta · 3D labels',
  'ajustes.rotulos3dNota':
    'Body names become text inside the scene itself, with depth — the look of the sister project. Who shows up is still decided by the same rules as always, and the ring is still what the click targets. Works in the Atlas; experimental.',
  'ajustes.desligados': 'Off',
  'ajustes.ligados': 'On',
  'ajustes.convite': 'Walkthrough',
  'ajustes.conviteNota': 'The three free-flight gestures, pointed out on screen.',
  'ajustes.reverConvite': 'See the walkthrough again',
  'ajustes.copiado': 'Copied ✓',
  'ajustes.copiarLink': 'Copy a link to this moment',
  'ajustes.copiaFalhou': "Couldn't copy automatically. Copy the address:",

  // ---- the layer drawer and the seal -------------------------------
  'atlas.camadasAria': 'Scene layers',
  'atlas.camadas': 'Layers',
  'atlas.camadasBotao': 'Layers',
  'atlas.fecharCamadas': 'Close layers',
  'atlas.familiaConta': '{familia}: {ligadas} of {total} layers on',
  'atlas.seloAria': 'Honesty seal for this view',
  'atlas.eixoEscala': 'scale',
  'atlas.eixoBrilho': 'brightness',
  'atlas.escalaRealAria': '{estado}: what dominates the frame is at 1:1',
  'atlas.foraDeEscalaAria':
    "{estado}: the Sun's disk in this view is an actor. Click to frame the system at real scale",
  'atlas.escalaRealNota': 'the frame is at 1:1',
  'atlas.escalaDesvioNota': 'click: frame at real scale',
  'atlas.brilhoRealAria': '{estado}: {exposicao} Click to bring the assisted light back.',
  'atlas.brilhoSemAjuste': 'nothing was adjusted in this view.',
  'atlas.brilhoDesvioAria': '{estado}.{exposicao} Adjusted: {lista}.{volta}',
  'atlas.voltarAoReal': ' Click to go back to real brightness.',
  'atlas.voltarAAssistida': ' Click to bring the assisted light back.',
  'atlas.semAjuste': 'the house photometry, unadjusted',
  'atlas.cliqueAssistida': '{oQueSeVe} — click: bring the assisted light back',
  'atlas.cliqueReal': 'click: back to real — {oQueSeVe}',
  'atlas.endireitar': 'Level the horizon',
  'atlas.instanteDoCeu': 'sky time',
  'atlas.maquinaDoTempo': 'Time machine',
  'atlas.tempo': 'Time',
  'atlas.tempoBotao': 'Time',
  'atlas.fecharTempo': 'Close the time machine',
  // THE DESKTOP BAR TOGGLE AT REST (item A1.1) — the "SKY TIME" line
  // starts collapsed, and this pair of aria strings names what the
  // "▸"/"▾" button does, in the same mold as `atlas.fecharTempo`.
  'atlas.mostrarControlesDoTempo': 'Show the time controls',
  'atlas.esconderControlesDoTempo': 'Hide the time controls',
  'atlas.voltarNoTempo': 'Go back in time',
  'atlas.pararOTempo': 'Stop time',
  'atlas.avancarNoTempo': 'Go forward in time',
  'atlas.taxaAria': 'Time speed: {taxa}. Click for the next step.',
  'atlas.aoVivo': 'Live',
  'atlas.aoVivoAria': 'Follow real time',
  'atlas.epoca': 'Epoch',
  'atlas.epocaAria': 'Back to the instant of the 2026 portrait',
  // THE THREE ROW LABELS (`comRotulos`), sheet only — the desktop bar
  // skips them because the buttons themselves already say what each
  // group is.
  'atlas.tempoTransporte': 'Transport',
  'atlas.tempoVelocidade': 'Speed',
  'atlas.tempoReferencia': 'Reference',
  // The "?" in the gaveta header and the bar (redesign, the owner's
  // request: "apply the same pattern to the Time panel") — ≤45 words.
  'atlas.tempoAjuda':
    'The time machine moves the sky and the planets. ◀ ⏸ ▶ set the direction; the speed button cycles from real time to ~116 days per second. "Live" follows the visitor\'s clock; "Epoch" freezes the J2000 reference portrait. Ephemerides cover 1950–2050.',

  // ---- the search palette ------------------------------------------
  'busca.titulo': 'Search',
  'busca.aria': 'Search for a target',
  'busca.botao': 'Search',
  'busca.botaoAria': 'Search for a star',
  'busca.botaoDica': 'search — press / (or Ctrl+K)',
  'busca.fechar': 'Close the search',
  'busca.lista': 'Targets found',
  'busca.campoCorposEEstrelas': 'Search a destination…',
  'busca.campoEstrelas': 'Search a star…',
  'busca.campoAria':
    'Name of a body in the system, or name, designation or catalog of the star',
  'busca.ajuda':
    'Type the name of a body in the system, or the name, designation (gamma vel) or catalog (hd 48915) of a star — {exemplos}. The catalog keeps one name per star, its own when it has one.',
  'busca.vazio': 'Nothing by that name. Try Earth, Sirius or Andromeda.',
  'busca.contagem': '{n} {palavra} · arrows choose · Enter {verbo}',
  'busca.contagemToque': '{n} {palavra}',
  'busca.resultado': 'result',
  'busca.resultados': 'results',
  'busca.verboEnquadra': 'frames it',
  'busca.verboAtlas': 'opens the atlas on it',
  'busca.verboVoa': 'flies there',
  'busca.dica': 'name, designation (gamma vel) or catalog (hd 48915) · {exemplos}',
  'busca.exemploCorpo': 'earth',

  // ---- the destination cards of the empty search (Lote 6, §3.4) -----
  'busca.filtro.sistema': 'Solar System',
  'busca.filtro.estrelas': 'Stars',
  'busca.filtro.galaxia': 'Galaxy',
  'busca.filtrosAria': 'Destination category',
  'busca.destinosAria': 'Suggested destinations',
  'busca.limpar': 'Clear search',
  'busca.destino.earth': 'Where we start',
  'busca.destino.moon': 'Our nearest neighbour',
  'busca.destino.mars': 'The red planet, up close',
  'busca.destino.jupiter': 'The giant and its four moons',
  'busca.destino.saturn': 'The rings, up close',
  'busca.destino.pluto': 'The edge of the system',
  'busca.destino.voyager-1': 'The farthest human-made object',
  'busca.destino.halley': 'The most famous comet',
  'busca.destino.sirius': 'The brightest star in the sky',
  'busca.destino.betelgeuse': 'A supergiant in Orion',
  'busca.destino.rigil-kentaurus': 'The nearest star system',
  'busca.destino.trappist-1': 'Seven Earth-sized planets',
  'busca.destino.s2': 'The star that circles the black hole',
  // NO film promise (item 129/F5 still holds): the click here does the
  // SAME thing the "place" search entry already does — frames the
  // galactic centre in the Atlas, does not start the film.
  'busca.destino.sagittarius-a': 'The black hole at the centre of the galaxy',
  'busca.destino.via-lactea': 'The whole galaxy, from outside',
  'busca.destino.nosso-lugar': 'Where the Sun sits in the disc',
  'busca.destino.pleiades': 'The Seven Sisters, up close',
  'busca.destino.hyades': 'The open cluster nearest the Sun',
  'busca.destino.nebulosa-de-orion': 'A stellar nursery, lit from within',
  'busca.destino.ana-de-sagitario': 'A galaxy being swallowed by ours',
  'busca.destino.grande-nuvem-de-magalhaes': 'Our galaxy’s largest companion',
  'busca.destino.andromeda': 'The big spiral next door',

  // ---- the gesture walkthrough -------------------------------------
  'convite.olhar': 'drag to look around',
  'convite.voar': 'w a s d to fly · q e to rise and sink',
  'convite.visitar': 'click a name to visit the star',
  'convite.atlas.escolherMouse': 'click a name to choose it — double-click to travel there',
  'convite.atlas.escolherToque': 'tap a name to choose it — double-tap to travel there',
  'convite.atlas.gestosMouse': 'drag to orbit · the wheel zooms · shift + drag tilts the view',
  'convite.atlas.gestosToque': 'drag to orbit · pinch to zoom · two fingers up tilt the view',
  'convite.atlas.busca': "or open Search for ready-made trips, like Saturn's rings",
  'convite.conta': '{n} of {total}',
  'convite.pular': 'skip',
  'convite.continuar': 'next',
  'convite.entendi': 'got it',

  // ---- the object fact sheet ---------------------------------------
  'ficha.aria': 'Fact sheet: {nome}',
  'ficha.aba': 'Info',
  'ficha.abaSemAlvo': 'Fact sheet (choose an object)',
  'ficha.fechar': 'Close the fact sheet',
  'ficha.aproximar': 'Closer',
  'ficha.aproximarAria': 'Closer: frame {nome} up close',
  'ficha.sistema': 'System',
  'ficha.sistemaAria': 'Back to the solar system framing',
  'ficha.aneis': 'Rings',
  'ficha.aneisAria': "Rings: enter the layer of ice in {nome}'s rings",
  'ficha.relevoDaCor': '◐ Invented relief',
  'ficha.relevoDaCorAria':
    "Turn on relief invented from the colour of {nome}'s photo — there is no relief map",
  // The "?" in the header (redesign, the owner's request: "apply the same
  // pattern to the fact sheet") — ≤40 words, plus the
  // sentence on the seal in parts (16/10/2026).
  'ficha.ajuda':
    "Each seal says where the number comes from: measured is a number from the cited source; derived is calculated from measured ones; artistic is a declared illustration or invention. The '×Terra' beside a value compares it with Earth's own figure. When a seal comes in parts, each percentage is a share of the area.",
  // ---- the fact sheet on phone: compact/expanded (Lote 5, PLAN-UI.md §7)
  'ficha.detalhes': 'Details',
  'ficha.detalhesAria': 'View the full fact sheet',
  'ficha.recolher': 'Collapse',
  'ficha.recolherAria': 'Collapse to the summary sheet',
  'ficha.lerMais': 'Read more',
  // ---- the empty fact sheet and the load failures (Lote 5, §7/§9) --
  'ficha.vazia': 'This place has no data sheet yet.',
  'ficha.erroDados':
    "This object's card didn't load. It is still in the sky, with its image and orbit.",
  'ficha.erroTextura':
    "This object's texture didn't load; it shows in its base colour. The data below still stands.",
  'ficha.tentarDeNovo': 'Try again',

  // ---- section titles and field labels -----------------------------
  'ficha.secao.agora': 'right now',
  'ficha.secao.fisico': 'physical',
  'ficha.secao.aneis': 'the rings',
  'ficha.secao.orbita': 'orbit',
  'ficha.secao.ceu': 'in the sky',
  'ficha.secao.contexto': 'context',
  'ficha.secao.curiosidades': 'trivia',
  'ficha.secao.imagem': 'the image',
  'ficha.secao.estrela': 'the star',
  'ficha.secao.lugar': 'the place',
  'ficha.secao.sonda': 'now',
  'ficha.secao.missao': 'the mission',
  'ficha.secao.cometa': 'now',
  'ficha.secao.orbitaDoCometa': 'the orbit',
  'ficha.secao.oCometa': 'the comet',
  'ficha.secao.sistemaPlanetario': 'the planetary system',
  'ficha.secao.exoplaneta': 'the planet',
  'ficha.secao.oQueSeVe': 'what you see here',
  // The reference follows an em dash, as in mockups m3/m13 ("Distance —
  // Sun"): no preposition, no article, so one label fits Sun, Earth and
  // Saturn in both languages. The old "to the {pai}" (Lote 5) was right
  // for the Sun and wrong for every planet ("to the Mars").
  'ficha.campo.distanciaDe': 'Distance — {pai}',
  'ficha.campo.velocidadeOrbital': 'orbital speed',
  'ficha.campo.iluminadoDaqui': 'lit from here',
  'ficha.campo.raio': 'radius (equator)',
  'ficha.campo.gravidade': 'gravity',
  'ficha.campo.escape': 'escape velocity',
  'ficha.campo.massa': 'mass',
  'ficha.anel.extensao': 'extent',
  'ficha.anel.extensaoValor':
    "≈ 280,000 km from edge to edge: the outer edge of the A ring lies 136,775 km from Saturn's centre, and the F ring 140,180 km",
  'ficha.anel.extensaoFonte': 'stellar and radio occultations (Voyager and Cassini)',
  'ficha.anel.espessura': 'thickness',
  'ficha.anel.espessuraValor': '≈ 10 m, from 5 to 30 m depending on the region',
  'ficha.anel.pedacos': 'particles',
  'ficha.anel.pedacosValor': 'from ~1 cm to ~10 m, of water ice',
  'ficha.anel.massaValor': '≈ {massa}, about {fracao} of the mass of Mimas',
  'ficha.campo.periodo': 'orbital period',
  'ficha.campo.afelioPerielio': 'aphelion · perihelion',
  'ficha.campo.excentricidade': 'eccentricity',
  'ficha.campo.diaSideral': 'sidereal day',
  'ficha.valor.faixa': '{min} to {max}',
  'ficha.valor.retrogrado': '{dia} (retrograde)',
  'ficha.campo.modeloEValidade': 'model and validity',
  'ficha.campo.elongacao': 'elongation from the Sun',
  'ficha.campo.discoIluminado': 'illuminated disk',
  'ficha.campo.oQueE': 'what it is',
  'ficha.campo.emUmaLinha': 'in one line',
  'ficha.campo.curiosidade': 'trivia',
  'ficha.campo.fato': 'fact',
  'ficha.campo.recorde': 'record',
  'ficha.campo.exploracao': 'exploration',
  'ficha.campo.fonte': 'source',
  'ficha.campo.licenca': 'license',
  'ficha.campo.atribuicao': 'attribution',
  'ficha.campo.fonteDoRelevo': 'relief source',
  'ficha.campo.relevo': 'relief',
  'ficha.campo.relevoRealcado': 'enhanced relief',
  'ficha.relevoRealcado':
    'heights are drawn {fator}× taller than measured — on sunlit slopes and in the mountains\' shadows; the sea stays flat. The map described below is still the measured one, with no exaggeration: the enhancement is in the drawing only, and turns off in Settings.',
  'ficha.campo.forma': 'shape',
  'ficha.campo.cor': 'color',
  'ficha.campo.brilho': 'brightness',
  'ficha.forma.elipsoide': 'ellipsoid of the measured axes',
  'ficha.forma.elipsoideComAltura':
    'ellipsoid of the measured axes, deformed by the relief height map',
  'ficha.relevo.naoSeAplica': 'does not apply: what you see is atmosphere',
  'ficha.relevo.liso':
    'no relief map: the sphere is smooth, and the shading you see is in the image itself',
  'ficha.relevo.semMapa': 'no relief map: what you see is the code-made mesh, not a measurement',
  'ficha.relevo.semDefeito': 'measured relief map; the workbench found no flaw',
  'ficha.cor.foto': 'true-color photo, measured mean — {fonte}',
  'ficha.cor.tinta': "the photo's pattern in gray, tinted with the measured color — {fonte}",
  'ficha.cor.esculpido': 'regolith-family color, no map — {fonte}',
  'ficha.cor.foraDaRegua':
    "the photos' color, not leveled: the composite Earth (surface, clouds, sea) stays outside the ruler that levels the other bodies",
  'ficha.brilho.medido': 'measured albedo p0 = {p0}{ressalvas} — {fonte}',
  'ficha.brilho.picoPorModelo':
    'albedo p0 = {p0}, with the opposition surge removed by a model{ressalvas} — {fonte}',
  'ficha.brilho.estimado': 'albedo p0 = {p0}, estimated from the measurements{ressalvas} — {fonte}',
  'ficha.brilho.mediaEstimada': '; the regolith family reaches it through an estimated mean',
  'ficha.brilho.gama': '; map contrast ×{gama} so it does not blow out',
  'ficha.brilho.foraDaRegua':
    'no target albedo: the composite Earth (surface, clouds, sea) stays outside the ruler that levels the other bodies',
  'ficha.campo.designacao': 'designation',
  'ficha.campo.distancia': 'distance',
  'ficha.campo.magnitude': 'apparent magnitude',
  'ficha.campo.tipoEspectral': 'spectral type',
  'ficha.campo.corBV': 'B−V color',
  'ficha.campo.temperatura': 'temperature',
  'ficha.campo.catalogos': 'catalogs',
  'ficha.lugar.doSolAoCentro': 'Sun to centre',
  'ficha.lugar.tamanho': 'size',
  'ficha.lugar.idade': 'age',
  'ficha.lugar.membros': 'stars',
  'ficha.lugar.orbita': 'galactic orbit',
  'ficha.lugar.nucleo': 'core',
  'ficha.lugar.noCatalogo': 'in the app’s catalogue',
  'ficha.lugar.naCena': 'what you see here',
  'ficha.lugar.massa': 'mass',
  'ficha.lugar.horizonte': 'event horizon',
  'ficha.lugar.sombra': 'shadow',
  'ficha.lugar.anelEht': 'what the EHT saw',
  'ficha.lugar.estrelaS2': 'the star S2',
  'ficha.lugar.luz': 'the light we see left it',
  'ficha.lugar.periodo': 'one orbit',
  'ficha.lugar.periastro': 'closest to the hole',
  'ficha.lugar.velocidade': 'speed',
  'ficha.lugar.desvioParaOVermelho': 'redshift',
  'ficha.lugar.precessao': 'precession',
  'ficha.lugar.estrela': 'the star',
  'ficha.sonda.doSol': 'distance from the Sun',
  'ficha.sonda.luz': 'light takes, from here to Earth',
  'ficha.sonda.velocidade': 'speed relative to the Sun',
  'ficha.sonda.lancamento': 'launch',
  'ficha.sonda.sobrevoo': '{corpo} flyby',
  'ficha.sonda.heliopausa': 'crossed the heliopause',
  'ficha.sonda.estado': 'status on {data}',
  'ficha.sonda.trajetoria': 'the trajectory',
  'ficha.sonda.foraDaJanela': 'on this date the spacecraft had not been launched yet',
  'ficha.sonda.depoisDaJanela': 'the app’s table runs until 2040',
  'ficha.sonda.naCena': 'what you see here',
  'ficha.sonda.naCena.valor': 'an instrument-sized marker, not the spacecraft — it is a few metres across',
  'ficha.cometa.doSol': 'distance from the Sun',
  'ficha.cometa.daTerra': 'distance from Earth',
  'ficha.cometa.velocidade': 'speed relative to the Sun',
  'ficha.cometa.atividade': 'activity',
  'ficha.cometa.ativo': 'active: the ice sublimates, and the coma and tails are lit',
  'ficha.cometa.inativo': 'inactive: too far from the Sun for water ice to sublimate',
  'ficha.cometa.naCena': 'what you see here',
  'ficha.cometa.naCena.valor':
    'the position is measured (JPL elements); the coma and tails are physics computed here, particle by particle — dust pushed by sunlight, ions carried by the solar wind, gas breaking apart —, with boosted brightness; up close, the light adapts to distance (like an eye), the coma near the nucleus is the same law summed along the line of sight, and the nucleus relief is illustrative (size and albedo are measured); from afar, the nucleus is a marker',
  'ficha.cometa.naCena.inativo':
    'the position is measured (JPL elements); too far from the Sun, it is dark: no coma and no tails, only the nucleus — up close, the nucleus relief is illustrative (size and albedo are measured); from afar, the nucleus is a marker',
  'ficha.cometa.ultimo': 'last perihelion',
  'ficha.cometa.proximo': 'next perihelion',
  'ficha.cometa.perielio': 'perihelion distance',
  'ficha.cometa.periodo': 'period',
  'ficha.cometa.semVolta': 'never returns: the orbit is a hyperbola (e = {e})',
  'ficha.cometa.excentricidade': 'eccentricity',
  'ficha.cometa.limite': 'how far it holds',
  'ficha.cometa.limite.valor':
    'osculating conic of {data}: far from that date, Jupiter and the nucleus’s own jets change the orbit — measured against Horizons on 12 Nov 2026, the error is 0.001 to 0.01 AU',
  'ficha.cometa.designacao': 'designation',
  'ficha.cometa.nucleo': 'nucleus',
  'ficha.cometa.descoberta': 'discovery',
  'ficha.cometa.brilho': 'brightness (M1, K1)',
  'ficha.cometa.fama': 'why it is famous',
  'ficha.fonte.elementos': 'computed from JPL Horizons elements',
  'ficha.fonte.modeloDeAtividade': 'water sublimation, Marsden et al. (1973)',
  'ficha.fonte.modeloDasCaudas': 'Finson & Probstein (1968); Haser (1957); the app’s brightness gain',
  'ficha.fonte.horizons': 'JPL Horizons, retrieved on {data}',
  'ficha.fonte.arquivoDeExoplanetas': 'NASA Exoplanet Archive, retrieved on {data}',
  'ficha.exo.zonaPresa': 'the formula only holds for stars from {a} to {b} K; for this star, the zone drawn is an extrapolation',
  'ficha.exo.metodo.transito': 'transit',
  'ficha.exo.metodo.velocidadeRadial': 'radial velocity',
  'ficha.exo.metodo.imagem': 'direct imaging',
  'ficha.exo.planetas': 'known planets',
  'ficha.exo.nenhum': 'none confirmed',
  'ficha.exo.comoAchados': 'how they were found',
  'ficha.exo.zonaHabitavel': 'habitable zone',
  'ficha.exo.historia': 'the story',
  'ficha.exo.sistemaNaCena':
    'the measured orbits, in AU and true to scale; the habitable zone (the green ring) computed from the star’s light; what the planets look like is not known',
  'ficha.exo.distancia': 'distance from its star',
  'ficha.exo.comoMercurio': '{ua} · {k}× Mercury’s from the Sun',
  'ficha.exo.comoTerra': '{ua} · {k}× Earth’s from the Sun',
  'ficha.exo.tamanho': 'size (radius)',
  'ficha.exo.massa': 'mass',
  'ficha.exo.terras': '{v} × Earth',
  'ficha.exo.jupiteres': '{v} × Jupiter ({terras} Earths)',
  'ficha.exo.massaMinima': 'at least {v} (only M·sin i is measured)',
  'ficha.exo.temperatura': 'equilibrium temperature',
  'ficha.exo.fonte.equilibrio': 'from the star’s light and the distance, with no atmosphere and an assumed albedo (NASA Exoplanet Archive)',
  'ficha.exo.zona.dentro': 'inside',
  'ficha.exo.zona.dentroDaBorda': 'outside: closer to the star than the inner edge',
  'ficha.exo.zona.alemDaBorda': 'outside: beyond the outer edge',
  'ficha.exo.descoberta': 'discovery',
  'ficha.exo.situacao': 'status',
  'ficha.exo.confirmado': 'confirmed',
  'ficha.exo.contestado': 'controversial: the archive flags the planet as disputed',
  'ficha.exo.orbita': 'the orbit',
  'ficha.exo.orbita.valor': 'measured: period, distance and eccentricity, true to scale',
  'ficha.exo.orientacao': 'orientation in space',
  'ficha.exo.orientacao.valor': 'inclination {i}; node {nodo}',
  'ficha.exo.medida': '{v}, measured',
  'ficha.exo.convencional': '{v}, convention (not measured)',
  'ficha.exo.fonte.convencao': 'the app’s convention, for lack of a measurement',
  'ficha.exo.fase': 'position on the orbit',
  'ficha.exo.fase.transito': 'real: from the transit of {data}',
  'ficha.exo.fase.conjuncao': 'real: from the conjunction of {data}, by radial velocity',
  'ficha.exo.fase.arbitraria': 'arbitrary: no published conjunction time',
  'ficha.exo.zona.naCena': 'the green ring, computed from the star’s luminosity and temperature',
  'ficha.exo.aparencia': 'appearance',
  'ficha.exo.aparencia.medida':
    'measured colour: deep blue (albedo 0.40 in blue, under 0.12 in green); red was not measured',
  'ficha.exo.classe': 'class',
  'ficha.exo.classe.lava': 'lava world',
  'ficha.exo.classe.rochosoQuente': 'hot rocky planet',
  'ficha.exo.classe.rochosoTemperado': 'temperate rocky planet',
  'ficha.exo.classe.gelado': 'icy world',
  'ficha.exo.classe.subnetuno': 'sub-Neptune',
  'ficha.exo.classe.giganteQuente': 'hot gas giant',
  'ficha.exo.classe.giganteFrio': 'gas giant',
  'ficha.exo.nuvens.1': 'ammonia clouds',
  'ficha.exo.nuvens.2': 'water clouds',
  'ficha.exo.nuvens.3': 'cloudless, scattering blue',
  'ficha.exo.nuvens.4': 'alkali metals, almost cloudless',
  'ficha.exo.nuvens.5': 'silicate clouds',
  'ficha.exo.travado': 'tidally locked: the same side always faces the star',
  'ficha.exo.fonte.classe': 'decided by radius, mass, density and temperature: {fontes}',
  'ficha.exo.fonte.equilibrioCalculada':
    'computed here, because the archive does not list it: Teff·√(R⋆/2a), from the star’s temperature and radius and the distance, with no atmosphere and zero albedo',
  'ficha.exo.giro': 'spin',
  'ficha.exo.giro.medido': 'one turn every {h} h, from the broadening of the spectral lines',
  'ficha.exo.giro.terra': 'assumed: one turn every {h} h, Earth’s day',
  'ficha.exo.giro.netuno': 'assumed: one turn every {h} h, Neptune’s day',
  'ficha.exo.giro.jupiter': 'assumed: one turn every {h} h, Jupiter’s day',
  'ficha.exo.fonte.giro': 'this planet’s spin has not been measured; the scene uses that of a similar Solar System planet',
  'ficha.exo.superficie': 'surface',
  'ficha.exo.superficie.rochoso':
    'imagined from the class: oxidised-rock highlands, old lava plains, craters and ice where airless ground would stay below thawing; brightness raised for the visit',
  'ficha.exo.superficie.quente':
    'imagined from the class: bare, dark basalt with old lava plains and craters, no ice (inside the habitable zone’s edge water is lost); brightness raised for the visit',
  'ficha.exo.superficie.gelado':
    'imagined from the class: bright, smooth ice scored by fractures like Europa’s, few craters and frost at the poles; brightness raised for the visit',
  'ficha.exo.superficie.lava':
    'imagined from the class: dark crust cracked by lava fissures where the ground would pass the melting of rock; each fissure’s colour is its temperature’s by Planck’s law, and the brightness is compressed for the visit',
  'ficha.exo.superficie.gas':
    'imagined from the class: bands, streaks and storms in the colours of the cloud class; brightness raised for the visit',
  'ficha.exo.superficie.gasMedida': 'imagined: bands, streaks and storms; only the colour is measured',
  'ficha.exo.fonte.imaginada':
    'the app’s drawing from the class; no telescope has resolved the disk. The light is the star’s, with the eye half adapted to its colour',
  'ficha.fonte.daTrajetoria': 'computed from the Horizons trajectory',
  'ficha.fonte.reguaDeEscala': 'the app’s scale rule',
  'ficha.secao.companheira': '{nome} (white dwarf)',
  'ficha.secao.companheiraDoPar': '{nome} (the other star of the pair)',
  'ficha.campo.raioSolar': 'radius',
  'ficha.campo.luminosidade': 'luminosity',
  'ficha.campo.rotacao': 'rotation',
  'ficha.campo.idade': 'age',
  'ficha.campo.achatamento': 'flattening',
  'ficha.campo.raioPolar': 'polar radius',
  'ficha.campo.raioEquatorial': 'equatorial radius',
  'ficha.campo.temperaturaPolo': 'temperature at the pole',
  'ficha.campo.temperaturaEquador': 'temperature at the equator',
  'ficha.campo.inclinacaoDoEixo': 'axis tilt',
  'ficha.campo.bordaDifusa': 'edge',
  'ficha.campo.separacaoMedia': 'mean separation',
  'ficha.campo.corEBrilho': 'color and brightness',
  'ficha.campo.tamanhoNaImagem': 'size',
  'ficha.campo.desenhoDaSuperficie': 'surface pattern',
  'ficha.estrela.raioEmKm': '{rsol} R☉ ≈ {km} km',
  'ficha.estrela.massaEmMsol': '{v} M☉',
  'ficha.estrela.luminosidadeEmLsol': '{v} L☉',
  'ficha.estrela.idadeEmGa': '{v} billion years',
  'ficha.estrela.vistaPeloPolo': '{graus}°: seen almost pole-on',
  'ficha.estrela.vistaPeloEquador': '{graus}°: seen almost equator-on',
  'ficha.estrela.inclinacaoEntreEixoESol': '{graus}° between the axis and the line to the Sun',
  'ficha.estrela.achatamentoEmPct': '{v} %',
  'ficha.estrela.achatamentoPeloMenos': 'at least {v} % (tilt not measured)',
  'ficha.estrela.giroPreso': ' — spin capped at 96 % of critical',
  'ficha.estrela.bordaDifusa': 'diffuse out to {raios} radii',
  'ficha.estrela.doTamanhoDaTerra': '≈ {km} km, Earth-sized',
  'ficha.estrela.separacaoEmUa': '{ua} au',
  'ficha.estrela.corPelaTemperatura': 'from the temperature (blackbody)',
  'ficha.estrela.corDeFiltroColorizado': 'colorized narrowband filter, like the Sun\'s, shifted by temperature',
  'ficha.estrela.tamanhoPeloRaio': 'the radius in this card',
  'ficha.campo.veu': 'veil of light',
  'ficha.campo.granulacao': 'granulation',
  'ficha.campo.vento': 'wind',
  'ficha.campo.formaDoDisco': 'disk thickness',
  'ficha.campo.discoDeGas': 'gas disk',
  'ficha.campo.regiaoDaLinha': 'Hα line region',
  'ficha.campo.brilhoDoGas': 'gas brightness',
  'ficha.campo.gasEmVolta': 'surrounding gas',
  'ficha.estrela.vento': 'loses {mdot} solar masses per year, in a wind of ~{v} km/s',
  'ficha.estrela.discoDeGas':
    'out to ~{raios} equatorial radii; measured from 2013 to the end of {ate}, and today\'s state has not been measured',
  'ficha.estrela.formaDoDisco':
    'half-opening of ~{graus}° at the base, flaring outward; the density falls with distance to the power {n}',
  'ficha.estrela.ventoDoModelo':
    'loses {mdot} solar masses per year (measured); the speed, ~{v} km/s, is that of the fitted model, not a direct measurement',
  'ficha.estrela.regiaoDaLinha': 'the hydrogen glows out to ~{raios} stellar radii',
  'ficha.estrela.regiaoDaLinhaDeRigel': 'out to ~{raios} stellar radii, the size measured in Rigel',
  'ficha.estrela.brilhoDoGas': 'the wind\'s emission measure, (Ṁ/v∞)²/R³, is {x} times Rigel\'s',
  'ficha.estrela.gasEmVolta':
    'shown as through a narrow hydrogen filter (Hα), which brings it out, with an instrument\'s 1% floor; the brightness, the halo\'s shape and the color brought onto the screen are a choice',
  'ficha.campo.pontoMaisQuente': 'hottest point',
  'ficha.estrela.veu':
    'more radiant than the Sun: the disk is shown at a lower exposure and the leftover light becomes a veil around it, as in a camera — the veil\'s strength and reach are a choice',
  'ficha.estrela.veuDaQuente':
    'the disk is shown at the exposure that leaves its hottest point just below white, like an instrument that scales to the peak; the leftover light becomes a veil around it, longer and bluish, as in a camera — the peak level and the veil\'s strength, reach and blue are a choice',
  'ficha.estrela.granulacaoExtrapolada':
    'the real one has ~{real} % contrast, invisible; drawn at the {piso} % floor so the surface does not come out smooth',
  'ficha.estrela.pontaDoPico':
    'the hottest part of the disk burns out to white, as on a camera sensor — how much is a choice',
  'ficha.estrela.superficieLisa':
    'smooth: too hot for visible granulation — the surface does not boil like the Sun\'s',
  'ficha.estrela.desenhoInventado':
    'granules, cells, spots and flares: the cell size follows the law in the data ({lei}), but the exact pattern is invented',
  'ficha.fonte.daEfemeride': 'from the ephemeris',
  'ficha.fonte.daCamera': "from the camera's point of view",
  'ficha.fonte.deGmEDoRaio': 'from GM and the radius',
  'ficha.fonte.deGm': 'from GM (gm_de440) and G',
  'ficha.fonte.dosElementos': 'from the house orbital elements',
  'ficha.fonte.minEMax': 'min and max of the orbit',
  'ficha.fonte.rotacaoIau': 'from the IAU rotation model',
  'ficha.fonte.geometrico': 'geometric, center to center',
  'ficha.fonte.editorial': 'editorial text, no source cited',
  'ficha.fonte.bancada': 'texture workbench',
  'ficha.fonte.modoDeclarado': 'declared mode, in Settings',
  'ficha.fonte.larguraPx': '{px} px wide',
  // one part of the image's mixed seal: the tier and the share of the area
  'ficha.parteDoSelo': '{tier} {porcento} %',
  'ficha.fonte.catalogoHyg': 'HYG/AT-HYG catalog',
  'ficha.fonte.bayerIau': 'Bayer, IAU abbreviation',
  'ficha.fonte.paralaxe': 'Gaia DR3 parallax',
  // the star with an imprecise parallax that took its cluster's distance
  'ficha.fonte.distanciaDoAglomerado': 'distance of the cluster ({aglomerado}), not of the star',
  'ficha.aglomerado.pleiades': 'Pleiades',
  'ficha.aglomerado.hyades': 'Hyades',
  'ficha.aglomerado.praesepe': 'Praesepe, M44',
  'ficha.aglomerado.m7': 'M7',
  'ficha.aglomerado.alfaPersei': 'Alpha Persei',
  'ficha.aglomerado.hPersei': 'h Persei',
  'ficha.aglomerado.chiPersei': 'chi Persei',
  'ficha.aglomerado.trapezio': 'Orion Trapezium',
  'ficha.fonte.ballesteros': 'from B−V, after Ballesteros',
  'ficha.fonte.sinteseDaLiteratura': 'summary of the literature',
  'ficha.hora': 'hour',
  'ficha.horas': 'hours',
  'ficha.dia': 'day',
  'ficha.dias': 'days',

  // ---- the honesty seal --------------------------------------------
  'selo.escalaReal': 'REAL SCALE',
  'selo.foraDeEscala': 'OUT OF SCALE',
  'selo.brilhoReal': 'REAL BRIGHTNESS',
  'selo.brilhoAssistido': 'ASSISTED BRIGHTNESS',
  'selo.tese': 'what in this view is adjusted and what is measured',
  'selo.tier.medido': 'measured',
  'selo.tier.medidoOQue': 'catalog and ephemeris',
  'selo.tier.derivado': 'derived',
  'selo.tier.derivadoOQue': 'color and temperature from a model; the galaxy, particles drawn from a model',
  'selo.tier.artistico': 'artistic',
  'selo.tier.artisticoOQue': "the Sun's disk, the glare and the diffraction spikes",
  'selo.cartografiaProcedural': 'cartography: procedural (the maps did not arrive)',
  'selo.cartografiaDesligada':
    'cartography: procedural (maps turned off by ?cart=off)',
  'selo.poeiraMedida': 'dust near home: measured (Gaia, Edenhofer 2024, to 1.2 kpc), with invented fine texture',
  'selo.poeiraSintetica':
    'dust near home: SYNTHETIC test volume (?poeira=teste), not Gaia',
  'selo.poeiraAusente': 'dust near home: procedural (the block did not arrive)',
  'selo.poeiraInativa': 'dust near home: procedural (the \'Original\' gas does not read the block)',
  'selo.poeiraCarregando': 'dust near home: loading the measured block',
  'selo.luzAssistida':
    'every world you visit is exposed for the light IT receives — a photograph taken there, not with the settings of Earth. The true order of brightness stays in the sky, at the point of each body.',
  'selo.lanterna':
    'Reading lamp {porcento} %: a faint light at the camera keeps the night side legible.',
  'selo.exposicaoDoReal':
    'exposure time +{passos} stops: the frame is a long photograph. The light of each world is still physics — what opened was the shutter, and that is why the background sky burns brighter.',
  'selo.esteGlobo': 'This globe: {passos} stops of light above the physical light.',
  'selo.desvio.exp': 'exposure set by hand',
  'selo.desvio.tone': 'tone curve changed',
  'selo.desvio.lente': 'cinema lens on: camera reflections, not the sky',
  'selo.desvio.doseDoSol': 'the opening shows the Sun cleaner than the date asks for',
  'selo.desvio.luzDoRoteiro': 'the light is in a scripted transition, between assisted and real',
  'selo.desvio.brilhoDoBuraco':
    "Sagittarius A✱'s disc is true to size, but its brightness is artistic: the real gas barely shines",
  'selo.desvio.amostragem': 'sampling below cinema',
  'selo.desvio.camada': 'layer turned off: {nome}',
  'selo.desvio.msaa': 'edge smoothing set by hand',
  'selo.desvio.msaaCom': 'edge smoothing set by hand: {amostras}',
  'selo.desvio.nebula': 'nebula set by hand',
  'selo.desvio.nebulaCom': 'nebula set by hand: {nivel}',
  'selo.desvio.escalaDeResolucao': 'resolution scale set by hand',
  'selo.desvio.escalaDeResolucaoCom': 'resolution scale set by hand: {fator}',
  'selo.desvio.gas': 'volumetric gas set by hand',
  'selo.desvio.gasCom': 'volumetric gas set by hand: {variante}',
  'selo.desvio.terra': 'Earth set by hand',
  'selo.desvio.terraCom': 'Earth set by hand: {variante}',
  'selo.desvio.relevo': 'Earth relief enhanced',
  'selo.desvio.relevoCom': 'Earth relief enhanced {fator}×',
  'selo.desvio.particulas': 'galaxy particles set by hand',
  'selo.desvio.particulasCom': 'galaxy particles set by hand: {nivel}',
  'selo.desvio.galaxia': 'galaxy set by hand',
  'selo.desvio.galaxiaCom': 'galaxy set by hand: {caminho}',
  'selo.desvio.laboratorio': 'galaxy tuned by hand',
  'selo.desvio.laboratorioCom': 'galaxy tuned by hand: {controle} {valor}',
  'selo.desvio.poeira': 'dust near home set by hand',
  'selo.desvio.poeiraCom': 'dust near home set by hand: {variante}',
  'selo.desvio.poeiraTeste': 'test (synthetic volume)',

  // ---- the scale accusation ----------------------------------------
  'escala.acusacao': '{nome} is {fator} larger',
  'escala.acusacaoDeBrilho': '{nome} emits {quanto}',
  'escala.brilhoDeAutor': "the author's brightness",
  'escala.naUnidadeDaCasa': 'in the house unit',
  'escala.maisLuz': 'more',
  'escala.menosLuz': 'less',
  'escala.vezesLuz': '{vezes}× {lado} light',
  'escala.magnitudes': '{mag} magnitudes {lado} light',
  'escala.raioDeAutor': "the author's radius",
  'escala.nome.sol': 'Sun',
  'escala.nome.sgr-a': 'Sagittarius A✱',

  // ---- layers, families and quality --------------------------------
  'familia.Galáxia': 'Galaxy',
  'familia.Estrelas': 'Stars',
  'familia.Sistema solar': 'Solar system',
  'camada.nogal': 'Galaxy (everything)',
  'camada.nodisc': 'Disc slices',
  'camada.nogdust': 'Extinction per particle',
  'camada.noglow': 'Bulge glow',
  'camada.nocart': 'Observed cartography',
  'camada.noco': 'CO clouds',
  'camada.noforge': 'Stellar forges',
  'camada.nonebula': 'Volumetric nebula',
  'camada.nowrap': 'Surrounding field',
  'camada.nodust': 'Nearby dust',
  'camada.nobh': 'Black hole (Sgr A✱)',
  'camada.noorbitass': 'S-star orbits',
  'camada.nocat': 'HYG catalog',
  'camada.nonomes': 'Names on screen',
  'camada.noclarao': 'Star glare',
  'camada.nosun': 'Sun',
  'camada.nomarker': 'Sun marker',
  'camada.noplan': 'Planets',
  'camada.noicones': 'Body icons',
  'camada.nocorpos': 'Bodies up close',
  'camada.noorbitas': 'Orbit lines',
  // THE NOTES (06/09) — the Ajustes pattern applied to the drawer: one
  // factual sentence under the "?", derived from what the flag actually
  // switches off in `director.ts` and the worlds it hides.
  'camada.nogal.nota':
    'Turns off the whole galaxy — every disc particle, the bulge and the Sun marker, in the outside view.',
  'camada.nodisc.nota':
    'Hides the volumetric disc slices of the galaxy, leaving only the star particles visible.',
  'camada.nogdust.nota':
    "Turns off the dimming of each galaxy particle by interstellar dust along the light's path to it.",
  'camada.noglow.nota':
    "Turns off the diffuse glow of the galactic bulge — the soft halo of light at the galaxy's center.",
  'camada.nocart.nota':
    "Turns off the galaxy's observed cartography: real molecular clouds drawn as 3D billboards in the disc.",
  'camada.noco.nota':
    'Turns off only the measured carbon-monoxide clouds — the real dark rifts of the Milky Way in the disc.',
  'camada.noforge.nota':
    "Turns off the stellar forges — mapped star-forming regions, visible in the galaxy's disc.",
  'camada.nonebula.nota':
    "Turns off the nebula's volumetric gas, visible up close inside the galaxy's disc.",
  'camada.nowrap.nota':
    'Turns off the procedural star field that fills the sky around the camera beyond the real catalogue.',
  'camada.nodust.nota':
    "Turns off the interstellar dust with parallax near the camera, visible while crossing the galaxy's disc.",
  'camada.nobh.nota':
    "Turns off the Sagittarius A* black hole, visible only up close, at the galaxy's center.",
  'camada.noorbitass.nota':
    "Turns off the lines of the measured orbits of the stars circling Sgr A✱, visible near the galaxy's centre.",
  'camada.nocat.nota':
    'Turns off the real star catalogue points (HYG), visible near the solar system.',
  'camada.nonomes.nota':
    'Turns off the names written over stars and bodies, across the whole scene.',
  'camada.noclarao.nota':
    'Turns off the strong glare of the featured stars and of the Sun.',
  'camada.nosun.nota':
    'Turns off the whole Sun — body and glare —, visible up close in the solar system.',
  'camada.nomarker.nota':
    'Turns off the "you are here" marker pointing to the Sun in the outside view of the galaxy.',
  'camada.noplan.nota': "Turns off the solar system's planets' photometric points.",
  'camada.noicones.nota':
    "Turns off the solar system's body icons, separate from their text names.",
  'camada.nocorpos.nota':
    'Turns off the 3D globes of bodies seen up close, distinct from the distant photometric points.',
  'camada.noorbitas.nota':
    "Turns off the solar system's orbit lines around the Sun.",
  'camada.nosondas': 'Spacecraft trajectories',
  'camada.nosondas.nota':
    'Turns off the path of the chosen spacecraft: travelled so far, solid; the rest until 2040, faint.',
  'camada.nocometas': 'Comet orbits',
  'camada.nocometas.nota': 'Turns off the orbit of the chosen comet.',
  'camada.nocaudas': 'Comet tails',
  'camada.nocaudas.nota':
    'Turns off the particle comae and tails of comets near the Sun — the heaviest effect in the solar system.',
  'camada.noexoplanetas': 'Exoplanet orbits',
  'camada.noexoplanetas.nota': 'Turns off the orbits and habitable zone of the nearby planetary system.',
  'qualidade.cinema': 'Cinema',
  'qualidade.alta': 'High',
  'qualidade.performance': 'Performance',
  'qualidade.auto': 'Auto',
  'qualidade.quadros': '{fps} frames/s',
  'qualidade.personalizado': '{tier} (Custom)',
  'qualidade.autoMedindo': 'Auto: quality is at {tier}, measuring the frame.',
  'qualidade.medindo': 'Quality {tier}, measuring the frame.',
  'qualidade.autoPousou': 'Auto: the measurement put quality at {tier}, at {quadros}.',
  'qualidade.confere': 'Quality {tier}, and the frame runs at {quadros}.',
  'qualidade.sugere': 'Quality {tier}, at {quadros} — {sugestao} should run better.',

  // ---- the class of a body -----------------------------------------
  'classe.estrela': 'star',
  'classe.planeta': 'planet',
  'classe.planeta anão': 'dwarf planet',
  'classe.lua': 'moon',
  'classe.asteroide': 'asteroid',
  'classe.buraco negro': 'black hole',
  'classe.aglomerado aberto': 'open cluster',
  'classe.nebulosa de emissão': 'emission nebula',
  'classe.galáxia espiral barrada': 'barred spiral galaxy',
  'classe.vista da galáxia': 'view of the galaxy',
  'classe.galáxia anã': 'dwarf galaxy',
  'classe.galáxia satélite': 'satellite galaxy',
  'classe.galáxia espiral': 'spiral galaxy',
  'classe.sonda': 'spacecraft',
  'classe.cometa': 'comet',
  'classe.cometa interestelar': 'interstellar comet',
  'classe.exoplaneta': 'exoplanet',

  // ---- the time machine --------------------------------------------
  'tempo.mes.0': 'January',
  'tempo.mes.1': 'February',
  'tempo.mes.2': 'March',
  'tempo.mes.3': 'April',
  'tempo.mes.4': 'May',
  'tempo.mes.5': 'June',
  'tempo.mes.6': 'July',
  'tempo.mes.7': 'August',
  'tempo.mes.8': 'September',
  'tempo.mes.9': 'October',
  'tempo.mes.10': 'November',
  'tempo.mes.11': 'December',
  'tempo.data': '{mes} {dia}, {ano}, {hh}:{mm}',
  'tempo.instanteIndefinido': 'undefined instant',
  'tempo.parado': 'stopped',
  'tempo.tempoReal': 'real time',
  'tempo.taxa': '{valor} {unidade} per second',
  'tempo.segundo': 'second',
  'tempo.segundos': 'seconds',
  'tempo.minuto': 'minute',
  'tempo.minutos': 'minutes',
  'tempo.hora': 'hour',
  'tempo.horas': 'hours',
  'tempo.dia': 'day',
  'tempo.dias': 'days',
  'tempo.ano': 'year',
  'tempo.anos': 'years',
  'tempo.semEfemeride': 'no ephemeris: the layer is frozen at the portrait',
  'tempo.buscando': 'fetching the ephemeris…',
  'tempo.foraDaJanela': 'outside {anos} TDB: the embedded table stops here',

  // ---- the units the visitor reads ---------------------------------
  'unidade.km': '{n} km',
  'unidade.milKm': '{n} thousand km',
  'unidade.ua': '{n} AU',
  'unidade.anoLuz': '{n} light-year',
  'unidade.anosLuz': '{n} light-years',
  'unidade.milAnosLuz': '{n} thousand light-years',
  'unidade.milhoesAnosLuz': '{n} million light-years',
  'unidade.vezesTerra': '{n}× Earth',

  // ---- what the numbers mean (Lote 4, item 5/§10) ---------------------
  'rotulo.distanciaDaqui': '{nota} from here',

  // ---- the always-on gesture hint ----------------------------------
  'cena.aria': 'Three-dimensional simulation of the journey through the HYG catalog and the Milky Way',
  'cena.sol': 'SUN · {nota}',
  'cena.lente': 'LENS {graus}° · SUN {nota}',
  'dica.toque.olhar': 'touch and drag — look',
  'dica.toque.visitar': 'tap a name — visit',
  'dica.mouse.olhar': 'drag — look',
  'dica.mouse.voar': 'wasd/qe — fly',
  'dica.mouse.rolarEVelocidade': 'z/x — roll · wheel — speed',
  'dica.mouse.visitar': 'click a name — travel to the star',
  'dica.captura.negada': 'this browser did not grant pointer capture',
  'dica.captura.capturado': 'pointer captured — esc releases it',
  'dica.captura.pedir': 'capture the pointer',
  'dica.pausado': 'drag — look around · space — resume the journey',

  // ---- the heading drawn over the scene ----------------------------
  'cena.rotulosIndisponiveis': '2D canvas unavailable for the labels.',

  // ---- ephemeris validity note (see pt.ts): the measured numbers are
  // verbatim; only the prose changes language. --------------------------
  'efemeride.nota.origemDoSistema':
    'origin reference of the solar system',
  'efemeride.nota.vsop87':
    'truncated VSOP87D series, arcsecond level between 2000 BC and 6000 AD',
  'efemeride.nota.plutoMeeus':
    'Meeus\'s Pluto theory (ch. 37), valid from 1885 to 2099',
  'efemeride.nota.elp':
    'truncated ELP/MPP02 (a few arcseconds over millennia)',
  'efemeride.nota.marcianas':
    'two-body Kepler from the osculating elements of 2025-01-01; worst case 3.6° within ±1 year of the epoch, measured on BOTH sides (Phobos, published mean motion; a short-period resonant moon does not hold up under two-body over ±1 year), no validation outside that range',
  'efemeride.nota.galileanas':
    'two-body Kepler from the osculating elements of 2025-01-01; worst case 1.6° within ±1 year of the epoch, measured on BOTH sides (Europa), no validation outside that range',
  'efemeride.nota.saturnianas':
    'two-body Kepler from the osculating elements of 2025-01-01; worst case 5.2° within ±1 year of the epoch, measured on BOTH sides (Mimas, published mean motion; a short-period resonant moon does not hold up under two-body over ±1 year), no validation outside that range',
  'efemeride.nota.uranianas':
    'two-body Kepler from the osculating elements of 2025-01-01; worst case 1.3° within ±1 year of the epoch, measured on BOTH sides (Miranda), no validation outside that range',
  'efemeride.nota.netunianas':
    'two-body Kepler from the osculating elements of 2025-01-01; worst case 0.16° at +1 year from the epoch (one side only — there is no fixture before the epoch), no validation outside that range',
  'efemeride.nota.plutonianas':
    'two-body Kepler from the osculating elements of 2025-01-01; worst case 0.01° at +1 year from the epoch (one side only — there is no fixture before the epoch), no validation outside that range',
  'efemeride.nota.asteroides':
    'two-body Kepler from the osculating elements of 2025-01-01; ~0.01° near the epoch, extrapolated to ~1° at the 2000/2050 edges (the only check far from the epoch: 7.4° in 1890)',
  'efemeride.nota.luaDeCatalogo':
    'catalog orbit by Kepler; plane orientation and phase FABRICATED (Ω/ω/M0 = 0) — draws a plausible orbit, never predicts a position',
  'efemeride.anoAC':
    '{ano} BC',
  'efemeride.anoDC':
    '{ano} AD',
  'efemeride.foraDaTabela':
    'Outside {janela}: no embedded table — posicao() throws here. The {modelo} theory would cover {teoria}; regenerate the table to extend the window.',
  'efemeride.comTabela':
    '{modelo}: {nota}. Embedded table {janela} (theory valid {teoria}); measured Hermite interpolation ≤ {erro} AU (manifest).',
  'efemeride.semJanela':
    '{modelo}: {nota}.',
  'efemeride.foraDaJanela':
    'Outside {janela}: osculating elements frozen at 2025-01-01 extrapolated by two-body Kepler — accuracy not characterized here.',
  'efemeride.naJanela':
    '{modelo} (valid {janela}): {nota}.',
  'erro.renderizador': 'Could not create the renderer.',
  'erro.iniciar': 'Could not start the simulation.',
};
