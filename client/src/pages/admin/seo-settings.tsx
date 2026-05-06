import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Save, Loader2, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type FaqItem = { q: string; a: string };

export function SeoSettingsContent() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
  });

  const [llmsAbout, setLlmsAbout] = useState("");
  const [googleVerif, setGoogleVerif] = useState("");
  const [bingVerif, setBingVerif] = useState("");
  const [defaultOg, setDefaultOg] = useState("");
  const [llmsFaq, setLlmsFaq] = useState<FaqItem[]>([]);
  const [indexnowKey, setIndexnowKey] = useState("");

  useEffect(() => {
    if (!settings) return;
    setLlmsAbout(settings["llms_about_text"] || "");
    setGoogleVerif(settings["google_site_verification"] || "");
    setBingVerif(settings["bing_site_verification"] || "");
    setDefaultOg(settings["default_og_image"] || "");
    setIndexnowKey(settings["indexnow_key"] || "");
    try {
      const raw = settings["llms_faq_json"];
      setLlmsFaq(raw ? (JSON.parse(raw) as FaqItem[]) : []);
    } catch { setLlmsFaq([]); }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      await apiRequest("PUT", "/api/admin/settings", payload);
    },
    onSuccess: () => {
      toast({ title: "Configurações de SEO salvas" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
    },
    onError: (err: any) => toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" }),
  });

  const pingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/seo/indexnow-resubmit");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Reenviado", description: `${data.count || 0} URLs enviadas para IndexNow + Google.` });
    },
    onError: (err: any) => toast({ title: "Erro ao reenviar", description: err.message, variant: "destructive" }),
  });

  const handleSave = () => {
    saveMutation.mutate({
      llms_about_text: llmsAbout,
      google_site_verification: googleVerif,
      bing_site_verification: bingVerif,
      default_og_image: defaultOg,
      llms_faq_json: JSON.stringify(llmsFaq.filter(i => i.q.trim() && i.a.trim())),
    });
  };

  if (isLoading) {
    return <div className="flex items-center gap-2 p-6"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 border-t-4 border-t-primary">
        <h3 className="font-semibold text-lg mb-1">SEO Técnico & Indexação por IA</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Controla os arquivos públicos que orientam buscadores tradicionais e agentes de IA (ChatGPT, Claude, Perplexity, Google AI, etc.).
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1" data-testid="link-robots"><ExternalLink className="h-3 w-3" />robots.txt</a>
          <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1" data-testid="link-sitemap"><ExternalLink className="h-3 w-3" />sitemap.xml</a>
          <a href="/llms.txt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1" data-testid="link-llms"><ExternalLink className="h-3 w-3" />llms.txt</a>
          <a href="/llms-full.txt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1" data-testid="link-llms-full"><ExternalLink className="h-3 w-3" />llms-full.txt</a>
          {indexnowKey && (
            <a href={`/${indexnowKey}.txt`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1" data-testid="link-indexnow-key"><ExternalLink className="h-3 w-3" />{indexnowKey}.txt</a>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold">Verificações de domínio</h4>
            <p className="text-xs text-muted-foreground">Códigos meta-tag para Google Search Console e Bing Webmaster Tools.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="google-verif">Google Site Verification</Label>
            <Input id="google-verif" value={googleVerif} onChange={e => setGoogleVerif(e.target.value)} placeholder="ABC123…" data-testid="input-google-verif" />
          </div>
          <div>
            <Label htmlFor="bing-verif">Bing Site Verification</Label>
            <Input id="bing-verif" value={bingVerif} onChange={e => setBingVerif(e.target.value)} placeholder="ABC123…" data-testid="input-bing-verif" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h4 className="font-semibold mb-1">Imagem padrão de Open Graph</h4>
        <p className="text-xs text-muted-foreground mb-3">Usada como og:image quando o post não tiver imagem destacada.</p>
        <Input value={defaultOg} onChange={e => setDefaultOg(e.target.value)} placeholder="https://www.blog.psicometriaonline.com.br/og-default.jpg" data-testid="input-default-og" />
      </Card>

      <Card className="p-6">
        <h4 className="font-semibold mb-1">Texto de apresentação para LLMs (llms.txt)</h4>
        <p className="text-xs text-muted-foreground mb-3">Resumo de 1–3 frases que descreve o site para agentes de IA.</p>
        <Textarea value={llmsAbout} onChange={e => setLlmsAbout(e.target.value)} className="min-h-[100px]" placeholder="Blog acadêmico em português sobre psicometria…" data-testid="input-llms-about" />
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-semibold">FAQ global do site (llms.txt)</h4>
            <p className="text-xs text-muted-foreground">Aparece no <code>llms.txt</code> para responder perguntas frequentes sobre o site inteiro.</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => setLlmsFaq(prev => [...prev, { q: "", a: "" }])} data-testid="button-add-llms-faq">+ Pergunta</Button>
        </div>
        {llmsFaq.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Nenhuma pergunta adicionada.</p>
        ) : (
          <div className="space-y-3">
            {llmsFaq.map((item, idx) => (
              <div key={idx} className="border rounded p-3 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Pergunta {idx + 1}</span>
                  <Button type="button" size="sm" variant="ghost" className="h-6 text-xs"
                    onClick={() => setLlmsFaq(prev => prev.filter((_, i) => i !== idx))}
                    data-testid={`button-remove-llms-faq-${idx}`}
                  >Remover</Button>
                </div>
                <Input placeholder="Pergunta" value={item.q} className="mb-2"
                  onChange={(e) => setLlmsFaq(prev => prev.map((it, i) => i === idx ? { ...it, q: e.target.value } : it))}
                  data-testid={`input-llms-faq-q-${idx}`}
                />
                <Textarea placeholder="Resposta" value={item.a} className="resize-y min-h-[70px]"
                  onChange={(e) => setLlmsFaq(prev => prev.map((it, i) => i === idx ? { ...it, a: e.target.value } : it))}
                  data-testid={`input-llms-faq-a-${idx}`}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h4 className="font-semibold mb-1">IndexNow</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Sempre que um post é publicado ou atualizado, sua URL é enviada automaticamente para Bing/IndexNow e Google Sitemap Ping.
          Use o botão abaixo para reenviar manualmente todos os posts publicados.
        </p>
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary">Chave: <code className="ml-1">{indexnowKey || "(será gerada)"}</code></Badge>
        </div>
        <Button type="button" variant="outline" onClick={() => pingMutation.mutate()} disabled={pingMutation.isPending} data-testid="button-resubmit-indexnow">
          {pingMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Reenviar todos os posts
        </Button>
      </Card>

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-t">
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-seo-settings">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Configurações de SEO
        </Button>
      </div>
    </div>
  );
}
