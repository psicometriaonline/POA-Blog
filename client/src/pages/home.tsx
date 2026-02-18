import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, User, ArrowRight, Mail, ChevronRight, ChevronDown, Eye, Download, Search, Menu as MenuIcon } from "lucide-react";
import type { PostWithRelations, Category, Banner, FreeMaterial } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useRef, useEffect } from "react";

interface HomeData {
  settings: Record<string, string>;
  categories: Category[];
  recentPosts: PostWithRelations[];
  sidebarBanners: Banner[];
  horizontalBanners: Banner[];
  featuredCategory: Category | null;
  featuredCategoryPosts: PostWithRelations[];
  mostRead: PostWithRelations[];
  diverseSections: { category: Category; posts: PostWithRelations[] }[];
  rowSection1: { category: Category; posts: PostWithRelations[] } | null;
  rowSection2: { category: Category; posts: PostWithRelations[] } | null;
  randomPosts: PostWithRelations[];
  materials: FreeMaterial[];
}

function formatDate(date: string | Date | null) {
  if (!date) return null;
  return format(new Date(date), "dd 'de' MMMM, yyyy", { locale: ptBR });
}

function formatDateShort(date: string | Date | null) {
  if (!date) return null;
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
}

function formatDateMonth(date: string | Date | null) {
  if (!date) return null;
  return format(new Date(date), "MMM dd, yyyy", { locale: ptBR });
}

