import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { PostWithRelations, Comment, Banner, ImageBankItem, ContainerRule } from "@shared/schema";
import { insertCommentSchema } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DOMPurify from "dompurify";
import { useEffect, useRef, useState } from "react";
import { HeroBar } from "@/components/hero-bar";
import { Calendar, User, Tag, ChevronRight, Send, MessageSquare, List } from "lucide-react";
import { SiFacebook, SiLinkedin, SiWhatsapp, SiX } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import katex from "katex";
import "katex/dist/katex.min.css";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import r from "highlight.js/lib/languages/r";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import sql from "highlight.js/lib/languages/sql";
import bash from "highlight.js/lib/languages/bash";
import cssLang from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";
import latex from "highlight.js/lib/languages/latex";
import "highlight.js/styles/github-dark.css";

hljs.registerLanguage("python", python);
hljs.registerLanguage("r", r);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("css", cssLang);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("json", json);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("latex", latex);

function injectContainerImages(html: string, images: ImageBankItem[], linkUrl?: string | null, disabledContainers?: number[]): string {
  if (!images || images.length === 0) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const headings = doc.querySelectorAll("h2, h3");

  if (headings.length === 0) return html;

  const positions = Array.from(headings);
  const disabled = disabledContainers || [];

  const assignments: { headingIdx: number; img: ImageBankItem }[] = [];
  let imageIdx = 0;
  for (let i = 0; i < positions.length; i++) {
    if (disabled.includes(i)) continue;
    if (imageIdx >= images.length) break;
    assignments.push({ headingIdx: i, img: images[imageIdx] });
    imageIdx++;
  }

  for (let a = assignments.length - 1; a >= 0; a--) {
    const { headingIdx, img } = assignments[a];
    const heading = positions[headingIdx];

    const container = doc.createElement("div");
    container.className = "container-image-block my-6 rounded-lg overflow-hidden not-prose";
    container.setAttribute("data-testid", `container-image-${img.id}`);

    const imgEl = doc.createElement("img");
    imgEl.src = img.imageUrl;
    imgEl.alt = img.altText || "";
    imgEl.className = "w-full h-auto rounded-lg";
    imgEl.loading = "lazy";
    if (img.title) imgEl.title = img.title;

    if (linkUrl) {
      const anchor = doc.createElement("a");
      anchor.href = linkUrl;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.appendChild(imgEl);
      container.appendChild(anchor);
    } else {
      container.appendChild(imgEl);
    }

    if (img.title) {
      const caption = doc.createElement("p");
      caption.className = "text-xs text-muted-foreground text-center mt-1 italic";
      caption.textContent = img.title;
      container.appendChild(caption);
    }
    heading.parentNode?.insertBefore(container, heading);
  }

  return doc.body.innerHTML;
}

function renderMathAndCode(contentRef: React.RefObject<HTMLDivElement | null>) {
  const el = contentRef.current;
  if (!el) return;

  el.querySelectorAll('span[data-type="math-inline"]').forEach((node) => {
    const latexStr = (node as HTMLElement).getAttribute("data-latex") || node.textContent || "";
    try {
      node.innerHTML = katex.renderToString(latexStr, { throwOnError: false, displayMode: false });
    } catch {}
  });

  el.querySelectorAll('div[data-type="math-block"]').forEach((node) => {
    const latexStr = (node as HTMLElement).getAttribute("data-latex") || node.textContent || "";
    try {
      node.innerHTML = katex.renderToString(latexStr, { throwOnError: false, displayMode: true });
    } catch {}
  });

  el.querySelectorAll("pre code").forEach((block) => {
    if (!(block as HTMLElement).dataset.highlighted) {
      hljs.highlightElement(block as HTMLElement);
    }
  });
}

