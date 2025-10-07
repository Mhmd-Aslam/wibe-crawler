
<script lang="ts">
  import TitleBar from './components/TitleBar.svelte'
  import { onMount, onDestroy } from 'svelte'
  
  let selectedUrl = ''
  let isScanning = false
  let showResults = false
  let showVulnerabilities = false
  let selectedCrawledUrl = ''
  let crawledUrls: string[] = []
  let crawlStatus = ''
  
  const vulnerabilities = [
    { id: 1, name: 'SQL Injection', severity: 'critical', description: 'Login form parameter vulnerable to SQL injection', size: 'large' },
    { id: 2, name: 'XSS', severity: 'high', description: 'Reflected XSS in search parameter', size: 'medium' },
    { id: 3, name: 'CSRF', severity: 'medium', description: 'Missing CSRF protection', size: 'medium' },
    { id: 4, name: 'Weak Encryption', severity: 'low', description: 'MD5 hash detected', size: 'small' },
    { id: 5, name: 'Open Redirect', severity: 'medium', description: 'Unvalidated redirect parameter', size: 'small' },
    { id: 6, name: 'Info Disclosure', severity: 'low', description: 'Server version exposed', size: 'small' },
    { id: 7, name: 'Clickjacking', severity: 'low', description: 'Missing X-Frame-Options', size: 'small' },
    { id: 8, name: 'Path Traversal', severity: 'high', description: 'Directory traversal in upload', size: 'medium' }
  ]
  
  let reportItems = []
  
  // Statistics
  $: stats = {
    totalUrls: crawledUrls.length,
    critical: vulnerabilities.filter(v => v.severity === 'critical').length,
    high: vulnerabilities.filter(v => v.severity === 'high').length,
    medium: vulnerabilities.filter(v => v.severity === 'medium').length,
    low: vulnerabilities.filter(v => v.severity === 'low').length
  }

  onMount(() => {
    if (window.api?.crawler) {
      window.api.crawler.onProgress((data) => {
        crawlStatus = `Crawling: ${data.currentUrl}`
        crawledUrls = data.results.map((r: any) => r.url)
        showResults = true
      })

      window.api.crawler.onComplete((data) => {
        crawlStatus = 'Crawl complete'
        crawledUrls = data.results.map((r: any) => r.url)
        isScanning = false
        showResults = true
      })

      window.api.crawler.onError((data) => {
        crawlStatus = `Error: ${data.error}`
        isScanning = false
      })
    }
  })

  onDestroy(() => {
    if (window.api?.crawler) {
      window.api.crawler.removeAllListeners()
    }
  })
  
  async function startScan() {
    if (!selectedUrl) return
    
    isScanning = true
    crawlStatus = 'Starting crawl...'
    crawledUrls = []
    showResults = false
    showVulnerabilities = false
    
    try {
      await window.api.crawler.startCrawl(selectedUrl)
    } catch (error) {
      crawlStatus = `Error: ${error}`
      isScanning = false
    }
  }
  
  function selectUrl(url) {
    selectedCrawledUrl = url
    showVulnerabilities = true
  }
  
  function addToReport(vuln) {
    if (!reportItems.find(item => item.id === vuln.id)) {
      reportItems = [...reportItems, vuln]
    }
  }
  
  function removeFromReport(id) {
    reportItems = reportItems.filter(item => item.id !== id)
  }
  
  function exportReport() {
    alert('Report exported!')
  }
</script>

