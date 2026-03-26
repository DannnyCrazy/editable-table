<template>
  <div class="custom-header">
    <template v-if="editing">
      <input
        ref="inputRef"
        v-model="editValue"
        class="header-input"
        @blur="commitRename"
        @keydown.enter="commitRename"
        @keydown.esc="cancelRename"
      />
    </template>
    <template v-else>
      <span class="header-label" @dblclick="startEdit">{{ params.displayName }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { IHeaderParams } from 'ag-grid-community'

// ag-grid passes all header params (including custom headerComponentParams) as a single `params` prop
const props = defineProps<{
  params: IHeaderParams & { onRename?: (oldName: string, newName: string) => void }
}>()

const editing = ref(false)
const editValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function startEdit() {
  editValue.value = props.params.displayName
  editing.value = true
  nextTick(() => {
    inputRef.value?.select()
  })
}

function commitRename() {
  if (!editing.value) return
  editing.value = false
  const newName = editValue.value.trim()
  if (newName && newName !== props.params.displayName && props.params.onRename) {
    props.params.onRename(props.params.displayName, newName)
  }
}

function cancelRename() {
  editing.value = false
}
</script>

<style scoped>
.custom-header {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
}

.header-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: default;
  user-select: none;
}

.header-input {
  flex: 1;
  border: 1px solid #1565c0;
  padding: 0 4px;
  font-size: inherit;
  font-family: inherit;
  height: 24px;
  outline: none;
  background: #fff;
  color: #000;
  border-radius: 2px;
}
</style>
