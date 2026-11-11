# Eval do score do LLM

Resultados serão preenchidos após a execução real (`pnpm eval`).

Como rodar (precisa de `GEMINI_API_KEY` real no `.env`):

```bash
pnpm eval                 # N=5 por currículo, pede confirmação
pnpm eval --runs 3 --yes  # menos chamadas, sem confirmação
pnpm eval --dry-run --yes # gerador falso, sem rede (saída vai para a pasta temporária)
```

O script reescreve este arquivo e `eval.json`. Mede, por currículo fictício de `test/fixtures/`: média, desvio padrão, mínimo e máximo do `atsScore`, média dos componentes, contagem de issues e rewrites, taxa de correção pelo `normalize`, latência e `promptTokens`. No global: desvio padrão médio, ICC(A,1) com intervalo de confiança de 95%, erro padrão de medida (SEM), menor mudança detectável (MDC95) e correlação (Spearman e Kendall tau-b) entre o rótulo `expected` do `manifest.json` e a média do score. Registra também modelo, temperatura, hash do prompt e commit.
