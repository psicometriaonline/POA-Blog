import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, Eye, MousePointerClick, Percent } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PopupStats {
  impressions: number;
  clicks: number;
  ctr: number;
  impressions30d: number;
  clicks30d: number;
}

export function PopupSettingsContent() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
  });

  const { data: stats } = useQuery<PopupStats>({
    queryKey: ["/api/admin/popup/stats"],
  });

  const [enabled, setEnabled] = useState(true);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [scrollPercent, setScrollPercent] = useState("50");
  const [exitIntentEnabled, setExitIntentEnabled] = useState(true);
  const [popupUrl, setPopupUrl] = useState("");

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings["popup_enabled"] !== "false");
    setScrollEnabled(settings["popup_scroll_enabled"] !== "false");
    setScrollPercent(settings["popup_scroll_percent"] || "50");
    setExitIntentEnabled(settings["popup_exit_intent_enabled"] !== "false");
    setPopupUrl(settings["academy_popup_url"] || "");
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      await apiRequest("PUT", "/api/admin/settings", payload);
    },
    onSuccess: () => {
      toast({ title: "Configurações do pop-up salvas" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
    },
    onError: (err: any) => toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" }),
  });

  const handleSave = () => {
    const pct = Math.min(100, Math.max(1, parseInt(scrollPercent) || 50));
    if (enabled && !scrollEnabled && !exitIntentEnabled) {
      toast({ title: "Selecione ao menos um gatilho", description: "Ative o gatilho por rolagem ou por saída.", variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      popup_enabled: enabled ? "true" : "false",
      popup_scroll_enabled: scrollEnabled ? "true" : "false",
      popup_scroll_percent: String(pct),
      popup_exit_intent_enabled: exitIntentEnabled ? "true" : "false",
      academy_popup_url: popupUrl,
    });
  };

  if (isLoading) {
    return <div className="flex items-center gap-2 p-6"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6 border-t-4 border-t-primary">
        <h3 className="font-semibold text-lg mb-1">Pop-Up de Engajamento (Academy)</h3>
        <p className="text-sm text-muted-foreground">
          Pop-up exibido nos posts públicos para leitores engajados, levando à Psicometria Online Academy.
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Ativar pop-up</h4>
            <p className="text-xs text-muted-foreground">Liga ou desliga o pop-up em todos os posts.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} data-testid="switch-popup-enabled" />
        </div>
      </Card>

      <Card className="p-6">
        <h4 className="font-semibold mb-1">Gatilho de entrada</h4>
        <p className="text-xs text-muted-foreground mb-4">Quando o pop-up deve aparecer. O primeiro gatilho que ocorrer dispara o pop-up.</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 border rounded-md p-3">
            <div className="flex items-start gap-3">
              <Percent className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <Label className="font-medium">Após X% de leitura do post</Label>
                <p className="text-xs text-muted-foreground">Dispara quando o leitor rola até a porcentagem definida.</p>
              </div>
            </div>
            <Switch checked={scrollEnabled} onCheckedChange={setScrollEnabled} data-testid="switch-popup-scroll" />
          </div>

          {scrollEnabled && (
            <div className="flex items-center gap-2 pl-10">
              <Input
                type="number"
                min={1}
                max={100}
                value={scrollPercent}
                onChange={e => setScrollPercent(e.target.value)}
                className="w-24"
                data-testid="input-popup-scroll-percent"
              />
              <span className="text-sm text-muted-foreground">% do post</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 border rounded-md p-3">
            <div className="flex items-start gap-3">
              <MousePointerClick className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <Label className="font-medium">Intenção de saída (exit intent)</Label>
                <p className="text-xs text-muted-foreground">Dispara quando o cursor sai pela parte superior da página (desktop).</p>
              </div>
            </div>
            <Switch checked={exitIntentEnabled} onCheckedChange={setExitIntentEnabled} data-testid="switch-popup-exit-intent" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h4 className="font-semibold mb-1">URL do hiperlink</h4>
        <p className="text-xs text-muted-foreground mb-3">Destino ao clicar no pop-up. Inclua os parâmetros UTM no link.</p>
        <Input
          value={popupUrl}
          onChange={e => setPopupUrl(e.target.value)}
          placeholder="https://academy.psicometriaonline.com.br/?utm_source=blog&utm_medium=popup"
          data-testid="input-popup-url"
        />
      </Card>

      <Card className="p-6">
        <h4 className="font-semibold mb-3">Performance do pop-up</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Eye className="h-4 w-4" /> Exibições
            </div>
            <div className="text-2xl font-bold" data-testid="text-popup-impressions">{stats?.impressions ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">{stats?.impressions30d ?? 0} nos últimos 30 dias</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <MousePointerClick className="h-4 w-4" /> Cliques
            </div>
            <div className="text-2xl font-bold" data-testid="text-popup-clicks">{stats?.clicks ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">{stats?.clicks30d ?? 0} nos últimos 30 dias</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Percent className="h-4 w-4" /> Taxa de clique (CTR)
            </div>
            <div className="text-2xl font-bold" data-testid="text-popup-ctr">{stats?.ctr ?? 0}%</div>
            <div className="text-xs text-muted-foreground mt-1">cliques ÷ exibições</div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-popup">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}
