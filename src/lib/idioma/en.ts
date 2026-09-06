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
  'hud.nome': 'SEA OF STARS',
  'app.descricao':
    'A cinematic journey through 18,543 stars of the HYG catalog and the whole Milky Way.',

  // ---- loading screen and veils ------------------------------------
  'hud.kicker': 'HYG · MILKY WAY · REAL TIME',
  'hud.telemetria.estrelas': 'HYG · 328,749 stars',
  'hud.telemetria.poeira': 'APOGEE dust · CO · H II',
  'hud.telemetria.aglomerados': 'clusters · Gaia DR3 Cepheids',
  'hud.etapaConta': 'stage {i} / {total}',
  'hud.etapaAnuncio': 'Stage {i} of {total} — {rotulo}',
  'hud.progressoCarregamento': 'Loading progress',
  'hud.falhaEmVoo': 'FAILURE IN FLIGHT',
  'hud.falhaNoBoot': 'STARTUP FAILURE',
  'hud.falhaEmVooTitulo': 'THE JOURNEY STOPPED',
  'hud.falhaNoBootTitulo': 'THE JOURNEY COULD NOT BEGIN',
  'hud.falhaEmVooNota': 'the scene stopped being drawn — reload to start again',
  'hud.falhaNoBootNota': 'the cartography stopped at stage {i}/{total} — {rotulo}',
  'hud.tentarNovamente': 'Try again',
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
  'hud.porta.filme': 'Start the journey',
  'hud.porta.filmeNota': 'a film with a script and captions — you watch',
  'hud.porta.explorar': 'Explore',
  'hud.porta.explorarNota': 'you fly the camera, with no script and no clock',
  'hud.porta.atlas': 'Enter the Atlas',
  'hud.porta.atlasNota': "today's sky: pick the date, visit the planets",
  'hud.duracao': 'a cinematic experience',
  'hud.duracaoCom': 'a cinematic experience · {min} min {seg} s',
  'hud.fim.deVoltaACasa': 'back home',
  'hud.fim.rodape':
    'named stars in real positions · Milky Way rebuilt from scientific data',
  'hud.fim.reviver': 'Watch it again',
  'hud.fim.ficarAqui': 'Stay here',
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

  // ---- the control bar ---------------------------------------------
  'barra.ajustes': '⚙ Settings',
  'barra.ajustesAria': 'Rendering settings',
  'barra.reviver': '↻ Replay',
  'barra.entrarNoAtlas': 'Enter the Atlas',
  'barra.verOFilme': '▶ Watch the film',
  'barra.verOFilmeAria': 'Watch the film from the beginning',
  'barra.explorarAtlas': '↗ Explore',
  'barra.explorarAria': 'Explore the galaxy',
  'barra.voltarAoFilme': '↩ Back to the film',
  'barra.retomar': '⏵ Resume',
  'barra.pausar': '⏸ Pause',
  'barra.retomarAria': 'Resume the journey',
  'barra.pausarAria': 'Pause the journey',
  'barra.velocidadeAria': 'Playback speed',
  'barra.velocidadeDica': '← → skip chapters',
  'barra.verAGalaxia': 'Show the galaxy',
  'barra.explorar': 'Explore',
  'barra.qualidadeAria': 'Graphics quality',
  'barra.alcasAria': 'Atlas controls',

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
  'ajustes.tom.aces': 'compresses and desaturates the highlights',
  'ajustes.tom.agx': 'keeps chroma, darkens',
  'ajustes.tom.neutral': 'middle ground',
  'ajustes.tom.linear': 'no curve — clips, shows the raw frame',
  'ajustes.exposicao': 'Exposure',
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
  'ajustes.particulasControle': 'Galaxy particles',
  'ajustes.particulasNota':
    'How many of the loaded particles the scene draws, with total brightness compensated: fewer points, each stronger — same flux, different grain.',
  'ajustes.particulas.todas': 'All',
  'ajustes.particulas.metade': 'Half',
  'ajustes.particulas.quarto': '¼',
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
  'ajustes.reverConvite': 'see the walkthrough again',
  'ajustes.copiado': 'copied',
  'ajustes.copiarLink': 'copy a link to this moment',

  // ---- the layer drawer and the seal -------------------------------
  'atlas.camadasAria': 'Scene layers',
  'atlas.camadas': 'Layers',
  'atlas.camadasBotao': '⧉ Layers',
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
  'atlas.tempoBotao': '⏱ Time',
  'atlas.fecharTempo': 'Close the time machine',
  'atlas.voltarNoTempo': 'Go back in time',
  'atlas.pararOTempo': 'Stop time',
  'atlas.avancarNoTempo': 'Go forward in time',
  'atlas.taxaAria': 'Time speed: {taxa}. Click for the next step.',
  'atlas.aoVivo': 'Live',
  'atlas.aoVivoAria': 'Follow real time',
  'atlas.epoca': 'Epoch',
  'atlas.epocaAria': 'Back to the instant of the 2026 portrait',

  // ---- the search palette ------------------------------------------
  'busca.titulo': 'Search',
  'busca.aria': 'Search for a target',
  'busca.botao': '⌕ Search',
  'busca.botaoAria': 'Search for a star',
  'busca.botaoDica': 'search — press / (or Ctrl+K)',
  'busca.fechar': 'Close the search',
  'busca.lista': 'Targets found',
  'busca.campoCorposEEstrelas': 'search for a body or a star',
  'busca.campoEstrelas': 'search for a star',
  'busca.campoAria':
    'Name of a body in the system, or name, designation or catalog of the star',
  'busca.ajuda':
    'Type the name of a body in the system, or the name, designation (gamma vel) or catalog (hd 48915) of a star — {exemplos}. The catalog keeps one name per star, its own when it has one.',
  'busca.alcanceComCorpos': 'the {quantas} named stars and the {corpos} bodies of the system',
  'busca.alcance': 'the {quantas} named stars',
  'busca.vazio': 'nothing by that name among {alcance} — try {exemplos}',
  'busca.contagem': '{n} {palavra} · arrows choose · Enter {verbo}',
  'busca.resultado': 'result',
  'busca.resultados': 'results',
  'busca.verboEnquadra': 'frames it',
  'busca.verboAtlas': 'opens the atlas on it',
  'busca.verboVoa': 'flies there',
  'busca.dica': 'name, designation (gamma vel) or catalog (hd 48915) · {exemplos}',
  'busca.exemploCorpo': 'earth',

  // ---- the gesture walkthrough -------------------------------------
  'convite.olhar': 'drag to look around',
  'convite.voar': 'w a s d to fly · q e to rise and sink',
  'convite.visitar': 'click a name to visit the star',
  'convite.girar': 'drag to orbit whatever is in frame',
  'convite.roda': 'the wheel moves closer to and away from the chosen object',
  'convite.pinca': 'a two-finger pinch moves closer and away',
  'convite.escolherMouse': 'click a name to choose the object',
  'convite.escolherToque': 'tap a name to choose the object',
  'convite.irMouse': 'double-click to travel to it',
  'convite.irToque': 'double-tap to travel to it',
  'convite.conta': '{n} of {total}',
  'convite.pular': 'skip',
  'convite.continuar': 'next',
  'convite.entendi': 'got it',

  // ---- the object fact sheet ---------------------------------------
  'ficha.aria': 'Fact sheet: {nome}',
  'ficha.fechar': 'Close the fact sheet',
  'ficha.aproximar': '⊕ Closer',
  'ficha.aproximarAria': 'Closer: frame {nome} up close',
  'ficha.sistema': '⌂ System',
  'ficha.sistemaAria': 'Back to the solar system framing',
  'ficha.relevoDaCor': '◐ Invented relief',
  'ficha.relevoDaCorAria':
    "Turn on relief invented from the colour of {nome}'s photo — there is no relief map",

  // ---- section titles and field labels -----------------------------
  'ficha.secao.agora': 'right now',
  'ficha.secao.fisico': 'physical',
  'ficha.secao.orbita': 'orbit',
  'ficha.secao.ceu': 'in the sky',
  'ficha.secao.contexto': 'context',
  'ficha.secao.curiosidades': 'trivia',
  'ficha.secao.imagem': 'the image',
  'ficha.secao.estrela': 'the star',
  'ficha.campo.distanciaDe': 'distance — {pai}',
  'ficha.campo.velocidadeOrbital': 'orbital speed',
  'ficha.campo.iluminadoDaqui': 'lit from here',
  'ficha.campo.raio': 'radius (equator)',
  'ficha.campo.gravidade': 'gravity',
  'ficha.campo.escape': 'escape velocity',
  'ficha.campo.massa': 'mass',
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
  'ficha.campo.oDefeito': 'the flaw',
  'ficha.campo.superficie': 'surface',
  'ficha.campo.relevo': 'relief',
  'ficha.campo.oRelevoAdmite': 'the relief admits',
  'ficha.campo.forma': 'shape',
  'ficha.campo.designacao': 'designation',
  'ficha.campo.distancia': 'distance',
  'ficha.campo.magnitude': 'apparent magnitude',
  'ficha.campo.tipoEspectral': 'spectral type',
  'ficha.campo.corBV': 'B−V color',
  'ficha.campo.temperatura': 'temperature',
  'ficha.campo.catalogos': 'catalogs',
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
  'ficha.fonte.semLicenca': 'no texture with a settled license',
  'ficha.fonte.larguraPx': '{px} px wide',
  'ficha.fonte.catalogoHyg': 'HYG/AT-HYG catalog',
  'ficha.fonte.bayerIau': 'Bayer, IAU abbreviation',
  'ficha.fonte.paralaxe': 'Gaia DR3 parallax',
  'ficha.fonte.ballesteros': 'from B−V, after Ballesteros',
  'ficha.semMapa': "no map: this body's color and relief are invented",
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
  'selo.tier.derivadoOQue': 'color and temperature from a model',
  'selo.tier.artistico': 'artistic',
  'selo.tier.artisticoOQue': "the Sun's disk, the glare and the diffraction spikes",
  'selo.cartografiaProcedural': 'cartography: procedural (the maps did not arrive)',
  'selo.cartografiaDesligada':
    'cartography: procedural (maps turned off by ?cart=off)',
  'selo.luzAssistida':
    'every world you visit is exposed for the light IT receives — a photograph taken there, not with the settings of Earth. The true order of brightness stays in the sky, at the point of each body.',
  'selo.lanterna':
    'Reading lamp {porcento} %: a faint light at the camera keeps the night side legible.',
  'selo.exposicaoDoReal':
    'exposure time +{passos} stops: the frame is a long photograph. The light of each world is still physics — what opened was the shutter, and that is why the background sky burns brighter.',
  'selo.esteGlobo': 'This globe: {passos} stops of light above the physical light.',
  'selo.desvio.exp': 'exposure set by hand',
  'selo.desvio.tone': 'tone curve changed',
  'selo.desvio.doseDoSol': 'the opening shows the Sun cleaner than the date asks for',
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
  'selo.desvio.particulas': 'galaxy particles set by hand',
  'selo.desvio.particulasCom': 'galaxy particles set by hand: {nivel}',

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
  'unidade.vezesTerra': '{n}× Earth',

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
  'dica.atlas.girar': 'drag — orbit',
  'dica.atlas.pinca': 'pinch — zoom',
  'dica.atlas.roda': 'wheel — zoom',
  'dica.atlas.escolherToque': 'tap — choose',
  'dica.atlas.irToque': 'double tap — go',
  'dica.atlas.escolherEVoltar': 'click — choose · esc — back',

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
