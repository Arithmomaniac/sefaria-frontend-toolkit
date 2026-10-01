---
"@arithmomaniac/sefaria-web-components": minor
---

> Created/edited by GitHub Copilot; pending human review.

Rename the standalone loading API from acquisition terms to data-source terms with no compatibility aliases.

| Old | New |
| --- | --- |
| element `acquisition` property | `source` property |
| `SefariaAcquisition` | `SefariaDataSource` |
| `kind: "capability"` | `kind: "custom"` |
| `capability` field | `loader` field |
| `SefariaAcquisitionCapability` | `SefariaDataLoader` |
| `SefariaAcquisitionResponse` | `SefariaDataLoaderResponse` |
| `SefariaTextAcquisitionRequest` | `SefariaTextLoadRequest` |
| `SefariaLinksAcquisitionRequest` | `SefariaLinksLoadRequest` |
| `configureSefariaAcquisition` | `configureSefariaDataSource` |
| `@arithmomaniac/sefaria-web-components/acquisition` | `@arithmomaniac/sefaria-web-components/data-source` |
| `ReaderDataSource` | `ReaderRecordLoader` |
| `createSefariaReaderDataSource` | `createSefariaReaderRecordLoader` |
| MCP `createMcpReaderAcquisition` | MCP `createMcpReaderSource` |
