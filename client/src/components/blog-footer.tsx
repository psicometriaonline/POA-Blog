import { Link } from "wouter";
import { SiInstagram, SiLinkedin, SiYoutube, SiWhatsapp } from "react-icons/si";
import footerLogo from "@assets/Psicometria_Online_01_1771737360189.png";
import { useQuery } from "@tanstack/react-query";

interface FooterLink {
  label: string;
  url: string;
}

interface FooterSettings {
  footer_description?: string;
  footer_instagram_url?: string;
  footer_linkedin_url?: string;
  footer_youtube_url?: string;
  footer_whatsapp_number?: string;
  footer_whatsapp_message?: string;
  footer_formation_links?: string;
  footer_support_links?: string;
}

export function BlogFooter() {
  const currentYear = new Date().getFullYear();
  const { data: footerSettings } = useQuery<FooterSettings>({
    queryKey: ["/api/settings"],
  });

  const description = footerSettings?.footer_description || "Maior portal de conteúdo sobre psicometria, análise de dados e pesquisa quantitativa da América Latina.";
  const instagramUrl = footerSettings?.footer_instagram_url || "https://instagram.com/psicometriaonline";
  const linkedinUrl = footerSettings?.footer_linkedin_url || "https://br.linkedin.com/company/psicometriaonline";
  const youtubeUrl = footerSettings?.footer_youtube_url || "https://www.youtube.com/c/psicometriaonline?sub_confirmation=1";
  const whatsappNumber = footerSettings?.footer_whatsapp_number || "5516981060218";
  const whatsappMessage = footerSettings?.footer_whatsapp_message || "Estou no blog de vocês, e gostaria de tirar uma dúvida.";
  
  let formationLinks: FooterLink[] = [];
  let supportLinks: FooterLink[] = [];
  
  try {
    if (footerSettings?.footer_formation_links) {
      formationLinks = JSON.parse(footerSettings.footer_formation_links);
    } else {
      formationLinks = [
        { label: "Psicometria Online Academy", url: "https://academy.psicometriaonline.com.br" },
        { label: "Consultoria", url: "https://quantidados.com.br" },
      ];
    }
  } catch {
    formationLinks = [
      { label: "Psicometria Online Academy", url: "https://academy.psicometriaonline.com.br" },
      { label: "Consultoria", url: "https://quantidados.com.br" },
    ];
  }

  try {
    if (footerSettings?.footer_support_links) {
      supportLinks = JSON.parse(footerSettings.footer_support_links);
    } else {
      supportLinks = [
        { label: "Fale Conosco via WhatsApp", url: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}` },
      ];
    }
  } catch {
    supportLinks = [
      { label: "Fale Conosco via WhatsApp", url: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}` },
    ];
  }

  return (
    <footer className="bg-[#000A24] border-t border-white/10" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4">
        <div className="py-16 grid grid-cols-1 md:grid-cols-12 gap-12">

          <div className="md:col-span-5 space-y-6">
            <img src={footerLogo} alt="Psicometria Online" className="h-12 w-auto brightness-0 invert" data-testid="img-footer-logo" />
            <p className="text-white/50 text-sm leading-relaxed max-w-sm">
              {description}
            </p>
            <div className="flex items-center gap-3">
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-9 w-9 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                  data-testid="link-footer-instagram"
                >
                  <SiInstagram className="h-4 w-4" />
                </a>
              )}
              {linkedinUrl && (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-9 w-9 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                  data-testid="link-footer-linkedin"
                >
                  <SiLinkedin className="h-4 w-4" />
                </a>
              )}
              {youtubeUrl && (
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-9 w-9 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                  data-testid="link-footer-youtube"
                >
                  <SiYoutube className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <div className="md:col-span-2 space-y-5">
            <h3 className="text-[#31D5FF] font-semibold text-xs uppercase tracking-widest">Navegação</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/" className="text-white/50 hover:text-[#31D5FF] transition-colors">Home</Link>
              </li>
              <li>
                <Link href="/busca" className="text-white/50 hover:text-[#31D5FF] transition-colors" onClick={() => window.scrollTo(0, 0)}>Buscar Posts</Link>
              </li>
              <li>
                <Link href="/categoria/geral" className="text-white/50 hover:text-[#31D5FF] transition-colors">Categorias</Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-5">
            <h3 className="text-[#31D5FF] font-semibold text-xs uppercase tracking-widest">Formação</h3>
            <ul className="space-y-3 text-sm">
              {formationLinks.map((link, idx) => (
                <li key={idx}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-[#31D5FF] transition-colors"
                    data-testid={`link-footer-formation-${idx}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3 space-y-5">
            <h3 className="text-[#31D5FF] font-semibold text-xs uppercase tracking-widest">Suporte</h3>
            <ul className="space-y-3 text-sm">
              {supportLinks.map((link, idx) => (
                <li key={idx}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-white/50 hover:text-[#31D5FF] transition-colors"
                    data-testid={idx === 0 ? "link-footer-whatsapp" : `link-footer-support-${idx}`}
                  >
                    <SiWhatsapp className="h-4 w-4" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/30">
          <p>© {currentYear} Psicometria Online. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6">
            <Link href="/quem-somos" onClick={() => window.scrollTo(0, 0)} className="hover:text-white/60 transition-colors" data-testid="link-footer-about">Quem Somos</Link>
            <Link href="/politicas-de-privacidade" onClick={() => window.scrollTo(0, 0)} className="hover:text-white/60 transition-colors" data-testid="link-footer-privacy">Políticas de Privacidade</Link>
            <Link href="/termos-de-uso" onClick={() => window.scrollTo(0, 0)} className="hover:text-white/60 transition-colors" data-testid="link-footer-terms">Termos de Uso</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
