# VKOS Hub, repositório de desenvolvimento

**Versão 2.0.0.** Repositório privado. O pacote público do cliente vive em [vkos-hub-beta](https://github.com/OJESSEGOMES-VKOS/vkos-hub-beta) sob AGPL-3.0.

O VKOS Hub é um workspace multi-IA local-first: várias sessões de Claude Code ou Codex trabalhando em paralelo, todas lendo o mesmo Cérebro (a identidade do negócio em markdown). O usuário não é desenvolvedor; ele vê o negócio operando, não a orquestração.

> Este README orienta quem desenvolve. Quem for **usar** o produto começa pelo [LEIA-ME.md](LEIA-ME.md). Quem for **trabalhar no código** (pessoa ou IA) lê o [CLAUDE.md](CLAUDE.md) primeiro, que tem as regras da casa.

## Estrutura

```
app/                  O produto
├── server/           Fastify + TypeScript: sessões de IA, peças, publicação,
│                     CRM, calendário, automações, conexões
└── web/              React + Vite: cockpit, Studio, wizards, telas (3 temas)

vkos2/                Template do workspace entregue ao cliente
                      (Cérebro em branco, 33 skills, camada de design)

contexto/             O contexto vivo lido antes de agir
├── visao.md          O que é o produto e para quem
├── arquitetura.md    Como o app é construído por dentro
├── roadmap.md        As fases, em ordem
└── ecossistema.md    O produto VKOS e o posicionamento da VK

decisoes/             Uma decisão de produto ou técnica por arquivo
interno/              Material interno: mapa do sistema, resumo de contexto
planos/               Planos de rodada (temporários, apagados após executar)
ojessegomes/          Workspace real: marca pessoal
estudio-aura/         Workspace real: cliente

app/CONTRATO.md       O contrato técnico detalhado das rodadas
CHANGELOG.md          Histórico de versões
```

Fora do versionamento: `app/dados/` (dados e credenciais do usuário), `vkos/` e `outros/` (referências externas), `node_modules/`.

## Rodando

Requer Node 20 ou mais recente. A partir de `app/`:

```bash
npm install
npm run dev -w server    # backend na porta 4600
npm run dev -w web       # frontend na porta 5173, com proxy pro backend
```

Ou `npm run dev` para subir os dois juntos.

Antes de fechar qualquer rodada:

```bash
npm run checar -w server && npm run checar -w web    # typecheck
npm run testar -w server && npm run testar -w web    # 133 testes
npm run build -w web                                 # a 4600 serve o build
```

## Como o trabalho acontece aqui

1. **Rodada grande começa por um plano.** Uma pasta em `planos/` com visão, arquitetura e execução, auditada antes de executar. Depois de executada e fechada, a pasta é apagada.
2. **Toda decisão vira registro.** Um arquivo curto em `decisoes/AAAA-MM-DD-titulo.md` com contexto, decisão e por quê. Antes de reabrir um debate, conferir se já existe decisão.
3. **O contexto se mantém vivo.** Quando uma fase fecha ou a arquitetura muda, o arquivo correspondente em `contexto/` é atualizado na linha certa. Mudança que altera módulo, tela ou fluxo também atualiza `interno/mapa-sistema.json`.
4. **Nada de commit sem ordem.** Commit, push e PR só acontecem por pedido explícito.

## Princípios que não se negociam

1. **Local-first.** Nenhum dado do usuário sai da máquina dele. Sem backend hospedado, sem telemetria.
2. **A credencial é do usuário.** O Hub nunca recebe nem guarda token de IA; o login é pelo programa oficial do motor.
3. **Dado do usuário é sagrado.** Arquivo existente nunca é sobrescrito às cegas: na dúvida, quarentena com data. Migração usa valor padrão, nunca descarta registro.
4. **Dado pessoal de cliente nunca entra em peça publicável.** Insight agregado sim, nome e telefone nunca.
5. **Geração é verificada, não confiada.** Auditoria determinística antes de dar por pronto e antes de publicar.
6. **Funciona para leigo total, de fábrica.** Se exige configuração ou vocabulário técnico, ainda não está pronto.

## Convenções

- Português brasileiro em código, comentário, commit e interface.
- Sem travessão e sem ponto centrado em nenhum texto. Vírgula, ponto ou dois-pontos.
- Frase curta e direta. Sem jargão de startup.
- Cor só por token. A base é `app/web/src/estilos/global.css` e a camada final de tema é `app/web/src/estilos/visual-hub.css`, que carrega por último. Tudo funciona nos três temas: Escuro (padrão), Dark VKOS e Claro.
- Motion sutil, sempre respeitando `prefers-reduced-motion`.

## Distribuição

O pacote do cliente leva `app/`, o template `VKOS/`, os dois `.cmd` e o `LEIA-ME.md`. O instalador cuida de Node, dependências e Chromium. Ficam de fora: `app/dados/`, `contexto/`, `decisoes/`, `planos/`, `interno/` e os workspaces reais.
