<script setup lang="ts">
import { withBase } from "vitepress";
</script>

<template>
  <footer class="documentation-disclosure" aria-label="Site footer">
    <p class="documentation-disclosure__project">
      <strong>Sefaria Frontend Toolkit</strong>
      <span aria-hidden="true"> · </span>
      <span>Experimental and unofficial.</span>
      <span aria-hidden="true"> · </span>
      <a href="https://github.com/Arithmomaniac/sefaria-frontend-toolkit">
        GitHub
      </a>
      <span aria-hidden="true"> · </span>
      <a :href="withBase('/help/troubleshoot-a-page.html#get-support')">
        Get support
      </a>
    </p>
    <p>
      Documentation text was written and edited by GitHub Copilot; pending human
      review.
    </p>
  </footer>
</template>
