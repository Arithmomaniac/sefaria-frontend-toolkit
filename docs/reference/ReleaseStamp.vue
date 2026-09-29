<script setup lang="ts">
import { data } from "./release.data";

const repository = "https://github.com/Arithmomaniac/sefaria-frontend-toolkit";
</script>

<template>
  <span v-if="data.commit" class="release-stamp" data-release-stamp>
    This copy was built from commit
    <a :href="`${repository}/commit/${data.commit}`"
      ><code>{{ data.commit.slice(0, 7) }}</code></a
    >.
  </span>
</template>
