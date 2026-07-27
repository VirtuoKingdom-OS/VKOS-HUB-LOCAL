# VKOS Hub Local

**Versão 1.0.0.** Repositório privado. Código fonte proprietário sob Business Source License 1.1, ver [LICENSE](LICENSE) e [NOTICE](NOTICE).

Workspace multi-IA local-first para operar um negócio inteiro de um lugar só. Várias sessões de IA trabalham em paralelo, todas lendo o mesmo Cérebro, a identidade do negócio escrita em markdown. Nenhum dado do usuário sai da máquina.

O usuário não é desenvolvedor. Ele vê o negócio operando, não a orquestração por trás.

> Quem for **trabalhar no código**, pessoa ou IA, lê o [CLAUDE.md](CLAUDE.md) primeiro. Ele tem as regras da casa.

## Índice

- [O que é](#o-que-é)
- [Arquitetura](#arquitetura)
- [Rodando](#rodando)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Como o trabalho acontece](#como-o-trabalho-acontece)
- [Princípios que não se negociam](#princípios-que-não-se-negociam)
- [Convenções](#convenções)
- [Licença](#licença)

## O que é

O Hub é um cockpit. De um lado, o Cérebro do negócio como contexto compartilhado. Do outro, as ferramentas que transformam esse contexto em trabalho entregue: peças visuais, sites, gestão de clientes e sessões de IA em paralelo.

O diferencial é o Cérebro. Toda sessão nasce sabendo quem é o negócio, para quem ele fala e como ele se posiciona. Não se repete contexto a cada pedido.

## Arquitetura

Duas camadas, uma máquina só.

```
CORE                      O nível do dono. Dashboard de gasto e projetos
                          ativos, lista de Workspaces, CRM e Conexões.

WORKSPACE                 O nível do trabalho. Um por cliente ou marca.
                          Cérebro, peças, sites, sessões de IA e arquivos.
```

O CORE é onde se controla. O Workspace é onde se produz. Dado de um Workspace nunca vaza para outro.

Detalhe técnico completo em [contexto/arquitetura.md](contexto/arquitetura.md). O mapa vivo dos módulos e das ligações entre eles fica em [interno/mapa-sistema.json](interno/mapa-sistema.json).

## Rodando

Requer Node 20 ou mais recente. A partir de `app/`:

```bash
npm install
npm run dev              # sobe server e web juntos
npm run dev -w server    # backend na porta 4600
npm run dev -w web       # frontend na 5173, com proxy pro backend
```

A porta 4600 serve o build do frontend quando ele existe. Para gerar:

```bash
npm run build -w web
```

### Antes de fechar qualquer rodada

```bash
npm run checar -w server && npm run checar -w web    # typecheck
npm run testar -w server && npm run testar -w web    # suite completa
npm run build -w web                                 # build de producao
```

Os três precisam passar. Rodada com teste vermelho não fecha.

## Estrutura do repositório

```
app/                  O produto
├── server/           Fastify + TypeScript
└── web/              React + Vite

contexto/             O contexto vivo, lido antes de agir
├── visao.md          O que é o produto e para quem
├── arquitetura.md    Como o app é construído por dentro
├── roadmap.md        As fases, em ordem
└── ecossistema.md    O produto VKOS e o posicionamento da VK

decisoes/             Uma decisão de produto ou técnica por arquivo
planos/               Planos de rodada, apagados depois de executados
interno/              Material interno: mapa do sistema
```

Fora do versionamento: `app/dados/` (dados e credenciais do usuário), `VKOS/` e os workspaces reais, `node_modules/`.

## Como o trabalho acontece

1. **Rodada grande começa por um plano.** Uma pasta em `planos/` com visão, arquitetura e execução, auditada antes de executar. Depois de fechada, a pasta é apagada.
2. **Toda decisão vira registro.** Um arquivo curto em `decisoes/AAAA-MM-DD-titulo.md` com contexto, decisão e por quê. Antes de reabrir um debate, conferir se já existe decisão.
3. **O contexto se mantém vivo.** Quando uma fase fecha ou a arquitetura muda, o arquivo correspondente em `contexto/` é atualizado na linha certa. Mudança que altera módulo, tela ou fluxo também atualiza `interno/mapa-sistema.json`.
4. **Nada de commit sem ordem.** Commit, push e PR só acontecem por pedido explícito.

## Princípios que não se negociam

1. **Local-first.** Nenhum dado do usuário sai da máquina dele. Sem backend hospedado, sem telemetria.
2. **A credencial é do usuário.** O Hub nunca recebe nem guarda token de IA. O login acontece pelo programa oficial do motor.
3. **Dado do usuário é sagrado.** Arquivo existente nunca é sobrescrito às cegas. Na dúvida, quarentena com data. Migração usa valor padrão, nunca descarta registro.
4. **Dado pessoal de cliente não vira conteúdo.** O que a IA recebe do CRM é agregado: contagem por estágio, valor somado, follow-up atrasado. Das conversas vai o primeiro nome do contato, senão o conselho não faz sentido, e o texto passa por uma limpeza que apaga telefone e email. Telefone e email completos nunca entram nesse contexto. Ver `decisoes/2026-07-27-o-que-a-ia-recebe-do-crm.md`.
5. **Geração é verificada, não confiada.** Auditoria determinística antes de dar por pronto.
6. **Funciona para leigo total, de fábrica.** Se exige configuração ou vocabulário técnico, ainda não está pronto.

## Convenções

- Português brasileiro em código, comentário, commit e interface.
- Sem travessão e sem ponto centrado em nenhum texto. Vírgula, ponto ou dois-pontos.
- Frase curta e direta. Sem jargão de startup.
- Cor só por token, nunca hardcoded no componente.
- Motion sutil, sempre respeitando `prefers-reduced-motion`.
- Toda interface funciona em todos os temas do design system.

Detalhe em [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

Business Source License 1.1. Ver [LICENSE](LICENSE).

Uso em produção não é concedido sem licença comercial escrita. Qualquer cópia ou derivado precisa preservar a atribuição descrita em [NOTICE](NOTICE). Quatro anos após a publicação de cada versão, ela passa automaticamente para AGPL-3.0-or-later.

Contato para licenciamento: jesseconta017@gmail.com
