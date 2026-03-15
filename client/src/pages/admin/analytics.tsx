import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, ArrowUpDown, Eye, TrendingUp, Users, Calendar as CalendarIcon, Info, ChevronLeft, ChevronRight, Search, BarChart3, Globe, FileText, Clock, Pencil, Download } from "lucide-react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { PostsSubNav } from "@/components/admin/posts-sub-nav";
import { useAuth } from "@/hooks/use-auth";
import type { Category, Tag } from "@shared/schema";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, subDays, startOfDay, endOfDay, startOfMonth, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";

type Period = "today" | "7d" | "30d" | "this_month" | "this_year" | "custom";
type ChartType = "area" | "bar" | "line";

function getDateRange(period: Period, customStart?: string, customEnd?: string): { start: Date; end: Date; granularity: string } {
  const now = new Date();
  switch (period) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now), granularity: "hourly" };
    case "7d":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now), granularity: "daily" };
    case "30d":
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now), granularity: "daily" };
    case "this_month":
      return { start: startOfMonth(now), end: endOfDay(now), granularity: "daily" };
    case "this_year":
      return { start: startOfYear(now), end: endOfDay(now), granularity: "monthly" };
    case "custom": {
      const s = customStart ? new Date(customStart) : subDays(now, 29);
      const e = customEnd ? new Date(customEnd) : now;
      const diffDays = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
      let granularity = "daily";
      if (diffDays <= 2) granularity = "hourly";
      else if (diffDays > 90) granularity = "monthly";
      return { start: startOfDay(s), end: endOfDay(e), granularity };
    }
    default:
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now), granularity: "daily" };
  }
}

