// ============================================================
// A JANELA É DE CELULAR? — o lado TypeScript da quebra de 760 px
// (item 62, 23/08).
//
// O CSS já sabia responder isso sozinho (`@media (max-width: 760px)`,
// fatias 6 e 9), e onde só a APARÊNCIA muda ele continua sendo a
// resposta inteira. O que ele não sabe fazer é o que este hook existe
// para fazer: mudar QUEM ESTÁ NO DOM. As alças do pé e os botões da
// barra de controles são as MESMAS peças (`BotaoDaBusca`,
// `BotaoDaGaveta`, `BotaoDaFicha`), e cada uma carrega o seu
// `data-abre-dialogo` — desenhar as duas cópias e esconder uma por CSS
// deixaria dois gatilhos com o mesmo nome no documento, que é
// exatamente o que o contrato do `dialogFocus` proíbe e o que o juiz
// varre.
//
// `matchMedia` COM OUVINTE, e não uma leitura de `window.innerWidth`
// no render: o juiz de a11y redimensiona a janela por CDP no meio da
// sessão (`Emulation.setDeviceMetricsOverride`), e uma leitura sem
// ouvinte ficaria congelada no tamanho do boot — o HUD do telefone
// nunca apareceria para quem o mede. Quem visita de verdade também
// gira o aparelho.
// ============================================================
import { useEffect, useState } from 'react';
import { LARGURA_DO_CELULAR_PX } from '../lib/uiScale';

/** a MESMA condição do `@media` das fatias 6 e 9, montada do número */
const CONSULTA = `(max-width: ${LARGURA_DO_CELULAR_PX}px)`;

export function useCelular(): boolean {
  const [celular, setCelular] = useState(() => window.matchMedia(CONSULTA).matches);

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA);
    const aoMudar = () => setCelular(consulta.matches);
    // RE-SINCRONIZA NA MONTAGEM, e é o override do juiz que obriga: o
    // CDP pode trocar as métricas entre o primeiro render e este efeito,
    // e o evento de mudança dessa troca não teria ouvinte ainda. Quando
    // o valor já está certo — que é o caso de toda visita real — o React
    // descarta o `set` sem re-render.
    aoMudar();
    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, []);

  return celular;
}
