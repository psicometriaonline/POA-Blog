import { useCallback } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import type { FreeMaterial } from "@shared/schema";
import { trackEvent } from "@/lib/meta-pixel";

export function SectionFreeMaterials({ materials }: { materials: FreeMaterial[] }) {
  if (materials.length === 0) return null;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
  });

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  return (
    <section className="bg-dark-bg" data-testid="section-free-materials">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-serif text-2xl font-bold text-white mb-1">Materiais Gratuitos</h2>
            <p className="text-white/60 text-sm">Baixe nossos recursos de estudo gratuitamente</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={scrollPrev}
              className="flex items-center justify-center h-10 w-10 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
              data-testid="button-materials-prev"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={scrollNext}
              className="flex items-center justify-center h-10 w-10 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors"
              data-testid="button-materials-next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-5">
            {materials.map((mat) => (
              <div key={mat.id} className="flex-[0_0_70%] sm:flex-[0_0_45%] lg:flex-[0_0_23%] min-w-0">
                <a
                  href={mat.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("Lead", { content_name: mat.title, content_ids: [String(mat.id)], content_category: "free_material" })}
                  data-testid={`material-${mat.id}`}
                  className="block group"
                >
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5 transition-colors hover:bg-white/10">
                    {mat.imageUrl && (
                      <div className="overflow-hidden">
                        <img
                          src={mat.imageUrl}
                          alt={mat.title}
                          className="w-full h-auto block group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-serif text-sm font-semibold text-white leading-snug mb-1">{mat.title}</h3>
                      {mat.description && <p className="text-xs text-white/50 line-clamp-2">{mat.description}</p>}
                      <div className="flex items-center gap-1 text-accent-bright text-xs font-medium mt-3">
                        <Download className="h-3.5 w-3.5" />
                        Baixar grátis
                      </div>
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
