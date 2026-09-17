> Created/edited by GitHub Copilot with human review/feedback by Avi Levin.

# Components

The toolkit provides seven UI components. A view model is data that a component renders. You supply one to each component. Your application owns references, clients, raw responses, and requests.

> Choose the smallest component that completes the task. Use the Reader when users need navigation.

Text components can switch among `taamim_and_nikkud`, `nikkud`, and `none`. The change does not replace the supplied view model or make another request.

Use the editor below to switch among all seven maintained supplied-data projects. It keeps one active editor and one active preview, so the catalog does not load seven workbenches at once. You can also <SiteLink to="/examples/vanilla/index.html">Open supplied-data preview</SiteLink> in the smaller vanilla host.

<PlaygroundEmbed project="source-card" title="Editable component catalog" />

## Start with the complete Reader

A controller manages Reader state and requests.

`<sefaria-reader>` combines text, connections, responsive panels, and navigation history. The controller manages selection, connection navigation, cancellation, Back, and breadcrumbs.

- Element: `<sefaria-reader>`
- Rendering subpath: `@arithmomaniac/sefaria-web-components/reader`
- Controller subpath: `@arithmomaniac/sefaria-web-components/reader-controller`
- Best for: a complete reading and exploration flow
- Editor: <SiteLink to="/examples/playground/index.html?project=reader">Open reader in the full editor</SiteLink>
- Source: [`examples/playground/projects/reader/`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/reader)
- Preview: <SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">controlled Reader</SiteLink>
- Guide: [Use the Reader](learn/04-reader.md)

## Passage and text surfaces

<div class="surface-grid">
  <article class="surface-card">
    <h3><code>&lt;sefaria-source-card&gt;</code></h3>
    <p>Shows a passage or short range with primary text, translation, reference details, edition details, and optional source selection.</p>
    <p><code>@arithmomaniac/sefaria-web-components/source-card</code></p>
    <p><SiteLink to="/examples/playground/index.html?project=source-card">Open source-card in the full editor</SiteLink></p>
    <p><a href="https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/source-card/">View maintained source</a></p>
    <p><SiteLink to="/examples/explorer/authored.html?component=source-card&amp;scenario=one-item">View supplied state</SiteLink></p>
  </article>
  <article class="surface-card">
    <h3><code>&lt;sefaria-bilingual-segment&gt;</code></h3>
    <p>Shows one aligned pair of primary text and translation. It supports responsive layout, side visibility, and side order.</p>
    <p><code>@arithmomaniac/sefaria-web-components/bilingual-segment</code></p>
    <p><SiteLink to="/examples/playground/index.html?project=bilingual-segment">Open bilingual-segment in the full editor</SiteLink></p>
    <p><a href="https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/bilingual-segment/">View maintained source</a></p>
    <p><SiteLink to="/examples/explorer/authored.html?component=bilingual-segment&amp;scenario=data">View supplied state</SiteLink></p>
  </article>
  <article class="surface-card">
    <h3><code>&lt;sefaria-text-segment&gt;</code></h3>
    <p>Shows one edition of one text segment. It sets the text direction and renders safe markup and footnotes.</p>
    <p><code>@arithmomaniac/sefaria-web-components/text-segment</code></p>
    <p><SiteLink to="/examples/playground/index.html?project=text-segment">Open text-segment in the full editor</SiteLink></p>
    <p><a href="https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/text-segment/">View maintained source</a></p>
    <p><SiteLink to="/examples/explorer/authored.html?component=text-segment&amp;scenario=data">View supplied state</SiteLink></p>
  </article>
  <article class="surface-card">
    <h3><code>&lt;sefaria-ref-label&gt;</code></h3>
    <p>Shows a standard English or Hebrew reference label. It can display plain text or a link to Sefaria.</p>
    <p><code>@arithmomaniac/sefaria-web-components/ref-label</code></p>
    <p><SiteLink to="/examples/playground/index.html?project=ref-label">Open ref-label in the full editor</SiteLink></p>
    <p><a href="https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/ref-label/">View maintained source</a></p>
    <p><SiteLink to="/examples/explorer/authored.html?component=ref-label&amp;scenario=data">View supplied state</SiteLink></p>
  </article>
</div>

## Connections and contextual surfaces

<div class="surface-grid">
  <article class="surface-card">
    <h3><code>&lt;sefaria-connections-panel&gt;</code></h3>
    <p>Shows connection groups, pages of entries, and text previews. It sends an event when the user chooses an entry.</p>
    <p><code>@arithmomaniac/sefaria-web-components/connections-panel</code></p>
    <p><SiteLink to="/examples/playground/index.html?project=connections-panel">Open connections-panel in the full editor</SiteLink></p>
    <p><a href="https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/connections-panel/">View maintained source</a></p>
    <p><SiteLink to="/examples/explorer/authored.html?component=connections-panel&amp;scenario=details">View supplied state</SiteLink></p>
  </article>
  <article class="surface-card">
    <h3><code>&lt;sefaria-popup&gt;</code></h3>
    <p>Shows a source preview next to a citation link. The element controls its position and close action.</p>
    <p><code>@arithmomaniac/sefaria-web-components/popup</code></p>
    <p><SiteLink to="/examples/playground/index.html?project=popup">Open popup in the full editor</SiteLink></p>
    <p><a href="https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/popup/">View maintained source</a></p>
    <p><SiteLink to="/examples/linked-article/index.html">Open linked article</SiteLink></p>
  </article>
  <article class="surface-card">
    <h3><code>&lt;sefaria-reader&gt;</code></h3>
    <p>Renders the view model from the supplied Reader controller or your application.</p>
    <p><code>@arithmomaniac/sefaria-web-components/reader</code></p>
    <p><SiteLink to="/examples/playground/index.html?project=reader">Open reader in the full editor</SiteLink></p>
    <p><a href="https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground/projects/reader/">View maintained source</a></p>
    <p><SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">Open controlled Reader</SiteLink></p>
  </article>
</div>

## Choose by outcome

| You need                                      | Start with        |
| --------------------------------------------- | ----------------- |
| Read text and move through connections        | Reader            |
| A passage or range with attribution           | Source card       |
| Add one text and translation pair to a layout | Bilingual segment |
| One selected edition                          | Text segment      |
| A canonical reference heading or link         | Reference label   |
| Show groups of related texts and previews     | Connections panel |
| A source preview attached to authored prose   | Popup             |

Use the generated [custom-element reference](reference/custom-elements.md) for properties, events, and slots. Use the [public export inventory](reference/public-exports.md) and package README for factory APIs.
