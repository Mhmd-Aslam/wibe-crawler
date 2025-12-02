<script lang="ts">
  export let allForms
  export let onSelectForm
</script>

<div>
  <div class="flex justify-between items-center mb-3">
    <h2 class="text-sm font-medium text-white">Forms ({allForms.length})</h2>
  </div>
  <div class="space-y-2">
    {#each allForms as form}
      <div class="border border-gray-700 p-3 hover:bg-gray-900">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-sm text-white">
            {form.action || 'No action'}
          </h3>
          <button
            on:click={() => onSelectForm(form)}
            class="text-xs text-blue-400 hover:text-blue-300"
          >
            Test Form
          </button>
        </div>
        <p class="text-gray-400 text-xs mb-1">Method: {form.method.toUpperCase()}</p>
        <p class="text-gray-400 text-xs mb-1">Fields: {form.fields.length}</p>
        <p class="text-gray-400 text-xs">
          From: {form.url}
        </p>
      </div>
    {:else}
      <div class="text-center text-gray-500 py-8">
        <p class="text-sm">No forms found</p>
      </div>
    {/each}
  </div>
</div>