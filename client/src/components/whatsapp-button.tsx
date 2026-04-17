import { SiWhatsapp } from "react-icons/si";

const WHATSAPP_NUMBER = "5583991771120";
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Olá, pessoal! Estou no blog da Psicometria Online e gostaria de mais informações sobre a formação."
);

export function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95"
      aria-label="Fale conosco pelo WhatsApp"
      data-testid="button-whatsapp-float"
    >
      <SiWhatsapp className="w-7 h-7" />
    </a>
  );
}