function formatChartDate(dateStr: string, granularity: string): string {
  if (granularity === "hourly") {
    const parts = dateStr.split(" ");
    return parts[1] || dateStr;
  }
  if (granularity === "monthly") {
    const [, month] = dateStr.split("-");
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return monthNames[parseInt(month) - 1] || dateStr;
  }
  try {
    const d = new Date(dateStr + "T00:00:00");
    return format(d, "dd/MM", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

const periodLabels: Record<Period, string> = {
  today: "Hoje",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  this_month: "Este mês",
  this_year: "Este ano",
  custom: "Personalizado",
};

function InfoTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <UITooltip>
        <TooltipTrigger asChild>
          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help ml-1 inline-block" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] text-sm">
          <p>{text}</p>
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}

function getPerPagePref(): number {
  try {
    const val = localStorage.getItem("analytics_per_page");
    if (val && [10, 30, 50].includes(parseInt(val))) return parseInt(val);
  } catch {}
  return 30;
}

export default function AnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const urlPostId = urlParams.get("postId");

  const [period, setPeriod] = useState<Period>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [chartType, setChartType] = useState<ChartType>("area");
  const [searchText, setSearchText] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("");
  const [filterTagId, setFilterTagId] = useState<string>("");
  const [filterPostId, setFilterPostId] = useState<string>(urlPostId || "");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(getPerPagePref);

  const countsQuery = useQuery<{ total: number; published: number; scheduled: number; draft: number }>({
    queryKey: ["/api/admin/analytics/post-counts"],
    enabled: !!user,
  });

  useEffect(() => {
    try { localStorage.setItem("analytics_per_page", String(perPage)); } catch {}
  }, [perPage]);

  useEffect(() => { setPage(1); }, [searchText, filterCategoryId, filterTagId, sortDir, period, customStart, customEnd, perPage]);

  const { start, end, granularity } = useMemo(
    () => getDateRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const timeseriesQuery = useQuery<{ data: { date: string; views: number; visitors: number }[]; total: number; totalVisitors: number }>({
    queryKey: ["/api/admin/analytics/timeseries", start.toISOString(), end.toISOString(), granularity, filterPostId],
    queryFn: async () => {
      const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString(), granularity });
      if (filterPostId) params.set("postId", filterPostId);
      const res = await fetch(`/api/admin/analytics/timeseries?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar dados");
      return res.json();
    },
    enabled: !!user,
  });

  const postsQueryParams = useMemo(() => {
    const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString(), sort: sortDir, page: String(page), limit: String(perPage) });
    if (searchText.trim()) params.set("search", searchText.trim());
    if (filterCategoryId) params.set("categoryId", filterCategoryId);
    if (filterTagId) params.set("tagId", filterTagId);
    if (filterPostId) params.set("postId", filterPostId);
    return params.toString();
  }, [start, end, sortDir, searchText, filterCategoryId, filterTagId, filterPostId, page, perPage]);

  const postsQuery = useQuery<{ data: { postId: number; title: string; slug: string; views: number; visitors: number }[]; total: number }>({
    queryKey: ["/api/admin/analytics/posts", postsQueryParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/posts?${postsQueryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar posts");
      return res.json();
    },
    enabled: !!user,
  });

  const referrersQuery = useQuery<{ referrer: string; visitors: number; pageviews: number }[]>({
    queryKey: ["/api/admin/analytics/referrers", start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
      const res = await fetch(`/api/admin/analytics/referrers?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar referências");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: categories } = useQuery<Category[]>({ queryKey: ["/api/categories"], enabled: !!user });
  const { data: tags } = useQuery<Tag[]>({ queryKey: ["/api/tags"], enabled: !!user });

  const chartData = useMemo(() => {
    if (!timeseriesQuery.data?.data) return [];
    return timeseriesQuery.data.data.map((d) => ({
      ...d,
      label: formatChartDate(d.date, granularity),
    }));
  }, [timeseriesQuery.data, granularity]);

  const totalPages = postsQuery.data ? Math.ceil(postsQuery.data.total / perPage) : 0;

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <Skeleton className="h-[300px] w-full mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
        <p className="text-muted-foreground mb-6">Faça login para acessar as métricas.</p>
        <a href="/api/login"><Button data-testid="button-login">Fazer Login</Button></a>
      </div>
    );
  }

  const renderChart = () => {
    const commonProps = { data: chartData, margin: { top: 5, right: 10, left: 0, bottom: 0 } };
    const xAxis = (
      <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
    );
    const yAxis = (
      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} allowDecimals={false} />
    );
    const grid = <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />;
    const tooltip = (
      <Tooltip
        contentStyle={{
          backgroundColor: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "8px",
          fontSize: 13,
        }}
        labelStyle={{ fontWeight: 600 }}
        formatter={(value: number, name: string) => [
          value.toLocaleString("pt-BR"),
          name === "views" ? "Visualizações" : "Visitantes",
        ]}
      />
    );
    const legend = <Legend formatter={(value: string) => value === "views" ? "Visualizações" : "Visitantes"} />;

    if (chartType === "bar") {
      return (
        <BarChart {...commonProps}>
          {grid}{xAxis}{yAxis}{tooltip}{legend}
          <Bar dataKey="views" fill="#31D5FF" radius={[4, 4, 0, 0]} />
          <Bar dataKey="visitors" fill="#000A24" radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    }
    if (chartType === "line") {
      return (
        <LineChart {...commonProps}>
          {grid}{xAxis}{yAxis}{tooltip}{legend}
          <Line type="monotone" dataKey="views" stroke="#31D5FF" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="visitors" stroke="#000A24" strokeWidth={2} dot={false} />
        </LineChart>
      );
    }
    return (
      <AreaChart {...commonProps}>
        <defs>
          <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#31D5FF" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#31D5FF" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#000A24" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#000A24" stopOpacity={0} />
          </linearGradient>
        </defs>
        {grid}{xAxis}{yAxis}{tooltip}{legend}
        <Area type="monotone" dataKey="views" stroke="#31D5FF" strokeWidth={2} fill="url(#viewsGradient)" />
        <Area type="monotone" dataKey="visitors" stroke="#000A24" strokeWidth={2} fill="url(#visitorsGradient)" />
      </AreaChart>
    );
  };

  return (
    <AdminLayout activeTab="posts">
    <div className="max-w-6xl mx-auto py-8">
      <PostsSubNav activePage="metricas" />
      <div className="mt-6 space-y-3">
        <h1 className="font-serif text-3xl font-bold" data-testid="text-analytics-title">
          Métricas de Visualização
        </h1>

        {filterPostId && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Filtrando por post específico (ID: {filterPostId})</span>
            <Button variant="outline" size="sm" onClick={() => setFilterPostId("")} data-testid="button-clear-post-filter">
              Limpar filtro
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(periodLabels) as Period[]).filter(p => p !== "custom").map((p) => (
          <Button
            key={p}
            variant={period === p ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(p)}
            data-testid={`button-period-${p}`}
          >
            {periodLabels[p]}
          </Button>
        ))}
        <Button
          variant={period === "custom" ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriod("custom")}
          data-testid="button-period-custom"
        >
          <CalendarIcon className="h-3.5 w-3.5 mr-1" />
          Personalizado
        </Button>
        </div>

        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">De:</span>
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-auto" data-testid="input-custom-start" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Até:</span>
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-auto" data-testid="input-custom-end" />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#31D5FF]/10 rounded-lg">
              <Eye className="h-5 w-5 text-[#31D5FF]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center">
                Total de Visualizações
                <InfoTooltip text="Total de vezes que as páginas do blog foram carregadas. Se a mesma pessoa visita 5 páginas, conta como 5 visualizações." />
              </p>
              <p className="text-2xl font-bold" data-testid="text-total-views">
                {timeseriesQuery.isLoading ? "..." : (timeseriesQuery.data?.total || 0).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#000A24]/10 rounded-lg">
              <Users className="h-5 w-5 text-[#000A24] dark:text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center">
                Visitantes Únicos
                <InfoTooltip text="Número de pessoas diferentes que acessaram o blog no período, identificadas por um cookie anônimo no navegador. Se a mesma pessoa visita 5 páginas, conta como 1 visitante." />
              </p>
              <p className="text-2xl font-bold" data-testid="text-total-visitors">
                {timeseriesQuery.isLoading ? "..." : (timeseriesQuery.data?.totalVisitors || 0).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#31D5FF]/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-[#31D5FF]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center">
                Posts no Período
                <InfoTooltip text="Total de posts publicados com pelo menos uma visualização no período selecionado. Posts sem visualizações não aparecem aqui." />
              </p>
              <p className="text-2xl font-bold" data-testid="text-posts-with-views">
                {postsQuery.isLoading ? "..." : (postsQuery.data?.total || 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Posts</p>
              <p className="text-2xl font-bold" data-testid="text-total-posts">
                {countsQuery.isLoading ? "..." : (countsQuery.data?.total || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Publicados</p>
              <p className="text-2xl font-bold" data-testid="text-published-posts">
                {countsQuery.isLoading ? "..." : (countsQuery.data?.published || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Agendados</p>
              <p className="text-2xl font-bold" data-testid="text-scheduled-posts">
                {countsQuery.isLoading ? "..." : (countsQuery.data?.scheduled || 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
              <Pencil className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendentes (Rascunho)</p>
              <p className="text-2xl font-bold" data-testid="text-draft-posts">
                {countsQuery.isLoading ? "..." : (countsQuery.data?.draft || 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 mb-8" data-testid="card-chart">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold mb-1">Visualizações ao longo do tempo</h2>
            <p className="text-sm text-muted-foreground">
              {periodLabels[period]}
              {granularity === "hourly" && " — por hora"}
              {granularity === "daily" && " — por dia"}
              {granularity === "monthly" && " — por mês"}
            </p>
          </div>
          <div className="flex items-center gap-1 border rounded-lg p-0.5">
            {([
              { value: "area" as ChartType, label: "Área" },
              { value: "bar" as ChartType, label: "Barras" },
              { value: "line" as ChartType, label: "Linha" },
            ]).map((opt) => (
              <Button
                key={opt.value}
                variant={chartType === opt.value ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setChartType(opt.value)}
                data-testid={`button-chart-${opt.value}`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
        {timeseriesQuery.isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            Nenhuma visualização registrada neste período.
          </div>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-6 mb-8" data-testid="card-post-list">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-lg font-semibold">Visualizações por Post</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams({
                  start: start.toISOString().split('T')[0],
                  end: end.toISOString().split('T')[0],
                  sort: sortDir,
                  ...(searchText && { search: searchText }),
                  ...(filterCategoryId && { categoryId: filterCategoryId }),
                  ...(filterTagId && { tagId: filterTagId }),
                });
                window.location.href = `/api/admin/analytics/export?${params.toString()}`;
              }}
              data-testid="button-export-analytics"
              title="Exportar relatório como CSV"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Exportar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
              data-testid="button-toggle-sort"
            >
              <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
              {sortDir === "desc" ? "Maior → Menor" : "Menor → Maior"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar post..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
              data-testid="input-search-posts"
            />
          </div>
          <Select value={filterCategoryId} onValueChange={(v) => setFilterCategoryId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTagId} onValueChange={(v) => setFilterTagId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[180px]" data-testid="select-tag-filter">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tags</SelectItem>
              {tags?.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {postsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !postsQuery.data || postsQuery.data.data.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma visualização registrada neste período.
          </p>
        ) : (
          <>
            <div className="divide-y">
              {postsQuery.data.data.map((item, index) => (
                <div
                  key={item.postId}
                  className="flex items-center gap-4 py-3"
                  data-testid={`row-post-views-${item.postId}`}
                >
                  <span className="text-sm font-mono text-muted-foreground w-8 text-right flex-shrink-0">
                    {(page - 1) * perPage + index + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/${item.slug}`}
                      className="text-sm font-medium hover:text-[#31D5FF] transition-colors truncate block"
                    >
                      {item.title}
                    </Link>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold tabular-nums">{item.views.toLocaleString("pt-BR")}</span>
                    </div>
                    <button
                      className="flex items-center gap-1 hover:text-[#31D5FF] transition-colors cursor-pointer"
                      onClick={() => setFilterPostId(String(item.postId))}
                      title={`Filtrar métricas para "${item.title}"`}
                      data-testid={`button-filter-post-${item.postId}`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span className="text-sm tabular-nums">{item.visitors.toLocaleString("pt-BR")}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Por página:</span>
                  <Select value={String(perPage)} onValueChange={(v) => setPerPage(parseInt(v))}>
                    <SelectTrigger className="w-[70px] h-8" data-testid="select-per-page">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Card className="p-6" data-testid="card-referrers">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold">Referências</h2>
          <InfoTooltip text="Sites que direcionaram visitantes ao blog. Mostra de onde vem o tráfego — por exemplo, buscadores, redes sociais ou outros sites que linkaram para o blog." />
        </div>

        {referrersQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !referrersQuery.data || referrersQuery.data.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma referência registrada neste período. Os dados de referência serão coletados a partir de agora.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#000A24] text-white">
                  <th className="text-left p-3 font-medium w-8">#</th>
                  <th className="text-left p-3 font-medium">Referência</th>
                  <th className="text-right p-3 font-medium">Visitantes</th>
                  <th className="text-right p-3 font-medium">Visualizações</th>
                </tr>
              </thead>
              <tbody>
                {referrersQuery.data.map((ref, idx) => (
                  <tr key={ref.referrer} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-referrer-${idx}`}>
                    <td className="p-3 text-muted-foreground">{idx + 1}</td>
                    <td className="p-3 font-medium flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      {ref.referrer}
                    </td>
                    <td className="p-3 text-right tabular-nums">{ref.visitors.toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-right tabular-nums">{ref.pageviews.toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
    </AdminLayout>
  );
}