function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-6 ${className}`}>
      <h2 className="font-serif text-2xl font-bold">{children}</h2>
      <div className="h-1 w-16 bg-primary mt-2 rounded-full" />
    </div>
  );
}

function PostCardLarge({ post }: { post: PostWithRelations }) {
  const date = formatDate(post.publishedAt);
  return (
    <Link href={`/post/${post.slug}`} data-testid={`card-post-${post.id}`}>
      <Card className="overflow-visible hover-elevate active-elevate-2 cursor-pointer h-full flex flex-col">
        {post.featuredImage && (
          <div className="aspect-video overflow-hidden rounded-t-md">
            <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="p-4 flex flex-col flex-1 gap-2">
          {post.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.categories.map((cat) => (
                <Badge key={cat.id} variant="secondary" className="text-xs">{cat.name}</Badge>
              ))}
            </div>
          )}
          <h3 className="font-serif text-lg font-semibold leading-snug line-clamp-2">{post.title}</h3>
          {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{post.excerpt}</p>}
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-auto pt-2">
            {date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{date}</span>}
            {post.authorName && <span className="flex items-center gap-1"><User className="h-3 w-3" />{post.authorName}</span>}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function PostCardCompact({ post, index }: { post: PostWithRelations; index?: number }) {
  const date = formatDateShort(post.publishedAt);
  return (
    <Link href={`/post/${post.slug}`} data-testid={`card-compact-${post.id}`}>
      <div className="flex gap-3 p-3 rounded-md hover-elevate active-elevate-2 cursor-pointer">
        {index !== undefined && (
          <span className="text-3xl font-bold text-primary/20 flex-shrink-0 w-8 text-center">{index}</span>
        )}
        {post.featuredImage && (
          <div className="w-20 h-16 flex-shrink-0 rounded-md overflow-hidden">
            <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-serif text-sm font-semibold leading-snug line-clamp-2">{post.title}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            {date && <span>{date}</span>}
            {post.viewCount > 0 && <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{post.viewCount}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

function PostCardHorizontal({ post }: { post: PostWithRelations }) {
  const date = formatDate(post.publishedAt);
  return (
    <Link href={`/post/${post.slug}`} data-testid={`card-horiz-${post.id}`}>
      <Card className="overflow-visible hover-elevate active-elevate-2 cursor-pointer flex flex-col sm:flex-row h-full">
        {post.featuredImage && (
          <div className="sm:w-48 aspect-video sm:aspect-auto flex-shrink-0 overflow-hidden rounded-t-md sm:rounded-l-md sm:rounded-tr-none">
            <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="p-4 flex flex-col flex-1 gap-2">
          {post.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.categories.map((cat) => (
                <Badge key={cat.id} variant="secondary" className="text-xs">{cat.name}</Badge>
              ))}
            </div>
          )}
          <h3 className="font-serif text-base font-semibold leading-snug line-clamp-2">{post.title}</h3>
          {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>}
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-auto pt-1">
            {date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{date}</span>}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function BannerSidebar({ banner }: { banner: Banner }) {
  return (
    <a href={banner.linkUrl || "#"} target="_blank" rel="noopener noreferrer" data-testid={`banner-sidebar-${banner.id}`}>
      <Card className="overflow-visible hover-elevate cursor-pointer">
        <img src={banner.imageUrl} alt={banner.title} className="w-full h-auto rounded-md" loading="lazy" />
      </Card>
    </a>
  );
}

function BannerHorizontal({ banner }: { banner: Banner }) {
  return (
    <a href={banner.linkUrl || "#"} target="_blank" rel="noopener noreferrer" data-testid={`banner-horizontal-${banner.id}`}>
      <Card className="overflow-visible hover-elevate cursor-pointer">
        <img src={banner.imageUrl} alt={banner.title} className="w-full h-auto rounded-md" loading="lazy" />
      </Card>
    </a>
  );
}

function SectionHero({ settings, categories }: { settings: Record<string, string>; categories: Category[] }) {
  const [, setLocation] = useLocation();
  const headline = settings["hero_headline"] || "O seu Blog de Psicometria";
  const subheadline = settings["hero_subheadline"] || "Tenha acesso a nossa enciclopedia virtual de conhecimento em Psicometria e Analise de Dados";
  const [searchQuery, setSearchQuery] = useState("");
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/busca?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <section style={{ backgroundColor: "hsl(220 30% 15%)" }} data-testid="section-hero">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="relative" ref={catRef}>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => setCatDropdownOpen(!catDropdownOpen)}
              data-testid="button-hero-categories"
            >
              <MenuIcon className="h-4 w-4 mr-2" />
              CATEGORIAS
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
            {catDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 min-w-56 rounded-md shadow-lg border z-50" style={{ backgroundColor: "hsl(220 30% 18%)", borderColor: "hsl(220 20% 25%)" }}>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/categoria/${cat.slug}`}
                    onClick={() => setCatDropdownOpen(false)}
                  >
                    <div className="block px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 first:rounded-t-md last:rounded-b-md cursor-pointer" data-testid={`hero-cat-${cat.id}`}>
                      {cat.name}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSearch} className="flex-shrink-0">
            <div className="relative">
              <Input
                type="search"
                placeholder="BUSCAR"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-white/30 text-white placeholder:text-white/50 w-48 sm:w-64 pr-9"
                data-testid="input-hero-search"
              />
              <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>

        <div className="text-center py-8 md:py-12">
          <h1 className="font-serif text-2xl md:text-3xl font-bold mb-3 text-white" data-testid="text-hero-title">
            {headline.includes("Blog") ? (
              <>
                O seu <span className="text-cyan-400">Blog</span> de Psicometria
              </>
            ) : (
              headline
            )}
          </h1>
          <p className="text-white/70 text-base md:text-lg mb-8 max-w-2xl mx-auto" data-testid="text-hero-subtitle">{subheadline}</p>

          <div className="max-w-4xl mx-auto">
            <p className="text-white/80 text-sm mb-4 text-left">
              Junte-se a mais de <span className="text-cyan-400 font-semibold">22.300</span> membros e receba conteudos exclusivos e com prioridade
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="text"
                placeholder="Seu primeiro nome"
                className="bg-white text-foreground placeholder:text-muted-foreground flex-1"
                data-testid="input-hero-name"
              />
              <Input
                type="email"
                placeholder="Digite seu e-mail"
                className="bg-white text-foreground placeholder:text-muted-foreground flex-1"
                data-testid="input-hero-email"
              />
              <Button className="flex-shrink-0 bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-600" data-testid="button-hero-subscribe">
                Quero receber materiais gratuitos
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionRecentPosts({ posts, sidebarBanners }: { posts: PostWithRelations[]; sidebarBanners: Banner[] }) {
  if (posts.length === 0) return null;
  const mainPost = posts[0];
  const bottomPosts = posts.slice(1, 4);
  const mainDate = formatDateMonth(mainPost.publishedAt);

  const banner1 = sidebarBanners[0] || null;
  const banner2 = sidebarBanners[1] || null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-10" data-testid="section-recent-posts">
      <SectionTitle>Posts Recentes</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-stretch">
        <div className="flex flex-col h-full">
          <Link href={`/post/${mainPost.slug}`} data-testid={`card-post-${mainPost.id}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 cursor-pointer hover-elevate active-elevate-2 rounded-md overflow-visible">
              {mainPost.featuredImage && (
                <div className="aspect-[16/10] md:aspect-auto overflow-hidden relative rounded-l-md">
                  {mainPost.categories.length > 0 && (
                    <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1">
                      {mainPost.categories.map((cat) => (
                        <Badge key={cat.id} className="bg-cyan-400 text-white border-cyan-500 text-xs">{cat.name}</Badge>
                      ))}
                    </div>
                  )}
                  <img src={mainPost.featuredImage} alt={mainPost.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}
              <div className="flex flex-col justify-center p-6 gap-3">
                {mainDate && <span className="text-sm text-muted-foreground">{mainDate}</span>}
                <h2 className="font-serif text-xl md:text-2xl font-bold leading-snug" data-testid="text-main-post-title">
                  {mainPost.title}
                </h2>
                {mainPost.excerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{mainPost.excerpt}</p>
                )}
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6 flex-1">
            {bottomPosts.map((post) => {
              const d = formatDateMonth(post.publishedAt);
              return (
                <Link key={post.id} href={`/post/${post.slug}`} data-testid={`card-post-${post.id}`}>
                  <div className="cursor-pointer hover-elevate active-elevate-2 rounded-md p-1">
                    {post.featuredImage && (
                      <div className="aspect-[16/10] overflow-hidden rounded-md mb-3">
                        <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      {d && <span className="text-xs text-muted-foreground">{d}</span>}
                      {post.categories.length > 0 && post.categories.slice(0, 1).map((cat) => (
                        <Badge key={cat.id} className="bg-cyan-400 text-white border-cyan-500 text-xs">{cat.name}</Badge>
                      ))}
                    </div>
                    <h3 className="font-serif text-sm font-bold leading-snug line-clamp-2">{post.title}</h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-6 h-full" data-testid="sidebar-banners">
          {banner1 && (
            <div className="flex-1 border rounded-md p-4">
              <a href={banner1.linkUrl || "#"} target="_blank" rel="noopener noreferrer" data-testid={`banner-sidebar-${banner1.id}`}>
                <div className="aspect-[1400/788] overflow-hidden rounded-md">
                  <img src={banner1.imageUrl} alt={banner1.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
              </a>
              {banner1.title && (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{banner1.title}</p>
                  {banner1.linkUrl && (
                    <a href={banner1.linkUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-banner-cta-${banner1.id}`}>
                      <Button size="sm" className="bg-cyan-500 text-white border-cyan-600" data-testid={`button-banner-cta-${banner1.id}`}>
                        Saiba mais
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {banner2 && (
            <div className="flex-1 border rounded-md p-4">
              <a href={banner2.linkUrl || "#"} target="_blank" rel="noopener noreferrer" data-testid={`banner-sidebar-${banner2.id}`}>
                <div className="aspect-[1400/788] overflow-hidden rounded-md">
                  <img src={banner2.imageUrl} alt={banner2.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
              </a>
            </div>
          )}

          {!banner1 && !banner2 && (
            <div className="aspect-[1400/788] rounded-md border p-4 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Espaco para banner</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SectionHorizontalBanner({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 py-4" data-testid="section-horizontal-banner">
      {banners.map((banner) => (
        <div key={banner.id} className="mb-4 last:mb-0">
          <BannerHorizontal banner={banner} />
        </div>
      ))}
    </section>
  );
}

function SectionFeaturedCategory({ category, posts }: { category: Category | null; posts: PostWithRelations[] }) {
  if (!category || posts.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 py-10" data-testid="section-featured-category">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <SectionTitle className="mb-0">{category.name}</SectionTitle>
        <Link href={`/categoria/${category.slug}`}>
          <Button variant="outline" size="sm" data-testid="button-see-more-featured">
            Ver mais
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {posts.map((post) => (
          <PostCardLarge key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}

function SectionNewsletter({ settings }: { settings: Record<string, string> }) {
  const text = settings["newsletter_text"] || "Receba nossos conteudos diretamente no seu e-mail";
  return (
    <section className="bg-muted/50" data-testid="section-newsletter">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="max-w-xl mx-auto text-center">
          <Mail className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-2">Newsletter</h2>
          <p className="text-muted-foreground mb-6">{text}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="email"
              placeholder="Seu melhor e-mail"
              className="flex-1"
              data-testid="input-newsletter-email"
            />
            <Button data-testid="button-newsletter-subscribe">
              <Mail className="h-4 w-4 mr-1" />
              Inscrever-se
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionMostReadAndCategories({ mostRead, categories: cats }: { mostRead: PostWithRelations[]; categories: Category[] }) {
  return (
    <section className="max-w-7xl mx-auto px-4 py-10" data-testid="section-most-read">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SectionTitle>Mais Lidos</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {mostRead.map((post, i) => (
              <PostCardCompact key={post.id} post={post} index={i + 1} />
            ))}
          </div>
        </div>
        <div>
          <SectionTitle>Categorias</SectionTitle>
          <div className="space-y-1">
            {cats.map((cat) => (
              <Link key={cat.id} href={`/categoria/${cat.slug}`} data-testid={`link-category-${cat.id}`}>
                <div className="flex items-center justify-between gap-2 p-3 rounded-md hover-elevate active-elevate-2 cursor-pointer">
                  <span className="text-sm font-medium">{cat.name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionDiverseCategories({ sections }: { sections: { category: Category; posts: PostWithRelations[] }[] }) {
  if (sections.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 py-10" data-testid="section-diverse-categories">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {sections.map((sec) => (
          <div key={sec.category.id}>
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="font-serif text-lg font-bold">{sec.category.name}</h3>
              <Link href={`/categoria/${sec.category.slug}`}>
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver mais <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </Link>
            </div>
            <div className="space-y-1">
              {sec.posts.map((post) => (
                <PostCardCompact key={post.id} post={post} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionRandomPosts({ posts }: { posts: PostWithRelations[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 py-10" data-testid="section-random-posts">
      <SectionTitle>Voce tambem pode gostar</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.slice(0, 6).map((post) => (
          <PostCardHorizontal key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}

function SectionRowCategories({ row1, row2 }: { row1: { category: Category; posts: PostWithRelations[] } | null; row2: { category: Category; posts: PostWithRelations[] } | null }) {
  const rows = [row1, row2].filter(Boolean) as { category: Category; posts: PostWithRelations[] }[];
  if (rows.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 py-10" data-testid="section-row-categories">
      {rows.map((row) => (
        <div key={row.category.id} className="mb-10 last:mb-0">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
            <SectionTitle className="mb-0">{row.category.name}</SectionTitle>
            <Link href={`/categoria/${row.category.slug}`}>
              <Button variant="outline" size="sm">
                Ver mais <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {row.posts.map((post) => (
              <PostCardLarge key={post.id} post={post} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function SectionFreeMaterials({ materials }: { materials: FreeMaterial[] }) {
  if (materials.length === 0) return null;
  return (
    <section className="bg-primary/5" data-testid="section-free-materials">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <Download className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-2">Materiais Gratuitos</h2>
          <p className="text-muted-foreground">Baixe nossos recursos de estudo gratuitamente</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((mat) => (
            <a key={mat.id} href={mat.linkUrl} target="_blank" rel="noopener noreferrer" data-testid={`material-${mat.id}`}>
              <Card className="overflow-visible hover-elevate active-elevate-2 cursor-pointer h-full flex flex-col">
                {mat.imageUrl && (
                  <div className="aspect-video overflow-hidden rounded-t-md">
                    <img src={mat.imageUrl} alt={mat.title} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="p-4 flex flex-col flex-1 gap-2">
                  <h3 className="font-serif text-base font-semibold leading-snug">{mat.title}</h3>
                  {mat.description && <p className="text-sm text-muted-foreground line-clamp-2">{mat.description}</p>}
                  <div className="flex items-center gap-1 text-primary text-sm font-medium mt-auto pt-2">
                    <Download className="h-4 w-4" />
                    Baixar gratis
                  </div>
                </div>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div>
      <div className="bg-primary h-64" />
      <div className="max-w-7xl mx-auto px-4 py-10">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-40 w-full rounded-md" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data, isLoading } = useQuery<HomeData>({
    queryKey: ["/api/home"],
  });

  if (isLoading || !data) {
    return <HomeSkeleton />;
  }

  return (
    <div>
      {/* 1. Hero */}
      <SectionHero settings={data.settings} categories={data.categories} />

      {/* 2. Recent posts (main + sidebar) with sidebar banners on the right */}
      <SectionRecentPosts posts={data.recentPosts} sidebarBanners={data.sidebarBanners} />

      {/* 3. Horizontal banner (full width) */}
      <SectionHorizontalBanner banners={data.horizontalBanners} />

      {/* 4. Featured category */}
      <SectionFeaturedCategory category={data.featuredCategory} posts={data.featuredCategoryPosts} />

      {/* 5. Newsletter */}
      <SectionNewsletter settings={data.settings} />

      {/* 6. Most read + categories sidebar */}
      <SectionMostReadAndCategories mostRead={data.mostRead} categories={data.categories} />

      {/* 7. Diverse categories (3 columns) */}
      <SectionDiverseCategories sections={data.diverseSections} />

      {/* 8. Random posts */}
      <SectionRandomPosts posts={data.randomPosts} />

      {/* 9. Row category sections */}
      <SectionRowCategories row1={data.rowSection1} row2={data.rowSection2} />

      {/* 10. Free materials */}
      <SectionFreeMaterials materials={data.materials} />
    </div>
  );
}
