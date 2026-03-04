import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, SpellCheck2, AlertTriangle } from "lucide-react";

interface GrammarMatch {
  message: string;
  shortMessage: string;
  offset: number;
  length: number;
  replacements: { value: string }[];
  rule: {
    id: string;
    description: string;
    issueType: string;
    category: { id: string; name: string };
  };
  context: {
    text: string;
    offset: number;
    length: number;
  };
}

interface GrammarCheckerProps {
  content: string;
  onHighlight?: (texts: string[]) => void;
}

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function issueTypeLabel(issueType: string): string {
  const map: Record<string, string> = {
    misspelling: "Ortografia",
    grammar: "Gramática",
    typographical: "Tipografia",
    style: "Estilo",
    duplication: "Duplicação",
    inconsistency: "Inconsistência",
    "non-conformance": "Não-conformidade",
    uncategorized: "Outro",
  };
  return map[issueType] || issueType;
}

function issueTypeColor(issueType: string): string {
  switch (issueType) {
    case "misspelling":
      return "text-red-600 bg-red-50 dark:bg-red-950/30";
    case "grammar":
      return "text-amber-600 bg-amber-50 dark:bg-amber-950/30";
    case "typographical":
      return "text-blue-600 bg-blue-50 dark:bg-blue-950/30";
    default:
      return "text-muted-foreground bg-muted/50";
  }
}

export function GrammarChecker({ content, onHighlight }: GrammarCheckerProps) {
  const [matches, setMatches] = useState<GrammarMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkGrammar = async () => {
    const plainText = stripHtml(content);
    if (!plainText.trim()) {
      setError("O conteúdo está vazio.");
      return;
    }

    setLoading(true);
    setError(null);
    setMatches([]);

    try {
      const params = new URLSearchParams({
        text: plainText,
        language: "pt-BR",
        enabledOnly: "false",
      });

      const res = await fetch("https://api.languagetool.org/v2/check", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!res.ok) {
        throw new Error(`Erro na API: ${res.status}`);
      }

      const data = await res.json();
      setMatches(data.matches || []);
      setChecked(true);
    } catch (err: any) {
      setError(err.message || "Erro ao verificar gramática.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-3" data-testid="grammar-checker">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={checkGrammar}
          disabled={loading}
          data-testid="button-check-grammar"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <SpellCheck2 className="h-4 w-4 mr-1" />
          )}
          {loading ? "Verificando..." : "Verificar gramática"}
        </Button>
        {checked && !loading && (
          <span className="text-xs text-muted-foreground" data-testid="text-grammar-count">
            {matches.length === 0
              ? "Nenhum problema encontrado"
              : `${matches.length} problema${matches.length !== 1 ? "s" : ""}`}
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600" data-testid="text-grammar-error">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {error}
        </div>
      )}

      {checked && matches.length === 0 && !loading && !error && (
        <p className="text-xs text-green-600" data-testid="text-grammar-ok">
          Nenhum erro de gramática ou ortografia encontrado.
        </p>
      )}

      {matches.length > 0 && (
        <div className="space-y-1">
          {matches.map((match, index) => {
            const contextText = match.context.text;
            const errorText = contextText.substring(
              match.context.offset,
              match.context.offset + match.context.length
            );
            const before = contextText.substring(0, match.context.offset);
            const after = contextText.substring(match.context.offset + match.context.length);
            const suggestions = match.replacements.slice(0, 3);
            const clickable = onHighlight && errorText.length > 0;

            return (
              <button
                key={index}
                type="button"
                className={`w-full text-left p-2 rounded-md transition-colors ${
                  clickable ? "hover:bg-muted/50 cursor-pointer" : "cursor-default"
                }`}
                onClick={() => {
                  if (clickable) onHighlight([errorText]);
                }}
                data-testid={`grammar-issue-${index}`}
              >
                <div className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${issueTypeColor(match.rule.issueType)}`}
                  >
                    {issueTypeLabel(match.rule.issueType)}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground">
                      <span className="text-muted-foreground">{before}</span>
                      <span className="font-medium text-red-600 underline decoration-wavy">{errorText}</span>
                      <span className="text-muted-foreground">{after}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{match.message}</p>
                    {suggestions.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">Sugestões:</span>
                        {suggestions.map((s, si) => (
                          <Badge key={si} variant="secondary" className="text-[10px]">
                            {s.value}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
