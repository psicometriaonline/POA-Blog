import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown, ChevronRight, Search, Settings } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { Category } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import logoImg from "@assets/psicometria_online_negativopng_1771733729541.png";

interface MenuItem {
  label: string;
  url: string;
  children?: MenuItem[];
}

interface HeaderSettings {
  header_cta_text?: string;
  header_cta_url?: string;
}

export function BlogHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const categoriesRef = useRef<HTMLDivElement>(null);
  const menuRefsRef = useRef<Record<number, HTMLDivElement | null>>({});

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: menuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
  });

  const { data: headerSettings } = useQuery<HeaderSettings>({
    queryKey: ["/api/settings"],
  });

  const ctaText = headerSettings?.header_cta_text || "Criar conta";
  const ctaUrl = headerSettings?.header_cta_url || "https://academy.psicometriaonline.com.br";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (categoriesRef.current && !categoriesRef.current.contains(e.target as Node)) {
        setCategoriesOpen(false);
      }
      // Close open dropdowns
      Object.keys(menuRefsRef.current).forEach((key) => {
        const ref = menuRefsRef.current[parseInt(key)];
        if (ref && !ref.contains(e.target as Node)) {
          setOpenDropdowns((prev) => ({ ...prev, [parseInt(key)]: false }));
        }
      });
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
                  className="absolute top-full left-0 mt-2 rounded-xl shadow-2xl border border-white/10 py-2 z-50"
                  style={{ backgroundColor: "#0a1535", width: "28rem" }}
                >
                  <div className="grid grid-cols-2">
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
                </div>
              )}
            </div>

            {menuItems?.map((item, idx) => (
              <div key={idx}>
                {item.children ? (
                  <div
                    className="relative"
                    ref={(el) => {
                      if (el) menuRefsRef.current[idx] = el;
                    }}
                  >
                    <button
                      className="flex items-center gap-1 px-3 py-2 text-sm text-white/80 hover:text-white transition-colors rounded-full hover:bg-white/5"
                      onClick={() =>
                        setOpenDropdowns((prev) => ({
                          ...prev,
                          [idx]: !prev[idx],
                        }))
                      }
                      data-testid={`nav-menu-${idx}`}
                    >
                      {item.label}
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${
                          openDropdowns[idx] ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {openDropdowns[idx] && (
                      <div
                        className="absolute top-full left-0 mt-2 rounded-xl shadow-2xl border border-white/10 py-2 z-50 min-w-48"
                        style={{ backgroundColor: "#0a1535" }}
                      >
                        {item.children.map((child, childIdx) => {
                          const isExternal = child.url.startsWith("http");
                          return isExternal ? (
                            <a
                              key={childIdx}
                              href={child.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                setOpenDropdowns((prev) => ({
                                  ...prev,
                                  [idx]: false,
                                }))
                              }
                            >
                              <div className="block px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 cursor-pointer transition-colors">
                                {child.label}
                              </div>
                            </a>
                          ) : (
                            <Link
                              key={childIdx}
                              href={child.url}
                              onClick={() =>
                                setOpenDropdowns((prev) => ({
                                  ...prev,
                                  [idx]: false,
                                }))
                              }
                            >
                              <div className="block px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 cursor-pointer transition-colors">
                                {child.label}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : item.url.startsWith("http") ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={idx}
                  >
                    <button
                      className="px-3 py-2 text-sm text-white/80 hover:text-white transition-colors rounded-full hover:bg-white/5"
                      data-testid={`nav-menu-item-${idx}`}
                    >
                      {item.label}
                    </button>
                  </a>
                ) : (
                  <Link key={idx} href={item.url}>
                    <button
                      className="px-3 py-2 text-sm text-white/80 hover:text-white transition-colors rounded-full hover:bg-white/5"
                      data-testid={`nav-menu-item-${idx}`}
                    >
                      {item.label}
                    </button>
                  </Link>
                )}
              </div>
            ))}
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

            {user && (
              <a
                href="/admin"
                className="hidden xl:flex items-center justify-center h-9 w-9 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                data-testid="link-admin-panel"
                title="Painel Admin"
              >
                <Settings className="h-4.5 w-4.5" />
              </a>
            )}

            {ctaUrl.startsWith("http") ? (
              <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className="hidden xl:block">
                <button
                  className="inline-flex items-center px-5 py-2 text-sm font-medium rounded-full transition-colors"
                  style={{ backgroundColor: "#31D5FF", color: "#000A24" }}
                  data-testid="button-criar-conta"
                >
                  {ctaText}
                </button>
              </a>
            ) : (
              <Link href={ctaUrl} className="hidden xl:block">
                <button
                  className="inline-flex items-center px-5 py-2 text-sm font-medium rounded-full transition-colors"
                  style={{ backgroundColor: "#31D5FF", color: "#000A24" }}
                  data-testid="button-criar-conta"
                >
                  {ctaText}
                </button>
              </Link>
            )}

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

              {menuItems?.map((item, idx) => (
                <div key={idx}>
                  {item.children ? (
                    <MobileDropdown
                      label={item.label}
                      items={item.children}
                      onNavigate={() => setMobileMenuOpen(false)}
                    />
                  ) : item.url.startsWith("http") ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        {item.label}
                      </div>
                    </a>
                  ) : (
                    <Link
                      href={item.url}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        {item.label}
                      </div>
                    </Link>
                  )}
                </div>
              ))}

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
                {ctaUrl.startsWith("http") ? (
                  <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
                    <div
                      className="text-center py-2.5 text-sm font-medium rounded-full"
                      style={{ backgroundColor: "#31D5FF", color: "#000A24" }}
                    >
                      {ctaText}
                    </div>
                  </a>
                ) : (
                  <Link href={ctaUrl}>
                    <div
                      className="text-center py-2.5 text-sm font-medium rounded-full"
                      style={{ backgroundColor: "#31D5FF", color: "#000A24" }}
                    >
                      {ctaText}
                    </div>
                  </Link>
                )}
                {user && (
                  <a
                    href="/admin"
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    data-testid="link-admin-panel-mobile"
                  >
                    <Settings className="h-4 w-4" />
                    Painel Admin
                  </a>
                )}
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
