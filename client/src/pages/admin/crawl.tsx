import { useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Play, Square, Check, AlertCircle, Loader2, Clock, RotateCcw, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type UrlStatus = "pending" | "processing" | "done" | "error";

interface QueueItem {
  url: string;
  status: UrlStatus;
  title?: string;
  slug?: string;
  error?: string;
}

export function CrawlContent() {
  const { toast } = useToast();
  const [urlsText, setUrlsText] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef(false);
  const [delaySeconds, setDelaySeconds] = useState(3);

  const buildQueue = () => {
    const urls = urlsText.split("\n").map(u => u.trim()).filter(u => u.length > 0);
    if (urls.length === 0) {
      toast({ title: "Insira pelo menos uma URL", variant: "destructive" });
      return;
    }
    const items: QueueItem[] = urls.map(url => ({ url, status: "pending" as UrlStatus }));
    setQueue(items);
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const processQueue = async () => {
    abortRef.current = false;
    setIsRunning(true);

    const currentQueue = [...queue];
    const pendingIndices = currentQueue
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => item.status === "pending" || item.status === "error")
      .map(({ i }) => i);

    for (const idx of pendingIndices) {
      if (abortRef.current) break;

      setQueue(prev => prev.map((item, i) => i === idx ? { ...item, status: "processing" as UrlStatus, error: undefined } : item));

      try {
        const res = await apiRequest("POST", "/api/admin/crawl/single", { url: currentQueue[idx].url });
        const data = await res.json();

        if (data.success) {
          setQueue(prev => prev.map((item, i) => i === idx ? { ...item, status: "done" as UrlStatus, title: data.title, slug: data.slug } : item));
        } else {
          setQueue(prev => prev.map((item, i) => i === idx ? { ...item, status: "error" as UrlStatus, error: data.message || "Erro desconhecido" } : item));
        }
      } catch (err: any) {
        setQueue(prev => prev.map((item, i) => i === idx ? { ...item, status: "error" as UrlStatus, error: err.message || "Erro de conexão" } : item));
      }

      if (!abortRef.current && idx !== pendingIndices[pendingIndices.length - 1]) {
        await sleep(delaySeconds * 1000);
      }
    }

    setIsRunning(false);
    queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
  };

  const stopProcessing = () => {
    abortRef.current = true;
  };

  const retryErrors = () => {
    setQueue(prev => prev.map(item => item.status === "error" ? { ...item, status: "pending" as UrlStatus, error: undefined } : item));
  };

  const resetQueue = () => {
    setQueue([]);
    setUrlsText("");
  };

  const doneCount = queue.filter(i => i.status === "done").length;
  const errorCount = queue.filter(i => i.status === "error").length;
  const pendingCount = queue.filter(i => i.status === "pending").length;
  const processingCount = queue.filter(i => i.status === "processing").length;
  const total = queue.length;
  const progress = total > 0 ? ((doneCount + errorCount) / total) * 100 : 0;

  const statusIcon = (status: UrlStatus) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
      case "processing": return <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />;
      case "done": return <Check className="h-4 w-4 text-green-600 flex-shrink-0" />;
      case "error": return <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
    }
  };

  const statusLabel = (status: UrlStatus) => {
    switch (status) {
      case "pending": return "Pendente";
      case "processing": return "Processando...";
      case "done": return "Importado";
      case "error": return "Erro";
    }
  };

  const [seoImportResult, setSeoImportResult] = useState<any>(null);

  const seoImportMutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const res = await apiRequest("POST", `/api/admin/crawl/import-seo?dryRun=${dryRun}`);
      return res.json();
    },
    onSuccess: (data) => {
      setSeoImportResult(data);
      if (!data.dryRun) {
        toast({ title: `SEO importado para ${data.imported} posts` });
        queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes("/api/posts") });
      }
    },
    onError: (err: any) => {
      toast({ title: "Erro ao importar SEO", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div>
      {queue.length === 0 ? (
        <Card className="p-4 mb-6">
          <Label className="mb-2 block">Cole as URLs dos posts (uma por linha)</Label>
          <Textarea
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            placeholder={"https://blog.psicometriaonline.com.br/o-que-e-metanalise/\nhttps://blog.psicometriaonline.com.br/outro-post/"}
            rows={12}
            className="resize-y font-mono text-sm"
            data-testid="textarea-urls"
          />
          <div className="flex items-center justify-between gap-4 mt-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {urlsText.split("\n").filter(u => u.trim()).length} URL(s) inserida(s)
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Intervalo (s):</Label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Math.max(1, Math.min(30, parseInt(e.target.value) || 3)))}
                  className="w-16 h-9 rounded-md border px-2 text-sm text-center"
                  data-testid="input-delay"
                />
              </div>
              <Button onClick={buildQueue} disabled={!urlsText.trim()} data-testid="button-build-queue">
                Preparar Fila de Importação
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-4 mb-4">
            <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-green-600" />
                  <span data-testid="text-done-count">{doneCount} importado(s)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span data-testid="text-error-count">{errorCount} erro(s)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span data-testid="text-pending-count">{pendingCount + processingCount} pendente(s)</span>
                </span>
                <span className="text-muted-foreground" data-testid="text-total">Total: {total}</span>
              </div>
              <div className="flex items-center gap-2">
                {!isRunning && errorCount > 0 && (
                  <Button variant="outline" size="sm" onClick={retryErrors} data-testid="button-retry-errors">
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Repetir erros
                  </Button>
                )}
                {!isRunning ? (
                  <>
                    <Button variant="outline" size="sm" onClick={resetQueue} data-testid="button-reset">
                      Nova importação
                    </Button>
                    {(pendingCount > 0 || errorCount > 0) && (
                      <Button size="sm" onClick={processQueue} data-testid="button-start">
                        <Play className="h-4 w-4 mr-1" />
                        {doneCount > 0 ? "Continuar" : "Iniciar"}
                      </Button>
                    )}
                  </>
                ) : (
                  <Button variant="destructive" size="sm" onClick={stopProcessing} data-testid="button-stop">
                    <Square className="h-4 w-4 mr-1" />
                    Pausar
                  </Button>
                )}
              </div>
            </div>
            <Progress value={progress} className="h-2" data-testid="progress-bar" />
            <p className="text-xs text-muted-foreground mt-1.5">
              {Math.round(progress)}% concluído — intervalo de {delaySeconds}s entre requisições
            </p>
          </Card>

          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {queue.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm border ${
                  item.status === "done" ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900" :
                  item.status === "error" ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900" :
                  item.status === "processing" ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900" :
                  "bg-muted/30 border-border"
                }`}
                data-testid={`queue-item-${i}`}
              >
                {statusIcon(item.status)}
                <div className="flex-1 min-w-0">
                  {item.title ? (
                    <span className="font-medium truncate block">{item.title}</span>
                  ) : (
                    <span className="font-mono text-xs truncate block text-muted-foreground">{item.url}</span>
                  )}
                  {item.error && (
                    <span className="text-xs text-red-600 block mt-0.5">{item.error}</span>
                  )}
                </div>
                <span className={`text-xs whitespace-nowrap ${
                  item.status === "done" ? "text-green-700" :
                  item.status === "error" ? "text-red-600" :
                  item.status === "processing" ? "text-blue-600" :
                  "text-muted-foreground"
                }`}>
                  {statusLabel(item.status)}
                </span>
              </div>
            ))}
          </div>

          {!isRunning && doneCount === total && total > 0 && (
            <Card className="p-4 mt-4 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
              <h3 className="font-semibold flex items-center gap-2 text-green-800 dark:text-green-300">
                <Check className="h-5 w-5" />
                Importação concluída!
              </h3>
              <p className="text-sm mt-1 text-green-700 dark:text-green-400">
                Todos os {total} posts foram importados com sucesso.
              </p>
            </Card>
          )}
        </>
      )}
      <Card className="p-4 mt-8" data-testid="seo-import-card">
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-lg">Importar dados de SEO do WordPress (Yoast)</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Importa o título SEO, a meta descrição e a palavra-chave de foco (derivada do título SEO) de cada post diretamente do Yoast SEO no WordPress.
          Posts que já possuem dados de SEO serão mantidos sem alteração.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => seoImportMutation.mutate(true)}
            disabled={seoImportMutation.isPending}
            data-testid="button-seo-dry-run"
          >
            {seoImportMutation.isPending && seoImportResult?.dryRun !== false ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : null}
            Pré-visualizar
          </Button>
          <Button
            size="sm"
            onClick={() => seoImportMutation.mutate(false)}
            disabled={seoImportMutation.isPending}
            data-testid="button-seo-execute"
          >
            {seoImportMutation.isPending && seoImportResult?.dryRun === false ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : null}
            Importar SEO
          </Button>
        </div>

        {seoImportResult && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-green-600" />
                {seoImportResult.imported} para importar
              </span>
              <span className="text-muted-foreground">
                {seoImportResult.skipped} já possuem SEO
              </span>
              {seoImportResult.errors > 0 && (
                <span className="flex items-center gap-1.5 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {seoImportResult.errors} erro(s)
                </span>
              )}
              <span className="text-muted-foreground">
                Total: {seoImportResult.totalPosts}
              </span>
              {seoImportResult.dryRun && (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded dark:bg-amber-900/30 dark:text-amber-300">
                  Pré-visualização
                </span>
              )}
              {!seoImportResult.dryRun && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded dark:bg-green-900/30 dark:text-green-300">
                  Importado
                </span>
              )}
            </div>

            {seoImportResult.results && seoImportResult.results.length > 0 && (
              <div className="max-h-60 overflow-y-auto space-y-1">
                {seoImportResult.results.map((r: any) => (
                  <div key={r.id} className="text-xs border rounded p-2 bg-muted/20">
                    <p className="font-medium truncate">{r.title}</p>
                    {r.seoTitle && (
                      <p className="text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground">Título SEO:</span> {r.seoTitle}
                      </p>
                    )}
                    {r.metaDescription && (
                      <p className="text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground">Meta:</span> {r.metaDescription}
                      </p>
                    )}
                    {r.focusKeyword && (
                      <p className="text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground">Palavra-chave:</span> {r.focusKeyword}
                      </p>
                    )}
                  </div>
                ))}
                {seoImportResult.imported > seoImportResult.results.length && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    ...e mais {seoImportResult.imported - seoImportResult.results.length} posts
                  </p>
                )}
              </div>
            )}

            {seoImportResult.errorDetails && seoImportResult.errorDetails.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {seoImportResult.errorDetails.map((e: any) => (
                  <div key={e.id} className="text-xs text-red-600 border border-red-200 rounded p-2 bg-red-50 dark:bg-red-950/20">
                    {e.slug}: {e.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function CrawlPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
        <a href="/api/login"><Button>Fazer Login</Button></a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin?tab=posts">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="font-serif text-2xl font-bold" data-testid="text-crawl-title">Importar Posts do WordPress</h1>
      </div>
      <CrawlContent />
    </div>
  );
}
