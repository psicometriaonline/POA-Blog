import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { BlogHeader } from "@/components/blog-header";
import { BlogFooter } from "@/components/blog-footer";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import PostPage from "@/pages/post";
import CategoryPage from "@/pages/category";
import TagPage from "@/pages/tag";
import SearchPage from "@/pages/search";
import AdminDashboard from "@/pages/admin/dashboard";
import PostEditor from "@/pages/admin/post-editor";
import ManageCategories from "@/pages/admin/manage-categories";
import ManageTags from "@/pages/admin/manage-tags";
import CrawlPage from "@/pages/admin/crawl";
import HomeSettings from "@/pages/admin/home-settings";
import ManageAuthors from "@/pages/admin/manage-authors";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/post/:slug" component={PostPage} />
      <Route path="/categoria/:slug" component={CategoryPage} />
      <Route path="/tag/:slug" component={TagPage} />
      <Route path="/busca" component={SearchPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/post/:id" component={PostEditor} />
      <Route path="/admin/categorias" component={ManageCategories} />
      <Route path="/admin/tags" component={ManageTags} />
      <Route path="/admin/crawl" component={CrawlPage} />
      <Route path="/admin/home" component={HomeSettings} />
      <Route path="/admin/autores" component={ManageAuthors} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="min-h-screen flex flex-col">
            <BlogHeader />
            <main className="flex-1">
              <Router />
            </main>
            <BlogFooter />
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