function Breadcrumb({ post }: { post: PostWithRelations }) {
  const category = post.categories[0];
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap mb-4" data-testid="nav-breadcrumb">
      <Link href="/" data-testid="link-breadcrumb-home">Home</Link>
      <ChevronRight className="h-3 w-3" />
      <span>Blog</span>
      {category && (
        <>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/categoria/${category.slug}`} data-testid="link-breadcrumb-category">{category.name}</Link>
        </>
      )}
      <ChevronRight className="h-3 w-3" />
      <span className="text-foreground font-medium truncate max-w-xs">{post.title}</span>
    </nav>
  );
}

function SocialShare({ post }: { post: PostWithRelations }) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const title = encodeURIComponent(post.title);
  const encodedUrl = encodeURIComponent(url);

  const links = [
    { icon: SiFacebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, label: "Facebook", testId: "link-share-facebook" },
    { icon: SiLinkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, label: "LinkedIn", testId: "link-share-linkedin" },
    { icon: SiWhatsapp, href: `https://wa.me/?text=${title}%20${encodedUrl}`, label: "WhatsApp", testId: "link-share-whatsapp" },
    { icon: SiX, href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${title}`, label: "X", testId: "link-share-x" },
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap" data-testid="div-social-share">
      <span className="text-sm text-muted-foreground">Compartilhe nas Redes Sociais</span>
      <div className="flex items-center gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center h-9 w-9 rounded-full border text-muted-foreground hover-elevate"
            data-testid={l.testId}
          >
            <l.icon className="h-4 w-4" />
          </a>
        ))}
      </div>
    </div>
  );
}

function MostReadSidebar({ postId, categoryId }: { postId: number; categoryId: number }) {
  const { data: mostRead, isLoading } = useQuery<PostWithRelations[]>({
    queryKey: [`/api/posts/${postId}/most-read-category?categoryId=${categoryId}`],
    enabled: !!categoryId,
  });

  if (isLoading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-accent-bright rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-md" />
          ))}
        </div>
      </Card>
    );
  }

  if (!mostRead || mostRead.length === 0) return null;

  return (
    <Card className="p-5" data-testid="card-most-read">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-accent-bright rounded-full" />
        <h3 className="font-bold text-lg">Mais Lidos</h3>
      </div>
      <div className="space-y-4">
        {mostRead.map((p) => (
          <Link key={p.id} href={`/${p.slug}`} data-testid={`card-most-read-${p.id}`}>
            <Card className="overflow-visible hover-elevate cursor-pointer">
              <div className="flex gap-3 p-3">
                {p.featuredImage && (
                  <img
                    src={p.featuredImage}
                    alt={p.title}
                    className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                    loading="lazy"
                  />
                )}
                <div className="flex flex-col justify-center min-w-0">
                  {p.categories[0] && (
                    <Badge variant="secondary" className="self-start mb-1 text-xs bg-accent-bright/15 text-accent-bright border-0">
                      {p.categories[0].name}
                    </Badge>
                  )}
                  <h4 className="text-sm font-semibold leading-snug line-clamp-3">{p.title}</h4>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Card>
  );
}

const commentFormSchema = insertCommentSchema.extend({
  authorName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  authorEmail: z.string().email("E-mail invalido"),
  content: z.string().min(3, "Comentario muito curto"),
});

type CommentFormValues = z.infer<typeof commentFormSchema>;

function CommentsSection({ postId }: { postId: number }) {
  const { toast } = useToast();

  const savedName = (() => { try { return localStorage.getItem("comment_name") || ""; } catch { return ""; } })();
  const savedEmail = (() => { try { return localStorage.getItem("comment_email") || ""; } catch { return ""; } })();

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      authorName: savedName,
      authorEmail: savedEmail,
      content: "",
      postId,
      isApproved: true,
    },
  });

  const { data: cmts, isLoading } = useQuery<Comment[]>({
    queryKey: [`/api/posts/${postId}/comments`],
  });

  const mutation = useMutation({
    mutationFn: async (values: CommentFormValues) => {
      const res = await apiRequest("POST", `/api/posts/${postId}/comments`, values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${postId}/comments`] });
      try {
        localStorage.setItem("comment_name", form.getValues("authorName"));
        localStorage.setItem("comment_email", form.getValues("authorEmail"));
      } catch {}
      form.setValue("content", "");
      toast({ title: "Comentario enviado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao enviar comentario", variant: "destructive" });
    },
  });

  const onSubmit = (values: CommentFormValues) => {
    mutation.mutate(values);
  };

  const comments = cmts || [];

  return (
    <Card className="p-6 mt-8" data-testid="card-comments">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="h-5 w-5 text-accent-bright" />
        <h3 className="font-bold text-lg">Comentarios ({comments.length})</h3>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mb-8 space-y-3" data-testid="form-comment">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="authorName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Seu nome" {...field} data-testid="input-comment-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="authorEmail"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input type="email" placeholder="Seu e-mail" {...field} data-testid="input-comment-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea placeholder="Escreva seu comentario..." className="min-h-[100px]" {...field} data-testid="input-comment-content" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-comment">
            <Send className="h-4 w-4 mr-2" />
            {mutation.isPending ? "Enviando..." : "Enviar comentario"}
          </Button>
        </form>
      </Form>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-md" />)}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Seja o primeiro a comentar!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="border rounded-md p-4" data-testid={`comment-${c.id}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-accent-bright/15 flex items-center justify-center text-accent-bright font-bold text-sm">
                  {c.authorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm" data-testid={`text-comment-author-${c.id}`}>{c.authorName}</p>
                  {c.createdAt && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(c.createdAt), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm leading-relaxed" data-testid={`text-comment-content-${c.id}`}>{c.content}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function useTableOfContents(contentRef: React.RefObject<HTMLDivElement | null>, postId: number | undefined) {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const el = contentRef.current;
    if (!el || !postId) return;

    const extractHeadings = () => {
      const nodes = el.querySelectorAll("h1, h2, h3");
      if (nodes.length === 0) return false;
      const items: TocItem[] = [];
      nodes.forEach((node, i) => {
        const id = node.id || `heading-${i}`;
        if (!node.id) node.id = id;
        items.push({
          id,
          text: node.textContent || "",
          level: parseInt(node.tagName.charAt(1)),
        });
      });
      setHeadings(items);
      if (items.length > 0) setActiveId(items[0].id);
      return true;
    };

    if (extractHeadings()) return;

    const mo = new MutationObserver(() => {
      if (extractHeadings()) mo.disconnect();
    });
    mo.observe(el, { childList: true, subtree: true });

    return () => mo.disconnect();
  }, [postId]);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  return { headings, activeId };
}

