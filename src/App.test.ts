// Serve: chão — ?loader= só arma atrás do ?shot= e nunca vaza no link copiado; a lista de reservas dos rótulos cobre o HUD fixo
// Mordida: justificada — pina dois defeitos pontuais de um componente de ~1.100 linhas; o comportamento largo do App é dos juízes de navegador (a11y, atlas-smoke), e sabotagem fora dos pinos não é deste arquivo
// ============================================================
// App.tsx por texto-fonte — o App é DOM de ponta a ponta e o runner da
// casa é `node`, então o que ele decide se pina aqui como a "fiação no
// director" de terra.test.ts: lendo a fonte, nunca montando o React.
//
// A LEI DE `?loader=` (auditoria item 4): a porta fixa uma etapa da
// tela de carregamento COM O VÉU POR CIMA, para sempre — ela é
// ferramenta de captura, e captura anda com `?shot=`. Fora disso ela
// era uma armadilha dupla: um link de visita com `?loader=` prendia o
// véu preto sobre a cena, e o "copiar link" PROPAGAVA o parâmetro para
// quem recebesse.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FONTE = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
// o urlComMomento mudou de casa no corte 6 da onda da arquitetura — o
// pino do "copiar link" segue a função para o hook do espelho da URL
const ESPELHO = readFileSync(
  new URL('./hooks/useEspelhoDaUrl.ts', import.meta.url),
  'utf8'
);

describe('?loader= é ferramenta de captura (auditoria item 4)', () => {
  it('só é honrado com ?shot= presente — sem ele, nem se lê o valor', () => {
    // a guarda vem ANTES do find no inicializador de `loaderFixo`
    const inicio = FONTE.indexOf("if (!q.has('shot')) return null;");
    const find = FONTE.indexOf("LOAD_STAGES.find((s) => s.id === q.get('loader'))");
    expect(inicio).toBeGreaterThan(0);
    expect(find).toBeGreaterThan(inicio);
  });

  it('o link copiado NUNCA propaga loader — urlComMomento o apaga na entrada', () => {
    // o delete mora no próprio urlComMomento, antes de qualquer retorno
    // (inclusive o retorno do boot sem Director ou ainda na carga)
    const funcao = ESPELHO.indexOf('const urlComMomento = ');
    const apaga = ESPELHO.indexOf("url.searchParams.delete('loader')");
    const semDirector = ESPELHO.indexOf("if (!d || phase === 'loading') return url;");
    expect(funcao).toBeGreaterThan(0);
    expect(apaga).toBeGreaterThan(funcao);
    expect(apaga).toBeLessThan(semDirector);
  });
});

// auditoria rodada 2 (20/11): o endereço do "Tentar novamente" e do link copiado
describe('o recomeço guarda onde o visitante estava (item 4.3)', () => {
  it('na carga o endereço volta como chegou; no degrau mais baixo o momento é escrito só com a placa perdida', () => {
    const escritor = ESPELHO.slice(
      ESPELHO.indexOf('const urlComMomento = '),
      ESPELHO.indexOf('  const changeQuality')
    );
    const retorno = escritor.indexOf("if (!d || phase === 'loading') return url;");
    // antes de qualquer espelho do estado — nada de `filme`/`atlas`/`foco` apagados
    expect(retorno).toBeGreaterThan(0);
    expect(retorno).toBeLessThan(escritor.indexOf("url.searchParams.delete('filme')"));
    const recomecar = FONTE.slice(FONTE.indexOf('const recomecar = () => {'), FONTE.indexOf('window.location.reload();'));
    expect(recomecar).toContain('let url = enderecoDoRecomeco(contextoPerdido, quality.tier, momento);');
    expect(recomecar).toContain('if (!url && contextoPerdido) {');
    expect(recomecar).toContain("url.searchParams.set('q', quality.tier);");
  });
});

// auditoria rodada 3 (M11): o recomeço volta ao lugar, o link copiado não
describe('o endereço do recomeço leva o lugar (M11)', () => {
  it('voo livre: pos/look só no recomeço; começo do filme tocando: play=1; sem fov', () => {
    const inicio = ESPELHO.indexOf('  const urlDoRecomeco = () => {');
    const fim = ESPELHO.indexOf('};', inicio);
    expect(inicio).toBeGreaterThan(0);
    const corpo = ESPELHO.slice(inicio, fim + 5);
    expect(corpo).not.toContain("'fov'");
    const monta = new Function(
      'urlComMomento',
      'directorRef',
      'phase',
      corpo + ' return urlDoRecomeco;'
    );
    const camera = {
      position: { x: 1.5, y: 2.25, z: -3, clone: () => ({}) },
      getWorldDirection: (v: { x?: number; y?: number; z?: number }) => Object.assign(v, { x: 0, y: 0, z: 1 }),
    };
    const base = () => new URL('https://x.test/?filme=solar');
    const recomeco = (phase: string, d: object) =>
      (monta(base, { current: d }, phase) as () => URL)().searchParams;
    const livre = recomeco('free', { engine: { camera } });
    expect(livre.get('pos')).toBe('1.5,2.25,-3');
    expect(livre.get('look')).toBe('1.5,2.25,-2');
    expect(livre.has('fov')).toBe(false);
    expect(base().searchParams.has('pos')).toBe(false);
    expect(recomeco('journey', { currentTime: 0.2, pausado: false }).get('play')).toBe('1');
    expect(recomeco('journey', { currentTime: 0.2, pausado: true }).get('t')).toBe('0');
  });
});

