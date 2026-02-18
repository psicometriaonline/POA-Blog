import { db } from "./db";
import { categories, tags, posts, postCategories, postTags, siteSettings, banners } from "@shared/schema";

const CATEGORIES = [
  { name: "Psicometria", slug: "psicometria" },
  { name: "Analise Fatorial", slug: "analise-fatorial" },
  { name: "Teoria de Resposta ao Item", slug: "teoria-de-resposta-ao-item" },
  { name: "Estatistica Aplicada", slug: "estatistica-aplicada" },
  { name: "Validade e Fidedignidade", slug: "validade-e-fidedignidade" },
  { name: "Metodologia de Pesquisa", slug: "metodologia-de-pesquisa" },
];

const TAGS_LIST = [
  { name: "Pesquisa", slug: "pesquisa" },
  { name: "Tutorial", slug: "tutorial" },
  { name: "R", slug: "r" },
  { name: "SPSS", slug: "spss" },
  { name: "Python", slug: "python" },
  { name: "Avaliacao Psicologica", slug: "avaliacao-psicologica" },
];

const IMAGES = [
  "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=450&fit=crop",
  "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&h=450&fit=crop",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop",
  "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=450&fit=crop",
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=450&fit=crop",
  "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=450&fit=crop",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop",
  "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=450&fit=crop",
  "https://images.unsplash.com/photo-1580894894513-541e068a3e2b?w=800&h=450&fit=crop",
  "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&h=450&fit=crop",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=450&fit=crop",
  "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800&h=450&fit=crop",
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=450&fit=crop",
  "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&h=450&fit=crop",
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=450&fit=crop",
  "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&h=450&fit=crop",
  "https://images.unsplash.com/photo-1596496050827-8299e0220de1?w=800&h=450&fit=crop",
];