function TableOfContents({ contentRef, postId }: { contentRef: React.RefObject<HTMLDivElement | null>; postId: number | undefined }) {
  const { headings, activeId } = useTableOfContents(contentRef, postId);

  if (headings.length === 0) return null;

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Card className="p-4" data-testid="card-toc">
      <div className="flex items-center gap-2 mb-3">
        <List className="h-4 w-4 text-accent-bright" />
        <h3 className="font-bold text-sm">Conteúdo</h3>
      </div>
      <nav className="space-y-1" data-testid="nav-toc">
        {headings.map((h) => (
          <button
            key={h.id}
            onClick={() => handleClick(h.id)}
            className={`block w-full text-left text-sm leading-snug py-1 transition-colors rounded-md cursor-pointer ${
              h.level === 2 ? "pl-3" : h.level === 3 ? "pl-5" : "pl-1"
            } ${
              activeId === h.id
                ? "text-accent-bright font-semibold"
                : "text-muted-foreground"
            }`}
            data-testid={`toc-item-${h.id}`}
          >
            {h.text}
          </button>
        ))}
      </nav>
    </Card>
  );
}

function SidebarBanner() {
  const { data: banners } = useQuery<Banner[]>({
    queryKey: ["/api/banners?slot=sidebar"],
  });
  const banner = (banners || []).sort((a, b) => a.sortOrder - b.sortOrder)[0];
  if (!banner) return null;
  return (
    <a href={banner.linkUrl || "#"} target="_blank" rel="noopener noreferrer" data-testid={`banner-sidebar-${banner.id}`}>
      <Card className="p-4 overflow-visible hover-elevate cursor-pointer">
        <div className="aspect-[1400/788] overflow-hidden rounded-md">
          <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" loading="lazy" />
        </div>
      </Card>
    </a>
  );
}

