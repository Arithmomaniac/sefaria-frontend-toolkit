<!-- Live editor convention: see README.md in this folder. -->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import CodeBlock from "./CodeBlock.vue";
import type { CodeLanguage } from "./highlight";

const props = withDefaults(
  defineProps<{
    code: string;
    title: string;
    lang?: CodeLanguage;
  }>(),
  { lang: "html" },
);

const original = computed(() => props.code.trim());
const running = ref(original.value);
const draft = ref(original.value);
const editing = ref(false);
const visible = ref(false);
const runCount = ref(0);
const height = ref<number>();

const root = ref<HTMLElement>();
const frame = ref<HTMLIFrameElement>();
const textarea = ref<HTMLTextAreaElement>();

// A sandboxed frame has an opaque origin, so the parent can't measure it.
// This appended script reports the document height and nothing else.
const heightReporter =
  "<script>new ResizeObserver(()=>parent.postMessage({liveEditorHeight:Math.ceil(document.documentElement.getBoundingClientRect().height)},'*')).observe(document.documentElement)<\/script>";

const srcdoc = computed(() =>
  visible.value ? `${running.value}\n${heightReporter}` : undefined,
);
const changed = computed(() => running.value !== original.value);

function edit() {
  draft.value = running.value;
  editing.value = true;
  requestAnimationFrame(() => textarea.value?.focus());
}

function run() {
  running.value = draft.value;
  runCount.value += 1;
  height.value = undefined;
}

function reset() {
  draft.value = original.value;
  editing.value = false;
  run();
}

function onMessage(event: MessageEvent) {
  if (event.source !== frame.value?.contentWindow) return;
  const value = event.data?.liveEditorHeight;
  if (typeof value === "number" && value > 0) height.value = value;
}

let observer: IntersectionObserver | undefined;

onMounted(() => {
  window.addEventListener("message", onMessage);
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        visible.value = true;
        observer?.disconnect();
      }
    },
    { rootMargin: "200px 0px" },
  );
  if (root.value) observer.observe(root.value);
});

onBeforeUnmount(() => {
  window.removeEventListener("message", onMessage);
  observer?.disconnect();
});
</script>

<template>
  <section
    ref="root"
    class="live-editor"
    :aria-label="`Live example: ${title}`"
    :data-state="visible ? 'loaded' : 'waiting'"
  >
    <div class="live-editor__bar">
      <span class="live-editor__title">{{ title }}</span>
      <span class="live-editor__actions">
        <button v-if="!editing" type="button" @click="edit">Edit</button>
        <template v-else>
          <button type="button" class="live-editor__run" @click="run">
            Run
          </button>
        </template>
        <button v-if="editing || changed" type="button" @click="reset">
          Reset
        </button>
      </span>
    </div>
    <CodeBlock v-if="!editing" :code="running" :lang="lang" />
    <textarea
      v-else
      ref="textarea"
      v-model="draft"
      class="live-editor__textarea"
      :aria-label="`Edit code: ${title}`"
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      dir="ltr"
      :rows="Math.max(4, draft.split('\n').length + 1)"
      @keydown.ctrl.enter.prevent="run"
      @keydown.meta.enter.prevent="run"
    ></textarea>
    <p v-if="editing" class="live-editor__hint">
      Your changes run when you choose <strong>Run</strong> (or press
      Ctrl+Enter). They stay on this page and aren't saved.
    </p>
    <iframe
      :key="runCount"
      ref="frame"
      class="live-editor__frame"
      :title="`Live result: ${title}`"
      sandbox="allow-scripts"
      :srcdoc="srcdoc"
      :style="height ? { height: `${height + 2}px` } : undefined"
    ></iframe>
  </section>
</template>

<style scoped>
.live-editor {
  display: grid;
  gap: 0.75rem;
  margin: 1.5rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.75rem;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
}

.live-editor__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.live-editor__title {
  font-weight: 600;
}

.live-editor__actions {
  display: flex;
  gap: 0.5rem;
}

.live-editor__actions button {
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.4rem;
  padding: 0.25rem 0.75rem;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.live-editor__actions .live-editor__run {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  background: var(--vp-c-brand-1);
}

.live-editor :deep(.site-code-block) {
  margin: 0;
}

.live-editor__textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
}

.live-editor__hint {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
}

.live-editor__frame {
  display: block;
  width: 100%;
  min-height: 6rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.5rem;
  background: #fff;
}
</style>
