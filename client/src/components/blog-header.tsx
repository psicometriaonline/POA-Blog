import { Link, useLocation } from "wouter";
import { Search, Menu, X, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import type { Category } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import logoImg from "@assets/psicometria_online_negativopng_1771733729541.png";

export interface MenuItem {
  label: string;
  url: string;
  children?: MenuItem[];
}

const materiaisGratuitos = [
  { label: "Glossário de Análise Fatorial Exploratória", url: "https://psicometriaonline.com.br/glossario-afe-blog" },
  { label: "Glossário Análises Bi e Multivariadas", url: "https://psicometriaonline.com.br/analises-bi-e-multivariadas-blog/" },
  { label: "Escrita Científica de Alto Impacto", url: "https://psicometriaonline.com.br/escrita-cientifica-blog/" },
  { label: "Profissão Psicometrista", url: "https://psicometriaonline.com.br/profissao-psicometrista-blog/" },
];

export function BlogHeader() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [materiaisOpen, setMateriaisOpen] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const materiaisRef = useRef<HTMLDivElement>(null);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: menuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/busca?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const navItems = menuItems || [];
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

            {navItems.map((item, idx) => (
              <NavItem key={idx} item={item} onNavigate={() => {}} />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="hidden lg:flex items-center">
              <div className="relative">
                <Input
                  type="search"
                  placeholder="BUSCAR"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-white/30 text-white placeholder:text-white/50 w-48 h-9 pr-9 rounded-full text-sm"
                  data-testid="input-header-search"
                />
                <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>

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
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Input
                  type="search"
                  placeholder="BUSCAR"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 w-full pr-9 rounded-full"
                  data-testid="input-mobile-search"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>

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

              <MobileDropdown
                label="Materiais Gratuitos"
                items={materiaisGratuitos}
                onNavigate={() => setMobileMenuOpen(false)}
              />

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

              {navItems.map((item, idx) => (
                <MobileNavItem key={idx} item={item} onNavigate={() => setMobileMenuOpen(false)} />
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

function NavItem({ item, onNavigate }: { item: MenuItem; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (item.children && item.children.length > 0) {
    return (
      <div className="relative" ref={ref}>
        <button
          className="flex items-center gap-1 px-3 py-2 text-sm text-white/80 hover:text-white transition-colors rounded-full hover:bg-white/5"
          onClick={() => setOpen(!open)}
          data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {item.label}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div
            className="absolute top-full left-0 mt-2 min-w-48 rounded-xl shadow-2xl border border-white/10 py-2 z-50"
            style={{ backgroundColor: "#0a1535" }}
          >
            {item.children.map((child, idx) => (
              <a
                key={idx}
                href={child.url}
                target={child.url.startsWith("http") ? "_blank" : undefined}
                rel={child.url.startsWith("http") ? "noopener noreferrer" : undefined}
                className="block px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                onClick={() => { setOpen(false); onNavigate(); }}
                data-testid={`nav-sub-${child.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {child.label}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  const isExternal = item.url.startsWith("http");
  if (isExternal) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer">
        <button
          className="px-3 py-2 text-sm text-white/80 hover:text-white transition-colors rounded-full hover:bg-white/5"
          data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {item.label}
        </button>
      </a>
    );
  }

  return (
    <Link href={item.url} onClick={onNavigate}>
      <button
        className="px-3 py-2 text-sm text-white/80 hover:text-white transition-colors rounded-full hover:bg-white/5"
        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {item.label}
      </button>
    </Link>
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

function MobileNavItem({ item, onNavigate }: { item: MenuItem; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);

  if (item.children && item.children.length > 0) {
    return (
      <div>
        <button
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          onClick={() => setOpen(!open)}
        >
          {item.label}
          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
        </button>
        {open && (
          <div className="ml-3 border-l border-white/10 pl-3">
            {item.children.map((child, idx) => {
              const isExternal = child.url.startsWith("http");
              if (isExternal) {
                return (
                  <a key={idx} href={child.url} target="_blank" rel="noopener noreferrer" onClick={onNavigate}>
                    <div className="px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                      {child.label}
                    </div>
                  </a>
                );
              }
              return (
                <Link key={idx} href={child.url} onClick={onNavigate}>
                  <div className="px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    {child.label}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const isExternal = item.url.startsWith("http");
  if (isExternal) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={onNavigate}>
        <div className="px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          {item.label}
        </div>
      </a>
    );
  }

  return (
    <Link href={item.url} onClick={onNavigate}>
      <div className="px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
        {item.label}
      </div>
    </Link>
  );
}
