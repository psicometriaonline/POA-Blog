import { Link } from "wouter";
import { SiInstagram, SiLinkedin, SiYoutube, SiWhatsapp } from "react-icons/si";
import footerLogo from "@assets/Psicometria_Online_01_1771737360189.png";

const whatsappUrl = "https://wa.me/5516981060218?text=Estou%20no%20blog%20de%20voc%C3%AAs%2C%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida.";

export function BlogFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white text-gray-500 py-12 border-t border-gray-200" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <img src={footerLogo} alt="Psicometria Online" className="h-10 w-auto" data-testid="img-footer-logo" />
            <p className="text-sm leading-relaxed">
              Maior portal de conteúdo sobre psicometria, análise de dados e pesquisa quantitativa da América Latina.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://instagram.com/psicometriaonline" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#000A24] transition-colors" data-testid="link-footer-instagram">
                <SiInstagram className="h-5 w-5" />
              </a>
              <a href="https://br.linkedin.com/company/psicometriaonline" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#000A24] transition-colors" data-testid="link-footer-linkedin">
                <SiLinkedin className="h-5 w-5" />
              </a>
              <a href="https://www.youtube.com/c/psicometriaonline?sub_confirmation=1" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#000A24] transition-colors" data-testid="link-footer-youtube">
                <SiYoutube className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[#000A24] font-bold text-sm uppercase tracking-wider">Navegação</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-[#000A24] transition-colors">Home</Link>
              </li>
              <li>
                <Link href="/busca" className="hover:text-[#000A24] transition-colors">Buscar Artigos</Link>
              </li>
              <li>
                <Link href="/categorias" className="hover:text-[#000A24] transition-colors">Categorias</Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-[#000A24] font-bold text-sm uppercase tracking-wider">Formação</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://academy.psicometriaonline.com.br" target="_blank" rel="noopener noreferrer" className="hover:text-[#000A24] transition-colors font-medium text-[#31D5FF]">Psicometria Online Academy</a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-[#000A24] font-bold text-sm uppercase tracking-wider">Suporte</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366] text-white text-sm font-medium hover:bg-[#1da851] transition-colors"
                  data-testid="link-footer-whatsapp"
                >
                  <SiWhatsapp className="h-4 w-4" />
                  Fale Conosco
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400">
          <p>© {currentYear} Psicometria Online. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-[#000A24] transition-colors">Políticas de Privacidade</a>
            <a href="#" className="hover:text-[#000A24] transition-colors">Termos de Uso</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
