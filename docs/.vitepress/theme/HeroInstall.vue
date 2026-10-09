<script setup lang="ts">
import { ref } from "vue";

import release from "../../../scripts/npm-documentation-release.json";
import CodeBlock from "./CodeBlock.vue";

const route = ref<"npm" | "cdn">("npm");
const command = `npm install @sefaria/web-components@${release.version}`;
const script =
  `<script type="module" src="https://cdn.jsdelivr.net/npm/@sefaria/web-components@${release.version}/dist/browser/sefaria-elements.js"><` +
  '/script>\n<sefaria-source-card sref="Micah 6:8"></sefaria-source-card>';
</script>

<template>
  <section class="hero-install" aria-labelledby="hero-install-title">
    <h2 id="hero-install-title">Add Sefaria components to your page</h2>
    <div class="code-language-toggle">
      <div
        class="code-language-toggle__choices"
        role="group"
        aria-label="Installation route"
      >
        <button
          type="button"
          :aria-pressed="route === 'npm'"
          @click="route = 'npm'"
        >
          npm
        </button>
        <button
          type="button"
          :aria-pressed="route === 'cdn'"
          @click="route = 'cdn'"
        >
          Browser CDN
        </button>
      </div>
      <template v-if="route === 'npm'">
        <pre class="site-code" dir="ltr"><code>{{ command }}</code></pre>
        <CodeBlock code='import "@sefaria/web-components";' lang="js" />
      </template>
      <CodeBlock v-else :code="script" lang="html" />
    </div>
    <SiteLink to="/use-components/start-here.md"
      >Components quick start</SiteLink
    >
  </section>
</template>