// arremates da rodada 2 (20/11): o filme pausado voltava andando do
// "Tentar novamente" e do link copiado, porque `play=1` ia sempre
describe('o momento escrito guarda se o filme estava pausado', () => {
  it('pausado sai sem `play` (o boot abre congelado); tocando, e de dentro do Atlas, com `play=1`', () => {
    const inicio = ESPELHO.indexOf('    if (instante !== null && instante > 0.5) {');
    const fim = ESPELHO.indexOf('    return url;\n  };', inicio);
    expect(inicio).toBeGreaterThan(0);
    const escrever = new Function('url', 'instante', 'phase', 'd', ESPELHO.slice(inicio, fim) + 'return url;');
    const play = (phase: string, pausado: boolean) =>
      (escrever(new URL('https://x.test/?filme=solar&t=10&play=1'), 150, phase, { pausado }) as URL).searchParams;
    expect(play('journey', true).has('play')).toBe(false);
    expect(play('journey', true).get('t')).toBe('150.0');
    expect(play('journey', false).get('play')).toBe('1');
    expect(play('atlas', true).get('play')).toBe('1');
  });
});

describe('o link não carrega o que a vista já não é (item 12.2)', () => {
  it('apaga pos/look/fov/freeze e, sem instante a escrever, t/play — depois do retorno da carga', () => {
    const escritor = ESPELHO.slice(
      ESPELHO.indexOf('const urlComMomento = '),
      ESPELHO.indexOf('  const changeQuality')
    );
    const retorno = escritor.indexOf("if (!d || phase === 'loading') return url;");
    const portas = escritor.indexOf("for (const porta of ['pos', 'look', 'fov', 'freeze']) url.searchParams.delete(porta);");
    expect(portas).toBeGreaterThan(retorno);
    const semInstante = escritor.slice(escritor.indexOf('} else {', escritor.indexOf("url.searchParams.set('play', '1');")));
    expect(semInstante).toContain("url.searchParams.delete('t');");
    expect(semInstante).toContain("url.searchParams.delete('play');");
    expect(retorno).toBeGreaterThan(0);
  });
});

// ============================================================
// O QUE OS RÓTULOS CONTORNAM (item 56, 2026-08-20). A régua do defeito
// do dono não é o desenho — esse já sabia ceder (`LabelCanvas.test.ts`)
// — é a LISTA: o App reservava os diálogos e mais nada, então o HUD
// fixo não existia para o canvas. O que se pina aqui é que a lista cita
// as peças que trocam de arranjo, e que ela é a MESMA usada para medir
// e para observar: duas listas discordariam na primeira peça nova.
// ============================================================
describe('a reserva dos rótulos cobre o HUD fixo (item 56)', () => {
  const LISTA = FONTE.slice(
    FONTE.indexOf('const AREAS_RESERVADAS = ['),
    FONTE.indexOf("].join(', ');")
  );

  it('cita o rodapé, o selo e as tarjas — o HUD do flagrante', () => {
    expect(LISTA).toContain("':scope > [data-dialogo]'");
    for (const peca of [
      '.atlas-rodape',
      '.atlas-selo',
      '.filme-rodape',
    ]) {
      expect(LISTA, peca).toContain(`'${peca}'`);
    }
  });

  it('o painel do relógio, que SOBE do rodapé, também reserva — só no rodapé (A3)', () => {
    expect(LISTA).toContain("'.atlas-rodape .relogio-extras'");
  });

  it('da barra reserva os CONTROLES, nunca a caixa com o vão da quebra', () => {
    expect(LISTA).toContain("'.controls-bar > *'");
    // a caixa sozinha apagava nome a 290 px do botão mais próximo
    expect(LISTA).not.toContain("'.controls-bar',");
  });

  it('quem MEDE e quem OBSERVA leem a mesma lista', () => {
    expect(FONTE).toContain('root.querySelectorAll(AREAS_RESERVADAS)]');
    expect(FONTE).toContain(
      'for (const e of root.querySelectorAll(AREAS_RESERVADAS)) observador.observe(e);'
    );
    // e a barra é a ÚNICA exceção declarada: observada sem ser reservada,
    // porque a quebra de linha move os controles sem redimensioná-los
    expect(FONTE).toContain('if (barra) observador.observe(barra);');
  });

  it('a gaveta do selo (aninhada) e a bússola acesa (classe) também remedem', () => {
    const vigia = FONTE.slice(FONTE.indexOf('const vigiarAninhadas = () => {'));
    expect(vigia).toContain("mudancasDoHud.observe(selo, { childList: true });");
    expect(vigia).toContain(
      "mudancasDoHud.observe(bussola, { attributes: true, attributeFilter: ['class'] });"
    );
    // o HUD inteiro segue só com os filhos diretos — nunca a subárvore
    expect(FONTE).toContain('mudancasDoHud.observe(root, { childList: true });');
    expect(FONTE).not.toContain('subtree: true');
  });

  it('caixa vazia não vira retângulo — em ?shot=2 todo o HUD é display:none', () => {
    // desde o C1 do plano de motion o filtro também descarta a caixa de
    // repouso NULA (painel fora da árvore do HUD) — a regra da caixa
    // vazia continua a mesma
    expect(FONTE).toContain('b.width > 0 && b.height > 0)');
  });
});

