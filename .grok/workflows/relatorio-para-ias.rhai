let meta = #{
    name: "relatorio-para-ias",
    description: "Le o codigo e monta um relatorio MD de como facilitar o desenvolvimento com IAs",
    when_to_use: "Quando o projeto ficou dificil para IAs: arquivos grandes, ligacoes, duplicidade, desperdicio de tokens",
    phases: [
        #{ title: "Inventario", detail: "medir arquivos, ligacoes e a refatoracao em curso" },
        #{ title: "Especialistas", detail: "seis leitores em paralelo, cada um num assunto" },
        #{ title: "Verificacao", detail: "ceticos tentam derrubar cada achado" },
        #{ title: "Relatorio", detail: "um MD em portugues simples para o dono" },
    ],
};

let inventario_schema = #{
    "type": "object",
    "required": ["maiores", "refatoracao_em_curso", "contratos"],
    "properties": #{
        "maiores": #{
            "type": "array", "maxItems": 20,
            "items": #{ "type": "string" },
        },
        "refatoracao_em_curso": #{ "type": "string" },
        "contratos": #{
            "type": "array", "maxItems": 10,
            "items": #{ "type": "string" },
        },
        "notas": #{ "type": "string" },
    },
};

let achados_schema = #{
    "type": "object",
    "required": ["achados"],
    "properties": #{
        "achados": #{
            "type": "array", "maxItems": 6,
            "items": #{
                "type": "object",
                "required": ["peca", "problema", "evidencia", "ganho"],
                "properties": #{
                    "peca": #{ "type": "string" },
                    "problema": #{ "type": "string" },
                    "evidencia": #{ "type": "string" },
                    "ganho": #{ "type": "string" },
                    "colisao": #{ "type": "string" },
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

fn no_escopo(f) {
    let peca = texto(f.peca);
    let ev = texto(f.evidencia);
    let problema = texto(f.problema);
    if peca == "" && ev == "" { return false; }
    let blob = peca + " " + ev + " " + problema;
    if blob.index_of("node_modules") >= 0 { return false; }
    if blob.index_of("/dist/") >= 0 { return false; }
    true
}

fn regra_comum() {
    let s = "";
    s += "Voce esta no repositorio Viagem-Sol-pela-Milky-Way (Mar de Estrelas). ";
    s += "Use SOMENTE ferramentas de leitura: read_file, grep, list_dir e run_terminal_command ";
    s += "(so para wc -l, find, git status, git log, git diff --stat). ";
    s += "Nao responda de memoria. Uma lista vazia so e valida depois de ter lido o codigo de verdade. ";
    s += "PROIBIDO alterar, criar ou apagar qualquer arquivo. Outra IA esta refatorando o director em paralelo ";
    s += "(corte 8 solNoQuadro, corte 9 escada; working tree sujo em director.ts, cadastroDeRepresentacoes.ts e corpos.test.ts). ";
    s += "Nao proponha desfazer esses cortes. Se o achado ja esta nessa fila, preencha colisao. ";
    s += "Cite pecas pelo NOME (director, baseGalactica, repartir, HeroStars), nunca por numero de linha. ";
    s += "Todo achado precisa de evidencia: arquivo + o que voce leu la. Sem evidencia o achado e invalido. ";
    s += "Nao de conselho generico (DDD, hexagonal, microservicos, limpar tudo). So o que ESTE codigo prova. ";
    s += "Contratos a ler antes de concluir: docs/PENDENCIAS.md (item 43 da BAIXA), docs/NORTE.md (tres unificacoes), ";
    s += "AGENTS.md principio 11, README.md secao 5, docs/LEI-DA-ESTRELA.md so se o assunto for estrela. ";
    s
}

const MAX_ACHADOS = 12;
const MAX_VERIFICAR = 8;

phase("Inventario");
log("Medindo o codigo vivo e a refatoracao em curso");

