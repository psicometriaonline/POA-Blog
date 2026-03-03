import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, User, ArrowRight, Mail, ChevronRight, ChevronLeft, ChevronDown, Download, Search, Menu as MenuIcon } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import type { PostWithRelations, Category, Banner, FreeMaterial } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useRef, useEffect, useCallback } from "react";
import { HeroBar } from "@/components/hero-bar";

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

function formatDateShort(date: string | Date | null) {
  if (!date) return null;
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
}

function formatDate(date: string | Date | null) {
  if (!date) return null;
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
}

function formatDateMonth(date: string | Date | null) {
  if (!date) return null;
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
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
    <Link href={`/${post.slug}`} data-testid={`card-post-${post.id}`}>
      <Card className="overflow-visible hover-elevate active-elevate-2 cursor-pointer h-full flex flex-col border-none shadow-sm rounded-xl">
        {post.featuredImage && (
          <div className="aspect-video overflow-hidden rounded-t-xl">
            <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="p-4 flex flex-col flex-1 gap-2">
          {post.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.categories.map((cat) => (
                <Badge key={cat.id} className="bg-accent-bright text-accent-bright-foreground border-none text-[10px] font-bold tracking-tight px-1.5 py-0.5">{cat.name}</Badge>
              ))}
            </div>
          )}
          <h3 className="font-serif text-lg font-bold leading-snug line-clamp-2">{post.title}</h3>
          {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{post.excerpt}</p>}
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-auto pt-2 font-medium">
            {date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{date}</span>}
            {post.authorName && <span className="flex items-center gap-1"><User className="h-3 w-3" />{post.authorName}</span>}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function PostCardCompact({ post, index }: { post: PostWithRelations; index?: number }) {
  const date = formatDate(post.publishedAt);
  return (
    <Link href={`/${post.slug}`} data-testid={`card-compact-${post.id}`}>
      <div className="flex gap-4 p-3 rounded-md hover:bg-accent/5 transition-colors cursor-pointer group border-b border-border/50 last:border-0">
        {index !== undefined && (
          <span className="text-4xl font-black text-primary/30 flex-shrink-0 w-12 text-center group-hover:text-primary/40 transition-colors italic">{index}</span>
        )}
        {post.featuredImage && (
          <div className="w-24 h-16 flex-shrink-0 rounded overflow-hidden shadow-sm">
            <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h4 className="font-serif text-base font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5 font-medium">
            {date && <span>{date}</span>}
            {post.categories.length > 0 && (
              <Badge className="bg-accent-bright text-accent-bright-foreground border-none text-[10px] font-bold tracking-tight px-1.5 py-0.5">{post.categories[0].name}</Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function PostCardHorizontal({ post }: { post: PostWithRelations }) {
  const date = formatDate(post.publishedAt);
  return (
    <Link href={`/${post.slug}`} data-testid={`card-horiz-${post.id}`}>
      <Card className="overflow-visible hover-elevate active-elevate-2 cursor-pointer flex flex-col sm:flex-row h-full border-none shadow-sm rounded-xl">
        {post.featuredImage && (
          <div className="sm:w-48 aspect-video sm:aspect-auto flex-shrink-0 overflow-hidden rounded-t-xl sm:rounded-l-xl sm:rounded-tr-none">
            <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="p-4 flex flex-col flex-1 gap-2">
          {post.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.categories.map((cat) => (
                <Badge key={cat.id} className="bg-accent-bright text-accent-bright-foreground border-none text-[10px] font-bold tracking-tight px-1.5 py-0.5">{cat.name}</Badge>
              ))}
            </div>
          )}
          <h3 className="font-serif text-base font-bold leading-snug line-clamp-2">{post.title}</h3>
          {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>}
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-auto pt-1 font-medium">
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
      <Card className="overflow-visible hover-elevate cursor-pointer border-none shadow-none bg-transparent">
        <img src={banner.imageUrl} alt={banner.title} className="w-full h-auto rounded-xl shadow-md" loading="lazy" />
      </Card>
    </a>
  );
}

function BannerHorizontal({ banner }: { banner: Banner }) {
  const showTitle = banner.showTitle ?? true;
  return (
    <div className="relative group overflow-hidden rounded-xl border-none" data-testid={`banner-horizontal-${banner.id}`}>
      <a href={banner.linkUrl || "#"} target="_blank" rel="noopener noreferrer" className="block w-full">
        <img src={banner.imageUrl} alt={banner.title} className="w-full h-auto object-cover shadow-lg" loading="lazy" />
      </a>
      {( (showTitle && banner.title) || banner.showButton) && (
        <div className="absolute inset-0 flex flex-col justify-end p-12 bg-black/5 pointer-events-none">
          <div className="w-full">
            {showTitle && banner.title && (
              <h3 
                className={`font-serif font-bold text-white mb-4 drop-shadow-md ${
                  banner.titleAlignment === 'center' ? 'text-center' : 
                  banner.titleAlignment === 'right' ? 'text-right' : 'text-left'
                }`}
                style={{ fontSize: `${banner.titleFontSize || 28}px` }}
              >
                {banner.title}
              </h3>
            )}
            {banner.showButton && banner.linkUrl && (
              <div 
                className={`flex pointer-events-auto ${
                  banner.buttonAlignment === 'center' ? 'justify-center' : 
                  banner.buttonAlignment === 'right' ? 'justify-end' : 'justify-start'
                }`}
                style={{
                  transform: banner.buttonPosX || banner.buttonPosY 
                    ? `translate(${banner.buttonPosX || 0}%, ${banner.buttonPosY || 0}%)` 
                    : undefined
                }}
              >
                <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer">
                  <Button 
                    className={`${banner.buttonColor || "bg-[#31D5FF]"} text-[#000A24] hover:opacity-90 border-none shadow-lg h-auto py-2.5 px-8 rounded-sm font-semibold`}
                    style={{ fontSize: `${banner.buttonFontSize || 14}px` }}
                    data-testid={`button-banner-cta-horiz-${banner.id}`}
                  >
                    {banner.buttonText || "Saiba mais"}
                  </Button>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionRecentPosts({ posts, sidebarBanners }: { posts: PostWithRelations[]; sidebarBanners: Banner[] }) {
  if (posts.length === 0) return null;
  const mainPost = posts[0];
  const bottomPosts = posts.slice(1, 4);
  const mainDate = formatDate(mainPost.publishedAt);

  const banner1 = sidebarBanners[0] || null;
  const banner2 = sidebarBanners[1] || null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-10" data-testid="section-recent-posts">
      <SectionTitle>Posts Recentes</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-stretch">
        <div className="flex flex-col h-full">
          <Link href={`/${mainPost.slug}`} data-testid={`card-post-${mainPost.id}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 cursor-pointer hover-elevate active-elevate-2 rounded-xl overflow-hidden shadow-sm border border-border/40">
              {mainPost.featuredImage && (
                <div className="aspect-[16/10] md:aspect-auto overflow-hidden relative">
                  {mainPost.categories.length > 0 && (
                    <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1">
                      {mainPost.categories.map((cat) => (
                        <Badge key={cat.id} className="bg-white/90 text-accent-bright-foreground border-none text-[10px] font-bold tracking-tight px-2 py-0.5 shadow-sm">{cat.name}</Badge>
                      ))}
                    </div>
                  )}
                  <img src={mainPost.featuredImage} alt={mainPost.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}
              <div className="flex flex-col justify-center p-8 gap-4 bg-card">
                {mainDate && <span className="text-xs font-bold text-primary/60 uppercase tracking-wider">{mainDate}</span>}
                <h2 className="font-serif text-2xl md:text-3xl font-black leading-tight text-foreground" data-testid="text-main-post-title">
                  {mainPost.title}
                </h2>
                {mainPost.excerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{mainPost.excerpt}</p>
                )}
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 flex-1">
            {bottomPosts.map((post) => {
              const d = formatDate(post.publishedAt);
              return (
                <Link key={post.id} href={`/${post.slug}`} data-testid={`card-post-${post.id}`}>
                  <div className="cursor-pointer group">
                    {post.featuredImage && (
                      <div className="aspect-[16/10] overflow-hidden rounded-xl mb-3 shadow-sm border border-border/40">
                        <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      {d && <span className="text-xs font-bold text-muted-foreground/80">{d}</span>}
                      {post.categories.length > 0 && post.categories.slice(0, 1).map((cat) => (
                        <Badge key={cat.id} className="bg-accent-bright text-accent-bright-foreground border-none text-[10px] font-bold tracking-tight px-1.5 py-0.5">{cat.name}</Badge>
                      ))}
                    </div>
                    <h3 className="font-serif text-base font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-6 h-full" data-testid="sidebar-banners">
          {banner1 && (
            <div className="flex-1 border-none p-0">
              <a href={banner1.linkUrl || "#"} target="_blank" rel="noopener noreferrer" data-testid={`banner-sidebar-${banner1.id}`}>
                <div className="aspect-[1400/788] overflow-hidden rounded-xl shadow-md">
                  <img src={banner1.imageUrl} alt={banner1.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
              </a>
              {(banner1.showTitle ?? true) && banner1.title && (
                <div className="mt-3 px-1">
                  <p 
                    className={`text-muted-foreground line-clamp-2 mb-2 font-medium ${
                      banner1.titleAlignment === 'center' ? 'text-center' : 
                      banner1.titleAlignment === 'right' ? 'text-right' : 'text-left'
                    }`}
                    style={{ fontSize: `${banner1.titleFontSize || 14}px` }}
                  >
                    {banner1.title}
                  </p>
                  {banner1.showButton && banner1.linkUrl && (
                    <div className={`flex ${
                      banner1.buttonAlignment === 'center' ? 'justify-center' : 
                      banner1.buttonAlignment === 'right' ? 'justify-end' : 'justify-start'
                    }`}>
                      <a href={banner1.linkUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-banner-cta-${banner1.id}`}>
                        <Button 
                          size="sm" 
                          className={`${banner1.buttonColor || "bg-[#31D5FF]"} text-[#000A24] hover:opacity-90 border-none h-auto py-2 px-4 font-bold rounded-sm shadow-sm`}
                          style={{ fontSize: `${banner1.buttonFontSize || 12}px` }}
                          data-testid={`button-banner-cta-${banner1.id}`}
                        >
                          {banner1.buttonText || "Saiba mais"}
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {banner2 && (
            <div className="flex-1 border-none p-0">
              <a href={banner2.linkUrl || "#"} target="_blank" rel="noopener noreferrer" data-testid={`banner-sidebar-${banner2.id}`}>
                <div className="aspect-[1400/788] overflow-hidden rounded-xl shadow-md">
                  <img src={banner2.imageUrl} alt={banner2.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
              </a>
              {(banner2.showTitle ?? true) && banner2.title && (
                <div className="mt-3 px-1">
                  <p 
                    className={`text-muted-foreground line-clamp-2 mb-2 font-medium ${
                      banner2.titleAlignment === 'center' ? 'text-center' : 
                      banner2.titleAlignment === 'right' ? 'text-right' : 'text-left'
                    }`}
                    style={{ fontSize: `${banner2.titleFontSize || 14}px` }}
                  >
                    {banner2.title}
                  </p>
                  {banner2.showButton && banner2.linkUrl && (
                    <div className={`flex ${
                      banner2.buttonAlignment === 'center' ? 'justify-center' : 
                      banner2.buttonAlignment === 'right' ? 'justify-end' : 'justify-start'
                    }`}>
                      <a href={banner2.linkUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-banner-cta-${banner2.id}`}>
                        <Button 
                          size="sm" 
                          className={`${banner2.buttonColor || "bg-[#31D5FF]"} text-[#000A24] hover:opacity-90 border-none h-auto py-2 px-4 font-bold rounded-sm shadow-sm`}
                          style={{ fontSize: `${banner2.buttonFontSize || 12}px` }}
                          data-testid={`button-banner-cta-${banner2.id}`}
                        >
                          {banner2.buttonText || "Saiba mais"}
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!banner1 && !banner2 && (
            <div className="aspect-[1400/788] rounded-md border p-4 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Espaço para banner</p>
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
    <section className="bg-dark-bg" data-testid="section-newsletter">
      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="max-w-xl mx-auto text-center">
          <Mail className="h-10 w-10 text-accent-bright mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-2 text-dark-bg-foreground">Newsletter</h2>
          <p className="text-dark-bg-foreground/70 mb-6">{text}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="email"
              placeholder="Seu melhor e-mail"
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
              data-testid="input-newsletter-email"
            />
            <Button className="bg-accent-bright text-accent-bright-foreground border-accent-bright" data-testid="button-newsletter-subscribe">
              <Mail className="h-4 w-4 mr-1" />
              Inscrever-se
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionMostReadAndCategories({ mostRead, categories: cats, sidebarBanners }: { mostRead: PostWithRelations[]; categories: Category[]; sidebarBanners: Banner[] }) {
  const belowCatBanner = sidebarBanners[2] || null;
  return (
    <section className="max-w-7xl mx-auto px-4 py-10" data-testid="section-most-read">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        <div>
          <SectionTitle>Mais Lidos</SectionTitle>
          <div className="flex flex-col gap-2">
            {mostRead.map((post, i) => (
              <PostCardCompact key={post.id} post={post} index={i + 1} />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <SectionTitle>Categorias</SectionTitle>
            <div className="space-y-1 border border-border rounded-xl p-3">
              {cats.map((cat) => (
                <Link key={cat.id} href={`/categoria/${cat.slug}`} data-testid={`link-category-${cat.id}`}>
                  <div className="flex items-center justify-between gap-2 p-3 rounded-lg hover-elevate active-elevate-2 cursor-pointer">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
          {belowCatBanner && (
            <a href={belowCatBanner.linkUrl || "#"} target="_blank" rel="noopener noreferrer" data-testid={`banner-below-categories-${belowCatBanner.id}`}>
              <div className="overflow-hidden rounded-xl shadow-md">
                <img src={belowCatBanner.imageUrl} alt={belowCatBanner.title} className="w-full h-auto object-cover" loading="lazy" />
              </div>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function SectionDiverseCategories({ sections }: { sections: { category: Category; posts: PostWithRelations[] }[] }) {
  if (sections.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 py-10" data-testid="section-diverse-categories">
      <div className="grid grid-cols-1 md:grid-cols-3 divide-x-0 md:divide-x divide-border">
        {sections.map((sec, idx) => (
          <div key={sec.category.id} className={idx === 0 ? "md:pr-6" : idx === sections.length - 1 ? "md:pl-6" : "md:px-6"}>
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
      <SectionTitle>Você Também Pode Gostar</SectionTitle>
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
        <div key={row.category.id} className="mb-14 last:mb-0">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
            <SectionTitle className="mb-0">{row.category.name}</SectionTitle>
            <Link href={`/categoria/${row.category.slug}`}>
              <Button variant="outline" size="sm" className="rounded-full px-4 border-primary/20 hover:bg-primary/5">
                Ver mais <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
  });

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  return (
    <section className="bg-dark-bg" data-testid="section-free-materials">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-serif text-2xl font-bold text-white mb-1">Materiais Gratuitos</h2>
            <p className="text-white/60 text-sm">Baixe nossos recursos de estudo gratuitamente</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={scrollPrev}
              className="flex items-center justify-center h-10 w-10 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
              data-testid="button-materials-prev"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={scrollNext}
              className="flex items-center justify-center h-10 w-10 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
              data-testid="button-materials-next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-5">
            {materials.map((mat) => (
              <div key={mat.id} className="flex-[0_0_70%] sm:flex-[0_0_45%] lg:flex-[0_0_23%] min-w-0">
                <a href={mat.linkUrl} target="_blank" rel="noopener noreferrer" data-testid={`material-${mat.id}`} className="block group">
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5 transition-colors hover:bg-white/10">
                    {mat.imageUrl && (
                      <div className="overflow-hidden">
                        <img
                          src={mat.imageUrl}
                          alt={mat.title}
                          className="w-full h-auto block group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-serif text-sm font-semibold text-white leading-snug mb-1">{mat.title}</h3>
                      {mat.description && <p className="text-xs text-white/50 line-clamp-2">{mat.description}</p>}
                      <div className="flex items-center gap-1 text-accent-bright text-xs font-medium mt-3">
                        <Download className="h-3.5 w-3.5" />
                        Baixar grátis
                      </div>
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
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
      <HeroBar showHeadline={true} settings={data.settings} />

      {/* 2. Recent posts (main + sidebar) with sidebar banners on the right */}
      <SectionRecentPosts posts={data.recentPosts} sidebarBanners={data.sidebarBanners} />

      {/* 3. Horizontal banner (full width) */}
      <SectionHorizontalBanner banners={data.horizontalBanners} />

      {/* 4. Featured category */}
      <SectionFeaturedCategory category={data.featuredCategory} posts={data.featuredCategoryPosts} />

      {/* 5. Newsletter */}
      <SectionNewsletter settings={data.settings} />

      {/* 6. Most read + categories sidebar */}
      <SectionMostReadAndCategories mostRead={data.mostRead} categories={data.categories} sidebarBanners={data.sidebarBanners} />

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
