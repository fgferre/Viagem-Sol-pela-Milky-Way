// ============================================================
// A FICHA DO OBJETO — o painel que o dono procurava (item 74).
//
// PALAVRAS DELE, 22/08: *"o 'em quadro' no projeto atlas orbital havia um
// elemento grande do HUD cheio de informacoes incriveis sobre os objetos
// selecionados. onde isso foi parar?"*. A resposta medida foi: nunca veio.
// O painel era o `Sidebar.tsx` do doador, 778 linhas, e a fusão trouxe a
// MECÂNICA do Atlas e deixou o CONTEÚDO para trás.
//
// ESTE ARQUIVO SÓ DESENHA. Toda a montagem — que linha existe, que unidade
// ela usa, de onde o número veio — mora em `lib/atlas/ficha.ts`, sem three e
// sem React. É a fronteira que o `PLANO-ATLAS` §3 nomeia como o
// anti-padrão do doador, onde vis-viva, parser de sobrescrito e layout
// dividiam o mesmo corpo.
//
// ELA É A QUARTA `.hud-dialogo`. Ajustes, Camadas e Busca já se penduram na
// barra medida, encostados à direita, com o mesmo teto; a ficha entra na
// mesma régua e só declara a largura dela. Nasce em `useDialogFocus`, o que
// faz o juiz de a11y julgar as quatro promessas do diálogo (o foco entra,
// fica preso, Esc fecha, volta ao gatilho) sem uma linha a mais.
//
// O CABEÇALHO É A ANTIGA `ContextLine`. O "em quadro" era uma peça solta no
// alto à esquerda: nome do alvo e os dois gestos da escada. Ele não some —
// vira o topo fixo da ficha, com a CLASSE do corpo ao lado do nome, que a
// linha antiga não tinha espaço para dizer. Sem seleção não há ficha, e sem
// ficha nada ocupa o topo.
//
// O DADO CHEGA NA PRIMEIRA ABERTURA, nunca no boot: são dois arquivos, o
// `corpos.json` (114 KB com a tradução) e o `texturas.json` (110 KB, que o
// mundo já baixou ao entrar no Atlas e o navegador serve do cache). Quem
// nunca abre a ficha não paga um byte. A memoização é a mesma de
// `buscarManifestUmaVez` — uma promessa por URL, guardada no módulo.
//
// E O "AGORA" RELÊ NO `onTempo`, nunca no laço de quadro (anti-padrão 3 do
// `PLANO-ATLAS`): o `jd` chega por prop, já limitado a 4 Hz pelo mostrador
// da máquina do tempo.
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { useDialogFocus, gatilhoDoDialogo } from '../lib/dialogFocus';
import type { CorpoNoJson, CorposDoAtlas, FonteDaFicha, IdDeSecao } from '../lib/atlas/ficha';
import { montarFicha, montarFichaDeEstrela } from '../lib/atlas/ficha';
import type { NamedStar } from '../three/config';
import type { ManifestDeTexturas } from '../three/world/corpos/texturas';
import { PROCEDENCIA } from '../three/selo';

/**
 * OS DOIS ARQUIVOS DA FICHA, cada um com a sua promessa única. Módulo e não
 * estado: duas fichas abertas em sequência (ou o StrictMode montando duas
 * vezes em dev) pedem o mesmo arquivo, e o segundo pedido tem de encontrar o
 * primeiro em voo. Falha NÃO fica grudada: a promessa é limpa, e a próxima
 * abertura tenta de novo — o precedente é o `RECARGAS_ATE_DESISTIR` das
 * texturas, onde um 404 transitório matava o globo a sessão inteira.
 *
 * O SEGUNDO ARQUIVO É O MANIFESTO DE TEXTURAS (item 74, parte B), e ele é
 * quase de graça: o mundo já o baixou ao entrar no Atlas, pela mesma URL, e
 * o navegador o serve do cache. São 110 KB, e a alternativa — copiar a
 * `origem` de cada corpo para dentro do `corpos.json` — seria a mesma
 * procedência escrita em dois artefatos.
 */
const emVoo = new Map<string, Promise<unknown>>();

function buscarUmaVez<T>(caminho: string): Promise<T> {
  const url = `${import.meta.env.BASE_URL}${caminho}`;
  const anterior = emVoo.get(url) as Promise<T> | undefined;
  if (anterior) return anterior;
  const nova = fetch(url)
    .then((resposta) => {
      if (!resposta.ok) throw new Error(`${caminho} indisponível (${resposta.status})`);
      return resposta.json() as Promise<T>;
    })
    .catch((erro: Error) => {
      emVoo.delete(url);
      throw erro;
    });
  emVoo.set(url, nova);
  return nova;
}

