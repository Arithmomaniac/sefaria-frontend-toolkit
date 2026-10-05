import {
  applyVocalizationToHtml,
  normalizeText,
} from "@sefaria/text-transform";

// Sefaria text you already have, for example from a file or a database.
const stored =
  'הִגִּ֥יד לְךָ֛ אָדָ֖ם מַה־טּ֑וֹב <span class="mam-spi-samekh" onclick="alert(1)">{ס}</span>';

// 1. Make the markup safe first.
const { bodyHtml } = normalizeText(stored);

// 2. Then remove the cantillation marks and keep the vowels.
const withVowels = applyVocalizationToHtml(bodyHtml, "nikkud");

console.log(bodyHtml);
console.log(withVowels);