let p_inv = regra_comum();
p_inv += "TAREFA: inventariar o estado ATUAL do codigo para um relatorio de 'como facilitar IAs'. ";
p_inv += "1) Rode wc -l em src/ scripts/ docs/ AGENTS.md README.md. Liste os 20 maiores arquivos de codigo (nao node_modules, nao dist, nao capturas). ";
p_inv += "2) git status -sb e git log --oneline -20. Descreva o que a outra IA esta cortando agora. ";
p_inv += "3) Liste os contratos que toda sessao de IA e obrigada a ler (AGENTS, PENDENCIAS, NORTE, LEI, PLANO-ATLAS, README) e o tamanho de cada um. ";
p_inv += "4) Conte metodos publicos da classe Director e quem importa director.ts (nao director/*). ";
p_inv += "5) Confira se ainda existem: import de GAL/EX/EY/EZ a partir de world/galaxy.ts; HeroStars e ClaraoDeAsas vivos juntos; ";
p_inv += "README citando hud.css ou pupila; export * em galaxy.ts. ";
p_inv += "Semente de 17/08 (REMECA, nao confie): director.ts ~2966, planetas.test ~1443, atlasRig.test ~1413, ";
p_inv += "stellarBody.ts ~1114, iauOrientation.ts ~1063, LEI ~1022, journey.ts e sun.js ~870, App.tsx ~769. ";
p_inv += "Devolva maiores (strings 'linhas caminho'), refatoracao_em_curso, contratos (strings 'linhas caminho'), notas. ";

let inv = agent(p_inv, #{
    label: "inventario",
    capability_mode: "read-only",
    agent_type: "explore",
    output_schema: inventario_schema,
});

let maiores = [];
let contratos = [];
let refatoracao = "";
let notas_inv = "";
if inv != () && inv.success && inv.output != () {
    if inv.output.maiores != () { maiores = inv.output.maiores; }
    if inv.output.contratos != () { contratos = inv.output.contratos; }
    refatoracao = texto(inv.output.refatoracao_em_curso);
    notas_inv = texto(inv.output.notas);
}
log("Inventario: " + maiores.len().to_string() + " arquivos grandes; refatoracao: " + refatoracao);

let semente = json_encode(#{
    maiores: maiores,
    contratos: contratos,
    refatoracao_em_curso: refatoracao,
    notas: notas_inv,
});

phase("Especialistas");
log("Seis leitores em paralelo, cada um num assunto");

let b1 = regra_comum();
b1 += "INVENTARIO JA MEDIDO (confira, nao copie cego): " + semente + " ";
b1 += "ASSUNTO: arquivos grandes e importacoes caras. ";
b1 += "Abra os maiores arquivos de src/ (nao so a lista). Para cada um: quantos assuntos distintos ele carrega? ";
b1 += "Procure o padrao que a onda da arquitetura ja matou uma vez: importar um arquivo enorme por 1 constante ou 4 vetores. ";
b1 += "Hipoteses a verificar no codigo (aceite ou refute com leitura): ";
b1 += "(a) director.ts ainda e o vilao e ainda importa GAL/EX/EY/EZ de world/galaxy.ts em vez de world/baseGalactica.ts; ";
b1 += "(b) galaxy.ts faz export * de baseGalactica, entao importar Galaxy ainda puxa o arquivo grande para a IA que abre o ficheiro; ";
b1 += "(c) testes maiores que o codigo (planetas.test, atlasRig.test, terra.test) obrigam a IA a ler milhares de linhas para mudar uma peca; ";
b1 += "(d) stellarBody.ts, iauOrientation.ts, journey.ts, sun.js, cameraRig.ts, App.tsx ainda misturam assuntos. ";
b1 += "O ganho tem de ser em tokens/coerencia para IAs, nao em 'fica mais bonito'. Maximo 6 achados.";

