# Auditoria do Gemini sobre o motor de filmes e os três filmes — 19/11/2026

O dono trouxe o relatório em 19/11 ("analisar e lidar com ele, coordenando o trabalho"). O texto dele e os dois vereditos (cada item conferido contra o código publicado, com arquivo:linha e número medido) estão fora do git, em `.cache/revisoes/`: `auditoria-gemini-filmes-2026-11-19.md`, `veredito-filmes-A-camera-rig.md`, `veredito-filmes-B-rotulos-legendas.md`. Os testes de medida dos revisores ficaram na cópia `..\Mar-auditoria-filmes` (`src/three/cinematic/zz-auditoria-*.test.ts`, só imprimem).

Placar: câmera 8 confirmados e 4 em parte (de 12); legendas e rótulos 15 confirmados, 4 em parte, 1 errado (de 20). Nenhum "visível" foi conferido na tela ainda: os números são do roteiro e do operador de câmera rodando a 60 quadros/s.

## Antes disto: a queda do filme solar (em andamento, mesma conversa)
- [x] causa: o filme segurava todo corpo visitado até o fim (3,2 GiB), e cada textura guardava uma segunda cópia na memória do sistema
- [x] motor decide sozinho pelo caminho da câmera (`PalcoDoRoteiro`, `cinematic/apoiosDoRoteiro.ts`); de carona resolve dois pontos da auditoria (Plutão/Caronte pedidos tarde; Urano)
- [x] fechar o `ImageBitmap` depois do upload (`corpos/texturas.ts`)
- [x] `npm run done` verde, commit, cópia de segurança (`origin/backup`); NÃO publicado
- Medido no site construído (`capturas/queda-filme-solar-19-11/`, livro-caixa das alocações e `quem-gasta`): nos anéis de Saturno o filme segura 0,8 GiB na placa em vez de 2,9; o pico é 2,1 GiB (Terra, Lua, Marte, Ceres e o sistema de Júpiter pedidos juntos). O filme com o conserto passou por todos os corpos com a imagem certa.
- O QUE NÃO ESTÁ RESOLVIDO: este PC tem o limite de memória reservável em 37,7 GB (32 de RAM + 5 de arquivo de paginação) e ~33 GB tomados pelos programas abertos (Claude 5, ChatGPT 2,5, Brave 2,4 e outros). Com 4,6 GB livres o filme ainda cai ao carregar a Terra (~100 s): a base do app reserva ~2,3 GB (processo da placa 1,7 com só 0,6 de textura contada; página 0,5) e as nove texturas da Terra e da Lua sobem no mesmo quadro (pico de ~2 GB). O site publicado cai aqui até abrindo só a Terra no Atlas; a versão consertada abre.
- [ ] subir as texturas de um lote uma por quadro, antes de publicar o lote (corta o pico da Terra; guardar o tamanho do mapa antes de fechar o bitmap, que `rochoso.ts` lê no `publicar`)
- [ ] depois de a placa desistir, "Tentar novamente" recomeça com imagens mais leves (um degrau de qualidade abaixo) e, no filme, do mesmo instante; hoje recarrega igual e cai de novo
- [ ] entender o 1,1 GB que o processo da placa reserva além das texturas contadas (WebGPU da galáxia? cópias do ANGLE?)

## Frente 1 — operador de câmera (motor; não muda quadro aprovado) — a fazer
1. Pausa: a mola da junta não anda com o filme pausado (`cameraRig.ts`, `else if (dt > 0 && !this.paused)`); hoje pausar logo depois de `titaChegada` gira a câmera 141,6° com o filme parado.
2. Lente: grampear `camera.fov` em [8, 75] depois de somar o desvio da mola (latente hoje; uma linha).
3. Salto da mira perto de 180° (`slerpVersor` em `movimentos.ts`, só usado por `lookEvento`): estelar `volta` 255,94 s salta 112° num quadro; solar `marteRaspao` 130,87 s 18° e `titaRaspao` 279,48 s 10°. O conserto da auditoria está errado (apagar a duplicata não cura; misturar eixos não leva o olhar ao destino). Caminho do revisor: referência de lado fixada por plano (função só do tempo, sem memória de quadro), sem tocar `slerpDir` nem o Atlas; provar o galáctico bit a bit igual (menor dot dele: −0,9922) e pôr um juiz do maior passo de mira por quadro depois do operador.
4. `warp` sem mola na junta: pulso de brilho num quadro no solar (48, 132, 144, 207,95 s). No galáctico o mesmo conserto muda o brilho perto de 94–181 s: fazer só se o galáctico ficar igual, senão vai para a lista do dono.

