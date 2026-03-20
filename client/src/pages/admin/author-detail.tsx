import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, ExternalLink, BarChart3, Edit, Trash2, UserCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Author, PostWithRelations } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function statusLabel(status: string) {
  switch (status) {
    case "published": return "Publicado";
    case "draft": return "Rascunho";
    case "scheduled": return "Agendado";
    default: return status;
  }
}

function statusColor(status: string) {
  switch (status) {
    case "published": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "draft": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "scheduled": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    default: return "";
  }
}

export default function AuthorDetail() {
  const { id } = useParams<{ id: string }>();
  const authorId = parseInt(id || "0");
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: authors, isLoading: authorsLoading } = useQuery<Author[]>({
    queryKey: ["/api/authors"],
  });

  const author = authors?.find(a => a.id === authorId);

  const { data: authorPosts, isLoading: postsLoading } = useQuery<PostWithRelations[]>({
    queryKey: ["/api/admin/authors", authorId, "posts"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/authors/${authorId}/posts`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar posts do autor");
      return res.json();
    },
    enabled: !!authorId && !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: number) => apiRequest("DELETE", `/api/admin/posts/${postId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/authors", authorId, "posts"] });
      toast({ title: "Post excluído com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir post", description: error.message, variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
        <a href="/api/login"><Button>Fazer Login</Button></a>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" data-testid="page-author-detail">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin?tab=autores">
          <Button variant="ghost" size="icon" data-testid="button-back-authors">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="font-serif text-2xl font-bold" data-testid="text-author-detail-title">
          Detalhe do Autor
        </h1>
      </div>

      {authorsLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !author ? (
        <div className="text-center text-muted-foreground py-16">
          <p>Autor não encontrado.</p>
        </div>
      ) : (
        <>
          <Card className="p-6 mb-6" data-testid="card-author-header">
            <div className="flex items-start gap-4">
              {author.photo ? (
                <img src={author.photo} alt={author.name} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                  <UserCircle className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold" data-testid="text-author-header-name">{author.name}</h2>
                {author.bio && (
                  <p className="text-muted-foreground mt-1" data-testid="text-author-header-bio">{author.bio}</p>
                )}
                <p className="text-sm text-muted-foreground mt-2" data-testid="text-author-post-count">
                  {authorPosts ? `${authorPosts.length} post(s)` : "Carregando..."}
                </p>
              </div>
            </div>
          </Card>

          {postsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !authorPosts || authorPosts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum post encontrado para este autor.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-author-posts">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Título</th>
                    <th className="text-left p-3 font-medium">Categorias</th>
                    <th className="text-left p-3 font-medium">Tags</th>
                    <th className="text-left p-3 font-medium">Data</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {authorPosts.map(post => (
                    <tr key={post.id} className="border-b hover:bg-muted/30" data-testid={`row-author-post-${post.id}`}>
                      <td className="p-3 max-w-xs">
                        <span className="line-clamp-1 font-medium" data-testid={`text-post-title-${post.id}`}>{post.title}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {post.categories.length > 0
                            ? post.categories.map(c => (
                                <Badge key={c.id} variant="outline" className="text-xs" data-testid={`badge-category-${c.id}`}>{c.name}</Badge>
                              ))
                            : <span className="text-muted-foreground">—</span>
                          }
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {post.tags.length > 0
                            ? post.tags.slice(0, 3).map(t => (
                                <Badge key={t.id} variant="secondary" className="text-xs" data-testid={`badge-tag-${t.id}`}>{t.name}</Badge>
                              ))
                            : <span className="text-muted-foreground">—</span>
                          }
                          {post.tags.length > 3 && <Badge variant="secondary" className="text-xs">+{post.tags.length - 3}</Badge>}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {post.publishedAt
                          ? format(new Date(post.publishedAt), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="p-3">
                        <Badge className={statusColor(post.status)} data-testid={`badge-status-${post.id}`}>
                          {statusLabel(post.status)}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          {post.status === "published" ? (
                            <a href={`/${post.slug}`} target="_blank" rel="noopener noreferrer">
                              <Button size="icon" variant="ghost" title="Ir para o post" data-testid={`button-view-post-${post.id}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          ) : (
                            <Button size="icon" variant="ghost" title="Post não publicado" disabled data-testid={`button-view-post-${post.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Link href={`/admin/metricas?postId=${post.id}`}>
                            <Button size="icon" variant="ghost" title="Métricas" data-testid={`button-metrics-post-${post.id}`}>
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/admin/post/${post.id}`}>
                            <Button size="icon" variant="ghost" title="Editar" data-testid={`button-edit-post-${post.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-destructive" title="Excluir" data-testid={`button-delete-post-${post.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir post?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir "{post.title}"? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(post.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  data-testid={`button-confirm-delete-post-${post.id}`}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