function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-6 ${className}`}>
      <h2 className="font-serif text-2xl font-bold text-foreground">{children}</h2>
      <div className="h-1 w-16 bg-primary mt-2 rounded-full" />
    </div>
  );
}

function PostCardLarge({ post }: { post: PostWithRelations }) {
  const date = post.publishedAt ? format(new Date(post.publishedAt), "dd 'de' MMMM, yyyy", { locale: ptBR }) : null;
  return (
    <Link href={`/${post.slug}`} data-testid={`card-post-${post.id}`}>
      <Card className="overflow-visible hover-elevate active-elevate-2 cursor-pointer h-full flex flex-col">
        {post.featuredImage && (
          <div className="aspect-video overflow-hidden rounded-t-md">
            <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="p-4 flex flex-col flex-1 gap-2">
          {post.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.categories.map((cat) => (
                <Badge key={cat.id} variant="secondary" className="text-xs">{cat.name}</Badge>
              ))}
            </div>
          )}
          <h3 className="font-serif text-lg font-semibold leading-snug line-clamp-2">{post.title}</h3>
          {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{post.excerpt}</p>}
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-auto pt-2">
            {date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{date}</span>}
            {post.authorName && <span className="flex items-center gap-1"><User className="h-3 w-3" />{post.authorName}</span>}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function SuggestedPosts({ postId, categoryId }: { postId: number; categoryId: number }) {
  const { data: suggested } = useQuery<PostWithRelations[]>({
    queryKey: [`/api/posts/${postId}/most-read-category?categoryId=${categoryId}`, 4],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/posts/${postId}/most-read-category?categoryId=${categoryId}&limit=4`);
      return res.json();
    }
  });

  if (!suggested || suggested.length === 0) return null;

  return (
    <section className="mt-16 pt-8 border-t" data-testid="section-suggested-posts">
      <SectionTitle>Posts Sugeridos</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {suggested.map((p) => (
          <PostCardLarge key={p.id} post={p} />
        ))}
      </div>
    </section>
  );
}

function AcademyForm() {
  return (
    <Card className="p-5 bg-primary/5 border-primary/20" data-testid="card-academy-form">
      <div className="aspect-[1400/788] overflow-hidden rounded-md mb-4">
        <img 
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800" 
          alt="Psicometria Online Academy" 
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="text-center mb-4">
        <h3 className="font-bold text-lg leading-tight">Psicometria Online Academy</h3>
        <p className="text-xs text-muted-foreground mt-1">Cadastro gratuito na melhor plataforma de psicometria</p>
      </div>
      <div className="space-y-3">
        <Input placeholder="Seu nome" className="h-9 text-sm" />
        <Input type="email" placeholder="Seu melhor e-mail" className="h-9 text-sm" />
        <Button className="w-full bg-accent-bright text-accent-bright-foreground hover:bg-accent-bright/90" data-testid="button-academy-signup">
          Quero me cadastrar
        </Button>
      </div>
    </Card>
  );
}

