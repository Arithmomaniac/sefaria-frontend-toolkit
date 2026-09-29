# Custom elements

This file is generated from the Lit element sources and the bounded event and token catalogs in `scripts/generate-package-metadata.mjs`. Run `pnpm metadata:generate` after changing a public element contract.

## `<sefaria-bilingual-segment>`

Custom element that renders supplied or acquired bilingual-segment data.

### Properties and attributes

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `sref` | `sref` | `string` | `""` | The Sefaria reference to load when `data` isn't set. |
| `data` | Property only | `unknown | undefined` | `undefined` | Sefaria API response data to render. When it's set, the element doesn't fetch anything. |
| `acquisition` | Property only | `SefariaAcquisition | undefined` | `undefined` | Chooses how this element fetches data, instead of the default. |
| `primaryVersionTitle` | `primary-version-title` | `string | undefined` | `undefined` | Exact title of the edition to show as the primary text. |
| `translationVersionTitle` | `translation-version-title` | `string | undefined` | `undefined` | Exact title of the edition to show as the translation. |
| `translationLanguage` | `translation-language` | `string | undefined` | `undefined` | Preferred translation language. Without one in that language, the element uses Sefaria's default translation. |
| `hideAttributions` | `hide-attributions` | `boolean` | `false` | Hides the edition attribution shown with the text. |
| `contentLanguage` | `content-language` | `BilingualSegmentContentLanguage` | `"both"` | Which text to show: `primary`, `translation` or `both`. |
| `layout` | `layout` | `BilingualSegmentLayout` | `"auto"` | How the two texts are arranged: `auto`, `stacked` or `side-by-side`. |
| `sideOrder` | `side-order` | `BilingualSegmentSideOrder` | `"primary-first"` | Which text comes first side by side: `primary-first` or `translation-first`. |
| `vocalizationMode` | `vocalization-mode` | `VocalizationMode` | `"taamim_and_nikkud"` | How much Hebrew vowel and cantillation marking to keep. `none` removes both. |
| `status` | Property only | `SefariaElementStatus` | - | Read-only loading state: `"empty"`, `"loading"`, `"ready"` or `"error"`. |

### Events

| Event | Description |
| --- | --- |
| `sefaria-bilingual-segment-error` | Reports a current standalone loading or validation failure. |

### Slots

None.

### CSS parts

None.

## `<sefaria-connections-panel>`

Category summaries and bounded connected-text details from supplied or acquired data.

### Properties and attributes

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `sref` | `sref` | `string` | `""` | The Sefaria reference to load when `data` isn't set. |
| `data` | Property only | `unknown | undefined` | `undefined` | Sefaria links response data to render. When it's set, the element doesn't fetch anything. |
| `acquisition` | Property only | `SefariaAcquisition | undefined` | `undefined` | Chooses how this element fetches data, instead of the default. |
| `withText` | `with-text` | `boolean` | `true` | Whether the links include the connected texts. |
| `category` | `category` | `string | undefined` | `undefined` | Category of the loaded links to show. |
| `page` | `page` | `number` | `0` | Zero-based page of the loaded links to show. |
| `showPreviews` | `show-previews` | `boolean` | `true` | Shows or hides the text previews already loaded, without fetching more. |
| `vocalizationMode` | `vocalization-mode` | `VocalizationMode` | `"taamim_and_nikkud"` | How much Hebrew vowel and cantillation marking to keep in previews. `none` removes both. |
| `status` | Property only | `SefariaElementStatus` | - | Read-only loading state: `"empty"`, `"loading"`, `"ready"` or `"error"`. |

### Events

| Event | Description |
| --- | --- |
| `sefaria-connections-category-change` | Requests a different captured connection category. |
| `sefaria-connections-preview-request` | Requests captured connection previews from the host. |
| `sefaria-connections-page-change` | Requests a different page of captured connections. |
| `sefaria-connection-select` | Reports selection of one connected reference. |
| `sefaria-connections-panel-error` | Reports a current standalone loading or validation failure. |

### Slots

None.

### CSS parts

None.

## `<sefaria-reader>`

Controlled or declarative reader surface for one semantic reader entry.

