# Imersão: menu de contexto próprio e bloqueio de DevTools

## Contexto
O Jesse quer o cockpit imersivo: sem F12, sem inspecionar, e o botão direito mostrando opções do app, não do navegador.

## Decisão
Interceptar no frontend: o menu nativo do botão direito vira menu próprio no padrão VK (sensível ao alvo: nó de sessão, nó de contexto, Cérebro, canvas vazio). Teclas de DevTools (F12, Ctrl+Shift+I/J/C, Ctrl+U) bloqueadas.

## Por quê
É o que dá pra fazer num navegador comum. Bloqueio absoluto de DevTools não existe em página web: o usuário ainda alcança pelo menu do navegador. A fronteira fica registrada: o bloqueio total entra quando o app for empacotado num shell próprio, na fase de distribuição. Pra imersão de uso diário, interceptar teclas e botão direito cobre o necessário.
