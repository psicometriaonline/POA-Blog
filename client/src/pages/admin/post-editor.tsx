import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Code, Sigma, Plus, Image as ImageIcon, Link2, CheckCircle, XCircle, AlertTriangle, Loader2, ChevronDown, ChevronRight, Copy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { MediaLibraryModal } from "@/components/media-library-modal";
import { SeoPanel } from "@/components/seo-panel";
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
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { MathInline, MathBlock } from "@/lib/tiptap-math";
import { CitationBox } from "@/lib/tiptap-citation";
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

function TiptapEditor({ content, onChange, onOpenMediaLib, editorRef, getTitle, getAuthorName, getSlug }: { content: string; onChange: (html: string) => void; onOpenMediaLib?: () => void; editorRef?: React.MutableRefObject<any>; getTitle?: () => string; getAuthorName?: () => string; getSlug?: () => string }) {
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
        defaultLanguage: "r",
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      CitationBox,
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

  useEffect(() => {
    if (editorRef && editor) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

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
            onOpenMediaLib?.();
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

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          type="button"
          size="sm"
          variant={editor.isActive("table") ? "default" : "ghost"}
          onClick={() => {
            if (editor.isActive("table")) return;
            const rows = window.prompt("Linhas:", "3");
            const cols = window.prompt("Colunas:", "3");
            if (rows && cols) {
              editor.chain().focus().insertTable({ rows: parseInt(rows), cols: parseInt(cols), withHeaderRow: true }).run();
            }
          }}
          data-testid="button-table"
          title="Inserir tabela"
        >
          Tabela
        </Button>
        {editor.isActive("table") && (
          <>
            <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().addColumnAfter().run()} data-testid="button-add-col" title="Adicionar coluna">
              +Col
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().addRowAfter().run()} data-testid="button-add-row" title="Adicionar linha">
              +Linha
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().deleteColumn().run()} data-testid="button-del-col" title="Remover coluna">
              -Col
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().deleteRow().run()} data-testid="button-del-row" title="Remover linha">
              -Linha
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().deleteTable().run()} data-testid="button-del-table" title="Remover tabela">
              Apagar
            </Button>
          </>
        )}

        <Button
          type="button"
          size="sm"
          variant={editor.isActive("citationBox") ? "default" : "ghost"}
          onClick={() => {
            if (editor.isActive("citationBox")) {
              (editor.commands as any).toggleCitationBox();
            } else {
              const title = getTitle?.() || "";
              const authorName = getAuthorName?.() || "Autor";
              const slug = getSlug?.() || "";
              
              const now = new Date();
              const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
              
              const nameParts = authorName.trim().split(/\s+/);
              const lastName = nameParts[nameParts.length - 1];
              const firstInitial = nameParts[0].charAt(0);
              
              let fmtTitle = title.trim();
              if (fmtTitle.includes(':')) {
                const [m, s] = fmtTitle.split(':');
                const fp = (str) => str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase();
                fmtTitle = `${fp(m)}: ${fp(s)}`;
              } else {
                fmtTitle = fmtTitle.charAt(0).toUpperCase() + fmtTitle.slice(1).toLowerCase();
              }
              
              const endsWithPunctuation = /[.!?;:…]$/.test(fmtTitle);
              const titleWithSeparator = endsWithPunctuation ? fmtTitle : fmtTitle + ".";
              
              const htmlCitation = `<div class="citation-box"><p>${lastName}, ${firstInitial}. (${now.getFullYear()}, ${now.getDate()} de ${months[now.getMonth()]}). ${titleWithSeparator} <em>Blog Psicometria Online</em>. https://www.blog.psicometriaonline.com.br/${slug}</p></div>`;
              editor.chain().focus().insertContent(htmlCitation).run();
            }
          }}
          data-testid="button-citation-box"
          title="Gerar citação automática"
        >
          Citação
        </Button>
      </div>
      <div className="border border-t-0 rounded-b-md p-4">
        <EditorContent editor={editor} className="prose dark:prose-invert max-w-none" />
      </div>
      <div className="flex justify-end px-2 py-1 text-xs text-muted-foreground border border-t-0 rounded-b-md bg-muted/20" data-testid="text-word-count">
        {(() => {
          const text = editor.getText();
          const words = text.trim() ? text.trim().split(/\s+/).length : 0;
          return `${words} palavra${words !== 1 ? "s" : ""}`;
        })()}
      </div>
    </div>
  );
}

