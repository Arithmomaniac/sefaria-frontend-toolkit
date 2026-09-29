import { normalizeText } from "@arithmomaniac/sefaria-text-transform";

// Each line is markup that can appear in stored Sefaria text.
const samples = [
  "<b>bold</b>, <i>italic</i> and G<small>OD</small>",
  'Line one<br><span class="poetry indentAll">line two</span>',
  "<p>First paragraph</p><p>Second paragraph</p>",
  '<span class="mam-spi-pe">{פ}</span>',
  '<a class="refLink" href="/Micah.6.8" data-ref="Micah 6:8">Micah 6:8</a>',
  '<a class="namedEntityLink" href="/topics/micah" data-slug="micah">Micah</a>',
  '<sup class="footnote-marker">a</sup><i class="footnote">A note.</i>',
  '<i data-commentator="Rashi" data-order="1"></i>',
  '<b onclick="steal()" style="color: red">text</b>',
  '<a href="https://example.com">a website</a>',
  '<img src="https://example.com/x.png" alt="a picture">',
  "<script>steal()</script>kept",
];

for (const before of samples) {
  const { bodyHtml, notes } = normalizeText(before);
  console.log(before);
  console.log(bodyHtml);
  for (const note of notes) {
    console.log(`  note ${note.key}: ${note.contentHtml}`);
  }
  console.log("");
}
