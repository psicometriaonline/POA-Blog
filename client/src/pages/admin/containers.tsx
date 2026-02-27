import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Image, Layers, Eye, ChevronDown, ChevronUp, Edit } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import type { ImageGroupWithItems, ContainerRuleWithGroup, Category, Tag, PostWithRelations, ImageBankItem } from "@shared/schema";
import { Upload, Link as LinkIcon } from "lucide-react";

const CONTAINER_TYPES = [
  { value: "post-image", label: "Imagem no Post" },
  { value: "sidebar-banner", label: "Banner Lateral" },
  { value: "horizontal-banner", label: "Banner Horizontal" },
  { value: "deliverable", label: "Entregável" },
];

const CRITERIA_TYPES = [
  { value: "all", label: "Todos os posts" },
  { value: "category", label: "Por Categoria" },
  { value: "tag", label: "Por Tag" },
];

function ImageGroupsTab() {
  const { toast } = useToast();
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [newImageAlt, setNewImageAlt] = useState("");
  const [newImageTitle, setNewImageTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingGroup, setEditingGroup] = useState<number | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDesc, setEditGroupDesc] = useState("");

  const { data: groups, isLoading } = useQuery<ImageGroupWithItems[]>({
    queryKey: ["/api/admin/image-groups"],
  });

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/image-groups", { name: newGroupName, description: newGroupDesc || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/image-groups"] });
      setNewGroupName("");
      setNewGroupDesc("");
      toast({ title: "Grupo criado com sucesso" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/admin/image-groups/${id}`, { name: editGroupName, description: editGroupDesc || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/image-groups"] });
      setEditingGroup(null);
      toast({ title: "Grupo atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/image-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/image-groups"] });
      toast({ title: "Grupo excluído" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const handleFileUpload = async (groupId: number, file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: formData, credentials: "include" });
      if (!uploadRes.ok) throw new Error("Falha no upload");
      const { url } = await uploadRes.json();
      await apiRequest("POST", "/api/admin/image-bank", {
        groupId,
        imageUrl: url,
        altText: newImageAlt || null,
        title: newImageTitle || null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/image-groups"] });
      setNewImageAlt("");
      setNewImageTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({ title: "Imagem enviada e adicionada" });
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteImageMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/image-bank/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/image-groups"] });
      toast({ title: "Imagem removida" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleImageActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiRequest("PUT", `/api/admin/image-bank/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/image-groups"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Criar Novo Grupo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Nome do Grupo</Label>
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Ex: Imagens TRI"
              data-testid="input-group-name"
            />
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Input
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              placeholder="Descrição do grupo"
              data-testid="input-group-desc"
            />
          </div>
        </div>
        <Button
          className="mt-3"
          onClick={() => createGroupMutation.mutate()}
          disabled={!newGroupName.trim() || createGroupMutation.isPending}
          data-testid="button-create-group"
        >
          <Plus className="h-4 w-4 mr-1" />
          Criar Grupo
        </Button>
      </Card>

      {groups?.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum grupo de imagens criado ainda.</p>
        </Card>
      )}

      {groups?.map((group) => (
        <Card key={group.id} className="overflow-hidden" data-testid={`card-group-${group.id}`}>
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
            data-testid={`button-expand-group-${group.id}`}
          >
            <div className="flex items-center gap-3">
              <Image className="h-5 w-5 text-primary" />
              <div>
                {editingGroup === group.id ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      className="h-8 w-48"
                      data-testid="input-edit-group-name"
                    />
                    <Input
                      value={editGroupDesc}
                      onChange={(e) => setEditGroupDesc(e.target.value)}
                      className="h-8 w-48"
                      placeholder="Descrição"
                      data-testid="input-edit-group-desc"
                    />
                    <Button size="sm" onClick={() => updateGroupMutation.mutate(group.id)} data-testid="button-save-group">
                      Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingGroup(null)} data-testid="button-cancel-edit-group">
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold" data-testid={`text-group-name-${group.id}`}>{group.name}</h3>
                    {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
                  </>
                )}
              </div>
              <Badge variant="secondary">{group.items.length} imagens</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingGroup(group.id);
                  setEditGroupName(group.name);
                  setEditGroupDesc(group.description || "");
                }}
                data-testid={`button-edit-group-${group.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Excluir este grupo e todas as suas imagens?")) deleteGroupMutation.mutate(group.id);
                }}
                data-testid={`button-delete-group-${group.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
              {expandedGroup === group.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>

          {expandedGroup === group.id && (
            <div className="border-t p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {group.items.map((item) => (
                  <div key={item.id} className={`relative group rounded-md overflow-hidden border ${!item.isActive ? 'opacity-50' : ''}`} data-testid={`card-image-${item.id}`}>
                    <img
                      src={item.imageUrl}
                      alt={item.altText || ""}
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleImageActiveMutation.mutate({ id: item.id, isActive: !item.isActive })}
                        data-testid={`button-toggle-image-${item.id}`}
                      >
                        {item.isActive ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteImageMutation.mutate(item.id)}
                        data-testid={`button-delete-image-${item.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {item.title && <p className="text-xs p-1 truncate">{item.title}</p>}
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Adicionar Imagem</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Arquivo de Imagem *</Label>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      data-testid="input-image-file"
                      className="cursor-pointer"
                    />
                  </div>
                  <div>
                    <Label>Texto Alternativo</Label>
                    <Input
                      value={newImageAlt}
                      onChange={(e) => setNewImageAlt(e.target.value)}
                      placeholder="Descrição da imagem"
                      data-testid="input-image-alt"
                    />
                  </div>
                  <div>
                    <Label>Título</Label>
                    <Input
                      value={newImageTitle}
                      onChange={(e) => setNewImageTitle(e.target.value)}
                      placeholder="Título da imagem"
                      data-testid="input-image-title"
                    />
                  </div>
                </div>
                <Button
                  className="mt-3"
                  size="sm"
                  onClick={() => {
                    const file = fileInputRef.current?.files?.[0];
                    if (file) handleFileUpload(group.id, file);
                  }}
                  disabled={uploading}
                  data-testid="button-add-image"
                >
                  {uploading ? (
                    <>Enviando...</>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-1" />
                      Enviar Imagem
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function RulesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    containerType: "post-image",
    criteriaType: "all",
    criteriaValue: "",
    imageGroupId: 0,
    maxImages: 3,
    isActive: true,
    priority: 0,
    linkUrl: "",
  });

  const { data: rules, isLoading: rulesLoading } = useQuery<ContainerRuleWithGroup[]>({
    queryKey: ["/api/admin/container-rules"],
  });

  const { data: groups } = useQuery<ImageGroupWithItems[]>({
    queryKey: ["/api/admin/image-groups"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: allTags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  const createRuleMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...formData,
        criteriaValue: formData.criteriaType === "all" ? null : formData.criteriaValue,
        linkUrl: formData.linkUrl || null,
      };
      if (editingRuleId) {
        await apiRequest("PUT", `/api/admin/container-rules/${editingRuleId}`, payload);
      } else {
        await apiRequest("POST", "/api/admin/container-rules", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/container-rules"] });
      resetForm();
      toast({ title: editingRuleId ? "Regra atualizada" : "Regra criada com sucesso" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/container-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/container-rules"] });
      toast({ title: "Regra excluída" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiRequest("PUT", `/api/admin/container-rules/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/container-rules"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingRuleId(null);
    setFormData({ name: "", containerType: "post-image", criteriaType: "all", criteriaValue: "", imageGroupId: 0, maxImages: 3, isActive: true, priority: 0, linkUrl: "" });
  };

  const startEdit = (rule: ContainerRuleWithGroup) => {
    setEditingRuleId(rule.id);
    setFormData({
      name: rule.name,
      containerType: rule.containerType,
      criteriaType: rule.criteriaType,
      criteriaValue: rule.criteriaValue || "",
      imageGroupId: rule.imageGroupId,
      maxImages: rule.maxImages,
      isActive: rule.isActive,
      priority: rule.priority,
      linkUrl: rule.linkUrl || "",
    });
    setShowForm(true);
  };

  if (rulesLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} data-testid="button-new-rule">
          <Plus className="h-4 w-4 mr-1" />
          Nova Regra
        </Button>
      ) : (
        <Card className="p-5">
          <h3 className="font-semibold mb-4">{editingRuleId ? "Editar Regra" : "Nova Regra"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nome da Regra *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Imagens para posts de TRI"
                data-testid="input-rule-name"
              />
            </div>
            <div>
              <Label>Tipo de Contêiner *</Label>
              <Select value={formData.containerType} onValueChange={(v) => setFormData({ ...formData, containerType: v })}>
                <SelectTrigger data-testid="select-container-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTAINER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Critério de Aplicação *</Label>
              <Select value={formData.criteriaType} onValueChange={(v) => setFormData({ ...formData, criteriaType: v, criteriaValue: "" })}>
                <SelectTrigger data-testid="select-criteria-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRITERIA_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.criteriaType === "category" && (
              <div>
                <Label>Categoria</Label>
                <Select value={formData.criteriaValue} onValueChange={(v) => setFormData({ ...formData, criteriaValue: v })}>
                  <SelectTrigger data-testid="select-criteria-category">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formData.criteriaType === "tag" && (
              <div>
                <Label>Tag</Label>
                <Select value={formData.criteriaValue} onValueChange={(v) => setFormData({ ...formData, criteriaValue: v })}>
                  <SelectTrigger data-testid="select-criteria-tag">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allTags?.map((t) => (
                      <SelectItem key={t.slug} value={t.slug}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Grupo de Imagens *</Label>
              <Select value={formData.imageGroupId ? String(formData.imageGroupId) : ""} onValueChange={(v) => setFormData({ ...formData, imageGroupId: parseInt(v) })}>
                <SelectTrigger data-testid="select-image-group">
                  <SelectValue placeholder="Selecione um grupo..." />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.name} ({g.items.length} imagens)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Máx. Imagens por Post</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={formData.maxImages}
                onChange={(e) => setFormData({ ...formData, maxImages: parseInt(e.target.value) || 3 })}
                data-testid="input-max-images"
              />
            </div>
            <div>
              <Label>Prioridade (maior = mais importante)</Label>
              <Input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                data-testid="input-priority"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Link ao Clicar na Imagem (opcional)</Label>
              <Input
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="https://..."
                data-testid="input-link-url"
              />
              <p className="text-xs text-muted-foreground mt-1">Se preenchido, a imagem será clicável e direcionará para este link.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <Button
              onClick={() => createRuleMutation.mutate()}
              disabled={!formData.name.trim() || !formData.imageGroupId || createRuleMutation.isPending}
              data-testid="button-save-rule"
            >
              {editingRuleId ? "Atualizar Regra" : "Criar Regra"}
            </Button>
            <Button variant="outline" onClick={resetForm} data-testid="button-cancel-rule">
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {rules?.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nenhuma regra criada ainda.</p>
        </Card>
      )}

      <div className="space-y-3">
        {rules?.map((rule) => (
          <Card key={rule.id} className={`p-4 ${!rule.isActive ? 'opacity-60' : ''}`} data-testid={`card-rule-${rule.id}`}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium" data-testid={`text-rule-name-${rule.id}`}>{rule.name}</h4>
                  <Badge variant="outline">{CONTAINER_TYPES.find(t => t.value === rule.containerType)?.label}</Badge>
                  {!rule.isActive && <Badge variant="secondary">Inativa</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {rule.criteriaType === "all" && "Aplica a todos os posts"}
                  {rule.criteriaType === "category" && `Categoria: ${rule.criteriaValue}`}
                  {rule.criteriaType === "tag" && `Tag: ${rule.criteriaValue}`}
                  {" • "}Grupo: {rule.imageGroup.name}
                  {" • "}Máx: {rule.maxImages} imagens
                  {" • "}Prioridade: {rule.priority}
                  {rule.linkUrl && <>{" • "}<LinkIcon className="h-3 w-3 inline" /> {rule.linkUrl}</>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={rule.isActive}
                  onCheckedChange={(checked) => toggleRuleMutation.mutate({ id: rule.id, isActive: checked })}
                  data-testid={`switch-rule-${rule.id}`}
                />
                <Button variant="ghost" size="sm" onClick={() => startEdit(rule)} data-testid={`button-edit-rule-${rule.id}`}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { if (confirm("Excluir esta regra?")) deleteRuleMutation.mutate(rule.id); }}
                  data-testid={`button-delete-rule-${rule.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PreviewTab() {
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

  const { data: postsData } = useQuery<{ posts: PostWithRelations[]; total: number }>({
    queryKey: ["/api/admin/posts?limit=50&offset=0"],
  });

  const { data: containerImages, isLoading: previewLoading } = useQuery<{ images: ImageBankItem[]; rule: { name: string; maxImages: number } }[]>({
    queryKey: ["/api/posts", selectedPostId, "container-images"],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${selectedPostId}/container-images`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedPostId,
  });

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <Label>Selecione um post para pré-visualizar</Label>
        <Select value={selectedPostId ? String(selectedPostId) : ""} onValueChange={(v) => setSelectedPostId(parseInt(v))}>
          <SelectTrigger className="mt-2" data-testid="select-preview-post">
            <SelectValue placeholder="Escolha um post..." />
          </SelectTrigger>
          <SelectContent>
            {postsData?.posts.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {selectedPostId && previewLoading && (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {selectedPostId && !previewLoading && containerImages && (
        <Card className="p-5">
          {containerImages.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma regra correspondente para este post. Verifique as categorias/tags do post e as regras cadastradas.
            </p>
          ) : (
            containerImages.map((result, idx) => (
              <div key={idx}>
                <h4 className="font-medium mb-2">
                  Regra: {result.rule.name} — {result.images.length} imagem(ns) selecionada(s)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {result.images.map((img) => (
                    <div key={img.id} className="rounded-md overflow-hidden border" data-testid={`preview-image-${img.id}`}>
                      <img src={img.imageUrl} alt={img.altText || ""} className="w-full h-32 object-cover" />
                      {img.title && <p className="text-xs p-1 truncate">{img.title}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </Card>
      )}
    </div>
  );
}

export default function ContainersPage() {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
        <p className="text-muted-foreground mb-6">Faça login para acessar o painel administrativo.</p>
        <a href="/api/login">
          <Button data-testid="button-login">Fazer Login</Button>
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin">
          <Button variant="ghost" size="sm" data-testid="button-back-admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="font-serif text-3xl font-bold" data-testid="text-containers-title">
          Gerenciamento de Contêineres
        </h1>
      </div>

      <Tabs defaultValue="groups">
        <TabsList className="mb-6" data-testid="tabs-containers">
          <TabsTrigger value="groups" data-testid="tab-groups">
            <Image className="h-4 w-4 mr-1" />
            Banco de Imagens
          </TabsTrigger>
          <TabsTrigger value="rules" data-testid="tab-rules">
            <Layers className="h-4 w-4 mr-1" />
            Regras
          </TabsTrigger>
          <TabsTrigger value="preview" data-testid="tab-preview">
            <Eye className="h-4 w-4 mr-1" />
            Pré-visualização
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups">
          <ImageGroupsTab />
        </TabsContent>

        <TabsContent value="rules">
          <RulesTab />
        </TabsContent>

        <TabsContent value="preview">
          <PreviewTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
