---
title: "Examples › This week's portion"
description: "A complete app that asks Sefaria's calendar for this week's Torah portion and shows it on a Source Card, with no reference to edit by hand."
humanReviewed: false
---

> Created/edited by GitHub Copilot; pending human review.

<script setup>
import { withBase } from "vitepress";
import { data as snippets } from "../data-and-text-tools/snippets.data.ts";
</script>

# This week's portion

You want a page that shows this week's Torah portion. You don't want to edit the reference by hand each week.

When the example loads, it looks up the portion for your current local date. Reload the page to update it. It makes one client call to Sefaria's calendar, reads the portion's reference from the answer, and sets that reference on a Source Card.

This is a complete app (Vite and TypeScript) in `examples/weekly-portion`. It loads live when this page opens. You can't edit it here. To read its source, see [the example on GitHub](https://github.com/Arithmomaniac/sefaria-frontend-toolkit/tree/main/examples/weekly-portion).

<iframe :src="withBase('/examples/weekly-portion/')" title="This week's portion example" sandbox="allow-scripts allow-same-origin allow-popups" loading="lazy" style="width: 100%; height: 640px; border: 1px solid var(--vp-c-divider); border-radius: 8px;"></iframe>

<a :href="withBase('/examples/weekly-portion/')" target="_blank" rel="noopener">Open in a new tab</a>

## How it works

### The card starts empty

The page holds an empty Source Card. With no `sref`, the card stays blank (its `status` is `empty`) and makes no request.

<<< ../../examples/weekly-portion/index.html#source-card{html}

To register the elements, `main.ts` imports the package root. Your own app does the same:

```ts
import "@arithmomaniac/sefaria-web-components";
```

### The calendar call

The app calls `calendars.getCalendars` from `@arithmomaniac/sefaria-client`. That call goes to Sefaria's `/api/calendars`. You pass `year`, `month` and `day` together, or Sefaria uses today. You pass `diaspora` to pick the reading: `"1"` for the diaspora and `"0"` for Israel. The client checks the response against its schema.

<CodeLanguageToggle :snippet="snippets['weekly-portion-calendar-call']" />

The app then looks for the calendar item whose `title.en` is "Parashat Hashavua". It sets that item's `ref` as the card's `sref`. It also shows the portion's name (`displayValue.en`) in a status line.

If the calendar has no portion for that date, the status line says no portion was found and the card stays blank. If the call fails, the status line shows an error message instead.

### Requests

The page makes one calendar request. The Source Card then makes its own text request, or two when a requested translation language is missing. The card loads the whole portion, which can be long.

## What the test checks

The test uses a fixed date, 8 January 2027. It uses a real calendar response saved from Sefaria on 29 September 2026. It checks that there is exactly one calendar request, with `year=2027`, `month=1`, `day=8` and `diaspora=1`. It also checks that the card receives `Exodus 6:2-9:35`, which is Vaera.

## Change it

For the Israel reading, pass `diaspora: false`. The app sends `"0"`.

The same response lists other learning schedules that have a `ref`, such as Haftarah, Daf Yomi and 929. Each is another entry in `calendar_items`, with its own `title` and `ref`. To show one, match its `title.en` instead and change the status wording to match. Some entries only link to a collection and have no `ref`, so they can't feed a Source Card. See [Sefaria's calendar documentation](https://developers.sefaria.org/reference/get-calendars) for the response.

## Run it locally

From the repository root, use Node.js 22.12 or later and the pnpm version pinned in `package.json`:

```sh
pnpm install
pnpm build
pnpm --filter @sefaria-example/weekly-portion dev
```

To install the packages in your own project, see [Install and status](/help/install-and-status.md).

## Next steps

- [Show an attributed passage](/use-components/show-an-attributed-passage.md) covers the Source Card used here.
- [Start here: data and text tools](/data-and-text-tools/start-here.md) covers the client on its own.

For every client function, see [the client reference](/reference/client.md). For the package paths you can import, see [Package imports and exports](/reference/package-imports-and-exports.md).
