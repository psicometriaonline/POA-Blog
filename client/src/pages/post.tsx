import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
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

import { Calendar, User, Tag, ChevronRight, Send, MessageSquare, List, Pencil, FolderOpen } from "lucide-react";
import { SiFacebook, SiLinkedin, SiWhatsapp, SiX } from "react-icons/si";
import { useAuth } from "@/hooks/use-auth";
import { parseBannerButtonColor } from "@/lib/banner-utils";
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
import "highlight.js/styles/atom-one-dark.css";

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

function isSectionEndingWithText(heading: Element): boolean {
  let sibling = heading.previousSibling;
  while (sibling) {
    if (sibling.nodeType === Node.TEXT_NODE) {
      if (sibling.textContent && sibling.textContent.trim() !== "") {
        return true;
      }
      sibling = sibling.previousSibling;
      continue;
    }
    if (sibling.nodeType !== Node.ELEMENT_NODE) {
      sibling = sibling.previousSibling;
      continue;
    }
    const el = sibling as Element;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") {
      sibling = sibling.previousSibling;
      continue;
    }
    if (tag === "figure" || tag === "table" || tag === "pre") {
      return false;
    }
    if (tag === "div" && (el.querySelector("img") || el.querySelector("figure") || el.querySelector("table"))) {
      return false;
    }
    if (tag === "p") {
      return true;
    }
    return true;
  }
  return true;
}

function countParagraphsInSection(heading: Element): number {
  let count = 0;
  let sibling = heading.previousSibling;
  while (sibling) {
    if (sibling.nodeType === Node.ELEMENT_NODE) {
      const tag = (sibling as Element).tagName.toLowerCase();
      if (tag === "h2" || tag === "h3") break;
      if (tag === "p") count++;
    }
    sibling = sibling.previousSibling;
  }
  return count;
}

