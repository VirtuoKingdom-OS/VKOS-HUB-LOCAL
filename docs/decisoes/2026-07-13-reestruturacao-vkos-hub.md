# Reestruturação do VKOS Hub: produto enxuto, local-first, com hub completo

## Contexto

O app cresceu em várias direções (terminal, post, stories, rotas, multi-workspace) e a decisão anterior de levar pra Netlify + Supabase abriu a discussão de público. O Jesse travou o rumo: o VKOS Hub é pra um público específico (prestador de serviço com Claude instalado), local-first, e precisa ser um hub de verdade, não uma ferramenta genérica.

## Decisão

O VKOS Hub continua local. A ideia de rodar online com cadastro de clientes fica adiada, não descartada. A reestruturação vem em fases, nesta ordem:

1. **Enxugar.** Terminal removido por completo (front, backend PTY, dependências). O menu de fluxos passa a ter só Carrossel e Site e páginas. Post e stories saem do menu, mas sessões e peças antigas desses tipos continuam renderizando (flag oculto, não exclusão de código de render).
2. **Fundação visual nova.** Design system com tokens, dois temas (claro e escuro) com contraste confortável, nunca extremo. Interface padrão de mercado, moderna, com a autenticidade da marca. Toda tela nova nasce nesse sistema.
3. **Cerimônia do Cérebro.** Cliente novo com Cérebro vazio entra primeiro num fluxo de entrevista guiada (as perguntas dos 13 blocos já existem na skill /instalar do VKOS). É a cerimônia de abertura de qualquer trabalho no hub.
4. **VKOS-IDE.** IDE integrada dentro do hub: árvore de arquivos, editor, e o chat do Claude Code com visualização das ferramentas. Poder total de uma IDE real, com modos de permissão explícitos por sessão.
5. **Conexões (MCP).** Tela de configuração pra conectar MCPs por workspace: GitHub, Netlify, Vercel, Notion. As sessões passam a receber os MCPs conectados.
6. **CRM.** CRM profissional pra prestador de serviço, personalizável, dados locais por workspace.
7. **Meta e Google Ads.** WhatsApp (conversas) e Instagram (postagem e gestão) via APIs da Meta; Google Ads via API oficial. É a fase de maior risco externo: exige app registrado na Meta, tokens, verificação de negócio, e mensagens recebidas do WhatsApp exigem webhook público (um relay ou túnel, mesmo local-first). Entra por último e por etapas: primeiro publicar no Instagram, depois ler conversas.

## Por quê

Enxugar primeiro porque cada peça a menos reduz o custo de tudo que vem depois. Visual em segundo porque todas as telas novas (cerimônia, IDE, CRM, conexões) nascem uma vez só, já no padrão novo, sem retrabalho de re-skin. Cerimônia antes da IDE porque é pequena e destrava o fluxo de cliente novo, que é o coração do produto. Meta e Google por último porque dependem de credenciais e processos de terceiros que não estão sob nosso controle, e o resto do hub não pode ficar refém disso.
