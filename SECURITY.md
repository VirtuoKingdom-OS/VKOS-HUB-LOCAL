# Security Policy / Política de Segurança

VKOS Hub Local. Bilingual document. English first, Portuguese second.
Documento bilíngue. Inglês primeiro, português depois.

- [English](#english)
- [Português](#português)

---

## English

### Never open a public issue for a security flaw

This is the first rule of this policy. If you found a vulnerability, do not
open a public issue, do not open a pull request with the fix in the open, and
do not post it on social media. Use one of the private channels below.

### Threat model

VKOS Hub Local runs entirely on the user's machine. There is no hosted
backend, no telemetry, no remote account. The server listens on `127.0.0.1`
and is not exposed to the network.

That changes what matters. The main risk is not remote intrusion, it is local
leakage: a credential written in the clear, customer data ending up inside a
published piece, or a secret surviving the deletion of a workspace.

This local-first model is not a detail, it is the foundation of the threat
model. Nothing leaves the machine unless the user connects a third party
service with their own credential. Read the guarantees below with that in
mind.

### Product guarantees

1. **AI credentials never pass through the Hub.** Login happens through the
   official program of the chosen engine. The Hub does not receive, does not
   store and does not transmit AI tokens.
2. **Connection secrets stay on local disk**, inside `app/dados/`, outside
   version control. They never leave the machine.
3. **Deleting a workspace erases its data folder**, with everything left
   inside it, including the stamped copy that the migration to CORE preserved
   and that still carries tokens. The project's VKOS folder stays intact.
4. **A connection secret belongs to the owner, not to the workspace, and it
   survives the deletion of a project.** Since 2026-07-27 the Apify token
   lives in `app/dados/conexoes.json`, in CORE scope, because the account is
   a single one and it belongs to whoever operates the Hub. This is
   intentional: removing a project cannot erase the credential the others
   use. To take the credential off the machine, delete or clear that file,
   and revoke the token at the service. See
   `docs/decisoes/2026-07-27-conexoes-no-nivel-core.md`.
5. **No migration trail carries a secret value.**
   `conflitos-da-fusao.jsonl` records which integration diverged between two
   workspaces and where the losing value still sits on disk, never the value
   itself.
6. **The VKOS-IDE cannot reach `app/dados/`.** Since 2026-07-27 the IDE opens
   the installation root, and its chat runs in the same folder, and it can
   operate in "full power". The data folder disappears from the tree and
   answers 403 on read, write, create and delete, with the comparison
   ignoring path casing: the block sits in the resolver, not in the listing,
   so a hand typed path is refused too. The Hub keeps reading and writing
   there normally. See `docs/decisoes/2026-07-27-a-ide-abre-o-projeto.md`.
7. **Customer phone and email do not enter the AI context.** What the AI
   receives from the CRM is aggregated, and from conversations it gets the
   contact's first name plus the already cleaned text: the contact's known
   phone and email are erased, and then any email or sequence of 8 to 15
   digits left in the text becomes a marker. The summary carries an explicit
   prohibition against copying customer data into a publishable piece, with a
   test asserting the injected text. Know the limit: that prohibition is an
   instruction to a model, so it reduces the risk and does not eliminate it.
   The technical guarantee is the automatic cleaning, which always runs. See
   `docs/decisoes/2026-07-27-o-que-a-ia-recebe-do-crm.md`.
8. **User data is sacred.** A corrupted file goes to quarantine with a date,
   it is never overwritten by empty state.

### What is not protected

- Whoever has physical or administrative access to the machine has access to
  the data. Use the operating system's disk encryption.
- `app/dados/` is not encrypted at rest.
- The Hub trusts the AI engine process it starts itself.

### Scope

In scope:

- The source code of this repository, server and web.
- The installation and startup scripts shipped here.
- The way the Hub stores, reads and erases data in `app/dados/`.
- What the Hub sends into an AI engine's context.

Out of scope:

- The user's machine, its operating system, its antivirus and its other
  software.
- Third party AI engines, such as Claude Code and Codex. Report to their
  vendors.
- Third party services the user connects with their own credential, such as
  Meta, Google and Apify. Report to those services.
- Anything that requires physical or administrative access to the machine to
  exploit, since that is already stated above as not protected.
- Findings from automated scanners with no demonstrated impact on this
  codebase.

### Supported versions

Only the most recent version of the current line receives fixes. There are no
long term support branches, and there is no backporting.

| Version | Supported |
| --- | --- |
| Latest release of the current line | Yes |
| Any earlier version | No |

If you are on an older version, update before reporting.

### Reporting a vulnerability

Two private channels, in order of preference:

1. **GitHub Security Advisories.** Go to the repository, tab Security, then
   "Report a vulnerability". This is the preferred channel, because the whole
   thread stays private until a fix is published.
2. **Email.** jesseconta017@gmail.com, with "SECURITY" in the subject line.

### What to include in the report

- The affected version, and the operating system.
- A clear description of the flaw.
- Steps to reproduce it, as short as you can make them.
- The impact you believe it has.
- If you have one, a suggested fix.

### Do not include this in the report

Do not send tokens, credentials, passwords, customer personal data, or the
content of a real business Brain. If a real file is needed to explain the
flaw, redact it or build a minimal fake sample. A report that leaks data
creates a second incident.

### Response times

VKOS Hub Local is maintained by one person. These deadlines are what one
person can honestly sustain, and they are the commitment:

- **First reply: up to 5 business days.** Confirming the report was received
  and read.
- **Assessment: up to 15 business days.** Whether it is confirmed, what the
  severity is, and what the plan is.
- **Fix: according to severity.** Critical and high get priority and go into
  the next release. Medium and low enter the normal queue.

If you get no reply within 5 business days, resend. Messages do get lost.

### Credit

Whoever reports a confirmed vulnerability gets credit in the release notes and
in the advisory, with the name or handle they choose. If you prefer to stay
anonymous, say so in the report and no name is published. There is no bug
bounty program, and there is no payment.

### Disclosure

The fix comes first, the publication comes second. Once the fix is released,
the advisory is published with the technical detail. If a report is left
without a reply beyond the deadlines above, the reporter is free to disclose
it publicly.

### Checklist before releasing a version

- No secret committed. Check that `app/dados/` is outside version control.
- No token in a log, in an error message or in a route response.
- No personal data in a prompt that generates a publishable piece.
- Deleting a workspace clears its data folder, with the migrated copy inside.
  The CORE secret stays, and that is intentional.

---

## Português

### Nunca abra issue pública para falha de segurança

Essa é a primeira regra dessa política. Se você achou uma vulnerabilidade,
não abra issue pública, não abra pull request com a correção à vista de
todos, e não publique em rede social. Use um dos canais privados abaixo.

### Modelo de ameaça

O VKOS Hub Local roda inteiro na máquina do usuário. Não existe backend
hospedado, não existe telemetria, não existe conta remota. O servidor escuta
em `127.0.0.1` e não é exposto à rede.

Isso muda o que importa. O risco principal não é invasão remota, é vazamento
local: credencial gravada em claro, dado de cliente indo parar em peça
publicada, ou segredo sobrevivendo à exclusão de um workspace.

Esse modelo local-first não é detalhe, é a base do modelo de ameaça. Nada sai
da máquina, a não ser que o usuário conecte um serviço de terceiro com
credencial própria. Leia as garantias abaixo com isso em mente.

### Garantias do produto

1. **Credencial de IA nunca passa pelo Hub.** O login acontece pelo programa
   oficial do motor escolhido. O Hub não recebe, não guarda e não transmite
   token de IA.
2. **Segredo de conexão fica em disco local**, dentro de `app/dados/`, fora do
   versionamento. Nunca sai da máquina.
3. **Excluir um workspace apaga a pasta de dados dele**, com tudo que sobrou
   lá dentro, inclusive a cópia carimbada que a migração para o CORE
   preservou e que ainda carrega token. A pasta VKOS do projeto fica intacta.
4. **Segredo de conexão é do dono, não do workspace, e sobrevive à exclusão de
   um projeto.** Desde 2026-07-27 o token da Apify vive em
   `app/dados/conexoes.json`, no escopo CORE, porque a conta é uma só e é de
   quem opera o Hub. Isso é intencional: remover um projeto não pode apagar a
   credencial que os outros usam. Para tirar a credencial da máquina, apague
   ou limpe esse arquivo, e revogue o token no serviço. Ver
   `docs/decisoes/2026-07-27-conexoes-no-nivel-core.md`.
5. **Nenhum rastro de migração carrega valor de segredo.**
   `conflitos-da-fusao.jsonl` registra qual integração divergiu entre dois
   workspaces e onde o valor perdedor continua em disco, nunca o valor em si.
6. **A VKOS-IDE não alcança `app/dados/`.** Desde 2026-07-27 a IDE abre a raiz
   da instalação, e o chat dela roda na mesma pasta, podendo operar em "Poder
   total". A pasta de dados some da árvore e responde 403 em leitura,
   gravação, criação e exclusão, com a comparação ignorando a caixa do
   caminho: o bloqueio está no resolvedor, não na listagem, então caminho
   digitado à mão também recusa. O Hub continua lendo e gravando ali
   normalmente. Ver `docs/decisoes/2026-07-27-a-ide-abre-o-projeto.md`.
7. **Telefone e email de cliente não entram no contexto da IA.** O que a IA
   recebe do CRM é agregado, e das conversas vai o primeiro nome do contato
   mais o texto já limpo: o telefone e o email conhecidos do contato são
   apagados, e depois qualquer email ou sequência de 8 a 15 dígitos que sobre
   no texto vira marcador. O resumo carrega uma proibição explícita de copiar
   dado de cliente para peça publicável, com teste afirmando o texto
   injetado. Vale saber o limite: essa proibição é instrução para um modelo,
   então reduz o risco e não elimina. A garantia técnica é a limpeza
   automática, que roda sempre. Ver
   `docs/decisoes/2026-07-27-o-que-a-ia-recebe-do-crm.md`.
8. **Dado do usuário é sagrado.** Arquivo corrompido vai para quarentena com
   data, nunca é sobrescrito por estado vazio.

### O que não é protegido

- Quem tem acesso físico ou administrativo à máquina tem acesso aos dados. Use
  criptografia de disco do sistema operacional.
- `app/dados/` não é criptografado em repouso.
- O Hub confia no processo do motor de IA que ele mesmo dispara.

### Escopo

Está no escopo:

- O código-fonte deste repositório, servidor e web.
- Os scripts de instalação e de inicialização que vão aqui dentro.
- A forma como o Hub guarda, lê e apaga dado em `app/dados/`.
- O que o Hub manda para o contexto de um motor de IA.

Está fora do escopo:

- A máquina do usuário, o sistema operacional dela, o antivírus e os outros
  programas.
- Motores de IA de terceiros, como o Claude Code e o Codex. Reporte para o
  fabricante deles.
- Serviços de terceiros que o usuário conecta com credencial própria, como
  Meta, Google e Apify. Reporte para esses serviços.
- Qualquer coisa que precise de acesso físico ou administrativo à máquina
  para ser explorada, já que isso está declarado acima como não protegido.
- Achado de scanner automático sem impacto demonstrado neste código.

### Versões suportadas

Só a versão mais recente da linha atual recebe correção. Não existe ramo de
suporte estendido, e não existe backport.

| Versão | Suportada |
| --- | --- |
| Última versão da linha atual | Sim |
| Qualquer versão anterior | Não |

Se você está em uma versão antiga, atualize antes de reportar.

### Como reportar uma vulnerabilidade

Dois canais privados, em ordem de preferência:

1. **GitHub Security Advisories.** Vá no repositório, aba Security, depois
   "Report a vulnerability". Esse é o canal preferido, porque a conversa
   inteira fica privada até a correção sair.
2. **E-mail.** jesseconta017@gmail.com, com "SEGURANÇA" no assunto.

### O que incluir no relato

- A versão afetada, e o sistema operacional.
- Uma descrição clara da falha.
- O passo a passo para reproduzir, o mais curto que você conseguir.
- O impacto que você acredita que ela tem.
- Se você tiver, uma sugestão de correção.

### O que NÃO incluir no relato

Não mande token, credencial, senha, dado pessoal de cliente, nem conteúdo do
Cérebro de um negócio real. Se precisar de um arquivo real para explicar a
falha, tarje o conteúdo ou monte uma amostra falsa mínima. Relato que vaza
dado cria um segundo incidente.

### Prazos de resposta

O VKOS Hub Local é mantido por uma pessoa só. Esses prazos são o que uma
pessoa consegue cumprir de forma honesta, e são o compromisso:

- **Primeira resposta: até 5 dias úteis.** Confirmando que o relato chegou e
  foi lido.
- **Avaliação: até 15 dias úteis.** Se está confirmado, qual a gravidade, e
  qual o plano.
- **Correção: conforme a gravidade.** Crítica e alta têm prioridade e entram
  na próxima versão. Média e baixa entram na fila normal.

Se você não tiver resposta em 5 dias úteis, mande de novo. Mensagem se perde.

### Crédito

Quem reporta uma vulnerabilidade confirmada recebe crédito nas notas da versão
e no aviso de segurança, com o nome ou apelido que a pessoa escolher. Se você
prefere ficar anônimo, diga isso no relato e nenhum nome é publicado. Não
existe programa de recompensa, e não existe pagamento.

### Divulgação

Primeiro a correção, depois a publicação. Assim que a correção sai, o aviso de
segurança é publicado com o detalhe técnico. Se um relato ficar sem resposta
além dos prazos acima, quem reportou está livre para divulgar publicamente.

### Checklist antes de liberar uma versão

- Nenhum segredo commitado. Confira `app/dados/` fora do versionamento.
- Nenhum token em log, em mensagem de erro ou em resposta de rota.
- Nenhum dado pessoal em prompt que gera peça publicável.
- Exclusão de workspace limpa a pasta de dados dele, com a cópia migrada
  dentro. O segredo do CORE fica, e isso é intencional.
