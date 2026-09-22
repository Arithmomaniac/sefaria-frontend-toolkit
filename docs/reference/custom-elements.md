# Custom elements

This file is generated from the Lit element sources and the bounded event and token catalogs in `scripts/generate-package-metadata.mjs`. Run `pnpm metadata:generate` after changing a public element contract.

## `<sefaria-bilingual-segment>`

Custom element that renders supplied or acquired bilingual-segment data.

### Properties and attributes

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `sref` | `sref` | `string` | `""` | Reference loaded when authoritative supplied data is absent. |
| `data` | Property only | `unknown | undefined` | `undefined` | Authoritative corrected response-shaped data. |
| `acquisition` | Property only | `SefariaAcquisition | undefined` | `undefined` | Optional element-specific acquisition source. |
| `primaryVersionTitle` | `primary-version-title` | `string | undefined` | `undefined` | Optional exact edition title for the primary role. |
| `translationVersionTitle` | `translation-version-title` | `string | undefined` | `undefined` | Optional exact edition title for the translation role. |
| `contentLanguage` | `content-language` | `BilingualSegmentContentLanguage` | `"both"` | Sides the host wants displayed. |
| `layout` | `layout` | `BilingualSegmentLayout` | `"auto"` | Requested arrangement of the two sides. |
| `sideOrder` | `side-order` | `BilingualSegmentSideOrder` | `"primary-first"` | Requested role order for a side-by-side arrangement. |
| `vocalizationMode` | `vocalization-mode` | `VocalizationMode` | `"taamim_and_nikkud"` | Hebrew vocalization preset applied to both displayed roles. |
| `status` | Property only | `SefariaElementStatus` | - | Coarse lifecycle state without exposing prepared rendering data. |

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
| `sref` | `sref` | `string` | `""` | Reference loaded when authoritative supplied data is absent. |
| `data` | Property only | `unknown | undefined` | `undefined` | Authoritative corrected links response data. |
| `acquisition` | Property only | `SefariaAcquisition | undefined` | `undefined` | Optional element-specific acquisition source. |
| `withText` | `with-text` | `boolean` | `true` | Whether acquired or supplied links include connected text. |
| `category` | `category` | `string | undefined` | `undefined` | Exact category projected from the current captured response. |
| `page` | `page` | `number` | `0` | Zero-based local page projected from the current captured response. |
| `showPreviews` | `show-previews` | `boolean` | `true` | Hides or reveals captured preview data without requesting it. |
| `vocalizationMode` | `vocalization-mode` | `VocalizationMode` | `"taamim_and_nikkud"` | Hebrew vocalization preset applied to safe legacy-channel previews. |
| `status` | Property only | `SefariaElementStatus` | - | Coarse lifecycle state without exposing prepared rendering data. |

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

## `<sefaria-popup>`

Anchored dialog that renders supplied or acquired popup data.

### Properties and attributes

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `sref` | `sref` | `string` | `""` | Reference prepared while the connected popup is open or closed. |
| `data` | Property only | `unknown | undefined` | `undefined` | Authoritative corrected v3 text response data. |
| `acquisition` | Property only | `SefariaAcquisition | undefined` | `undefined` | Optional element-specific acquisition source. |
| `anchor` | Property only | `HTMLElement | null` | `null` | Host element used for placement and focus restoration. |
| `open` | `open` | `boolean` | `false` | Whether the dialog is visible. |
| `vocalizationMode` | `vocalization-mode` | `VocalizationMode` | `"taamim_and_nikkud"` | Hebrew vocalization preset applied to the nested source card. |
| `status` | Property only | `SefariaElementStatus` | - | Coarse lifecycle state without exposing prepared rendering data. |

### Events

| Event | Description |
| --- | --- |
| `sefaria-popup-close` | Reports that the popup should close. |
| `sefaria-popup-error` | Reports a current standalone loading or validation failure. |

### Slots

None.

### CSS parts

None.

## `<sefaria-reader>`

Controlled or declarative reader surface for one semantic reader entry.

