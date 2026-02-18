import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState } from "react";
import { PostCard } from "@/components/post-card";
import { PaginationControls } from "@/components/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostWithRelations, Category } from "@shared/schema";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [offset, setOffset] = useState(0);
  const limit = 12;

  const { data, isLoading } = useQuery<{ posts: PostWithRelations[]; total: number; category: Category | null }>({
    queryKey: [`/api/categories/${slug}/posts?limit=${limit}&offset=${offset}`],
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        {isLoading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <>
            <h1 className="font-serif text-3xl font-bold mb-2" data-testid="text-category-title">
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
