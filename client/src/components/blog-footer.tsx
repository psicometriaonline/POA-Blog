export function BlogFooter() {
  return (
    <footer className="border-t bg-muted/30 mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-serif text-lg font-bold" data-testid="text-footer-brand">
              Blog Psicometria Online
            </p>
            <p className="text-sm text-muted-foreground">
              Recursos de aprendizagem em psicometria e analises quantitativas
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Psicometria Online. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
