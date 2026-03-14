import { ReactNode } from "react";
import { useLocation } from "wouter";
import { Home, FileText, FolderOpen, Tag, Database } from "lucide-react";

type AdminTab = "home" | "posts" | "categories" | "tags" | "database";

const TAB_CONFIG: { value: AdminTab; icon: typeof Home; label: string }[] = [
  { value: "home", icon: Home, label: "Home" },
  { value: "posts", icon: FileText, label: "Página de Posts" },
  { value: "categories", icon: FolderOpen, label: "Página de Categorias" },
  { value: "tags", icon: Tag, label: "Página de Tags" },
  { value: "database", icon: Database, label: "Banco de Dados" },
];

interface AdminLayoutProps {
  activeTab: AdminTab;
  children: ReactNode;
}

export function AdminLayout({ activeTab, children }: AdminLayoutProps) {
  const [, setLocation] = useLocation();

  const handleTabClick = (tab: AdminTab) => {
    if (tab === "home") {
      setLocation("/admin");
    } else {
      setLocation(`/admin?tab=${tab}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 pt-6 pb-0">
        <h1 className="font-serif text-2xl font-bold mb-4" data-testid="text-admin-title">
          Painel Administrativo
        </h1>

        <div className="flex gap-0" data-testid="tabs-admin-main">
          {TAB_CONFIG.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleTabClick(value)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-main-${value}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-8 pt-6">
        {children}
      </div>
    </div>
  );
}

export type { AdminTab };
