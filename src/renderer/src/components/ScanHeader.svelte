<script lang="ts">
  export let isScanning
  export let showResults
  export let crawlStatus
  export let totalUrls
  export let critical
  export let high
  export let medium
  export let low
  export let onStartScan
  export let onStopScan

  let selectedUrl = 'https://'
  let mirrorEl
  let showUrlHint

  $: prefixWidth = mirrorEl ? mirrorEl.offsetWidth : 0
  $: showUrlHint = selectedUrl === 'https://'

  function onUrlKeydown(e) {
    if (e.key === 'Enter' && selectedUrl && !isScanning) {
      e.preventDefault()
      onStartScan(selectedUrl)
    }
  }

  function handleStartScan() {
    if (selectedUrl && !isScanning) {
      onStartScan(selectedUrl)
    }
  }
</script>

<div class="p-4 border-b border-gray-800">
  <div class="flex items-center justify-between mb-3">
    <h1 class="text-base font-medium">Wibe Crawler</h1>
    {#if showResults}
      <div class="flex gap-4 text-xs text-gray-400">
        <span>URLs: {totalUrls}</span>
        <span class="text-red-400">Critical: {critical}</span>
        <span class="text-orange-400">High: {high}</span>
        <span class="text-yellow-400">Medium: {medium}</span>
        <span class="text-blue-400">Low: {low}</span>
      </div>
    {/if}
  </div>
  {#if isScanning && crawlStatus}
    <div class="mb-2 text-xs text-gray-400">{crawlStatus}</div>
  {/if}
  <div class="flex gap-2">
    <div class="relative flex-1">
      <span
        bind:this={mirrorEl}
        class="invisible absolute top-0 left-3 text-xs whitespace-pre"
      >{selectedUrl}</span>
      <input 
        bind:value={selectedUrl}
        placeholder="https://example.com" 
        class="w-full bg-transparent border border-gray-700 p-2 px-3 text-xs outline-none focus:border-gray-500"
        on:keydown={onUrlKeydown}
      />
      {#if showUrlHint}
        <span
          class="absolute top-1/2 -translate-y-1/2 text-xs text-gray-600 pointer-events-none"
          style={`left: ${prefixWidth + 12}px;`}
        >example.com</span>
      {/if}
    </div>
    <button 
      on:click={handleStartScan}
      disabled={isScanning || !selectedUrl}
      class="border border-gray-700 hover:border-gray-500 disabled:border-gray-800 disabled:text-gray-600 px-4 py-2 text-xs"
    >
      {isScanning ? 'Scanning...' : 'Scan'}
    </button>
    {#if isScanning}
      <button
        on:click={onStopScan}
        class="border border-red-700 text-red-300 hover:border-red-500 hover:text-red-200 px-4 py-2 text-xs"
      >
        Stop
      </button>
    {/if}
  </div>
</div>