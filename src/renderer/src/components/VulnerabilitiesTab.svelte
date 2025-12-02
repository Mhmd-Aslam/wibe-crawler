<script lang="ts">
  export let vulnerabilities
  export let onAddToReport

  function getSeverityColor(severity) {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-950'
      case 'high':
        return 'border-orange-500 bg-orange-950'
      case 'medium':
        return 'border-yellow-500 bg-yellow-950'
      case 'low':
        return 'border-blue-500 bg-blue-950'
      default:
        return 'border-gray-500 bg-gray-950'
    }
  }

  function getSeverityTextColor(severity) {
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

<div>
  <div class="flex justify-between items-center mb-3">
    <h2 class="text-sm font-medium text-white">Vulnerabilities ({vulnerabilities.length})</h2>
    <div class="text-xs text-gray-400 font-mono">
      Grid View
    </div>
  </div>

  <div class="grid grid-cols-6 gap-2">
    {#each vulnerabilities as vuln}
      <div
        class="border p-3 hover:opacity-80 transition-opacity {getSeverityColor(vuln.severity)}"
      >
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-sm text-white">{vuln.name}</h3>
          <span
            class="text-xs font-mono uppercase px-1.5 py-0.5 rounded {getSeverityTextColor(
              vuln.severity
            )} bg-black bg-opacity-30"
          >
            {vuln.severity}
          </span>
        </div>
        <p class="text-gray-400 text-xs mb-2">{vuln.description}</p>
        <button
          on:click={() => onAddToReport(vuln)}
          class="text-xs text-blue-400 hover:text-blue-300"
        >
          Add to Report
        </button>
      </div>
    {/each}
  </div>
</div>