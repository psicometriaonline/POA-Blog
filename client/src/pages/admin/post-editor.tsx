import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PostWithRelations, Category, Tag } from "@shared/schema";
import { Link } from "wouter";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function TiptapEditor({ content, onChange }: { content: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false }),
      ImageExtension,
      Placeholder.configure({ placeholder: "Escreva o conteudo do post aqui..." }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div>
      <div className="flex items-center gap-1 flex-wrap border-b p-2 bg-muted/30 rounded-t-md">
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("bold") ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleBold().run()}
          data-testid="button-bold"
        >
          B
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("italic") ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          data-testid="button-italic"
        >
          I
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("heading", { level: 2 }) ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          data-testid="button-h2"
        >
          H2
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("heading", { level: 3 }) ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          data-testid="button-h3"
        >
          H3
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("bulletList") ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          data-testid="button-ul"
        >
          Lista
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("orderedList") ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          data-testid="button-ol"
        >
          1. Lista
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("blockquote") ? "default" : "ghost"}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          data-testid="button-quote"
        >
          Citacao
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            const url = window.prompt("URL do link:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          data-testid="button-link"
        >
          Link
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            const url = window.prompt("URL da imagem:");
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
          data-testid="button-image"
        >
          Imagem
        </Button>
      </div>
      <div className="border border-t-0 rounded-b-md p-4">
        <EditorContent editor={editor} className="prose dark:prose-invert max-w-none" />
      </div>
    </div>
  );
}

export default function PostEditor() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const isNew = params.id === "novo";

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [status, setStatus] = useState("draft");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [slugManual, setSlugManual] = useState(false);

  const { data: post, isLoading: postLoading } = useQuery<PostWithRelations>({
    queryKey: [`/api/posts/${params.id}`],
    enabled: !isNew && !!user,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: !!user,
  });

  const { data: tags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
    enabled: !!user,
  });

  useEffect(() => {
    if (post && !isNew) {
      setTitle(post.title);
      setSlug(post.slug);
      setContent(post.content);
      setExcerpt(post.excerpt || "");
      setFeaturedImage(post.featuredImage || "");
      setAuthorName(post.authorName || "");
      setStatus(post.status);
      setSelectedCategories(post.categories.map(c => c.id));
      setSelectedTags(post.tags.map(t => t.id));
      setSlugManual(true);
    }
  }, [post, isNew]);

  useEffect(() => {
    if (!slugManual && title) {
      setSlug(slugify(title));
    }
  }, [title, slugManual]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title,
        slug,
        content,
        excerpt: excerpt || null,
        featuredImage: featuredImage || null,
        authorName: authorName || null,
        status,
        publishedAt: status === "published" ? new Date().toISOString() : null,
        categoryIds: selectedCategories,
        tagIds: selectedTags,
      };

      if (isNew) {
        return apiRequest("POST", "/api/admin/posts", body);
      } else {
        return apiRequest("PUT", `/api/admin/posts/${params.id}`, body);
      }
    },
    onSuccess: () => {
      toast({ title: isNew ? "Post criado com sucesso" : "Post atualizado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts?limit=50&offset=0"] });
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0] as string)?.startsWith("/api/posts") });
      setLocation("/admin");
    },
    onError: (error: any) => {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    },
  });

  if (authLoading || (!isNew && postLoading)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
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

  const handleCategoryToggle = (catId: number) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleTagToggle = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back-admin">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="font-serif text-2xl font-bold" data-testid="text-editor-title">
            {isNew ? "Novo Post" : "Editar Post"}
          </h1>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !title || !content}
          data-testid="button-save-post"
        >
          <Save className="h-4 w-4 mr-1" />
          {saveMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <Label htmlFor="title">Titulo</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titulo do post"
              data-testid="input-title"
            />
          </div>

          <div>
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
              placeholder="slug-do-post"
              data-testid="input-slug"
            />
          </div>

          <div>
            <Label>Conteudo</Label>
            <TiptapEditor content={content} onChange={setContent} />
          </div>

          <div>
            <Label htmlFor="excerpt">Resumo</Label>
            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Breve resumo do post..."
              className="resize-none"
              data-testid="input-excerpt"
            />
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <Label className="mb-2 block">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          <Card className="p-4">
            <Label htmlFor="featuredImage" className="mb-2 block">Imagem Destacada (URL)</Label>
            <Input
              id="featuredImage"
              value={featuredImage}
              onChange={(e) => setFeaturedImage(e.target.value)}
              placeholder="https://..."
              data-testid="input-featured-image"
            />
            {featuredImage && (
              <img src={featuredImage} alt="Preview" className="mt-2 rounded-md w-full h-auto" />
            )}
          </Card>

          <Card className="p-4">
            <Label htmlFor="authorName" className="mb-2 block">Autor</Label>
            <Input
              id="authorName"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Nome do autor"
              data-testid="input-author"
            />
          </Card>

          <Card className="p-4">
            <Label className="mb-2 block">Categorias</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {categories?.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`cat-${cat.id}`}
                    checked={selectedCategories.includes(cat.id)}
                    onCheckedChange={() => handleCategoryToggle(cat.id)}
                    data-testid={`checkbox-category-${cat.id}`}
                  />
                  <Label htmlFor={`cat-${cat.id}`} className="text-sm font-normal cursor-pointer">
                    {cat.name}
                  </Label>
                </div>
              ))}
              {(!categories || categories.length === 0) && (
                <p className="text-sm text-muted-foreground">Nenhuma categoria. Crie uma primeiro.</p>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <Label className="mb-2 block">Tags</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {tags?.map((tag) => (
                <div key={tag.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`tag-${tag.id}`}
                    checked={selectedTags.includes(tag.id)}
                    onCheckedChange={() => handleTagToggle(tag.id)}
                    data-testid={`checkbox-tag-${tag.id}`}
                  />
                  <Label htmlFor={`tag-${tag.id}`} className="text-sm font-normal cursor-pointer">
                    {tag.name}
                  </Label>
                </div>
              ))}
              {(!tags || tags.length === 0) && (
                <p className="text-sm text-muted-foreground">Nenhuma tag. Crie uma primeiro.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
