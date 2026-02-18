import { Link, useLocation } from "wouter";
import { Search, Menu as MenuIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import type { Category } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

export function HeroBar({ showHeadline = false, settings = {} }: { showHeadline?: boolean; settings?: Record<string, string> }) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const cats = categories || [];

  const headline = settings["hero_headline"] || "O seu Blog de Psicometria";
  const subheadline = settings["hero_subheadline"] || "Tenha acesso a nossa enciclopedia virtual de conhecimento em Psicometria e Analise de Dados";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatDropdownOpen(false);
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

  return (
    <section className="bg-dark-bg" data-testid="section-hero">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="relative" ref={catRef}>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => setCatDropdownOpen(!catDropdownOpen)}
              data-testid="button-hero-categories"
            >
              <MenuIcon className="h-4 w-4 mr-2" />
              CATEGORIAS
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
            {catDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 min-w-56 rounded-md shadow-lg border border-white/10 z-50 bg-dark-bg">
                {cats.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/categoria/${cat.slug}`}
                    onClick={() => setCatDropdownOpen(false)}
                  >
                    <div className="block px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 first:rounded-t-md last:rounded-b-md cursor-pointer" data-testid={`hero-cat-${cat.id}`}>
                      {cat.name}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSearch} className="flex-shrink-0">
            <div className="relative">
              <Input
                type="search"
                placeholder="BUSCAR"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-white/30 text-white placeholder:text-white/50 w-48 sm:w-64 pr-9"
                data-testid="input-hero-search"
              />
              <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>

        {showHeadline && (
          <div className="text-center py-8 md:py-12">
            <h1 className="font-serif text-2xl md:text-3xl font-bold mb-3 text-white" data-testid="text-hero-title">
              {headline.includes("Blog") ? (
                <>
                  O seu <span className="text-accent-bright">Blog</span> de Psicometria
                </>
              ) : (
                headline
              )}
            </h1>
            <p className="text-white/70 text-base md:text-lg mb-8 max-w-2xl mx-auto" data-testid="text-hero-subtitle">{subheadline}</p>

            <div className="max-w-4xl mx-auto">
              <p className="text-white/80 text-sm mb-4 text-left">
                Junte-se a mais de <span className="text-accent-bright font-semibold">22.300</span> membros e receba conteudos exclusivos e com prioridade
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="text"
                  placeholder="Seu primeiro nome"
                  className="bg-white text-foreground placeholder:text-muted-foreground flex-1"
                  data-testid="input-hero-name"
                />
                <Input
                  type="email"
                  placeholder="Digite seu e-mail"
                  className="bg-white text-foreground placeholder:text-muted-foreground flex-1"
                  data-testid="input-hero-email"
                />
                <Button className="flex-shrink-0 bg-accent-bright text-accent-bright-foreground border-accent-bright" data-testid="button-hero-subscribe">
                  Quero receber materiais gratuitos
                </Button>
              </div>
            </div>
          </div>
        )}

        {!showHeadline && (
          <div className="pb-4">
            <div className="max-w-4xl mx-auto">
              <p className="text-white/80 text-sm mb-3">
                Junte-se a mais de <span className="text-accent-bright font-semibold">22.300</span> membros e receba conteudos exclusivos e com prioridade
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="text"
                  placeholder="Seu primeiro nome"
                  className="bg-white text-foreground placeholder:text-muted-foreground flex-1"
                  data-testid="input-hero-name"
                />
                <Input
                  type="email"
                  placeholder="Digite seu e-mail"
                  className="bg-white text-foreground placeholder:text-muted-foreground flex-1"
                  data-testid="input-hero-email"
                />
                <Button className="flex-shrink-0 bg-accent-bright text-accent-bright-foreground border-accent-bright" data-testid="button-hero-subscribe">
                  Quero receber materiais gratuitos
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
