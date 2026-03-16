import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PostWithRelations, Banner, Category } from "@shared/schema";

function formatDate(date: string | Date | null) {
  if (!date) return null;
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
}

export function SidebarAcademyForm({ slot = "post_academy_form" }: { slot?: string }) {
  const { data: banners } = useQuery<Banner[]>({
    queryKey: [`/api/banners?slot=${slot}`],
  });
  const banner = (banners || []).sort((a, b) => a.sortOrder - b.sortOrder)[0];

  const title = banner?.title || "Psicometria Online Academy";
  const description = banner?.description || "Estamos formando os pesquisadores mais competentes do país. Seja um deles.";
  const buttonText = banner?.buttonText || "Saiba mais";
  const linkUrl = banner?.linkUrl || "https://www.academy.psicometriaonline.com.br/blog";
  const imageUrl = banner?.imageUrl;

  return (
    <Card className="p-5 bg-primary/5 border-primary/20" data-testid="card-sidebar-academy-form">
      {imageUrl && (
        <div className="aspect-[1400/788] overflow-hidden rounded-md mb-4">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
            data-testid="img-sidebar-academy"
          />
        </div>
      )}
      <div className="text-center mb-4">
        <h3 className="font-bold text-lg leading-tight" data-testid="text-sidebar-academy-title">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1" data-testid="text-sidebar-academy-description">{description}</p>
      </div>
      <div className="space-y-3">
        <Input placeholder="Seu nome" className="text-sm" data-testid="input-sidebar-academy-name" />
        <Input type="email" placeholder="Seu melhor e-mail" className="text-sm" data-testid="input-sidebar-academy-email" />
        <a href={linkUrl} target="_blank" rel="noopener noreferrer" data-testid="link-sidebar-academy-signup">
          <Button className="w-full bg-accent-bright text-accent-bright-foreground" data-testid="button-sidebar-academy-signup">
            {buttonText}
          </Button>
        </a>
      </div>
    </Card>
  );
}

export function SidebarMostRead({ limit = 4 }: { limit?: number }) {
  const { data: mostRead, isLoading } = useQuery<PostWithRelations[]>({
    queryKey: [`/api/posts/most-read-global?limit=${limit}`],
  });

  if (isLoading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-accent-bright rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: limit }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-md" />
          ))}
        </div>
      </Card>
    );
  }

  if (!mostRead || mostRead.length === 0) return null;

  return (
    <Card className="p-5" data-testid="card-sidebar-most-read">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-accent-bright rounded-full" />
        <h3 className="font-bold text-lg" data-testid="text-sidebar-most-read-title">Mais Lidos</h3>
      </div>
      <div className="space-y-4">
        {mostRead.map((p) => (
          <Link key={p.id} href={`/${p.slug}`} data-testid={`link-sidebar-most-read-${p.id}`}>
            <Card className="overflow-hidden hover-elevate cursor-pointer" data-testid={`card-sidebar-most-read-${p.id}`}>
              {p.featuredImage && (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={p.featuredImage}
                    alt={p.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-3">
                {p.categories[0] && (
                  <Badge variant="secondary" className="mb-1.5 text-xs bg-accent-bright/15 text-accent-bright border-0" data-testid={`badge-sidebar-most-read-cat-${p.id}`}>
                    {p.categories[0].name}
                  </Badge>
                )}
                <h4 className="text-sm font-semibold leading-snug line-clamp-3" data-testid={`text-sidebar-most-read-title-${p.id}`}>{p.title}</h4>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export function SidebarRecentPosts({ limit = 4 }: { limit?: number }) {
  const { data: recentPosts, isLoading } = useQuery<PostWithRelations[]>({
    queryKey: [`/api/posts/recent?limit=${limit}`],
  });

  if (isLoading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-accent-bright rounded-full" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: limit }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      </Card>
    );
  }

  if (!recentPosts || recentPosts.length === 0) return null;

  return (
    <Card className="p-5" data-testid="card-sidebar-recent-posts">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-accent-bright rounded-full" />
        <h3 className="font-bold text-lg" data-testid="text-sidebar-recent-title">Postados Recentemente</h3>
      </div>
      <div className="space-y-3">
        {recentPosts.map((p) => (
          <Link key={p.id} href={`/${p.slug}`} data-testid={`link-sidebar-recent-${p.id}`}>
            <div className="flex gap-3 p-2 rounded-md hover-elevate cursor-pointer border-b border-border/50 last:border-0">
              {p.featuredImage && (
                <div className="w-20 h-14 flex-shrink-0 rounded overflow-hidden shadow-sm">
                  <img src={p.featuredImage} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="text-sm font-semibold leading-tight line-clamp-2" data-testid={`text-sidebar-recent-title-${p.id}`}>{p.title}</h4>
                <span className="text-xs text-muted-foreground mt-1" data-testid={`text-sidebar-recent-date-${p.id}`}>{formatDate(p.publishedAt)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function PostCardCompactForDiverse({ post }: { post: PostWithRelations }) {
  const date = formatDate(post.publishedAt);
  return (
    <Link href={`/${post.slug}`} data-testid={`link-diverse-compact-${post.id}`}>
      <div className="flex gap-3 p-2.5 rounded-md hover-elevate cursor-pointer border-b border-border/50 last:border-0">
        {post.featuredImage && (
          <div className="w-20 h-14 flex-shrink-0 rounded overflow-hidden shadow-sm">
            <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h4 className="font-serif text-sm font-bold leading-tight line-clamp-2" data-testid={`text-diverse-title-${post.id}`}>{post.title}</h4>
          <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground mt-1 font-medium">
            {date && <span data-testid={`text-diverse-date-${post.id}`}>{date}</span>}
            {post.categories.length > 0 && (
              <Badge variant="secondary" className="bg-accent-bright text-accent-bright-foreground border-none text-[10px] font-bold tracking-tight px-1.5 py-0.5" data-testid={`badge-diverse-cat-${post.id}`}>
                {post.categories[0].name}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function DiverseSections({ context = "home" }: { context?: "home" | "category" | "tag" }) {
  const { data: sections, isLoading } = useQuery<{ category: Category; posts: PostWithRelations[] }[]>({
    queryKey: [`/api/diverse-sections?context=${context}`],
  });

  if (isLoading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-32" />
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-16 w-full rounded-md" />
              ))}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!sections || sections.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-10" data-testid={`section-diverse-${context}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-x-0 md:divide-x divide-border">
        {sections.map((sec, idx) => (
          <div key={sec.category.id} className={idx === 0 ? "md:pr-6" : idx === sections.length - 1 ? "md:pl-6" : "md:px-6"}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <h3 className="font-serif text-lg font-bold" data-testid={`text-diverse-category-${sec.category.id}`}>{sec.category.name}</h3>
              <Link href={`/categoria/${sec.category.slug}`} data-testid={`link-diverse-more-${sec.category.id}`}>
                <Button variant="ghost" size="sm" className="text-xs" data-testid={`button-diverse-more-${sec.category.id}`}>
                  Ver mais <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </Link>
            </div>
            <div className="space-y-1">
              {sec.posts.map((post) => (
                <PostCardCompactForDiverse key={post.id} post={post} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
