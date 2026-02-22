import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown, ChevronRight, Search } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { Category } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import logoImg from "@assets/psicometria_online_negativopng_1771733729541.png";

const materiaisGratuitos = [
  { label: "Glossário de Análise Fatorial Exploratória", url: "https://psicometriaonline.com.br/glossario-afe-blog" },
  { label: "Glossário Análises Bi e Multivariadas", url: "https://psicometriaonline.com.br/analises-bi-e-multivariadas-blog/" },
  { label: "Escrita Científica de Alto Impacto", url: "https://psicometriaonline.com.br/escrita-cientifica-blog/" },
  { label: "Profissão Psicometrista", url: "https://psicometriaonline.com.br/profissao-psicometrista-blog/" },
];

export function BlogHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [materiaisOpen, setMateriaisOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  const categoriesRef = useRef<HTMLDivElement>(null);
  const materiaisRef = useRef<HTMLDivElement>(null);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (categoriesRef.current && !categoriesRef.current.contains(e.target as Node)) {
        setCategoriesOpen(false);
      }
      if (materiaisRef.current && !materiaisRef.current.contains(e.target as Node)) {
        setMateriaisOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const cats = categories || [];

  return (
    <header className="sticky top-0 z-50" style={{ backgroundColor: "#000A24" }}>
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div
          className="flex items-center justify-between gap-2 px-6 h-14 rounded-full border border-white/10"
          style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
        >
          <Link href="/" data-testid="link-home" className="flex-shrink-0">
            <img
              src={logoImg}
              alt="Psicometria Online"
              className="h-7 w-auto"
              data-testid="img-logo"
            />
          </Link>

          <nav className="hidden xl:flex items-center gap-1">
            <div className="relative" ref={categoriesRef}>
              <button
                className="flex items-center gap-1 px-3 py-2 text-sm text-white/80 hover:text-white transition-colors rounded-full hover:bg-white/5"
                onClick={() => setCategoriesOpen(!categoriesOpen)}
                data-testid="nav-categorias"
              >
                Categorias
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${categoriesOpen ? "rotate-180" : ""}`} />
              </button>
              {categoriesOpen && (
                <div
                  className="absolute top-full left-0 mt-2 min-w-56 rounded-xl shadow-2xl border border-white/10 py-2 z-50"
                  style={{ backgroundColor: "#0a1535" }}
                >
                  {cats.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/categoria/${cat.slug}`}
                      onClick={() => setCategoriesOpen(false)}
                    >
                      <div
                        className="block px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
                        data-testid={`nav-cat-${cat.id}`}
                      >
                        {cat.name}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <a href="https://academy.psicometriaonline.com.br" target="_blank" rel="noopener noreferrer">
              <button
                className="px-3 py-2 text-sm text-white/80 hover:text-white transition-colors rounded-full hover:bg-white/5"
                data-testid="nav-academy"
              >
                Psicometria Online Academy
              </button>
            </a>

            <a href="https://quantidados.com.br" target="_blank" rel="noopener noreferrer">
              <button
                className="px-3 py-2 text-sm text-white/80 hover:text-white transition-colors rounded-full hover:bg-white/5"
                data-testid="nav-consultoria"
              >
                Consultoria
              </button>
            </a>

            <div className="relative" ref={materiaisRef}>
              <button
                className="flex items-center gap-1 px-3 py-2 text-sm text-white/80 hover:text-white transition-colors rounded-full hover:bg-white/5"
                onClick={() => setMateriaisOpen(!materiaisOpen)}
                data-testid="nav-materiais-gratuitos"
              >
                Materiais Gratuitos
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${materiaisOpen ? "rotate-180" : ""}`} />
              </button>
              {materiaisOpen && (
                <div
                  className="absolute top-full left-0 mt-2 min-w-72 rounded-xl shadow-2xl border py-2 z-50"
                  style={{ backgroundColor: "#e8f7fc", borderColor: "#b8e8f5" }}
                >
                  {materiaisGratuitos.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-5 py-3 text-sm text-gray-800 hover:bg-white/60 cursor-pointer transition-colors"
                      style={{ borderBottom: idx < materiaisGratuitos.length - 1 ? "1px solid #d0edf5" : "none" }}
                      onClick={() => setMateriaisOpen(false)}
                      data-testid={`nav-material-${idx}`}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <form
              className="hidden xl:flex items-center gap-0 rounded-full border border-white/15 bg-white/5 overflow-hidden"
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  navigate(`/busca?q=${encodeURIComponent(searchQuery.trim())}`);
                  setSearchQuery("");
                }
              }}
              data-testid="form-header-search"
            >
              <button
                type="submit"
                className="flex items-center justify-center h-9 w-9 text-white/50 hover:text-white transition-colors flex-shrink-0"
                data-testid="button-header-search"
              >
                <Search className="h-4 w-4" />
              </button>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="bg-transparent text-sm text-white placeholder:text-white/40 outline-none border-none h-9 w-36 pr-3"
                data-testid="input-header-search"
              />
            </form>

            <a href="https://academy.psicometriaonline.com.br" target="_blank" rel="noopener noreferrer" className="hidden xl:block">
              <button
                className="inline-flex items-center px-5 py-2 text-sm font-medium rounded-full transition-colors"
                style={{ backgroundColor: "#31D5FF", color: "#000A24" }}
                data-testid="button-criar-conta"
              >
                Criar conta
              </button>
            </a>

            <button
              className="xl:hidden flex items-center justify-center h-9 w-9 rounded-full text-white/80 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            className="xl:hidden mt-2 rounded-2xl border border-white/10 p-4"
            style={{ backgroundColor: "#0a1535" }}
          >
            <nav className="flex flex-col gap-0.5">
              <div className="border-b border-white/10 pb-2 mb-1">
                <p className="text-xs text-white/40 px-3 mb-1.5 uppercase tracking-wider">Categorias</p>
                {cats.map((cat) => (
                  <Link key={cat.id} href={`/categoria/${cat.slug}`} onClick={() => setMobileMenuOpen(false)}>
                    <div className="px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                      {cat.name}
                    </div>
                  </Link>
                ))}
              </div>

              <a href="https://academy.psicometriaonline.com.br" target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                  Psicometria Online Academy
                </div>
              </a>

              <a href="https://quantidados.com.br" target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)}>
                <div className="px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                  Consultoria
                </div>
              </a>

              <MobileDropdown
                label="Materiais Gratuitos"
                items={materiaisGratuitos}
                onNavigate={() => setMobileMenuOpen(false)}
              />

              <div className="border-t border-white/10 mt-2 pt-3 flex flex-col gap-2">
                <form
                  className="flex items-center gap-0 rounded-full border border-white/15 bg-white/5 overflow-hidden"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      navigate(`/busca?q=${encodeURIComponent(searchQuery.trim())}`);
                      setSearchQuery("");
                      setMobileMenuOpen(false);
                    }
                  }}
                  data-testid="form-mobile-search"
                >
                  <button
                    type="submit"
                    className="flex items-center justify-center h-10 w-10 text-white/50 hover:text-white transition-colors flex-shrink-0"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar..."
                    className="bg-transparent text-sm text-white placeholder:text-white/40 outline-none border-none h-10 w-full pr-3"
                    data-testid="input-mobile-search"
                  />
                </form>
                <a href="https://academy.psicometriaonline.com.br" target="_blank" rel="noopener noreferrer">
                  <div
                    className="text-center py-2.5 text-sm font-medium rounded-full"
                    style={{ backgroundColor: "#31D5FF", color: "#000A24" }}
                  >
                    Criar conta
                  </div>
                </a>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

function MobileDropdown({ label, items, onNavigate }: { label: string; items: { label: string; url: string }[]; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        onClick={() => setOpen(!open)}
      >
        {label}
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="ml-3 border-l border-white/10 pl-3">
          {items.map((item, idx) => (
            <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" onClick={onNavigate}>
              <div className="px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                {item.label}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
