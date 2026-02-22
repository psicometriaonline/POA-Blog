import { Link, useLocation } from "wouter";
import { Search, Menu, X, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useState, useRef, useEffect } from "react";
import type { Category } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import logoImg from "@assets/psicometria_online_negativopng_1771733729541.png";

export interface MenuItem {
  label: string;
  url: string;
  children?: MenuItem[];
}

export function BlogHeader() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/busca?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setSearchOpen(false);
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

            {navItems.map((item, idx) => (
              <NavItem key={idx} item={item} onNavigate={() => {}} />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="hidden lg:flex items-center">
                <div className="relative">
                  <Input
                    ref={searchInputRef}
                    type="search"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 w-48 h-9 pr-8 rounded-full text-sm"
                    data-testid="input-header-search"
                  />
                  <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            ) : (
              <button
                className="hidden lg:flex items-center justify-center h-9 w-9 rounded-full text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                onClick={() => setSearchOpen(true)}
                data-testid="button-search-toggle"
              >
                <Search className="h-4 w-4" />
              </button>
            )}

            {user && (
              <Link href="/admin">
                <button
                  className="hidden lg:inline-flex items-center px-5 py-2 text-sm text-white/90 hover:text-white rounded-full border border-white/20 hover:border-white/40 transition-colors"
                  data-testid="link-admin"
                >
                  Admin
                </button>
              </Link>
            )}

            <Link href="/busca">
              <button
                className="hidden lg:inline-flex items-center px-5 py-2 text-sm text-white/90 hover:text-white rounded-full border border-white/20 hover:border-white/40 transition-colors"
                data-testid="link-entrar"
              >
                Buscar
              </button>
            </Link>

            <a href="https://academy.psicometriaonline.com.br" target="_blank" rel="noopener noreferrer">
              <button
                className="hidden lg:inline-flex items-center px-5 py-2 text-sm font-medium rounded-full transition-colors"
                style={{ backgroundColor: "#31D5FF", color: "#000A24" }}
                data-testid="link-academy"
              >
                Academy
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
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Input
                  type="search"
                  placeholder="Buscar..."
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
              {navItems.map((item, idx) => (
                <MobileNavItem key={idx} item={item} onNavigate={() => setMobileMenuOpen(false)} />
              ))}

              <div className="border-t border-white/10 mt-2 pt-2">
                <p className="text-xs text-white/40 px-3 mb-1.5 uppercase tracking-wider">Categorias</p>
                {cats.map((cat) => (
                  <Link key={cat.id} href={`/categoria/${cat.slug}`} onClick={() => setMobileMenuOpen(false)}>
                    <div className="px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                      {cat.name}
                    </div>
                  </Link>
                ))}
              </div>

              <div className="border-t border-white/10 mt-2 pt-3 flex flex-col gap-2">
                {user && (
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <div className="text-center py-2.5 text-sm text-white/90 rounded-full border border-white/20">
                      Admin
                    </div>
                  </Link>
                )}
                <a href="https://academy.psicometriaonline.com.br" target="_blank" rel="noopener noreferrer">
                  <div
                    className="text-center py-2.5 text-sm font-medium rounded-full"
                    style={{ backgroundColor: "#31D5FF", color: "#000A24" }}
                  >
                    Academy
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
