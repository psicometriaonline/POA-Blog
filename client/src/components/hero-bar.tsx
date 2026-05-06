import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import DOMPurify from "dompurify";
import { trackEvent } from "@/lib/meta-pixel";

export function HeroBar({ showHeadline = true, settings = {} }: { showHeadline?: boolean; settings?: Record<string, string> }) {
  const headlineHtml = settings["hero_headline_html"] || 'O seu <span style="color:#31D5FF;font-weight:bold">Blog</span> de Psicometria';
  const subheadline = settings["hero_subheadline"] || "Recursos de aprendizagem em psicometria e análises quantitativas";
  const ctaEnabled = settings["hero_form_enabled"] !== "false";
  const ctaText = settings["hero_form_cta_text"] || 'Cadastre-se gratuitamente na Psicometria Online Academy e tenha acesso a todos os nossos cursos, recursos e ferramentas estatísticas';
  const buttonText = settings["hero_button_text"] || "Fazer cadastro agora";
  const buttonColor = settings["hero_button_color"] || "#31D5FF";
  const buttonTextColor = settings["hero_button_text_color"] || "#000A24";
  const buttonUrl = settings["hero_button_url"] || "https://academy.psicometriaonline.com.br";

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

          {ctaEnabled && (
            <div className="max-w-4xl mx-auto">
              <p
                className="text-white/80 text-sm mb-6 text-center"
                data-testid="text-hero-cta"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ctaText, { ALLOWED_TAGS: ["span", "strong", "em", "b", "i"], ALLOWED_ATTR: ["style", "class"] }) }}
              />
              <a href={buttonUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("Lead", { content_name: "Hero CTA" })}>
                <Button
                  className="border-transparent px-8 py-3 text-base font-semibold"
                  style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                  data-testid="button-hero-cta"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {buttonText}
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
