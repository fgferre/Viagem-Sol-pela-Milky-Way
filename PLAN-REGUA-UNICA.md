# Uma régua só para todos os corpos — brilho, cor, luz, tela, relevo e confissão (plano, 08/10/2026)

Palavras dele (08/10): *"precisamos ter uma regra única que trate todos os objetos do sistema. nao podemos ter tantas complexidades, um algoritmo para resovler tudo e diominuir complexidade sem perder o wowness e acuracia cientifica e sinceridade nos desvios que hoje já temos."* Este plano espera a palavra dele antes da etapa R1. A rodada das luas pequenas (`PLAN-LUAS-PEQUENAS.md`) fica pausada depois da versão F de Pã e volta já sob esta régua.

## O que existe hoje (levantamento de 08/10, três leituras do código)
- **Cor do mapa — nove caminhos, quatro tipos de alvo.** Ganhos à mão no shader para as seis luas grandes de Saturno (`rochoso.ts:274-283`, 427-431; calibrados para uma exposição AgX que a casa não usa mais); nível pelo albedo para sete pinturas (`baixa-texturas.mjs:991-1040`, item 151; Éris e Hipérion travados abaixo do medido); dessaturação fixa do Hipérion (`relevo-medido.mjs:841`); tinta de Ceres (`baixa-texturas.mjs:923`); Europa nivelada à média do mapa antigo da NASA (`cor-europa.mjs:105`); Plutão/Caronte sem nível; as luas de Urano, Tritão, os galileanos, Titã, Vesta, a Lua, os planetas sem nível nenhum; as esculpidas por cor de família (`esculpido.ts:416-473`). O manifesto não guarda albedo nem média.
- **Luz — já quase única.** Um ganho por globo nos três modos (`luzDaVisita.ts:417-424`: assistida 1, real (1/d)², roteiro olho adaptado), lanterna de leitura, uma exposição por quadro (`director.ts:4164-4167`). Exceções: metalness 0 dá ~1,43× nos planetas (`config.ts:113-124`); o Sol, as estrelas, a galáxia, as órbitas e o eclipse têm botões próprios (legítimos: são emissores ou guias, não superfícies).
- **Tela — um ACES para tudo** (`engine.ts:736-737`, `post.ts:1086`) que come a cor das superfícies claras: acima de ~0,3 de luminância de tela sobra ~40 % do desvio de cor (Pã, Europa, Io); depois, o brilho azulado do filme (`dustShaders.ts:208`).
- **Relevo — oito jeitos.** Medido por mapa de altura (Mimas, Tétis, Dione, Encélado, Reia), inventado (Jápeto), forma medida + poços da pintura (Hipérion), normal medida (Mercúrio, Marte, Ceres, Vesta, Lua, Terra), parte medida parte inventada (Plutão, Caronte), esculpido à mão (Pã…Febe), nenhum (Vênus, Titã, Europa, Io), e o relevo falso tirado da cor em 16 corpos (item 144; chave desligada por padrão).
- **Confissão — quatro formatos** (tabelas "a imagem" e "a forma" do `ASSETS.md`, campos de proveniência, a chave "relevo inventado"); a ficha mostra o selo "medido" mesmo quando o texto diz "inventado" (`ficha.ts:619, 661`); Mimas, Tétis e Dione não confessam o relevo.

## A régua (cinco partes, uma função cada, igual para todo corpo que reflete luz)
1. **Medidas** — uma tabela só, com fonte: albedo (geométrico ou normal, banda dita) e, quando houver, a cor medida (razões de filtro/espectro). É a âncora de tudo.
2. **Cor do mapa** — uma função na cadeia de dados: média do mapa = albedo medido; cor = a da foto quando a fonte é foto colorida, a do espectro medido quando a fonte é cinza ou pintura; uma única regra de teto (nada estoura; o que faltar é confessado). Some do shader todo ajuste por corpo.
3. **Luz** — a mesma lei para todos (a de hoje: assistida / real / olho adaptado); o "uau" vem do olho, não de ganhos por corpo. Sai o ganho escondido dos planetas (metalness), ou entra para todos.
4. **Tela** — um único ajuste de tom que preserve a cor, para o quadro inteiro (o three já traz o Neutral da Khronos, feito para isso: no teste de Pã deu B/G 0,766 contra o alvo 0,773). Sem exceção por corpo.
5. **Relevo e confissão** — a mesma ordem de fontes para todo corpo: medido onde existe; derivado das fotos onde elas veem; inventado com as estatísticas do real onde nada vê; nunca relevo tirado da cor (aposenta o item 144). Uma confissão por canal (forma, relevo, cor, brilho) com o selo certo: medido / derivado / inventado.

## Etapas (cada uma com prancha antes × depois; ele decide)
- **R0 — Tabela de medidas** (pesquisa, sonnet com fontes; leitura): albedo e cor medida de cada corpo do app.
- **R1 — Tela** (opus): o ajuste de tom único atrás de uma chave; prancha do app inteiro (galáxia, Sol, Terra, gigantes, luas claras e escuras, um trecho de cada filme) ACES × o novo. Muda tudo de uma vez — por isso primeiro e por imagem.
- **R2 — Cor dos mapas** (opus + a cadeia no terminal dele): a função única; "retrato de família" de todos os corpos na mesma luz e na mesma escala, com os números ao lado (Encélado o mais claro, a Lua e Febe escuras, Pã abaixo de Encélado). Os que ele já aprovou (Europa, Reia, Hipérion) voltam para ele se mudarem.
- **R3 — Confissão** (sonnet, mecânico): um formato, o selo certo na ficha, as lacunas preenchidas.
- **R4 — Relevo** (opus, corpo a corpo, a fila de assets): a ordem única de fontes; o relevo falso da cor sai; a rodada das luas pequenas volta aqui (Pã primeiro, pela versão F).

## Fora deste plano
O Sol, as estrelas, a galáxia, as órbitas e o eclipse (emissores e guias, já com regra física própria); a Terra com nuvens e luzes entra na régua de cor só se a prancha da R2 mostrar desvio.
