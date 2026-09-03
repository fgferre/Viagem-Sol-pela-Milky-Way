// ============================================================
// A TABELA pt-BR — a língua da casa, e a FONTE das chaves.
//
// Cada valor aqui é, letra por letra, o texto que estava escrito no
// componente antes do item 130: a tabela nasceu de mudança de ENDEREÇO,
// não de redação. Chave nova nasce aqui primeiro; `en.ts` é tipado
// contra este objeto, então uma tradução que falte não compila.
//
// `{param}` é o buraco que `t()` preenche. Nome de parâmetro é palavra
// do assunto (`{nome}`, `{total}`), nunca posição — a ordem das palavras
// muda de língua para língua, e é exatamente essa mudança que uma tabela
// posicional perderia.
//
// O QUE NÃO ESTÁ AQUI, e é decisão: a prosa das fichas dos corpos
// (`public/data/atlas/corpos.json`) e as legendas do filme
// (`three/cinematic/roteiros/*.json`) moram no DADO, e as fases 2 e 3 do
// item 130 as traduzem lá. Texto de auditoria — o `cadastroDeRepresentacoes`,
// a `razao` de cada entrada de `escala.ts`, os rótulos das portas de
// depuração da URL — nunca chega ao visitante e continua só em pt.
// ============================================================

