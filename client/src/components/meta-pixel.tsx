import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { initMetaPixel, setPixelEnabled, trackPageView } from "@/lib/meta-pixel";

export function MetaPixel() {
  const [location] = useLocation();
  const isAdmin = location === "/admin" || location.startsWith("/admin/");
  const lastTrackedRef = useRef<string | null>(null);

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
    enabled: !isAdmin,
  });

  const pixelId = settings?.meta_pixel_id?.trim();
  const enabledSetting = settings?.meta_pixel_enabled !== "false";
  const shouldEnable =
    !isAdmin && enabledSetting && !!pixelId && /^\d{6,}$/.test(pixelId || "");

  useEffect(() => {
    setPixelEnabled(shouldEnable);
  }, [shouldEnable]);

  useEffect(() => {
    if (!shouldEnable || !pixelId) return;
    initMetaPixel(pixelId);
    lastTrackedRef.current = location;
  }, [shouldEnable, pixelId]);

  useEffect(() => {
    if (!shouldEnable) return;
    if (lastTrackedRef.current === location) return;
    lastTrackedRef.current = location;
    trackPageView();
  }, [location, shouldEnable]);

  return null;
}
