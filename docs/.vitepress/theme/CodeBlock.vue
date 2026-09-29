<!-- Site code-block convention: see README.md in this folder. -->
<script setup lang="ts">
import { computed } from "vue";

import { type CodeLanguage, highlight } from "./highlight";

const props = defineProps<{
  code: string;
  lang: CodeLanguage;
  label?: string;
  prettyBreaks?: boolean;
}>();

const html = computed(() =>
  highlight(props.code, props.lang, { prettyBreaks: props.prettyBreaks }),
);
</script>

<template>
  <figure class="site-code-block">
    <figcaption v-if="label">{{ label }}</figcaption>
    <pre
      class="site-code"
      dir="ltr"
      :data-lang="lang"
    ><code v-html="html"></code></pre>
  </figure>
</template>
