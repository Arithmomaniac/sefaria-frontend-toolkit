<script setup lang="ts">
export interface ApiEntryField {
  label: string;
  value: string;
  code?: boolean;
}

withDefaults(
  defineProps<{
    id: string;
    name: string;
    fields: readonly ApiEntryField[];
    level?: 3 | 4 | 5;
  }>(),
  { level: 4 },
);
</script>

<template>
  <article class="api-entry">
    <component :is="`h${level}`" :id="id" class="api-entry__name">
      <code>{{ name }}</code>
      <a
        class="header-anchor"
        :href="`#${id}`"
        :aria-label="`Permalink to ${name}`"
      ></a>
    </component>
    <dl class="api-entry__fields">
      <div v-for="field in fields" :key="field.label" class="api-entry__field">
        <dt>{{ field.label }}</dt>
        <dd>
          <code v-if="field.code">{{ field.value }}</code>
          <template v-else>{{ field.value }}</template>
        </dd>
      </div>
    </dl>
    <div class="api-entry__description"><slot /></div>
  </article>
</template>

<style scoped>
.api-entry {
  container-type: inline-size;
  margin: 0;
  padding: 1rem 0;
  border-top: 1px solid var(--vp-c-divider);
}

.api-entry__name {
  margin: 0 0 0.5rem;
  padding: 0;
  border: 0;
  letter-spacing: 0;
  font-size: 1.05rem;
  line-height: 1.5;
}

.api-entry__fields {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 2rem;
  margin: 0 0 0.5rem;
}

.api-entry__field {
  min-width: 0;
}

.api-entry__field dt {
  color: var(--vp-c-text-2);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.api-entry__field dd {
  margin: 0;
  font-size: 0.9rem;
}

.api-entry code {
  overflow-wrap: anywhere;
  word-break: normal;
}

.api-entry__description :deep(p) {
  margin: 0.25rem 0 0;
}

@container (max-width: 560px) {
  .api-entry__fields {
    display: block;
  }

  .api-entry__field + .api-entry__field {
    margin-top: 0.5rem;
  }
}
</style>
