import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { PostCard } from "@/components/post-card";
import { PaginationControls } from "@/components/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal } from "lucide-react";
import type { PostWithRelations, Category, Tag } from "@shared/schema";

function getParam(key: string): string {
  return new URLSearchParams(window.location.search).get(key) || "";
}

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [mode, setMode] = useState<"simple" | "advanced">(getParam("searchIn") || getParam("categoryId") || getParam("tagId") || getParam("dateFrom") || getParam("dateTo") ? "advanced" : "simple");

  const [query, setQuery] = useState(getParam("q"));
  const [searchIn, setSearchIn] = useState(getParam("searchIn") || "all");
  const [categoryId, setCategoryId] = useState(getParam("categoryId") || "");
  const [tagId, setTagId] = useState(getParam("tagId") || "");
  const [dateFrom, setDateFrom] = useState(getParam("dateFrom") || "");
  const [dateTo, setDateTo] = useState(getParam("dateTo") || "");
  const [sort, setSort] = useState(getParam("sort") || "relevance");

  const [submittedQuery, setSubmittedQuery] = useState(getParam("q"));
  const [submittedFilters, setSubmittedFilters] = useState({
    searchIn: getParam("searchIn") || "all",
    categoryId: getParam("categoryId") || "",
    tagId: getParam("tagId") || "",
    dateFrom: getParam("dateFrom") || "",
    dateTo: getParam("dateTo") || "",
    sort: getParam("sort") || "relevance",
  });

  const [offset, setOffset] = useState(0);
  const limit = 12;

  useEffect(() => {
    const urlQ = getParam("q");
    if (!urlQ) return;

    const urlSearchIn = getParam("searchIn") || "all";
    const urlCategoryId = getParam("categoryId") || "";
    const urlTagId = getParam("tagId") || "";
    const urlDateFrom = getParam("dateFrom") || "";
    const urlDateTo = getParam("dateTo") || "";
    const urlSort = getParam("sort") || "relevance";

    setQuery(urlQ);
    setSubmittedQuery(urlQ);
    setSearchIn(urlSearchIn);
    setCategoryId(urlCategoryId);
    setTagId(urlTagId);
    setDateFrom(urlDateFrom);
    setDateTo(urlDateTo);
    setSort(urlSort);
    setSubmittedFilters({
      searchIn: urlSearchIn,
      categoryId: urlCategoryId,
      tagId: urlTagId,
      dateFrom: urlDateFrom,
      dateTo: urlDateTo,
      sort: urlSort,
    });
    setOffset(0);
    if (urlSearchIn !== "all" || urlCategoryId || urlTagId || urlDateFrom || urlDateTo) {
      setMode("advanced");
    } else {
      setMode("simple");
    }
  }, [searchString]);

  const { data: allCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: allTags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  function buildSearchUrl() {
    const params = new URLSearchParams();
    if (submittedQuery) params.set("q", submittedQuery);
    if (submittedFilters.searchIn !== "all") params.set("searchIn", submittedFilters.searchIn);
    if (submittedFilters.categoryId) params.set("categoryId", submittedFilters.categoryId);
    if (submittedFilters.tagId) params.set("tagId", submittedFilters.tagId);
    if (submittedFilters.dateFrom) params.set("dateFrom", submittedFilters.dateFrom);
    if (submittedFilters.dateTo) params.set("dateTo", submittedFilters.dateTo);
    if (submittedFilters.sort !== "relevance") params.set("sort", submittedFilters.sort);
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    return `/api/posts/search?${params.toString()}`;
  }

  const apiUrl = buildSearchUrl();

  const { data, isLoading } = useQuery<{ posts: PostWithRelations[]; total: number }>({
    queryKey: [apiUrl],
    enabled: !!submittedQuery,
  });

  function doSearch() {
    setOffset(0);
    setSubmittedQuery(query);
    setSubmittedFilters({
      searchIn: mode === "advanced" ? searchIn : "all",
      categoryId: mode === "advanced" ? categoryId : "",
      tagId: mode === "advanced" ? tagId : "",
      dateFrom: mode === "advanced" ? dateFrom : "",
      dateTo: mode === "advanced" ? dateTo : "",
      sort,
    });

    const urlParams = new URLSearchParams();
    if (query) urlParams.set("q", query);
    if (mode === "advanced") {
      if (searchIn !== "all") urlParams.set("searchIn", searchIn);
      if (categoryId) urlParams.set("categoryId", categoryId);
      if (tagId) urlParams.set("tagId", tagId);
      if (dateFrom) urlParams.set("dateFrom", dateFrom);
      if (dateTo) urlParams.set("dateTo", dateTo);
    }
    if (sort !== "relevance") urlParams.set("sort", sort);
    setLocation(`/busca?${urlParams.toString()}`);
  }

  function handleSortChange(newSort: string) {
    setSort(newSort);
    setOffset(0);
    setSubmittedFilters(prev => ({ ...prev, sort: newSort }));

    const urlParams = new URLSearchParams(window.location.search);
    if (newSort !== "relevance") urlParams.set("sort", newSort);
    else urlParams.delete("sort");
    setLocation(`/busca?${urlParams.toString()}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") doSearch();
  }

  function switchMode(newMode: "simple" | "advanced") {
    setMode(newMode);
    if (newMode === "simple") {
      setSearchIn("all");
      setCategoryId("");
      setTagId("");
      setDateFrom("");
      setDateTo("");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-6 w-6 text-muted-foreground" />
          <h1 className="font-serif text-3xl font-bold" data-testid="text-search-title">
            Buscar Posts
          </h1>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === "simple" ? "default" : "outline"}
            size="sm"
            onClick={() => switchMode("simple")}
            data-testid="button-simple-search"
          >
            <Search className="h-4 w-4 mr-1" />
            Busca simples
          </Button>
          <Button
            variant={mode === "advanced" ? "default" : "outline"}
            size="sm"
            onClick={() => switchMode("advanced")}
            data-testid="button-advanced-search"
          >
            <SlidersHorizontal className="h-4 w-4 mr-1" />
            Busca avançada
          </Button>
        </div>

        {mode === "simple" ? (
          <div className="flex gap-2 max-w-xl">
            <Input
              placeholder="Digite o termo de busca..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              data-testid="input-search-query"
            />
            <Button onClick={doSearch} data-testid="button-search-submit">
              Buscar
            </Button>
          </div>
        ) : (
          <div className="bg-muted/30 border rounded-lg p-4 space-y-4 max-w-2xl">
            <div>
              <label className="text-sm font-medium mb-1 block">Termo de busca *</label>
              <Input
                placeholder="Digite o termo de busca..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                data-testid="input-search-query-advanced"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Buscar em</label>
                <Select value={searchIn} onValueChange={setSearchIn}>
                  <SelectTrigger data-testid="select-search-in">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os campos</SelectItem>
                    <SelectItem value="title">Título</SelectItem>
                    <SelectItem value="content">Corpo do texto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Categoria</label>
                <Select value={categoryId || "__all__"} onValueChange={(v) => setCategoryId(v === "__all__" ? "" : v)}>
                  <SelectTrigger data-testid="select-search-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as categorias</SelectItem>
                    {allCategories?.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Tag</label>
                <Select value={tagId || "__all__"} onValueChange={(v) => setTagId(v === "__all__" ? "" : v)}>
                  <SelectTrigger data-testid="select-search-tag">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as tags</SelectItem>
                    {allTags?.map((tag) => (
                      <SelectItem key={tag.id} value={String(tag.id)}>{tag.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Publicado de</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  data-testid="input-date-from"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Publicado até</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  data-testid="input-date-to"
                />
              </div>
            </div>

            <Button onClick={doSearch} data-testid="button-search-submit-advanced">
              <Search className="h-4 w-4 mr-1" />
              Buscar
            </Button>
          </div>
        )}
      </div>

      {submittedQuery && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-muted-foreground" data-testid="text-search-query">
            Buscando por: <strong>"{submittedQuery}"</strong>
            {data && <span> — {data.total} resultado(s)</span>}
          </p>
          {data && data.total > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Ordenar por:</span>
              <Select value={sort} onValueChange={handleSortChange}>
                <SelectTrigger className="w-44" data-testid="select-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevância</SelectItem>
                  <SelectItem value="az">A-Z</SelectItem>
                  <SelectItem value="za">Z-A</SelectItem>
                  <SelectItem value="newest">Mais recentes</SelectItem>
                  <SelectItem value="oldest">Mais antigos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {!submittedQuery ? (
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
            Nenhum resultado encontrado para "{submittedQuery}".
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