describe('a tela de carga obedece a "reduzir movimento" também quando ela MUDA com o app aberto (12/09)', () => {
  it('`movimentoReduzido` é estado com ouvinte de `change`, o mesmo padrão de `useCelular` — não uma leitura única na montagem', () => {
    expect(FONTE).toContain('const [movimentoReduzido, setMovimentoReduzido] = useState(');
    const ouvinte = FONTE.slice(FONTE.indexOf("window.matchMedia?.('(prefers-reduced-motion: reduce)');"));
    expect(ouvinte).toContain("preferencia.addEventListener('change', aoMudar);");
    expect(ouvinte).toContain("preferencia.removeEventListener('change', aoMudar);");
    expect(FONTE).toContain('reduzido={movimentoReduzido}');
  });
});

describe('trocar de filme atualiza o HUD (a escolha visível, F1 da viagem solar)', () => {
  it('`play(id)` toca o filme, relê as marcas e o filme em cartaz do Director e espelha ?filme= no endereço', () => {
    // sem a releitura a barra de capítulos ficava com as marcas do filme do boot
    const play = FONTE.slice(
      FONTE.indexOf('const play = (id?: string) => {'),
      FONTE.indexOf('const scrub =')
    );
    expect(play).toContain('d.play(id);');
    expect(play).toContain('setFilme(d.filmeEscolhido);');
    expect(play).toContain('setTicks(d.progressTicks);');
    expect(play).toContain('espelharFilme();');
  });
});

describe('"Via Láctea" no caminho do Atlas leva a algum lugar (auditoria, item 11)', () => {
  const BARRA = readFileSync(new URL('./components/BarraOuAlcas.tsx', import.meta.url), 'utf8');

  it('o trecho tem clique, e o clique é o MESMO destino do cartão da Via Láctea na busca', () => {
    expect(BARRA).toContain(
      "{ chave: 'via-lactea', texto: t('contexto.viaLactea'), aoClicar: visitarViaLactea }"
    );
    const clique = FONTE.slice(FONTE.indexOf('visitarViaLactea={() => {'));
    expect(clique).toContain("LUGARES_DA_BUSCA.find((l) => l.id === 'via-lactea')");
    expect(clique).toContain("escolherAlvo({ tipo: 'lugar', lugar }, directorRef.current)");
  });
});

describe('o selo no filme (F4 da viagem solar)', () => {
  it('monta no filme só com a luz do roteiro no ar, que chega pelo fio do Director', () => {
    expect(FONTE).toContain('setLuzDoRoteiro: setLuzDoRoteiroNoAr,');
    expect(FONTE).toContain('{inJourney && luzDoRoteiroNoAr && directorRef.current && selo(directorRef.current)}');
    expect(FONTE).toContain('{hud.selo && directorRef.current && selo(directorRef.current)}');
  });
});

describe('a cerca do motor é apagada fora do motorPronto', () => {
  it('na saída da tela de carga e na desmontagem, com o teto de tempo sem sinal', () => {
    const solta = FONTE.indexOf('const soltarCerca = useCallback(');
    expect(solta).toBeGreaterThan(0);
    expect(FONTE.indexOf('gl.deleteSync(cercaDoMotor.current)', solta)).toBeGreaterThan(solta);
    expect(FONTE).toContain("if (carga === 'fora') soltarCerca();");
    expect(FONTE).toContain('useEffect(() => soltarCerca, [soltarCerca]);');
  });
});
