import { Switch, Route, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { BlogHeader } from "@/components/blog-header";
import { BlogFooter } from "@/components/blog-footer";
import { HeroBar } from "@/components/hero-bar";
import { SectionFreeMaterials } from "@/components/section-free-materials";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import PostPage from "@/pages/post";
import CategoryPage from "@/pages/category";
import TagPage from "@/pages/tag";
import SearchPage from "@/pages/search";
import AdminDashboard from "@/pages/admin/dashboard";
import PostEditor from "@/pages/admin/post-editor";
import AnalyticsPage from "@/pages/admin/analytics";
import ManageComments from "@/pages/admin/manage-comments";
import CategoryDetailPage from "@/pages/admin/category-detail";
import TagDetailPage from "@/pages/admin/tag-detail";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";
import AboutPage from "@/pages/about";
import type { FreeMaterial } from "@shared/schema";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/termos-de-uso" component={TermsPage} />
      <Route path="/politicas-de-privacidade" component={PrivacyPage} />
      <Route path="/quem-somos" component={AboutPage} />
      <Route path="/categoria/:slug" component={CategoryPage} />
      <Route path="/tag/:slug" component={TagPage} />
      <Route path="/busca" component={SearchPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/post/:id" component={PostEditor} />
      <Route path="/admin/categorias/:slug" component={CategoryDetailPage} />
      <Route path="/admin/tags/:slug" component={TagDetailPage} />
      <Route path="/admin/metricas" component={AnalyticsPage} />
      <Route path="/admin/comentarios" component={ManageComments} />
      <Route path="/:slug" component={PostPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function useIsAdmin() {
  const [location] = useLocation();
  return location === "/admin" || location.startsWith("/admin/");
}

function SharedHeroBar() {
  const isAdmin = useIsAdmin();
  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
    enabled: !isAdmin,
  });
  if (isAdmin) return null;
  return <HeroBar showHeadline={true} settings={settings || {}} />;
}

function SharedFreeMaterials() {
  const isAdmin = useIsAdmin();
  const { data: materials } = useQuery<FreeMaterial[]>({
    queryKey: ["/api/materials"],
    enabled: !isAdmin,
  });
  if (isAdmin || !materials || materials.length === 0) return null;
  return <SectionFreeMaterials materials={materials} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="min-h-screen flex flex-col">
            <BlogHeader />
            <SharedHeroBar />
            <main className="flex-1">
              <Router />
            </main>
            <SharedFreeMaterials />
            <BlogFooter />
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
