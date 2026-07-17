# Geração visual exige Cérebro e usa imagegen no Codex

## Contexto

Claude e Codex encerravam normalmente quando o Cérebro estava em branco, mas não criavam o carrossel ou o site. O Hub interpretava a sessão concluída como arquivo ainda sendo salvo e mostrava uma espera sem fim. A etapa de imagens também exibia a geração por IA como indisponível, mesmo com o Codex conectado.

## Decisão

Carrossel e site só iniciam quando o Cérebro está preenchido. O servidor devolve erro claro antes de criar a sessão. Se qualquer sessão concluir sem o arquivo esperado, o frontend mostra a resposta real da IA após a última reconciliação.

Com Codex ativo, os assistentes de carrossel e site liberam Gerar com IA. O prompt invoca `$imagegen`, exige um bitmap real e salva o resultado dentro de `conteudo/<pasta>/img/`. Com Claude ativo, a origem continua sendo upload do usuário.

## Por quê

O status da conversa não prova que um artefato foi criado. A guarda elimina uma execução sabidamente impossível, e a mensagem real evita esconder recusas como se fossem lentidão. A geração nativa do Codex preserva a autenticação já escolhida pelo usuário e evita introduzir uma segunda API ou chave no Hub.
