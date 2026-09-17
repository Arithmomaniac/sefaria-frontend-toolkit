<script setup lang="ts">
import { computed } from "vue";
import { withBase } from "vitepress";

const props = defineProps<{
  project: string;
  title: string;
}>();

const editorUrl = computed(() =>
  withBase(`/examples/playground/index.html?project=${props.project}`),
);
</script>

<template>
  <section class="playground-embed">
    <div class="playground-embed__heading">
      <div>
        <p class="playground-embed__eyebrow">Edit HTML, CSS, and JavaScript</p>
        <h3>{{ title }}</h3>
      </div>
      <a :href="editorUrl" target="_blank" rel="noreferrer">Open full editor</a>
    </div>
    <p class="playground-embed__note">
      This trusted same-site editor runs your draft in its existing opaque
      preview. Nothing runs until you choose <strong>Run</strong>.
    </p>
    <iframe
      class="playground-embed__frame"
      :title="title"
      :src="editorUrl"
      loading="lazy"
    ></iframe>
  </section>
</template>
