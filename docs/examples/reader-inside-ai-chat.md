---
title: "Examples › Reader inside AI chat"
description: "Show the Sefaria Reader inside an AI chat answer as an MCP App, with navigation that goes through the chat host instead of the browser."
---

> Created/edited by GitHub Copilot; pending human review.

<script setup>
import { withBase } from "vitepress";
</script>

# Reader inside AI chat

You are building an AI chat tool. When an answer cites Sefaria, you want readers to see the actual source. They should be able to read it and move to nearby verses without leaving the chat. You also don't want the chat window to contact Sefaria on its own.

This example shows one way to do that with MCP. MCP is the Model Context Protocol, a standard way for AI chat apps to call tools. An MCP App is a small interactive web page tied to a tool. The chat host loads the page and delivers the tool's results to it.

The example is a complete app (Vite and TypeScript) in `examples/mcp-app`. It has an MCP server and an MCP App that shows the toolkit's Reader. You can't edit it on this page. [Read the source on GitHub](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/mcp-app).

<iframe :src="withBase('/examples/mcp-app/live.html')" title="Reader inside AI chat, in-browser host" sandbox="allow-scripts allow-same-origin allow-popups" loading="lazy" style="width: 100%; height: 640px; border: 1px solid var(--vp-c-divider); border-radius: 8px;"></iframe>

<a :href="withBase('/examples/mcp-app/live.html')" target="_blank" rel="noopener">Open in a new tab</a>

This in-browser host simulates a chat app. It makes no Sefaria request until you choose "Start live demo". Then it runs an MCP client and an MCP server together in the page and shows the packaged App.

## How it works

The server offers two tools:

- `get_text` takes a `reference` and an optional `version_language`: `source`, `english` or `both`. The default is `both`.
- `get_links_between_texts` takes a `reference` and an optional `with_text` of `"0"` or `"1"`.

The server fetches from Sefaria and validates the response. It returns the API payload in the tool result's `structuredContent`:

- For `get_text`, the payload is the content itself.
- For `get_links_between_texts`, the payload is at `structuredContent.payload`.

The result's metadata (`_meta`) records the operation, status and effective request.

### The first answer

The App gives the Reader an `sref` and an `acquisition` of kind `capability`. It does not assign Reader data. The App checks the first tool result. Then it serves the passage text from that result, with no extra request.

The first connections come from the host. For a text result, the Reader makes one `get_links_between_texts` call through the chat host. A connections-only result shows its own connections with no follow-up request.

### Later navigation

When you open a passage the App has not captured, the Reader needs new data. Going back to retained history stays local. Regrouping connections it already has also stays local. For anything else, the capability's `getText` and `getLinks` functions call the same server tools. They use `callServerTool` through the chat host.

<<< ../../examples/mcp-app/src/app.ts#reader-acquisition{ts}

The App itself doesn't contact Sefaria. The example's tests check that a text result renders at once. They also check that its first connections load through one host tool call, with no browser fetch. If the host can't call server tools, the App shows an error. Tool failures and invalid payloads show an alert.

### Toolkit and chat host

The toolkit supplies the Reader, the acquisition adapter pattern and the example server. The chat host runs the tools, shows the App and decides when to call tools.

This example supports only Sefaria's default primary edition and its default translation.

## Run it in VS Code

Run `pnpm install` and `pnpm build` from the repository root first, because the scripts rebuild only the example, not the libraries it imports. You need VS Code. On Windows the scripts look for `%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe`. Otherwise, set `VSCODE_EXECUTABLE_PATH`.

The demo profile keeps its own extensions. Install GitHub Copilot Chat and sign in inside it. The walkthrough expects a VS Code build with Copilot bundled.

The repository's `.vscode/mcp.json` registers the server as a stdio server: `node examples/mcp-app/dist/server/stdio.js`.

- `pnpm setup:mcp:vscode` builds the example and opens a separate VS Code demo profile with MCP Apps turned on. Sign in to GitHub Copilot if asked, confirm the `sefaria-components-demo` server, then close that window.
- `pnpm launch:mcp:vscode` builds the example and opens the demo profile (minimized on Windows). In Copilot Chat, ask: "Use the sefaria-components-demo get_text tool to show Micah 6:8 in both languages."
- `pnpm walkthrough:mcp:vscode` builds the example and runs that chat walkthrough for you. On success it writes a report to `.artifacts/vscode-mcp/walkthrough.json`. If the walkthrough fails, the script prints a separate diagnostics directory.

## Not covered

This page doesn't cover Sefaria's own MCP servers. See [Sefaria's own texts and tools](/concepts/sefarias-own-texts-and-tools.md). It also doesn't cover chat hosts other than the two shown here.

## Next steps

- [Add the complete Reader](/use-components/add-the-complete-reader.md)
- [Give components your own data](/data-and-text-tools/give-components-your-own-data.md)
- [Sefaria's own texts and tools](/concepts/sefarias-own-texts-and-tools.md)
- [Components reference](/reference/components.md)
