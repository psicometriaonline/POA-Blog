import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink } from "lucide-react";

type DeviceSize = "desktop" | "tablet" | "mobile";
const DEVICE_SIZES: { value: DeviceSize; label: string; icon: typeof Monitor; width: number }[] = [
  { value: "desktop", label: "Desktop", icon: Monitor, width: 1280 },
  { value: "tablet", label: "Tablet", icon: Tablet, width: 768 },
  { value: "mobile", label: "Mobile", icon: Smartphone, width: 375 },
];

export function PagePreview({ path, label, selector, selectorItems, onSelectorChange }: {
  path: string;
  label: string;
  selector?: string;
  selectorItems?: { value: string; label: string }[];
  onSelectorChange?: (value: string) => void;
}) {
  const [device, setDevice] = useState<DeviceSize>("desktop");
  const [refreshKey, setRefreshKey] = useState(0);
  const activeDevice = DEVICE_SIZES.find(d => d.value === device)!;

  const previewUrl = `${window.location.origin}${path}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-lg">{label}</h3>
          {selectorItems && selectorItems.length > 0 && (
            <Select value={selector} onValueChange={onSelectorChange}>
              <SelectTrigger className="w-64" data-testid="select-preview-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {selectorItems.map(item => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            {DEVICE_SIZES.map(({ value, label: deviceLabel, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setDevice(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  device === value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`button-preview-${value}`}
                title={deviceLabel}
              >
                <Icon className="h-3.5 w-3.5" />
                {deviceLabel}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey(k => k + 1)}
            data-testid="button-preview-refresh"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Atualizar
          </Button>
          <a href={path} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" data-testid="button-preview-open">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Abrir
            </Button>
          </a>
        </div>
      </div>

      <div className="border rounded-lg bg-muted/20 p-4 flex justify-center">
        <div
          className="bg-white rounded-lg shadow-lg transition-all duration-300"
          style={{ width: activeDevice.width, maxWidth: "100%" }}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b text-xs text-muted-foreground">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <span className="truncate flex-1 text-center">{previewUrl}</span>
          </div>
          <iframe
            key={refreshKey}
            src={previewUrl}
            className="w-full border-0"
            style={{ height: "1200px", display: "block" }}
            title={`Preview - ${label}`}
            data-testid="iframe-preview"
            scrolling="yes"
          />
        </div>
      </div>
    </div>
  );
}
