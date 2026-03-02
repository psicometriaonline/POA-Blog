import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Image as ImageLucide, BookOpen, Download, Plus, Trash2, Save, ArrowLeft, Menu, GripVertical, ChevronDown, Search, Edit } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
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
        <p className="text-muted-foreground">Faça login para acessar esta página.</p>
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
        <h1 className="font-serif text-2xl font-bold" data-testid="text-page-title">Configurações da Home</h1>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList data-testid="tabs-home-settings">
          <TabsTrigger value="general" data-testid="tab-general">
            <Settings className="h-4 w-4 mr-1" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="banners" data-testid="tab-banners">
            <ImageLucide className="h-4 w-4 mr-1" />
            Banners
          </TabsTrigger>
          <TabsTrigger value="sections" data-testid="tab-sections">
            <BookOpen className="h-4 w-4 mr-1" />
            Seções
          </TabsTrigger>
          <TabsTrigger value="materials" data-testid="tab-materials">
            <Download className="h-4 w-4 mr-1" />
            Materiais
          </TabsTrigger>
          <TabsTrigger value="menu" data-testid="tab-menu">
            <Menu className="h-4 w-4 mr-1" />
            Menu
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

        <TabsContent value="menu">
          <MenuTab settings={settings || {}} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralSettingsTab({ settings, categories }: { settings: Record<string, string>; categories: Category[] }) {
  const { toast } = useToast();
  const [heroHeadline, setHeroHeadline] = useState("");
  const [heroSubheadline, setHeroSubheadline] = useState("");
  const [newsletterText, setNewsletterText] = useState("");

  // Update local state when settings data changes
  useEffect(() => {
    setHeroHeadline(settings["hero_headline"] || "Blog Psicometria Online");
    setHeroSubheadline(settings["hero_subheadline"] || "Recursos de aprendizagem em psicometria e análises quantitativas");
    setNewsletterText(settings["newsletter_text"] || "Receba nossos conteúdos diretamente no seu e-mail");
  }, [settings]);

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
        {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </Card>
  );
}

function SectionsTab({ settings, categories }: { settings: Record<string, string>; categories: Category[] }) {
  const { toast } = useToast();
  const [featuredSlug, setFeaturedSlug] = useState("");
  const [diverseSlugs, setDiverseSlugs] = useState("");
  const [row1Slug, setRow1Slug] = useState("");
  const [row2Slug, setRow2Slug] = useState("");

  useEffect(() => {
    setFeaturedSlug(settings["featured_category_slug"] || "");
    setDiverseSlugs(settings["diverse_category_slugs"] || "");
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
        <h3 className="font-semibold text-lg mb-4">Categorias Diversas (até 3)</h3>
        <div>
          <Label>Slugs separados por vírgula</Label>
          <Input
            value={diverseSlugs}
            onChange={(e) => setDiverseSlugs(e.target.value)}
            placeholder="slug1,slug2,slug3"
            data-testid="input-diverse-slugs"
          />
          <p className="text-xs text-muted-foreground mt-1">Categorias disponíveis: {categories.map(c => c.slug).join(", ")}</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-4">Seções de Linha</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Seção 1</Label>
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
            <Label>Seção 2</Label>
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
        {saveMutation.isPending ? "Salvando..." : "Salvar Seções"}
      </Button>
    </Card>
  );
}

function BannersTab({ banners, isLoading }: { banners: Banner[]; isLoading: boolean }) {
  const { toast } = useToast();
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [slot, setSlot] = useState("sidebar");
  const [buttonText, setButtonText] = useState("Saiba mais");
  const [buttonColor, setButtonColor] = useState("bg-accent-bright");
  const [buttonAlignment, setButtonAlignment] = useState("left");
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const resetForm = () => {
    setEditingBanner(null);
    setTitle("");
    setImageUrl("");
    setLinkUrl("");
    setSlot("sidebar");
    setButtonText("Saiba mais");
    setButtonColor("bg-accent-bright");
    setButtonAlignment("left");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const data = {
        title,
        imageUrl,
        linkUrl,
        slot,
        buttonText,
        buttonColor,
        buttonAlignment,
      };
      if (editingBanner) {
        return apiRequest("PUT", `/api/admin/banners/${editingBanner.id}`, data);
      }
      return apiRequest("POST", "/api/admin/banners", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home"] });
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
    setImageUrl(banner.imageUrl);
    setLinkUrl(banner.linkUrl || "");
    setSlot(banner.slot);
    setButtonText(banner.buttonText || "Saiba mais");
    setButtonColor(banner.buttonColor || "bg-accent-bright");
    setButtonAlignment(banner.buttonAlignment || "left");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
            <Label htmlFor="banner-slot">Local</Label>
            <Select value={slot} onValueChange={setSlot}>
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
          <div>
            <Label htmlFor="banner-button-text">Texto do Botão</Label>
            <Input id="banner-button-text" value={buttonText} onChange={(e) => setButtonText(e.target.value)} data-testid="input-banner-button-text" />
          </div>
          <div>
            <Label htmlFor="banner-button-color">Cor do Botão (Classe Tailwind)</Label>
            <Input id="banner-button-color" value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} data-testid="input-banner-button-color" placeholder="bg-accent-bright" />
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
            {banners.map((banner) => (
              <div key={banner.id} className="flex items-center gap-4 p-3 border rounded-md flex-wrap">
                {banner.imageUrl && (
                  <img src={banner.imageUrl} alt={banner.title} className="h-12 w-20 object-cover rounded-md flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{banner.title}</p>
                  <p className="text-xs text-muted-foreground">Local: {banner.slot}</p>
                </div>
                <div className="flex items-center gap-1">
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
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
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
          Configure os itens do menu de navegacao do site. URLs externas (com http) abrem em nova aba.
          Adicione sub-itens para criar menus dropdown.
        </p>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum item no menu. Clique em "Adicionar item" para comecar.</p>
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
                        <Label className="text-xs">Titulo</Label>
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
                              <Label className="text-xs">Titulo</Label>
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
