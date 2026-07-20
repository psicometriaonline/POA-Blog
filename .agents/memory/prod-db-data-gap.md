---
name: Producao tem banco separado sem dados de dev
description: Publicar sincroniza schema, nao dados; filas/seeds precisam ser importadas via endpoint interno
---
Regra: o deployment publicado usa um PostgreSQL proprio. O Publish aplica o diff de schema, mas NUNCA copia dados, extensoes (ex.: pg_trgm) nem linhas-semente (categorias, filas). Codigo que roda em prod deve auto-provisionar o que precisa (CREATE EXTENSION IF NOT EXISTS, auto-criar categoria/indice) em vez de assumir o estado de dev.

**Why:** o despertador externo rodou em producao e retornou `remaining=0` sem gerar nada — a fila estava vazia la, embora cheia em dev.

**How to apply:** para levar dados dev→prod, use o endpoint interno protegido por Bearer (`POST /api/internal/blog/keyword-queue/import`, mesmo token do cron), em lotes ≤500 linhas (limite JSON do Express ~100kb; usar ~200/lote). Consultas de leitura em prod via executeSql com environment:"production".
