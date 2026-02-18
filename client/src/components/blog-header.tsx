import { Link, useLocation } from "wouter";
import { Search, Menu, X, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useState, useRef, useEffect } from "react";
import type { Category } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import logoImg from "@assets/vertical_color_1771451634914.png";

export interface MenuItem {
  label: string;
  url: string;
  children?: MenuItem[];
}

export function BlogHeader() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);

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

  const navItems = menuItems || [];

  return (
    <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: "hsl(220 30% 15%)" }}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4 h-14">
          <div className="flex items-center gap-6">
            <Link href="/" data-testid="link-home">
              <img
                src={logoImg}
                alt="Psicometria Online"
                className="h-8 w-auto"
                data-testid="img-logo"
              />
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item, idx) => (
                <NavItem key={idx} item={item} onNavigate={() => {}} />
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="text-white border-white/20 hover:bg-white/10" data-testid="link-admin">
                  Admin
                </Button>
              </Link>
            )}

            <Button
              size="icon"
              variant="ghost"
              className="lg:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 border-t border-white/10 pt-3">
            <nav className="flex flex-col gap-1">
              {navItems.map((item, idx) => (
                <MobileNavItem key={idx} item={item} onNavigate={() => setMobileMenuOpen(false)} />
              ))}

              <div className="border-t border-white/10 mt-2 pt-2">
                <p className="text-xs text-white/50 px-3 mb-2">Categorias</p>
                {categories?.map((cat) => (
                  <Link key={cat.id} href={`/categoria/${cat.slug}`} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-white/80">
                      {cat.name}
                    </Button>
                  </Link>
                ))}
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
        <Button
          variant="ghost"
          size="sm"
          className="text-white/80 hover:text-white hover:bg-white/10 text-sm"
          onClick={() => setOpen(!open)}
          data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {item.label}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
        {open && (
          <div className="absolute top-full left-0 mt-1 min-w-48 rounded-md shadow-lg border" style={{ backgroundColor: "hsl(220 30% 18%)", borderColor: "hsl(220 20% 25%)" }}>
            {item.children.map((child, idx) => (
              <a
                key={idx}
                href={child.url}
                target={child.url.startsWith("http") ? "_blank" : undefined}
                rel={child.url.startsWith("http") ? "noopener noreferrer" : undefined}
                className="block px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 first:rounded-t-md last:rounded-b-md"
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
        <Button
          variant="ghost"
          size="sm"
          className="text-white/80 hover:text-white hover:bg-white/10 text-sm"
          data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {item.label}
        </Button>
      </a>
    );
  }

  return (
    <Link href={item.url} onClick={onNavigate}>
      <Button
        variant="ghost"
        size="sm"
        className="text-white/80 hover:text-white hover:bg-white/10 text-sm"
        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {item.label}
      </Button>
    </Link>
  );
}

function MobileNavItem({ item, onNavigate }: { item: MenuItem; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);

  if (item.children && item.children.length > 0) {
    return (
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-white/80"
          onClick={() => setOpen(!open)}
        >
          {item.label}
          <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} />
        </Button>
        {open && (
          <div className="ml-4">
            {item.children.map((child, idx) => {
              const isExternal = child.url.startsWith("http");
              if (isExternal) {
                return (
                  <a key={idx} href={child.url} target="_blank" rel="noopener noreferrer" onClick={onNavigate}>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-white/60 text-sm">
                      {child.label}
                    </Button>
                  </a>
                );
              }
              return (
                <Link key={idx} href={child.url} onClick={onNavigate}>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-white/60 text-sm">
                    {child.label}
                  </Button>
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
        <Button variant="ghost" size="sm" className="w-full justify-start text-white/80">
          {item.label}
        </Button>
      </a>
    );
  }

  return (
    <Link href={item.url} onClick={onNavigate}>
      <Button variant="ghost" size="sm" className="w-full justify-start text-white/80">
        {item.label}
      </Button>
    </Link>
  );
}
