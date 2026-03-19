import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Search, BookOpen, Eye, AlertTriangle, CheckCircle2, XCircle, SpellCheck2 } from "lucide-react";
import { analyzeSEO, type SeoCheck } from "@/lib/seo-analyzer";
import { analyzeReadability } from "@/lib/readability-analyzer";
import { GrammarChecker } from "@/components/grammar-checker";

interface SeoPanelProps {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  onSeoTitleChange: (v: string) => void;
  onMetaDescriptionChange: (v: string) => void;
  onFocusKeywordChange: (v: string) => void;
  postId?: number;
  onHighlight?: (texts: string[]) => void;
}

type Tab = "seo" | "readability" | "grammar";

function CheckItem({ check, onHighlight }: { check: SeoCheck; onHighlight?: (texts: string[]) => void }) {
  const icon =
    check.status === "good" ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> :
    check.status === "warning" ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" /> :
    <XCircle className="h-4 w-4 text-red-500 shrink-0" />;

  const clickable = check.highlightTexts && check.highlightTexts.length > 0 && onHighlight;

  return (
    <button
      type="button"
      className={`flex items-start gap-2 text-left w-full p-2 rounded-md transition-colors ${
        clickable ? "hover:bg-muted/50 cursor-pointer" : "cursor-default"
      }`}
      onClick={() => {
        if (clickable) onHighlight(check.highlightTexts!);
      }}
      data-testid={`seo-check-${check.id}`}
    >
      {icon}
      <div className="min-w-0">
        <span className="text-xs font-medium text-foreground">{check.label}</span>
        <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
      </div>
    </button>
  );
}

function ScoreBadge({ label, checks }: { label: string; checks: SeoCheck[] }) {
  const good = checks.filter(c => c.status === "good").length;
  const total = checks.length;
  const ratio = total > 0 ? good / total : 0;
  const color = ratio >= 0.7 ? "bg-green-500" : ratio >= 0.4 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2" data-testid={`score-${label.toLowerCase()}`}>
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-xs font-medium">{label}: {good}/{total}</span>
    </div>
  );
}

function GooglePreview({ seoTitle, title, slug, metaDescription, excerpt }: {
  seoTitle: string; title: string; slug: string; metaDescription: string; excerpt: string;
}) {
  const displayTitle = seoTitle || title || "Título da página";
  const displayUrl = `psicometriaonline.com.br/${slug || ""}`;
  const displayDesc = metaDescription || excerpt || "Adicione uma meta descrição para controlar o que aparece nos resultados de busca.";

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-900" data-testid="google-preview">
      <p className="text-xs text-muted-foreground mb-2 font-medium">Pré-visualização do Google</p>
      <div className="space-y-0.5">
        <p className="text-sm text-green-700 dark:text-green-400 truncate">{displayUrl}</p>
        <p className="text-base text-blue-700 dark:text-blue-400 font-medium line-clamp-1 hover:underline">{displayTitle}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{displayDesc}</p>
      </div>
    </div>
  );
}

function CharCounter({ value, min, max }: { value: string; min: number; max: number }) {
  const len = value.length;
  const color = len >= min && len <= max ? "text-green-600" : len > 0 ? "text-amber-600" : "text-muted-foreground";
  return <span className={`text-[10px] ${color}`}>{len}/{max}</span>;
}