### Properties and attributes

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `sref` | `sref` | `string` | `""` | The reference the Reader starts from. Navigating inside the Reader doesn't change it. |
| `data` | Property only | `ReaderRawSeedData | undefined` | `undefined` | Starting data for the Reader, which it accepts or rejects as a whole. |
| `acquisition` | Property only | `SefariaAcquisition | undefined` | `undefined` | Chooses how this element fetches data, instead of the default. |
| `translationLanguage` | `translation-language` | `string | undefined` | `undefined` | Preferred translation language, for the starting text and texts you navigate to. |
| `primaryVersionTitle` | `primary-version-title` | `string | undefined` | `undefined` | Exact title of the primary edition for the starting reference. |
| `translationVersionTitle` | `translation-version-title` | `string | undefined` | `undefined` | Exact title of the translation edition for the starting reference. |
| `hideAttributions` | `hide-attributions` | `boolean` | `false` | Hides the edition attribution on the source card. |
| `activePane` | `active-pane` | `ReaderPane` | `"source"` | Which pane the compact layout shows: `source` or `connections`. |
| `chatExport` | `chat-export` | `boolean` | `false` | Shows a button that sends the selected reference to your page's chat, when one is selected. |
| `contentLanguage` | `content-language` | `BilingualPairContentLanguage` | `"both"` | Which text the source card shows: `primary`, `translation` or `both`. |
| `layout` | `layout` | `BilingualPairLayout` | `"auto"` | How the source card arranges its two texts: `auto`, `stacked` or `side-by-side`. |
| `sideOrder` | `side-order` | `BilingualPairSideOrder` | `"primary-first"` | Which text comes first side by side: `primary-first` or `translation-first`. |
| `showConnectionPreviews` | `show-connection-previews` | `boolean` | `true` | Whether connection previews are shown. |
| `vocalizationMode` | `vocalization-mode` | `VocalizationMode` | `"taamim_and_nikkud"` | How much Hebrew vowel and cantillation marking to keep. `none` removes both. |
| `status` | Property only | `SefariaElementStatus` | - | Read-only loading state: `"empty"`, `"loading"`, `"ready"` or `"error"`. |
| `currentEntryId` | Property only | `string | undefined` | - | The ID of the current history entry. |
| `selectedRef` | Property only | `string | undefined` | - | The selected reference, when there is one. |
| `rootLoading` | Property only | `boolean` | - | Whether the starting text is still loading. |
| `readerError` | Property only | `string | undefined` | - | The error message, when the latest action failed. |
| `canGoBack` | Property only | `boolean` | - | Whether Back can return to an earlier entry. |
| `historyTruncated` | Property only | `boolean` | - | Whether older history entries were dropped to stay within the history limit. |

### Events

| Event | Description |
| --- | --- |
| `sefaria-reader-back` | Requests navigation to the previous entry. |
| `sefaria-reader-history-activate` | Requests activation of one retained history entry. |
| `sefaria-reader-pane-change` | Requests the visible compact reader pane. |
| `sefaria-reader-chat-export` | Requests host-owned export of a reference to chat. |
| `sefaria-reader-source-select` | Reports selection of one source-card item. |
| `sefaria-reader-connections-category-change` | Requests a different connection category. |
| `sefaria-reader-connections-page-change` | Requests a different connection page. |
| `sefaria-reader-connection-select` | Reports selection of one connected reference. |
| `sefaria-reader-connections-preview-request` | Requests connection previews from the host. |
| `sefaria-reader-error` | Reports a current standalone loading or seed-admission failure. |

### Slots

| Slot | Description |
| --- | --- |
| `toolbar-actions` | Host-owned actions placed after the Reader's built-in toolbar controls. |

### CSS parts

| Part               | Description                                          |
| ------------------ | ---------------------------------------------------- |
| `toolbar`          | Container for compact pane and host action controls. |
| `history`          | Back and retained-history controls.                  |
| `source-pane`      | Scrollable source-text pane.                         |
| `connections-pane` | Scrollable connections pane.                         |

## `<sefaria-ref-label>`

Custom element that renders supplied or acquired reference-label data.

### Properties and attributes

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `sref` | `sref` | `string` | `""` | The Sefaria reference to load when `data` isn't set. |
| `data` | Property only | `unknown | undefined` | `undefined` | Sefaria reference response data to render. When it's set, the element doesn't fetch anything. |
| `acquisition` | Property only | `SefariaAcquisition | undefined` | `undefined` | Chooses how this element fetches data, instead of the default. |
| `labelLanguage` | `label-language` | `RefLabelLanguage` | `"english"` | Language of the label. |
| `linked` | `linked` | `boolean` | `false` | Whether a loaded label is a link to the reference on Sefaria. |
| `status` | Property only | `SefariaElementStatus` | - | Read-only loading state: `"empty"`, `"loading"`, `"ready"` or `"error"`. |

### Events

| Event | Description |
| --- | --- |
| `sefaria-ref-label-error` | Reports a current standalone loading or validation failure. |

### Slots

None.

### CSS parts

None.

## `<sefaria-source-card>`

Custom element that renders supplied or acquired source-card data.

