<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { normalizeText } from "../../../packages/text-transform/dist/index.js";
import CodeBlock from "./CodeBlock.vue";

type TabName = "card" | "data" | "text";

const activeTab = ref<TabName>("card");
const data = ref<unknown>();
interface CleanedBlock {
  readonly label: string;
  readonly code: string;
}

const cleanedBlocks = ref<CleanedBlock[]>([]);
const languageNames: Record<string, string> = { he: "Hebrew", en: "English" };
const loadError = ref("");
const tabs: readonly { id: TabName; label: string }[] = [
  { id: "card", label: "Live Source Card" },
  { id: "data", label: "Checked client data" },
  { id: "text", label: "Cleaned text" },
];

const formattedData = computed(() =>
  data.value === undefined ? "" : JSON.stringify(data.value, null, 2),
);

function flatten(text: unknown): string {
  return Array.isArray(text) ? text.map(flatten).join(" ") : String(text);
}

onMounted(async () => {
  try {
    await import("../../../packages/web-components/dist/source-card-element.js");
    const response = await fetch(
      "https://www.sefaria.org/api/v3/texts/Micah%206%3A8?return_format=default&version=primary&version=translation",
    );
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(`Sefaria returned HTTP ${response.status}.`);
    }
    data.value = payload;
    const versions: { language?: unknown; text?: unknown }[] = Array.isArray(
      payload?.versions,
    )
      ? payload.versions
      : [];
    cleanedBlocks.value = versions.flatMap((version) => {
      if (version.text === undefined) return [];
      const language =
        languageNames[String(version.language)] ?? String(version.language);
      const result = normalizeText(flatten(version.text));
      return [
        { label: `${language} · text`, code: result.bodyHtml },
        ...result.notes.map((note, index) => ({
          label: `${language} · footnote ${index + 1}`,
          code: note.contentHtml ?? "",
        })),
      ];
    });
  } catch (error) {
    loadError.value =
      error instanceof Error ? error.message : "Could not reach Sefaria.";
  }
});
</script>

<template>
  <section class="hero-example" aria-labelledby="hero-example-title">
    <div class="hero-example__heading">
      <p class="hero-example__eyebrow">One source, three views</p>
      <h2 id="hero-example-title">Micah 6:8, loaded live from Sefaria</h2>
      <p>
        The same verse as a Source Card, as checked data, and as cleaned text.
        The card below is this one tag:
        <code>&lt;sefaria-source-card sref="Micah 6:8"&gt;</code>
      </p>
    </div>
    <div class="hero-example__tabs" role="tablist" aria-label="Micah 6:8 views">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :id="`hero-tab-${tab.id}`"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`hero-panel-${tab.id}`"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>
    <div
      id="hero-panel-card"
      class="hero-example__panel"
      role="tabpanel"
      aria-labelledby="hero-tab-card"
      :hidden="activeTab !== 'card'"
    >
      <sefaria-source-card sref="Micah 6:8"></sefaria-source-card>
      <p class="hero-example__fallback">
        If Sefaria can't be reached, the card shows its own error message.
      </p>
    </div>
    <div
      id="hero-panel-data"
      class="hero-example__panel"
      role="tabpanel"
      aria-labelledby="hero-tab-data"
      :hidden="activeTab !== 'data'"
    >
      <p v-if="loadError" role="alert">
        Couldn't load the data: {{ loadError }}
      </p>
      <p v-else-if="data === undefined">Loading the data for Micah 6:8…</p>
      <CodeBlock v-else :code="formattedData" lang="json" />
    </div>
    <div
      id="hero-panel-text"
      class="hero-example__panel"
      role="tabpanel"
      aria-labelledby="hero-tab-text"
      :hidden="activeTab !== 'text'"
    >
      <p v-if="loadError" role="alert">
        Couldn't clean the text because the data didn't load: {{ loadError }}
      </p>
      <div v-else-if="cleanedBlocks.length" class="hero-example__cleaned">
        <CodeBlock
          v-for="block in cleanedBlocks"
          :key="block.label"
          :code="block.code"
          lang="html"
          :label="block.label"
          pretty-breaks
        />
      </div>
      <p v-else>Loading the cleaned text…</p>
    </div>
  </section>
</template>
