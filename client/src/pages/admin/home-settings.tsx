import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Image as ImageLucide, BookOpen, Download, Plus, Trash2, Save, ArrowLeft, Menu, GripVertical, ChevronDown, Search, Edit, Home, FileText, FolderOpen, Tag, Eye } from "lucide-react";
import { PagePreview } from "@/components/admin/page-preview";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { BANNER_SLOTS } from "@shared/schema";
import type { Category, Banner, FreeMaterial } from "@shared/schema";
import { MediaLibraryModal } from "@/components/media-library-modal";

export default function HomeSettings() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: settings, isLoading: settingsLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
    enabled: !!user,
  });

  const { data: bannersList, isLoading: bannersLoading } = useQuery<Banner[]>({
    queryKey: ["/api/admin/banners"],
    enabled: !!user,
  });

  const { data: materialsList, isLoading: materialsLoading } = useQuery<FreeMaterial[]>({
    queryKey: ["/api/admin/materials"],
    enabled: !!user,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-center">
        <h1 className="font-serif text-2xl font-bold mb-4">Acesso Restrito</h1>
        <p className="text-muted-foreground">Faça login para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 flex-wrap mb-8">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back-admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="font-serif text-2xl font-bold" data-testid="text-page-title">Configurações do Blog</h1>
      </div>

      <Tabs defaultValue="home" className="space-y-6">
        <TabsList data-testid="tabs-page-settings">
          <TabsTrigger value="home" data-testid="tab-home">
            <Home className="h-4 w-4 mr-1" />
            Home
          </TabsTrigger>
          <TabsTrigger value="post-page" data-testid="tab-post-page">
            <FileText className="h-4 w-4 mr-1" />
            Página de Posts
          </TabsTrigger>
          <TabsTrigger value="category-page" data-testid="tab-category-page">
            <FolderOpen className="h-4 w-4 mr-1" />
            Página de Categorias
          </TabsTrigger>
          <TabsTrigger value="tag-page" data-testid="tab-tag-page">
            <Tag className="h-4 w-4 mr-1" />
            Página de Tags
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home">
          <HomePageTab
            settings={settings || {}}
            categories={categories || []}
            banners={bannersList || []}
            bannersLoading={bannersLoading}
            materials={materialsList || []}
            materialsLoading={materialsLoading}
          />
        </TabsContent>

        <TabsContent value="post-page">
          <Card className="p-6">
            <p className="text-muted-foreground text-center py-8">Configurações da página de posts — em breve.</p>
          </Card>
        </TabsContent>

        <TabsContent value="category-page">
          <CategoryPageTab settings={settings || {}} categories={categories || []} />
        </TabsContent>

        <TabsContent value="tag-page">
          <TagPageTab settings={settings || {}} categories={categories || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function HomePageTab({ settings, categories, banners, bannersLoading, materials, materialsLoading }: {
  settings: Record<string, string>;
  categories: Category[];
  banners: Banner[];
  bannersLoading: boolean;
  materials: FreeMaterial[];
  materialsLoading: boolean;
}) {
  return (
    <Tabs defaultValue="hero" className="space-y-6">
      <div className="sticky top-[var(--admin-subheader-top)] z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 -mx-4 px-4 py-3">
        <TabsList className="flex flex-wrap h-auto gap-1 justify-start" data-testid="tabs-home-sections">
          <TabsTrigger value="hero" data-testid="tab-hero">Cabeçalho</TabsTrigger>
          <TabsTrigger value="newsletter" data-testid="tab-newsletter">Newsletter</TabsTrigger>
          <TabsTrigger value="most-read" data-testid="tab-most-read">Mais Lidos</TabsTrigger>
          <TabsTrigger value="sections" data-testid="tab-sections">Seções</TabsTrigger>
          <TabsTrigger value="banners" data-testid="tab-banners">Banners</TabsTrigger>
          <TabsTrigger value="materials" data-testid="tab-materials">Materiais</TabsTrigger>
          <TabsTrigger value="menu" data-testid="tab-menu">Menu</TabsTrigger>
          <TabsTrigger value="header-cta" data-testid="tab-header-cta">Menu - Botão CTA</TabsTrigger>
          <TabsTrigger value="footer" data-testid="tab-footer">Rodapé</TabsTrigger>
          <TabsTrigger value="preview" data-testid="tab-home-preview">
            <Eye className="h-3.5 w-3.5 mr-1" />
            Preview
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="hero">
        <HeroSettingsTab settings={settings} />
      </TabsContent>
      <TabsContent value="newsletter">
        <NewsletterSettingsTab settings={settings} />
      </TabsContent>
      <TabsContent value="most-read">
        <MostReadSettingsTab settings={settings} />
      </TabsContent>
      <TabsContent value="sections">
        <HomeSectionsTab settings={settings} categories={categories} />
      </TabsContent>
      <TabsContent value="banners">
        <BannersTab banners={banners} isLoading={bannersLoading} />
      </TabsContent>
      <TabsContent value="materials">
        <MaterialsTab materials={materials} isLoading={materialsLoading} />
      </TabsContent>
      <TabsContent value="menu">
        <MenuTab settings={settings} />
      </TabsContent>
      <TabsContent value="header-cta">
        <HeaderCtaSettingsTab settings={settings} />
      </TabsContent>
      <TabsContent value="footer">
        <FooterSettingsTab settings={settings} />
      </TabsContent>
      <TabsContent value="preview">
        <PagePreview path="/" label="Preview da Home" />
      </TabsContent>
    </Tabs>
  );
}

function HeroSettingsTab({ settings }: { settings: Record<string, string> }) {
  const { toast } = useToast();
  const [heroHeadlineHtml, setHeroHeadlineHtml] = useState("");
  const [heroSubheadline, setHeroSubheadline] = useState("");
  const [heroFormEnabled, setHeroFormEnabled] = useState(true);
  const [heroFormCtaText, setHeroFormCtaText] = useState("");
  const [heroButtonText, setHeroButtonText] = useState("");
  const [heroButtonColor, setHeroButtonColor] = useState("#31D5FF");
  const [heroButtonTextColor, setHeroButtonTextColor] = useState("#000A24");
  const [heroButtonUrl, setHeroButtonUrl] = useState("");

  useEffect(() => {
    setHeroHeadlineHtml(settings["hero_headline_html"] || 'O seu <span style="color:#31D5FF;font-weight:bold">Blog</span> de Psicometria');
    setHeroSubheadline(settings["hero_subheadline"] || "Recursos de aprendizagem em psicometria e análises quantitativas");
    setHeroFormEnabled(settings["hero_form_enabled"] !== "false");
    setHeroFormCtaText(settings["hero_form_cta_text"] || 'Cadastre-se gratuitamente na Psicometria Online Academy e tenha acesso a todos os nossos cursos, recursos e ferramentas estatísticas');
    setHeroButtonText(settings["hero_button_text"] || "Fazer cadastro agora");
    setHeroButtonColor(settings["hero_button_color"] || "#31D5FF");
    setHeroButtonTextColor(settings["hero_button_text_color"] || "#000A24");
    setHeroButtonUrl(settings["hero_button_url"] || "https://academy.psicometriaonline.com.br");
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      return apiRequest("PUT", "/api/admin/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Salvo", description: "Configurações do cabeçalho atualizadas." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
    },
  });

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-1">Cabeçalho (Hero)</h3>
        <p className="text-sm text-muted-foreground mb-4">Configure o título, subtítulo e botão CTA do topo da página.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="hero-headline-html">Título Principal (HTML)</Label>
          <Textarea
            id="hero-headline-html"
            value={heroHeadlineHtml}
            onChange={(e) => setHeroHeadlineHtml(e.target.value)}
            data-testid="input-hero-headline-html"
            rows={2}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">Use HTML para formatar. Ex: O seu &lt;span style="color:#31D5FF"&gt;Blog&lt;/span&gt; de Psicometria</p>
          {heroHeadlineHtml && (
            <div className="mt-2 p-3 bg-[#000A24] rounded-md">
              <p className="text-white font-serif text-lg font-bold" dangerouslySetInnerHTML={{ __html: heroHeadlineHtml }} />
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="hero-subheadline">Subtítulo</Label>
          <Input id="hero-subheadline" value={heroSubheadline} onChange={(e) => setHeroSubheadline(e.target.value)} data-testid="input-hero-subheadline" />
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="hero-form-enabled"
            checked={heroFormEnabled}
            onCheckedChange={setHeroFormEnabled}
            data-testid="switch-hero-form-enabled"
          />
          <Label htmlFor="hero-form-enabled">Habilitar seção CTA</Label>
        </div>

        {heroFormEnabled && (
          <div className="space-y-4 pl-4 border-l-2 border-muted">
            <div>
              <Label htmlFor="hero-form-cta">Texto do CTA (HTML)</Label>
              <Textarea
                id="hero-form-cta"
                value={heroFormCtaText}
                onChange={(e) => setHeroFormCtaText(e.target.value)}
                data-testid="input-hero-form-cta"
                rows={2}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label htmlFor="hero-button-url">URL do botão</Label>
              <Input id="hero-button-url" value={heroButtonUrl} onChange={(e) => setHeroButtonUrl(e.target.value)} data-testid="input-hero-button-url" placeholder="https://academy.psicometriaonline.com.br" />
              <p className="text-xs text-muted-foreground mt-1">Link externo que abre em nova aba ao clicar no botão.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hero-button-text">Texto do botão</Label>
                <Input id="hero-button-text" value={heroButtonText} onChange={(e) => setHeroButtonText(e.target.value)} data-testid="input-hero-button-text" />
              </div>
              <div>
                <Label htmlFor="hero-button-color">Cor do botão</Label>
                <div className="flex gap-2 items-center">
                  <Input id="hero-button-color" value={heroButtonColor} onChange={(e) => setHeroButtonColor(e.target.value)} data-testid="input-hero-button-color" className="flex-1" />
                  <div className="h-9 w-9 rounded-md border flex-shrink-0" style={{ backgroundColor: heroButtonColor }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hero-button-text-color">Cor do texto do botão</Label>
                <div className="flex gap-2 items-center">
                  <Input id="hero-button-text-color" value={heroButtonTextColor} onChange={(e) => setHeroButtonTextColor(e.target.value)} data-testid="input-hero-button-text-color" className="flex-1" />
                  <div className="h-9 w-9 rounded-md border flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: heroButtonColor, color: heroButtonTextColor }}>Aa</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Button
        onClick={() => saveMutation.mutate({
          hero_headline_html: heroHeadlineHtml,
          hero_subheadline: heroSubheadline,
          hero_form_enabled: String(heroFormEnabled),
          hero_form_cta_text: heroFormCtaText,
          hero_button_text: heroButtonText,
          hero_button_color: heroButtonColor,
          hero_button_text_color: heroButtonTextColor,
          hero_button_url: heroButtonUrl,
        })}
        disabled={saveMutation.isPending}
        data-testid="button-save-hero"
      >
        <Save className="h-4 w-4 mr-1" />
        {saveMutation.isPending ? "Salvando..." : "Salvar Cabeçalho"}
      </Button>
    </Card>
  );
}

function NewsletterSettingsTab({ settings }: { settings: Record<string, string> }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonColor, setButtonColor] = useState("#31D5FF");
  const [buttonTextColor, setButtonTextColor] = useState("#000A24");
  const [buttonUrl, setButtonUrl] = useState("");

  useEffect(() => {
    setEnabled(settings["newsletter_enabled"] !== "false");
    setTitle(settings["newsletter_title"] || "Psicometria Online Academy");
    setText(settings["newsletter_text"] || "Acesse nossos cursos, recursos e ferramentas estatísticas");
    setButtonText(settings["newsletter_button_text"] || "Acessar Academy");
    setButtonColor(settings["newsletter_button_color"] || "#31D5FF");
    setButtonTextColor(settings["newsletter_button_text_color"] || "#000A24");
    setButtonUrl(settings["newsletter_button_url"] || "https://academy.psicometriaonline.com.br");
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      return apiRequest("PUT", "/api/admin/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Salvo", description: "Configurações da newsletter atualizadas." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
    },
  });

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-1">Newsletter / CTA</h3>
        <p className="text-sm text-muted-foreground mb-4">Configure a seção CTA exibida na Home (antes era Newsletter com formulário, agora é um botão externo).</p>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="newsletter-enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
          data-testid="switch-newsletter-enabled"
        />
        <Label htmlFor="newsletter-enabled">Habilitar seção CTA</Label>
      </div>

      {enabled && (
        <div className="space-y-4 pl-4 border-l-2 border-muted">
          <div>
            <Label htmlFor="newsletter-title">Título</Label>
            <Input id="newsletter-title" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="input-newsletter-title" />
          </div>
          <div>
            <Label htmlFor="newsletter-text">Texto descritivo</Label>
            <Input id="newsletter-text" value={text} onChange={(e) => setText(e.target.value)} data-testid="input-newsletter-text" />
          </div>
          <div>
            <Label htmlFor="newsletter-button-url">URL do botão</Label>
            <Input id="newsletter-button-url" value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} data-testid="input-newsletter-button-url" placeholder="https://academy.psicometriaonline.com.br" />
            <p className="text-xs text-muted-foreground mt-1">Link externo que abre em nova aba ao clicar no botão.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="newsletter-button-text">Texto do botão</Label>
              <Input id="newsletter-button-text" value={buttonText} onChange={(e) => setButtonText(e.target.value)} data-testid="input-newsletter-button-text" />
            </div>
            <div>
              <Label htmlFor="newsletter-button-color">Cor do botão</Label>
              <div className="flex gap-2 items-center">
                <Input id="newsletter-button-color" value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} data-testid="input-newsletter-button-color" className="flex-1" />
                <div className="h-9 w-9 rounded-md border flex-shrink-0" style={{ backgroundColor: buttonColor }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="newsletter-button-text-color">Cor do texto do botão</Label>
              <div className="flex gap-2 items-center">
                <Input id="newsletter-button-text-color" value={buttonTextColor} onChange={(e) => setButtonTextColor(e.target.value)} data-testid="input-newsletter-button-text-color" className="flex-1" />
                <div className="h-9 w-9 rounded-md border flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: buttonColor, color: buttonTextColor }}>Aa</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Button
        onClick={() => saveMutation.mutate({
          newsletter_enabled: String(enabled),
          newsletter_title: title,
          newsletter_text: text,
          newsletter_button_text: buttonText,
          newsletter_button_color: buttonColor,
          newsletter_button_text_color: buttonTextColor,
          newsletter_button_url: buttonUrl,
        })}
        disabled={saveMutation.isPending}
        data-testid="button-save-newsletter"
      >
        <Save className="h-4 w-4 mr-1" />
        {saveMutation.isPending ? "Salvando..." : "Salvar Newsletter"}
      </Button>
    </Card>
  );
}

function MostReadSettingsTab({ settings }: { settings: Record<string, string> }) {
  const { toast } = useToast();
  const [count, setCount] = useState("9");

  useEffect(() => {
    setCount(settings["most_read_count"] || "9");
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      return apiRequest("PUT", "/api/admin/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home"] });
      toast({ title: "Salvo", description: "Configuração dos mais lidos atualizada." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
    },
  });

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-1">Mais Lidos</h3>
        <p className="text-sm text-muted-foreground mb-4">Configure o número de posts exibidos na seção "Mais Lidos" da Home.</p>
      </div>

      <div className="max-w-xs">
        <Label htmlFor="most-read-count">Número de posts</Label>
        <Input
          id="most-read-count"
          type="number"
          min="1"
          max="50"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          data-testid="input-most-read-count"
        />
      </div>

      <Button
        onClick={() => saveMutation.mutate({ most_read_count: count })}
        disabled={saveMutation.isPending}
        data-testid="button-save-most-read"
      >
        <Save className="h-4 w-4 mr-1" />
        {saveMutation.isPending ? "Salvando..." : "Salvar"}
      </Button>
    </Card>
  );
}

function HomeSectionsTab({ settings, categories }: { settings: Record<string, string>; categories: Category[] }) {
  const { toast } = useToast();
  const [featuredSlug, setFeaturedSlug] = useState("");
  const [diverseSlug1, setDiverseSlug1] = useState("");
  const [diverseSlug2, setDiverseSlug2] = useState("");
  const [diverseSlug3, setDiverseSlug3] = useState("");
  const [row1Slug, setRow1Slug] = useState("");
  const [row2Slug, setRow2Slug] = useState("");

  useEffect(() => {
    setFeaturedSlug(settings["featured_category_slug"] || "");
    const diverseParts = (settings["diverse_category_slugs"] || "").split(",").filter(Boolean);
    setDiverseSlug1(diverseParts[0]?.trim() || "");
    setDiverseSlug2(diverseParts[1]?.trim() || "");
    setDiverseSlug3(diverseParts[2]?.trim() || "");
    setRow1Slug(settings["row_section_1_slug"] || "");
    setRow2Slug(settings["row_section_2_slug"] || "");
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      return apiRequest("PUT", "/api/admin/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diverse-sections"] });
      toast({ title: "Salvo", description: "Seções da home atualizadas." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
    },
  });

  const CategorySelect = ({ value, onChange, testId }: { value: string; onChange: (v: string) => void; testId: string }) => (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger data-testid={testId}>
        <SelectValue placeholder="Selecionar categoria" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nenhuma</SelectItem>
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-4">Categoria em Destaque</h3>
        <div>
          <Label>Selecione a categoria principal</Label>
          <Select value={featuredSlug} onValueChange={setFeaturedSlug}>
            <SelectTrigger data-testid="select-featured-category">
              <SelectValue placeholder="Selecionar categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-4">Categorias Diversas (até 3)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Categoria 1</Label>
            <CategorySelect value={diverseSlug1} onChange={setDiverseSlug1} testId="select-diverse-1" />
          </div>
          <div>
            <Label>Categoria 2</Label>
            <CategorySelect value={diverseSlug2} onChange={setDiverseSlug2} testId="select-diverse-2" />
          </div>
          <div>
            <Label>Categoria 3</Label>
            <CategorySelect value={diverseSlug3} onChange={setDiverseSlug3} testId="select-diverse-3" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-4">Seções de Linha</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Seção 1</Label>
            <CategorySelect value={row1Slug} onChange={setRow1Slug} testId="select-row1-category" />
          </div>
          <div>
            <Label>Seção 2</Label>
            <CategorySelect value={row2Slug} onChange={setRow2Slug} testId="select-row2-category" />
          </div>
        </div>
      </div>

      <Button
        onClick={() => saveMutation.mutate({
          featured_category_slug: featuredSlug,
          diverse_category_slugs: [diverseSlug1, diverseSlug2, diverseSlug3].filter(Boolean).join(","),
          row_section_1_slug: row1Slug === "none" ? "" : row1Slug,
          row_section_2_slug: row2Slug === "none" ? "" : row2Slug,
        })}
        disabled={saveMutation.isPending}
        data-testid="button-save-sections"
      >
        <Save className="h-4 w-4 mr-1" />
        {saveMutation.isPending ? "Salvando..." : "Salvar Seções"}
      </Button>
    </Card>
  );
}

export function CategoryPageTab({ settings, categories }: { settings: Record<string, string>; categories: Category[] }) {
  const { toast } = useToast();
  const [catDiverse1, setCatDiverse1] = useState("");
  const [catDiverse2, setCatDiverse2] = useState("");
  const [catDiverse3, setCatDiverse3] = useState("");

  useEffect(() => {
    const catParts = (settings["category_page_diverse_slugs"] || "").split(",").filter(Boolean);
    setCatDiverse1(catParts[0]?.trim() || "");
    setCatDiverse2(catParts[1]?.trim() || "");
    setCatDiverse3(catParts[2]?.trim() || "");
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      return apiRequest("PUT", "/api/admin/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diverse-sections"] });
      toast({ title: "Salvo", description: "Configurações da página de categorias atualizadas." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
    },
  });

  const CategorySelect = ({ value, onChange, testId }: { value: string; onChange: (v: string) => void; testId: string }) => (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger data-testid={testId}>
        <SelectValue placeholder="Selecionar categoria" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nenhuma</SelectItem>
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-1">Categorias Diversas</h3>
        <p className="text-sm text-muted-foreground mb-4">Colunas de categorias exibidas abaixo da listagem nas páginas de categorias individuais.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label>Categoria 1</Label>
          <CategorySelect value={catDiverse1} onChange={setCatDiverse1} testId="select-cat-diverse-1" />
        </div>
        <div>
          <Label>Categoria 2</Label>
          <CategorySelect value={catDiverse2} onChange={setCatDiverse2} testId="select-cat-diverse-2" />
        </div>
        <div>
          <Label>Categoria 3</Label>
          <CategorySelect value={catDiverse3} onChange={setCatDiverse3} testId="select-cat-diverse-3" />
        </div>
      </div>

      <Button
        onClick={() => saveMutation.mutate({
          category_page_diverse_slugs: [catDiverse1, catDiverse2, catDiverse3].filter(Boolean).join(","),
        })}
        disabled={saveMutation.isPending}
        data-testid="button-save-cat-page"
      >
        <Save className="h-4 w-4 mr-1" />
        {saveMutation.isPending ? "Salvando..." : "Salvar"}
      </Button>
    </Card>
  );
}

export function TagPageTab({ settings, categories }: { settings: Record<string, string>; categories: Category[] }) {
  const { toast } = useToast();
  const [tagDiverse1, setTagDiverse1] = useState("");
  const [tagDiverse2, setTagDiverse2] = useState("");
  const [tagDiverse3, setTagDiverse3] = useState("");

  useEffect(() => {
    const tagParts = (settings["tag_page_diverse_slugs"] || "").split(",").filter(Boolean);
    setTagDiverse1(tagParts[0]?.trim() || "");
    setTagDiverse2(tagParts[1]?.trim() || "");
    setTagDiverse3(tagParts[2]?.trim() || "");
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      return apiRequest("PUT", "/api/admin/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/diverse-sections"] });
      toast({ title: "Salvo", description: "Configurações da página de tags atualizadas." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
    },
  });

  const CategorySelect = ({ value, onChange, testId }: { value: string; onChange: (v: string) => void; testId: string }) => (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger data-testid={testId}>
        <SelectValue placeholder="Selecionar categoria" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nenhuma</SelectItem>
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-1">Categorias Diversas</h3>
        <p className="text-sm text-muted-foreground mb-4">Colunas de categorias exibidas abaixo da listagem nas páginas de tags individuais.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label>Categoria 1</Label>
          <CategorySelect value={tagDiverse1} onChange={setTagDiverse1} testId="select-tag-diverse-1" />
        </div>
        <div>
          <Label>Categoria 2</Label>
          <CategorySelect value={tagDiverse2} onChange={setTagDiverse2} testId="select-tag-diverse-2" />
        </div>
        <div>
          <Label>Categoria 3</Label>
          <CategorySelect value={tagDiverse3} onChange={setTagDiverse3} testId="select-tag-diverse-3" />
        </div>
      </div>

      <Button
        onClick={() => saveMutation.mutate({
          tag_page_diverse_slugs: [tagDiverse1, tagDiverse2, tagDiverse3].filter(Boolean).join(","),
        })}
        disabled={saveMutation.isPending}
        data-testid="button-save-tag-page"
      >
        <Save className="h-4 w-4 mr-1" />
        {saveMutation.isPending ? "Salvando..." : "Salvar"}
      </Button>
    </Card>
  );
}

export function FilteredBannersTab({ 
  banners, 
  isLoading, 
  slots, 
  defaultSlot 
}: { 
  banners: Banner[]; 
  isLoading: boolean; 
  slots: string[];
  defaultSlot?: string;
}) {
  const { toast } = useToast();
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  
  const [title, setTitle] = useState("");
  const [bannerDescription, setBannerDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [slot, setSlot] = useState(defaultSlot || slots[0] || "home_sidebar_recent_1");
  const [buttonText, setButtonText] = useState("Saiba mais");
  const [buttonColor, setButtonColor] = useState("#31D5FF");
  const [buttonAlignment, setButtonAlignment] = useState("left");
  const [showButton, setShowButton] = useState(false);
  const [titleAlignment, setTitleAlignment] = useState("left");
  const [titleFontSize, setTitleFontSize] = useState(18);
  const [buttonFontSize, setButtonFontSize] = useState(14);
  const [showTitle, setShowTitle] = useState(true);
  const [buttonPosX, setButtonPosX] = useState(0);
  const [buttonPosY, setButtonPosY] = useState(0);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const resetForm = () => {
    setEditingBanner(null);
    setTitle("");
    setBannerDescription("");
    setImageUrl("");
    setLinkUrl("");
    setSlot(defaultSlot || slots[0] || "home_sidebar_recent_1");
    setButtonText("Saiba mais");
    setButtonColor("#31D5FF");
    setButtonAlignment("left");
    setShowButton(false);
    setTitleAlignment("left");
    setTitleFontSize(18);
    setButtonFontSize(14);
    setShowTitle(true);
    setButtonPosX(0);
    setButtonPosY(0);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const data = {
        title,
        description: bannerDescription,
        imageUrl,
        linkUrl,
        slot,
        buttonText,
        buttonColor,
        buttonAlignment,
        showButton,
        titleAlignment,
        titleFontSize,
        buttonFontSize,
        showTitle,
        buttonPosX,
        buttonPosY,
      };
      if (editingBanner) {
        return apiRequest("PUT", `/api/admin/banners/${editingBanner.id}`, data);
      }
      return apiRequest("POST", "/api/admin/banners", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home"] });
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      resetForm();
      toast({ title: editingBanner ? "Banner atualizado" : "Banner criado" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar banner.", variant: "destructive" });
    },
  });

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setTitle(banner.title || "");
    setBannerDescription(banner.description || "");
    setImageUrl(banner.imageUrl);
    setLinkUrl(banner.linkUrl || "");
    setSlot(banner.slot);
    setButtonText(banner.buttonText || "Saiba mais");
    setButtonColor(banner.buttonColor || "#31D5FF");
    setButtonAlignment(banner.buttonAlignment || "left");
    setShowButton(banner.showButton ?? false);
    setTitleAlignment(banner.titleAlignment || "left");
    setTitleFontSize(banner.titleFontSize || 18);
    setButtonFontSize(banner.buttonFontSize || 14);
    setShowTitle(banner.showTitle ?? true);
    setButtonPosX(banner.buttonPosX || 0);
    setButtonPosY(banner.buttonPosY || 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/banners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home"] });
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      toast({ title: "Banner removido" });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{editingBanner ? "Editar Banner" : "Novo Banner"}</h3>
          {editingBanner && (
            <Button variant="ghost" size="sm" onClick={resetForm}>Cancelar Edição</Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="banner-title">Título</Label>
            <Input id="banner-title" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="input-banner-title" />
          </div>
          <div>
            <Label htmlFor="banner-description">Descrição</Label>
            <Input id="banner-description" value={bannerDescription} onChange={(e) => setBannerDescription(e.target.value)} data-testid="input-banner-description" placeholder="Descrição curta (opcional)" />
          </div>
          <div>
            <Label htmlFor="banner-slot">Local</Label>
            <Select value={slot} onValueChange={setSlot}>
              <SelectTrigger data-testid="select-banner-slot">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BANNER_SLOTS).filter(([key]) => slots.includes(key)).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="banner-image">URL da Imagem</Label>
            <div className="flex gap-2">
              <Input 
                id="banner-image" 
                value={imageUrl} 
                onChange={(e) => setImageUrl(e.target.value)} 
                data-testid="input-banner-image" 
                placeholder="https://..."
              />
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => setIsMediaModalOpen(true)}
                data-testid="button-banner-media-library"
              >
                <Search className="h-4 w-4 mr-1" />
                Biblioteca
              </Button>
            </div>
          </div>
          <MediaLibraryModal 
            open={isMediaModalOpen} 
            onClose={() => setIsMediaModalOpen(false)}
            onSelect={(url) => {
              setImageUrl(url);
              setIsMediaModalOpen(false);
            }}
          />
          <div>
            <Label htmlFor="banner-link">URL do Link</Label>
            <Input id="banner-link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} data-testid="input-banner-link" />
          </div>
          <div className="flex items-center space-x-2 pt-6">
            <input 
              type="checkbox" 
              id="show-title" 
              checked={showTitle} 
              onChange={(e) => setShowTitle(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="show-title">Mostrar Título no Site</Label>
          </div>
          {showTitle && (
            <>
              <div>
                <Label htmlFor="banner-title-alignment">Alinhamento do Título</Label>
                <Select value={titleAlignment} onValueChange={setTitleAlignment}>
                  <SelectTrigger data-testid="select-banner-title-alignment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Esquerda</SelectItem>
                    <SelectItem value="center">Centralizado</SelectItem>
                    <SelectItem value="right">Direita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="banner-title-font-size">Tamanho da Fonte do Título (px)</Label>
                <Input 
                  id="banner-title-font-size" 
                  type="number" 
                  value={titleFontSize} 
                  onChange={(e) => setTitleFontSize(parseInt(e.target.value) || 18)} 
                  data-testid="input-banner-title-font-size" 
                />
              </div>
            </>
          )}
          <div className="flex items-center space-x-2 pt-6">
            <input 
              type="checkbox" 
              id="show-button" 
              checked={showButton} 
              onChange={(e) => setShowButton(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="show-button">Habilitar Botão</Label>
          </div>
          {showButton && (
            <>
              <div>
                <Label htmlFor="banner-button-text">Texto do Botão</Label>
                <Input id="banner-button-text" value={buttonText} onChange={(e) => setButtonText(e.target.value)} data-testid="input-banner-button-text" />
              </div>
              <div>
                <Label htmlFor="banner-button-color">Cor do Botão (Hex)</Label>
                <div className="flex gap-2 items-center">
                  <Input id="banner-button-color" value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} data-testid="input-banner-button-color" placeholder="#31D5FF" className="flex-1" />
                  <div className="h-9 w-9 rounded-md border flex-shrink-0" style={{ backgroundColor: buttonColor }} />
                </div>
              </div>
              <div>
                <Label htmlFor="banner-button-alignment">Alinhamento do Botão</Label>
                <Select value={buttonAlignment} onValueChange={setButtonAlignment}>
                  <SelectTrigger data-testid="select-banner-button-alignment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Esquerda</SelectItem>
                    <SelectItem value="center">Centralizado</SelectItem>
                    <SelectItem value="right">Direita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="banner-button-font-size">Tamanho da Fonte do Botão (px)</Label>
                <Input 
                  id="banner-button-font-size" 
                  type="number" 
                  value={buttonFontSize} 
                  onChange={(e) => setButtonFontSize(parseInt(e.target.value) || 14)} 
                  data-testid="input-banner-button-font-size" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="button-pos-x">Posição X (-100 a 100)</Label>
                  <Input 
                    id="button-pos-x" 
                    type="number" 
                    value={buttonPosX} 
                    onChange={(e) => setButtonPosX(parseInt(e.target.value) || 0)} 
                    step="1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Esq: -100, Centro: 0, Dir: 100</p>
                </div>
                <div>
                  <Label htmlFor="button-pos-y">Posição Y (-100 a 100)</Label>
                  <Input 
                    id="button-pos-y" 
                    type="number" 
                    value={buttonPosY} 
                    onChange={(e) => setButtonPosY(parseInt(e.target.value) || 0)} 
                    step="1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Topo: -100, Centro: 0, Base: 100</p>
                </div>
              </div>
            </>
          )}
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !title || !imageUrl}
          className="mt-4"
          data-testid="button-create-banner"
        >
          {editingBanner ? <Save className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {createMutation.isPending ? "Salvando..." : editingBanner ? "Salvar Alterações" : "Adicionar Banner"}
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Banners Existentes</h3>
        {banners.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum banner cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {banners.filter(b => slots.includes(b.slot)).map((banner) => (
              <div key={banner.id} className="flex items-center gap-4 p-3 border rounded-md flex-wrap">
                {banner.imageUrl && (
                  <img src={banner.imageUrl} alt={banner.title} className="h-12 w-20 object-cover rounded-md flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{banner.title}</p>
                  <p className="text-xs text-muted-foreground">Local: {BANNER_SLOTS[banner.slot] || banner.slot}</p>
                  {banner.linkUrl && <p className="text-xs text-muted-foreground truncate">Link: {banner.linkUrl}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={banner.isActive}
                    onCheckedChange={async (checked) => {
                      await apiRequest("PUT", `/api/admin/banners/${banner.id}`, { ...banner, isActive: checked });
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/home"] });
                    }}
                    data-testid={`switch-banner-active-${banner.id}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(banner)}
                    data-testid={`button-edit-banner-${banner.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(banner.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-banner-${banner.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function BannersTab({ banners, isLoading }: { banners: Banner[]; isLoading: boolean }) {
  return <FilteredBannersTab 
    banners={banners} 
    isLoading={isLoading} 
    slots={Object.keys(BANNER_SLOTS)}
    defaultSlot="home_sidebar_recent_1"
  />;
}

function MaterialsTab({ materials, isLoading }: { materials: FreeMaterial[]; isLoading: boolean }) {
  const { toast } = useToast();
  const [editingMaterial, setEditingMaterial] = useState<FreeMaterial | null>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const resetForm = () => {
    setEditingMaterial(null);
    setTitle("");
    setDescription("");
    setImageUrl("");
    setLinkUrl("");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const data = {
        title,
        description,
        imageUrl: imageUrl || null,
        linkUrl,
      };
      if (editingMaterial) {
        return apiRequest("PUT", `/api/admin/materials/${editingMaterial.id}`, data);
      }
      return apiRequest("POST", "/api/admin/materials", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/materials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home"] });
      resetForm();
      toast({ title: editingMaterial ? "Material atualizado" : "Material criado" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar material.", variant: "destructive" });
    },
  });

  const handleEdit = (mat: FreeMaterial) => {
    setEditingMaterial(mat);
    setTitle(mat.title);
    setDescription(mat.description || "");
    setImageUrl(mat.imageUrl || "");
    setLinkUrl(mat.linkUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/materials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home"] });
      toast({ title: "Material removido" });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{editingMaterial ? "Editar Material" : "Novo Material"}</h3>
          {editingMaterial && (
            <Button variant="ghost" size="sm" onClick={resetForm}>Cancelar Edição</Button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="mat-title">Título</Label>
            <Input id="mat-title" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="input-material-title" />
          </div>
          <div>
            <Label htmlFor="mat-link">URL do Download</Label>
            <Input id="mat-link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} data-testid="input-material-link" />
          </div>
          <div>
            <Label htmlFor="mat-desc">Descrição</Label>
            <Input id="mat-desc" value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-material-description" />
          </div>
          <div>
            <Label htmlFor="mat-image">URL da Imagem (opcional)</Label>
            <Input id="mat-image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} data-testid="input-material-image" />
          </div>
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !title || !linkUrl}
          className="mt-4"
          data-testid="button-create-material"
        >
          {editingMaterial ? <Save className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {createMutation.isPending ? "Salvando..." : editingMaterial ? "Salvar Alterações" : "Adicionar Material"}
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Materiais Existentes</h3>
        {materials.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum material cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {materials.map((mat) => (
              <div key={mat.id} className="flex items-center gap-4 p-3 border rounded-md flex-wrap">
                {mat.imageUrl && (
                  <img src={mat.imageUrl} alt={mat.title} className="h-12 w-20 object-cover rounded-md flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{mat.title}</p>
                  {mat.description && <p className="text-xs text-muted-foreground truncate">{mat.description}</p>}
                  {mat.linkUrl && <p className="text-xs text-muted-foreground truncate">Link: {mat.linkUrl}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(mat)}
                    data-testid={`button-edit-material-${mat.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(mat.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-material-${mat.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

interface MenuItemEditable {
  label: string;
  url: string;
  children?: MenuItemEditable[];
}

function HeaderCtaSettingsTab({ settings }: { settings: Record<string, string> }) {
  const { toast } = useToast();
  const [ctaText, setCtaText] = useState("Criar conta");
  const [ctaUrl, setCtaUrl] = useState("https://academy.psicometriaonline.com.br");

  useEffect(() => {
    setCtaText(settings["header_cta_text"] || "Criar conta");
    setCtaUrl(settings["header_cta_url"] || "https://academy.psicometriaonline.com.br");
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", "/api/admin/settings", {
        header_cta_text: ctaText,
        header_cta_url: ctaUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Salvo", description: "Botão CTA atualizado." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
    },
  });

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-1">Botão CTA do Menu</h3>
        <p className="text-sm text-muted-foreground mb-4">Configure o texto e a URL do botão "Criar conta" no cabeçalho do site.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="header-cta-text">Texto do botão</Label>
          <Input
            id="header-cta-text"
            value={ctaText}
            onChange={(e) => setCtaText(e.target.value)}
            placeholder="Ex: Criar conta"
            data-testid="input-header-cta-text"
          />
        </div>

        <div>
          <Label htmlFor="header-cta-url">URL do botão</Label>
          <Input
            id="header-cta-url"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            placeholder="Ex: https://academy.psicometriaonline.com.br ou /"
            data-testid="input-header-cta-url"
          />
        </div>
      </div>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        data-testid="button-save-header-cta"
      >
        <Save className="h-4 w-4 mr-1" />
        {saveMutation.isPending ? "Salvando..." : "Salvar"}
      </Button>
    </Card>
  );
}

const DEFAULT_CAP_EXCEPTIONS = [
  "APA", "ANOVA", "ANCOVA", "BDI", "BFI", "Big Five", "CFA", "CFI", "CIT",
  "Cohen", "Cronbach", "EFA", "Eysenck", "Fisher", "Gauss", "GFI",
  "ICC", "IRT", "JASP", "KMO", "Kolmogorov-Smirnov", "Likert",
  "MANOVA", "MBTI", "MMPI", "NEO-PI-R", "Pearson", "RMSEA", "SEM",
  "Shapiro-Wilk", "Spearman", "SPSS", "TRI", "Tukey", "Wilcoxon",
  "Wechsler", "WISC", "WAIS"
];

export function CitationSettingsTab({ settings }: { settings: Record<string, string> }) {
  const { toast } = useToast();
  const [citationTemplate, setCitationTemplate] = useState("");
  const [citationSourceName, setCitationSourceName] = useState("Blog Psicometria Online");
  const [citationBaseUrl, setCitationBaseUrl] = useState("https://www.blog.psicometriaonline.com.br");
  const [capExceptionsList, setCapExceptionsList] = useState<string[]>([]);
  const [newException, setNewException] = useState("");

  useEffect(() => {
    setCitationTemplate(settings["citation_template"] || "{sobrenome}, {iniciais}. ({ano}, {dia} de {mês}). {titulo}. _{fonte}_. {url}");
    setCitationSourceName(settings["citation_source_name"] || "Blog Psicometria Online");
    setCitationBaseUrl(settings["citation_base_url"] || "https://www.blog.psicometriaonline.com.br");
    const raw = settings["citation_capitalization_exceptions"] || "";
    const parsed = raw.split(",").map(s => s.trim()).filter(Boolean);
    const list = parsed.length > 0 ? parsed : [...DEFAULT_CAP_EXCEPTIONS];
    setCapExceptionsList(list.sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" })));
  }, [settings]);

  const addException = () => {
    const trimmed = newException.trim();
    if (!trimmed) return;
    if (capExceptionsList.some(e => e.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Duplicado", description: `"${trimmed}" já está na lista.`, variant: "destructive" });
      return;
    }
    const updated = [...capExceptionsList, trimmed].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
    setCapExceptionsList(updated);
    setNewException("");
  };

  const removeException = (word: string) => {
    setCapExceptionsList(capExceptionsList.filter(e => e !== word));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", "/api/admin/settings", {
        citation_template: citationTemplate,
        citation_source_name: citationSourceName,
        citation_base_url: citationBaseUrl,
        citation_capitalization_exceptions: capExceptionsList.join(", "),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Salvo", description: "Configurações de citação atualizadas." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
    },
  });

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-1">Configurações de Citação</h3>
        <p className="text-sm text-muted-foreground mb-4">Configure o formato e fonte para citações automáticas dos posts.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="citation-template">Template de Citação</Label>
          <Textarea
            id="citation-template"
            value={citationTemplate}
            onChange={(e) => setCitationTemplate(e.target.value)}
            data-testid="input-citation-template"
            rows={2}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">Placeholders: {"{sobrenome}"}, {"{iniciais}"}, {"{ano}"}, {"{dia}"}, {"{mês}"}, {"{titulo}"}, {"{fonte}"}, {"{url}"}</p>
        </div>

        <div>
          <Label htmlFor="citation-source-name">Nome da Fonte</Label>
          <Input
            id="citation-source-name"
            value={citationSourceName}
            onChange={(e) => setCitationSourceName(e.target.value)}
            data-testid="input-citation-source-name"
          />
        </div>

        <div>
          <Label htmlFor="citation-base-url">URL Base</Label>
          <Input
            id="citation-base-url"
            value={citationBaseUrl}
            onChange={(e) => setCitationBaseUrl(e.target.value)}
            data-testid="input-citation-base-url"
          />
        </div>

        <div>
          <Label>Exceções de Capitalização</Label>
          <p className="text-xs text-muted-foreground mb-2">Palavras que mantêm sua capitalização original no título da citação.</p>
          <div className="flex gap-2 mb-3">
            <Input
              value={newException}
              onChange={(e) => setNewException(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addException(); } }}
              placeholder="Ex: Pearson"
              data-testid="input-citation-new-exception"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addException}
              disabled={!newException.trim()}
              data-testid="button-add-exception"
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
          {capExceptionsList.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30">
              {capExceptionsList.map((word) => (
                <span
                  key={word}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20"
                >
                  {word}
                  <button
                    type="button"
                    onClick={() => removeException(word)}
                    className="ml-0.5 hover:text-destructive transition-colors"
                    data-testid={`button-remove-exception-${word}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {capExceptionsList.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Nenhuma exceção cadastrada.</p>
          )}
        </div>
      </div>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        data-testid="button-save-citation"
      >
        <Save className="h-4 w-4 mr-1" />
        {saveMutation.isPending ? "Salvando..." : "Salvar"}
      </Button>
    </Card>
  );
}

function FooterSettingsTab({ settings }: { settings: Record<string, string> }) {
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [formationLinks, setFormationLinks] = useState<{ label: string; url: string }[]>([]);
  const [supportLinks, setSupportLinks] = useState<{ label: string; url: string }[]>([]);

  useEffect(() => {
    setDescription(settings["footer_description"] || "Maior portal de conteúdo sobre psicometria, análise de dados e pesquisa quantitativa da América Latina.");
    setInstagramUrl(settings["footer_instagram_url"] || "https://instagram.com/psicometriaonline");
    setLinkedinUrl(settings["footer_linkedin_url"] || "https://br.linkedin.com/company/psicometriaonline");
    setYoutubeUrl(settings["footer_youtube_url"] || "https://www.youtube.com/c/psicometriaonline?sub_confirmation=1");
    setWhatsappNumber(settings["footer_whatsapp_number"] || "5516981060218");
    setWhatsappMessage(settings["footer_whatsapp_message"] || "Estou no blog de vocês, e gostaria de tirar uma dúvida.");
    try {
      setFormationLinks(settings["footer_formation_links"] ? JSON.parse(settings["footer_formation_links"]) : [
        { label: "Psicometria Online Academy", url: "https://academy.psicometriaonline.com.br" },
        { label: "Consultoria", url: "https://quantidados.com.br" },
      ]);
    } catch {
      setFormationLinks([
        { label: "Psicometria Online Academy", url: "https://academy.psicometriaonline.com.br" },
        { label: "Consultoria", url: "https://quantidados.com.br" },
      ]);
    }
    try {
      setSupportLinks(settings["footer_support_links"] ? JSON.parse(settings["footer_support_links"]) : [
        { label: "Fale Conosco via WhatsApp", url: "https://wa.me/5516981060218" },
      ]);
    } catch {
      setSupportLinks([
        { label: "Fale Conosco via WhatsApp", url: "https://wa.me/5516981060218" },
      ]);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", "/api/admin/settings", {
        footer_description: description,
        footer_instagram_url: instagramUrl,
        footer_linkedin_url: linkedinUrl,
        footer_youtube_url: youtubeUrl,
        footer_whatsapp_number: whatsappNumber,
        footer_whatsapp_message: whatsappMessage,
        footer_formation_links: JSON.stringify(formationLinks),
        footer_support_links: JSON.stringify(supportLinks),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Salvo", description: "Configurações do rodapé atualizadas." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
    },
  });

  const updateFormationLink = (idx: number, field: "label" | "url", value: string) => {
    const newLinks = [...formationLinks];
    newLinks[idx][field] = value;
    setFormationLinks(newLinks);
  };

  const removeFormationLink = (idx: number) => {
    setFormationLinks(formationLinks.filter((_, i) => i !== idx));
  };

  const addFormationLink = () => {
    setFormationLinks([...formationLinks, { label: "", url: "" }]);
  };

  const updateSupportLink = (idx: number, field: "label" | "url", value: string) => {
    const newLinks = [...supportLinks];
    newLinks[idx][field] = value;
    setSupportLinks(newLinks);
  };

  const removeSupportLink = (idx: number) => {
    setSupportLinks(supportLinks.filter((_, i) => i !== idx));
  };

  const addSupportLink = () => {
    setSupportLinks([...supportLinks, { label: "", url: "" }]);
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-1">Configurações do Rodapé</h3>
        <p className="text-sm text-muted-foreground mb-4">Configure a descrição, redes sociais e links do rodapé do site.</p>
      </div>

      <div className="space-y-6">
        <div>
          <Label htmlFor="footer-description">Descrição</Label>
          <Textarea
            id="footer-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição do blog"
            rows={3}
            data-testid="input-footer-description"
          />
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold text-sm mb-4">Redes Sociais</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="footer-instagram">Instagram</Label>
              <Input
                id="footer-instagram"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/..."
                data-testid="input-footer-instagram"
              />
            </div>
            <div>
              <Label htmlFor="footer-linkedin">LinkedIn</Label>
              <Input
                id="footer-linkedin"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/..."
                data-testid="input-footer-linkedin"
              />
            </div>
            <div>
              <Label htmlFor="footer-youtube">YouTube</Label>
              <Input
                id="footer-youtube"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/..."
                data-testid="input-footer-youtube"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold text-sm mb-4">WhatsApp</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="footer-whatsapp-number">Número (sem +55)</Label>
              <Input
                id="footer-whatsapp-number"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="Ex: 5516981060218"
                data-testid="input-footer-whatsapp-number"
              />
            </div>
            <div>
              <Label htmlFor="footer-whatsapp-message">Mensagem padrão</Label>
              <Input
                id="footer-whatsapp-message"
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                placeholder="Mensagem"
                data-testid="input-footer-whatsapp-message"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold text-sm mb-4">Links de Formação</h4>
          <div className="space-y-3 mb-4">
            {formationLinks.map((link, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <Input
                  placeholder="Rótulo"
                  value={link.label}
                  onChange={(e) => updateFormationLink(idx, "label", e.target.value)}
                  data-testid={`input-footer-formation-label-${idx}`}
                />
                <Input
                  placeholder="URL"
                  value={link.url}
                  onChange={(e) => updateFormationLink(idx, "url", e.target.value)}
                  data-testid={`input-footer-formation-url-${idx}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFormationLink(idx)}
                  data-testid={`button-delete-footer-formation-${idx}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addFormationLink}
            data-testid="button-add-footer-formation"
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar link
          </Button>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold text-sm mb-4">Links de Suporte</h4>
          <div className="space-y-3 mb-4">
            {supportLinks.map((link, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <Input
                  placeholder="Rótulo"
                  value={link.label}
                  onChange={(e) => updateSupportLink(idx, "label", e.target.value)}
                  data-testid={`input-footer-support-label-${idx}`}
                />
                <Input
                  placeholder="URL"
                  value={link.url}
                  onChange={(e) => updateSupportLink(idx, "url", e.target.value)}
                  data-testid={`input-footer-support-url-${idx}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSupportLink(idx)}
                  data-testid={`button-delete-footer-support-${idx}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addSupportLink}
            data-testid="button-add-footer-support"
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar link
          </Button>
        </div>
      </div>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        data-testid="button-save-footer"
      >
        <Save className="h-4 w-4 mr-1" />
        {saveMutation.isPending ? "Salvando..." : "Salvar Rodapé"}
      </Button>
    </Card>
  );
}

function MenuTab({ settings }: { settings: Record<string, string> }) {
  const { toast } = useToast();
  const [items, setItems] = useState<MenuItemEditable[]>([]);

  useEffect(() => {
    try {
      setItems(JSON.parse(settings["menu_items"] || "[]"));
    } catch {
      setItems([]);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", "/api/admin/settings", { menu_items: JSON.stringify(items) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu"], refetchType: "active" });
      toast({ title: "Menu salvo", description: "Menu atualizado com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar o menu.", variant: "destructive" });
    },
  });

  const addItem = () => {
    setItems([...items, { label: "", url: "/" }]);
  };

  const updateItem = (index: number, field: keyof MenuItemEditable, value: string) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const addSubItem = (parentIndex: number) => {
    const newItems = [...items];
    if (!newItems[parentIndex].children) {
      newItems[parentIndex].children = [];
    }
    newItems[parentIndex].children!.push({ label: "", url: "/" });
    setItems(newItems);
  };

  const updateSubItem = (parentIndex: number, childIndex: number, field: keyof MenuItemEditable, value: string) => {
    const newItems = [...items];
    (newItems[parentIndex].children![childIndex] as any)[field] = value;
    setItems(newItems);
  };

  const removeSubItem = (parentIndex: number, childIndex: number) => {
    const newItems = [...items];
    newItems[parentIndex].children = newItems[parentIndex].children!.filter((_, i) => i !== childIndex);
    if (newItems[parentIndex].children!.length === 0) {
      delete newItems[parentIndex].children;
    }
    setItems(newItems);
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <h3 className="font-semibold text-lg">Itens do Menu</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addItem} data-testid="button-add-menu-item">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar item
            </Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-menu">
              <Save className="h-4 w-4 mr-1" />
              {saveMutation.isPending ? "Salvando..." : "Salvar Menu"}
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Configure os itens do menu de navegação do site. URLs externas (com http) abrem em nova aba.
          Adicione sub-itens para criar menus dropdown.
        </p>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum item no menu. Clique em "Adicionar item" para começar.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1 pt-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveItem(index, "up")}
                      disabled={index === 0}
                    >
                      <ChevronDown className="h-3 w-3 rotate-180" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveItem(index, "down")}
                      disabled={index === items.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Título</Label>
                        <Input
                          value={item.label}
                          onChange={(e) => updateItem(index, "label", e.target.value)}
                          placeholder="Ex: Home"
                          data-testid={`input-menu-label-${index}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">URL</Label>
                        <Input
                          value={item.url}
                          onChange={(e) => updateItem(index, "url", e.target.value)}
                          placeholder="Ex: / ou https://..."
                          data-testid={`input-menu-url-${index}`}
                        />
                      </div>
                    </div>

                    {item.children && item.children.length > 0 && (
                      <div className="ml-6 border-l-2 border-muted pl-4 space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">Sub-itens:</p>
                        {item.children.map((child, childIndex) => (
                          <div key={childIndex} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                            <div>
                              <Label className="text-xs">Título</Label>
                              <Input
                                value={child.label}
                                onChange={(e) => updateSubItem(index, childIndex, "label", e.target.value)}
                                placeholder="Sub-item"
                                data-testid={`input-submenu-label-${index}-${childIndex}`}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">URL</Label>
                              <Input
                                value={child.url}
                                onChange={(e) => updateSubItem(index, childIndex, "url", e.target.value)}
                                placeholder="https://..."
                                data-testid={`input-submenu-url-${index}-${childIndex}`}
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSubItem(index, childIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => addSubItem(index)}
                      data-testid={`button-add-submenu-${index}`}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar sub-item
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    data-testid={`button-delete-menu-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
