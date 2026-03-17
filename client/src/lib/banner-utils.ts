const DEFAULT_BUTTON_COLOR = "#31D5FF";

export function parseBannerButtonColor(buttonColor?: string | null): string {
  if (!buttonColor) return DEFAULT_BUTTON_COLOR;
  if (buttonColor.startsWith('#') || buttonColor.startsWith('rgb')) return buttonColor;
  const match = buttonColor.match(/bg-\[(#[0-9a-fA-F]+)\]/);
  if (match) return match[1];
  return DEFAULT_BUTTON_COLOR;
}
