// Shared highlight color palette. Keep this in sync with extension/content/colors.js
// so a highlight looks the same in the browser and in the dashboard/PDF.
export const HIGHLIGHT_COLORS = [
  { name: "Key point", value: "#fde047" },
  { name: "Evidence", value: "#86efac" },
  { name: "Definition", value: "#93c5fd" },
  { name: "Question", value: "#f9a8d4" },
  { name: "Action item", value: "#fdba74" },
] as const;

export function colorLabel(hex: string): string {
  return HIGHLIGHT_COLORS.find((c) => c.value.toLowerCase() === hex.toLowerCase())?.name ?? "Highlight";
}
