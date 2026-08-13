// ============================================================
// A primeira lei de luz da casa — irradiância solar relativa 1/d²
// e o escalar FUNDIDO que os materiais de corpo resolvido vão
// multiplicar na luz direta (Onda 6, D2 do desenho).
//
// PROVENIÊNCIA: implementação NOVA da casa. O doador atlas-orbital
// (`src/lib/graphics/solarIrradiance.ts`) entra só como ESPEC — os
// seus testes-oráculo migraram traduzidos em `luz.test.ts` ao lado,
// com os valores numéricos copiados exatos; nenhuma linha de código
// dele atravessou (doutrina de travessia, PLANO-ATLAS §0).
//
// DIVERGÊNCIA DECLARADA do §7.4 do PLANO-ATLAS: o esboço de lá pede
// "UM EV de CENA por frame antes do ACES"; aqui o ganho é POR CORPO,
// dentro do material. Razão: a exposição global é da Onda 8, e as 18
// vistas oficiais do filme não podem mover um pixel nesta onda.
// Consequência assumida: em `assistida` as RAZÕES de brilho entre
// corpos são comprimidas (Mercúrio/Netuno cai de ~9400:1 para ~25:1);
// a ORDEM é preservada — x^σ é estritamente crescente. O selo reporta
// o EV do corpo EM FOCO, rotulado "por corpo". A auto-exposição da
// Onda 8 é quem realiza o §7.4 pleno; quando ela chegar, esta lei já
// entrega o E(d) exato que ela consome.
//
// O MODO DE FALHA DA CASA É O OPOSTO DO DOADOR. O oráculo herdado
// "recusa distância de render" nasceu num mundo que comprime até um
// teto de 3200 unidades — lá, o chamador errado estoura o clamp por
// CIMA e recebe preto uniforme. A cena da casa mede em PARSEC (os
// corpos vivem em 1e-6–1,5e-4 pc): um chamador que passar coordenada
// de mundo entra ABAIXO do clamp e recebe o PISO — E = 400, o máximo,
// UNIFORME para todos os corpos. Nunca plausível: todo planeta
// igualmente estourado de luz denuncia o bug na primeira vista, em
// vez de uma fotometria errada-mas-crível. O teste cobre os dois
// lados do clamp.
//
// SEM PISO DE AMBIENTE, por doutrina: os anti-padrões 3 e 9 de
// docs/reference/ATLAS-ANTIPADROES.md registram o que o piso 0,02 do
// doador custou (σ calibrado contra outra alavanca de display em
// silêncio; modo "real" sabidamente errado sem guarda). Lado escuro
// em `real` é escuro.
//
// A ENTRADA É UA DE EFEMÉRIDE, NUNCA COORDENADA DE MUNDO. A distância
// heliocêntrica vem da cadeia de efeméride (`efemerides.ts`), em UA
// físicas; amostrar posição de cena alimentaria uma lei física com
// número de display. O contrato é de CHAMADOR — esta lib recebe um
// `number` e não tem como distinguir; o clamp acima é a segunda
// linha de defesa, não a primeira.
// ============================================================

/**
 * A distância em que a irradiância vale 1,0 por definição, em UA.
 *
 * Âncora RELATIVA e PROVISÓRIA: "a Terra a 1 UA lê 1" é escolha de
 * normalização, não calibração radiométrica — o doador não tem
 * 1361 W/m² e a casa mantém a questão da radiometria absoluta
 * aberta e declarada (correção de fato 6 do desenho da onda).
 * Ancorar na Terra faz da lei uma redistribuição, não uma edição
 * global de brilho: quando a radiometria fechar, é ESTA constante
 * que move, não os chamadores.
 */
export const ANCORA_UA = 1;

/**
 * Clamp inferior da distância alimentada ao inverso do quadrado, em UA.
 *
 * Dois papéis. (1) A distância heliocêntrica do próprio Sol é 0 exato,
 * e o Sol está no catálogo — 1/d² sem clamp é divisão por zero
 * alcançável, não teórica. (2) É o lado da casa da "recusa de
 * distância de render": a cena mede em pc, então um chamador errado
 * entra AQUI embaixo e recebe E = 400 uniforme — nunca plausível (ver
 * cabeçalho). 0,05 UA fica bem dentro do periélio de Mercúrio
 * (0,3077 UA, a maior aproximação real do catálogo), com folga para
 * um futuro rasante: nenhum corpo real clampa hoje.
 */
export const MIN_UA = 0.05;

/**
 * Clamp superior da distância alimentada ao inverso do quadrado, em UA.
 *
 * Logo além do afélio de Sedna (~970 UA), o ponto mais distante que
 * um corpo do catálogo alcança — nenhum corpo real clampa. Existe
 * para que um chamador com unidade errada POR CIMA caia num valor
 * limitado e obviamente preto em vez de um denormal (o lado que
 * mordia no doador, cujo espaço de render corria até 3200).
 */
export const MAX_UA = 1000;

