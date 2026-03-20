import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, FolderOpen, Tag, Download, Edit, Trash2, Search, ChevronLeft, ChevronRight, ExternalLink, ArrowUp, ArrowDown, ArrowUpDown, Loader2, MessageSquare, BarChart3, Home, Database, Layers, Eye } from "lucide-react";
import { PagePreview } from "@/components/admin/page-preview";
import { useAuth } from "@/hooks/use-auth";
import type { PostWithRelations, Category, Tag as TagType, Banner, FreeMaterial } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HomePageTab, CategoryPageTab, TagPageTab, FilteredBannersTab, CitationSettingsTab } from "./home-settings";
import { CategoriesManagerContent } from "./manage-categories";
import { TagsManagerContent } from "./manage-tags";
import { ContainersContent } from "./containers";
import { AuthorsManagerContent } from "./manage-authors";
import { SubscribersContent } from "./subscribers";
import { MediaContent } from "./manage-media";
import { CrawlContent } from "./crawl";
import { AdminLayout, type AdminTab } from "@/components/admin/admin-layout";
import { PostsSubNav } from "@/components/admin/posts-sub-nav";

const POSTS_PER_PAGE = 20;

type SortField = "title" | "authorName" | "publishedAt" | "inboundLinks" | "outboundLinks" | "categories" | "tags";
type SortOrder = "asc" | "desc";

