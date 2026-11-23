Plano único do Mar de Estrelas — o que ainda está aberto (condensado em 22/11/2026)
Histórico: os doze planos antigos, com medidas e passos já feitos, estão no git: git show 49df9c52:PLAN-<NOME>.md
(o antigo PLAN.md, da poeira do Gaia, é `git show 49df9c52:PLAN.md`). As provas citadas lá seguem em `capturas/` e `.cache/revisoes/`.

## Auditoria do Gemini — rodada 4 e juízes (antes: PLAN-AUDITORIA.md)
- [dono] A rodada 4 foi PARADA por ele, pelo custo. As mudanças das ferramentas (teto de 700 quadros só para app sem sinal em `esperarAssentar`, erro de prazo tipado, nova tentativa do `planeta-pixel`) estão no ramo `r4-revisao` (também no GitHub), NÃO no principal: ele decide se retoma.
- A última fila de juízes terminou com 5 reprovações, 4 delas novas e não analisadas: classificar cada uma (app, juiz velho ou este PC) antes de consertar qualquer coisa.
- Juízes velhos sem conserto: `planeta-pixel` (11 × 12 linhas do `?dbgplan`) e `busca-smoke` (cartão, distância e milhar). Os juízes que não olham o `via` podem fotografar antes do pronto: conferir um a um (lista no histórico).
- Rodada 2: o plano dizia "FEITA", mas os passos 1 a 5 (conferir no código, conferir na tela, consertar, conferência junta, antes e depois ao dono) ficaram sem marca — conferir. Rodada 3: 1c.1 (estrela com corpo herda o afastamento sem a cessão: olhar Aldebaran e Próxima e decidir), 1c.5 (medir a hora e a data mais largas na alça) e a varredura de 361–389 px e 375 px do topo com texto grande.
- Decisões que valem: a "luz perdida" junto aos planetas é a curva Neutral (não reabrir); juiz que compara fotos sem `shot` usa tolerância (o grão anda); a cobrança do a11y "troca de tier na tela no ato" conta como defeito do app até o congelamento abaixo sair.

## Abertura a frio e memória no Windows/D3D11 (antes: PLAN-AUDITORIA.md)
- Defeito do app a consertar: no Windows, trocar a qualidade de Cinema para Alta congela a tela por ~6 s (régua: `capturas/auditoria-gemini-rodada3/r4-laminas/sonda-troca-de-tier.mjs`); a troca inteira leva 14–16 s.
- Abertura a frio ~31–34 s no D3D11 (9,8 s no Vulkan): os catálogos congelam ~1,9 s; a camada WebGPU da galáxia esbarra no prazo de 15 s com a placa disputada; a troca da poeira sintética→Gaia leva ~9 s; falta a guarda de Órion no aquecimento (lei da abertura: a maior tarefa depois da fase atlas).
- Memória: o processo de GPU chega a ~10,4 GB no filme no D3D11 contra 5,6 no Vulkan — medir, a cada `seek`, o processo contra o que o app diz ter (camada do D3D11 ou carga nossa); Saturno guarda ~29 MB de heap (pedaços do anel) depois da 1ª visita: vale soltar quando está longe?
- Pronto cedo demais ou nunca: no link `?filme=solar&t=97` a capa sai antes de a Lua existir; `shot=1&play=1` deixa a viagem andar; com o relógio ao vivo o app nunca se diz pronto (decidir o sentido do pronto ao vivo); brecha do pronto que espera a oclusão (estrela que volta com o mesmo dono, salto de câmera).
- Captura toda preta, intermitente, só no D3D11 (quando voltar: `capturas/auditoria-gemini-rodada3/destravar/xx-sonda-familia.mjs`); faixa preta de ~35 px no topo da capa a 960×540, sem diagnóstico.
- Decisão que vale: os juízes abrem com perfil novo (a abertura a frio é a do visitante).

