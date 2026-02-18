import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PostCard } from "@/components/post-card";
import { PaginationControls } from "@/components/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import type { PostWithRelations } from "@shared/schema";

export default function SearchPage() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q") || "";
  const [offset, setOffset] = useState(0);
  const limit = 12;

  const { data, isLoading } = useQuery<{ posts: PostWithRelations[]; total: number }>({
    queryKey: [`/api/posts/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`],
    enabled: !!q,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Search className="h-6 w-6 text-muted-foreground" />
          <h1 className="font-serif text-3xl font-bold" data-testid="text-search-title">
            Resultados da busca
          </h1>
        </div>
        {q && (
          <p className="text-muted-foreground" data-testid="text-search-query">
            Buscando por: <strong>"{q}"</strong>
            {data && <span> - {data.total} resultado(s)</span>}
          </p>
        )}
      </div>

      {!q ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">
            Digite algo para buscar.
          </p>
        </div>
      ) : isLoading ? (
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
          <p className="text-muted-foreground text-lg" data-testid="text-no-results">
            Nenhum resultado encontrado para "{q}".
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
