# Plano: fechamento da base MVP local do VKOS Hub (multi-IA + inicializador)

Este é o plano da grande atualização que fecha a base de produto do VKOS Hub rodando local. Duas entregas grandes:

1. **Motor multi-IA**: o hub passa a rodar tanto com o Claude Code (`claude -p`, o motor atual) quanto com o Codex da OpenAI (`codex exec`). O usuário escolhe um dos dois e tudo funciona: sessões, fluxos, cerimônia do Cérebro, custos.
2. **Inicializador de um clique**: o usuário baixa a pasta do produto, dá dois cliques em `Instalar VKOS Hub.cmd` e o app o guia numa jornada visual (escolher a IA, instalar o CLI, fazer login, testar). Nas próximas vezes, um clique em `Iniciar VKOS Hub.cmd` abre o hub.

A pasta pode ser apagada depois que as três rodadas executarem e fecharem.

## Para QUALQUER IA executora (leia antes de tudo)

Este plano foi escrito pra ser executável por qualquer IA com acesso ao repositório (Claude Code, Codex ou outra). Regras de leitura:

- A raiz do repositório é a pasta `VKOSAPP`. TODOS os caminhos deste plano são relativos a ela.
- O código do app vive em `app/` (monorepo npm com workspaces `server` e `web`). Comandos rodam a partir de `app/`.
- Leia os arquivos deste plano na ordem: `01-visao.md`, `02-arquitetura.md`, `03-execucao.md`, `04-riscos.md`.
- Leia também, do repositório: `CLAUDE.md` (regras da casa), `contexto/arquitetura.md`, `contexto/roadmap.md` e `app/CONTRATO.md`.
- O plano cita arquivos e linhas do código como estavam em 2026-07-15. Antes de editar qualquer arquivo, LEIA o arquivo real: ele pode ter mudado. O que vale é o código, o plano dá a direção.
- Se a sua plataforma suporta despachar agentes em paralelo, siga a divisão de donos do `03-execucao.md`. Se não suporta, execute os donos de cada rodada EM SEQUÊNCIA (A, depois B, depois C, depois QA) num contexto só. O resultado é o mesmo, só demora mais.
- Onde o plano diz PONTO DE VERIFICAÇÃO, você precisa confirmar um fato no ambiente real (uma flag de CLI, um formato de evento) antes de escrever código que dependa dele. Nunca confie de memória: CLIs de IA mudam rápido.

Regras da casa que valem pra cada linha escrita (código, comentário, doc, mensagem):

- Português brasileiro.
- NUNCA usar o travessão nem o caractere de ponto centrado. Usar vírgula, ponto ou dois-pontos.
- Frase curta e direta. Sem jargão de startup.
- Toda cor de interface passa pelos tokens de tema de `app/web/src/estilos/global.css`, nunca hardcoded. Toda tela funciona nos 3 temas (Escuro, Dark VKOS, Claro).
- NUNCA fazer `git commit`, `git push` ou abrir PR. O Jesse é quem manda commitar, sem exceção.
- Typecheck sempre limpo antes de fechar: `npm run checar -w server` e `npm run checar -w web` (a partir de `app/`).
- Toda rodada que toca o frontend termina com `npm run build -w web` e a conferência de que `http://localhost:4600` está servindo o bundle novo (o Jesse usa a porta 4600, que serve o `app/web/dist` compilado).
- O servidor local costuma estar no ar na 4600. Não derrubar sem avisar no relatório.

## Como executar

Três rodadas encadeadas, que podem ser executadas em dias diferentes:

- **Rodada M1**: contrato de provedor de IA + refatoração do motor Claude por trás dele (zero mudança de comportamento).
- **Rodada M2**: provedor Codex + compatibilidade de workspace (AGENTS.md, skills, permissões, custos) + seletor na interface.
- **Rodada M3**: inicializador, jornada de primeira execução, arquivo único de iniciar, e o fechamento de portabilidade do pacote.

Quando o Jesse (ou o operador) tiver tempo, basta dizer:

> Execute o plano da pasta planos/fechamento-mvp

(ou "Execute a rodada M2 do plano planos/fechamento-mvp" pra continuar de onde parou; o executor confere o que já foi entregue antes de despachar.)

O executor deve:

1. Ler os quatro arquivos do plano e os arquivos de contexto citados acima.
2. Reconferir o código citado (em especial `app/server/src/sessoes/gerenciador.ts`, `app/server/src/config/estado.ts`, `app/server/src/ambiente/`).
3. Cumprir os PONTOS DE VERIFICAÇÃO do Codex CLI antes da rodada M2 (ver `02-arquitetura.md`, peça 3).
4. Despachar as rodadas na ordem, cada uma com typecheck, QA de gesto real e o checklist de fechamento do `03-execucao.md`.

## Estado

- Plano escrito em 2026-07-15.
- Nada executado ainda.
- Dependências: nenhuma de outros planos. O plano `planos/whatsapp` continua pendente e independente deste (quando executar, o transporte de sessão dele deve nascer em cima do contrato de provedor deste plano, se este já tiver executado).
- Custo de execução estimado: M1 com 2 Opus + 1 QA, M2 com 3 Opus + 1 QA, M3 com 3 Opus + 1 QA (máximo 5 agentes por rodada, regra da casa). Em executor sem paralelismo: as mesmas tarefas em sequência.
- Gestos que só o Jesse faz: instalar e logar o Codex CLI na máquina dele (pra fase real do QA da M2), aprovar o commit da limpeza de `app/dados` do git (M3), e o teste final da jornada de instalação numa pasta limpa.
