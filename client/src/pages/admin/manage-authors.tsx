import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Edit, Trash2, Save, X, UserCircle, Upload, ImageIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MediaLibraryModal } from "@/components/media-library-modal";
import { ImageCropModal } from "@/components/image-crop-modal";
import type { Author } from "@shared/schema";

function AuthorPhotoSelector({ photo, onPhotoChange, idPrefix }: { photo: string; onPhotoChange: (url: string) => void; idPrefix: string }) {
  const { toast } = useToast();
  const [mediaLibOpen, setMediaLibOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione um arquivo de imagem.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleMediaLibSelect = (url: string) => {
    setMediaLibOpen(false);
    setCropSrc(url);
  };

  const handleCropComplete = async (blob: Blob) => {
    setCropSrc(null);
    try {
      const formData = new FormData();
      formData.append("file", blob, `author-photo-${Date.now()}.jpg`);
      formData.append("altText", "Foto do autor");
      formData.append("title", "Foto do autor");
      const res = await fetch("/api/admin/media", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Falha no upload");
      const mediaItem = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      onPhotoChange(mediaItem.url);
      toast({ title: "Foto recortada e salva com sucesso" });
    } catch (err) {
      toast({ title: "Erro ao salvar foto", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
    }
  };

  return (
    <div>
      <Label>Foto do Autor</Label>
      <p className="text-xs text-muted-foreground mb-2">Tamanho recomendado: 200×200px (formato quadrado)</p>
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {photo ? (
            <div className="relative group">
              <img src={photo} alt="Foto do autor" className="w-20 h-20 rounded-full object-cover border-2 border-muted" data-testid={`${idPrefix}-photo-preview`} />
              <button
                type="button"
                onClick={() => onPhotoChange("")}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`${idPrefix}-photo-remove`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
              <UserCircle className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            data-testid={`${idPrefix}-photo-file-input`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            data-testid={`${idPrefix}-photo-upload`}
          >
            <Upload className="h-3.5 w-3.5 mr-1" />
            Enviar do PC
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMediaLibOpen(true)}
            data-testid={`${idPrefix}-photo-library`}
          >
            <ImageIcon className="h-3.5 w-3.5 mr-1" />
            Biblioteca
          </Button>
        </div>
      </div>

      <MediaLibraryModal
        open={mediaLibOpen}
        onClose={() => setMediaLibOpen(false)}
        onSelect={handleMediaLibSelect}
      />

      {cropSrc && (
        <ImageCropModal
          open={!!cropSrc}
          imageSrc={cropSrc}
          onClose={() => setCropSrc(null)}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}

export function AuthorsManagerContent() {
  return <AuthorsManagerInner />;
}

export default function ManageAuthors() {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

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
          <Button variant="ghost" size="icon" data-testid="button-back-admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="font-serif text-2xl font-bold" data-testid="text-manage-authors-title">
          Gerenciar Autores
        </h1>
      </div>
      <AuthorsManagerInner />
    </div>
  );
}

function AuthorsManagerInner() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [editBio, setEditBio] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhoto, setNewPhoto] = useState("");
  const [newBio, setNewBio] = useState("");

  const { data: authorsList, isLoading } = useQuery<Author[]>({
    queryKey: ["/api/authors"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; photo: string; bio: string }) =>
      apiRequest("POST", "/api/admin/authors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authors"] });
      toast({ title: "Autor criado com sucesso" });
      setShowNew(false);
      setNewName("");
      setNewPhoto("");
      setNewBio("");
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar autor", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; photo: string; bio: string } }) =>
      apiRequest("PUT", `/api/admin/authors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authors"] });
      toast({ title: "Autor atualizado com sucesso" });
      setEditingId(null);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar autor", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/authors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authors"] });
      toast({ title: "Autor excluido com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir autor", description: error.message, variant: "destructive" });
    },
  });

  const startEdit = (author: Author) => {
    setEditingId(author.id);
    setEditName(author.name);
    setEditPhoto(author.photo || "");
    setEditBio(author.bio || "");
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowNew(true)} disabled={showNew} data-testid="button-new-author">
          <Plus className="h-4 w-4 mr-1" />
          Novo Autor
        </Button>
      </div>

      {showNew && (
        <Card className="p-4 mb-6" data-testid="card-new-author">
          <h3 className="font-semibold mb-3">Novo Autor</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="new-author-name">Nome</Label>
              <Input id="new-author-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do autor" data-testid="input-new-author-name" />
            </div>
            <AuthorPhotoSelector photo={newPhoto} onPhotoChange={setNewPhoto} idPrefix="new-author" />
            <div>
              <Label htmlFor="new-author-bio">Biografia</Label>
              <Textarea id="new-author-bio" value={newBio} onChange={(e) => setNewBio(e.target.value)} placeholder="Breve biografia do autor..." className="resize-none" data-testid="input-new-author-bio" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate({ name: newName, photo: newPhoto, bio: newBio })} disabled={!newName || createMutation.isPending} data-testid="button-save-new-author">
                <Save className="h-4 w-4 mr-1" />
                Salvar
              </Button>
              <Button variant="ghost" onClick={() => setShowNew(false)} data-testid="button-cancel-new-author">
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {authorsList?.map((author) => (
            <Card key={author.id} className="p-4" data-testid={`card-author-${author.id}`}>
              {editingId === author.id ? (
                <div className="space-y-3">
                  <div>
                    <Label>Nome</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} data-testid={`input-edit-author-name-${author.id}`} />
                  </div>
                  <AuthorPhotoSelector photo={editPhoto} onPhotoChange={setEditPhoto} idPrefix={`edit-author-${author.id}`} />
                  <div>
                    <Label>Biografia</Label>
                    <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className="resize-none" data-testid={`input-edit-author-bio-${author.id}`} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateMutation.mutate({ id: author.id, data: { name: editName, photo: editPhoto, bio: editBio } })} disabled={!editName || updateMutation.isPending} data-testid={`button-save-edit-author-${author.id}`}>
                      <Save className="h-3 w-3 mr-1" />
                      Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} data-testid={`button-cancel-edit-author-${author.id}`}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {author.photo ? (
                    <img src={author.photo} alt={author.name} className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                      <UserCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link href={`/admin/autores/${author.id}`}>
                      <p className="font-semibold text-primary hover:underline cursor-pointer" data-testid={`text-author-name-${author.id}`}>{author.name}</p>
                    </Link>
                    {author.bio && <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-author-bio-${author.id}`}>{author.bio}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(author)} data-testid={`button-edit-author-${author.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Tem certeza que deseja excluir este autor?")) deleteMutation.mutate(author.id); }} data-testid={`button-delete-author-${author.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
          {(!authorsList || authorsList.length === 0) && (
            <p className="text-center text-muted-foreground py-8">Nenhum autor cadastrado.</p>
          )}
        </div>
      )}
    </>
  );
}
