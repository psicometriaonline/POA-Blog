import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Search, Upload, ImageIcon, Download, ChevronLeft, ChevronRight, Check } from "lucide-react";
import type { MediaItem } from "@shared/schema";

interface MediaLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, alt?: string, title?: string) => void;
}

export function MediaLibraryModal({ open, onClose, onSelect }: MediaLibraryModalProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const limit = 24;

  const { data, isLoading } = useQuery<{ items: MediaItem[]; total: number }>({
    queryKey: ["/api/admin/media", search, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`/api/admin/media?${params}`, { credentials: "include" });
      return res.json();
    },
    enabled: open,
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/media/import-from-posts", { method: "POST", credentials: "include" });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Importação concluída: ${data.imported} novas imagens` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
    },
    onError: () => toast({ title: "Erro na importação", variant: "destructive" }),
  });

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (uploadAlt) formData.append("altText", uploadAlt);
      if (uploadTitle) formData.append("title", uploadTitle);
      const res = await fetch("/api/admin/media", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Falha no upload");
      const mediaItem = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      toast({ title: "Imagem enviada com sucesso" });
      onSelect(mediaItem.url, mediaItem.altText || undefined, mediaItem.title || undefined);
      resetAndClose();
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSelect = () => {
    if (selectedItem) {
      onSelect(selectedItem.url, selectedItem.altText || undefined, selectedItem.title || undefined);
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setSearch("");
    setPage(1);
    setSelectedItem(null);
    setUploadAlt("");
    setUploadTitle("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="media-library-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Biblioteca de Mídias
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="library" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mb-3">
            <TabsTrigger value="library" data-testid="tab-library">Biblioteca</TabsTrigger>
            <TabsTrigger value="upload" data-testid="tab-upload">Enviar</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="flex-1 flex flex-col overflow-hidden mt-0">
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, título ou alt..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                  data-testid="input-media-search"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending}
                data-testid="button-import-from-posts"
              >
                <Download className="h-4 w-4 mr-1" />
                {importMutation.isPending ? "Importando..." : "Importar do Blog"}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded" />)}
                </div>
              ) : data?.items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma imagem encontrada.</p>
                  <p className="text-sm mt-1">Clique em "Importar do Blog" para carregar as imagens dos posts existentes.</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {data?.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`group relative aspect-square rounded border-2 overflow-hidden transition-all ${
                        selectedItem?.id === item.id
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-transparent hover:border-muted-foreground/30"
                      }`}
                      data-testid={`media-item-${item.id}`}
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
                      {selectedItem?.id === item.id && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="h-8 w-8 text-primary bg-white rounded-full p-1" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.filename}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="text-sm text-muted-foreground">
                  {data?.total} imagens • Página {page} de {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {selectedItem && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="flex items-center gap-3">
                  <img src={selectedItem.url} alt="" className="h-10 w-10 object-cover rounded" />
                  <div>
                    <p className="text-sm font-medium truncate max-w-xs">{selectedItem.filename}</p>
                    {selectedItem.altText && <p className="text-xs text-muted-foreground">{selectedItem.altText}</p>}
                  </div>
                </div>
                <Button onClick={handleSelect} data-testid="button-select-media">
                  <Check className="h-4 w-4 mr-1" />
                  Selecionar
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="mt-0">
            <div className="max-w-md mx-auto space-y-4 py-6">
              <div>
                <Label>Arquivo de Imagem *</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="cursor-pointer mt-1"
                  data-testid="input-upload-file"
                />
              </div>
              <div>
                <Label>Texto Alternativo</Label>
                <Input
                  value={uploadAlt}
                  onChange={(e) => setUploadAlt(e.target.value)}
                  placeholder="Descrição da imagem"
                  className="mt-1"
                  data-testid="input-upload-alt"
                />
              </div>
              <div>
                <Label>Título</Label>
                <Input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Título da imagem"
                  className="mt-1"
                  data-testid="input-upload-title"
                />
              </div>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full"
                data-testid="button-upload-media"
              >
                {uploading ? "Enviando..." : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar e Selecionar
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
