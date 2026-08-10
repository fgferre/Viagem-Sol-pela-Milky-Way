# Checklist de pré-fusão — o conhecimento operacional do atlas que a travessia não pode perder

> Encomendado pela Onda 0 quando o plano aposentou o `README.md` e o `HANDOFF.md`
> do doador ("o procedimento não mora neles — mora nos cabeçalhos dos scripts").
> Fontes abertas: README (64 linhas), HANDOFF (28) e os **9 scripts** de
> `scripts/` do atlas-orbital, todos lidos. **Correção de fato: o plano esperava
> ~13 itens; são 18** — as armadilhas vinham em trios acoplados dentro dos mesmos
> scripts (três jeitos distintos de renderizar um corpo "plausível mas errado"),
> e comprimir perderia risco real. Consumidores: **Onda 2** (dados, efemérides,
> catálogo — 13 itens), **Onda 6** (texturas — 4 itens), doutrina (1).
> Toda referência `arquivo:linha` é do doador (`~/Github/atlas-orbital`).

## Onda 2 — dados, efemérides e catálogo

1. **`HORIZONS_MODE=subpoint` é o único oráculo de orientação** (oráculo). Pede à
   Horizons o sub-ponto solar (QUANTITIES 14,20 — sub-lon/sub-lat body-fixed)
   visto do Sol: quantidade puramente de orientação, que só se move se pólo,
   meridiano-primo, taxa de spin ou escala de tempo estiverem errados — e vem da
   MESMA transcrição IAU feita pela JPL, logo falsifica a cópia própria. Sem ele,
   pólo/spin não têm verdade de solo: 2° de longitude é invisível a olho nu.
   Fonte: `scripts/generate-horizons-fixtures.js:19-42,152-155,190-272`.
   **Ação:** manter (ou recriar) o modo subpoint como gate de orientação de
   qualquer corpo com `iauOrientation`.
2. **Um W₀ errado renderiza um planeta perfeitamente plausível** (armadilha).
   Nada quebra: o corpo só gira errado. Por isso o kernel `pck00011.tpc` é lido
   por parser, nunca copiado à mão de PDF — "essa é a diferença toda".
   Fonte: `scripts/derive-iau-orientation.js:4-18`.
   **Ação:** toda `iauOrientation` nova nasce de parser sobre o kernel oficial.
3. **Os arrays `NUT_PREC_RA/_DEC/_PM` são POSICIONAIS** (armadilha) contra a
   tabela de ângulos compartilhada do sistema (ex.: Phobos → sistema de Marte);
   nada nomeia o pareamento. Errar o índice = corpo balançando no argumento
   errado com a amplitude certa — indetectável a olho.
   Fonte: `scripts/derive-iau-orientation.js:40-51,136-186`.
   **Ação:** preservar o parser posicional inteiro; não reimplementar de memória.
4. **Assimetria de unidades no modelo IAU** (armadilha): taxas do pólo
   (`ra1/dec1`) são por SÉCULO juliano; a de spin (`w1`) é por DIA. Confundir
   move o corpo por fator 36.525. Fonte: `scripts/derive-iau-orientation.js:30-38`.
   **Ação:** contrato explícito no código novo — é o erro de unidade que passa
   em review.
5. **O sentido de longitude se LÊ do cabeçalho de cada resposta Horizons**
   (armadilha): a convenção IAU corre a OESTE para prógrados, mas
   Terra/Lua/Sol usam LESTE. Hard-codar um sentido erra a maioria do catálogo
   por um SINAL — que lê como orientação plausível.
   Fonte: `scripts/generate-horizons-fixtures.js:217-235`.
   **Ação:** preservar o parse do frameLine antes de consumir sub-lon/sub-lat.
6. **O tempo-luz está embutido no sub-ponto e NÃO se "corrige"** (oráculo):
   Horizons reporta onde o sub-ponto estava quando a luz partiu; o consumidor
   reavalia no instante retardado. Conferido numericamente: Terra em
   2026-03-20T12:00Z, 3,9351°E contra 1,85°E geométrico = 2,08° nos 499 s de luz.
   Fonte: `scripts/generate-horizons-fixtures.js:35-42,259-271`.
7. **Época dos elementos osculadores em TDB, nunca UT** (armadilha): a diferença
   (~74 s em 2020) já desalinha Phobos (n ≈ 1128°/dia) em ~1°.
   Fonte: `scripts/derive-elements-from-fixtures.js:202-235`.
   **Ação:** a conversão `isoToTDB_JD` (Delta-T clampado 30–100 s) tem de casar
   exatamente com o conversor da casa — e pela regra M6, importa-se o conversor,
   não se re-deriva.
