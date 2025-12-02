<script lang="ts">
  export let allAssets: Record<string, string[]> = {}

  const order = ['images', 'pdfs', 'scripts', 'styles', 'media', 'documents']

  $: categories = order.filter((k) => (allAssets[k] || []).length > 0)
  $: dataCategories = Object.keys(allAssets).filter((k) => (allAssets[k] || []).length > 0)
  let activeCat: 'all' | 'images' | 'pdfs' | 'scripts' | 'styles' | 'media' | 'documents' = 'all'
  let searchQuery = ''

  function getUrlParts(u: string): { host: string; path: string; file: string; full: string } {
    try {
      const url = new URL(u)
      const path = url.pathname || ''
      const file = path.split('/').filter(Boolean).pop() || ''
      return { host: url.hostname || '', path, file, full: u }
    } catch (e) {
      // Fallback parsing for non-standard URLs
      const hostMatch = u.match(/^https?:\/\/([^\/]+)/i)
      const host = hostMatch ? hostMatch[1] : ''
      const path = u.replace(/^https?:\/\/[^\/]+/i, '')
      const parts = u.split('/')
      const file = (parts[parts.length - 1] || '').trim()
      return { host, path, file, full: u }
    }
  }

  function matches(u: string, q: string): boolean {
    if (!q) return true
    const { host, path, file, full } = getUrlParts(u)
    const L = (s: string) => (s || '').toLowerCase()
    const qq = q.toLowerCase()
    return (
      L(full).includes(qq) ||
      L(host).includes(qq) ||
      L(path).includes(qq) ||
      L(file).includes(qq)
    )
  }

  $: q = (searchQuery || '').toLowerCase().trim()
  $: filteredByCat = Object.fromEntries(
    order.map((cat) => [
      cat,
      (allAssets[cat] || []).filter((u) => matches(u, q))
    ])
  ) as Record<string, string[]>
  // For the All tab, we should not sort categories; use data-provided order
  $: visibleCategories = (q
    ? dataCategories.filter((k) => (filteredByCat[k] || []).length > 0)
    : dataCategories)
  // Flattened arrays for All tab display (no category headers), preserve data order
  $: allFlat = dataCategories.flatMap((k) => allAssets[k] || [])
  $: filteredFlat = dataCategories.flatMap((k) => filteredByCat[k] || [])
</script>

<div>
  <div class="flex justify-between items-center mb-3">
    <h2 class="text-sm font-medium text-white">Assets</h2>
    <div class="relative">
      <input
        type="text"
        placeholder="Search by file name..."
        class="bg-gray-900 border border-gray-800 text-xs px-3 py-1.5 rounded outline-none focus:border-blue-500 placeholder-gray-500"
        bind:value={searchQuery}
      />
    </div>
  </div>

  {#if (q ? visibleCategories.length > 0 : categories.length > 0)}
    <!-- Category Tabs -->
    <div class="flex border-b border-gray-800 mb-3">
      <button
        on:click={() => (activeCat = 'all')}
        class="px-3 py-1.5 text-xs {activeCat === 'all'
          ? 'border-b-2 border-blue-500 text-white'
          : 'text-gray-400 hover:text-white'}"
      >
        All
      </button>
      {#each order as catName}
        {#if (q ? (filteredByCat[catName] || []).length > 0 : (allAssets[catName] || []).length > 0)}
          <button
            on:click={() => (activeCat = catName as any)}
            class="px-3 py-1.5 text-xs {activeCat === catName
              ? 'border-b-2 border-blue-500 text-white'
              : 'text-gray-400 hover:text-white'}"
          >
            {catName}
            <span class="ml-1 text-gray-500">({(q ? filteredByCat[catName] : allAssets[catName]).length})</span>
          </button>
        {/if}
      {/each}
    </div>

    <!-- Assets List -->
    {#if activeCat === 'all'}
      {#if (q ? filteredFlat.length === 0 : allFlat.length === 0)}
        <div class="text-center text-gray-500 py-8">
          <p class="text-sm">No assets match your search</p>
        </div>
      {:else}
        <div class="space-y-1 mt-2">
          {#each (q ? filteredFlat : allFlat) as url (url)}
            <div
              class="w-full text-left p-2 text-xs border border-gray-800 hover:bg-gray-900 cursor-pointer"
              role="button"
              tabindex="0"
              on:click={() => window.open(url, '_blank')}
              on:keydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  window.open(url, '_blank')
                }
              }}
            >
              <div class="font-mono break-all text-gray-300">{url}</div>
            </div>
          {/each}
        </div>
      {/if}
    {:else}
      {#if (q ? (filteredByCat[activeCat] || []).length === 0 : (allAssets[activeCat] || []).length === 0)}
        <div class="text-center text-gray-500 py-8">
          <p class="text-sm">No assets match your search</p>
        </div>
      {:else}
        <div class="space-y-1 mt-2">
          {#each (q ? filteredByCat[activeCat] : allAssets[activeCat]) as url (url)}
            <div
              class="w-full text-left p-2 text-xs border border-gray-800 hover:bg-gray-900 cursor-pointer"
              role="button"
              tabindex="0"
              on:click={() => window.open(url, '_blank')}
              on:keydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  window.open(url, '_blank')
                }
              }}
            >
              <div class="font-mono break-all text-gray-300">{url}</div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  {:else}
    <div class="text-center text-gray-500 py-8">
      <p class="text-sm">No assets detected</p>
    </div>
  {/if}
</div>
