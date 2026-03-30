import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, CheckCircle2, Play, ArrowRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function MigrationContent() {
  const { toast } = useToast();
  const [normalizationResult, setNormalizationResult] = useState<any>(null);
  const [checklistResult, setChecklistResult] = useState<any>(null);
  const [testUrl, setTestUrl] = useState<string>("");
  const [testResult, setTestResult] = useState<any>(null);

  const normalizeMutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const res = await apiRequest("POST", `/api/admin/migration/normalize-links?dryRun=${dryRun}`);
      return res.json();
    },
    onSuccess: (data) => {
      setNormalizationResult(data);
      if (!data.dryRun) {
        toast({ 
          title: "Normalização concluída",
          description: `${data.totalContentChanges} links em ${data.affectedPosts} posts foram atualizados`
        });
        queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      }
    },
    onError: (err: any) => {
      toast({ 
        title: "Erro na normalização", 
        description: err.message, 
        variant: "destructive" 
      });
    },
  });

  const checklistMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/admin/migration/checklist");
      return res.json();
    },
    onSuccess: (data) => {
      setChecklistResult(data);
    },
    onError: (err: any) => {
      toast({ 
        title: "Erro ao executar checklist", 
        description: err.message, 
        variant: "destructive" 
      });
    },
  });

  const testRedirectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/migration/test-redirect", { oldUrl: testUrl });
      return res.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: (err: any) => {
      toast({ 
        title: "Erro ao testar redirecionamento", 
        description: err.message, 
        variant: "destructive" 
      });
    },
  });

  return (
    <div className="space-y-6">
      <Card className="p-6 border-t-4 border-t-primary">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold text-lg mb-1">Normalizar Links Internos</h3>
            <p className="text-sm text-muted-foreground">
              Converte todas as URLs internas dos posts para o domínio canônico com www. 
              Afeta URLs absolutas em conteúdo HTML e imagens de destaque.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-mono">https://www.blog.psicometriaonline.com.br</span>
          <Badge variant="outline">Domínio canônico</Badge>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => normalizeMutation.mutate(true)}
            disabled={normalizeMutation.isPending}
            data-testid="button-migration-dry-run"
          >
            {normalizeMutation.isPending && normalizationResult?.dryRun !== false ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Pré-visualizar
          </Button>
          <Button
            size="sm"
            onClick={() => normalizeMutation.mutate(false)}
            disabled={normalizeMutation.isPending}
            data-testid="button-migration-execute"
          >
            {normalizeMutation.isPending && normalizationResult?.dryRun === false ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Normalizar Agora
          </Button>
        </div>

        {normalizationResult && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="p-3 bg-muted/30 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Total de Posts</p>
                <p className="text-lg font-semibold">{normalizationResult.totalPosts}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Posts Afetados</p>
                <p className="text-lg font-semibold text-primary">{normalizationResult.affectedPosts}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Links Substituídos</p>
                <p className="text-lg font-semibold">{normalizationResult.totalContentChanges}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Imagens Atualizadas</p>
                <p className="text-lg font-semibold">{normalizationResult.totalImageChanges}</p>
              </div>
            </div>

            {normalizationResult.dryRun && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/20 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Esta é uma pré-visualização. Use o botão "Normalizar Agora" para aplicar as mudanças.</span>
              </div>
            )}

            {!normalizationResult.dryRun && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950/20 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">Normalização aplicada com sucesso!</span>
              </div>
            )}

            {normalizationResult.results && normalizationResult.results.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Posts afetados (primeiros 20):</p>
                {normalizationResult.results.map((r: any) => (
                  <div key={r.id} className="text-xs border rounded p-2 bg-muted/20">
                    <p className="font-medium truncate" data-testid={`text-migration-post-${r.id}`}>{r.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {r.contentChanges > 0 && `${r.contentChanges} links `}
                      {r.imageChange && `+ imagem`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6 bg-muted/30 border-l-4 border-l-muted-foreground">
        <h3 className="font-semibold mb-3">Checklist de SEO</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Valide se todos os elementos de SEO técnico estão configurados corretamente.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => checklistMutation.mutate()}
          disabled={checklistMutation.isPending}
          data-testid="button-migration-checklist"
        >
          {checklistMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Executar Checklist
        </Button>

        {checklistResult && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium">{checklistResult.passedChecks}/{checklistResult.totalChecks} verificações passaram</span>
            </div>
            <div className="space-y-2">
              {checklistResult.checks.map((check: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded border">
                  {check.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{check.name}</p>
                    {check.details && (
                      <p className="text-xs text-muted-foreground">{check.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 border-t-4 border-t-primary">
        <div className="flex items-start gap-3 mb-4">
          <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold text-lg mb-1">Testar Redirecionamentos</h3>
            <p className="text-sm text-muted-foreground">
              Teste como as URLs legadas do WordPress serão redirecionadas.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="/page/2 ou /?p=123 ou /artigo/amp/ ou /feed"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              disabled={testRedirectMutation.isPending}
              data-testid="input-test-redirect-url"
              className="flex-1"
            />
            <Button
              onClick={() => testRedirectMutation.mutate()}
              disabled={testRedirectMutation.isPending || !testUrl.trim()}
              data-testid="button-test-redirect"
            >
              {testRedirectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Testar
                </>
              )}
            </Button>
          </div>

          {testResult && (
            <div className={`p-4 rounded-lg border-2 ${
              testResult.status === "redirect_301" ? "border-green-200 bg-green-50 dark:bg-green-950/20" :
              testResult.status === "blocked_404" ? "border-red-200 bg-red-50 dark:bg-red-950/20" :
              "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
            }`}>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">URL antiga:</span>
                  <code className="text-xs bg-black/5 px-2 py-1 rounded">{testResult.oldUrl}</code>
                </div>

                <div className="flex items-center gap-2">
                  {testResult.status === "redirect_301" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Redirecionar para:</span>
                    </>
                  ) : testResult.status === "blocked_404" ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm">Bloqueado (404):</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm">Status:</span>
                    </>
                  )}
                  {testResult.redirectTo && (
                    <code className="text-xs bg-black/5 px-2 py-1 rounded">{testResult.redirectTo}</code>
                  )}
                  {!testResult.redirectTo && testResult.status !== "not_found" && (
                    <span className="text-xs text-muted-foreground">Bloqueado (WordPress)</span>
                  )}
                  {testResult.status === "not_found" && (
                    <span className="text-xs text-amber-700">Nenhuma regra correspondeu</span>
                  )}
                </div>

                <div className="pt-2 border-t border-current/10">
                  <p className="text-xs text-muted-foreground">
                    <strong>Tipo:</strong> {testResult.type === "pagination" && "Paginação"} 
                    {testResult.type === "feed" && "Feed RSS"} 
                    {testResult.type === "amp" && "AMP"} 
                    {testResult.type === "wordpress_post_id" && "Post ID do WordPress"} 
                    {testResult.type === "wordpress_admin" && "Admin WordPress"} 
                    {testResult.type === "unknown" && "Desconhecido"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6 bg-muted/30 border-l-4 border-l-muted-foreground">
        <h3 className="font-semibold mb-3">Padrões de Redirecionamento</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• <code className="bg-black/5 px-1 rounded">/page/N</code> → Home (paginação remove em um só post)</li>
          <li>• <code className="bg-black/5 px-1 rounded">/feed, /rss</code> → Home (RSS desabilitado)</li>
          <li>• <code className="bg-black/5 px-1 rounded">/artigo/amp/</code> → /artigo (AMP removido)</li>
          <li>• <code className="bg-black/5 px-1 rounded">/?p=123</code> → /slug-do-post (ID do WP)</li>
          <li>• <code className="bg-black/5 px-1 rounded">/wp-*</code> → 404 Bloqueado (WordPress)</li>
          <li>• Domínio sem www → Redireciona para www (HTTPS)</li>
        </ul>
      </Card>
    </div>
  );
}
