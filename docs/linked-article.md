> Created/edited by GitHub Copilot; pending human review.

# Authored linked article

The linked-article example starts with ordinary Sefaria anchors and enhances only eligible activation with `<sefaria-popup>`.

The author supplies a native `href` and explicit `data-sefaria-ref`. JavaScript-disabled, modifier-key, alternate-target, download, and non-primary activation remain native.

On eligible activation, the page assigns Popup `anchor`, `sref`, and `open`. The Popup has an explicit cache-disabled toolkit client acquisition source. Close or destroy clears the owned reference and removes only the integration's listeners and accessibility attributes.

Popup owns loading, cancellation, stale-result suppression, private preparation, focus restoration, and `sefaria-popup-error`. The page owns the explicit activation gate and visible integration status.

The integration does not detect citations, extract article text, submit or poll Linker tasks, hover-activate, bulk preload, rewrite prose, or install a global script.

<SiteLink to="/examples/linked-article/index.html">Open the linked article</SiteLink>.
