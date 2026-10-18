# O peso do app — rodada de 18/10/2026 (a fila dele: *"vamos seguir com as melhorias"*)

Regra dele: otimizar é a MESMA imagem com menos ms (ou menos bytes); nada de desligar opção de Ajustes como ganho.
Medidas de partida (build a1e6ef50, M1 dele): `capturas/peso/quadro.md` (quadro) e `capturas/peso/rede.md` (rede).

## O que pesa
- Rodar, nível cinema (o padrão do visitante), janela 1440×733 a 2× (a que a tela dele abre): Início 14 fps,
  Atlas 24 fps. Por ablação, no Início 2560: **o Sol −97 de 165 ms (59 %)**; MSAA −25; bloom + clarão −22; galáxia −11.
  No Atlas/Saturno: MSAA −22 a −24, bloom + clarão −21 a −23. Galáxia de fora: os 4 M pontos −79 de 132 ms.
- Baixar: piso 8,3 MB em toda visita (gaia-ob-proxy 2,6 + stars + dust-density = 7,0 MB antes de tudo); Saturno 21 MB
  (11,7 são de Dione fora do quadro); Terra de perto 50 MB (18,5 da Lua); o celular baixa o mesmo que o desktop
  (tier `cinema` fixo: mapas 8192 e normais 4096 no iPhone).

## Frentes (um ramo e uma cópia por frente, juntadas em `peso-do-app` por prova)
1. **Sol do Início** (`../Viagem-peso-sol`, ramo `peso-sol`): mesma imagem, menos ms.
2. **MSAA uma vez só** (`../Viagem-peso-msaa`, ramo `peso-msaa`): a cena resolve uma vez; os passes depois em alvo
   simples (o item 144 mostrou o composer escrevendo 4× no alvo multiamostrado). Mesma imagem.
   → FECHADA SEM MUDANÇA (18/10): já é assim desde 03/09 (`CenaResolvidaUmaVez`, um resolve por quadro, conferido por
   rastro de GL). Os ~24 ms são o próprio MSAA 4× no ANGLE/Metal; nada que mantenha a imagem ajudou (descartar
   profundidade, profundidade 32f; `multisampled_render_to_texture` não existe no Chrome 155). O que sobra muda a
   imagem ou espera a palavra dele ("MSAA só nas fases com órbitas"). Achado: as sondas de oclusão custam ~2,3 ms no Atlas.
3. **Rede** (`../Viagem-peso-rede`, ramo `peso-rede`): o tamanho da textura pelo tamanho na tela (vizinho pequeno ou fora
   do quadro baixa pequeno; celular não baixa 8192); dados da galáxia só quando a galáxia aparece.
   → 18/10, sem commit: a regra pela largura na tela muda a imagem (o arquivo menor não é a redução da GPU do cheio:
   a Lua de 4096 difere até 51 níveis). Decisão: teto cheio para todo corpo visível > ~10 px; 1024 só fora do quadro ou
   abaixo de ~10 px — guarda quase toda a economia (o desperdício era fora do quadro). O teto de 4096 no celular muda a
   imagem: espera a palavra dele por A/B. Os 8,3 MB de base são todos usados na 1ª tela (gaia-ob-proxy e poeira): ficam.
Depois: bloom + clarão (meia resolução onde não muda a imagem), pontos da galáxia de fora.

## Prova de cada frente
A/B de pixel na mesma vista (ferramentas `scripts/visual/ab-identidade.mjs`, `diff-pixel.mjs`) + ms por ablação no
modo cru do `gpu-profile` (o timer por passe mente no M1) — a medida de tempo roda UMA de cada vez (GPU disputada
engana). Rede pelo `capturas/peso/rede-medir.mjs`. Prancha antes × depois para ele quando houver diferença visível.

## Estado (18/10, tarde) — primeira leva aprovada para publicar
- Publicado com a palavra dele: Sol (9141b0fe), rede (92157341, 59240976, 7786caef, fb81784f) e o teto 4096 do
  telefone (7c8ba94b, aprovado por A/B). `npm run done` verde no conjunto; Safari do iPhone simulado carrega a Terra.
- Próxima leva: bloom + clarão em meia resolução onde não muda a imagem; os pontos da galáxia de fora. Esperam a
  palavra dele: MSAA só nas fases com órbita; orçamento de pixels / menu de gráficos.