export default function PostPage() {
  const { slug } = useParams<{ slug: string }>();
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: post, isLoading } = useQuery<PostWithRelations>({
    queryKey: [`/api/posts/slug/${slug}`],
  });

  const { data: containerData } = useQuery<{ images: ImageBankItem[]; rule: ContainerRule }[]>({
    queryKey: ["/api/posts", post?.id, "container-images"],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${post!.id}/container-images`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!post?.id,
  });

  const containerImages = containerData && containerData.length > 0 ? containerData[0].images : [];
  const containerLinkUrl = containerData && containerData.length > 0 ? containerData[0].rule?.linkUrl : null;
  const disabledContainers: number[] = post?.disabledContainers ? JSON.parse(post.disabledContainers) : [];

  useEffect(() => {
    if (post && contentRef.current) {
      setTimeout(() => renderMathAndCode(contentRef), 50);
    }
  }, [post, containerImages]);

  if (isLoading) {
    return (
      <>
        <HeroBar showHeadline={true} />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
            <div>
              <Skeleton className="h-8 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/3 mb-8" />
              <Skeleton className="h-64 w-full mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-40 w-full rounded-md" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <HeroBar showHeadline={true} />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Post nao encontrado</h1>
          <Link href="/">
            <Button variant="outline" data-testid="button-back-home">
              Voltar ao inicio
            </Button>
          </Link>
        </div>
      </>
    );
  }

  const publishedDate = post.publishedAt
    ? format(new Date(post.publishedAt), "dd 'de' MMMM, yyyy", { locale: ptBR })
    : null;
  const primaryCategory = post.categories[0];
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <>
      <HeroBar showHeadline={true} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumb post={post} />
        <SocialShare post={post} />

        {post.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5 mb-4">
            {post.categories.map((cat) => (
              <Link key={cat.id} href={`/categoria/${cat.slug}`}>
                <Badge variant="secondary" className="bg-accent-bright/15 text-accent-bright border-0" data-testid={`badge-category-${cat.id}`}>
                  <Tag className="h-3 w-3 mr-1" />
                  {cat.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-14">
          <article>
            <Card className="p-6 mb-6" data-testid="card-post-header">
              <div className="flex items-center gap-3 mb-4 flex-wrap text-sm text-muted-foreground">
                {post.authorName && (
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {post.authorName}
                  </span>
                )}
                {publishedDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {publishedDate}
                  </span>
                )}
              </div>

              <h1 className="font-serif text-2xl md:text-3xl font-bold mb-4 leading-tight" data-testid="text-post-title">
                {post.title}
              </h1>
            </Card>

            <Card className="p-6 mb-6" data-testid="card-post-content">
              <div
                ref={contentRef}
                className="prose prose-lg dark:prose-invert max-w-none"
                data-testid="div-post-content"
              >
                {post.featuredImage && (
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="float-right w-48 h-auto rounded-md ml-5 mb-4 mt-1 not-prose"
                    data-testid="img-featured"
                  />
                )}
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(injectContainerImages(post.content, containerImages, containerLinkUrl, disabledContainers), { ADD_TAGS: ["iframe", "span", "div", "a"], ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "data-type", "data-latex", "class", "loading", "title", "target", "rel", "href"] }) }} />
              </div>
            </Card>

            {post.tags.length > 0 && (
              <Card className="p-5 mb-6" data-testid="card-post-tags">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground mr-1">Tags:</span>
                  {post.tags.map((tag) => (
                    <Link key={tag.id} href={`/tag/${tag.slug}`}>
                      <Badge variant="outline" data-testid={`badge-tag-${tag.id}`}>
                        {tag.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </Card>
            )}

            <CommentsSection postId={post.id} />

            {primaryCategory && (
              <SuggestedPosts postId={post.id} categoryId={primaryCategory.id} />
            )}
          </article>

          <aside>
            <div className="sticky top-24 space-y-6">
              <SidebarBanner />
              <TableOfContents contentRef={contentRef} postId={post?.id} />
              {primaryCategory && (
                <MostReadSidebar postId={post.id} categoryId={primaryCategory.id} />
              )}
              <AcademyForm />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
