import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, FolderOpen, Tag, Download, Edit, Trash2, Settings, Users, BarChart3, Layers, ImageIcon, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { PostWithRelations, Category, Tag as TagType } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const POSTS_PER_PAGE = 20;

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const offset = page * POSTS_PER_PAGE;
  const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : "";

  const { data: postsData, isLoading: postsLoading } = useQuery<{ posts: PostWithRelations[]; total: number }>({
    queryKey: ["/api/admin/posts", { search: searchTerm, limit: POSTS_PER_PAGE, offset }],
    queryFn: async () => {
      const res = await fetch(`/api/admin/posts?limit=${POSTS_PER_PAGE}&offset=${offset}${searchParam}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar posts");
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

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
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
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
        <p className="text-muted-foreground mb-6">
          Faca login para acessar o painel administrativo.
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
      toast({ title: "Post excluido com sucesso" });
    } catch (error: any) {
      toast({ title: "Erro ao excluir post", description: error.message, variant: "destructive" });
    }
  };

  const totalPages = postsData ? Math.ceil(postsData.total / POSTS_PER_PAGE) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
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
          <Link href="/admin/home">
            <Button variant="outline" data-testid="button-home-settings">
              <Settings className="h-4 w-4 mr-1" />
              Config. Home
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
            <Skeleton key={i} className="h-16 w-full" />
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
          <div className="space-y-2">
            {postsData?.posts.map((post) => (
              <Card key={post.id} className="p-4" data-testid={`admin-post-${post.id}`}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-medium truncate">{post.title}</h3>
                      <Badge
                        variant={post.status === "published" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {post.status === "published" ? "Publicado" : "Rascunho"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {post.publishedAt
                        ? format(new Date(post.publishedAt), "dd/MM/yyyy", { locale: ptBR })
                        : "Sem data"}
                      {post.categories.length > 0 && ` | ${post.categories.map(c => c.name).join(", ")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/admin/post/${post.id}`}>
                      <Button size="icon" variant="ghost" data-testid={`button-edit-post-${post.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeletePost(post.id)}
                      data-testid={`button-delete-post-${post.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
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