export function SeoPanel({
  title, slug, content, excerpt,
  seoTitle, metaDescription, focusKeyword,
  onSeoTitleChange, onMetaDescriptionChange, onFocusKeywordChange,
  postId, onHighlight,
}: SeoPanelProps) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("seo");
  const [debouncedKeyword, setDebouncedKeyword] = useState(focusKeyword);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(focusKeyword), 500);
    return () => clearTimeout(t);
  }, [focusKeyword]);

  const { data: keywordCheck } = useQuery<{ used: boolean; postTitle: string | null }>({
    queryKey: ["/api/admin/posts/check-keyword", debouncedKeyword, postId],
    queryFn: async () => {
      if (!debouncedKeyword.trim()) return { used: false, postTitle: null };
      const params = new URLSearchParams({ keyword: debouncedKeyword });
      if (postId) params.set("excludeId", String(postId));
      const res = await fetch(`/api/admin/posts/check-keyword?${params}`);
      return res.json();
    },
    enabled: debouncedKeyword.trim().length > 0,
  });

  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
    staleTime: 5 * 60 * 1000,
  });
  const blogBaseUrl = siteSettings?.citation_base_url;

  const seoChecks = useMemo(() =>
    analyzeSEO({ focusKeyword, seoTitle, metaDescription, title, slug, content, excerpt, blogBaseUrl }),
    [focusKeyword, seoTitle, metaDescription, title, slug, content, excerpt, blogBaseUrl]
  );

  const readabilityChecks = useMemo(() =>
    analyzeReadability(content),
    [content]
  );

  const activeChecks = tab === "seo" ? seoChecks : readabilityChecks;
  const problems = activeChecks.filter(c => c.status === "problem");
  const warnings = activeChecks.filter(c => c.status === "warning");
  const goods = activeChecks.filter(c => c.status === "good");

  return (
    <Card className="overflow-hidden" data-testid="seo-panel">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(!open)}
        data-testid="toggle-seo-panel"
      >
        <div className="flex items-center gap-3">
          <Search className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Assistente de SEO</span>
          <ScoreBadge label="SEO" checks={seoChecks} />
          <ScoreBadge label="Legibilidade" checks={readabilityChecks} />
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="border-t">
          <div className="p-4 space-y-4">
            <GooglePreview
              seoTitle={seoTitle}
              title={title}
              slug={slug}
              metaDescription={metaDescription}
              excerpt={excerpt}
            />

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Palavra-chave de foco</Label>
                </div>
                <Input
                  value={focusKeyword}
                  onChange={(e) => onFocusKeywordChange(e.target.value)}
                  placeholder="ex: correlação de Pearson"
                  className="h-8 text-sm"
                  data-testid="input-focus-keyword"
                />
                {keywordCheck?.used && (
                  <p className="text-[10px] text-amber-600 mt-1" data-testid="keyword-duplicate-warning">
                    Já usada em: "{keywordCheck.postTitle}"
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Título SEO</Label>
                  <CharCounter value={seoTitle} min={1} max={65} />
                </div>
                <Input
                  value={seoTitle}
                  onChange={(e) => onSeoTitleChange(e.target.value)}
                  placeholder="Título otimizado para buscas..."
                  className="h-8 text-sm"
                  data-testid="input-seo-title"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Metadescrição</Label>
                  <CharCounter value={metaDescription} min={100} max={155} />
                </div>
                <Textarea
                  value={metaDescription}
                  onChange={(e) => onMetaDescriptionChange(e.target.value)}
                  placeholder="Descrição concisa para os mecanismos de busca..."
                  className="text-sm resize-none"
                  rows={4}
                  data-testid="input-meta-description"
                />
              </div>
            </div>
          </div>

          <div className="border-t">
            <div className="flex border-b">
              <button
                type="button"
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${
                  tab === "seo"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab("seo")}
                data-testid="tab-seo"
              >
                <Search className="h-3 w-3" />
                SEO
              </button>
              <button
                type="button"
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${
                  tab === "readability"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab("readability")}
                data-testid="tab-readability"
              >
                <BookOpen className="h-3 w-3" />
                Legibilidade
              </button>
              <button
                type="button"
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${
                  tab === "grammar"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab("grammar")}
                data-testid="tab-grammar"
              >
                <SpellCheck2 className="h-3 w-3" />
                Gramática
              </button>
            </div>

            {tab === "grammar" ? (
              <GrammarChecker content={content} onHighlight={onHighlight} />
            ) : (
            <div className="p-4 space-y-1">
              {problems.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Problemas ({problems.length})</p>
                  {problems.map(c => <CheckItem key={c.id} check={c} onHighlight={onHighlight} />)}
                </div>
              )}
              {warnings.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Melhorias ({warnings.length})</p>
                  {warnings.map(c => <CheckItem key={c.id} check={c} onHighlight={onHighlight} />)}
                </div>
              )}
              {goods.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Bons resultados ({goods.length})</p>
                  {goods.map(c => <CheckItem key={c.id} check={c} onHighlight={onHighlight} />)}
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