## Frente 2 — nomes e legendas (motor e roteiro; não muda texto aprovado) — a fazer
1. "Ceres" nunca ganha nome no solar (123–138 s): os anões não estão nas tabelas que o rótulo consulta e não têm posição na camada; precisa de fonte de posição pela efeméride (não é só acrescentar à lista, como a auditoria diz).
2. A linha "→ NEBULOSA DE ÓRION" nunca aparece no estelar (68–77 s): `emitDest` só resolve estrela nomeada; resolver pela mesma tabela dos assuntos e testar que todo `destino` resolve.
3. Estelar: "Sírius B" em `assuntos` de `siriusB`; duas legendas vazam o corte por 0,10 s e 0,05 s (encurtar a duração, não o texto); `auditarRoteiro` em `estelar/montar.test.ts`.
4. Solar: passar o filtro de nomes na montagem (teria pego o item 1). No galáctico não dá (ele nomeia estrelas do catálogo, que chega depois).

## Conferir na tela antes de decidir (trechos curtos, não o filme inteiro)
- Horizonte que gira por causa do `cimaDoFilme` (achado do revisor, a auditoria não mediu): galáctico 30,8 s (volta inteira em ~0,1 s, na abertura aprovada) e 68,85 s; solar 130,03 s; estelar 231,47 s. O grampo que a auditoria propõe não cura. Se aparecer na tela, o conserto mexe na abertura aprovada: precisa da palavra do dono.
- Chicote de 166° sem corte no solar, `enceladoPluma → titaChegada` (270,74 s): corte seco ou virada mais longa é escolha de direção.
- Trancos de velocidade: estelar `rumoASirius` 179,57 s e Betelgeuse 32 s; galáctico 111 s (mergulho aprovado).

## Do dono (texto ou imagem aprovada; levar com recomendação, uma pergunta por vez)
- Galáctico 61 s: Betelgeuse "engoliria a órbita de Júpiter" está errado (764 raios do Sol = 3,55 UA; a ficha e o filme estelar dizem Marte). Recomendo trocar para Marte nas duas línguas (texto pinado em `scripts/visual/filme-smoke.mjs:196`).
- Galáctico 99–104 s, "O berçário": as quatro estrelas citadas já ficaram 1.300 pc atrás; nenhuma ganha nome. Trocar o texto ou mover o momento.
- Legenda some sem esmaecer (o CSS diz que é de propósito): fazer a saída suave e mostrar antes/depois.
- Nome do corpo que não cede quando o disco enche a tela (uma linha em `rotulos.ts`; muda o que o solar mostra).
- Direção e roteiro (premissas conferidas no veredito B): legenda de Caronte (24 s sem legenda), legendas densas, 13 planos seguidos na mesma lente, relógio parado nos 54 planos do solar, travessias vazias do estelar, S2, Grande Escurecimento, estrelas achatadas.
- Guardas novos (régua do perfil nos três filmes, juízes de giro): a régua tem um defeito (mira a 1 pc) que dá falso "trecho morto"; teste novo é lista dele no fim da rodada.

## Fora do escopo agora
- As seis primitivas novas do §1.6 (cima por plano, enquadramento, keyframes, órbita local, mira que segue corpo, transição da lente de cinema): obra de motor para quando um roteiro pedir.
- Trocar `lerp().normalize()` por slerp nas primitivas (§1.4): muda quadros aprovados e não conserta defeito medido.

## O que a auditoria errou ou inflou (para não repetir)
- O filme estelar já está em cartaz no site; falta só a revisão do dono (E5).
- `rotacaoEntre(a, −a)`: inalcançável (a maior junta tem 166°). "95 % do giro em 0,2 s" no `mergulho[1]`: são 8 %.
- A mola a 4× não é defeito (assenta no mesmo tempo de parede). Legendas rápidas: 4, não 6. "26 planos seguidos em 58°": a maior sequência é 13.
