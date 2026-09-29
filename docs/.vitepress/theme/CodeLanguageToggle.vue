<!-- Site code-block convention: see README.md in this folder. -->
<script lang="ts">
import { ref } from "vue";

export type SnippetLanguage = "ts" | "js";

const storageKey = "sefaria-docs:code-language";
// One shared choice, so every toggle on every page shows the same language.
const language = ref<SnippetLanguage>("ts");
let restored = false;

function restore() {
  if (restored) return;
  restored = true;
  try {
    if (globalThis.localStorage?.getItem(storageKey) === "js") {
      language.value = "js";
    }
  } catch {
    // Storage can be blocked; TypeScript stays the default.
  }
}

function choose(next: SnippetLanguage) {
  language.value = next;
  try {
    globalThis.localStorage?.setItem(storageKey, next);
  } catch {
    // The choice still applies for this visit.
  }
}
</script>

<script setup lang="ts">
import { computed, onMounted } from "vue";

import CodeBlock from "./CodeBlock.vue";

const props = defineProps<{
  snippet: { file: string; typescript: string; javascript: string };
}>();

const options = [
  { value: "ts", label: "TypeScript" },
  { value: "js", label: "JavaScript" },
] as const;

onMounted(restore);

const code = computed(() =>
  language.value === "ts" ? props.snippet.typescript : props.snippet.javascript,
);
const label = computed(() =>
  language.value === "ts"
    ? props.snippet.file
    : `${props.snippet.file} (types removed)`,
);
</script>

<template>
  <div class="code-language-toggle">
    <div
      class="code-language-toggle__choices"
      role="group"
      aria-label="Code language"
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :aria-pressed="language === option.value"
        @click="choose(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
    <CodeBlock :code="code" :lang="language" :label="label" />
  </div>
</template>

<style scoped>
.code-language-toggle {
  margin: 16px 0;
}

.code-language-toggle__choices {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.code-language-toggle__choices button {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.code-language-toggle__choices button[aria-pressed="true"] {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
  font-weight: 600;
}

.code-language-toggle__choices button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
</style>
