import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { PostCard } from "@/components/post-card";
import { PaginationControls } from "@/components/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarAcademyForm, SidebarMostRead, SidebarRecentPosts, DiverseSections } from "@/components/sidebar-widgets";
import type { PostWithRelations, Tag } from "@shared/schema";

export default function TagPage() {
  const { slug } = useParams<{ slug: string }>();
  const [offset, setOffset] = useState(0);
  const limit = 12;

  useEffect(() => {
    setOffset(0);
  }, [slug]);

  const { data, isLoading } = useQuery<{ posts: PostWithRelations[]; total: number; tag: Tag | null }>({
    queryKey: [`/api/tags/${slug}/posts?limit=${limit}&offset=${offset}`],
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        {isLoading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <h1 className="font-serif text-3xl font-bold mb-2" data-testid="text-tag-title">
            Tag: {data?.tag?.name || slug}
          </h1>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                Nenhum post encontrado com esta tag.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <aside>
          <div className="sticky top-24 space-y-6">
            <SidebarAcademyForm slot="academy_form_listing" />
            <SidebarMostRead limit={4} />
            <SidebarRecentPosts limit={4} />
          </div>
        </aside>
      </div>

      <DiverseSections context="tag" />
    </div>
  );
}
