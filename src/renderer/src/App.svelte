
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
  let activeTargetTab = 'urls'
  let discoveredDomains: string[] = []
  
  // Placeholder data for possible targets
  const possibleTargets = {
    forms: [
      { id: 1, type: 'Login Form', url: '/login', method: 'POST', fields: 'username, password' },
      { id: 2, type: 'Contact Form', url: '/contact', method: 'POST', fields: 'name, email, message' },
      { id: 3, type: 'Search Form', url: '/search', method: 'GET', fields: 'query' },
      { id: 4, type: 'Registration Form', url: '/register', method: 'POST', fields: 'email, password, confirm_password' }
    ],
    apiCalls: [
      { id: 1, endpoint: '/api/users', method: 'GET', params: 'id, limit' },
      { id: 2, endpoint: '/api/auth/login', method: 'POST', params: 'username, password' },
      { id: 3, endpoint: '/api/data/search', method: 'GET', params: 'q, filter' },
      { id: 4, endpoint: '/api/upload', method: 'POST', params: 'file, metadata' }
    ],
    cookies: [
      { id: 1, name: 'session_id', value: 'abc123...', secure: false, httpOnly: true },
      { id: 2, name: 'csrf_token', value: 'xyz789...', secure: true, httpOnly: false },
      { id: 3, name: 'user_pref', value: 'theme=dark', secure: false, httpOnly: false },
      { id: 4, name: 'analytics', value: 'tracking_id', secure: true, httpOnly: false }
    ]
  }
  
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
        discoveredDomains = data.domains || []
        showResults = true
      })

      window.api.crawler.onComplete((data) => {
        crawlStatus = 'Crawl complete'
        crawledUrls = data.results.map((r: any) => r.url)
        discoveredDomains = data.domains || []
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
    discoveredDomains = []
    showResults = true
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
    <!-- Main Content Area -->
    <div class="flex-1 p-3 overflow-y-auto">
      {#if !showResults}
        <div class="flex items-center justify-center h-full text-gray-500">
          <div class="text-center">
            <p class="text-sm">Enter a URL to start scanning</p>
          </div>
        </div>
      {:else}
        <div class="h-full flex flex-col">
          <!-- Tab Headers -->
          <div class="flex border-b border-gray-800 mb-4">
            <button
              on:click={() => activeTargetTab = 'urls'}
              class="px-4 py-2 text-xs {activeTargetTab === 'urls' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-300'}"
            >
              URLs ({crawledUrls.length})
            </button>
            <button
              on:click={() => activeTargetTab = 'domains'}
              class="px-4 py-2 text-xs {activeTargetTab === 'domains' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-300'}"
            >
              Domains ({discoveredDomains.length})
            </button>
            <button
              on:click={() => activeTargetTab = 'vulnerabilities'}
              class="px-4 py-2 text-xs {activeTargetTab === 'vulnerabilities' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-300'}"
            >
              Vulnerabilities
            </button>
            <button
              on:click={() => activeTargetTab = 'forms'}
              class="px-4 py-2 text-xs {activeTargetTab === 'forms' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-300'}"
            >
              Forms
            </button>
            <button
              on:click={() => activeTargetTab = 'apiCalls'}
              class="px-4 py-2 text-xs {activeTargetTab === 'apiCalls' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-300'}"
            >
              API Calls
            </button>
            <button
              on:click={() => activeTargetTab = 'cookies'}
              class="px-4 py-2 text-xs {activeTargetTab === 'cookies' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-gray-300'}"
            >
              Cookies
            </button>
          </div>

          <div class="flex-1 overflow-y-auto">
            {#if activeTargetTab === 'urls'}
              <div class="flex justify-between items-center mb-3">
                <h2 class="text-sm font-medium text-white">Crawled URLs</h2>
              </div>
              <div class="space-y-1">
                {#each crawledUrls as url}
                  <button
                    on:click={() => selectUrl(url)}
                    class="w-full text-left p-2 text-xs hover:bg-gray-900 border border-gray-800 hover:border-gray-600"
                  >
                    <div class="font-mono break-all text-gray-300">{url}</div>
                  </button>
                {/each}
              </div>
            {:else if activeTargetTab === 'domains'}
              <div class="flex justify-between items-center mb-3">
                <h2 class="text-sm font-medium text-white">Discovered Domains</h2>
              </div>
              <div class="space-y-1">
                {#each discoveredDomains as domain}
                  <div class="border border-gray-700 p-3 hover:bg-gray-900">
                    <div class="flex justify-between items-start mb-2">
                      <h3 class="font-medium text-sm text-white">{domain}</h3>
                      <span class="text-xs font-mono text-green-400">active</span>
                    </div>
                  </div>
                {/each}
              </div>
            {:else if activeTargetTab === 'vulnerabilities'}
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
        {:else if activeTargetTab === 'forms'}
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-sm font-medium text-white">Forms Found</h2>
            <div class="text-xs text-gray-400 font-mono">{selectedCrawledUrl}</div>
          </div>
          <div class="space-y-2">
            {#each possibleTargets.forms as form}
              <div class="border border-gray-700 p-3 hover:bg-gray-900">
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-medium text-sm text-white">{form.type}</h3>
                  <span class="text-xs font-mono text-blue-400">{form.method}</span>
                </div>
                <p class="text-gray-400 text-xs mb-1">URL: {form.url}</p>
                <p class="text-gray-400 text-xs">Fields: {form.fields}</p>
              </div>
            {/each}
          </div>
        {:else if activeTargetTab === 'apiCalls'}
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-sm font-medium text-white">API Calls Found</h2>
            <div class="text-xs text-gray-400 font-mono">{selectedCrawledUrl}</div>
          </div>
          <div class="space-y-2">
            {#each possibleTargets.apiCalls as api}
              <div class="border border-gray-700 p-3 hover:bg-gray-900">
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-medium text-sm text-white">{api.endpoint}</h3>
                  <span class="text-xs font-mono text-green-400">{api.method}</span>
                </div>
                <p class="text-gray-400 text-xs">Parameters: {api.params}</p>
              </div>
            {/each}
          </div>

        {:else if activeTargetTab === 'cookies'}
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-sm font-medium text-white">Cookies Found</h2>
            <div class="text-xs text-gray-400 font-mono">{selectedCrawledUrl}</div>
          </div>
          <div class="space-y-2">
            {#each possibleTargets.cookies as cookie}
              <div class="border border-gray-700 p-3 hover:bg-gray-900">
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-medium text-sm text-white">{cookie.name}</h3>
                  <div class="flex gap-2">
                    {#if cookie.secure}
                      <span class="text-xs font-mono text-green-400">SECURE</span>
                    {/if}
                    {#if cookie.httpOnly}
                      <span class="text-xs font-mono text-blue-400">HTTP-ONLY</span>
                    {/if}
                  </div>
                </div>
                <p class="text-gray-400 text-xs font-mono">{cookie.value}</p>
              </div>
            {/each}
          </div>
        {/if}
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