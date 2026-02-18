import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Image, BookOpen, Download, Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Category, Banner, FreeMaterial } from "@shared/schema";

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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="font-serif text-2xl font-bold mb-4">Acesso Restrito</h1>
        <p className="text-muted-foreground">Faca login para acessar esta pagina.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 flex-wrap mb-8">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back-admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="font-serif text-2xl font-bold" data-testid="text-page-title">Configuracoes da Home</h1>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList data-testid="tabs-home-settings">
          <TabsTrigger value="general" data-testid="tab-general">
            <Settings className="h-4 w-4 mr-1" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="banners" data-testid="tab-banners">
            <Image className="h-4 w-4 mr-1" />
            Banners
          </TabsTrigger>
          <TabsTrigger value="sections" data-testid="tab-sections">
            <BookOpen className="h-4 w-4 mr-1" />
            Secoes
          </TabsTrigger>
          <TabsTrigger value="materials" data-testid="tab-materials">
            <Download className="h-4 w-4 mr-1" />
            Materiais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettingsTab settings={settings || {}} categories={categories || []} />
        </TabsContent>

        <TabsContent value="banners">
          <BannersTab banners={bannersList || []} isLoading={bannersLoading} />
        </TabsContent>

        <TabsContent value="sections">
          <SectionsTab settings={settings || {}} categories={categories || []} />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsTab materials={materialsList || []} isLoading={materialsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralSettingsTab({ settings, categories }: { settings: Record<string, string>; categories: Category[] }) {
  const { toast } = useToast();
  const [heroHeadline, setHeroHeadline] = useState(settings["hero_headline"] || "Blog Psicometria Online");
  const [heroSubheadline, setHeroSubheadline] = useState(settings["hero_subheadline"] || "Recursos de aprendizagem em psicometria e analises quantitativas");
  const [newsletterText, setNewsletterText] = useState(settings["newsletter_text"] || "Receba nossos conteudos diretamente no seu e-mail");

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      return apiRequest("PUT", "/api/admin/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home"] });
      toast({ title: "Salvo", description: "Configuracoes atualizadas com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar configuracoes.", variant: "destructive" });
    },
  });

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-4">Secao Hero</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="hero-headline">Titulo Principal</Label>
            <Input id="hero-headline" value={heroHeadline} onChange={(e) => setHeroHeadline(e.target.value)} data-testid="input-hero-headline" />
          </div>
          <div>
            <Label htmlFor="hero-subheadline">Subtitulo</Label>
            <Input id="hero-subheadline" value={heroSubheadline} onChange={(e) => setHeroSubheadline(e.target.value)} data-testid="input-hero-subheadline" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-4">Newsletter</h3>
        <div>
          <Label htmlFor="newsletter-text">Texto da Newsletter</Label>
          <Input id="newsletter-text" value={newsletterText} onChange={(e) => setNewsletterText(e.target.value)} data-testid="input-newsletter-text" />
        </div>
      </div>

      <Button
        onClick={() => saveMutation.mutate({
          hero_headline: heroHeadline,
          hero_subheadline: heroSubheadline,
          newsletter_text: newsletterText,
        })}
        disabled={saveMutation.isPending}
        data-testid="button-save-general"
      >
        <Save className="h-4 w-4 mr-1" />
        {saveMutation.isPending ? "Salvando..." : "Salvar Configuracoes"}
      </Button>
    </Card>
  );
}

function SectionsTab({ settings, categories }: { settings: Record<string, string>; categories: Category[] }) {
  const { toast } = useToast();
  const [featuredSlug, setFeaturedSlug] = useState(settings["featured_category_slug"] || "");
  const [diverseSlugs, setDiverseSlugs] = useState(settings["diverse_category_slugs"] || "");
  const [row1Slug, setRow1Slug] = useState(settings["row_section_1_slug"] || "");
  const [row2Slug, setRow2Slug] = useState(settings["row_section_2_slug"] || "");

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      return apiRequest("PUT", "/api/admin/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home"] });
      toast({ title: "Salvo", description: "Secoes atualizadas com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao salvar secoes.", variant: "destructive" });
    },
  });

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
        <h3 className="font-semibold text-lg mb-4">Categorias Diversas (ate 3)</h3>
        <div>
          <Label>Slugs separados por virgula</Label>
          <Input
            value={diverseSlugs}
            onChange={(e) => setDiverseSlugs(e.target.value)}
            placeholder="slug1,slug2,slug3"
            data-testid="input-diverse-slugs"
          />
          <p className="text-xs text-muted-foreground mt-1">Categorias disponiveis: {categories.map(c => c.slug).join(", ")}</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-4">Secoes de Linha</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Secao 1</Label>
            <Select value={row1Slug} onValueChange={setRow1Slug}>
              <SelectTrigger data-testid="select-row1-category">
                <SelectValue placeholder="Selecionar categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Secao 2</Label>
            <Select value={row2Slug} onValueChange={setRow2Slug}>
              <SelectTrigger data-testid="select-row2-category">
                <SelectValue placeholder="Selecionar categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Button
        onClick={() => saveMutation.mutate({
          featured_category_slug: featuredSlug,
          diverse_category_slugs: diverseSlugs,
          row_section_1_slug: row1Slug === "none" ? "" : row1Slug,
          row_section_2_slug: row2Slug === "none" ? "" : row2Slug,
        })}
        disabled={saveMutation.isPending}
        data-testid="button-save-sections"
      >
        <Save className="h-4 w-4 mr-1" />
        {saveMutation.isPending ? "Salvando..." : "Salvar Secoes"}
      </Button>
    </Card>
  );
}

