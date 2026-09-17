> Created/edited by GitHub Copilot with human review/feedback by avilevin.

# Alpine Vite example

This private standalone consumer uses Alpine 3.17.2 with the existing `@arithmomaniac/sefaria-client` and `@arithmomaniac/sefaria-web-components` packages. It is a declarative host example, not an Alpine wrapper package or toolkit runtime dependency.

Run it from the repository root:

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @sefaria-example/alpine-vite dev
```

The first source card comes from validated supplied `Micah 6:8` data and makes no request. Submitting the form calls the public source-card controller. Alpine owns draft input, presentation properties, visible host status, and the canonical `sefaria-source-select` event. The controller remains in a closure outside Alpine's reactive proxy, and the public binder assigns only the component view model.

Changing displayed sides, layout, side order, Hebrew vocalization, theme, or width performs zero requests. A failed replacement explicitly leaves the prior committed card visible instead of presenting it as live success. Destroying the Alpine tree unbinds the element and disposes pending controller work.
