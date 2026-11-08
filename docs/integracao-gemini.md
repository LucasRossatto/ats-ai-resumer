# Integração com o Gemini

[English](gemini-integration.en.md) | **Português**

Como o backend usa o Google Gemini (`@google/genai`) para analisar currículos e estruturar o texto extraído do PDF: contrato de saída, prompt, resiliência, controle de custo e avaliação. Tudo conferido no código em `backend/src/infrastructure/ai` e `backend/src/application/services`.

## Onde a IA é usada

| Uso | Arquivo | Temperatura | Se falhar |
| --- | --- | --- | --- |
| **Análise** do currículo (nota, problemas, pontos fortes, reescritas) | `analysis-generator.service.ts` | 0,4 | Duas tentativas, depois **503** |
| **Estruturação** do texto em seções (upload e reescrita) | `structured-parser.service.ts` | 0,1 | Duas tentativas, depois segue com **seções vazias** |

O modelo vem de `GEMINI_MODEL` (padrão `gemini-3.6-flash`). Sem `GEMINI_API_KEY`, a configuração acusa erro fatal no boot (`constants.ts`), e o cliente `ai` fica nulo, o que desliga o parser de seções.

## Fluxo da análise

```
POST /resumes/:id/analyze
  -> confere o dono do currículo (404 se não for dele)
  -> carrega a versão (a atual, ou a pedida)
  -> confere a cota diária (429 se estourou)
  -> monta o prompt (PT-BR ou EN, cargo alvo opcional)
  -> chama o Gemini com schema de resposta
  -> normaliza e limita os valores
  -> grava a análise e liga à versão
```

## Contrato de saída

A chamada usa `responseMimeType: 'application/json'` e um `responseSchema`, então o modelo é obrigado a devolver JSON no formato esperado:

| Campo | Conteúdo |
| --- | --- |
| `atsScore` | nota de 0 a 100 |
| `scoreBreakdown` | quatro eixos, de 0 a 25 cada |
| `issues` | problemas priorizados, com severidade |
| `strengths` | pontos fortes |
| `bulletRewrites` | frases fracas reescritas (original e sugestão) |
| `keywordsPresent` e `keywordsMissing` | palavras-chave encontradas e ausentes |
| `summary` | resumo |

### Por que normalizar mesmo com schema

O schema restringe a forma, mas não garante que os valores façam sentido. A função `normalize` trata a resposta como **dado não confiável**: converte os tipos, limita as notas às faixas válidas (0 a 100, e 0 a 25 por eixo). O que passa daí é o que vai para o banco e para a tela.

## Prompt

Montado em `buildPrompt`, em português ou inglês conforme o idioma pedido.

- **Papel e critérios:** a nota considera leitura pelo robô de triagem (palavras-chave, formatação analisável, impacto quantificado, clareza).
- **Cargo alvo** opcional, que direciona as palavras-chave.
- **Quantidades fixas:** 5 problemas priorizados, 5 pontos fortes e de 5 a 10 frases reescritas.
- **Linguagem para leigos:** o prompt proíbe a sigla "ATS" e a palavra "bullet" nas respostas, trocando por "robô de triagem" e "frases de experiência". 
- **Defesa contra injeção de prompt:**
  - o texto do currículo é cortado em `MAX_RESUME_CHARS` (30.000 caracteres);
  - as tags `<resume>` e `</resume>` são removidas do conteúdo repetidamente até não sobrar nenhuma (`stripTag`), para que nem uma tag aninhada como `<</resume>/resume>` consiga "fechar" o bloco;
  - o texto vai entre `<resume>` e `</resume>` (a remoção das tags tem teste em `analysis-prompt.spec.ts`), e o prompt diz que ali dentro só há dado a avaliar, ignorando instruções.

> Isso reduz o risco, mas não o elimina: injeção de prompt não tem solução completa hoje. Por isso a saída ainda passa pelo `normalize`, e o modelo só consegue escrever dados da análise, sem acesso a ferramentas ou ao banco.