function BannersTab({ banners, isLoading }: { banners: Banner[]; isLoading: boolean }) {
  const { toast } = useToast();
  const [newTitle, setNewTitle] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newSlot, setNewSlot] = useState("sidebar");

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/banners", {
        title: newTitle,
        imageUrl: newImageUrl,
        linkUrl: newLinkUrl,
        slot: newSlot,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home"] });
      setNewTitle("");
      setNewImageUrl("");
      setNewLinkUrl("");
      toast({ title: "Banner criado" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao criar banner.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/banners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home"] });
      toast({ title: "Banner removido" });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Novo Banner</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="banner-title">Titulo</Label>
            <Input id="banner-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} data-testid="input-banner-title" />
          </div>
          <div>
            <Label htmlFor="banner-slot">Local</Label>
            <Select value={newSlot} onValueChange={setNewSlot}>
              <SelectTrigger data-testid="select-banner-slot">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sidebar">Sidebar</SelectItem>
                <SelectItem value="horizontal">Horizontal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="banner-image">URL da Imagem</Label>
            <Input id="banner-image" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} data-testid="input-banner-image" />
          </div>
          <div>
            <Label htmlFor="banner-link">URL do Link</Label>
            <Input id="banner-link" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} data-testid="input-banner-link" />
          </div>
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !newTitle || !newImageUrl}
          className="mt-4"
          data-testid="button-create-banner"
        >
          <Plus className="h-4 w-4 mr-1" />
          {createMutation.isPending ? "Criando..." : "Adicionar Banner"}
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Banners Existentes</h3>
        {banners.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum banner cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {banners.map((banner) => (
              <div key={banner.id} className="flex items-center gap-4 p-3 border rounded-md flex-wrap">
                {banner.imageUrl && (
                  <img src={banner.imageUrl} alt={banner.title} className="h-12 w-20 object-cover rounded-md flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{banner.title}</p>
                  <p className="text-xs text-muted-foreground">Local: {banner.slot}</p>
                </div>
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
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function MaterialsTab({ materials, isLoading }: { materials: FreeMaterial[]; isLoading: boolean }) {
  const { toast } = useToast();
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/materials", {
        title: newTitle,
        description: newDescription,
        imageUrl: newImageUrl || null,
        linkUrl: newLinkUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/materials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home"] });
      setNewTitle("");
      setNewDescription("");
      setNewImageUrl("");
      setNewLinkUrl("");
      toast({ title: "Material criado" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao criar material.", variant: "destructive" });
    },
  });

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
        <h3 className="font-semibold text-lg mb-4">Novo Material</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="mat-title">Titulo</Label>
            <Input id="mat-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} data-testid="input-material-title" />
          </div>
          <div>
            <Label htmlFor="mat-link">URL do Download</Label>
            <Input id="mat-link" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} data-testid="input-material-link" />
          </div>
          <div>
            <Label htmlFor="mat-desc">Descricao</Label>
            <Input id="mat-desc" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} data-testid="input-material-description" />
          </div>
          <div>
            <Label htmlFor="mat-image">URL da Imagem (opcional)</Label>
            <Input id="mat-image" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} data-testid="input-material-image" />
          </div>
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !newTitle || !newLinkUrl}
          className="mt-4"
          data-testid="button-create-material"
        >
          <Plus className="h-4 w-4 mr-1" />
          {createMutation.isPending ? "Criando..." : "Adicionar Material"}
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
                </div>
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
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
