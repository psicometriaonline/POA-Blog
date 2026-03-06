import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, FileText, Eye, Edit, ExternalLink, ArrowUp, ArrowDown, ArrowUpDown, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type SortField = "title" | "publishedAt" | "viewCount" | "inboundLinks" | "outboundLinks";
type SortOrder = "asc" | "desc";

type PostMetric = {
  id: number;
  title: string;
  slug: string;
  status: string;
  publishedAt: string | null;
  viewCount: number;
  authorName: string | null;
  inboundLinks: number;
  outboundLinks: number;
};

type TagDetails = {
  tag: { id: number; name: string; slug: string };
  totalPosts: number;
  totalViews: number;
  posts: PostMetric[];
};

type LinkInfo = { id: number; title: string; slug: string };

function SortHeader({ label, field, currentSort, currentOrder, onSort }: { label: string; field: SortField; currentSort: SortField; currentOrder: SortOrder; onSort: (f: SortField) => void }) {
  const isActive = currentSort === field;
  return (
    <button
      type="button"
      className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
      onClick={() => onSort(field)}
      data-testid={`sort-${field}`}
    >
      <span>{label}</span>
      {isActive ? (
        currentOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

function LinkCountPopover({ postId, count, type, colorClass }: { postId: number; count: number; type: "inbound" | "outbound"; colorClass: string }) {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<{ inbound: LinkInfo[]; outbound: LinkInfo[] }>({
    queryKey: ["/api/admin/posts", postId, "internal-links"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/posts/${postId}/internal-links`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar links");
      return res.json();
    },
    enabled: open,
  });

  const links = type === "inbound" ? data?.inbound : data?.outbound;
  const label = type === "inbound" ? "Links recebidos" : "Links enviados";

  if (count === 0) {
    return <span className="text-xs font-medium text-muted-foreground">0</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={`text-xs font-medium ${colorClass} hover:underline cursor-pointer`} data-testid={`button-${type}-links-${postId}`}>
          {count}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-64 overflow-y-auto p-3" align="center">
        <p className="text-sm font-semibold mb-2">{label} ({count})</p>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
          </div>
        ) : links && links.length > 0 ? (
          <ul className="space-y-1">
            {links.map(link => (
              <li key={link.id}>
                <Link href={`/admin/post/${link.id}`}>
                  <span className="text-sm text-primary hover:underline cursor-pointer">{link.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum link encontrado.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function TagDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const params = useParams<{ slug: string }>();
  const [sortBy, setSortBy] = useState<SortField>("publishedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { data, isLoading } = useQuery<TagDetails>({
    queryKey: ["/api/admin/tags", params.slug, "details", { sortBy, sortOrder }],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tags/${params.slug}/details?sortBy=${sortBy}&sortOrder=${sortOrder}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar detalhes");
      return res.json();
    },
    enabled: !!user && !!params.slug,
  });

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder(field === "publishedAt" ? "desc" : "asc");
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
        <a href="/api/login"><Button data-testid="button-login">Fazer Login</Button></a>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/tags">
          <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold" data-testid="text-tag-detail-title">
            {isLoading ? <Skeleton className="h-8 w-48" /> : data?.tag.name}
          </h1>
          {data?.tag.slug && (
            <p className="text-xs text-muted-foreground">/{data.tag.slug}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-posts">{data?.totalPosts ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total de Posts</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-views">{data?.totalViews?.toLocaleString("pt-BR") ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total de Visualizações</p>
            </div>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : data?.posts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum post com esta tag.</p>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-tag-posts">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="text-left p-3 font-medium min-w-[250px]">
                  <SortHeader label="Título" field="title" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                </th>
                <th className="text-left p-3 font-medium min-w-[120px]">Autor</th>
                <th className="text-left p-3 font-medium min-w-[100px]">
                  <SortHeader label="Data" field="publishedAt" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                </th>
                <th className="text-center p-3 font-medium min-w-[80px]">
                  <SortHeader label="Views" field="viewCount" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                </th>
                <th className="text-center p-3 font-medium min-w-[50px]" title="Links recebidos">
                  <SortHeader label="↓ Rec." field="inboundLinks" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                </th>
                <th className="text-center p-3 font-medium min-w-[50px]" title="Links enviados">
                  <SortHeader label="↑ Env." field="outboundLinks" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                </th>
                <th className="text-right p-3 font-medium min-w-[80px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data?.posts.map((post) => (
                <tr key={post.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`tag-post-${post.id}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/admin/post/${post.id}`}>
                        <span className="font-medium text-primary hover:underline cursor-pointer" data-testid={`link-post-title-${post.id}`}>
                          {post.title}
                        </span>
                      </Link>
                      <Badge variant={post.status === "published" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                        {post.status === "published" ? "Publicado" : post.status === "scheduled" ? "Agendado" : "Rascunho"}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{post.authorName || "—"}</td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {post.publishedAt ? format(new Date(post.publishedAt), "dd/MM/yyyy", { locale: ptBR }) : "Sem data"}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-xs font-medium ${post.viewCount > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                      {post.viewCount.toLocaleString("pt-BR")}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <LinkCountPopover postId={post.id} count={post.inboundLinks} type="inbound" colorClass="text-green-600" />
                  </td>
                  <td className="p-3 text-center">
                    <LinkCountPopover postId={post.id} count={post.outboundLinks} type="outbound" colorClass="text-blue-600" />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/${post.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost" title="Ver post" className="h-7 w-7" data-testid={`button-view-post-${post.id}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Link href={`/admin/post/${post.id}`}>
                        <Button size="icon" variant="ghost" title="Editar" className="h-7 w-7" data-testid={`button-edit-post-${post.id}`}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