export const PT = {
  // ---- o app -------------------------------------------------------
  'app.titulo': 'Mar de Estrelas — Viagem pela Via Láctea',
  'hud.nome': 'MAR DE ESTRELAS',
  // a `<meta name="description">` do `index.html` — estática em pt-BR
  // para quem lê a página sem JS (buscador, prévia de link); o
  // `main.tsx` a reescreve quando a língua se resolve.
  'app.descricao':
    'Uma viagem cinematográfica por 18.543 estrelas do catálogo HYG e pela Via Láctea completa.',

  // ---- a tela de carregamento e os véus (`components/Hud.tsx`) ------
  'hud.kicker': 'HYG · VIA LÁCTEA · TEMPO REAL',
  'hud.telemetria.estrelas': 'HYG · 328.749 estrelas',
  'hud.telemetria.poeira': 'poeira APOGEE · CO · H II',
  'hud.telemetria.aglomerados': 'aglomerados · Cefeidas Gaia DR3',
  'hud.etapaConta': 'etapa {i} / {total}',
  'hud.etapaAnuncio': 'Etapa {i} de {total} — {rotulo}',
  'hud.progressoCarregamento': 'Progresso do carregamento',
  'hud.falhaEmVoo': 'FALHA DURANTE A VIAGEM',
  'hud.falhaNoBoot': 'FALHA DE INICIALIZAÇÃO',
  'hud.falhaEmVooTitulo': 'A VIAGEM PAROU',
  'hud.falhaNoBootTitulo': 'A VIAGEM NÃO PÔDE COMEÇAR',
  'hud.falhaEmVooNota': 'a cena deixou de ser desenhada — recarregue para começar de novo',
  'hud.falhaNoBootNota': 'a cartografia parou na etapa {i}/{total} — {rotulo}',
  'hud.tentarNovamente': 'Tentar novamente',
  'hud.fatalTick': 'A Viagem parou de desenhar: ',
  'hud.semWebgl2':
    'Este navegador só tem WebGL 1, e a Viagem precisa de WebGL 2 para desenhar a galáxia. Atualize o navegador (ou ative a aceleração de hardware) e tente de novo.',
  'hud.semWebgl':
    'Este navegador está sem WebGL utilizável — a Viagem precisa dele para desenhar a galáxia. Atualize o navegador ou ative a aceleração de hardware e tente de novo.',
  'hud.fatalContexto':
    'A placa de vídeo desistiu de desenhar a Viagem — o navegador tirou o contexto 3D desta página.',
  'hud.abertura.linha1': 'do Sol às supergigantes de Órion, ao coração da galáxia — e de volta',
  'hud.abertura.linha2':
    '328.749 estrelas de catálogo · Via Láctea volumétrica reconstruída em tempo real',
  'hud.porta.filme': 'Iniciar a viagem',
  'hud.porta.filmeNota': 'um filme com roteiro e legendas — você assiste',
  'hud.porta.explorar': 'Explorar',
  'hud.porta.explorarNota': 'você pilota a câmera, sem roteiro nem relógio',
  'hud.porta.atlas': 'Entrar no Atlas',
  'hud.porta.atlasNota': 'o céu de hoje: escolha a data, visite os planetas',
  'hud.duracao': 'experiência cinematográfica',
  'hud.duracaoCom': 'experiência cinematográfica · {min} min {seg} s',
  'hud.fim.deVoltaACasa': 'de volta a casa',
  'hud.fim.rodape':
    'estrelas nomeadas em posições reais · Via Láctea reconstruída a partir de dados científicos',
  'hud.fim.reviver': 'Reviver a viagem',
  'hud.fim.ficarAqui': 'Ficar aqui',
  'hud.progressoDaViagem': 'Progresso da viagem',
  'hud.capituloDeTotal': '{n} de {total} — {texto}',
  'hud.capitulos': '{total} capítulos',

  // ---- as etapas do carregamento (`three/director.ts`) --------------
  'etapa.catalogs': 'recebendo os catálogos…',
  'etapa.stars': 'acordando 328.749 estrelas…',
  'etapa.dust': 'assando a poeira do disco…',
  'etapa.structure': 'acoplando braços e warp…',
  'etapa.galaxy': 'semeando o disco galáctico…',
  'etapa.layers': 'revelando as lâminas do disco…',
  'etapa.shaders': 'compilando os shaders…',

  // ---- a barra de controles (`components/BarraOuAlcas.tsx`) ---------
  'barra.ajustes': '⚙ Ajustes',
  'barra.ajustesAria': 'Ajustes de renderização',
  'barra.reviver': '↻ Reviver',
  'barra.entrarNoAtlas': 'Entrar no Atlas',
  'barra.verOFilme': '▶ Ver o filme',
  'barra.verOFilmeAria': 'Ver o filme desde o começo',
  'barra.explorarAtlas': '↗ Explorar',
  'barra.explorarAria': 'Explorar a galáxia',
  'barra.voltarAoFilme': '↩ Voltar ao filme',
  'barra.retomar': '⏵ Retomar',
  'barra.pausar': '⏸ Pausar',
  'barra.retomarAria': 'Retomar a viagem',
  'barra.pausarAria': 'Pausar a viagem',
  'barra.velocidadeAria': 'Velocidade de reprodução',
  'barra.velocidadeDica': '← → pulam de capítulo',
  'barra.verAGalaxia': 'Ver a galáxia',
  'barra.explorar': 'Explorar',
  'barra.qualidadeAria': 'Qualidade gráfica',
  'barra.alcasAria': 'Controles do Atlas',

  // ---- o painel de ajustes (`components/Ajustes.tsx`) ---------------
  'ajustes.titulo': 'Ajustes',
  'ajustes.aria': 'Ajustes de renderização',
  'ajustes.fechar': 'Fechar ajustes',
  'ajustes.idioma': 'Idioma',
  'ajustes.idiomaNota': 'Troca a língua do app agora, sem recarregar nada.',
  'ajustes.tom': 'Curva de tom',
  'ajustes.tomNota':
    'Decide o que acontece com o que passa de 1. Muda croma e faixa dinâmica — é escolha, não medida.',
  'ajustes.tom.aces': 'comprime e dessatura os altos',
  'ajustes.tom.agx': 'preserva croma, escurece',
  'ajustes.tom.neutral': 'meio-termo',
  'ajustes.tom.linear': 'sem curva — estoura, mostra o cru',
  'ajustes.exposicao': 'Exposição',
  'ajustes.exposicaoCom': 'Exposição · {valor}',
  'ajustes.qualidade': 'Qualidade',
  'ajustes.qualidadeNota':
    'Troca ao vivo, sem recarregar. A parte pesada — a população da galáxia e o Sol — é refeita em segundo plano e entra de uma vez; até lá a cena continua como está. O auto deixa a medição escolher — e ninguém escolhe por você sem esse clique.',
  'ajustes.texto': 'Tamanho do texto · {degrau}',
  'ajustes.textoNota':
    'Vale para o HUD inteiro — legenda, controles, selo e os nomes das estrelas. Não mexe na cena: dentro do Atlas o enquadramento recua um pouco para o texto maior não cobrir o alvo.',
  'ajustes.rotulos3d': 'Beta · Rótulos 3D',
  'ajustes.rotulos3dNota':
    'Os nomes dos corpos viram texto dentro da própria cena, com profundidade — o visual do projeto irmão. Quem aparece continua sendo decidido pelas mesmas regras de sempre, e o anel segue sendo o alvo do clique. Vale no Atlas; experimental.',
  'ajustes.desligados': 'Desligados',
  'ajustes.ligados': 'Ligados',
  'ajustes.convite': 'Convite',
  'ajustes.conviteNota': 'Os três gestos do voo livre, apontados na própria tela.',
  'ajustes.reverConvite': 'rever o convite',
  'ajustes.copiado': 'copiado',
  'ajustes.copiarLink': 'copiar link deste instante',

  // ---- a gaveta de camadas e o selo (`components/HudDoAtlas.tsx`) ---
  'atlas.camadasAria': 'Camadas da cena',
  'atlas.camadas': 'Camadas',
  'atlas.camadasBotao': '⧉ Camadas',
  'atlas.fecharCamadas': 'Fechar camadas',
  'atlas.familiaConta': '{familia}: {ligadas} de {total} camadas ligadas',
  'atlas.seloAria': 'Selo de honestidade desta vista',
  'atlas.eixoEscala': 'escala',
  'atlas.eixoBrilho': 'brilho',
  'atlas.escalaRealAria': '{estado}: o que domina o quadro está em 1:1',
  'atlas.foraDeEscalaAria':
    '{estado}: o disco do Sol nesta vista é ator. Clique para enquadrar o sistema em escala real',
  'atlas.escalaRealNota': 'o quadro está em 1:1',
  'atlas.escalaDesvioNota': 'clique: enquadrar em escala real',
  'atlas.brilhoRealAria': '{estado}: {exposicao} Clique para voltar à luz assistida.',
  'atlas.brilhoSemAjuste': 'nada foi ajustado nesta vista.',
  'atlas.brilhoDesvioAria': '{estado}.{exposicao} Ajustado: {lista}.{volta}',
  'atlas.voltarAoReal': ' Clique para voltar ao brilho real.',
  'atlas.voltarAAssistida': ' Clique para voltar à luz assistida.',
  'atlas.semAjuste': 'a fotometria da casa, sem ajuste',
  'atlas.cliqueAssistida': '{oQueSeVe} — clique: voltar à luz assistida',
  'atlas.cliqueReal': 'clique: voltar ao real — {oQueSeVe}',
  'atlas.endireitar': 'Endireitar o horizonte',
  'atlas.instanteDoCeu': 'instante do céu',
  'atlas.maquinaDoTempo': 'Máquina do tempo',
  'atlas.tempo': 'Tempo',
  'atlas.tempoBotao': '⏱ Tempo',
  'atlas.fecharTempo': 'Fechar a máquina do tempo',
  'atlas.voltarNoTempo': 'Voltar no tempo',
  'atlas.pararOTempo': 'Parar o tempo',
  'atlas.avancarNoTempo': 'Avançar no tempo',
  'atlas.taxaAria': 'Velocidade do tempo: {taxa}. Clique para o próximo degrau.',
  'atlas.aoVivo': 'Ao vivo',
  'atlas.aoVivoAria': 'Seguir o tempo real',
  'atlas.epoca': 'Época',
  'atlas.epocaAria': 'Voltar ao instante do retrato de 2026',

  // ---- a paleta de busca (`components/PaletaDeBusca.tsx`) -----------
  'busca.aria': 'Buscar um alvo',
  'busca.botao': '⌕ Buscar',
  'busca.botaoAria': 'Buscar estrela',
  'busca.botaoDica': 'buscar — tecla / (ou Ctrl+K)',
  'busca.fechar': 'Fechar a busca',
  'busca.lista': 'Alvos encontrados',
  'busca.campoCorposEEstrelas': 'buscar um corpo ou uma estrela',
  'busca.campoEstrelas': 'buscar uma estrela',
  'busca.campoAria':
    'Nome de um corpo do sistema, ou nome, designação ou catálogo da estrela',
  'busca.alcanceComCorpos': 'as {quantas} nomeadas e os {corpos} corpos do sistema',
  'busca.alcance': 'as {quantas} nomeadas',
  'busca.vazio':
    'nada com esse nome entre {alcance} — o catálogo guarda UM nome por estrela, o próprio quando existe. tente {exemplos}',
  'busca.contagem':
    '{n} {palavra} · setas escolhem · Enter {verbo}',
  'busca.resultado': 'resultado',
  'busca.resultados': 'resultados',
  'busca.verboEnquadra': 'enquadra',
  'busca.verboAtlas': 'abre o atlas nele',
  'busca.verboVoa': 'voa até lá',
  'busca.dica': 'nome, designação (gama vel) ou catálogo (hd 48915) · {exemplos}',
  'busca.exemploCorpo': 'terra',

  // ---- o convite dos gestos (`components/Spotlight.tsx`) ------------
  'convite.olhar': 'arraste para olhar em volta',
  'convite.voar': 'w a s d para voar · q e para subir e descer',
  'convite.visitar': 'clique num nome para visitar a estrela',
  'convite.girar': 'arraste para girar em volta do que está em quadro',
  'convite.roda': 'a roda aproxima e afasta do objeto escolhido',
  'convite.pinca': 'a pinça de dois dedos aproxima e afasta',
  'convite.escolherMouse': 'clique num nome para escolher o objeto',
  'convite.escolherToque': 'toque num nome para escolher o objeto',
  'convite.irMouse': 'dois cliques para ir até ele',
  'convite.irToque': 'toque duas vezes para ir até ele',
  'convite.conta': '{n} de {total}',
  'convite.pular': 'pular',
  'convite.continuar': 'continuar',
  'convite.entendi': 'entendi',

  // ---- a ficha do objeto (`components/FichaDoObjeto.tsx`) -----------
  'ficha.aria': 'Ficha de {nome}',
  'ficha.fechar': 'Fechar a ficha',
  'ficha.aproximar': '⊕ Aproximar',
  'ficha.aproximarAria': 'Aproximar: enquadrar {nome} de perto',
  'ficha.sistema': '⌂ Sistema',
  'ficha.sistemaAria': 'Voltar ao enquadramento do sistema solar',

  // ---- os títulos de seção e os rótulos de campo (`lib/atlas/ficha.ts`)
  'ficha.secao.agora': 'agora',
  'ficha.secao.fisico': 'físico',
  'ficha.secao.orbita': 'órbita',
  'ficha.secao.ceu': 'no céu',
  'ficha.secao.contexto': 'contexto',
  'ficha.secao.curiosidades': 'curiosidades',
  'ficha.secao.imagem': 'a imagem',
  'ficha.secao.estrela': 'a estrela',
  'ficha.campo.distanciaDe': 'distância — {pai}',
  'ficha.campo.velocidadeOrbital': 'velocidade orbital',
  'ficha.campo.iluminadoDaqui': 'iluminado daqui',
  'ficha.campo.raio': 'raio (equador)',
  'ficha.campo.gravidade': 'gravidade',
  'ficha.campo.escape': 'velocidade de escape',
  'ficha.campo.massa': 'massa',
  'ficha.campo.periodo': 'período orbital',
  'ficha.campo.afelioPerielio': 'afélio · periélio',
  'ficha.campo.excentricidade': 'excentricidade',
  'ficha.campo.diaSideral': 'dia sideral',
  // as DUAS PONTAS da órbita numa linha só, e o sentido do giro: os dois
  // eram literal em `ficha.ts` até a varredura do 130 os achar
  'ficha.valor.faixa': '{min} a {max}',
  'ficha.valor.retrogrado': '{dia} (retrógrado)',
  'ficha.campo.modeloEValidade': 'modelo e validade',
  'ficha.campo.elongacao': 'elongação do Sol',
  'ficha.campo.discoIluminado': 'disco iluminado',
  'ficha.campo.oQueE': 'o que é',
  'ficha.campo.emUmaLinha': 'em uma linha',
  'ficha.campo.curiosidade': 'curiosidade',
  'ficha.campo.fato': 'fato',
  'ficha.campo.recorde': 'recorde',
  'ficha.campo.exploracao': 'exploração',
  'ficha.campo.fonte': 'fonte',
  'ficha.campo.licenca': 'licença',
  'ficha.campo.atribuicao': 'atribuição',
  'ficha.campo.oDefeito': 'o defeito',
  'ficha.campo.superficie': 'superfície',
  'ficha.campo.relevo': 'relevo',
  'ficha.campo.oRelevoAdmite': 'o relevo admite',
  'ficha.campo.forma': 'forma',
  'ficha.campo.designacao': 'designação',
  'ficha.campo.distancia': 'distância',
  'ficha.campo.magnitude': 'magnitude aparente',
  'ficha.campo.tipoEspectral': 'tipo espectral',
  'ficha.campo.corBV': 'cor B−V',
  'ficha.campo.temperatura': 'temperatura',
  'ficha.campo.catalogos': 'catálogos',
  'ficha.fonte.daEfemeride': 'da efeméride',
  'ficha.fonte.daCamera': 'do ponto de vista da câmera',
  'ficha.fonte.deGmEDoRaio': 'de GM e do raio',
  'ficha.fonte.deGm': 'de GM (gm_de440) e de G',
  'ficha.fonte.dosElementos': 'dos elementos da casa',
  'ficha.fonte.minEMax': 'mín e máx da órbita',
  'ficha.fonte.rotacaoIau': 'do modelo IAU de rotação',
  'ficha.fonte.geometrico': 'geométrico, de centro a centro',
  'ficha.fonte.editorial': 'texto editorial, sem fonte citada',
  'ficha.fonte.bancada': 'bancada de texturas',
  'ficha.fonte.semLicenca': 'não há textura com licença fechada',
  'ficha.fonte.larguraPx': '{px} px de largura',
  'ficha.fonte.catalogoHyg': 'catálogo HYG/AT-HYG',
  'ficha.fonte.bayerIau': 'Bayer, sigla IAU',
  'ficha.fonte.paralaxe': 'paralaxe Gaia DR3',
  'ficha.fonte.ballesteros': 'de B−V, por Ballesteros',
  'ficha.semMapa': 'sem mapa: a cor e o relevo deste corpo são inventados',
  'ficha.hora': 'hora',
  'ficha.horas': 'horas',
  'ficha.dia': 'dia',
  'ficha.dias': 'dias',

  // ---- o selo de honestidade (`three/selo.ts`) ----------------------
  'selo.escalaReal': 'ESCALA REAL',
  'selo.foraDeEscala': 'FORA DE ESCALA',
  'selo.brilhoReal': 'BRILHO REAL',
  'selo.brilhoAssistido': 'BRILHO ASSISTIDO',
  'selo.tese': 'o que nesta vista é ajustado e o que é medido',
  'selo.tier.medido': 'medido',
  'selo.tier.medidoOQue': 'catálogo e efeméride',
  'selo.tier.derivado': 'derivado',
  'selo.tier.derivadoOQue': 'cor e temperatura por modelo',
  'selo.tier.artistico': 'artístico',
  'selo.tier.artisticoOQue': 'o disco do Sol, o clarão e a cruz de luz das estrelas',
  'selo.cartografiaProcedural': 'cartografia: procedural (os mapas não chegaram)',
  'selo.cartografiaDesligada':
    'cartografia: procedural (os mapas desligados por ?cart=off)',
  'selo.luzAssistida':
    'cada mundo visitado é exposto para a luz que ELE recebe — uma foto tirada ali, não com o ajuste da Terra. A ordem verdadeira de brilho continua no céu, no ponto de cada corpo.',
  'selo.lanterna':
    'Lanterna de leitura {porcento} %: uma luz fraca na câmera deixa o lado noturno legível.',
  'selo.exposicaoDoReal':
    'tempo de exposição +{passos} passos: a foto do quadro é longa. A luz de cada mundo continua a física — o que abriu foi a chapa, e por isso o céu ao fundo acende mais.',
  'selo.esteGlobo': 'Este globo: {passos} passos de luz sobre a luz física.',
  'selo.desvio.exp': 'exposição escolhida à mão',
  'selo.desvio.tone': 'curva de tom trocada',
  'selo.desvio.doseDoSol': 'o arranque mostra o Sol mais limpo do que a data pede',
  'selo.desvio.amostragem': 'amostragem abaixo de cinema',
  'selo.desvio.camada': 'camada desligada: {nome}',

  // ---- a acusação da escala (`three/escala.ts`) ---------------------
  'escala.acusacao': '{nome} está {fator} maior',
  'escala.acusacaoDeBrilho': '{nome} emite {quanto}',
  'escala.brilhoDeAutor': 'brilho de autor',
  'escala.naUnidadeDaCasa': 'na unidade da casa',
  'escala.maisLuz': 'mais',
  'escala.menosLuz': 'menos',
  'escala.vezesLuz': '{vezes}× {lado} luz',
  'escala.magnitudes': '{mag} magnitudes de {lado} luz',
  'escala.raioDeAutor': 'raio de autor',
  'escala.nome.sol': 'Sol',
  'escala.nome.sgr-a': 'Sagittarius A✱',

  // ---- as camadas, as famílias e a qualidade (`three/atlasConfig.ts`)
  'familia.Galáxia': 'Galáxia',
  'familia.Estrelas': 'Estrelas',
  'familia.Sistema solar': 'Sistema solar',
  'camada.nogal': 'Galáxia (tudo)',
  'camada.nodisc': 'Lâminas do disco',
  'camada.nogdust': 'Extinção por partícula',
  'camada.noglow': 'Brilho do bojo',
  'camada.nocart': 'Cartografia observada',
  'camada.noco': 'Nuvens de CO',
  'camada.noforge': 'Forjas estelares',
  'camada.nonebula': 'Nebulosa volumétrica',
  'camada.nowrap': 'Campo envolvente',
  'camada.nodust': 'Poeira próxima',
  'camada.nobh': 'Buraco negro (Sgr A✱)',
  'camada.nocat': 'Catálogo HYG',
  'camada.nonomes': 'Nomes na tela',
  'camada.noclarao': 'Clarão das estrelas',
  'camada.nosun': 'Sol',
  'camada.nomarker': 'Marcador do Sol',
  'camada.noplan': 'Planetas',
  'camada.noicones': 'Ícones dos corpos',
  'camada.nocorpos': 'Corpos de perto',
  'camada.noorbitas': 'Linhas de órbita',
  'qualidade.cinema': 'Cinema',
  'qualidade.alta': 'Alta',
  'qualidade.performance': 'Performance',
  'qualidade.auto': 'Auto',
  'qualidade.quadros': '{fps} quadros/s',
  'qualidade.autoMedindo': 'Auto: a qualidade está em {tier}, medindo o quadro.',
  'qualidade.medindo': 'Qualidade {tier}, medindo o quadro.',
  'qualidade.autoPousou': 'Auto: a medição pôs a qualidade em {tier}, a {quadros}.',
  'qualidade.confere': 'Qualidade {tier}, e o quadro anda a {quadros}.',
  'qualidade.sugere':
    'Qualidade {tier}, a {quadros} — {sugestao} deve andar melhor.',

  // ---- a classe de um corpo, no vocabulário da legenda --------------
  'classe.estrela': 'estrela',
  'classe.planeta': 'planeta',
  'classe.planeta anão': 'planeta anão',
  'classe.lua': 'lua',
  'classe.asteroide': 'asteroide',
  'classe.buraco negro': 'buraco negro',

  // ---- a máquina do tempo (`three/tempoDoAtlas.ts`) -----------------
  'tempo.mes.0': 'janeiro',
  'tempo.mes.1': 'fevereiro',
  'tempo.mes.2': 'março',
  'tempo.mes.3': 'abril',
  'tempo.mes.4': 'maio',
  'tempo.mes.5': 'junho',
  'tempo.mes.6': 'julho',
  'tempo.mes.7': 'agosto',
  'tempo.mes.8': 'setembro',
  'tempo.mes.9': 'outubro',
  'tempo.mes.10': 'novembro',
  'tempo.mes.11': 'dezembro',
  /** a ORDEM da data por extenso muda de língua: pt "1 de janeiro de 2026", en "January 1, 2026" */
  'tempo.data': '{dia} de {mes} de {ano}, {hh}:{mm}',
  'tempo.instanteIndefinido': 'instante indefinido',
  'tempo.parado': 'parado',
  'tempo.tempoReal': 'tempo real',
  'tempo.taxa': '{valor} {unidade} por segundo',
  'tempo.segundo': 'segundo',
  'tempo.segundos': 'segundos',
  'tempo.minuto': 'minuto',
  'tempo.minutos': 'minutos',
  'tempo.hora': 'hora',
  'tempo.horas': 'horas',
  'tempo.dia': 'dia',
  'tempo.dias': 'dias',
  'tempo.ano': 'ano',
  'tempo.anos': 'anos',
  'tempo.semEfemeride': 'sem efeméride: a camada está congelada no retrato',
  'tempo.buscando': 'buscando a efeméride…',
  'tempo.foraDaJanela': 'fora de {anos} TDB: a tabela embarcada para aqui',

  // ---- as unidades que o visitante lê (`lib/unidades.ts`) -----------
  'unidade.km': '{n} km',
  'unidade.milKm': '{n} mil km',
  'unidade.ua': '{n} UA',
  'unidade.anoLuz': '{n} ano-luz',
  'unidade.anosLuz': '{n} anos-luz',
  'unidade.milAnosLuz': '{n} mil anos-luz',
  'unidade.vezesTerra': '{n}× Terra',

  // ---- a dica de gestos, sempre na tela (`App.tsx`) -----------------
  'cena.aria': 'Simulação tridimensional da viagem pelo catálogo HYG e pela Via Láctea',
  'cena.sol': 'SOL · {nota}',
  'cena.lente': 'LENTE {graus}° · SOL {nota}',
  'dica.toque.olhar': 'toque e arraste — olhar',
  'dica.toque.visitar': 'toque num nome — visitar',
  'dica.mouse.olhar': 'arrastar — olhar',
  'dica.mouse.voar': 'wasd/qe — voar',
  'dica.mouse.rolarEVelocidade': 'z/x — rolar · roda — velocidade',
  'dica.mouse.visitar': 'clique num nome — viajar até a estrela',
  'dica.captura.negada': 'este navegador não devolveu a captura do ponteiro',
  'dica.captura.capturado': 'ponteiro capturado — esc devolve',
  'dica.captura.pedir': 'capturar o ponteiro',
  'dica.pausado': 'arraste — olhar ao redor · espaço — retomar a viagem',
  'dica.atlas.girar': 'arraste — girar',
  'dica.atlas.pinca': 'pinça — zoom',
  'dica.atlas.roda': 'roda — zoom',
  'dica.atlas.escolherToque': 'toque — escolher',
  'dica.atlas.irToque': 'toque duplo — ir',
  'dica.atlas.escolherEVoltar': 'clique — escolher · esc — voltar',

  // ---- o rumo desenhado sobre a cena (`three/director`) -------------
  'cena.rotulosIndisponiveis': 'Canvas 2D indisponível para os rótulos.',

  // ---- a nota de validade da efeméride (`lib/atlas/registroOrbital`,
  // composta em `lib/atlas/efemerides`). A ficha do objeto imprime esta
  // frase inteira na linha "modelo e validade"; até o item 130/F4 ela era
  // o último parágrafo de tela que só falava português. Os NÚMEROS são a
  // MEDIÇÃO herdada do doador (3.6°, 5.2°, 7.4°, as janelas) e não se
  // tocam nem na vírgula decimal — quem muda de língua é a prosa. ------
  'efemeride.nota.origemDoSistema':
    'referência de origem do sistema solar',
  'efemeride.nota.vsop87':
    'série VSOP87D truncada, nível de arcsegundo entre 2000 a.C. e 6000 d.C.',
  'efemeride.nota.plutoMeeus':
    'teoria de Plutão do Meeus (cap. 37), válida de 1885 a 2099',
  'efemeride.nota.elp':
    'ELP/MPP02 truncada (nível de poucos arcsegundos ao longo de milênios)',
  'efemeride.nota.marcianas':
    'Kepler de dois corpos a partir dos elementos osculantes de 2025-01-01; pior caso 3.6° em ±1 ano da época, medido dos DOIS lados (Fobos, taxa publicada; lua ressonante de período curto não se sustenta em dois corpos por ±1 ano), sem validação fora dessa faixa',
  'efemeride.nota.galileanas':
    'Kepler de dois corpos a partir dos elementos osculantes de 2025-01-01; pior caso 1.6° em ±1 ano da época, medido dos DOIS lados (Europa), sem validação fora dessa faixa',
  'efemeride.nota.saturnianas':
    'Kepler de dois corpos a partir dos elementos osculantes de 2025-01-01; pior caso 5.2° em ±1 ano da época, medido dos DOIS lados (Mimas, taxa publicada; lua ressonante de período curto não se sustenta em dois corpos por ±1 ano), sem validação fora dessa faixa',
  'efemeride.nota.uranianas':
    'Kepler de dois corpos a partir dos elementos osculantes de 2025-01-01; pior caso 1.3° em ±1 ano da época, medido dos DOIS lados (Miranda), sem validação fora dessa faixa',
  'efemeride.nota.netunianas':
    'Kepler de dois corpos a partir dos elementos osculantes de 2025-01-01; pior caso 0.16° em +1 ano da época (um lado só — não há fixture antes da época), sem validação fora dessa faixa',
  'efemeride.nota.plutonianas':
    'Kepler de dois corpos a partir dos elementos osculantes de 2025-01-01; pior caso 0.01° em +1 ano da época (um lado só — não há fixture antes da época), sem validação fora dessa faixa',
  'efemeride.nota.asteroides':
    'Kepler de dois corpos a partir dos elementos osculantes de 2025-01-01; ~0.01° perto da época, extrapolado a ~1° nas bordas de 2000/2050 (única conferência longe da época: 7.4° em 1890)',
  'efemeride.nota.luaDeCatalogo':
    'órbita de catálogo por Kepler; orientação do plano e fase FABRICADAS (Ω/ω/M0 = 0) — desenha uma órbita plausível, nunca prevê uma posição',
  'efemeride.anoAC':
    '{ano} a.C.',
  'efemeride.anoDC':
    '{ano} d.C.',
  'efemeride.foraDaTabela':
    'Fora de {janela}: sem tabela embarcada — posicao() lança aqui. A teoria {modelo} cobriria {teoria}; regenere a tabela para estender a janela.',
  'efemeride.comTabela':
    '{modelo}: {nota}. Tabela embarcada {janela} (teoria válida {teoria}); interpolação Hermite medida ≤ {erro} UA (manifesto).',
  'efemeride.semJanela':
    '{modelo}: {nota}.',
  'efemeride.foraDaJanela':
    'Fora de {janela}: elementos osculantes congelados em 2025-01-01 extrapolados por Kepler de dois corpos — acurácia não caracterizada aqui.',
  'efemeride.naJanela':
    '{modelo} (válido {janela}): {nota}.',
  // os dois erros de carga que o visitante pode ver (F4 do 130)
  'erro.renderizador': 'Não foi possível criar o renderizador.',
  'erro.iniciar': 'Não foi possível iniciar a simulação.',
} as const;
