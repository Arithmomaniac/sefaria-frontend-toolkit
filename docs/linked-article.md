> Created/edited by GitHub Copilot; pending human review.

# Authored linked article

The linked-article example starts with ordinary Sefaria anchors and enhances only eligible activation with `<sefaria-source-card>` inside a page-owned native modal `<dialog>`.

The author supplies a native `href` and explicit `data-sefaria-ref`. JavaScript-disabled, modifier-key, alternate-target, download, and non-primary activation remain native.

On eligible activation, the page opens the dialog and assigns Source Card `sref` with an explicit cache-disabled toolkit client acquisition source. Close or destroy clears the reference and removes the active card. Destroy restores any accessibility attributes the integration replaced.

Source Card owns loading, cancellation, stale-result suppression, private preparation, and `sefaria-source-card-error`. The page owns the dialog, Escape/button close, focus return to the originating link, explicit activation gate, and visible integration status. It uses ordinary Source Card content without a separate preview truncation rule.

The integration does not detect citations, extract article text, submit or poll Linker tasks, hover-activate, bulk preload, rewrite prose, or install a global script.

<SiteLink to="/examples/linked-article/index.html">Open the linked article</SiteLink>.
