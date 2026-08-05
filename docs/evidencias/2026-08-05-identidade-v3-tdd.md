# Evidência TDD e visual da identidade v3

Data: 2026-08-05.

## Estratégia

A migração foi executada por barreiras. Cada contrato novo ganhou primeiro uma
falha reproduzível, depois a implementação mínima e então a suíte completa. As
fases 0 a 3 foram sequenciais; a fase 4 foi dividida em grupos de folhas sem
sobreposição e integrada por uma barreira única.

## Ciclos RED e GREEN

| Fase | RED observado | GREEN que fechou o ciclo |
| --- | --- | --- |
| 0 | teste de fonte falhou porque os arquivos Geist não existiam | Geist e Geist Mono embarcadas, licença presente e Inter ausente |
| 1 | paleta exata, pares novos e padrão Escuro falharam contra os valores antigos | 36 tokens e reservas calibrados, 51 pares por tema e fallbacks Escuros |
| 2 | raios, curva, sombras e títulos reprovaram o contrato v3 | cinco raios, curva única, três sombras e peso de título até 400 |
| 3 | teste de superfícies falhou porque textura e carvão não estavam nos donos contratados | textura no plano do shell, canvas opacos e carvão em IDE, rodapé e markdown |
| 3 visual | navegador mostrou que `.tela` cobria a textura mesmo com o teste de tokens verde | `.shell-conteudo > .tela` herda o plano; mapa continua opaco |
| 4 | teste editorial falhou para CORE, Assistente, workspace, Cerimônia e Setup | todos os momentos usam display, entrelinha, tracking e peso 400 |

## Portão executado

A partir de `app/`:

```text
npm run checar -w server
npm run checar -w web
npm run testar -w server
npm run testar -w web
npm run build -w web
```

Resultado de integração após a fase 4:

- checagem TypeScript do servidor: passou;
- checagem TypeScript do web: passou;
- testes do servidor: passaram;
- testes do web: 264 aprovados, zero falha;
- build Vite: 612 módulos transformados, passou.

O projeto não possui comando de cobertura configurado. Não foi inventada uma
porcentagem sem medição. A evidência usada nesta rodada é a suíte de contratos,
os testes de comportamento existentes e o QA visual automatizado.

## Evidência visual

O servidor descartável rodou em `127.0.0.1:4702`, separado das portas normais.
Cada passe percorreu 17 telas em 1440x900, 1366x768 e 1280x720.

- Antes: `fotos-telas/antes-identidade-v3/{claro,escuro}`.
- Fase 0: `fotos-telas/identidade-v3/fase-0/{claro,escuro}`.
- Fase 1: `fotos-telas/identidade-v3/fase-1/{claro,escuro}`.
- Fase 2: `fotos-telas/identidade-v3/fase-2/{claro,escuro}`.
- Fase 3: `fotos-telas/identidade-v3/fase-3/{claro,escuro}`.
- Fase 4: `fotos-telas/identidade-v3/fase-4/{claro,escuro}`.
- Final: `fotos-telas/identidade-v3/final/{claro,escuro}`.

Em todos os passes registrados: zero erro de console e zero tela com alerta.
O QA interativo também confirmou a textura herdada pela tela, o Mapa sem essa
textura e a superfície carvão da IDE.

## Diferenças explicadas

- Cinza frio vira creme quente no Claro e quase preto no Escuro.
- Inter vira Geist, com títulos editoriais maiores e peso 400 nos pontos
  contratados.
- Raios, sombra e movimento seguem as escalas fechadas da identidade v3.
- O plano de trabalho ganha pontos; os canvas preservam a própria grade.
- Terminal, rodapé e código usam carvão com papéis legíveis nos dois temas.
- Miniaturas de papel branco ganham separação mais forte sobre o creme.
