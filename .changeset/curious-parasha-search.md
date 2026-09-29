---
"@arithmomaniac/sefaria-client": minor
---

Expose the source-confirmed Israel/diaspora selector for the parasha topic and remove the misleading `sort_fields` default from the generated search request **schema**. The SDK already passed omitted fields through unchanged, and pagesheetrank weighting has always required an explicit one-element `sort_fields`; now `zSearchPostData.parse` also leaves omitted fields absent instead of inserting `["pagesheetrank"]`. The calendar addition is compatible, but the schema parser's output changes for callers relying on its inferred default.
