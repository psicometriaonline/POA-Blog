import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Search, RefreshCw, ExternalLink, FileText, Image, Settings, Layers, Trash2, Replace, Check, X, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BrokenLink } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BrokenLinksData {
  links: BrokenLink[];
  lastScan: string | null;
}

interface ScanResult {
  totalLinksChecked: number;
  brokenCount: number;
  uniqueBrokenUrls: number;
  links: BrokenLink[];
}

function PageTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "post": return <FileText className="h-3.5 w-3.5" />;
    case "banner": return <Image className="h-3.5 w-3.5" />;
    case "settings": return <Settings className="h-3.5 w-3.5" />;
    default: return <Layers className="h-3.5 w-3.5" />;
  }
}

function PageTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    post: "Post",
    banner: "Banner",
    settings: "Configuração",
  };
  const colors: Record<string, string> = {
    post: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    banner: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    settings: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  };
  return (
    <Badge className={`text-[10px] font-medium border-none ${colors[type] || "bg-gray-100 text-gray-700"}`} data-testid={`badge-page-type-${type}`}>
      <PageTypeIcon type={type} />
      <span className="ml-1">{labels[type] || type}</span>
    </Badge>
  );
}

function ReplaceAction({ url }: { url: string }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [newUrl, setNewUrl] = useState("");

  const replaceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/broken-links/replace", { oldUrl: url, newUrl });
      return res.json();
    },
    onSuccess: (data: { updated: number; posts: number; banners: number; settings: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/broken-links"] });
      setExpanded(false);
      setNewUrl("");
      const parts: string[] = [];
      if (data.posts > 0) parts.push(`${data.posts} post(s)`);
      if (data.banners > 0) parts.push(`${data.banners} banner(s)`);
      if (data.settings > 0) parts.push(`${data.settings} configuração(ões)`);
      toast({
        title: "Links substituídos",
        description: parts.length > 0
          ? `Atualizado em: ${parts.join(", ")}.`
          : "Nenhuma ocorrência encontrada nos conteúdos.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao substituir", description: error.message, variant: "destructive" });
    },
  });

  if (!expanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setExpanded(true)}
        className="text-xs"
        data-testid={`button-replace-${encodeURIComponent(url).slice(0, 30)}`}
      >
        <Replace className="h-3.5 w-3.5 mr-1" />
        Substituir
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2 w-full" data-testid={`div-replace-form-${encodeURIComponent(url).slice(0, 30)}`}>
      <Input
        placeholder="Nova URL..."
        value={newUrl}
        onChange={(e) => setNewUrl(e.target.value)}
        className="text-xs h-8 flex-1"
        data-testid="input-replace-url"
        onKeyDown={(e) => {
          if (e.key === "Enter" && newUrl.trim()) replaceMutation.mutate();
          if (e.key === "Escape") { setExpanded(false); setNewUrl(""); }
        }}
        autoFocus
      />
      <Button
        size="sm"
        className="h-8 px-2"
        onClick={() => replaceMutation.mutate()}
        disabled={!newUrl.trim() || replaceMutation.isPending}
        data-testid="button-confirm-replace"
      >
        {replaceMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 px-2"
        onClick={() => { setExpanded(false); setNewUrl(""); }}
        disabled={replaceMutation.isPending}
        data-testid="button-cancel-replace"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function BrokenLinksContent() {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const { data, isLoading } = useQuery<BrokenLinksData>({
    queryKey: ["/api/admin/broken-links"],
  });

  const links = data?.links || [];
  const lastScan = data?.lastScan;

  const filteredLinks = links.filter(link => {
    const matchesSearch = !search ||
      link.url.toLowerCase().includes(search.toLowerCase()) ||
      (link.pageTitle || "").toLowerCase().includes(search.toLowerCase()) ||
      (link.pageSlug || "").toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || link.pageType === filterType;
    return matchesSearch && matchesType;
  });

  const uniqueUrls = new Set(links.map(l => l.url)).size;
  const pageTypes = [...new Set(links.map(l => l.pageType))];

  const groupedByUrl = new Map<string, BrokenLink[]>();
  for (const link of filteredLinks) {
    if (!groupedByUrl.has(link.url)) groupedByUrl.set(link.url, []);
    groupedByUrl.get(link.url)!.push(link);
  }

  async function handleScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await apiRequest("POST", "/api/admin/broken-links/scan");
      const result: ScanResult = await res.json();
      setScanResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/broken-links"] });
      toast({
        title: "Escaneamento concluído",
        description: `${result.totalLinksChecked} links verificados, ${result.uniqueBrokenUrls} URLs quebradas encontradas.`,
      });
    } catch (e: any) {
      toast({ title: "Erro ao escanear links", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  }

  async function handleClear() {
    try {
      await apiRequest("DELETE", "/api/admin/broken-links");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/broken-links"] });
      toast({ title: "Resultados limpos" });
    } catch (e: any) {
      toast({ title: "Erro ao limpar resultados", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="section-broken-links">
      <Card className="p-6" data-testid="card-broken-links-header">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2" data-testid="text-broken-links-title">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Scanner de Links Quebrados
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Verifica todos os links em posts, banners e configurações do blog.
            </p>
            {lastScan && (
              <p className="text-xs text-muted-foreground mt-2" data-testid="text-last-scan">
                Último escaneamento: {format(new Date(lastScan), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {links.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClear} data-testid="button-clear-broken-links">
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
            <Button onClick={handleScan} disabled={scanning} data-testid="button-scan-links">
              <RefreshCw className={`h-4 w-4 mr-1 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Escaneando..." : "Escanear Agora"}
            </Button>
          </div>
        </div>

        {scanning && (
          <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800" data-testid="div-scanning-status">
            <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Verificando links... Isso pode levar alguns minutos dependendo da quantidade de posts.
            </p>
          </div>
        )}

        {scanResult && !scanning && (
          <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800" data-testid="div-scan-result">
            <p className="text-sm text-green-800 dark:text-green-200">
              Verificados <strong>{scanResult.totalLinksChecked}</strong> links.
              {scanResult.uniqueBrokenUrls > 0 ? (
                <> Encontradas <strong className="text-red-600">{scanResult.uniqueBrokenUrls}</strong> URLs quebradas em <strong>{scanResult.brokenCount}</strong> ocorrências.</>
              ) : (
                <> Nenhum link quebrado encontrado! </>
              )}
            </p>
          </div>
        )}
      </Card>

      {links.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 text-center" data-testid="card-stat-total">
              <p className="text-3xl font-bold text-red-500">{uniqueUrls}</p>
              <p className="text-sm text-muted-foreground">URLs quebradas</p>
            </Card>
            <Card className="p-4 text-center" data-testid="card-stat-occurrences">
              <p className="text-3xl font-bold text-amber-500">{links.length}</p>
              <p className="text-sm text-muted-foreground">Total de ocorrências</p>
            </Card>
            <Card className="p-4 text-center" data-testid="card-stat-pages">
              <p className="text-3xl font-bold text-blue-500">{new Set(links.map(l => l.pageSlug || l.pageTitle)).size}</p>
              <p className="text-sm text-muted-foreground">Páginas afetadas</p>
            </Card>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por URL ou página..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-broken-links"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-type">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {pageTypes.map(type => (
                  <SelectItem key={type} value={type}>{type === "post" ? "Posts" : type === "banner" ? "Banners" : type === "settings" ? "Configurações" : type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {Array.from(groupedByUrl.entries()).map(([url, occurrences]) => (
              <Card key={url} className="p-4" data-testid={`card-broken-link-${encodeURIComponent(url).slice(0, 40)}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-mono text-red-600 dark:text-red-400 hover:underline break-all"
                          data-testid="link-broken-url"
                        >
                          {url}
                          <ExternalLink className="h-3 w-3 inline ml-1" />
                        </a>
                        {occurrences[0]?.statusCode && (
                          <Badge variant="outline" className="text-[10px] font-mono" data-testid="badge-status-code">
                            {occurrences[0].statusCode}
                          </Badge>
                        )}
                      </div>
                      <ReplaceAction url={url} />
                    </div>
                    {occurrences[0]?.errorMessage && (
                      <p className="text-xs text-muted-foreground mt-1" data-testid="text-error-message">{occurrences[0].errorMessage}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {occurrences.map((occ, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs bg-muted/50 rounded px-2 py-1">
                          <PageTypeBadge type={occ.pageType} />
                          {occ.pageType === "post" && occ.pageSlug ? (
                            <a href={`/${occ.pageSlug}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" data-testid={`link-page-${occ.pageSlug}`}>
                              {occ.pageTitle || occ.pageSlug}
                            </a>
                          ) : (
                            <span className="text-foreground">{occ.pageTitle || occ.pageSlug || "—"}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {groupedByUrl.size === 0 && search && (
            <Card className="p-8 text-center" data-testid="card-no-results">
              <p className="text-muted-foreground">Nenhum resultado para "{search}"</p>
            </Card>
          )}
        </>
      )}

      {links.length === 0 && !scanning && (
        <Card className="p-8 text-center" data-testid="card-empty-state">
          <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {lastScan
              ? "Nenhum link quebrado encontrado no último escaneamento."
              : "Clique em \"Escanear Agora\" para verificar todos os links do blog."}
          </p>
        </Card>
      )}
    </div>
  );
}
