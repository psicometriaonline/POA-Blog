import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Edit, Trash2, Save, X, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Category } from "@shared/schema";

function slugify(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function CategoriesManagerContent() {
  return <CategoriesManagerInner />;
}

export default function ManageCategories() {
  const { user } = useAuth();
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
        <a href="/api/login"><Button>Fazer Login</Button></a>
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="font-serif text-2xl font-bold" data-testid="text-categories-title">Gerenciar Categorias</h1>
      </div>
      <CategoriesManagerInner />
    </div>
  );
}

function CategoriesManagerInner() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/categories", { name, slug: slug || slugify(name), description: description || null }),
    onSuccess: () => {
      toast({ title: "Categoria criada" });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      resetForm();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/admin/categories/${editingId}`, { name, slug, description: description || null }),
    onSuccess: () => {
      toast({ title: "Categoria atualizada" });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      resetForm();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/categories/${id}`);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Categoria excluída", description: data?.reassigned ? `${data.reassigned} post(s) reclassificado(s) como "Indefinida".` : undefined });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const handleDelete = (cat: Category) => {
    if (!window.confirm(`Tem certeza que deseja excluir a categoria "${cat.name}"? Posts que ficarem sem categoria serão reclassificados como "Indefinida".`)) return;
    deleteMutation.mutate(cat.id);
  };

  const resetForm = () => { setName(""); setSlug(""); setDescription(""); setEditingId(null); setIsAdding(false); };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || "");
    setIsAdding(false);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  return (
    <>
      {(isAdding || editingId !== null) && (
        <Card ref={formRef} className="p-4 mb-6">
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); if (!editingId) setSlug(slugify(e.target.value)); }} data-testid="input-category-name" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} data-testid="input-category-slug" />
            </div>
            <div>
              <Label>Descricao</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none" data-testid="input-category-description" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => editingId ? updateMutation.mutate() : createMutation.mutate()} disabled={!name} data-testid="button-save-category">
                <Save className="h-4 w-4 mr-1" />
                {editingId ? "Atualizar" : "Criar"}
              </Button>
              <Button variant="outline" onClick={resetForm} data-testid="button-cancel-category">
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!isAdding && editingId === null && (
        <Button onClick={() => setIsAdding(true)} className="mb-4" data-testid="button-add-category">
          <Plus className="h-4 w-4 mr-1" />
          Nova Categoria
        </Button>
      )}

      <div className="space-y-2">
        {categories?.map((cat) => (
          <Card key={cat.id} className="p-4" data-testid={`category-item-${cat.id}`}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-medium">{cat.name}</p>
                <p className="text-xs text-muted-foreground">/{cat.slug}</p>
              </div>
              <div className="flex gap-1">
                <Link href={`/admin/categorias/${cat.slug}`}>
                  <Button size="icon" variant="ghost" title="Ver detalhes" data-testid={`button-details-category-${cat.id}`}>
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </Link>
                <Button size="icon" variant="ghost" onClick={() => startEdit(cat)} data-testid={`button-edit-category-${cat.id}`}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(cat)} data-testid={`button-delete-category-${cat.id}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {(!categories || categories.length === 0) && (
          <p className="text-muted-foreground text-center py-8">Nenhuma categoria criada ainda.</p>
        )}
      </div>
    </>
  );
}