<div class="flex flex-col bg-black w-screen h-screen text-white text-sm">
  <TitleBar />
  
  <!-- Header Section -->
  <div class="p-4 border-b border-gray-800">
    <div class="flex items-center justify-between mb-3">
      <h1 class="text-base font-medium">Wibe Crawler</h1>
      {#if showResults}
        <div class="flex gap-4 text-xs text-gray-400">
          <span>URLs: {stats.totalUrls}</span>
          <span class="text-red-400">Critical: {stats.critical}</span>
          <span class="text-orange-400">High: {stats.high}</span>
          <span class="text-yellow-400">Medium: {stats.medium}</span>
          <span class="text-blue-400">Low: {stats.low}</span>
        </div>
      {/if}
    </div>
    {#if isScanning && crawlStatus}
      <div class="mb-2 text-xs text-gray-400">{crawlStatus}</div>
    {/if}
    <div class="flex gap-2">
      <input 
        bind:value={selectedUrl}
        placeholder="https://example.com" 
        class="flex-1 bg-transparent border border-gray-700 p-2 px-3 text-xs outline-none focus:border-gray-500"
      />
      <button 
        on:click={startScan}
        disabled={isScanning || !selectedUrl}
        class="border border-gray-700 hover:border-gray-500 disabled:border-gray-800 disabled:text-gray-600 px-4 py-2 text-xs"
      >
        {isScanning ? 'Scanning...' : 'Scan'}
      </button>
    </div>
  </div>
  
  <div class="flex-1 flex overflow-hidden">
    <!-- Left Panel - Crawled URLs -->
    {#if showResults}
    <div class="w-64 border-r border-gray-800 p-3 overflow-y-auto">
      <h2 class="text-xs font-medium mb-2 text-gray-400 uppercase tracking-wide">Crawled URLs ({crawledUrls.length})</h2>
      <div class="space-y-1">
        {#each crawledUrls as url}
          <button
            on:click={() => selectUrl(url)}
            class="w-full text-left p-2 text-xs hover:bg-gray-900 {selectedCrawledUrl === url ? 'text-white border-l-2 border-white pl-2' : 'text-gray-400'}"
          >
            <div class="font-mono break-all">{url}</div>
          </button>
        {/each}
      </div>
    </div>
    {/if}
    
    <!-- Main Content Area -->
    <div class="flex-1 p-3 overflow-y-auto">
      {#if !showResults}
        <div class="flex items-center justify-center h-full text-gray-500">
          <div class="text-center">
            <p class="text-sm">Enter a URL to start scanning</p>
          </div>
        </div>
      {:else if !showVulnerabilities}
        <div class="flex items-center justify-center h-full text-gray-500">
          <div class="text-center">
            <p class="text-sm">Select a crawled URL to view vulnerabilities</p>
          </div>
        </div>
      {:else}
        <div>
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-sm font-medium text-white">Vulnerabilities Found</h2>
            <div class="text-xs text-gray-400 font-mono">{selectedCrawledUrl}</div>
          </div>
          
          <!-- Minimal Grid -->
          <div class="grid grid-cols-6 gap-2">
            {#each vulnerabilities as vuln}
              <div class="
                {vuln.size === 'large' ? 'col-span-4' : ''}
                {vuln.size === 'medium' ? 'col-span-3' : ''}
                {vuln.size === 'small' ? 'col-span-2' : ''}
                border
                {vuln.severity === 'critical' ? 'border-red-500' : ''}
                {vuln.severity === 'high' ? 'border-orange-500' : ''}
                {vuln.severity === 'medium' ? 'border-yellow-500' : ''}
                {vuln.severity === 'low' ? 'border-blue-500' : ''}
                p-3 hover:bg-gray-900
              ">
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-medium text-sm text-white">{vuln.name}</h3>
                  <span class="
                    text-xs font-mono
                    {vuln.severity === 'critical' ? 'text-red-400' : ''}
                    {vuln.severity === 'high' ? 'text-orange-400' : ''}
                    {vuln.severity === 'medium' ? 'text-yellow-400' : ''}
                    {vuln.severity === 'low' ? 'text-blue-400' : ''}
                  ">
                    {vuln.severity}
                  </span>
                </div>
                <p class="text-gray-400 text-xs mb-2">{vuln.description}</p>
                <button
                  on:click={() => addToReport(vuln)}
                  class="text-xs text-gray-400 hover:text-white border-b border-gray-700 hover:border-gray-400"
                >
                  Add to Report
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
    
    <!-- Right Panel - Report -->
    {#if reportItems.length > 0}
    <div class="w-64 border-l border-gray-800 p-3 overflow-y-auto">
      <div class="flex justify-between items-center mb-2">
        <h2 class="text-xs font-medium text-gray-400 uppercase tracking-wide">Report ({reportItems.length})</h2>
        <button
          on:click={exportReport}
          class="text-xs text-gray-400 hover:text-white border-b border-gray-700 hover:border-gray-400"
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
                on:click={() => removeFromReport(item.id)}
                class="text-xs text-gray-500 hover:text-red-400"
              >
                ×
              </button>
            </div>
            <span class="
              text-xs font-mono
              {item.severity === 'critical' ? 'text-red-400' : ''}
              {item.severity === 'high' ? 'text-orange-400' : ''}
              {item.severity === 'medium' ? 'text-yellow-400' : ''}
              {item.severity === 'low' ? 'text-blue-400' : ''}
            ">
              {item.severity}
            </span>
            <p class="text-gray-400 text-xs mt-1">{item.description}</p>
          </div>
        {/each}
      </div>
    </div>
    {/if}
  </div>
</div>