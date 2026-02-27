import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Search, Download, Trash2, ImageIcon, HardDrive, AlertTriangle, ChevronLeft, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import type { MediaItem } from "@shared/schema";

const SOURCE_LABELS: Record<string, string> = {
  upload: "Upload",
  wordpress: "WordPress",
  "post-content": "Conteúdo",
};

const SOURCE_COLORS: Record<string, string> = {
  upload: "bg-green-100 text-green-800",
  wordpress: "bg-blue-100 text-blue-800",
  "post-content": "bg-purple-100 text-purple-800",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function ManageMediaPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleteUsages, setDeleteUsages] = useState<{ postId: number; title: string; slug: string; usage: string }[]>([]);
  const limit = 30;

  const { data: mediaData, isLoading: mediaLoading } = useQuery<{ items: MediaItem[]; total: number }>({
    queryKey: ["/api/admin/media", search, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`/api/admin/media?${params}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery<{ total: number; totalSize: number; bySource: { source: string; count: number }[] }>({
    queryKey: ["/api/admin/media/stats"],
    enabled: !!user,
  });

  const { data: duplicates } = useQuery<{ filename: string; items: MediaItem[] }[]>({
    queryKey: ["/api/admin/media/duplicates"],
    enabled: !!user,
  });

  const { data: usageData } = useQuery<{ postId: number; title: string; slug: string; usage: string }[]>({
    queryKey: ["/api/admin/media", selectedMedia?.id, "usage"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/media/${selectedMedia!.id}/usage`, { credentials: "include" });
      return res.json();
    },
    enabled: !!selectedMedia,
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/media/import-from-posts", { method: "POST", credentials: "include" });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Importação concluída`, description: `${data.imported} novas imagens importadas (${data.alreadyExisted} já existiam)` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
    },
    onError: () => toast({ title: "Erro na importação", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/media/${id}?force=true`, { method: "DELETE", credentials: "include" });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Imagem removida" });
      setDeleteTarget(null);
      setDeleteUsages([]);
      setSelectedMedia(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
    },
    onError: () => toast({ title: "Erro ao remover", variant: "destructive" }),
  });

  const handleDeleteClick = async (media: MediaItem) => {
    const res = await fetch(`/api/admin/media/${media.id}`, { method: "DELETE", credentials: "include" });
    const data = await res.json();
    if (data.requiresConfirmation) {
      setDeleteTarget(media);
      setDeleteUsages(data.usages);
    } else {
      toast({ title: "Imagem removida" });
      setSelectedMedia(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
    }
  };

  if (authLoading) return <div className="max-w-6xl mx-auto px-4 py-8"><Skeleton className="h-8 w-48" /></div>;
  if (!user) return <div className="max-w-6xl mx-auto px-4 py-8 text-center">Faça login para acessar o admin.</div>;

  const totalPages = mediaData ? Math.ceil(mediaData.total / limit) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm" data-testid="button-back-admin">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Gerenciar Imagens</h1>
        </div>
        <Button
          onClick={() => importMutation.mutate()}
          disabled={importMutation.isPending}
          variant="outline"
          data-testid="button-import-media"
        >
          <Download className="h-4 w-4 mr-2" />
          {importMutation.isPending ? "Importando..." : "Importar do Blog"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-3" data-testid="card-stat-total">
          <ImageIcon className="h-8 w-8 text-primary" />
          <div>
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
            <p className="text-xs text-muted-foreground">Total de Imagens</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3" data-testid="card-stat-storage">
          <HardDrive className="h-8 w-8 text-primary" />
          <div>
            <p className="text-2xl font-bold">{formatBytes(stats?.totalSize || 0)}</p>
            <p className="text-xs text-muted-foreground">Espaço Estimado</p>
          </div>
        </Card>
        {stats?.bySource.map(s => (
          <Card key={s.source} className="p-4 flex items-center gap-3" data-testid={`card-stat-${s.source}`}>
            <div className={`rounded-full p-2 ${SOURCE_COLORS[s.source] || "bg-gray-100"}`}>
              <ImageIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs text-muted-foreground">{SOURCE_LABELS[s.source] || s.source}</p>
            </div>
          </Card>
        ))}
        {duplicates && duplicates.length > 0 && (
          <Card className="p-4 flex items-center gap-3 border-amber-300 bg-amber-50 dark:bg-amber-950" data-testid="card-stat-duplicates">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-2xl font-bold">{duplicates.length}</p>
              <p className="text-xs text-muted-foreground">Duplicatas Encontradas</p>
            </div>
          </Card>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar imagens por nome, título ou alt..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
            data-testid="input-search-media"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {mediaLoading ? (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {Array.from({ length: 15 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded" />)}
            </div>
          ) : mediaData?.items.length === 0 ? (
            <Card className="p-12 text-center">
              <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground">Nenhuma imagem encontrada.</p>
              <p className="text-sm text-muted-foreground mt-1">Clique em "Importar do Blog" para carregar as imagens dos posts.</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {mediaData?.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedMedia(item)}
                    className={`group relative aspect-square rounded border-2 overflow-hidden transition-all ${
                      selectedMedia?.id === item.id
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                    data-testid={`media-grid-item-${item.id}`}
                  >
                    <img
                      src={item.url}
                      alt={item.altText || item.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999' font-size='10'%3EImagem%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.filename}
                    </div>
                    <Badge className={`absolute top-1 right-1 text-[8px] px-1 py-0 ${SOURCE_COLORS[item.source] || ""}`}>
                      {SOURCE_LABELS[item.source]?.[0] || item.source[0]}
                    </Badge>
                  </button>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">
                    {mediaData?.total} imagens • Página {page} de {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} data-testid="button-media-prev">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} data-testid="button-media-next">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div>
          {selectedMedia ? (
            <Card className="p-4 sticky top-4" data-testid="card-media-detail">
              <img
                src={selectedMedia.url}
                alt={selectedMedia.altText || selectedMedia.filename}
                className="w-full h-auto rounded mb-3 max-h-60 object-contain bg-muted"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f0f0f0' width='200' height='200'/%3E%3Ctext x='100' y='100' text-anchor='middle' dy='.3em' fill='%23999' font-size='14'%3EImagem indispon%C3%ADvel%3C/text%3E%3C/svg%3E";
                }}
              />
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Nome do arquivo</p>
                  <p className="text-sm font-medium break-all" data-testid="text-media-filename">{selectedMedia.filename}</p>
                </div>
                {selectedMedia.altText && (
                  <div>
                    <p className="text-xs text-muted-foreground">Texto alternativo</p>
                    <p className="text-sm">{selectedMedia.altText}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Fonte</p>
                  <Badge className={SOURCE_COLORS[selectedMedia.source] || ""}>{SOURCE_LABELS[selectedMedia.source] || selectedMedia.source}</Badge>
                </div>
                {selectedMedia.fileSize && (
                  <div>
                    <p className="text-xs text-muted-foreground">Tamanho</p>
                    <p className="text-sm">{formatBytes(selectedMedia.fileSize)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">URL</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xs break-all flex-1 text-muted-foreground">{selectedMedia.url}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0"
                      onClick={() => { navigator.clipboard.writeText(selectedMedia.url); toast({ title: "URL copiada" }); }}
                      data-testid="button-copy-url"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Aparece em</p>
                  {usageData === undefined ? (
                    <Skeleton className="h-4 w-full" />
                  ) : usageData.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nenhum post usa esta imagem.</p>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {usageData.map((u) => (
                        <div key={u.postId} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate flex-1">{u.title}</span>
                          <Badge variant="outline" className="text-[9px] shrink-0">{u.usage}</Badge>
                          <Link href={`/admin/post/${u.postId}`}>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDeleteClick(selectedMedia)}
                    data-testid="button-delete-media"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Selecione uma imagem para ver detalhes</p>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeleteUsages([]); } }}>
        <DialogContent data-testid="dialog-delete-confirm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Atenção: Imagem em uso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              A imagem <strong>{deleteTarget?.filename}</strong> aparece nos seguintes posts:
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {deleteUsages.map((u) => (
                <div key={u.postId} className="flex items-center justify-between gap-2 p-2 bg-muted rounded text-sm">
                  <span className="truncate">{u.title}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{u.usage}</Badge>
                </div>
              ))}
            </div>
            <p className="text-sm text-amber-600">
              Ao excluir esta imagem do banco de dados, ela continuará referenciada nesses posts, mas poderá não carregar corretamente se for um arquivo local.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteUsages([]); }} data-testid="button-cancel-delete">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir mesmo assim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
