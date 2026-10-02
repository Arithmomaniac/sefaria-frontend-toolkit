<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

import snippet from "../../../examples/site-snippets/source-card-script-tag.html?raw";
import CodeBlock from "./CodeBlock.vue";

const frame = ref<HTMLIFrameElement>();
let observer: ResizeObserver | undefined;

function fitFrame() {
  const element = frame.value;
  const root = element?.contentDocument?.documentElement;
  if (!element || !root) return;
  observer?.disconnect();
  observer = new ResizeObserver(() => {
    const borders = element.offsetHeight - element.clientHeight;
    element.style.height = `${Math.ceil(root.getBoundingClientRect().height) + borders}px`;
  });
  observer.observe(root);
}

onMounted(() => {
  if (frame.value?.contentDocument?.readyState === "complete") fitFrame();
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <section class="snippet-demo" aria-labelledby="source-card-snippet-title">
    <div class="snippet-demo__code">
      <h2 id="source-card-snippet-title">Paste these two lines</h2>
      <p>
        Paste them into an HTML page. The result below is those same lines
        running live. This code comes from
        <code>examples/site-snippets/source-card-script-tag.html</code> in the
        repository.
      </p>
      <CodeBlock :code="snippet.trim()" lang="html" />
    </div>
    <div class="snippet-demo__result">
      <h2>Live result</h2>
      <iframe
        ref="frame"
        class="snippet-demo__frame"
        title="Source Card script-tag quickstart"
        :srcdoc="snippet"
        loading="eager"
        @load="fitFrame"
      ></iframe>
    </div>
  </section>
</template>
