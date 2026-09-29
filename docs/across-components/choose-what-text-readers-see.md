---
title: "Across components › Choose what text readers see"
description: "Choose the translation, edition, Hebrew vocalization, and sides your readers see, and learn which choices make requests."
---

> Created/edited by GitHub Copilot; pending human review.

<script setup>
import LiveEditor from "../.vitepress/theme/LiveEditor.vue";
import textChoiceControls from "../../examples/site-snippets/text-choice-controls.html?raw";
</script>

# Choose what text readers see

This page puts the content choices for [Text Segment](/use-components/show-text/show-one-passage.md), [Bilingual Segment](/use-components/show-text/hebrew-and-translation.md), and [Source Card](/use-components/show-an-attributed-passage.md) side by side. Each choice is an HTML attribute, a setting you write inside the tag. You should already have one of those components working. If not, start with [Put your first source on a page](/use-components/start-here.md).

<LiveEditor :code="textChoiceControls" title="Change the choices on a Source Card" />

Change the menus to see which choices make a request. Vocalization and sides redraw without a request. Choosing French makes one new request.

## The choices at a glance

A request is one call from the page to Sefaria. The first two rows change what is requested. The others only change how text that has already arrived is drawn.

| You want to… | Attribute | Requests |
| --- | --- | --- |
| Prefer a translation language | `translation-language` | A fresh load makes one request, or two with fallback |
| Pin one exact edition | `primary-version-title`, `translation-version-title` (Text Segment: `version-language`, `version-title`) | A fresh load makes one request, or two if the other side's preferred translation language falls back. A pinned edition itself doesn't fall back. |
| Change Hebrew vowel marks and cantillation | `vocalization-mode` | None. It redraws. |
| Show one side or both | `content-language` | None. It redraws. |
| Stack the sides or place them side by side | `layout`, `side-order` | None. It redraws. |
| Hide the edition credit | `hide-attributions` | None. It redraws. |

Bilingual Segment and Source Card request both sides even when they show one, so switching sides needs no new request. For a fresh load, Source Card makes one request for the whole card, or two when the translation falls back, however many verses it shows. Its verses make no requests of their own. Supplied data makes none.

## Choose a translation language

Set `translation-language` to a language family name such as `french`. A family is Sefaria's grouping of editions by language. The value is trimmed and is not case sensitive. All three components accept it. On Text Segment, it shows a translation instead of the primary edition, for example `<sefaria-text-segment sref="Micah 6:8" translation-language="french">`.

## Pin an exact edition

An edition title is the name Sefaria gives one edition, for example `Bible du Rabbinat 1899 [fr]`. Primary means the edition Sefaria marks primary. That is usually, but not always, the Hebrew or original.

- Bilingual Segment and Source Card: `primary-version-title` pins the primary edition. `translation-version-title` pins the translation.
- Text Segment: `version-language` and `version-title` together pin one edition. Its default is the primary edition, not necessarily Hebrew.

On Text Segment, `translation-language` and `version-language` are mutually exclusive. Pick one.

## When Sefaria doesn't have that language

Not every text has every translation. Ask for `french` on `Berakhot 2a:1`. Sefaria's response warns that French is missing. Only then does the component make one more request, for Sefaria's default translation, which isn't always English. The component shows a notice such as `french is unavailable; showing english.` That is two requests for a fresh load.

The fallback applies only to a bare language preference. Exact edition titles never fall back. An edition that exists but is empty stays empty. In Bilingual Segment and Source Card, if you pin one side's edition but give only a preferred language for the translation, that translation can still fall back.

## Set Hebrew vocalization

`vocalization-mode` controls the marks written with Hebrew letters. Hebrew text can carry vowel marks (nikkud) and cantillation marks (taamim). The default, `taamim_and_nikkud`, shows both. The other modes also remove a few related marks, such as the sof pasuq (׃); for the exact behavior, see [Change vowels and cantillation](/data-and-text-tools/clean-up-stored-sefaria-text.md#change-vowels-and-cantillation).

| Value               | Hebrew shown                      |
| ------------------- | --------------------------------- |
| `taamim_and_nikkud` | Vowel marks and cantillation      |
| `nikkud`            | Vowel marks, without cantillation |
| `none`              | No vowel points or cantillation   |

Changing the mode never makes a request. The component redraws text it already has. All three components accept it.

## Choose the sides and their arrangement

These choices apply only to Bilingual Segment and Source Card, not Text Segment.

- `content-language` is `both`, `primary`, or `translation`. The default is `both`.
- `layout` is `auto`, `stacked`, or `side-by-side`. The default is `auto`.
- `side-order` is `primary-first` or `translation-first`. The default is `primary-first`.

Two columns appear only when both sides show. `side-order` changes the visual order only in two-column layouts. None of these choices makes a request.

## See which edition readers are shown

Text Segment and Bilingual Segment show the edition title and language, both the family and the actual language, with no link. Source Card also links the edition title to its source, but only when Sefaria gives a valid http(s) address. None of them shows the license.

`hide-attributions` hides the attribution and the fallback note. It makes no request.

Generated client types include an optional `license` field in an edition's version metadata, but the components don't display it. To check reuse rights, look up that edition's license, for example in the edition's details on Sefaria, before you republish it. This isn't legal advice.

<span class="learn-more__label">Learn more:</span> [Install and status](/help/install-and-status.md#license-and-text-rights) · [Sefaria's own texts and tools](/concepts/sefarias-own-texts-and-tools.md) {.learn-more}

## Clean up stored text

Removing vowel marks for display is covered above. Cleaning stored text is a separate job for the text tools.

<span class="learn-more__label">Learn more:</span> [Clean up stored Sefaria text](/data-and-text-tools/clean-up-stored-sefaria-text.md) · [Reference › Text tools](/reference/text-transform.md) {.learn-more}

## Next steps

- Change how the components look with [Match your site's look](/across-components/match-your-sites-look.md).
- See the full examples in [Show one passage](/use-components/show-text/show-one-passage.md), [Show Hebrew and translation together](/use-components/show-text/hebrew-and-translation.md), and [Show an attributed passage](/use-components/show-an-attributed-passage.md).
- Look up every attribute in [Reference › Components](/reference/components.md), or read [Reference › Client](/reference/client.md) if you load text yourself.
