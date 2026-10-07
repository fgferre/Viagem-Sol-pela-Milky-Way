# Telas de carregamento em rodízio — plano (07/10/2026)

Pedido dele: a tela de carregamento de hoje "tá muito feia"; repensar do zero, "mais linda e animada". Das quatro propostas (página privada `https://claude.ai/artifact/PpvoqnfoGisufyonwoHFjo`, protótipos em `capturas/carregamento/` do checkout principal) ele disse *"amei todas"* e pediu que cada visita mostre uma diferente. Palavras dele: *"revezar é melhor do que sortear"*; língua *"do jeito que é hoje"*; se algo for pesado no celular, *"tirar essa opção"* lá e deixar só nas máquinas melhores, *"ou ver se roda no celular mesmo assim"*.

Ramo `carregamento-rodizio`, na cópia de trabalho `../Viagem-carregamento` (outra conversa mexe no `main` ao mesmo tempo). Merge no `main` por marco aprovado por foto/vídeo; publicar é com ele.

## Decisões

1. Quatro telas: `nascer` (nascer do Sol em órbita), `ceu` (o céu se acende), `bercario` (berçário de estrelas), `galaxia` (a galáxia se forma). Rodízio por aparelho, nessa ordem, sem repetir até passar por todas; guarda a última no `preferencias.ts`. A primeira visita vê a primeira da ordem. Só entram no rodízio as telas já prontas.
2. Língua: a regra do app (`?lang` > escolha guardada > inglês). Todo texto pelo dicionário pt/en.
3. A cena roda FORA da thread principal: OffscreenCanvas num worker de módulo, com o próprio `requestAnimationFrame`; sem OffscreenCanvas/WebGL2 no worker, a mesma cena roda na thread principal. Medido (`capturas/carregamento/medicao/` desta cópia): na mesa a carga leva 5–6 s e a thread principal congela 4× de 0,2–0,37 s (fim dos catálogos, poeira, lâminas, shaders); com a CPU 4× mais lenta, 27–31 congelamentos, até 0,75 s.
4. Cena sem DOM (`src/components/telaDeCarga/cena.ts`); título, frase da etapa e porcentagem em HTML por cima, com a posição de cada tela em CSS. Rótulos que se mexem (constelações do `ceu`, "você está aqui" da `galaxia`) ficam para a etapa de cada uma.
5. Progresso real do diretor; o desfecho começa quando a carga termina e a tela de abertura entra no fim dele, no lugar do véu de hoje (tempo total parecido com os 2,2 s + 1,6 s atuais).
6. Falha no boot: o painel de falha de hoje (textos, "Tentar de novo", detalhes técnicos) sobre a cena escurecida. Falha depois do boot: o painel sobre fundo escuro, sem cena.
7. "Reduzir movimento": a cena 4× mais lenta e sem clarões. `?shot=1` congela; `?tela=<id>` força uma tela (juízes e fotos); `?loader=<etapa>` segue valendo com `?shot`.
8. A tela de hoje (vinheta da galáxia, trilho de 7 marcos, telemetria) sai quando a primeira nova entra.
9. Galáxia no celular: decidir na etapa dela, medindo; se pesar, sai do rodízio do celular.

## Etapas

1. [x] Cena `nascer` portada para TS sem DOM, igual ao protótipo pixel a pixel (fora o texto).
2. [x] A casa da tela: rodízio, worker com OffscreenCanvas e plano B na thread principal, texto e acessibilidade, falha, desfecho emendando na abertura, ganchos de teste; a tela velha apagada; juízes e testes que olhavam a velha atualizados. Fotos e vídeo na mesa e no celular, pt e en. → mostrar a ele.
3. [x] `ceu` (com os rótulos das constelações e o contador).
4. [x] `bercario`.
5. [x] `galaxia` no rodízio, também no celular (a palavra dele: "ver se roda no celular mesmo assim e deixa rolar"; com o celular emulado e a CPU 4× mais lenta, a carga sem folga acima de 18 ms). Falta ver num iPhone de verdade.
6. [ ] Vídeo das quatro para ele; `npm run done` (verde em 07/10), merge no `main`, publicação por ele, conferência no ar.

Fora do escopo: mudar a tela de abertura; uma tela estática antes do JavaScript chegar (vai para o BACKLOG se ele quiser).