export function FichaDoObjeto({
  aberta,
  onFechar,
  corpoId,
  estrelaEmFoco,
  estrela,
  jd,
  camaraUa,
  fonte,
  podeAproximar,
  noSistema,
  onAproximar,
  onSistema,
}: {
  aberta: boolean;
  onFechar: () => void;
  /** o corpo em FOCO — a escada é a única escritora dele */
  corpoId: string | null;
  /** o NOME da estrela em foco, quando o foco é estelar */
  estrelaEmFoco: string | null;
  /** a LINHA do catálogo daquele nome — `null` para o centro galáctico,
   *  que é foco e não é estrela nomeada (a ficha dele fica só no cabeçalho) */
  estrela: NamedStar | null;
  /** o instante MOSTRADO pela máquina do tempo */
  jd: number | null;
  /** onde a CÂMERA está, em eclíptica heliocêntrica UA — `null` fora do
   *  Atlas, e aí a linha do "daqui" some */
  camaraUa: readonly [number, number, number] | null;
  /** a efeméride viva; `null` até ela chegar pela rede */
  fonte: FonteDaFicha | null;
  /** o corpo em foco tem degrau abaixo (mesh resolvido)? */
  podeAproximar: boolean;
  /** já estamos no enquadramento de abertura? (o botão some) */
  noSistema: boolean;
  onAproximar: () => void;
  onSistema: () => void;
}) {
  const dialogo = useDialogFocus('ficha', aberta, onFechar);
  const [corpos, setCorpos] = useState<Map<string, CorpoNoJson> | null>(null);
  const [texturas, setTexturas] = useState<ManifestDeTexturas | null>(null);
  /**
   * QUE SEÇÕES ESTÃO ABERTAS — e de QUE corpo, no mesmo estado.
   *
   * Duas armadilhas moram aqui, e o formato as fecha as duas:
   *
   * 1. `null` é o estado de NASCENÇA (a primeira seção aberta, as outras
   *    fechadas). Guardar a lista explícita desde o começo faria quem FECHA
   *    a primeira seção vê-la reabrir sozinha, porque "lista vazia" e
   *    "ainda não mexi" seriam a mesma coisa.
   * 2. O `corpo` viaja JUNTO em vez de um efeito zerar a lista quando o
   *    foco troca. Efeito que chama `setState` no corpo dele é render em
   *    cascata (e o lint da casa o proíbe, com razão): trocar de alvo
   *    desenharia uma vez com as seções do alvo ANTERIOR e só então
   *    corrigiria. Comparando aqui, o primeiro desenho já é o certo.
   */
  const [abertas, setAbertas] = useState<{
    corpo: string | null;
    secoes: readonly IdDeSecao[];
  } | null>(null);
  const alvo = corpoId ?? estrelaEmFoco;
  const escolhidas = abertas && abertas.corpo === alvo ? abertas.secoes : null;

  // A CARGA COMEÇA NA PRIMEIRA ABERTURA. `aberta` na lista de dependências
  // e não `corpoId`: trocar de corpo com a ficha fechada não pede rede.
  useEffect(() => {
    if (!aberta) return;
    let vivo = true;
    // SEM OS JSONs A FICHA CONTINUA ÚTIL: raio, gravidade, escape, distância
    // e velocidade não dependem deles. O que falta é a órbita, a prosa e a
    // procedência da imagem — e cada uma some sozinha, sem linha a explicar.
    if (!corpos) {
      buscarUmaVez<CorposDoAtlas>('data/atlas/corpos.json')
        .then((doc) => {
          if (vivo) setCorpos(new Map(doc.corpos.map((c) => [c.id, c])));
        })
        .catch(() => {});
    }
    if (!texturas) {
      buscarUmaVez<ManifestDeTexturas>('data/atlas/texturas.json')
        .then((doc) => {
          if (vivo) setTexturas(doc);
        })
        .catch(() => {});
    }
    return () => {
      vivo = false;
    };
  }, [aberta, corpos, texturas]);

  const ficha = useMemo(
    () =>
      corpoId
        ? montarFicha({
            id: corpoId,
            jd,
            fonte,
            editorial: corpos?.get(corpoId) ?? null,
            texturas,
            camaraUa,
          })
        : estrelaEmFoco
          ? montarFichaDeEstrela(estrelaEmFoco, estrela)
          : null,
    [corpoId, estrelaEmFoco, estrela, jd, fonte, corpos, texturas, camaraUa]
  );

  if (!aberta || !ficha) return null;
  const primeira = ficha.secoes[0]?.id;

  return (
    <div
      className="hud-cartao hud-dialogo atlas-ficha"
      aria-label={`Ficha de ${ficha.nome}`}
      {...dialogo}
    >
      <div className="atlas-ficha-topo">
        <div className="atlas-ficha-identidade">
          {/* `role="status"` como a antiga ContextLine e como a legenda do
              filme: trocar de alvo é notícia para quem ouve a tela. Os
              BOTÕES ficam fora dele — controle dentro de região viva seria
              relido inteiro a cada troca. */}
          <span className="atlas-ficha-nome" role="status" aria-live="polite">
            {ficha.nome}
          </span>
          <span className="atlas-ficha-classe">{ficha.classe}</span>
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar a ficha">
          ✕
        </button>
      </div>

      <div className="atlas-ficha-escada">
        {podeAproximar && (
          <button
            type="button"
            className="hud-btn small"
            onClick={onAproximar}
            aria-label={`Aproximar: enquadrar ${ficha.nome} de perto`}
          >
            ⊕ Aproximar
          </button>
        )}
        {!noSistema && (
          <button
            type="button"
            className="hud-btn small"
            onClick={onSistema}
            aria-label="Voltar ao enquadramento do sistema solar"
          >
            ⌂ Sistema
          </button>
        )}
      </div>

      {ficha.secoes.map((secao) => {
        const estaAberta =
          escolhidas === null ? secao.id === primeira : escolhidas.includes(secao.id);
        return (
          <section key={secao.id} className="atlas-ficha-secao">
            <h3 className="atlas-ficha-titulo">
              <button
                type="button"
                aria-expanded={estaAberta}
                aria-controls={`ficha-${secao.id}`}
                onClick={() => {
                  const base = escolhidas ?? (primeira ? [primeira] : []);
                  setAbertas({
                    corpo: alvo,
                    secoes: base.includes(secao.id)
                      ? base.filter((s) => s !== secao.id)
                      : [...base, secao.id],
                  });
                }}
              >
                <span>{secao.titulo}</span>
                <span className="atlas-ficha-seta" aria-hidden="true">
                  {estaAberta ? '▾' : '▸'}
                </span>
              </button>
            </h3>
            {estaAberta && (
              <dl className="atlas-ficha-linhas" id={`ficha-${secao.id}`}>
                {secao.linhas.map((l, i) => (
                  <div className="atlas-ficha-linha" key={`${l.rotulo}-${i}`}>
                    <dt>{l.rotulo}</dt>
                    <dd>
                      <span className="atlas-ficha-valor">{l.valor}</span>
                      {l.badge && (
                        <span className="atlas-ficha-badge">{l.badge}</span>
                      )}
                      {/* A PROCEDÊNCIA DE CADA NÚMERO, no vocabulário do
                          selo e em nenhum outro. O `title` carrega o que o
                          tier quer dizer, com as MESMAS palavras que a
                          legenda do selo usa — uma segunda redação aqui
                          seria o quarto tier fantasma. */}
                      <span
                        className={`atlas-ficha-proc ${l.procedencia}`}
                        title={PROCEDENCIA[l.procedencia].oQue}
                      >
                        {PROCEDENCIA[l.procedencia].rotulo}
                        {l.fonte ? ` · ${l.fonte}` : ''}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        );
      })}
    </div>
  );
}

/**
 * O botão que abre a ficha, na barra de controles — irmão do "⧉ Camadas" e
 * do "⌕ Buscar". Ele só existe quando há SELEÇÃO: sem alvo em foco não há
 * ficha para abrir, e um botão que não faz nada é pior que botão nenhum.
 */
export function BotaoDaFicha({
  aberta,
  nome,
  onAlternar,
}: {
  aberta: boolean;
  /** o nome do corpo em foco — vai no rótulo acessível */
  nome: string;
  onAlternar: () => void;
}) {
  return (
    <button
      className="hud-btn small"
      onClick={onAlternar}
      aria-label={`Ficha de ${nome}`}
      {...gatilhoDoDialogo('ficha', aberta)}
    >
      ⓘ {nome}
    </button>
  );
}
