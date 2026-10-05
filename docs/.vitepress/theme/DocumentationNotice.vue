<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

import DocumentationDetails from "./DocumentationDetails.vue";

const storageKey = "sefaria-docs:ai-notice-dismissed";
const dismissed = ref(false);
const initialized = ref(false);
const notice = ref<HTMLElement>();
let observer: ResizeObserver | undefined;

function updateHeight() {
  const height =
    !initialized.value || dismissed.value
      ? 0
      : (notice.value?.getBoundingClientRect().height ?? 0);
  document.documentElement.style.setProperty(
    "--documentation-notice-height",
    `${height}px`,
  );
}

function dismiss() {
  dismissed.value = true;
  updateHeight();
  try {
    localStorage.setItem(storageKey, "true");
  } catch (error) {
    console.warn(
      "Could not save documentation notice preference; dismissed for this visit only.",
      error,
    );
  }
}

onMounted(() => {
  try {
    dismissed.value = localStorage.getItem(storageKey) === "true";
  } catch (error) {
    console.warn("Could not read documentation notice preference.", error);
  }
  initialized.value = true;
  observer = new ResizeObserver(updateHeight);
  if (notice.value) observer.observe(notice.value);
  updateHeight();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  document.documentElement.style.removeProperty(
    "--documentation-notice-height",
  );
});
</script>

<template>
  <div class="documentation-notice-slot">
    <span class="documentation-notice-scroll-target" aria-hidden="true"></span>
    <aside
      v-if="!dismissed"
      ref="notice"
      class="documentation-notice"
      :class="{ 'documentation-notice--visible': initialized && !dismissed }"
      aria-label="AI-generated documentation"
    >
      <div class="documentation-notice__message">
        <span>This documentation is AI-generated.</span>
        <DocumentationDetails />
      </div>
      <button
        type="button"
        class="documentation-notice__dismiss"
        aria-label="Dismiss AI documentation notice"
        @click="dismiss"
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path
            d="m4 4 8 8m0-8-8 8"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          />
        </svg>
      </button>
    </aside>
  </div>
</template>
