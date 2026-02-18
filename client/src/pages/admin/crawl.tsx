import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, Check, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CrawledPost {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage: string | null;
  authorName: string | null;
  publishedAt: string | null;
  categories: string[];
  tags: string[];
  sourceUrl: string;
}

export default function CrawlPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [urlsText, setUrlsText] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [importing, setImporting] = useState(false);
  const [crawledPosts, setCrawledPosts] = useState<CrawledPost[]>([]);
  const [errors, setErrors] = useState<{ url: string; error: string }[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set());
  const [importResult, setImportResult] = useState<{ imported: number; errors: { title: string; error: string }[] } | null>(null);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
        <a href="/api/login"><Button>Fazer Login</Button></a>
      </div>
    );
  }

  const handleCrawl = async () => {
    const urls = urlsText.split("\n").map(u => u.trim()).filter(u => u.length > 0);
    if (urls.length === 0) {
      toast({ title: "Insira pelo menos uma URL", variant: "destructive" });
      return;
    }

    setCrawling(true);
    setCrawledPosts([]);
    setErrors([]);
    setImportResult(null);
    setSelectedPosts(new Set());

    try {
      const res = await apiRequest("POST", "/api/admin/crawl", { urls });
      const data = await res.json();
      setCrawledPosts(data.success || []);
      setErrors(data.errors || []);
      setSelectedPosts(new Set((data.success || []).map((_: any, i: number) => i)));
    } catch (error: any) {
      toast({ title: "Erro no crawling", description: error.message, variant: "destructive" });
    } finally {
      setCrawling(false);
    }
  };

  const handleImport = async () => {
    const postsToImport = crawledPosts.filter((_, i) => selectedPosts.has(i));
    if (postsToImport.length === 0) {
      toast({ title: "Selecione pelo menos um post para importar", variant: "destructive" });
      return;
    }

    setImporting(true);
    try {
      const res = await apiRequest("POST", "/api/admin/crawl/import", { posts: postsToImport });
      const data = await res.json();
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({ title: `${data.imported} post(s) importado(s) com sucesso!` });
    } catch (error: any) {
      toast({ title: "Erro na importacao", description: error.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const togglePost = (index: number) => {
    setSelectedPosts(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedPosts.size === crawledPosts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(crawledPosts.map((_, i) => i)));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="font-serif text-2xl font-bold" data-testid="text-crawl-title">Importar Posts do WordPress</h1>
      </div>

      <Card className="p-4 mb-6">
        <Label className="mb-2 block">Cole as URLs dos posts (uma por linha)</Label>
        <Textarea
          value={urlsText}
          onChange={(e) => setUrlsText(e.target.value)}
          placeholder={"https://www.blog.psicometriaonline.com.br/o-que-e-metanalise/\nhttps://www.blog.psicometriaonline.com.br/outro-post/"}
          rows={8}
          className="resize-y font-mono text-sm"
          data-testid="textarea-urls"
        />
        <div className="flex items-center justify-between gap-4 mt-3 flex-wrap">
          <p className="text-sm text-muted-foreground">
            {urlsText.split("\n").filter(u => u.trim()).length} URL(s) inserida(s)
          </p>
          <Button onClick={handleCrawl} disabled={crawling || !urlsText.trim()} data-testid="button-crawl">
            {crawling ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            {crawling ? "Extraindo..." : "Extrair Posts"}
          </Button>
        </div>
      </Card>

      {errors.length > 0 && (
        <Card className="p-4 mb-6 border-destructive/50">
          <h3 className="font-semibold text-destructive flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4" />
            Erros ({errors.length})
          </h3>
          <div className="space-y-1">
            {errors.map((err, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                <span className="font-mono text-xs">{err.url}</span>: {err.error}
              </p>
            ))}
          </div>
        </Card>
      )}

      {crawledPosts.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <h2 className="text-xl font-semibold">Posts Extraidos ({crawledPosts.length})</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={toggleAll} data-testid="button-toggle-all">
                {selectedPosts.size === crawledPosts.length ? "Desmarcar Todos" : "Selecionar Todos"}
              </Button>
              <Button onClick={handleImport} disabled={importing || selectedPosts.size === 0} data-testid="button-import">
                {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Importar {selectedPosts.size} post(s)
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {crawledPosts.map((post, i) => (
              <Card
                key={i}
                className={`p-4 cursor-pointer ${selectedPosts.has(i) ? "ring-2 ring-primary" : ""}`}
                onClick={() => togglePost(i)}
                data-testid={`crawled-post-${i}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${selectedPosts.has(i) ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                    {selectedPosts.has(i) && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{post.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{post.sourceUrl}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {post.categories.map((cat, ci) => (
                        <Badge key={ci} variant="secondary" className="text-xs">{cat}</Badge>
                      ))}
                      {post.tags.map((tag, ti) => (
                        <Badge key={ti} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  {post.featuredImage && (
                    <img src={post.featuredImage} alt="" className="w-16 h-16 object-cover rounded-md flex-shrink-0" />
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {importResult && (
        <Card className="p-4 mt-6 bg-primary/5">
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <Check className="h-4 w-4 text-primary" />
            Importacao Concluida
          </h3>
          <p className="text-sm">{importResult.imported} post(s) importado(s) com sucesso.</p>
          {importResult.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-destructive">{importResult.errors.length} erro(s):</p>
              {importResult.errors.map((err, i) => (
                <p key={i} className="text-xs text-muted-foreground">{err.title}: {err.error}</p>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
