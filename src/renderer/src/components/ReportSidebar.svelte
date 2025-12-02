<script lang="ts">
  export let reportItems
  export let onRemoveFromReport
  export let onExportReport

  function getSeverityColor(severity) {
    switch (severity) {
      case 'critical':
        return 'text-red-400'
      case 'high':
        return 'text-orange-400'
      case 'medium':
        return 'text-yellow-400'
      case 'low':
        return 'text-blue-400'
      default:
        return 'text-gray-400'
    }
  }
</script>

<div class="w-64 border-l border-gray-800 p-3 overflow-y-auto">
  <div class="flex justify-between items-center mb-2">
    <h2 class="text-xs font-medium text-gray-400 uppercase tracking-wide">
      Report ({reportItems.length})
    </h2>
    <button
      on:click={onExportReport}
      class="text-xs text-blue-400 hover:text-blue-300"
    >
      Export
    </button>
  </div>

  <div class="space-y-2">
    {#each reportItems as item}
      <div class="border-l-2 border-gray-700 pl-2 py-1">
        <div class="flex justify-between items-start">
          <h4 class="text-sm text-white">{item.name}</h4>
          <button
            on:click={() => onRemoveFromReport(item.id)}
            class="text-gray-400 hover:text-red-400 text-xs"
          >
            ✕
          </button>
        </div>
        <span
          class="text-xs font-mono uppercase {getSeverityColor(item.severity)}"
        >
          {item.severity}
        </span>
        <p class="text-gray-400 text-xs mt-1">{item.description}</p>
      </div>
    {/each}
  </div>
</div>