import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, ArrowRight } from "lucide-react";
import logoAcademy from "@assets/popup_logo_academy.png";
import laptopMockup from "@assets/popup_laptop_mockup.png";

interface PostPopupProps {
  open: boolean;
  onClose: () => void;
  topic?: string;
  academyUrl: string;
  onLinkClick?: () => void;
}

export default function PostPopup({ open, onClose, topic, academyUrl, onLinkClick }: PostPopupProps) {
  const headline = topic ? `Precisa aprender sobre ${topic}?` : "Quer se aprofundar no tema?";

  const goToAcademy = () => {
    const isSafe = /^https?:\/\//i.test(academyUrl);
    if (isSafe) {
      onLinkClick?.();
      window.open(academyUrl, "_blank", "noopener,noreferrer");
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="p-0 overflow-hidden border-0 sm:max-w-[420px] [&>button]:hidden rounded-2xl shadow-2xl"
        data-testid="dialog-academy-popup"
      >
        <DialogTitle className="sr-only">{headline}</DialogTitle>
        <DialogDescription className="sr-only">Temos aulas específicas sobre o tema na Psicometria Online Academy.</DialogDescription>
        <div
          role="button"
          tabIndex={0}
          onClick={goToAcademy}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goToAcademy(); } }}
          className="relative cursor-pointer bg-gradient-to-b from-[#f5f9fd] to-[#e6f0fa] px-6 pt-9 pb-7 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
          data-testid="card-academy-popup"
        >
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-[#0a2540] shadow-sm transition-colors hover:bg-white"
            aria-label="Fechar"
            data-testid="button-close-popup"
          >
            <X className="h-4 w-4" />
          </button>

          <img
            src={logoAcademy}
            alt="Psicometria Online Academy"
            className="mx-auto mb-5 w-[230px] max-w-[70%]"
            data-testid="img-popup-logo"
          />

          <h2 className="px-2 text-2xl font-extrabold leading-tight text-[#0a2540]" data-testid="text-popup-headline">
            {headline}
          </h2>
          <p className="mt-2 text-base font-medium text-[#3b5168]" data-testid="text-popup-subtitle">
            Temos aulas específicas sobre o tema.
          </p>

          <img
            src={laptopMockup}
            alt="Plataforma Psicometria Online Academy"
            className="mx-auto my-5 w-full max-w-[340px]"
            data-testid="img-popup-mockup"
          />

          <span
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-7 py-3 text-base font-bold text-white shadow-md transition-colors hover:bg-[#1d4fd7]"
            data-testid="button-popup-cta"
          >
            Conheça a formação
            <ArrowRight className="h-5 w-5" />
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
