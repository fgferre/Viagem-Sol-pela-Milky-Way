let meta = #{
    name: "nasa-eyes-trajetorias",
    description: "Le o JS minificado do NASA Eyes e explica como as trajetórias ganham cor, volume e contexto",
    when_to_use: "Quando o dono quiser entender as trajetórias do NASA Eyes (cor, volume, inteligência) a partir do código que o navegador baixa",
    phases: [
        #{ title: "Localizar", detail: "baixar os bundles e achar TrailShader, TrailComponent, TrajectoryManager" },
        #{ title: "Ler", detail: "três leitores: geometria, cor-volume, inteligência" },
        #{ title: "Verificar", detail: "um cético por afirmação, contra o JS de verdade" },
        #{ title: "Relatorio", detail: "português simples: o que o Eyes faz, o que dá para aprender" },
    ],
};

let mapa_schema = #{
    "type": "object",
    "required": ["pecas", "notas"],
    "properties": #{
        "pecas": #{
            "type": "array", "maxItems": 12,
            "items": #{ "type": "string" },
        },
        "notas": #{ "type": "string" },
        "app_bytes": #{ "type": "string" },
    },
};

let leitura_schema = #{
    "type": "object",
    "required": ["dimensao", "afirmacoes"],
    "properties": #{
        "dimensao": #{ "type": "string" },
        "afirmacoes": #{
            "type": "array", "maxItems": 4,
            "items": #{
                "type": "object",
                "required": ["titulo", "como", "evidencia"],
                "properties": #{
                    "titulo": #{ "type": "string" },
                    "como": #{ "type": "string" },
                    "evidencia": #{ "type": "string" },
                    "licao": #{ "type": "string" },
                },
            },
        },
    },
};

let veredito_schema = #{
    "type": "object",
    "required": ["real", "razao", "evidencia"],
    "properties": #{
        "real": #{ "type": "boolean" },
        "razao": #{ "type": "string" },
        "evidencia": #{ "type": "string" },
    },
};

let relatorio_schema = #{
    "type": "object",
    "required": ["titulo", "relatorio"],
    "properties": #{
        "titulo": #{ "type": "string" },
        "relatorio": #{ "type": "string" },
    },
};

fn texto(x) {
    if type_of(x) == "string" { x } else { "" }
}

fn json_seguro(x) {
    if x == () { "{}" } else { json_encode(x) }
}

const MAX_AFIRMACOES = 9;
const DIR = "/tmp/nasa-eyes-ss";
const BASE = "https://eyes.nasa.gov/apps/solar-system/";

phase("Localizar");
log("Baixando os bundles do NASA Eyes e mapeando TrailShader / TrailComponent");

let p_loc = "";
p_loc += "Você analisa o NASA Eyes on the Solar System (https://eyes.nasa.gov/apps/solar-system/) para o projeto Viagem-Sol-pela-Milky-Way. ";
p_loc += "NÃO copie nenhum JS da NASA para o repositório git. Trabalhe só em " + DIR + ".\n\n";
p_loc += "OBRIGATÓRIO usar ferramentas (curl, python, rg). Não responda de memória.\n";
p_loc += "1) mkdir -p " + DIR + " e baixe com curl: config.js, commons.js, preload.js, vendors.js, app.js a partir de " + BASE + "\n";
p_loc += "2) Anote o tamanho de cada arquivo (wc -c). app.js ~1,7 MiB, vendors.js ~2,5 MiB.\n";
p_loc += "3) Em app.js procure as strings EXATAS (são literais, sobrevivem à minificação): ";
p_loc += "TrailShader, TrailComponent, TrailManager, TrajectoryManager, createTrajectory, layerTrails, layerOrbits, setRelativeToEntity, Trail already exists for.\n";
p_loc += "4) Extraia a lista de uniforms do objeto TrailShader (viewportSize, glowWidth, widthMin, widthMax, color, alphaFade, dashLength, etc.).\n";
p_loc += "5) Extraia métodos públicos visíveis de TrailComponent (setEnabled, setStartTime, setRelativeToEntity, resetPoints, setRelativeStartTime).\n";
p_loc += "6) NÃO desminifique o arquivo inteiro. NÃO grave nada em docs/ nem em src/.\n\n";
p_loc += "Devolva pecas: nomes das peças achadas (ex. TrailShader, TrailComponent). notas: 4–8 linhas do mapa (onde está o shader, o manager, o createTrajectory). app_bytes: tamanho do app.js. Lista vazia só se o download falhou de verdade.";