let b2 = regra_comum();
b2 += "INVENTARIO JA MEDIDO: " + semente + " ";
b2 += "ASSUNTO: estruturas concorrentes e duplicidade. ";
b2 += "Ache DUAS pecas que fazem o mesmo trabalho, ou duas leis para a mesma grandeza. Leia o codigo, nao o NORTE de memoria. ";
b2 += "Hipoteses a verificar (aceite ou refute): ";
b2 += "(a) HeroStars (exumado) e ClaraoDeAsas vivem juntos no director — lei vs arte das 16; ";
b2 += "(b) Hud.tsx e HudDoAtlas.tsx; LabelCanvas e director/rotulos; ";
b2 += "(c) as tres unificacoes do NORTE ainda duplicadas no runtime: cadeia fotometrica, populacao estelar, meio volumetrico (sprites + raymarch); ";
b2 += "(d) quatro leis de extincao ainda convivem; frameGalactico.ts vs baseGalactica.ts; ";
b2 += "(e) README/PENDENCIAS/comentarios descrevem um mundo (hud.css, pupila, heroStars morto) que o codigo ja nao e. ";
b2 += "Diferencie cessao declarada (NORTE proibe confundir com duplicidade) de duas maquinas de verdade. Maximo 6 achados.";

let b3 = regra_comum();
b3 += "INVENTARIO JA MEDIDO: " + semente + " ";
b3 += "ASSUNTO: ligacoes e o 'todo' do projeto — por que as IAs erram as costuras. ";
b3 += "Mapeie o fio real: App.tsx -> hooks (useDirector, useEspelhoDaUrl, useAtalhos) -> Director -> director/* e world/*. ";
b3 += "Conte a superficie publica do Director (metodos/getters que o React e os scripts de gate chamam). ";
b3 += "Para TRES mudancas tipicas (focar um corpo, mexer no relogio, ligar/desligar uma camada) liste os arquivos que a IA E OBRIGADA a abrir. ";
b3 += "Procure: API enorme num so objeto; estado espalhado (selo, fases, tempoDoAtlas, atlasConfig, cadastroDeRepresentacoes); ";
b3 += "window.__director; gates que leem captura.pronto. ";
b3 += "O problema do dono e: a IA nao entende o TODO e cria estrutura concorrente. Mostre ONDE o mapa falta no codigo. Maximo 6 achados.";

let b4 = regra_comum();
b4 += "INVENTARIO JA MEDIDO: " + semente + " ";
b4 += "ASSUNTO: contratos de IA e imposto de contexto. ";
b4 += "Meça com wc -l e LEIA o comeco de: AGENTS.md, CLAUDE.md, docs/PENDENCIAS.md, docs/NORTE.md, docs/LEI-DA-ESTRELA.md, ";
b4 += "docs/PLANO-ATLAS.md, README.md. Some as linhas que uma sessao nova e obrigada a ler ANTES de tocar codigo. ";
b4 += "Hipoteses: PENDENCIAS mistura historia fechada (onda da luz, M1/M2) com itens abertos, inflando o primeiro arquivo; ";
b4 += "README secao 5 esta velho (hud.css, pupila, heroStars, mapa de pastas); LEI tem 1000+ linhas e e contrato vivo; ";
b4 += "principio 1 manda ler quatro documentos em toda sessao. ";
b4 += "Ache contradicao DOCUMENTO vs CODIGO que faz duas IAs implementarem mundos diferentes. ";
b4 += "Nao recomende apagar ciencia. Recomende o que uma sessao nova deveria ler, e o que so atrapalha. Maximo 6 achados.";

let b5 = regra_comum();
b5 += "INVENTARIO JA MEDIDO: " + semente + " ";
b5 += "ASSUNTO: a arquitetura atual e a melhor para desenvolver com IAs? ";
b5 += "A onda em curso (item 43) e 'um arquivo, um assunto' — mover e agrupar, nao reescrever. Isso ja pagou: ";
b5 += "hud.css -> src/hud/, atlasRig fatiado, terra fatiada, galaxy -> baseGalactica, App -> hooks, director 7/9. ";
b5 += "Pergunta do dono: alem de fatiar o director, ha ganho MAIOR? ";
b5 += "Avalie no codigo, nao em doutrina: (1) Director-deus com API enorme vs fachada fina + pecas; ";
b5 += "(2) world/sol/ vendorizado em JS (sun.js, cme.js) que a IA tenta 'consertar' contra o NORTE; ";
b5 += "(3) cadastroDeRepresentacoes.ts e escala.ts como censo — isso AJUDA IAs ou e mais um arquivo para ler? ";
b5 += "(4) falta um mapa curto de ligacoes (quem importa o que) que nao apodreça; ";
b5 += "(5) um so motor (filme+Atlas) e a decisao certa para IAs, ou o custo de costura e o que queima tokens? ";
b5 += "Veredito honesto: o que a onda ja acerta, o que ela nao alcança, o que NAO fazer (reescrever o motor, segundo framework). Maximo 6 achados.";

