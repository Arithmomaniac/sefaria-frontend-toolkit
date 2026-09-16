<script setup lang="ts">
import { computed } from "vue";
import { withBase } from "vitepress";

const props = defineProps<{ to: string }>();
const href = computed(() => withBase(props.to));
</script>

<template>
  <a :href="href" target="_self"><slot /></a>
</template>