/**
 * O expoente de compressão da política `assistida`: fundido = E^σ.
 *
 * CHUTE DECLARADO, a recalibrar — não é constante medida. O 0,35 veio
 * do doador, onde foi escolhido contra a cadeia de display DELE
 * (inclusive o piso de ambiente 0,02 que a casa recusa por doutrina).
 * A recalibração contra a cadeia de display COMPLETA da casa — knee
 * asinh default-LIGADO + ACES + bloom com limiar 0,82 + gradação do
 * clarão — é trabalho da F2a, quando existir superfície na tela para
 * julgar (inclusive o par de vistas &nobloom do gate T-E10). Nada a
 * jusante depende do valor exato; mover σ move só o quanto a imagem
 * `assistida` comprime.
 */
export const SIGMA_ASSISTIDA = 0.35;

/**
 * As duas políticas de luz da casa (D2/D8 do desenho da Onda 6).
 *
 * - `real` — o fundido É a irradiância, bit a bit. Mercúrio ~10,4×,
 *   Netuno ~1/900. A posição sem assistência.
 * - `assistida` — o default do Atlas: E^σ, comprimido o bastante para
 *   os mundos distantes continuarem visíveis, monotônico o bastante
 *   para a ordem verdadeira de brilho nunca mentir.
 *
 * O `compensated` do doador (fundido = 1 para todos) morreu na
 * travessia: era o retrato pré-lei — decay 0, Mercúrio e Sedna com a
 * mesma luz — mantido lá como escolha explícita; a casa nasce sem ele.
 */
export type PoliticaDeLuz = "real" | "assistida";

/**
 * Irradiância solar relativa à âncora, de uma distância heliocêntrica
 * em UA DE EFEMÉRIDE — nunca coordenada de mundo (ver cabeçalho).
 *
 *     E(d) = (ANCORA_UA / d)²,  com d clampado a [MIN_UA, MAX_UA]
 *
 * Entrada não-finita devolve 1 (neutro), nunca NaN: um NaN no uniform
 * pinta o corpo de preto sem erro em lugar nenhum — o pior modo de
 * falha possível para um termo fotométrico (a lição dos clamps do
 * núcleo do Sol, c098470/9aff400, vale aqui antes de nascer o shader).
 */
export const irradianciaRelativa = (dUA: number): number => {
  if (!Number.isFinite(dUA)) return 1;
  const d = Math.min(MAX_UA, Math.max(MIN_UA, Math.abs(dUA)));
  const razao = ANCORA_UA / d;
  return razao * razao;
};

/**
 * O ESCALAR ÚNICO que um material de corpo resolvido multiplica na
 * sua luz direta — irradiância e assistência FUNDIDAS num número só,
 * antes de qualquer shader. Dois multiplicadores empilhados que
 * depois brigam é o modo de falha nomeado do doador (anti-padrão 1):
 * aqui só existe este.
 *
 * - `real` → devolve `irradianciaRelativa(dUA)` EXATO — a mesma
 *   conta, o mesmo double, identidade que o oráculo pina bit a bit
 *   via Object.is. NUNCA "ganho = 1": apagar o 1/d² e chamar de real
 *   seria o anti-padrão 1 reencarnado.
 * - `assistida` → E^σ com σ = {@link SIGMA_ASSISTIDA}. Estritamente
 *   crescente em E, logo preserva a ordem verdadeira de brilho e o
 *   sinal de variação ao longo da órbita — o que separa compressão
 *   honesta de equalização.
 *
 * Uma política fora do tipo (só alcançável de JS sem tipos) cai na
 * `assistida` — o default do Atlas (D8), nunca um caminho terceiro.
 *
 * CONTRATO DE CHAMADOR: `dUA` é a distância heliocêntrica da CADEIA
 * DE EFEMÉRIDE (satélite compõe com o pai até o Sol), não o semi-eixo
 * do registro orbital — o `a` de Europa é ~0,0045 UA (até Júpiter) e
 * daria irradiância ~10⁶× alta. O oráculo Europa/Júpiter (razão ≈ 1
 * a ±1e-2) entra na F2, quando existir o consumidor que compõe a
 * cadeia; esta lib pura não o inventa antes.
 */
export const ganhoFundido = (dUA: number, politica: PoliticaDeLuz): number => {
  const e = irradianciaRelativa(dUA);
  return politica === "real" ? e : Math.pow(e, SIGMA_ASSISTIDA);
};

/**
 * O deslocamento de EV que a política `assistida` aplica sobre a
 * `real`, em stops: ΔEV = (σ − 1) · log2(E). É o número que o selo
 * exibe como "passos de luz" — POSITIVO para d > 1 UA (Netuno ganha
 * ~+6,4 passos, o "+EV" que o gate do plano exige), NEGATIVO para
 * d < 1 (Mercúrio cede ~−2,2), ZERO exato na âncora.
 *
 * Coerência com o fundido, por construção: 2^ΔEV × E = E^σ — o
 * deslocamento é a MESMA compressão dita em stops, não uma segunda
 * alavanca (o oráculo pina a identidade a 12 casas).
 *
 * Na âncora a conta crua dá (σ−1)·0 = −0; normalizamos para +0 para
 * que "zero na âncora" valha também sob Object.is — um −0 exibido
 * como "−0 passos" no selo seria mentira de meia casa decimal.
 */
export const deslocamentoEVAssistida = (dUA: number): number => {
  const ev = (SIGMA_ASSISTIDA - 1) * Math.log2(irradianciaRelativa(dUA));
  return ev === 0 ? 0 : ev;
};
