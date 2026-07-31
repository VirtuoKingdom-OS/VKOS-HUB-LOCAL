# Pacotes que ficam de referência e o mapa de licenças

## Contexto

A pasta outros/ recebeu sete pacotes. Quatro foram integrados destilados (ponytail, impeccable, taste-skill, ui-ux-pro-max, mais os temas do astryx). Três pedaços ficaram de fora e precisam de registro pra ninguém reabrir o debate sem motivo novo.

## Decisão

- Twenty (CRM): NÃO integra e NUNCA se copia código dele. Licença AGPL v3 com arquivos de licença comercial marcados. Fica só como referência visual e de UX, de olhar, pra evoluções futuras do CRM do Hub.
- shadcn/ui (MIT): não integra. É React com Tailwind; os sites do Hub são HTML estático sem build por decisão registrada, e a UI do Hub tem design system próprio. Referência de consulta.
- astryx como sistema de componentes (MIT): não integra pelas mesmas razões do shadcn. Os sete temas dele entraram destilados na cartela de direções (ver decisão da camada de design v2). O padrão "CLI consultável por agente" fica anotado como inspiração futura.
- Detector determinístico do impeccable: NO-GO nesta rodada. Vendorar exigiria mais de 6 mil linhas em 10 e tantos arquivos, fora do critério do plano. Caminho futuro possível: adicionar o pacote npm impeccable como dependência do server e chamar o CLI, se a auditoria sem custo de token virar prioridade.
- Skills ponytail e impeccable instaladas em .claude/skills/ do repo pra uso manual no desenvolvimento do Hub, com texto original em inglês (material de terceiro, exceção registrada à regra do português).

## Por quê

AGPL contamina produto proprietário pago: com o Twenty o muro é jurídico, não técnico. Com shadcn e astryx o muro é técnico: trocar arquitetura ou identidade por biblioteca de moda contradiz decisões registradas. O detector caiu por custo de manutenção, não por falta de valor: a porta fica aberta pelo caminho da dependência npm.
