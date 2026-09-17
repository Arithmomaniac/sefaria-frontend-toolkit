> Created/edited by GitHub Copilot with human review/feedback by Avi Levin.

# Interactive examples

Use a supplied-data preview to inspect a component without a live request. Use a live page when you want to test a client or application integration. Each preview builds the maintained example outside VitePress. A live Sefaria request starts only after you select the page action.

| Example | Local preview | Maintained source |
| --- | --- | --- |
| Supplied-data component editor | <SiteLink to="/examples/playground/index.html">Edit and run a source card</SiteLink> | [`examples/playground`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground) |
| Authored component states | <SiteLink to="/examples/explorer/authored.html">Open preview</SiteLink> | [`examples/explorer/src/authored`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/explorer/src/authored) |
| Live component explorer | <SiteLink to="/examples/explorer/index.html">Open preview</SiteLink> | [`examples/explorer`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/explorer) |
| Controlled and spatial Reader | <SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">Open preview</SiteLink> | [`examples/reader`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/reader) |
| Vanilla supplied-data consumer | <SiteLink to="/examples/vanilla/index.html">Open preview</SiteLink> | [`examples/vanilla-vite`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/vanilla-vite) |
| React consumer | <SiteLink to="/examples/react/index.html">Open preview</SiteLink> | [`examples/react-vite`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/react-vite) |
| Alpine consumer | <SiteLink to="/examples/alpine/index.html">Open preview</SiteLink> | [`examples/alpine-vite`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/alpine-vite) |
| Authored linked article | <SiteLink to="/examples/linked-article/index.html">Open preview</SiteLink> | [`examples/linked-article`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/linked-article) |
| Live MCP App host | <SiteLink to="/examples/mcp-app/live.html">Open preview</SiteLink> | [`examples/mcp-app`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/mcp-app) |

An opaque preview uses a separate browser origin. The component editor runs supplied data inside one and makes no Sefaria request.

The live MCP route makes no Sefaria request until you select `Start live demo`. It then connects an MCP client and server in the browser. The client reads the packaged App through `resources/read`. AppBridge renders the App inside the opaque preview.

Run `pnpm dev:mcp` for the compiled Node server and Streamable HTTP host. You can also test a named host with the documented VS Code steps.
