import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, BarChart3, MessageSquare, Eye } from "lucide-react";

type ActivePage = "posts" | "containers" | "import" | "preview" | "metricas" | "comentarios";

interface PostsSubNavProps {
  activePage: ActivePage;
  showActionButtons?: boolean;
}

export function PostsSubNav({ activePage, showActionButtons = true }: PostsSubNavProps) {
  return (
    <div className="sticky top-[var(--admin-subheader-top)] z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 -mx-4 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
      <Tabs value={activePage} className="flex-shrink-0">
        <TabsList data-testid="tabs-posts-sub">
          <TabsTrigger value="posts" data-testid="tab-posts-manage" asChild>
            <Link href="/admin?tab=posts">
              <span>Gerenciar Posts</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="containers" data-testid="tab-posts-containers" asChild>
            <Link href="/admin?tab=posts&sub=containers">
              <span>Contêineres</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="import" data-testid="tab-posts-import" asChild>
            <Link href="/admin?tab=posts&sub=import">
              <span>Importar Posts</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="preview" data-testid="tab-posts-preview" asChild>
            <Link href="/admin?tab=posts&sub=preview">
              <Eye className="h-3.5 w-3.5 mr-1" />
              Preview
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {showActionButtons && (
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/post/novo">
            <Button data-testid="button-new-post">
              <Plus className="h-4 w-4 mr-1" />
              Novo Post
            </Button>
          </Link>
          <Link href="/admin/metricas">
            <Button variant="outline" data-testid="button-analytics">
              <BarChart3 className="h-4 w-4 mr-1" />
              Métricas
            </Button>
          </Link>
          <Link href="/admin/comentarios">
            <Button variant="outline" data-testid="button-comments">
              <MessageSquare className="h-4 w-4 mr-1" />
              Comentários
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
