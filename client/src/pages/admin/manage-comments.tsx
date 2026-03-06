import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="font-serif text-2xl font-bold" data-testid="text-comments-title">
            Gerenciar Comentários
          </h1>
        </div>
        <div className="ml-auto">
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
        </div>
      </div>

      <div className="flex items-center gap-1 mb-4 flex-wrap" data-testid="tabs-status">
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
                  <tr key={comment.id} className="border-b hover:bg-muted/30" data-testid={`row-comment-${comment.id}`}>
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
  );
}
