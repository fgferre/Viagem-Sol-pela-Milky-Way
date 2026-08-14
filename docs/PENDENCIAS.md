# Pendências — o que está quebrado e o que falta

**Este é o primeiro arquivo a ler.** Ele é a lista viva do que está aberto neste
projeto, escrita em português simples, do jeito que o dono vê — não do jeito que o
código chama. O detalhe técnico mora nos commits, no `NORTE.md` e no
`ESCALA-HONESTA.md`; aqui só o essencial e o endereço de onde está o resto.

**Como esta lista funciona:**

- O dono reportou um problema? Escreva aqui **naquele momento**, com as palavras
  dele. Não no fim da sessão, não depois de confirmar.
- Item resolvido **sai da lista** e vira commit. Isto é o que está aberto, não um
  diário.
- A ordem é por **o quanto incomoda quem usa**, não por dificuldade.

**Estado do projeto em 2026-08-13:** a onda do Sol real fechou e está na `main` (Sol
com o tamanho verdadeiro, abertura refilmada e aprovada, Onda 6 integrada, a escada
do Atlas descendo até o corpo do Sol). O repositório tem **uma branch só**. A `main`
está **74+ commits à frente do GitHub e NÃO publicada** — por decisão do dono, porque
o repo é público e um push põe o site no ar na hora. Só sobe quando o visual estiver
do jeito dele.

---

## ALTA — o dono vê e incomoda

**1. O rótulo do Sol diz "FOBOS".**
Clicar no Sol no Atlas leva até ele, mas o nome que aparece na tela é o de outro
corpo. É a primeira coisa que se vê ao chegar lá.
→ commit `51d7777`, defeito 1.

**2. Faixas laranja andando pela tela.**
Um auditor viu faixas atravessando o quadro com o relógio andando. **Não reproduzido
ainda** — e não é fácil, porque a bancada de medição congela o relógio (item 11).
→ commit `51d7777`, defeito 3.

**3. A tela fica branca quando o Sol está longe.**
De ~1 UA a ~8 UA o quadro lava inteiro. Nove distâncias medidas, todas brancas.
*O que já sabemos:* o Sol é desenhado como um ponto de luz sem teto — a 1 UA ele
deposita cem bilhões onde branco já é 1 — e o borrão da lente espalha isso. **A bola
do Sol está certa; o brilho por cima é que está solto.** O conserto é a pupila
(auto-exposição), e o `NORTE.md` **proíbe** consertar com teto de brilho: com teto, o
Sol ficaria quase tão fraco quanto uma estrela comum, o que é bonito e mentiroso.
→ `docs/ESCALA-HONESTA.md:654-739`, `NORTE.md` ~3447.

**4. O Atlas desenha com o brilho apagado 100× em relação ao filme.**
É curativo, criado para esconder o item 3 dentro do sistema solar. É por isso que as
estrelas ficam secas no Atlas e cheias de vida no filme. **Decisão do dono: não pode
existir diferença de desenho entre os dois modos — o Atlas herda o look do filme.**
Morre junto com o item 3.
→ `atlasConfig.ts`, `director.ts` (`claraoDoQuadro`).

**5. O Sol do Atlas está congelado no máximo solar.**
Cheio de manchas e explosões, enquanto o do filme começa limpo. São dois Sóis
diferentes na mesma casa. O honesto é a fase do ciclo sair da **data** simulada.
→ mesma frente do item 4.

**6. A cena não reafia ao trocar de monitor.**
Os rótulos reafiam, a cena 3D não — a nitidez é decidida uma vez, no arranque.
→ `docs/ESCALA-HONESTA.md:856`.

**7. Trocar a qualidade ainda recarrega a página.**
O dono pediu "nada recarrega, padrão AAA". A Fase A fechou 3 dos 4 recarregamentos;
sobra a qualidade, mais três automatismos que decidem sozinhos sem o visitante
escolher.
→ `docs/NORTE.md:3734-3800`.

---

## MÉDIA — afeta o produto, não salta aos olhos