## Defeitos do app anotados, ainda sem ação (antes: PLAN-AUDITORIA.md)
- Depois de o contexto gráfico voltar, a sonda de oclusão fica com a piscina cheia para sempre (estrela atrás de planeta deixa de se esconder); os assados WebGPU pedidos no `intro` sobrevivem à volta ao Atlas (2 workers a cada `partirDoAtlas`).
- Endereço congelado quando o caminho começa com `//` (`replaceState` lança): passar o endereço inteiro em `useEspelhoDaUrl.ts` e `App.tsx`.
- Rótulos: na faixa de 16 px da entrada o nome pode ficar sobre o próprio disco; [dono] o detalhe do rótulo no Atlas ainda some num quadro (esmaecer como no filme?); no filme solar, entre 325,95 e 326,15 s, todos os rótulos somem e o de Netuno volta mais baixo.
- `stars.bin` guarda a posição em 16 bits (Sírius ~37 UA, α Cen A ~14 UA fora): ver como as companheiras das duplas próximas são posicionadas.
- Pequenos: cauda de poeira de cometa com arco-íris no recorte ampliado; as barras do filme recolhem 24 px ao voltar ao Atlas; uma galáxia vizinha pisca ±1/255 no D3D11; o clarão do Sol não encolhe de 500 a 15.800 UA (`luz-do-quadro`).
- [dono] Ficaram fora da rodada 1: `public/` com ~454 MB de `.png`/`.jpg` que têm `.webp` (rodada de dados); os portões (`censo`, eslint nos `sol/*.js`, `data:verify` fora do `done`); a inércia do arrasto e o Sol trabalhando invisível (medir antes).

## Provas que faltam (antes: PLAN-AUDITORIA.md, PLAN-PROFUNDIDADE.md, PLAN-GALAXIA.md, PLAN-COORDENACAO.md)
- [dono] Celular de verdade, iPhone/Safari, Android e Firefox, e os níveis de qualidade baixos: nada das últimas rodadas foi provado neles (profundidade invertida, galáxia WebGPU e a ponte, Forja e giro das estrelas, poeira do Gaia, anéis). Pede as mãos dele.
- Na tela: poeira do Gaia ligada, eclipse de uma das sete luas pequenas, coma de cometa ativo, virada do anel F, lente em estrela dupla e cruz sobre estrela com corpo, ejeção solar com a profundidade invertida.
- Fechar ou descartar: −6 % de quadros nos anéis de perto com a profundidade invertida; 3,57 % de diferença ligado × desligado no Vulkan; tirar a marca de profundidade conservadora dos pedaços muda 9,5 % da vista (uma dica de otimização não devia mudar pixel).

## Profundidade: aparelhos sem a extensão (antes: PLAN-PROFUNDIDADE.md)
- [dono] Sem `EXT_clip_control` (~28 % dos Android, ~27 % dos Firefox) as estrelas e órbitas seguem por cima dos corpos de perto. Caminho pesado, não feito: desenhar o céu antes dos corpos e decidir a oclusão da lente por conta analítica (segundo mecanismo; só com a palavra dele).
- Decisões que valem: não mexer no `nearPlanePc`; não remendar material por material; `?profundidade=comum` fica como reserva até provar-se inútil.

## Filmes (antes: PLAN-AUDITORIA-FILMES.md e PLAN-FILME-ESTELAR.md)
- [dono] Filme estelar, E5: ele assiste e diz o que muda. Fracos conhecidos: Híades ralas, travessias vazias, faixa da Via Láctea repetida no Ato 4, passagem de g pelo lado da noite, bola branca em Betelgeuse.
- [dono] Trechos entregues a ele, esperando a escolha: horizonte que gira (solar 130,03 s, estelar 231,47 s; conserto `cima` por plano; na abertura do galáctico só com a palavra dele); `paraTrappist` (acabar a virada antes da emenda); `hiadesDeCima`; `osSeteGirando`; chicote de 166° no solar a 270,74 s; trancos de velocidade.
- [dono] `warp` que liga num quadro só nas emendas: a mola do motor conserta as do solar e muda cinco emendas do galáctico aprovado (antes/depois gravado com `--hud=1`). Também dele: direção e roteiro (legenda de Caronte, legendas densas, lente repetida, relógio parado no solar, travessias do estelar) e guardas novos (a régua do perfil tem o defeito da mira a 1 pc).
- Motor: a camada WebGPU que renasce congela ~1,2 s (quem toca o galáctico depois do Atlas ou de outro filme) — alisar o nascimento; clicar num filme com a tela de carga na frente não começa o filme; a precedência da URL de abertura mora em `useDirector.ts` e `abertura.ts` sem teste que as amarre; pico de ~1,1 GB por subida de imagem 8k não investigado.
- Nomes: em `marteRaspao` "Ceres" pode ficar sobre céu vazio; `destinoNaCena` não resolve corpo solar, companheira nem exoplaneta.
- Decisões que valem: não gravar o filme inteiro para conferir (fotos por plano, trecho curto); trocar `lerp().normalize()` por slerp nas primitivas fica fora (muda quadro aprovado).

