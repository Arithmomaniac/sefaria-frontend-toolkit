<script setup lang="ts">
import { withBase } from "vitepress";

import DocumentationDetails from "./DocumentationDetails.vue";
</script>

<template>
  <footer class="documentation-disclosure" aria-label="Site footer">
    <p class="documentation-disclosure__project">
      <strong>Sefaria Frontend Toolkit</strong>
      <span aria-hidden="true"> · </span>
      <span>Community-driven with Sefaria backing and support.</span>
      <span aria-hidden="true"> · </span>
      <a href="https://github.com/Sefaria/sefaria-frontend-toolkit"> GitHub </a>
      <span aria-hidden="true"> · </span>
      <a :href="withBase('/help/troubleshoot-a-page.html#get-support')">
        Get support
      </a>
    </p>
    <div class="documentation-disclosure__notice">
      <span>AI-generated documentation.</span>
      <DocumentationDetails />
    </div>
  </footer>
</template>