let loc_r = agent(p_loc, #{
    label: "localizar-bundles",
    capability_mode: "all",
    output_schema: mapa_schema,
});

let loc_json = "{}";
if loc_r != () && loc_r.success && loc_r.output != () {
    loc_json = json_seguro(loc_r.output);
    log("Mapa localizado");
} else {
    log("Localização falhou ou veio vazia — os leitores seguem com as pistas fixas");
}

phase("Ler");

let dimensoes = [
    #{
        id: "geometria",
        pergunta: "Como o Eyes constrói a LINHA da trajetória no espaço (pontos, tempo, referencial)?",
    },
    #{
        id: "cor-volume",
        pergunta: "Como a trajetória ganha COR e VOLUME na tela (shader, largura, brilho, blending)?",
    },
    #{
        id: "inteligencia",
        pergunta: "Quando a trajetória aparece, some, troca de cor ou isola uma missão (camadas, foco, janela de tempo)?",
    },
];

let p_base = "";
p_base += "Você lê o JS minificado do NASA Eyes já baixado em " + DIR + "/app.js. ";
p_base += "Se o arquivo não existir, baixe de " + BASE + "app.js. NÃO copie o JS para o git.\n";
p_base += "OBRIGATÓRIO: use rg/python no arquivo real. Afirmação sem evidência do arquivo é inválida.\n";
p_base += "Mapa da fase anterior (pode estar incompleto): ";

let jobs = [];
for d in dimensoes {
    let p = p_base;
    p += loc_json;
    p += "\n\nSUA DIMENSÃO: ";
    p += d.id;
    p += " — ";
    p += d.pergunta;
    p += "\n\nPistas (confirme no arquivo, não copie como verdade):\n";
    p += "- TrailShader: faixa em espaço de TELA (positionCurr/Prev/Next, side, viewportSize, glowWidth, widthMin/widthMax, alphaFade, blending additive, depthWrite false).\n";
    p += "- trail:{length: N, color:[r,g,b,a]} nos dados das sondas; length parece janela de tempo, não metros.\n";
    p += "- TrailComponent.setRelativeToEntity, resetPoints, setStartTime, createTrajectory(start,end,color).\n";
    p += "- Camadas layerTrails e layerOrbits; TrajectoryManager e goToTrajectoryView isolam uma missão.\n";
    p += "- ThreeJsHelper aparece junto do TrailComponent (o motor é Three.js customizado, não Cesium).\n\n";
    p += "Devolva no máximo 4 afirmações {titulo, como, evidencia, licao}. evidencia CITA o símbolo ou o uniform que você leu. licao é o que o nosso app (orbitas.ts: LineLoop + fade angular + cônica osculadora) poderia APRENDER como ideia — nunca colar código da NASA. Lista vazia só depois de varrer app.js de verdade.";
    jobs.push(#{
        prompt: p,
        label: "ler:" + d.id,
        capability_mode: "all",
        output_schema: leitura_schema,
    });
}

let lidas = parallel(jobs);

let afirmacoes = [];
for r in lidas {
    if r == () { continue; }
    if !r.success { continue; }
    if r.output == () { continue; }
    let lista = r.output.afirmacoes;
    if lista == () { continue; }
    let dim = texto(r.output.dimensao);
    for a in lista {
        if afirmacoes.len() >= MAX_AFIRMACOES {
            log("Cortei afirmações acima de " + MAX_AFIRMACOES.to_string());
            break;
        }
        if texto(a.titulo) == "" { continue; }
        if texto(a.evidencia) == "" { continue; }
        afirmacoes.push(#{
            dimensao: dim,
            titulo: texto(a.titulo),
            como: texto(a.como),
            evidencia: texto(a.evidencia),
            licao: texto(a.licao),
        });
    }
}

log(afirmacoes.len().to_string() + " afirmações para verificar");

