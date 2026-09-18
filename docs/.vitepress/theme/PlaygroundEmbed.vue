<script setup lang="ts">
import { computed } from "vue";
import { withBase } from "vitepress";

const props = defineProps<{
  project: string;
  title: string;
  headingLevel?: 2 | 3;
}>();

const editorUrl = computed(() =>
  withBase(`/examples/playground/index.html?project=${props.project}`),
);
const heading = computed(() => `h${props.headingLevel ?? 3}`);
const frameTitle = computed(() => `Component editor: ${props.title}`);
</script>

<template>
  <section class="playground-embed">
    <div class="playground-embed__heading">
      <div>
        <p class="playground-embed__eyebrow">Edit HTML, CSS, and JavaScript</p>
        <component :is="heading">{{ title }}</component>
      </div>
      <a :href="editorUrl" target="_blank" rel="noreferrer">Open full editor</a>
    </div>
    <p class="playground-embed__note">
      This trusted same-site editor runs the maintained project on load in its
      existing opaque preview. Your edits run only when you choose
      <strong>Run</strong>.
    </p>
    <iframe
      class="playground-embed__frame"
      :title="frameTitle"
      :src="editorUrl"
      loading="lazy"
    ></iframe>
  </section>
</template>
