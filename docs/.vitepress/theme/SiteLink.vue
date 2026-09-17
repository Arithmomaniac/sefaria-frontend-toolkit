<script setup lang="ts">
import { computed } from "vue";
import { withBase } from "vitepress";

const props = defineProps<{ to: string }>();
const href = computed(() => withBase(props.to));
const opensStaticIndex = computed(() =>
  props.to.split(/[?#]/u)[0]?.endsWith("/index.html"),
);
</script>

<template>
  <a
    :href="href"
    :target="opensStaticIndex ? '_blank' : '_self'"
    :rel="opensStaticIndex ? 'noreferrer' : undefined"
  >
    <slot />
  </a>
</template>
