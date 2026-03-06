import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Download, Trash2, ImageIcon, HardDrive, AlertTriangle, ChevronLeft, ChevronRight, ExternalLink, RefreshCw, Layers, X, CheckCircle2, Pencil, Check, CloudDownload, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import type { MediaItem } from "@shared/schema";

const SOURCE_LABELS: Record<string, { label: string; sub: string }> = {
  upload: { label: "Uploads manuais", sub: "Imagens enviadas via painel" },
  wordpress: { label: "Imagens destacadas", sub: "Importadas do WordPress" },
  "post-content": { label: "Imagens de conteúdo", sub: "Encontradas nos posts" },
};

const SOURCE_COLORS: Record<string, string> = {
  upload: "bg-green-100 text-green-800",
  wordpress: "bg-blue-100 text-blue-800",
  "post-content": "bg-purple-100 text-purple-800",
};

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return "—";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateLong(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

function getMimeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
  };
  return map[ext || ""] || "image/jpeg";
}

export default function ManageMediaPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("date_desc");
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleteUsages, setDeleteUsages] = useState<{ postId: number; title: string; slug: string; usage: string }[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [migrationProgress, setMigrationProgress] = useState<{ running: boolean; processed: number; total: number; errors: number } | null>(null);
  const limit = 30;

  const { data: mediaData, isLoading: mediaLoading } = useQuery<{ items: MediaItem[]; total: number }>({
    queryKey: ["/api/admin/media", search, page, sort],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", String(limit));
      params.set("sort", sort);
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

  const refreshSizesMutation = useMutation({
    mutationFn: async () => {
      let totalUpdated = 0;
      let remaining = 1;
      let retries = 0;
      while (remaining > 0 && retries < 3) {
        const res = await fetch("/api/admin/media/refresh-sizes", { method: "POST", credentials: "include" });
        const data = await res.json();
        totalUpdated += data.updated;
        remaining = data.remaining;
        if (data.updated === 0) {
          retries++;
        } else {
          retries = 0;
        }
      }
      return { updated: totalUpdated, remaining };
    },
    onSuccess: (data) => {
      const desc = data.remaining > 0
        ? `${data.updated} processadas, ${data.remaining} não puderam ser calculadas.`
        : `${data.updated} imagens processadas.`;
      toast({ title: "Tamanhos atualizados", description: desc });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
    },
  });

  const unifyMutation = useMutation({
    mutationFn: async ({ keepId, removeId }: { keepId: number; removeId: number }) => {
      const res = await apiRequest("POST", "/api/admin/media/unify", { keepId, removeId });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Unificação concluída", description: `${data.updatedPosts} posts atualizados.` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media/duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media/stats"] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, filename, autoSuffix }: { id: number; filename: string; autoSuffix?: boolean }) => {
      try {
        const res = await apiRequest("PATCH", `/api/admin/media/${id}`, { filename, autoSuffix });
        return res.json();
      } catch (e: any) {
        const msg = e.message || "";
        if (msg.includes("409")) {
          try {
            const parsed = JSON.parse(msg.replace(/^\d+:\s*/, ""));
            throw new Error(parsed.message);
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== msg) throw parseErr;
          }
        }
        throw e;
      }
    },
    onSuccess: (data, variables) => {
      toast({ title: "Arquivo renomeado" });
      setRenaming(false);
      if (selectedMedia) {
        setSelectedMedia({ ...selectedMedia, filename: data?.filename || variables.filename });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media/duplicates"] });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
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
      toast({ title: "Importação concluída", description: `${data.imported} novas imagens importadas` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media/stats"] });
    },
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media/stats"] });
    },
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media/stats"] });
    }
  };

  const selectedIndex = useMemo(() => {
    if (!selectedMedia || !mediaData) return -1;
    return mediaData.items.findIndex(i => i.id === selectedMedia.id);
  }, [selectedMedia, mediaData]);

  const navigateMedia = (direction: "prev" | "next") => {
    if (!mediaData) return;
    const newIndex = direction === "prev" ? selectedIndex - 1 : selectedIndex + 1;
    if (newIndex >= 0 && newIndex < mediaData.items.length) {
      setRenaming(false);
      setSelectedMedia(mediaData.items[newIndex]);
    }
  };

  if (authLoading) return <div className="max-w-6xl mx-auto px-4 py-8"><Skeleton className="h-8 w-48" /></div>;
  if (!user) return <div className="max-w-6xl mx-auto px-4 py-8 text-center">Faça login para acessar o admin.</div>;

  const totalPages = mediaData ? Math.ceil(mediaData.total / limit) : 0;
  const dupeCount = duplicates?.length || 0;

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
        <div className="flex items-center gap-2">
          <Button
            onClick={async () => {
              setMigrationProgress({ running: true, processed: 0, total: 0, errors: 0 });
              try {
                const res = await fetch("/api/admin/media/migrate-images", { method: "POST", credentials: "include" });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Erro na migração");
                setMigrationProgress({ running: false, processed: data.downloaded, total: data.totalOriginals, errors: data.errors });
                toast({
                  title: "Migração concluída",
                  description: `${data.downloaded} imagens baixadas (de ${data.totalOriginals} originais), ${data.postsUpdated} posts atualizados, ${data.srcsetsStripped} srcsets removidos, ${data.errors} erros`,
                });
                queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
                queryClient.invalidateQueries({ queryKey: ["/api/admin/media/stats"] });
                queryClient.invalidateQueries({ queryKey: ["/api/admin/media/duplicates"] });
              } catch (e: any) {
                setMigrationProgress(prev => prev ? { ...prev, running: false } : null);
                toast({ title: "Erro na migração", description: e.message, variant: "destructive" });
              }
            }}
            disabled={migrationProgress?.running}
            variant="default"
            size="sm"
            data-testid="button-migrate-images"
          >
            <CloudDownload className="h-4 w-4 mr-2" />
            {migrationProgress?.running ? "Migrando..." : "Migrar Imagens do WordPress"}
          </Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
            variant="outline"
            size="sm"
            data-testid="button-import-media"
          >
            <Download className="h-4 w-4 mr-2" />
            {importMutation.isPending ? "Importando..." : "Importar do Blog"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Card className="p-3 flex items-center gap-3" data-testid="card-stat-total">
          <ImageIcon className="h-7 w-7 text-primary shrink-0" />
          <div>
            <p className="text-xl font-bold">{stats?.total || 0}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Total de Imagens</p>
          </div>
        </Card>

        <Card className="p-3 flex items-center gap-3 relative overflow-hidden" data-testid="card-stat-storage">
          <HardDrive className="h-7 w-7 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold">{formatBytes(stats?.totalSize)}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Espaço Estimado</p>
          </div>
          {stats && stats.totalSize === 0 && stats.total > 0 && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1 h-7 w-7"
              onClick={() => refreshSizesMutation.mutate()}
              disabled={refreshSizesMutation.isPending}
              title="Calcular tamanhos"
              data-testid="button-refresh-sizes"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshSizesMutation.isPending ? "animate-spin" : ""}`} />
            </Button>
          )}
        </Card>

        {dupeCount > 0 ? (
          <button
            onClick={() => setShowDuplicates(!showDuplicates)}
            className={`p-3 flex items-center gap-3 border-2 rounded-lg transition-all text-left cursor-pointer ${
              showDuplicates ? "border-amber-500 bg-amber-50" : "border-amber-300 bg-amber-50/50 hover:bg-amber-50"
            }`}
            data-testid="card-stat-duplicates"
          >
            <AlertTriangle className="h-7 w-7 text-amber-600 shrink-0" />
            <div>
              <p className="text-xl font-bold">{dupeCount}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Duplicatas</p>
            </div>
          </button>
        ) : (
          <Card className="p-3 flex items-center gap-3" data-testid="card-stat-duplicates">
            <CheckCircle2 className="h-7 w-7 text-green-500 shrink-0" />
            <div>
              <p className="text-xl font-bold">0</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Duplicatas</p>
            </div>
          </Card>
        )}

        {stats?.bySource.map(s => (
          <Card key={s.source} className="p-3 flex items-center gap-3" data-testid={`card-stat-${s.source}`}>
            <div className={`rounded-full p-1.5 ${SOURCE_COLORS[s.source] || "bg-gray-100"} shrink-0`}>
              <ImageIcon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold">{s.count}</p>
              <p className="text-[10px] font-medium leading-tight truncate">{SOURCE_LABELS[s.source]?.label || s.source}</p>
              <p className="text-[9px] text-muted-foreground leading-tight truncate">{SOURCE_LABELS[s.source]?.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {migrationProgress && (
        <Card className="p-4 mb-6 border-blue-300 bg-blue-50/30" data-testid="card-migration-progress">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className={`h-5 w-5 text-blue-600 ${migrationProgress.running ? "animate-spin" : ""}`} />
            <h3 className="font-semibold text-sm">
              {migrationProgress.running ? "Migrando imagens do WordPress..." : "Migração concluída"}
            </h3>
          </div>
          <div className="space-y-2">
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${migrationProgress.total > 0 ? (migrationProgress.processed / migrationProgress.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {migrationProgress.processed} / {migrationProgress.total} imagens processadas
              {migrationProgress.errors > 0 && ` (${migrationProgress.errors} erros)`}
            </p>
          </div>
        </Card>
      )}

      {showDuplicates && duplicates && duplicates.length > 0 && (
        <Card className="p-6 mb-8 border-amber-300 bg-amber-50/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-600" />
              Gestão de Duplicatas
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setShowDuplicates(false)}>Fechar</Button>
          </div>
          <div className="space-y-4">
            {duplicates.map((group, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded p-4 border flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <p className="text-sm font-bold mb-2 break-all">{group.filename}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map(item => (
                      <div key={item.id} className="border rounded p-2 text-[10px] space-y-1">
                        <img src={item.url} className="w-full h-20 object-cover rounded mb-1 bg-muted" alt="" />
                        <p className="truncate" title={item.url}>{item.url}</p>
                        <Badge className={SOURCE_COLORS[item.source]}>{SOURCE_LABELS[item.source]?.label || item.source}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 justify-center shrink-0 w-full md:w-48">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => unifyMutation.mutate({ keepId: group.items[0].id, removeId: group.items[1].id })}
                    disabled={unifyMutation.isPending}
                    data-testid={`button-unify-keep-first-${idx}`}
                  >
                    Unificar (Manter 1ª)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => unifyMutation.mutate({ keepId: group.items[1].id, removeId: group.items[0].id })}
                    disabled={unifyMutation.isPending}
                    data-testid={`button-unify-keep-second-${idx}`}
                  >
                    Unificar (Manter 2ª)
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => {
                      const fn = group.items[1].filename;
                      const dotIdx = fn.lastIndexOf(".");
                      const newName = dotIdx > 0 ? fn.substring(0, dotIdx) + "-2" + fn.substring(dotIdx) : fn + "-2";
                      renameMutation.mutate({ id: group.items[1].id, filename: newName, autoSuffix: true });
                    }}
                    data-testid={`button-not-duplicate-${idx}`}
                  >
                    Não são duplicatas
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar imagens..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
            data-testid="input-search-media"
          />
        </div>
        <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
          <SelectTrigger className="w-52" data-testid="select-sort-media">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Data (mais recente)</SelectItem>
            <SelectItem value="date_asc">Data (mais antigo)</SelectItem>
            <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
            <SelectItem value="name_desc">Nome (Z-A)</SelectItem>
            <SelectItem value="size_desc">Tamanho (maior)</SelectItem>
            <SelectItem value="size_asc">Tamanho (menor)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mediaLoading ? (
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-square rounded" />
              <Skeleton className="h-3 w-3/4 mt-1.5" />
              <Skeleton className="h-2.5 w-1/2 mt-1" />
            </div>
          ))}
        </div>
      ) : mediaData?.items.length === 0 ? (
        <Card className="p-12 text-center">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">Nenhuma imagem encontrada.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {mediaData?.items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedMedia(item)}
                className="group text-left transition-all"
                data-testid={`media-grid-item-${item.id}`}
              >
                <div className={`relative aspect-square rounded border-2 overflow-hidden transition-all ${
                  selectedMedia?.id === item.id
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-muted hover:border-muted-foreground/30"
                }`}>
                  <img
                    src={item.url}
                    alt={item.altText || item.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <Badge className={`absolute top-1 right-1 text-[8px] px-1 py-0 ${SOURCE_COLORS[item.source] || ""}`}>
                    {item.source === "wordpress" ? "WP" : item.source === "post-content" ? "CNT" : "UP"}
                  </Badge>
                </div>
                <div className="mt-1 px-0.5">
                  <p className="text-[11px] font-medium truncate text-foreground leading-tight" title={item.filename}>
                    {item.filename}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground leading-tight mt-0.5">
                    <span>{formatBytes(item.fileSize)}</span>
                    <span className="opacity-40">·</span>
                    <span>{formatDateShort(item.createdAt)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <span className="text-sm text-muted-foreground">
                {mediaData?.total} imagens · Página {page} de {totalPages}
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

      <Dialog open={!!selectedMedia} onOpenChange={(o) => { if (!o) setSelectedMedia(null); }}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden [&>button.absolute]:hidden" data-testid="dialog-media-detail">
          <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
            <DialogTitle className="text-base font-semibold">Detalhes do anexo</DialogTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={selectedIndex <= 0}
                onClick={() => navigateMedia("prev")}
                data-testid="button-detail-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!mediaData || selectedIndex >= mediaData.items.length - 1}
                onClick={() => navigateMedia("next")}
                data-testid="button-detail-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedMedia(null)}
                data-testid="button-detail-close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {selectedMedia && (
            <div className="flex flex-col md:flex-row overflow-hidden" style={{ maxHeight: "calc(90vh - 56px)" }}>
              <div className="md:w-1/2 bg-muted/20 flex items-center justify-center p-6 min-h-[300px]">
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.altText || selectedMedia.filename}
                  className="max-w-full max-h-[60vh] object-contain rounded"
                  data-testid="img-detail-preview"
                />
              </div>

              <div className="md:w-1/2 overflow-y-auto p-5 space-y-4 border-l">
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Upload feito em</p>
                    <p className="text-sm" data-testid="text-detail-date">{formatDateLong(selectedMedia.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Fonte</p>
                    <Badge className={SOURCE_COLORS[selectedMedia.source]} data-testid="badge-detail-source">
                      {SOURCE_LABELS[selectedMedia.source]?.label || selectedMedia.source}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Nome do arquivo</p>
                    {renaming ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                          data-testid="input-rename-media"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && renameValue.trim() && renameValue !== selectedMedia.filename) {
                              renameMutation.mutate({ id: selectedMedia.id, filename: renameValue.trim() });
                            }
                            if (e.key === "Escape") setRenaming(false);
                          }}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => {
                            if (renameValue.trim() && renameValue !== selectedMedia.filename) {
                              renameMutation.mutate({ id: selectedMedia.id, filename: renameValue.trim() });
                            }
                          }}
                          disabled={renameMutation.isPending || !renameValue.trim() || renameValue === selectedMedia.filename}
                          data-testid="button-confirm-rename"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => setRenaming(false)}
                          data-testid="button-cancel-rename"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm break-all flex-1" data-testid="text-detail-filename">{selectedMedia.filename}</p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0"
                          onClick={() => { setRenaming(true); setRenameValue(selectedMedia.filename); }}
                          data-testid="button-start-rename"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Tipo do arquivo</p>
                    <p className="text-sm" data-testid="text-detail-mimetype">{selectedMedia.mimeType || getMimeFromFilename(selectedMedia.filename)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">Tamanho do arquivo</p>
                    <p className="text-sm" data-testid="text-detail-filesize">{formatBytes(selectedMedia.fileSize)}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">
                    Aparece em {usageData ? usageData.length : "..."} {usageData?.length === 1 ? "lugar" : "lugares"}
                  </p>
                  {usageData === undefined ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : usageData.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nenhum post usa esta imagem.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                      {usageData.map((u) => (
                        <div key={u.postId} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/50 transition-colors">
                          <Link href={`/${u.slug}`} className="flex-1 min-w-0">
                            <span className="text-primary hover:underline cursor-pointer truncate block" data-testid={`link-usage-${u.postId}`}>
                              {u.title}
                            </span>
                          </Link>
                          <Badge variant="outline" className="text-[9px] shrink-0">{u.usage}</Badge>
                          <Link href={`/admin/post/${u.postId}`}>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0" data-testid={`button-edit-post-${u.postId}`}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(selectedMedia)}
                    data-testid="button-delete-media"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Excluir imagem
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeleteUsages([]); } }}>
        <DialogContent data-testid="dialog-delete-confirm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Atenção: Imagem em uso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>A imagem <strong>{deleteTarget?.filename}</strong> aparece nos seguintes posts:</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {deleteUsages.map((u) => (
                <div key={u.postId} className="flex items-center justify-between gap-2 p-2 bg-muted rounded">
                  <span className="truncate">{u.title}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{u.usage}</Badge>
                </div>
              ))}
            </div>
            <p className="text-amber-600">Ao excluir esta imagem do banco de dados, ela poderá não carregar corretamente nos posts acima.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteUsages([]); }} data-testid="button-cancel-delete">Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete">
              {deleteMutation.isPending ? "Excluindo..." : "Excluir mesmo assim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
