import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";
import type { PostWithRelations } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PostCardProps {
  post: PostWithRelations;
}

export function PostCard({ post }: PostCardProps) {
  const publishedDate = post.publishedAt
    ? format(new Date(post.publishedAt), "dd 'de' MMMM, yyyy", { locale: ptBR })
    : null;

  return (
    <Link href={`/post/${post.slug}`} data-testid={`card-post-${post.id}`}>
      <Card className="overflow-visible hover-elevate active-elevate-2 cursor-pointer h-full flex flex-col">
        {post.featuredImage && (
          <div className="aspect-video overflow-hidden rounded-t-md">
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-full object-cover"
              data-testid={`img-post-${post.id}`}
              loading="lazy"
            />
          </div>
        )}
        <div className="p-4 flex flex-col flex-1 gap-2">
          {post.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.categories.map((cat) => (
                <Badge key={cat.id} variant="secondary" className="text-xs" data-testid={`badge-category-${cat.id}`}>
                  {cat.name}
                </Badge>
              ))}
            </div>
          )}

          <h2 className="font-serif text-lg font-semibold leading-snug line-clamp-2" data-testid={`text-title-${post.id}`}>
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-3 flex-1" data-testid={`text-excerpt-${post.id}`}>
              {post.excerpt}
            </p>
          )}

          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-auto pt-2">
            {publishedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {publishedDate}
              </span>
            )}
            {post.authorName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {post.authorName}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
