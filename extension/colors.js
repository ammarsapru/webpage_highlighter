// Shared highlight color palette. Keep in sync with web/src/lib/colors.ts so a
// highlight looks the same in the browser and in the dashboard/PDF.
const HLX_COLORS = [
  { name: "Key point", value: "#fde047" },
  { name: "Evidence", value: "#86efac" },
  { name: "Definition", value: "#93c5fd" },
  { name: "Question", value: "#f9a8d4" },
  { name: "Action item", value: "#fdba74" },
];

function hlxColorLabel(hex) {
  const match = HLX_COLORS.find((c) => c.value.toLowerCase() === String(hex).toLowerCase());
  return match ? match.name : "Highlight";
}
