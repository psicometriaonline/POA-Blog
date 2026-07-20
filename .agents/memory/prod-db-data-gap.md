---
name: Producao tem banco separado sem dados de dev
description: Publicar sincroniza schema, nao dados; filas/seeds precisam ser importadas via endpoint interno
---
Regra: o deployment publicado usa um PostgreSQL proprio. O Publish aplica o diff de schema, mas NUNCA copia dados. Qualquer tabela-semente (ex.: fila de palavras-chave do gerador de posts) fica vazia em producao ate ser importada.

**Why:** o despertador externo rodou em producao e retornou `remaining=0` sem gerar nada — a fila estava vazia la, embora cheia em dev.

**How to apply:** para levar dados dev→prod, use o endpoint interno protegido por Bearer (`POST /api/internal/blog/keyword-queue/import`, mesmo token do cron), em lotes ≤500 linhas (limite JSON do Express ~100kb; usar ~200/lote). Consultas de leitura em prod via executeSql com environment:"production".
