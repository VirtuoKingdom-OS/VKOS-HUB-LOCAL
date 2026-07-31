# Biblioteca de estilos e prompt design-first

## Contexto

As gerações de site saíam com cara de IA genérica. Auditoria de 2026-07-17 achou três quebras: o prompt tratava o design como um bullet no meio do encanamento técnico, a camada v2 (cartela de 20, skills /revisar-design e /refinar) vivia só no vkos2 sem chegar aos workspaces reais, e nenhuma revisão anti-slop rodava depois da geração.

## Decisão

1. Prompt de site reestruturado: o design é o PRIMEIRO bloco, com declaração obrigatória (direção da cartela + estilo escolhido + por quê) no início do trabalho. Regras técnicas compactadas no fim. No visual personalizado, as cores do usuário substituem só os tokens de cor; tipografia, spacing e motion continuam do estilo.
2. Biblioteca de 13 estilos concretos em `templates/design/estilos/` (curados de outros/designtypes, MIT/descritivos): nomes neutros em português (Caderno quente, Veludo neon, Diário de campo...), zero menção a marca de origem, tokens e valores na íntegra, com `indice.md` de escolha. Um estilo por site, executado inteiro; misturar é proibido.
3. Camada v2 propagada pra ojessegomes, estudio-aura, vkos e vkos2: cartela de 20, estilos, skill de site v2 (leitura de design + teste final "parece IA?"), /revisar-design (agora conferindo o estilo declarado) e /refinar.
4. Revisão de design é MANUAL: o preset da TelaSite invoca /revisar-design. Sem sessão automática pós-geração, pra não dobrar o custo por site. Candidata a rodada futura.

## Por quê

O material de design era bom; a entrega era fraca. Declaração obrigatória no topo transforma convite em ordem verificável. O estilo concreto (tokens com valores) mata o mingau genérico melhor que princípio abstrato. Propagar a v2 acaba com o desalinho de versão entre template e workspaces reais.
