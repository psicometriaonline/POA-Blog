# Mecanismo de geração de posts ancorados em busca real

Port, para este CMS, do mecanismo validado nos dois sites irmãos, adaptado ao
domínio de **Psicometria / Estatística / Análise de Dados**. Ver o mapa completo
em `MIGRACAO-PSICOMETRIA.md`, as sementes em `SEMENTES-E-ESTRATEGIA-PSICOMETRIA.md`
e os prompts em `PROMPTS.md` (arquivos de referência do projeto).

## Decisões (confirmadas com o dono)

| Decisão | Escolha |
|---|---|
| Stack | Mesma família dos irmãos (Express + Drizzle + Postgres, React + Vite), repositório único (`server/`, `client/`, `shared/`). Port estrutural na lógica, com tradução do modelo de dados. |
| Modelo LLM | **Sonnet 5** (escritor) / **Opus 4.8** (revisor) — topo de qualidade no filtro crítico de correção estatística e citações. |
| Idioma | Minera **pt-BR + inglês**; escreve sempre em português (termo en como palavra-chave/sinônimo). |
| Eixos-piloto | **Psicometria e validação** + **Análise fatorial e MEE**. |
| Anti-canibalização | **Camada 1 (pg_trgm) + Camada 2 (pgvector/embeddings)** desde já. |
| Publicação | **Rascunho + revisão humana** (marca consolidada, público especialista). |

## O que existe hoje (Fase 0)

| Arquivo | Papel |
|---|---|
| `shared/schema.ts` | Tabelas aditivas: `blog_keyword_queue`, `blog_daily_runs`, `blog_post_index` (corpus) + coluna `posts.target_query`. Tipo pgvector + `EMBEDDING_DIM`. |
| `migrations/manual/0001_blog_mechanism.sql` | SQL aditivo idempotente (extensões `vector`/`pg_trgm`, índices trigrama e HNSW). |
| `shared/blog/seeds.ts` | Bancos de sementes dos 2 eixos-piloto, mapeados às categorias do CMS + curso-alvo. Dados extensíveis. |
| `server/blog/keyword-research.ts` | Minerador do Google Autocomplete, bilíngue pt+en. Puro (sem banco). |
| `server/blog/keyword-filter.ts` | Filtro permissivo do domínio (não corta pdf/artigo/software/inglês/ano; corta ruído e fora-de-escopo). |
| `server/blog/embeddings.ts` | Provider de embeddings por env (Voyage/OpenAI). Inerte se não configurado. |
| `server/blog/corpus-index.ts` | Indexação do corpus + anti-canibalização (Camadas 1 e 2). |
| `server/blog/keyword-queue.ts` | Persistência idempotente da fila + anti-canibalização no enfileirar. |
| `server/blog/mine-runner.ts` | Expande sementes e minera um eixo (pt+en). Puro. |
| `server/blog/mine-keywords.ts` | **CLI**: minera e imprime as top perguntas para calibrar a olho. |

Tudo é **aditivo e isolado**: nada no fluxo atual do CMS lê/escreve nessas
tabelas até a Fase 1 conectar o gerador.

## Como rodar no Replit

O ambiente de desenvolvimento remoto não tem `DATABASE_URL` nem rede para o
Google — por isso a mineração e o banco rodam no Replit. Ordem:

1. **Extensões + migração** (o `db:push` não expressa extensões nem índices trgm/HNSW):
   ```sh
   # 1) habilitar extensões e criar as tabelas base
   psql "$DATABASE_URL" -f migrations/manual/0001_blog_mechanism.sql
   # 2) sincronizar o schema do Drizzle (colunas/tabelas a partir de shared/schema.ts)
   npm run db:push
   # 3) reexecutar os índices especializados (fim do .sql: trigrama + HNSW)
   ```
   Se o pgvector do Replit não tiver HNSW, troque o índice por
   `ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`.

2. **(Opcional agora) Provider de embeddings** para a Camada 2 semântica:
   ```sh
   BLOG_EMBEDDING_PROVIDER=voyage     # ou openai
   BLOG_EMBEDDING_API_KEY=...         # chave do provider (1024 dims)
   ```
   Sem isso, a Camada 1 (lexical) já funciona; a Camada 2 fica inerte.

3. **Indexar o corpus** (500+ posts) para a anti-canibalização:
   ```sh
   tsx -e "import('./server/blog/corpus-index').then(m=>m.indexarCorpus().then(console.log))"
   ```

4. **Minerar e conferir a olho** (não grava nada):
   ```sh
   tsx server/blog/mine-keywords.ts --eixo 1 --lang pt,en --top 15
   ```
   Quando a qualidade estiver boa, gravar na fila:
   ```sh
   tsx server/blog/mine-keywords.ts --persist
   ```

## Variáveis de ambiente

| Var | Quando | Para quê |
|---|---|---|
| `DATABASE_URL` | já existe | Postgres do CMS |
| `BLOG_EMBEDDING_PROVIDER` / `BLOG_EMBEDDING_API_KEY` | Fase 0 (Camada 2) | embeddings da anti-canibalização semântica |
| `ANTHROPIC_API_KEY` | Fase 1 | gerador (Sonnet 5) + revisor (Opus 4.8) |
| `BLOG_CRON_TOKEN` | Fase 3 | proteção do endpoint interno do despertador |

## Próximas fases (ainda não implementadas)

- **Fase 1** — geração ancorada em **rascunho** + revisor estatístico (Sonnet 5 /
  Opus 4.8), com o gate determinístico de verificação de citações por DOI
  (Crossref/OpenAlex) e a Camada 2 no checkpoint pré-publicação. Prompts em
  `PROMPTS.md` (B/C/D/E).
- **Fase 2** — SEO: o CMS já emite JSON-LD (BlogPosting/Breadcrumb/FAQPage),
  sitemap, robots, IndexNow e llms.txt; falta sobretudo **pillar page por eixo**
  e linkagem por cluster.
- **Fase 3** — cadência + despertador (cron do stack batendo num endpoint
  interno protegido por `BLOG_CRON_TOKEN`), ainda em rascunho.
- **Virada de chave** — publicação automática só depois de validado (Seção 7).
