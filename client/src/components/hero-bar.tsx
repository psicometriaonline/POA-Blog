import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { ExternalLink, Loader2 } from "lucide-react";
import DOMPurify from "dompurify";
import { trackEvent } from "@/lib/meta-pixel";
import { apiRequest } from "@/lib/queryClient";
import logoUrl from "@assets/Psicometria_Online_01_1771737360189.png";

const leadSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome"),
  email: z.string().trim().email("E-mail inválido"),
});

type LeadForm = z.infer<typeof leadSchema>;

export function HeroBar({ showHeadline = true, settings = {} }: { showHeadline?: boolean; settings?: Record<string, string> }) {
  const headlineHtml = settings["hero_headline_html"] || 'O seu <span style="color:#31D5FF;font-weight:bold">Blog</span> de Psicometria';
  const subheadline = settings["hero_subheadline"] || "Recursos de aprendizagem em psicometria e análises quantitativas";
  const ctaEnabled = settings["hero_form_enabled"] !== "false";
  const heroMode = settings["hero_mode"] || "form";
  const ctaText = settings["hero_form_cta_text"] || 'Cadastre-se gratuitamente na Psicometria Online Academy e tenha acesso a todos os nossos cursos, recursos e ferramentas estatísticas';
  const buttonText = settings["hero_button_text"] || "Fazer cadastro agora";
  const buttonColor = settings["hero_button_color"] || "#31D5FF";
  const buttonTextColor = settings["hero_button_text_color"] || "#000A24";
  const buttonUrl = settings["hero_button_url"] || "https://academy.psicometriaonline.com.br";

  const [successOpen, setSuccessOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const form = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: { name: "", email: "" },
  });

  const onSubmit = async (values: LeadForm) => {
    setSubmitError("");
    try {
      const res = await apiRequest("POST", "/api/hero-lead", values);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Não foi possível concluir o cadastro.");
      }
      trackEvent("Lead", { content_name: "Hero Form" });
      form.reset();
      setSuccessOpen(true);
    } catch (err: any) {
      setSubmitError(err?.message || "Não foi possível concluir o cadastro. Tente novamente.");
    }
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

          {ctaEnabled && heroMode === "form" && (
            <div className="max-w-2xl mx-auto">
              <p
                className="text-white/80 text-sm mb-6 text-center"
                data-testid="text-hero-cta"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ctaText, { ALLOWED_TAGS: ["span", "strong", "em", "b", "i"], ALLOWED_ATTR: ["style", "class"] }) }}
              />
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-3 items-start justify-center">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="w-full sm:flex-1 text-left">
                        <FormControl>
                          <Input
                            placeholder="Seu nome"
                            className="bg-white text-foreground border-transparent h-11"
                            data-testid="input-hero-lead-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-300" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="w-full sm:flex-1 text-left">
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Seu melhor e-mail"
                            className="bg-white text-foreground border-transparent h-11"
                            data-testid="input-hero-lead-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-300" />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="border-transparent h-11 px-8 text-base font-semibold w-full sm:w-auto"
                    style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                    disabled={form.formState.isSubmitting}
                    data-testid="button-hero-lead-submit"
                  >
                    {form.formState.isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {buttonText}
                  </Button>
                </form>
              </Form>
              {submitError && (
                <p className="text-red-300 text-sm mt-3" data-testid="text-hero-lead-error">{submitError}</p>
              )}
            </div>
          )}

          {ctaEnabled && heroMode !== "form" && (
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

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-sm text-center" data-testid="dialog-hero-lead-success">
          <div className="flex flex-col items-center gap-4 py-2">
            <img src={logoUrl} alt="Psicometria Online" className="h-12 w-auto object-contain" data-testid="img-hero-lead-logo" />
            <p className="text-lg font-semibold" data-testid="text-hero-lead-success">Cadastro realizado com sucesso.</p>
            <Button onClick={() => setSuccessOpen(false)} data-testid="button-hero-lead-close">Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
