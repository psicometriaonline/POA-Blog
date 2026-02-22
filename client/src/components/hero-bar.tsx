import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function HeroBar({ showHeadline = true, settings = {} }: { showHeadline?: boolean; settings?: Record<string, string> }) {
  const headline = settings["hero_headline"] || "O seu Blog de Psicometria";
  const subheadline = settings["hero_subheadline"] || "Tenha acesso a nossa enciclopedia virtual de conhecimento em Psicometria e Analise de Dados";

  if (!showHeadline) return null;

  return (
    <section className="bg-dark-bg" data-testid="section-hero">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center py-8 md:py-12">
          <h1 className="font-serif text-2xl md:text-3xl font-bold mb-3 text-white" data-testid="text-hero-title">
            {headline.includes("Blog") ? (
              <>
                O seu <span className="text-accent-bright">Blog</span> de Psicometria
              </>
            ) : (
              headline
            )}
          </h1>
          <p className="text-white/70 text-base md:text-lg mb-8 max-w-2xl mx-auto" data-testid="text-hero-subtitle">{subheadline}</p>

          <div className="max-w-4xl mx-auto">
            <p className="text-white/80 text-sm mb-4 text-left">
              Junte-se a mais de <span className="text-accent-bright font-semibold">22.300</span> membros e receba conteudos exclusivos e com prioridade
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="text"
                placeholder="Seu primeiro nome"
                className="bg-white text-foreground placeholder:text-muted-foreground flex-1"
                data-testid="input-hero-name"
              />
              <Input
                type="email"
                placeholder="Digite seu e-mail"
                className="bg-white text-foreground placeholder:text-muted-foreground flex-1"
                data-testid="input-hero-email"
              />
              <Button className="flex-shrink-0 bg-accent-bright text-accent-bright-foreground border-accent-bright" data-testid="button-hero-subscribe">
                Quero receber materiais gratuitos
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