let b6 = regra_comum();
b6 += "INVENTARIO JA MEDIDO: " + semente + " ";
b6 += "ASSUNTO: provas cegas e ciclos de IA que nao medem o que mudou. ";
b6 += "Leia docs/NORTE.md secao 'Como medir' e docs/PENDENCIAS.md itens 41, 48, 49. Depois abra o codigo dos juizes: ";
b6 += "scripts/visual/ab-identidade.mjs, a11y.mjs, atlas-smoke.mjs, voo-ida-e-volta.mjs; ";
b6 += "src/three/core/engine.test.ts (suspeita do item 41); scripts/visual/a11y.mjs vs selo.ts (item 48, gradacao morta). ";
b6 += "Ache testes VERDES que nao vigiam o que o comentario diz, ou juizes que cobram mortos. ";
b6 += "Isso queima tokens: a IA 'conserta' o teste, ou confia no verde e entrega regressao. ";
b6 += "Tambem procure comentarios-lapide longos no topo dos arquivos (heroStars, director, selo) que contradizem o codigo vivo. Maximo 6 achados.";

let jobs = [
    #{ prompt: b1, label: "arq:arquivos", capability_mode: "read-only", agent_type: "explore", output_schema: achados_schema },
    #{ prompt: b2, label: "arq:duplicatas", capability_mode: "read-only", agent_type: "explore", output_schema: achados_schema },
    #{ prompt: b3, label: "arq:ligacoes", capability_mode: "read-only", agent_type: "explore", output_schema: achados_schema },
    #{ prompt: b4, label: "arq:contratos", capability_mode: "read-only", agent_type: "explore", output_schema: achados_schema },
    #{ prompt: b5, label: "arq:arquitetura", capability_mode: "read-only", agent_type: "explore", output_schema: achados_schema },
    #{ prompt: b6, label: "arq:provas", capability_mode: "read-only", agent_type: "explore", output_schema: achados_schema },
];
let painel = parallel(jobs);

let achados = [];
let i_job = 0;
for r in painel {
    if r != () && r.success && r.output != () && r.output.achados != () {
        for f in r.output.achados {
            if no_escopo(f) {
                if achados.len() < MAX_ACHADOS {
                    achados.push(f);
                } else {
                    log("achado descartado pelo teto " + MAX_ACHADOS.to_string() + ": " + texto(f.peca));
                }
            } else {
                log("achado fora de escopo descartado: " + texto(f.peca));
            }
        }
    } else {
        log("especialista " + i_job.to_string() + " sem achados usaveis");
    }
    i_job += 1;
}
log(achados.len().to_string() + " achados apos o painel");

phase("Verificacao");
let confirmados = [];
if achados.len() == 0 {
    log("Nenhum achado para verificar — o relatorio vai dizer isso");
} else {
    let n_ver = achados.len();
    if n_ver > MAX_VERIFICAR {
        log("teto de verificacao: " + MAX_VERIFICAR.to_string() + " de " + n_ver.to_string());
        n_ver = MAX_VERIFICAR;
    }
    let vjobs = [];
    let vi = 0;
    for f in achados {
        if vi < n_ver {
            let pf = json_encode(f);
            let pv = regra_comum();
            pv += "TAREFA: voce e um CETICO. Tente DERRUBAR este achado lendo o codigo de novo, sozinho. ";
            pv += "Achado sob julgamento: " + pf + " ";
            pv += "real=true SOMENTE se voce mesmo abriu o arquivo, confirmou a evidencia e o problema ainda existe no working tree. ";
            pv += "Se a outra IA ja moveu o codigo, se a evidencia e comentario velho, se e cessao declarada, se e opiniao sem peca: real=false. ";
            pv += "Faltou evidencia propria: real=false. ";
            vjobs.push(#{
                prompt: pv,
                label: "ver:" + texto(f.peca),
                capability_mode: "read-only",
                agent_type: "explore",
                output_schema: veredito_schema,
            });
        }
        vi += 1;
    }
    let vereditos = parallel(vjobs);
    let vj = 0;
    for v in vereditos {
        if v != () && v.success && v.output != () && v.output.real == true {
            let ev = texto(v.output.evidencia);
            if ev != "" {
                confirmados.push(achados[vj]);
            } else {
                log("veredito sem evidencia propria recusado: " + texto(achados[vj].peca));
            }
        } else {
            log("achado nao sobreviveu: " + texto(achados[vj].peca));
        }
        vj += 1;
    }
}
log(confirmados.len().to_string() + "/" + achados.len().to_string() + " achados sobreviveram");

