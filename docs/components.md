> Created/edited by GitHub Copilot with human review/feedback by Avi Levin.

# Components

The toolkit currently provides seven request-free rendering surfaces. Give an element its component-specific view model and presentation properties; keep references, clients, raw payloads, and requests in the host or supplied controller.

> Start with the smallest surface that completes the user task. Choose the Reader when the task includes navigation rather than rebuilding that behavior from smaller parts.

Text-bearing elements can switch among `taamim_and_nikkud`, `nikkud`, and `none` without replacing the supplied view model or making another request.

Try a source card in the <SiteLink to="/examples/playground/index.html">supplied-data editor</SiteLink>, or <SiteLink to="/examples/vanilla/index.html">Open supplied-data preview</SiteLink>.

## Start with the complete Reader

`<sefaria-reader>` combines passage content, contextual connections, responsive panes, and semantic history. The supported controller handles source selection, connection navigation, cancellation, Back, and breadcrumbs.

- Element: `<sefaria-reader>`
- Rendering subpath: `@arithmomaniac/sefaria-web-components/reader`
- Controller subpath: `@arithmomaniac/sefaria-web-components/reader-controller`
- Best for: a complete reading and exploration flow
- Preview: <SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">controlled Reader</SiteLink>
- Guide: [Use the Reader](learn/04-reader.md)

## Passage and text surfaces

<div class="surface-grid">
  <article class="surface-card">
    <h3><code>&lt;sefaria-source-card&gt;</code></h3>
    <p>A passage or bounded range with primary and translation text, reference context, edition attribution, and optional source selection.</p>
    <p><code>@arithmomaniac/sefaria-web-components/source-card</code></p>
    <p><SiteLink to="/examples/playground/index.html">Edit the source-card project</SiteLink></p>
    <p><SiteLink to="/examples/explorer/authored.html?component=source-card&amp;scenario=one-item">View supplied state</SiteLink></p>
  </article>
  <article class="surface-card">
    <h3><code>&lt;sefaria-bilingual-segment&gt;</code></h3>
    <p>One aligned primary/translation pair with responsive layout, side visibility, and side order.</p>
    <p><code>@arithmomaniac/sefaria-web-components/bilingual-segment</code></p>
    <p><SiteLink to="/examples/explorer/authored.html?component=bilingual-segment&amp;scenario=data">View supplied state</SiteLink></p>
  </article>
  <article class="surface-card">
    <h3><code>&lt;sefaria-text-segment&gt;</code></h3>
    <p>One selected edition of one segment with direction, sanitized markup, and static footnotes.</p>
    <p><code>@arithmomaniac/sefaria-web-components/text-segment</code></p>
    <p><SiteLink to="/examples/explorer/authored.html?component=text-segment&amp;scenario=data">View supplied state</SiteLink></p>
  </article>
  <article class="surface-card">
    <h3><code>&lt;sefaria-ref-label&gt;</code></h3>
    <p>A canonical English or Hebrew reference label that can remain text or render as a Sefaria link.</p>
    <p><code>@arithmomaniac/sefaria-web-components/ref-label</code></p>
    <p><SiteLink to="/examples/explorer/authored.html?component=ref-label&amp;scenario=data">View supplied state</SiteLink></p>
  </article>
</div>

## Connections and contextual surfaces

<div class="surface-grid">
  <article class="surface-card">
    <h3><code>&lt;sefaria-connections-panel&gt;</code></h3>
    <p>Connection categories, paged entries, text previews, and semantic events for host-owned navigation.</p>
    <p><code>@arithmomaniac/sefaria-web-components/connections-panel</code></p>
    <p><SiteLink to="/examples/explorer/authored.html?component=connections-panel&amp;scenario=details">View supplied state</SiteLink></p>
  </article>
  <article class="surface-card">
    <h3><code>&lt;sefaria-popup&gt;</code></h3>
    <p>An anchored source preview for progressively enhanced citation links, with placement and close behavior owned by the element.</p>
    <p><code>@arithmomaniac/sefaria-web-components/popup</code></p>
    <p><SiteLink to="/examples/linked-article/index.html">Open linked article</SiteLink></p>
  </article>
  <article class="surface-card">
    <h3><code>&lt;sefaria-reader&gt;</code></h3>
    <p>The rendering surface for the supplied controlled Reader or a host-admitted Reader view model.</p>
    <p><code>@arithmomaniac/sefaria-web-components/reader</code></p>
    <p><SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">Open controlled Reader</SiteLink></p>
  </article>
</div>

## Choose by outcome

| You need                                                | Start with        |
| ------------------------------------------------------- | ----------------- |
| A complete reading and connection-navigation experience | Reader            |
| A passage or range with attribution                     | Source card       |
| One primary/translation pair inside an existing layout  | Bilingual segment |
| One selected edition                                    | Text segment      |
| A canonical reference heading or link                   | Reference label   |
| Categories and contextual connection entries            | Connections panel |
| A source preview attached to authored prose             | Popup             |

For exact properties, events, and slots, use the generated [custom-element reference](reference/custom-elements.md). For pure and async factories, use the [public export inventory](reference/public-exports.md) and package README.
