import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Edit, Trash2, Save, X, BarChart3, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tag } from "@shared/schema";

function slugify(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function ManageTags() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  const { data: tags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
    enabled: !!user,
  });

  const { data: postCounts } = useQuery<Record<number, number>>({
    queryKey: ["/api/admin/tags/post-counts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/tags/post-counts", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar contagem");
      return res.json();
    },
    enabled: !!user,
  });

  const sortedFilteredTags = useMemo(() => {
    if (!tags) return [];
    let filtered = tags;
    if (searchFilter.trim()) {
      const q = normalize(searchFilter.trim());
      filtered = tags.filter(t => normalize(t.name).includes(q));
    }
    return [...filtered].sort((a, b) => normalize(a.name).localeCompare(normalize(b.name), "pt-BR"));
  }, [tags, searchFilter]);

  const emptyTagCount = useMemo(() => {
    if (!tags || !postCounts) return 0;
    return tags.filter(t => !postCounts[t.id]).length;
  }, [tags, postCounts]);

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/tags", { name, slug: slug || slugify(name) }),
    onSuccess: () => {
      toast({ title: "Tag criada" });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tags/post-counts"] });
      resetForm();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/admin/tags/${editingId}`, { name, slug }),
    onSuccess: () => {
      toast({ title: "Tag atualizada" });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      resetForm();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/tags/${id}`);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Tag excluída", description: data?.reassigned ? `${data.reassigned} post(s) reclassificado(s) como "Indefinida".` : undefined });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tags/post-counts"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const handleDelete = (tag: Tag) => {
    if (!window.confirm(`Tem certeza que deseja excluir a tag "${tag.name}"? Posts que ficarem sem tag serão reclassificados como "Indefinida".`)) return;
    deleteMutation.mutate(tag.id);
  };

  const resetForm = () => { setName(""); setSlug(""); setEditingId(null); setIsAdding(false); };

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setName(tag.name);
    setSlug(tag.slug);
    setIsAdding(false);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

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
        <h1 className="font-serif text-2xl font-bold" data-testid="text-tags-title">Gerenciar Tags</h1>
      </div>

      {(isAdding || editingId !== null) && (
        <Card ref={formRef} className="p-4 mb-6">
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); if (!editingId) setSlug(slugify(e.target.value)); }} data-testid="input-tag-name" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} data-testid="input-tag-slug" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => editingId ? updateMutation.mutate() : createMutation.mutate()} disabled={!name} data-testid="button-save-tag">
                <Save className="h-4 w-4 mr-1" />
                {editingId ? "Atualizar" : "Criar"}
              </Button>
              <Button variant="outline" onClick={resetForm} data-testid="button-cancel-tag">
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {!isAdding && editingId === null && (
          <Button onClick={() => setIsAdding(true)} data-testid="button-add-tag">
            <Plus className="h-4 w-4 mr-1" />
            Nova Tag
          </Button>
        )}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tag..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9"
            data-testid="input-search-tags"
          />
        </div>
      </div>

      {postCounts && emptyTagCount > 0 && (
        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground" data-testid="text-legend-empty-tags">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-100 border border-red-300" />
          Tags sem posts ({emptyTagCount})
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {sortedFilteredTags.map((tag) => {
          const count = postCounts?.[tag.id] ?? 0;
          const isEmpty = postCounts !== undefined && count === 0;
          return (
            <Card
              key={tag.id}
              className={`p-3 ${isEmpty ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800" : ""}`}
              data-testid={`tag-item-${tag.id}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{tag.name}</span>
                <Link href={`/admin/tags/${tag.slug}`}>
                  <Button size="icon" variant="ghost" className="h-6 w-6" title="Ver detalhes" data-testid={`button-details-tag-${tag.id}`}>
                    <BarChart3 className="h-3 w-3" />
                  </Button>
                </Link>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(tag)} data-testid={`button-edit-tag-${tag.id}`}>
                  <Edit className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(tag)} data-testid={`button-delete-tag-${tag.id}`}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          );
        })}
        {sortedFilteredTags.length === 0 && tags && tags.length > 0 && (
          <p className="text-muted-foreground text-center py-8 w-full">Nenhuma tag encontrada para "{searchFilter}".</p>
        )}
        {(!tags || tags.length === 0) && (
          <p className="text-muted-foreground text-center py-8 w-full">Nenhuma tag criada ainda.</p>
        )}
      </div>
    </div>
  );
}
