# A fonte é embarcada no repositório

## Contexto

O app não tinha um único `@font-face`. A pilha pedia `"Segoe UI Variable Text"` e depois `"Inter"`, e nenhuma das duas vinha junto.

No Windows 11 a primeira existe, então os oito pesos intermediários que o CSS usava (590, 620, 650, 660, 680, 720, 730, 760) funcionavam. Fora dali eles colapsam em 400 ou 700 e a hierarquia inteira achata. O navegador não avisa: a tela abre, o texto aparece, e a diferença entre título e corpo simplesmente some.

O Hub é local-first. Ele roda sem internet e o dono pode nem ter. CDN de fonte é dependência de rede, e fonte do sistema é dependência da máquina do outro.

## Decisão

O Inter variável entra no repositório, em `app/web/src/fontes/InterVariable.woff2`, 344 KB, sob SIL Open Font License 1.1. A licença vive ao lado, em `app/web/src/fontes/LICENSE-Inter.txt`, que é o que a OFL exige de quem redistribui.

O `@font-face` fica em `global.css`, dentro de `@layer base`, com `font-weight: 100 900` e `font-display: swap`. A pilha vira `"Inter", "Segoe UI Variable Text", system-ui, ..., sans-serif`: o resto só existe como rede de segurança, para a interface abrir com uma sem serifa parecida em vez de cair no Times se o arquivo não carregar.

Os pesos passam a ser quatro, e só quatro: 400, 500, 600, 700. Foram 66 declarações de peso ajustadas para caber neles.

O eixo `opsz` do Inter entrega o tamanho óptico de verdade, com `font-optical-sizing: auto` no `body`. Isso substitui o truque de trocar de família por faixa de tamanho (`Segoe UI Variable Small`, `Text` e `Display`) que o plano previa: não é mais preciso, e ele dependia justamente da fonte que a máquina pode não ter.

A monoespaçada continua vindo do sistema (`Cascadia Code`, `Consolas`), porque ela só aparece em terminal e em código, onde a fonte trocar não achata hierarquia nenhuma. Se um dia isso incomodar, embarcar uma segunda custa mais 200 KB.

## Por quê

Um arquivo de 344 KB numa aplicação que já roda local é barato. Ele é lido uma vez do disco, não da rede.

A alternativa de manter só a pilha de sistema custava a coisa mais cara que existe em software: uma falha silenciosa. A hierarquia tipográfica estaria certa na máquina do Jesse e errada na máquina do cliente, e ninguém descobriria, porque nada quebra.

Fonte variável num arquivo só, em vez de quatro arquivos estáticos, dá quatro pesos reais mais o eixo óptico pelo tamanho de aproximadamente dois estáticos.
