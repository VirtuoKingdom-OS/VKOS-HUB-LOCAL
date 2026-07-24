# Motor por workspace: Claude do Jesse no CORE, Gemini ou Claude Team pro cliente

## Contexto

O 3.0 já separava os motores, mas com pontas soltas: a credencial `gemini` por workspace era código morto (o motor usa a service account do projeto), não havia tela pra logar e ver o status do Claude do Jesse, e a seleção de motor no admin não refletia se a configuração real existia.

## Decisão

1. **Claude do Jesse é global no CORE.** Logado uma vez, vive no volume do container core, usado em tudo que o Jesse faz. Uma tela Meu Claude mostra status e testa. Nunca atende request de cliente.
2. **Gemini é bancado centralmente pelo Jesse** via Vertex AI com a service account do projeto, medido por workspace em `consumo_ia`. Não há chave de Gemini por cliente: selecionar Gemini exige só o projeto Vertex configurado no motor. O tipo de credencial `gemini` sai do admin.
3. **Claude Team é por cliente**: o Jesse libera uma conta e coloca por trás, credencial no cofre, com consentimento e teste de conexão. Cada cliente com a sua, sem compartilhar entre clientes.
4. **A seleção de motor no admin reflete a realidade**: Gemini só se o projeto está configurado, Claude Team só depois de cadastrar e testar a credencial, Sem IA sempre.

## Por quê

- O modelo de negócio é "o cliente só me paga, eu entrego funcionando": o Jesse bancar o Gemini centralmente é o caminho mais simples e o que os termos do Google permitem.
- Claude Team por cliente é a única forma limpa nos termos da Anthropic de o cliente ter Claude por trás.
- Código morto (credencial gemini por workspace) confunde e dá falsa sensação de configuração; melhor remover.
