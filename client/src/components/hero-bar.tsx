import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DOMPurify from "dompurify";

export function HeroBar({ showHeadline = true, settings = {} }: { showHeadline?: boolean; settings?: Record<string, string> }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const headlineHtml = settings["hero_headline_html"] || 'O seu <span style="color:#31D5FF;font-weight:bold">Blog</span> de Psicometria';
  const subheadline = settings["hero_subheadline"] || "Recursos de aprendizagem em psicometria e análises quantitativas";
  const formEnabled = settings["hero_form_enabled"] !== "false";
  const ctaText = settings["hero_form_cta_text"] || 'Junte-se a mais de <span style="color:#31D5FF;font-weight:600">22.300</span> membros e receba conteúdos exclusivos e com prioridade';
  const buttonText = settings["hero_button_text"] || "Quero receber materiais gratuitos";
  const buttonColor = settings["hero_button_color"] || "#31D5FF";
  const buttonTextColor = settings["hero_button_text_color"] || "#000A24";
  const namePlaceholder = settings["hero_name_placeholder"] || "Seu primeiro nome";
  const emailPlaceholder = settings["hero_email_placeholder"] || "Digite seu e-mail";

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/subscribe", { name, email, source: "hero" });
    },
    onSuccess: () => {
      toast({ title: "Inscrito com sucesso!", description: "Você receberá nossos conteúdos em breve." });
      setName("");
      setEmail("");
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Verifique o e-mail informado.", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "E-mail inválido", description: "Por favor, digite um e-mail válido.", variant: "destructive" });
      return;
    }
    subscribeMutation.mutate();
  };

  if (!showHeadline) return null;

  return (
    <section className="bg-dark-bg" data-testid="section-hero">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center py-8 md:py-12">
          <h1
            className="font-serif text-2xl md:text-3xl font-bold mb-3 text-white"
            data-testid="text-hero-title"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(headlineHtml, { ALLOWED_TAGS: ["span", "strong", "em", "b", "i"], ALLOWED_ATTR: ["style", "class"] }) }}
          />
          <p className="text-white/70 text-base md:text-lg mb-8 max-w-2xl mx-auto" data-testid="text-hero-subtitle">{subheadline}</p>

          {formEnabled && (
            <div className="max-w-4xl mx-auto">
              <p
                className="text-white/80 text-sm mb-4 text-left"
                data-testid="text-hero-cta"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ctaText, { ALLOWED_TAGS: ["span", "strong", "em", "b", "i"], ALLOWED_ATTR: ["style", "class"] }) }}
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="text"
                  placeholder={namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white text-foreground placeholder:text-muted-foreground flex-1"
                  data-testid="input-hero-name"
                />
                <Input
                  type="email"
                  placeholder={emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white text-foreground placeholder:text-muted-foreground flex-1"
                  data-testid="input-hero-email"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
                <Button
                  className="flex-shrink-0 border-transparent"
                  style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                  onClick={handleSubmit}
                  disabled={subscribeMutation.isPending}
                  data-testid="button-hero-subscribe"
                >
                  {subscribeMutation.isPending ? "Enviando..." : buttonText}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
