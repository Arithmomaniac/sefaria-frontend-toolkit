<script setup lang="ts">
import { withBase } from "vitepress";

import posterUrl from "./source-card-poster.svg";

const previewUrl = withBase("/examples/vanilla/index.html?embed=1");
const noscriptHtml = `<style>.landing-preview__frame{display:none}</style><div class="landing-preview__noscript"><img src="${posterUrl}" alt="Preview of a bilingual Micah 6:8 source card with edition attribution"><p>The poster shows the initial supplied-data state. Enable JavaScript to use the interactive source card.</p></div>`;
</script>

<template>
  <section class="landing-preview" aria-labelledby="landing-preview-title">
    <div class="landing-preview__heading">
      <div>
        <p class="landing-preview__eyebrow">Supplied data · zero requests</p>
        <h2 id="landing-preview-title">See the toolkit in action</h2>
        <ul class="landing-preview__proofs" aria-label="Preview qualities">
          <li>Real source card</li>
          <li>Keyboard-selectable</li>
          <li>No API call on entry</li>
        </ul>
      </div>
      <a :href="previewUrl" target="_blank" rel="noreferrer"
        >Open supplied-data preview</a
      >
    </div>
    <div class="landing-preview__stage">
      <img
        class="landing-preview__poster"
        :src="posterUrl"
        alt=""
        aria-hidden="true"
      />
      <iframe
        class="landing-preview__frame"
        title="Interactive supplied-data source card"
        :src="previewUrl"
        loading="eager"
      ></iframe>
      <noscript v-html="noscriptHtml"></noscript>
    </div>
  </section>
</template>
