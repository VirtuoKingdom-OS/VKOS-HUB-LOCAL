# Plano: Site Guiado v2, controle aberto na geração

Rodada que dá ao Jesse controle real sobre a geração de sites, trocando o que é rígido por texto aberto, e conserta o falso erro da conferência (site gera certinho e o app diz que deu problema).

As quatro entregas:

1. Etapa "A estrutura" reformada: campo aberto pro objetivo nº 1 do site e campo aberto pras seções desejadas, os dois com placeholder de exemplo. Os presets rígidos de seção morrem.
2. Etapa de imagens: a opção vira "Com imagens" e, selecionada, abre a escolha entre pegar das Fontes de dados (galeria que já existe no editor) ou enviar do computador.
3. Campo "Detalhes (opcional)" movido pra última etapa (Visual e gerar), com placeholder dizendo o que dá pra pedir.
4. Falso erro consertado: quando o site existe e renderiza mas a conferência acha pendência, o app conclui a geração e mostra as pendências como aviso na tela do site, em vez de fingir que a geração falhou. A investigação do caso real (site teste 03) faz parte da rodada.

## Executor

Este plano será executado pelo GPT 5.6 Sol, num executor único, em fases sequenciais. Por isso:

- Cada fase tem critério de verificação PRÓPRIO antes de passar pra seguinte. Não pule verificação.
- Os caminhos e linhas citados foram auditados no código em 2026-07-16. Divergência pequena: adapte. Divergência grande: pare e avise o Jesse.
- Regras da casa em TODO texto e código: português brasileiro, sem travessão "—" nem o caractere "·", frase curta, cores só por tokens de `app/web/src/estilos/global.css`, tudo funciona nos 3 temas (Escuro, Dark VKOS, Claro), NUNCA commit nem push.
- Servidores possivelmente no ar (4600 backend, 5173 Vite): não derrubar.
- Typecheck a partir de `app/`: `npm run checar -w web` e `npm run checar -w server`. Testes do server: `npm run testar -w server`. Build: `npm run build -w web`.

## Como executar

Ler os três arquivos na ordem: `01-visao.md`, `02-arquitetura.md`, `03-execucao.md`. Depois cumprir as fases do 03 na ordem, com as verificações. No fim, o checklist de fechamento.

## Estado

- Plano escrito em 2026-07-16, código auditado nesta data.
- Nada executado ainda.
- A Fase 5 (prova real) gera UM site de verdade por sessão de IA, que custa dinheiro. É o critério de "realmente funcional" que o Jesse pediu. Não gerar mais de um sem aval dele.

## O que NÃO entra nesta rodada

- Nenhuma mudança no wizard de carrossel (EtapasCriacao.tsx) nem no cockpit (NoSessao.tsx).
- Nenhuma mudança na barreira de deploy: a auditoria continua bloqueando a PUBLICAÇÃO de site com pendência. O que muda é o app parar de esconder um site que gerou e está de pé.
- Nenhuma mudança nas skills do VKOS nem nos templates.
- A opção "Gerar com IA" (Codex) da etapa de imagens fica como está.