phase("Relatorio");
log("Redigindo o relatorio em portugues simples");

let payload = json_encode(#{
    inventario: #{
        maiores: maiores,
        contratos: contratos,
        refatoracao_em_curso: refatoracao,
        notas: notas_inv,
    },
    confirmados: confirmados,
    brutos_nao_confirmados: achados.len() - confirmados.len(),
});

let p_rel = regra_comum();
p_rel += "TAREFA FINAL: escrever o RELATORIO MD para o dono (leigo). Ele pediu recomendacoes para gastar menos tokens e ter IAs coerentes. ";
p_rel += "Dados ja verificados (use so isto como fonte de achados; se precisar de um detalhe, leia a peca citada): ";
p_rel += payload + " ";
p_rel += "Forma do markdown: ";
p_rel += "1) Titulo e data 2026-08-17. Uma frase: o que este papel e (recomendacao, nao ordem de reescrita). ";
p_rel += "2) O que a outra IA JA esta fazendo — nao repetir, nao atrapalhar. ";
p_rel += "3) Veredito da arquitetura em 1 pagina simples: o que esta certo para IAs, o que ainda queima tokens, se 'um arquivo um assunto' basta ou nao. ";
p_rel += "4) Achados confirmados, ordenados pelo ganho (tokens e coerencia). Cada um: o que o dono VERIA/sentiria, a peca, a evidencia, o que fazer, se colide com a refatoracao. ";
p_rel += "5) O que NAO fazer (reescrever o motor, segundo framework, apagar world/sol, ignorar a Lei). ";
p_rel += "6) Fila sugerida DEPOIS dos cortes 8 e 9 do director, curta, sem cronograma ficticio. ";
p_rel += "Fale simples. Densidade tecnica so na evidencia (nome da peca). Sem numero de linha. Sem jargao de moda. ";
p_rel += "Se confirmados estiver vazio, diga isso com honestidade e relate so o inventario medido. ";
p_rel += "Devolva titulo e relatorio (o markdown completo). Nao grave arquivo — o fluxo grava o scratch.";

let rel = agent(p_rel, #{
    label: "redator",
    capability_mode: "read-only",
    output_schema: relatorio_schema,
});

let md = "";
let titulo = "Relatorio: o projeto e as IAs";
if rel != () && rel.success && rel.output != () {
    titulo = texto(rel.output.titulo);
    md = texto(rel.output.relatorio);
    if titulo == "" { titulo = "Relatorio: o projeto e as IAs"; }
}
if md == "" {
    md = "# Relatorio: o projeto e as IAs\n\n";
    md += "O redator nao devolveu texto. Inventario bruto:\n\n";
    md += "- Refatoracao em curso: " + refatoracao + "\n";
    md += "- Arquivos grandes: " + json_encode(maiores) + "\n";
    md += "- Achados confirmados: " + confirmados.len().to_string() + "\n";
}

let caminho = write_scratch_file("relatorio-para-ias.md", md);
log("Relatorio gravado em " + caminho);
complete(#{
    path: caminho,
    titulo: titulo,
    confirmados: confirmados.len(),
    analisados: achados.len(),
});
