# VKOS Hub

Este é o braço de desenvolvimento do VKOS Hub. Pasta autônoma, separada do workspace principal da VirtuoKingdom de propósito: aqui não se gasta contexto nem token com o resto da operação da VK. Só se desenvolve o app.

## O que é o VKOS Hub

Workspace multi-IA vertical. Um canvas ou cockpit onde várias sessões de Claude trabalham em paralelo, todas lendo o mesmo Cérebro (a identidade do negócio em markdown, o mecanismo do produto VKOS atual). O Cérebro como contexto compartilhado é o diferencial.

Público: dono de negócio ou prestador de serviço, não desenvolvedor. Local-first, pagamento único, nada hospedado. Também é a ferramenta de produtividade do próprio Jesse. Referências de inspiração: AIOX-CORE e Maestri.

## Leitura de contexto

No início de cada sessão, ler:

- `contexto/visao.md`
- `contexto/arquitetura.md`
- `contexto/roadmap.md`

Ler `contexto/ecossistema.md` só quando a tarefa tocar o produto VKOS ou o posicionamento.

Não confirmar a leitura. Só usar o que leu.

## Registro de decisões

Toda decisão de produto ou técnica tomada junto com o Jesse vira um arquivo curto em `decisoes/AAAA-MM-DD-titulo.md`. Cada arquivo tem três partes: contexto, decisão, por quê.

Antes de reabrir um debate já fechado, checar a pasta `decisoes/`. Se já existe decisão registrada, seguir ela em vez de discutir de novo.

## Manter o contexto vivo

Quando uma fase do roadmap concluir, ou a arquitetura mudar, atualizar o arquivo de contexto correspondente na linha certa. Editar o ponto que mudou, não reescrever o arquivo inteiro.

Toda tarefa que criar, remover, renomear ou mudar a responsabilidade de um módulo, tela, integração ou fluxo entre sistemas deve conferir `interno/mapa-sistema.json` antes de fechar. Se a mudança altera quem alimenta quem, atualizar os nós e ligações na mesma tarefa. O Mapa é parte do contrato vivo da arquitetura, não documentação opcional.

## Git

NUNCA fazer commit, push ou PR sem ordem explícita do Jesse. Sem exceção.

## Escrita

Vale para qualquer texto do projeto: código, comentários, docs, decisões, mensagens.

- Português brasileiro.
- NUNCA usar travessão "—" nem o caractere "·". Usar vírgula, ponto ou dois-pontos.
- Frase curta e direta.
- Sem jargão de startup.

## Como o Jesse trabalha

Em decisões estratégicas ele gosta de debater antes de travar. Apresentar opções fundamentadas com um recomendado, nunca uma resposta única fechada. Deixar o trade-off de cada opção claro.

Em execução ele quer velocidade e iteração. Quando ele disser "bora torar", é pra construir, não pra planejar mais.

Motion e UI caprichados importam muito para ele. A identidade da VK é minimalista, verde-menta #00C896, glow sutil, contraste confortável (nunca extremo). O app tem três temas: Escuro (o padrão, grafite neutro com menta de destaque), Dark VKOS (o escuro original da identidade) e Claro. Toda cor passa pelos tokens de tema de `app/web/src/estilos/global.css`, nunca hardcoded no componente. Toda interface nasce dentro desse padrão e funciona nos três temas.

## Código

O código do app vive em `app/` (server Fastify + web React/Vite). O contrato técnico das rodadas fica em `app/CONTRATO.md`.