const POST_TEMPLATES = [
  [
    {
      title: "Introducao a Psicometria: Conceitos Fundamentais",
      excerpt: "Uma visao geral dos principais conceitos e metodos que fundamentam a ciencia da medicao em psicologia, abordando escalas, normas e padronizacao.",
      content: `<h2>O que e Psicometria?</h2><p>A psicometria e a ciencia da medicao em psicologia. Ela se ocupa da teoria e tecnica de construcao de instrumentos de medida, como testes psicologicos, questionarios e escalas. O objetivo principal e garantir que essas medidas sejam validas, fidedignas e adequadas ao proposito pretendido.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p><h3>Principais Conceitos</h3><p>Entre os conceitos fundamentais da psicometria, destacam-se a <strong>validade</strong>, a <strong>fidedignidade</strong> e a <strong>padronizacao</strong>. A validade refere-se ao grau em que um instrumento mede aquilo que se propoe a medir. A fidedignidade diz respeito a consistencia das medidas obtidas.</p><p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>`,
    },
    {
      title: "Construcao de Escalas Psicometricas: Guia Pratico",
      excerpt: "Passo a passo para a construcao de escalas psicometricas validas e confiaveis, desde a definicao do construto ate a analise final dos itens.",
      content: `<h2>Etapas da Construcao de Escalas</h2><p>A construcao de uma escala psicometrica e um processo sistematico que envolve diversas etapas. Este guia apresenta os passos essenciais para desenvolver instrumentos de medida robustos e cientificamente embasados.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin eget nunc vitae ligula posuere eleifend. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p><h3>Definicao do Construto</h3><p>O primeiro passo e definir claramente o construto que se pretende medir. Isso envolve uma revisao aprofundada da literatura e a elaboracao de uma definicao constitutiva e operacional do fenomeno em estudo.</p><p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis.</p>`,
    },
    {
      title: "Normatizacao de Testes: Teoria e Pratica",
      excerpt: "Entenda como funcionam os processos de normatizacao de testes psicologicos e sua importancia para a interpretacao dos resultados.",
      content: `<h2>A Importancia da Normatizacao</h2><p>A normatizacao de testes psicologicos e o processo de estabelecer normas ou padroes de referencia para a interpretacao dos escores obtidos. Sem normas adequadas, os escores brutos de um teste nao possuem significado pratico.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam eget felis eget nunc lobortis mattis aliquam faucibus purus. Nulla porttitor accumsan tincidunt.</p><h3>Tipos de Normas</h3><p>Existem diferentes tipos de normas, incluindo normas percentilicas, normas padronizadas (como escores z e T) e normas de idade ou serie. A escolha do tipo de norma depende do proposito do teste e da populacao-alvo.</p><p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi.</p>`,
    },
  ],
  [
    {
      title: "Analise Fatorial Exploratoria: Fundamentos e Aplicacoes",
      excerpt: "Aprenda os fundamentos da analise fatorial exploratoria e como aplica-la em pesquisas em psicometria e ciencias sociais.",
      content: `<h2>O que e Analise Fatorial?</h2><p>A analise fatorial e uma tecnica estatistica multivariada utilizada para identificar fatores latentes que explicam as correlacoes entre um conjunto de variaveis observadas. E uma ferramenta fundamental na psicometria para investigar a estrutura interna dos instrumentos de medida.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris blandit aliquet elit, eget tincidunt nibh pulvinar a. Praesent sapien massa, convallis a pellentesque nec, egestas non nisi.</p><h3>Quando Utilizar</h3><p>A analise fatorial exploratoria e recomendada quando o pesquisador nao possui hipoteses previas sobre a estrutura fatorial dos dados. E especialmente util na fase de desenvolvimento de novos instrumentos.</p>`,
    },
    {
      title: "Analise Fatorial Confirmatoria com R: Tutorial Completo",
      excerpt: "Tutorial passo a passo para realizar analise fatorial confirmatoria utilizando o pacote lavaan no R.",
      content: `<h2>Analise Fatorial Confirmatoria</h2><p>A analise fatorial confirmatoria (AFC) e uma tecnica utilizada para testar hipoteses sobre a estrutura fatorial de um instrumento. Diferente da exploratoria, a AFC exige que o pesquisador especifique previamente o modelo.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras ultricies ligula sed magna dictum porta. Vivamus magna justo, lacinia eget consectetur sed, convallis at tellus.</p><h3>Implementacao no R</h3><p>Utilizando o pacote lavaan, podemos especificar e testar modelos de medicao de forma eficiente. O primeiro passo e instalar e carregar o pacote necessario.</p>`,
    },
    {
      title: "Rotacao de Fatores: Varimax, Oblimin e Promax",
      excerpt: "Compreenda as diferentes tecnicas de rotacao de fatores e quando utilizar cada uma em suas analises.",
      content: `<h2>Metodos de Rotacao</h2><p>A rotacao de fatores e uma etapa importante da analise fatorial que visa simplificar a interpretacao dos fatores extraidos. Existem dois grandes grupos de rotacao: ortogonal e obliqua.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque velit nisi, pretium ut lacinia in, elementum id enim. Donec rutrum congue leo eget malesuada.</p><h3>Rotacao Ortogonal vs Obliqua</h3><p>A rotacao ortogonal (como Varimax) assume que os fatores sao independentes entre si. Ja a rotacao obliqua (como Oblimin e Promax) permite correlacao entre os fatores, sendo geralmente mais realista em ciencias comportamentais.</p>`,
    },
  ],
  [
    {
      title: "TRI: Teoria de Resposta ao Item para Iniciantes",
      excerpt: "Uma introducao acessivel a Teoria de Resposta ao Item, seus modelos e aplicacoes na avaliacao psicologica e educacional.",
      content: `<h2>Introducao a TRI</h2><p>A Teoria de Resposta ao Item (TRI) e um conjunto de modelos matematicos que descrevem a relacao entre a habilidade latente de um individuo e a probabilidade de acertar um item. Diferente da Teoria Classica dos Testes, a TRI opera no nivel do item.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque in ipsum id orci porta dapibus. Curabitur aliquet quam id dui posuere blandit.</p><h3>Modelos Basicos</h3><p>Os modelos mais conhecidos da TRI incluem o modelo de 1 parametro (Rasch), 2 parametros e 3 parametros. Cada um deles incorpora diferentes caracteristicas dos itens na modelagem.</p>`,
    },
    {
      title: "Modelo de Rasch: Principios e Aplicacoes",
      excerpt: "Explore o modelo de Rasch, suas propriedades unicas de medicao objetiva e aplicacoes em pesquisas psicometricas.",
      content: `<h2>O Modelo de Rasch</h2><p>O modelo de Rasch e o mais simples dos modelos da TRI e possui propriedades unicas que o tornam especialmente util para a construcao de medidas objetivas. Neste modelo, a probabilidade de acerto depende apenas da diferenca entre a habilidade da pessoa e a dificuldade do item.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla quis lorem ut libero malesuada feugiat. Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui.</p>`,
    },
    {
      title: "Curva Caracteristica do Item: Interpretacao e Analise",
      excerpt: "Aprenda a interpretar curvas caracteristicas dos itens (CCI) e como utiliza-las na avaliacao da qualidade dos itens.",
      content: `<h2>A Curva Caracteristica do Item</h2><p>A Curva Caracteristica do Item (CCI) e uma representacao grafica da relacao entre o nivel de habilidade e a probabilidade de resposta correta a um item. A forma da curva fornece informacoes valiosas sobre as propriedades psicometricas do item.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sollicitudin molestie malesuada. Nulla porttitor accumsan tincidunt.</p>`,
    },
  ],
  [
    {
      title: "Regressao Linear Multipla em Pesquisas Psicologicas",
      excerpt: "Como aplicar regressao linear multipla em pesquisas na area de psicologia, com exemplos praticos e interpretacao dos resultados.",
      content: `<h2>Regressao Linear Multipla</h2><p>A regressao linear multipla e uma tecnica estatistica utilizada para modelar a relacao entre uma variavel dependente e duas ou mais variaveis independentes. E amplamente utilizada em pesquisas psicologicas para prever comportamentos e entender relacoes entre variaveis.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus suscipit tortor eget felis porttitor volutpat. Curabitur non nulla sit amet nisl tempus convallis quis ac lectus.</p>`,
    },
    {
      title: "ANOVA e Testes Post-hoc: Quando e Como Usar",
      excerpt: "Guia completo sobre analise de variancia e testes post-hoc para comparacoes multiplas em pesquisas experimentais.",
      content: `<h2>Analise de Variancia</h2><p>A ANOVA (Analysis of Variance) e uma tecnica estatistica utilizada para comparar medias de tres ou mais grupos. E especialmente util em delineamentos experimentais e quasi-experimentais comuns em pesquisas psicologicas.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae. Donec velit neque, auctor sit amet aliquam vel.</p>`,
    },
    {
      title: "Correlacao de Pearson e Spearman: Diferencas e Aplicacoes",
      excerpt: "Entenda as diferencas entre os coeficientes de correlacao de Pearson e Spearman e quando utilizar cada um.",
      content: `<h2>Coeficientes de Correlacao</h2><p>Os coeficientes de correlacao sao medidas estatisticas que expressam o grau de associacao linear entre duas variaveis. Os dois mais utilizados sao o coeficiente de Pearson e o coeficiente de Spearman.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin eget tortor risus. Curabitur arcu erat, accumsan id imperdiet et, porttitor at sem.</p>`,
    },
  ],
  [
    {
      title: "Validade de Conteudo: Metodos de Avaliacao",
      excerpt: "Conheca os principais metodos para avaliar a validade de conteudo de instrumentos psicometricos, incluindo o indice CVR e CVI.",
      content: `<h2>O que e Validade de Conteudo?</h2><p>A validade de conteudo refere-se ao grau em que os itens de um instrumento sao representativos do dominio de conteudo que se pretende medir. E uma das primeiras fontes de evidencia de validade a serem investigadas no desenvolvimento de um instrumento.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed porttitor lectus nibh. Curabitur aliquet quam id dui posuere blandit.</p>`,
    },
    {
      title: "Alfa de Cronbach: Uso Correto e Interpretacao",
      excerpt: "Saiba como calcular e interpretar corretamente o coeficiente alfa de Cronbach como indicador de consistencia interna.",
      content: `<h2>O Coeficiente Alfa de Cronbach</h2><p>O alfa de Cronbach e o indicador de fidedignidade mais utilizado em pesquisas psicometricas. Ele estima a consistencia interna de um instrumento, ou seja, o grau em que os itens medem o mesmo construto.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla quis lorem ut libero malesuada feugiat. Praesent sapien massa, convallis a pellentesque nec.</p>`,
    },
    {
      title: "Validade de Criterio: Concorrente e Preditiva",
      excerpt: "Explore as diferencas entre validade concorrente e preditiva e como estabelecer evidencias de validade de criterio.",
      content: `<h2>Validade de Criterio</h2><p>A validade de criterio examina a relacao entre os escores de um instrumento e um criterio externo relevante. Quando o criterio e medido simultaneamente ao teste, temos a validade concorrente; quando e medido no futuro, temos a validade preditiva.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras ultricies ligula sed magna dictum porta. Vestibulum ante ipsum primis in faucibus orci luctus.</p>`,
    },
  ],
  [
    {
      title: "Delineamentos de Pesquisa em Psicologia: Visao Geral",
      excerpt: "Uma visao panoramica dos principais delineamentos de pesquisa utilizados em psicologia, desde estudos experimentais ate pesquisas qualitativas.",
      content: `<h2>Tipos de Delineamento</h2><p>A escolha do delineamento de pesquisa e uma das decisoes mais importantes no planejamento de um estudo. O delineamento deve ser adequado a pergunta de pesquisa e considerar aspectos eticos, praticos e metodologicos.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque in ipsum id orci porta dapibus. Mauris blandit aliquet elit, eget tincidunt nibh pulvinar a.</p>`,
    },
    {
      title: "Tamanho da Amostra: Como Calcular para sua Pesquisa",
      excerpt: "Aprenda a calcular o tamanho adequado da amostra para diferentes tipos de analises estatisticas em pesquisas quantitativas.",
      content: `<h2>Calculo Amostral</h2><p>O calculo do tamanho da amostra e uma etapa crucial no planejamento de pesquisas quantitativas. Uma amostra muito pequena pode nao ter poder estatistico suficiente para detectar efeitos reais, enquanto uma amostra excessivamente grande pode ser um desperdicio de recursos.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sollicitudin molestie malesuada. Quisque velit nisi, pretium ut lacinia in, elementum id enim.</p>`,
    },
    {
      title: "Etica em Pesquisa com Seres Humanos: Principios Essenciais",
      excerpt: "Os principios eticos fundamentais que devem guiar toda pesquisa envolvendo seres humanos na area de psicologia.",
      content: `<h2>Principios Eticos</h2><p>A pesquisa com seres humanos exige rigorosa observancia de principios eticos. No Brasil, as pesquisas sao regulamentadas pela Resolucao 466/2012 do Conselho Nacional de Saude e pela Resolucao 510/2016 para pesquisas em ciencias humanas e sociais.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus magna justo, lacinia eget consectetur sed, convallis at tellus. Nulla porttitor accumsan tincidunt.</p>`,
    },
  ],
];

