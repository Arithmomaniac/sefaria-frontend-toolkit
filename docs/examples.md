> Created/edited by GitHub Copilot; pending human review.

# Interactive examples

Use a supplied-data preview to inspect a component without a live request. Use a live page when you want to test a client or application integration. Each preview builds the maintained example outside VitePress. A live Sefaria request starts only after you select the page action.

| Example | Local preview | Maintained source |
| --- | --- | --- |
| Supplied-data component editor | <SiteLink to="/examples/playground/index.html?project=source-card">Edit and run any of seven projects</SiteLink> | [`examples/playground`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/playground) |
| Authored component states | <SiteLink to="/examples/explorer/authored.html">Open preview</SiteLink> | [`examples/explorer/src/authored`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/explorer/src/authored) |
| Live component explorer | <SiteLink to="/examples/explorer/index.html">Open preview</SiteLink> | [`examples/explorer`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/explorer) |
| Controlled and spatial Reader | <SiteLink to="/examples/reader/controlled.html?tref=Micah%206%3A8">Open preview</SiteLink> | [`examples/reader`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/reader) |
| Vanilla supplied-data consumer | <SiteLink to="/examples/vanilla/index.html">Open preview</SiteLink> | [`examples/vanilla-vite`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/vanilla-vite) |
| React consumer | <SiteLink to="/examples/react/index.html">Open preview</SiteLink> | [`examples/react-vite`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/react-vite) |
| Alpine consumer | <SiteLink to="/examples/alpine/index.html">Open preview</SiteLink> | [`examples/alpine-vite`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/alpine-vite) |
| Authored linked article | <SiteLink to="/examples/linked-article/index.html">Open preview</SiteLink> | [`examples/linked-article`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/linked-article) |
| Live MCP App host | <SiteLink to="/examples/mcp-app/live.html">Open preview</SiteLink> | [`examples/mcp-app`](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/mcp-app) |

The component editor runs edited code in an isolated preview; its seven supplied-data projects make no Sefaria request. The live examples wait for their explicit action before contacting Sefaria.

For ordinary browser integration, prefer declarative scalar attributes: activate live loading with `sref` and configure presentation with attributes such as `layout` and `vocalization-mode`. Use JavaScript properties for rich values that attributes cannot carry, including raw `data`, tagged `acquisition`, array selections, and element anchors. Default-true booleans also remain properties when a host must set them false, because HTML boolean attributes cannot represent false by presence. Supplied-data previews intentionally use `data` for zero-request rendering; MCP and parent-owned composites are the explicit raw-data bridge exceptions.
