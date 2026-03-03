import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { PostCard } from "@/components/post-card";
import { PaginationControls } from "@/components/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PostWithRelations, Category } from "@shared/schema";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const [offset, setOffset] = useState(0);
  const limit = 12;

  useEffect(() => {
    setOffset(0);
  }, [slug]);

  const { data, isLoading } = useQuery<{ posts: PostWithRelations[]; total: number; category: Category | null }>({
    queryKey: [`/api/categories/${slug}/posts?limit=${limit}&offset=${offset}`],
  });

  const { data: allCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            {isLoading ? (
              <Skeleton className="h-8 w-64" />
            ) : (
              <>
                <h1 className="font-serif text-3xl font-bold mb-1" data-testid="text-category-title">
                  {data?.category?.name || "Categoria"}
                </h1>
                {data?.category?.description && (
                  <p className="text-muted-foreground" data-testid="text-category-description">
                    {data.category.description}
                  </p>
                )}
              </>
            )}
          </div>
          {allCategories && allCategories.length > 0 && (
            <Select
              value={slug}
              onValueChange={(newSlug) => setLocation(`/categoria/${newSlug}`)}
            >
              <SelectTrigger className="w-64" data-testid="select-category-switcher">
                <SelectValue placeholder="Selecionar categoria" />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.slug} data-testid={`select-category-option-${cat.slug}`}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full rounded-md" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : data?.posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg" data-testid="text-no-posts">
            Nenhum post encontrado nesta categoria.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          {data && (
            <PaginationControls
              total={data.total}
              limit={limit}
              offset={offset}
              onPageChange={setOffset}
            />
          )}
        </>
      )}
    </div>
  );
}
