# visual-hub.css como camada oficial de tema

## Contexto

O checkup de 2026-07-17 flagrou duas fontes de verdade pro tema: `global.css` define os tokens base, mas `estilos/visual-hub.css` (importada por último em `main.tsx`) redefine os tokens por tema e vence. O menta real do app é `#2fd4a7`, não o `#00C896` que os documentos afirmavam. Quem seguisse o doc e editasse só `global.css` não mudava nada.

## Decisão

Assumir `visual-hub.css` como a camada OFICIAL e final de tema: `global.css` é a base, `visual-hub.css` carrega por último e fixa o valor que vale. CLAUDE.md, CONTRATO.md e docs/contexto/arquitetura.md corrigidos pra dizer a verdade (menta atual `#2fd4a7`, com o `#00C896` registrado como histórico da identidade). Nenhum valor de cor mudou nesta rodada. Tokens novos de tema (como os `--confirmar-perigo-*` da confirmação destrutiva) nascem na camada oficial, definidos nos 3 temas.

A consolidação das duas camadas num arquivo só fica anotada como rodada futura, com calma e conferência visual tela a tela.

## Por quê

Documentação que mente sobre onde a cor mora custa horas de qualquer sessão futura. Assumir a camada que já vence é a correção de menor risco: zero mudança visual, e o mapa volta a bater com o território.
