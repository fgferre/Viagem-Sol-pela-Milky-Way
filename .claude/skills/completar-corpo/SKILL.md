---
name: completar-corpo
description: Linha de produção para a forma, o relevo e a imagem (cor) de um corpo do Atlas quando o dado real cobre só parte dele, é mais pobre que a tela, tem buraco, faixa lisa ou ruído — medido primeiro, o que falta extrapolado pelas estatísticas do próprio corpo, imagem por IA com pedido científico, régua, costura, confissão por canal e prancha. Use em toda rodada de asset de um corpo e sempre que um dado não cobrir o corpo inteiro.
---

# Completar um corpo

Palavras dele (13/10/2026): *"eu pego o dado que a gente tem e extrapolo para o resto que a gente não tem dados, de
forma que quando eu olho o objeto, eu saiba que ele tem dados reais e tem dados que são extrapolados baseados em uma
interpretação científica do objeto"* — e que isso seja sempre o mesmo método, não um caso por corpo.

Regra de ouro: o corpo inteiro com o mesmo nível de acabamento; nada feio onde falta dado; tudo o que não é medido é
dito na ficha, com a proporção. Nunca usar a estatística de outro corpo sem confessar.

## Os passos (sempre nesta ordem; cada um entrega um produto)

**0. Abrir.** Ler o bastão (`docs/PENDENCIAS.md`, só a seção O BASTÃO), a linha do corpo em `docs/reference/ASSETS.md`
e em `src/lib/atlas/reguaDosMapas.ts`. Cópia e ramo próprios (`git worktree add ../Viagem-<corpo> -b <corpo> main` +
links de `node_modules` e `.cache`); provas em `capturas/<corpo>/` (nunca sobrescrever: `-v2` ao lado).

**1. Inventário — `capturas/<corpo>/inventario.md` + um mapa de cobertura por canal.** As fontes reais (link, licença,
resolução, data) e, para forma, relevo e cor, onde cada pixel cai: medido nítido · medido liso · ruído · vazio · nunca
visto. Comparar sempre com o que a tela pede (o degrau 4096 px). Medir, não supor:
- relevo × foto por janela (ρ = energia fina do DEM ÷ energia de borda da foto, janelas azimutais): o modelo é
  `capturas/r4-encelado/mede-dem.mjs` — promover para `scripts/data/atlas/` no primeiro reuso;
- máscaras prontas: `mascarasDoDado` (`relevo-inventado.mjs`), `mascarasDaCor` e `vazioDoMosaico` (`cor-inventada.mjs`);
- a LATITUDE de cada foto (planetográfica × planetocêntrica) medida contra o relevo ou as crateras do Gazetteer antes de
  usar a foto para qualquer coisa — os mosaicos de Schenk são planetográficos (`LATITUDE_DE_SCHENK`, `lib-texturas.mjs`);
  sem isso a foto e o relevo "não conversam" e todo passo pela foto falha;
- ruído de estéreo no DEM: o ρ sozinho não acha; a ORIENTAÇÃO acha (relevo forte sem direção onde a foto tem direção,
  ladrilhos de borda reta) — `conserto-do-dem.mjs`;
- procurar dado REGIONAL melhor antes de inventar (ex.: o modelo SPC do JPL para o polo sul de Encélado, `relevo-spc.mjs`,
  leitor DAS/DSK da NAIF).

**2. Medido primeiro, na melhor resolução que o dado sustenta.** DEM → `gera-normal-de-dem.mjs` (tabela `CORPOS`);
modelo de placas → `relevo-medido.mjs`; Terra → `relevo-terra.mjs`. Guardas obrigatórias: georreferência conferida,
sha256 da fonte pinado, alinhamento contra a foto (`conferirAlinhamento`: meia volta e espelho — o layout Schenk põe o
sub-planeta na emenda). Polos calculados num quadro polar (`calotaPolar`), nunca derivada leste-oeste em linha
equiretangular perto do polo; nenhuma trava que jogue dado fora; linha ou coluna vazia na borda do GeoTIFF é margem,
não altura zero. Olhar o resultado numa vista POLAR e numa equatorial antes de seguir.