## Anéis de Saturno (antes: PLAN-ANEIS.md)
- Quadradinhos claros nos pedaços a ≤ 5 m (também no filme a 241,4 s): diagnóstico feito, conserto proposto (malha × ponto pela distância DEPOIS do empurrão da esteira); medir o custo da CPU antes de escolher; conferir pedaços finos que faltam perto da câmera (mundo dependendo da câmera).
- Peso das esteiras (~+2,6 ms no cinema de perto, aceito por ele): alavancas não tentadas — Newton com o envelope linearizado, seno/cosseno fora do laço, não repetir a avaliação final depois do break. Não medido: tremor das esteiras com a câmera andando. Faltam: trava 0,046 × 0,05 no GLSL, testes da fronteira n·T/2 e gêmeo GLSL × CPU dos lugares.
- Na chegada à vista dos anéis, engasgo de ~1,4 s; tique de grão do AO VIVO a 1 Hz; com "Ao vivo", trocar a velocidade não fazia nada (conferir no relógio novo); celular em densidade 3 derrubou o Chrome sem tela (conferir num iPhone).
- Depois, em ordem: [dono] relevo pela máquina (h na descrição; ele vê com o Sol de hoje e com Sol rasante); véus F e E pela descrição; Urano, Netuno, Quaoar e Haumea pela mesma descrição (Haumea na lista do eclipse, modo `quaoar` morto); WebGPU para os pedaços.
- Miúdos: tirar o interruptor `?anelb=0`; fundir os dois leitores GLSL das regiões; espessura da Cassini só depois de ler o artigo; conferir se a onda das esteiras dá G/λ = 0,63.
- Decisão que vale: as duas frases de espessura dos anéis, "Deixe como está" — não mexer nem perguntar de novo.

## Estrelas — motor único e Forja (antes: PLAN-FORJA.md e PLAN-COORDENACAO.md)
- Motor único (régua dele: toda estrela tem todos os parâmetros, contínuos, zero = desligado): atividade contínua no lugar do liga-desliga `dinamo` e ciclo por estrela; convecção numa máquina só; giro diferencial e escurecimento de borda do Sol como parâmetros (`sun.js` diz u = 0,72 no comentário e usa 0,30); gás em volta (coroa, vento/disco, casca) em três máquinas; granulação com duas fontes.
- [dono] O filtro é do instrumento, um só por quadro (o da estrela em foco): contraria a frase "nada depende de foco" e mexe na troca disco ↔ ponto; decidir com imagem.
- A rampa de cor (o instrumento) não convence: célula quente de Betelgeuse estourada em creme, ~50 pontinhos cinza-azulados sob o véu, pico norte/sul 8× contra > 10× medido, lugar da célula quente posto ao nascer (não segue a data). [dono] Mostrados sem resposta: halo rosa de Rigel e Deneb, miolo azul-claro das quentes, Régulo de lado, Deneb de perto, Achernar de cima, companheira de Capella branca.
- Miúdos: Altair com contraste por temperatura local; faixa sem coroa no polo da companheira de Capella (`coronaVolume.js`); ângulo do eixo no céu medido (Altair, Achernar; abrir Che 2011 e Monnier 2012); o polo do Sol bamboleia 7° (giro com inclinação); manchas de Capella como rabiscos ocos; Próxima a 3 raios com linhas de órbita atravessando (conferir com a profundidade invertida).
- Devido: custo por quadro dentro da janela do Grande Escurecimento; abrir o app nas estrelas novas, uma a uma. [dono] Rodada de dados: v·sen i e números do Gaia no banco, giro de ζ Puppis (volta os braços do vento), curva de ΔV de Betelgeuse (ponto de luz e clarão).
- Decisões que valem: a nuvem de Betelgeuse não se desenha (fica na ficha); o Grande Escurecimento é véu de poeira; a cor do gás 1 : 0,29 : 0,77 fica; ganho do gás 0,15 (escolha dele).

## Duplicidades e corpos na fila (antes: PLAN-COORDENACAO.md e PLAN-FORJA.md)
- Ponto de luz com quatro desenhistas sobre uma PSF comum: conferir se a rodada já resolveu. Ruído/hash em GLSL em 12+ cópias: fundir só as idênticas, sem mudar imagem (último da fila).
- [dono] Tritão está "na fila" como o próximo corpo; o ramo `tritao` é o ponto de partida (leitor dos relevos medidos com teste; o lado borrado tratado como nunca visto, pela `completar-corpo`).
## Régua única dos corpos (antes: PLAN-REGUA-UNICA.md)
- R4, relevo corpo a corpo pela ordem única de fontes (medido → derivado das fotos → inventado com a estatística do real): conferir em que corpo a fila parou e se o relevo falso tirado da cor (item 144) já saiu.
- Abertos: a lei de luz (Lommel-Seeliger × Lambert) em corpo de gelo muito claro; rever o γ da R2 quando o relevo estiver certo; conferir se a foto colorida de Mimas também pede a reprojeção de latitude.
- Decisões que valem: média do mapa = p0 sem o pico de oposição, cor pelas razões medidas, o teto baixa γ e nunca a média; o 2/3 global confessado, não compensado; a Terra fora; nenhuma regra nova para as nuvens do gás local.

