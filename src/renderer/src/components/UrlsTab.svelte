<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  export let crawledUrls
  export let discoveredUrls
  export let selectedUrl
  export let onSelectUrl
  export let baseUrl = ''

  let activeSubTab = 'crawled'
  let selectedWordlist = ''
  let extensions = ''
  let concurrency = 10
  let isFuzzing = false
  let fuzzResults: any[] = []
  let wordlists: string[] = []
  let totalPaths = 0
  let testedPaths = 0

  onMount(async () => {
    if (window.api?.fuzzer) {
      const response = await window.api.fuzzer.getWordlists()
      if (response.success) {
        wordlists = response.wordlists
        if (wordlists.length > 0) {
          selectedWordlist = wordlists[0]
        }
      }

      window.api.fuzzer.onProgress((result) => {
        fuzzResults = [...fuzzResults, result]
        testedPaths++
      })

      window.api.fuzzer.onComplete(() => {
        isFuzzing = false
      })
    }
  })

  onDestroy(() => {
    if (window.api?.fuzzer) {
      window.api.fuzzer.removeAllListeners()
    }
  })

  async function startFuzzing() {
    if (!baseUrl || !selectedWordlist || isFuzzing) return

    fuzzResults = []
    testedPaths = 0
    isFuzzing = true

    const extArray = extensions
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0)
    
    if (extArray.length === 0) {
      extArray.push('')
    }

    const response = await window.api.fuzzer.startFuzz({
      baseUrl,
      wordlist: selectedWordlist,
      extensions: extArray,
      concurrency
    })

    if (response.success) {
      totalPaths = response.totalPaths
    } else {
      isFuzzing = false
      alert('Failed to start fuzzing: ' + response.error)
    }
  }

  async function stopFuzzing() {
    await window.api.fuzzer.stopFuzz()
    isFuzzing = false
  }

  function getStatusColor(status: number): string {
    if (status >= 200 && status < 300) return 'text-green-400'
    if (status >= 300 && status < 400) return 'text-yellow-400'
    if (status >= 400 && status < 500) return 'text-orange-400'
    if (status >= 500) return 'text-red-400'
    return 'text-gray-500'
  }

  $: validFuzzResults = fuzzResults.filter(r => r.status >= 200 && r.status < 400)
</script>

<div>
  <!-- Sub-tab navigation -->
  <div class="flex border-b border-gray-800 mb-3">
    <button
      on:click={() => activeSubTab = 'crawled'}
      class="px-3 py-2 text-xs {activeSubTab === 'crawled'
        ? 'border-b-2 border-blue-500 text-white'
        : 'text-gray-400 hover:text-white'}"
    >
      Crawled URLs
    </button>
    <button
      on:click={() => activeSubTab = 'fuzzer'}
      class="px-3 py-2 text-xs {activeSubTab === 'fuzzer'
        ? 'border-b-2 border-blue-500 text-white'
        : 'text-gray-400 hover:text-white'}"
    >
      Directory Fuzzer
    </button>
  </div>

  {#if activeSubTab === 'crawled'}
    <!-- Original URLs tab content -->
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
      <div class="mt-6 pt-6 border-t border-gray-800">
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
  {:else if activeSubTab === 'fuzzer'}
    <!-- Directory Fuzzer content -->
    <div class="mb-4">
      <div class="space-y-3">
        <div class="mb-2 text-xs text-gray-400">
          Target: <span class="text-white font-mono">{baseUrl || 'No URL scanned yet'}</span>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1">Wordlist</label>
          <select
            bind:value={selectedWordlist}
            disabled={isFuzzing}
            class="w-full px-3 py-2 text-xs bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-blue-500"
          >
            {#each wordlists as wordlist}
              <option value={wordlist}>{wordlist}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1">
            Extensions (comma-separated, e.g., .php,.html,.txt)
          </label>
          <input
            type="text"
            bind:value={extensions}
            placeholder=".php,.html,.txt or leave empty"
            disabled={isFuzzing}
            class="w-full px-3 py-2 text-xs bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1">
            Concurrency ({concurrency})
          </label>
          <input
            type="range"
            min="1"
            max="50"
            bind:value={concurrency}
            disabled={isFuzzing}
            class="w-full"
          />
        </div>

        <div class="flex gap-2">
          {#if !isFuzzing}
            <button
              on:click={startFuzzing}
              disabled={!baseUrl || !selectedWordlist}
              class="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white transition-colors"
            >
              Start Fuzzing
            </button>
          {:else}
            <button
              on:click={stopFuzzing}
              class="px-4 py-2 text-xs bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              Stop Fuzzing
            </button>
          {/if}
        </div>

        {#if isFuzzing || fuzzResults.length > 0}
          <div class="text-xs text-gray-400">
            Progress: {testedPaths} / {totalPaths} | Found: {validFuzzResults.length}
          </div>
        {/if}
      </div>
    </div>

    {#if fuzzResults.length > 0}
      <div class="mt-6 pt-6 border-t border-gray-800">
        <h2 class="text-sm font-medium text-white mb-3">Results ({validFuzzResults.length})</h2>
        <div class="space-y-1 max-h-96 overflow-y-auto">
          {#each fuzzResults.filter(r => r.status >= 200 && r.status < 400) as result (result.url)}
            <div
              class="p-2 text-xs border border-gray-800 hover:bg-gray-900 cursor-pointer"
              role="button"
              tabindex="0"
              on:click={() => window.open(result.url, '_blank')}
              on:keydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  window.open(result.url, '_blank');
                }
              }}
            >
              <div class="flex justify-between items-center">
                <div class="font-mono break-all text-gray-300">{result.path}</div>
                <div class="flex gap-3 ml-2 flex-shrink-0">
                  <span class="{getStatusColor(result.status)}">{result.status}</span>
                  <span class="text-gray-500">{result.contentLength}B</span>
                  <span class="text-gray-500">{result.responseTime}ms</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>