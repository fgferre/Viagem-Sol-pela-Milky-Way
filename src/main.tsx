import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// SEM `<StrictMode>`, e é DECISÃO — não esquecimento (a auditoria de
// 2026-08-12 pediu que ficasse escrito). O StrictMode monta cada efeito
// duas vezes em dev, e o efeito de boot do App constrói o `Director`,
// cujo construtor cria o contexto WebGL SINCRONAMENTE. Duas montagens
// seriam dois contextos, o segundo despejando o primeiro no teto de
// ~8–16 do navegador, mais um `init()` de ~3 s de CPU rodando em
// paralelo com o `dispose()` do outro. Em produção nada disso muda.
// O preço: nenhum efeito do HUD é exercitado em montagem dupla — quem
// cobre esse flanco é o Fast Refresh do dia a dia (que cai na mesma
// janela init×dispose, e é por isso que o `init` checa `disposed`
// depois de cada estágio) e os quatro juízes de navegador.
createRoot(document.getElementById('root')!).render(<App />)