**8. `Esc` é a única tecla do Atlas, e não está escrita em lugar nenhum da tela.**
A busca também não tem atalho — só o botão.
→ `docs/PLANO-ATLAS.md:951-953`.

**9. Tela estreita quebra o rodapé.** Abaixo de 900 px a base do HUD estoura (medido
em 850, 800 e 700 px). → `docs/PLANO-ATLAS.md:960-967`.

**10. O selo de honestidade pode atrasar até 3 segundos.** Ele só se atualiza quando
a interface redesenha; um gesto que muda a vista sem mudar o foco deixa o selo velho
na tela. → `docs/PLANO-ATLAS.md:943-948`.

**11. A bancada de medição é cega para movimento.** Toda captura congela o relógio,
então defeito que só aparece andando não é pego por juiz nenhum. Foi por aqui que o
item 2 passou. → `docs/ESCALA-HONESTA.md:877-883`.

**12. Nenhuma foto de referência mora entre 1 e 40 UA** — justamente a faixa onde a
tela lava. → `docs/RETOMADA.md:241-248`.

**13. Sagittarius A✱ ainda é 125.884× maior que o real.** O segundo mentiroso de
escala, depois do Sol. → `docs/ESCALA-HONESTA.md:503-509`.

**14. `?foco=sol&ver=corpo` não desce até o Sol** — só o clique desce. O endereço
cai no sistema inteiro. → commit `51d7777`, defeito 2.

**15. Quando o quadro engasga, não há como aliviar o Sol.** As chaves de desligar
coroa e ejeção são lidas e nunca escritas. → `docs/ESCALA-HONESTA.md:853`.

**16. Engasgo ao entrar no Atlas** (a medir): o relógio do Sol acumula fora de quadro
e volta em salto. → `docs/ESCALA-HONESTA.md:859`.

**17. O Sol solavanca quando o relógio acelera.** O conserto existe, veio do projeto
irmão e está desligado; ligar depende de uma decisão do dono ainda aberta.
→ `docs/ESCALA-HONESTA.md:794-844`.

**18. A luz trata o Sol como ponto sem tamanho.** Certo para planetas, errado a
poucos raios solares — e agora a câmera chega lá. Sem penumbra.
→ `docs/ESCALA-HONESTA.md:650-653`.

**19. Texturas que não passaram e um mapa inventado.** Titã tem emendas visíveis,
Europa tem 68 linhas pretas no polo sul, Ceres é assumidamente inventado pela fonte,
e Vênus não tem foto em luz visível. → `docs/reference/ASSETS.md:6-29`.

**20. Asteroides são elipsoides, e o HUD não confessa.** Ele diz "cartografia real"
sem admitir o recuo procedural — e honestidade é a tese do produto.
→ `docs/reference/ASSETS.md:40-44`.

---

## BAIXA — dívida interna, ninguém vê

21. 22,9 MB de memória de vídeo paga e inútil.
22. 35 imagens de referência citadas que não existem, e as 6 fotos reais do Sol nunca
    foram baixadas.
23. A granulação do Sol não é física (45 Mm contra 1 Mm reais) e muda 55% conforme a
    placa de vídeo.
24. A dose da ejeção de massa (1,4) nunca foi calibrada.
25. Mergulhar no Sol é impossível abaixo de 1,44 raios solares — o corte come a
    superfície. Rasante estilo Parker cabe com folga.
26. O brilho das estrelas é relativo, não absoluto.
27. Faltam fixtures Horizons de Vênus, Júpiter, Saturno e Urano.
28. Dívidas internas de cor a re-dosar.

→ `ESCALA-HONESTA.md:855,858,884-897,740,647-649`; `NORTE.md:98-99,1624-1631`.

---

## O que o dono ainda vai contar

Esta seção existe porque em 2026-08-13 ele disse: *"muitas coisas estou vendo
quebradas no visual do app nesse momento"* — e essa lista nunca foi escrita. Quando
ele contar, o item entra aqui, com as palavras dele, antes de qualquer análise.

*(vazia — esperando)*