### Properties and attributes

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `sref` | `sref` | `string` | `""` | The Sefaria reference to load when `data` isn't set. |
| `data` | Property only | `unknown | undefined` | `undefined` | Sefaria API response data to render. When it's set, the element doesn't fetch anything. |
| `acquisition` | Property only | `SefariaAcquisition | undefined` | `undefined` | Chooses how this element fetches data, instead of the default. |
| `primaryVersionTitle` | `primary-version-title` | `string | undefined` | `undefined` | Exact title of the edition to show as the primary text. |
| `translationVersionTitle` | `translation-version-title` | `string | undefined` | `undefined` | Exact title of the edition to show as the translation. |
| `translationLanguage` | `translation-language` | `string | undefined` | `undefined` | Preferred translation language. Without one in that language, the element uses Sefaria's default translation. |
| `contentLanguage` | `content-language` | `BilingualPairContentLanguage` | `"both"` | Which text to show: `primary`, `translation` or `both`. |
| `layout` | `layout` | `BilingualPairLayout` | `"auto"` | How each pair of texts is arranged: `auto`, `stacked` or `side-by-side`. |
| `sideOrder` | `side-order` | `BilingualPairSideOrder` | `"primary-first"` | Which text comes first side by side: `primary-first` or `translation-first`. |
| `vocalizationMode` | `vocalization-mode` | `VocalizationMode` | `"taamim_and_nikkud"` | How much Hebrew vowel and cantillation marking to keep. `none` removes both. |
| `showAddressLabels` | Property only | `boolean` | `true` | Whether small reference labels are shown beside the texts. |
| `selectable` | `selectable` | `boolean` | `false` | Lets readers select the verses that have their own reference. |
| `selectedPosition` | Property only | `readonly number[] | undefined` | `undefined` | Position of the selected verse, as an array of numbers rather than a reference. |
| `hideAttributions` | `hide-attributions` | `boolean` | `false` | Hides the edition attribution. |
| `status` | Property only | `SefariaElementStatus` | - | Read-only loading state: `"empty"`, `"loading"`, `"ready"` or `"error"`. |

### Events

| Event | Description |
| --- | --- |
| `sefaria-source-select` | Reports selection of one source-card item. |
| `sefaria-source-card-error` | Reports a current standalone loading or validation failure. |

### Slots

None.

### CSS parts

None.

## `<sefaria-text-segment>`

Custom element that renders supplied or acquired text-segment data.

### Properties and attributes

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `sref` | `sref` | `string` | `""` | The Sefaria reference to load when `data` isn't set. |
| `data` | Property only | `unknown | undefined` | `undefined` | Sefaria API response data to render. When it's set, the element doesn't fetch anything. |
| `acquisition` | Property only | `SefariaAcquisition | undefined` | `undefined` | Chooses how this element fetches data, instead of the default. |
| `versionLanguage` | `version-language` | `string | undefined` | `undefined` | Language of the edition to show, instead of the primary edition. |
| `versionTitle` | `version-title` | `string | undefined` | `undefined` | Exact title of the edition to show, used together with `versionLanguage`. |
| `translationLanguage` | `translation-language` | `string | undefined` | `undefined` | Preferred translation language. Can't be combined with `versionLanguage`. |
| `hideAttributions` | `hide-attributions` | `boolean` | `false` | Hides the edition attribution. |
| `vocalizationMode` | `vocalization-mode` | `VocalizationMode` | `"taamim_and_nikkud"` | How much Hebrew vowel and cantillation marking to keep. `none` removes both. |
| `selectedVersion` | Property only | `TextSegmentSelectedVersionInfo | undefined` | - | Details of the edition currently shown. |
| `status` | Property only | `SefariaElementStatus` | - | Read-only loading state: `"empty"`, `"loading"`, `"ready"` or `"error"`. |

### Events

| Event | Description |
| --- | --- |
| `sefaria-text-segment-error` | Reports a current standalone loading or validation failure. |

### Slots

None.

### CSS parts

None.

## Shared CSS custom properties

| Property | Default | Description |
| --- | --- | --- |
| `--sefaria-surface` | `light-dark(#fffdf8, #2b2e2a)` | Primary surface color. |
| `--sefaria-surface-muted` | `light-dark(#f5f1e8, #222521)` | Muted surface color. |
| `--sefaria-fg` | `light-dark(#25231f, #f1eee7)` | Primary foreground color. |
| `--sefaria-fg-muted` | `light-dark(#6d675d, #bdb7ac)` | Muted foreground color. |
| `--sefaria-border` | `light-dark(#d7cfc1, #555b53)` | Standard border color. |
| `--sefaria-border-strong` | `light-dark(#aaa094, #73796f)` | Strong border color. |
| `--sefaria-accent` | `light-dark(#8e2449, #ff93b4)` | Accent and focus color. |
| `--sefaria-accent-soft` | `light-dark(rgb(142 36 73 / 10%), rgb(255 147 180 / 14%))` | Translucent accent surface. |
| `--sefaria-danger` | `light-dark(#9c1c1c, #ffaaa4)` | Error foreground color. |
| `--sefaria-link` | `light-dark(#8e2449, #ff93b4)` | Link foreground color. |
| `--sefaria-shadow` | `0 1rem 3rem rgb(0 0 0 / 28%)` | Elevated-surface shadow. |
| `--sefaria-panel-radius` | `0.75rem` | Panel corner radius. |
| `--sefaria-control-radius` | `0.3rem` | Control corner radius. |
| `--sefaria-font-scale` | `1` | Component font-size multiplier. |
| `--sefaria-font-hebrew` | `"Noto Serif Hebrew", "SBL Hebrew", "Times New Roman", serif` | Hebrew body font stack. |
| `--sefaria-font-english` | `Georgia, "Times New Roman", serif` | English body font stack. |
| `--sefaria-font-label-hebrew` | `"Noto Sans Hebrew", system-ui, sans-serif` | Hebrew label font stack. |
| `--sefaria-font-label-english` | `system-ui, sans-serif` | English label font stack. |
