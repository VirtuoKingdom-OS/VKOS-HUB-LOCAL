# Ferramentas

Scripts que ajudam a conferir o Hub e não fazem parte do produto.

## `olhar-telas.mjs`, a conferência visual

Abre a interface num navegador de verdade, percorre as telas por rota, coleta erro de console e tira uma foto de cada uma.

### Por que existe

Os cinco portões de qualidade não veem um pixel. Eles provam que o código compila, que a lógica está certa e que o pacote sai. Nada provava que a tela abre.

Isso ficou caro em 2026-07-27, em duas rodadas seguidas. A mudança na ordem das camadas de estilo alterou o valor final de 98 seletores e a única prova foi uma medição feita à mão, jogada fora depois. E o chat de três painéis nasceu inteiro sem ninguém nunca ter olhado a tela.

### O que ele pega, e o que não pega

Pega a classe de defeito que passa batido no verde: tela que não renderiza, erro de runtime que só aparece no navegador, tela sem botão nenhum, e rolagem horizontal no corpo, que quase sempre é layout estourando.

Não pega nada de estética. Cor errada, espaçamento feio e hierarquia confusa continuam exigindo olho humano. As fotos existem justamente para isso, e para comparar antes e depois de uma mudança de estilo, que é onde a cascata quebra sem avisar.

### Como usar

O script não sobe o servidor. Suba antes, de preferência apontando para dados descartáveis:

```
cd app
VKOS_DADOS_TESTE=/tmp/dados-de-teste VKOS_PORT=4702 npx tsx server/src/index.ts
```

Depois, de outra janela:

```
node ferramentas/olhar-telas.mjs --porta 4702 --saida ./fotos-telas
```

Nos três temas, que é o que a identidade exige:

```
node ferramentas/olhar-telas.mjs --porta 4702 --saida ./fotos-telas
node ferramentas/olhar-telas.mjs --porta 4702 --saida ./fotos-telas --tema dark-vkos
node ferramentas/olhar-telas.mjs --porta 4702 --saida ./fotos-telas --tema claro
```

Ele sai com código de erro quando alguma tela reprova, então serve de portão dentro de outro script.

### Quando rodar

Sempre que uma rodada mexer em estilo, em navegação ou criar tela nova. Guarde as fotos de antes, faça a mudança, gere as de depois e compare. Diferença que você não sabe explicar é regressão até prova em contrário.

Precisa de Edge ou Chrome instalado. Usa o `playwright-core` que já é dependência do servidor, para a auditoria dos sites gerados.
