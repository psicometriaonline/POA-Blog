import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, FileText, FolderOpen, Tag, Download, Edit, Trash2, Settings, Users, BarChart3, Layers, ImageIcon, Search, ChevronLeft, ChevronRight, ExternalLink, ArrowUp, ArrowDown, ArrowUpDown, Loader2, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { PostWithRelations, Category, Tag as TagType } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const label = type === "inbound" ? "Links recebidos" : "Links enviados";

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
        <p className="text-sm font-semibold mb-2">{label} ({count})</p>
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

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

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

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: !!user,
  });

  const { data: allTags } = useQuery<TagType[]>({
    queryKey: ["/api/tags"],
    enabled: !!user,
  });

  const displayPosts = postsData?.posts || [];

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder(field === "publishedAt" ? "desc" : "asc");
    }
    setPage(0);
  };

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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <h1 className="font-serif text-3xl font-bold" data-testid="text-admin-title">
          Painel Administrativo
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/post/novo">
            <Button data-testid="button-new-post">
              <Plus className="h-4 w-4 mr-1" />
              Novo Post
            </Button>
          </Link>
          <Link href="/admin/crawl">
            <Button variant="outline" data-testid="button-crawl">
              <Download className="h-4 w-4 mr-1" />
              Importar Posts
            </Button>
          </Link>
          <Link href="/admin/metricas">
            <Button variant="outline" data-testid="button-analytics">
              <BarChart3 className="h-4 w-4 mr-1" />
              Métricas
            </Button>
          </Link>
          <Link href="/admin/comentarios">
            <Button variant="outline" data-testid="button-comments">
              <MessageSquare className="h-4 w-4 mr-1" />
              Comentários
            </Button>
          </Link>
          <Link href="/admin/home">
            <Button variant="outline" data-testid="button-home-settings">
              <Settings className="h-4 w-4 mr-1" />
              Config. Geral
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-post-count">{postsData?.total || 0}</p>
              <p className="text-sm text-muted-foreground">Posts</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-category-count">{categories?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Categorias</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-tag-count">{allTags?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Tags</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <h2 className="text-xl font-semibold" data-testid="text-posts-section-title">Gerenciar Posts</h2>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/categorias">
            <Button variant="outline" size="sm" data-testid="link-manage-categories">
              Gerenciar Categorias
            </Button>
          </Link>
          <Link href="/admin/tags">
            <Button variant="outline" size="sm" data-testid="link-manage-tags">
              Gerenciar Tags
            </Button>
          </Link>
          <Link href="/admin/autores">
            <Button variant="outline" size="sm" data-testid="link-manage-authors">
              <Users className="h-3 w-3 mr-1" />
              Gerenciar Autores
            </Button>
          </Link>
          <Link href="/admin/conteineres">
            <Button variant="outline" size="sm" data-testid="link-manage-containers">
              <Layers className="h-3 w-3 mr-1" />
              Contêineres
            </Button>
          </Link>
          <Link href="/admin/midias">
            <Button variant="outline" size="sm" data-testid="link-manage-media">
              <ImageIcon className="h-3 w-3 mr-1" />
              Gerenciar Imagens
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar posts por título..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
          data-testid="input-search-posts"
        />
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
                        {post.authorName || post.author?.name ? (
                          <Link href="/admin/autores">
                            <span className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer">
                              {post.authorName || post.author?.name}
                            </span>
                          </Link>
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
    </div>
  );
}