async function seed() {
  console.log("Seeding database...");

  const createdCats = [];
  for (const cat of CATEGORIES) {
    const [c] = await db.insert(categories).values(cat).returning();
    createdCats.push(c);
    console.log(`  Category: ${c.name}`);
  }

  const createdTags = [];
  for (const tag of TAGS_LIST) {
    const [t] = await db.insert(tags).values(tag).returning();
    createdTags.push(t);
    console.log(`  Tag: ${t.name}`);
  }

  let imgIdx = 0;
  for (let catIdx = 0; catIdx < createdCats.length; catIdx++) {
    const cat = createdCats[catIdx];
    const postTemplates = POST_TEMPLATES[catIdx];

    for (let postIdx = 0; postIdx < postTemplates.length; postIdx++) {
      const tpl = postTemplates[postIdx];
      const img = IMAGES[imgIdx % IMAGES.length];
      imgIdx++;

      const [post] = await db.insert(posts).values({
        title: tpl.title,
        slug: tpl.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        content: tpl.content,
        excerpt: tpl.excerpt,
        featuredImage: img,
        status: "published",
        authorName: "Equipe Psicometria Online",
        viewCount: Math.floor(Math.random() * 500) + 10,
        publishedAt: new Date(Date.now() - (catIdx * 3 + postIdx) * 86400000 * 2),
      }).returning();

      await db.insert(postCategories).values({ postId: post.id, categoryId: cat.id });

      const tagIdx1 = (catIdx + postIdx) % createdTags.length;
      const tagIdx2 = (catIdx + postIdx + 1) % createdTags.length;
      await db.insert(postTags).values([
        { postId: post.id, tagId: createdTags[tagIdx1].id },
        { postId: post.id, tagId: createdTags[tagIdx2].id },
      ]);

      console.log(`  Post: ${post.title}`);
    }
  }

  await db.insert(siteSettings).values([
    { key: "hero_headline", value: "Blog Psicometria Online" },
    { key: "hero_subheadline", value: "Recursos de aprendizagem em psicometria e analises quantitativas" },
    { key: "newsletter_text", value: "Receba nossos conteudos diretamente no seu e-mail" },
    { key: "featured_category_slug", value: "psicometria" },
    { key: "diverse_category_slugs", value: "analise-fatorial,teoria-de-resposta-ao-item,estatistica-aplicada" },
    { key: "row_section_1_slug", value: "validade-e-fidedignidade" },
    { key: "row_section_2_slug", value: "metodologia-de-pesquisa" },
  ]).onConflictDoUpdate({ target: siteSettings.key, set: { value: siteSettings.value } });

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});
