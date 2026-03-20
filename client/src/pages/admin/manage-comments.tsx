import { useState, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  ArrowLeft,
  Search,
  Check,
  Ban,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  MessageSquare,
  Reply,
  X,
  Settings,
  Save,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin/admin-layout";
import { PostsSubNav } from "@/components/admin/posts-sub-nav";

const DEFAULT_REPLY_TEMPLATE = `Olá! Agradecemos pelo seu comentário e pela sua participação no nosso blog. Confira abaixo a nossa resposta:

[Escreva sua resposta aqui]

Esperamos ter ajudado! Caso tenha outras dúvidas, fique à vontade para comentar novamente.

Atenciosamente,
Equipe Psicometria Online`;

interface CommentWithPost {
  id: number;
  postId: number;
  authorName: string;
  authorEmail: string;
  content: string;
  isApproved: boolean;
  isSpam: boolean;
  parentId: number | null;
  sourceUrl: string | null;
  createdAt: string;
  postTitle?: string;
  postSlug?: string;
}

interface CommentsResponse {
  data: CommentWithPost[];
  total: number;
  counts: { all: number; pending: number; approved: number; spam: number };
}

type StatusFilter = "all" | "pending" | "approved" | "spam";

export default function ManageComments() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [templateDraft, setTemplateDraft] = useState("");
  const limit = 30;
  const { toast } = useToast();

  const { data, isLoading } = useQuery<CommentsResponse>({
    queryKey: ["/api/admin/comments", status, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        status,
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/comments?${params}`);
      if (!res.ok) throw new Error("Erro ao carregar comentários");
      return res.json();
    },
  });

  const comments = data?.data || [];
  const total = data?.total || 0;
  const counts = data?.counts || { all: 0, pending: 0, approved: 0, spam: 0 };
  const totalPages = Math.ceil(total / limit);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/comments"] });
    setSelected([]);
  };

  const approveMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/admin/comments/${id}/approve`),
    onSuccess: invalidate,
  });

  const spamMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/admin/comments/${id}/spam`),
    onSuccess: invalidate,
  });

  const unspamMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/admin/comments/${id}/unspam`),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/comments/${id}`),
    onSuccess: invalidate,
  });

  const bulkMutation = useMutation({
    mutationFn: ({ action, ids }: { action: string; ids: number[] }) =>
      apiRequest("POST", "/api/admin/comments/bulk", { action, ids }),
    onSuccess: () => {
      invalidate();
      setBulkAction("");
      toast({ title: "Ação em massa aplicada com sucesso" });
    },
  });

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const replyTemplate = settings?.comment_reply_template || DEFAULT_REPLY_TEMPLATE;

  const replyMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: number; content: string }) => {
      const res = await apiRequest("POST", `/api/admin/comments/${commentId}/reply`, { content });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setReplyingTo(null);
      setReplyContent("");
      toast({ title: "Resposta enviada com sucesso" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao enviar resposta", description: err.message, variant: "destructive" });
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (template: string) => {
      await apiRequest("PUT", "/api/admin/settings", { comment_reply_template: template });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      setShowSettings(false);
      toast({ title: "Template salvo com sucesso" });
    },
  });

  const openReply = (commentId: number) => {
    setReplyingTo(commentId);
    setReplyContent(replyTemplate);
  };

  const importMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/crawl/import-comments"),
    onSuccess: async (res) => {
      const result = await res.json();
      invalidate();
      toast({
        title: "Importação concluída",
        description: `${result.imported} importados, ${result.skipped} ignorados de ${result.totalFetched} total`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    },
  });

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === comments.length) {
      setSelected([]);
    } else {
      setSelected(comments.map((c) => c.id));
    }
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleBulkApply = () => {
    if (!bulkAction || selected.length === 0) return;
    bulkMutation.mutate({ action: bulkAction, ids: selected });
  };

  const statusTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: counts.all },
    { key: "pending", label: "Pendentes", count: counts.pending },
    { key: "approved", label: "Aprovados", count: counts.approved },
    { key: "spam", label: "Spam", count: counts.spam },
  ];

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AdminLayout activeTab="posts">
    <div className="max-w-7xl mx-auto py-8">
      <PostsSubNav activePage="comentarios" />
      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="font-serif text-2xl font-bold" data-testid="text-comments-title">
            Gerenciar Comentários
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" data-testid="button-import-comments" disabled={importMutation.isPending}>
                  {importMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Importar do WordPress
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Importar Comentários do WordPress</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso irá buscar todos os comentários do WordPress via API REST e importá-los como aprovados.
                    Comentários já importados (com sourceUrl duplicado) serão ignorados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => importMutation.mutate()} data-testid="button-confirm-import">
                    Importar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="outline"
              onClick={() => {
                setShowSettings(!showSettings);
                setTemplateDraft(replyTemplate);
              }}
              data-testid="button-reply-settings"
            >
              <Settings className="h-4 w-4 mr-1" />
              Template de Resposta
            </Button>
        </div>

        {showSettings && (
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Template de Resposta Padrão</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSettings(false)} data-testid="button-close-settings">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Este texto será usado como base ao responder comentários. Você pode editá-lo antes de cada envio.
            </p>
            <Textarea
              value={templateDraft}
              onChange={(e) => setTemplateDraft(e.target.value)}
              rows={8}
              data-testid="textarea-reply-template"
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => saveTemplateMutation.mutate(templateDraft)}
                disabled={saveTemplateMutation.isPending}
                data-testid="button-save-template"
              >
                <Save className="h-4 w-4 mr-1" />
                {saveTemplateMutation.isPending ? "Salvando..." : "Salvar Template"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTemplateDraft(DEFAULT_REPLY_TEMPLATE);
                }}
                data-testid="button-reset-template"
              >
                Restaurar Padrão
              </Button>
            </div>
          </Card>
        )}

        <div className="flex items-center gap-1 flex-wrap" data-testid="tabs-status">
        {statusTabs.map((tab) => (
          <Button
            key={tab.key}
            variant={status === tab.key ? "default" : "ghost"}
            size="sm"
            onClick={() => { setStatus(tab.key); setPage(1); setSelected([]); }}
            data-testid={`tab-${tab.key}`}
          >
            {tab.label}
            <Badge variant="secondary" className="ml-1.5 text-xs">
              {tab.count}
            </Badge>
          </Button>
        ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Input
            placeholder="Buscar por autor, email ou conteúdo..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            data-testid="input-search-comments"
          />
          <Button variant="outline" size="icon" onClick={handleSearch} data-testid="button-search-comments">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {selected.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selected.length} selecionados</span>
            <Select value={bulkAction} onValueChange={setBulkAction}>
              <SelectTrigger className="w-40" data-testid="select-bulk-action">
                <SelectValue placeholder="Ação em massa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approve">Aprovar</SelectItem>
                <SelectItem value="spam">Marcar como Spam</SelectItem>
                <SelectItem value="delete">Excluir</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleBulkApply} disabled={!bulkAction || bulkMutation.isPending} data-testid="button-apply-bulk">
              Aplicar
            </Button>
          </div>
        )}
      </div>

      <Card>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground" data-testid="text-no-comments">
            Nenhum comentário encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left w-8">
                    <Checkbox
                      checked={selected.length === comments.length && comments.length > 0}
                      onCheckedChange={toggleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </th>
                  <th className="p-3 text-left font-medium">Autor</th>
                  <th className="p-3 text-left font-medium">Comentário</th>
                  <th className="p-3 text-left font-medium">Em Resposta a</th>
                  <th className="p-3 text-left font-medium">Enviado em</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((comment) => (
                  <Fragment key={comment.id}>
                  <tr className="border-b hover:bg-muted/30" data-testid={`row-comment-${comment.id}`}>
                    <td className="p-3">
                      <Checkbox
                        checked={selected.includes(comment.id)}
                        onCheckedChange={() => toggleSelect(comment.id)}
                        data-testid={`checkbox-comment-${comment.id}`}
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-medium" data-testid={`text-author-${comment.id}`}>{comment.authorName}</div>
                      <div className="text-xs text-muted-foreground">{comment.authorEmail}</div>
                    </td>
                    <td className="p-3 max-w-xs">
                      <p className="line-clamp-2 text-sm" data-testid={`text-content-${comment.id}`}>
                        {comment.content}
                      </p>
                    </td>
                    <td className="p-3">
                      {comment.postTitle ? (
                        <Link href={`/${comment.postSlug}`}>
                          <span className="text-primary hover:underline cursor-pointer text-sm" data-testid={`link-post-${comment.id}`}>
                            {comment.postTitle.length > 40
                              ? comment.postTitle.substring(0, 40) + "..."
                              : comment.postTitle}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-sm">Post #{comment.postId}</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(comment.createdAt)}
                    </td>
                    <td className="p-3">
                      {comment.isSpam ? (
                        <Badge variant="destructive" className="text-xs">Spam</Badge>
                      ) : comment.isApproved ? (
                        <Badge className="text-xs bg-green-600">Aprovado</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Pendente</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {!comment.parentId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary"
                            onClick={() => openReply(comment.id)}
                            title="Responder"
                            data-testid={`button-reply-${comment.id}`}
                          >
                            <Reply className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {!comment.isApproved && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600"
                            onClick={() => approveMutation.mutate(comment.id)}
                            title="Aprovar"
                            data-testid={`button-approve-${comment.id}`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {!comment.isSpam ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-orange-500"
                            onClick={() => spamMutation.mutate(comment.id)}
                            title="Marcar como Spam"
                            data-testid={`button-spam-${comment.id}`}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-500"
                            onClick={() => unspamMutation.mutate(comment.id)}
                            title="Remover Spam"
                            data-testid={`button-unspam-${comment.id}`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              title="Excluir"
                              data-testid={`button-delete-${comment.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Comentário</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(comment.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                  {replyingTo === comment.id && (
                    <tr data-testid={`row-reply-form-${comment.id}`}>
                      <td colSpan={7} className="p-3 bg-muted/20">
                        <div className="max-w-2xl space-y-3">
                          <div className="flex items-center gap-2">
                            <Reply className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Responder a {comment.authorName}</span>
                          </div>
                          <Textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            rows={6}
                            placeholder="Escreva sua resposta..."
                            data-testid={`textarea-reply-${comment.id}`}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => replyMutation.mutate({ commentId: comment.id, content: replyContent })}
                              disabled={replyMutation.isPending || !replyContent.trim()}
                              data-testid={`button-send-reply-${comment.id}`}
                            >
                              {replyMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Reply className="h-4 w-4 mr-1" />
                              )}
                              {replyMutation.isPending ? "Enviando..." : "Enviar Resposta"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setReplyingTo(null); setReplyContent(""); }}
                              data-testid={`button-cancel-reply-${comment.id}`}
                            >
                              Cancelar
                            </Button>
                            <span className="text-xs text-muted-foreground ml-2">
                              {comment.authorEmail
                                ? `Notificação será enviada para ${comment.authorEmail}`
                                : "Sem e-mail do autor — notificação não será enviada"}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            data-testid="button-next-page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}
