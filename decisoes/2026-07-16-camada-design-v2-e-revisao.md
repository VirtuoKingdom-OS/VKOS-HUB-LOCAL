# Camada de design v2 do Site Guiado e Revisão de design

## Contexto

Sites gerados por IA carregam cacoetes que denunciam a origem (gradient text, grades de cards idênticos, eyebrow em toda seção, creme como fundo padrão). O Jesse trouxe quatro pacotes de design pra melhorar o resultado: impeccable (Apache 2.0), taste-skill (MIT), ui-ux-pro-max (MIT) e astryx (MIT, os sete temas). A regra da rodada: integrar sem virar frankenstein.

## Decisão

Em vez de instalar plugins, o conhecimento dos quatro foi destilado e fundido numa reescrita do templates/site/principios-visuais.md (352 linhas, uma voz, em português): leitura de design declarada antes de codar, cartela de 13 direções visuais com paleta, par de fontes e personalidade (as 7 direções do astryx traduzidas pro público local mais 6 da base do uupm), regras de execução, proibições absolutas com alternativa, teste final "parece IA?" e o contrato de marcação amigável ao Studio. O arquivo vive na referência vkos/ e foi copiado pros workspaces registrados. A iteração virou o atalho "Revisão de design" no painel Ajustar com IA da TelaSite: um preset do fluxo de ajuste escopado que critica a página pelo checklist e corrige os até 5 problemas mais graves, sem mudar texto nem seções.

## Por quê

O principios-visuais.md é o único documento de design que a sessão de site lê: melhorar ali melhora toda geração sem tocar em skill nenhuma. Destilar em uma voz evita instrução contraditória e gasta menos tokens que anexar três skills. A Revisão de design reusa a infraestrutura de ajuste que já existe (custo honesto de uma sessão, escopo validado no servidor), então a iteração de qualidade entrou sem backend novo. O padrão de reveal foi invertido pro seguro (sem JS a página nasce visível), corrigindo um risco real do arquivo antigo.