function injectContainerImages(
  html: string,
  ruleResults: { images: ImageBankItem[]; rule: { linkUrl?: string | null } }[],
  disabledContainers?: number[]
): string {
  if (!ruleResults || ruleResults.length === 0) return html;

  const allImages: { img: ImageBankItem; linkUrl?: string | null }[] = [];
  for (const rr of ruleResults) {
    for (const img of rr.images) {
      allImages.push({ img, linkUrl: rr.rule?.linkUrl });
    }
  }
  if (allImages.length === 0) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const headings = doc.querySelectorAll("h2, h3");

  if (headings.length === 0) return html;

  const positions = Array.from(headings);
  const disabled = disabledContainers || [];

  const eligibleSlots: number[] = [];
  for (let i = 0; i < positions.length; i++) {
    if (i === 0) continue;
    const headingText = (positions[i].textContent || "").toLowerCase();
    if (headingText.includes("como citar")) continue;
    if (disabled.includes(i)) continue;
    if (!isSectionEndingWithText(positions[i])) continue;
    if (countParagraphsInSection(positions[i]) < 2) continue;
    eligibleSlots.push(i);
  }

  const N = Math.min(allImages.length, eligibleSlots.length);
  if (N === 0) return html;

  const selectedSlots: number[] = [];
  if (N >= eligibleSlots.length) {
    selectedSlots.push(...eligibleSlots);
  } else {
    const spacing = eligibleSlots.length / N;
    const used = new Set<number>();
    for (let j = 0; j < N; j++) {
      let idx = Math.floor(spacing / 2 + j * spacing);
      idx = Math.min(idx, eligibleSlots.length - 1);
      while (used.has(idx) && idx < eligibleSlots.length - 1) idx++;
      if (!used.has(idx)) {
        used.add(idx);
        selectedSlots.push(eligibleSlots[idx]);
      }
    }
  }

  const assignments: { headingIdx: number; img: ImageBankItem; linkUrl?: string | null }[] = [];
  for (let j = 0; j < selectedSlots.length; j++) {
    assignments.push({ headingIdx: selectedSlots[j], img: allImages[j].img, linkUrl: allImages[j].linkUrl });
  }

  for (let a = assignments.length - 1; a >= 0; a--) {
    const { img, linkUrl } = assignments[a];
    const heading = positions[assignments[a].headingIdx];

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

  el.querySelectorAll("pre").forEach((preEl) => {
    if (!preEl.querySelector("code") && preEl.textContent?.trim()) {
      const codeEl = document.createElement("code");
      const brushMatch = preEl.className.match(/brush:\s*(\w+)/);
      if (brushMatch) {
        codeEl.className = `language-${brushMatch[1]}`;
      }
      while (preEl.firstChild) {
        codeEl.appendChild(preEl.firstChild);
      }
      preEl.appendChild(codeEl);
      preEl.className = preEl.className.replace(/brush:[^;]+;?/g, "").trim();
    }
  });

  el.querySelectorAll("pre code").forEach((block) => {
    if (!(block as HTMLElement).dataset.highlighted) {
      hljs.highlightElement(block as HTMLElement);
    }
  });

  el.querySelectorAll("pre").forEach((preEl) => {
    const codeEl = preEl.querySelector("code");
    if (!codeEl) return;

    preEl.querySelectorAll(".line-numbers").forEach((ln) => ln.remove());
    preEl.querySelectorAll(".copy-code-btn").forEach((btn) => btn.remove());
    preEl.classList.remove("has-line-numbers");

    const existingWrapper = preEl.parentElement;
    if (existingWrapper?.classList.contains("code-block-wrapper")) {
      existingWrapper.querySelectorAll(".copy-code-btn").forEach((btn) => btn.remove());
    }

    let wrapper: HTMLElement;
    if (existingWrapper?.classList.contains("code-block-wrapper")) {
      wrapper = existingWrapper;
    } else {
      wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper";
      preEl.parentNode?.insertBefore(wrapper, preEl);
      wrapper.appendChild(preEl);
    }

    const codeText = codeEl.textContent || "";
    const rawLines = codeText.split("\n");
    if (rawLines[rawLines.length - 1] === "") rawLines.pop();

    if (rawLines.length > 0) {
      const lineNumbers = document.createElement("div");
      lineNumbers.className = "line-numbers";
      lineNumbers.setAttribute("aria-hidden", "true");
      const startLine = parseInt(preEl.getAttribute("data-start") || "1");
      for (let i = 0; i < rawLines.length; i++) {
        const span = document.createElement("span");
        span.textContent = String(startLine + i);
        lineNumbers.appendChild(span);
      }
      preEl.insertBefore(lineNumbers, codeEl);
      preEl.classList.add("has-line-numbers");
    }

    const btn = document.createElement("button");
    btn.className = "copy-code-btn";
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
    btn.title = "Copiar código";
    btn.setAttribute("data-testid", "button-copy-code");
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const codeContent = preEl.querySelector("code");
      if (!codeContent) return;

      const text = (codeContent.textContent || "").trim();

      const showSuccess = () => {
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(() => {
          btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
        }, 2000);
      };

      navigator.clipboard.writeText(text).then(showSuccess).catch(() => {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
          showSuccess();
        } catch (err) {
          console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textarea);
      });
    };
    wrapper.appendChild(btn);
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

function MostReadSidebar({ postId }: { postId: number }) {
  const { data: mostRead, isLoading } = useQuery<PostWithRelations[]>({
    queryKey: ["/api/posts", postId, "most-read"],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}/most-read`);
      if (!res.ok) throw new Error("Erro ao carregar mais lidos");
      return res.json();
    },
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
            <Card className="overflow-hidden hover-elevate cursor-pointer">
              {p.featuredImage && (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={p.featuredImage}
                    alt={p.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-3">
                {p.categories[0] && (
                  <Badge variant="secondary" className="mb-1.5 text-xs bg-accent-bright/15 text-accent-bright border-0">
                    {p.categories[0].name}
                  </Badge>
                )}
                <h4 className="text-sm font-semibold leading-snug line-clamp-3">{p.title}</h4>
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
          {comments
            .filter((c) => !c.parentId)
            .map((c) => {
              const replies = comments.filter((r) => r.parentId === c.id);
              return (
                <div key={c.id}>
                  <div className="border rounded-md p-4" data-testid={`comment-${c.id}`}>
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
                  {replies.map((r) => {
                    const isTeam = r.authorName.toLowerCase().includes("equipe") || r.authorName.toLowerCase().includes("psicometria");
                    return (
                    <div key={r.id} className={`ml-8 mt-2 border rounded-md p-4 ${isTeam ? "bg-primary/5 border-primary/20" : "bg-muted/30"}`} data-testid={`comment-reply-${r.id}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${isTeam ? "bg-primary/15 text-primary" : "bg-accent-bright/15 text-accent-bright"}`}>
                          {r.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm" data-testid={`text-comment-author-${r.id}`}>{r.authorName}</p>
                          {isTeam && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0" data-testid={`badge-team-${r.id}`}>
                              Equipe
                            </Badge>
                          )}
                        </div>
                        {r.createdAt && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(r.createdAt), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed" data-testid={`text-comment-content-${r.id}`}>{r.content}</p>
                    </div>
                    );
                  })}
                </div>
              );
            })}
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
    let el = document.getElementById(id);
    if (!el && contentRef.current) {
      const nodes = contentRef.current.querySelectorAll("h1, h2, h3");
      const idx = parseInt(id.replace("heading-", ""), 10);
      if (!isNaN(idx) && nodes[idx]) {
        el = nodes[idx] as HTMLElement;
        el.id = id;
      }
    }
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: "smooth" });
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
            className={`block w-full text-left text-sm leading-snug py-1 transition-colors rounded-md cursor-pointer hover:text-accent-bright hover:bg-accent-bright/5 ${
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
    queryKey: ["/api/banners?slot=post_sidebar"],
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

function SuggestedPosts({ postId }: { postId: number }) {
  const { data: suggested } = useQuery<PostWithRelations[]>({
    queryKey: ["/api/posts", postId, "suggested"],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}/suggested`);
      if (!res.ok) throw new Error("Erro ao carregar sugestões");
      return res.json();
    }
  });

  if (!suggested || suggested.length === 0) return null;

  return (
    <section className="mt-16 pt-8 border-t" data-testid="section-suggested-posts">
      <SectionTitle>Posts Sugeridos</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggested.map((p) => (
          <PostCardLarge key={p.id} post={p} />
        ))}
      </div>
    </section>
  );
}

function AcademyForm() {
  const { data: banners } = useQuery<Banner[]>({
    queryKey: ["/api/banners?slot=post_academy_form"],
  });
  const banner = (banners || []).sort((a, b) => a.sortOrder - b.sortOrder)[0];

  if (!banner) return null;

  const showTitle = banner.showTitle ?? true;
  const showButton = banner.showButton ?? true;
  const btnColor = parseBannerButtonColor(banner.buttonColor);
  const titleAlignClass = banner.titleAlignment === 'right' ? 'text-right' : banner.titleAlignment === 'left' ? 'text-left' : 'text-center';
  const btnAlignClass = banner.buttonAlignment === 'right' ? 'justify-end' : banner.buttonAlignment === 'left' ? 'justify-start' : 'justify-center';

  return (
    <Card className="p-5 bg-primary/5 border-primary/20" data-testid="card-academy-form">
      {banner.imageUrl && (
        <div className="aspect-[1400/788] overflow-hidden rounded-md mb-4">
          <img
            src={banner.imageUrl}
            alt={banner.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      {showTitle && (
        <div className={`${titleAlignClass} mb-4`}>
          <h3 className="font-bold leading-tight" style={{ fontSize: `${banner.titleFontSize || 18}px` }} data-testid="text-academy-title">{banner.title}</h3>
          {banner.description && (
            <p className="text-xs text-muted-foreground mt-1" data-testid="text-academy-description">{banner.description}</p>
          )}
        </div>
      )}
      {!showTitle && banner.description && (
        <div className={`${titleAlignClass} mb-4`}>
          <p className="text-xs text-muted-foreground mt-1" data-testid="text-academy-description">{banner.description}</p>
        </div>
      )}
      {showButton && (
        <div
          className={`flex ${btnAlignClass}`}
          style={{
            transform: banner.buttonPosX || banner.buttonPosY
              ? `translate(${banner.buttonPosX || 0}px, ${banner.buttonPosY || 0}px)`
              : undefined
          }}
        >
          <a href={banner.linkUrl || "#"} target="_blank" rel="noopener noreferrer">
            <Button
              className="text-white hover:opacity-90"
              style={{
                backgroundColor: btnColor,
                fontSize: `${banner.buttonFontSize || 14}px`,
              }}
              data-testid="button-academy-signup"
            >
              {banner.buttonText || "Saiba mais"}
            </Button>
          </a>
        </div>
      )}
    </Card>
  );
}

export default function PostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [location] = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const t1 = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, 50);
    const t2 = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, 150);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [location]);

  const apiPath = isPreview ? `/api/admin/posts/slug/${slug}` : `/api/posts/slug/${slug}`;

  const { data: post, isLoading } = useQuery<PostWithRelations>({
    queryKey: [apiPath],
    queryFn: async () => {
      const res = await fetch(apiPath, { credentials: "include" });
      if (!res.ok) throw new Error("Post not found");
      return res.json();
    },
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

  const disabledContainers: number[] = post?.disabledContainers ? JSON.parse(post.disabledContainers) : [];

  useEffect(() => {
    if (post && contentRef.current) {
      setTimeout(() => renderMathAndCode(contentRef), 50);
    }
  }, [post, containerData]);

  if (isLoading) {
    return (
      <>
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
      {isPreview && (
        <div className="bg-yellow-500 text-yellow-950 text-center py-2 px-4 text-sm font-medium" data-testid="banner-preview-mode">
          Modo Preview — Esta é uma pré-visualização do post. {post.status !== "published" && `Status: ${post.status}`}
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumb post={post} />
        <SocialShare post={post} />

        {post.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5 mb-4">
            {post.categories.map((cat) => (
              <Link key={cat.id} href={`/categoria/${cat.slug}`}>
                <Badge variant="secondary" className="bg-accent-bright/15 text-accent-bright border-0" data-testid={`badge-category-${cat.id}`}>
                  <FolderOpen className="h-3 w-3 mr-1" />
                  {cat.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-14">
          <article className="min-w-0">
            <Card className="p-6 mb-6" data-testid="card-post-header">
              <div className="flex items-center gap-3 mb-4 flex-wrap text-sm text-muted-foreground">
                {post.authorName && (
                  <span className="flex items-center gap-1.5">
                    {post.author?.photo ? (
                      <img src={post.author.photo} alt={post.authorName} className="h-6 w-6 rounded-full object-cover" data-testid="img-post-author-avatar" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
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

            <Card className="p-6 mb-6 overflow-hidden" data-testid="card-post-content">
              <div
                ref={contentRef}
                className="prose prose-lg dark:prose-invert max-w-none overflow-x-auto"
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
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(injectContainerImages(post.content, containerData || [], disabledContainers), { ADD_TAGS: ["iframe", "span", "div", "a"], ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "data-type", "data-latex", "class", "loading", "title", "target", "rel", "href", "data-start"] }) }} />
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

            <SuggestedPosts postId={post.id} />
          </article>

          <aside>
            <div className="sticky top-24 space-y-6">
              <SidebarBanner />
              <TableOfContents contentRef={contentRef} postId={post?.id} />
              <MostReadSidebar postId={post.id} />
              <AcademyForm />
            </div>
          </aside>
        </div>
      </div>

      {user && (
        <Link href={`/admin/post/${post.id}`}>
          <button
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-3 shadow-lg hover:bg-primary/90 transition-colors"
            data-testid="button-floating-edit"
            title="Editar este post"
          >
            <Pencil className="h-4 w-4" />
            <span className="text-sm font-medium">Editar</span>
          </button>
        </Link>
      )}
    </>
  );
}