function LinkSuggestionsPanel({ postId, toast }: { postId: number; toast: any }) {
  const [expanded, setExpanded] = useState(false);

  const { data: suggestions, isLoading, refetch, isFetching } = useQuery<{ title: string; slug: string; reason: string }[]>({
    queryKey: ["/api/admin/posts", postId, "link-suggestions"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/posts/${postId}/link-suggestions`, { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao buscar sugestões");
      return res.json();
    },
    enabled: expanded,
  });

  const copyUrl = (slug: string) => {
    const url = `/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "URL copiada", description: url });
    });
  };

  return (
    <Card className="p-4">
      <button
        type="button"
        className="flex items-center justify-between gap-2 w-full text-left"
        onClick={() => setExpanded(!expanded)}
        data-testid="button-toggle-link-suggestions"
      >
        <Label className="cursor-pointer flex items-center gap-1">
          <Link2 className="h-4 w-4" />
          Sugestões de links internos
        </Label>
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          {(isLoading || isFetching) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando sugestões...
            </div>
          )}
          {!isLoading && !isFetching && suggestions && suggestions.length === 0 && (
            <p className="text-xs text-muted-foreground italic" data-testid="text-no-suggestions">Nenhuma sugestão encontrada.</p>
          )}
          {!isLoading && !isFetching && suggestions && suggestions.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {suggestions.map((s, idx) => (
                <div key={idx} className="flex items-start justify-between gap-2 py-1 border-b last:border-b-0" data-testid={`link-suggestion-${idx}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" title={s.title} data-testid={`text-suggestion-title-${idx}`}>{s.title}</p>
                    <p className="text-xs text-muted-foreground" data-testid={`text-suggestion-reason-${idx}`}>{s.reason}</p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => copyUrl(s.slug)}
                    title="Copiar URL"
                    data-testid={`button-copy-suggestion-${idx}`}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {!isLoading && !isFetching && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="w-full mt-2"
              data-testid="button-refresh-suggestions"
            >
              Atualizar sugestões
            </Button>
          )}
        </div>
      )}
    </Card>
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
  const [scheduledAt, setScheduledAt] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [slugManual, setSlugManual] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [disabledContainers, setDisabledContainers] = useState<number[]>([]);
  const [seoTitle, setSeoTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [mediaLibOpen, setMediaLibOpen] = useState(false);
  const [mediaLibTarget, setMediaLibTarget] = useState<"inline" | "featured">("inline");
  const editorInstanceRef = useRef<any>(null);
  const [linkCheckResults, setLinkCheckResults] = useState<{ url: string; text: string; status: "ok" | "broken" | "error"; statusCode?: number; reason?: string }[] | null>(null);
  const [linkCheckLoading, setLinkCheckLoading] = useState(false);

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

  useEffect(() => {
    if (post && !isNew) {
      setTitle(post.title);
      setSlug(post.slug);
      setContent(post.content);
      setExcerpt(post.excerpt || "");
      setFeaturedImage(post.featuredImage || "");
      setAuthorId(post.authorId ? String(post.authorId) : "");
      setStatus(post.status);
      if (post.status === "scheduled" && post.publishedAt) {
        const d = new Date(post.publishedAt);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setScheduledAt(local);
      }
      setSelectedCategories(post.categories.map(c => c.id));
      setSelectedTags(post.tags.map(t => t.id));
      setSlugManual(true);
      setSeoTitle(post.seoTitle || "");
      setMetaDescription(post.metaDescription || "");
      setFocusKeyword(post.focusKeyword || "");
      try {
        setDisabledContainers(post.disabledContainers ? JSON.parse(post.disabledContainers) : []);
      } catch { setDisabledContainers([]); }
    }
  }, [post, isNew]);

  useEffect(() => {
    if (!slugManual && title) {
      setSlug(slugify(title));
    }
  }, [title, slugManual]);

  const handleSave = () => {
    if (selectedCategories.length === 0) {
      toast({ title: "Erro", description: "Você precisa definir pelo menos uma categoria para salvar o post.", variant: "destructive" });
      return;
    }
    if (selectedTags.length === 0) {
      toast({ title: "Erro", description: "Você precisa definir pelo menos uma tag para salvar o post.", variant: "destructive" });
      return;
    }
    if (status === "scheduled" && !scheduledAt) {
      toast({ title: "Erro", description: "Defina a data e hora de publicação para agendar o post.", variant: "destructive" });
      return;
    }
    saveMutation.mutate();
  };

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
        seoTitle: seoTitle || null,
        metaDescription: metaDescription || null,
        focusKeyword: focusKeyword || null,
        publishedAt: status === "published"
          ? (post?.publishedAt ? post.publishedAt : new Date().toISOString())
          : status === "scheduled" && scheduledAt
            ? new Date(scheduledAt).toISOString()
            : null,
        categoryIds: selectedCategories,
        tagIds: selectedTags,
        disabledContainers: JSON.stringify(disabledContainers),
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
    <div className="max-w-6xl mx-auto px-4 py-8">
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
          onClick={handleSave}
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
            <TiptapEditor content={content} onChange={setContent} onOpenMediaLib={() => { setMediaLibTarget("inline"); setMediaLibOpen(true); }} editorRef={editorInstanceRef} getTitle={() => title} getAuthorName={() => { const a = allAuthors?.find(a => a.id === parseInt(authorId)); return a?.name || "Autor"; }} getSlug={() => slug} />
          </div>

          <SeoPanel
            title={title}
            slug={slug}
            content={content}
            excerpt={excerpt}
            seoTitle={seoTitle}
            metaDescription={metaDescription}
            focusKeyword={focusKeyword}
            onSeoTitleChange={setSeoTitle}
            onMetaDescriptionChange={setMetaDescription}
            onFocusKeywordChange={setFocusKeyword}
            postId={isNew ? undefined : parseInt(params.id!)}
            onHighlight={(texts) => {
              const editor = editorInstanceRef.current;
              if (!editor) return;
              const { doc } = editor.state;
              const textNodes: { pos: number; text: string }[] = [];
              doc.descendants((node: any, pos: number) => {
                if (node.isText) {
                  textNodes.push({ pos, text: node.text || "" });
                }
              });
              for (const t of texts) {
                const snippet = t.slice(0, 80);
                let matchFrom = -1;
                let matchTo = -1;
                const fullText = textNodes.map(n => n.text).join("");
                const matchIdx = fullText.indexOf(snippet);
                if (matchIdx < 0) continue;
                let charsSoFar = 0;
                for (const tn of textNodes) {
                  const nodeStart = charsSoFar;
                  const nodeEnd = charsSoFar + tn.text.length;
                  if (matchFrom === -1 && matchIdx < nodeEnd) {
                    matchFrom = tn.pos + (matchIdx - nodeStart);
                  }
                  if (matchTo === -1 && matchIdx + snippet.length <= nodeEnd) {
                    matchTo = tn.pos + (matchIdx + snippet.length - nodeStart);
                  }
                  charsSoFar = nodeEnd;
                  if (matchFrom >= 0 && matchTo >= 0) break;
                }
                if (matchFrom === -1) continue;
                if (matchTo === -1) matchTo = Math.min(matchFrom + snippet.length, doc.content.size);
                editor.chain().focus().setTextSelection({ from: matchFrom, to: matchTo }).run();
                setTimeout(() => {
                  const selection = window.getSelection();
                  if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    if (rect.top < 0 || rect.bottom > window.innerHeight) {
                      range.startContainer.parentElement?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                  }
                }, 50);
                break;
              }
            }}
          />

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
            <Select value={status} onValueChange={(v) => {
              setStatus(v);
              if (v === "scheduled" && !scheduledAt) {
                const now = new Date();
                now.setHours(now.getHours() + 1);
                now.setMinutes(0);
                const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                setScheduledAt(local);
              }
            }}>
              <SelectTrigger data-testid="select-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
              </SelectContent>
            </Select>
            {status === "scheduled" && (
              <div className="mt-2">
                <Label className="text-xs mb-1 block">Publicar em</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="h-8 text-sm"
                  data-testid="input-scheduled-at"
                />
              </div>
            )}
          </Card>

          <Card className="p-4">
            <Label htmlFor="featuredImage" className="mb-2 block">Imagem Destacada</Label>
            <div className="flex gap-2">
              <Input
                id="featuredImage"
                value={featuredImage}
                onChange={(e) => setFeaturedImage(e.target.value)}
                placeholder="https://..."
                className="flex-1"
                data-testid="input-featured-image"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setMediaLibTarget("featured"); setMediaLibOpen(true); }}
                data-testid="button-featured-media-lib"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>
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

          {!isNew && (
            <LinkSuggestionsPanel postId={parseInt(params.id!)} toast={toast} />
          )}

          <Card className="p-4">
            <Label className="mb-2 block">
              <ImageIcon className="h-4 w-4 inline mr-1" />
              Contêineres (imagens antes de H2/H3)
            </Label>
            <p className="text-xs text-muted-foreground mb-3">Desative posições onde não deseja exibir imagens de contêiner.</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(() => {
                const editorContent = content || "";
                const parser = new DOMParser();
                const doc = parser.parseFromString(editorContent, "text/html");
                const headings = doc.querySelectorAll("h2, h3");
                if (headings.length === 0) {
                  return <p className="text-xs text-muted-foreground italic">Nenhum H2/H3 encontrado no conteúdo.</p>;
                }
                return Array.from(headings).map((h, idx) => {
                  const text = h.textContent?.trim() || `Título ${idx + 1}`;
                  const tag = h.tagName;
                  const isDisabled = disabledContainers.includes(idx);
                  return (
                    <div key={idx} className="flex items-center justify-between gap-2 py-1">
                      <span className={`text-xs truncate flex-1 ${tag === "H3" ? "pl-3" : ""}`} data-testid={`text-heading-${idx}`}>
                        <Badge variant="outline" className="mr-1 text-[10px] px-1">{tag}</Badge>
                        {text}
                      </span>
                      <Switch
                        checked={!isDisabled}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setDisabledContainers(prev => prev.filter(i => i !== idx));
                          } else {
                            setDisabledContainers(prev => [...prev, idx]);
                          }
                        }}
                        data-testid={`switch-container-${idx}`}
                      />
                    </div>
                  );
                });
              })()}
            </div>
          </Card>

          <Card className="p-4">
            <Label className="mb-2 block">
              <Link2 className="h-4 w-4 inline mr-1" />
              Verificador de Links
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isNew || linkCheckLoading}
              onClick={async () => {
                setLinkCheckLoading(true);
                setLinkCheckResults(null);
                try {
                  const res = await apiRequest("GET", `/api/admin/posts/${params.id}/check-links`);
                  const data = await res.json();
                  setLinkCheckResults(data.links);
                } catch (e: any) {
                  toast({ title: "Erro ao verificar links", description: e.message, variant: "destructive" });
                } finally {
                  setLinkCheckLoading(false);
                }
              }}
              data-testid="button-check-links"
            >
              {linkCheckLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Verificar links"
              )}
            </Button>
            {isNew && (
              <p className="text-xs text-muted-foreground mt-2">Salve o post primeiro para verificar links.</p>
            )}
            {linkCheckResults && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground" data-testid="text-link-check-summary">
                  {linkCheckResults.length} link{linkCheckResults.length !== 1 ? "s" : ""} encontrado{linkCheckResults.length !== 1 ? "s" : ""} &mdash; {linkCheckResults.filter(l => l.status !== "ok").length} com problema
                </p>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {linkCheckResults.map((link, idx) => (
                    <div key={idx} className="flex items-start gap-2 py-1 text-xs" data-testid={`link-result-${idx}`}>
                      {link.status === "ok" ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      ) : link.status === "broken" ? (
                        <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium" title={link.text}>{link.text || "(sem texto)"}</p>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate block text-muted-foreground hover:underline"
                          title={link.url}
                          data-testid={`link-url-${idx}`}
                        >
                          {link.url}
                        </a>
                        {link.reason && (
                          <p className="text-destructive">{link.reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <MediaLibraryModal
        open={mediaLibOpen}
        onClose={() => setMediaLibOpen(false)}
        onSelect={(url, alt) => {
          if (mediaLibTarget === "inline") {
            const editor = editorInstanceRef.current;
            if (editor) {
              editor.chain().focus().setImage({ src: url, alt: alt || "" }).run();
            }
          } else {
            setFeaturedImage(url);
          }
        }}
      />
    </div>
  );
}
