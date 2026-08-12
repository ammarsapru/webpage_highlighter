// Builds a Chrome/Edge "Scroll To Text Fragment" link (`#:~:text=...`) so
// clicking a saved highlight reopens the source page scrolled to, and with
// the browser's native highlight applied over, the exact quoted text.
// https://developer.chrome.com/docs/web-platform/scroll-to-text-fragment

const WORDS_FOR_RANGE_MATCH = 6;
const SHORT_TEXT_WORD_LIMIT = 15;

function encodeFragmentComponent(value: string) {
  return encodeURIComponent(value).replaceAll("-", "%2D");
}

export function buildHighlightUrl(pageUrl: string, text: string): string {
  const trimmed = text.trim();

  if (!pageUrl || !trimmed) {
    return pageUrl;
  }

  const words = trimmed.split(/\s+/);

  let directive: string;
  if (words.length <= SHORT_TEXT_WORD_LIMIT) {
    directive = encodeFragmentComponent(trimmed);
  } else {
    const start = words.slice(0, WORDS_FOR_RANGE_MATCH).join(" ");
    const end = words.slice(-WORDS_FOR_RANGE_MATCH).join(" ");
    directive = `${encodeFragmentComponent(start)},${encodeFragmentComponent(end)}`;
  }

  return `${pageUrl}#:~:text=${directive}`;
}
