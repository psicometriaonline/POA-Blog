import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Code, Sigma, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PostWithRelations, Category, Tag, Author } from "@shared/schema";
import { Link } from "wouter";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { MathInline, MathBlock } from "@/lib/tiptap-math";
import katex from "katex";
import "katex/dist/katex.min.css";

const lowlight = createLowlight(common);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function MathPreview({ latex }: { latex: string }) {
  try {
    const html = katex.renderToString(latex, { throwOnError: false, displayMode: false });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <span className="text-destructive text-xs">{latex}</span>;
  }
}

const LANGUAGES = [
  { value: "", label: "Auto-detectar" },
  { value: "python", label: "Python" },
  { value: "r", label: "R" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash" },
  { value: "css", label: "CSS" },
  { value: "html", label: "HTML" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "latex", label: "LaTeX" },
];

function TiptapEditor({ content, onChange }: { content: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      LinkExtension.configure({ openOnClick: false }),
      ImageExtension,
      Placeholder.configure({ placeholder: "Escreva o conteudo do post aqui..." }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: null,
      }),
      MathInline,
      MathBlock,
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

  const insertMath = useCallback((isBlock: boolean) => {
    if (!editor) return;
    const latex = window.prompt(
      isBlock ? "Formula em bloco (LaTeX):" : "Formula inline (LaTeX):",
      isBlock ? "\\sum_{i=1}^{n} x_i" : "x^2 + y^2 = r^2"
    );
    if (!latex) return;

    if (isBlock) {
      (editor.commands as any).insertMathBlock(latex);
    } else {
      (editor.commands as any).insertMathInline(latex);
    }
  }, [editor]);

  const insertCodeBlock = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleCodeBlock().run();
  }, [editor]);

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

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          size="sm"
          variant={editor.isActive("codeBlock") ? "default" : "ghost"}
          onClick={insertCodeBlock}
          data-testid="button-code-block"
          title="Bloco de codigo"
        >
          <Code className="h-4 w-4 mr-1" />
          Codigo
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => insertMath(false)}
          data-testid="button-math-inline"
          title="Formula matematica inline"
        >
          <Sigma className="h-4 w-4 mr-1" />
          f(x)
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => insertMath(true)}
          data-testid="button-math-block"
          title="Formula matematica em bloco"
        >
          <Sigma className="h-4 w-4 mr-1" />
          Equacao
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
  const [authorId, setAuthorId] = useState<string>("");
  const [status, setStatus] = useState("draft");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [slugManual, setSlugManual] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTagName, setNewTagName] = useState("");

  const { data: post, isLoading: postLoading } = useQuery<PostWithRelations>({
    queryKey: [`/api/posts/${params.id}`],
    enabled: !isNew && !!user,
  });

  const { data: allAuthors } = useQuery<Author[]>({
    queryKey: ["/api/authors"],
    enabled: !!user,
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
      setAuthorId(post.authorId ? String(post.authorId) : "");
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
      const selectedAuthor = allAuthors?.find(a => a.id === parseInt(authorId));
      const body = {
        title,
        slug,
        content,
        excerpt: excerpt || null,
        featuredImage: featuredImage || null,
        authorId: authorId ? parseInt(authorId) : null,
        authorName: selectedAuthor?.name || null,
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

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const catSlug = slugify(name);
      const res = await apiRequest("POST", "/api/admin/categories", { name, slug: catSlug, description: null });
      return res.json();
    },
    onSuccess: (cat: Category) => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setSelectedCategories(prev => [...prev, cat.id]);
      setNewCategoryName("");
      toast({ title: `Categoria "${cat.name}" criada` });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar categoria", description: error.message, variant: "destructive" });
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const tagSlug = slugify(name);
      const res = await apiRequest("POST", "/api/admin/tags", { name, slug: tagSlug });
      return res.json();
    },
    onSuccess: (tag: Tag) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setSelectedTags(prev => [...prev, tag.id]);
      setNewTagName("");
      toast({ title: `Tag "${tag.name}" criada` });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar tag", description: error.message, variant: "destructive" });
    },
  });

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
            <Label className="mb-2 block">Autor</Label>
            <Select value={authorId} onValueChange={setAuthorId}>
              <SelectTrigger data-testid="select-author">
                <SelectValue placeholder="Selecionar autor..." />
              </SelectTrigger>
              <SelectContent>
                {allAuthors?.map((author) => (
                  <SelectItem key={author.id} value={String(author.id)}>
                    {author.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <p className="text-sm text-muted-foreground">Nenhuma categoria ainda.</p>
              )}
            </div>
            <div className="flex gap-1 mt-3 pt-3 border-t">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nova categoria..."
                className="h-8 text-sm"
                data-testid="input-new-category"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCategoryName.trim()) {
                    e.preventDefault();
                    createCategoryMutation.mutate(newCategoryName.trim());
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2"
                disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                onClick={() => createCategoryMutation.mutate(newCategoryName.trim())}
                data-testid="button-add-category"
              >
                <Plus className="h-3 w-3" />
              </Button>
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
                <p className="text-sm text-muted-foreground">Nenhuma tag ainda.</p>
              )}
            </div>
            <div className="flex gap-1 mt-3 pt-3 border-t">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nova tag..."
                className="h-8 text-sm"
                data-testid="input-new-tag"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTagName.trim()) {
                    e.preventDefault();
                    createTagMutation.mutate(newTagName.trim());
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2"
                disabled={!newTagName.trim() || createTagMutation.isPending}
                onClick={() => createTagMutation.mutate(newTagName.trim())}
                data-testid="button-add-tag"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
