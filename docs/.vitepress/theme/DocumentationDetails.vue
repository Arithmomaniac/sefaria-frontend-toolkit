<script setup lang="ts">
import { onBeforeUnmount, ref, useId } from "vue";

const id = useId();
const dialog = ref<HTMLDialogElement>();
const trigger = ref<HTMLButtonElement>();
const closeButton = ref<HTMLButtonElement>();
const lastButton = ref<HTMLButtonElement>();

function open() {
  dialog.value?.showModal();
  closeButton.value?.focus();
}

function returnFocus() {
  if (trigger.value?.isConnected) trigger.value.focus({ preventScroll: true });
}

function containFocus(event: KeyboardEvent) {
  if (event.key !== "Tab") return;
  if (event.shiftKey && document.activeElement === closeButton.value) {
    event.preventDefault();
    lastButton.value?.focus();
  } else if (!event.shiftKey && document.activeElement === lastButton.value) {
    event.preventDefault();
    closeButton.value?.focus();
  }
}

onBeforeUnmount(() => dialog.value?.close());
</script>

<template>
  <button
    ref="trigger"
    type="button"
    class="documentation-details__trigger"
    aria-haspopup="dialog"
    :aria-controls="id"
    @click="open"
  >
    Learn more
  </button>
  <dialog
    :id="id"
    ref="dialog"
    class="documentation-details__dialog"
    :aria-labelledby="`${id}-title`"
    @close="returnFocus"
    @keydown="containFocus"
  >
    <header class="documentation-details__header">
      <h2 :id="`${id}-title`">About this documentation</h2>
      <button
        ref="closeButton"
        type="button"
        class="documentation-details__close"
        aria-label="Close documentation details"
        @click="dialog?.close()"
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
    </header>
    <div class="documentation-details__content">
      <p>
        Like the codebase, this documentation was scaffolded and written with
        GitHub Copilot. I don't have a background in technical writing, and
        wanted to get something out there.
      </p>
      <p>
        Pages that have not undergone <i>any</i> human review are explicitly
        marked, but the others may also read funny or need work too. Sorry about
        that.
      </p>
      <p>Please report any issues so they can be prioritized.</p>
      <p>Thanks, Avi</p>
    </div>
    <div class="documentation-details__actions">
      <button ref="lastButton" type="button" @click="dialog?.close()">
        Close
      </button>
    </div>
  </dialog>
</template>
