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
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import CodeBlock from "./CodeBlock.vue";
import release from "../../../scripts/npm-documentation-release.json";

const props = defineProps<{
  snippet: {
    file: string;
    typescript: string;
    javascript: string;
    runnable?: boolean;
  };
}>();

const options = [
  { value: "ts", label: "TypeScript" },
  { value: "js", label: "JavaScript" },
] as const;

const imports = {
  "@sefaria/api-client": `https://cdn.jsdelivr.net/npm/@sefaria/api-client@${release.version}/dist/browser/sefaria-api-client.js`,
  "@sefaria/text-transform": `https://cdn.jsdelivr.net/npm/@sefaria/text-transform@${release.version}/dist/browser/sefaria-text-transform.js`,
};

type Line = { kind: "log" | "error"; text: string };
const runCount = ref(0);
const running = ref(false);
const lines = ref<Line[]>([]);
const frame = ref<HTMLIFrameElement>();
const srcdoc = ref<string>();

// The frame has an opaque origin and no access to this page. It loads the
// snippet as a module through a blob URL so import-map and run failures both
// land in one catch. Nothing is sent back except console text.
function frameDocument(source: string) {
  const json = (value: unknown) =>
    JSON.stringify(value).replaceAll("<", "\\u003c");
  const runner = `
const send = (kind, text) => parent.postMessage({ siteSnippetRun: { kind, text } }, "*");
const show = (value) => {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.stack ?? value.name + ": " + value.message;
  try { return JSON.stringify(value, null, 2) ?? String(value); } catch { return String(value); }
};
for (const kind of ["log", "error"]) {
  console[kind] = (...args) => send(kind, args.map(show).join(" "));
}
addEventListener("error", (event) => send("error", show(event.error ?? event.message)));
addEventListener("unhandledrejection", (event) => send("error", show(event.reason)));
try {
  await import(URL.createObjectURL(new Blob([${json(source)}], { type: "text/javascript" })));
} catch (error) {
  send("error", show(error));
}
send("done", "");`;
  return (
    `<!doctype html><script type="importmap">${json({ imports })}<` +
    `/script><script type="module">${runner.replaceAll("<", "\\u003c")}<` +
    `/script>`
  );
}

function run() {
  lines.value = [];
  running.value = true;
  srcdoc.value = frameDocument(props.snippet.javascript);
  runCount.value += 1;
}

function onMessage(event: MessageEvent) {
  if (event.source !== frame.value?.contentWindow) return;
  const message = event.data?.siteSnippetRun;
  if (typeof message?.kind !== "string") return;
  if (message.kind === "done") running.value = false;
  else if (message.kind === "log" || message.kind === "error") {
    lines.value.push({ kind: message.kind, text: String(message.text) });
  }
}

onMounted(() => {
  restore();
  window.addEventListener("message", onMessage);
});
onBeforeUnmount(() => window.removeEventListener("message", onMessage));

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
      <button
        v-if="snippet.runnable"
        type="button"
        class="code-language-toggle__run"
        :disabled="running"
        @click="run"
      >
        Run
      </button>
    </div>
    <CodeBlock :code="code" :lang="language" :label="label" />
    <iframe
      v-if="runCount > 0"
      :key="runCount"
      ref="frame"
      class="code-language-toggle__frame"
      title="Snippet runner"
      sandbox="allow-scripts"
      :srcdoc="srcdoc"
      hidden
    ></iframe>
    <div
      v-if="runCount > 0"
      class="code-language-toggle__console"
      role="log"
      aria-label="Run output"
      :data-state="running ? 'running' : 'done'"
    >
      <p v-if="running" class="code-language-toggle__status">Running…</p>
      <pre
        v-for="(line, index) in lines"
        :key="index"
        :class="{ 'is-error': line.kind === 'error' }"
        dir="auto"
        >{{ line.text }}</pre>
    </div>
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

.code-language-toggle__choices .code-language-toggle__run {
  margin-inline-start: auto;
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  background: var(--vp-c-brand-1);
  font-weight: 600;
}

.code-language-toggle__choices button:disabled {
  opacity: 0.6;
}

.code-language-toggle__console {
  margin-top: 4px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 8px 12px;
  background: var(--vp-c-bg);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.6;
}

.code-language-toggle__frame {
  display: none !important;
}

.code-language-toggle__console pre {
  margin: 0 !important;
  padding: 0;
  border: 0;
  background: none;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.code-language-toggle__console pre.is-error {
  color: var(--vp-c-danger-1);
}

.code-language-toggle__status {
  margin: 0;
  color: var(--vp-c-text-2);
}

.code-language-toggle__choices button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
</style>