function SortHeader({ label, field, currentSort, currentOrder, onSort }: { label: string; field: SortField; currentSort: SortField | null; currentOrder: SortOrder; onSort: (f: SortField) => void }) {
  const isActive = currentSort === field;
  return (
    <button
      type="button"
      className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
      onClick={() => onSort(field)}
      data-testid={`sort-${field}`}
    >
      <span>{label}</span>
      {isActive ? (
        currentOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

type LinkInfo = { id: number; title: string; slug: string };

function LinkCountPopover({ postId, count, type, colorClass }: { postId: number; count: number; type: "inbound" | "outbound"; colorClass: string }) {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<{ inbound: LinkInfo[]; outbound: LinkInfo[] }>({
    queryKey: ["/api/admin/posts", postId, "internal-links"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/posts/${postId}/internal-links`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar links");
      return res.json();
    },
    enabled: open,
  });

  const links = type === "inbound" ? data?.inbound : data?.outbound;
  const linkLabel = type === "inbound" ? "Links recebidos" : "Links enviados";

  if (count === 0) {
    return <span className="text-xs font-medium text-muted-foreground">0</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`text-xs font-medium ${colorClass} hover:underline cursor-pointer`}
          data-testid={`button-${type}-links-${postId}`}
        >
          {count}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-64 overflow-y-auto p-3" align="center">
        <p className="text-sm font-semibold mb-2">{linkLabel} ({count})</p>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Carregando...
          </div>
        ) : links && links.length > 0 ? (
          <ul className="space-y-1">
            {links.map(link => (
              <li key={link.id}>
                <Link href={`/admin/post/${link.id}`}>
                  <span className="text-sm text-primary hover:underline cursor-pointer" data-testid={`link-popup-post-${link.id}`}>
                    {link.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum link encontrado.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function PostsTab({ user, bannerQuery, settings }: { user: any; bannerQuery: ReturnType<typeof useQuery<Banner[]>>; settings: Record<string, string> }) {
  const { toast } = useToast();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const subFromUrl = urlParams.get("sub") || "posts";

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [subTab, setSubTab] = useState(subFromUrl);
  const [previewPostSlug, setPreviewPostSlug] = useState<string>("");

  useEffect(() => {
    setSubTab(subFromUrl);
  }, [subFromUrl]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const offset = page * POSTS_PER_PAGE;
  const sortByParam = sortBy ? `&sortBy=${sortBy}&sortOrder=${sortOrder}` : "";
  const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : "";

  const { data: postsData, isLoading: postsLoading } = useQuery<{ posts: PostWithRelations[]; total: number }>({
    queryKey: ["/api/admin/posts", { search: searchTerm, limit: POSTS_PER_PAGE, offset, sortBy, sortOrder }],
    queryFn: async () => {
      const res = await fetch(`/api/admin/posts?limit=${POSTS_PER_PAGE}&offset=${offset}${searchParam}${sortByParam}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar posts");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: linkCounts } = useQuery<Record<number, { inbound: number; outbound: number }>>({
    queryKey: ["/api/admin/posts/link-counts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/posts/link-counts", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar contagem de links");
      return res.json();
    },
    enabled: !!user,
  });

  const displayPosts = postsData?.posts || [];

  useEffect(() => {
    if (!previewPostSlug && displayPosts.length > 0) {
      setPreviewPostSlug(displayPosts[0].slug);
    }
  }, [displayPosts, previewPostSlug]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder(field === "publishedAt" ? "desc" : "asc");
    }
    setPage(0);
  };

  const handleDeletePost = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/admin/posts/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts/link-counts"] });
      toast({ title: "Post excluido com sucesso" });
    } catch (error: any) {
      toast({ title: "Erro ao excluir post", description: error.message, variant: "destructive" });
    }
  };

  const totalPages = postsData ? Math.ceil(postsData.total / POSTS_PER_PAGE) : 0;

  const statusLabel = (s: string) => {
    switch (s) {
      case "published": return "Publicado";
      case "scheduled": return "Agendado";
      default: return "Rascunho";
    }
  };

  const statusVariant = (s: string): "default" | "secondary" | "outline" => {
    switch (s) {
      case "published": return "default";
      case "scheduled": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <PostsSubNav activePage={subTab as "posts" | "containers" | "import" | "banners" | "preview" | "citation"} />
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsContent value="banners" className="mt-0">
          <FilteredBannersTab 
            banners={bannerQuery.data || []} 
            isLoading={bannerQuery.isLoading} 
            slots={["post_sidebar", "post_academy_form"]}
            defaultSlot="post_sidebar"
          />
        </TabsContent>

        <TabsContent value="posts" className="mt-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar posts por título..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
                data-testid="input-search-posts"
              />
            </div>
            <a
              href={`/api/admin/posts/export${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ""}`}
              download
              data-testid="button-export-posts"
            >
              <Button variant="outline" title="Exportar posts como CSV">
                <Download className="h-4 w-4 mr-1" />
                Exportar
              </Button>
            </a>
          </div>

          {searchTerm && postsData && (
            <p className="text-sm text-muted-foreground mb-3" data-testid="text-search-results">
              {postsData.total} {postsData.total === 1 ? "resultado" : "resultados"} para "{searchTerm}"
            </p>
          )}

          {postsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : postsData?.posts.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                {searchTerm ? `Nenhum post encontrado para "${searchTerm}".` : "Nenhum post ainda."}
              </p>
              {!searchTerm && (
                <Link href="/admin/post/novo">
                  <Button data-testid="button-create-first-post">
                    <Plus className="h-4 w-4 mr-1" />
                    Criar primeiro post
                  </Button>
                </Link>
              )}
            </Card>
          ) : (
            <>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-posts">
                  <thead>
                    <tr className="border-b bg-muted/50 text-muted-foreground">
                      <th className="text-left p-3 font-medium min-w-[250px]">
                        <SortHeader label="Título" field="title" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                      </th>
                      <th className="text-left p-3 font-medium min-w-[120px]">
                        <SortHeader label="Autor" field="authorName" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                      </th>
                      <th className="text-left p-3 font-medium min-w-[140px]">
                        <SortHeader label="Categorias" field="categories" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                      </th>
                      <th className="text-left p-3 font-medium min-w-[140px]">
                        <SortHeader label="Tags" field="tags" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                      </th>
                      <th className="text-left p-3 font-medium min-w-[100px]">
                        <SortHeader label="Data" field="publishedAt" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                      </th>
                      <th className="text-center p-3 font-medium min-w-[50px]" title="Links recebidos de outros posts">
                        <SortHeader label="↓ Rec." field="inboundLinks" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                      </th>
                      <th className="text-center p-3 font-medium min-w-[50px]" title="Links enviados para outros posts">
                        <SortHeader label="↑ Env." field="outboundLinks" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                      </th>
                      <th className="text-right p-3 font-medium min-w-[100px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayPosts.map((post) => {
                      const lc = linkCounts?.[post.id];
                      return (
                        <tr key={post.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`admin-post-${post.id}`}>
                          <td className="p-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link href={`/admin/post/${post.id}`}>
                                <span className="font-medium text-primary hover:underline cursor-pointer" data-testid={`link-title-${post.id}`}>
                                  {post.title}
                                </span>
                              </Link>
                              <Badge variant={statusVariant(post.status)} className="text-[10px] px-1.5 py-0">
                                {statusLabel(post.status)}
                              </Badge>
                            </div>
                          </td>
                          <td className="p-3" data-testid={`text-author-${post.id}`}>
                            {post.authorId ? (
                              <Link href={`/admin/autores/${post.authorId}`}>
                                <span className="text-primary hover:underline cursor-pointer">
                                  {post.authorName || post.author?.name}
                                </span>
                              </Link>
                            ) : post.authorName || post.author?.name ? (
                              <span className="text-muted-foreground">
                                {post.authorName || post.author?.name}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {post.categories.length > 0
                                ? post.categories.map(c => (
                                    <Link key={c.id} href={`/admin/categorias/${c.slug}`}>
                                      <span className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer" data-testid={`link-category-${c.id}`}>{c.name}</span>
                                    </Link>
                                  ))
                                : <span className="text-xs text-muted-foreground">—</span>
                              }
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {post.tags.length > 0
                                ? post.tags.map(t => (
                                    <Link key={t.id} href={`/admin/tags/${t.slug}`}>
                                      <span className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer" data-testid={`link-tag-${t.id}`}>{t.name}</span>
                                    </Link>
                                  ))
                                : <span className="text-xs text-muted-foreground">—</span>
                              }
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground whitespace-nowrap" data-testid={`text-date-${post.id}`}>
                            {post.publishedAt
                              ? format(new Date(post.publishedAt), "dd/MM/yyyy", { locale: ptBR })
                              : "Sem data"}
                          </td>
                          <td className="p-3 text-center" data-testid={`text-inbound-${post.id}`}>
                            {lc ? (
                              <LinkCountPopover postId={post.id} count={lc.inbound} type="inbound" colorClass="text-green-600" />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center" data-testid={`text-outbound-${post.id}`}>
                            {lc ? (
                              <LinkCountPopover postId={post.id} count={lc.outbound} type="outbound" colorClass="text-blue-600" />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1">
                              <a href={`/${post.slug}`} target="_blank" rel="noopener noreferrer">
                                <Button size="icon" variant="ghost" title="Ir para" className="h-7 w-7" data-testid={`button-goto-post-${post.id}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </a>
                              <Link href={`/admin/metricas?postId=${post.id}`}>
                                <Button size="icon" variant="ghost" title="Métricas" className="h-7 w-7" data-testid={`button-analytics-post-${post.id}`}>
                                  <BarChart3 className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                              <Link href={`/admin/post/${post.id}`}>
                                <Button size="icon" variant="ghost" title="Editar" className="h-7 w-7" data-testid={`button-edit-post-${post.id}`}>
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Excluir"
                                className="h-7 w-7"
                                onClick={() => handleDeletePost(post.id)}
                                data-testid={`button-delete-post-${post.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                    Página {page + 1} de {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      data-testid="button-next-page"
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="containers" className="mt-0">
          <ContainersContent />
        </TabsContent>

        <TabsContent value="import" className="mt-0">
          <CrawlContent />
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <PagePreview
            path={previewPostSlug ? `/${previewPostSlug}` : "/"}
            label="Preview do Post"
            selector={previewPostSlug}
            selectorLabel="Post"
            selectorItems={displayPosts.map(p => ({ value: p.slug, label: p.title }))}
            onSelectorChange={setPreviewPostSlug}
          />
        </TabsContent>

        <TabsContent value="citation" className="mt-0">
          <CitationSettingsTab settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CategoriesTab({ settings, categories, bannerQuery }: { settings: Record<string, string>; categories: Category[]; bannerQuery: ReturnType<typeof useQuery<Banner[]>> }) {
  const [subTab, setSubTab] = useState("manage");
  const [previewCategorySlug, setPreviewCategorySlug] = useState<string>("");

  useEffect(() => {
    if (!previewCategorySlug && categories.length > 0) {
      setPreviewCategorySlug(categories[0].slug);
    }
  }, [categories, previewCategorySlug]);

  return (
    <Tabs value={subTab} onValueChange={setSubTab}>
      <div className="sticky top-[var(--admin-subheader-top)] z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 -mx-4 px-4 py-3">
        <TabsList data-testid="tabs-categories-sub">
          <TabsTrigger value="manage" data-testid="tab-categories-manage">Gerenciar</TabsTrigger>
          <TabsTrigger value="banners" data-testid="tab-categories-banners">Banners</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-categories-settings">Configurações da Página</TabsTrigger>
          <TabsTrigger value="preview" data-testid="tab-categories-preview">
            <Eye className="h-3.5 w-3.5 mr-1" />
            Preview
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="manage" className="mt-0">
        <CategoriesManagerContent />
      </TabsContent>

      <TabsContent value="banners" className="mt-0">
        <FilteredBannersTab 
          banners={bannerQuery.data || []} 
          isLoading={bannerQuery.isLoading} 
          slots={["category_academy_form"]}
          defaultSlot="category_academy_form"
        />
      </TabsContent>

      <TabsContent value="settings" className="mt-0">
        <CategoryPageTab settings={settings} categories={categories} />
      </TabsContent>

      <TabsContent value="preview" className="mt-0">
        <PagePreview
          path={previewCategorySlug ? `/categoria/${previewCategorySlug}` : "/"}
          label="Preview da Página de Categorias"
          selector={previewCategorySlug}
          selectorLabel="Categoria"
          selectorItems={categories.map(c => ({ value: c.slug, label: c.name }))}
          onSelectorChange={setPreviewCategorySlug}
        />
      </TabsContent>
    </Tabs>
  );
}

function TagsTab({ settings, categories, allTags, bannerQuery }: { settings: Record<string, string>; categories: Category[]; allTags: TagType[]; bannerQuery: ReturnType<typeof useQuery<Banner[]>> }) {
  const [subTab, setSubTab] = useState("manage");
  const [previewTagSlug, setPreviewTagSlug] = useState<string>("");

  useEffect(() => {
    if (!previewTagSlug && allTags.length > 0) {
      setPreviewTagSlug(allTags[0].slug);
    }
  }, [allTags, previewTagSlug]);

  return (
    <Tabs value={subTab} onValueChange={setSubTab}>
      <div className="sticky top-[var(--admin-subheader-top)] z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 -mx-4 px-4 py-3">
        <TabsList data-testid="tabs-tags-sub">
          <TabsTrigger value="manage" data-testid="tab-tags-manage">Gerenciar</TabsTrigger>
          <TabsTrigger value="banners" data-testid="tab-tags-banners">Banners</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-tags-settings">Configurações da Página</TabsTrigger>
          <TabsTrigger value="preview" data-testid="tab-tags-preview">
            <Eye className="h-3.5 w-3.5 mr-1" />
            Preview
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="manage" className="mt-0">
        <TagsManagerContent />
      </TabsContent>

      <TabsContent value="banners" className="mt-0">
        <FilteredBannersTab 
          banners={bannerQuery.data || []} 
          isLoading={bannerQuery.isLoading} 
          slots={["tag_academy_form"]}
          defaultSlot="tag_academy_form"
        />
      </TabsContent>

      <TabsContent value="settings" className="mt-0">
        <TagPageTab settings={settings} categories={categories} />
      </TabsContent>

      <TabsContent value="preview" className="mt-0">
        <PagePreview
          path={previewTagSlug ? `/tag/${previewTagSlug}` : "/"}
          label="Preview da Página de Tags"
          selector={previewTagSlug}
          selectorLabel="Tag"
          selectorItems={allTags.map(t => ({ value: t.slug, label: t.name }))}
          onSelectorChange={setPreviewTagSlug}
        />
      </TabsContent>
    </Tabs>
  );
}

function DatabaseTab() {
  const [subTab, setSubTab] = useState("media");

  return (
    <Tabs value={subTab} onValueChange={setSubTab}>
      <div className="sticky top-[var(--admin-subheader-top)] z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 -mx-4 px-4 py-3">
        <TabsList data-testid="tabs-database-sub">
          <TabsTrigger value="media" data-testid="tab-db-media">Imagens</TabsTrigger>
          <TabsTrigger value="subscribers" data-testid="tab-db-subscribers">Inscritos</TabsTrigger>
          <TabsTrigger value="authors" data-testid="tab-db-authors">Autores</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="media" className="mt-0">
        <MediaContent />
      </TabsContent>

      <TabsContent value="subscribers" className="mt-0">
        <SubscribersContent />
      </TabsContent>

      <TabsContent value="authors" className="mt-0">
        <AuthorsManagerContent />
      </TabsContent>
    </Tabs>
  );
}

const VALID_TABS: AdminTab[] = ["home", "posts", "categories", "tags", "database"];

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const searchString = useSearch();

  const getTabFromSearch = (search: string): AdminTab => {
    const p = new URLSearchParams(search);
    const tab = p.get("tab");
    return tab && VALID_TABS.includes(tab as AdminTab) ? (tab as AdminTab) : "home";
  };

  const [activeTab, setActiveTab] = useState<AdminTab>(() => getTabFromSearch(searchString));

  useEffect(() => {
    const resolved = getTabFromSearch(searchString);
    if (resolved !== activeTab) {
      setActiveTab(resolved);
    }
  }, [searchString]);

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
    enabled: !!user,
  });

  const { data: bannersList, isLoading: bannersLoading } = useQuery<Banner[]>({
    queryKey: ["/api/admin/banners"],
    enabled: !!user,
  });

  const { data: materialsList, isLoading: materialsLoading } = useQuery<FreeMaterial[]>({
    queryKey: ["/api/admin/materials"],
    enabled: !!user,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: !!user,
  });

  const { data: allTags } = useQuery<TagType[]>({
    queryKey: ["/api/tags"],
    enabled: !!user,
  });

  const bannerQuery = useQuery<Banner[]>({
    queryKey: ["/api/admin/banners"],
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
        <p className="text-muted-foreground mb-6">
          Faça login para acessar o painel administrativo.
        </p>
        <a href="/api/login">
          <Button data-testid="button-login">Fazer Login</Button>
        </a>
      </div>
    );
  }

  return (
    <AdminLayout activeTab={activeTab}>
      {activeTab === "home" && (
        <HomePageTab
          settings={settings || {}}
          categories={categories || []}
          banners={bannersList || []}
          bannersLoading={bannersLoading}
          materials={materialsList || []}
          materialsLoading={materialsLoading}
        />
      )}

      {activeTab === "posts" && (
        <PostsTab user={user} bannerQuery={bannerQuery} settings={settings || {}} />
      )}

      {activeTab === "categories" && (
        <CategoriesTab settings={settings || {}} categories={categories || []} bannerQuery={bannerQuery} />
      )}

      {activeTab === "tags" && (
        <TagsTab settings={settings || {}} categories={categories || []} allTags={allTags || []} bannerQuery={bannerQuery} />
      )}

      {activeTab === "database" && (
        <DatabaseTab />
      )}
    </AdminLayout>
  );
}
