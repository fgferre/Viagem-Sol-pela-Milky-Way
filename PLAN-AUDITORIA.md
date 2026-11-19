# Auditoria do Gemini Neon: conferir e consertar (19/11/2026) — frentes FEITAS; fica aberto só o que espera o dono

O dono trouxe um relatório de 13 itens e pediu: "analisado e endereçado, coordene". O texto dele está em `.cache/revisoes/auditoria-gemini-neon-2026-11-19.md` (fora do git). Três revisores independentes conferiram cada afirmação contra o código (f5bad02e); os vereditos, com arquivo:linha, estão ao lado: `veredito-auditoria-A-shaders-gpu.md`, `-B-logica-estado.md`, `-C-interface-site-fichas.md`. Regra da rodada: só entra conserto de afirmação CONFIRMADA, o menor possível, com um teste por comportamento; nenhuma refatoração grande.

## Frentes (uma cópia de trabalho por frente; quem confere e guarda é a conversa principal)

- [x] **Ficha de Órion** (item 13): o texto dizia expoente 0,3 e "quatro vezes"; a tela usa 0,12 (1,7 vez). Feito, 37c3db57.
- [x] **F1 — o carregamento não trava** (item 4; feito, 83afc519; provado por teste, não provocado no navegador): erro dentro dos dois workers (`cargaEmWorker.ts`, `vizinhasEmWorker.ts`) não chega à página e a carga para para sempre; `reassarMundo` (`director.ts`) sem try/catch deixa `trocaPedida` presa. Fora: cancelar workers por sinal (higiene).
- [x] **F2 — a galáxia parada não gasta; o que vaza** (itens 6 e 7; feito, da4d0885 e 9574c270; medido: de um envio por quadro para 5 e para, fotos idênticas ponto a ponto): `CamadaWebgpu.update` roda tudo com a câmera parada — a chave é o buffer de uniformes em float32 mais as fatias que faltam (a câmera do filme pausado treme nos últimos dígitos); `StellarBody.dispose` deixa a textura da coroa, os objetos GL crus das ejeções e 5 materiais (~1,5 MiB por visita a estrela com dínamo e por troca de qualidade); `gigante.ts` guarda para sempre a promessa do perfil do anel que falhou. Fora: Órion (só vaza em recarga de desenvolvimento) e os caches das pedras (uma instância só).
- [x] **F3 — Atlas: cometas, Terra e Lua, Esc, camada que some** (itens 2, 3, 9, 10; feito, 977f9e20, 48d1f074, 9b299778, 68fa6404; na tela: caudas 0 → 65.536 e o Esc de Andrômeda e do Halley; Terra/Lua, camada e `?exp=` só por teste): `setDrawRange` na geometria compartilhada apaga as caudas dos acesos quando o foco é um apagado (ver em fev/1986 focando Encke); `caudas.update` roda depois do `updateClip` e corta o núcleo com o tempo correndo; Terra e Lua guardam a conta sem olhar o pino; Esc de perto num lugar, num cometa ou em "Via Láctea vista de cima → Aproximar" vai direto ao Sistema Solar; camada da galáxia religada some de novo ao trocar a qualidade (`Galaxy.dbg` congelado); `?exp=` inválido desliga a exposição automática. NÃO aplicar a limpeza de `estrelaFocada` no buraco negro: a auditoria errou, e ela quebraria o Esc de lá. Depois da F1 (as duas mexem em `director.ts`).
- [x] **F4 — interação** (item 11; feito, 4e70f7b7; provado contra o principal de antes por sonda): voo livre sem `blur` (tecla presa ao trocar de janela) e `onKeyDown` sem conferir `enabled`; Esc com o menu "Filmes" aberto e o foco fora dele sobe um degrau; "Via Láctea" no caminho do Atlas é texto morto (BACKLOG 26); o observador do HUD não vê o detalhe do selo nem a bússola acesa.
- [x] **F5 — higiene de shader e Node** (itens 1 e 12; feito, 9b5333dc; Órion e as duas telas de carga idênticas ponto a ponto): 4 `smoothstep` de bordas invertidas e 2 `pow(negativo, 2.0)` reescritos em forma idêntica; `engines` no `package.json`. A foto do Berçário em Direct3D 11 e em Vulkan saiu igual (`capturas/auditoria-gemini-19-11/`): não há defeito visto neste PC, o risco que sobra é celular.

