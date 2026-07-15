# Fechamento do MVP local: visão

## O que é o VKOS Hub hoje

Workspace multi-IA vertical, local-first, pra dono de negócio (não desenvolvedor). Um backend Fastify local (porta 4600) orquestra sessões de IA headless (`claude -p`) que leem o Cérebro do negócio (a identidade em markdown dentro da pasta VKOS do cliente) e produzem peças: carrosséis, sites, conteúdo. O frontend React (servido compilado pela própria 4600) dá o cockpit, o dashboard, os studios de edição, CRM, calendário, automações e conexões. Tudo roda na máquina do usuário, nada hospedado, pagamento único.

Hoje o hub tem DUAS amarras que impedem de entregar como produto:

1. **Só roda com Claude.** O motor de sessão chama o binário `claude` direto. Quem assina o ChatGPT (e é muita gente) não consegue usar.
2. **Só o Jesse sabe ligar.** Subir o hub exige Node instalado, `npm install`, `npm run build`, `npm start` e saber o que é uma porta. O público-alvo não faz nada disso.

## O que esta atualização entrega

### 1. Motor multi-IA

O hub passa a ter um contrato interno de "provedor de IA" com duas implementações:

- **Claude** (o atual): `claude -p --output-format stream-json`, com login da conta Anthropic ou Claude Pro/Max do usuário.
- **Codex** (novo): `codex exec` com saída JSON, com login da conta ChatGPT (Plus/Pro) ou API key da OpenAI.

O usuário escolhe o motor UMA vez na instalação (e pode trocar depois em Conexões). Tudo que o hub faz passa a funcionar nos dois motores: sessões do cockpit, fluxos guiados (carrossel, site), cerimônia do Cérebro, ajustar com IA nos studios, chat da IDE, custo por sessão.

O que NÃO precisa ser idêntico nos dois motores (limitações aceitas do MVP, sempre visíveis pro usuário, nunca silenciosas):

- Conexões MCP (GitHub, Netlify, Notion, o servidor de calendário próprio) funcionam só no Claude nesta versão. A tela de Conexões deixa isso claro quando o motor é Codex.
- O custo no Claude é exato (o CLI reporta em dólares). No Codex é estimado por tabela de preço de tokens, e a interface diz "estimado".
- A qualidade das skills do VKOS foi calibrada com Claude. No Codex, as skills são injetadas por prompt (ver arquitetura, peça 4) e funcionam, mas o texto pode variar. Isso é aceitável: o Cérebro e a metodologia seguem valendo.

### 2. Jornada de instalação de um clique

O usuário recebe a pasta do VKOS Hub (download ou pendrive). Dentro dela, dois arquivos com nome humano:

- **`Instalar VKOS Hub.cmd`**: roda UMA vez. Confere o Node (e guia a instalação se faltar), instala as dependências, compila o app, sobe o servidor e abre o navegador já na jornada de primeira execução.
- **`Iniciar VKOS Hub.cmd`**: o dia a dia. Um clique: sobe o servidor (se já não estiver no ar) e abre o hub no navegador. A instalação também oferece criar um atalho na área de trabalho apontando pra ele.

A jornada de primeira execução acontece DENTRO do hub (tela guiada, com o capricho visual da casa), não num terminal preto:

1. Boas-vindas: o que é o hub em uma frase.
2. Escolher o motor: card do Claude e card do Codex, com o que cada um precisa (assinatura ou API) em linguagem de gente.
3. Detectar o CLI escolhido: se não está instalado, o hub mostra o comando de instalação com botão de copiar e um botão "Verificar de novo".
4. Login: o hub abre a janela de login do CLI escolhido e confere quando o login conclui.
5. Teste real: uma sessão curta de verdade ("diga olá") streamando na tela, provando que tudo funciona.
6. Pronto: oferece o atalho na área de trabalho e cai no Dashboard.

A partir daí o onboarding que já existe assume (escolher a pasta VKOS do cliente, cerimônia do Cérebro etc.).

### 3. Fechamento de portabilidade do pacote

Pra pasta poder ser baixada por um estranho:

- Os dados do Jesse saem do versionamento (`app/dados/` e a pasta de backup antiga que vazou pro git). O repositório distribui o app, nunca dados de cliente.
- `app/CONTRATO.md` atualizado com o contrato de provedor (vira a fonte da verdade pra qualquer IA que mexa no motor depois).
- Um `LEIA-ME.md` de usuário final na raiz do pacote: o que é, o que precisa (Windows 10/11, conta Claude ou ChatGPT), como instalar, como iniciar, onde pedir ajuda.
- Alvo do MVP: Windows 10/11. As partes específicas de Windows (diálogo nativo de pasta, abrir navegador, taskkill) continuam como estão; mac/linux ficam anotados como evolução futura, não bloqueiam.

## O que fica de fora (decidido, não esquecido)

- Agente SDK, versão hospedada, multi-usuário: fora. O produto é local, um dono por máquina.
- MCP no Codex: fora do MVP (limitação visível).
- Outros motores (Gemini etc.): a arquitetura de provedor deixa a porta aberta, mas só Claude e Codex entram agora.
- Instalador gráfico assinado (MSI/exe): fora. O `.cmd` resolve o MVP; empacotamento bonito é evolução.

## Critério de fechamento (a régua do roadmap)

O plano fecha quando uma pessoa que não é o Jesse pega a pasta numa máquina Windows limpa (com conta Claude OU ChatGPT), instala sozinha com dois cliques, escolhe o motor, loga, e gera uma peça real (um carrossel ou um site) sem tocar em terminal. E quando o Jesse alterna o motor pra Codex na máquina dele e o hub continua operando o dia a dia.
