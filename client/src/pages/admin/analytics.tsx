import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowUpDown, Eye, TrendingUp, Calendar as CalendarIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

type Period = "today" | "7d" | "30d" | "this_month" | "this_year" | "custom";

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
    const [year, month] = dateStr.split("-");
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

export default function AnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [period, setPeriod] = useState<Period>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const { start, end, granularity } = useMemo(
    () => getDateRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const timeseriesQuery = useQuery<{ data: { date: string; views: number }[]; total: number }>({
    queryKey: [`/api/admin/analytics/timeseries?start=${start.toISOString()}&end=${end.toISOString()}&granularity=${granularity}`],
    enabled: !!user,
  });

  const postsQuery = useQuery<{ postId: number; title: string; slug: string; views: number }[]>({
    queryKey: [`/api/admin/analytics/posts?start=${start.toISOString()}&end=${end.toISOString()}&sort=${sortDir}`],
    enabled: !!user,
  });

  const chartData = useMemo(() => {
    if (!timeseriesQuery.data?.data) return [];
    return timeseriesQuery.data.data.map((d) => ({
      ...d,
      label: formatChartDate(d.date, granularity),
    }));
  }, [timeseriesQuery.data, granularity]);

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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="font-serif text-3xl font-bold" data-testid="text-analytics-title">
          Métricas de Visualização
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
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
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">De:</span>
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-auto"
              data-testid="input-custom-start"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Até:</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-auto"
              data-testid="input-custom-end"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#31D5FF]/10 rounded-lg">
              <Eye className="h-5 w-5 text-[#31D5FF]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Visualizações</p>
              <p className="text-2xl font-bold" data-testid="text-total-views">
                {timeseriesQuery.isLoading ? "..." : (timeseriesQuery.data?.total || 0).toLocaleString("pt-BR")}
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
              <p className="text-sm text-muted-foreground">Posts com Visualizações</p>
              <p className="text-2xl font-bold" data-testid="text-posts-with-views">
                {postsQuery.isLoading ? "..." : (postsQuery.data?.length || 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 mb-8" data-testid="card-chart">
        <h2 className="text-lg font-semibold mb-1">Visualizações ao longo do tempo</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {periodLabels[period]}
          {granularity === "hourly" && " — por hora"}
          {granularity === "daily" && " — por dia"}
          {granularity === "monthly" && " — por mês"}
        </p>
        {timeseriesQuery.isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            Nenhuma visualização registrada neste período.
          </div>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#31D5FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#31D5FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: 13,
                  }}
                  labelStyle={{ fontWeight: 600 }}
                  formatter={(value: number) => [value.toLocaleString("pt-BR"), "Visualizações"]}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#31D5FF"
                  strokeWidth={2}
                  fill="url(#viewsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-6" data-testid="card-post-list">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-lg font-semibold">Visualizações por Post</h2>
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

        {postsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !postsQuery.data || postsQuery.data.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma visualização registrada neste período.
          </p>
        ) : (
          <div className="divide-y">
            {postsQuery.data.map((item, index) => (
              <div
                key={item.postId}
                className="flex items-center gap-4 py-3"
                data-testid={`row-post-views-${item.postId}`}
              >
                <span className="text-sm font-mono text-muted-foreground w-8 text-right flex-shrink-0">
                  {index + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/${item.slug}`}
                    className="text-sm font-medium hover:text-[#31D5FF] transition-colors truncate block"
                  >
                    {item.title}
                  </Link>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-semibold tabular-nums">
                    {item.views.toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