## Segunda leitura do Gemini, depois dos consertos (19/11)

Ele releu os dez commits e confirmou o resto; três pontos, conferidos no código antes de mexer:

- [x] **O conserto do perfil do anel estava pela metade** (9574c270): a falha deixava de ficar guardada, mas o único pedido era o do nascimento da casca, e ninguém pedia de novo — Saturno seguia sem anel até recarregar. Agora `atualizar` pede de novo a cada 10 s do relógio do quadro, com o corpo na tela (o corpo não tem relógio próprio: o teste do cabeçalho barra `performance.now`).
- [x] **"Aproximar" e "Sistema" da ficha largavam o foco no corpo da página** (o botão clicado some), e o Esc morria com a ficha aberta; o "Anéis" ao lado já devolvia o foco. Os dois passaram a devolver. Na tela: o botão some, o foco fica na ficha, o 1º Esc a fecha e o 2º sobe um degrau.
- [x] **Os três pequenos, que tinham ficado só anotados** (o dono: "se são problemas já detectados, vamos consertar agora"): a cerca do motor (`cercaDoMotor`) é apagada quando a tela de carga sai e na desmontagem; o oráculo `aoClicarEmBrilho` e o clique de verdade leem a MESMA lista (`FORCADOS_QUE_O_CLIQUE_SOLTA`, `selo.ts`), e faltar uma chave num dos lados não compila — na tela, o código antigo e o novo soltam os mesmos controles; e o motor da galáxia envia 1 quadro depois de carregar, não 5 (a troca de fatia sozinha não conta como mudança com a extinção completa), com as fotos idênticas ponto a ponto.

## Não entra nesta rodada (dito ao dono)

- Inércia do arrasto (item 8): a álgebra confere, o efeito realista é ~11 % num engasgo a 120 Hz, e a proposta não é idêntica a 60 Hz. Mexe no toque aprovado.
- Sol trabalhando invisível (item 5): pular os renascimentos muda a sequência de sorteios; a leitura síncrona acontece a cada ~14 s. Medir antes (PLAN-PESO).
- Selo congelado, assinatura do `LabelCanvas`, `directorRef`, constantes do Sol duplicadas (696.340 × 695.700 km; 5772 × 5778 K), os 12 `atan` sem guarda: reais ou teóricos, sem dano visto.
- `public/` com 799 MB, 454,58 MB em 256 `.png`/`.jpg` que têm `.webp`: NÃO são sobra — reserva de navegador sem WebP, fonte do `otimiza-texturas.mjs`, e o `verify-assets` exige cada arquivo do manifesto. Decisão do dono, rodada própria de dados.
- Portões (`censo` vermelho, eslint sem os 14 `sol/*.js`, `data:verify` fora do `done` — o deploy já o roda): a lista de conferências é do dono.

## Ferramentas da rodada

Em `capturas/auditoria-gemini-19-11/ferramentas/` (fora do git): `sonda-geral.mjs` (abre um link num Chrome à parte, espera assentar, avalia expressões e aperta Esc entre elas), `sonda-interacao-v2.mjs`, `sonda-galaxia.mjs`, `lote-f3-v2.sh`. Servem de prova de comportamento enquanto o juiz de acessibilidade não roda neste PC.

## Conferência

Cada frente: typecheck, lint e testes tocados na cópia; aqui, leitura do diff, os testes inteiros (`--maxWorkers=6`: a máquina serve o acesso remoto e o `done` de sempre estoura prazos) e uma foto ou medida do comportamento. O juiz de acessibilidade congela neste PC (ver a memória): a F4 fica sem ele, dito no commit.
