<script lang="ts">
  export let crawledUrls
  export let discoveredUrls
  export let selectedUrl
  export let onSelectUrl
</script>

<div>
  <div class="flex justify-between items-center mb-3">
    <h2 class="text-sm font-medium text-white">Crawled URLs ({crawledUrls.length})</h2>
  </div>
  <div class="space-y-1 mb-4">
    {#each crawledUrls as url (url)}
      <button
        on:click={() => {
          onSelectUrl(url);
          window.open(url, '_blank');
        }}
        class="w-full text-left p-2 text-xs border border-gray-800 hover:bg-gray-900 transition-colors {selectedUrl ===
        url
          ? 'bg-gray-900 border-blue-500'
          : ''}"
      >
        <div class="font-mono break-all text-gray-300">{url}</div>
      </button>
    {/each}
  </div>

  {#if discoveredUrls.length > 0}
    <div
      class="mt-6 pt-6 border-t border-gray-800"
    >
      <h2 class="text-sm font-medium text-white">Discovered URLs</h2>
      <span class="text-xs text-gray-500">(not yet crawled)</span>
    </div>
    <div class="space-y-1">
      {#each discoveredUrls as url (url)}
        <div
          class="w-full text-left p-2 text-xs border border-gray-800 opacity-60 hover:bg-gray-900 cursor-pointer"
          role="button"
          tabindex="0"
          on:click={() => window.open(url, '_blank')}
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              window.open(url, '_blank');
            }
          }}
        >
          <div class="font-mono break-all text-gray-500">{url}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>