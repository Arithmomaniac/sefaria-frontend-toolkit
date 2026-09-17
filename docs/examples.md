> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Interactive examples

These previews are isolated builds of the maintained private examples. They are not alternate implementations inside VitePress. Landing and supplied-data routes are deterministic; live Sefaria requests occur only after an explicit action on a page that offers them.

| Example | Local preview | Maintained source |
| --- | --- | --- |
| Authored component states | <SiteLink to="/examples/explorer/authored.html">Open preview</SiteLink> | [`examples/explorer/src/authored`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/explorer/src/authored) |
| Live component explorer | <SiteLink to="/examples/explorer/index.html">Open preview</SiteLink> | [`examples/explorer`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/explorer) |
| Controlled and spatial Reader | <SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">Open preview</SiteLink> | [`examples/reader`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/reader) |
| Vanilla supplied-data consumer | <SiteLink to="/examples/vanilla/index.html">Open preview</SiteLink> | [`examples/vanilla-vite`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/vanilla-vite) |
| React consumer | <SiteLink to="/examples/react/index.html">Open preview</SiteLink> | [`examples/react-vite`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/react-vite) |
| Alpine consumer | <SiteLink to="/examples/alpine/index.html">Open preview</SiteLink> | [`examples/alpine-vite`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/alpine-vite) |
| Authored linked article | <SiteLink to="/examples/linked-article/index.html">Open preview</SiteLink> | [`examples/linked-article`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/linked-article) |
| Live MCP App host | <SiteLink to="/examples/mcp-app/live.html">Open preview</SiteLink> | [`examples/mcp-app`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/mcp-app) |

The live route makes no Sefaria request until **Start live demo**. It then connects a real in-browser MCP client/server pair, reads the packaged App through `resources/read`, and renders it through AppBridge in an opaque-origin sandbox. Run `pnpm dev:mcp` for the compiled Node server and Streamable HTTP reference host, or use the documented VS Code walkthrough for named-host evidence.
