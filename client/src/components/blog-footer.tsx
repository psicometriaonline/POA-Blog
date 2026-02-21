import { Link } from "wouter";
import { SiFacebook, SiInstagram, SiLinkedin, SiYoutube, SiWhatsapp } from "react-icons/si";

export function BlogFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#000A24] text-white/70 py-12 border-t border-white/5" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Coluna 1: Sobre */}
          <div className="space-y-4">
            <h3 className="text-white font-serif text-lg font-bold">Psicometria Online</h3>
            <p className="text-sm leading-relaxed">
              Maior portal de conteúdo sobre psicometria, análise de dados e pesquisa quantitativa em língua portuguesa.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent-bright transition-colors" data-testid="link-footer-facebook">
                <SiFacebook className="h-5 w-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent-bright transition-colors" data-testid="link-footer-instagram">
                <SiInstagram className="h-5 w-5" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent-bright transition-colors" data-testid="link-footer-linkedin">
                <SiLinkedin className="h-5 w-5" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent-bright transition-colors" data-testid="link-footer-youtube">
                <SiYoutube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Coluna 2: Links Rápidos */}
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Navegação</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link href="/busca" className="hover:text-white transition-colors">Buscar Artigos</Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white transition-colors">Área do Autor</Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Academy */}
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Formação</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-white transition-colors font-medium text-accent-bright">Psicometria Online Academy</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">Cursos Gratuitos</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">Certificações</a>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Contato */}
          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Suporte</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <SiWhatsapp className="h-4 w-4" />
                <a href="#" className="hover:text-white transition-colors">Fale Conosco</a>
              </li>
              <li>
                <a href="mailto:contato@psicometrionline.com.br" className="hover:text-white transition-colors">E-mail de Suporte</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>© {currentYear} Psicometria Online. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition-colors">Políticas de Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
