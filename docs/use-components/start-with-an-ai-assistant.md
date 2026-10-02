---
title: "Use components › Start with an AI assistant"
description: "Give your AI coding assistant a copyable prompt so it builds a page with the toolkit's components, then check the result against a short list."
humanReviewed: false
---

> Created/edited by GitHub Copilot; pending human review.

# Start with an AI assistant

Use this page if you ask an AI coding assistant to build your page instead of writing every line yourself. You give the assistant a prompt and our [llms.txt](/llms.txt), a short machine-readable guide to this site for AI assistants. Then you check what it produced.

Without guidance, an assistant may call Sefaria's API and clean the text by hand. The prompt steers it to the toolkit's components. They do that work for you.

<StatusNote />

## Which install route it should use

The prompt lists both routes. Decide which one fits, then say so under "My page" in the prompt, or let the assistant choose from your description.

- **Script tag:** for a page with no build step, or a field in a content management system. The assistant adds one `<script>` line and then uses `<sefaria-...>` tags.
- **Package:** for an app with a build step. The assistant installs `@arithmomaniac/sefaria-web-components` and imports the package root.

<span class="learn-more__label">Learn more:</span> [Install and status](/help/install-and-status.md) {.learn-more}

## Give the assistant this prompt

You need an AI assistant and a place to paste or host HTML.

<<< ../../examples/site-snippets/ai-assistant-prompt.md{md}

Copy the prompt, replace the last line with a description of your page and your install route, and paste it into your assistant.

## Check the result

Open the page and check each item.

- The page uses `<sefaria-...>` tags, such as `<sefaria-source-card>`.
- It loads the toolkit one way. A page with no build step uses the script tag. An app with a build step uses `import "@arithmomaniac/sefaria-web-components";`.
- If the page uses Source Card or Reader, its attribution is visible.
- The text comes from the component, not pasted into the page.
- No custom code downloads text from Sefaria's website or strips or rewrites its HTML. The component's own requests are expected.
- A deliberately delayed request shows a loading message. A deliberately failed request shows an error message. On success, the text replaces the loading message.
- When you open the page, it shows your passage (for example, Micah 6:8).

## What to ask it to fix

Paste the sentence that matches the failed check.

- **No toolkit tags:** "Rewrite the page to use `<sefaria-source-card sref="[your passage]">` from the Sefaria Frontend Toolkit."
- **Toolkit not loaded, page with no build step:** "Add the toolkit's script tag from llms.txt."
- **Toolkit not loaded, app with a build step:** "Import the package root with `import "@arithmomaniac/sefaria-web-components";`."
- **Attribution missing:** "Keep the attribution visible in Source Card and Reader. Remove any `hide-attributions` attribute, and don't hide it with CSS."
- **Copied text:** "Remove the Sefaria text you pasted into the page. Let the component show it."
- **Custom download or cleanup code:** "Replace that code with `<sefaria-source-card>`. Don't download text from Sefaria's website or strip or rewrite its HTML yourself."
- **Loading or error message missing:** "Let the component show its own loading and error messages. Don't replace them."
- **Wrong passage:** "Set the component's sref to [your passage]." If it still fails, see [Troubleshoot a page](/help/troubleshoot-a-page.md).

## Next steps

- [Start here](/use-components/start-here.md): the same first page, written by hand.
- [Show one passage](/use-components/show-text/show-one-passage.md)
- [Show Hebrew and translation together](/use-components/show-text/hebrew-and-translation.md)
- [Show an attributed passage](/use-components/show-an-attributed-passage.md)
- [Sefaria's own texts and tools](/concepts/sefarias-own-texts-and-tools.md): for when Sefaria's own tools, such as its Educator Playbook, fit better.