8. **`derive-elements-from-fixtures.js` é o companion reproduzível dos
   elementos tabulados** (procedimento): inverte (r,v) → elementos clássicos
   (RV→COE de Vallado/Curtis), determinístico, sem rede, e imprime o bloco que
   `satellites.ts`/`asteroids.ts` esperam.
   Fonte: `scripts/derive-elements-from-fixtures.js:1-17,99-200`.
   **Ação:** portar o pipeline (μ = razão de massa × k², corpo→pai, RV→COE),
   não só a tabela final.
9. **Fixture de Caronte é centrado no CORPO de Plutão (500@999), não no
   baricentro (500@9)** (armadilha) — diferença de ~2.100 km, e é o ponto do
   teste: o offset de Caronte se mede a partir do próprio Plutão.
   Fonte: `scripts/generate-horizons-fixtures.js:96-100`.
10. **`capSpectByFrequency` exige allowlist de classes de estrelas NOMEADAS**
    (bug conhecido, achado em smoke de 2026-05-07): sem ela, classes raras de
    estrelas famosas caem na cauda do corte top-N e viram `spect=''` — e
    Betelgeuse renderiza do tamanho do Sol.
    Fonte: `scripts/build-hyg-binary.js:139-222`.
11. **Os 4 tiers do binário HYG são PREFIXO ESTRITO um do outro** (oráculo):
    mesma estrela = mesmo índice em todos os tiers; é assim que o sidecar de
    nomes funciona sem duplicar dados. Fonte: `scripts/build-hyg-binary.js:1-22`.
    *(Este invariante já está herdado na matriz, linha "HYG 4 tiers".)*
12. **`canonicalizeSpect` arredonda subclasses (M5.5V → M6V)** (procedimento)
    para caber no cap de 1 byte (255 classes): ~2.800 → ~417 classes, erro de
    temperatura ~5% (mesma margem do Ballesteros de runtime).
    Fonte: `scripts/build-hyg-binary.js:78-137`.
13. **Padrão de download correto: buffer → validar → escrever** (procedimento
    + bug conhecido): `download-hyg.js` bufera tudo, valida tamanho (10–25 MB)
    e só então grava — nunca deixa arquivo parcial. MAS segue redirects para
    qualquer host, sem allowlist (falha apontada em auditoria e ainda viva).
    Fonte: `scripts/download-hyg.js:24-29,40-68,86-103`.
    **Ação:** copiar o padrão em qualquer downloader novo; adicionar allowlist
    de host no redirect. Interface de CLI/env do derive
    (`PCK_FILE`/`PCK_URL`, subset por argv, `--radii`) preserva-se junto —
    é o que permite rodar offline (`scripts/derive-iau-orientation.js:20-29`).

## Onda 6 — texturas e corpos

14. **`bake:earth-pbr` baixa da Wayback Machine** (procedimento): o host
    canônico responde 403 a User-Agents não-browser. E o roughness é o
    especular INVERTIDO (SSS pinta oceano claro; `roughnessMap` espera
    0=espelho). Licença CC BY 4.0, atribuição obrigatória.
    Fonte: `scripts/bake-earth-pbr.js:1-24,108-125`.
15. **`download-textures.js` abre o write stream ANTES de checar o HTTP**
    (bug conhecido, ainda vivo): um 404 deixa arquivo de 0 bytes em
    `public/textures/`, em silêncio. E o script nem está no `package.json`.
    Fonte: `scripts/download-textures.js:99-126`.
    **Ação:** na casa, status antes do stream (padrão do item 13).
16. **A allowlist de WebP é manual e já desperdiçou 53 MB** (armadilha):
    auditoria de 2026-07-23 achou a lista com 3 nomes e 9 PNGs pesados servidos
    sem WebP; hoje tem 5 nomes e segue manual.
    Fonte: `scripts/optimize-textures.js:29-38`.
    **Ação:** trocar lista manual por varredura de tamanho real do diretório.
17. **Guarda de pessimização do WebP** (procedimento): se o `.webp` não ficar
    menor que o original, é apagado e o runtime cai no original — nunca fica
    artefato maior que a fonte. Fonte: `scripts/optimize-textures.js:96-107`.
    **Ação:** preservar a checagem before/after no pipeline novo.

## Doutrina de higiene documental

18. **`docs-check.js`: registro de termos obsoletos com exceções por arquivo**
    (procedimento): cada termo nasceu de um bug real de doc (commits no
    cabeçalho); roda sobre os arquivos de caminho quente + waves.
    Fonte: `scripts/docs-check.js:1-22,37-48,65-149`.
    **Ação:** se a casa quiser mecanizar a regra L38 (consistência entre
    documentos), o MECANISMO vale portar; os termos específicos, não.

---

**Nota de escopo honesta:** o `textureVariantManifest.ts` (ladder de variantes
WebP) não foi pente-fineado aqui — a bancada da Onda 6 deve abri-lo antes de
recriar o pipeline de texturas. As licenças do `assetManifest.ts` têm arquivo
próprio: [`ATLAS-LICENCAS.md`](ATLAS-LICENCAS.md).
