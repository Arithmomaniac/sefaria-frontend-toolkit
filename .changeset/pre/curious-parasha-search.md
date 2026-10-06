---
"@sefaria/api-client": minor
---

Expose the source-confirmed Israel/diaspora selector for the parasha topic and remove the misleading `sort_fields` default from the generated search request **schema**. The SDK already passed omitted fields through unchanged, and pagesheetrank weighting has always required an explicit one-element `sort_fields`; now `zSearchPostData.parse` also leaves omitted fields absent instead of inserting `["pagesheetrank"]`. Correct the calendar HTTP 200 response type to distinguish a parasha with a required `ref` from the source-confirmed JSON error for an invalid `diaspora` value. The schema parser's output changes for callers relying on the former search default, and calendar callers now need to narrow the success/error response union.
