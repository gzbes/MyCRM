<template>
  <t-space :size="4">
    <t-tag
      v-for="s in allStatuses"
      :key="s"
      :theme="s === currentStatus ? (statusThemeMap[s] || 'default') : 'default'"
      :variant="s === currentStatus ? 'light' : 'outline'"
    >
      {{ s }}
    </t-tag>
  </t-space>
</template>

<script setup lang="ts">
defineProps<{
  allStatuses: string[]
  currentStatus: string
  statusThemeMap: Record<string, string>
}>()
</script>