## Galáxia de partículas (antes: PLAN-GALAXIA.md)
- Imagem: faixa escura de perfil fraca (τ entre braços × coluna de HI não fecham com um κ só: poeira mais fina no plano ou κ por componente); barra oval de cima e branca de lado (mancha em t=148); nós de H II salmão; `saindo` bege; cauda alta do bojo em pontos soltos; cintilação em t=148 não reconferida.
- Acabamento: faixas de poeira somem além de 8 kpc; catálogo real de nuvens de CO não usado; `?forgetau=1` não testado no modo novo; planejador com 3.311 desenhos (medir CPU); teto do WebGL é contagem por tier, não orçamento de tempo; renovação da extinção em voo rápido de perto e corpo opaco na frente da galáxia sem prova.
- Fontes a conferir: fração nos braços 0,35, espectro de massa das nuvens M^−1,7, 25–35 % da luz do disco nas jovens. Carga ~1,5–2 s acima da clássica (adiar o sorteio extra só quando a câmera nasce dentro do disco).
- O controle "Partículas" dos Ajustes não muda a vista de fora quando o WebGPU desenha; engasgo de 0,5–0,7 s em cada vista depois de assentar; a vizinha à direita sai como figura colada com anel azulado.
- [dono] Apagar a clássica, as lâminas e o interruptor `?galaxia=` (três motores): decisão dele por imagem.

## Peso do app (antes: PLAN-PESO.md)
- Próxima leva: bloom + clarão em meia resolução onde não muda a imagem; as sondas de oclusão custam ~2,3 ms no Atlas. [dono] MSAA só nas fases com órbita; orçamento de pixels / menu de gráficos.
- Decisões que valem: otimizar é a mesma imagem com menos ms, nunca desligar opção; o MSAA já resolve uma vez só (fechado sem mudança).

## Poeira do Gaia (antes: PLAN.md)
- [dono] E4: padrões por preset (e o do celular) e os textos do selo; ganho/γ por fotos e a medição de fps e memória no iPhone — conferir (a E2 diz pendente; a E3c diz aprovado no iPhone, sem medida formal). Docs `RENDERER_CARTOGRAPHY.md` (camadas, residência, orçamento) e `GALACTIC_DATA_FOUNDATION.md`.
- [dono] Custo dos níveis finos (~+8–13 % no Cinema tocando): vale uma rodada de otimização (cache de tijolo por raio, ordem das leituras)?
- [dono] E5: a força k da cavidade dentro da poeira medida (por vídeo, 600–1250 pc). E6: o medido ensinando o inventado (quantis, depois carimbo; opção). E7: camada 2 de Vergely até ~5 kpc, só com termos de redistribuição verificáveis. E8: fecho (docs, créditos, linhas no BACKLOG, conferir no ar).
- Decisões que valem: R16F linear; interior de 68,8 pc zero e declarado; a textura inventada por cima do medido é o padrão aprovado (a variante que preserva a média foi recusada); o modelo de hoje fica como comparação até ele mandar tirar.

## Movimento da interface (antes: docs/PLANO-MOTION-UI.md, de setembro; histórico em `git show 61bc0050:docs/PLANO-MOTION-UI.md`)
- Feito de C1 a C6; ficou do C7: a régua de interrupções reprova um caso a 1440×900 (folha saindo + redimensionar) e nada foi visto em iPhone, Safari, Firefox, Android nem com "reduzir movimento" ligado num aparelho. Os comentários do código que citam "PLANO-MOTION-UI §…" apontam para esse histórico.

## Fechado nesta condensação
- Relógio do Atlas (antes: PLAN-RELOGIO.md): está no principal; o último passo, a sonda de movimento, foi convertido e roda até o fim (registrado no plano da auditoria).
- Passagem da coordenação (antes: PLAN-COORDENACAO.md): era o bastão da troca de máquina; o que não tinha virado commit foi distribuído nas frentes acima.