**3. Relevo que falta (vazio, liso ou ruído), por ordem de honestidade:**
- a foto vê → derivar da foto: crateras por `crateras-pela-foto.mjs` (posição e tamanho) + `relevo-por-foto.mjs`
  (`completaCratera` só soma a profundidade que falta sobre a base medida), sombra da foto tirada por
  `sombra-assada.mjs` — selo **derivado**;
- nada vê → inventar com as estatísticas do PRÓPRIO corpo medidas na parte boa (`medeLadoMedido`, `funcaoDeEstrutura`,
  `inclinacaoRms`, `leiDeCrateras`, a lei profundidade/diâmetro ajustada no DEM dele) por `condicionaOitava`/`colcha`
  (`relevo-inventado.mjs`) — selo **inventado** (na tela, "artístico");
- ruído do DEM (ρ ≫ 1 sem feição na foto) → suavizar até a escala que a foto confirma e completar como acima;
- costura sem emenda: `membranaHarmonica`/`costura` (`relevo-inventado.mjs`);
- bater a estatística (RMS, espectro) NÃO basta: em Encélado o ruído Gabor saiu "penteado" e os retalhos por exemplo
  saíram "colcha agitada"; o juiz é o olho contra a foto. Relevo pela foto só entra depois de VALIDADO em ladrilhos bons
  (esconder o fino medido, reconstruir pela foto, comparar banda a banda) — sem passar, fica liso e confessado.

**4. Imagem que falta.**
- foto em cinza ou realçada → a cor vem da régua (tinta medida) ou de `cor-inventada.mjs` (transferência guiada pelo
  relevo, corte de erro mínimo);
- região nunca vista → pintura por IA: a referência sai de `amostra-para-ia.mjs`; o pedido segue o modelo abaixo e fica
  salvo em `capturas/<corpo>/pedido-ia.md`; quem gera é ele no ChatGPT (ou o assistente no Chrome dele, com o sim
  dele); entra como `scripts/data/atlas/fonte/<corpo>-ia.png`; pós-processo de emenda, registro e sombra assada (hoje
  em `capturas/luas-pequenas/pa/pintura/gera-pintura.mjs` — promover no primeiro reuso).

Modelo do pedido científico (preencher com números e fontes, nunca adjetivos soltos):
> Mapa equiretangular 2:1 de <corpo> (<raio> km), só albedo: sem sombra, sem relevo pintado, sem nuvem, sem
> iluminação. Albedo médio <p0> e cor <B/G, R/G> (régua). Tipos de terreno e proporções vistos na parte medida:
> <lista>. Crateras: densidade <N por 10⁶ km²>, diâmetros <faixa>, frescas × degradadas <fração>. Feições com nome
> e coordenadas (Gazetteer da IAU): <lista>. Mantenha intacta a parte real da referência (<região>); invente só
> <região>, continuando a textura e a escala da parte real. Não invente: <lista>.

**5. Régua.** Todo mapa de cor passa pelo nivelador único (`regua-dos-mapas.mjs` pela cadeia) — nunca ganho por corpo
no shader.

**6. Conferir o resultado.** Repetir a medida do passo 1 no resultado (o ρ e o mapa de cobertura) e olhar as emendas
nas três vistas da prancha.

**7. Confissão (ASSETS.md + par em inglês em `texturas-em-ingles.mjs`).** Uma linha por canal com o selo do mais fraco;
nota de até ~200 caracteres com a proporção: "x % medido (<fonte>), y % derivado das fotos, z % inventado com as
estatísticas de <corpo>". Sem jargão na nota (número de item, nome de script, "esta casa").

**8. Prova e decisão dele.** Prancha antes × depois com três vistas — a pose dele (fase ~30°), o terminador e a região
mais pobre de dado — e o mapa de cobertura pintado (medido / derivado / inventado). Ele decide pela imagem. A cadeia de
dados roda no terminal dele e pede a palavra dele na conversa; depois `npm run done`, merge, e publicar é dele.

## Ferramentas de um corpo só

Ao usar num segundo corpo uma peça feita para um (Jápeto, Reia, Hipérion, Pã, Europa), generalizar ali, no ramo da
rodada, em vez de copiar; antes disso, não.
