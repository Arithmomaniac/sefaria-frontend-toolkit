> Created/edited by GitHub Copilot; pending human review.

# Interactive examples

These previews are isolated builds of the maintained private examples. They are not alternate implementations inside VitePress. Landing and supplied-data routes are deterministic; live Sefaria requests occur only after an explicit action on a page that offers them.

| Example | Local preview | Maintained source |
| --- | --- | --- |
| Authored component states | <SiteLink to="/examples/explorer/authored.html">Open preview</SiteLink> | [`examples/explorer/src/authored`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/explorer/src/authored) |
| Live component explorer | <SiteLink to="/examples/explorer/index.html">Open preview</SiteLink> | [`examples/explorer`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/explorer) |
| Controlled and spatial Reader | <SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">Open preview</SiteLink> | [`examples/reader`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/reader) |
| Vanilla supplied-data consumer | <SiteLink to="/examples/vanilla/index.html">Open preview</SiteLink> | [`examples/vanilla-vite`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/vanilla-vite) |
| React consumer | <SiteLink to="/examples/react/index.html">Open preview</SiteLink> | [`examples/react-vite`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/react-vite) |
| Authored linked article | <SiteLink to="/examples/linked-article/index.html">Open preview</SiteLink> | [`examples/linked-article`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/linked-article) |
| MCP App fixture preview | <SiteLink to="/examples/mcp-app/index.html?fixture=1">Open preview</SiteLink> | [`examples/mcp-app`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/mcp-app) |

The MCP fixture route proves deterministic App rendering only. Run `pnpm dev:mcp` for the compiled Node server, separate host and sandbox origins, AppBridge calls, and protocol-level request-count proof.
