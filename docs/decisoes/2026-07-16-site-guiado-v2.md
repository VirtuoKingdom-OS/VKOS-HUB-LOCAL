# Site Guiado v2

Data: 2026-07-16

## Contexto

O wizard de site restringia o objetivo e a estrutura a presets. O usuário precisava escolher seções genéricas mesmo quando queria descrever pacotes, preços ou uma ordem própria. O campo de detalhes aparecia cedo demais. Além disso, uma pendência da auditoria podia esconder um site que já existia e abria normalmente.

## Decisão

- Objetivo principal e seções passam a aceitar texto aberto.
- O tipo e o destino do botão principal continuam estruturados, pois controlam o CTA real.
- `Com imagens` reúne a galeria das Fontes de dados e o upload do computador. Os dois caminhos copiam o arquivo por `POST /api/anexos` antes da geração.
- Detalhes opcionais ficam na última etapa.
- Site existente com pendência conclui a geração e abre na TelaSite com aviso.
- A ausência real da peça continua sendo erro.
- A auditoria continua bloqueando GitHub e Netlify até todas as pendências serem resolvidas.
- Sessão encerrada depois de gravar o site não invalida o arquivo que ficou pronto.

## Por quê

O usuário ganha controle direto sobre a mensagem e a estrutura sem perder as escolhas mecânicas necessárias ao fluxo. A auditoria protege a publicação, mas não deve esconder um resultado navegável. O app passa a dizer com precisão o que foi gerado e o que ainda precisa de correção.

## Evidência da rodada

O caso `site teste 03` foi localizado. Sua auditoria atual é válida e o site responde HTTP 200, mas a sessão histórica ficou como `parada` sem evento de conclusão. A peça `site-ferramentas-ia` preserva o caso de auditoria inválida por `site.md`. A prova real do v2 gerou `2026-07-16-site-guiado-v2-estudio-aura`, usou duas imagens, respeitou a estrutura livre e terminou sem erros de auditoria.