if afirmacoes.len() == 0 {
    let vazio = "# NASA Eyes — trajetórias\n\nNenhuma afirmação sobreviveu à leitura do JS. O download ou o mapa falhou. Tente de novo.\n";
    let path_vazio = write_scratch_file("nasa-eyes-trajetorias.md", vazio);
    complete(#{
        summary: "Leitura vazia — nada verificado",
        path: path_vazio,
        afirmacoes: 0,
        confirmadas: 0,
    });
}

phase("Verificar");

let vjobs = [];
let vi = 0;
for a in afirmacoes {
    let pv = "";
    pv += "Você é cético. Tente DERRUBAR esta afirmação sobre o NASA Eyes lendo o JS em " + DIR + "/app.js (baixe de " + BASE + "app.js se faltar).\n";
    pv += "NÃO copie o arquivo para o git. real=true SÓ com evidência que você mesmo abriu agora.\n\n";
    pv += "Dimensão: ";
    pv += a.dimensao;
    pv += "\nTítulo: ";
    pv += a.titulo;
    pv += "\nComo (alegado): ";
    pv += a.como;
    pv += "\nEvidência alegada: ";
    pv += a.evidencia;
    pv += "\n\nConfira o símbolo no arquivo. Se for chute, leitura de blog, ou o trecho não diz isso: real=false. evidencia: o pedaço que você leu.";
    vjobs.push(#{
        prompt: pv,
        label: "cetic:" + vi.to_string(),
        capability_mode: "all",
        output_schema: veredito_schema,
    });
    vi += 1;
}

let vereditos = parallel(vjobs);

let confirmadas = [];
let i = 0;
for v in vereditos {
    let ok = false;
    if v != () && v.success && v.output != () {
        if v.output.real == true && texto(v.output.evidencia) != "" {
            ok = true;
        }
    }
    if ok {
        confirmadas.push(afirmacoes[i]);
    }
    i += 1;
}

log(confirmadas.len().to_string() + "/" + afirmacoes.len().to_string() + " afirmações sobreviveram");

phase("Relatorio");

let conf_json = json_seguro(confirmadas);
let p_rel = "";
p_rel += "Escreva um relatório em PORTUGUÊS SIMPLES para o dono do app Viagem-Sol-pela-Milky-Way. Ele é leigo em programação. ";
p_rel += "O assunto: como o NASA Eyes on the Solar System desenha trajetórias bonitas (cor, volume, inteligência).\n";
p_rel += "Só use o que os céticos CONFIRMARAM. Se a lista for curta, diga o limite. Não invente.\n\n";
p_rel += "Afirmações confirmadas (JSON):\n";
p_rel += conf_json;
p_rel += "\n\nEstrutura do relatório:\n";
p_rel += "1) O que o olho vê (sem jargão).\n";
p_rel += "2) Os truques (faixa na tela vs linha 3D, cor, brilho, afinamento, janela de tempo, referencial, camada Trails vs Orbits, vista de uma missão).\n";
p_rel += "3) O que o NOSSO app já faz diferente (orbitas.ts: elipse fechada, fade por tamanho na tela, sem volume de faixa, sem janela de tempo da sonda).\n";
p_rel += "4) O que dá para APRENDER — ideias, não copiar código da NASA. Máximo 5 ideias, cada uma numa frase.\n";
p_rel += "5) O que o JS minificado NÃO deixou claro.\n\n";
p_rel += "Cite peças pelo NOME (TrailShader, TrailComponent), nunca por número de linha. Sem colar GLSL longo. titulo curto.";

let rel_r = agent(p_rel, #{
    label: "relatorio",
    capability_mode: "read-only",
    output_schema: relatorio_schema,
});

let corpo = "# NASA Eyes — trajetórias\n\nO sintetizador não devolveu texto.\n";
let titulo = "NASA Eyes — trajetórias";
if rel_r != () && rel_r.success && rel_r.output != () {
    let t = texto(rel_r.output.titulo);
    let b = texto(rel_r.output.relatorio);
    if t != "" { titulo = t; }
    if b != "" { corpo = "# " + titulo + "\n\n" + b + "\n"; }
}

let path = write_scratch_file("nasa-eyes-trajetorias.md", corpo);
complete(#{
    summary: titulo,
    path: path,
    afirmacoes: afirmacoes.len(),
    confirmadas: confirmadas.len(),
});
