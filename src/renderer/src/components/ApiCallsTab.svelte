<script lang="ts">
  export let allApiCalls
</script>

<div>
  <div class="flex justify-between items-center mb-3">
    <h2 class="text-sm font-medium text-white">API Calls ({allApiCalls.length})</h2>
  </div>
  <div class="space-y-2">
    {#each allApiCalls as api}
      <div class="border border-gray-700 p-3 hover:bg-gray-900">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-sm text-white break-all">{api.endpoint}</h3>
          <div class="flex gap-2">
            <span class="text-xs font-mono text-green-400">{api.method}</span>
            {#if api.responseStatus}
              <span
                class="text-xs font-mono {api.responseStatus >= 200 && api.responseStatus < 300
                  ? 'text-green-400'
                  : api.responseStatus >= 400
                    ? 'text-red-400'
                    : 'text-yellow-400'}"
              >
                {api.responseStatus}
              </span>
            {/if}
          </div>
        </div>
        <p class="text-gray-400 text-xs">
          Parameters: {api.params}
        </p>
        {#if Object.keys(api.headers).length > 0}
          <details class="mt-2">
            <summary class="text-xs text-gray-400 cursor-pointer hover:text-white">
              Headers ({Object.keys(api.headers).length})
            </summary>
            <div class="mt-1 text-xs text-gray-500 font-mono">
              {#each Object.entries(api.headers) as [key, value]}
                <div>{key}: {value}</div>
              {/each}
            </div>
          </details>
        {/if}
      </div>
    {:else}
      <div class="text-center text-gray-500 py-8">
        <p class="text-sm">No API calls detected</p>
      </div>
    {/each}
  </div>
</div>