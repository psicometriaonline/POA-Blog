import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Edit, Trash2, Save, X, UserCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Author } from "@shared/schema";

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
            <div>
              <Label htmlFor="new-author-photo">Foto (URL)</Label>
              <Input id="new-author-photo" value={newPhoto} onChange={(e) => setNewPhoto(e.target.value)} placeholder="https://..." data-testid="input-new-author-photo" />
            </div>
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
                  <div>
                    <Label>Foto (URL)</Label>
                    <Input value={editPhoto} onChange={(e) => setEditPhoto(e.target.value)} data-testid={`input-edit-author-photo-${author.id}`} />
                  </div>
                  <div>
                    <Label>Biografia</Label>
                    <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className="resize-none" data-testid={`input-edit-author-bio-${author.id}`} />
                  </div>
                  {editPhoto && <img src={editPhoto} alt="Preview" className="w-16 h-16 rounded-full object-cover" />}
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