### Properties and attributes

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `sref` | `sref` | `string` | `""` | Requested external Reader root, separate from current navigation. |
| `data` | Property only | `ReaderRawSeedData | undefined` | `undefined` | Transactional unknown raw Reader seed. |
| `acquisition` | Property only | `SefariaAcquisition | undefined` | `undefined` | Optional element-specific acquisition source. |
| `activePane` | `active-pane` | `ReaderPane` | `"source"` | Host-controlled pane selected in compact presentation. |
| `chatExport` | `chat-export` | `boolean` | `false` | Shows an explicit host-mediated chat export action when a target exists. |
| `contentLanguage` | `content-language` | `BilingualPairContentLanguage` | `"both"` | Source-card roles displayed by the controlled reader. |
| `layout` | `layout` | `BilingualPairLayout` | `"auto"` | Source-card bilingual arrangement. |
| `sideOrder` | `side-order` | `BilingualPairSideOrder` | `"primary-first"` | First source-card role in side-by-side layout. |
| `showConnectionPreviews` | `show-connection-previews` | `boolean` | `true` | Whether captured connection previews are visible. |
| `vocalizationMode` | `vocalization-mode` | `VocalizationMode` | `"taamim_and_nikkud"` | Hebrew vocalization preset applied to source and preview text. |
| `status` | Property only | `SefariaElementStatus` | - | Coarse Reader lifecycle state without exposing prepared rendering data. |
| `currentEntryId` | Property only | `string | undefined` | - | Stable identity of the current retained semantic Reader entry. |
| `selectedRef` | Property only | `string | undefined` | - | Exact selected canonical target, when the current entry establishes one. |
| `rootLoading` | Property only | `boolean` | - | Whether a root source request is currently pending. |
| `readerError` | Property only | `string | undefined` | - | Current Reader failure message, when the latest eligible operation failed. |
| `canGoBack` | Property only | `boolean` | - | Whether Reader Back can activate a retained predecessor. |
| `historyTruncated` | Property only | `boolean` | - | Whether bounded retention removed older semantic history. |

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
| `sref` | `sref` | `string` | `""` | Reference loaded when authoritative supplied data is absent. |
| `data` | Property only | `unknown | undefined` | `undefined` | Authoritative corrected reference response data. |
| `acquisition` | Property only | `SefariaAcquisition | undefined` | `undefined` | Optional element-specific acquisition source. |
| `labelLanguage` | `label-language` | `RefLabelLanguage` | `"english"` | Label language selected by the host. |
| `linked` | `linked` | `boolean` | `false` | Whether data-state labels render as canonical links. |
| `status` | Property only | `SefariaElementStatus` | - | Coarse lifecycle state without exposing prepared rendering data. |

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
| `sref` | `sref` | `string` | `""` | Reference loaded when authoritative supplied data is absent. |
| `data` | Property only | `unknown | undefined` | `undefined` | Authoritative corrected response-shaped data. |
| `acquisition` | Property only | `SefariaAcquisition | undefined` | `undefined` | Optional element-specific acquisition source. |
| `primaryVersionTitle` | `primary-version-title` | `string | undefined` | `undefined` | Optional exact edition title for the primary role. |
| `translationVersionTitle` | `translation-version-title` | `string | undefined` | `undefined` | Optional exact edition title for the translation role. |
| `contentLanguage` | `content-language` | `BilingualPairContentLanguage` | `"both"` | Sides the host wants displayed for every pair. |
| `layout` | `layout` | `BilingualPairLayout` | `"auto"` | Requested arrangement for every pair. |
| `sideOrder` | `side-order` | `BilingualPairSideOrder` | `"primary-first"` | Requested role order for every pair. |
| `vocalizationMode` | `vocalization-mode` | `VocalizationMode` | `"taamim_and_nikkud"` | Hebrew vocalization preset applied to every displayed text leaf. |
| `showAddressLabels` | Property only | `boolean` | `true` | Whether compact address labels are visible beside rendered text sides. |
| `selectable` | `selectable` | `boolean` | `false` | Enables selection controls for items with proven canonical targets. |
| `selectedPosition` | Property only | `readonly number[] | undefined` | `undefined` | Host-controlled original position path, never a reference string. |
| `hideAttributions` | `hide-attributions` | `boolean` | `false` | Whether resolved edition attribution is intentionally omitted. |
| `status` | Property only | `SefariaElementStatus` | - | Coarse lifecycle state without exposing prepared rendering data. |

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
| `sref` | `sref` | `string` | `""` | Reference loaded when authoritative supplied data is absent. |
| `data` | Property only | `unknown | undefined` | `undefined` | Authoritative corrected response-shaped data. |
| `acquisition` | Property only | `SefariaAcquisition | undefined` | `undefined` | Optional element-specific acquisition source. |
| `versionLanguage` | `version-language` | `string | undefined` | `undefined` | Optional language-family selector overriding the primary default. |
| `versionTitle` | `version-title` | `string | undefined` | `undefined` | Optional exact edition title paired with `versionLanguage`. |
| `vocalizationMode` | `vocalization-mode` | `VocalizationMode` | `"taamim_and_nikkud"` | Hebrew vocalization preset applied only to the displayed safe text. |
| `selectedVersion` | Property only | `TextSegmentSelectedVersionInfo | undefined` | - | Metadata for the currently displayed selected edition. |
| `status` | Property only | `SefariaElementStatus` | - | Coarse lifecycle state without exposing prepared rendering data. |

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
| `--sefaria-shadow` | `0 1rem 3rem rgb(0 0 0 / 28%)` | Popup and elevated-surface shadow. |
| `--sefaria-panel-radius` | `0.75rem` | Panel corner radius. |
| `--sefaria-control-radius` | `0.3rem` | Control corner radius. |
| `--sefaria-font-scale` | `1` | Component font-size multiplier. |
| `--sefaria-font-hebrew` | `"Noto Serif Hebrew", "SBL Hebrew", "Times New Roman", serif` | Hebrew body font stack. |
| `--sefaria-font-english` | `Georgia, "Times New Roman", serif` | English body font stack. |
| `--sefaria-font-label-hebrew` | `"Noto Sans Hebrew", system-ui, sans-serif` | Hebrew label font stack. |
| `--sefaria-font-label-english` | `system-ui, sans-serif` | English label font stack. |
