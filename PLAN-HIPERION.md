# Hipérion com a forma medida e os poços da pintura, no app (aberto 22/09/2026, aprovado pelo dono)

Pedido dele (22/09): *"pode levar para o Hipérion do app"*, depois de aprovar no olho a 4ª versão do piloto (*"ficou muito bom"*). As melhorias para depois estão no item 226 do PENDENCIAS, *"sem perder performance"*. Se você não escreveu este plano, leia tudo antes de mexer; marque os passos ao fazer; apague o arquivo no fim.

## O que já existe
- Ramo LOCAL `piloto-hiperion` (fora do main, não publicado, não empurrado): quatro versões por `?piloto=`; a escolhida é `hiperion-mundos` (commit 2500e3e). Serve de referência visual, não vai para o main.
- Fotos e ferramentas em `capturas/`: `piloto-hiperion-{vista1,vista2,perto-3-vs-4}.jpg` (pranchas), `piloto-hiperion-{hoje,mundos}-{f55-b25,f80-b-35}.png` (antes e a versão aprovada, mesma pose), `referencia-hiperion-PIA07740.jpg` (foto Cassini), `piloto-hiperion-fotografa.mjs` e `piloto-hiperion-prancha.mjs` (tirar as fotos e montar a prancha; ajustar os caminhos, eram do scratchpad), `gpu-hiperion-antes.txt` (medida da GPU de hoje; ruidosa: havia outro app aberto).
- Fontes da pesquisa: memória `pesquisa-formas-reais-e-novos-corpos`.

## Decisões já tomadas
- Hipérion SAI da família esculpida (`esculpido.ts`: tirar de `IDS_ESCULPIDOS`, `FORMAS_ESCULPIDAS`, `FAMILIAS_DE_REGOLITO`) e entra como Mimas: entrada em `ROCHOSOS` (`brdf: 'lambert'`), `RELEVO_DA_LUA.hyperion = { escala, vies }` (deslocamento pelo mapa de altura), mapa de normais, mapa de cor — tudo pelo pipeline de texturas da casa. `BODY_AXES.hyperion` fica [135,135,135]; o mapa de altura carrega a forma inteira (r de 0,694 a 1,368 em raios de 135 km, mais os poços).
- Os poços vão nos mapas (normais e altura), NÃO em geometria: nada do custo do piloto (808 mil triângulos, ~2,8 s de montagem) entra no app. A malha é a esfera de relevo da casa (`SEGMENTOS_COM_RELEVO`).
- ARMADILHA DO ESPELHO: os mapas do app são o espelho da grade do piloto (app: `direcaoLocalDeLonLat` = [cosφ·cosλ, sinφ, −cosφ·sinλ], Greenwich no centro; piloto: lon = atan2(z, x)). Todo mapa é calculado POR DIREÇÃO; nunca virar à mão.
- Normais pelo `assaNormais` do gerador de normais de DEM da casa, com metros = R·ln(r/R), R = 135 km (declive exato para relevo grande).
- Cor: a pintura da IA (feita no ChatGPT dele em 22/09 sobre a planta do relevo medido, com a PIA07740 só como referência), graduada: polos desesticados e 40 % menos saturada. Nível pelo bake `ilustracao-ia` com `ALBEDO_DA_ILUSTRACAO.hyperion = 0,26` (0,30 medido, grampeado para o percentil 99 não estourar, como Éris).
- Orientação: segue a modelada síncrona com W0 = 0 que já existe (declarada; a rotação real é caótica). A longitude 0 do mapa é a ponta +X do eixo longo.
- Sem interruptor por ora: os poços ficam sempre ligados e declarados na ficha. Torná-los desligáveis vai para o item 226.
- O hook de `public/data` barra os comandos de dados e qualquer script da pasta de dados — até um texto que só MENCIONE o caminho de um desses scripts num comando de terminal. Quem roda o passo 4 é o DONO (o assistente escreve o comando num bloco bash para ele clicar). Arquivos que citam esses caminhos: escrever pela ferramenta de arquivo, não por heredoc.

## Passos
1. [em curso 22/09] Fontes na pasta `fonte/` do pipeline de texturas do Atlas: `hyperion-altura.png` (1024×512, 8 bits), `hyperion-normal.png` (2048×1024), `hyperion-ia.png` (2048×1024), `hyperion-pocos.json` (3.488 poços detectados na pintura), `hyperion-ia-original.png` (a imagem da IA como saiu); receita `relevo-e-cor-de-hiperion.mjs` ao lado dos outros scripts do Atlas (feita e rodada como cópia no scratchpad, porque o hook barra rodar de lá). Anotar aqui: escala = ___ ; vies = ___ ; conferências de espelho e de normais.
2. Ligação no main: `rochoso.ts`, `esculpido.ts`, comentários de `iauOrientation.ts` (as "nove esculpidas" viram oito; BODY_AXES comenta que o mapa carrega a forma), o script que baixa texturas (três FONTES com `arquivoLocal`, giro 0; `ALBEDO_DA_ILUSTRACAO.hyperion`), o gerador do manifesto e o de textos em inglês (ORIGENS pt/en: forma medida Thomas, Joseph & Ansty 2018, NASA PDS, DOI 10.26033/ewy3-jy61, domínio público; poços e cor pintados por IA, não são medida), `docs/reference/ASSETS.md` (seção de Hipérion + linha dele na tabela "a forma").
3. Testes: atualizar os pinos (ordem de `ROCHOSOS`, lista das esculpidas, ficha, `SEM_GM_DAS_ESCULPIDAS`) e um teste de espelho sobre o `height.png` de Hipérion gerado pelo pipeline (três direções com z ≠ 0 onde a forma medida difere do seu espelho).
4. O dono roda, na raiz do repositório, os três scripts do Atlas em sequência, com o id do corpo nos dois primeiros: o que baixa texturas (`hyperion`), o que otimiza texturas (`hyperion`) e o que gera o manifesto (sem argumento).
5. `npm run data:verify`; `npm run done`; fotos antes e depois nas poses do piloto (jd 2461041.5008692136; fase 55° beta 25, e fase 80° beta −35) com `capturas/piloto-hiperion-fotografa.mjs`; medir a GPU com o `gpu-profile.mjs` de `scripts/visual/` (query `?atlas=1&foco=hyperion&ver=corpo&d=3&jd=2461041.5008692136&nonomes&noicones`, 12 s, 1440×900, DPR 2) e comparar com `capturas/gpu-hiperion-antes.txt`.
6. Um commit no main (a mensagem diz o porquê, com as palavras dele); backup `git push origin main:backup` (nunca `main`, que publica); apagar este arquivo.

## Fora do escopo
- As melhorias do item 226 (sombra dentro dos poços, borda da bacia, detalhe de perto, mancha em estrela, interruptor dos poços).
- As outras luas pequenas de Saturno (mesma receita, obra própria).
- O `PLAN.md` do gás, que é outra obra aberta.
