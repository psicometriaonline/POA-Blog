import { Link } from "wouter";
import { SiInstagram, SiLinkedin, SiYoutube, SiWhatsapp } from "react-icons/si";
import footerLogo from "@assets/Psicometria_Online_01_1771737360189.png";

const whatsappUrl = "https://wa.me/5516981060218?text=Estou%20no%20blog%20de%20voc%C3%AAs%2C%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida.";

export function BlogFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#000A24] border-t border-white/10" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4">
        <div className="py-16 grid grid-cols-1 md:grid-cols-12 gap-12">

          <div className="md:col-span-5 space-y-6">
            <img src={footerLogo} alt="Psicometria Online" className="h-12 w-auto brightness-0 invert" data-testid="img-footer-logo" />
            <p className="text-white/50 text-sm leading-relaxed max-w-sm">
              Maior portal de conteúdo sobre psicometria, análise de dados e pesquisa quantitativa da América Latina.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com/psicometriaonline"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center h-9 w-9 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                data-testid="link-footer-instagram"
              >
                <SiInstagram className="h-4 w-4" />
              </a>
              <a
                href="https://br.linkedin.com/company/psicometriaonline"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center h-9 w-9 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                data-testid="link-footer-linkedin"
              >
                <SiLinkedin className="h-4 w-4" />
              </a>
              <a
                href="https://www.youtube.com/c/psicometriaonline?sub_confirmation=1"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center h-9 w-9 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                data-testid="link-footer-youtube"
              >
                <SiYoutube className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="md:col-span-2 space-y-5">
            <h3 className="text-[#31D5FF] font-semibold text-xs uppercase tracking-widest">Navegação</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/" className="text-white/50 hover:text-[#31D5FF] transition-colors">Home</Link>
              </li>
              <li>
                <Link href="/busca" className="text-white/50 hover:text-[#31D5FF] transition-colors">Buscar Artigos</Link>
              </li>
              <li>
                <Link href="/categorias" className="text-white/50 hover:text-[#31D5FF] transition-colors">Categorias</Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-5">
            <h3 className="text-[#31D5FF] font-semibold text-xs uppercase tracking-widest">Formação</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="https://academy.psicometriaonline.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/50 hover:text-[#31D5FF] transition-colors"
                >
                  Psicometria Online Academy
                </a>
              </li>
              <li>
                <a
                  href="https://quantidados.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/50 hover:text-[#31D5FF] transition-colors"
                >
                  Consultoria
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-5">
            <h3 className="text-[#31D5FF] font-semibold text-xs uppercase tracking-widest">Suporte</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-white/50 hover:text-[#31D5FF] transition-colors"
                  data-testid="link-footer-whatsapp"
                >
                  <SiWhatsapp className="h-4 w-4" />
                  Fale Conosco via WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/30">
          <p>© {currentYear} Psicometria Online. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white/60 transition-colors">Políticas de Privacidade</a>
            <a href="#" className="hover:text-white/60 transition-colors">Termos de Uso</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
