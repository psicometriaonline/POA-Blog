import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, Search } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-8 pb-6">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <h1 className="text-center text-3xl font-bold mb-2">404</h1>
          <p className="text-center text-lg font-semibold mb-2">Página não encontrada</p>
          <p className="text-center text-sm text-muted-foreground mb-6">
            Desculpe, a página que você procura não existe ou foi movida.
          </p>

          <div className="space-y-3">
            <Link href="/">
              <Button className="w-full" size="lg" data-testid="button-404-home">
                <Home className="h-4 w-4 mr-2" />
                Voltar ao Início
              </Button>
            </Link>
            <Link href="/?search=1">
              <Button variant="outline" className="w-full" size="lg" data-testid="button-404-search">
                <Search className="h-4 w-4 mr-2" />
                Buscar Artigos
              </Button>
            </Link>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Se chegou aqui por um link antigo, pode estar relacionado à migração do site. Tente fazer uma busca ou volte à home.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
