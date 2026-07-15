# Duas jornadas: Dashboard com criação guiada e Studio de edição

## Contexto

O fluxo de criação vivia só no cockpit: composer denso, muitos controles de uma vez, chat visível. O Jesse avaliou como amador e complexo pra quem não é usuário avançado. A sidebar listava um item por tipo de peça (Carrosséis, Posts, Stories, Sites, Textos), o que poluía o menu. E os clientes de teste (vkos de confeitaria, clientevirtual) não representavam o público que o hub quer servir.

## Decisão

1. O hub passa a ter duas jornadas. O Cockpit continua como está, pra usuário avançado. O Dashboard vira a tela padrão e a porta de entrada simplificada, com criação guiada estilo quiz: tema e modelo de IA, estilo e dimensão, imagens (sem, com ou intercalado), visual do negócio ou paleta manual, e Gerar com barra de progresso por fases no footer. O usuário nunca vê o chat nem a orquestração.
2. Ao concluir a geração, o usuário cai no Studio: página de edição com todas as páginas do carrossel lado a lado (scroll horizontal), com todo o poder do editor (texto, fontes, cores globais, imagem de fundo) e a capacidade nova de mover elementos (arrastar, guias de centro com snap, setas do teclado, posição original). O Studio substitui o editor overlay como o único editor.
3. Sidebar nova, nesta ordem: Dashboard, Cockpit, CRM, WhatsApp (em breve), Instagram (em breve), Conexões, seção Conteúdo condicional (Galerias, e Site e páginas, cada um só aparece se tiver peça), Fontes de dados, e VKOS-IDE sempre por último. Galerias unifica carrosséis, posts, stories e demais imagens numa tela só com filtro por tipo.
4. Cliente de teste único: Estúdio Aura, estúdio de design fictício com Cérebro completo nos 13 blocos e design-guide preenchido. Os workspaces vkos e clientevirtual saem do registro, a pasta clienteteste é apagada e o conteúdo de teste em vkos/conteudo é limpo. A pasta vkos/ segue intocada como cópia de referência.

## Por quê

A tese do produto é o negócio operando com a IA invisível. O composer do cockpit expõe a orquestração, o que serve ao Jesse mas afasta o público alvo (dono de negócio, não dev). Um fluxo guiado de uma pergunta por tela é o padrão que esse público já conhece (Typeform, Canva, Notion). O Studio com páginas lado a lado é o padrão de mercado de editores visuais. E um cliente fictício de design exercita o hub inteiro com material realista, coisa que a confeitaria de teste não fazia mais.
