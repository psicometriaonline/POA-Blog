import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Users,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Subscriber {
  id: number;
  name: string | null;
  email: string;
  source: string;
  createdAt: string;
}

interface SubscribersResponse {
  data: Subscriber[];
  total: number;
}

const LIMIT = 30;

export default function SubscribersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useQuery<SubscribersResponse>({
    queryKey: ["/api/admin/subscribers", { search, page, limit: LIMIT }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/subscribers?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar inscritos");
      return res.json();
    },
  });

  const subscribers = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / LIMIT);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/subscribers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscribers"] });
      toast({ title: "Inscrito removido com sucesso" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao remover inscrito", description: err.message, variant: "destructive" });
    },
  });

  const handleExportCSV = () => {
    window.open("/api/admin/subscribers/export", "_blank");
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="font-serif text-2xl font-bold" data-testid="text-subscribers-title">
            Gerenciar Inscritos
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground" data-testid="text-subscriber-count">
            {total} {total === 1 ? "inscrito" : "inscritos"}
          </span>
          <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-1" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
          data-testid="input-search-subscribers"
        />
      </div>

      {search && data && (
        <p className="text-sm text-muted-foreground mb-3" data-testid="text-search-results">
          {total} {total === 1 ? "resultado" : "resultados"} para "{search}"
        </p>
      )}

      <Card>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : subscribers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground" data-testid="text-no-subscribers">
            Nenhum inscrito encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-subscribers">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">Nome</th>
                  <th className="p-3 text-left font-medium">E-mail</th>
                  <th className="p-3 text-left font-medium">Fonte</th>
                  <th className="p-3 text-left font-medium">Data</th>
                  <th className="p-3 text-left font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="border-b hover:bg-muted/30" data-testid={`row-subscriber-${subscriber.id}`}>
                    <td className="p-3" data-testid={`text-name-${subscriber.id}`}>
                      {subscriber.name || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3" data-testid={`text-email-${subscriber.id}`}>
                      {subscriber.email}
                    </td>
                    <td className="p-3 text-muted-foreground" data-testid={`text-source-${subscriber.id}`}>
                      {subscriber.source}
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap" data-testid={`text-date-${subscriber.id}`}>
                      {formatDate(subscriber.createdAt)}
                    </td>
                    <td className="p-3">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            title="Excluir"
                            data-testid={`button-delete-subscriber-${subscriber.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Inscrito</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir este inscrito? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(subscriber.id)}
                              data-testid="button-confirm-delete"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground" data-testid="text-pagination-info">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            data-testid="button-next-page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
