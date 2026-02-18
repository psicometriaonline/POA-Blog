import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, User, ArrowLeft, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PostWithRelations } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DOMPurify from "dompurify";
import { useEffect, useRef } from "react";
import { HeroBar } from "@/components/hero-bar";
import katex from "katex";
import "katex/dist/katex.min.css";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import r from "highlight.js/lib/languages/r";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import sql from "highlight.js/lib/languages/sql";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
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
hljs.registerLanguage("css", css);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("json", json);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("latex", latex);

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

export default function PostPage() {
  const { slug } = useParams<{ slug: string }>();
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: post, isLoading } = useQuery<PostWithRelations>({
    queryKey: [`/api/posts/slug/${slug}`],
  });

  useEffect(() => {
    if (post && contentRef.current) {
      setTimeout(() => renderMathAndCode(contentRef), 50);
    }
  }, [post]);

  if (isLoading) {
    return (
      <>
        <HeroBar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/3 mb-8" />
          <Skeleton className="h-64 w-full mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <HeroBar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Post nao encontrado</h1>
          <Link href="/">
            <Button variant="outline" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
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

  return (
    <>
      <HeroBar />
      <article className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/">
        <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
      </Link>

      {post.categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {post.categories.map((cat) => (
            <Link key={cat.id} href={`/categoria/${cat.slug}`}>
              <Badge variant="secondary" data-testid={`badge-category-${cat.id}`}>
                {cat.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4 leading-tight" data-testid="text-post-title">
        {post.title}
      </h1>

      <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground mb-6">
        {publishedDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {publishedDate}
          </span>
        )}
        {post.authorName && (
          <span className="flex items-center gap-1">
            <User className="h-4 w-4" />
            {post.authorName}
          </span>
        )}
      </div>

      {post.featuredImage && (
        <div className="mb-8 rounded-md overflow-hidden">
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-auto"
            data-testid="img-featured"
          />
        </div>
      )}

      <div
        ref={contentRef}
        className="prose prose-lg dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content, { ADD_TAGS: ["iframe", "span", "div"], ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "data-type", "data-latex", "class"] }) }}
        data-testid="div-post-content"
      />

      {post.tags.length > 0 && (
        <div className="mt-8 pt-6 border-t">
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="h-4 w-4 text-muted-foreground" />
            {post.tags.map((tag) => (
              <Link key={tag.id} href={`/tag/${tag.slug}`}>
                <Badge variant="outline" data-testid={`badge-tag-${tag.id}`}>
                  {tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
      </article>
    </>
  );
}