## Resiliência

- **Duas tentativas** com espera de 2 s entre elas (`RETRY_DELAY_MS`), cobertas por testes com timers falsos.
- **Sem texto ou sem chave:** a análise responde 503 sem chamar o Gemini.
- **Falha definitiva:** `ServiceUnavailableException` (503) com mensagem genérica. **Não há análise de fallback**: inventar uma nota sem o modelo seria pior do que avisar.
- O parser de seções, ao contrário, **degrada com elegância**: se falhar, o upload continua com seções vazias, e na reescrita o sistema usa a versão remendada.

## Controle de custo

| Controle | Valor | Onde |
| --- | --- | --- |
| Cota diária de análises por usuário | `ANALYSIS_DAILY_LIMIT` (padrão **20**, dia UTC) | `analysis.service.ts` |
| Limite de taxa da análise | 5 por minuto | `analysis.controller.ts` |
| Limite de taxa de upload e criação | 10 por minuto | controllers |
| Limite global da API | 100 por minuto | `app.module.ts` |
| Tamanho do texto enviado (análise e parser) | 30.000 caracteres | `MAX_RESUME_CHARS` |
| Currículos criados por dia / reescritas por usuário por dia (cada um chama o parser) | `PARSE_DAILY_LIMIT` (padrão **20**, dia UTC) | `resume.service.ts` |
| Tempo máximo e tamanho da resposta | 30 s e `maxOutputTokens` em cada chamada | `prompt-safety.ts` |
| Tokens do prompt | `promptTokens` devolvido pelo Gemini e guardado com a análise | `analysis-generator.service.ts` |

### Limites reais

- O plano gratuito do Gemini permite poucas requisições por dia **no total**, somando todos os usuários. A cota por usuário não protege contra isso: não existe teto global.
- Upload e reescrita também chamam o Gemini (para estruturar o texto) e **não contam** na cota diária.
- A checagem da cota e a gravação da análise não são atômicas, então requisições simultâneas podem passar um pouco do limite.

## Avaliação (`pnpm eval`)

O script `backend/scripts/eval-analysis.ts` roda a análise sobre currículos de exemplo (`test/fixtures/manifest.json`) e mede a **consistência** da nota:

```bash
pnpm eval --dry-run          # simula, sem chamar a API
pnpm eval --runs 3 --yes     # roda de verdade, 3 vezes cada currículo
```

As estatísticas (`eval-stats.ts`, testadas em `eval-stats.spec.ts`) incluem desvio-padrão entre rodadas, correlações de Pearson e Spearman e a taxa de respostas que precisaram de correção pelo `normalize`. O modelo do relatório está em [`backend/docs/eval.md`](../backend/docs/eval.md).

**Estado atual:** o script existe e rodou só parcialmente, por causa da cota gratuita. **Ainda não há números publicados**, e este documento não cita nenhum.

## Como interpretar a nota

A nota é a **opinião de um modelo de linguagem**, não a medição de um ATS real. Serve para comparar versões do mesmo currículo entre si. Com temperatura de 0,4, duas rodadas sobre o mesmo texto podem divergir, e é para medir essa variação que o eval existe.

## Variáveis de ambiente

| Variável | Efeito |
| --- | --- |
| `GEMINI_API_KEY` | Obrigatória. Chave da API do Google AI Studio |
| `GEMINI_MODEL` | Modelo usado (padrão `gemini-3.6-flash`) |
| `ANALYSIS_DAILY_LIMIT` | Análises por usuário por dia (padrão 20) |
| `PARSE_DAILY_LIMIT` | Currículos criados por usuário por dia e reescritas por usuário por dia (padrão 20) |

## Próximos passos sugeridos

Teto global diário de análises; contar upload e reescrita na cota; métricas de chamadas, falhas, latência e tokens (veja [observabilidade](observabilidade.md#lacunas-conhecidas)); publicar os números do eval com `pnpm eval --runs 3 --yes`.
