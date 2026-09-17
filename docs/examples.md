> Created/edited by GitHub Copilot with human review/feedback by Avi Levin.

# Interactive examples

Use the supplied-data previews to inspect real components immediately, then choose an explicit-live page when you want to exercise a client or host integration. Each preview is an isolated build of maintained example source rather than an implementation inside VitePress. Landing and supplied-data routes are deterministic; live Sefaria requests occur only after an explicit action on a page that offers them.

| Example | Local preview | Maintained source |
| --- | --- | --- |
| Supplied-data component editor | <SiteLink to="/examples/playground/index.html">Edit and run a source card</SiteLink> | [`examples/playground`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground) |
| Authored component states | <SiteLink to="/examples/explorer/authored.html">Open preview</SiteLink> | [`examples/explorer/src/authored`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/explorer/src/authored) |
| Live component explorer | <SiteLink to="/examples/explorer/index.html">Open preview</SiteLink> | [`examples/explorer`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/explorer) |
| Controlled and spatial Reader | <SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">Open preview</SiteLink> | [`examples/reader`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/reader) |
| Vanilla supplied-data consumer | <SiteLink to="/examples/vanilla/index.html">Open preview</SiteLink> | [`examples/vanilla-vite`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/vanilla-vite) |
| React consumer | <SiteLink to="/examples/react/index.html">Open preview</SiteLink> | [`examples/react-vite`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/react-vite) |
| Authored linked article | <SiteLink to="/examples/linked-article/index.html">Open preview</SiteLink> | [`examples/linked-article`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/linked-article) |
| Live MCP App host | <SiteLink to="/examples/mcp-app/live.html">Open preview</SiteLink> | [`examples/mcp-app`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/mcp-app) |

The component editor runs only supplied data inside an opaque preview and makes no Sefaria request. The live MCP route makes no Sefaria request until **Start live demo**. It then connects a real in-browser MCP client/server pair, reads the packaged App through `resources/read`, and renders it through AppBridge in an opaque-origin sandbox. Run `pnpm dev:mcp` for the compiled Node server and Streamable HTTP reference host, or use the documented VS Code walkthrough for named-host evidence.
