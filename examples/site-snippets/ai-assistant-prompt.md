Read https://sefaria.github.io/sefaria-frontend-toolkit/llms.txt first. It describes the Sefaria Frontend Toolkit, a set of web components that show Sefaria texts.

Build me a page that uses the Sefaria Frontend Toolkit's components to show the passage I describe below. For example, to show Micah 6:8: <sefaria-source-card sref="Micah 6:8"></sefaria-source-card>

Install route:

- If the page has no build step, add this one script tag: <script type="module" src="https://sefaria.github.io/sefaria-frontend-toolkit/cdn/alpha/sefaria-elements.js"></script>
- If the app has a build step, first read the installation/status page. Numbered public npm publication is pending; don't invent package availability or request a GitHub Packages token. Once the exact version is qualified, import the package root exactly as: import "@sefaria/web-components"; Element subpaths don't register their element; they export types and a few helpers.

Rules:

- If the page uses Source Card or Reader, keep its attribution visible. Don't hide it with the `hide-attributions` attribute or with CSS.
- Write no code that downloads text from Sefaria's website itself, and no code that strips or rewrites its HTML. The toolkit does that work.
- Don't copy Sefaria text into the page.
- Let the component handle loading and errors.
- Don't choose a translation language unless I ask. For a language preference, use `translation-language` with a full family name such as `french`; an unavailable language can fall back to Sefaria's default. For an exact Source Card edition, use `translation-version-title`, with the language family when appropriate.

My page: [describe your page here, and say whether it has a build step]
